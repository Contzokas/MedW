import asyncio
import json
import logging
import re
import time
from datetime import datetime, timezone
from typing import Any

import httpx

from langchain_nvidia_ai_endpoints import ChatNVIDIA
from langchain_core.output_parsers import StrOutputParser
from langchain_core.prompts import ChatPromptTemplate

from app.core.config import (
    NIM_BASE_URL,
    NIM_MODEL,
    NIM_API_KEY,
    NIM_TIMEOUT,
    NIM_WARMUP_ENABLED,
    NIM_WARMUP_RETRIES,
    NIM_WARMUP_RETRY_DELAY_SECONDS,
)

logger = logging.getLogger(__name__)


def _utc_now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()


_warmup_state: dict[str, Any] = {
    "in_progress": False,
    "attempts": 0,
    "started_at": None,
    "last_attempt_at": None,
    "last_success_at": None,
    "last_error": None,
}

MTS_LABELS = {
    1: "Immediate",
    2: "Very Urgent",
    3: "Urgent",
    4: "Less Urgent",
    5: "Non-urgent",
}

MTS_LABELS_EL = {
    1: "Άμεση Αντιμετώπιση",
    2: "Πολύ Επείγον",
    3: "Επείγον",
    4: "Λιγότερο Επείγον",
    5: "Μη Επείγον",
}

SPECIALTY_TRANSLATIONS_EL_TO_EN = {
    "Καρδιολογία": "Cardiology",
    "Νευρολογία": "Neurology",
    "Γαστρεντερολογία": "Gastroenterology",
    "Ορθοπεδική": "Orthopedics",
    "Πνευμονολογία": "Pulmonology",
    "Παθολογία": "Internal Medicine",
    "Γενική Ιατρική": "General Practice",
    "Ουρολογία": "Urology",
    "Δερματολογία": "Dermatology",
    "Ψυχιατρική": "Psychiatry",
    "Ωτορινολαρυγγολογία": "Otolaryngology",
    "Οφθαλμολογία": "Ophthalmology",
    "Γυναικολογία": "Gynecology",
    "Γενική Χειρουργική": "General Surgery",
    "Παιδιατρική": "Pediatrics",
    "Ενδοκρινολογία": "Endocrinology",
    "Αγγειοχειρουργική": "Vascular Surgery",
    "Τοξικολογία": "Toxicology",
    "Λοιμωξιολογία": "Infectious Disease",
}

SPECIALTY_TRANSLATIONS_EN_TO_EL = {v: k for k, v in SPECIALTY_TRANSLATIONS_EL_TO_EN.items()}

_PROMPT_LANGUAGE_HINT = {
    "el": "Greek",
    "en": "English",
}

_GREEK_CHAR_RE = re.compile(r"[\u0370-\u03FF\u1F00-\u1FFF]")
_THINK_RE = re.compile(r"<think>(.*?)</think>", re.DOTALL)
_REASONING_PLACEHOLDER_RE = re.compile(r"^[\s.\u2026\u00B7\-]*$")

# TODO: Greek medical terminology validation required in Sprint 1.
# Run classify() against ≥20 Greek symptom test cases covering MTS levels 1–5.
# If MTS classification accuracy falls below 80%:
#   Fallback strategy: translate `symptoms` to English before LLM inference,
#   then instruct the model to return `reasoning` in Greek.
#   Implement as: symptoms_en = translate_to_english(symptoms); classify(symptoms_en, context)
#   Translation can use a secondary NIM call or a lightweight library (e.g., googletrans).
#   Document accuracy results and chosen approach in the Story 2.2 dev agent record.

_SYSTEM_PROMPT = (
    "You are a medical triage assistant using the Manchester Triage System (MTS). "
    "Analyse the patient's symptoms using the provided clinical context. "
    "Respond ONLY with a valid JSON object — no explanation, no markdown, no extra text."
)

TRANSLATION_PROMPT = (
    "Translate the following Greek medical symptom text to English. "
    "Return ONLY the English translation, no explanation, no markdown, no extra text.\n\n"
    "{text}"
)


async def translate_to_english(text: str) -> str:
    """Translate Greek symptom text to English for RAG retrieval accuracy.

    The nv-embedqa-e5-v5 embedding model is English-optimised; Greek tokens
    yield near-random vectors, causing Milvus to retrieve irrelevant clinical
    context. Translating to English first fixes retrieval quality.
    """
    if not text or not _contains_greek(text):
        return text

    timeout = httpx.Timeout(timeout=30.0)
    endpoint = f"{NIM_BASE_URL.rstrip('/')}/chat/completions"

    try:
        loop = asyncio.get_running_loop()
        response = await loop.run_in_executor(
            None,
            lambda: httpx.post(
                endpoint,
                headers={"Authorization": f"Bearer {NIM_API_KEY}"},
                json={
                    "model": NIM_MODEL,
                    "messages": [
                        {"role": "user", "content": TRANSLATION_PROMPT.format(text=text)}
                    ],
                    "max_tokens": 256,
                    "temperature": 0,
                    "chat_template_kwargs": {"enable_thinking": False},
                },
                timeout=timeout,
            ),
        )
        response.raise_for_status()
        translated = _THINK_RE.sub("", response.json()["choices"][0]["message"]["content"]).strip()
        logger.debug("Translated Greek symptoms → English: %r → %r", text[:80], translated[:80])
        return translated
    except Exception as exc:
        logger.warning("Symptom translation failed, falling back to original: %s", type(exc).__name__)
        return text

TRANSLATE_TO_GREEK_PROMPT = (
    "Translate the following English medical text to Greek. "
    "Use proper Greek medical terminology. "
    "Return ONLY the Greek translation, no explanation, no markdown, no extra text.\n\n"
    "{text}"
)


async def translate_to_greek(text: str) -> str:
    """Translate English medical text to Greek for display to Greek-speaking users."""
    if not text or not text.strip():
        return text

    timeout = httpx.Timeout(timeout=15.0)
    endpoint = f"{NIM_BASE_URL.rstrip('/')}/chat/completions"

    try:
        loop = asyncio.get_running_loop()
        response = await loop.run_in_executor(
            None,
            lambda: httpx.post(
                endpoint,
                headers={"Authorization": f"Bearer {NIM_API_KEY}"},
                json={
                    "model": NIM_MODEL,
                    "messages": [
                        {"role": "user", "content": TRANSLATE_TO_GREEK_PROMPT.format(text=text)}
                    ],
                    "max_tokens": 512,
                    "temperature": 0,
                    "chat_template_kwargs": {"enable_thinking": False},
                },
                timeout=timeout,
            ),
        )
        response.raise_for_status()
        translated = _THINK_RE.sub("", response.json()["choices"][0]["message"]["content"]).strip()
        logger.debug("Translated reasoning → Greek: %r → %r", text[:80], translated[:80])
        return translated
    except Exception as exc:
        logger.warning("Reasoning translation to Greek failed: %s", type(exc).__name__)
        return text

_HUMAN_TEMPLATE = (
    "{patient_profile_section}"
    "Clinical context:\n{context}\n\n"
    "Patient symptoms ({input_language}):\n{symptoms}\n\n"
    "Return JSON with exactly these fields:\n"
    '{{"mts_level": <integer 1-5>, "mts_label": "<string>", '
    '"specialty": "SPECIALTY IN {output_language}", "reasoning": "YOUR CLINICAL EXPLANATION IN {output_language}"}}\n\n'
    "Use {output_language} for specialty and reasoning. The reasoning field must be a non-empty explanation — never '...' or a placeholder.\n"
    "MTS levels: 1=Immediate, 2=Very Urgent, 3=Urgent, 4=Less Urgent, 5=Non-urgent\n"
    "IMPORTANT rules for specialty selection:\n"
    "- Always choose the MOST SPECIFIC specialty that matches the symptoms.\n"
    "- Only use General Practice when symptoms are truly vague, systemic, or do not fit any specific specialty.\n"
    "- Prefer specific specialties: Cardiology, Neurology, Gastroenterology, Orthopedics, Pulmonology, "
    "Urology, Dermatology, Psychiatry, ENT, Ophthalmology, Gynecology, General Surgery, Vascular Surgery, "
    "Toxicology, Endocrinology, Infectious Disease, Pediatrics, Internal Medicine.\n"
    "- If output language is Greek, specialty must be a Greek name (e.g. Καρδιολογία, Νευρολογία, Γενική Ιατρική, Παιδιατρική).\n"
    "- If output language is English, specialty must be an English name (e.g. Cardiology, Neurology, General Practice).\n"
    "- Do NOT default to MTS level 3 (Urgent). Assign the level that genuinely reflects symptom severity.\n"
    "- Level 1: life-threatening (cardiac arrest, anaphylaxis, severe trauma)\n"
    "- Level 2: potentially life-threatening (chest pain, stroke signs, severe bleeding)\n"
    "- Level 3: urgent but stable (moderate pain, worsening chronic condition)\n"
    "- Level 4: less urgent (mild symptoms, stable chronic issues, minor complaints)\n"
    "- Level 5: non-urgent (very mild, routine, information-seeking)\n"
    "- Use levels 4 and 5 freely when symptoms are mild — not every patient needs urgent triage.\n\n"
    "VAGUE INPUT DETECTION:\n"
    "If the patient's input is too vague or generic to produce a meaningful triage "
    "(e.g. empty/trivial greetings, single-word answers, \"I don't feel well\", \"what's wrong with me\", "
    "\"help\", \"not sure\", \"nothing\" — inputs that lack ANY specific symptom, body area, severity, or duration), "
    "you must instead return:\n"
    '{{"needs_structured_input": true, "guidance_message": '
    '"<a polite, encouraging message in {output_language} explaining that more detail is needed '
    'and suggesting the patient use the structured symptom wizard to provide detailed information '
    'like body area, symptom type, severity, and duration>"}}\n'
    "A specific symptom mention (even brief, like \"headache\", \"chest pain\", \"knee hurts\") "
    "is sufficient — always triage those normally. Only use this redirect for truly empty or "
    "content-free inputs."
)

_HUMAN_TEMPLATE_WITH_FOLLOWUP = (
    "{patient_profile_section}"
    "Clinical context:\n{context}\n\n"
    "Patient symptoms ({input_language}):\n{symptoms}\n\n"
    "You have {max_follow_ups} follow-up question(s) you can ask. "
    "You have already asked {follow_up_count}.\n\n"
    "IMPORTANT — Check the symptoms first:\n"
    "1. If the symptoms contain enough specific detail (body area, symptom type, severity, or duration) "
    "to produce a meaningful triage, return the standard triage JSON:\n"
    '{{"mts_level": <integer 1-5>, "mts_label": "<string>", '
    '"specialty": "SPECIALTY IN {output_language}", "reasoning": "YOUR CLINICAL EXPLANATION IN {output_language}"}}\n\n'
    "2. If the symptoms are vague or missing key details, use one of your remaining follow-up questions:\n"
    '{{"follow_up_question": "YOUR QUESTION IN {output_language}", "suggested_answers": ["OPTION 1", "OPTION 2", "OPTION 3"]}}\n'
    "suggested_answers: 3-5 short tappable options (2-5 words each) in {output_language} that directly answer your question. Always include a final open-ended option ('Other' / 'Άλλο').\n"
    "Only do this if a single targeted question would meaningfully improve your confidence.\n\n"
    "3. If the input is TRULY empty or contains zero symptom information "
    "(e.g. just a greeting, \"idk\", \"nothing\", single characters), "
    "and asking a follow-up would be pointless, redirect them to the structured wizard:\n"
    '{{"needs_structured_input": true, "guidance_message": "YOUR POLITE MESSAGE IN {output_language}"}}\n\n'
    "4. If you have asked all {max_follow_ups} follow-up questions and still cannot confidently triage:\n"
    '{{"uncertain_result": "YOUR MESSAGE IN {output_language} explaining you cannot provide a reliable result '
    'and suggesting they consult a doctor"}}\n\n'
    "Return JSON with exactly these fields.\n"
    "Use {output_language} for specialty, reasoning, questions, and messages.\n"
    "MTS levels: 1=Immediate, 2=Very Urgent, 3=Urgent, 4=Less Urgent, 5=Non-urgent\n"
    "IMPORTANT rules for specialty selection:\n"
    "- Always choose the MOST SPECIFIC specialty that matches the symptoms.\n"
    "- Only use General Practice when symptoms are truly vague, systemic, or do not fit any specific specialty.\n"
    "- If output language is Greek, specialty must be a Greek name (e.g. Καρδιολογία, Νευρολογία, Γενική Ιατρική, Παιδιατρική).\n"
    "- If output language is English, specialty must be an English name (e.g. Cardiology, Neurology, General Practice).\n"
    "- Do NOT default to MTS level 3 (Urgent). Assign the level that genuinely reflects symptom severity.\n"
    "- Level 1: life-threatening (cardiac arrest, anaphylaxis, severe trauma)\n"
    "- Level 2: potentially life-threatening (chest pain, stroke signs, severe bleeding)\n"
    "- Level 3: urgent but stable (moderate pain, worsening chronic condition)\n"
    "- Level 4: less urgent (mild symptoms, stable chronic issues, minor complaints)\n"
    "- Level 5: non-urgent (very mild, routine, information-seeking)\n"
    "- Use levels 4 and 5 freely when symptoms are mild — not every patient needs urgent triage."
)


class LLMParseError(Exception):
    pass


def _extract_json_object(raw: str) -> str:
    """Brace-balanced JSON object extractor — handles prose-wrapped and nested responses."""
    start = raw.find("{")
    if start == -1:
        return ""
    depth = 0
    in_string = False
    escape_next = False
    for i, ch in enumerate(raw[start:], start):
        if escape_next:
            escape_next = False
            continue
        if ch == "\\" and in_string:
            escape_next = True
            continue
        if ch == '"':
            in_string = not in_string
            continue
        if in_string:
            continue
        if ch == "{":
            depth += 1
        elif ch == "}":
            depth -= 1
            if depth == 0:
                return raw[start : i + 1]
    return ""


# Module-level lazy singletons.
_llm_instance: ChatNVIDIA | None = None
_chain = None
_chain_followup = None


def _get_llm() -> ChatNVIDIA:
    global _llm_instance
    if _llm_instance is None:
        _llm_instance = ChatNVIDIA(
            base_url=NIM_BASE_URL,
            model=NIM_MODEL,
            api_key=NIM_API_KEY,
            temperature=1,
            top_p=0.95,
            max_tokens=16384,
            model_kwargs={
                "reasoning_budget": 16384,
                "chat_template_kwargs": {"enable_thinking": True},
            },
        )
    return _llm_instance


def _build_chain(human_template: str = _HUMAN_TEMPLATE):
    prompt = ChatPromptTemplate.from_messages(
        [("system", _SYSTEM_PROMPT), ("human", human_template)]
    )
    return prompt | _get_llm() | StrOutputParser()


def _get_chain():
    global _chain
    if _chain is None:
        _chain = _build_chain()
    return _chain


def _build_profile_section(patient_profile: str) -> str:
    """Format patient_profile as a clinical summary block for the LLM prompt."""
    profile = patient_profile.strip()
    if not profile:
        return ""
    return f"Patient medical history:\n{profile}\n\n"


def _get_followup_chain():
    global _chain_followup
    if _chain_followup is None:
        _chain_followup = _build_chain(_HUMAN_TEMPLATE_WITH_FOLLOWUP)
    return _chain_followup


def _extract_usage(ai_msg: Any) -> dict:
    rm = getattr(ai_msg, "response_metadata", None) or {}
    tu = rm.get("token_usage") or {}
    if tu:
        return {
            "prompt_tokens": int(tu.get("prompt_tokens", 0)),
            "completion_tokens": int(tu.get("completion_tokens", 0)),
            "total_tokens": int(tu.get("total_tokens", 0)),
        }
    um = getattr(ai_msg, "usage_metadata", None) or {}
    if um:
        return {
            "prompt_tokens": int(um.get("input_tokens", 0)),
            "completion_tokens": int(um.get("output_tokens", 0)),
            "total_tokens": int(um.get("total_tokens", 0)),
        }
    return {}


def _invoke_chain_sync(
    symptoms: str,
    context: str,
    lang: str = "el",
    follow_up_count: int = 0,
    max_follow_ups: int = 2,
    patient_profile: str = "",
) -> tuple[str, dict]:
    """Invoke the LLM and return (text, usage_dict).

    usage_dict keys: prompt_tokens, completion_tokens, total_tokens,
                     llm_ms, tokens_per_sec
    """
    output_language = _PROMPT_LANGUAGE_HINT.get(lang, "Greek")
    input_language = output_language
    use_followup = follow_up_count < max_follow_ups
    human_template = _HUMAN_TEMPLATE_WITH_FOLLOWUP if use_followup else _HUMAN_TEMPLATE

    variables: dict[str, Any] = {
        "symptoms": symptoms,
        "context": context,
        "output_language": output_language,
        "input_language": input_language,
        "patient_profile_section": _build_profile_section(patient_profile),
    }
    if use_followup:
        variables["follow_up_count"] = follow_up_count
        variables["max_follow_ups"] = max_follow_ups

    prompt_tmpl = ChatPromptTemplate.from_messages(
        [("system", _SYSTEM_PROMPT), ("human", human_template)]
    )
    messages = prompt_tmpl.format_messages(**variables)

    t0 = time.perf_counter()
    ai_msg = _get_llm().invoke(messages)
    llm_ms = round((time.perf_counter() - t0) * 1000, 1)

    text = ai_msg.content if hasattr(ai_msg, "content") else str(ai_msg)
    usage = _extract_usage(ai_msg)
    usage["llm_ms"] = llm_ms
    if usage.get("completion_tokens") and llm_ms > 0:
        usage["tokens_per_sec"] = round(usage["completion_tokens"] / (llm_ms / 1000), 1)

    return text, usage


async def warmup_model() -> None:
    _warmup_state["in_progress"] = True
    _warmup_state["attempts"] = 0
    _warmup_state["started_at"] = _utc_now_iso()
    _warmup_state["last_error"] = None

    if not NIM_WARMUP_ENABLED:
        _warmup_state["in_progress"] = False
        logger.info("NIM warmup disabled via NIM_WARMUP_ENABLED")
        return

    timeout = httpx.Timeout(timeout=float(NIM_TIMEOUT))
    endpoint = f"{NIM_BASE_URL.rstrip('/')}/health/ready"

    for attempt in range(1, NIM_WARMUP_RETRIES + 1):
        _warmup_state["attempts"] = attempt
        _warmup_state["last_attempt_at"] = _utc_now_iso()
        try:
            async with httpx.AsyncClient(timeout=timeout) as client:
                response = await client.get(endpoint)
                response.raise_for_status()
            logger.info(
                "NIM warmup succeeded for model '%s' on attempt %s",
                NIM_MODEL,
                attempt,
            )
            _get_chain()
            _warmup_state["last_success_at"] = _utc_now_iso()
            _warmup_state["last_error"] = None
            _warmup_state["in_progress"] = False
            return
        except Exception as exc:  # noqa: BLE001
            body = ""
            if hasattr(exc, "response"):
                try:
                    body = exc.response.text[:400]
                except Exception:  # noqa: BLE001
                    pass
            _warmup_state["last_error"] = f"{type(exc).__name__}: {exc}"
            logger.warning(
                "NIM warmup attempt %s/%s failed: %s%s",
                attempt,
                NIM_WARMUP_RETRIES,
                type(exc).__name__,
                f" — {body}" if body else "",
            )
            if attempt < NIM_WARMUP_RETRIES:
                await asyncio.sleep(NIM_WARMUP_RETRY_DELAY_SECONDS)

    _warmup_state["in_progress"] = False
    logger.error(
        "NIM warmup failed after %s attempts; continuing without blocking startup",
        NIM_WARMUP_RETRIES,
    )


def get_warmup_status() -> dict[str, Any]:
    ready = (not NIM_WARMUP_ENABLED) or (_warmup_state["last_success_at"] is not None)

    return {
        "enabled": NIM_WARMUP_ENABLED,
        "ready": ready,
        "model": NIM_MODEL,
        "timeout_seconds": NIM_TIMEOUT,
        "max_retries": NIM_WARMUP_RETRIES,
        "retry_delay_seconds": NIM_WARMUP_RETRY_DELAY_SECONDS,
        "in_progress": _warmup_state["in_progress"],
        "attempts": _warmup_state["attempts"],
        "started_at": _warmup_state["started_at"],
        "last_attempt_at": _warmup_state["last_attempt_at"],
        "last_success_at": _warmup_state["last_success_at"],
        "last_error": _warmup_state["last_error"],
    }


def _contains_greek(text: str) -> bool:
    return bool(_GREEK_CHAR_RE.search(text))


def _normalize_specialty(text: str) -> str:
    return " ".join(text.strip().split()).lower()


def _translate_specialty(value: str, lang: str) -> str:
    if lang == "en":
        normalized = _normalize_specialty(value)
        for greek, english in SPECIALTY_TRANSLATIONS_EL_TO_EN.items():
            if _normalize_specialty(greek) == normalized:
                return english
        return value

    if lang == "el":
        normalized = _normalize_specialty(value)
        for english, greek in SPECIALTY_TRANSLATIONS_EN_TO_EL.items():
            if _normalize_specialty(english) == normalized:
                return greek
        return value

    return value


def _enforce_output_language(data: dict, lang: str) -> dict:
    if lang not in {"en", "el"}:
        return data

    specialty = data["specialty"]
    reasoning = data["reasoning"]

    specialty_has_greek = _contains_greek(specialty)
    reasoning_has_greek = _contains_greek(reasoning)

    if lang == "el":
        translated_specialty = _translate_specialty(specialty, "el")
        if not specialty_has_greek:
            if translated_specialty != specialty:
                data["specialty"] = translated_specialty
            else:
                raise LLMParseError("Response language mismatch: expected Greek output")
        if not reasoning_has_greek:
            raise LLMParseError("Response language mismatch: expected Greek output")
        return data

    translated_specialty = _translate_specialty(specialty, "en")
    if specialty_has_greek:
        if translated_specialty == specialty:
            raise LLMParseError("Response language mismatch: expected English output")
        data["specialty"] = translated_specialty
    if reasoning_has_greek:
        raise LLMParseError("Response language mismatch: expected English output")

    return data


def _parse_response(raw: str, lang: str = "el") -> dict:
    think_match = _THINK_RE.search(raw)
    think_content = think_match.group(1).strip() if think_match else ""
    raw = _THINK_RE.sub("", raw).strip()
    json_str = _extract_json_object(raw)
    if not json_str:
        logger.warning("LLM response contained no JSON object")
        raise LLMParseError("No JSON object found in LLM response")
    try:
        data = json.loads(json_str)
    except json.JSONDecodeError as exc:
        logger.warning("LLM response JSON decode failed: %s", type(exc).__name__)
        raise LLMParseError("JSON decode failed") from exc

    if "follow_up_question" in data:
        if not isinstance(data["follow_up_question"], str) or not data["follow_up_question"].strip():
            raise LLMParseError("follow_up_question must be a non-empty string")
        raw_answers = data.get("suggested_answers", [])
        suggested = [a for a in raw_answers if isinstance(a, str) and a.strip()] if isinstance(raw_answers, list) else []
        return {"follow_up_question": data["follow_up_question"], "suggested_answers": suggested}

    if "uncertain_result" in data:
        if not isinstance(data["uncertain_result"], str) or not data["uncertain_result"].strip():
            raise LLMParseError("uncertain_result must be a non-empty string")
        return {"uncertain_result": data["uncertain_result"]}

    if data.get("needs_structured_input"):
        guidance = data.get("guidance_message", "")
        if not isinstance(guidance, str) or not guidance.strip():
            raise LLMParseError("guidance_message must be a non-empty string when needs_structured_input is true")
        return {"needs_structured_input": True, "guidance_message": guidance.strip()}

    required = {"mts_level", "mts_label", "specialty", "reasoning"}
    missing = required - set(data.keys())
    if missing:
        logger.warning("LLM response missing fields: %s", missing)
        raise LLMParseError(f"Missing required fields: {missing}")

    if isinstance(data["mts_level"], float):
        raise LLMParseError(f"mts_level must be an integer, got float: {data['mts_level']}")
    try:
        mts_level = int(data["mts_level"])
    except (TypeError, ValueError) as exc:
        raise LLMParseError("mts_level is not an integer") from exc
    if mts_level not in range(1, 6):
        raise LLMParseError(f"mts_level out of range 1–5: {mts_level}")

    for field in ("mts_label", "specialty", "reasoning"):
        if not isinstance(data[field], str) or not data[field].strip():
            raise LLMParseError(f"Field '{field}' must be a non-empty string")

    if _REASONING_PLACEHOLDER_RE.match(data["reasoning"]) and think_content:
        data["reasoning"] = think_content

    expected_label_en = MTS_LABELS[mts_level]
    expected_label_el = MTS_LABELS_EL[mts_level]
    allowed_labels = {expected_label_en, expected_label_el}

    if data["mts_label"] not in allowed_labels:
        raise LLMParseError(
            f"mts_label mismatch: level {mts_level} requires one of {sorted(allowed_labels)}, got '{data['mts_label']}'"
        )

    if lang == "el":
        data["mts_label"] = expected_label_el
    else:
        data["mts_label"] = expected_label_en

    data["mts_level"] = mts_level
    return _enforce_output_language(data, lang)


async def classify(
    symptoms: str,
    context: str,
    lang: str = "el",
    follow_up_count: int = 0,
    max_follow_ups: int = 2,
    patient_profile: str = "",
) -> dict:
    try:
        raw, usage = await asyncio.to_thread(
            _invoke_chain_sync, symptoms, context, lang, follow_up_count, max_follow_ups, patient_profile
        )
        if usage:
            logger.info(
                "LLM usage — prompt: %d, completion: %d tokens, %.1f tok/s, %.0f ms",
                usage.get("prompt_tokens", 0),
                usage.get("completion_tokens", 0),
                usage.get("tokens_per_sec", 0.0),
                usage.get("llm_ms", 0.0),
            )
        return _parse_response(raw, lang)
    except LLMParseError:
        raise
    except Exception as exc:
        logger.error("LLM invocation failed: %s", type(exc).__name__, exc_info=True)
        raise LLMParseError(f"LLM service error: {type(exc).__name__}") from exc
