import json
import pytest

from app.schemas.doctor import Doctor
from app.services import doctor_service

_SAMPLE_DOCTORS = [
    {"name": "Δρ. Άλφα", "specialty": "Cardiology", "availability": True, "city": "Θεσσαλονίκη", "lat": 40.6401, "lon": 22.9444},
    {"name": "Δρ. Βήτα", "specialty": "Cardiology", "availability": False, "city": "Αθήνα", "lat": 37.9838, "lon": 23.7275},
    {"name": "Δρ. Γάμα", "specialty": "General Practice", "availability": True, "city": "Αθήνα", "lat": 37.9838, "lon": 23.7275},
    {"name": "Δρ. Δέλτα", "specialty": "General Practice", "availability": True, "city": "Θεσσαλονίκη", "lat": 40.6401, "lon": 22.9444},
    {"name": "Δρ. Έψιλον", "specialty": "Internal Medicine", "availability": False, "city": "Αθήνα", "lat": 37.9838, "lon": 23.7275},
]


@pytest.fixture(autouse=True)
def setup_doctors(tmp_path, monkeypatch):
    doctors_file = tmp_path / "doctors.json"
    doctors_file.write_text(json.dumps(_SAMPLE_DOCTORS), encoding="utf-8")
    monkeypatch.setattr("app.services.doctor_service._DOCTORS_FILE", doctors_file)
    doctor_service.load_doctors()
    yield
    doctor_service._doctors_by_specialty.clear()
    doctor_service._all_doctors.clear()


def test_get_match_returns_first_available_for_exact_specialty():
    doctor = doctor_service.get_match("Cardiology")
    assert doctor.name == "Δρ. Άλφα"
    assert doctor.specialty == "Cardiology"
    assert doctor.fallback_note is None


def test_get_match_unknown_specialty_falls_back_to_gp():
    doctor = doctor_service.get_match("General Surgery")
    assert doctor.specialty == "General Practice"
    assert doctor.fallback_note is not None
    assert len(doctor.fallback_note) > 0


def test_get_match_all_unavailable_falls_back_to_gp():
    doctor = doctor_service.get_match("Internal Medicine")
    assert doctor.specialty == "General Practice"
    assert doctor.fallback_note is not None


def test_get_all_no_filter_returns_all():
    doctors = doctor_service.get_all()
    assert len(doctors) == 5


def test_get_all_with_specialty_filter():
    doctors = doctor_service.get_all(specialty="Cardiology")
    assert len(doctors) == 2
    assert all(d.specialty == "Cardiology" for d in doctors)


def test_get_all_unknown_specialty_returns_empty():
    doctors = doctor_service.get_all(specialty="General Surgery")
    assert doctors == []


def test_load_doctors_populates_in_memory_dict():
    assert "Cardiology" in doctor_service._doctors_by_specialty
    assert len(doctor_service._doctors_by_specialty["Cardiology"]) == 2
    assert len(doctor_service._all_doctors) == 5


def test_get_match_fallback_note_absent_on_success():
    doctor = doctor_service.get_match("General Practice")
    assert doctor.fallback_note is None


def test_get_match_returns_unavailable_placeholder_when_no_gp_available():
    unavailable_gp = [d for d in _SAMPLE_DOCTORS if d["specialty"] != "General Practice"]
    doctor_service._all_doctors = [Doctor(**d) for d in unavailable_gp]
    doctor_service._doctors_by_specialty = {}
    for doc in doctor_service._all_doctors:
        doctor_service._doctors_by_specialty.setdefault(doc.specialty, []).append(doc)

    doctor = doctor_service.get_match("General Surgery")
    assert doctor.specialty == "General Practice"
    assert doctor.availability is False
    assert doctor.fallback_note is not None


def test_load_doctors_raises_on_invalid_json_shape(tmp_path, monkeypatch):
    doctors_file = tmp_path / "doctors.json"
    doctors_file.write_text(json.dumps({"invalid": "shape"}), encoding="utf-8")
    monkeypatch.setattr("app.services.doctor_service._DOCTORS_FILE", doctors_file)

    with pytest.raises(doctor_service.DoctorDataLoadError):
        doctor_service.load_doctors()


def test_haversine_same_point_is_zero():
    dist = doctor_service.haversine_km(37.9838, 23.7275, 37.9838, 23.7275)
    assert dist < 0.01


def test_haversine_athens_thessaloniki():
    dist = doctor_service.haversine_km(37.9838, 23.7275, 40.6401, 22.9444)
    assert 300 < dist < 310


def test_haversine_athens_heraklion():
    dist = doctor_service.haversine_km(37.9838, 23.7275, 35.34, 25.1632)
    assert 320 < dist < 340


def test_get_match_with_coordinates_returns_nearest():
    doctor = doctor_service.get_match("General Practice", latitude=40.6401, longitude=22.9444)
    assert doctor.specialty == "General Practice"
    assert doctor.name == "Δρ. Δέλτα"


def test_get_match_without_coordinates_unchanged():
    doctor = doctor_service.get_match("Cardiology")
    assert doctor.specialty == "Cardiology"
    assert doctor.name == "Δρ. Άλφα"


def test_get_match_with_coordinates_falls_back_to_nearest_gp():
    doctor = doctor_service.get_match("General Surgery", latitude=40.6401, longitude=22.9444)
    assert doctor.specialty == "General Practice"
    assert doctor.name == "Δρ. Δέλτα"
    assert doctor.city == "Θεσσαλονίκη"
