"""
RAG Debug Service — Comprehensive introspection for the Retrieval-Augmented Generation pipeline.

Provides:
  • ChromaDB health & collection diagnostics
  • Embedding quality analysis (similarity distributions, cluster density)
  • Retrieval relevance scoring with per-chunk breakdown
  • Pipeline trace with latency at each stage
  • Chunk coverage analysis against corpus
  • Query simulation & comparison

All debug endpoints are gated behind RAG_DEBUG_ENABLED=true (default: false).
"""

import asyncio
import hashlib
import json
import logging
import statistics
import time
from dataclasses import dataclass, field, asdict
from datetime import datetime, timezone
from pathlib import Path
from typing import Any, Optional

import chromadb

from app.core.config import CHROMA_HOST, CHROMA_PORT
from app.services.rag_service import (
    COLLECTION_NAME,
    CORPUS_DIR,
    TOP_K,
    _get_collection,
    _embedding_fn,
)

logger = logging.getLogger(__name__)

# ---------------------------------------------------------------------------
# Configuration
# ---------------------------------------------------------------------------
import os

RAG_DEBUG_ENABLED: bool = os.environ.get("RAG_DEBUG_ENABLED", "false").strip().lower() in {
    "1", "true", "yes", "on",
}

# Maximum number of trace records kept in memory (circular buffer)
_MAX_TRACE_HISTORY = 200


# ---------------------------------------------------------------------------
# Data Structures
# ---------------------------------------------------------------------------

@dataclass
class TimingSpan:
    """A named timing span within a pipeline trace."""
    name: str
    start_ms: float = 0.0
    end_ms: float = 0.0
    duration_ms: float = 0.0
    metadata: dict = field(default_factory=dict)

    def finish(self, end_ms: float):
        self.end_ms = end_ms
        self.duration_ms = round(end_ms - self.start_ms, 3)


@dataclass
class RetrievedChunk:
    """Debug-enriched representation of a single retrieved chunk."""
    chunk_id: str
    content_preview: str  # First 200 chars
    content_length: int
    distance: float  # ChromaDB distance metric
    relevance_score: float  # 1.0 - normalised distance
    source_file: str
    chunk_index: int


@dataclass
class PipelineTrace:
    """Full debug trace of a single RAG pipeline execution."""
    trace_id: str
    timestamp: str
    query: str
    query_language: str
    total_duration_ms: float = 0.0
    spans: list[TimingSpan] = field(default_factory=list)
    retrieved_chunks: list[RetrievedChunk] = field(default_factory=list)
    context_assembled: str = ""
    context_char_count: int = 0
    collection_count_at_query: int = 0
    top_k_used: int = TOP_K
    error: Optional[str] = None
    warnings: list[str] = field(default_factory=list)


@dataclass
class ChromaHealthReport:
    """Diagnostic snapshot of ChromaDB state."""
    reachable: bool
    host: str
    port: int
    heartbeat_ms: float = 0.0
    collection_exists: bool = False
    collection_name: str = COLLECTION_NAME
    document_count: int = 0
    embedding_dimension: Optional[int] = None
    server_version: Optional[str] = None
    error: Optional[str] = None


@dataclass
class CorpusAnalysis:
    """Analysis of the on-disk corpus vs. what's in ChromaDB."""
    corpus_dir: str
    corpus_files: list[dict] = field(default_factory=list)  # {name, size, chunk_count}
    total_corpus_chunks: int = 0
    total_db_documents: int = 0
    coverage_pct: float = 0.0
    missing_from_db: list[str] = field(default_factory=list)
    orphaned_in_db: list[str] = field(default_factory=list)
    chunk_length_stats: dict = field(default_factory=dict)  # min, max, mean, median


@dataclass
class EmbeddingAnalysis:
    """Quality analysis of embeddings in the collection."""
    sample_size: int = 0
    dimension: int = 0
    zero_vector_count: int = 0
    nan_vector_count: int = 0
    magnitude_stats: dict = field(default_factory=dict)  # min, max, mean, std
    self_similarity_stats: dict = field(default_factory=dict)  # avg pairwise distance
    duplicate_content_ids: list[list[str]] = field(default_factory=list)


# ---------------------------------------------------------------------------
# Trace History (in-memory circular buffer)
# ---------------------------------------------------------------------------

_trace_history: list[dict] = []
_trace_lock = asyncio.Lock()


async def _store_trace(trace: PipelineTrace):
    """Store a pipeline trace in the in-memory circular buffer."""
    async with _trace_lock:
        _trace_history.append(asdict(trace))
        if len(_trace_history) > _MAX_TRACE_HISTORY:
            _trace_history.pop(0)


async def get_trace_history(limit: int = 50) -> list[dict]:
    """Return the most recent pipeline traces."""
    async with _trace_lock:
        return list(reversed(_trace_history[-limit:]))


async def clear_trace_history():
    """Clear all stored traces."""
    async with _trace_lock:
        _trace_history.clear()


# ---------------------------------------------------------------------------
# 1. ChromaDB Health Check
# ---------------------------------------------------------------------------

async def check_chroma_health() -> dict:
    """Deep health check of ChromaDB connection and collection state."""

    def _check_sync() -> ChromaHealthReport:
        report = ChromaHealthReport(
            reachable=False,
            host=CHROMA_HOST,
            port=CHROMA_PORT,
        )
        try:
            client = chromadb.HttpClient(host=CHROMA_HOST, port=CHROMA_PORT)

            # Heartbeat
            t0 = time.perf_counter()
            hb = client.heartbeat()
            t1 = time.perf_counter()
            report.reachable = True
            report.heartbeat_ms = round((t1 - t0) * 1000, 2)

            # Server version
            try:
                report.server_version = client.get_version()
            except Exception:
                pass

            # Collection inspection
            try:
                col = client.get_collection(name=COLLECTION_NAME)
                report.collection_exists = True
                report.document_count = col.count()

                # Probe embedding dimension from first record
                if report.document_count > 0:
                    peek = col.peek(limit=1)
                    if peek.get("embeddings") and len(peek["embeddings"]) > 0:
                        report.embedding_dimension = len(peek["embeddings"][0])
            except Exception:
                report.collection_exists = False

        except Exception as exc:
            report.error = f"{type(exc).__name__}: {exc}"

        return report

    report = await asyncio.to_thread(_check_sync)
    return asdict(report)


# ---------------------------------------------------------------------------
# 2. Corpus Analysis
# ---------------------------------------------------------------------------

async def analyze_corpus() -> dict:
    """Compare on-disk corpus files with ChromaDB contents."""

    def _analyze_sync() -> CorpusAnalysis:
        analysis = CorpusAnalysis(corpus_dir=str(CORPUS_DIR))

        if not CORPUS_DIR.exists():
            return analysis

        # Parse corpus files the same way rag_service does
        all_chunk_ids = set()
        chunk_lengths = []
        for corpus_file in sorted(CORPUS_DIR.glob("*.md")):
            text = corpus_file.read_text(encoding="utf-8")
            chunks = [c.strip() for c in text.split("\n\n") if c.strip()]
            file_info = {
                "name": corpus_file.name,
                "size_bytes": corpus_file.stat().st_size,
                "chunk_count": len(chunks),
            }
            analysis.corpus_files.append(file_info)
            for i, chunk in enumerate(chunks):
                doc_id = f"{corpus_file.stem}_{i}"
                all_chunk_ids.add(doc_id)
                chunk_lengths.append(len(chunk))

        analysis.total_corpus_chunks = len(all_chunk_ids)

        if chunk_lengths:
            analysis.chunk_length_stats = {
                "min": min(chunk_lengths),
                "max": max(chunk_lengths),
                "mean": round(statistics.mean(chunk_lengths), 1),
                "median": round(statistics.median(chunk_lengths), 1),
                "stdev": round(statistics.stdev(chunk_lengths), 1) if len(chunk_lengths) > 1 else 0,
            }

        # Compare with DB
        try:
            col = _get_collection()
            db_count = col.count()
            analysis.total_db_documents = db_count

            # Get all IDs from DB
            if db_count > 0:
                result = col.get(limit=db_count)
                db_ids = set(result.get("ids", []))
            else:
                db_ids = set()

            analysis.missing_from_db = sorted(all_chunk_ids - db_ids)
            analysis.orphaned_in_db = sorted(db_ids - all_chunk_ids)

            if analysis.total_corpus_chunks > 0:
                matched = analysis.total_corpus_chunks - len(analysis.missing_from_db)
                analysis.coverage_pct = round(
                    (matched / analysis.total_corpus_chunks) * 100, 1
                )
        except Exception as exc:
            logger.warning("Corpus analysis DB comparison failed: %s", exc)

        return analysis

    result = await asyncio.to_thread(_analyze_sync)
    return asdict(result)


# ---------------------------------------------------------------------------
# 3. Retrieval Debug (query with full introspection)
# ---------------------------------------------------------------------------

async def debug_retrieve(
    query: str,
    top_k: Optional[int] = None,
    include_embeddings: bool = False,
) -> dict:
    """Execute a retrieval query with full debug information.

    Returns chunk details, distances, relevance scores, timing, and
    optional embedding vectors.
    """

    def _retrieve_debug_sync() -> PipelineTrace:
        k = top_k or TOP_K
        trace = PipelineTrace(
            trace_id=hashlib.sha256(
                f"{query}:{time.time()}".encode()
            ).hexdigest()[:12],
            timestamp=datetime.now(timezone.utc).isoformat(),
            query=query,
            query_language="auto",
            top_k_used=k,
        )

        pipeline_start = time.perf_counter()

        # -- Span: Get collection
        span_col = TimingSpan(name="get_collection", start_ms=0)
        try:
            col = _get_collection()
            span_col.finish((time.perf_counter() - pipeline_start) * 1000)
            trace.collection_count_at_query = col.count()
        except Exception as exc:
            span_col.finish((time.perf_counter() - pipeline_start) * 1000)
            span_col.metadata["error"] = str(exc)
            trace.error = f"Collection unavailable: {exc}"
            trace.spans.append(span_col)
            trace.total_duration_ms = span_col.duration_ms
            return trace
        trace.spans.append(span_col)

        if trace.collection_count_at_query == 0:
            trace.warnings.append("Collection is empty — no documents to retrieve")
            trace.total_duration_ms = (time.perf_counter() - pipeline_start) * 1000
            return trace

        effective_k = min(k, trace.collection_count_at_query)

        # -- Span: Query execution
        span_query = TimingSpan(
            name="chromadb_query",
            start_ms=(time.perf_counter() - pipeline_start) * 1000,
        )
        try:
            include_fields = ["documents", "distances", "metadatas"]
            if include_embeddings:
                include_fields.append("embeddings")

            results = col.query(
                query_texts=[query],
                n_results=effective_k,
                include=include_fields,
            )
            span_query.finish((time.perf_counter() - pipeline_start) * 1000)
        except Exception as exc:
            span_query.finish((time.perf_counter() - pipeline_start) * 1000)
            span_query.metadata["error"] = str(exc)
            trace.error = f"Query failed: {exc}"
            trace.spans.append(span_query)
            trace.total_duration_ms = (time.perf_counter() - pipeline_start) * 1000
            return trace
        trace.spans.append(span_query)

        # -- Span: Process results
        span_process = TimingSpan(
            name="process_results",
            start_ms=(time.perf_counter() - pipeline_start) * 1000,
        )

        ids = results.get("ids", [[]])[0]
        docs = results.get("documents", [[]])[0]
        distances = results.get("distances", [[]])[0]
        embeddings_list = results.get("embeddings", [[]])[0] if include_embeddings else []

        # Normalise distances to relevance scores (assuming L2 or cosine)
        max_dist = max(distances) if distances else 1.0
        if max_dist == 0:
            max_dist = 1.0

        for i, (doc_id, doc, dist) in enumerate(zip(ids, docs, distances)):
            # Parse source file and chunk index from ID (format: "{stem}_{index}")
            parts = doc_id.rsplit("_", 1)
            source_file = f"{parts[0]}.md" if len(parts) == 2 else "unknown"
            chunk_idx = int(parts[1]) if len(parts) == 2 and parts[1].isdigit() else -1

            relevance = round(max(0, 1.0 - (dist / (max_dist * 1.5))), 4)

            chunk = RetrievedChunk(
                chunk_id=doc_id,
                content_preview=doc[:200] if doc else "",
                content_length=len(doc) if doc else 0,
                distance=round(dist, 6),
                relevance_score=relevance,
                source_file=source_file,
                chunk_index=chunk_idx,
            )
            trace.retrieved_chunks.append(chunk)

        # Assemble context (same logic as rag_service)
        trace.context_assembled = "\n\n".join(docs) if docs else ""
        trace.context_char_count = len(trace.context_assembled)

        # Quality warnings
        if distances and min(distances) > 1.5:
            trace.warnings.append(
                f"Lowest distance is {min(distances):.3f} — all chunks may be weakly relevant"
            )
        if trace.context_char_count < 50:
            trace.warnings.append("Assembled context is very short (<50 chars)")
        if len(set(doc[:100] for doc in docs if doc)) < len(docs):
            trace.warnings.append("Duplicate or near-duplicate chunks detected in results")

        span_process.finish((time.perf_counter() - pipeline_start) * 1000)
        trace.spans.append(span_process)

        trace.total_duration_ms = round(
            (time.perf_counter() - pipeline_start) * 1000, 3
        )
        return trace

    trace = await asyncio.to_thread(_retrieve_debug_sync)
    await _store_trace(trace)

    result = asdict(trace)
    # Include raw embedding vectors only if requested (can be large)
    if not include_embeddings:
        result.pop("embeddings", None)
    return result


# ---------------------------------------------------------------------------
# 4. Embedding Quality Analysis
# ---------------------------------------------------------------------------

async def analyze_embeddings(sample_size: int = 50) -> dict:
    """Analyse embedding quality: magnitudes, duplicates, zero/NaN vectors."""

    def _analyze_sync() -> EmbeddingAnalysis:
        analysis = EmbeddingAnalysis()
        try:
            col = _get_collection()
            total = col.count()
            if total == 0:
                return analysis

            n = min(sample_size, total)
            analysis.sample_size = n

            result = col.get(
                limit=n,
                include=["embeddings", "documents"],
            )
            embeddings = result.get("embeddings", [])
            documents = result.get("documents", [])
            ids = result.get("ids", [])

            if len(embeddings) == 0:
                return analysis

            analysis.dimension = len(embeddings[0])

            magnitudes = []
            content_hashes: dict[str, list[str]] = {}

            for i, emb in enumerate(embeddings):
                emb_list = list(emb)  # Convert numpy array to list if needed

                # Check for zero vectors
                if all(float(v) == 0.0 for v in emb_list):
                    analysis.zero_vector_count += 1

                # Check for NaN
                if any(float(v) != float(v) for v in emb_list):  # NaN check
                    analysis.nan_vector_count += 1
                    continue

                # Magnitude (L2 norm)
                mag = sum(float(v) ** 2 for v in emb_list) ** 0.5
                magnitudes.append(mag)

                # Content dedup
                if documents and i < len(documents):
                    content_hash = hashlib.md5(
                        (documents[i] or "").encode()
                    ).hexdigest()[:8]
                    content_hashes.setdefault(content_hash, []).append(ids[i])

            if magnitudes:
                analysis.magnitude_stats = {
                    "min": round(min(magnitudes), 6),
                    "max": round(max(magnitudes), 6),
                    "mean": round(statistics.mean(magnitudes), 6),
                    "stdev": round(
                        statistics.stdev(magnitudes), 6
                    ) if len(magnitudes) > 1 else 0,
                }

            # Report duplicate content
            analysis.duplicate_content_ids = [
                group for group in content_hashes.values() if len(group) > 1
            ]

        except Exception as exc:
            logger.warning("Embedding analysis failed: %s", exc)

        return analysis

    result = await asyncio.to_thread(_analyze_sync)
    return asdict(result)


# ---------------------------------------------------------------------------
# 5. Comparative Query Debug (compare N queries side by side)
# ---------------------------------------------------------------------------

async def compare_queries(queries: list[str], top_k: Optional[int] = None) -> dict:
    """Run multiple queries and compare their retrieval results side by side."""
    results = []
    for q in queries[:10]:  # Cap at 10 queries
        trace = await debug_retrieve(q, top_k=top_k, include_embeddings=False)
        results.append({
            "query": q,
            "trace_id": trace["trace_id"],
            "total_duration_ms": trace["total_duration_ms"],
            "chunk_count": len(trace["retrieved_chunks"]),
            "chunks": [
                {
                    "chunk_id": c["chunk_id"],
                    "distance": c["distance"],
                    "relevance_score": c["relevance_score"],
                    "content_preview": c["content_preview"][:120],
                }
                for c in trace["retrieved_chunks"]
            ],
            "warnings": trace["warnings"],
        })

    # Overlap analysis: which chunks appear across multiple queries
    chunk_occurrence: dict[str, list[str]] = {}
    for r in results:
        for c in r["chunks"]:
            chunk_occurrence.setdefault(c["chunk_id"], []).append(r["query"])

    shared_chunks = {
        cid: queries_list
        for cid, queries_list in chunk_occurrence.items()
        if len(queries_list) > 1
    }

    return {
        "query_count": len(results),
        "results": results,
        "shared_chunks": shared_chunks,
        "overlap_analysis": {
            "total_unique_chunks_retrieved": len(chunk_occurrence),
            "chunks_shared_across_queries": len(shared_chunks),
        },
    }


# ---------------------------------------------------------------------------
# 6. End-to-End Pipeline Debug (RAG → LLM → Parse)
# ---------------------------------------------------------------------------

async def debug_full_pipeline(
    symptoms: str,
    lang: str = "el",
    top_k: Optional[int] = None,
) -> dict:
    """Trace the full triage pipeline: RAG retrieval → LLM call → response parse.

    Unlike the production endpoint, this returns full debug data at each stage
    instead of just the final TriageResponse.
    """
    from app.services.llm_service import _invoke_chain_sync, _parse_response, LLMParseError

    pipeline_start = time.perf_counter()
    trace_id = hashlib.sha256(
        f"full:{symptoms}:{time.time()}".encode()
    ).hexdigest()[:12]

    result: dict[str, Any] = {
        "trace_id": trace_id,
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "symptoms": symptoms,
        "lang": lang,
        "stages": {},
        "warnings": [],
        "error": None,
    }

    # Stage 1: RAG Retrieval
    rag_start = time.perf_counter()
    try:
        rag_trace = await debug_retrieve(symptoms, top_k=top_k)
        rag_duration = (time.perf_counter() - rag_start) * 1000
        context = rag_trace.get("context_assembled", "")
        result["stages"]["rag_retrieval"] = {
            "duration_ms": round(rag_duration, 3),
            "chunks_retrieved": len(rag_trace.get("retrieved_chunks", [])),
            "context_length": len(context),
            "chunks": rag_trace.get("retrieved_chunks", []),
            "warnings": rag_trace.get("warnings", []),
        }
        result["warnings"].extend(rag_trace.get("warnings", []))
    except Exception as exc:
        rag_duration = (time.perf_counter() - rag_start) * 1000
        context = ""
        result["stages"]["rag_retrieval"] = {
            "duration_ms": round(rag_duration, 3),
            "error": f"{type(exc).__name__}: {exc}",
        }
        result["warnings"].append("RAG retrieval failed — LLM will use base knowledge only")

    # Stage 2: LLM Invocation
    llm_start = time.perf_counter()
    raw_response = None
    try:
        raw_response = await asyncio.to_thread(
            _invoke_chain_sync, symptoms, context, lang
        )
        llm_duration = (time.perf_counter() - llm_start) * 1000
        result["stages"]["llm_invocation"] = {
            "duration_ms": round(llm_duration, 3),
            "raw_response": raw_response,
            "response_length": len(raw_response) if raw_response else 0,
            "model_used": os.environ.get("NIM_MODEL", "unknown"),
        }
    except Exception as exc:
        llm_duration = (time.perf_counter() - llm_start) * 1000
        result["stages"]["llm_invocation"] = {
            "duration_ms": round(llm_duration, 3),
            "error": f"{type(exc).__name__}: {exc}",
        }
        result["error"] = f"LLM invocation failed: {exc}"
        result["total_duration_ms"] = round(
            (time.perf_counter() - pipeline_start) * 1000, 3
        )
        return result

    # Stage 3: Response Parsing
    parse_start = time.perf_counter()
    try:
        parsed = _parse_response(raw_response, lang)
        parse_duration = (time.perf_counter() - parse_start) * 1000
        result["stages"]["response_parse"] = {
            "duration_ms": round(parse_duration, 3),
            "parsed_result": parsed,
            "parse_success": True,
        }
    except LLMParseError as exc:
        parse_duration = (time.perf_counter() - parse_start) * 1000
        result["stages"]["response_parse"] = {
            "duration_ms": round(parse_duration, 3),
            "error": str(exc),
            "parse_success": False,
            "raw_that_failed": raw_response,
        }
        result["warnings"].append(f"Parse failure: {exc}")

    result["total_duration_ms"] = round(
        (time.perf_counter() - pipeline_start) * 1000, 3
    )
    return result


# ---------------------------------------------------------------------------
# 7. Chunk Inspector — view specific chunks by ID
# ---------------------------------------------------------------------------

async def inspect_chunks(chunk_ids: list[str]) -> dict:
    """Fetch specific chunks from ChromaDB by their IDs and return full details."""

    def _inspect_sync() -> dict:
        try:
            col = _get_collection()
            result = col.get(
                ids=chunk_ids,
                include=["documents", "metadatas", "embeddings"],
            )
            chunks = []
            ids_found = result.get("ids", [])
            docs_result = result.get("documents")
            embs_result = result.get("embeddings")
            metas_result = result.get("metadatas")
            for i, doc_id in enumerate(ids_found):
                doc = docs_result[i] if docs_result is not None and i < len(docs_result) else ""
                emb_raw = embs_result[i] if embs_result is not None and i < len(embs_result) else None
                meta = metas_result[i] if metas_result is not None and i < len(metas_result) else {}
                emb_list = list(emb_raw) if emb_raw is not None else []
                mag = sum(float(v) ** 2 for v in emb_list) ** 0.5 if emb_list else 0
                chunks.append({
                    "id": doc_id,
                    "content": doc,
                    "content_length": len(doc) if doc else 0,
                    "metadata": meta,
                    "embedding_dimension": len(emb_list),
                    "embedding_magnitude": round(mag, 6),
                })
            return {"found": len(chunks), "requested": len(chunk_ids), "chunks": chunks}
        except Exception as exc:
            return {"error": f"{type(exc).__name__}: {exc}", "found": 0, "requested": len(chunk_ids)}

    return await asyncio.to_thread(_inspect_sync)


# ---------------------------------------------------------------------------
# 8. Reseed Corpus (force re-index)
# ---------------------------------------------------------------------------

async def reseed_corpus(force: bool = False) -> dict:
    """Re-seed the ChromaDB corpus. If force=True, deletes existing collection first."""

    def _reseed_sync() -> dict:
        result = {"action": "reseed", "force": force}
        try:
            client = chromadb.HttpClient(host=CHROMA_HOST, port=CHROMA_PORT)
            if force:
                try:
                    client.delete_collection(COLLECTION_NAME)
                    result["deleted_existing"] = True
                except Exception:
                    result["deleted_existing"] = False

            # Reset module-level singletons so _get_collection creates fresh
            import app.services.rag_service as rag_mod
            rag_mod._chroma_client = None

            from app.services.rag_service import _seed_sync
            _seed_sync()

            col = _get_collection()
            result["new_document_count"] = col.count()
            result["success"] = True
        except Exception as exc:
            result["error"] = f"{type(exc).__name__}: {exc}"
            result["success"] = False
        return result

    return await asyncio.to_thread(_reseed_sync)


# ---------------------------------------------------------------------------
# 9. Aggregate Pipeline Stats
# ---------------------------------------------------------------------------

async def get_pipeline_stats() -> dict:
    """Compute aggregate statistics from the trace history."""
    async with _trace_lock:
        traces = list(_trace_history)

    if not traces:
        return {"trace_count": 0, "message": "No traces recorded yet"}

    durations = [t["total_duration_ms"] for t in traces if t.get("total_duration_ms")]
    error_count = sum(1 for t in traces if t.get("error"))
    warning_counts: dict[str, int] = {}
    chunk_distances: list[float] = []

    for t in traces:
        for w in t.get("warnings", []):
            warning_counts[w] = warning_counts.get(w, 0) + 1
        for c in t.get("retrieved_chunks", []):
            if c.get("distance") is not None:
                chunk_distances.append(c["distance"])

    stats = {
        "trace_count": len(traces),
        "error_count": error_count,
        "error_rate_pct": round((error_count / len(traces)) * 100, 1),
        "duration_stats_ms": {
            "min": round(min(durations), 3) if durations else 0,
            "max": round(max(durations), 3) if durations else 0,
            "mean": round(statistics.mean(durations), 3) if durations else 0,
            "median": round(statistics.median(durations), 3) if durations else 0,
            "p95": round(
                sorted(durations)[int(len(durations) * 0.95)] if durations else 0, 3
            ),
        },
        "distance_stats": {
            "min": round(min(chunk_distances), 4) if chunk_distances else 0,
            "max": round(max(chunk_distances), 4) if chunk_distances else 0,
            "mean": round(
                statistics.mean(chunk_distances), 4
            ) if chunk_distances else 0,
        },
        "top_warnings": dict(
            sorted(warning_counts.items(), key=lambda x: -x[1])[:10]
        ),
        "oldest_trace": traces[0]["timestamp"] if traces else None,
        "newest_trace": traces[-1]["timestamp"] if traces else None,
    }
    return stats
