# Architecture — AI Pipeline (Ollama + ChromaDB RAG)

> Generated: 2026-04-18 | Part: `ai-pipeline` | Models: Mistral-7B | Vector store: ChromaDB 1.5.7

---

## Executive Summary

The MedW AI pipeline implements a RAG (Retrieval-Augmented Generation) architecture for Greek medical triage. Patient symptoms (in Greek) are used to retrieve relevant clinical context from a ChromaDB vector store, which is then injected into a structured prompt sent to Mistral-7B (via Ollama). The LLM returns a structured JSON response containing an MTS triage level (1–5), a recommended Greek medical specialty, and a Greek-language reasoning explanation. All inference runs on-premise — no data leaves the host.

---

## Technology Stack

| Component | Technology | Version / Detail |
|---|---|---|
| LLM runtime | Ollama | `ollama/ollama:latest` |
| LLM model | Mistral-7B | `mistral:7b` (default, configurable) |
| LLM integration | LangChain | 1.2.15 (`ChatOllama`) |
| Vector store | ChromaDB | 1.5.7 |
| Embedding model | sentence-transformers | `all-MiniLM-L6-v2` (local, no API) |
| Corpus format | Markdown (`.md`) | 2 documents: MTS guidelines + specialty reference |
| Deployment | Docker services | NVIDIA GPU supported |

---

## Pipeline Architecture

```
Patient symptoms (Greek text)
          │
          ▼
┌─────────────────────────────────┐
│  rag_service.retrieve_context() │
│                                  │
│  1. Embed symptoms              │
│     (all-MiniLM-L6-v2, local)  │
│                                  │
│  2. Query ChromaDB              │
│     collection: clinical_context│
│     top_k: 3                    │
│                                  │
│  3. Return concatenated chunks  │
└──────────────┬──────────────────┘
               │  clinical context string
               ▼
┌─────────────────────────────────┐
│  llm_service.classify()         │
│                                  │
│  Prompt:                        │
│    System: MTS triage assistant │
│    Human:  context + symptoms   │
│                                  │
│  LangChain chain:               │
│    ChatPromptTemplate           │
│    → ChatOllama (Mistral-7B)    │
│    → StrOutputParser            │
│                                  │
│  Response: raw JSON string      │
│  Parser: _extract_json_object() │
│           + field validation    │
└──────────────┬──────────────────┘
               │  { mts_level, mts_label, specialty, reasoning }
               ▼
        triage_service.classify()
        (doctor matching, queue append)
```

---

## LLM Prompt Design

### System Prompt
```
You are a medical triage assistant using the Manchester Triage System (MTS).
Analyse the patient's symptoms using the provided clinical context.
Respond ONLY with a valid JSON object — no explanation, no markdown, no extra text.
```

### Human Template
```
Clinical context:
{context}

Patient symptoms (Greek):
{symptoms}

Return JSON with exactly these fields:
{"mts_level": <integer 1-5>, "mts_label": "<string>",
 "specialty": "<Greek specialty name>", "reasoning": "<explanation in Greek>"}

MTS levels: 1=Immediate, 2=Very Urgent, 3=Urgent, 4=Less Urgent, 5=Non-urgent
specialty must be a Greek medical specialty name (e.g. Καρδιολογία, Νευρολογία, Γενική Ιατρική).
```

**Key design decisions:**
- Temperature `0` — deterministic output for clinical consistency
- JSON-only constraint — eliminates prose wrapping
- Greek specialty names required — ensures compatibility with doctor matching service
- `_extract_json_object()` parser handles prose-wrapped JSON via brace-balanced extraction

---

## MTS Level Mapping

| Level | Label (English) | Label (Greek display) |
|---|---|---|
| 1 | Immediate | Άμεση Αντιμετώπιση |
| 2 | Very Urgent | Πολύ Επείγον |
| 3 | Urgent | Επείγον |
| 4 | Less Urgent | Λιγότερο Επείγον |
| 5 | Non-urgent | Μη Επείγον |

The LLM returns English labels; the frontend maps them to Greek for display in `TriageQueueItem.tsx`.

---

## RAG Corpus

### Documents

| File | Content |
|---|---|
| `data/corpus/mts_guidelines.md` | Manchester Triage System clinical guidelines |
| `data/corpus/specialty_reference.md` | Greek medical specialty reference |

### Seeding Process

On backend startup (`seed_corpus_if_empty()`):
1. Check if ChromaDB collection `clinical_context` is already populated
2. If empty: read all `*.md` files from `data/corpus/`, split by double newline (`\n\n`), add chunks to collection
3. IDs: `{filename_stem}_{chunk_index}` (e.g. `mts_guidelines_0`, `mts_guidelines_1`)

### Retrieval

- Top-3 most similar chunks returned for each query
- Chunks are joined with `\n\n` and injected into the LLM prompt as clinical context
- Embedding: `all-MiniLM-L6-v2` runs locally inside the backend container

---

## ChromaDB Configuration

| Parameter | Value |
|---|---|
| Host | `chromadb` (Docker internal DNS) |
| Port | `8000` |
| Persistence | Docker volume `chroma_data` |
| Collection name | `clinical_context` |
| Embedding function | `SentenceTransformerEmbeddingFunction("all-MiniLM-L6-v2")` |
| Anonymized telemetry | Disabled (`ANONYMIZED_TELEMETRY=FALSE`) |

---

## Ollama Configuration

| Parameter | Value |
|---|---|
| Host | `http://ollama:11434` |
| Default model | `mistral:7b` |
| Model configurable via | `OLLAMA_MODEL` env var |
| Inference timeout | `OLLAMA_TIMEOUT` seconds (default: 30) |
| GPU | NVIDIA GPU via Docker device reservation |
| Model persistence | Docker volume `ollama_data` |
| Model init | `docker/ollama-entrypoint.sh` — pulls model on first run |

---

## Error Handling and Fallback Chain

| Error | Cause | Handling |
|---|---|---|
| `RAGUnavailableError` | ChromaDB unreachable | Continue with LLM (no context) |
| `LLMParseError` | Malformed JSON from model | Propagate to triage service |
| Any other exception | LLM/network failure | Return `_SAFE_DEFAULT` (MTS 3, GP referral) |

---

## Performance Characteristics

| Scenario | Typical Response Time |
|---|---|
| GPU (NVIDIA) + pre-warmed Ollama | 3–8 seconds |
| CPU-only + pre-warmed Ollama | 60–120 seconds |
| Cold start (model not in memory) | +10–30 seconds first request |

**Target:** < 10 seconds on GPU with Ollama pre-warmed (hackathon demo requirement).

---

## Known Limitations and TODOs

1. **Greek language accuracy:** A TODO comment in `llm_service.py` notes that Greek symptom classification accuracy should be validated against ≥20 test cases. If accuracy < 80%, a translation step (symptoms → English before inference) should be evaluated.

2. **Model choice:** Mistral-7B was chosen over BioMistral-7B due to more reliable JSON output and fewer triage inconsistencies (documented in PRD edit history).

3. **Embedding language mismatch:** `all-MiniLM-L6-v2` is trained primarily on English. For Greek corpus retrieval, consider a multilingual model (e.g. `paraphrase-multilingual-MiniLM-L12-v2`) in future iterations.

4. **No fine-tuning:** Constraints: on-premise only, no fine-tuning. All specialization is via prompt engineering and RAG.
