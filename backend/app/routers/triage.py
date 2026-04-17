from typing import List

from fastapi import APIRouter

from app.core import queue
from app.schemas.triage import QueueEntry, TriageRequest, TriageResponse
from app.services import triage_service

router = APIRouter()


@router.post("/triage", response_model=TriageResponse)
async def perform_triage(request: TriageRequest) -> TriageResponse:
    return await triage_service.classify(request.symptoms, request.patient_id)


@router.get("/triage/queue", response_model=List[QueueEntry])
async def get_queue() -> List[QueueEntry]:
    return await queue.get_all_entries()
