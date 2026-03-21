"""
models.py — Pydantic request/response schemas for all API endpoints.
"""
from pydantic import BaseModel, Field
from typing import List, Optional


# ── Request Models ─────────────────────────────────────────────

class CodeRequest(BaseModel):
    code: str = Field(..., description="Source code to analyze")
    language: str = Field(default="python", description="Programming language")
    filename: Optional[str] = Field(default=None, description="Optional filename for context")


# ── Review Response Models ─────────────────────────────────────

class Issue(BaseModel):
    line: int = Field(..., description="Line number where issue was found")
    message: str = Field(..., description="Description of the issue")
    severity: str = Field(..., description="error | warning | info")


class ScoreBreakdown(BaseModel):
    correctness: int = Field(..., ge=0, le=10)
    performance: int = Field(..., ge=0, le=10)
    security: int = Field(..., ge=0, le=10)
    readability: int = Field(..., ge=0, le=10)


class ReviewResponse(BaseModel):
    score: int = Field(..., ge=0, le=10, description="Overall quality score out of 10")
    summary: str = Field(..., description="One-sentence summary of the review")
    bugs: List[Issue] = Field(default_factory=list)
    performance: List[Issue] = Field(default_factory=list)
    security: List[Issue] = Field(default_factory=list)
    readability: List[Issue] = Field(default_factory=list)
    score_breakdown: ScoreBreakdown = Field(..., alias="scoreBreakdown")

    class Config:
        populate_by_name = True


# ── Other Response Models ──────────────────────────────────────

class ExplainResponse(BaseModel):
    explanation: str = Field(..., description="Natural language explanation of the code")


class FixResponse(BaseModel):
    fixed_code: str = Field(..., description="Improved version of the code")
    changes: List[str] = Field(default_factory=list, description="List of changes made")


class TestsResponse(BaseModel):
    test_code: str = Field(..., description="Generated unit test code")
    framework: str = Field(..., description="Test framework used")
    filename: str = Field(..., description="Suggested test filename")
