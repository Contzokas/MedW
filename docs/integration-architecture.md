# Integration Architecture — MedW

> Generated: 2026-04-26 | Scan: Exhaustive

---

## Data Flow Overview

```
┌──────────┐     HTTP/Proxy      ┌──────────┐     HTTP      ┌──────────┐
│ Frontend │ ──────────────────► │ Backend  │ ───────────► │ ChromaDB │
│ (Next.js)│                     │ (FastAPI)│              │  (RAG)   │
│  :3000   │ ◄────────────────── │  :8000   │              │  :8000   │
│          │   JSON response      │          │              └──────────┘
│          │                      │          │     HTTP
│          │                      │          │ ───────────► ┌──────────┐
│          │ ◄──── SSE stream ────│          │              │ Ollama   │
│          │   (EventSource)      │          │ ◄─────────── │ (LLM)    │
└──────────┘                      └──────────┘   LLM        │  :11434  │
     ▲                                  ▲        response   └──────────┘
     │                                  │
     │          SSE (/api/v1/triage/queue)
     └──────────────────────────────────┘
```

---

## Integration Points

### 1. Frontend → Backend (API Proxy)

| Property | Value |
|---|---|
| **From** | Frontend (`/api/proxy/[...path]`) |
| **To** | Backend (`http://backend:8000`) |
| **Protocol** | HTTP (all methods: GET, POST, PUT, DELETE, PATCH) |
| **Discovery** | Runtime via `BACKEND_URL` env var + `/api/config` endpoint |
| **Timeout** | 5 seconds (307 redirect fallback) |
| **Auth** | None (internal network) |

**Endpoints called:**
- `POST /api/v1/triage` — symptom submission
- `GET /api/v1/doctors` — doctor listing
- `GET /api/v1/health` — health check

### 2. Backend → ChromaDB (RAG Retrieval)

| Property | Value |
|---|---|
| **From** | Backend `rag_service` |
| **To** | ChromaDB (`http://chromadb:8000`) |
| **Protocol** | ChromaDB HTTP API |
| **Connection** | Lazy singleton, persistent |
| **Error handling** | Fallback: proceed without RAG context |

**Operations:**
- Collection check/create on startup
- Seed corpus documents with embeddings (idempotent)
- Similarity search: `query(query_texts, n_results=3)`

### 3. Backend → Ollama (LLM Inference)

| Property | Value |
|---|---|
| **From** | Backend `llm_service` (via LangChain) |
| **To** | Ollama (`http://ollama:11434`) |
| **Protocol** | Ollama REST API (via LangChain `ChatOllama`) |
| **Connection** | Lazy singleton chain |
| **Timeout** | `OLLAMA_TIMEOUT` (30s Docker, 120s K8s) |
| **Error handling** | Fallback: safe default (MTS 3, GP) |

**Operations:**
- Warmup on startup (configurable retries)
- `chain.invoke()` for triage classification

### 4. Backend → Frontend (SSE Stream)

| Property | Value |
|---|---|
| **From** | Backend `/api/v1/triage/queue` |
| **To** | Frontend `useTriageStream` hook |
| **Protocol** | Server-Sent Events (EventSource) |
| **Format** | `data: {json}\n\n` + `: ping\n\n` every 15s |
| **Connection** | Persistent, auto-reconnect on disconnect |

---

## Shared Data Contracts

### TriageResponse (Backend → Frontend)

```typescript
{
  mts_level: number,      // 1-5
  mts_label: string,      // "Immediate" | "Very Urgent" | "Urgent" | "Less Urgent" | "Non-urgent"
  specialty: string,      // Greek or English
  reasoning: string,
  doctor: Doctor,
  redirect_url: string,
  rag_used: boolean
}
```

### QueueEntry (Backend → Frontend via SSE)

```typescript
{
  patient_id: string,
  mts_level: number,
  specialty: string,
  timestamp: string        // ISO 8601
}
```

---

## Startup Order

### Docker Compose

```
ollama (healthcheck: model loaded)
  └──► chromadb (depends: ollama healthy)
        └──► backend (depends: chromadb started)
              └──► frontend (depends: backend healthy)
```

### Kubernetes

```
namespace + PVCs + ConfigMap (parallel)
  └──► ollama (readiness: model in ollama list)
        └──► chromadb (readiness: /api/v1/heartbeat)
              └──► backend (readiness: /api/v1/health)
                    └──► frontend (readiness: /)
```

---

## Environment Variable Flow

| Variable | Set On | Read By |
|---|---|---|
| `BACKEND_URL` | docker-compose (frontend) | frontend proxy route |
| `OLLAMA_HOST` | docker-compose (backend) | backend rag_service, llm_service |
| `OLLAMA_MODEL` | docker-compose (ollama, backend) | ollama entrypoint, backend llm_service |
| `CHROMA_HOST` | docker-compose (backend) | backend rag_service |
| `CHROMA_PORT` | docker-compose (backend) | backend rag_service |
| `RAG_DEBUG_ENABLED` | backend env | backend rag_debug router |
