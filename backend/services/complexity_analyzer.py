"""
services/complexity_analyzer.py
Static code analysis — no AI, no API call, instant results.

Metrics computed:
  - Cyclomatic complexity per function (Radon)
  - Maintainability index (Radon)
  - Cognitive complexity (AST traversal)
  - Max nesting depth (AST traversal)
  - Lines of code, blank lines, comment lines
"""

import ast
import re
from typing import Optional

try:
    import radon.complexity as radon_cc
    import radon.metrics as radon_metrics
    RADON_AVAILABLE = True
except ImportError:
    RADON_AVAILABLE = False


# ── Rank helpers ───────────────────────────────────────────────

def _cc_rank(score: int) -> str:
    """Cyclomatic complexity rank: A=best, F=worst."""
    if score <= 5:   return "A"
    if score <= 10:  return "B"
    if score <= 15:  return "C"
    if score <= 20:  return "D"
    if score <= 25:  return "E"
    return "F"


def _rank_color(rank: str) -> str:
    if rank in ("A", "B"): return "green"
    if rank in ("C", "D"): return "yellow"
    return "red"


# ── Cognitive complexity (AST-based) ──────────────────────────

NESTING_NODES = (ast.If, ast.For, ast.While, ast.Try,
                 ast.ExceptHandler, ast.With, ast.AsyncFor,
                 ast.AsyncWith)

STRUCTURAL_NODES = (ast.If, ast.For, ast.While, ast.Try,
                    ast.ExceptHandler, ast.With, ast.AsyncFor,
                    ast.AsyncWith, ast.ListComp, ast.SetComp,
                    ast.DictComp, ast.GeneratorExp)


def _cognitive_complexity(node: ast.AST, depth: int = 0) -> int:
    """
    Approximate cognitive complexity:
    +1 for each structural element
    +extra for nesting depth
    """
    score = 0
    for child in ast.iter_child_nodes(node):
        if isinstance(child, STRUCTURAL_NODES):
            score += 1 + depth          # base + nesting penalty
            score += _cognitive_complexity(child, depth + 1)
        elif isinstance(child, ast.BoolOp):
            score += len(child.values) - 1  # each and/or adds complexity
        else:
            score += _cognitive_complexity(child, depth)
    return score


# ── Max nesting depth ──────────────────────────────────────────

def _max_nesting_depth(tree: ast.AST) -> int:
    max_depth = [0]

    def walk(node, depth):
        max_depth[0] = max(max_depth[0], depth)
        for child in ast.iter_child_nodes(node):
            if isinstance(child, NESTING_NODES):
                walk(child, depth + 1)
            else:
                walk(child, depth)

    walk(tree, 0)
    return max_depth[0]


# ── Line counters ──────────────────────────────────────────────

def _count_lines(code: str) -> dict:
    lines       = code.splitlines()
    total       = len(lines)
    blank       = sum(1 for l in lines if not l.strip())
    comments    = sum(1 for l in lines if l.strip().startswith("#"))
    code_lines  = total - blank - comments
    return {
        "total":    total,
        "code":     code_lines,
        "blank":    blank,
        "comments": comments,
    }


# ── Python analyzer ────────────────────────────────────────────

def analyze_python(code: str) -> dict:
    """Full analysis for Python code."""
    result = {
        "language":    "python",
        "functions":   [],
        "file_metrics": {},
        "error":       None,
    }

    try:
        tree = ast.parse(code)
    except SyntaxError as e:
        result["error"] = f"Syntax error: {e}"
        return result

    line_counts = _count_lines(code)
    max_depth   = _max_nesting_depth(tree)

    # ── Per-function metrics ───────────────────────────────────
    func_metrics = []

    if RADON_AVAILABLE:
        try:
            cc_results = radon_cc.cc_visit(code)
            for func in cc_results:
                cog = _cognitive_complexity(tree)
                rank = _cc_rank(func.complexity)
                func_metrics.append({
                    "name":        func.name,
                    "line":        func.lineno,
                    "cyclomatic":  func.complexity,
                    "cognitive":   cog,
                    "rank":        rank,
                    "color":       _rank_color(rank),
                    "end_line":    getattr(func, "endline", func.lineno),
                })
        except Exception:
            pass
    else:
        # Fallback: AST-only cyclomatic approximation
        for node in ast.walk(tree):
            if isinstance(node, (ast.FunctionDef, ast.AsyncFunctionDef)):
                # Count decision points
                decisions = sum(
                    1 for child in ast.walk(node)
                    if isinstance(child, (ast.If, ast.For, ast.While,
                                         ast.ExceptHandler, ast.With,
                                         ast.BoolOp, ast.ListComp))
                )
                cc = decisions + 1
                cog = _cognitive_complexity(node)
                rank = _cc_rank(cc)
                func_metrics.append({
                    "name":       node.name,
                    "line":       node.lineno,
                    "cyclomatic": cc,
                    "cognitive":  cog,
                    "rank":       rank,
                    "color":      _rank_color(rank),
                    "end_line":   getattr(node, "end_lineno", node.lineno),
                })

    result["functions"] = func_metrics

    # ── File-level metrics ─────────────────────────────────────
    mi_score = None
    if RADON_AVAILABLE:
        try:
            mi_score = round(radon_metrics.mi_visit(code, multi=True), 1)
        except Exception:
            pass

    # Overall rank based on worst function
    worst_cc   = max((f["cyclomatic"] for f in func_metrics), default=1)
    file_rank  = _cc_rank(worst_cc)

    result["file_metrics"] = {
        "maintainability_index": mi_score,
        "max_nesting_depth":     max_depth,
        "overall_rank":          file_rank,
        "overall_color":         _rank_color(file_rank),
        "lines":                 line_counts,
        "function_count":        len(func_metrics),
        "radon_available":       RADON_AVAILABLE,
    }

    return result


# ── JavaScript analyzer (regex-based) ─────────────────────────

def analyze_javascript(code: str) -> dict:
    """Basic analysis for JavaScript/TypeScript using regex."""
    func_pattern = re.compile(
        r'(?:function\s+(\w+)|(?:const|let|var)\s+(\w+)\s*=\s*'
        r'(?:async\s+)?(?:function|\([^)]*\)\s*=>|\w+\s*=>))',
        re.MULTILINE
    )

    lines      = code.splitlines()
    functions  = []

    for i, line in enumerate(lines, 1):
        m = func_pattern.search(line)
        if m:
            name = m.group(1) or m.group(2) or "anonymous"
            # Count nesting via braces in surrounding context
            snippet  = "\n".join(lines[max(0, i-1):min(len(lines), i+30)])
            nesting  = max(snippet[:200].count("{") - snippet[:200].count("}"), 0)
            cc       = nesting + 1
            rank     = _cc_rank(cc)
            functions.append({
                "name":       name,
                "line":       i,
                "cyclomatic": cc,
                "cognitive":  cc,
                "rank":       rank,
                "color":      _rank_color(rank),
                "end_line":   i + 20,
            })

    line_counts = _count_lines(code)
    worst_cc    = max((f["cyclomatic"] for f in functions), default=1)
    file_rank   = _cc_rank(worst_cc)

    return {
        "language": "javascript",
        "functions": functions,
        "file_metrics": {
            "maintainability_index": None,
            "max_nesting_depth":     code.count("{"),
            "overall_rank":          file_rank,
            "overall_color":         _rank_color(file_rank),
            "lines":                 line_counts,
            "function_count":        len(functions),
            "radon_available":       False,
        },
        "error": None,
    }


# ── Main entry point ───────────────────────────────────────────

def analyze_code(code: str, language: str) -> dict:
    """
    Dispatch to the correct analyzer based on language.
    Always returns a safe dict — never raises.
    """
    try:
        if language in ("python",):
            return analyze_python(code)
        elif language in ("javascript", "typescript"):
            return analyze_javascript(code)
        else:
            return {
                "language":    language,
                "functions":   [],
                "file_metrics": {
                    "lines": _count_lines(code),
                    "overall_rank": "A",
                    "overall_color": "green",
                },
                "error": f"Complexity analysis not yet supported for {language}",
            }
    except Exception as e:
        return {
            "language":    language,
            "functions":   [],
            "file_metrics": {},
            "error":       str(e),
        }
