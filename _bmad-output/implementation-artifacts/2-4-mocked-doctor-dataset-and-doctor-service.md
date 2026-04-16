# Story 2.4: Mocked Doctor Dataset & Doctor Service

Status: done

## Story

As a developer,
I want the doctor dataset loaded at startup and accessible via a filterable API endpoint,
So that the triage pipeline can match a doctor to each result and the frontend can display doctor information.

## Acceptance Criteria

1. **Given** `backend/data/doctors.json` exists with schema `[{ "name": string, "specialty": string, "availability": boolean }]` containing at least 10 doctors across multiple specialties
   **When** the FastAPI application starts
   **Then** `doctor_service.py` loads `doctors.json` into an in-memory dict keyed by specialty — no file reads occur during request handling

2. **And** `doctor_service.get_match(specialty: str) -> Doctor` returns the first available doctor matching the requested specialty

3. **And** if no doctor matches the exact specialty (or all matching doctors are unavailable), the fallback returns a General Practitioner (`"Γενική Ιατρική"`) with `fallback_note` populated in the Doctor object indicating the fallback was used (FR9)

4. **And** `GET /api/v1/doctors` returns the full doctor list as a JSON array

5. **And** `GET /api/v1/doctors?specialty=Καρδιολογία` returns only doctors matching that specialty

6. **And** `backend/app/schemas/doctor.py` defines a `Doctor` Pydantic model with `name: str`, `specialty: str`, `availability: bool`, `fallback_note: str | None = None`

7. **And** `backend/app/routers/doctors.py` contains only the route definition — filtering logic lives in `doctor_service.py`

8. **And** the doctors router is registered in `backend/main.py` under the `/api/v1` prefix

9. **And** a unit test in `backend/tests/test_doctor_service.py` verifies exact-match returns, fallback activates when no match exists and when all matches are unavailable, and the in-memory dict is populated correctly

## Tasks / Subtasks

- [x] Create `backend/data/doctors.json` — ≥10 doctors, multiple specialties (AC: #1)
  - [x] Include Greek-language doctor names and specialty strings
  - [x] Include both available and unavailable doctors per specialty
  - [x] Ensure at least one available `"Γενική Ιατρική"` GP for fallback
  - [x] Include at least one specialty where all doctors are unavailable (to validate fallback trigger)

- [x] Create `backend/app/schemas/doctor.py` with Doctor Pydantic model (AC: #6)
  - [x] `name: str`, `specialty: str`, `availability: bool`, `fallback_note: str | None = None`

- [x] Create `backend/app/services/doctor_service.py` (AC: #1, #2, #3)
  - [x] Module-level `_DOCTORS_FILE = Path(__file__).parent.parent.parent / "data" / "doctors.json"`
  - [x] Module-level `_doctors_by_specialty: dict[str, list[Doctor]] = {}` and `_all_doctors: list[Doctor] = []`
  - [x] `def load_doctors() -> None` — reads file once, populates both module-level vars
  - [x] `def get_all(specialty: str | None = None) -> list[Doctor]`
  - [x] `def get_match(specialty: str) -> Doctor` — exact match first, fallback to available GP

- [x] Create `backend/app/routers/doctors.py` (AC: #4, #5, #7)
  - [x] `GET /doctors` with optional `specialty: str | None = None` query param
  - [x] Delegates to `doctor_service.get_all(specialty=specialty)` — NO filtering logic in router

- [x] Modify `backend/main.py` to add doctor loading to lifespan and register router (AC: #8)
  - [x] Call `doctor_service.load_doctors()` in lifespan (sync call, no `await`)
  - [x] `from app.services import doctor_service` and `from app.routers import doctors`
  - [x] `app.include_router(doctors.router, prefix="/api/v1")`

- [x] Create `backend/tests/test_doctor_service.py` with unit tests (AC: #9)
  - [x] Test exact-match specialty returns first available doctor, `fallback_note is None`
  - [x] Test unknown specialty triggers GP fallback with `fallback_note` populated
  - [x] Test all-unavailable specialty triggers GP fallback
  - [x] Test `get_all()` returns all doctors
  - [x] Test `get_all(specialty=...)` filters correctly
  - [x] Test `load_doctors()` populates in-memory dict correctly

### Review Findings

- [x] [Review][Patch] Unhandled startup failure if doctor dataset cannot be loaded [backend/main.py:17]
- [x] [Review][Patch] Fallback doctor can incorrectly report availability when no GP is available [backend/app/services/doctor_service.py:50]
- [x] [Review][Defer] Specialty query normalization for whitespace/case variants [backend/app/routers/doctors.py:10] — deferred, pre-existing

## Dev Notes

### What Already Exists — Read Before Implementing

**`backend/main.py`** — current state (Story 2.1 + 2.2 + 2.3 unchanged):
```python
from contextlib import asynccontextmanager
from dotenv import load_dotenv
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.routers import health
from app.services.rag_service import seed_corpus_if_empty

load_dotenv()

@asynccontextmanager
async def lifespan(app: FastAPI):
    await seed_corpus_if_empty()
    yield

app = FastAPI(title="MedW API", version="0.1.0", lifespan=lifespan)
app.add_middleware(CORSMiddleware, allow_origins=["*"], allow_methods=["*"], allow_headers=["*"])
app.include_router(health.router, prefix="/api/v1")
```
**Modify this file** — add `doctor_service.load_doctors()` to lifespan AND register doctors router.

**`backend/app/schemas/triage.py`** (Story 2.3 — do NOT modify):
```python
class TriageResponse(BaseModel):
    mts_level: int
    mts_label: str
    specialty: str
    reasoning: str
    rag_used: bool = True
# Note: Story 2.5 extends this with doctor: dict and redirect_url: str
```

**`backend/app/services/triage_service.py`** (Story 2.3 — do NOT modify):
- `triage_service.classify` does NOT call `doctor_service` yet — that wiring is Story 2.5
- This story creates the doctor service; Story 2.5 integrates it into the triage pipeline

**`backend/app/routers/health.py`** — exists, do NOT modify.

**`backend/tests/test_triage_service.py`** — EXISTS with 18 tests; do NOT touch.

**`backend/tests/conftest.py`** — exists; `pytest.ini` has `asyncio_mode = auto`.

**Existing routers/triage.py** — does NOT exist yet (Story 2.5 creates it).

### Required: `backend/data/doctors.json`

```json
[
  {"name": "Δρ. Αλέξανδρος Παπαδόπουλος", "specialty": "Καρδιολογία", "availability": true},
  {"name": "Δρ. Μαρία Νικολάου", "specialty": "Καρδιολογία", "availability": false},
  {"name": "Δρ. Γεώργιος Κωνσταντίνου", "specialty": "Ορθοπεδική", "availability": true},
  {"name": "Δρ. Ελένη Σταματίου", "specialty": "Νευρολογία", "availability": true},
  {"name": "Δρ. Νικόλαος Ανδρέου", "specialty": "Πνευμονολογία", "availability": true},
  {"name": "Δρ. Σοφία Δημητρίου", "specialty": "Γαστρεντερολογία", "availability": false},
  {"name": "Δρ. Κωνσταντίνος Παπανδρέου", "specialty": "Γενική Ιατρική", "availability": true},
  {"name": "Δρ. Χριστίνα Βασιλείου", "specialty": "Γενική Ιατρική", "availability": true},
  {"name": "Δρ. Αθηνά Μιχαηλίδου", "specialty": "Δερματολογία", "availability": true},
  {"name": "Δρ. Σπύρος Αντωνίου", "specialty": "Παθολογία", "availability": false},
  {"name": "Δρ. Ανδρέας Μαρκόπουλος", "specialty": "Ουρολογία", "availability": false},
  {"name": "Δρ. Αναστασία Οικονόμου", "specialty": "Ψυχιατρική", "availability": true}
]
```

**Dataset design notes:**
- `"Παθολογία"` and `"Ουρολογία"` have all doctors set to `availability: false` — ensures fallback is tested in production-realistic conditions
- `"Γενική Ιατρική"` has two available GPs — ensures fallback always works
- Specialties use Greek names that Mistral-7B may output (FR3 specialty strings must match)

### Required: `backend/app/schemas/doctor.py`

```python
from pydantic import BaseModel


class Doctor(BaseModel):
    name: str
    specialty: str
    availability: bool
    fallback_note: str | None = None
```

**`fallback_note` field:**
- `None` when exact specialty match found (normal path)
- Populated with Greek-language note when GP fallback is used (FR9)
- Story 3.3 (`DoctorCard.tsx`) reads this field to display fallback messaging to the patient

### Required: `backend/app/services/doctor_service.py`

```python
import json
import logging
from pathlib import Path

from app.schemas.doctor import Doctor

logger = logging.getLogger(__name__)

_DOCTORS_FILE = Path(__file__).parent.parent.parent / "data" / "doctors.json"
_GP_SPECIALTY = "Γενική Ιατρική"
_FALLBACK_NOTE = "Δεν βρέθηκε διαθέσιμος ειδικός — συνιστάται Γενικός Ιατρός."

_doctors_by_specialty: dict[str, list[Doctor]] = {}
_all_doctors: list[Doctor] = []


def load_doctors() -> None:
    global _doctors_by_specialty, _all_doctors
    raw = json.loads(_DOCTORS_FILE.read_text(encoding="utf-8"))
    doctors = [Doctor(**d) for d in raw]
    _all_doctors = doctors
    index: dict[str, list[Doctor]] = {}
    for doc in doctors:
        index.setdefault(doc.specialty, []).append(doc)
    _doctors_by_specialty = index
    logger.info(
        "Doctor dataset loaded: %d doctors across %d specialties",
        len(doctors),
        len(index),
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
        availability=True,
        fallback_note=_FALLBACK_NOTE,
    )
```

**Key design decisions:**
- `load_doctors()` is **sync** — fast JSON parse + dict build; no I/O during requests
- `_DOCTORS_FILE` is a module-level `Path` constant — allows monkeypatching in tests
- `_GP_SPECIALTY` and `_FALLBACK_NOTE` are module-level constants — not hardcoded inline
- `get_match` never raises — worst case returns a synthetic GP placeholder (mirrors triage service never-raises guarantee)
- `get_all` returns `list(...)` copies — prevents external mutation of internal state
- `fallback_note` is `None` on successful exact match — Story 3.3 checks `if doctor.fallback_note` to conditionally render UI

### Required: `backend/app/routers/doctors.py`

```python
from fastapi import APIRouter

from app.schemas.doctor import Doctor
from app.services import doctor_service

router = APIRouter()


@router.get("/doctors", response_model=list[Doctor])
async def list_doctors(specialty: str | None = None) -> list[Doctor]:
    return doctor_service.get_all(specialty=specialty)
```

**Critical:** Router contains ONLY route definition. Zero filtering logic here — all logic is in `doctor_service.get_all`.

### Required: `backend/main.py` Modifications

**Add two things to main.py:**

```python
# Add these imports:
from app.routers import doctors          # NEW
from app.services import doctor_service  # NEW

# Modify lifespan:
@asynccontextmanager
async def lifespan(app: FastAPI):
    await seed_corpus_if_empty()
    doctor_service.load_doctors()        # NEW — sync, no await
    yield

# Add router registration (after health router):
app.include_router(health.router, prefix="/api/v1")
app.include_router(doctors.router, prefix="/api/v1")   # NEW
```

**Full modified `main.py` for reference:**
```python
from contextlib import asynccontextmanager

from dotenv import load_dotenv
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.routers import doctors, health
from app.services import doctor_service
from app.services.rag_service import seed_corpus_if_empty

load_dotenv()


@asynccontextmanager
async def lifespan(app: FastAPI):
    await seed_corpus_if_empty()
    doctor_service.load_doctors()
    yield


app = FastAPI(title="MedW API", version="0.1.0", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(health.router, prefix="/api/v1")
app.include_router(doctors.router, prefix="/api/v1")
```

### Required: `backend/tests/test_doctor_service.py`

```python
import json
import pytest

from app.schemas.doctor import Doctor
from app.services import doctor_service

_SAMPLE_DOCTORS = [
    {"name": "Δρ. Άλφα", "specialty": "Καρδιολογία", "availability": True},
    {"name": "Δρ. Βήτα", "specialty": "Καρδιολογία", "availability": False},
    {"name": "Δρ. Γάμα", "specialty": "Γενική Ιατρική", "availability": True},
    {"name": "Δρ. Δέλτα", "specialty": "Γενική Ιατρική", "availability": True},
    {"name": "Δρ. Έψιλον", "specialty": "Παθολογία", "availability": False},  # all unavailable
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
    doctor = doctor_service.get_match("Καρδιολογία")
    assert doctor.name == "Δρ. Άλφα"
    assert doctor.specialty == "Καρδιολογία"
    assert doctor.fallback_note is None


def test_get_match_unknown_specialty_falls_back_to_gp():
    doctor = doctor_service.get_match("Χειρουργική")
    assert doctor.specialty == "Γενική Ιατρική"
    assert doctor.fallback_note is not None
    assert len(doctor.fallback_note) > 0


def test_get_match_all_unavailable_falls_back_to_gp():
    doctor = doctor_service.get_match("Παθολογία")
    assert doctor.specialty == "Γενική Ιατρική"
    assert doctor.fallback_note is not None


def test_get_all_no_filter_returns_all():
    doctors = doctor_service.get_all()
    assert len(doctors) == 5


def test_get_all_with_specialty_filter():
    doctors = doctor_service.get_all(specialty="Καρδιολογία")
    assert len(doctors) == 2
    assert all(d.specialty == "Καρδιολογία" for d in doctors)


def test_get_all_unknown_specialty_returns_empty():
    doctors = doctor_service.get_all(specialty="Χειρουργική")
    assert doctors == []


def test_load_doctors_populates_in_memory_dict():
    assert "Καρδιολογία" in doctor_service._doctors_by_specialty
    assert len(doctor_service._doctors_by_specialty["Καρδιολογία"]) == 2
    assert len(doctor_service._all_doctors) == 5


def test_get_match_fallback_note_absent_on_success():
    doctor = doctor_service.get_match("Γενική Ιατρική")
    assert doctor.fallback_note is None
```

**Test notes:**
- `setup_doctors` fixture is **sync** (not async) — `load_doctors()` is sync
- `autouse=True` resets state between every test — critical since `_all_doctors` and `_doctors_by_specialty` are mutable module globals
- Monkeypatching `_DOCTORS_FILE` prevents any dependency on the actual `backend/data/doctors.json` file in tests
- All tests are sync (not async) — `doctor_service` functions are not async

### Architecture Compliance

**MUST follow:**
- `doctor_service.py` goes in `services/` — business logic separation
- `Doctor` model goes in `schemas/doctor.py` — NOT inline in service or router
- Filtering logic in `doctor_service.get_all` — never in `routers/doctors.py`
- `load_doctors()` called in lifespan — no file I/O during request handling
- `doctor_service.get_match` never raises — mirrors triage service guarantee
- `get_all` and `get_match` return `list(...)` copies — not direct references to internal state
- Log only startup metadata (count/specialties) — never log doctor names or query params (privacy)

**Anti-patterns — explicitly forbidden:**
- ✗ Reading `doctors.json` inside `get_match` or `get_all` — must be loaded at startup only
- ✗ Placing filtering logic (`specialty=` query param handling) in the router
- ✗ Adding business logic to `routers/doctors.py`
- ✗ Calling `doctor_service` from `triage_service.py` here — that's Story 2.5
- ✗ Using `response_model=list[dict]` — use `response_model=list[Doctor]` for Pydantic validation
- ✗ Returning `_all_doctors` or `_doctors_by_specialty[...]` directly — always return `list(...)` copy

### Story 2.5 Integration Contract

Story 2.5 (POST /api/v1/triage endpoint) will call doctor_service from `triage_service.classify`:

```python
# Story 2.5 will add to triage_service.py:
from app.services.doctor_service import get_match as get_doctor_match

# After LLM classification succeeds:
doctor = get_doctor_match(specialty=result.specialty)
redirect_url = f"https://finddoctors.gov.gr/search?specialty={quote(doctor.specialty)}&doctor={quote(doctor.name)}"
```

Story 2.5 also extends `TriageResponse` with:
```python
doctor: dict     # Doctor model serialized
redirect_url: str
```

**This story does NOT:**
- Call `get_match` from `triage_service.py` — Story 2.5 responsibility
- Add `doctor` or `redirect_url` to `TriageResponse` — Story 2.5 responsibility
- Create `routers/triage.py` — Story 2.5 responsibility

### Testing & Verification

```bash
cd backend
# Run full test suite — must not break existing 18 tests
pytest tests/ -v

# Expected: 18 existing (Stories 2.1–2.3) + 8 new (Story 2.4) = 26 total, all green

# Manual API verification (after docker compose up or local uvicorn):
curl http://localhost:8000/api/v1/doctors
curl "http://localhost:8000/api/v1/doctors?specialty=Καρδιολογία"
```

### Previous Story Intelligence (Story 2.3 Learnings)

- **Module-level mutable state** (`_queue`, `_lock`) is the pattern for in-memory service state — `_doctors_by_specialty` and `_all_doctors` follow the same pattern
- **`get_all_entries()` returns `list(_queue)` copy** — `get_all()` must follow the same pattern: `list(_all_doctors)` and `list(_doctors_by_specialty.get(...))`
- **Review finding: `asyncio.Lock()` module-level** — doctor service functions are sync, so no `asyncio.Lock` needed here (no concurrent writes; the dict is read-only after startup)
- **Review finding: PHI leakage in logs** — log only aggregate stats at startup; never log specialty query params or doctor names during requests
- **`conftest.py` has `asyncio_mode = auto`** — but doctor service tests are all sync; no `async def test_*` needed

### Git Intelligence

- `2685b3f feat: implement triage service orchestration with three-tier fallback and in-memory queue` — Story 2.3 complete; `backend/app/schemas/triage.py`, `backend/app/core/queue.py`, `backend/app/services/triage_service.py` committed and stable
- `a6b50f5 Small tweaks and fixes` — Story 2.2 review patches; `llm_service.py` stable
- **`main.py` has not been modified since Story 1.2** — only `health.router` registered, only `seed_corpus_if_empty()` in lifespan. This story adds the second router and second lifespan call.

### Project Structure Notes

- `backend/data/` directory **already exists** (contains `corpus/` subdirectory) — `doctors.json` goes directly in `data/`
- `backend/app/schemas/` directory **already exists** (contains `triage.py`) — add `doctor.py` here
- `backend/app/routers/` directory **already exists** (contains `health.py`) — add `doctors.py` here
- `backend/app/services/` directory **already exists** (contains `rag_service.py`, `llm_service.py`, `triage_service.py`) — add `doctor_service.py` here
- `backend/tests/` directory **already exists** — add `test_doctor_service.py` here

### References

- Epics file: `_bmad-output/planning-artifacts/epics.md` § Story 2.4 acceptance criteria; § FR16–FR17; § FR9
- Architecture: `_bmad-output/planning-artifacts/architecture.md` § Structure Patterns — Router/Service/Schema; § Data Architecture — Doctor fixture; § Enforcement Guidelines — anti-patterns
- Story 2.3: `_bmad-output/implementation-artifacts/2-3-triage-service-orchestration-and-fallback-chain.md` § Required core/queue.py — module-level state pattern; § Review Findings — mutable singleton and copy-return patterns
- Story 2.5 preview (epics.md § Story 2.5): doctor_service consumed via `triage_service.classify`; `TriageResponse` extended with `doctor: dict` and `redirect_url: str`

## Dev Agent Record

### Agent Model Used

claude-sonnet-4-6

### Debug Log References

### Completion Notes List

- All 6 tasks and 16 subtasks implemented in a single session (2026-04-17).
- 8 new unit tests added; all pass. 27 total tests pass (2 pre-existing rag failures due to missing `sentence_transformers` dependency in local env — unrelated to this story).
- `doctor_service.py` uses module-level mutable state pattern (matching triage_service pattern from Story 2.3). `get_match` never raises. `get_all`/`get_match` return `list(...)` copies to prevent external mutation.
- `Παθολογία` and `Ουρολογία` in doctors.json have all doctors unavailable — validates fallback trigger in real data.
- `load_doctors()` called sync in lifespan; no file I/O during request handling.
- ROS `PYTHONPATH` injection issue in local env requires running tests with `PYTHONPATH="/path/to/backend"` (cleared ROS path).

### File List

- backend/data/doctors.json (new)
- backend/app/schemas/doctor.py (new)
- backend/app/services/doctor_service.py (new)
- backend/app/routers/doctors.py (new)
- backend/main.py (modified — added doctors router + doctor_service lifespan call)
- backend/tests/test_doctor_service.py (new)

## Change Log

- 2026-04-17: Implemented Story 2.4 — doctor dataset, schema, service, router, main.py integration, and 8 unit tests. All ACs satisfied.
