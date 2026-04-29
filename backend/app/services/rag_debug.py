"""
RAG Debug Service — Comprehensive introspection for the Retrieval-Augmented Generation pipeline.

Provides:
  • Milvus health & collection diagnostics
  • Embedding quality analysis (similarity distributions, cluster density)
  • Retrieval relevance scoring with per-chunk breakdown
  • Pipeline trace with latency at each stage
  • Chunk coverage analysis against corpus
  • Query simulation & comparison

All debug endpoints are gated behind RAG_DEBUG_ENABLED=true (default: false).
"""

import asyncio
import hashlib
import logging
import statistics
import time
from dataclasses import dataclass, field, asdict
from datetime import datetime, timezone
from typing import Any, Optional

from app.core.config import MILVUS_URI
from app.services.rag_service import (
    COLLECTION_NAME,
    CORPUS_DIR,
    TOP_K,
    RETRIEVAL_CANDIDATES,
    _get_milvus_client,
    _embed_texts,
    clear_retrieval_cache,
)

logger = logging.getLogger(__name__)

import os

RAG_DEBUG_ENABLED: bool = os.environ.get("RAG_DEBUG_ENABLED", "false").strip().lower() in {
    "1", "true", "yes", "on",
}

_MAX_TRACE_HISTORY = 200


# ---------------------------------------------------------------------------
# Data Structures
# ---------------------------------------------------------------------------

@dataclass
class TimingSpan:
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
    chunk_id: str
    content_preview: str
    content_length: int
    distance: float        # 1 - cosine_similarity (lower = more relevant)
    relevance_score: float  # cosine_similarity (higher = more relevant)
    source_file: str
    chunk_index: int


@dataclass
class PipelineTrace:
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
class MilvusHealthReport:
    reachable: bool
    uri: str
    heartbeat_ms: float = 0.0
    collection_exists: bool = False
    collection_name: str = COLLECTION_NAME
    document_count: int = 0
    embedding_dimension: Optional[int] = None
    server_version: Optional[str] = None
    error: Optional[str] = None


@dataclass
class CorpusAnalysis:
    corpus_dir: str
    corpus_files: list[dict] = field(default_factory=list)
    total_corpus_chunks: int = 0
    total_db_documents: int = 0
    coverage_pct: float = 0.0
    missing_from_db: list[str] = field(default_factory=list)
    orphaned_in_db: list[str] = field(default_factory=list)
    chunk_length_stats: dict = field(default_factory=dict)


@dataclass
class EmbeddingAnalysis:
    sample_size: int = 0
    dimension: int = 0
    zero_vector_count: int = 0
    nan_vector_count: int = 0
    magnitude_stats: dict = field(default_factory=dict)
    self_similarity_stats: dict = field(default_factory=dict)
    duplicate_content_ids: list[list[str]] = field(default_factory=list)


# ---------------------------------------------------------------------------
# Trace History
# ---------------------------------------------------------------------------

_trace_history: list[dict] = []
_trace_lock = asyncio.Lock()


async def _store_trace(trace: PipelineTrace):
    async with _trace_lock:
        _trace_history.append(asdict(trace))
        if len(_trace_history) > _MAX_TRACE_HISTORY:
            _trace_history.pop(0)


async def get_trace_history(limit: int = 50) -> list[dict]:
    async with _trace_lock:
        return list(reversed(_trace_history[-limit:]))


async def clear_trace_history():
    async with _trace_lock:
        _trace_history.clear()


# ---------------------------------------------------------------------------
# 1. Milvus Health Check
# ---------------------------------------------------------------------------

async def check_milvus_health() -> dict:
    """Deep health check of Milvus connection and collection state."""

    def _check_sync() -> MilvusHealthReport:
        report = MilvusHealthReport(reachable=False, uri=MILVUS_URI)
        try:
            t0 = time.perf_counter()
            client = _get_milvus_client()
            # Lightweight probe: list collections
            client.list_collections()
            t1 = time.perf_counter()
            report.reachable = True
            report.heartbeat_ms = round((t1 - t0) * 1000, 2)

            try:
                report.server_version = client.get_server_version()
            except Exception:
                pass

            report.collection_exists = client.has_collection(COLLECTION_NAME)
            if report.collection_exists:
                stats = client.get_collection_stats(COLLECTION_NAME)
                report.document_count = int(stats.get("row_count", 0))

                # Probe embedding dimension from schema
                try:
                    desc = client.describe_collection(COLLECTION_NAME)
                    for f in desc.get("fields", []):
                        if f.get("name") == "embedding":
                            params = f.get("params", {})
                            report.embedding_dimension = params.get("dim")
                            break
                except Exception:
                    pass

        except Exception as exc:
            report.error = f"{type(exc).__name__}: {exc}"

        return report

    report = await asyncio.to_thread(_check_sync)
    return asdict(report)


# ---------------------------------------------------------------------------
# 2. Corpus Analysis
# ---------------------------------------------------------------------------

async def analyze_corpus() -> dict:
    """Compare on-disk corpus files with Milvus collection contents."""

    def _analyze_sync() -> CorpusAnalysis:
        analysis = CorpusAnalysis(corpus_dir=str(CORPUS_DIR))

        if not CORPUS_DIR.exists():
            return analysis

        all_chunk_ids: set[str] = set()
        chunk_lengths: list[int] = []
        for corpus_file in sorted(CORPUS_DIR.glob("*.md")):
            text = corpus_file.read_text(encoding="utf-8")
            chunks = [c.strip() for c in text.split("\n\n") if c.strip()]
            analysis.corpus_files.append({
                "name": corpus_file.name,
                "size_bytes": corpus_file.stat().st_size,
                "chunk_count": len(chunks),
            })
            for i, chunk in enumerate(chunks):
                all_chunk_ids.add(f"{corpus_file.stem}_{i}")
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

        try:
            client = _get_milvus_client()
            if not client.has_collection(COLLECTION_NAME):
                return analysis

            stats = client.get_collection_stats(COLLECTION_NAME)
            db_count = int(stats.get("row_count", 0))
            analysis.total_db_documents = db_count

            if db_count > 0:
                db_results = client.query(
                    collection_name=COLLECTION_NAME,
                    filter="",
                    output_fields=["id"],
                    limit=db_count,
                )
                db_ids = {r["id"] for r in db_results}
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
# 3. Retrieval Debug
# ---------------------------------------------------------------------------

async def debug_retrieve(
    query: str,
    top_k: Optional[int] = None,
    include_embeddings: bool = False,
) -> dict:
    """Execute a retrieval query with full debug information."""

    def _retrieve_debug_sync() -> PipelineTrace:
        k = top_k or TOP_K
        trace = PipelineTrace(
            trace_id=hashlib.sha256(f"{query}:{time.time()}".encode()).hexdigest()[:12],
            timestamp=datetime.now(timezone.utc).isoformat(),
            query=query,
            query_language="auto",
            top_k_used=k,
        )
        pipeline_start = time.perf_counter()

        # -- Span: connect + stats
        span_col = TimingSpan(name="milvus_connect", start_ms=0)
        try:
            client = _get_milvus_client()
            if not client.has_collection(COLLECTION_NAME):
                trace.error = "Collection does not exist"
                span_col.finish((time.perf_counter() - pipeline_start) * 1000)
                trace.spans.append(span_col)
                trace.total_duration_ms = span_col.duration_ms
                return trace
            stats = client.get_collection_stats(COLLECTION_NAME)
            trace.collection_count_at_query = int(stats.get("row_count", 0))
            span_col.finish((time.perf_counter() - pipeline_start) * 1000)
        except Exception as exc:
            span_col.finish((time.perf_counter() - pipeline_start) * 1000)
            span_col.metadata["error"] = str(exc)
            trace.error = f"Milvus unavailable: {exc}"
            trace.spans.append(span_col)
            trace.total_duration_ms = span_col.duration_ms
            return trace
        trace.spans.append(span_col)

        if trace.collection_count_at_query == 0:
            trace.warnings.append("Collection is empty — no documents to retrieve")
            trace.total_duration_ms = (time.perf_counter() - pipeline_start) * 1000
            return trace

        # -- Span: embed query
        span_embed = TimingSpan(
            name="embed_query",
            start_ms=(time.perf_counter() - pipeline_start) * 1000,
        )
        try:
            query_emb = _embed_texts([query], input_type="query")[0]
            span_embed.finish((time.perf_counter() - pipeline_start) * 1000)
            if include_embeddings:
                span_embed.metadata["embedding_dim"] = len(query_emb)
        except Exception as exc:
            span_embed.finish((time.perf_counter() - pipeline_start) * 1000)
            span_embed.metadata["error"] = str(exc)
            trace.error = f"Embedding failed: {exc}"
            trace.spans.append(span_embed)
            trace.total_duration_ms = (time.perf_counter() - pipeline_start) * 1000
            return trace
        trace.spans.append(span_embed)

        # -- Span: vector search
        span_search = TimingSpan(
            name="milvus_search",
            start_ms=(time.perf_counter() - pipeline_start) * 1000,
        )
        effective_k = min(RETRIEVAL_CANDIDATES, trace.collection_count_at_query)
        try:
            output_fields = ["id", "text", "embedding"] if include_embeddings else ["id", "text"]
            results = client.search(
                collection_name=COLLECTION_NAME,
                data=[query_emb],
                limit=effective_k,
                output_fields=output_fields,
            )
            span_search.finish((time.perf_counter() - pipeline_start) * 1000)
        except Exception as exc:
            span_search.finish((time.perf_counter() - pipeline_start) * 1000)
            span_search.metadata["error"] = str(exc)
            trace.error = f"Search failed: {exc}"
            trace.spans.append(span_search)
            trace.total_duration_ms = (time.perf_counter() - pipeline_start) * 1000
            return trace
        trace.spans.append(span_search)

        # -- Span: process results
        span_process = TimingSpan(
            name="process_results",
            start_ms=(time.perf_counter() - pipeline_start) * 1000,
        )

        hits = results[0]
        docs: list[str] = []
        for hit in hits:
            doc_id = hit["id"]
            doc = hit["entity"].get("text", "")
            cosine_sim = float(hit["distance"])  # Milvus COSINE returns similarity
            distance = round(1.0 - cosine_sim, 6)
            relevance = round(max(0.0, cosine_sim), 4)

            parts = doc_id.rsplit("_", 1)
            source_file = f"{parts[0]}.md" if len(parts) == 2 else "unknown"
            chunk_idx = int(parts[1]) if len(parts) == 2 and parts[1].isdigit() else -1

            trace.retrieved_chunks.append(RetrievedChunk(
                chunk_id=doc_id,
                content_preview=doc[:200],
                content_length=len(doc),
                distance=distance,
                relevance_score=relevance,
                source_file=source_file,
                chunk_index=chunk_idx,
            ))
            docs.append(doc)

        trace.context_assembled = "\n\n".join(docs[:k])
        trace.context_char_count = len(trace.context_assembled)

        if hits and float(hits[0]["distance"]) < 0.3:
            trace.warnings.append(
                f"Top result cosine similarity is {float(hits[0]['distance']):.3f} — weak relevance"
            )
        if trace.context_char_count < 50:
            trace.warnings.append("Assembled context is very short (<50 chars)")

        span_process.finish((time.perf_counter() - pipeline_start) * 1000)
        trace.spans.append(span_process)
        trace.total_duration_ms = round((time.perf_counter() - pipeline_start) * 1000, 3)
        return trace

    trace = await asyncio.to_thread(_retrieve_debug_sync)
    await _store_trace(trace)
    return asdict(trace)


# ---------------------------------------------------------------------------
# 4. Embedding Quality Analysis
# ---------------------------------------------------------------------------

async def analyze_embeddings(sample_size: int = 50) -> dict:
    """Analyse embedding quality: magnitudes, duplicates, zero/NaN vectors."""

    def _analyze_sync() -> EmbeddingAnalysis:
        import hashlib as _hashlib
        analysis = EmbeddingAnalysis()
        try:
            client = _get_milvus_client()
            if not client.has_collection(COLLECTION_NAME):
                return analysis

            stats = client.get_collection_stats(COLLECTION_NAME)
            total = int(stats.get("row_count", 0))
            if total == 0:
                return analysis

            n = min(sample_size, total)
            analysis.sample_size = n

            rows = client.query(
                collection_name=COLLECTION_NAME,
                filter="",
                output_fields=["id", "text", "embedding"],
                limit=n,
            )

            if not rows:
                return analysis

            analysis.dimension = len(rows[0].get("embedding", []))

            magnitudes: list[float] = []
            content_hashes: dict[str, list[str]] = {}

            for row in rows:
                emb = row.get("embedding", [])
                doc_id = row.get("id", "")
                text = row.get("text", "")

                if all(float(v) == 0.0 for v in emb):
                    analysis.zero_vector_count += 1

                if any(float(v) != float(v) for v in emb):
                    analysis.nan_vector_count += 1
                    continue

                mag = sum(float(v) ** 2 for v in emb) ** 0.5
                magnitudes.append(mag)

                content_hash = _hashlib.md5(text.encode()).hexdigest()[:8]
                content_hashes.setdefault(content_hash, []).append(doc_id)

            if magnitudes:
                analysis.magnitude_stats = {
                    "min": round(min(magnitudes), 6),
                    "max": round(max(magnitudes), 6),
                    "mean": round(statistics.mean(magnitudes), 6),
                    "stdev": round(statistics.stdev(magnitudes), 6) if len(magnitudes) > 1 else 0,
                }

            analysis.duplicate_content_ids = [
                group for group in content_hashes.values() if len(group) > 1
            ]

        except Exception as exc:
            logger.warning("Embedding analysis failed: %s", exc)

        return analysis

    result = await asyncio.to_thread(_analyze_sync)
    return asdict(result)


# ---------------------------------------------------------------------------
# 5. Comparative Query Debug
# ---------------------------------------------------------------------------

async def compare_queries(queries: list[str], top_k: Optional[int] = None) -> dict:
    """Run multiple queries and compare their retrieval results side by side."""
    results = []
    for q in queries[:10]:
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

    chunk_occurrence: dict[str, list[str]] = {}
    for r in results:
        for c in r["chunks"]:
            chunk_occurrence.setdefault(c["chunk_id"], []).append(r["query"])

    shared_chunks = {
        cid: qs for cid, qs in chunk_occurrence.items() if len(qs) > 1
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
# 6. End-to-End Pipeline Debug
# ---------------------------------------------------------------------------

async def debug_full_pipeline(
    symptoms: str,
    lang: str = "el",
    top_k: Optional[int] = None,
) -> dict:
    """Trace the full triage pipeline: RAG retrieval → LLM call → response parse."""
    from app.services.llm_service import _invoke_chain_sync, _parse_response, LLMParseError

    pipeline_start = time.perf_counter()
    trace_id = hashlib.sha256(f"full:{symptoms}:{time.time()}".encode()).hexdigest()[:12]

    result: dict[str, Any] = {
        "trace_id": trace_id,
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "symptoms": symptoms,
        "lang": lang,
        "stages": {},
        "warnings": [],
        "error": None,
    }

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

    llm_start = time.perf_counter()
    raw_response = None
    try:
        raw_response = await asyncio.to_thread(_invoke_chain_sync, symptoms, context, lang)
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
        result["total_duration_ms"] = round((time.perf_counter() - pipeline_start) * 1000, 3)
        return result

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

    result["total_duration_ms"] = round((time.perf_counter() - pipeline_start) * 1000, 3)
    return result


# ---------------------------------------------------------------------------
# 7. Chunk Inspector
# ---------------------------------------------------------------------------

async def inspect_chunks(chunk_ids: list[str]) -> dict:
    """Fetch specific chunks from Milvus by their IDs."""

    def _inspect_sync() -> dict:
        try:
            client = _get_milvus_client()
            rows = client.get(
                collection_name=COLLECTION_NAME,
                ids=chunk_ids,
                output_fields=["id", "text", "embedding"],
            )
            chunks = []
            for row in rows:
                doc_id = row.get("id", "")
                doc = row.get("text", "")
                emb = row.get("embedding", [])
                mag = sum(float(v) ** 2 for v in emb) ** 0.5 if emb else 0.0
                chunks.append({
                    "id": doc_id,
                    "content": doc,
                    "content_length": len(doc),
                    "embedding_dimension": len(emb),
                    "embedding_magnitude": round(mag, 6),
                })
            return {"found": len(chunks), "requested": len(chunk_ids), "chunks": chunks}
        except Exception as exc:
            return {"error": f"{type(exc).__name__}: {exc}", "found": 0, "requested": len(chunk_ids)}

    return await asyncio.to_thread(_inspect_sync)


# ---------------------------------------------------------------------------
# 8. Reseed Corpus
# ---------------------------------------------------------------------------

async def reseed_corpus(force: bool = False) -> dict:
    """Re-seed the Milvus corpus. If force=True, drops the collection first."""

    def _reseed_sync() -> dict:
        result: dict[str, Any] = {"action": "reseed", "force": force}
        try:
            client = _get_milvus_client()
            if force and client.has_collection(COLLECTION_NAME):
                client.drop_collection(COLLECTION_NAME)
                result["deleted_existing"] = True
            else:
                result["deleted_existing"] = False

            import app.services.rag_service as rag_mod
            rag_mod._milvus_client = None

            from app.services.rag_service import _seed_sync
            _seed_sync()
            clear_retrieval_cache()

            new_client = _get_milvus_client()
            if new_client.has_collection(COLLECTION_NAME):
                stats = new_client.get_collection_stats(COLLECTION_NAME)
                result["new_document_count"] = int(stats.get("row_count", 0))
            else:
                result["new_document_count"] = 0
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

    return {
        "trace_count": len(traces),
        "error_count": error_count,
        "error_rate_pct": round((error_count / len(traces)) * 100, 1),
        "duration_stats_ms": {
            "min": round(min(durations), 3) if durations else 0,
            "max": round(max(durations), 3) if durations else 0,
            "mean": round(statistics.mean(durations), 3) if durations else 0,
            "median": round(statistics.median(durations), 3) if durations else 0,
            "p95": round(sorted(durations)[int(len(durations) * 0.95)], 3) if durations else 0,
        },
        "distance_stats": {
            "min": round(min(chunk_distances), 4) if chunk_distances else 0,
            "max": round(max(chunk_distances), 4) if chunk_distances else 0,
            "mean": round(statistics.mean(chunk_distances), 4) if chunk_distances else 0,
        },
        "top_warnings": dict(sorted(warning_counts.items(), key=lambda x: -x[1])[:10]),
        "oldest_trace": traces[0]["timestamp"] if traces else None,
        "newest_trace": traces[-1]["timestamp"] if traces else None,
    }
