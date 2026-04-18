import asyncio
import logging
from datetime import datetime, timezone
from urllib.parse import quote

from app.core.queue import append_entry
from app.schemas.doctor import Doctor
from app.schemas.triage import QueueEntry, TriageResponse
from app.services import doctor_service
from app.services.llm_service import classify as llm_classify
from app.services.rag_service import RAGUnavailableError, retrieve_context

logger = logging.getLogger(__name__)

_GP_SPECIALTY = "Γενική Ιατρική"
_GP_NAME = "Γενικός Ιατρός"
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


async def classify(symptoms: str, patient_id: str) -> TriageResponse:
    try:
        try:
            context = await retrieve_context(symptoms)
            llm_result = await llm_classify(symptoms=symptoms, context=context)
            rag_used = True
        except RAGUnavailableError as exc:
            logger.warning("RAG unavailable — falling back to LLM base knowledge", exc_info=exc)
            llm_result = await llm_classify(symptoms=symptoms, context="")
            rag_used = False

        doctor = doctor_service.get_match(llm_result["specialty"])
        redirect_url = (
            f"https://finddoctors.gov.gr/search"
            f"?specialty={quote(doctor.specialty)}&doctor={quote(doctor.name)}"
        )

        result = TriageResponse(
            rag_used=rag_used,
            doctor=doctor,
            redirect_url=redirect_url,
            **llm_result,
        )
    except asyncio.CancelledError:
        raise
    except Exception as exc:
        logger.error("Triage pipeline failure: %s", type(exc).__name__)
        result = _SAFE_DEFAULT.model_copy()
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
