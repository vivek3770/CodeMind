"""
services/code_executor.py
Runs user code safely inside Docker containers.

Safety guarantees:
  --memory=128m      → max 128MB RAM
  --network=none     → no internet access
  --cpus=0.5         → half a CPU core
  --read-only        → filesystem is read-only
  --user=nobody      → non-root user
  timeout=10s        → killed after 10 seconds

Supported languages:
  python     → python:3.11-slim
  javascript → node:20-slim
  java       → openjdk:17-slim (coming soon)
"""

import os
import time
import tempfile
import threading
from pathlib import Path
from typing import Dict, Optional

# ── Docker import with graceful fallback ──────────────────────
try:
    import docker
    DOCKER_AVAILABLE = True
except ImportError:
    DOCKER_AVAILABLE = False

# ── Configuration ──────────────────────────────────────────────
TIMEOUT_SECONDS = int(os.getenv("MAX_EXECUTION_TIMEOUT", "10"))
MEMORY_LIMIT    = "128m"
CPU_QUOTA       = 50000   # 0.5 CPUs (out of 100000)

DOCKER_IMAGES = {
    "python":     "python:3.11-slim",
    "javascript": "node:20-slim",
    "typescript": "node:20-slim",
    "java":       "openjdk:17-slim",
}

FILE_EXTENSIONS = {
    "python":     "py",
    "javascript": "js",
    "typescript": "ts",
    "java":       "java",
}

RUN_COMMANDS = {
    "python":     lambda f: ["python", f],
    "javascript": lambda f: ["node", f],
    "typescript": lambda f: ["node", f],
    "java":       lambda f: ["sh", "-c", f"cd /code && javac Main.java && java Main"],
}

# ── Docker client singleton ────────────────────────────────────
_docker_client = None


def _get_client():
    global _docker_client
    if _docker_client is None and DOCKER_AVAILABLE:
        try:
            _docker_client = docker.from_env()
            _docker_client.ping()
        except Exception:
            _docker_client = None
    return _docker_client


def is_available() -> bool:
    """Check if Docker is running and accessible."""
    return DOCKER_AVAILABLE and _get_client() is not None


def get_status() -> Dict:
    client = _get_client()
    if not DOCKER_AVAILABLE:
        return {
            "available": False,
            "message": "docker Python SDK not installed. Run: pip install docker",
        }
    if client is None:
        return {
            "available": False,
            "message": "Docker Desktop is not running. Start Docker Desktop and try again.",
        }
    try:
        info = client.info()
        return {
            "available":      True,
            "docker_version": info.get("ServerVersion", "unknown"),
            "message":        "Docker is running",
        }
    except Exception as e:
        return {"available": False, "message": str(e)}


def pull_image_if_needed(language: str) -> bool:
    """Pull Docker image if not already present."""
    client = _get_client()
    if not client:
        return False
    image = DOCKER_IMAGES.get(language)
    if not image:
        return False
    try:
        client.images.get(image)
        return True
    except docker.errors.ImageNotFound:
        try:
            client.images.pull(image)
            return True
        except Exception:
            return False


ONLINE_COMPILER_KEY = os.getenv("ONLINE_COMPILER_KEY")
ONLINE_COMPILER_URL = "https://api.onlinecompiler.io/api/run-code-sync/"

ONLINE_COMPILER_LANGUAGES = {
    "python": "python3",
    "javascript": "nodejs",
    "typescript": "typescript",
    "java": "java",
}


def _execute_online_compiler(code: str, language: str) -> Dict:
    """Fallback execution using OnlineCompiler.io when Docker is unavailable."""
    if not ONLINE_COMPILER_KEY:
        return {
            "success":        False,
            "stdout":         "",
            "stderr":         "OnlineCompiler.io API key is not configured.\n\nPlease sign up for a free account at https://api.onlinecompiler.io (gives 1M free runs/month) and add 'ONLINE_COMPILER_KEY' to your environment variables on Render and local .env to enable code execution.",
            "exit_code":      -1,
            "execution_time": 0,
            "timed_out":      False,
            "error":          "API key missing",
            "docker_available": True,  # Prevent terminal error screen
        }

    compiler = ONLINE_COMPILER_LANGUAGES.get(language)
    if not compiler:
        return {
            "success":        False,
            "stdout":         "",
            "stderr":         f"Language '{language}' not supported for serverless execution.",
            "exit_code":      -1,
            "execution_time": 0,
            "timed_out":      False,
            "error":          f"Unsupported language: {language}",
        }

    payload = {
        "compiler": compiler,
        "code": code,
        "input": ""
    }
    headers = {
        "Authorization": f"Bearer {ONLINE_COMPILER_KEY}",
        "Content-Type": "application/json"
    }

    start_time = time.time()
    try:
        with httpx.Client() as client:
            response = client.post(ONLINE_COMPILER_URL, json=payload, headers=headers, timeout=15.0)
        
        elapsed_ms = round((time.time() - start_time) * 1000, 1)

        if response.status_code != 200:
            return {
                "success":        False,
                "stdout":         "",
                "stderr":         f"Serverless execution error: API returned status {response.status_code}\n{response.text}",
                "exit_code":      -1,
                "execution_time": elapsed_ms,
                "timed_out":      False,
                "error":          f"API returned status {response.status_code}",
            }

        result = response.json()
        
        stdout_text = result.get("output", "")
        stderr_text = result.get("error", "")
        status = result.get("status", "success")
        exit_code = result.get("exit_code", 0)

        return {
            "success":        status == "success" and exit_code == 0,
            "stdout":         stdout_text,
            "stderr":         stderr_text,
            "exit_code":      exit_code,
            "execution_time": elapsed_ms,
            "timed_out":      False,
            "error":          None,
            "docker_available": True,
        }
    except Exception as e:
        elapsed_ms = round((time.time() - start_time) * 1000, 1)
        return {
            "success":        False,
            "stdout":         "",
            "stderr":         str(e),
            "exit_code":      -1,
            "execution_time": elapsed_ms,
            "timed_out":      False,
            "error":          str(e),
        }


# ── Main execution function ────────────────────────────────────

def execute_code(code: str, language: str,
                 stdin_input: Optional[str] = None) -> Dict:
    """
    Run code in a Docker container and return the result.
    If Docker is not available (e.g. deployed on Render), fall back to Piston serverless execution.
    """
    if not is_available():
        return _execute_online_compiler(code, language)

    if language not in DOCKER_IMAGES:
        return {
            "success":   False,
            "stdout":    "",
            "stderr":    f"Language '{language}' not supported for execution.",
            "exit_code": -1,
            "execution_time": 0,
            "timed_out": False,
            "error":     f"Unsupported language: {language}",
        }

    client = _get_client()
    ext    = FILE_EXTENSIONS[language]
    image  = DOCKER_IMAGES[language]

    # Pull image if needed (first run only)
    pull_image_if_needed(language)

    # Write code to a temp file
    with tempfile.TemporaryDirectory() as tmpdir:
        # Java needs Main.java specifically
        if language == "java":
            filename = "Main.java"
        else:
            filename = f"solution.{ext}"

        code_path = Path(tmpdir) / filename
        code_path.write_text(code, encoding="utf-8")

        # Build the run command
        if language == "java":
            cmd = "sh -c 'cd /code && javac Main.java 2>&1 && java Main'"
        else:
            cmd = RUN_COMMANDS[language](f"/code/{filename}")

        start_time = time.time()
        container  = None
        timed_out  = False

        try:
            container = client.containers.run(
                image=image,
                command=cmd,
                volumes={tmpdir: {"bind": "/code", "mode": "ro"}},
                mem_limit=MEMORY_LIMIT,
                cpu_quota=CPU_QUOTA,
                network_mode="none",
                user="nobody",
                working_dir="/code",
                stdin_open=stdin_input is not None,
                detach=True,
                remove=False,
                stdout=True,
                stderr=True,
            )

            # Wait with timeout
            def _wait():
                container.wait()

            thread = threading.Thread(target=_wait, daemon=True)
            thread.start()
            thread.join(TIMEOUT_SECONDS)

            if thread.is_alive():
                timed_out = True
                try:
                    container.kill()
                except Exception:
                    pass

            elapsed_ms  = round((time.time() - start_time) * 1000, 1)

            # Get output
            logs        = container.logs(stdout=True, stderr=False)
            err_logs    = container.logs(stdout=False, stderr=True)
            stdout_text = logs.decode("utf-8", errors="replace")
            stderr_text = err_logs.decode("utf-8", errors="replace")

            # Get exit code
            try:
                exit_code = container.wait(timeout=2)["StatusCode"]
            except Exception:
                exit_code = -1 if timed_out else 0

            return {
                "success":        not timed_out and exit_code == 0,
                "stdout":         stdout_text,
                "stderr":         stderr_text,
                "exit_code":      exit_code,
                "execution_time": elapsed_ms,
                "timed_out":      timed_out,
                "error":          f"Timed out after {TIMEOUT_SECONDS}s" if timed_out else None,
            }

        except Exception as e:
            elapsed_ms = round((time.time() - start_time) * 1000, 1)
            return {
                "success":        False,
                "stdout":         "",
                "stderr":         str(e),
                "exit_code":      -1,
                "execution_time": elapsed_ms,
                "timed_out":      False,
                "error":          str(e),
            }
        finally:
            if container:
                try:
                    container.remove(force=True)
                except Exception:
                    pass
