import asyncio
import json
import logging

from langchain_community.chat_models import ChatOllama
from langchain_core.output_parsers import StrOutputParser
from langchain_core.prompts import ChatPromptTemplate

from app.core.config import OLLAMA_HOST, OLLAMA_MODEL, OLLAMA_TIMEOUT

logger = logging.getLogger(__name__)

MTS_LABELS = {
    1: "Immediate",
    2: "Very Urgent",
    3: "Urgent",
    4: "Less Urgent",
    5: "Non-urgent",
}

_SYSTEM_PROMPT = (
    "You are a medical triage assistant using the Manchester Triage System (MTS). "
    "Analyse the patient's symptoms using the provided clinical context. "
    "Respond ONLY with a valid JSON object — no explanation, no markdown, no extra text."
)

_HUMAN_TEMPLATE = (
    "Clinical context:\n{context}\n\n"
    "Patient symptoms:\n{symptoms}\n\n"
    "Return JSON with exactly these fields:\n"
    '{{"mts_level": <integer 1-5>, "mts_label": "<string>", '
    '"specialty": "<English specialty name>", "reasoning": "<explanation in English>"}}\n\n'
    "MTS levels: 1=Immediate, 2=Very Urgent, 3=Urgent, 4=Less Urgent, 5=Non-urgent\n"
    "IMPORTANT rules for specialty selection:\n"
    "- Always choose the MOST SPECIFIC specialty that matches the symptoms.\n"
    "- Only use General Practice when symptoms are truly vague, systemic, or do not fit any specific specialty.\n"
    "- Prefer specific specialties: Cardiology, Neurology, Gastroenterology, Orthopedics, Pulmonology, "
    "Urology, Dermatology, Psychiatry, ENT, Ophthalmology, Gynecology, General Surgery, Vascular Surgery, "
    "Toxicology, Endocrinology, Infectious Disease, Internal Medicine.\n"
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


def _invoke_chain_sync(symptoms: str, context: str) -> str:
    return _get_chain().invoke({"symptoms": symptoms, "context": context})


def _parse_response(raw: str) -> dict:
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

    expected_label = MTS_LABELS[mts_level]
    if data["mts_label"] != expected_label:
        raise LLMParseError(
            f"mts_label mismatch: level {mts_level} requires '{expected_label}', got '{data['mts_label']}'"
        )

    data["mts_level"] = mts_level
    return data


async def classify(symptoms: str, context: str) -> dict:
    try:
        raw = await asyncio.to_thread(_invoke_chain_sync, symptoms, context)
        return _parse_response(raw)
    except LLMParseError:
        raise
    except Exception as exc:
        logger.error("LLM invocation failed: %s", type(exc).__name__, exc_info=True)
        raise LLMParseError(f"LLM service error: {type(exc).__name__}") from exc
