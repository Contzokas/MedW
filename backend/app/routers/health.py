from fastapi import APIRouter, Request
from fastapi.responses import JSONResponse

from app.services.llm_service import get_warmup_status

router = APIRouter()


@router.get("/health")
def health_check() -> dict[str, str]:
    return {"status": "ok"}


@router.get("/health/warmup")
def warmup_health_check() -> dict:
    return {"status": "ok", "warmup": get_warmup_status()}


@router.get("/health/routes")
def get_all_routes(request: Request) -> dict:
    """Get all available routes in the API to help with debugging 404 errors."""
    routes = []
    for route in request.app.routes:
        if hasattr(route, "methods") and hasattr(route, "path"):
            # Filter out HEAD and OPTIONS methods for clarity
            methods = sorted([m for m in route.methods if m not in ["HEAD", "OPTIONS"]])
            if methods:  # Only include routes that have methods
                routes.append({
                    "path": route.path,
                    "methods": methods,
                    "name": getattr(route, "name", "unknown")
                })

    return {
        "status": "ok",
        "routes": sorted(routes, key=lambda x: x["path"])
    }


@router.get("/health/diagnostics")
def get_diagnostics() -> dict:
    """Get diagnostic information about the application state."""
    import sys
    import os
    from app.core.config import (
        NIM_BASE_URL, NIM_MODEL, NIM_EMBED_BASE_URL,
        NIM_EMBED_MODEL, NIM_RERANKER_BASE_URL, NIM_RERANKER_MODEL
    )

    return {
        "status": "ok",
        "python_version": sys.version,
        "environment": {
            "nim_base_url": NIM_BASE_URL,
            "nim_model": NIM_MODEL,
            "nim_embed_base_url": NIM_EMBED_BASE_URL,
            "nim_embed_model": NIM_EMBED_MODEL,
            "nim_reranker_base_url": NIM_RERANKER_BASE_URL,
            "nim_reranker_model": NIM_RERANKER_MODEL,
        },
        "warmup": get_warmup_status(),
        "debugging_tips": {
            "common_404_causes": [
                "Missing /api/v1 prefix - all routes are under /api/v1",
                "Wrong HTTP method - check allowed methods in /health/routes",
                "Client using old API paths"
            ],
            "common_400_causes": [
                "Embeddings service not ready - check logs for retry attempts",
                "Invalid model name - verify NIM_*_MODEL environment variables",
                "Service authentication issues - verify NGC_API_KEY"
            ],
            "common_connection_issues": [
                "Milvus GOAWAY errors - gRPC keepalive settings",
                "Service startup timing - dependencies not ready",
                "Network connectivity - check service URLs"
            ]
        }
    }
