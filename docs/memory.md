# MedW — Project Memory

> Last updated: 2026-04-29

---

## Active Branch

`feature/user-profiling`

---

## Project Overview

MedW is an AI-powered medical triage assistant for the Greek NHS (ESY). It classifies patient symptoms using the Manchester Triage System (MTS levels 1–5) via a RAG + LLM pipeline (ChromaDB + Ollama `medgemma:27b`). The frontend is Next.js 16, the backend is FastAPI (Python 3.11).

---

## Architecture Summary

### Backend (`FastAPI`)
- **Entry**: `backend/main.py` — lifespan: seeds ChromaDB, loads doctors JSON, warms up Ollama
- **Routers**: `app/routers/` — thin HTTP layer
- **Services**: `app/services/` — business logic (triage, LLM, RAG, doctors)
- **Schemas**: `app/schemas/` — Pydantic models
- **Core**: `app/core/` — config, SSE queue

### Frontend (`Next.js 16`)
- **App Router** with client-side React Context for Theme, Language, and (new) UserProfile
- **API proxy**: `app/api/proxy/[...path]` → backend
- **Styling**: Tailwind CSS v4

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

## Known TODOs
- Greek medical terminology validation (see `llm_service.py` TODO comment, Sprint 1)
- Profile data is not encrypted in cookie — acceptable for MVP (health-sensitive but browser-local)

---

## Epics / Stories Reference

See `_bmad-output/planning-artifacts/epics.md` and `prd.md` for full backlog.
