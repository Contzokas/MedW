import pytest
import chromadb
from chromadb import EmbeddingFunction, Documents, Embeddings

from app.services.rag_service import (
    COLLECTION_NAME,
    CORPUS_DIR,
    RAGUnavailableError,
    _get_collection,
    _retrieve_sync,
    _seed_sync,
    retrieve_context,
    seed_corpus_if_empty,
)


class _DummyEmbeddingFn(EmbeddingFunction):
    """Zero-vector embeddings for unit tests — no sentence_transformers needed."""
    def __init__(self) -> None:
        pass

    def name(self) -> str:
        return "dummy"

    def __call__(self, input: Documents) -> Embeddings:
        return [[0.0] * 384 for _ in input]


@pytest.fixture
def in_memory_chroma(monkeypatch):
    """Replace HttpClient with in-memory ChromaDB client for unit tests."""
    client = chromadb.EphemeralClient()  # in-memory client for unit tests

    def fake_get_collection():
        return client.get_or_create_collection(
            name=COLLECTION_NAME,
            embedding_function=_DummyEmbeddingFn(),
        )

    monkeypatch.setattr("app.services.rag_service._get_collection", fake_get_collection)
    return client


async def test_retrieve_context_returns_nonempty_string_after_seeding(in_memory_chroma):
    await seed_corpus_if_empty()
    result = await retrieve_context("πόνος στο στήθος")
    assert isinstance(result, str)
    assert len(result) > 0


def test_seed_is_idempotent(in_memory_chroma):
    _seed_sync()
    count_after_first = in_memory_chroma.get_collection(COLLECTION_NAME).count()
    _seed_sync()  # second call — should be a no-op
    count_after_second = in_memory_chroma.get_collection(COLLECTION_NAME).count()
    assert count_after_first == count_after_second


async def test_retrieve_context_raises_rag_unavailable_error_on_connection_failure(monkeypatch):
    def raise_error():
        raise ConnectionError("ChromaDB unreachable")

    monkeypatch.setattr("app.services.rag_service._get_collection", raise_error)
    with pytest.raises(RAGUnavailableError):
        await retrieve_context("πόνος στο στήθος")
