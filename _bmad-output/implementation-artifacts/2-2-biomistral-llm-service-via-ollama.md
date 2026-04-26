# Story 2.2: Mistral LLM Service via Ollama

Status: done

## Story

As a developer,
I want an LLM service that sends structured prompts to Mistral-7B via Ollama and parses structured triage output,
So that the AI pipeline can produce MTS classifications, specialty recommendations, and reasoning in Greek.

## Acceptance Criteria

1. **Given** a running Ollama service with `mistral:7b` loaded
   **When** `llm_service.classify(symptoms: str, context: str) -> dict` is called
   **Then** a LangChain LCEL chain constructs a prompt combining the symptom text and retrieved context, targeting Mistral-7B via the Ollama LangChain community integration (`langchain_community.chat_models.ChatOllama`)

2. **And** the prompt instructs the model to return a JSON-parseable response containing `mts_level` (integer 1–5), `mts_label` (string), `specialty` (string in Greek), and `reasoning` (string in Greek)

3. **And** the output parser extracts these fields from the model response; if JSON parsing fails or required fields are missing, a `LLMParseError` is raised

4. **And** `mts_label` maps correctly to the MTS standard: 1=Immediate, 2=Very Urgent, 3=Urgent, 4=Less Urgent, 5=Non-urgent

5. **And** the service includes a `TODO` comment documenting the Greek medical terminology validation requirement and fallback strategy (translate to English before inference, return result in Greek) if classification accuracy is below 80% on test cases

6. **And** symptom text is never included in any log statement at any log level — only `patient_id` may appear in logs (NFR5, NFR6)

7. **And** a unit test in `backend/tests/test_triage_service.py` confirms the output parser handles a well-formed mock LLM response and raises `LLMParseError` on malformed output

## Tasks / Subtasks

- [x] Add `OLLAMA_MODEL` to `backend/app/core/config.py` (AC: #1)
  - [x] `OLLAMA_MODEL: str = os.environ.get("OLLAMA_MODEL", "mistral:7b")`

- [x] Create `backend/app/services/llm_service.py` (AC: #1–#6)
  - [x] Define `LLMParseError` exception class
  - [x] Implement `_build_chain()` — returns `ChatPromptTemplate | ChatOllama | StrOutputParser` LCEL chain
  - [x] Implement `_invoke_chain_sync(symptoms: str, context: str) -> str` — synchronous chain invocation (monkeypatch target for tests)
  - [x] Implement `_parse_response(raw: str) -> dict` — regex-extract JSON from raw string, validate required fields and `mts_level` range, raise `LLMParseError` on any failure
  - [x] Implement `async def classify(symptoms: str, context: str) -> dict` — calls `asyncio.to_thread(_invoke_chain_sync, ...)` then `_parse_response`; wraps non-parse exceptions in `LLMParseError`
  - [x] Add Greek validation TODO comment (see Dev Notes below)
  - [x] Verify no log statement references the `symptoms` variable or its content

- [x] Create `backend/tests/test_triage_service.py` (AC: #7)
  - [x] Test: `_parse_response` returns correct dict for well-formed JSON string
  - [x] Test: `_parse_response` raises `LLMParseError` on non-JSON string
  - [x] Test: `_parse_response` raises `LLMParseError` when required field is missing
  - [x] Test: `_parse_response` raises `LLMParseError` when `mts_level` is out of range (e.g., 6)
  - [x] Test: `classify()` returns correct dict when `_invoke_chain_sync` is monkeypatched to return valid JSON

### Review Findings

- [x] [Review][Patch] `mts_label` not cross-validated against canonical `MTS_LABELS` mapping — model can return `mts_level=1, mts_label="Non-urgent"` and pass unchallenged; also no test for this case [backend/app/services/llm_service.py:64-84]
- [x] [Review][Patch] Greedy regex `re.search(r"\{.*\}", raw, re.DOTALL)` matches first `{` to last `}`, corrupting extraction when model emits prose-wrapped or multi-object output [backend/app/services/llm_service.py:66]
- [x] [Review][Patch] No timeout on `ChatOllama` HTTP call — stalled Ollama request blocks thread-pool workers indefinitely [backend/app/services/llm_service.py:53]
- [x] [Review][Patch] Symptom content may leak into logs via `exc_info=True` exception chain and `LLMParseError(f"JSON decode failed: {exc}")` embedding raw LLM output (NFR5/NFR6) [backend/app/services/llm_service.py:97, 72]
- [x] [Review][Patch] `_parse_response` raises `LLMParseError` silently with no `logger.warning` — parse failures leave no diagnostic trace in logs [backend/app/services/llm_service.py:67-84]
- [x] [Review][Patch] `mts_label`, `specialty`, `reasoning` accepted as-is with no emptiness or type check — model can return `null` or `""` and it passes [backend/app/services/llm_service.py:74-76]
- [x] [Review][Patch] `int(data["mts_level"])` silently truncates float from JSON (e.g., `1.6 → 1`) instead of rejecting it [backend/app/services/llm_service.py:80]
- [x] [Review][Defer] `_build_chain()` reconstructed per call — no module-level singleton; performance concern [backend/app/services/llm_service.py:57] — deferred, pre-existing
- [x] [Review][Defer] Empty `symptoms`/`context` input not guarded in `classify()` — validation belongs at the Story 2.3 API boundary — deferred, pre-existing
- [x] [Review][Defer] No retry/circuit-breaker around Ollama call — resilience is an orchestration concern for Story 2.3 — deferred, pre-existing
- [x] [Review][Defer] `temperature=0` not externalised to config — deliberate design choice per spec; externalising adds complexity without clear benefit — deferred, pre-existing
- [x] [Review][Defer] Test does not assert `asyncio.to_thread` was invoked — implementation detail, outcome is fully covered — deferred, pre-existing

### Review Findings (Round 2 — patch verification)

- [x] [Review][Patch] `exc_info=True` removed from `classify()` error log — stacktrace lost for production diagnosis; restore with type-name-only message for PHI safety [backend/app/services/llm_service.py:142]
- [x] [Review][Patch] `mts_label` non-empty guard in field-loop is dead code — mismatch check always fires first for any non-canonical value [backend/app/services/llm_service.py:128-132]
- [x] [Review][Patch] `OLLAMA_TIMEOUT` silently falls back to 30 on invalid env value with no warning; also accepts 0/negative without guard [backend/app/core/config.py:5-8]
- [x] [Review][Defer] `_extract_json_object` returns first JSON object when model emits multiple — prompt design and field validation act as safety net [backend/app/services/llm_service.py:51-77] — deferred, pre-existing

## Dev Notes

### What Already Exists — Read Before Implementing

**`backend/app/core/config.py`** — has `OLLAMA_HOST`, `CHROMA_HOST`, `CHROMA_PORT`. Add `OLLAMA_MODEL` here; do NOT hardcode `"mistral:7b"` in `llm_service.py`.

```python
# Current config.py (add OLLAMA_MODEL line):
OLLAMA_HOST: str = os.environ.get("OLLAMA_HOST", "http://ollama:11434")
OLLAMA_MODEL: str = os.environ.get("OLLAMA_MODEL", "mistral:7b")  # ADD THIS
```

**`backend/requirements.txt`** — already has `langchain==1.2.15`, `langchain-core==1.2.29`, `langchain-community`. No new packages needed for this story.

**`backend/app/services/rag_service.py`** — already exists (Story 2.1). Use `asyncio.to_thread` pattern for synchronous blocking calls, consistent with `rag_service.py`.

**`backend/tests/conftest.py`** — exists (Story 2.1). `pytest.ini` has `asyncio_mode = auto`.

**`backend/app/services/`** — `rag_service.py` exists. Create `llm_service.py` here.

**`backend/tests/test_triage_service.py`** — does NOT yet exist. Create it in this story.

**`backend/tests/test_rag_service.py`** — exists (Story 2.1). Follow its monkeypatch patterns.

### Required: `backend/app/core/config.py` change

Add one line after `OLLAMA_HOST`:

```python
OLLAMA_MODEL: str = os.environ.get("OLLAMA_MODEL", "mistral:7b")
```

### Required: `backend/app/services/llm_service.py`

```python
import asyncio
import json
import logging
import re

from langchain_community.chat_models import ChatOllama
from langchain_core.output_parsers import StrOutputParser
from langchain_core.prompts import ChatPromptTemplate

from app.core.config import OLLAMA_HOST, OLLAMA_MODEL

logger = logging.getLogger(__name__)

MTS_LABELS = {
    1: "Immediate",
    2: "Very Urgent",
    3: "Urgent",
    4: "Less Urgent",
    5: "Non-urgent",
}

# TODO: Greek medical terminology validation required in Sprint 1.
# Run classify() against ≥20 Greek symptom test cases covering MTS levels 1–5.
# If MTS classification accuracy falls below 80%:
#   Fallback strategy: translate `symptoms` to English before LLM inference,
#   then instruct the model to return `reasoning` in Greek.
#   Implement as: symptoms_en = translate_to_english(symptoms); classify(symptoms_en, context)
#   Translation can use a secondary Ollama call or a lightweight library (e.g., googletrans).
#   Document accuracy results and chosen approach in the Story 2.2 dev agent record.

_SYSTEM_PROMPT = (
    "You are a medical triage assistant using the Manchester Triage System (MTS). "
    "Analyse the patient's symptoms using the provided clinical context. "
    "Respond ONLY with a valid JSON object — no explanation, no markdown, no extra text."
)

_HUMAN_TEMPLATE = (
    "Clinical context:\n{context}\n\n"
    "Patient symptoms (Greek):\n{symptoms}\n\n"
    "Return JSON with exactly these fields:\n"
    '{{"mts_level": <integer 1-5>, "mts_label": "<string>", '
    '"specialty": "<Greek specialty name>", "reasoning": "<explanation in Greek>"}}\n\n'
    "MTS levels: 1=Immediate, 2=Very Urgent, 3=Urgent, 4=Less Urgent, 5=Non-urgent\n"
    "specialty must be a Greek medical specialty name (e.g. Καρδιολογία, Νευρολογία, Γενική Ιατρική)."
)


class LLMParseError(Exception):
    pass


def _build_chain():
    llm = ChatOllama(base_url=OLLAMA_HOST, model=OLLAMA_MODEL, temperature=0)
    prompt = ChatPromptTemplate.from_messages(
        [("system", _SYSTEM_PROMPT), ("human", _HUMAN_TEMPLATE)]
    )
    return prompt | llm | StrOutputParser()


def _invoke_chain_sync(symptoms: str, context: str) -> str:
    chain = _build_chain()
    return chain.invoke({"symptoms": symptoms, "context": context})


def _parse_response(raw: str) -> dict:
    match = re.search(r"\{.*\}", raw, re.DOTALL)
    if not match:
        raise LLMParseError(f"No JSON object found in LLM response")
    try:
        data = json.loads(match.group())
    except json.JSONDecodeError as exc:
        raise LLMParseError(f"JSON decode failed: {exc}") from exc

    required = {"mts_level", "mts_label", "specialty", "reasoning"}
    missing = required - set(data.keys())
    if missing:
        raise LLMParseError(f"Missing required fields: {missing}")

    try:
        mts_level = int(data["mts_level"])
    except (TypeError, ValueError) as exc:
        raise LLMParseError(f"mts_level is not an integer: {data['mts_level']}") from exc
    if mts_level not in range(1, 6):
        raise LLMParseError(f"mts_level out of range 1–5: {mts_level}")

    data["mts_level"] = mts_level
    return data


async def classify(symptoms: str, context: str) -> dict:
    try:
        raw = await asyncio.to_thread(_invoke_chain_sync, symptoms, context)
        return _parse_response(raw)
    except LLMParseError:
        raise
    except Exception as exc:
        logger.error("LLM invocation failed: %s", exc, exc_info=True)
        raise LLMParseError(f"LLM service error: {exc}") from exc
```

**Key design decisions:**
- `_invoke_chain_sync` is extracted as a named function so tests can monkeypatch it cleanly (same pattern as `_seed_sync` / `_retrieve_sync` in `rag_service.py`).
- `asyncio.to_thread` wraps the synchronous LangChain `chain.invoke()` — consistent with `rag_service.py`; avoids blocking the event loop.
- `_parse_response` uses `re.search(r"\{.*\}", raw, re.DOTALL)` to extract JSON even if Mistral wraps it in prose. This is critical — Mistral 7B occasionally adds explanation text before/after the JSON despite prompt instructions.
- `LLMParseError` is raised for both parse failures AND chain invocation failures. Story 2.3 catches this single exception type to activate tier-3 fallback. Do NOT raise bare `Exception`.
- `temperature=0` for deterministic, structured JSON output.
- **NEVER log `symptoms` or `context`** — only log the exception message (which must not contain patient data).

### Required: `backend/tests/test_triage_service.py`

```python
import pytest

from app.services.llm_service import LLMParseError, _parse_response, classify


VALID_JSON = (
    '{"mts_level": 2, "mts_label": "Very Urgent", '
    '"specialty": "Καρδιολογία", "reasoning": "Πόνος στο στήθος με ακτινοβολία."}'
)


def test_parse_response_returns_correct_dict():
    result = _parse_response(VALID_JSON)
    assert result["mts_level"] == 2
    assert result["mts_label"] == "Very Urgent"
    assert result["specialty"] == "Καρδιολογία"
    assert "reasoning" in result


def test_parse_response_extracts_json_from_prose():
    wrapped = f"Sure, here is the result:\n{VALID_JSON}\nHope that helps."
    result = _parse_response(wrapped)
    assert result["mts_level"] == 2


def test_parse_response_raises_on_non_json():
    with pytest.raises(LLMParseError):
        _parse_response("I cannot determine the MTS level.")


def test_parse_response_raises_on_missing_field():
    incomplete = '{"mts_level": 3, "mts_label": "Urgent", "specialty": "Γενική Ιατρική"}'
    with pytest.raises(LLMParseError, match="Missing required fields"):
        _parse_response(incomplete)


def test_parse_response_raises_on_out_of_range_mts_level():
    bad = '{"mts_level": 6, "mts_label": "X", "specialty": "X", "reasoning": "X"}'
    with pytest.raises(LLMParseError, match="mts_level out of range"):
        _parse_response(bad)


async def test_classify_returns_dict_with_mocked_chain(monkeypatch):
    def mock_invoke(symptoms, context):
        return VALID_JSON

    monkeypatch.setattr("app.services.llm_service._invoke_chain_sync", mock_invoke)
    result = await classify("πόνος στο στήθος", "MTS clinical context")
    assert result["mts_level"] == 2
    assert result["specialty"] == "Καρδιολογία"


async def test_classify_raises_llm_parse_error_on_bad_response(monkeypatch):
    def mock_invoke(symptoms, context):
        return "not json at all"

    monkeypatch.setattr("app.services.llm_service._invoke_chain_sync", mock_invoke)
    with pytest.raises(LLMParseError):
        await classify("πόνος", "context")


async def test_classify_wraps_chain_exception_in_llm_parse_error(monkeypatch):
    def mock_invoke(symptoms, context):
        raise ConnectionError("Ollama unreachable")

    monkeypatch.setattr("app.services.llm_service._invoke_chain_sync", mock_invoke)
    with pytest.raises(LLMParseError, match="LLM service error"):
        await classify("πόνος", "context")
```

**Notes on test approach:**
- `test_classify_*` tests are `async` — `asyncio_mode = auto` in `pytest.ini` handles them automatically (from Story 2.1).
- Monkeypatching `_invoke_chain_sync` avoids any real Ollama connection — no running service required.
- `test_parse_response_extracts_json_from_prose` is critical — Mistral 7B is known to wrap JSON in prose; the `re.search` approach must handle this.
- Do NOT mock the `_parse_response` function — test it directly to validate the parsing logic.

### Architecture Compliance

**MUST follow:**
- `llm_service.py` lives in `backend/app/services/` — only location for business logic
- `classify` signature: `async def classify(symptoms: str, context: str) -> dict` — this is what Story 2.3 calls
- `LLMParseError` must be importable as `from app.services.llm_service import classify, LLMParseError` — Story 2.3 imports both
- Ollama accessed only from `llm_service.py` — no other file imports `ChatOllama` or calls Ollama directly
- `OLLAMA_HOST` and `OLLAMA_MODEL` from `app.core.config` — never hardcoded in service
- `temperature=0` on `ChatOllama` — required for deterministic JSON output
- No symptom text in any log statement at any level

**Anti-patterns — explicitly forbidden:**
- Do NOT call `classify()` from a FastAPI router — all calls go through `triage_service.py` (Story 2.3)
- Do NOT raise bare `Exception` from `classify()` — always `LLMParseError`
- Do NOT log `symptoms` or `context` content at any log level
- Do NOT use `chain.ainvoke()` directly in `classify()` — use `asyncio.to_thread(_invoke_chain_sync, ...)` for consistency with `rag_service.py` and monkeypatching support
- Do NOT import `Ollama` (text LLM) — use `ChatOllama` (chat model); Mistral 7B is a chat model

### Dependencies and Integration Points

**Story 2.3 imports from this story:**
```python
from app.services.llm_service import classify, LLMParseError
# Usage in triage_service.py:
result = await classify(symptoms=symptoms, context=context)
# Fallback: catches LLMParseError to activate tier-3 safe default
```

**This story does NOT interact with:**
- `rag_service.py` — no dependency (RAG context is passed in as a parameter, retrieved by triage_service)
- `doctor_service.py` (Story 2.4) — no dependency
- Any router file — no routers in this story
- Any schema file — no Pydantic schemas created here

### File Structure Impact

Files changed by this story:
```
backend/
├── app/
│   ├── core/
│   │   └── config.py         ← MODIFY: add OLLAMA_MODEL
│   └── services/
│       └── llm_service.py    ← CREATE
└── tests/
    └── test_triage_service.py ← CREATE
```

Do NOT modify:
- `backend/main.py` — lifespan event (from Story 2.1) does NOT call anything in `llm_service.py`
- `backend/app/services/rag_service.py` — untouched
- `backend/requirements.txt` — all required packages already present
- `backend/pytest.ini` — already configured
- `backend/tests/conftest.py` — already configured
- `docker-compose.yml` — already has OLLAMA_HOST; add OLLAMA_MODEL to environment section if desired (optional for this story; defaults work)

### Previous Story Intelligence (Story 2.1 Learnings)

- **Model is `mistral:7b`**, NOT `biomistral:7b` — spec drift resolved before PR merge. The `OLLAMA_MODEL` default must be `"mistral:7b"`.
- **`asyncio.to_thread` pattern is established** for wrapping synchronous blocking calls. Use it for `_invoke_chain_sync` — same as `_seed_sync` / `_retrieve_sync` in `rag_service.py`.
- **Extract a named sync function** (`_invoke_chain_sync`) for monkeypatching in tests — this is the tested pattern. Do not inline the chain call in `classify()`.
- **`chromadb.Client()` was removed in chromadb 1.x** (use `EphemeralClient()`) — for this story, no chromadb; the analogous lesson is to verify `ChatOllama` constructor signature against `langchain-community` installed version.
- **`sentence-transformers` was pinned** (`>=2.2.2,<4.0.0`) — `langchain-community` is already present unpinned; this is acceptable for hackathon scope.
- **Code review added `CORPUS_DIR.exists()` guard** to `_seed_sync` for graceful handling when corpus is missing. Apply the same defensive mindset: if `OLLAMA_HOST` is misconfigured, `ChatOllama` raises on first call, which is caught and wrapped in `LLMParseError` — correct behavior.
- **`conftest.py` `pytest_configure` was dead code** — do not add markers in `conftest.py`; `pytest.ini` `asyncio_mode = auto` handles async tests.
- **`CHROMA_PORT=8000`** (not 8001) — unrelated to this story but worth knowing if checking docker-compose.yml.

### Testing & Verification

**Run unit tests (no Ollama connection required):**
```bash
cd backend
pytest tests/test_triage_service.py -v
```

Expected output: 7 tests passing.

**Manual integration test (requires running Ollama with mistral:7b):**
```python
# In a Python shell inside the backend directory:
import asyncio
from app.services.llm_service import classify

result = asyncio.run(classify("πόνος στο στήθος", "MTS Level 2: chest pain with arm radiation."))
print(result)
# Expected: {"mts_level": 1 or 2, "mts_label": "...", "specialty": "Καρδιολογία", "reasoning": "..."}
```

**Verify `GET /api/v1/health` still returns `{"status": "ok"}`:**
The lifespan event does not call `llm_service` — no impact on health endpoint.

**Greek quality validation (Sprint 1 requirement):**
Run `classify()` against 20+ Greek symptom test cases. If accuracy < 80%, implement the English-translation fallback and document results in the Dev Agent Record of this story.

### Project Structure Notes

- `llm_service.py` follows the same structure as `rag_service.py`: private sync functions + public async wrappers. This is the established service module pattern for this codebase.
- `test_triage_service.py` is the test file for the AI pipeline (both `llm_service` and, in Story 2.3, `triage_service`). The file name matches the convention: the triage pipeline is Story 2.3's `triage_service.py`, and this test file grows with it.

### References

- Story 2.1 file: `_bmad-output/implementation-artifacts/2-1-chromadb-corpus-seeding-and-rag-service.md` (patterns, async approach, test structure)
- Architecture doc: `_bmad-output/planning-artifacts/architecture.md` (§ Infrastructure & Deployment — LangChain versions, LCEL style; § Implementation Patterns — logging, anti-patterns, service boundaries)
- Epics file: `_bmad-output/planning-artifacts/epics.md` (§ Story 2.2 acceptance criteria; § Additional Requirements — LangChain version pins, logging prohibition, fallback chain)
- Deferred work: `_bmad-output/implementation-artifacts/deferred-work.md` (LangChain version pin verification — treat as confirmed since Epic 1 completed successfully)

## Dev Agent Record

### Agent Model Used

claude-sonnet-4-6

### Debug Log References

None — implementation followed story spec exactly.

### Completion Notes List

- Added `OLLAMA_MODEL` env-driven config to `config.py`; default `"mistral:7b"` per Story 2.1 learnings (spec drift resolved before PR merge).
- Created `llm_service.py` with LCEL chain (`ChatPromptTemplate | ChatOllama | StrOutputParser`), `_invoke_chain_sync` extracted as named function for monkeypatching, `_parse_response` using `re.search` to handle Mistral prose wrapping, and `classify` async wrapper via `asyncio.to_thread`.
- `LLMParseError` raised for both parse failures and chain invocation failures — Story 2.3 catches this single type.
- No `symptoms` or `context` content logged at any level (AC #6 / NFR5/NFR6 compliant).
- Greek validation TODO comment added per AC #5.
- Created `test_triage_service.py` with 8 tests covering all parse paths and async classify paths via monkeypatching.
- Full test suite: 11/11 passed (3 existing rag tests + 8 new triage tests), zero regressions.

### File List

- `backend/app/core/config.py` — modified: added `OLLAMA_MODEL`
- `backend/app/services/llm_service.py` — created
- `backend/tests/test_triage_service.py` — created

## Change Log

- 2026-04-16: Story 2.2 created via bmad-create-story workflow. Status → ready-for-dev.
- 2026-04-16: Story 2.2 implemented by claude-sonnet-4-6. All 3 tasks complete, 11/11 tests pass. Status → review.
