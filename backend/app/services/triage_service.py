import asyncio
import logging
from datetime import datetime, timezone
from urllib.parse import quote

from app.core.config import MAX_FOLLOW_UP_QUESTIONS
from app.core.queue import append_entry
from app.schemas.doctor import Doctor
from app.schemas.triage import FollowUpResponse, QueueEntry, TriageResponse, RedirectToWizardResponse, UncertainResultResponse
from app.services import doctor_service
from app.services.llm_service import (
    SPECIALTY_TRANSLATIONS_EL_TO_EN,
    SPECIALTY_TRANSLATIONS_EN_TO_EL,
    classify as llm_classify,
    translate_to_english,
    translate_to_greek,
    MTS_LABELS_EL,
)
from app.services.rag_service import RAGUnavailableError, retrieve_context

logger = logging.getLogger(__name__)

_SUPPORTED_LANGS = {"el", "en"}
_GP_SPECIALTY = "Γενική Ιατρική"
_GP_NAME = "Γενικός Ιατρός"
_GP_SPECIALTY_EN = "General Practice"
_GP_NAME_EN = "General Practitioner"
_FALLBACK_NOTE_EN = "No specialist is currently available - General Practice is recommended."
_SAFE_REASONING_EN = "Processing unavailable - please contact a doctor."
_SAFE_REDIRECT = (
    f"https://finddoctors.gov.gr/search"
    f"?specialty={quote(_GP_SPECIALTY)}&doctor={quote(_GP_NAME)}"
)

# Symptom keywords used to quickly detect content-free inputs before LLM inference
_SYMPTOM_KEYWORDS = {
    "pain", "hurt", "ache", "fever", "cough", "headache", "chest", "breathing",
    "nausea", "vomit", "dizzy", "bleeding", "injury", "broken", "rash", "swell",
    "swollen", "sore", "throat", "stomach", "back", "joint", "muscle", "ear",
    "eye", "nose", "diarrhea", "fatigue", "anxiety", "depression", "burn",
    "πόνο", "πονά", "πυρετό", "βήχα", "πονοκέφαλο", "στήθο", "αναπνοή",
    "ναυτία", "εμετό", "ζάλη", "αιμορραγία", "τραύμα", "σπάσιμο", "εξάνθημα",
    "πρήξιμο", "λαιμό", "στομάχι", "πλάτη", "άρθρωση", "μυ", "αυτί",
    "μάτι", "μύτη", "διάρροια", "κόπωση", "άγχο", "κατάθλιψη", "κάψιμο",
}

_VAGUE_REDIRECT_EL = (
    "Για να σας βοηθήσουμε καλύτερα, χρειαζόμαστε περισσότερες λεπτομέρειες. "
    "Δοκιμάστε τον καθοδηγούμενο οδηγό συμπτωμάτων — θα σας κάνει βήμα-βήμα ερωτήσεις "
    "για την περιοχή του σώματος, τα συμπτώματα, τη σοβαρότητα και τη διάρκεια."
)

_VAGUE_REDIRECT_EN = (
    "To help you better, we need a bit more detail. "
    "Try the guided symptom wizard — it will ask you step by step "
    "about body area, symptoms, severity, and duration."
)


def _is_vague_input(text: str) -> bool:
    stripped = text.strip().lower()
    if len(stripped) > 40:
        return False
    for keyword in _SYMPTOM_KEYWORDS:
        if keyword in stripped:
            return False
    return True

_SAFE_DEFAULT = TriageResponse(
    mts_level=3,
    mts_label="Urgent",
    specialty=_GP_SPECIALTY,
    doctor=Doctor(
        name=_GP_NAME,
        specialty=_GP_SPECIALTY,
        availability=True,
        fallback_note="Processing failed — please consult a doctor.",
    ),
    reasoning="Processing failed — please consult a doctor.",
    redirect_url=_SAFE_REDIRECT,
    rag_used=False,
)

_SAFE_DEFAULT_EN = TriageResponse(
    mts_level=3,
    mts_label="Urgent",
    specialty=_GP_SPECIALTY_EN,
    doctor=Doctor(
        name=_GP_NAME_EN,
        specialty=_GP_SPECIALTY_EN,
        availability=True,
        fallback_note=_SAFE_REASONING_EN,
    ),
    reasoning=_SAFE_REASONING_EN,
    redirect_url=_SAFE_REDIRECT,
    rag_used=False,
)


def _normalize_specialty(value: str) -> str:
    return " ".join(value.strip().split()).lower()


_SPECIALTY_EN_TO_EL_NORMALIZED = {
    _normalize_specialty(en): el for en, el in SPECIALTY_TRANSLATIONS_EN_TO_EL.items()
}
_SPECIALTY_EL_TO_EN_NORMALIZED = {
    _normalize_specialty(el): en for el, en in SPECIALTY_TRANSLATIONS_EL_TO_EN.items()
}


def _resolve_lang(lang: str) -> str:
    return lang if lang in _SUPPORTED_LANGS else "el"


_FALLBACK_NOTE_EL = "Δεν υπάρχει διαθέσιμος ειδικός — συνιστάται Γενική Ιατρική."

_SPECIALTY_ALIASES: dict[str, str] = {"ent": "Otolaryngology"}

def _specialty_for_doctor_lookup(specialty: str, lang: str) -> str:
    """Translate LLM specialty output to the English key used in doctors.json."""
    if lang == "en":
        result = specialty  # LLM returns English → matches English doctors.json keys
    else:
        # Greek: LLM returns Greek → translate to English for lookup
        result = _SPECIALTY_EL_TO_EN_NORMALIZED.get(_normalize_specialty(specialty), specialty)
    return _SPECIALTY_ALIASES.get(_normalize_specialty(result), result)


def _localize_doctor(doctor: Doctor, lang: str) -> Doctor:
    """Translate doctor fields from English (doctors.json) to the response language."""
    if lang == "en":
        return doctor  # doctors.json is already in English
    # Greek: translate English specialty → Greek for display
    greek_specialty = _SPECIALTY_EN_TO_EL_NORMALIZED.get(
        _normalize_specialty(doctor.specialty), doctor.specialty
    )
    fallback_note = None if doctor.fallback_note is None else _FALLBACK_NOTE_EL
    return Doctor(
        name=doctor.name,
        specialty=greek_specialty,
        availability=doctor.availability,
        fallback_note=fallback_note,
        city=doctor.city,
        lat=doctor.lat,
        lon=doctor.lon,
    )


def _safe_default_for_lang(lang: str) -> TriageResponse:
    if lang == "en":
        return _SAFE_DEFAULT_EN.model_copy()
    return _SAFE_DEFAULT.model_copy()


async def classify(
    symptoms: str,
    patient_id: str,
    lang: str = "el",
    follow_up_count: int = 0,
    conversation_context: str = "",
    allow_follow_up: bool = True,
    latitude: float | None = None,
    longitude: float | None = None,
    patient_profile: str = "",
) -> TriageResponse | FollowUpResponse | RedirectToWizardResponse | UncertainResultResponse:
    resolved_lang = _resolve_lang(lang)
    enriched_symptoms = symptoms if not conversation_context else f"{symptoms}\n\n{conversation_context}"

    # Fast pre-filter: redirect trivially vague inputs when follow-ups are disabled.
    # When allow_follow_up is enabled, let the LLM ask clarifying questions instead.
    if not allow_follow_up and _is_vague_input(enriched_symptoms):
        return RedirectToWizardResponse(
            guidance_message=_VAGUE_REDIRECT_EL if resolved_lang == "el" else _VAGUE_REDIRECT_EN,
        )

    # ── Greek → run LLM in English for quality, then localise output ──
    use_translation = resolved_lang == "el"
    llm_lang = "en" if use_translation else resolved_lang

    if use_translation:
        english_symptoms = await translate_to_english(enriched_symptoms)
        llm_symptoms = english_symptoms
        search_symptoms = english_symptoms
    else:
        llm_symptoms = enriched_symptoms
        search_symptoms = symptoms

    try:
        try:
            context = await retrieve_context(search_symptoms)
            llm_result = await llm_classify(
                symptoms=llm_symptoms,
                context=context,
                lang=llm_lang,
                follow_up_count=follow_up_count,
                max_follow_ups=MAX_FOLLOW_UP_QUESTIONS,
                patient_profile=patient_profile,
            )
            rag_used = True
        except RAGUnavailableError as exc:
            logger.warning("RAG unavailable — falling back to LLM base knowledge", exc_info=exc)
            llm_result = await llm_classify(
                symptoms=llm_symptoms,
                context="",
                lang=llm_lang,
                follow_up_count=follow_up_count,
                max_follow_ups=MAX_FOLLOW_UP_QUESTIONS,
                patient_profile=patient_profile,
            )
            rag_used = False

        # ── Translate English LLM output back to Greek ──
        if use_translation:
            if "reasoning" in llm_result:
                llm_result["reasoning"] = await translate_to_greek(llm_result["reasoning"])
            if "follow_up_question" in llm_result:
                llm_result["follow_up_question"] = await translate_to_greek(llm_result["follow_up_question"])
            if "guidance_message" in llm_result:
                llm_result["guidance_message"] = await translate_to_greek(llm_result["guidance_message"])
            if "uncertain_result" in llm_result:
                llm_result["uncertain_result"] = await translate_to_greek(llm_result["uncertain_result"])
            if "mts_label" in llm_result and "mts_level" in llm_result:
                llm_result["mts_label"] = MTS_LABELS_EL.get(llm_result["mts_level"], llm_result["mts_label"])
            # specialty stays English for doctor lookup; _localize_doctor handles display translation

        if "needs_structured_input" in llm_result:
            return RedirectToWizardResponse(
                guidance_message=llm_result["guidance_message"],
            )

        if "uncertain_result" in llm_result:
            return UncertainResultResponse(
                message=llm_result["uncertain_result"],
            )

        if "follow_up_question" in llm_result:
            if allow_follow_up and follow_up_count < MAX_FOLLOW_UP_QUESTIONS:
                return FollowUpResponse(
                    question=llm_result["follow_up_question"],
                    follow_up_count=follow_up_count + 1,
                    suggested_answers=llm_result.get("suggested_answers", []),
                )
            return RedirectToWizardResponse(
                guidance_message=_VAGUE_REDIRECT_EL if resolved_lang == "el" else _VAGUE_REDIRECT_EN,
            )

        lookup_specialty = _specialty_for_doctor_lookup(llm_result["specialty"], resolved_lang)
        doctor = doctor_service.get_match(lookup_specialty, latitude, longitude)
        localized_doctor = _localize_doctor(doctor, resolved_lang)
        redirect_url = (
            f"https://finddoctors.gov.gr/search"
            f"?specialty={quote(doctor.specialty)}&doctor={quote(doctor.name)}"
        )

        result = TriageResponse(
            rag_used=rag_used,
            doctor=localized_doctor,
            redirect_url=redirect_url,
            **llm_result,
        )
    except asyncio.CancelledError:
        raise
    except Exception as exc:
        logger.error("Triage pipeline failure: %s", type(exc).__name__)
        result = _safe_default_for_lang(resolved_lang)
        return result

    timestamp = datetime.now(tz=timezone.utc).isoformat()
    try:
        await append_entry(QueueEntry(
            patient_id=patient_id,
            mts_level=result.mts_level,
            specialty=result.specialty,
            doctor_name=result.doctor.name,
            timestamp=timestamp,
        ))
    except Exception as exc:
        logger.error("Queue append failure: %s", type(exc).__name__)

    try:
        from app.services.history_service import save_triage_result
        await save_triage_result(patient_id, enriched_symptoms, result, resolved_lang)
    except Exception as exc:
        logger.error("History save failure: %s", type(exc).__name__)

    return result
