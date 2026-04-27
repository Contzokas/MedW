# Kubernetes Reference Manifests

**⚠️ IMPORTANT: These manifests are REFERENCE ONLY.**

These Kubernetes manifests are **not applied by CI/CD**. The actual deployment uses the Run:ai Workspace API via the GitHub Actions workflow at `.github/workflows/deploy.yml`.

## What These Manifests Show

These files provide reference specifications for the workloads deployed to Run:ai:

- `nim-deployment.yaml` — NVIDIA NIM (Nemotron Super 120B) Deployment + Service (3× B200, 500 Gi PVC)
- `chromadb-deployment.yaml` — ChromaDB vector database Deployment + Service
- `backend-deployment.yaml` — FastAPI backend Deployment + Service
- `frontend-deployment.yaml` — Next.js frontend Deployment + Service
- `pvcs.yaml` — Persistent Volume Claims for NIM cache and ChromaDB
- `kustomization.yaml` — Kustomize configuration for applying all manifests
- `namespace.yaml` — Kubernetes namespace (`runai-medo`)

## Live Deployment

The actual deployment to Run:ai cluster `runai.kiefersa.gr` is handled by:

1. **GitHub Actions Workflow:** `.github/workflows/deploy.yml`
2. **Deployment Method:** Run:ai Workspace REST API (not `kubectl apply`)
3. **Workload Submission:** NIM, ChromaDB, backend, and frontend submitted as separate workloads

## Why Two Approaches?

- **k8s/ manifests:** Reference documentation showing intended resource specs, useful for manual testing or local development with cluster access
- **deploy.yml:** Production deployment using Run:ai Workspace API with dynamic URL resolution and environment variable injection

## Deployment Runbook

For complete deployment procedures, monitoring, and troubleshooting, see:
`docs/deployment-runbook.md`
