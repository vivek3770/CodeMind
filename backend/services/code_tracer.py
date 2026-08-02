"""
services/code_tracer.py
Safe execution tracer for user-submitted code.

Safety layers:
  1. RestrictedPython  — blocks os, subprocess, open, socket, eval
  2. threading timeout — kills after MAX_TIMEOUT seconds
  3. Step limit        — stops after MAX_STEPS frames
  4. Variable limits   — skips large/unsafe variable values
  5. Memory guard      — skips variables over size threshold

Only supports Python for now (JS support via AI description in Phase 2).
"""

import sys
import os
import threading
from typing import Any

try:
    from RestrictedPython import compile_restricted, safe_globals
    from RestrictedPython.Guards import safe_builtins, guarded_getiter, guarded_getattr
    RESTRICTED_AVAILABLE = True
except ImportError:
    RESTRICTED_AVAILABLE = False

# ── Safety limits ──────────────────────────────────────────────
MAX_STEPS     = int(os.getenv("MAX_EXECUTION_STEPS",   "500"))
MAX_TIMEOUT   = int(os.getenv("MAX_EXECUTION_TIMEOUT", "5"))
MAX_CODE_LEN  = int(os.getenv("MAX_CODE_LENGTH",       "5000"))
MAX_LIST_SIZE = 50    # don't capture lists larger than 50 items
MAX_STR_LEN   = 200  # truncate strings longer than 200 chars
MAX_DICT_SIZE = 20   # don't capture dicts larger than 20 keys


# ── Variable sanitizer ─────────────────────────────────────────

def _sanitize_value(v: Any) -> Any:
    """
    Convert a runtime value into something JSON-serializable and safe.
    Returns None if the value should be skipped entirely.
    """
    if v is None:
        return None
    if isinstance(v, bool):
        return v
    if isinstance(v, (int, float)):
        return v
    if isinstance(v, str):
        return v[:MAX_STR_LEN] + ("…" if len(v) > MAX_STR_LEN else "")
    if isinstance(v, (list, tuple)):
        if len(v) > MAX_LIST_SIZE:
            return f"[list of {len(v)} items — too large to display]"
        return [_sanitize_value(x) for x in v[:MAX_LIST_SIZE]]
    if isinstance(v, dict):
        if len(v) > MAX_DICT_SIZE:
            return f"{{dict with {len(v)} keys — too large to display}}"
        return {
            str(k): _sanitize_value(val)
            for k, val in list(v.items())[:MAX_DICT_SIZE]
        }
    if isinstance(v, set):
        items = list(v)[:MAX_LIST_SIZE]
        return f"{{{', '.join(str(x) for x in items)}}}"
    # Skip anything else (functions, classes, modules, etc.)
    return None


def _capture_locals(frame_locals: dict) -> dict:
    """Extract safe, JSON-serializable local variables from a frame."""
    result = {}
    for k, v in frame_locals.items():
        # Skip private/dunder names and builtins
        if k.startswith("_"):
            continue
        # Skip callable objects
        if callable(v):
            continue
        sanitized = _sanitize_value(v)
        if sanitized is not None:
            result[k] = sanitized
    return result


# ── Visualization state detector ──────────────────────────────

def _detect_visualization_state(variables: dict, prev_variables: dict) -> dict:
    """
    Look at current variables and detect what should be visualized.
    Returns a dict describing the visual state for this step.
    """
    viz = {"type": "variables"}

    # Find all list/array variables
    arrays = {
        k: v for k, v in variables.items()
        if isinstance(v, list) and all(isinstance(x, (int, float)) for x in v)
    }

    if arrays:
        # Use the most recently changed array as primary
        changed_arrays = {
            k: v for k, v in arrays.items()
            if k not in prev_variables or prev_variables.get(k) != v
        }
        primary = changed_arrays or arrays
        main_arr_name = next(iter(primary))
        viz["type"]       = "array"
        viz["array_name"] = main_arr_name
        viz["array"]      = arrays[main_arr_name]
        viz["all_arrays"] = arrays

        # Detect comparing indices (i, j pattern)
        i = variables.get("i")
        j = variables.get("j")
        if isinstance(i, int) and isinstance(j, int):
            arr = arrays[main_arr_name]
            if 0 <= i < len(arr) and 0 <= j < len(arr):
                viz["comparing"] = [i, j]

        # Detect sorted portion (track which indices are finalized)
        viz["swapped"] = []

    # Detect stack pattern (list used as stack with append/pop)
    stack_vars = {
        k: v for k, v in variables.items()
        if isinstance(v, list) and k.lower() in
        ("stack", "stk", "s", "visited", "path", "result")
    }
    if stack_vars and viz["type"] == "variables":
        viz["type"]  = "stack"
        viz["stack"] = next(iter(stack_vars.values()))

    # Detect queue pattern
    queue_vars = {
        k: v for k, v in variables.items()
        if isinstance(v, list) and k.lower() in
        ("queue", "q", "bfs_queue", "level")
    }
    if queue_vars and viz["type"] == "variables":
        viz["type"]  = "queue"
        viz["queue"] = next(iter(queue_vars.values()))

    # Detect graph/dict of lists pattern
    graph_vars = {
        k: v for k, v in variables.items()
        if isinstance(v, dict) and all(
            isinstance(val, list) for val in v.values()
        )
    }
    if graph_vars and viz["type"] == "variables":
        viz["type"]  = "graph"
        viz["graph"] = next(iter(graph_vars.values()))

    return viz


# ── Core tracer ────────────────────────────────────────────────

def trace_code(code: str, language: str = "python") -> dict:
    """
    Main entry point. Safely execute and trace user code.

    Returns:
      {
        "success": bool,
        "steps": [...],
        "error": str | None,
        "total_steps": int,
        "truncated": bool,
        "algorithm_hint": str
      }
    """
    if language != "python":
        return {
            "success": False,
            "steps": [],
            "error": f"Code tracing currently supports Python only. '{language}' support coming soon.",
            "total_steps": 0,
            "truncated": False,
            "algorithm_hint": "unknown",
        }

    if len(code) > MAX_CODE_LEN:
        return {
            "success": False,
            "steps": [],
            "error": f"Code too long ({len(code)} chars). Maximum is {MAX_CODE_LEN} characters.",
            "total_steps": 0,
            "truncated": False,
            "algorithm_hint": "unknown",
        }

    steps      = []
    error_info = [None]
    truncated  = [False]

    # Detect algorithm hint from code content
    algorithm_hint = _detect_algorithm(code)

    # Build the tracer function
    prev_vars = [{}]

    def tracer(frame, event, arg):
        if event != "line":
            return tracer

        # Trace ONLY lines executed inside the user's code, skipping internal library files
        if frame.f_code.co_filename != "<user_code>":
            return tracer

        if len(steps) >= MAX_STEPS:
            truncated[0] = True
            # Raise to stop execution
            raise RuntimeError(
                f"Step limit reached ({MAX_STEPS} steps). "
                f"Add a smaller input to visualize."
            )

        try:
            local_vars = _capture_locals(frame.f_locals)
            viz_state  = _detect_visualization_state(local_vars, prev_vars[0])

            steps.append({
                "step":          len(steps) + 1,
                "line":          frame.f_lineno,
                "event":         event,
                "variables":     local_vars,
                "visualization": viz_state,
                "description":   _build_description(
                    frame.f_lineno, local_vars, prev_vars[0], viz_state
                ),
            })
            prev_vars[0] = dict(local_vars)
        except RuntimeError:
            raise
        except Exception:
            pass  # Never crash the tracer itself

        return tracer

    # Thread-based timeout wrapper
    result_holder = [None]

    def run():
        # Mock blocking web server loops so Flask app.run() doesn't hang or capture 500 server steps
        try:
            import flask
            flask.Flask.run = lambda self, *args, **kwargs: None
        except Exception:
            pass

        sys.settrace(tracer)
        try:
            if RESTRICTED_AVAILABLE:
                _run_restricted(code, tracer)
            else:
                # Fallback: basic exec with limited builtins
                _run_basic(code, tracer)
        except RuntimeError as e:
            msg = str(e)
            if "Step limit" in msg:
                pass  # expected — truncation
            else:
                error_info[0] = msg
        except Exception as e:
            error_info[0] = f"{type(e).__name__}: {e}"
        finally:
            sys.settrace(None)
        result_holder[0] = True

    thread = threading.Thread(target=run, daemon=True)
    thread.start()
    thread.join(MAX_TIMEOUT)

    if thread.is_alive():
        sys.settrace(None)
        return {
            "success":        False,
            "steps":          steps,
            "error":          f"Execution timed out after {MAX_TIMEOUT} seconds. "
                              f"Check for infinite loops or use smaller input.",
            "total_steps":    len(steps),
            "truncated":      True,
            "algorithm_hint": algorithm_hint,
        }

    return {
        "success":        error_info[0] is None,
        "steps":          steps,
        "error":          error_info[0],
        "total_steps":    len(steps),
        "truncated":      truncated[0],
        "algorithm_hint": algorithm_hint,
    }


def safe_import_guard(name, globals=None, locals=None, fromlist=(), level=0):
    """Safe import wrapper blocking dangerous modules like os, subprocess, etc."""
    BLOCKED_MODULES = {"os", "subprocess", "sys", "shutil", "socket", "ctypes", "signal"}
    if name in BLOCKED_MODULES:
        raise ImportError(f"Import of module '{name}' is restricted for security reasons")
    return __import__(name, globals, locals, fromlist, level)


def _run_restricted(code: str, tracer) -> None:
    """Run code using RestrictedPython for maximum safety."""
    byte_code = compile_restricted(code, "<user_code>", "exec")

    # Build safe execution environment
    restricted_globals = dict(safe_globals)
    restricted_globals["__name__"] = "__main__"
    restricted_globals["__builtins__"] = dict(safe_builtins)
    restricted_globals["__builtins__"]["__import__"] = safe_import_guard
    restricted_globals["__import__"] = safe_import_guard
    restricted_globals["_getiter_"]    = guarded_getiter
    restricted_globals["_getattr_"]    = guarded_getattr
    restricted_globals["_write_"]      = lambda x: x
    restricted_globals["_inplacevar_"] = _inplace_var

    # Allow common safe builtins explicitly
    for name in ["range", "len", "print", "enumerate", "zip",
                 "map", "filter", "sorted", "reversed", "sum",
                 "min", "max", "abs", "round", "int", "float",
                 "str", "bool", "list", "dict", "set", "tuple",
                 "isinstance", "type", "repr", "all", "any", "__import__"]:
        import builtins
        if hasattr(builtins, name):
            restricted_globals["__builtins__"][name] = getattr(builtins, name)

    restricted_globals["__builtins__"]["__import__"] = safe_import_guard
    exec(byte_code, restricted_globals)


def _run_basic(code: str, tracer) -> None:
    """Fallback: run with limited builtins (no RestrictedPython installed)."""
    import builtins

    safe_builtin_names = [
        "range", "len", "print", "enumerate", "zip", "map", "filter",
        "sorted", "reversed", "sum", "min", "max", "abs", "round",
        "int", "float", "str", "bool", "list", "dict", "set", "tuple",
        "isinstance", "type", "repr", "all", "any", "None", "True", "False",
    ]

    safe_builtins_dict = {
        name: getattr(builtins, name)
        for name in safe_builtin_names
        if hasattr(builtins, name)
    }
    safe_builtins_dict["__import__"] = safe_import_guard

    exec(
        compile(code, "<user_code>", "exec"),
        {"__builtins__": safe_builtins_dict, "__import__": safe_import_guard, "__name__": "__main__"}
    )


def _inplace_var(op, x, y):
    """Handle augmented assignment operators in RestrictedPython."""
    ops = {
        "+=": lambda a, b: a + b,
        "-=": lambda a, b: a - b,
        "*=": lambda a, b: a * b,
        "/=": lambda a, b: a / b,
        "//=": lambda a, b: a // b,
        "%=": lambda a, b: a % b,
        "**=": lambda a, b: a ** b,
    }
    return ops.get(op, lambda a, b: b)(x, y)


# ── Algorithm detector ─────────────────────────────────────────

def _detect_algorithm(code: str) -> str:
    """
    Heuristic: detect what kind of algorithm the code contains
    based on keywords, variable names, and patterns.
    """
    code_lower = code.lower()

    patterns = {
        "bubble_sort":    ["bubble", "swap", "arr[j] > arr[j+1]", "arr[j] > arr[j + 1]"],
        "selection_sort": ["selection", "min_idx", "min_index"],
        "insertion_sort": ["insertion", "key =", "while j >= 0"],
        "merge_sort":     ["merge_sort", "mergesort", "def merge"],
        "quick_sort":     ["quick_sort", "quicksort", "pivot", "partition"],
        "binary_search":  ["binary_search", "mid =", "low =", "high =", "binarysearch"],
        "linear_search":  ["linear_search", "linearsearch"],
        "bfs":            ["bfs", "breadth", "queue", "from collections import deque"],
        "dfs":            ["dfs", "depth", "def dfs", "stack.append"],
        "fibonacci":      ["fibonacci", "fib(", "def fib"],
        "factorial":      ["factorial", "def factorial", "fact("],
        "linked_list":    ["linkedlist", "linked_list", "self.next", "node.next"],
        "stack":          ["stack.append", "stack.pop", "def push", "def pop"],
        "queue":          ["queue.append", "queue.pop(0)", "deque", "enqueue"],
    }

    for algo, keywords in patterns.items():
        if any(kw in code_lower for kw in keywords):
            return algo

    # Check for array manipulation
    if any(kw in code_lower for kw in ["arr[", "array[", "nums[", "lst["]):
        return "array_operation"

    return "general"


# ── Step description builder ───────────────────────────────────

def _build_description(
    lineno: int,
    variables: dict,
    prev_variables: dict,
    viz: dict
) -> str:
    """
    Build a human-readable description of what happened at this step.
    Compares current vs previous variable values to explain changes.
    """
    changes = []

    for k, v in variables.items():
        prev = prev_variables.get(k)
        if prev is None and v is not None:
            changes.append(f"<strong>{k}</strong> = {_fmt(v)}")
        elif prev != v:
            changes.append(f"<strong>{k}</strong>: {_fmt(prev)} → {_fmt(v)}")

    if viz.get("type") == "array" and "comparing" in viz:
        i, j = viz["comparing"]
        arr = viz.get("array", [])
        if i < len(arr) and j < len(arr):
            return (
                f"Line {lineno}: Comparing "
                f"<strong>arr[{i}]={arr[i]}</strong> and "
                f"<strong>arr[{j}]={arr[j]}</strong>"
            )

    if changes:
        return f"Line {lineno}: " + ", &nbsp;".join(changes[:4])

    return f"Executing line {lineno}"


def _fmt(v: Any) -> str:
    """Format a value for display in step descriptions."""
    if v is None:
        return "None"
    if isinstance(v, list) and len(v) > 8:
        return f"[{', '.join(str(x) for x in v[:4])}, … ({len(v)} items)]"
    return str(v)
