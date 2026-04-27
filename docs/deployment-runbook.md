# Deployment Runbook — MedW on Run:ai

> Last updated: 2026-04-27
> Deployment method: Run:ai Workspace API via GitHub Actions
> Cluster: `runai.kiefersa.gr` (project: `medo`)

---

## Overview

MedW is deployed to a private Run:ai cluster using a **native Run:ai Workspace API** approach (not `kubectl apply`). The deployment is automated via GitHub Actions workflow `.github/workflows/deploy.yml`.

**Architecture:**
- NVIDIA NIM (Nemotron Super 120B) — 3× B200 GPUs, 500 Gi cache
- ChromaDB vector database — 10 Gi storage
- FastAPI backend — 1 Gi memory
- Next.js frontend — 512 Mi memory

**Network:**
- NIM and ChromaDB are internal-only (cluster network)
- Backend exposes NodePort (auto-assigned)
- Frontend exposes NodePort (auto-assigned)
- Backend URL is resolved at runtime and persisted to GitHub Environment variables

---

## Triggering Deployment

### Automatic Trigger

Push to `main` or `dev` branch automatically triggers deployment:
- `main` branch → deploys to production (tag: `latest`, suffix: `""`)
- `dev` branch → deploys to development (tag: `dev`, suffix: `"-dev"`)

### Manual Trigger (workflow_dispatch)

1. Navigate to GitHub repository → **Actions** tab
2. Select **Build & Deploy to Run:ai** workflow
3. Click **Run workflow** button
4. Select branch and click **Run workflow**

The workflow will:
1. Build and push Docker images to GHCR
2. Mirror ChromaDB image to GHCR
3. Connect to cluster via OpenVPN
4. Submit workloads via Run:ai Workspace API
5. Resolve service URLs and update GitHub Environment variables

---

## Required GitHub Secrets

Configure these in **Settings → Secrets → Actions**:

| Secret | Purpose | Example |
|---|---|---|
| `RUNAI_CLIENT_ID` | Run:ai application client ID | `abc123...` |
| `RUNAI_CLIENT_SECRET` | Run:ai application client secret | `xyz789...` |
| `NGC_API_KEY` | NVIDIA NGC API key for NIM model download | `nvapi-...` |
| `VPN_CONFIG` | OpenVPN configuration file (base64) | `(base64 .ovpn file)` |
| `VPN_USERNAME` | VPN username | `username` |
| `VPN_PASSWORD` | VPN password | `password` |

### Getting Run:ai Credentials

1. Log in to Run:ai UI at `https://runai.kiefersa.gr`
2. Navigate to **Settings → Application**
3. Create or find your application credentials
4. Copy Client ID and Client Secret to GitHub Secrets

### Getting NGC API Key

1. Log in to [NGC](https://catalog.ngc.nvidia.com/)
2. Navigate to **API Keys** section
3. Generate new API key with appropriate permissions
4. Copy to GitHub Secret `NGC_API_KEY`

---

## Required GitHub Variables (Optional)

Configure these in **Settings → Environments → [env] → Variables**:

| Variable | Purpose | Default |
|---|---|---|
| `BACKEND_URL` | Fallback backend URL (auto-updated by CI) | `""` |
| `NIM_MODEL` | NIM model name | `nvidia/nemotron-3-super-120b-a12b` |
| `NIM_TIMEOUT` | NIM request timeout (seconds) | `120` |
| `NIM_WARMUP_ENABLED` | Enable NIM warmup on startup | `true` |
| `NIM_WARMUP_RETRIES` | Warmup retry attempts | `120` |
| `NIM_WARMUP_RETRY_DELAY_SECONDS` | Delay between warmup retries | `25` |
| `CHROMA_URL` | Fallback ChromaDB URL | `""` |
| `NIM_URL` | Fallback NIM URL | `""` |

---

## Monitoring Deployment

### Via GitHub Actions UI

1. Navigate to **Actions** tab
2. Click on the running workflow run
3. Expand each step to view logs
4. Look for:
   - ✓ "ChromaDB submitted"
   - ✓ "NIM submitted"
   - ✓ "Backend submitted"
   - ✓ "Frontend submitted"
   - ✓ "Resolved CHROMA_URL=..."
   - ✓ "Resolved NIM_BASE_URL=..."
   - ✓ "Resolved BACKEND_URL=..."

### Via Run:ai UI

1. Log in to `https://runai.kiefersa.gr`
2. Navigate to project **medo**
3. View workload status:
   - `medw-nim-dev` or `medw-nim` — NIM workload (3× B200 GPUs)
   - `medw-chromadb-dev` or `medw-chromadb` — ChromaDB
   - `medw-backend-dev` or `medw-backend` — FastAPI backend
   - `medw-frontend-dev` or `medw-frontend` — Next.js frontend

4. Check **Phase** column:
   - `Pending` — Waiting for resources
   - `Running` — Healthy and serving traffic
   - `Failed` — Check logs for errors

### Via Run:ai API

```bash
# Authenticate
TOKEN=$(curl -sSL -X POST \
  "https://runai.kiefersa.gr/api/v1/token" \
  -H "Content-Type: application/json" \
  -d '{"grantType":"client_credentials","clientId":"'$RUNAI_CLIENT_ID'","clientSecret":"'$RUNAI_CLIENT_SECRET'"}' \
  | jq -r '.accessToken')

# List workloads
curl -sSL "https://runai.kiefersa.gr/api/v1/workloads?limit=50" \
  -H "Authorization: Bearer $TOKEN" \
  | jq '.workloads // . | if type == "array" then .[] | select(.name | startswith("medw-")) | {name, phase, urls} else . end'
```

---

## Workload Startup Sequence

The deployment follows this order:

1. **ChromaDB** (data layer)
   - Submitted first
   - Waits for `Running` phase
   - URL resolved: `10.x.x.x:xxxxx`

2. **NIM** (inference layer)
   - Submitted after ChromaDB
   - Requires 3× B200 GPUs
   - 500 Gi PVC for model cache
   - URL resolved: `10.x.x.x:xxxxx`

3. **Backend** (application layer)
   - Receives `CHROMA_URL` and `NIM_BASE_URL` as env vars
   - Runs NIM warmup checks on startup
   - URL resolved: `10.x.x.x:xxxxx`
   - Persists URL to GitHub Environment variable

4. **Frontend** (presentation layer)
   - Receives `BACKEND_URL` as env var
   - URL resolved: `10.x.x.x:xxxxx`

**Expected startup time:** 5–15 minutes (NIM model download on first run, cached on PVC thereafter)

---

## Verifying Deployment

### 1. Check Backend Health

Once the backend workload is `Running`:

```bash
# Port-forward to backend (if VPN is connected)
runai port-forward medw-backend-dev --ports 8000:8000

# Check health endpoint
curl http://localhost:8000/api/v1/health

# Expected response:
# {
#   "status": "ok",
#   "nim_warmup": {
#     "ready": true,
#     "attempts": 1,
#     "first_success_at": "2026-04-27T14:30:00Z"
#   },
#   "version": "1.0.0"
# }
```

### 2. Verify NIM Warmup

The backend performs automatic NIM warmup on startup. Check the warmup state:

```bash
curl http://localhost:8000/api/v1/health | jq '.nim_warmup'

# Expected output:
# {
#   "ready": true,
#   "attempts": 1,
#   "first_success_at": "2026-04-27T14:30:00Z"
# }
```

If `ready` is `false`:
- Check NIM workload phase in Run:ai UI
- Check NIM logs: `runai logs medw-nim-dev -f`
- Verify `NGC_API_KEY` is correct in GitHub Secrets

### 3. Smoke Test Triage Endpoint

```bash
# POST a Greek symptom
curl -X POST http://localhost:8000/api/v1/triage \
  -H "Content-Type: application/json" \
  -d '{
    "symptoms": ["πονόλαιμος", "πυρετός"],
    "language": "el"
  }'

# Expected response (non-fallback if NIM is working):
# {
#   "triage_level": "moderate",
#   "recommendation": "...",
#   "source": "nim",
#   "model": "nvidia/nemotron-3-super-120b-a12b"
# }
```

### 4. Verify Frontend Access

```bash
# Port-forward to frontend (if VPN is connected)
runai port-forward medw-frontend-dev --ports 3000:3000

# Access in browser
open http://localhost:3000
```

---

## Troubleshooting

### Workflow Fails at VPN Connection

**Symptom:** "Failed to connect to VPN" in GitHub Actions logs

**Solutions:**
- Verify `VPN_CONFIG`, `VPN_USERNAME`, `VPN_PASSWORD` secrets are correct
- Check if VPN server is reachable
- Validate `.ovpn` file is properly base64-encoded

### Workflow Fails at NIM Submission

**Symptom:** "NIM failed (HTTP 401/403)" or "Failed to pull image"

**Solutions:**
- Verify `NGC_API_KEY` secret is valid
- Check `imagePullSecrets: dockerregistry-nvcr-io` exists in Run:ai cluster
- Verify NGC account has access to the NIM model

### NIM Workload Stuck in `Pending` Phase

**Symptom:** NIM workload never reaches `Running` phase

**Solutions:**
- Check if B200 GPUs are available in the cluster
- Verify `gpuDevicesRequest: 3` does not exceed cluster capacity
- Check Run:ai scheduler logs: `runai get events medw-nim-dev`

### Backend Fails NIM Warmup

**Symptom:** `nim_warmup.ready` is `false` in health endpoint

**Solutions:**
- Verify NIM workload is `Running` phase
- Check NIM health endpoint: `curl http://<nim-url>:8000/v1/health/ready`
- Check backend logs for warmup errors: `runai logs medw-backend-dev -f`
- Verify `NIM_BASE_URL` env var is correct in backend workload

### Service URL Not Resolved

**Symptom:** "Failed to resolve service URLs" in workflow logs

**Solutions:**
- Wait longer (up to 10 minutes) for workloads to start
- Check Run:ai UI to see if workloads are `Running`
- Manually query API: see "Via Run:ai API" section above

---

## Resource Allocation

| Workload | CPU Request | CPU Limit | Memory Request | Memory Limit | GPU |
|---|---|---|---|---|---|
| **medw-nim** | 24 | 24 | 96 Gi | 96 Gi | 3× B200 |
| **medw-chromadb** | 1 | 1 | 2 Gi | 2 Gi | — |
| **medw-backend** | 1 | 1 | 1 Gi | 1 Gi | — |
| **medw-frontend** | 0.5 | 0.5 | 512 Mi | 512 Mi | — |

### Persistent Volume Claims

| PVC | Size | Purpose |
|---|---|---|
| `nim-pvc` | 500 Gi | NIM engine cache (model weights) |
| `chroma-pvc` | 10 Gi | ChromaDB vector embeddings |

**Note:** PVCs are independent of workload lifecycle and persist across deployments.

---

## Architecture Notes

### Why Run:ai Workspace API (Not kubectl)?

The deployment uses the Run:ai Workspace REST API instead of `kubectl apply` for several reasons:

1. **Dynamic URL resolution:** Run:ai assigns NodePorts dynamically; the API resolves these at runtime
2. **Environment variable injection:** URLs are passed to downstream workloads as env vars
3. **GitHub Environment integration:** Backend URL is persisted for future deployments
4. **Simplified authentication:** Single token-based auth vs. kubeconfig management

### k8s/ Directory

The `k8s/` directory contains **reference-only** Kubernetes manifests. These are:
- NOT applied by CI/CD
- Useful for local testing with `kubectl` (if you have cluster access)
- Document the intended workload specifications

**Current deployment:** See `.github/workflows/deploy.yml` for the live deployment logic.

---

## Security Notes

- **RAG_DEBUG_ENABLED** must be `false` in production (exposes internal pipeline data via `/api/v1/rag/debug/*`)
- **No API authentication** (endpoints are internal-only, protected by VPN)
- **Patient data stays on-premise** (GDPR Article 9 compliance)
- **NGC_API_KEY** is injected at runtime from GitHub Secrets (never committed)
- **VPN-only access** to cluster (public network cannot reach workloads)

---

## Rollback Procedure

To rollback to a previous deployment:

1. **Identify the previous immutable tag:**
   - Navigate to GHCR: `ghcr.io/contzokas/medw-backend`
   - Find previous tag (e.g., `dev-<previous-sha>`)

2. **Re-trigger workflow manually** with same branch:
   - The workflow will rebuild images and submit workloads
   - Previous PVC data is retained (NIM cache and ChromaDB persist)

3. **Emergency rollback (if workflow is broken):**
   - Use Run:ai CLI to delete workloads: `runai delete workload medw-nim-dev`
   - Manually submit workloads via Run:ai UI or API
   - Reference `k8s/` manifests for workload specifications

---

## Contact & Support

- **Run:ai Cluster:** `runai.kiefersa.gr`
- **Project:** `medo`
- **GitHub Actions:** `.github/workflows/deploy.yml`
- **Architecture:** See `docs/architecture-ai-pipeline.md`
- **Backend API:** See `docs/api-contracts-backend.md`
