/**
 * App.jsx — Root component with resizable sidebar + AI panel
 */
import React, { useState, useCallback, useEffect, useRef } from 'react'
import TopBar       from './components/TopBar'
import FileExplorer from './components/FileExplorer'
import TabBar       from './components/TabBar'
import Editor       from './components/Editor'
import AIPanel      from './components/AIPanel'
import StatusBar    from './components/StatusBar'
import { useEditor } from './hooks/useEditor'
import { useAI }     from './hooks/useAI'
import { applyMarkers, clearMarkers } from './utils/markerUtils'
import './styles/globals.css'
import styles from './App.module.css'

export default function App() {
  // ── Editor + AI hooks ────────────────────────────────────────
  const {
    files, activeFile,
    editorRef, monacoRef,
    onEditorMount,
    openFile, addFile, closeFile,
    changeLanguage,
    getCurrentCode,
    jumpToLine,
  } = useEditor()

  const {
    loading, loadingAction,
    reviewResult, outputResult, error,
    reviewCode, explainCode, fixCode, generateTests,
    clearReview,
  } = useAI()

  // ── Panel sizes (px) ─────────────────────────────────────────
  const [sidebarW,  setSidebarW]  = useState(200)
  const [aiPanelW,  setAiPanelW]  = useState(340)
  const [panelVisible, setPanelVisible] = useState(true)

  // ── UI state ─────────────────────────────────────────────────
  const [toast,    setToast]    = useState(null)
  const [cursor,   setCursor]   = useState({ line: 1, col: 1 })
  const [lineCount, setLineCount] = useState(0)
  const [charCount, setCharCount] = useState(0)
  const toastTimer = useRef(null)

  // ── Resize logic ─────────────────────────────────────────────
  const dragging     = useRef(null)   // 'sidebar' | 'aipanel'
  const dragStart    = useRef(null)
  const sizeStart    = useRef(null)
  const [isDragging, setIsDragging] = useState(null)

  const onMouseDownSidebar = useCallback(e => {
    e.preventDefault()
    dragging.current  = 'sidebar'
    dragStart.current = e.clientX
    sizeStart.current = sidebarW
    setIsDragging('sidebar')
  }, [sidebarW])

  const onMouseDownAI = useCallback(e => {
    e.preventDefault()
    dragging.current  = 'aipanel'
    dragStart.current = e.clientX
    sizeStart.current = aiPanelW
    setIsDragging('aipanel')
  }, [aiPanelW])

  useEffect(() => {
    const onMove = e => {
      if (!dragging.current) return
      const delta = e.clientX - dragStart.current
      if (dragging.current === 'sidebar') {
        setSidebarW(Math.max(160, Math.min(400, sizeStart.current + delta)))
      } else {
        setAiPanelW(Math.max(280, Math.min(600, sizeStart.current - delta)))
      }
    }
    const onUp = () => {
      dragging.current = null
      setIsDragging(null)
      if (editorRef.current) editorRef.current.layout()
    }
    window.addEventListener('mousemove', onMove)
    window.addEventListener('mouseup', onUp)
    return () => {
      window.removeEventListener('mousemove', onMove)
      window.removeEventListener('mouseup', onUp)
    }
  }, [editorRef])

  // ── Toast ────────────────────────────────────────────────────
  const showToast = useCallback(msg => {
    setToast(msg)
    clearTimeout(toastTimer.current)
    toastTimer.current = setTimeout(() => setToast(null), 2800)
  }, [])

  // ── Apply markers ────────────────────────────────────────────
  useEffect(() => {
    const editor = editorRef.current
    const monaco = monacoRef.current
    if (!editor || !monaco) return
    if (!reviewResult) { clearMarkers(monaco, editor.getModel()); return }
    const allIssues = [
      ...(reviewResult.bugs        ?? []).map(i => ({ ...i, category: 'Bug'         })),
      ...(reviewResult.performance ?? []).map(i => ({ ...i, category: 'Performance' })),
      ...(reviewResult.security    ?? []).map(i => ({ ...i, category: 'Security'    })),
      ...(reviewResult.readability ?? []).map(i => ({ ...i, category: 'Readability' })),
    ]
    applyMarkers(monaco, editor.getModel(), allIssues)
  }, [reviewResult, editorRef, monacoRef])

  // ── Issue counts for sidebar badges ─────────────────────────
  const issueCounts = {}
  if (reviewResult) {
    const total = (reviewResult.bugs?.length ?? 0)
      + (reviewResult.security?.length    ?? 0)
      + (reviewResult.performance?.length ?? 0)
      + (reviewResult.readability?.length ?? 0)
    if (total > 0) issueCounts[activeFile] = total
  }

  // ── Handlers ─────────────────────────────────────────────────
  const handleReview  = () => reviewCode(getCurrentCode(), files[activeFile]?.language ?? 'python', activeFile)
  const handleExplain = () => explainCode(getCurrentCode(), files[activeFile]?.language ?? 'python')
  const handleFix     = () => fixCode(getCurrentCode(), files[activeFile]?.language ?? 'python')
  const handleTests   = () => generateTests(getCurrentCode(), files[activeFile]?.language ?? 'python', activeFile)

  const handleApplyFix = useCallback(fixedCode => {
    if (editorRef.current) {
      editorRef.current.setValue(fixedCode)
      showToast('✓ Fixed code applied to editor')
    }
  }, [editorRef, showToast])

  const handleAddTestFile = useCallback((code, filename) => {
    addFile(filename)
    setTimeout(() => { if (editorRef.current) editorRef.current.setValue(code) }, 100)
    showToast(`✓ ${filename} added to project`)
  }, [addFile, editorRef, showToast])

  const handleCopyReport = useCallback(() => {
    if (!reviewResult) { showToast('No review to copy'); return }
    const r = reviewResult
    const txt = [
      `Code Review — Score: ${r.score}/10`, `Summary: ${r.summary}`, '',
      `BUGS (${r.bugs?.length ?? 0}):`, ...(r.bugs ?? []).map(b => `  Line ${b.line}: ${b.message}`), '',
      `SECURITY (${r.security?.length ?? 0}):`, ...(r.security ?? []).map(b => `  Line ${b.line}: ${b.message}`), '',
      `PERFORMANCE (${r.performance?.length ?? 0}):`, ...(r.performance ?? []).map(b => `  Line ${b.line}: ${b.message}`), '',
      `READABILITY (${r.readability?.length ?? 0}):`, ...(r.readability ?? []).map(b => `  Line ${b.line}: ${b.message}`),
    ]
    navigator.clipboard.writeText(txt.join('\n'))
      .then(() => showToast('✓ Report copied to clipboard'))
      .catch(() => showToast('Copy failed'))
  }, [reviewResult, showToast])

  const handleCloseFile = useCallback(fname => {
    if (Object.keys(files).length === 1) { showToast('Cannot close last file'); return }
    closeFile(fname)
  }, [files, closeFile, showToast])

  // ── Status text ──────────────────────────────────────────────
  const statusText = loading
    ? `${loadingAction ? loadingAction.charAt(0).toUpperCase() + loadingAction.slice(1) : 'AI'} in progress…`
    : reviewResult ? `Review complete · Score: ${reviewResult.score}/10` : 'Ready'

  return (
    <div className={styles.app}>
      <TopBar
        language={files[activeFile]?.language ?? 'python'}
        onLanguageChange={changeLanguage}
        onReview={handleReview}
        onExplain={handleExplain}
        onFix={handleFix}
        onTests={handleTests}
        onTogglePanel={() => setPanelVisible(v => !v)}
        loading={loading}
        loadingAction={loadingAction}
      />

      <div className={styles.main}>
        {/* Sidebar */}
        <FileExplorer
          files={files}
          activeFile={activeFile}
          onOpenFile={openFile}
          onAddFile={addFile}
          onCloseFile={handleCloseFile}
          issueCounts={issueCounts}
          style={{ width: sidebarW, minWidth: sidebarW, maxWidth: sidebarW }}
        />

        {/* Sidebar resize handle */}
        <div
          className={`${styles.resizeHandle} ${isDragging === 'sidebar' ? styles.dragging : ''}`}
          onMouseDown={onMouseDownSidebar}
          title="Drag to resize"
        />

        {/* Editor column */}
        <div className={styles.editorCol}>
          <TabBar
            files={files}
            activeFile={activeFile}
            onOpenFile={openFile}
            onCloseFile={handleCloseFile}
          />
          <Editor
            files={files}
            activeFile={activeFile}
            onMount={onEditorMount}
            onCursorChange={setCursor}
            onContentChange={({ lineCount: lc, value }) => {
              setLineCount(lc)
              setCharCount(value.length)
            }}
          />
        </div>

        {/* AI panel resize handle */}
        {panelVisible && (
          <div
            className={`${styles.resizeHandle} ${isDragging === 'aipanel' ? styles.dragging : ''}`}
            onMouseDown={onMouseDownAI}
            title="Drag to resize"
          />
        )}

        {/* AI Panel */}
        <AIPanel
          visible={panelVisible}
          loading={loading}
          loadingAction={loadingAction}
          reviewResult={reviewResult}
          outputResult={outputResult}
          error={error}
          onJumpToLine={jumpToLine}
          onClearReview={clearReview}
          onCopyReport={handleCopyReport}
          onApplyFix={handleApplyFix}
          onAddTestFile={handleAddTestFile}
          onClose={() => setPanelVisible(false)}
          style={panelVisible ? { width: aiPanelW, minWidth: aiPanelW, maxWidth: aiPanelW } : {}}
        />
      </div>

      <StatusBar
        status={statusText}
        language={files[activeFile]?.language ?? ''}
        lines={lineCount}
        chars={charCount}
        cursor={cursor}
      />

      {toast && <div className="toast">{toast}</div>}
    </div>
  )
}
