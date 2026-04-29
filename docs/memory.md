# MedW — Project Memory

> Last updated: 2026-04-29

---

## Active Branch

`feature/user-profiling`

---

## Project Overview

MedW is an AI-powered medical triage assistant for the Greek NHS (ESY). It classifies patient symptoms using the Manchester Triage System (MTS levels 1–5) via a RAG + LLM pipeline (Milvus + NIM Nemotron 120B, via `langchain-openai` compatibility). The frontend is Next.js 16, the backend is FastAPI (Python 3.11). All inference runs on-premise (GDPR-compliant).

---

## Architecture Summary

### Backend (`FastAPI`)
- **Entry**: `backend/main.py` — lifespan: seeds Milvus corpus, loads doctors JSON, warms up NIM
- **Routers**: `app/routers/` — thin HTTP layer (triage, doctors, SSE queue, RAG debug)
- **Services**:
  - `triage_service.py` — orchestration + 3-tier fallback (RAG → LLM → safe default)
  - `llm_service.py` — NIM Nemotron 120B via `langchain-openai`, JSON prompt template, profile injection
  - `rag_service.py` — Milvus collection seeding, embedding (NIM `nv-embedqa-e5-v5`), reranker (NIM `nv-rerankqa-llama-3_2-1b-v2`), retrieval cache
  - `rag_debug.py` — pipeline tracing, Milvus health, corpus analysis, embedding analysis, chunk inspector, reseed (see below)
  - `doctor_service.py` — doctor matching by specialty from `doctors.json` (591 entries)
- **Schemas**: `app/schemas/` — Pydantic models (`TriageRequest`, `TriageResponse`)
- **Core**: `app/core/config.py` — all env-based config; `queue.py` — SSE triage queue (ring buffer, max 1000)

### Backend Config (`config.py`)
| Env var | Default | Notes |
|---|---|---|
| `NIM_BASE_URL` | `http://nim:8000/v1` | LLM endpoint |
| `NIM_MODEL` | `nvidia/nemotron-3-super-120b-a12b` | |
| `NIM_EMBED_BASE_URL` | `http://nim-embed:8000/v1` | Embedding endpoint |
| `NIM_EMBED_MODEL` | `nvidia/nv-embedqa-e5-v5` | |
| `NIM_RERANKER_BASE_URL` | `http://nim-reranker:8000/v1` | Reranker endpoint |
| `NIM_RERANKER_MODEL` | `nvidia/nv-rerankqa-llama-3_2-1b-v2` | |
| `MILVUS_DB_PATH` | `./milvus.db` | Milvus Lite local DB file |
| `QUEUE_MAX_ENTRIES` | `1000` | SSE queue ring buffer size |
| `MAX_FOLLOW_UP_QUESTIONS` | `2` | Follow-up round limit |
| `DB_PATH` | `./data/medw.db` | SQLite DB for triage history |

### Frontend (`Next.js 16`)
- **App Router** with client-side React Context: `ThemeContext`, `LangContext`, `ProfileContext`
- **Components**: `TriageForm`, `ProfilerModal`, `SymptomWizard`, `LoadingOverlay`, `ThemeToggle`
- **API proxy**: `app/api/proxy/[...path]` → backend
- **Styling**: Tailwind CSS v4
- **Agent rules**: `AGENTS.md` warns that this Next.js 16 has breaking changes vs training data

### RAG Debug Service (`rag_debug.py`, 788 lines)
Comprehensive introspection pipeline gated behind `RAG_DEBUG_ENABLED=true`:
- **Milvus health** — heartbeat, collection stats, embedding dimension probe
- **Corpus analysis** — file ↔ DB reconciliation, coverage %, missing/orphaned chunk IDs
- **Retrieval debug** — per-stage latency (connect, embed, search, rerank, process), per-chunk relevance scores
- **Embedding analysis** — magnitude stats, zero/NaN vector detection, duplicate content detection
- **Pipeline trace** — full end-to-end: RAG → LLM → parse, with token counts and timing
- **Comparative queries** — multiple queries side-by-side, shared chunk overlap analysis
- **Chunk inspector** — fetch specific chunk IDs from Milvus
- **Reseed corpus** — drop + reseed on demand (with `force=True`)
- **Aggregate stats** — from in-memory trace history (max 200 traces)

### Infrastructure
- **Docker Compose**: 6 services — `frontend`, `backend`, `nim` (LLM), `nim-embed`, `nim-reranker`, `milvus`
- **Kubernetes (Run:ai)**: `deploy.ps1` + `k8s/` manifests for `runai-kiefer` cluster (B200 GPU for Ollama)
- **Test/Benchmark scripts**:
  - `scripts/benchmark_latency.py` — comprehensive pipeline benchmark, 11 test cases × N runs, CSV export, per-stage ms, token stats, RAG quality scores, pre-filter bypass detection
  - `test_triage_baseline.py` — accuracy eval against labeled Parquet dataset (50 records from `symptom_combinations.py`)
  - `symptom_combinations.py` — data-designer pipeline generating synthetic symptom profiles (age, sex, body region, severity, pain level, duration, symptom profile, patient descriptions, query variations)

---

## Key Data Models

### `TriageRequest` (backend schema)
```python
class TriageRequest(BaseModel):
    symptoms: str          # min_length=1
    patient_id: str
    lang: Literal["en", "el"] = "el"
    patient_profile: str | None = None  # [NEW] serialised medical history
```

### `UserProfile` (frontend type)
```typescript
interface UserProfile {
  age: number | null
  sex: "M" | "F" | "other" | null
  chronic_conditions: string
  medications: string
  allergies: string
  smoking: boolean
  alcohol: boolean
  pregnant: boolean | null
}
```

---

## Feature: User Profiler (Sprint — 2026-04-29)

### Goal
Collect patient medical history before symptom submission via a multi-step modal. Store profile in browser cookie (`medw_profile`, 1 year). Inject into LLM prompt to improve diagnostic accuracy.

### Flow
1. First visit → no cookie → `ProfilerModal` shown automatically
2. User fills 8 questions across 3 steps (Personal Info, Medical History, Lifestyle)
3. Profile saved to `medw_profile` JSON cookie
4. On subsequent visits, cookie loaded into `ProfileContext` — modal NOT shown
5. User can re-open modal via ⚙️ icon on the triage card
6. On symptom submit, profile is serialised → sent as `patient_profile` in POST body
7. Backend injects profile as "Patient medical history" block before symptoms in LLM prompt

### Files Created / Modified
| File | Action |
|---|---|
| `frontend/app/components/ProfilerModal.tsx` | **NEW** |
| `frontend/app/lib/profile-cookie.ts` | **NEW** |
| `frontend/app/lib/profile-context.tsx` | **NEW** |
| `frontend/app/lib/types.ts` | MODIFIED — added `UserProfile` |
| `frontend/app/lib/translations.ts` | MODIFIED — added `profiler` keys (EN + EL) |
| `frontend/app/lib/api.ts` | MODIFIED — added optional `profile` param |
| `frontend/app/layout.tsx` | MODIFIED — wrapped with `ProfileProvider` |
| `frontend/app/page.tsx` | MODIFIED — profiler modal + ⚙️ button |
| `frontend/app/components/TriageForm.tsx` | MODIFIED — reads profile context |
| `backend/app/schemas/triage.py` | MODIFIED — `patient_profile` field |
| `backend/app/routers/triage.py` | MODIFIED — pass to service |
| `backend/app/services/triage_service.py` | MODIFIED — pass to LLM |
| `backend/app/services/llm_service.py` | MODIFIED — inject in prompt |

### Design Decisions
- **Cookie-only storage**: No server-side persistence. Profile stays in browser.
- **Modal show logic**: Shown ONLY when no cookie found. Edit via ⚙️ icon.
- **Profile optional**: If skipped, triage works exactly as before.
- **Serialisation**: Profile → human-readable string (EN or EL) → appended as "Patient medical history" block before symptoms in the LLM `_HUMAN_TEMPLATE`.
- **Privacy**: Modal shows disclaimer that data stays in browser only.

---

## LLM Prompt Template (Updated)

The `_HUMAN_TEMPLATE` in `llm_service.py` now starts with:
```
{patient_profile_section}   ← empty string when no profile
Clinical context:\n{context}\n\n
Patient symptoms ({input_language}):\n{symptoms}\n\n
...
```

The `_build_profile_section()` function produces:
```
Patient medical history:
Age: 45
Biological sex: Male
Chronic conditions: Type 2 Diabetes, Hypertension
Current medications: Metformin 500mg
...
```

---

## Feature: Loading Overlay (`LoadingOverlay.tsx`)

Full-screen overlay with animated spinner, 4 animated processing steps (EN/EL), and progress bar. Used during triage submission to replace simple button-disable UX.

---

## Feature: Follow-Up Questions (Spec Only — NOT IMPLEMENTED)

Spec at `_bmad-output/implementation-artifacts/follow-up-questions.md`. Key design:
- Confidence-gated loop: LLM returns clarifying question instead of triage when symptoms are vague
- Hidden trigger — patient experiences natural conversation
- Max rounds configurable via `MAX_FOLLOW_UP_QUESTIONS` env var (default 2)
- At max, always produces triage — never leaves patient without answer
- Q&A pairs concatenated to symptoms string (no conversation history format)
- Backend: new `FollowUpResponse` model, extended `TriageRequest` with `follow_up_count` + `conversation_context`
- Frontend: follow-up state in `TriageForm` — question display, answer input, submit/back actions
- Out of scope v2: curated question bank, visible confidence indicator

## Feature: Uncertain Result Fallback (Spec Only — NOT IMPLEMENTED)

Spec at `_bmad-output/implementation-artifacts/spec-uncertain-result-fallback.md`. Key design:
- When at max follow-ups but still uncertain, return "uncertain result" message instead of forced triage
- Uncertain results do NOT write to triage queue
- Frontend shows localized message + "start over" button
- Existing 3-tier fallback chain unchanged

---

## Benchmarking Overview

**`scripts/benchmark_latency.py`** (387 lines):
- 11 test cases (L1–L5 emergency scenarios + pre-filter trivials), Greek + English
- Configurable `--url`, `--runs`, `--timeout`, `--csv`
- Debug mode (when `RAG_DEBUG_ENABLED=true`): per-stage ms (Milvus connect, embed, search, rerank, LLM, parse), token counts, RAG cosine similarity, chunks retrieved
- Fallback mode: wall-clock timing only
- Outputs: stage breakdown table, token stats, RAG quality, pre-filter stats, per-case wall times with bar chart, optional CSV export

**`test_triage_baseline.py`** (128 lines):
- Loads `symptom_combinations` Parquet dataset
- Classifies 50 records against `/api/v1/triage`
- Computes accuracy (exact match, off-by-1, off-by-2+)
- Per-MTS-level breakdown
- Saves results to `artifacts/symptom_combinations/test_results.json`

**`symptom_combinations.py`** (107 lines):
- `data-designer` pipeline generating medical symptom profiles
- Columns: patient_age (gaussian), sex, body_region (weighted), severity, pain_level, duration_category
- LLM-generated: `symptom_profile` (Pydantic model), `description` (first-person patient narrative), `query_variations` (layperson search queries)
- Output: Parquet files in `artifacts/symptom_combinations/`

---

## Known TODOs
- Greek medical terminology validation (see `llm_service.py` TODO comment, Sprint 1)
- Profile data is not encrypted in cookie — acceptable for MVP (health-sensitive but browser-local)
- Follow-up questions spec written but not implemented
- Uncertain result fallback spec written but not implemented
- See `_bmad-output/implementation-artifacts/deferred-work.md` for 50+ tracked deferred items from past code reviews

---

## Epics / Stories Reference

- Epic 1: Foundation & Deployable Stack — **done**
- Epic 2: AI Triage Pipeline — **done**
- Epic 3: Patient Triage Experience — **done**
- Epic 4: Nurse Real-Time Dashboard — **done** (retro complete)
- Epic 5: Documentation & Hackathon Submission — **backlog**
- Sprint status file: `_bmad-output/implementation-artifacts/sprint-status.yaml`
- Full backlog: `_bmad-output/planning-artifacts/epics.md`, `prd.md`, `architecture.md`
- BMAD version: 6.3.0, modules: core, bmm, bmb (builder), cis (creative intelligence), tea (test architecture)
- Custom skills: `data-designer` in `.agents/skills/`
