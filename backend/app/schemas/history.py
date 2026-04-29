from pydantic import BaseModel


class TriageHistoryEntry(BaseModel):
    id: int
    patient_id: str
    symptoms: str
    mts_level: int
    mts_label: str
    specialty: str
    doctor_name: str
    doctor_specialty: str
    reasoning: str
    redirect_url: str
    rag_used: bool
    lang: str
    created_at: str


class TriageHistoryList(BaseModel):
    entries: list[TriageHistoryEntry]
    total: int
