"""
RAG Debug Router — REST API endpoints for RAG pipeline introspection.

All endpoints are gated behind RAG_DEBUG_ENABLED=true environment variable.
In production, these endpoints return 403 Forbidden.
"""

import logging
from typing import Optional

from fastapi import APIRouter, HTTPException, Query
from pydantic import BaseModel, constr

from app.services.rag_debug import RAG_DEBUG_ENABLED

logger = logging.getLogger(__name__)

router = APIRouter(tags=["RAG Debug"])


def _guard():
    """Raise 403 if debug endpoints are not enabled."""
    if not RAG_DEBUG_ENABLED:
        raise HTTPException(
            status_code=403,
            detail="RAG debug endpoints are disabled. Set RAG_DEBUG_ENABLED=true to enable.",
        )


# ---------------------------------------------------------------------------
# Request models
# ---------------------------------------------------------------------------

class DebugRetrieveRequest(BaseModel):
    query: constr(strip_whitespace=True, min_length=1)
    top_k: Optional[int] = None
    include_embeddings: bool = False


class CompareQueriesRequest(BaseModel):
    queries: list[constr(strip_whitespace=True, min_length=1)]
    top_k: Optional[int] = None


class FullPipelineDebugRequest(BaseModel):
    symptoms: constr(strip_whitespace=True, min_length=1)
    lang: str = "el"
    top_k: Optional[int] = None


class InspectChunksRequest(BaseModel):
    chunk_ids: list[str]


class ReseedRequest(BaseModel):
    force: bool = False


# ---------------------------------------------------------------------------
# Endpoints
# ---------------------------------------------------------------------------

@router.get("/rag/debug/status")
async def debug_status() -> dict:
    """Check whether RAG debug mode is enabled and basic system info."""
    return {
        "rag_debug_enabled": RAG_DEBUG_ENABLED,
        "message": "Debug endpoints are active" if RAG_DEBUG_ENABLED else "Debug endpoints are disabled",
    }


@router.get("/rag/debug/health")
async def milvus_health() -> dict:
    """Deep health check of Milvus connection and collection state."""
    _guard()
    from app.services.rag_debug import check_milvus_health
    return await check_milvus_health()


@router.get("/rag/debug/corpus")
async def corpus_analysis() -> dict:
    """Analyse on-disk corpus vs ChromaDB collection contents."""
    _guard()
    from app.services.rag_debug import analyze_corpus
    return await analyze_corpus()


@router.get("/rag/debug/embeddings")
async def embedding_analysis(
    sample_size: int = Query(default=50, ge=1, le=500),
) -> dict:
    """Analyse embedding quality: magnitudes, zero/NaN vectors, duplicates."""
    _guard()
    from app.services.rag_debug import analyze_embeddings
    return await analyze_embeddings(sample_size=sample_size)


@router.post("/rag/debug/retrieve")
async def debug_retrieve(request: DebugRetrieveRequest) -> dict:
    """Execute a retrieval query with full debug introspection.

    Returns chunk details, distances, relevance scores, timing spans, and warnings.
    """
    _guard()
    from app.services.rag_debug import debug_retrieve as _debug_retrieve
    return await _debug_retrieve(
        query=request.query,
        top_k=request.top_k,
        include_embeddings=request.include_embeddings,
    )


@router.post("/rag/debug/compare")
async def compare_queries(request: CompareQueriesRequest) -> dict:
    """Run multiple queries and compare their retrieval results side by side.

    Shows which chunks are shared across queries and overlap analysis.
    """
    _guard()
    from app.services.rag_debug import compare_queries as _compare_queries
    return await _compare_queries(queries=request.queries, top_k=request.top_k)


@router.post("/rag/debug/pipeline")
async def full_pipeline_debug(request: FullPipelineDebugRequest) -> dict:
    """Trace the full RAG → LLM → Parse pipeline with stage-by-stage debug data.

    Returns timing, raw LLM response, parsed output, and per-stage errors.
    """
    _guard()
    from app.services.rag_debug import debug_full_pipeline
    return await debug_full_pipeline(
        symptoms=request.symptoms,
        lang=request.lang,
        top_k=request.top_k,
    )


@router.post("/rag/debug/inspect")
async def inspect_chunks(request: InspectChunksRequest) -> dict:
    """Fetch specific chunks from ChromaDB by their IDs with full details."""
    _guard()
    from app.services.rag_debug import inspect_chunks as _inspect_chunks
    return await _inspect_chunks(chunk_ids=request.chunk_ids)


@router.get("/rag/debug/traces")
async def get_traces(
    limit: int = Query(default=50, ge=1, le=200),
) -> dict:
    """Return recent pipeline traces from the in-memory trace history."""
    _guard()
    from app.services.rag_debug import get_trace_history
    traces = await get_trace_history(limit=limit)
    return {"count": len(traces), "traces": traces}


@router.delete("/rag/debug/traces")
async def clear_traces() -> dict:
    """Clear all stored pipeline traces."""
    _guard()
    from app.services.rag_debug import clear_trace_history
    await clear_trace_history()
    return {"message": "Trace history cleared"}


@router.get("/rag/debug/stats")
async def pipeline_stats() -> dict:
    """Aggregate statistics computed from the trace history.

    Includes duration percentiles, error rates, distance distributions,
    and top warnings.
    """
    _guard()
    from app.services.rag_debug import get_pipeline_stats
    return await get_pipeline_stats()


@router.post("/rag/debug/reseed")
async def reseed_corpus(request: ReseedRequest) -> dict:
    """Re-seed the ChromaDB corpus from disk.

    If force=True, deletes the existing collection first and rebuilds from scratch.
    """
    _guard()
    from app.services.rag_debug import reseed_corpus as _reseed_corpus
    return await _reseed_corpus(force=request.force)
