from pydantic import BaseModel


class Doctor(BaseModel):
    name: str
    specialty: str
    availability: bool
    fallback_note: str | None = None
