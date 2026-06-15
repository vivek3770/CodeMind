/**
 * Terminal/Terminal.jsx
 * Resizable terminal panel below the Monaco editor.
 * Runs code in a Docker sandbox via POST /api/run.
 *
 * Features:
 *   - ▶ Run button (also in TopBar)
 *   - Shows stdout (green-tinted), stderr (red), exit code, time
 *   - Docker-not-available state with install instructions
 *   - Drag top edge to resize height (120px–500px)
 *   - Clear button
 */
import React, { useState, useRef, useEffect, useCallback } from 'react'
import styles from './Terminal.module.css'
import API_BASE from '../../config/api'

const API = API_BASE

const LANG_LABELS = {
  python:     'python',
  javascript: 'node',
  typescript: 'node',
  java:       'java',
}

export default function Terminal({
  code,
  language,
  visible,
  height,
  onHeightChange,
}) {
  const [output,       setOutput]       = useState(null)
  const [running,      setRunning]      = useState(false)
  const [dockerStatus, setDockerStatus] = useState(null)  // null | {available, message}
  const outputRef = useRef(null)

  // Check Docker availability on mount
  useEffect(() => {
    fetch(`${API}/run/status`)
      .then(r => r.json())
      .then(d => setDockerStatus(d))
      .catch(() => setDockerStatus({ available: false, message: 'Backend not reachable' }))
  }, [])

  // Auto-scroll output to bottom
  useEffect(() => {
    if (outputRef.current) {
      outputRef.current.scrollTop = outputRef.current.scrollHeight
    }
  }, [output])

  // ── Run code ────────────────────────────────────────────────
  const runCode = useCallback(async () => {
    if (!code?.trim() || running) return
    setRunning(true)
    setOutput(null)

    try {
      const res = await fetch(`${API}/run`, {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ code, language }),
      })
      const data = await res.json()
      setOutput(data)

      // Refresh Docker status if it changed
      if (!data.docker_available) {
        setDockerStatus({ available: false, message: data.error })
      }
    } catch (e) {
      setOutput({
        success:   false,
        stdout:    '',
        stderr:    e.message,
        exit_code: -1,
        execution_time: 0,
        timed_out: false,
        error:     e.message,
        docker_available: false,
      })
    } finally {
      setRunning(false)
    }
  }, [code, language, running])

  // Expose runCode globally so TopBar can call it
  useEffect(() => {
    window.__terminalRun = runCode
    return () => { delete window.__terminalRun }
  }, [runCode])

  // ── Resize logic ────────────────────────────────────────────
  const dragStart  = useRef(null)
  const heightStart = useRef(null)
  const isDragging = useRef(false)

  const onMouseDown = (e) => {
    e.preventDefault()
    isDragging.current  = true
    dragStart.current   = e.clientY
    heightStart.current = height
  }

  useEffect(() => {
    const onMove = (e) => {
      if (!isDragging.current) return
      const delta   = dragStart.current - e.clientY
      const newH    = Math.max(80, Math.min(500, heightStart.current + delta))
      onHeightChange?.(newH)
    }
    const onUp = () => { isDragging.current = false }
    window.addEventListener('mousemove', onMove)
    window.addEventListener('mouseup',   onUp)
    return () => {
      window.removeEventListener('mousemove', onMove)
      window.removeEventListener('mouseup',   onUp)
    }
  }, [onHeightChange])

  if (!visible) return null

  const cmd = LANG_LABELS[language] ?? language

  // ── Status dot ──────────────────────────────────────────────
  const dotCls = running ? styles.running
               : output?.success === false ? styles.error
               : output ? styles.dot
               : styles.idle

  return (
    <div className={styles.terminal} style={{ height }}>
      {/* Drag handle */}
      <div className={styles.resizeHandle} onMouseDown={onMouseDown} />

      {/* Header */}
      <div className={styles.header}>
        <div className={styles.title}>
          <div className={`${styles.dot} ${dotCls}`} />
          Terminal
          <span style={{ color: 'var(--tx3)', fontWeight: 400, marginLeft: 4 }}>
            — {cmd}
          </span>
        </div>

        <div className={styles.headerRight}>
          {/* Clear */}
          {output && (
            <button className={styles.iconBtn}
              onClick={() => setOutput(null)} title="Clear">
              🗑
            </button>
          )}

          {/* Run / Stop */}
          {running ? (
            <button className={styles.stopBtn} disabled title="Running…">
              <div className={styles.miniSpinner} />
              Running…
            </button>
          ) : (
            <button className={styles.runBtn}
              onClick={runCode}
              disabled={!code?.trim()}
              title="Run code (Docker sandbox)">
              ▶ Run
            </button>
          )}
        </div>
      </div>

      {/* Output area */}
      <div className={styles.output} ref={outputRef}>

        {/* Idle state */}
        {!running && !output && (
          <div className={styles.idle}>
            Click ▶ Run to execute your code in a Docker sandbox.
          </div>
        )}

        {/* Running indicator */}
        {running && (
          <div className={styles.runningLine}>
            <div className={styles.miniSpinner} />
            Executing in Docker sandbox…
          </div>
        )}

        {/* Docker not available */}
        {!running && output && !output.docker_available && (
          <div className={styles.dockerMissing}>
            <div className={styles.dockerMissingTitle}>
              ⚠️ Docker not available
            </div>
            <div className={styles.dockerMissingText}>
              {output.error || 'Docker Desktop is not running.'}
              <br />
              Start Docker Desktop, then try again. Or install it:
              <code className={styles.dockerMissingCode}>
                https://www.docker.com/products/docker-desktop
              </code>
              Also install the Python SDK:
              <code className={styles.dockerMissingCode}>
                pip install docker
              </code>
            </div>
          </div>
        )}

        {/* Actual output */}
        {!running && output && output.docker_available !== false && (
          <>
            {/* Prompt line */}
            <div className={styles.promptLine}>
              $ {cmd} {language === 'python' ? 'solution.py' : 'solution.js'}
            </div>

            {/* Stdout */}
            {output.stdout && (
              <div className={styles.stdout}>{output.stdout}</div>
            )}

            {/* Stderr */}
            {output.stderr && (
              <div className={styles.stderr}>{output.stderr}</div>
            )}

            {/* Timeout */}
            {output.timed_out && (
              <div className={styles.timeoutMsg}>
                ⏱ Process killed — timed out after 10 seconds
              </div>
            )}

            {/* Exit info */}
            <div className={styles.exitInfo}>
              <span className={output.exit_code === 0 ? styles.exitOk : styles.exitErr}>
                {output.exit_code === 0 ? '✓ Exited 0' : `✗ Exited ${output.exit_code}`}
              </span>
              <span className={styles.execTime}>
                {output.execution_time}ms
              </span>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
