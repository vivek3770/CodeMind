"""
services/llm.py — AI calls using Google Gemini (FREE tier).

Get your free API key at: https://aistudio.google.com/app/apikey
No credit card required. Set it in backend/.env:
  GEMINI_API_KEY=AIza...

Model used: gemini-1.5-flash  (fast, free, great for code tasks)
"""
import json
import os
import re
import asyncio
import google.generativeai as genai

# ── Gemini client setup ────────────────────────────────────────
genai.configure(api_key=os.getenv("GEMINI_API_KEY"))

# gemini-2.5-flash  → free tier, fast, excellent at code
# gemini-2.5-pro    → free tier (lower rate limit), more capable
MODEL = "gemini-2.5-flash"

_model = genai.GenerativeModel(
    model_name=MODEL,
    generation_config=genai.GenerationConfig(
        temperature=0.2,       # low = more deterministic / accurate
        max_output_tokens=4096,
    ),
)


def _clean_json(text: str) -> str:
    """Strip markdown code fences that Gemini sometimes wraps around JSON."""
    text = text.strip()
    text = re.sub(r"^```(?:json)?\s*", "", text)
    text = re.sub(r"\s*```$", "", text)
    return text.strip()


async def _ask(prompt: str) -> str:
    """
    Send a prompt to Gemini and return the text response.
    google-generativeai is synchronous, so we run it in a thread pool
    to avoid blocking FastAPI's async event loop.
    """
    loop = asyncio.get_event_loop()
    response = await loop.run_in_executor(
        None,
        lambda: _model.generate_content(prompt),
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


# ── Review ─────────────────────────────────────────────────────

async def review_code(code: str, language: str) -> dict:
    """
    Full structured code review.
    Returns a dict matching ReviewResponse schema.
    """
    prompt = f"""You are a senior software engineer performing a professional code review.
Analyze the following {language} code thoroughly.

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

Scoring guide: 0-3 = critical issues, 4-6 = moderate, 7-8 = good, 9-10 = excellent.
Line numbers must be accurate (1-indexed). Be specific and actionable.
Return ONLY the JSON object — nothing else.

Code to review:
```{language}
{code}
```"""

    raw = await _ask(prompt)
    return json.loads(_clean_json(raw))


# ── Explain ────────────────────────────────────────────────────

async def explain_code(code: str, language: str) -> str:
    """
    Natural-language explanation of what the code does.
    Returns markdown-formatted text.
    """
    prompt = f"""You are a helpful programming tutor. Explain what the following {language} code does
in clear, structured markdown using exactly this format:

## Overview
One or two sentence summary of what the code does.

## Key Components
- Brief bullet point for each function/class/section.

## How It Works
Step-by-step walkthrough of the main execution flow.

## Potential Issues
2-3 bullet points on obvious bugs, security risks, or improvements.

Be concise, accurate, and educational. Target an intermediate developer.

Code:
```{language}
{code}
```"""

    return await _ask(prompt)


# ── Fix ────────────────────────────────────────────────────────

async def fix_code(code: str, language: str) -> dict:
    """
    Returns fixed code + a changelog list.
    """
    prompt = f"""You are a senior {language} developer. Fix ALL bugs, security vulnerabilities,
and performance issues in the code below.

Return ONLY a valid JSON object — no markdown outside the JSON.

Use this exact structure:
{{
  "fixed_code": "<complete corrected source code as a single string>",
  "changes": [
    "<short description of fix 1>",
    "<short description of fix 2>"
  ]
}}

Rules:
- fixed_code must be the complete file, not a diff
- Add a brief inline comment (# or //) next to each changed line explaining why
- List every meaningful change in the changes array
- Return ONLY the JSON object

Code to fix:
```{language}
{code}
```"""

    raw = await _ask(prompt)
    return json.loads(_clean_json(raw))


# ── Generate Tests ─────────────────────────────────────────────

async def generate_tests(code: str, language: str, filename: str = "") -> dict:
    """
    Generates a comprehensive unit test suite.
    """
    framework = TEST_FRAMEWORKS.get(language, "appropriate test framework")

    # Derive a sensible test filename
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
- Test every public function and method
- Include happy path tests
- Include edge cases (empty input, None/null, boundary values)
- Include error/exception handling tests
- Use descriptive test names that explain what is being tested
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
