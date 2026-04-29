import json
import math
import logging
from pathlib import Path
from typing import Sequence

from pydantic import ValidationError

from app.schemas.doctor import Doctor

logger = logging.getLogger(__name__)

_DOCTORS_FILE = Path(__file__).parent.parent.parent / "data" / "doctors.json"
_GP_SPECIALTY = "General Practice"
_FALLBACK_NOTE = "No available specialist found — General Practitioner recommended."
_EARTH_RADIUS_KM = 6371.0

_doctors_by_specialty: dict[str, list[Doctor]] = {}
_all_doctors: list[Doctor] = []


class DoctorDataLoadError(RuntimeError):
    """Raised when doctor dataset cannot be loaded at startup."""


def haversine_km(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    rlat1, rlon1 = math.radians(lat1), math.radians(lon1)
    rlat2, rlon2 = math.radians(lat2), math.radians(lon2)
    dlat = rlat2 - rlat1
    dlon = rlon2 - rlon1
    a = math.sin(dlat / 2) ** 2 + math.cos(rlat1) * math.cos(rlat2) * math.sin(dlon / 2) ** 2
    return _EARTH_RADIUS_KM * 2 * math.asin(math.sqrt(a))


def _sort_by_proximity(
    doctors: Sequence[Doctor], user_lat: float, user_lon: float
) -> list[Doctor]:
    with_coords: list[tuple[float, Doctor]] = []
    without_coords: list[Doctor] = []
    for doc in doctors:
        if doc.lat is not None and doc.lon is not None:
            dist = haversine_km(user_lat, user_lon, doc.lat, doc.lon)
            with_coords.append((dist, doc))
        else:
            without_coords.append(doc)
    with_coords.sort(key=lambda pair: pair[0])
    return [doc for _, doc in with_coords] + without_coords


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


def get_match(
    specialty: str,
    latitude: float | None = None,
    longitude: float | None = None,
) -> Doctor:
    def _pick(candidates: list[Doctor]) -> Doctor | None:
        available = [d for d in candidates if d.availability]
        if not available:
            return None
        if latitude is not None and longitude is not None:
            available = _sort_by_proximity(available, latitude, longitude)
        return available[0]

    candidates = list(_doctors_by_specialty.get(specialty, []))
    match = _pick(candidates)
    if match is not None:
        return match

    gp_candidates = list(_doctors_by_specialty.get(_GP_SPECIALTY, []))
    match = _pick(gp_candidates)
    if match is not None:
        return Doctor(
            name=match.name,
            specialty=match.specialty,
            availability=match.availability,
            fallback_note=_FALLBACK_NOTE,
            city=match.city,
            lat=match.lat,
            lon=match.lon,
        )

    return Doctor(
        name="General Practitioner",
        specialty=_GP_SPECIALTY,
        availability=False,
        fallback_note=_FALLBACK_NOTE,
    )
