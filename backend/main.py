"""
main.py — FastAPI application entry point.

Run from the ROOT project folder:
  uvicorn backend.main:app --reload --port 8000

Requires GEMINI_API_KEY in backend/.env
Get a free key at: https://aistudio.google.com/app/apikey
"""
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from dotenv import load_dotenv
import os

# Load .env from the backend/ directory regardless of where uvicorn is run from
_dir = os.path.dirname(__file__)
load_dotenv(os.path.join(_dir, ".env"))

# Support running from project root OR from inside backend/
try:
    from backend.routers.ai import router as ai_router
except ModuleNotFoundError:
    from routers.ai import router as ai_router

app = FastAPI(
    title="CodeMind IDE — AI Backend",
    description="AI-powered code review, explanation, fixing, and test generation.",
    version="1.0.0",
)

# Allow ALL origins during development
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
    return {"status": "ok", "service": "CodeMind IDE Backend"}
