"""
services/code_indexer.py
Vector search for code using a lightweight, pure-Python JSON vector database + Hugging Face / SentenceTransformer.

No C++ compiler or heavy dependencies (like ChromaDB or local PyTorch) are required to run this.
It runs with 0MB RAM footprint in production (Render) using the Hugging Face Serverless Inference API.
"""

import os
import math
import json
import hashlib
from typing import List, Dict, Optional
import httpx

try:
    from sentence_transformers import SentenceTransformer
    ST_AVAILABLE = True
except ImportError:
    ST_AVAILABLE = False

# ── Configuration ──────────────────────────────────────────────
DB_PATH = os.path.join(os.path.dirname(__file__), "..", "data", "vector_store.json")
MIN_SCORE = 0.3   # minimum similarity threshold
TOP_K_DEFAULT = 5

# Embedding model (using a unified model for both local and serverless)
MODEL_NAME = "sentence-transformers/all-MiniLM-L6-v2"

# ── Singleton state ────────────────────────────────────────────
_model = None


def _get_model():
    global _model
    if _model is None and ST_AVAILABLE:
        try:
            _model = SentenceTransformer(MODEL_NAME)
        except Exception:
            _model = None
    return _model


def is_available() -> bool:
    """Check if vector search is fully operational (either local or via Hugging Face fallback)."""
    return ST_AVAILABLE or (os.getenv("HF_TOKEN") is not None)


# ── Database Helpers ───────────────────────────────────────────
import threading
_db_lock = threading.Lock()

def _load_db() -> Dict[str, dict]:
    """Load the JSON vector database from disk."""
    if not os.path.exists(DB_PATH):
        return {}
    try:
        with open(DB_PATH, "r", encoding="utf-8") as f:
            return json.load(f)
    except Exception:
        return {}


def _save_db(db: Dict[str, dict]):
    """Save the JSON vector database to disk."""
    os.makedirs(os.path.dirname(DB_PATH), exist_ok=True)
    try:
        with open(DB_PATH, "w", encoding="utf-8") as f:
            json.dump(db, f, indent=2)
    except Exception:
        pass


# ── Vector Math ────────────────────────────────────────────────

def _dot_product(v1: List[float], v2: List[float]) -> float:
    return sum(x * y for x, y in zip(v1, v2))


def _magnitude(v: List[float]) -> float:
    return math.sqrt(sum(x * x for x in v))


def _cosine_similarity(v1: List[float], v2: List[float]) -> float:
    mag1 = _magnitude(v1)
    mag2 = _magnitude(v2)
    if mag1 == 0.0 or mag2 == 0.0:
        return 0.0
    return _dot_product(v1, v2) / (mag1 * mag2)


# ── Embedding ──────────────────────────────────────────────────

def _embed_huggingface(text: str) -> Optional[List[float]]:
    """Get embeddings from the Hugging Face Serverless Inference API."""
    hf_token = os.getenv("HF_TOKEN")
    if not hf_token:
        return None

    # Using the new Hugging Face router path with explicit pipeline task to force feature extraction
    url = f"https://router.huggingface.co/hf-inference/models/{MODEL_NAME}/pipeline/feature-extraction"
    headers = {"Authorization": f"Bearer {hf_token}"}
    payload = {
        "inputs": text,
        "options": {"wait_for_model": True}
    }

    try:
        response = httpx.post(url, json=payload, headers=headers, timeout=15.0)
        if response.status_code == 200:
            res = response.json()
            if isinstance(res, list):
                if len(res) > 0 and isinstance(res[0], list):
                    return res[0]
                return res
    except Exception:
        pass
    return None


def embed(text: str) -> Optional[List[float]]:
    """Convert text to embedding vector (local or HF serverless fallback)."""
    # 1. Try local SentenceTransformer if available
    model = _get_model()
    if model is not None:
        try:
            return model.encode(text, show_progress_bar=False).tolist()
        except Exception:
            pass

    # 2. Fall back to Hugging Face Serverless Inference API
    return _embed_huggingface(text)


# ── Index a file ───────────────────────────────────────────────

def index_file(filename: str, code: str, language: str) -> Dict:
    """
    Chunk the code, embed each chunk, store in a lightweight JSON database.
    """
    if not is_available():
        return {
            "success": False,
            "message": "Vector search not available. Set HF_TOKEN in environment variables.",
            "chunks_indexed": 0,
        }

    from .code_chunker import chunk_code
    chunks = chunk_code(code, language)

    if not chunks:
        return {"success": True, "chunks_indexed": 0, "message": "No chunks found"}

    with _db_lock:
        db = _load_db()

        # Delete existing chunks for this file
        keys_to_delete = [
            key for key, val in db.items()
            if val.get("metadata", {}).get("filename") == filename
        ]
        for key in keys_to_delete:
            del db[key]

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

            db[chunk_id] = {
                "embedding": embedding,
                "document": chunk["content"],
                "metadata": {
                    "filename": filename,
                    "function_name": chunk["function_name"],
                    "language": language,
                    "start_line": chunk["start_line"],
                    "end_line": chunk["end_line"],
                }
            }
            indexed += 1

        _save_db(db)

    return {
        "success": True,
        "chunks_indexed": indexed,
        "message": f"Indexed {indexed} chunks from {filename}",
    }


# ── Search ─────────────────────────────────────────────────────

def search_code(query: str, language: Optional[str] = None,
                top_k: int = TOP_K_DEFAULT) -> Dict:
    """
    Semantic search across all indexed code using cosine similarity.
    """
    if not is_available():
        return {
            "success": False,
            "results": [],
            "message": "Vector search not available. Configure your HF_TOKEN.",
        }

    query_embedding = embed(query)
    if query_embedding is None:
        return {"success": False, "results": [], "message": "Embedding failed"}

    db = _load_db()
    results = []

    for item in db.values():
        meta = item.get("metadata", {})
        
        # Filter by language if provided
        if language and meta.get("language") != language:
            continue

        similarity = _cosine_similarity(query_embedding, item["embedding"])
        if similarity < MIN_SCORE:
            continue

        results.append({
            "filename": meta.get("filename", "unknown"),
            "function_name": meta.get("function_name", "unknown"),
            "language": meta.get("language", "unknown"),
            "start_line": meta.get("start_line", 1),
            "end_line": meta.get("end_line", 1),
            "code": item.get("document", ""),
            "similarity": round(similarity, 3),
        })

    # Sort by similarity descending
    results.sort(key=lambda x: x["similarity"], reverse=True)
    results = results[:top_k]

    return {
        "success": True,
        "results": results,
        "message": f"Found {len(results)} results",
        "query": query,
    }


def get_status() -> Dict:
    """Return current indexer status for health check."""
    db = _load_db()
    count = len(db)

    using_hf = not ST_AVAILABLE and (os.getenv("HF_TOKEN") is not None)
    model_status = MODEL_NAME
    if ST_AVAILABLE:
        model_status += " (Local)"
    elif using_hf:
        model_status += " (HF Inference API)"
    else:
        model_status = "None"

    return {
        "chroma_available": True,  # Keep true for API compatibility
        "model_available": ST_AVAILABLE or using_hf,
        "model_name": model_status,
        "indexed_chunks": count,
        "operational": is_available(),
    }
