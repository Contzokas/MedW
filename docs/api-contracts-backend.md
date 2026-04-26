# API Contracts — Backend

> Generated: 2026-04-26 | Scan: Exhaustive

---

## Base URL

- **Docker/Local:** `http://localhost:8000`
- **Kubernetes (in-cluster):** `http://backend:8000`

All endpoints are prefixed with `/api/v1/`.

---

## Endpoints

### 1. `GET /api/v1/health`

Health check / liveness probe.

**Response:** `200 OK`

```json
{ "status": "ok" }
```

---

### 2. `GET /api/v1/health/warmup`

Health check with LLM warmup status.

**Response:** `200 OK`

```json
{
  "status": "ok",
  "llm_warmup": {
    "completed": true,
    "attempts": 1,
    "timestamp": "2026-04-26T12:00:00Z"
  }
}
```

---

### 3. `POST /api/v1/triage`

Submit patient symptoms for AI triage classification.

**Request:**

```json
{
  "symptoms": "Έχω πονοκέφαλο και ζαλάδες τις τελευταίες 3 μέρες",
  "patient_id": "abc-123",
  "language": "el"
}
```

| Field | Type | Required | Description |
|---|---|---|---|
| `symptoms` | `string` | Yes | Patient symptom description (min 1 char) |
| `patient_id` | `string` | Yes | Unique patient identifier |
| `language` | `"el"` \| `"en"` | No | Language (default: `"el"`) |

**Response:** `200 OK`

```json
{
  "mts_level": 3,
  "mts_label": "Urgent",
  "specialty": "Νευρολογία",
  "reasoning": "Based on headache and dizziness symptoms persisting for 3 days...",
  "doctor": {
    "name": "Δρ. Μαρία Παπαδοπούλου",
    "specialty": "Νευρολογία",
    "available": true,
    "fallback_note": null
  },
  "redirect_url": "https://www.finddoctors.gov.gr/?specialty=Neurology",
  "rag_used": true
}
```

**Error:** `422 Unprocessable Entity` — missing/invalid fields.

---

### 4. `GET /api/v1/doctors`

List all doctors, optionally filtered by specialty.

**Query Parameters:**

| Parameter | Type | Required | Description |
|---|---|---|---|
| `specialty` | `string` | No | Filter by specialty name |

**Response:** `200 OK` — array of `Doctor` objects.

---

### 5. `GET /api/v1/triage/queue` (SSE)

Real-time stream of triage results for the nurse dashboard.

**Headers:** `Content-Type: text/event-stream`

**Event Data:**

```
data: {"patient_id":"abc-123","mts_level":3,"mts_label":"Urgent","specialty":"Νευρολογία","timestamp":"2026-04-26T12:00:00Z"}
```

**Ping:** `: ping` every 15 seconds.

---

### 6. RAG Debug Endpoints (`/api/v1/rag/debug/*`)

Gated behind `RAG_DEBUG_ENABLED=true`. Return `403` when disabled.

| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/rag/debug/status` | Debug mode status |
| `GET` | `/rag/debug/health` | Deep ChromaDB health check |
| `GET` | `/rag/debug/corpus` | Corpus vs database analysis |
| `GET` | `/rag/debug/embeddings` | Embedding quality metrics |
| `POST` | `/rag/debug/retrieve` | Debug retrieval with trace |
| `POST` | `/rag/debug/compare` | Query comparison |
| `POST` | `/rag/debug/pipeline` | Full pipeline tracing |
| `POST` | `/rag/debug/inspect` | Chunk inspection |
| `GET` | `/rag/debug/traces` | Trace history (max 200) |
| `GET` | `/rag/debug/stats` | Aggregate statistics |
| `POST` | `/rag/debug/reseed` | Force corpus re-indexing |

---

## Frontend API Proxy

The frontend proxies calls through `/api/proxy/[...path]` to avoid CORS. Reads `BACKEND_URL` at runtime. Forwards all headers (excluding `host`). Timeout: 5s with 307 redirect fallback.

Interactive docs: `http://localhost:8000/docs` (Swagger UI).
