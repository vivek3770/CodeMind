"""
services/review_history.py
Stores every code review result in SQLite for history tracking.

Schema:
  reviews(id, filename, language, score, bug_count, security_count,
          performance_count, readability_count, summary, timestamp)
"""

import os
import sqlite3
import json
from datetime import datetime
from typing import List, Dict, Optional

DB_PATH = os.path.join(os.path.dirname(__file__), "..", "data", "reviews.db")


def _get_conn() -> sqlite3.Connection:
    os.makedirs(os.path.dirname(DB_PATH), exist_ok=True)
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    return conn


def init_db():
    """Create table if it doesn't exist."""
    conn = _get_conn()
    conn.execute("""
        CREATE TABLE IF NOT EXISTS reviews (
            id               INTEGER PRIMARY KEY AUTOINCREMENT,
            filename         TEXT    NOT NULL,
            language         TEXT    NOT NULL DEFAULT 'python',
            score            INTEGER NOT NULL,
            bug_count        INTEGER NOT NULL DEFAULT 0,
            security_count   INTEGER NOT NULL DEFAULT 0,
            performance_count INTEGER NOT NULL DEFAULT 0,
            readability_count INTEGER NOT NULL DEFAULT 0,
            summary          TEXT,
            bugs_json        TEXT,
            security_json    TEXT,
            performance_json TEXT,
            readability_json TEXT,
            timestamp        TEXT    NOT NULL
        )
    """)
    conn.commit()
    conn.close()


def save_review(filename: str, language: str, review_result: dict) -> int:
    """
    Persist a review result. Returns the new row id.
    """
    init_db()
    conn = _get_conn()
    cur  = conn.execute("""
        INSERT INTO reviews
          (filename, language, score,
           bug_count, security_count, performance_count, readability_count,
           summary,
           bugs_json, security_json, performance_json, readability_json,
           timestamp)
        VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?)
    """, (
        filename,
        language,
        review_result.get("score", 0),
        len(review_result.get("bugs",        [])),
        len(review_result.get("security",     [])),
        len(review_result.get("performance",  [])),
        len(review_result.get("readability",  [])),
        review_result.get("summary", ""),
        json.dumps(review_result.get("bugs",        [])),
        json.dumps(review_result.get("security",     [])),
        json.dumps(review_result.get("performance",  [])),
        json.dumps(review_result.get("readability",  [])),
        datetime.now().isoformat(),
    ))
    conn.commit()
    row_id = cur.lastrowid
    conn.close()
    return row_id


def get_all_reviews(limit: int = 100) -> List[Dict]:
    """Return all reviews ordered by newest first."""
    init_db()
    conn = _get_conn()
    rows = conn.execute("""
        SELECT id, filename, language, score,
               bug_count, security_count, performance_count, readability_count,
               summary, timestamp
        FROM reviews
        ORDER BY id DESC
        LIMIT ?
    """, (limit,)).fetchall()
    conn.close()
    return [dict(r) for r in rows]


def get_stats() -> Dict:
    """
    Aggregate stats across all reviews:
      - total reviews
      - average score
      - score trend (last 10)
      - most common issue type
      - per-file averages
    """
    init_db()
    conn = _get_conn()

    total = conn.execute("SELECT COUNT(*) FROM reviews").fetchone()[0]

    if total == 0:
        conn.close()
        return {
            "total_reviews":    0,
            "average_score":    0,
            "score_trend":      [],
            "most_common_issue": None,
            "per_file":         [],
            "issue_totals":     {},
        }

    avg_score = conn.execute(
        "SELECT ROUND(AVG(score), 1) FROM reviews"
    ).fetchone()[0]

    # Last 10 reviews for trend chart
    trend_rows = conn.execute("""
        SELECT score, filename, timestamp
        FROM reviews
        ORDER BY id DESC LIMIT 10
    """).fetchall()
    trend = [dict(r) for r in reversed(trend_rows)]

    # Issue totals
    issue_totals = conn.execute("""
        SELECT
            SUM(bug_count)         as bugs,
            SUM(security_count)    as security,
            SUM(performance_count) as performance,
            SUM(readability_count) as readability
        FROM reviews
    """).fetchone()

    issue_map = {
        "bugs":        issue_totals["bugs"]        or 0,
        "security":    issue_totals["security"]    or 0,
        "performance": issue_totals["performance"] or 0,
        "readability": issue_totals["readability"] or 0,
    }
    most_common = max(issue_map, key=issue_map.get) if any(issue_map.values()) else None

    # Per-file averages
    file_rows = conn.execute("""
        SELECT filename,
               COUNT(*)           as review_count,
               ROUND(AVG(score),1) as avg_score,
               MAX(score)         as best_score,
               MIN(score)         as worst_score
        FROM reviews
        GROUP BY filename
        ORDER BY review_count DESC
        LIMIT 10
    """).fetchall()

    conn.close()

    return {
        "total_reviews":     total,
        "average_score":     avg_score,
        "score_trend":       trend,
        "most_common_issue": most_common,
        "issue_totals":      issue_map,
        "per_file":          [dict(r) for r in file_rows],
    }


def delete_all():
    """Clear all reviews — for testing."""
    init_db()
    conn = _get_conn()
    conn.execute("DELETE FROM reviews")
    conn.commit()
    conn.close()
