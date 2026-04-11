/**
 * SemanticSearch.jsx
 * Search bar above the file explorer.
 * Calls POST /api/search with a natural language query.
 * Results show filename, function, line range, similarity score.
 */
import React, { useState, useRef, useCallback, useEffect } from 'react'
import styles from './SemanticSearch.module.css'

const API = 'http://127.0.0.1:8000/api'
const DEBOUNCE_MS = 400

export default function SemanticSearch({ onResultClick, onIndexFile, files, activeFile }) {
  const [query,    setQuery]    = useState('')
  const [results,  setResults]  = useState([])
  const [loading,  setLoading]  = useState(false)
  const [open,     setOpen]     = useState(false)
  const [active,   setActive]   = useState(-1)
  const [status,   setStatus]   = useState(null)

  const timer = useRef(null)
  const inputRef = useRef(null)

  // Check if vector search is available on mount
  useEffect(() => {
    fetch(`${API}/search/status`)
      .then(r => r.json())
      .then(d => setStatus(d))
      .catch(() => setStatus(null))
  }, [])

  // Debounced search
  const doSearch = useCallback(async (q) => {
    if (!q.trim()) { setResults([]); setOpen(false); return }
    setLoading(true)
    try {
      const res = await fetch(`${API}/search`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query: q, top_k: 6 }),
      })
      const data = await res.json()
      setResults(data.results ?? [])
      setOpen(true)
      setActive(-1)
    } catch {
      setResults([])
    } finally {
      setLoading(false)
    }
  }, [])

  const handleChange = (e) => {
    const val = e.target.value
    setQuery(val)
    clearTimeout(timer.current)
    if (!val.trim()) { setResults([]); setOpen(false); return }
    timer.current = setTimeout(() => doSearch(val), DEBOUNCE_MS)
  }

  const handleKeyDown = (e) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setActive(a => Math.min(a + 1, results.length - 1))
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setActive(a => Math.max(a - 1, -1))
    } else if (e.key === 'Enter' && active >= 0) {
      handleSelect(results[active])
    } else if (e.key === 'Escape') {
      setOpen(false)
      setQuery('')
    }
  }

  const handleSelect = (result) => {
    onResultClick?.(result)
    setOpen(false)
    setQuery('')
  }

  const similarityColor = (s) => {
    if (s >= 0.8) return 'var(--green)'
    if (s >= 0.6) return 'var(--cyan)'
    if (s >= 0.4) return 'var(--yellow)'
    return 'var(--tx3)'
  }

  const isAvailable = status?.operational

  return (
    <div className={styles.wrap}>
      <div className={styles.inputWrap}>
        <span className={styles.searchIcon}>🔍</span>
        <input
          ref={inputRef}
          className={styles.input}
          value={query}
          onChange={handleChange}
          onKeyDown={handleKeyDown}
          onFocus={() => results.length > 0 && setOpen(true)}
          onBlur={() => setTimeout(() => setOpen(false), 150)}
          placeholder={isAvailable ? 'Search code semantically…' : 'Install chromadb to enable search'}
          disabled={!isAvailable}
          spellCheck={false}
        />
        {loading && <span className={styles.spinner} />}
        {query && !loading && (
          <button className={styles.clearBtn}
            onClick={() => { setQuery(''); setResults([]); setOpen(false) }}>
            ×
          </button>
        )}
      </div>

      {/* Results dropdown */}
      {open && results.length > 0 && (
        <div className={styles.dropdown}>
          {results.map((r, i) => (
            <div key={i}
              className={`${styles.result} ${i === active ? styles.resultActive : ''}`}
              onMouseDown={() => handleSelect(r)}>
              <div className={styles.resultTop}>
                <span className={styles.resultFunc}>{r.function_name}</span>
                <span className={styles.resultSim}
                  style={{ color: similarityColor(r.similarity) }}>
                  {Math.round(r.similarity * 100)}%
                </span>
              </div>
              <div className={styles.resultBottom}>
                <span className={styles.resultFile}>{r.filename}</span>
                <span className={styles.resultLines}>L{r.start_line}–{r.end_line}</span>
              </div>
              {r.code && (
                <div className={styles.resultSnippet}>
                  {r.code.split('\n').slice(0, 2).join('\n')}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {open && query && results.length === 0 && !loading && (
        <div className={styles.noResults}>No results for "{query}"</div>
      )}

      {/* Status indicator */}
      {!isAvailable && status !== null && (
        <div className={styles.statusHint}>
          ⚡ Run: <code>pip install chromadb sentence-transformers</code>
        </div>
      )}
    </div>
  )
}
