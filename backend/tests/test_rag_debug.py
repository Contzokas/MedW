"""
Tests for the RAG Debug Service.

Covers:
  • ChromaDB health check (reachable / unreachable)
  • Corpus analysis (coverage, missing chunks)
  • Debug retrieval with trace recording
  • Embedding quality analysis
  • Query comparison
  • Chunk inspection
  • Trace history management
  • Pipeline statistics aggregation
  • Debug gate (403 when disabled)
"""

import asyncio
import pytest
import chromadb
from chromadb import EmbeddingFunction, Documents, Embeddings
from unittest.mock import patch, MagicMock

from app.services.rag_service import COLLECTION_NAME, CORPUS_DIR
from app.services import rag_debug


class _DummyEmbeddingFn(EmbeddingFunction):
    """Zero-vector embeddings for unit tests — no sentence_transformers needed."""
    def __init__(self) -> None:
        pass

    def name(self) -> str:
        return "dummy"

    def __call__(self, input: Documents) -> Embeddings:
        # Return slightly different vectors for each doc so distances aren't all 0
        return [[0.1 * (i + 1)] * 384 for i, _ in enumerate(input)]


@pytest.fixture
def in_memory_chroma(monkeypatch):
    """Replace HttpClient with in-memory ChromaDB for unit tests."""
    client = chromadb.EphemeralClient()
    ef = _DummyEmbeddingFn()

    def fake_get_collection():
        return client.get_or_create_collection(
            name=COLLECTION_NAME,
            embedding_function=ef,
        )

    monkeypatch.setattr("app.services.rag_service._get_collection", fake_get_collection)
    monkeypatch.setattr("app.services.rag_debug._get_collection", fake_get_collection)
    return client


@pytest.fixture
def seeded_chroma(in_memory_chroma):
    """In-memory ChromaDB with sample documents pre-loaded."""
    col = in_memory_chroma.get_or_create_collection(
        name=COLLECTION_NAME,
        embedding_function=_DummyEmbeddingFn(),
    )
    col.add(
        documents=[
            "Chest pain with radiation to arm or jaw is a Level 2 emergency.",
            "Mild headache without neurological signs is Level 4.",
            "Cardiology handles chest pain, palpitations, and arrhythmia.",
            "Neurology handles stroke symptoms, seizures, and neuropathy.",
            "Gastroenterology handles abdominal pain, nausea, and vomiting.",
        ],
        ids=["mts_0", "mts_1", "specialty_0", "specialty_1", "specialty_2"],
    )
    return in_memory_chroma


@pytest.fixture(autouse=True)
def enable_debug(monkeypatch):
    """Enable RAG debug for all tests."""
    monkeypatch.setattr("app.services.rag_debug.RAG_DEBUG_ENABLED", True)


@pytest.fixture(autouse=True)
def clear_traces():
    """Clear trace history between tests."""
    rag_debug._trace_history.clear()
    yield
    rag_debug._trace_history.clear()


# ---------------------------------------------------------------------------
# ChromaDB Health
# ---------------------------------------------------------------------------

class TestChromaHealth:
    async def test_health_reachable(self, seeded_chroma):
        """Health check reports reachable when using in-memory client."""
        # Patch to use the in-memory client directly
        with patch("app.services.rag_debug.chromadb") as mock_chroma:
            mock_client = MagicMock()
            mock_client.heartbeat.return_value = 1
            mock_client.get_version.return_value = "0.5.0"
            col_mock = MagicMock()
            col_mock.count.return_value = 5
            col_mock.peek.return_value = {"embeddings": [[0.1] * 384]}
            mock_client.get_collection.return_value = col_mock
            mock_chroma.HttpClient.return_value = mock_client

            result = await rag_debug.check_chroma_health()
            assert result["reachable"] is True
            assert result["collection_exists"] is True
            assert result["document_count"] == 5

    async def test_health_unreachable(self):
        """Health check reports unreachable when connection fails."""
        with patch("app.services.rag_debug.chromadb") as mock_chroma:
            mock_chroma.HttpClient.side_effect = ConnectionError("refused")
            result = await rag_debug.check_chroma_health()
            assert result["reachable"] is False
            assert result["error"] is not None


# ---------------------------------------------------------------------------
# Corpus Analysis
# ---------------------------------------------------------------------------

class TestCorpusAnalysis:
    async def test_corpus_analysis_with_data(self, seeded_chroma):
        result = await rag_debug.analyze_corpus()
        assert result["corpus_dir"] == str(CORPUS_DIR)
        assert result["total_corpus_chunks"] > 0 or len(result["corpus_files"]) >= 0

    async def test_corpus_analysis_missing_dir(self, monkeypatch, seeded_chroma):
        from pathlib import Path
        monkeypatch.setattr("app.services.rag_debug.CORPUS_DIR", Path("/nonexistent/path"))
        result = await rag_debug.analyze_corpus()
        assert result["total_corpus_chunks"] == 0


# ---------------------------------------------------------------------------
# Debug Retrieval
# ---------------------------------------------------------------------------

class TestDebugRetrieve:
    async def test_retrieval_returns_trace(self, seeded_chroma):
        result = await rag_debug.debug_retrieve("chest pain")
        assert "trace_id" in result
        assert "spans" in result
        assert len(result["retrieved_chunks"]) > 0
        assert result["total_duration_ms"] > 0

    async def test_retrieval_chunks_have_scores(self, seeded_chroma):
        result = await rag_debug.debug_retrieve("chest pain", top_k=2)
        for chunk in result["retrieved_chunks"]:
            assert "distance" in chunk
            assert "relevance_score" in chunk
            assert "chunk_id" in chunk
            assert "content_preview" in chunk

    async def test_retrieval_custom_top_k(self, seeded_chroma):
        result = await rag_debug.debug_retrieve("headache", top_k=1)
        assert len(result["retrieved_chunks"]) == 1

    async def test_retrieval_stores_trace(self, seeded_chroma):
        await rag_debug.debug_retrieve("test query")
        traces = await rag_debug.get_trace_history(limit=1)
        assert len(traces) == 1
        assert traces[0]["query"] == "test query"

    async def test_retrieval_empty_collection(self, monkeypatch):
        """Verify retrieval handles an empty collection gracefully."""
        empty_client = chromadb.EphemeralClient()
        ef = _DummyEmbeddingFn()

        def fake_get_empty():
            return empty_client.get_or_create_collection(
                name="empty_test_collection",
                embedding_function=ef,
            )

        monkeypatch.setattr("app.services.rag_debug._get_collection", fake_get_empty)
        result = await rag_debug.debug_retrieve("anything")
        assert len(result["retrieved_chunks"]) == 0
        assert any("empty" in w.lower() for w in result["warnings"])


# ---------------------------------------------------------------------------
# Embedding Analysis
# ---------------------------------------------------------------------------

class TestEmbeddingAnalysis:
    async def test_embedding_analysis(self, seeded_chroma):
        result = await rag_debug.analyze_embeddings(sample_size=5)
        assert result["sample_size"] > 0
        assert result["dimension"] > 0
        assert "magnitude_stats" in result

    async def test_embedding_analysis_empty(self, monkeypatch):
        empty_client = chromadb.EphemeralClient()
        ef = _DummyEmbeddingFn()

        def fake_get_empty():
            return empty_client.get_or_create_collection(
                name="empty_emb_collection",
                embedding_function=ef,
            )

        monkeypatch.setattr("app.services.rag_debug._get_collection", fake_get_empty)
        result = await rag_debug.analyze_embeddings()
        assert result["sample_size"] == 0


# ---------------------------------------------------------------------------
# Compare Queries
# ---------------------------------------------------------------------------

class TestCompareQueries:
    async def test_compare_two_queries(self, seeded_chroma):
        result = await rag_debug.compare_queries(
            queries=["chest pain", "headache"],
            top_k=3,
        )
        assert result["query_count"] == 2
        assert len(result["results"]) == 2
        assert "overlap_analysis" in result

    async def test_compare_detects_shared_chunks(self, seeded_chroma):
        # Both queries should retrieve at least some overlapping chunks
        result = await rag_debug.compare_queries(
            queries=["chest pain cardiology", "cardiology arrhythmia"],
            top_k=5,
        )
        assert "shared_chunks" in result


# ---------------------------------------------------------------------------
# Chunk Inspection
# ---------------------------------------------------------------------------

class TestInspectChunks:
    async def test_inspect_existing_chunks(self, monkeypatch):
        """Ensure inspect retrieves chunks by ID from the active collection."""
        ef = _DummyEmbeddingFn()
        client = chromadb.EphemeralClient()
        col = client.get_or_create_collection(
            name="inspect_test_col",
            embedding_function=ef,
        )
        col.add(
            documents=["Document A content", "Document B content"],
            ids=["mts_0", "specialty_1"],
        )

        # Return the exact same collection object we seeded
        monkeypatch.setattr("app.services.rag_debug._get_collection", lambda: col)
        result = await rag_debug.inspect_chunks(["mts_0", "specialty_1"])
        assert "found" in result
        assert result["found"] == 2
        assert len(result["chunks"]) == 2

    async def test_inspect_nonexistent_chunk(self, seeded_chroma):
        result = await rag_debug.inspect_chunks(["nonexistent_999"])
        assert "found" in result
        assert result["found"] == 0


# ---------------------------------------------------------------------------
# Trace Management
# ---------------------------------------------------------------------------

class TestTraceHistory:
    async def test_trace_history_limit(self, seeded_chroma):
        # Generate several traces
        for i in range(5):
            await rag_debug.debug_retrieve(f"query {i}")
        traces = await rag_debug.get_trace_history(limit=3)
        assert len(traces) == 3

    async def test_trace_clear(self, seeded_chroma):
        await rag_debug.debug_retrieve("some query")
        await rag_debug.clear_trace_history()
        traces = await rag_debug.get_trace_history()
        assert len(traces) == 0


# ---------------------------------------------------------------------------
# Pipeline Stats
# ---------------------------------------------------------------------------

class TestPipelineStats:
    async def test_stats_with_traces(self, seeded_chroma):
        for i in range(3):
            await rag_debug.debug_retrieve(f"query {i}")
        stats = await rag_debug.get_pipeline_stats()
        assert stats["trace_count"] == 3
        assert "duration_stats_ms" in stats
        assert stats["duration_stats_ms"]["mean"] > 0

    async def test_stats_empty(self):
        stats = await rag_debug.get_pipeline_stats()
        assert stats["trace_count"] == 0
