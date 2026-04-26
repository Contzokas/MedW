# Data Models — Backend

> Generated: 2026-04-26 | Scan: Exhaustive

---

## Pydantic Schemas

### TriageRequest

```python
class TriageRequest(BaseModel):
    symptoms: str       # min_length=1
    patient_id: str
    language: Literal["el", "en"] = "el"
```

### TriageResponse

```python
class TriageResponse(BaseModel):
    mts_level: int            # 1-5
    mts_label: str            # "Immediate" | "Very Urgent" | "Urgent" | "Less Urgent" | "Non-urgent"
    specialty: str            # Greek or English
    reasoning: str
    doctor: Doctor
    redirect_url: str         # finddoctors.gov.gr link
    rag_used: bool
```

### QueueEntry

```python
class QueueEntry(BaseModel):
    patient_id: str
    mts_level: int
    specialty: str
    timestamp: str            # ISO 8601
```

### Doctor

```python
class Doctor(BaseModel):
    name: str
    specialty: str
    available: bool
    fallback_note: str | None
```

---

## TypeScript Mirrors

Defined in `frontend/app/lib/types.ts` — manual mirror of Pydantic schemas.

---

## Doctor Dataset

**File:** `backend/data/doctors.json` — 21 doctors across 12 specialties.

**Matching logic:** Filter by specialty → first available → GP fallback ("Δρ. Κωνσταντίνος Παπανδρέου").

**Specialties:** Cardiology, Neurology, Orthopedics, Gastroenterology, Dermatology, Pulmonology, General Practice, Ophthalmology, ENT, Urology, Endocrinology, Psychiatry.

---

## RAG Corpus

| File | Content |
|---|---|
| `data/corpus/mts_guidelines.md` | MTS levels 1-5 with clinical discriminators |
| `data/corpus/specialty_reference.md` | 14 specialty symptom mappings |

**ChromaDB:** Collection `clinical_context`, embeddings via `all-MiniLM-L6-v2`, chunked by `\n\n`, TOP_K=3 retrieval. Seeded idempotently on startup.

---

## MTS Levels

| Level | Label | Response Time | Color |
|---|---|---|---|
| 1 | Immediate | Immediate | Red |
| 2 | Very Urgent | 10 min | Orange |
| 3 | Urgent | 30 min | Yellow |
| 4 | Less Urgent | 60 min | Green |
| 5 | Non-urgent | 120 min | Blue |
