# MedW — Project Memory

> Last updated: 2026-04-30

---

## Active Branch

`dev`

---

## Project Overview

MedW is an AI-powered medical triage assistant for the Greek NHS (ESY). It classifies patient symptoms using the Manchester Triage System (MTS levels 1–5) via a RAG + LLM pipeline. The frontend is Next.js 16, the backend is FastAPI (Python 3.11). All inference runs on-premise (GDPR-compliant).

### Stack Transition (in progress)
The stack is mid-transition on `dev`:
- **Infrastructure (docker-compose.yml, .env.example)**: Already moved to Ollama (medgemma:27b) + ChromaDB
- **Backend Python code** (`config.py`, `llm_service.py`, `rag_service.py`): STILL uses NIM Nemotron 120B (via `langchain-nvidia-ai-endpoints`) + Milvus
- **Requirements**: `langchain-nvidia-ai-endpoints` + `pymilvus` (no `chromadb` or `langchain-ollama` yet)
- **`.env`** (actual config): Still has NIM env vars (`NIM_BASE_URL`, `NIM_MODEL`, `NGC_API_KEY`)

This means running `docker compose up` would start Ollama+ChromaDB but the backend code won't connect to them. Backend code needs porting before the new stack works end-to-end.

---

## Architecture Summary

### Backend (`FastAPI`)
- **Entry**: `backend/main.py` — lifespan: seeds vector DB corpus, loads doctors JSON, warms up LLM
- **Routers**: `app/routers/` — thin HTTP layer (triage, doctors, SSE queue, RAG debug)
- **Services**:
  - `triage_service.py` — orchestration + 4-tier fallback (symptom keywords → RAG → LLM → safe default), follow-up questions, vague-input redirection, lat/lng geolocation support
  - `llm_service.py` — NIM Nemotron 120B via `langchain-nvidia-ai-endpoints`, JSON prompt template, profile injection, Greek translation, warmup with retries
  - `rag_service.py` — Milvus Lite collection seeding, embedding (NIM `nv-embedqa-e5-v5`), reranker (NIM `nv-rerankqa-llama-3_2-1b-v2`), retrieval cache
  - `rag_debug.py` — pipeline tracing, Milvus health, corpus analysis, embedding analysis, chunk inspector, reseed
  - `doctor_service.py` — doctor matching by specialty from `doctors.json` (21 doctors, 12 specialties on current config)
- **Schemas**: `app/schemas/` — Pydantic models (`TriageRequest`, `TriageResponse`, `FollowUpResponse`, `RedirectToWizardResponse`, `UncertainResultResponse`, `QueueEntry`)
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
| `MAX_FOLLOW_UP_QUESTIONS` | `3` | Follow-up round limit |
| `DB_PATH` | `./data/medw.db` | SQLite DB for triage history |

### Frontend (`Next.js 16`)
- **App Router** with client-side React Context: `ThemeContext`, `LangContext`, `ProfileContext`
- **Components** (14): `TriageForm`, `TriageResult`, `SymptomWizard`, `ProfilerModal`, `LoadingOverlay`, `DoctorCard`, `Disclaimer`, `EmergencyBar`, `OnboardingTour`, `FollowUpGuidance`, `HistoryList`, `SkeletonTriageResult`, `ThemeToggle`, `LangToggle`, `TeamSection`
- **Pages**: `/` (triage), `/dashboard` (nurse SSE), `/management` (admin), `/doctors` (doctor listing)
- **Hooks**: `useTriageStream`, `useOnboarding`, `useGeolocation`
- **Lib**: `api.ts`, `backendResolver.ts`, `types.ts`, `translations.ts`, `profile-cookie.ts`, `profile-context.tsx`, `lang-context.tsx`, `theme-context.tsx`, `casing.ts`
- **API proxy**: `app/api/proxy/[...path]` → backend
- **Styling**: Tailwind CSS v4
- **Agent rules**: `AGENTS.md` warns that this Next.js 16 has breaking changes vs training data

### RAG Debug Service (`rag_debug.py`)
Comprehensive introspection pipeline gated behind `RAG_DEBUG_ENABLED=true`:
- Milvus health, corpus analysis, retrieval debug, embedding analysis, pipeline trace, comparative queries, chunk inspector, reseed corpus, aggregate stats

### Infrastructure
- **Docker Compose** (current): 4 services — `ollama`, `chromadb`, `backend`, `frontend`
- **Docker Compose** (what backend code expects): 6 services with NIM microservices (nim, nim-embed, nim-reranker)
- **Kubernetes (Run:ai)**: `deploy.ps1` + `k8s/` manifests for `runai-kiefer` cluster (B200 GPU for Ollama)
- **Test/Benchmark scripts**:
  - `scripts/benchmark_latency.py` — comprehensive pipeline benchmark
  - `test_triage_baseline.py` — accuracy eval against labeled Parquet dataset
  - `symptom_combinations.py` — data-designer pipeline generating synthetic symptom profiles

---

## Key Data Models

### `TriageRequest` (backend schema)
```python
class TriageRequest(BaseModel):
    symptoms: str          # min_length=1
    patient_id: str
    lang: Literal["en", "el"] = "el"
    patient_profile: str | None = None      # serialised medical history (profiler)
    follow_up_count: int = 0                # current follow-up round
    conversation_context: str = ""          # prior Q&A concatenated
    allow_follow_up: bool = True            # enables follow-up loop
    latitude: float | None = None           # geolocation
    longitude: float | None = None           # geolocation
```

### Response union types
- `TriageResponse` — successful MTS classification with doctor match
- `FollowUpResponse` — LLM asks clarifying question instead of triage
- `RedirectToWizardResponse` — vague input detected, suggest symptom wizard
- `UncertainResultResponse` — max follow-ups reached, still uncertain

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

## Feature: User Profiler ✅

Collects patient medical history before symptom submission via a multi-step `ProfilerModal`. Stores profile in browser cookie (`medw_profile`, 1 year). Injected into LLM prompt.

- 8 questions across 3 steps (Personal Info, Medical History, Lifestyle)
- Cookie-only storage — no server-side persistence
- Re-edit via ⚙️ icon on triage card
- Profile serialised as "Patient medical history" block before symptoms in LLM prompt
- Disclaimer: data stays in browser only

---

## Feature: Follow-Up Questions ✅ (IMPLEMENTED)

Confidence-gated follow-up loop. When LLM is uncertain, returns `FollowUpResponse` instead of triage.
- `FollowUpResponse` model in `schemas/triage.py`
- `follow_up_count` + `conversation_context` in `TriageRequest`
- `MAX_FOLLOW_UP_QUESTIONS` env var (default 3)
- `FollowUpGuidance` component in frontend
- At max rounds → `UncertainResultResponse` when still uncertain

## Feature: Uncertain Result Fallback ✅ (IMPLEMENTED)

When max follow-ups reached but still uncertain, returns `UncertainResultResponse`.
- Uncertain results do NOT write to SSE queue
- Frontend shows localized message + "start over" button

---

## Feature: Vague Input Redirect ✅ (IMPLEMENTED)

`triage_service.py` has `_is_vague_input()` — checks against symptom keywords. Returns `RedirectToWizardResponse` suggesting the `SymptomWizard` guided flow.

---

## Feature: Geolocation ✅ (IMPLEMENTED)

`TriageRequest` accepts `latitude`/`longitude`. Frontend `useGeolocation` hook. Passed through to triage for doctor location matching.

---

## Feature: Onboarding Tour ✅ (IMPLEMENTED)

`OnboardingTour` component + `useOnboarding` hook. First-time walkthrough for patient triage page.

---

## Feature: Triage History ✅ (IMPLEMENTED)

`HistoryList` component — shows past triage submissions. Backend SQLite for persistence via `aiosqlite`.

---

## Feature: Loading Overlay ✅ (IMPLEMENTED)

`LoadingOverlay.tsx` — full-screen overlay with animated spinner, 4 animated processing steps (EN/EL), and progress bar.

---

## Feature: Management Page ✅ (IMPLEMENTED)

`/management` page in frontend — admin interface for viewing/managing triage queue.

---

## Feature: Doctors Page ✅ (IMPLEMENTED)

`/doctors` page in frontend — browse available doctors by specialty.

## LLM Prompt Template (Current — NIM-based)

The `_HUMAN_TEMPLATE` in `llm_service.py` starts with:
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

## Known TODOs / Issues

- **Stack transition incomplete**: Backend Python code still references NIM + Milvus. Docker Compose + .env.example now use Ollama + ChromaDB. Code needs porting.
- Greek medical terminology validation (see `llm_service.py` TODO comment)
- Profile data is not encrypted in cookie — acceptable for MVP (health-sensitive but browser-local)
- See `_bmad-output/implementation-artifacts/deferred-work.md` for 50+ tracked deferred items from past code reviews

---

## Epics / Stories Reference

- Epic 1: Foundation & Deployable Stack — **done**
- Epic 2: AI Triage Pipeline — **done**
- Epic 3: Patient Triage Experience — **done** (includes profiler, follow-ups, onboarding, geolocation, history)
- Epic 4: Nurse Real-Time Dashboard — **done** (retro complete)
- Epic 5: Documentation & Hackathon Submission — **backlog**
- Sprint status file: `_bmad-output/implementation-artifacts/sprint-status.yaml`
- Full backlog: `_bmad-output/planning-artifacts/epics.md`, `prd.md`, `architecture.md`
- BMAD version: 6.3.0, modules: core, bmm, bmb (builder), cis (creative intelligence), tea (test architecture)
- Custom skills: `data-designer` in `.agents/skills/`
