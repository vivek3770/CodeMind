"""
services/llm.py
All AI calls using the new google-genai SDK.
Bug classifier runs FIRST — its findings ground the Gemini prompt.
"""

import json
import os
import re
import asyncio
from google import genai

# ── Client setup ───────────────────────────────────────────────
_client = None

def _get_client():
    global _client
    if _client is None:
        _client = genai.Client(api_key=os.getenv("GEMINI_API_KEY"))
    return _client

MODEL = "gemini-2.5-flash"


def _clean_json(text: str) -> str:
    text = text.strip()
    text = re.sub(r"^```(?:json)?\s*", "", text)
    text = re.sub(r"\s*```$", "", text)
    return text.strip()


async def _ask(prompt: str, max_tokens: int = 4096) -> str:
    """Call Gemini asynchronously using thread pool."""
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


# ── Bug classifier integration ─────────────────────────────────

def _get_classifier_context(code: str) -> str:
    """
    Run the local bug classifier and return a context string
    that gets injected into the Gemini prompt.
    This grounds Gemini's response in our model's findings.
    """
    try:
        from .bug_classifier import predict, is_available
        if not is_available():
            return ""

        result = predict(code)
        if not result.get("available"):
            return ""

        if result.get("is_bug"):
            bug_type   = result["bug_type"]
            confidence = result["confidence"]
            return (
                f"\n[LOCAL CLASSIFIER FINDING] "
                f"Our fine-tuned CodeBERT model detected a likely "
                f"'{bug_type}' vulnerability with {confidence*100:.0f}% confidence. "
                f"Pay special attention to this bug type in your analysis.\n"
            )
        else:
            return (
                f"\n[LOCAL CLASSIFIER FINDING] "
                f"Our fine-tuned CodeBERT model classified this code as "
                f"'{result.get('predicted_class', 'clean')}' "
                f"({result.get('confidence', 0)*100:.0f}% confidence).\n"
            )
    except Exception:
        return ""


# ── Review ─────────────────────────────────────────────────────

async def review_code(code: str, language: str) -> dict:
    """Full structured code review, grounded by local classifier."""
    classifier_ctx = _get_classifier_context(code)

    prompt = f"""You are a senior software engineer performing a professional code review.
Analyze the following {language} code thoroughly.
{classifier_ctx}
Return ONLY a valid JSON object — no markdown fences, no explanation outside the JSON.

Use this exact structure:
{{
  "score": <integer 0-10>,
  "summary": "<one sentence describing overall quality>",
  "bugs": [
    {{"line": <integer>, "message": "<clear description>", "severity": "error|warning|info"}}
  ],
  "performance": [
    {{"line": <integer>, "message": "<clear description>", "severity": "warning|info"}}
  ],
  "security": [
    {{"line": <integer>, "message": "<clear description>", "severity": "error|warning"}}
  ],
  "readability": [
    {{"line": <integer>, "message": "<clear description>", "severity": "info"}}
  ],
  "scoreBreakdown": {{
    "correctness": <integer 0-10>,
    "performance": <integer 0-10>,
    "security":    <integer 0-10>,
    "readability": <integer 0-10>
  }}
}}

Scoring: 0-3 = critical, 4-6 = moderate, 7-8 = good, 9-10 = excellent.
Be precise with line numbers (1-indexed). Return ONLY JSON.

Code to review:
```{language}
{code}
```"""

    raw = await _ask(prompt)
    return json.loads(_clean_json(raw))


# ── Explain ────────────────────────────────────────────────────

async def explain_code(code: str, language: str) -> str:
    prompt = f"""You are a helpful programming tutor. Explain what the following {language} code does
in clear, structured markdown using exactly this format:

## Overview
One or two sentence summary.

## Key Components
- Brief bullet point for each function/class/section.

## How It Works
Step-by-step walkthrough of the main execution flow.

## Potential Issues
2-3 bullet points on obvious bugs, security risks, or improvements.

Be concise and educational.

Code:
```{language}
{code}
```"""
    return await _ask(prompt)


# ── Fix ────────────────────────────────────────────────────────

async def fix_code(code: str, language: str) -> dict:
    classifier_ctx = _get_classifier_context(code)

    prompt = f"""You are a senior {language} developer. Fix ALL bugs, security vulnerabilities,
and performance issues in the code below.
{classifier_ctx}
Return ONLY a valid JSON object:
{{
  "fixed_code": "<complete corrected source code as a single string>",
  "changes": [
    "<short description of fix 1>",
    "<short description of fix 2>"
  ]
}}

Rules:
- fixed_code must be the complete file, not a diff
- Add a brief inline comment next to each changed line
- Return ONLY the JSON object

Code to fix:
```{language}
{code}
```"""

    raw = await _ask(prompt)
    return json.loads(_clean_json(raw))


# ── Generate Tests ─────────────────────────────────────────────

async def generate_tests(code: str, language: str, filename: str = "") -> dict:
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
        test_filename = f"test_code.{'py' if language == 'python' else 'test.js'}"

    prompt = f"""You are an expert test engineer. Write a comprehensive unit test suite
using {framework} for the following {language} code.

Requirements:
- Test every public function
- Include happy path, edge cases, error handling, boundary conditions
- Use descriptive test names
- Add brief comments grouping related tests

Return ONLY raw test code. No markdown fences, no explanations outside comments.

Code to test:
```{language}
{code}
```"""

    raw = await _ask(prompt)
    return {
        "test_code": raw,
        "framework": framework,
        "filename":  test_filename,
    }
