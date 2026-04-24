# deploy.ps1 — Manual build + deploy to Run:ai cluster
# Cluster:  runai-kiefer
# Project:  medo  (namespace: runai-medo)
#
# Run from the root of the MedW repo:  .\deploy.ps1
#
# Prerequisites:
#   - Docker Desktop running
#   - Run:ai CLI installed  (https://github.com/run-ai/runai-cli/releases)
#   - Logged in: runai login --cluster-url <url> --token <token>
#   - Logged in to image registry: docker login ghcr.io

param(
    [string]$Registry     = "ghcr.io/medw",
    [string]$Tag          = "test",                    # test | dev | latest
    [string]$Suffix       = "-test",                   # workload name suffix
    [string]$ClusterUrl   = "https://runai.kiefersa.gr",
    [string]$ClientId     = "",   # Run:ai Application Client ID
    [string]$ClientSecret = "",   # Run:ai Application Client Secret
    [switch]$SkipBuild    = $false,
    [switch]$SkipPush     = $false,
    [switch]$SkipLogin    = $false  # use if already logged in via 'runai login'
)

$ErrorActionPreference = "Stop"
$Project = "medo"

Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  MedW — Run:ai Deployment Script"       -ForegroundColor Cyan
Write-Host "  Cluster: runai-kiefer | Project: medo" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# ── 0. Login to Run:ai CLI (v2 syntax) ────────────────────────────────────────────
# Run:ai CLI v2 uses environment variables for non-interactive auth:
#   $env:RUNAI_CLIENT_ID     = "<client-id>"
#   $env:RUNAI_CLIENT_SECRET = "<client-secret>"
#   runai login
#
# Control plane URL must be set first (one-time per machine):
#   runai config set --cp-url=https://runai.kiefersa.gr
if (-not $SkipLogin) {
    Write-Host "[0] Configuring Run:ai CLI..." -ForegroundColor Yellow

    # Set control plane URL (safe to run every time)
    runai config set --cp-url=$ClusterUrl
    if ($LASTEXITCODE -ne 0) { throw "Failed to set Run:ai control plane URL" }

    if ($ClientId -and $ClientSecret) {
        Write-Host "    Logging in with application credentials..." -ForegroundColor Yellow
        $env:RUNAI_CLIENT_ID     = $ClientId
        $env:RUNAI_CLIENT_SECRET = $ClientSecret
        runai login
        if ($LASTEXITCODE -ne 0) { throw "Run:ai login failed" }
    } else {
        Write-Host "    No credentials provided — assuming already logged in." -ForegroundColor DarkGray
        Write-Host "    To login: set RUNAI_CLIENT_ID + RUNAI_CLIENT_SECRET, then: runai login" -ForegroundColor DarkGray
    }

    # v2: use 'runai project set' (not 'runai config project')
    runai project set $Project
    Write-Host "  ✓ Project set to '$Project'" -ForegroundColor Green
}

# ── 1. Build images ──────────────────────────────────────────────────────────
if (-not $SkipBuild) {
    Write-Host ""
    Write-Host "[1/4] Building backend image..." -ForegroundColor Yellow
    docker build -t "$Registry/medw-backend:$Tag" ./backend
    if ($LASTEXITCODE -ne 0) { throw "Backend build failed" }

    Write-Host "[1/4] Building frontend image..." -ForegroundColor Yellow
    docker build `
        --build-arg NEXT_PUBLIC_API_URL="http://backend:8000" `
        -t "$Registry/medw-frontend:$Tag" `
        ./frontend
    if ($LASTEXITCODE -ne 0) { throw "Frontend build failed" }

    Write-Host "  ✓ Images built" -ForegroundColor Green
} else {
    Write-Host "[1/4] Skipping image build (-SkipBuild)" -ForegroundColor DarkGray
}

# ── 2. Push images ───────────────────────────────────────────────────────────
if (-not $SkipPush) {
    Write-Host ""
    Write-Host "[2/4] Pushing images to $Registry ..." -ForegroundColor Yellow
    docker push "$Registry/medw-backend:$Tag"
    if ($LASTEXITCODE -ne 0) { throw "Backend push failed" }
    docker push "$Registry/medw-frontend:$Tag"
    if ($LASTEXITCODE -ne 0) { throw "Frontend push failed" }
    Write-Host "  ✓ Images pushed" -ForegroundColor Green
} else {
    Write-Host "[2/4] Skipping image push (-SkipPush)" -ForegroundColor DarkGray
}

# ── 3. Submit workloads via Run:ai CLI ───────────────────────────────────────
# No kubeconfig needed — Run:ai CLI uses token auth.
Write-Host ""
Write-Host "[3/4] Submitting workloads to Run:ai (project: $Project)..." -ForegroundColor Yellow

# ChromaDB — CPU only
Write-Host "  → ChromaDB..."
runai submit medw-chromadb `
    --image chromadb/chroma:1.5.7 `
    --cpu 1 --memory 2G `
    --project $Project `
    -e IS_PERSISTENT=TRUE `
    -e ANONYMIZED_TELEMETRY=FALSE `
    -e CHROMA_SERVER_PORT=8000 `
    --service-type ClusterIP `
    --port 8000 `
    --persistent-volume-claim chroma-pvc:/chroma/chroma

# Backend — CPU only
Write-Host "  → Backend..."
runai submit medw-backend `
    --image "$Registry/medw-backend:$Tag" `
    --cpu 1 --memory 1G `
    --project $Project `
    -e OLLAMA_HOST=http://medw-ollama:11434 `
    -e OLLAMA_MODEL=medgemma:27b `
    -e OLLAMA_TIMEOUT=30 `
    -e CHROMA_HOST=medw-chromadb `
    -e CHROMA_PORT=8000 `
    --service-type ClusterIP `
    --port 8000

# Frontend — CPU only
Write-Host "  → Frontend..."
runai submit medw-frontend `
    --image "$Registry/medw-frontend:$Tag" `
    --cpu 1 --memory 512M `
    --project $Project `
    --service-type NodePort `
    --port 3000

# Ollama — 1x NVIDIA B200 GPU
Write-Host "  → Ollama (B200 GPU)..."
runai submit medw-ollama `
    --image ollama/ollama:latest `
    --gpu 1 `
    --node-type NVIDIA-B200 `
    --cpu 8 --memory 32G `
    --project $Project `
    -e OLLAMA_MODEL=medgemma:27b `
    -e OLLAMA_FLASH_ATTENTION=1 `
    -e OLLAMA_NUM_PARALLEL=4 `
    -e OLLAMA_MAX_LOADED_MODELS=1 `
    --service-type ClusterIP `
    --port 11434 `
    --persistent-volume-claim ollama-pvc:/root/.ollama `
    --command -- /bin/bash /entrypoint.sh

Write-Host "  ✓ All workloads submitted" -ForegroundColor Green

# ── 4. Status ────────────────────────────────────────────────────────────────
Write-Host ""
Write-Host "[4/4] Workload status:" -ForegroundColor Yellow
runai list workloads -p $Project

Write-Host ""
Write-Host "========================================" -ForegroundColor Green
Write-Host "  Deployment submitted!" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Green
Write-Host ""
Write-Host "Monitor GPU workload:"
Write-Host "  runai logs medw-ollama$Suffix -p $Project -f" -ForegroundColor Cyan
Write-Host ""
Write-Host "Access the app (once pods are Running):"
Write-Host "  runai port-forward medw-frontend$Suffix --ports 3000:3000 -p $Project" -ForegroundColor Cyan
Write-Host "  runai port-forward medw-backend$Suffix  --ports 8000:8000 -p $Project" -ForegroundColor Cyan
Write-Host ""
Write-Host "List workloads (v2 command):"
Write-Host "  runai workload list" -ForegroundColor Cyan
Write-Host ""
