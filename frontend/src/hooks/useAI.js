/**
 * hooks/useAI.js
 * Handles all communication with the FastAPI backend AI endpoints.
 * Returns loading state, results, and action functions.
 */
import { useState, useCallback } from 'react'

const API_BASE = 'http://127.0.0.1:8000/api'

async function post(endpoint, body) {
  const res = await fetch(`${API_BASE}${endpoint}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error(err.detail ?? `HTTP ${res.status}`)
  }
  return res.json()
}

export function useAI() {
  const [loading, setLoading]       = useState(false)
  const [loadingAction, setLoadingAction] = useState(null) // 'review'|'explain'|'fix'|'tests'
  const [reviewResult, setReviewResult]   = useState(null)
  const [outputResult, setOutputResult]   = useState(null) // { type, content }
  const [error, setError]           = useState(null)

  const reset = () => {
    setError(null)
    setOutputResult(null)
  }

  const reviewCode = useCallback(async (code, language, filename) => {
    reset()
    setLoading(true)
    setLoadingAction('review')
    try {
      const result = await post('/review', { code, language, filename })
      setReviewResult(result)
    } catch (e) {
      setError(e.message)
    } finally {
      setLoading(false)
      setLoadingAction(null)
    }
  }, [])

  const explainCode = useCallback(async (code, language) => {
    reset()
    setLoading(true)
    setLoadingAction('explain')
    try {
      const result = await post('/explain', { code, language })
      setOutputResult({ type: 'explain', content: result.explanation })
    } catch (e) {
      setError(e.message)
    } finally {
      setLoading(false)
      setLoadingAction(null)
    }
  }, [])

  const fixCode = useCallback(async (code, language) => {
    reset()
    setLoading(true)
    setLoadingAction('fix')
    try {
      const result = await post('/fix', { code, language })
      setOutputResult({ type: 'fix', content: result.fixed_code, changes: result.changes })
    } catch (e) {
      setError(e.message)
    } finally {
      setLoading(false)
      setLoadingAction(null)
    }
  }, [])

  const generateTests = useCallback(async (code, language, filename) => {
    reset()
    setLoading(true)
    setLoadingAction('tests')
    try {
      const result = await post('/tests', { code, language, filename })
      setOutputResult({
        type: 'tests',
        content: result.test_code,
        framework: result.framework,
        filename: result.filename,
      })
    } catch (e) {
      setError(e.message)
    } finally {
      setLoading(false)
      setLoadingAction(null)
    }
  }, [])

  const clearReview = useCallback(() => {
    setReviewResult(null)
    setOutputResult(null)
    setError(null)
  }, [])

  return {
    loading,
    loadingAction,
    reviewResult,
    outputResult,
    error,
    reviewCode,
    explainCode,
    fixCode,
    generateTests,
    clearReview,
  }
}
