import asyncio
import logging
from pathlib import Path

import chromadb
from chromadb.utils.embedding_functions import SentenceTransformerEmbeddingFunction

from app.core.config import CHROMA_HOST, CHROMA_PORT

logger = logging.getLogger(__name__)

COLLECTION_NAME = "clinical_context"
CORPUS_DIR = Path(__file__).parent.parent.parent / "data" / "corpus"
TOP_K = 3


class RAGUnavailableError(Exception):
    pass


def _get_collection():
    client = chromadb.HttpClient(host=CHROMA_HOST, port=CHROMA_PORT)
    embedding_fn = SentenceTransformerEmbeddingFunction(model_name="all-MiniLM-L6-v2")
    return client.get_or_create_collection(
        name=COLLECTION_NAME,
        embedding_function=embedding_fn,
    )


def _seed_sync() -> None:
    if not CORPUS_DIR.exists():
        logger.warning("Corpus directory '%s' not found — skipping seeding.", CORPUS_DIR)
        return
    collection = _get_collection()
    if collection.count() > 0:
        logger.info("ChromaDB collection '%s' already seeded, skipping.", COLLECTION_NAME)
        return

    documents = []
    ids = []
    for corpus_file in sorted(CORPUS_DIR.glob("*.md")):
        text = corpus_file.read_text(encoding="utf-8")
        chunks = [c.strip() for c in text.split("\n\n") if c.strip()]
        for i, chunk in enumerate(chunks):
            doc_id = f"{corpus_file.stem}_{i}"
            documents.append(chunk)
            ids.append(doc_id)

    if documents:
        collection.add(documents=documents, ids=ids)
        logger.info("Seeded ChromaDB collection '%s' with %d chunks.", COLLECTION_NAME, len(documents))


def _retrieve_sync(symptoms: str) -> str:
    collection = _get_collection()
    n = min(TOP_K, collection.count())
    if n == 0:
        return ""
    results = collection.query(query_texts=[symptoms], n_results=n)
    docs = results.get("documents", [[]])[0]
    return "\n\n".join(docs) if docs else ""


async def seed_corpus_if_empty() -> None:
    try:
        await asyncio.to_thread(_seed_sync)
    except Exception as exc:
        logger.error("ChromaDB corpus seeding failed: %s", exc, exc_info=True)


async def retrieve_context(symptoms: str) -> str:
    try:
        return await asyncio.to_thread(_retrieve_sync, symptoms)
    except Exception as exc:
        logger.error("ChromaDB retrieval failed: %s", exc, exc_info=True)
        raise RAGUnavailableError(f"ChromaDB unavailable: {exc}") from exc
