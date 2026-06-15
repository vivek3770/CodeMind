"""
services/bug_classifier.py
Queries the fine-tuned CodeBERT model on Hugging Face using the Serverless Inference API.

This approach:
  1. Requires no local 'torch' or 'transformers' installation (keeping dependencies light).
  2. Uses 0MB of RAM on the server (preventing Out Of Memory crashes on Render).
  3. Queries the model serverlessly and returns bug classifications in milliseconds.
"""

import os
import json
import logging
import httpx
from typing import Dict, Optional

logger = logging.getLogger(__name__)

# Hugging Face Configuration
HF_TOKEN = os.getenv("HF_TOKEN")
# Default model repo: username/repo_name
HF_MODEL_REPO = os.getenv("HF_MODEL_REPO", "Monkey3770/Codebert-bug-classifier")
HF_MODEL_URL = f"https://router.huggingface.co/hf-inference/models/{HF_MODEL_REPO}"

LABEL_NAMES = ["clean", "sql_injection", "division_by_zero", "null_reference", "xss"]
CONFIDENCE_THRESHOLD = 0.65   # minimum confidence to flag as a bug


def is_available() -> bool:
    """Check if the Hugging Face API token is configured."""
    return HF_TOKEN is not None


def get_metrics() -> Optional[Dict]:
    """Return hardcoded training metrics (accuracy, F1) from your training run."""
    # Since we are serverless, we can provide the metrics here directly
    return {
        "accuracy": 0.7083,
        "f1_macro": 0.4146,
        "label_names": LABEL_NAMES,
        "threshold": CONFIDENCE_THRESHOLD
    }


def predict(code: str) -> Dict:
    """
    Run inference on a code snippet by querying Hugging Face Inference API.

    Returns:
    {
      "available": True,
      "predicted_class": "sql_injection",
      "predicted_label": 1,
      "confidence": 0.94,
      "all_scores": {
        "clean": 0.02,
        "sql_injection": 0.94,
        "division_by_zero": 0.01,
        "null_reference": 0.02,
        "xss": 0.01
      },
      "is_bug": True,
      "bug_type": "sql_injection"
    }
    """
    if not is_available():
        return {
            "available":       False,
            "message":         "Hugging Face API Token (HF_TOKEN) is not configured. Please add it to your environment variables.",
            "predicted_class": None,
            "confidence":      0.0,
            "is_bug":          False,
        }

    headers = {"Authorization": f"Bearer {HF_TOKEN}"}
    payload = {
        "inputs": code,
        "options": {"wait_for_model": True}  # Tells HF to wait and load the model if it is idle/sleeping
    }

    try:
        # Query the Serverless Inference API
        with httpx.Client() as client:
            response = client.post(HF_MODEL_URL, json=payload, headers=headers, timeout=20.0)

        if response.status_code != 200:
            logger.error(f"Hugging Face API returned error status {response.status_code}: {response.text}")
            return {
                "available":       True,
                "predicted_class": "error",
                "confidence":      0.0,
                "is_bug":          False,
                "error":           f"Hugging Face API returned status {response.status_code}",
            }

        result = response.json()

        # Hugging Face sequence classification returns a nested list: [[{"label": "...", "score": ...}, ...]]
        if isinstance(result, list) and len(result) > 0 and isinstance(result[0], list):
            predictions = result[0]
            scores = {item["label"]: round(item["score"], 4) for item in predictions}
            
            # Find the prediction with the highest score
            best_prediction = max(predictions, key=lambda x: x["score"])
            pred_class = best_prediction["label"]
            confidence = best_prediction["score"]
            pred_idx = LABEL_NAMES.index(pred_class) if pred_class in LABEL_NAMES else 0

            is_bug = pred_class != "clean" and confidence >= CONFIDENCE_THRESHOLD
            bug_type = pred_class if is_bug else None

            return {
                "available":       True,
                "predicted_class": pred_class,
                "predicted_label": pred_idx,
                "confidence":      round(confidence, 4),
                "all_scores":      scores,
                "is_bug":          is_bug,
                "bug_type":        bug_type,
            }
        else:
            logger.error(f"Unexpected response format from HF API: {result}")
            return {
                "available":       True,
                "predicted_class": "error",
                "confidence":      0.0,
                "is_bug":          False,
                "error":           f"Unexpected API response format: {result}",
            }

    except Exception as e:
        logger.error(f"Inference error: {e}")
        return {
            "available":       True,
            "predicted_class": "error",
            "confidence":      0.0,
            "is_bug":          False,
            "error":           str(e),
        }


def predict_batch(snippets: list[str]) -> list[Dict]:
    """Run predict() on multiple code snippets."""
    return [predict(s) for s in snippets]


def get_status() -> Dict:
    """Return classifier status for the /health endpoint."""
    m = get_metrics()
    return {
        "available":     is_available(),
        "model_repo":    HF_MODEL_REPO,
        "accuracy":      m.get("accuracy") if m else None,
        "f1_macro":      m.get("f1_macro") if m else None,
        "label_names":   LABEL_NAMES,
        "threshold":     CONFIDENCE_THRESHOLD,
        "message":       (
            f"Ready — Hugging Face Serverless ({m['accuracy']*100:.1f}% accuracy)"
            if is_available() else
            "Model unavailable. HF_TOKEN is not set."
        ),
    }

