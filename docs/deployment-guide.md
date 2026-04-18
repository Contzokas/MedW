# Deployment Guide — MedW

> Generated: 2026-04-18 | Scan: Exhaustive

---

## Overview

MedW deploys as a 4-container Docker Compose stack. All AI inference runs on-premise (GDPR Article 9 compliance — no patient data leaves the host).

---

## Services

| Service | Image / Build | Port | Network | Persisted Volume |
|---|---|---|---|---|
| `ollama` | `ollama/ollama:latest` | internal only | `medw-internal` | `ollama_data` |
| `chromadb` | `chromadb/chroma:1.5.7` | internal only | `medw-internal` | `chroma_data` |
| `backend` | `./backend/Dockerfile` | `8000:8000` | `medw-internal` + `medw-external` | — |
| `frontend` | `./frontend/Dockerfile` | `3000:3000` | `medw-external` | — |

---

## Networks

| Network | Purpose |
|---|---|
| `medw-internal` | Isolated: ollama + chromadb inaccessible from host |
| `medw-external` | Public: backend API + frontend exposed to host ports |

---

## Production Deployment

### 1. Prepare Environment

```bash
# Copy and configure environment
cp .env.example .env

# Edit .env:
NEXT_PUBLIC_API_URL=http://<your-host-or-domain>:8000
OLLAMA_MODEL=mistral:7b
# Other values are internal-network defaults and don't need changing
```

### 2. Build and Start

```bash
# Full build + start
docker compose up --build -d

# Monitor startup (model pull can take minutes on first run)
docker compose logs -f ollama

# Verify all services healthy
docker compose ps
```

### 3. Verify

```bash
# Backend health check
curl http://localhost:8000/api/v1/health
# Expected: {"status": "ok"}

# Frontend
curl -I http://localhost:3000
# Expected: HTTP 200
```

---

## GPU Acceleration (NVIDIA)

The `ollama` service is configured for NVIDIA GPU access:

```yaml
deploy:
  resources:
    reservations:
      devices:
        - driver: nvidia
          count: all
          capabilities: [gpu]
```

**Requirements:**
- NVIDIA drivers installed on host
- `nvidia-container-toolkit` installed
- Docker configured to use the NVIDIA runtime

Without a GPU, Ollama falls back to CPU inference (significantly slower — triage response time ~60–120 s vs ~3–8 s on GPU).

---

## Startup Order

Docker Compose enforces dependency ordering:

```
ollama (healthcheck: model listed in `ollama list`)
  → chromadb (waits for ollama healthy)
    → backend (waits for chromadb started; runs corpus seed + doctor load on lifespan start)
      → frontend (waits for backend /api/v1/health returns 200)
```

**Healthcheck intervals:**

| Service | interval | timeout | retries | start_period |
|---|---|---|---|---|
| ollama | 30s | 30s | 10 | 600s |
| backend | 10s | 5s | 5 | 60s |

---

## Persistent Volumes

| Volume | Contents | Notes |
|---|---|---|
| `ollama_data` | Downloaded Mistral-7B model weights | ~4 GB; survives container restarts |
| `chroma_data` | ChromaDB vector store | Seeded from `data/corpus/*.md` on first backend start |

### Resetting Volumes

```bash
# Reset ChromaDB (force corpus re-seed on next start)
docker volume rm medw_chroma_data

# Reset Ollama model cache (force model re-download)
docker volume rm medw_ollama_data

# Full reset
docker compose down -v
```

---

## Stopping and Updating

```bash
# Stop all services (keep volumes)
docker compose down

# Stop and remove all data
docker compose down -v

# Update a single service
docker compose up --build backend -d

# View logs
docker compose logs -f backend
docker compose logs -f ollama
```

---

## Environment Variable Summary

See [development-guide.md](./development-guide.md#environment-variables-reference) for the full variable reference.

---

## Known Constraints

- **GDPR:** All inference is on-premise via Ollama. Patient symptoms never leave the host.
- **Cold start:** First run requires Ollama to pull ~4 GB model. Set `start_period: 600s` in healthcheck is intentional.
- **Memory:** Mistral-7B requires ~8 GB VRAM (GPU) or ~16 GB RAM (CPU).
- **Scalability:** The in-memory SSE queue (`app/core/queue.py`) is per-process; horizontal scaling requires replacing it with a persistent broker (Redis Pub/Sub, etc.).
