import asyncio
import json
import logging
import re
from datetime import datetime, timezone
from typing import Any

import httpx

from langchain_ollama import ChatOllama
from langchain_core.output_parsers import StrOutputParser
from langchain_core.prompts import ChatPromptTemplate

from app.core.config import (
    OLLAMA_HOST,
    OLLAMA_MODEL,
    OLLAMA_TIMEOUT,
    OLLAMA_WARMUP_ENABLED,
    OLLAMA_WARMUP_KEEP_ALIVE,
    OLLAMA_WARMUP_RETRIES,
    OLLAMA_WARMUP_RETRY_DELAY_SECONDS,
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
}

SPECIALTY_TRANSLATIONS_EN_TO_EL = {v: k for k, v in SPECIALTY_TRANSLATIONS_EL_TO_EN.items()}

_PROMPT_LANGUAGE_HINT = {
    "el": "Greek",
    "en": "English",
}

_GREEK_CHAR_RE = re.compile(r"[\u0370-\u03FF\u1F00-\u1FFF]")

# TODO: Greek medical terminology validation required in Sprint 1.
# Run classify() against ≥20 Greek symptom test cases covering MTS levels 1–5.
# If MTS classification accuracy falls below 80%:
#   Fallback strategy: translate `symptoms` to English before LLM inference,
#   then instruct the model to return `reasoning` in Greek.
#   Implement as: symptoms_en = translate_to_english(symptoms); classify(symptoms_en, context)
#   Translation can use a secondary Ollama call or a lightweight library (e.g., googletrans).
#   Document accuracy results and chosen approach in the Story 2.2 dev agent record.

_SYSTEM_PROMPT = (
    "You are a medical triage assistant using the Manchester Triage System (MTS). "
    "Analyse the patient's symptoms using the provided clinical context. "
    "Respond ONLY with a valid JSON object — no explanation, no markdown, no extra text."
)

_HUMAN_TEMPLATE = (
    "Clinical context:\n{context}\n\n"
    "Patient symptoms ({input_language}):\n{symptoms}\n\n"
    "Return JSON with exactly these fields:\n"
    '{{"mts_level": <integer 1-5>, "mts_label": "<string>", '
    '"specialty": "<specialty in output language>", "reasoning": "<explanation in output language>"}}\n\n'
    "Use {output_language} for specialty and reasoning.\n"
    "MTS levels: 1=Immediate, 2=Very Urgent, 3=Urgent, 4=Less Urgent, 5=Non-urgent\n"
    "IMPORTANT rules for specialty selection:\n"
    "- Always choose the MOST SPECIFIC specialty that matches the symptoms.\n"
    "- Only use General Practice when symptoms are truly vague, systemic, or do not fit any specific specialty.\n"
    "- Prefer specific specialties: Cardiology, Neurology, Gastroenterology, Orthopedics, Pulmonology, "
    "Urology, Dermatology, Psychiatry, ENT, Ophthalmology, Gynecology, General Surgery, Vascular Surgery, "
    "Toxicology, Endocrinology, Infectious Disease, Internal Medicine.\n"
    "- If output language is Greek, specialty must be a Greek name (e.g. Καρδιολογία, Νευρολογία, Γενική Ιατρική).\n"
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


def _build_chain():
    llm = ChatOllama(
        base_url=OLLAMA_HOST,
        model=OLLAMA_MODEL,
        temperature=0,
        request_timeout=OLLAMA_TIMEOUT,
        num_ctx=131072,
        keep_alive=-1,
    )
    prompt = ChatPromptTemplate.from_messages(
        [("system", _SYSTEM_PROMPT), ("human", _HUMAN_TEMPLATE)]
    )
    return prompt | llm | StrOutputParser()


# Module-level lazy singleton — chain is built once and reused across requests.
_chain = None


def _get_chain():
    global _chain
    if _chain is None:
        _chain = _build_chain()
    return _chain


def _invoke_chain_sync(symptoms: str, context: str, lang: str = "el") -> str:
    output_language = _PROMPT_LANGUAGE_HINT.get(lang, "Greek")
    input_language = output_language
    return _get_chain().invoke(
        {
            "symptoms": symptoms,
            "context": context,
            "output_language": output_language,
            "input_language": input_language,
        }
    )


async def warmup_model() -> None:
    _warmup_state["in_progress"] = True
    _warmup_state["attempts"] = 0
    _warmup_state["started_at"] = _utc_now_iso()
    _warmup_state["last_error"] = None

    if not OLLAMA_WARMUP_ENABLED:
        _warmup_state["in_progress"] = False
        logger.info("Ollama warmup disabled via OLLAMA_WARMUP_ENABLED")
        return

    payload: dict[str, Any] = {
        "model": OLLAMA_MODEL,
        "messages": [{"role": "user", "content": "ping"}],
        "stream": False,
        "options": {"num_predict": 1},
        "keep_alive": "-1",
    }

    timeout = httpx.Timeout(timeout=float(OLLAMA_TIMEOUT))
    endpoint = f"{OLLAMA_HOST.rstrip('/')}/api/chat"

    for attempt in range(1, OLLAMA_WARMUP_RETRIES + 1):
        _warmup_state["attempts"] = attempt
        _warmup_state["last_attempt_at"] = _utc_now_iso()
        try:
            async with httpx.AsyncClient(timeout=timeout) as client:
                response = await client.post(endpoint, json=payload)
                response.raise_for_status()
            logger.info(
                "Ollama warmup succeeded for model '%s' on attempt %s",
                OLLAMA_MODEL,
                attempt,
            )
            _get_chain()
            _warmup_state["last_success_at"] = _utc_now_iso()
            _warmup_state["last_error"] = None
            _warmup_state["in_progress"] = False
            return
        except Exception as exc:  # noqa: BLE001
            _warmup_state["last_error"] = f"{type(exc).__name__}: {exc}"
            logger.warning(
                "Ollama warmup attempt %s/%s failed: %s",
                attempt,
                OLLAMA_WARMUP_RETRIES,
                type(exc).__name__,
            )
            if attempt < OLLAMA_WARMUP_RETRIES:
                await asyncio.sleep(OLLAMA_WARMUP_RETRY_DELAY_SECONDS)

    _warmup_state["in_progress"] = False
    logger.error(
        "Ollama warmup failed after %s attempts; continuing without blocking startup",
        OLLAMA_WARMUP_RETRIES,
    )


def get_warmup_status() -> dict[str, Any]:
    ready = (not OLLAMA_WARMUP_ENABLED) or (_warmup_state["last_success_at"] is not None)

    return {
        "enabled": OLLAMA_WARMUP_ENABLED,
        "ready": ready,
        "model": OLLAMA_MODEL,
        "timeout_seconds": OLLAMA_TIMEOUT,
        "keep_alive": OLLAMA_WARMUP_KEEP_ALIVE,
        "max_retries": OLLAMA_WARMUP_RETRIES,
        "retry_delay_seconds": OLLAMA_WARMUP_RETRY_DELAY_SECONDS,
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
    json_str = _extract_json_object(raw)
    if not json_str:
        logger.warning("LLM response contained no JSON object")
        raise LLMParseError("No JSON object found in LLM response")
    try:
        data = json.loads(json_str)
    except json.JSONDecodeError as exc:
        logger.warning("LLM response JSON decode failed: %s", type(exc).__name__)
        raise LLMParseError("JSON decode failed") from exc

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


async def classify(symptoms: str, context: str, lang: str = "el") -> dict:
    try:
        raw = await asyncio.to_thread(_invoke_chain_sync, symptoms, context, lang)
        return _parse_response(raw, lang)
    except LLMParseError:
        raise
    except Exception as exc:
        logger.error("LLM invocation failed: %s", type(exc).__name__, exc_info=True)
        raise LLMParseError(f"LLM service error: {type(exc).__name__}") from exc
