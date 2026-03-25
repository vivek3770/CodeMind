/**
 * App.jsx — Root component
 * Three right-panel modes: AI Review | Algorithm Visualizer | Code Visualizer
 */
import React, { useState, useCallback, useEffect, useRef } from 'react'
import TopBar          from './components/TopBar'
import FileExplorer    from './components/FileExplorer'
import TabBar          from './components/TabBar'
import Editor          from './components/Editor'
import AIPanel         from './components/AIPanel'
import Visualizer      from './components/Visualizer/Visualizer'
import CodeVisualizer  from './components/CodeVisualizer/CodeVisualizer'
import StatusBar       from './components/StatusBar'
import { useEditor }         from './hooks/useEditor'
import { useAI }             from './hooks/useAI'
import { useCodeVisualizer } from './hooks/useCodeVisualizer'
import { applyMarkers, clearMarkers } from './utils/markerUtils'
import './styles/globals.css'
import styles from './App.module.css'

// Right panel modes
const PANEL = { AI: 'ai', ALGO: 'algo', CODE_VIZ: 'codeviz', NONE: 'none' }

export default function App() {
  const {
    files, activeFile, editorRef, monacoRef,
    onEditorMount, openFile, addFile, closeFile,
    changeLanguage, getCurrentCode, jumpToLine,
  } = useEditor()

  const {
    loading, loadingAction, reviewResult, outputResult, error,
    reviewCode, explainCode, fixCode, generateTests, clearReview,
  } = useAI()

  const codeViz = useCodeVisualizer(editorRef, monacoRef)

  // ── Panel state ───────────────────────────────────────────
  const [activePanel, setActivePanel] = useState(PANEL.AI)
  const [sidebarW,    setSidebarW]    = useState(200)
  const [rightW,      setRightW]      = useState(360)

  // ── UI state ──────────────────────────────────────────────
  const [toast,     setToast]     = useState(null)
  const [cursor,    setCursor]    = useState({ line: 1, col: 1 })
  const [lineCount, setLineCount] = useState(0)
  const [charCount, setCharCount] = useState(0)
  const toastTimer  = useRef(null)

  // ── Resize ────────────────────────────────────────────────
  const dragging    = useRef(null)
  const dragStart   = useRef(null)
  const sizeStart   = useRef(null)
  const [isDragging, setIsDragging] = useState(null)

  const onMouseDownSidebar = useCallback(e => {
    e.preventDefault()
    dragging.current  = 'sidebar'
    dragStart.current = e.clientX
    sizeStart.current = sidebarW
    setIsDragging('sidebar')
  }, [sidebarW])

  const onMouseDownRight = useCallback(e => {
    e.preventDefault()
    dragging.current  = 'right'
    dragStart.current = e.clientX
    sizeStart.current = rightW
    setIsDragging('right')
  }, [rightW])

  useEffect(() => {
    const onMove = e => {
      if (!dragging.current) return
      const delta = e.clientX - dragStart.current
      if (dragging.current === 'sidebar')
        setSidebarW(Math.max(160, Math.min(400, sizeStart.current + delta)))
      else
        setRightW(Math.max(280, Math.min(640, sizeStart.current - delta)))
    }
    const onUp = () => {
      dragging.current = null
      setIsDragging(null)
      editorRef.current?.layout()
    }
    window.addEventListener('mousemove', onMove)
    window.addEventListener('mouseup',  onUp)
    return () => {
      window.removeEventListener('mousemove', onMove)
      window.removeEventListener('mouseup',  onUp)
    }
  }, [editorRef])

  // ── Toast ─────────────────────────────────────────────────
  const showToast = useCallback(msg => {
    setToast(msg)
    clearTimeout(toastTimer.current)
    toastTimer.current = setTimeout(() => setToast(null), 2800)
  }, [])

  // ── Monaco markers ────────────────────────────────────────
  useEffect(() => {
    const editor = editorRef.current
    const monaco = monacoRef.current
    if (!editor || !monaco) return
    if (!reviewResult) { clearMarkers(monaco, editor.getModel()); return }
    const allIssues = [
      ...(reviewResult.bugs        ?? []).map(i => ({ ...i, category: 'Bug' })),
      ...(reviewResult.performance ?? []).map(i => ({ ...i, category: 'Performance' })),
      ...(reviewResult.security    ?? []).map(i => ({ ...i, category: 'Security' })),
      ...(reviewResult.readability ?? []).map(i => ({ ...i, category: 'Readability' })),
    ]
    applyMarkers(monaco, editor.getModel(), allIssues)
  }, [reviewResult, editorRef, monacoRef])

  // ── Issue counts ──────────────────────────────────────────
  const issueCounts = {}
  if (reviewResult) {
    const total = (reviewResult.bugs?.length ?? 0)
      + (reviewResult.security?.length    ?? 0)
      + (reviewResult.performance?.length ?? 0)
      + (reviewResult.readability?.length ?? 0)
    if (total > 0) issueCounts[activeFile] = total
  }

  // ── AI handlers ───────────────────────────────────────────
  const handleReview  = () => {
    setActivePanel(PANEL.AI)
    reviewCode(getCurrentCode(), files[activeFile]?.language ?? 'python', activeFile)
  }
  const handleExplain = () => {
    setActivePanel(PANEL.AI)
    explainCode(getCurrentCode(), files[activeFile]?.language ?? 'python')
  }
  const handleFix = () => {
    setActivePanel(PANEL.AI)
    fixCode(getCurrentCode(), files[activeFile]?.language ?? 'python')
  }
  const handleTests = () => {
    setActivePanel(PANEL.AI)
    generateTests(getCurrentCode(), files[activeFile]?.language ?? 'python', activeFile)
  }

  // ── Visualize handler ─────────────────────────────────────
  const handleVisualize = () => {
    const code = getCurrentCode()
    const lang = files[activeFile]?.language ?? 'python'
    setActivePanel(PANEL.CODE_VIZ)
    codeViz.runVisualize(code, lang)
  }

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
    const r   = reviewResult
    const txt = [
      `Code Review — Score: ${r.score}/10`, `Summary: ${r.summary}`, '',
      `BUGS (${r.bugs?.length ?? 0}):`,
      ...(r.bugs ?? []).map(b => `  Line ${b.line}: ${b.message}`), '',
      `SECURITY (${r.security?.length ?? 0}):`,
      ...(r.security ?? []).map(b => `  Line ${b.line}: ${b.message}`), '',
      `PERFORMANCE (${r.performance?.length ?? 0}):`,
      ...(r.performance ?? []).map(b => `  Line ${b.line}: ${b.message}`), '',
      `READABILITY (${r.readability?.length ?? 0}):`,
      ...(r.readability ?? []).map(b => `  Line ${b.line}: ${b.message}`),
    ]
    navigator.clipboard.writeText(txt.join('\n'))
      .then(() => showToast('✓ Report copied'))
      .catch(() => showToast('Copy failed'))
  }, [reviewResult, showToast])

  const handleCloseFile = useCallback(fname => {
    if (Object.keys(files).length === 1) { showToast('Cannot close last file'); return }
    closeFile(fname)
  }, [files, closeFile, showToast])

  // ── Panel toggles ─────────────────────────────────────────
  const togglePanel = p => setActivePanel(prev => prev === p ? PANEL.NONE : p)

  const rightPanelVisible = activePanel !== PANEL.NONE
  const rightStyle = rightPanelVisible
    ? { width: rightW, minWidth: rightW, maxWidth: rightW }
    : {}

  // ── Status text ───────────────────────────────────────────
  const statusText = loading
    ? `${loadingAction ?? 'AI'} in progress…`
    : codeViz.loading
    ? 'Tracing code…'
    : reviewResult
    ? `Score: ${reviewResult.score}/10`
    : 'Ready'

  return (
    <div className={styles.app}>
      <TopBar
        language={files[activeFile]?.language ?? 'python'}
        onLanguageChange={changeLanguage}
        onReview={handleReview}
        onExplain={handleExplain}
        onFix={handleFix}
        onTests={handleTests}
        onVisualize={handleVisualize}
        onTogglePanel={() => togglePanel(PANEL.AI)}
        onToggleAlgoVisualizer={() => togglePanel(PANEL.ALGO)}
        loading={loading}
        loadingAction={loadingAction}
        codeVizLoading={codeViz.loading}
        activePanel={activePanel}
      />

      <div className={styles.main}>
        {/* Sidebar */}
        <FileExplorer
          files={files} activeFile={activeFile}
          onOpenFile={openFile} onAddFile={addFile}
          onCloseFile={handleCloseFile} issueCounts={issueCounts}
          style={{ width: sidebarW, minWidth: sidebarW, maxWidth: sidebarW }}
        />

        {/* Sidebar resize handle */}
        <div
          className={`${styles.resizeHandle} ${isDragging === 'sidebar' ? styles.dragging : ''}`}
          onMouseDown={onMouseDownSidebar}
        />

        {/* Editor */}
        <div className={styles.editorCol}>
          <TabBar
            files={files} activeFile={activeFile}
            onOpenFile={openFile} onCloseFile={handleCloseFile}
          />
          <Editor
            files={files} activeFile={activeFile}
            onMount={onEditorMount}
            onCursorChange={setCursor}
            onContentChange={({ lineCount: lc, value }) => {
              setLineCount(lc)
              setCharCount(value.length)
            }}
          />
        </div>

        {/* Right panel resize handle */}
        {rightPanelVisible && (
          <div
            className={`${styles.resizeHandle} ${isDragging === 'right' ? styles.dragging : ''}`}
            onMouseDown={onMouseDownRight}
          />
        )}

        {/* AI Review Panel */}
        {activePanel === PANEL.AI && (
          <AIPanel
            visible
            loading={loading} loadingAction={loadingAction}
            reviewResult={reviewResult} outputResult={outputResult} error={error}
            onJumpToLine={jumpToLine} onClearReview={clearReview}
            onCopyReport={handleCopyReport} onApplyFix={handleApplyFix}
            onAddTestFile={handleAddTestFile}
            onClose={() => setActivePanel(PANEL.NONE)}
            style={rightStyle}
          />
        )}

        {/* Algorithm Visualizer Panel (pre-built demos) */}
        {activePanel === PANEL.ALGO && (
          <Visualizer
            visible
            onClose={() => setActivePanel(PANEL.NONE)}
            style={rightStyle}
          />
        )}

        {/* Code Visualizer Panel (traces actual editor code) */}
        {activePanel === PANEL.CODE_VIZ && (
          <CodeVisualizer
            visible
            onClose={() => setActivePanel(PANEL.NONE)}
            style={rightStyle}
            {...codeViz}
          />
        )}
      </div>

      <StatusBar
        status={statusText}
        language={files[activeFile]?.language ?? ''}
        lines={lineCount} chars={charCount} cursor={cursor}
      />

      {toast && <div className="toast">{toast}</div>}
    </div>
  )
}
