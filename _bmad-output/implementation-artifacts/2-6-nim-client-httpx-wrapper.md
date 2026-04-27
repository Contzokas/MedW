# Story 2.6: NIM Client httpx Wrapper

Status: review

## Story

As a developer,
I want a dedicated `nim_client.py` module in `backend/app/clients/` that owns all raw `httpx` calls to NVIDIA NIM and RAG Server endpoints,
So that the architecture boundary is enforced — no `services/` file makes direct HTTP calls to NVIDIA services — and the integration point is testable in isolation.

## Acceptance Criteria

1. **Given** the architecture mandate that `clients/nim_client.py` is the only file that calls NVIDIA services
   **When** the module is created
   **Then** `backend/app/clients/__init__.py` exists (may be empty)
   **And** `backend/app/clients/nim_client.py` is created with all NVIDIA httpx calls

2. **And** `nim_client.py` exposes `async def check_nim_ready(base_url: str, timeout: float) -> None` that performs `GET {base_url}/health/ready`, raises `httpx.HTTPStatusError` or `httpx.RequestError` on failure, and returns `None` on success

3. **And** `nim_client.py` exposes `async def query_rag_server(query: str, timeout: float) -> str` that calls `POST {RAG_SERVER_URL}/v1/query` with `{"query": query}`, extracts and returns the response text string, and raises `httpx.HTTPStatusError` or `httpx.RequestError` on failure

4. **And** `backend/app/core/config.py` gains `RAG_SERVER_URL: str = os.environ.get("RAG_SERVER_URL", "http://rag-server:8081")` and `RAG_SERVER_TIMEOUT: int` (clamped 1–600, default 30)

5. **And** `backend/app/services/llm_service.py` no longer imports or uses `httpx` directly — the `warmup_model()` function delegates the health probe to `nim_client.check_nim_ready()` instead of constructing its own `httpx.AsyncClient`

6. **And** no other `services/` or `routers/` file imports `httpx` for NVIDIA calls — all httpx usage for NVIDIA endpoints routes through `nim_client.py`

7. **And** `backend/tests/test_nim_client.py` contains unit tests covering:
   - `check_nim_ready` returns successfully when httpx gets a 200
   - `check_nim_ready` raises `httpx.HTTPStatusError` on non-200
   - `check_nim_ready` raises `httpx.RequestError` on connection failure
   - `query_rag_server` returns the expected string on a 200 response
   - `query_rag_server` raises on non-200 or connection failure

8. **And** the full existing test suite continues to pass after the refactor (`pytest backend/tests/` — excluding `test_rag_service.py` which requires `sentence_transformers`)

## Tasks / Subtasks

- [x] Create `backend/app/clients/__init__.py` (empty) (AC: #1)

- [x] Create `backend/app/clients/nim_client.py` (AC: #2, #3)
  - [x] `check_nim_ready(base_url: str, timeout: float) -> None`
  - [x] `query_rag_server(query: str, timeout: float) -> str` using `RAG_SERVER_URL` from config
  - [x] Greek UTF-8 safety: use `ensure_ascii=False` if any JSON payload contains Greek text

- [x] Add `RAG_SERVER_URL` and `RAG_SERVER_TIMEOUT` to `backend/app/core/config.py` (AC: #4)

- [x] Refactor `llm_service.warmup_model()` to use `nim_client.check_nim_ready()` (AC: #5)
  - [x] Remove `import httpx` from `llm_service.py` (or remove the httpx usage entirely if it's only used for warmup)
  - [x] `warmup_model` calls `await nim_client.check_nim_ready(NIM_BASE_URL, float(NIM_TIMEOUT))` in each retry loop

- [x] Audit all `services/` and `routers/` files for direct httpx NVIDIA calls (AC: #6)

- [x] Write `backend/tests/test_nim_client.py` with all required tests using `respx` or `unittest.mock` to mock httpx (AC: #7)

- [x] Run `pytest backend/tests/` and confirm all tests pass (AC: #8)

## Dev Notes

### Why This Story Exists

The architecture mandates `clients/nim_client.py` as the **single integration point** for all NVIDIA NIM and RAG Server HTTP calls. Currently, `llm_service.py` violates this boundary:
- It directly imports `httpx` and constructs its own `httpx.AsyncClient` in `warmup_model()` to call `GET {NIM_BASE_URL}/health/ready`
- This makes the httpx call untestable without mocking at the `llm_service` level

Story 2.6 fixes the architecture violation and creates the client module that future stories (and `triage_service` integration with the NVIDIA RAG Server) will depend on.

### Existing Code to Know Before Starting

**`backend/app/services/llm_service.py`** — the ONLY file currently importing httpx:
```python
import httpx
from app.core.config import NIM_BASE_URL, NIM_MODEL, NIM_API_KEY, NIM_TIMEOUT, ...

async def warmup_model() -> None:
    timeout = httpx.Timeout(timeout=float(NIM_TIMEOUT))
    endpoint = f"{NIM_BASE_URL.rstrip('/')}/health/ready"
    for attempt in range(1, NIM_WARMUP_RETRIES + 1):
        ...
        async with httpx.AsyncClient(timeout=timeout) as client:
            response = await client.get(endpoint)
            response.raise_for_status()
        ...
```
The refactor extracts this `httpx.AsyncClient` block into `nim_client.check_nim_ready()`.

**`backend/app/core/config.py`** — current state (no RAG_SERVER_URL yet):
```python
NIM_BASE_URL: str = os.environ.get("NIM_BASE_URL", "http://nim:8000/v1")
NIM_MODEL: str = os.environ.get("NIM_MODEL", "nvidia/nemotron-3-super-120b-a12b")
NIM_API_KEY: str = os.environ.get("NIM_API_KEY", "nim-local")
NIM_TIMEOUT: int = ...  # clamped 1–600, default 120
NIM_WARMUP_ENABLED: bool = ...
NIM_WARMUP_RETRIES: int = ...
NIM_WARMUP_RETRY_DELAY_SECONDS: int = ...
CHROMA_HOST: str = ...
CHROMA_PORT: int = ...
QUEUE_MAX_ENTRIES: int = ...
```
Add `RAG_SERVER_URL` and `RAG_SERVER_TIMEOUT` following the same pattern.

### nim_client.py Implementation Pattern

Architecture sample code (from architecture.md):
```python
# nim_client.py — the ONLY place that calls NVIDIA services
async with httpx.AsyncClient(base_url=settings.RAG_SERVER_URL, timeout=30.0) as client:
    response = await client.post("/v1/generate", json={"query": query})
    response.raise_for_status()
```

The module signature should be:
```python
import httpx
from app.core.config import NIM_BASE_URL, NIM_TIMEOUT, RAG_SERVER_URL, RAG_SERVER_TIMEOUT

async def check_nim_ready(base_url: str = NIM_BASE_URL, timeout: float = float(NIM_TIMEOUT)) -> None:
    """Probe NIM health endpoint. Raises httpx errors on failure."""
    endpoint = f"{base_url.rstrip('/')}/health/ready"
    async with httpx.AsyncClient(timeout=httpx.Timeout(timeout)) as client:
        response = await client.get(endpoint)
        response.raise_for_status()

async def query_rag_server(query: str, timeout: float = float(RAG_SERVER_TIMEOUT)) -> str:
    """Call NVIDIA RAG Server. Returns response text. Raises httpx errors on failure."""
    async with httpx.AsyncClient(base_url=RAG_SERVER_URL, timeout=httpx.Timeout(timeout)) as client:
        response = await client.post("/v1/query", json={"query": query})
        response.raise_for_status()
        data = response.json()
        return data.get("text", data.get("answer", ""))
```

**Note on RAG Server endpoint**: The architecture shows `/v1/generate` but NVIDIA RAG Blueprint typically uses `/v1/query`. Use `/v1/query` as the default — the exact path can be adjusted post-deployment. Do NOT hardcode the full path in callers; keep it in `nim_client.py`.

### Refactoring llm_service.warmup_model()

Before (current `llm_service.py`):
```python
import httpx
...
async def warmup_model() -> None:
    ...
    timeout = httpx.Timeout(timeout=float(NIM_TIMEOUT))
    endpoint = f"{NIM_BASE_URL.rstrip('/')}/health/ready"
    for attempt in range(1, NIM_WARMUP_RETRIES + 1):
        _warmup_state["attempts"] = attempt
        _warmup_state["last_attempt_at"] = _utc_now_iso()
        try:
            async with httpx.AsyncClient(timeout=timeout) as client:
                response = await client.get(endpoint)
                response.raise_for_status()
            ...
```

After (refactored `llm_service.py`):
```python
from app.clients import nim_client  # replaces direct httpx import
...
async def warmup_model() -> None:
    ...
    for attempt in range(1, NIM_WARMUP_RETRIES + 1):
        _warmup_state["attempts"] = attempt
        _warmup_state["last_attempt_at"] = _utc_now_iso()
        try:
            await nim_client.check_nim_ready(NIM_BASE_URL, float(NIM_TIMEOUT))
            ...
```

Everything else in `warmup_model()` (the `_warmup_state` updates, logging, retry sleep) stays exactly the same. Do not change the warmup retry logic, state tracking, or error handling — only replace the httpx.AsyncClient block.

### File Structure

```
backend/app/clients/          ← NEW directory
    __init__.py               ← empty
    nim_client.py             ← new module

backend/app/core/config.py    ← add RAG_SERVER_URL, RAG_SERVER_TIMEOUT
backend/app/services/llm_service.py  ← refactor: remove httpx import, use nim_client
backend/tests/test_nim_client.py     ← new test file
```

### Testing Pattern

Use `respx` (if available) or `unittest.mock.patch` to mock httpx:

```python
# Using unittest.mock approach (no extra dependency):
from unittest.mock import AsyncMock, MagicMock, patch
import httpx
import pytest

from app.clients import nim_client

async def test_check_nim_ready_success():
    mock_response = MagicMock()
    mock_response.raise_for_status = MagicMock()  # does not raise
    with patch("httpx.AsyncClient") as mock_client_cls:
        mock_client_cls.return_value.__aenter__ = AsyncMock(return_value=MagicMock(
            get=AsyncMock(return_value=mock_response)
        ))
        mock_client_cls.return_value.__aexit__ = AsyncMock(return_value=False)
        await nim_client.check_nim_ready("http://nim:8000/v1", 5.0)
        # No exception raised = pass

async def test_check_nim_ready_raises_on_non_200():
    with patch("httpx.AsyncClient") as mock_client_cls:
        mock_response = MagicMock()
        mock_response.raise_for_status.side_effect = httpx.HTTPStatusError(
            "500", request=MagicMock(), response=MagicMock()
        )
        mock_client_cls.return_value.__aenter__ = AsyncMock(return_value=MagicMock(
            get=AsyncMock(return_value=mock_response)
        ))
        mock_client_cls.return_value.__aexit__ = AsyncMock(return_value=False)
        with pytest.raises(httpx.HTTPStatusError):
            await nim_client.check_nim_ready("http://nim:8000/v1", 5.0)
```

Alternatively, check if `respx` is in the environment (`pip show respx`). If present, use it — it's cleaner for httpx mocking.

**If `respx` is NOT in requirements.txt**, do NOT add it — use `unittest.mock` approach above.

### Architecture Compliance Checklist

**Must follow:**
- `nim_client.py` is the **only** file that imports `httpx` for NVIDIA calls
- No `services/` or `routers/` file may call `httpx.AsyncClient` targeting NIM or RAG Server
- `ensure_ascii=False` on all JSON payloads containing potential Greek text
- Business logic stays in `services/` — `nim_client.py` is a thin transport wrapper only
- Do NOT add retry logic to `nim_client.py` — retries live in `llm_service.warmup_model()`

**Anti-patterns to avoid:**
- ✗ Adding retry or fallback logic to `nim_client.py` (that belongs in services)
- ✗ Moving `warmup_model()` itself into `nim_client.py` (it's a service concern)
- ✗ Changing the warmup retry loop, state tracking, or logging in `llm_service.py`
- ✗ Breaking the existing `warmup_model()` external API (used by `main.py` lifespan)
- ✗ Adding `nim_client.py` calls to `rag_service.py` (ChromaDB path is separate)
- ✗ Changing any existing test assertions

### Regression Risk

**High-risk area**: `llm_service.warmup_model()` is called in `main.py` during the FastAPI lifespan startup (`await warmup_model()`). The refactor must not change the behavior of warmup — only where the httpx call lives. The 74 existing passing tests must all continue to pass.

**`test_triage_router.py`** has a test `test_warmup_health_status_shape` that checks `warmup` dict keys — those keys come from `get_warmup_status()` which reads `_warmup_state`. Do NOT change `_warmup_state` structure or `get_warmup_status()`.

### Previous Story Context (2.5)

Story 2.5 was a verification story — no new code was written. The key learning: 2 tests were broken by the NIM pivot (health endpoint shape changed). This confirms the test suite is sensitive to service API contract changes. Keep the warmup interface identical.

From 2.5 dev notes:
- 74 tests pass (excluding `test_rag_service.py` which needs `sentence_transformers`)
- `test_triage_router.py` test `test_warmup_health_status_shape` checks specific warmup keys — these must remain intact

### Git Context

Recent commits show the DinD RAG Blueprint deployment work (56bdcbd, ccfb93a, etc.) established the NIM infrastructure. This story creates the Python client module that properly wraps those NIM endpoint calls.

## Dev Agent Record

### Agent Model Used

claude-sonnet-4-6

### Debug Log References

### Completion Notes List

- Created `backend/app/clients/__init__.py` (empty) and `backend/app/clients/nim_client.py` as the sole httpx transport wrapper for NVIDIA services.
- `check_nim_ready` probes `{base_url}/health/ready` via GET; raises httpx errors on failure.
- `query_rag_server` POSTs to `/v1/query` with `ensure_ascii=False` JSON encoding for Greek UTF-8 safety; returns `text` field (falls back to `answer`).
- Added `RAG_SERVER_URL` and `RAG_SERVER_TIMEOUT` (clamped 1–600, default 30) to `config.py` following existing NIM_TIMEOUT pattern.
- Refactored `llm_service.warmup_model()`: removed `import httpx`, replaced `httpx.AsyncClient` block with `await nim_client.check_nim_ready(NIM_BASE_URL, float(NIM_TIMEOUT))`. All warmup retry logic, state tracking, and logging unchanged.
- Audit confirmed `llm_service.py` was the only file importing httpx for NVIDIA calls — no other services/routers affected.
- Wrote 7 unit tests in `test_nim_client.py` using `unittest.mock` (no new dependencies).
- Full test suite: 81 passed, 0 failures (74 pre-existing + 7 new). `test_warmup_health_status_shape` passes unchanged.

### File List

- backend/app/clients/__init__.py (new)
- backend/app/clients/nim_client.py (new)
- backend/app/core/config.py (modified — add RAG_SERVER_URL, RAG_SERVER_TIMEOUT)
- backend/app/services/llm_service.py (modified — remove httpx import, use nim_client)
- backend/tests/test_nim_client.py (new)

## Change Log

- 2026-04-27: Story created. Status → ready-for-dev.
- 2026-04-27: Implementation complete. Status → review. Created clients/ package with nim_client.py; updated config.py; refactored llm_service warmup; 7 new tests; 81/81 pass.
