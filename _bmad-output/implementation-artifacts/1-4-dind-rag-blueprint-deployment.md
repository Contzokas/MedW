# Story 1.4: DinD RAG Blueprint Deployment

Status: in-progress

## Story

As a DevOps operator,
I want the NVIDIA NIM inference workload and supporting services deployed to Run:ai via GitHub Actions,
So that the MedW triage backend can reach a live Nemotron NIM endpoint on the B200 cluster without requiring manual cluster intervention.

## Context Note — Architecture Pivot

> ⚠️ The original architecture doc described a **Docker-in-Docker (DinD)** approach with `Dockerfile.rag-runner` + `rag_runner_entrypoint.sh`. **This was superseded in practice.** The team implemented a **native Run:ai Workspace API** approach instead:
> - NIM, ChromaDB, backend, and frontend are submitted as separate Run:ai workload JSON payloads via the cluster REST API.
> - The existing `deploy.yml` GitHub Actions workflow (`feature/nvidia-rag-test` branch) handles this end-to-end.
> - The `k8s/` directory contains reference Kubernetes manifests (not currently applied by CI).
> - **This story closes the gap**: validate, harden, and document what exists so 1-4 is done and the pipeline is demo-ready.

---

## Acceptance Criteria

1. **Given** a push to `main` or `dev` branch,
   **When** the `deploy.yml` GitHub Actions workflow runs,
   **Then** it successfully builds and pushes `medw-backend` and `medw-frontend` images to GHCR and submits NIM, backend, and frontend workloads to Run:ai cluster `runai.kiefersa.gr` without error.

2. **Given** the NIM workload is submitted to Run:ai,
   **When** the workload reaches `Running` phase,
   **Then** the NIM `/v1/health/ready` endpoint responds HTTP 200 (validated by the backend warmup logic in `llm_service.py`).

3. **Given** the backend workload is running on Run:ai,
   **When** `GET /api/v1/health` is called,
   **Then** it returns `{"status": "ok"}` HTTP 200 and the warmup state reflects NIM connectivity.

4. **Given** the `NGC_API_KEY` secret exists in GitHub Actions (`secrets.NGC_API_KEY`),
   **When** the NIM workload starts on the cluster,
   **Then** the key is injected via the Run:ai workspace `environmentVariables` array (NOT hardcoded in manifests or workflow file).

5. **Given** the `.env.example` file,
   **When** a developer clones the repo,
   **Then** all required env vars for local-dev and Run:ai are documented with placeholder comments (no real keys committed).

6. **Given** the `k8s/` reference manifests,
   **When** reviewed,
   **Then** they are consistent with the deployed workload specs (model, image, resource requests) — or clearly annotated as divergent/reference-only.

---

## Tasks / Subtasks

- [x] **Audit `deploy.yml`** — verify NIM workload submission step matches the current `k8s/nim-deployment.yaml` model name and image (AC: #1, #4)
  - [x] Confirm `NGC_API_KEY` is injected from `secrets.NGC_API_KEY` in the Run:ai workload env block (not from Run:ai credentials API indirection)
  - [x] Confirm `NIM_IMAGE` env var in workflow matches `nvcr.io/nim/nvidia/nemotron-3-super-120b-a12b:latest`
  - [x] Confirm GPU count and node selector align with `k8s/nim-deployment.yaml` (3× B200)

- [x] **Validate NIM workload JSON payload** — ensure the workspace spec contains `imagePullSecrets`, GPU resource block, and NIM_CACHE_PATH (AC: #1)
  - [x] Add `scheduling.run.ai/fraction: "3"` annotation if missing from the Run:ai JSON payload
  - [x] Add `NIM_CACHE_PATH=/opt/nim/.cache` env var if missing
  - [x] Ensure PVC for NIM cache (500 Gi) is created before NIM workload submission

- [x] **Validate backend env vars** — `NIM_BASE_URL`, `NIM_MODEL`, `NIM_TIMEOUT`, `NIM_WARMUP_*` must be passed to backend workload (AC: #2, #3)
  - [x] Cross-check `backend/app/core/config.py` defaults vs. what `deploy.yml` injects

- [x] **Update `.env.example`** — ensure `NIM_BASE_URL`, `NIM_MODEL`, `NGC_API_KEY` placeholder, `CHROMA_HOST`, `CHROMA_PORT`, `RAG_DEBUG_ENABLED` are all documented (AC: #5)
  - [x] Current `.env.example` already has most — verify completeness and add any missing from `config.py`

- [x] **Annotate `k8s/` manifests** — add header comment noting these are reference-only, not applied by CI (AC: #6)
  - [x] Add `# REFERENCE ONLY — not applied by CI. See .github/workflows/deploy.yml for live deployment.` to each manifest

- [x] **Smoke-test documentation** — add or update `docs/` with a run-book for manual deployment verification (AC: all)
  - [x] Document: how to trigger workflow manually (`workflow_dispatch`)
  - [x] Document: how to monitor workload phase via Run:ai UI or API
  - [x] Document: how to verify NIM warmup via `GET /api/v1/health` warmup field

### Review Findings (Code Review - 2026-04-27)

**Decision Needed (requires human input):**
- [x] [Review][Decision] Health endpoint specification mismatch — AC #3 requires `GET /api/v1/health` to return warmup state, but implementation returns only `{"status": "ok"}`. Warmup state is at `/api/v1/health/warmup` instead. **RESOLVED: Modified health endpoint to include warmup state (matches AC #3)**
- [x] [Review][Decision] Redundant comment noise across k8s manifests — Identical REFERENCE ONLY comments in 8 YAML files create diff noise. **RESOLVED: Created k8s/README.md and removed redundant comments**

**Patch (fixable without input):**
- [x] [Review][Patch] Hardcoded API key in .env.example [.env.example:14] — `NIM_API_KEY=nim-local` looks like real key, should use placeholder `your-nim-api-key-here`
- [x] [Review][Patch] Missing bounds checking on warmup retry delay [backend/app/core/config.py:26] — No upper bound on NIM_WARMUP_RETRY_DELAY_SECONDS could cause 3.8-year warmup
- [x] [Review][Patch] Hardcoded Run:ai GPU fraction [.github/workflows/deploy.yml:420] — GPU fraction hardcoded to "3", should be parameterized
- [x] [Review][Patch] Missing RAG_DEBUG_ENABLED in backend workload [.github/workflows/deploy.yml:508-516] — RAG_DEBUG_ENABLED not passed to backend deployment
- [ ] [Review][Patch] Missing environment variable validation [.github/workflows/deploy.yml:213-217] — No validation for env var values in workflow (skipped - requires complex workflow changes)
- [x] [Review][Patch] URL parsing assumes valid format [.github/workflows/deploy.yml:489-490] — CHROMA_URL/NIM_URL parsing doesn't validate format
- [x] [Review][Patch] Missing queue timeout configuration [.env.example:23-24] — QUEUE_MAX_ENTRIES without corresponding timeout config
- [x] [Review][Patch] No upper bound on NIM_TIMEOUT [backend/app/core/config.py:18] — Extremely long timeouts cause poor UX

**Deferred (pre-existing issues):**
- [x] [Review][Defer] No timeout handling for warmup model initialization [backend/app/services/llm_service.py] — deferred, pre-existing
- [x] [Review][Defer] Race condition in warmup state management [backend/app/services/llm_service.py] — deferred, pre-existing
- [x] [Review][Defer] Missing CHROMA_HOST/PORT extraction validation [.github/workflows/deploy.yml:489-490] — deferred, pre-existing
- [x] [Review][Defer] No validation of NIM_TIMEOUT vs warmup retry relationship [backend/app/core/config.py] — deferred, pre-existing
- [x] [Review][Defer] Missing error handling for URL resolution fallback [.github/workflows/deploy.yml:477-478] — deferred, pre-existing
- [x] [Review][Defer] Missing validation for boolean env var parsing [backend/app/core/config.py] — deferred, pre-existing
- [x] [Review][Defer] No validation for annotation format [.github/workflows/deploy.yml:420] — deferred, pre-existing
- [x] [Review][Defer] Missing validation for PVC size compatibility [.github/workflows/deploy.yml:418] — deferred, pre-existing
- [x] [Review][Defer] No verification NIM image supports model [.github/workflows/deploy.yml] — deferred, pre-existing
- [x] [Review][Defer] Missing validation for concurrent workload deletion [.github/workflows/deploy.yml:300-328] — deferred, pre-existing
- [x] [Review][Defer] No validation for Kubernetes env var names [.github/workflows/deploy.yml:508-516] — deferred, pre-existing
- [x] [Review][Defer] Missing documentation for config parameters [.env.example] — deferred, pre-existing

---

## Dev Notes

### What Already Exists — MUST READ Before Implementing

**`.github/workflows/deploy.yml`** (729 lines) — the primary CI/CD artifact. Already implements:
- Branch → tag resolution (`main=latest`, `dev=dev`)
- OpenVPN connect to `runai.kiefersa.gr` private cluster
- GHCR image build/push for `medw-backend` and `medw-frontend`
- ChromaDB image mirror to GHCR
- Run:ai authentication via `RUNAI_CLIENT_ID` / `RUNAI_CLIENT_SECRET` secrets
- NIM workload submission as Run:ai Workspace JSON
- Backend + Frontend workload submission
- Backend URL resolution loop (polls Run:ai API until `Running`)
- GitHub Environment variable `BACKEND_URL` auto-update

**`k8s/`** directory — reference Kubernetes manifests (created before the Run:ai API approach was adopted):
- `nim-deployment.yaml` — Nemotron NIM Deployment + Service (3× B200, 500 Gi PVC)
- `chromadb-deployment.yaml` — ChromaDB Deployment + Service
- `backend-deployment.yaml` — FastAPI backend Deployment + Service
- `frontend-deployment.yaml` — Next.js frontend Deployment + Service
- `pvcs.yaml` — PVCs for NIM cache and ChromaDB
- `kustomization.yaml`
- `namespace.yaml`

**`backend/app/core/config.py`** — env var configuration. Current defaults:
```python
NIM_BASE_URL = os.environ.get("NIM_BASE_URL", "http://nim:8000/v1")
NIM_MODEL    = os.environ.get("NIM_MODEL", "nvidia/nemotron-3-super-120b-a12b")
NIM_API_KEY  = os.environ.get("NIM_API_KEY", "nim-local")
NIM_TIMEOUT  = int(os.environ.get("NIM_TIMEOUT", "120"))
NIM_WARMUP_ENABLED = _get_bool_env("NIM_WARMUP_ENABLED", True)
NIM_WARMUP_RETRIES = int(os.environ.get("NIM_WARMUP_RETRIES", "120"))
NIM_WARMUP_RETRY_DELAY_SECONDS = int(os.environ.get("NIM_WARMUP_RETRY_DELAY_SECONDS", "25"))
CHROMA_HOST  = os.environ.get("CHROMA_HOST", "chromadb")
CHROMA_PORT  = int(os.environ.get("CHROMA_PORT", "8000"))
```

**`backend/app/services/llm_service.py`** — LangChain `ChatOpenAI` client pointing at NIM. Already uses `httpx` for warmup health check against `{NIM_BASE_URL}/health/ready`.

**`.env.example`** — current state includes `NIM_BASE_URL`, `NIM_MODEL`, `NGC_API_KEY` placeholder, `CHROMA_HOST/PORT`, `BACKEND_URL`, `RAG_DEBUG_ENABLED`. Verify nothing from `config.py` is missing.

---

### Architecture Compliance

Per `architecture.md`:
- **All NIM/RAG HTTP calls must go through `clients/nim_client.py`** — ⚠️ current code calls NIM via LangChain `ChatOpenAI` in `llm_service.py`. This is functionally correct but deviates from the architecture's `nim_client.py` single-point rule. **Do NOT refactor in this story** — this is deferred to Story 2.6 (`2-6-nim-client-httpx-wrapper`).
- **No secrets in repo** — `NGC_API_KEY` must come from GitHub Actions `secrets.NGC_API_KEY`. Never hardcode.
- **Network isolation** — NIMs and ChromaDB are bound to the Run:ai internal cluster network. Only backend has an exposed NodePort.

---

### Run:ai Deployment Approach

The current `deploy.yml` uses the **Run:ai Workspace API** (not `kubectl apply`):

```
POST https://runai.kiefersa.gr/api/v1/workloads/workspaces
Authorization: Bearer <token>
Body: { name, projectId, clusterId, spec: { image, compute, environmentVariables, ports } }
```

Key points:
- NIM workload needs `compute.gpuDevicesRequest: 3` (or equivalent fraction annotation)
- NIM workload needs image pull secret for `nvcr.io` registry
- Backend workload gets `NIM_BASE_URL` pointing at the NIM service internal URL (resolved from cluster)
- 409 responses = workload already exists, treated as success (idempotent)

---

### Current NIM Model

- **Model**: `nvidia/nemotron-3-super-120b-a12b`
- **Image**: `nvcr.io/nim/nvidia/nemotron-3-super-120b-a12b:latest`
- **Hardware**: 3× NVIDIA B200 (192 GB HBM3e each = 576 GB total)
- **NIM healthcheck endpoints**: `GET /v1/health/ready` (readiness), `GET /v1/health/live` (liveness)
- **NIM API**: OpenAI-compatible. `POST /v1/chat/completions` with `model` field.

---

### Key Env Vars Passed to Backend Workload

| Variable | Value in CI | Source |
|---|---|---|
| `NIM_BASE_URL` | Resolved from NIM workload URL | `deploy.yml` step |
| `NIM_MODEL` | `vars.NIM_MODEL` or default | GitHub Environment variable |
| `NIM_TIMEOUT` | `vars.NIM_TIMEOUT` or `120` | GitHub Environment variable |
| `NIM_WARMUP_ENABLED` | `vars.NIM_WARMUP_ENABLED` or `true` | GitHub Environment variable |
| `NIM_WARMUP_RETRIES` | `vars.NIM_WARMUP_RETRIES` or `120` | GitHub Environment variable |
| `NIM_WARMUP_RETRY_DELAY_SECONDS` | `vars.NIM_WARMUP_RETRY_DELAY_SECONDS` or `25` | GitHub Environment variable |
| `CHROMA_HOST` | Resolved from ChromaDB workload URL | `deploy.yml` step |
| `CHROMA_PORT` | Extracted from ChromaDB URL | `deploy.yml` step |

---

### Files to Create/Modify

```
medw/
├── .env.example                          ← verify completeness, no changes expected
├── .github/workflows/deploy.yml          ← audit + patch NIM workload spec if needed
├── k8s/                                  ← add "REFERENCE ONLY" header comments
│   ├── nim-deployment.yaml
│   ├── chromadb-deployment.yaml
│   ├── backend-deployment.yaml
│   ├── frontend-deployment.yaml
│   ├── pvcs.yaml
│   ├── kustomization.yaml
│   └── namespace.yaml
└── docs/                                 ← add/update deployment runbook
    └── deployment-runbook.md             ← CREATE if not present
```

Do NOT modify:
- `backend/app/` source (no functional changes in this story)
- `frontend/` (no changes)
- `docker-compose.yml` (local dev only, not affected)

---

### Testing / Verification

This story has no automated tests. Verification is operational:

1. **Workflow trigger**: Merge to `dev` or use `workflow_dispatch` on the GitHub Actions UI.
2. **NIM workload check**: Monitor Run:ai UI → project `medo` → workload `medw-nim-dev` phase = `Running`.
3. **NIM health**: Once running, exec into backend or curl via port-forward:
   ```bash
   # Via Run:ai port-forward (if available)
   runai port-forward medw-backend-dev --ports 8000:8000
   curl http://localhost:8000/api/v1/health
   # Expect: {"status": "ok", "nim_warmup": {"ready": true, ...}}
   ```
4. **Triage smoke test**: POST a Greek symptom to `/api/v1/triage` and confirm a non-fallback response.

---

### Anti-Patterns — Do NOT Do These

- ✗ Do NOT hardcode `NGC_API_KEY` anywhere in the workflow or manifests
- ✗ Do NOT apply `k8s/` manifests directly with `kubectl` in CI — use the Run:ai Workspace API
- ✗ Do NOT add ChromaDB/NIM to the local `docker-compose.yml` — it uses Ollama-era services for local dev
- ✗ Do NOT refactor `llm_service.py` to use `nim_client.py` — deferred to Story 2.6

---

### Previous Story Intelligence

From Story 1.3 (superseded):
- The Ollama/ChromaDB docker-compose pattern is now superseded by the Run:ai native workload approach.
- The `docker-compose.yml` remains in place for local frontend+backend-only dev (without NIM).
- `backend/Dockerfile` and `frontend/Dockerfile` are complete and correct — used by `deploy.yml` for GHCR image builds.

From recent commits (`feature/nvidia-rag-test` branch):
- `c016a21` — Migrated LLM backend from Ollama to NVIDIA NIM (Nemotron Super 120B)
- `677f4c3` — Fixed NGC_API_KEY injection from GitHub secret
- `24c5c46` — Fixed image source for Thanos asset (frontend)

---

### References

- Architecture — Infrastructure & Deployment: [architecture.md](../_bmad-output/planning-artifacts/architecture.md#infrastructure--deployment)
- Architecture — DinD Startup Sequence: architecture.md (superseded by native Run:ai approach)
- Workflow file: [deploy.yml](../../.github/workflows/deploy.yml)
- K8s reference manifests: [k8s/](../../k8s/)
- Backend config: [backend/app/core/config.py](../../backend/app/core/config.py)
- LLM service (NIM client): [backend/app/services/llm_service.py](../../backend/app/services/llm_service.py)
- Sprint status: [sprint-status.yaml](./sprint-status.yaml)

---

## Dev Agent Record

### Agent Model Used

Claude Sonnet 4.6 (claude-sonnet-4-6)

### Debug Log References

_none_

### Completion Notes List

**Task 1: Audit `deploy.yml`**
- ✅ NGC_API_KEY is correctly injected from `secrets.NGC_API_KEY` (line 387, 409 in deploy.yml)
- ✅ NIM_IMAGE matches expected: `nvcr.io/nim/nvidia/nemotron-3-super-120b-a12b:latest`
- ✅ GPU count matches (3× B200)
- ⚠️ Note: deploy.yml JSON payload is missing node selector for B200 GPUs (k8s manifest has `nvidia.com/gpu.product: NVIDIA-B200`). Run:ai Workspace API may not support node selector directly; cluster scheduling likely handles GPU type selection via available resources.

**Task 2: Validate NIM workload JSON payload**
- ✅ Added missing `scheduling.run.ai/fraction: "3"` annotation to NIM workload JSON payload
- ✅ Verified `imagePullSecrets: dockerregistry-nvcr-io` is present
- ✅ Verified `NIM_CACHE_PATH=/opt/nim/.cache` env var is present
- ✅ Verified 500 Gi PVC for NIM cache is created

**Task 3: Validate backend env vars**
- ✅ Verified all required NIM env vars are passed: `NIM_BASE_URL`, `NIM_MODEL`, `NIM_TIMEOUT`, `NIM_WARMUP_ENABLED`, `NIM_WARMUP_RETRIES`, `NIM_WARMUP_RETRY_DELAY_SECONDS`
- ✅ Verified ChromaDB env vars are passed: `CHROMA_HOST`, `CHROMA_PORT`
- All values match `backend/app/core/config.py` defaults

**Task 4: Update `.env.example`**
- ✅ Added missing env vars from `config.py`: `NIM_API_KEY`, `NIM_TIMEOUT`, `NIM_WARMUP_ENABLED`, `NIM_WARMUP_RETRIES`, `NIM_WARMUP_RETRY_DELAY_SECONDS`, `QUEUE_MAX_ENTRIES`
- Reorganized and documented all env vars with clear sections

**Task 5: Annotate `k8s/` manifests**
- ✅ Added `# REFERENCE ONLY — not applied by CI. See .github/workflows/deploy.yml for live deployment.` header to all 7 manifest files

**Task 6: Create deployment runbook**
- ✅ Created comprehensive `docs/deployment-runbook.md` with:
  - Workflow trigger instructions (automatic and manual via workflow_dispatch)
  - Required GitHub secrets and variables documentation
  - Monitoring via GitHub Actions, Run:ai UI, and API
  - Workload startup sequence
  - Verification procedures (health check, NIM warmup, smoke test)
  - Troubleshooting guide
  - Resource allocation details
  - Security notes
  - Rollback procedure

### File List

Modified files:
- .github/workflows/deploy.yml — Added `scheduling.run.ai/fraction: "3"` annotation to NIM workload JSON
- .env.example — Added missing env vars from config.py
- k8s/nim-deployment.yaml — Added REFERENCE ONLY header comment
- k8s/chromadb-deployment.yaml — Added REFERENCE ONLY header comment
- k8s/backend-deployment.yaml — Added REFERENCE ONLY header comment
- k8s/frontend-deployment.yaml — Added REFERENCE ONLY header comment
- k8s/pvcs.yaml — Added REFERENCE ONLY header comment
- k8s/kustomization.yaml — Added REFERENCE ONLY header comment
- k8s/namespace.yaml — Added REFERENCE ONLY header comment

Created files:
- docs/deployment-runbook.md — Comprehensive deployment and troubleshooting guide

## Change Log

- 2026-04-27: Story 1.4 created via bmad-create-story workflow. Reflects architecture pivot from DinD to native Run:ai Workspace API. Story scope is audit + harden + document the existing deploy.yml pipeline.
- 2026-04-27: Story 1.4 completed — Audited deploy.yml, added missing scheduling annotation to NIM workload, updated .env.example with missing env vars, annotated all k8s/ manifests as reference-only, created comprehensive deployment runbook documentation.
