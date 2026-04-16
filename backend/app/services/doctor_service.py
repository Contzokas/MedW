import json
import logging
from pathlib import Path

from pydantic import ValidationError

from app.schemas.doctor import Doctor

logger = logging.getLogger(__name__)

_DOCTORS_FILE = Path(__file__).parent.parent.parent / "data" / "doctors.json"
_GP_SPECIALTY = "Γενική Ιατρική"
_FALLBACK_NOTE = "Δεν βρέθηκε διαθέσιμος ειδικός — συνιστάται Γενικός Ιατρός."

_doctors_by_specialty: dict[str, list[Doctor]] = {}
_all_doctors: list[Doctor] = []


class DoctorDataLoadError(RuntimeError):
    """Raised when doctor dataset cannot be loaded at startup."""


def load_doctors() -> None:
    global _doctors_by_specialty, _all_doctors
    try:
        raw = json.loads(_DOCTORS_FILE.read_text(encoding="utf-8"))
        if not isinstance(raw, list):
            raise ValueError("doctors.json must contain a JSON array")

        doctors = [Doctor.model_validate(d) for d in raw]
        index: dict[str, list[Doctor]] = {}
        for doc in doctors:
            index.setdefault(doc.specialty, []).append(doc)

        _all_doctors = doctors
        _doctors_by_specialty = index
    except (OSError, json.JSONDecodeError, ValidationError, ValueError, TypeError) as exc:
        _all_doctors = []
        _doctors_by_specialty = {}
        raise DoctorDataLoadError(f"Failed to load doctor dataset from {_DOCTORS_FILE}") from exc

    logger.info(
        "Doctor dataset loaded: %d doctors across %d specialties",
        len(_all_doctors),
        len(_doctors_by_specialty),
    )


def get_all(specialty: str | None = None) -> list[Doctor]:
    if specialty is None:
        return list(_all_doctors)
    return list(_doctors_by_specialty.get(specialty, []))


def get_match(specialty: str) -> Doctor:
    for doc in _doctors_by_specialty.get(specialty, []):
        if doc.availability:
            return doc
    for doc in _doctors_by_specialty.get(_GP_SPECIALTY, []):
        if doc.availability:
            return Doctor(
                name=doc.name,
                specialty=doc.specialty,
                availability=doc.availability,
                fallback_note=_FALLBACK_NOTE,
            )
    return Doctor(
        name="Γενικός Ιατρός",
        specialty=_GP_SPECIALTY,
        availability=False,
        fallback_note=_FALLBACK_NOTE,
    )
