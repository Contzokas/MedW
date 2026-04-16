import random
import uuid
from typing import Dict, Any, List

from fastapi import APIRouter
from pydantic import BaseModel

from app.schemas.triage import TriageResponse, QueueEntry
from app.services import triage_service
from app.services import doctor_service
from app.core import queue

router = APIRouter()

class TriageRequest(BaseModel):
    symptoms: str
    patient_id: str | None = None

class TriageResponseExtended(BaseModel):
    mts_level: int
    mts_label: str
    specialty: str
    reasoning: str
    rag_used: bool
    doctor: Dict[str, Any] | None = None
    redirect_url: str | None = None

@router.post("/triage", response_model=TriageResponseExtended)
async def perform_triage(request: TriageRequest):
    pid = request.patient_id or str(uuid.uuid4())
    result = await triage_service.classify(request.symptoms, pid)
    
    doctors = doctor_service.get_all(specialty=result.specialty)
    doctor = None
    redirect_url = "https://finddoctors.gov.gr"
    
    if doctors:
        doctor = random.choice(doctors).model_dump()
    else:
        # Fallback to General Practice if exact specialty not found
        fallback_docs = doctor_service.get_all(specialty="Γενική Ιατρική")
        if fallback_docs:
            doctor = random.choice(fallback_docs).model_dump()
            result.reasoning += " (Σημείωση: Δεν βρέθηκε ιατρός στη συγκεκριμένη ειδικότητα. Παραπομπή σε Γενικό Ιατρό.)"

    if doctor:
        redirect_url = f"https://finddoctors.gov.gr/book?doctor_name={doctor['name']}"

    return TriageResponseExtended(
        **result.model_dump(),
        doctor=doctor,
        redirect_url=redirect_url
    )

@router.get("/queue", response_model=List[QueueEntry])
async def get_queue():
    return await queue.get_all_entries()
