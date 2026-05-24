/**
 * hooks/useCodeVisualizer.js
 * Manages all state for the code visualizer:
 *   - API call to /api/visualize
 *   - Playback (play/pause/step/speed)
 *   - Current frame
 *   - Monaco line highlighting
 */
import { useState, useEffect, useRef, useCallback } from 'react'

const API_BASE = import.meta.env.VITE_API_URL ? `${import.meta.env.VITE_API_URL}/api` : 'http://127.0.0.1:8000/api'

export function useCodeVisualizer(editorRef, monacoRef) {
  const [steps,        setSteps]        = useState([])
  const [frameIdx,     setFrameIdx]     = useState(0)
  const [playing,      setPlaying]      = useState(false)
  const [loading,      setLoading]      = useState(false)
  const [error,        setError]        = useState(null)
  const [truncated,    setTruncated]    = useState(false)
  const [algoHint,     setAlgoHint]     = useState('')
  const [speed,        setSpeed]        = useState(3)   // 1–5

  const intervalRef   = useRef(null)
  const decorationsRef = useRef([])

  const speedMs = [800, 500, 300, 150, 60][speed - 1]

  // ── Fetch trace from backend ──────────────────────────────
  const runVisualize = useCallback(async (code, language) => {
    if (!code?.trim()) return

    setLoading(true)
    setError(null)
    setSteps([])
    setFrameIdx(0)
    setPlaying(false)
    clearHighlight()

    try {
      const res = await fetch(`${API_BASE}/visualize`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code, language }),
      })

      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        throw new Error(err.detail ?? `HTTP ${res.status}`)
      }

      const data = await res.json()

      if (!data.success && data.steps.length === 0) {
        setError(data.error ?? 'Visualization failed')
      } else {
        setSteps(data.steps)
        setAlgoHint(data.algorithm_hint ?? '')
        setTruncated(data.truncated ?? false)
        if (data.error) setError(data.error)
        // Auto-play
        setFrameIdx(0)
        setTimeout(() => setPlaying(true), 300)
      }
    } catch (e) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }, []) // eslint-disable-line

  // ── Playback ──────────────────────────────────────────────
  useEffect(() => {
    if (playing && steps.length > 0) {
      intervalRef.current = setInterval(() => {
        setFrameIdx(prev => {
          if (prev >= steps.length - 1) {
            setPlaying(false)
            return prev
          }
          return prev + 1
        })
      }, speedMs)
    }
    return () => clearInterval(intervalRef.current)
  }, [playing, speedMs, steps.length])

  // ── Highlight current line in Monaco ──────────────────────
  useEffect(() => {
    const editor = editorRef?.current
    const monaco = monacoRef?.current
    if (!editor || !monaco || !steps.length) return

    const step = steps[frameIdx]
    if (!step) return

    highlightLine(editor, monaco, step.line)
  }, [frameIdx, steps, editorRef, monacoRef])

  function highlightLine(editor, monaco, lineNumber) {
    // Clear previous decorations
    decorationsRef.current = editor.deltaDecorations(
      decorationsRef.current,
      [{
        range: new monaco.Range(lineNumber, 1, lineNumber, 1),
        options: {
          isWholeLine: true,
          className: 'viz-line-highlight',
          glyphMarginClassName: 'viz-gutter-dot',
          overviewRuler: {
            color: '#00ff9d',
            position: monaco.editor.OverviewRulerLane.Left,
          },
        },
      }]
    )

    // Scroll to the highlighted line
    editor.revealLineInCenterIfOutsideViewport(lineNumber)
  }

  function clearHighlight() {
    const editor = editorRef?.current
    if (!editor) return
    decorationsRef.current = editor.deltaDecorations(decorationsRef.current, [])
  }

  // ── Controls ──────────────────────────────────────────────
  const togglePlay = () => {
    if (frameIdx >= steps.length - 1) {
      setFrameIdx(0)
      setPlaying(true)
    } else {
      setPlaying(p => !p)
    }
  }

  const stepBack = () => {
    setPlaying(false)
    setFrameIdx(i => Math.max(0, i - 1))
  }

  const stepFwd = () => {
    setPlaying(false)
    setFrameIdx(i => Math.min(steps.length - 1, i + 1))
  }

  const reset = () => {
    setPlaying(false)
    setFrameIdx(0)
  }

  const clear = () => {
    setSteps([])
    setFrameIdx(0)
    setPlaying(false)
    setError(null)
    setAlgoHint('')
    clearHighlight()
  }

  const currentStep     = steps[frameIdx] ?? null
  const prevStep        = steps[frameIdx - 1] ?? null
  const progressPercent = steps.length > 1
    ? (frameIdx / (steps.length - 1)) * 100
    : 0

  return {
    // State
    steps, frameIdx, playing, loading, error,
    truncated, algoHint, speed,
    currentStep, prevStep, progressPercent,
    // Actions
    runVisualize,
    togglePlay, stepBack, stepFwd, reset, clear,
    setSpeed,
  }
}
