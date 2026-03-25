"""
routers/ai.py — FastAPI router exposing all AI endpoints.

Endpoints:
  POST /api/review   — Structured code review with score + categorised issues
  POST /api/explain  — Natural language explanation
  POST /api/fix      — Returns fixed code + list of changes
  POST /api/tests    — Generates unit tests
"""
from fastapi import APIRouter, HTTPException
import json

try:
    from backend.models import CodeRequest, ReviewResponse, ExplainResponse, FixResponse, TestsResponse
    from backend.services.llm import review_code, explain_code, fix_code, generate_tests
except ModuleNotFoundError:
    from models import CodeRequest, ReviewResponse, ExplainResponse, FixResponse, TestsResponse
    from services.llm import review_code, explain_code, fix_code, generate_tests

router = APIRouter(prefix="/api", tags=["AI"])


@router.post("/review", response_model=ReviewResponse)
async def review(request: CodeRequest):
    """Full AI code review: bugs, performance, security, readability, quality score."""
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
    """Returns a structured natural-language explanation of the code."""
    if not request.code.strip():
        raise HTTPException(status_code=400, detail="Code cannot be empty")
    try:
        explanation = await explain_code(request.code, request.language)
        return {"explanation": explanation}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/fix", response_model=FixResponse)
async def fix(request: CodeRequest):
    """Returns an improved, fixed version of the code along with a changelog."""
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
    """Generates a comprehensive unit test suite for the provided code."""
    if not request.code.strip():
        raise HTTPException(status_code=400, detail="Code cannot be empty")
    try:
        result = await generate_tests(request.code, request.language, request.filename or "")
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# ── Visualize endpoint ─────────────────────────────────────────

try:
    from backend.models import VisualizeRequest, VisualizeResponse
    from backend.services.code_tracer import trace_code
except ModuleNotFoundError:
    from models import VisualizeRequest, VisualizeResponse
    from services.code_tracer import trace_code


@router.post("/visualize", response_model=VisualizeResponse)
async def visualize(request: VisualizeRequest):
    """
    Safely execute and trace user code step by step.
    Returns execution frames for visualization in the IDE.
    """
    if not request.code.strip():
        raise HTTPException(status_code=400, detail="Code cannot be empty")

    import asyncio
    loop = asyncio.get_event_loop()
    result = await loop.run_in_executor(
        None,
        lambda: trace_code(request.code, request.language)
    )
    return result
