/**
 * SemanticSearch.jsx
 * Search bar above the file explorer.
 * Calls POST /api/search with a natural language query.
 * Results show filename, function, line range, similarity score.
 */
import React, { useState, useRef, useCallback, useEffect } from 'react'
import styles from './SemanticSearch.module.css'
import API_BASE from '../config/api'

const API = API_BASE
const DEBOUNCE_MS = 400

export default function SemanticSearch({ onResultClick, onIndexFile, files, activeFile, getCurrentCode }) {
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

  const [indexing, setIndexing] = useState(false)
  const [indexingMsg, setIndexingMsg] = useState('')
  const indexingPromise = useRef(null)
  const lastIndexedCode = useRef('')

  // Auto-index all files in the current workspace
  const autoIndexWorkspace = useCallback(async (force = false, showStatus = false) => {
    if (!files) return
    const activeCode = getCurrentCode ? getCurrentCode() : (files[activeFile]?.content ?? '')

    if (!force && lastIndexedCode.current === activeCode && indexingPromise.current) {
      await indexingPromise.current
      return
    }
    if (indexingPromise.current) {
      await indexingPromise.current
    }

    if (showStatus) {
      setIndexing(true)
      setIndexingMsg('Indexing workspace code...')
    }

    indexingPromise.current = (async () => {
      try {
        lastIndexedCode.current = activeCode
        const promises = Object.entries(files).map(([filename, f]) => {
          const codeToUse = (filename === activeFile) ? activeCode : f.content
          if (!codeToUse?.trim()) return Promise.resolve()
          return fetch(`${API}/index`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              filename,
              code: codeToUse,
              language: f.language ?? (filename.endsWith('.js') ? 'javascript' : filename.endsWith('.ts') ? 'typescript' : 'python'),
            }),
          }).then(r => r.json()).catch(() => {})
        })
        await Promise.all(promises)
        if (showStatus) {
          setIndexingMsg('✓ Indexing complete!')
          setTimeout(() => setIndexingMsg(''), 1500)
        }
      } finally {
        indexingPromise.current = null
        if (showStatus) {
          setIndexing(false)
        }
      }
    })()

    await indexingPromise.current
  }, [files, activeFile, getCurrentCode])

  // Auto-index silently on mount / when workspace files load
  useEffect(() => {
    autoIndexWorkspace(false, false)
  }, [autoIndexWorkspace])

  // Debounced search
  const doSearch = useCallback(async (q) => {
    if (!q.trim()) { setResults([]); setOpen(false); return }
    setLoading(true)
    await autoIndexWorkspace(true, false)
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
  }, [autoIndexWorkspace])

  const handleFocus = () => {
    const currentCode = getCurrentCode?.() ?? ''
    if (lastIndexedCode.current !== currentCode) {
      autoIndexWorkspace(true, false)
    }
    if (results.length > 0) setOpen(true)
  }

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

  const handleManualIndexSearch = async () => {
    await autoIndexWorkspace(true, true)
    inputRef.current?.focus()
  }

  const isAvailable = status?.operational

  return (
    <div className={styles.wrap}>
      <button
        className={styles.indexSearchBtn}
        onClick={handleManualIndexSearch}
        disabled={indexing || !isAvailable}
        title="Index current workspace code & open semantic search"
      >
        {indexing ? (
          <>
            <span className={styles.spinner} />
            <span>Indexing Code…</span>
          </>
        ) : (
          <>
            <span>⚡</span>
            <span>Index & Search</span>
          </>
        )}
      </button>

      <div className={styles.inputWrap}>
        <span className={styles.searchIcon}>🔍</span>
        <input
          ref={inputRef}
          className={styles.input}
          value={query}
          onChange={handleChange}
          onKeyDown={handleKeyDown}
          onFocus={handleFocus}
          onBlur={() => setTimeout(() => setOpen(false), 150)}
          placeholder={
            indexing
              ? '⚡ Indexing code in background...'
              : isAvailable
              ? 'Search code semantically…'
              : 'Install chromadb to enable search'
          }
          disabled={!isAvailable}
          spellCheck={false}
        />
        {(loading || indexing) && <span className={styles.spinner} />}
        {query && !loading && (
          <button className={styles.clearBtn}
            onClick={() => { setQuery(''); setResults([]); setOpen(false) }}>
            ×
          </button>
        )}
      </div>
      {indexingMsg && (
        <div style={{ fontSize: '11px', color: 'var(--cyan)', padding: '2px 8px' }}>
          {indexingMsg}
        </div>
      )}

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
