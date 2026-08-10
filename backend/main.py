"""
main.py — FastAPI application entry point.

Run from the ROOT project folder:
  uvicorn backend.main:app --reload --port 8000

Requires GEMINI_API_KEY in backend/.env
"""
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from dotenv import load_dotenv
import os

_dir = os.path.dirname(__file__)
load_dotenv(os.path.join(_dir, ".env"), override=True)

try:
    from backend.routers.ai import router as ai_router
except ModuleNotFoundError:
    from routers.ai import router as ai_router

app = FastAPI(
    title="CodeMind IDE — AI Backend",
    description="AI code review, explanation, fixing, test generation, and visualization.",
    version="2.0.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(ai_router)


@app.get("/health")
async def health():
    """Health check with classifier and search status."""
    status = {
        "status":  "ok",
        "service": "CodeMind IDE Backend",
        "version": "2.0.0",
    }

    # Bug classifier status
    try:
        from backend.services.bug_classifier import get_status as clf_status
    except ModuleNotFoundError:
        from services.bug_classifier import get_status as clf_status
    try:
        status["bug_classifier"] = clf_status()
    except Exception:
        status["bug_classifier"] = {"available": False}

    # Vector search status
    try:
        try:
            from backend.services.code_indexer import get_status as idx_status
        except ModuleNotFoundError:
            from services.code_indexer import get_status as idx_status
        status["semantic_search"] = idx_status()
    except Exception:
        status["semantic_search"] = {"operational": False}

    return status
