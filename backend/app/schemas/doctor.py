from pydantic import BaseModel


class Doctor(BaseModel):
    name: str
    specialty: str
    availability: bool
    fallback_note: str | None = None
    city: str | None = None
    lat: float | None = None
    lon: float | None = None
