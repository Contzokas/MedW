# Deployment Guide — MedW

> Generated: 2026-04-26 | Scan: Exhaustive

---

## Docker Compose (Local)

```bash
cp .env.example .env
docker compose up --build
```

### Services

| Service | Image | Port | Network |
|---|---|---|---|
| `medw-ollama` | `ollama/ollama:latest` | Internal only | `medw-internal` |
| `medw-chromadb` | `chromadb/chroma:1.5.7` | Internal only | `medw-internal` |
| `medw-backend` | Build from `./backend` | `:8000` | both networks |
| `medw-frontend` | Build from `./frontend` | `:3000` | `medw-external` |

### Volumes

| Volume | Purpose |
|---|---|
| `ollama_data` | Persist downloaded models (~4-27 GB) |
| `chroma_data` | Persist vector embeddings |

### GPU Support

Docker Compose uses `deploy.resources.reservations.devices` for NVIDIA GPU passthrough. Requires `nvidia-container-toolkit`.

CPU fallback works without GPU (~60-120s per triage request).

### Healthchecks

| Service | Check | Interval | Retries |
|---|---|---|---|
| Ollama | `ollama list \| grep model` | 30s | 10 (10 min start period) |
| Backend | `curl -f http://localhost:8000/api/v1/health` | 10s | 5 |
| Frontend | (Depends on backend healthy) | — | — |

---

## Kubernetes (Run:ai Cluster)

### Prerequisites

- `kubectl` configured against cluster
- Run:ai project `medo` with GPU quota
- Images pushed to GHCR

### Deploy

```bash
kubectl apply -k k8s/
```

Creates `runai-medo` namespace with all 4 services.

### Check Status

```bash
kubectl get pods -n runai-medo -o wide
runai list workloads -p medo
kubectl logs -n runai-medo deployment/medw-ollama -f
```

### Access

```bash
kubectl port-forward -n runai-medo svc/frontend 3000:3000
kubectl port-forward -n runai-medo svc/backend 8000:8000
```

---

## Resource Allocation (K8s)

| Service | CPU Request | CPU Limit | Memory Request | Memory Limit | GPU |
|---|---|---|---|---|---|
| Ollama | 8 | 16 | 32Gi | 64Gi | 1× B200 |
| ChromaDB | 250m | 1 | 512Mi | 2Gi | — |
| Backend | 250m | 1 | 512Mi | 1Gi | — |
| Frontend | 100m | 500m | 256Mi | 512Mi | — |

### Persistent Volume Claims

| PVC | Size | Purpose |
|---|---|---|
| `ollama-pvc` | 20Gi | Model storage |
| `chroma-pvc` | 5Gi | Vector embeddings |

---

## Manual Deploy Script (PowerShell)

`deploy.ps1` automates build, push, and Run:ai submission:

```powershell
.\deploy.ps1 -Registry "ghcr.io/medw" -Tag "test" -ClientId "..." -ClientSecret "..."
```

**Steps:** Login → Build images → Push to GHCR → Submit workloads via `runai submit`.

---

## CI/CD

Push to `main` automatically builds & pushes images to `ghcr.io/contzokas/medw-*` and re-deploys.

**Required GitHub Secrets:**

| Secret | Purpose |
|---|---|
| `KUBECONFIG` | base64-encoded kubeconfig |

---

## Security Notes

- `RAG_DEBUG_ENABLED` must be `false` in production (exposes internal pipeline data)
- No authentication on API endpoints (internal network only)
- ChromaDB and Ollama are never exposed to the host (internal Docker network)
- Patient data stays on-premise (GDPR Article 9)
