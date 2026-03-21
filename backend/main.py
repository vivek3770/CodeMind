"""
main.py — FastAPI application entry point.

Run with:
  uvicorn main:app --reload --port 8000

Requires GEMINI_API_KEY in backend/.env
Get a free key at: https://aistudio.google.com/app/apikey
"""
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from dotenv import load_dotenv

load_dotenv()

from backend.routers.ai import router as ai_router

app = FastAPI(
    title="CodeMind IDE — AI Backend",
    description="AI-powered code review, explanation, fixing, and test generation.",
    version="1.0.0",
)

# ── CORS — allow the Vite dev server and any local origin ──────
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(ai_router)


@app.get("/health")
async def health():
    return {"status": "ok", "service": "CodeMind IDE Backend"}
