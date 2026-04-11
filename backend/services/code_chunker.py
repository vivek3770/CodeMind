"""
services/code_chunker.py
Splits source code into meaningful chunks (by function/class)
for embedding and vector search.

Each chunk:
  { content, function_name, start_line, end_line, language }
"""

import ast
import re
from typing import List, Dict


def _make_chunk(content: str, name: str, start: int,
                end: int, language: str) -> Dict:
    return {
        "content":       content.strip(),
        "function_name": name,
        "start_line":    start,
        "end_line":      end,
        "language":      language,
    }


# ── Python chunker (AST-based) ─────────────────────────────────

def chunk_python(code: str) -> List[Dict]:
    """
    Split Python code at FunctionDef and ClassDef boundaries.
    Falls back to treating the whole file as one chunk if no
    functions are found.
    """
    chunks = []
    lines  = code.splitlines()

    try:
        tree = ast.parse(code)
    except SyntaxError:
        return [_make_chunk(code, "module", 1, len(lines), "python")]

    top_level = [
        node for node in ast.iter_child_nodes(tree)
        if isinstance(node, (ast.FunctionDef, ast.AsyncFunctionDef,
                              ast.ClassDef))
    ]

    if not top_level:
        return [_make_chunk(code, "module", 1, len(lines), "python")]

    for node in top_level:
        start = node.lineno
        end   = getattr(node, "end_lineno", node.lineno)
        chunk_lines = lines[start - 1:end]
        content = "\n".join(chunk_lines)

        if isinstance(node, ast.ClassDef):
            # Also add individual methods within the class
            chunks.append(_make_chunk(content, node.name, start, end, "python"))
            for child in ast.iter_child_nodes(node):
                if isinstance(child, (ast.FunctionDef, ast.AsyncFunctionDef)):
                    cs = child.lineno
                    ce = getattr(child, "end_lineno", child.lineno)
                    method_lines = lines[cs - 1:ce]
                    chunks.append(_make_chunk(
                        "\n".join(method_lines),
                        f"{node.name}.{child.name}",
                        cs, ce, "python"
                    ))
        else:
            chunks.append(_make_chunk(content, node.name, start, end, "python"))

    return chunks if chunks else [
        _make_chunk(code, "module", 1, len(lines), "python")
    ]


# ── JavaScript / TypeScript chunker (regex-based) ─────────────

_JS_FUNC_RE = re.compile(
    r'(?:^|\n)'
    r'(?:export\s+)?'
    r'(?:async\s+)?'
    r'(?:'
    r'function\s+(\w+)\s*\('         # function name(
    r'|(?:const|let|var)\s+(\w+)\s*=\s*(?:async\s+)?(?:function\s*)?\('  # const name = (async)? function?(
    r'|(?:const|let|var)\s+(\w+)\s*=\s*(?:async\s+)?\w*\s*=>'            # const name = ... =>
    r'|class\s+(\w+)'                # class Name
    r')',
    re.MULTILINE
)


def chunk_javascript(code: str) -> List[Dict]:
    """
    Split JS/TS code at function and class boundaries using regex.
    Uses brace counting to find function end.
    """
    lines   = code.splitlines()
    chunks  = []
    matches = list(_JS_FUNC_RE.finditer(code))

    if not matches:
        return [_make_chunk(code, "module", 1, len(lines), "javascript")]

    for i, match in enumerate(matches):
        name = (match.group(1) or match.group(2) or
                match.group(3) or match.group(4) or "anonymous")

        start_char = match.start()
        start_line = code[:start_char].count("\n") + 1

        # Find the function end by counting braces
        depth     = 0
        found_open = False
        end_char   = len(code)

        for j, ch in enumerate(code[start_char:], start_char):
            if ch == "{":
                depth += 1
                found_open = True
            elif ch == "}" and found_open:
                depth -= 1
                if depth == 0:
                    end_char = j + 1
                    break

        end_line = code[:end_char].count("\n") + 1
        content  = code[start_char:end_char]

        chunks.append(_make_chunk(content, name, start_line,
                                  end_line, "javascript"))

    return chunks


# ── Main entry point ───────────────────────────────────────────

def chunk_code(code: str, language: str) -> List[Dict]:
    """
    Dispatch to correct chunker.
    Always returns at least one chunk.
    """
    if not code.strip():
        return []

    try:
        if language == "python":
            return chunk_python(code)
        elif language in ("javascript", "typescript"):
            return chunk_javascript(code)
        else:
            # Generic fallback: whole file as one chunk
            lines = code.splitlines()
            return [_make_chunk(code, "module", 1, len(lines), language)]
    except Exception:
        lines = code.splitlines()
        return [_make_chunk(code, "module", 1, len(lines), language)]
