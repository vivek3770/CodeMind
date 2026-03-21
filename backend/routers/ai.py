"""
routers/ai.py — FastAPI router exposing all AI endpoints.

Endpoints:
  POST /review   — Structured code review with score + categorised issues
  POST /explain  — Natural language explanation
  POST /fix      — Returns fixed code + list of changes
  POST /tests    — Generates unit tests
"""
from fastapi import APIRouter, HTTPException
from backend.models import CodeRequest, ReviewResponse, ExplainResponse, FixResponse, TestsResponse
from backend.services.llm import review_code, explain_code, fix_code, generate_tests
import json

router = APIRouter(prefix="/api", tags=["AI"])


@router.post("/review", response_model=ReviewResponse)
async def review(request: CodeRequest):
    """
    Full AI code review: bugs, performance, security, readability, quality score.
    """
    if not request.code.strip():
        raise HTTPException(status_code=400, detail="Code cannot be empty")
    try:
        result = await review_code(request.code, request.language)
        return result
    except json.JSONDecodeError as e:
        raise HTTPException(status_code=502, detail=f"AI returned invalid JSON: {e}")
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/explain", response_model=ExplainResponse)
async def explain(request: CodeRequest):
    """
    Returns a structured natural-language explanation of the code.
    """
    if not request.code.strip():
        raise HTTPException(status_code=400, detail="Code cannot be empty")
    try:
        explanation = await explain_code(request.code, request.language)
        return {"explanation": explanation}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/fix", response_model=FixResponse)
async def fix(request: CodeRequest):
    """
    Returns an improved, fixed version of the code along with a changelog.
    """
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
    """
    Generates a comprehensive unit test suite for the provided code.
    """
    if not request.code.strip():
        raise HTTPException(status_code=400, detail="Code cannot be empty")
    try:
        result = await generate_tests(request.code, request.language, request.filename or "")
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
