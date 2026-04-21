"""
services/bug_classifier.py
Loads the fine-tuned CodeBERT model and runs inference.

After training, this service:
  1. Loads on FastAPI startup (once, not per request)
  2. Runs predict() in milliseconds
  3. Returns confidence scores for all 5 bug classes
  4. Is called BEFORE Gemini in the review pipeline
     so Gemini gets grounded context from the classifier
"""

import os
import json
import logging
from pathlib import Path
from typing import Dict, Optional

logger = logging.getLogger(__name__)

MODEL_DIR    = Path(__file__).resolve().parents[1] / "models" / "bug_classifier"
METRICS_FILE = MODEL_DIR / "metrics.json"

LABEL_NAMES = ["clean", "sql_injection", "division_by_zero", "null_reference", "xss"]
CONFIDENCE_THRESHOLD = 0.65   # minimum confidence to flag as a bug

# ── Lazy-loaded singletons ─────────────────────────────────────
_tokenizer = None
_model     = None
_metrics   = None
_available = None   # None = not checked, True/False = checked


def is_available() -> bool:
    """Check if the trained model exists and can be loaded."""
    global _available
    if _available is None:
        _available = (
            MODEL_DIR.exists() and
            (MODEL_DIR / "config.json").exists() and
            _try_import()
        )
    return _available


def _try_import() -> bool:
    """Test if torch and transformers are importable."""
    try:
        import torch                                           # noqa
        from transformers import AutoTokenizer, AutoModelForSequenceClassification  # noqa
        return True
    except ImportError:
        return False


def _load_model():
    """Load tokenizer and model into memory (called once)."""
    global _tokenizer, _model
    if _tokenizer is not None:
        return True

    try:
        import torch
        from transformers import AutoTokenizer, AutoModelForSequenceClassification

        logger.info(f"Loading bug classifier from {MODEL_DIR}")
        _tokenizer = AutoTokenizer.from_pretrained(str(MODEL_DIR))
        _model     = AutoModelForSequenceClassification.from_pretrained(str(MODEL_DIR))
        _model.eval()

        # Use CPU — no GPU needed for inference
        _model = _model.to(torch.device("cpu"))
        logger.info("Bug classifier loaded ✓")
        return True
    except Exception as e:
        logger.warning(f"Could not load bug classifier: {e}")
        return False


def get_metrics() -> Optional[Dict]:
    """Return training metrics (accuracy, F1) from metrics.json."""
    global _metrics
    if _metrics is None and METRICS_FILE.exists():
        try:
            with open(METRICS_FILE) as f:
                _metrics = json.load(f)
        except Exception:
            pass
    return _metrics


def predict(code: str) -> Dict:
    """
    Run inference on a code snippet.

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
            "message":         "Bug classifier not trained yet. Run data_collector.py then train_classifier.ipynb.",
            "predicted_class": None,
            "confidence":      0.0,
            "is_bug":          False,
        }

    if not _load_model():
        return {
            "available":       False,
            "message":         "Failed to load model.",
            "predicted_class": None,
            "confidence":      0.0,
            "is_bug":          False,
        }

    try:
        import torch

        inputs = _tokenizer(
            code,
            return_tensors="pt",
            max_length=512,
            truncation=True,
            padding=True,
        )

        with torch.no_grad():
            outputs = _model(**inputs)
            probs   = torch.softmax(outputs.logits, dim=1)[0]

        scores = {name: round(float(probs[i]), 4) for i, name in enumerate(LABEL_NAMES)}
        pred_idx   = int(probs.argmax())
        pred_class = LABEL_NAMES[pred_idx]
        confidence = float(probs[pred_idx])

        is_bug   = pred_class != "clean" and confidence >= CONFIDENCE_THRESHOLD
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
        "model_dir":     str(MODEL_DIR),
        "model_exists":  MODEL_DIR.exists(),
        "accuracy":      m.get("accuracy") if m else None,
        "f1_macro":      m.get("f1_macro") if m else None,
        "label_names":   LABEL_NAMES,
        "threshold":     CONFIDENCE_THRESHOLD,
        "message":       (
            f"Ready — {m['accuracy']*100:.1f}% accuracy"
            if m else
            "Model not trained. Run data_collector.py → train_classifier.ipynb"
        ),
    }
