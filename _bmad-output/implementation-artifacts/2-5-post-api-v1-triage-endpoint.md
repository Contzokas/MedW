# Story 2.5: POST /api/v1/triage Endpoint

Status: done

## Story

As a developer,
I want the triage API endpoint wired to the triage service with validated Pydantic schemas,
so that the complete API contract from the PRD is met and the endpoint can be tested end-to-end via an API client.

## Acceptance Criteria

1. **Given** `triage_service` from Story 2.3 and `doctor_service` from Story 2.4 are implemented
   **When** `POST /api/v1/triage` is called with `{ "symptoms": "string", "patient_id": "string" }`
   **Then** `backend/app/schemas/triage.py` defines `TriageRequest` (symptoms: str, patient_id: str) and `TriageResponse` (mts_level: int, mts_label: str, specialty: str, doctor: dict, reasoning: str, redirect_url: str) as Pydantic models

2. **And** `backend/app/routers/triage.py` contains only the route definition — all business logic is delegated to `triage_service`

3. **And** the endpoint calls `triage_service.classify` and returns the `TriageResponse` as JSON with HTTP 200

4. **And** the endpoint never returns HTTP 500 — all exceptions from the service layer are already handled by Story 2.3's fallback chain

5. **And** the response JSON uses snake_case field names matching the PRD contract exactly: `mts_level`, `mts_label`, `specialty`, `doctor`, `reasoning`, `redirect_url`

6. **And** the response is a flat JSON object — no envelope wrapper (`{ data: ..., success: ... }` is forbidden)

7. **And** `GET /api/v1/health` continues to return `{ "status": "ok" }` confirming both endpoints are registered

8. **And** end-to-end manual test via `curl` or the `/docs` Swagger UI: submitting `{ "symptoms": "πόνος στο στήθος", "patient_id": "test-001" }` returns a valid `TriageResponse` with all required fields populated

## Tasks / Subtasks

- [x] Update `backend/app/schemas/triage.py` — add `TriageRequest`; extend `TriageResponse` with `doctor` and `redirect_url` (AC: #1, #5, #6)
  - [x] Add `TriageRequest` model: `symptoms: str`, `patient_id: str`
  - [x] Add `doctor: dict` and `redirect_url: str` fields to `TriageResponse`
  - [x] Keep `rag_used: bool = True` field — do NOT remove it (triage_service still sets it)
  - [x] Keep `QueueEntry` model unchanged

- [x] Update `backend/app/services/triage_service.py` — integrate doctor matching and redirect URL construction (AC: #3, #4)
  - [x] Import `from app.services.doctor_service import get_match as get_doctor_match`
  - [x] Import `from urllib.parse import quote` for URL encoding
  - [x] After successful triage (tiers 1 and 2), call `get_doctor_match(result.specialty)` to get the matched doctor
  - [x] Build `redirect_url` as `f"https://finddoctors.gov.gr/search?specialty={quote(doctor.specialty)}&doctor={quote(doctor.name)}"` 
  - [x] Add `doctor=doctor.model_dump()` and `redirect_url=redirect_url` to the returned `TriageResponse`
  - [x] Update `_SAFE_DEFAULT` to include `doctor` and `redirect_url` for the tier-3 fallback
  - [x] Doctor matching call must be inside the outer `try/except Exception` — if `get_doctor_match` raises (it should never), the safe default still applies

- [x] Refactor `backend/app/routers/triage.py` — remove all business logic, make it route-only (AC: #2, #3, #4, #6)
  - [x] Remove inline `TriageRequest` and `TriageResponseExtended` definitions — import from `app.schemas.triage`
  - [x] Remove `random`, `uuid`, `Dict`, `Any`, `List` imports — only FastAPI/schema imports needed
  - [x] Remove all doctor matching logic (`doctor_service.get_all`, `random.choice`, fallback note mutation)
  - [x] Remove `redirect_url` construction from router
  - [x] Route handler body: validate `patient_id` is non-empty (auto-handled by Pydantic since it's `str`), call `triage_service.classify`, return result
  - [x] Keep `GET /triage/queue` (SSE queue endpoint) — no changes needed there
  - [x] Use `response_model=TriageResponse` on the POST handler

- [x] Add unit/integration tests in `backend/tests/test_triage_router.py` (AC: #3, #4, #5, #6, #7)
  - [x] Test `POST /api/v1/triage` with valid payload returns 200 and all required fields
  - [x] Test response fields are snake_case and flat (no envelope)
  - [x] Test `GET /api/v1/health` still returns `{ "status": "ok" }` after triage router is registered
  - [x] Test `POST /api/v1/triage` with mocked service returns correct field structure
  - [x] Test `GET /api/v1/triage/queue` returns a list

### Review Findings

- [x] [Review][Patch] Success-path `redirect_url` format deviates from Story 2.5 contract [backend/app/services/triage_service.py:43-46]
- [x] [Review][Patch] `TriageRequest` allows empty-string `patient_id`/`symptoms`, so "non-empty" validation is not actually enforced [backend/app/schemas/triage.py:4-7]
- [x] [Review][Patch] `QueueEntry` was modified despite explicit "unchanged" constraint (comment changed) [backend/app/schemas/triage.py:23]

## Dev Notes

### CRITICAL: What Already Exists and What Is WRONG

**`backend/app/routers/triage.py` already exists** (committed in `90f684e`) but with architecture violations that this story must fix:

```python
# CURRENT (violations — DO NOT KEEP THIS):
class TriageRequest(BaseModel):          # ✗ schema in router (must move to schemas/)
    symptoms: str
    patient_id: str | None = None        # ✗ patient_id is optional (must be required str)

class TriageResponseExtended(BaseModel): # ✗ schema in router, wrong name
    ...
    doctor: Dict[str, Any] | None = None # ✗ doctor is optional (must be required dict)
    redirect_url: str | None = None      # ✗ redirect_url optional (must be str)

@router.post("/triage", response_model=TriageResponseExtended)
async def perform_triage(request: TriageRequest):
    ...
    doctors = doctor_service.get_all(specialty=result.specialty)  # ✗ logic in router
    doctor = random.choice(doctors).model_dump()                   # ✗ logic in router
    redirect_url = f"..."                                           # ✗ logic in router
    result.reasoning += " (Σημείωση: ...)"                         # ✗ mutating TriageResponse
```

**What must be replaced:**
- Remove `TriageRequest`, `TriageResponseExtended` from router → move to `schemas/triage.py`
- Remove `random`, `uuid`, `Dict`, `Any`, `List` imports from router
- Remove ALL doctor matching / redirect URL logic from router → move to `triage_service.py`
- The route handler must only: receive request → call service → return result

---

### Required: Updated `backend/app/schemas/triage.py`

```python
from pydantic import BaseModel


class TriageRequest(BaseModel):
    symptoms: str
    patient_id: str


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
    timestamp: str  # ISO 8601
```

**Key decisions:**
- `doctor: dict` is required (non-optional) — triage service always provides a doctor (via fallback chain)
- `redirect_url: str` is required — always present in all three fallback tiers
- `TriageRequest.patient_id` is `str`, NOT `str | None` — frontend always sends a UUID
- `rag_used: bool = True` stays — `triage_service` already sets it; Epic 3/4 may use it
- `QueueEntry` is **unchanged** — do not touch it

---

### Required: Updated `backend/app/services/triage_service.py`

**Full replacement file:**

```python
import logging
from datetime import datetime, timezone
from urllib.parse import quote

from app.core.queue import append_entry
from app.schemas.triage import QueueEntry, TriageResponse
from app.services import doctor_service
from app.services.llm_service import classify as llm_classify
from app.services.rag_service import RAGUnavailableError, retrieve_context

logger = logging.getLogger(__name__)

_GP_SPECIALTY = "Γενική Ιατρική"
_GP_NAME = "Γενικός Ιατρός"
_SAFE_REDIRECT = (
    f"https://finddoctors.gov.gr/search"
    f"?specialty={quote(_GP_SPECIALTY)}&doctor={quote(_GP_NAME)}"
)

_SAFE_DEFAULT = TriageResponse(
    mts_level=3,
    mts_label="Urgent",
    specialty=_GP_SPECIALTY,
    doctor={"name": _GP_NAME, "specialty": _GP_SPECIALTY, "availability": True, "fallback_note": "Αδυναμία επεξεργασίας — παρακαλώ επικοινωνήστε με ιατρό."},
    reasoning="Αδυναμία επεξεργασίας — παρακαλώ επικοινωνήστε με ιατρό.",
    redirect_url=_SAFE_REDIRECT,
    rag_used=False,
)


async def classify(symptoms: str, patient_id: str) -> TriageResponse:
    try:
        try:
            context = await retrieve_context(symptoms)
            llm_result = await llm_classify(symptoms=symptoms, context=context)
            rag_used = True
        except RAGUnavailableError as exc:
            logger.warning("RAG unavailable — falling back to LLM base knowledge", exc_info=exc)
            llm_result = await llm_classify(symptoms=symptoms, context="")
            rag_used = False

        doctor = doctor_service.get_match(llm_result["specialty"])
        redirect_url = (
            f"https://finddoctors.gov.gr/search"
            f"?specialty={quote(doctor.specialty)}&doctor={quote(doctor.name)}"
        )

        result = TriageResponse(
            rag_used=rag_used,
            doctor=doctor.model_dump(),
            redirect_url=redirect_url,
            **llm_result,
        )
    except Exception as exc:
        logger.error("Triage pipeline failure: %s", type(exc).__name__)
        return _SAFE_DEFAULT.model_copy()

    timestamp = datetime.now(tz=timezone.utc).isoformat()
    try:
        await append_entry(QueueEntry(
            patient_id=patient_id,
            mts_level=result.mts_level,
            specialty=result.specialty,
            timestamp=timestamp,
        ))
    except Exception as exc:
        logger.error("Queue append failure: %s", type(exc).__name__)

    return result
```

**Key design decisions:**
- Doctor matching and redirect URL construction are in the **service**, not the router
- `doctor_service.get_match()` never raises — so it is inside the outer `try/except` but it won't trigger the safe default
- `_SAFE_DEFAULT` now includes `doctor` and `redirect_url` matching the extended `TriageResponse`
- `_SAFE_REDIRECT` is a module-level constant — not constructed at each safe-default use
- `quote()` from `urllib.parse` handles URL encoding for Greek characters (critical — specialty like `"Καρδιολογία"` must be percent-encoded)
- Raw `llm_result` is a `dict` — spread with `**llm_result` since `llm_classify` returns a dict (see llm_service.py)
- `doctor.model_dump()` converts the `Doctor` Pydantic model to a plain dict for the `doctor: dict` field

---

### Required: Refactored `backend/app/routers/triage.py`

```python
from fastapi import APIRouter
from typing import List

from app.schemas.triage import QueueEntry, TriageRequest, TriageResponse
from app.services import triage_service
from app.core import queue

router = APIRouter()


@router.post("/triage", response_model=TriageResponse)
async def perform_triage(request: TriageRequest) -> TriageResponse:
    return await triage_service.classify(request.symptoms, request.patient_id)


@router.get("/triage/queue", response_model=List[QueueEntry])
async def get_queue() -> List[QueueEntry]:
    return await queue.get_all_entries()
```

**Critical:**
- ZERO business logic in the router — no imports of `doctor_service`, `random`, `uuid`, `Dict`, `Any`
- `response_model=TriageResponse` uses the updated schema from `schemas/triage.py`
- `TriageRequest` is imported from `schemas/triage.py` — not defined inline
- The queue endpoint is at `/triage/queue` (not `/queue`) — matches architecture `/api/v1/triage/queue`

**Note on queue endpoint path:** The current router has `@router.get("/queue")` which becomes `/api/v1/queue`. The correct path per the architecture spec (§ API endpoints) is `GET /api/v1/triage/queue`. Fix this by using `@router.get("/triage/queue")`.

---

### Required: `backend/main.py` — Check and Keep Global Exception Handler

`main.py` currently has a global exception handler:

```python
@app.exception_handler(Exception)
async def global_exception_handler(request, exc):
    return JSONResponse(
        status_code=500,
        content={"detail": str(exc), "trace": traceback.format_exc()}
    )
```

**This handler leaks implementation details (stack trace) in production.** However, for the demo/hackathon context it is acceptable. **Do not remove it** in this story — it is out of scope. Note this as a deferred improvement.

The `from app.routers import triage` and `app.include_router(triage.router, prefix="/api/v1")` are already in `main.py` — do NOT add them again.

---

### Required: `backend/tests/test_triage_router.py`

```python
from unittest.mock import AsyncMock, patch, MagicMock

import pytest
from httpx import AsyncClient, ASGITransport

from main import app
from app.schemas.triage import TriageResponse

_MOCK_RESPONSE = TriageResponse(
    mts_level=2,
    mts_label="Very Urgent",
    specialty="Καρδιολογία",
    doctor={"name": "Δρ. Τεστ", "specialty": "Καρδιολογία", "availability": True, "fallback_note": None},
    reasoning="Τεστ αιτιολόγηση.",
    redirect_url="https://finddoctors.gov.gr/search?specialty=%CE%9A%CE%B1%CF%81%CE%B4%CE%B9%CE%BF%CE%BB%CE%BF%CE%B3%CE%AF%CE%B1&doctor=%CE%94%CF%81.+%CE%A4%CE%B5%CF%83%CF%84",
    rag_used=True,
)


@pytest.fixture()
async def client():
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
        yield ac


@pytest.mark.asyncio
async def test_triage_post_returns_200_with_all_fields(client):
    with patch("app.services.triage_service.classify", new_callable=AsyncMock) as mock_classify:
        mock_classify.return_value = _MOCK_RESPONSE
        response = await client.post(
            "/api/v1/triage",
            json={"symptoms": "πόνος στο στήθος", "patient_id": "test-001"},
        )
    assert response.status_code == 200
    data = response.json()
    assert data["mts_level"] == 2
    assert data["mts_label"] == "Very Urgent"
    assert data["specialty"] == "Καρδιολογία"
    assert "doctor" in data
    assert "redirect_url" in data
    assert "reasoning" in data
    assert "rag_used" in data


@pytest.mark.asyncio
async def test_triage_response_is_flat_no_envelope(client):
    with patch("app.services.triage_service.classify", new_callable=AsyncMock) as mock_classify:
        mock_classify.return_value = _MOCK_RESPONSE
        response = await client.post(
            "/api/v1/triage",
            json={"symptoms": "πόνος στο στήθος", "patient_id": "test-001"},
        )
    data = response.json()
    assert "data" not in data
    assert "success" not in data
    assert "detail" not in data


@pytest.mark.asyncio
async def test_health_still_returns_ok(client):
    response = await client.get("/api/v1/health")
    assert response.status_code == 200
    assert response.json() == {"status": "ok"}


@pytest.mark.asyncio
async def test_triage_queue_returns_list(client):
    with patch("app.core.queue.get_all_entries", new_callable=AsyncMock) as mock_queue:
        mock_queue.return_value = []
        response = await client.get("/api/v1/triage/queue")
    assert response.status_code == 200
    assert isinstance(response.json(), list)


@pytest.mark.asyncio
async def test_triage_missing_symptoms_returns_422(client):
    response = await client.post(
        "/api/v1/triage",
        json={"patient_id": "test-001"},
    )
    assert response.status_code == 422


@pytest.mark.asyncio
async def test_triage_missing_patient_id_returns_422(client):
    response = await client.post(
        "/api/v1/triage",
        json={"symptoms": "πόνος στο στήθος"},
    )
    assert response.status_code == 422
```

**Test notes:**
- Tests use `httpx.AsyncClient` with `ASGITransport` — `httpx` is already in requirements (via `starlette` test dependency) or add it
- `pytest-asyncio` required — check `pytest.ini` already has `asyncio_mode = auto` (from Story 2.3 conftest)
- Mocking `triage_service.classify` is the right approach — we're testing the router layer, not the service
- The 422 tests verify `TriageRequest` schema enforcement (both fields are required `str`)
- If `httpx` is not in `requirements.txt`, add `httpx` to the test dependencies
- These tests do NOT require a running Ollama/ChromaDB/database — they mock at the service boundary

---

### Architecture Compliance

**MUST follow:**
- `TriageRequest` and `TriageResponse` models go in `schemas/triage.py` — NOT inline in the router
- Zero business logic in `routers/triage.py` — delegate entirely to `triage_service.classify`
- `routers/triage.py` must NOT import `doctor_service` directly
- `redirect_url` must use `urllib.parse.quote` for percent-encoding — Greek characters will otherwise break URLs
- `POST /api/v1/triage` must never return HTTP 500 — already handled by Story 2.3's fallback chain in `triage_service`
- All API JSON fields snake_case — enforced automatically by Pydantic model field names
- No envelope wrapper on response — direct `TriageResponse` serialisation

**Anti-patterns — explicitly forbidden:**
- ✗ Defining `TriageRequest` or `TriageResponse` inline in `routers/triage.py`
- ✗ Calling `doctor_service.get_all()` or `doctor_service.get_match()` from `routers/triage.py`
- ✗ Using `random.choice` for doctor selection (must use `doctor_service.get_match`)
- ✗ Mutating `result.reasoning` in the router (violation of immutability + business-logic-in-router)
- ✗ Making `doctor` or `redirect_url` optional in `TriageResponse` (`None` is not acceptable per contract)
- ✗ Making `patient_id` optional in `TriageRequest` (`str | None` is not acceptable)
- ✗ URL-constructing `redirect_url` without `quote()` — Greek specialty names contain non-ASCII characters

---

### Testing & Verification

```bash
cd backend

# Install httpx if not present
pip install httpx

# Run full test suite — must not break existing tests
pytest tests/ -v

# Expected: all existing tests + new tests pass
# Prior baseline: 27 tests passing (Stories 2.1–2.4)
# This story adds: ~6 new tests in test_triage_router.py

# Manual end-to-end verification (requires running stack):
curl -X POST http://localhost:8000/api/v1/triage \
  -H "Content-Type: application/json" \
  -d '{"symptoms": "πόνος στο στήθος", "patient_id": "test-001"}'

# Expected response shape (all fields present):
# {
#   "mts_level": 2,
#   "mts_label": "Very Urgent",
#   "specialty": "Καρδιολογία",
#   "doctor": {"name": "...", "specialty": "...", "availability": true, "fallback_note": null},
#   "reasoning": "...",
#   "redirect_url": "https://finddoctors.gov.gr/search?specialty=...",
#   "rag_used": true
# }

# Verify health endpoint still works:
curl http://localhost:8000/api/v1/health
# Expected: {"status": "ok"}

# Verify queue endpoint:
curl http://localhost:8000/api/v1/triage/queue
# Expected: [] or list of QueueEntry objects
```

---

### Previous Story Intelligence (Story 2.4 Learnings)

- **`doctor_service.get_match` never raises** — it always returns a `Doctor` object (either exact match, GP fallback, or synthetic GP). This means calling it inside the outer `try/except` in `triage_service` is safe — it won't accidentally trigger `_SAFE_DEFAULT`.
- **`doctor.model_dump()` produces a flat dict** — the `doctor: dict` field in `TriageResponse` will contain `{"name": ..., "specialty": ..., "availability": ..., "fallback_note": ...}`. Story 3.3's `DoctorCard.tsx` reads `fallback_note` from this dict to conditionally render the fallback message.
- **`fallback_note` is `None` on exact match** — when serialised via `model_dump()`, it becomes `null` in JSON. Frontend checks `if (doctor.fallback_note)` — no issues.
- **`_DOCTORS_FILE` path uses `Path(__file__).parent.parent.parent`** — this resolves correctly when running from `backend/` with `PYTHONPATH=backend`. In Docker the working directory is `/app` which is the `backend/` directory.
- **`DoctorDataLoadError` is raised on startup failure** — `main.py` catches it and re-raises `RuntimeError`. Story 2.5 does not need to add additional startup error handling.
- **Review finding: ROS `PYTHONPATH` pollution** — local testing requires `PYTHONPATH="/path/to/backend"`. In Docker this is handled by `WORKDIR /app` and `CMD uvicorn main:app`. CI tests may need `PYTHONPATH=backend pytest tests/`.

---

### Git Intelligence

- `90f684e tested the system so it works` — This commit already introduced `routers/triage.py` with a working-but-non-compliant implementation. The triage router is already registered in `main.py`. Story 2.5 must **replace** this with the architecturally correct implementation.
- `9ff629a feat: implement doctor service with dataset loading, API endpoint, and unit tests` — `doctor_service.py`, `schemas/doctor.py`, `routers/doctors.py` all committed and stable. `get_match()` is available and tested.
- `2685b3f feat: implement triage service orchestration with three-tier fallback and in-memory queue` — `triage_service.classify` is the function to extend with doctor matching.

---

### Project Structure Notes

**Files to MODIFY:**
- `backend/app/schemas/triage.py` — add `TriageRequest`; extend `TriageResponse` with `doctor: dict` and `redirect_url: str`
- `backend/app/services/triage_service.py` — integrate doctor matching + redirect URL; update `_SAFE_DEFAULT`
- `backend/app/routers/triage.py` — full refactor: remove inline schemas, remove business logic, route-only

**Files to CREATE:**
- `backend/tests/test_triage_router.py` — endpoint-level tests

**Files to NOT TOUCH:**
- `backend/main.py` — triage router already registered; `DoctorDataLoadError` handling already in place
- `backend/app/routers/health.py` — no changes
- `backend/app/routers/doctors.py` — no changes
- `backend/app/services/doctor_service.py` — no changes (used as-is via `get_match`)
- `backend/app/schemas/doctor.py` — no changes
- `backend/app/core/queue.py` — no changes
- `backend/tests/test_triage_service.py` — do NOT touch (18 existing tests must continue passing)
- `backend/tests/test_doctor_service.py` — do NOT touch

**`TriageResponse` field ordering for PRD contract fidelity:**
Per epics.md Story 2.5 AC: `mts_level`, `mts_label`, `specialty`, `doctor`, `reasoning`, `redirect_url`. Keep this order in the Pydantic model definition.

---

### `llm_service.classify` return shape (important)

`llm_service.classify(symptoms, context)` returns a **dict** (not a `TriageResponse`), with keys:
- `mts_level: int`
- `mts_label: str`  
- `specialty: str`
- `reasoning: str`

These are spread with `**llm_result` into `TriageResponse(...)`. The `doctor` and `redirect_url` fields are added separately after the doctor match call. This is why `triage_service` constructs `TriageResponse` explicitly rather than returning what `llm_classify` returns.

---

### References

- Epics file: `_bmad-output/planning-artifacts/epics.md` § Story 2.5 acceptance criteria; § FR4, FR8, FR9, FR16, FR17
- Architecture: `_bmad-output/planning-artifacts/architecture.md` § Structure Patterns — Router/Service/Schema; § API & Communication Patterns; § Enforcement Guidelines — anti-patterns
- Story 2.3: `_bmad-output/implementation-artifacts/2-3-triage-service-orchestration-and-fallback-chain.md` — three-tier fallback chain; `_SAFE_DEFAULT` pattern; never-raises guarantee
- Story 2.4: `_bmad-output/implementation-artifacts/2-4-mocked-doctor-dataset-and-doctor-service.md` § Story 2.5 Integration Contract — exact import pattern; redirect_url format; TriageResponse extension plan
- Architecture: `_bmad-output/planning-artifacts/architecture.md` § API endpoints — `/api/v1/triage`, `/api/v1/triage/queue`

## Dev Agent Record

### Agent Model Used

claude-sonnet-4-6

### Debug Log References

### Completion Notes List

- Implemented `TriageRequest` and extended `TriageResponse` with required `doctor: dict` and `redirect_url: str` fields in `schemas/triage.py`
- Integrated doctor matching and `urllib.parse.quote` URL encoding into `triage_service.py`; updated `_SAFE_DEFAULT` with full `doctor` dict and `redirect_url`
- Fully refactored `routers/triage.py` — zero business logic; imports schemas from `schemas/triage.py`; fixed queue path from `/queue` to `/triage/queue`
- Created `tests/test_triage_router.py` with 6 tests covering: 200 response, flat response shape, health endpoint, queue endpoint, and 422 validation for both missing fields
- Added `httpx` to `requirements.txt` (required by `ASGITransport`)
- All 6 new tests pass; 35 total tests pass; 2 pre-existing RAG failures unrelated to this story

### File List

- backend/app/schemas/triage.py (modified)
- backend/app/services/triage_service.py (modified)
- backend/app/routers/triage.py (modified)
- backend/tests/test_triage_router.py (created)
- backend/requirements.txt (modified)
