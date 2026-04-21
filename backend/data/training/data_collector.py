"""
data_collector.py
Generates synthetic training data for the bug classifier using Gemini.

Run this script ONCE to create your dataset:
  python backend/data/training/data_collector.py

Output files:
  backend/data/training/raw_samples.csv   ← all generated samples
  backend/data/training/train.csv          ← 70% split
  backend/data/training/val.csv            ← 15% split
  backend/data/training/test.csv           ← 15% split

Classes:
  0 = clean
  1 = sql_injection
  2 = division_by_zero
  3 = null_reference
  4 = xss
"""

import os
import csv
import json
import time
import random
from pathlib import Path

# ── Setup ──────────────────────────────────────────────────────
try:
    from google import genai
    NEW_SDK = True
except ImportError:
    import google.generativeai as genai
    NEW_SDK = False

from dotenv import load_dotenv

# Load .env from backend/
env_path = Path(__file__).resolve().parents[2] / ".env"
load_dotenv(env_path)

API_KEY = os.getenv("GEMINI_API_KEY")
if not API_KEY:
    raise ValueError("GEMINI_API_KEY not set in backend/.env")

if NEW_SDK:
    client = genai.Client(api_key=API_KEY)
else:
    genai.configure(api_key=API_KEY)
    model = genai.GenerativeModel("gemini-2.5-flash")

OUTPUT_DIR  = Path(__file__).parent
RAW_CSV     = OUTPUT_DIR / "raw_samples.csv"

# ── Bug class definitions ──────────────────────────────────────
BUG_CLASSES = {
    "clean": {
        "label": 0,
        "description": "correct, secure Python functions with no bugs",
        "examples": [
            "functions that safely query databases using parameterized queries",
            "functions that properly validate and sanitize user input",
            "functions with proper null/None checks before operations",
            "functions that safely perform arithmetic with zero checks",
            "REST API handlers that properly escape output",
        ]
    },
    "sql_injection": {
        "label": 1,
        "description": "Python functions vulnerable to SQL injection",
        "examples": [
            "functions that concatenate user input directly into SQL strings",
            "functions using f-strings or .format() to build SQL queries",
            "functions using % string formatting in SQL queries",
            "database query functions that don't use parameterized queries",
            "login functions that build SQL with username/password concatenation",
        ]
    },
    "division_by_zero": {
        "label": 2,
        "description": "Python functions with potential division by zero errors",
        "examples": [
            "functions that divide without checking if denominator is zero",
            "average/mean calculation functions without length checks",
            "percentage calculation functions without zero checks",
            "functions that use modulo operator without zero check",
            "rate/ratio calculation functions without denominator validation",
        ]
    },
    "null_reference": {
        "label": 3,
        "description": "Python functions with null/None reference errors",
        "examples": [
            "functions that access dict keys without checking existence",
            "functions that call methods on potentially None objects",
            "functions that index into lists without bounds checking",
            "functions that access object attributes without None check",
            "functions that process API responses without null checking",
        ]
    },
    "xss": {
        "label": 4,
        "description": "Python web functions vulnerable to Cross-Site Scripting (XSS)",
        "examples": [
            "Flask/Django view functions that render user input without escaping",
            "functions that directly embed user data into HTML strings",
            "functions that use innerHTML equivalent without sanitization",
            "template rendering functions that bypass auto-escaping",
            "functions that return user input directly in HTTP responses",
        ]
    },
}

SAMPLES_PER_CLASS  = 120   # generates 600 total samples
SAMPLES_PER_PROMPT = 10    # ask Gemini for 10 at a time


def call_gemini(prompt: str) -> str:
    """Call Gemini API with the new or old SDK."""
    if NEW_SDK:
        response = client.models.generate_content(
            model="gemini-2.5-flash",
            contents=prompt,
        )
        return response.text
    else:
        response = model.generate_content(prompt)
        return response.text


def generate_samples(bug_class: str, example: str, count: int) -> list[dict]:
    """
    Ask Gemini to generate `count` code samples of a specific bug class.
    Returns list of dicts: { code, label, bug_class, description }
    """
    info  = BUG_CLASSES[bug_class]
    label = info["label"]

    prompt = f"""Generate exactly {count} different Python code snippets.
Each snippet should be: {info['description']}.
Specifically focus on: {example}

Requirements for each snippet:
- 5 to 25 lines of Python code
- Realistic function names and variable names
- No imports needed (self-contained)
- Each snippet must be meaningfully different from the others
- For 'clean' class: code must be correct and secure
- For bug classes: the bug must be clearly present

Return ONLY a JSON array with exactly {count} objects.
Each object must have exactly this structure:
{{"code": "<the complete python function as a string>", "description": "<one sentence describing what the function does and the bug if any>"}}

Return ONLY the JSON array, no markdown, no explanation."""

    try:
        raw  = call_gemini(prompt)
        # Clean markdown fences
        raw  = raw.strip()
        if raw.startswith("```"):
            raw = raw.split("\n", 1)[1] if "\n" in raw else raw[3:]
            raw = raw.rsplit("```", 1)[0]
        raw = raw.strip()

        samples = json.loads(raw)
        result  = []
        for s in samples:
            code = s.get("code", "").strip()
            desc = s.get("description", "")
            if code and len(code) > 20:
                result.append({
                    "code":        code,
                    "label":       label,
                    "bug_class":   bug_class,
                    "description": desc,
                })
        return result
    except Exception as e:
        print(f"    Warning: failed to parse response — {e}")
        return []


def collect_all_samples() -> list[dict]:
    """Generate all samples for all bug classes."""
    all_samples = []

    for bug_class, info in BUG_CLASSES.items():
        print(f"\n📦 Generating '{bug_class}' samples (target: {SAMPLES_PER_CLASS})")
        class_samples = []
        examples      = info["examples"]

        samples_per_example = SAMPLES_PER_CLASS // len(examples)

        for i, example in enumerate(examples):
            needed = samples_per_example
            print(f"  [{i+1}/{len(examples)}] {example[:60]}…")

            collected = 0
            attempts  = 0
            while collected < needed and attempts < 3:
                batch = generate_samples(bug_class, example, SAMPLES_PER_PROMPT)
                class_samples.extend(batch)
                collected += len(batch)
                attempts  += 1
                print(f"    Got {len(batch)} samples (total: {len(class_samples)})")
                time.sleep(1.5)   # respect rate limits

        print(f"  ✓ '{bug_class}': {len(class_samples)} samples collected")
        all_samples.extend(class_samples)

    return all_samples


def save_raw_csv(samples: list[dict]) -> None:
    """Save all samples to raw_samples.csv."""
    OUTPUT_DIR.mkdir(parents=True, exist_ok=True)
    with open(RAW_CSV, "w", newline="", encoding="utf-8") as f:
        writer = csv.DictWriter(f, fieldnames=["code", "label", "bug_class", "description"])
        writer.writeheader()
        writer.writerows(samples)
    print(f"\n✅ Saved {len(samples)} samples to {RAW_CSV}")


def split_dataset(samples: list[dict]) -> None:
    """Split into train/val/test and save as CSV files."""
    random.shuffle(samples)
    n     = len(samples)
    train = samples[:int(n * 0.70)]
    val   = samples[int(n * 0.70):int(n * 0.85)]
    test  = samples[int(n * 0.85):]

    for name, split in [("train", train), ("val", val), ("test", test)]:
        path = OUTPUT_DIR / f"{name}.csv"
        with open(path, "w", newline="", encoding="utf-8") as f:
            writer = csv.DictWriter(f, fieldnames=["code", "label", "bug_class", "description"])
            writer.writeheader()
            writer.writerows(split)
        print(f"  {name}.csv → {len(split)} samples")

    print("\n✅ Dataset split complete!")
    print(f"  Train: {len(train)} | Val: {len(val)} | Test: {len(test)}")


def print_stats(samples: list[dict]) -> None:
    """Print class distribution."""
    from collections import Counter
    counts = Counter(s["bug_class"] for s in samples)
    print("\n📊 Class distribution:")
    for cls, cnt in sorted(counts.items()):
        label = BUG_CLASSES[cls]["label"]
        bar   = "█" * (cnt // 5)
        print(f"  [{label}] {cls:<20} {cnt:>4} {bar}")


if __name__ == "__main__":
    print("=" * 60)
    print("CodeMind IDE — Bug Classifier Data Collection")
    print("=" * 60)
    print(f"Target: {SAMPLES_PER_CLASS} samples × {len(BUG_CLASSES)} classes")
    print(f"        = ~{SAMPLES_PER_CLASS * len(BUG_CLASSES)} total samples")
    print(f"Output: {OUTPUT_DIR}")
    print()

    samples = collect_all_samples()

    if not samples:
        print("❌ No samples collected. Check your API key.")
        exit(1)

    print_stats(samples)
    save_raw_csv(samples)
    split_dataset(samples)

    print("\n🎉 Data collection complete!")
    print("Next step: open notebooks/train_classifier.ipynb")
