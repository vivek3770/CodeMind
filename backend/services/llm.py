"""
services/llm.py
All AI calls using the new google-genai SDK — now with:
  1. Local bug classifier (Phase 4) — runs first
  2. RAG context (Phase 5) — past reviews injected into prompt
  3. New google-genai SDK.
Bug classifier runs FIRST — its findings ground the Gemini prompt.
"""

import json
import os
import re
import asyncio
from google import genai

# ── Client ─────────────────────────────────────────────────────
_client = None
_last_key = None

def _get_client():
    global _client, _last_key
    current_key = os.getenv("GEMINI_API_KEY")
    if _client is None or _last_key != current_key:
        _client = genai.Client(api_key=current_key)
        _last_key = current_key
    return _client

MODEL = "gemini-2.5-flash"


def _clean_json(text: str) -> str:
    text = text.strip()
    text = re.sub(r"^```(?:json)?\s*", "", text)
    text = re.sub(r"\s*```$", "", text)
    return text.strip()


async def _ask(prompt: str) -> str:
    loop = asyncio.get_event_loop()
    response = await loop.run_in_executor(
        None,
        lambda: _get_client().models.generate_content(
            model=MODEL,
            contents=prompt,
        )
    )
    return response.text


TEST_FRAMEWORKS = {
    "python":     "pytest",
    "javascript": "Jest",
    "typescript": "Jest",
    "java":       "JUnit 5",
    "go":         "Go testing package",
    "cpp":        "Google Test",
    "rust":       "Rust built-in tests",
}


# ── Context builders ───────────────────────────────────────────

def _get_classifier_context(code: str) -> str:
    """Run local CodeBERT classifier and return context string."""
    try:
        from .bug_classifier import predict, is_available
        if not is_available():
            return ""
        result = predict(code)
        if not result.get("available"):
            return ""
        if result.get("is_bug"):
            return (
                f"\n[CLASSIFIER] Fine-tuned CodeBERT detected "
                f"'{result['bug_type']}' with "
                f"{result['confidence']*100:.0f}% confidence. "
                f"Focus especially on this bug type.\n"
            )
        return (
            f"\n[CLASSIFIER] Fine-tuned CodeBERT classified code as "
            f"'{result.get('predicted_class','clean')}' "
            f"({result.get('confidence',0)*100:.0f}% confidence).\n"
        )
    except Exception:
        return ""


def _get_rag_context(code: str, language: str) -> str:
    """Retrieve similar past reviews for RAG grounding."""
    try:
        from .rag_pipeline import build_rag_context
        return build_rag_context(code, language)
    except Exception:
        return ""


def _store_review(code: str, language: str, result: dict):
    """Persist review to RAG memory after completion."""
    try:
        from .rag_pipeline import store_in_memory
        store_in_memory(code, language, result)
    except Exception:
        pass


# ── Review ─────────────────────────────────────────────────────

async def review_code(code: str, language: str) -> dict:
    """
    Full structured review.
    Pipeline: classifier → RAG retrieval → Gemini → store result
    """
    classifier_ctx = _get_classifier_context(code)
    rag_ctx        = _get_rag_context(code, language)

    prompt = f"""You are a senior software engineer performing a professional code review.
{classifier_ctx}{rag_ctx}
Analyze the following {language} code thoroughly.
Return ONLY a valid JSON object — no markdown, no text outside JSON.

{{
  "score": <0-10>,
  "summary": "<one sentence>",
  "bugs": [{{"line":<int>,"message":"<text>","severity":"error|warning|info"}}],
  "performance": [{{"line":<int>,"message":"<text>","severity":"warning|info"}}],
  "security": [{{"line":<int>,"message":"<text>","severity":"error|warning"}}],
  "readability": [{{"line":<int>,"message":"<text>","severity":"info"}}],
  "scoreBreakdown": {{
    "correctness":<0-10>,"performance":<0-10>,
    "security":<0-10>,"readability":<0-10>
  }}
}}

Code:
```{language}
{code}
```"""

    raw    = await _ask(prompt)
    result = json.loads(_clean_json(raw))

    # Store in RAG memory for future reviews
    _store_review(code, language, result)

    return result


# ── Explain ────────────────────────────────────────────────────

async def explain_code(code: str, language: str) -> str:
    prompt = f"""You are a helpful programming tutor. Explain the following {language} code
in clear structured markdown:

## Overview
One or two sentence summary.

## Key Components
- Bullet for each function/class.

## How It Works
Step-by-step execution flow.

## Potential Issues
2-3 bullet points on risks or improvements.

Code:
```{language}
{code}
```"""
    return await _ask(prompt)


# ── Fix ────────────────────────────────────────────────────────

async def fix_code(code: str, language: str) -> dict:
    classifier_ctx = _get_classifier_context(code)
    rag_ctx        = _get_rag_context(code, language)

    prompt = f"""You are a senior {language} developer.
{classifier_ctx}{rag_ctx}
Fix ALL bugs, security vulnerabilities, and performance issues.
Return ONLY JSON:
{{
  "fixed_code": "<complete corrected source>",
  "changes": ["<fix 1>","<fix 2>"]
}}

Code:
```{language}
{code}
```"""

    raw = await _ask(prompt)
    return json.loads(_clean_json(raw))


# ── Tests ──────────────────────────────────────────────────────

async def generate_tests(code: str, language: str,
                         filename: str = "") -> dict:
    framework = TEST_FRAMEWORKS.get(language, "appropriate test framework")

    if filename:
        base = filename.rsplit(".", 1)[0]
        ext  = filename.rsplit(".", 1)[-1] if "." in filename else language
        if language == "python":
            test_filename = f"test_{base}.py"
        elif language in ("javascript", "typescript"):
            test_filename = f"{base}.test.{ext}"
        elif language == "java":
            test_filename = f"{base}Test.java"
        else:
            test_filename = f"{base}_test.{ext}"
    else:
        test_filename = "test_code.py"

    prompt = f"""Write a comprehensive {framework} test suite for this {language} code.
Include: happy path, edge cases, error handling, boundaries.
Return ONLY raw test code, no markdown.

Code:
```{language}
{code}
```"""

    raw = await _ask(prompt)
    return {"test_code": raw, "framework": framework, "filename": test_filename}
