import asyncio
import json
import logging
import re

from langchain_community.chat_models import ChatOllama
from langchain_core.output_parsers import StrOutputParser
from langchain_core.prompts import ChatPromptTemplate

from app.core.config import OLLAMA_HOST, OLLAMA_MODEL

logger = logging.getLogger(__name__)

MTS_LABELS = {
    1: "Immediate",
    2: "Very Urgent",
    3: "Urgent",
    4: "Less Urgent",
    5: "Non-urgent",
}

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
    "Patient symptoms (Greek):\n{symptoms}\n\n"
    "Return JSON with exactly these fields:\n"
    '{{"mts_level": <integer 1-5>, "mts_label": "<string>", '
    '"specialty": "<Greek specialty name>", "reasoning": "<explanation in Greek>"}}\n\n'
    "MTS levels: 1=Immediate, 2=Very Urgent, 3=Urgent, 4=Less Urgent, 5=Non-urgent\n"
    "specialty must be a Greek medical specialty name (e.g. Καρδιολογία, Νευρολογία, Γενική Ιατρική)."
)


class LLMParseError(Exception):
    pass


def _build_chain():
    llm = ChatOllama(base_url=OLLAMA_HOST, model=OLLAMA_MODEL, temperature=0)
    prompt = ChatPromptTemplate.from_messages(
        [("system", _SYSTEM_PROMPT), ("human", _HUMAN_TEMPLATE)]
    )
    return prompt | llm | StrOutputParser()


def _invoke_chain_sync(symptoms: str, context: str) -> str:
    chain = _build_chain()
    return chain.invoke({"symptoms": symptoms, "context": context})


def _parse_response(raw: str) -> dict:
    match = re.search(r"\{.*\}", raw, re.DOTALL)
    if not match:
        raise LLMParseError(f"No JSON object found in LLM response")
    try:
        data = json.loads(match.group())
    except json.JSONDecodeError as exc:
        raise LLMParseError(f"JSON decode failed: {exc}") from exc

    required = {"mts_level", "mts_label", "specialty", "reasoning"}
    missing = required - set(data.keys())
    if missing:
        raise LLMParseError(f"Missing required fields: {missing}")

    try:
        mts_level = int(data["mts_level"])
    except (TypeError, ValueError) as exc:
        raise LLMParseError(f"mts_level is not an integer: {data['mts_level']}") from exc
    if mts_level not in range(1, 6):
        raise LLMParseError(f"mts_level out of range 1–5: {mts_level}")

    data["mts_level"] = mts_level
    return data


async def classify(symptoms: str, context: str) -> dict:
    try:
        raw = await asyncio.to_thread(_invoke_chain_sync, symptoms, context)
        return _parse_response(raw)
    except LLMParseError:
        raise
    except Exception as exc:
        logger.error("LLM invocation failed: %s", exc, exc_info=True)
        raise LLMParseError(f"LLM service error: {exc}") from exc
