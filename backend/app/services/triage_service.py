import logging
from datetime import datetime, timezone

from app.core.queue import append_entry
from app.schemas.triage import QueueEntry, TriageResponse
from app.services.llm_service import classify as llm_classify
from app.services.rag_service import RAGUnavailableError, retrieve_context

logger = logging.getLogger(__name__)

_SAFE_DEFAULT = TriageResponse(
    mts_level=3,
    mts_label="Urgent",
    specialty="Γενική Ιατρική",
    reasoning="Αδυναμία επεξεργασίας — παρακαλώ επικοινωνήστε με ιατρό.",
    rag_used=False,
)


async def classify(symptoms: str, patient_id: str) -> TriageResponse:
    try:
        try:
            context = await retrieve_context(symptoms)
            llm_result = await llm_classify(symptoms=symptoms, context=context)
            result = TriageResponse(rag_used=True, **llm_result)
        except RAGUnavailableError as exc:
            logger.warning("RAG unavailable — falling back to LLM base knowledge", exc_info=exc)
            llm_result = await llm_classify(symptoms=symptoms, context="")
            result = TriageResponse(rag_used=False, **llm_result)
    except Exception as exc:
        logger.error("Triage pipeline failure: %s", type(exc).__name__)
        return _SAFE_DEFAULT.model_copy()

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
