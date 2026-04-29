from typing import Literal

from pydantic import BaseModel, constr

from app.schemas.doctor import Doctor


class TriageRequest(BaseModel):
    symptoms: constr(strip_whitespace=True, min_length=1)
    patient_id: constr(strip_whitespace=True, min_length=1)
    lang: Literal["en", "el"] = "el"
    patient_profile: str | None = None  # Optional serialised medical history from the profiler
    follow_up_count: int = 0
    conversation_context: str = ""
    allow_follow_up: bool = True
    latitude: float | None = None
    longitude: float | None = None


class FollowUpResponse(BaseModel):
    type: Literal["follow_up"] = "follow_up"
    question: str
    follow_up_count: int
    suggested_answers: list[str] = []


class TriageResponse(BaseModel):
    mts_level: int
    mts_label: str
    specialty: str
    doctor: Doctor
    reasoning: str
    redirect_url: str
    rag_used: bool = True


class RedirectToWizardResponse(BaseModel):
    type: Literal["redirect_to_wizard"] = "redirect_to_wizard"
    guidance_message: str


class UncertainResultResponse(BaseModel):
    type: Literal["uncertain_result"] = "uncertain_result"
    message: str


class QueueEntry(BaseModel):
    patient_id: str
    mts_level: int
    specialty: str
    doctor_name: str = ""
    timestamp: str  # ISO 8601, e.g. "2026-04-17T10:30:00+00:00"
