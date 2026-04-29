from fastapi import APIRouter, HTTPException, Query

from app.schemas.history import TriageHistoryEntry, TriageHistoryList
from app.services import history_service

router = APIRouter()


@router.get("/history/{patient_id}", response_model=TriageHistoryList)
async def list_history(
    patient_id: str,
    limit: int = Query(default=20, ge=1, le=100),
    offset: int = Query(default=0, ge=0),
) -> TriageHistoryList:
    entries, total = await history_service.get_history(patient_id, limit=limit, offset=offset)
    return TriageHistoryList(entries=entries, total=total)


@router.get("/history/{patient_id}/{entry_id}", response_model=TriageHistoryEntry)
async def get_history_entry(patient_id: str, entry_id: int) -> TriageHistoryEntry:
    entry = await history_service.get_entry(patient_id, entry_id)
    if entry is None:
        raise HTTPException(status_code=404, detail="History entry not found")
    return entry
