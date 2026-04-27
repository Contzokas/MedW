# Story 2.5: POST /api/v1/triage Endpoint

Status: review

## Story

As a developer,
I want the triage API endpoint wired to the triage service with validated Pydantic schemas,
So that the complete API contract from the PRD is met and the endpoint can be tested end-to-end via an API client.

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

- [x] Verify `backend/app/schemas/triage.py` defines correct `TriageRequest` and `TriageResponse` models (AC: #1)
  - [x] `TriageRequest`: `symptoms: str`, `patient_id: str`, `lang: Literal["en","el"] = "el"`
  - [x] `TriageResponse`: `mts_level: int`, `mts_label: str`, `specialty: str`, `doctor: Doctor`, `reasoning: str`, `redirect_url: str`, `rag_used: bool`

- [x] Verify `backend/app/routers/triage.py` POST endpoint delegates to `triage_service.classify` (AC: #2, #3, #4)
  - [x] `POST /triage` route calls `triage_service.classify(request.symptoms, request.patient_id, request.lang)`
  - [x] No business logic in router — thin delegation only

- [x] Verify response shape: flat JSON, snake_case fields, no envelope (AC: #5, #6)

- [x] Fix stale health endpoint tests broken by NIM pivot (AC: #7)
  - [x] `test_health_still_returns_ok` — relax assertion to `response.json()["status"] == "ok"` (health endpoint now includes `nim_warmup` field)
  - [x] `test_warmup_health_status_shape` — remove `keep_alive` from expected keys (removed when switching from Ollama to NIM)

- [x] Run full test suite — all tests pass (AC: #3–#7)

## Dev Notes

### What Already Exists

This story was effectively pre-implemented as part of the triage_service rewrite (Story 2.3) and NIM pivot. When this story was due for formal verification, all core implementation was already in place:

- `backend/app/schemas/triage.py` — `TriageRequest`, `TriageResponse`, `QueueEntry` fully defined
- `backend/app/routers/triage.py` — `POST /triage` and `GET /triage/queue` (SSE) implemented
- `backend/tests/test_triage_router.py` — 11 tests covering all ACs

### NIM Pivot Side Effects

The NIM pivot (switching from Ollama/llm_service to NIM client) changed the health endpoint shape:
- `GET /api/v1/health` now returns `{"status": "ok", "nim_warmup": {...}}` instead of `{"status": "ok"}`
- `GET /api/v1/health/warmup` warmup object no longer contains `keep_alive` field

Two tests in `test_triage_router.py` were written against the pre-NIM health shape and had to be updated to reflect current behavior.

### Schema Notes

`TriageResponse` includes `rag_used: bool = True` beyond the original AC — this was added during the NIM integration to surface whether the RAG retrieval path was used. The PRD contract fields are all present. The `doctor` field is typed as `Doctor` (Pydantic model), which serializes to a dict matching the AC.

`TriageRequest` includes an optional `lang: Literal["en", "el"] = "el"` field beyond the original AC — added to support bilingual operation. This is additive and does not break the AC contract.

## Dev Agent Record

### Agent Model Used

claude-sonnet-4-6

### Debug Log References

### Completion Notes List

- Story was pre-implemented through prior story work. Verification and test fixes completed in a single session (2026-04-27).
- Fixed 2 stale tests broken by NIM health endpoint shape change: `test_health_still_returns_ok` and `test_warmup_health_status_shape`.
- 74 tests pass (0 failures, excluding test_rag_service.py which requires external sentence_transformers dependency).
- All 8 ACs satisfied by existing implementation.

### File List

- backend/app/schemas/triage.py (pre-existing, verified)
- backend/app/routers/triage.py (pre-existing, verified)
- backend/tests/test_triage_router.py (modified — fixed 2 stale health test assertions)

## Change Log

- 2026-04-27: Verified Story 2.5 implementation complete. Fixed 2 stale health endpoint test assertions broken by NIM pivot. All 74 tests pass. Status → review.
