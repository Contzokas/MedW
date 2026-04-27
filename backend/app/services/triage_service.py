import asyncio
import logging
from datetime import datetime, timezone
from urllib.parse import quote

from app.core.queue import append_entry
from app.schemas.doctor import Doctor
from app.schemas.triage import QueueEntry, TriageResponse
from app.services import doctor_service
from app.services.llm_service import (
    SPECIALTY_TRANSLATIONS_EL_TO_EN,
    SPECIALTY_TRANSLATIONS_EN_TO_EL,
    classify as llm_classify,
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

_SAFE_DEFAULT = TriageResponse(
    mts_level=3,
    mts_label="Επείγον",
    specialty=_GP_SPECIALTY,
    doctor=Doctor(
        name=_GP_NAME,
        specialty=_GP_SPECIALTY,
        availability=True,
        fallback_note="Αδυναμία επεξεργασίας — παρακαλώ επικοινωνήστε με ιατρό.",
    ),
    reasoning="Αδυναμία επεξεργασίας — παρακαλώ επικοινωνήστε με ιατρό.",
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


def _specialty_for_doctor_lookup(specialty: str, lang: str) -> str:
    # doctors.json uses English specialty names; translate Greek→English when needed
    if lang == "en":
        return specialty
    return _SPECIALTY_EL_TO_EN_NORMALIZED.get(_normalize_specialty(specialty), specialty)


def _specialty_for_response(specialty: str, lang: str) -> str:
    if lang != "en":
        return specialty
    return _SPECIALTY_EL_TO_EN_NORMALIZED.get(_normalize_specialty(specialty), specialty)


def _localize_doctor(doctor: Doctor, lang: str) -> Doctor:
    if lang != "en":
        return doctor

    fallback_note = None if doctor.fallback_note is None else _FALLBACK_NOTE_EN
    return Doctor(
        name=doctor.name,
        specialty=_specialty_for_response(doctor.specialty, lang),
        availability=doctor.availability,
        fallback_note=fallback_note,
    )


def _safe_default_for_lang(lang: str) -> TriageResponse:
    if lang == "en":
        return _SAFE_DEFAULT_EN.model_copy()
    return _SAFE_DEFAULT.model_copy()


async def classify(symptoms: str, patient_id: str, lang: str = "el") -> TriageResponse:
    resolved_lang = _resolve_lang(lang)
    try:
        try:
            context = await retrieve_context(symptoms)
            llm_result = await llm_classify(symptoms=symptoms, context=context, lang=resolved_lang)
            rag_used = True
        except RAGUnavailableError as exc:
            logger.warning("RAG unavailable — falling back to LLM base knowledge", exc_info=exc)
            llm_result = await llm_classify(symptoms=symptoms, context="", lang=resolved_lang)
            rag_used = False

        lookup_specialty = _specialty_for_doctor_lookup(llm_result["specialty"], resolved_lang)
        doctor = doctor_service.get_match(lookup_specialty)
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
            timestamp=timestamp,
        ))
    except Exception as exc:
        logger.error("Queue append failure: %s", type(exc).__name__)

    return result
