"""
routers/ai.py — All API endpoints.

Existing:
  POST /api/review    — AI code review
  POST /api/explain   — AI explanation
  POST /api/fix       — AI fix
  POST /api/tests     — AI test generation
  POST /api/visualize — Safe code execution tracer

(Phase 2 — Semantic Search):
  POST /api/index     — Index a file into ChromaDB
  POST /api/search    — Semantic search across indexed files

(Phase 3 — Complexity):
  POST /api/complexity — Static complexity analysis

(Phase 6 — History):
  GET  /api/history   — All past reviews
  GET  /api/history/stats — Aggregated stats
  DELETE /api/history — Clear all history

New ( Phase 5):

  POST /api/run        — Execute code in Docker sandbox
  GET  /api/run/status — Check if Docker is available
  GET  /api/rag/similar — Get similar past reviews for a code snippet
"""

import json
import asyncio
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import Optional

router = APIRouter(prefix="/api", tags=["AI"])

# ── Flexible imports ───────────────────────────────────────────
try:
    from backend.models import (
        CodeRequest, ReviewResponse, ExplainResponse,
        FixResponse, TestsResponse, VisualizeRequest, VisualizeResponse, TraceStep
    )
    from backend.services.llm              import review_code, explain_code, fix_code, generate_tests
    from backend.services.code_tracer      import trace_code
    from backend.services.complexity_analyzer import analyze_code
    from backend.services.code_indexer     import index_file, search_code, get_status as idx_status
    from backend.services.review_history   import save_review, get_all_reviews, get_stats, delete_all
    from backend.services.rag_pipeline     import get_similar_review_summary
except ModuleNotFoundError:
    from models import (
        CodeRequest, ReviewResponse, ExplainResponse,
        FixResponse, TestsResponse, VisualizeRequest, VisualizeResponse, TraceStep
    )
    from services.llm              import review_code, explain_code, fix_code, generate_tests
    from services.code_tracer      import trace_code
    from services.complexity_analyzer import analyze_code
    from services.code_indexer     import index_file, search_code, get_status as idx_status
    from services.review_history   import save_review, get_all_reviews, get_stats, delete_all
    from services.rag_pipeline     import get_similar_review_summary


# ══════════════════════════════════════════════════════════════
# EXISTING AI ENDPOINTS
# ══════════════════════════════════════════════════════════════

@router.post("/review", response_model=ReviewResponse)
async def review(request: CodeRequest):
    if not request.code.strip():
        raise HTTPException(status_code=400, detail="Code cannot be empty")
    try:
        result = await review_code(request.code, request.language)
        try:
            save_review(
                filename=request.filename or "untitled",
                language=request.language,
                review_result=result,
            )
        except Exception:
            pass
        return result
    except json.JSONDecodeError as e:
        raise HTTPException(status_code=502, detail=f"AI returned invalid JSON: {e}")
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/explain", response_model=ExplainResponse)
async def explain(request: CodeRequest):
    if not request.code.strip():
        raise HTTPException(status_code=400, detail="Code cannot be empty")
    try:
        explanation = await explain_code(request.code, request.language)
        return {"explanation": explanation}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/fix", response_model=FixResponse)
async def fix(request: CodeRequest):
    if not request.code.strip():
        raise HTTPException(status_code=400, detail="Code cannot be empty")
    try:
        result = await fix_code(request.code, request.language)
        return result
    except json.JSONDecodeError as e:
        raise HTTPException(status_code=502, detail=f"AI returned invalid JSON: {e}")
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/tests", response_model=TestsResponse)
async def tests(request: CodeRequest):
    if not request.code.strip():
        raise HTTPException(status_code=400, detail="Code cannot be empty")
    try:
        result = await generate_tests(request.code, request.language, request.filename or "")
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/visualize", response_model=VisualizeResponse)
async def visualize(request: VisualizeRequest):
    if not request.code.strip():
        raise HTTPException(status_code=400, detail="Code cannot be empty")
    loop   = asyncio.get_event_loop()
    result = await loop.run_in_executor(
        None, lambda: trace_code(request.code, request.language)
    )
    return result


# ══════════════════════════════════════════════════════════════
# PHASE 2 — SEMANTIC SEARCH
# ══════════════════════════════════════════════════════════════

class IndexRequest(BaseModel):
    filename: str
    code:     str
    language: str = "python"

class SearchRequest(BaseModel):
    query:    str
    language: Optional[str] = None
    top_k:    int = 5


@router.post("/index")
async def index(request: IndexRequest):
    if not request.code.strip():
        return {"success": True, "chunks_indexed": 0, "message": "Empty file skipped"}
    loop   = asyncio.get_event_loop()
    result = await loop.run_in_executor(
        None, lambda: index_file(request.filename, request.code, request.language)
    )
    return result


@router.post("/search")
async def search(request: SearchRequest):
    if not request.query.strip():
        raise HTTPException(status_code=400, detail="Query cannot be empty")
    loop   = asyncio.get_event_loop()
    result = await loop.run_in_executor(
        None, lambda: search_code(request.query, request.language, request.top_k)
    )
    return result


@router.get("/search/status")
async def search_status():
    return idx_status()


# ══════════════════════════════════════════════════════════════
# PHASE 3 — COMPLEXITY ANALYSIS
# ══════════════════════════════════════════════════════════════

@router.post("/complexity")
async def complexity(request: CodeRequest):
    if not request.code.strip():
        raise HTTPException(status_code=400, detail="Code cannot be empty")
    loop   = asyncio.get_event_loop()
    result = await loop.run_in_executor(
        None, lambda: analyze_code(request.code, request.language)
    )
    return result


# ══════════════════════════════════════════════════════════════
# PHASE 6 — REVIEW HISTORY
# ══════════════════════════════════════════════════════════════

@router.get("/history")
async def history(limit: int = 50):
    try:
        reviews = get_all_reviews(limit=limit)
        return {"reviews": reviews, "count": len(reviews)}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/history/stats")
async def history_stats():
    try:
        return get_stats()
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.delete("/history")
async def clear_history():
    try:
        delete_all()
        return {"success": True, "message": "History cleared"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# ══════════════════════════════════════════════════════════════
# PHASE 5 — CODE EXECUTION + RAG
# ══════════════════════════════════════════════════════════════

class RAGRequest(BaseModel):
    code:     str
    language: str = "python"


@router.post("/rag/similar")
async def rag_similar(request: RAGRequest):
    """
    Get a summary of the most similar past review.
    Used to show: 'Similar code reviewed before — score was 3/10'
    """
    try:
        summary = get_similar_review_summary(request.code, request.language)
        return {"found": summary is not None, "summary": summary}
    except Exception as e:
        return {"found": False, "summary": None, "error": str(e)}
