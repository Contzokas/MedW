# Architecture — AI Pipeline (Ollama + ChromaDB RAG)

> Generated: 2026-04-26 | Part: `ai-pipeline`

---

## Overview

The AI pipeline provides on-premise LLM inference and vector retrieval for medical triage classification. It runs as Docker services orchestrated via docker-compose (local) or Kubernetes manifests (Run:ai cluster).

---

## Components

### Ollama (LLM Serving)

| Property | Value |
|---|---|
| Image | `ollama/ollama:latest` |
| Default Model | `medgemma:27b` |
| API | `http://ollama:11434` |
| GPU | NVIDIA B200 (Blackwell, 192 GB HBM3e) — optional |
| Healthcheck | `ollama list \| grep model` |

**Entrypoint flow:**
1. Start `ollama serve` in background
2. Wait for API readiness (polling)
3. Pull configured model (first run only)
4. Verify model is loaded
5. Keep process alive (`wait`)

**GPU support:**
- Docker Compose: `deploy.resources.reservations.devices` (nvidia driver, all GPUs)
- Kubernetes: `runai-scheduler`, `nvidia.com/gpu: 1`, nodeSelector `NVIDIA-B200`
- CUDA 12.8+ required for B200 support (satisfied by Ollama >= 0.3.x)

### ChromaDB (Vector Store)

| Property | Value |
|---|---|
| Image | `chromadb/chroma:1.5.7` |
| API | `http://chromadb:8000` |
| Collection | `clinical_context` |
| Embeddings | `all-MiniLM-L6-v2` (sentence-transformers, loaded by backend) |
| Persistence | Docker volume `chroma_data` / PVC `chroma-pvc` (5Gi) |
| Healthcheck | `GET /api/v1/heartbeat` |

**Corpus:** Two markdown files seeded on backend startup:
- `mts_guidelines.md` — MTS clinical guidelines (levels 1-5)
- `specialty_reference.md` — 14 specialty symptom mappings

---

## RAG Pipeline Flow

```
Backend (triage_service)
    │
    ├──► rag_service.retrieve_context(symptoms)
    │       │
    │       ├──► Embed query via SentenceTransformer
    │       ├──► ChromaDB similarity search (TOP_K=3)
    │       └──► Return text chunks as context string
    │
    └──► llm_service.classify(symptoms, context)
            │
            ├──► Build prompt: system (MTS guidelines) + user (symptoms + RAG context)
            ├──► LangChain ChatOllama.invoke()
            ├──► Parse JSON from response
            └──► Validate MTS level (1-5) and specialty
```

---

## Network Architecture

### Docker Compose (Local)

```
medw-internal (internal only):
  ├── ollama:11434    (not published)
  ├── chromadb:8000   (not published)
  └── backend         (bridges both networks)

medw-external (published):
  ├── backend:8000    → localhost:8000
  └── frontend:3000   → localhost:3000
```

### Kubernetes (Run:ai)

```
runai-medo namespace:
  ├── ollama       (ClusterIP)    — backend reaches http://ollama:11434
  ├── chromadb     (ClusterIP)    — backend reaches http://chromadb:8000
  ├── backend      (ClusterIP)    — frontend reaches http://backend:8000
  └── frontend     (NodePort)     — external access via node IP
```

---

## Error Handling

- **Ollama unavailable:** Backend returns safe default (MTS 3, GP) with `rag_used: false`
- **ChromaDB unavailable:** Backend proceeds with LLM base knowledge only
- **Model pull failure:** Entrypoint script retries, eventually exits with error
- **Timeout:** Configurable `OLLAMA_TIMEOUT` (default 30s Docker, 120s K8s)

---

## Model Management

Current model: **medgemma:27b** (medical fine-tuned Gemma 27B)

**Alternative models (B200-compatible):**

| Model | VRAM | Notes |
|---|---|---|
| `mistral:7b` | ~4 GB | Fast, lightweight |
| `llama3:8b` | ~5 GB | Good quality |
| `llama3:70b` | ~40 GB | High quality |
| `mixtral:8x7b` | ~26 GB | MoE, excellent for multilingual/Greek |

Set via `OLLAMA_MODEL` environment variable. Model is pulled on first run and cached in persistent volume (20Gi PVC).
