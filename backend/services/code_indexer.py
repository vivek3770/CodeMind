"""
services/code_indexer.py
Vector search for code using ChromaDB + sentence-transformers.

Flow:
  1. When a file is opened/saved → POST /api/index
  2. Code is chunked by function
  3. Each chunk is embedded with a code-aware model
  4. Stored in ChromaDB with metadata

  5. User types query → POST /api/search
  6. Query embedded → ChromaDB similarity search
  7. Returns ranked code chunks
"""

import os
import hashlib
from typing import List, Dict, Optional

# ── Optional imports — graceful degradation ────────────────────
try:
    import chromadb
    from chromadb.config import Settings
    CHROMA_AVAILABLE = True
except ImportError:
    CHROMA_AVAILABLE = False

try:
    from sentence_transformers import SentenceTransformer
    ST_AVAILABLE = True
except ImportError:
    ST_AVAILABLE = False

from .code_chunker import chunk_code

# ── Configuration ──────────────────────────────────────────────
CHROMA_PATH   = os.path.join(os.path.dirname(__file__), "..", "data", "chroma_db")
COLLECTION    = "code_knowledge"
MIN_SCORE     = 0.3   # minimum similarity threshold
TOP_K_DEFAULT = 5

# Code-aware embedding model (falls back to smaller model if unavailable)
MODEL_NAME = "microsoft/codebert-base"
FALLBACK_MODEL = "all-MiniLM-L6-v2"  # smaller, faster, less accurate

# ── Singleton state ────────────────────────────────────────────
_client     = None
_collection = None
_model      = None


def _get_model():
    global _model
    if _model is None and ST_AVAILABLE:
        try:
            _model = SentenceTransformer(MODEL_NAME)
        except Exception:
            try:
                _model = SentenceTransformer(FALLBACK_MODEL)
            except Exception:
                _model = None
    return _model


def _get_collection():
    global _client, _collection
    if not CHROMA_AVAILABLE:
        return None
    if _collection is None:
        os.makedirs(CHROMA_PATH, exist_ok=True)
        _client = chromadb.PersistentClient(path=CHROMA_PATH)
        _collection = _client.get_or_create_collection(
            name=COLLECTION,
            metadata={"hnsw:space": "cosine"}
        )
    return _collection


def is_available() -> bool:
    """Check if vector search is fully operational."""
    return CHROMA_AVAILABLE and ST_AVAILABLE


# ── Embedding ──────────────────────────────────────────────────

def embed(text: str) -> Optional[List[float]]:
    """Convert text to embedding vector."""
    model = _get_model()
    if model is None:
        return None
    try:
        return model.encode(text, show_progress_bar=False).tolist()
    except Exception:
        return None


# ── Index a file ───────────────────────────────────────────────

def index_file(filename: str, code: str, language: str) -> Dict:
    """
    Chunk the code, embed each chunk, store in ChromaDB.
    Returns a summary of what was indexed.
    """
    if not is_available():
        return {
            "success": False,
            "message": "Vector search not available. Install chromadb and sentence-transformers.",
            "chunks_indexed": 0,
        }

    collection = _get_collection()
    chunks     = chunk_code(code, language)

    if not chunks:
        return {"success": True, "chunks_indexed": 0, "message": "No chunks found"}

    # Delete existing chunks for this file before re-indexing
    try:
        existing = collection.get(where={"filename": filename})
        if existing["ids"]:
            collection.delete(ids=existing["ids"])
    except Exception:
        pass

    # Index each chunk
    indexed = 0
    for chunk in chunks:
        if not chunk["content"].strip():
            continue

        embedding = embed(chunk["content"])
        if embedding is None:
            continue

        chunk_id = hashlib.md5(
            f"{filename}:{chunk['start_line']}:{chunk['content'][:50]}".encode()
        ).hexdigest()

        try:
            collection.add(
                ids=[chunk_id],
                embeddings=[embedding],
                documents=[chunk["content"]],
                metadatas=[{
                    "filename":      filename,
                    "function_name": chunk["function_name"],
                    "language":      language,
                    "start_line":    chunk["start_line"],
                    "end_line":      chunk["end_line"],
                }]
            )
            indexed += 1
        except Exception:
            pass

    return {
        "success":        True,
        "chunks_indexed": indexed,
        "message":        f"Indexed {indexed} chunks from {filename}",
    }


# ── Search ─────────────────────────────────────────────────────

def search_code(query: str, language: Optional[str] = None,
                top_k: int = TOP_K_DEFAULT) -> Dict:
    """
    Semantic search across all indexed code.
    Returns ranked results with file, function, lines, code snippet.
    """
    if not is_available():
        return {
            "success": False,
            "results": [],
            "message": "Vector search not available. Run: pip install chromadb sentence-transformers",
        }

    collection = _get_collection()

    query_embedding = embed(query)
    if query_embedding is None:
        return {"success": False, "results": [], "message": "Embedding failed"}

    try:
        where = {"language": language} if language else None
        raw = collection.query(
            query_embeddings=[query_embedding],
            n_results=min(top_k, 10),
            where=where,
            include=["documents", "metadatas", "distances"]
        )
    except Exception as e:
        return {"success": False, "results": [], "message": str(e)}

    results = []
    docs      = raw.get("documents",  [[]])[0]
    metas     = raw.get("metadatas",  [[]])[0]
    distances = raw.get("distances",  [[]])[0]

    for doc, meta, dist in zip(docs, metas, distances):
        # ChromaDB cosine distance: 0=identical, 2=opposite
        # Convert to similarity score 0–1
        similarity = max(0.0, 1.0 - dist / 2.0)
        if similarity < MIN_SCORE:
            continue

        results.append({
            "filename":      meta.get("filename",      "unknown"),
            "function_name": meta.get("function_name", "unknown"),
            "language":      meta.get("language",      "unknown"),
            "start_line":    meta.get("start_line",    1),
            "end_line":      meta.get("end_line",      1),
            "code":          doc,
            "similarity":    round(similarity, 3),
        })

    # Sort by similarity descending
    results.sort(key=lambda x: x["similarity"], reverse=True)

    return {
        "success": True,
        "results": results,
        "message": f"Found {len(results)} results",
        "query":   query,
    }


def get_status() -> Dict:
    """Return current indexer status for health check."""
    collection = _get_collection() if CHROMA_AVAILABLE else None
    count = 0
    if collection:
        try:
            count = collection.count()
        except Exception:
            pass
    return {
        "chroma_available":  CHROMA_AVAILABLE,
        "model_available":   ST_AVAILABLE,
        "model_name":        MODEL_NAME if ST_AVAILABLE else None,
        "indexed_chunks":    count,
        "operational":       is_available(),
    }
