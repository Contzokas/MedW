from pydantic import BaseModel, constr


class TriageRequest(BaseModel):
    symptoms: constr(strip_whitespace=True, min_length=1)
    patient_id: constr(strip_whitespace=True, min_length=1)


class TriageResponse(BaseModel):
    mts_level: int
    mts_label: str
    specialty: str
    doctor: dict
    reasoning: str
    redirect_url: str
    rag_used: bool = True


class QueueEntry(BaseModel):
    patient_id: str
    mts_level: int
    specialty: str
    timestamp: str  # ISO 8601, e.g. "2026-04-17T10:30:00+00:00"
