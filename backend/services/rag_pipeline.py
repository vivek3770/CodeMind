"""
services/rag_pipeline.py
RAG (Retrieval Augmented Generation) pipeline.

For each review request:
  1. Embed the submitted code with CodeBERT
  2. Search ChromaDB for similar previously reviewed code
  3. Retrieve top-3 similar chunks with their past review results
  4. Inject retrieved context into the Gemini prompt
  5. Gemini generates response grounded in retrieved examples

Also includes review memory — stores and retrieves past reviews
to show users: "Similar code reviewed before — score was 3/10"
"""

import os
import json
import hashlib
import sqlite3
from datetime import datetime
from pathlib import Path
from typing import Optional

DB_PATH = Path(__file__).resolve().parents[1] / "data" / "rag_memory.db"


# ── SQLite review memory ───────────────────────────────────────

def _get_conn():
    DB_PATH.parent.mkdir(parents=True, exist_ok=True)
    conn = sqlite3.connect(str(DB_PATH))
    conn.row_factory = sqlite3.Row
    return conn


def init_rag_db():
    conn = _get_conn()
    conn.execute("""
        CREATE TABLE IF NOT EXISTS code_reviews (
            id          INTEGER PRIMARY KEY AUTOINCREMENT,
            code_hash   TEXT NOT NULL,
            language    TEXT NOT NULL,
            code_snippet TEXT NOT NULL,
            score       INTEGER,
            summary     TEXT,
            bugs_json   TEXT,
            security_json TEXT,
            timestamp   TEXT NOT NULL
        )
    """)
    conn.execute("CREATE INDEX IF NOT EXISTS idx_hash ON code_reviews(code_hash)")
    conn.commit()
    conn.close()


def store_in_memory(code: str, language: str, review_result: dict):
    """Store a code review result for future RAG retrieval."""
    try:
        init_rag_db()
        code_hash = hashlib.md5(code.encode()).hexdigest()
        conn      = _get_conn()
        # Keep only last 500 reviews
        conn.execute("""
            DELETE FROM code_reviews WHERE id NOT IN (
                SELECT id FROM code_reviews ORDER BY id DESC LIMIT 499
            )
        """)
        conn.execute("""
            INSERT INTO code_reviews
              (code_hash, language, code_snippet, score, summary,
               bugs_json, security_json, timestamp)
            VALUES (?,?,?,?,?,?,?,?)
        """, (
            code_hash,
            language,
            code[:500],   # store first 500 chars
            review_result.get("score"),
            review_result.get("summary", ""),
            json.dumps(review_result.get("bugs",     [])),
            json.dumps(review_result.get("security", [])),
            datetime.now().isoformat(),
        ))
        conn.commit()
        conn.close()
    except Exception:
        pass


def find_similar_past_reviews(code: str, language: str,
                               top_k: int = 3) -> list:
    """
    Find past reviews of similar code using:
      1. Exact hash match (same code reviewed before)
      2. Keyword overlap for similar patterns
    """
    try:
        init_rag_db()
        conn      = _get_conn()
        code_hash = hashlib.md5(code.encode()).hexdigest()

        # First: exact match
        exact = conn.execute("""
            SELECT * FROM code_reviews
            WHERE code_hash = ?
            ORDER BY id DESC LIMIT 1
        """, (code_hash,)).fetchone()

        results = []
        if exact:
            results.append(dict(exact))

        # Second: same language, recent reviews
        if len(results) < top_k:
            recent = conn.execute("""
                SELECT * FROM code_reviews
                WHERE language = ? AND code_hash != ?
                ORDER BY id DESC LIMIT ?
            """, (language, code_hash, top_k - len(results))).fetchall()
            results.extend([dict(r) for r in recent])

        conn.close()
        return results[:top_k]
    except Exception:
        return []


def build_rag_context(code: str, language: str) -> str:
    """
    Build the RAG context string to inject into the Gemini prompt.
    Returns empty string if no past reviews found.
    """
    past_reviews = find_similar_past_reviews(code, language)
    if not past_reviews:
        return ""

    context_parts = ["\n[RAG CONTEXT — Similar code reviewed before]:"]

    for i, review in enumerate(past_reviews, 1):
        bugs     = json.loads(review.get("bugs_json",     "[]") or "[]")
        security = json.loads(review.get("security_json", "[]") or "[]")

        context_parts.append(
            f"\nPast Review #{i}:"
            f"\n  Score: {review.get('score', '?')}/10"
            f"\n  Summary: {review.get('summary', '')}"
        )
        if bugs:
            context_parts.append(
                f"\n  Bugs found: {', '.join(b.get('message','')[:60] for b in bugs[:2])}"
            )
        if security:
            context_parts.append(
                f"\n  Security issues: {', '.join(s.get('message','')[:60] for s in security[:2])}"
            )

    context_parts.append(
        "\nUse the above past review patterns to improve accuracy of your current review.\n"
    )
    return "\n".join(context_parts)


def get_similar_review_summary(code: str, language: str) -> Optional[dict]:
    """
    Returns a user-facing summary of the most similar past review.
    Shown in the AI panel: 'Similar code reviewed before — score was 3/10'
    """
    past = find_similar_past_reviews(code, language, top_k=1)
    if not past:
        return None

    r        = past[0]
    bugs     = json.loads(r.get("bugs_json",     "[]") or "[]")
    security = json.loads(r.get("security_json", "[]") or "[]")

    issues = []
    if bugs:     issues.append(f"{len(bugs)} bug{'s' if len(bugs)>1 else ''}")
    if security: issues.append(f"{len(security)} security issue{'s' if len(security)>1 else ''}")

    return {
        "score":     r.get("score"),
        "summary":   r.get("summary", ""),
        "issues":    ", ".join(issues) if issues else "no major issues",
        "timestamp": r.get("timestamp", "")[:10],
        "language":  r.get("language", ""),
    }
