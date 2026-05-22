import React, { useState, useCallback, useEffect, useRef } from 'react'
import TopBar         from './components/TopBar'
import FileExplorer   from './components/FileExplorer'
import TabBar         from './components/TabBar'
import Editor         from './components/Editor'
import AIPanel        from './components/AIPanel'
import Visualizer     from './components/Visualizer/Visualizer'
import CodeVisualizer from './components/CodeVisualizer/CodeVisualizer'
import ReviewHistory  from './components/ReviewHistory/ReviewHistory'
import Terminal       from './components/Terminal/Terminal'
import StatusBar      from './components/StatusBar'
import { useEditor }         from './hooks/useEditor'
import { useAI }             from './hooks/useAI'
import { useCodeVisualizer } from './hooks/useCodeVisualizer'
import { applyMarkers, clearMarkers } from './utils/markerUtils'
import './styles/globals.css'
import styles from './App.module.css'

const API = 'http://127.0.0.1:8000/api'
const PANEL = { AI:'ai', ALGO:'algo', CODE_VIZ:'codeviz', HISTORY:'history', NONE:'none' }

export default function App() {
  const { files, activeFile, editorRef, monacoRef, onEditorMount, openFile, addFile, addFileWithContent, closeFile, changeLanguage, getCurrentCode, jumpToLine } = useEditor()
  const { loading, loadingAction, reviewResult, outputResult, error, reviewCode, explainCode, fixCode, generateTests, clearReview } = useAI()
  const codeViz = useCodeVisualizer(editorRef, monacoRef)

  const [activePanel,     setActivePanel]     = useState(PANEL.AI)
  const [sidebarW,        setSidebarW]        = useState(200)
  const [rightW,          setRightW]          = useState(360)
  const [terminalVisible, setTerminalVisible] = useState(false)
  const [terminalHeight,  setTerminalHeight]  = useState(200)
  const [complexityData,  setComplexityData]  = useState(null)
  const [ragSummary,      setRagSummary]      = useState(null)
  const [toast,           setToast]           = useState(null)
  const [cursor,          setCursor]          = useState({ line:1, col:1 })
  const [lineCount,       setLineCount]       = useState(0)
  const [charCount,       setCharCount]       = useState(0)
  const toastTimer = useRef(null)
  const dragging = useRef(null), dragStart = useRef(null), sizeStart = useRef(null)
  const [isDragging, setIsDragging] = useState(null)

  const onMouseDownSidebar = useCallback(e => { e.preventDefault(); dragging.current='sidebar'; dragStart.current=e.clientX; sizeStart.current=sidebarW; setIsDragging('sidebar') }, [sidebarW])
  const onMouseDownRight   = useCallback(e => { e.preventDefault(); dragging.current='right';   dragStart.current=e.clientX; sizeStart.current=rightW;   setIsDragging('right')   }, [rightW])

  useEffect(() => {
    const onMove = e => {
      if (!dragging.current) return
      const d = e.clientX - dragStart.current
      if (dragging.current==='sidebar') setSidebarW(Math.max(160, Math.min(400, sizeStart.current+d)))
      else setRightW(Math.max(280, Math.min(640, sizeStart.current-d)))
    }
    const onUp = () => { dragging.current=null; setIsDragging(null); editorRef.current?.layout() }
    window.addEventListener('mousemove', onMove); window.addEventListener('mouseup', onUp)
    return () => { window.removeEventListener('mousemove', onMove); window.removeEventListener('mouseup', onUp) }
  }, [editorRef])

  const showToast = useCallback(msg => { setToast(msg); clearTimeout(toastTimer.current); toastTimer.current=setTimeout(()=>setToast(null),2800) }, [])

  useEffect(() => {
    const editor=editorRef.current, monaco=monacoRef.current
    if (!editor||!monaco) return
    if (!reviewResult) { clearMarkers(monaco,editor.getModel()); return }
    applyMarkers(monaco, editor.getModel(), [
      ...(reviewResult.bugs??[]).map(i=>({...i,category:'Bug'})),
      ...(reviewResult.performance??[]).map(i=>({...i,category:'Performance'})),
      ...(reviewResult.security??[]).map(i=>({...i,category:'Security'})),
      ...(reviewResult.readability??[]).map(i=>({...i,category:'Readability'})),
    ])
  }, [reviewResult, editorRef, monacoRef])

  const issueCounts = {}
  if (reviewResult) {
    const total=(reviewResult.bugs?.length??0)+(reviewResult.security?.length??0)+(reviewResult.performance?.length??0)+(reviewResult.readability?.length??0)
    if (total>0) issueCounts[activeFile]=total
  }

  const handleFilesUploaded = useCallback(uploads => {
    uploads.forEach(({filename,content}) => addFileWithContent(filename,content))
    showToast(uploads.length===1 ? `✓ Uploaded ${uploads[0].filename}` : `✓ Uploaded ${uploads.length} files`)
  }, [addFileWithContent, showToast])

  const handleReview = async () => {
    setActivePanel(PANEL.AI)
    const code=getCurrentCode(), lang=files[activeFile]?.language??'python'
    fetch(`${API}/rag/similar`,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({code,language:lang})}).then(r=>r.json()).then(d=>{if(d.found)setRagSummary(d.summary)}).catch(()=>{})
    fetch(`${API}/complexity`,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({code,language:lang})}).then(r=>r.json()).then(d=>setComplexityData(d)).catch(()=>{})
    reviewCode(code,lang,activeFile)
  }

  const handleExplain   = () => { setActivePanel(PANEL.AI); explainCode(getCurrentCode(),files[activeFile]?.language??'python') }
  const handleFix       = () => { setActivePanel(PANEL.AI); fixCode(getCurrentCode(),files[activeFile]?.language??'python') }
  const handleTests     = () => { setActivePanel(PANEL.AI); generateTests(getCurrentCode(),files[activeFile]?.language??'python',activeFile) }
  const handleVisualize = () => { setActivePanel(PANEL.CODE_VIZ); codeViz.runVisualize(getCurrentCode(),files[activeFile]?.language??'python') }
  const handleApplyFix  = useCallback(code => { if(editorRef.current){editorRef.current.setValue(code);showToast('✓ Fixed code applied')} },[editorRef,showToast])
  const handleAddTestFile = useCallback((code,filename) => { addFile(filename); setTimeout(()=>{if(editorRef.current)editorRef.current.setValue(code)},100); showToast(`✓ ${filename} added`) },[addFile,editorRef,showToast])
  const handleCopyReport  = useCallback(() => {
    if(!reviewResult){showToast('No review to copy');return}
    const r=reviewResult
    navigator.clipboard.writeText([`Code Review — Score: ${r.score}/10`,`Summary: ${r.summary}`,'',`BUGS (${r.bugs?.length??0}):`, ...(r.bugs??[]).map(b=>`  Line ${b.line}: ${b.message}`),'',`SECURITY (${r.security?.length??0}):`, ...(r.security??[]).map(b=>`  Line ${b.line}: ${b.message}`)].join('\n')).then(()=>showToast('✓ Report copied')).catch(()=>showToast('Copy failed'))
  },[reviewResult,showToast])
  const handleCloseFile = useCallback(fname => { if(Object.keys(files).length===1){showToast('Cannot close last file');return}; closeFile(fname) },[files,closeFile,showToast])

  const togglePanel = p => setActivePanel(prev=>prev===p?PANEL.NONE:p)
  const rightPanelVisible = activePanel !== PANEL.NONE
  const rightStyle = rightPanelVisible ? { width:rightW, minWidth:rightW, maxWidth:rightW } : {}
  const statusText = loading ? `${loadingAction??'AI'} in progress…` : codeViz.loading ? 'Tracing code…' : reviewResult ? `Score: ${reviewResult.score}/10` : 'Ready'

  return (
    <div className={styles.app}>
      <TopBar language={files[activeFile]?.language??'python'} onLanguageChange={changeLanguage} onReview={handleReview} onExplain={handleExplain} onFix={handleFix} onTests={handleTests} onVisualize={handleVisualize} onTogglePanel={()=>togglePanel(PANEL.AI)} onToggleAlgoVisualizer={()=>togglePanel(PANEL.ALGO)} onToggleTerminal={()=>setTerminalVisible(v=>!v)} loading={loading} loadingAction={loadingAction} codeVizLoading={codeViz.loading} activePanel={activePanel} terminalVisible={terminalVisible} />
      <div className={styles.main}>
        <FileExplorer files={files} activeFile={activeFile} onOpenFile={openFile} onAddFile={addFile} onCloseFile={handleCloseFile} onFilesUploaded={handleFilesUploaded} issueCounts={issueCounts} jumpToLine={jumpToLine} style={{width:sidebarW,minWidth:sidebarW,maxWidth:sidebarW}} />
        <div className={`${styles.resizeHandle} ${isDragging==='sidebar'?styles.dragging:''}`} onMouseDown={onMouseDownSidebar} />
        <div className={styles.editorCol}>
          <TabBar files={files} activeFile={activeFile} onOpenFile={openFile} onCloseFile={handleCloseFile} />
          <Editor files={files} activeFile={activeFile} onMount={onEditorMount} onCursorChange={setCursor} onContentChange={({lineCount:lc,value})=>{setLineCount(lc);setCharCount(value.length)}} />
          <Terminal code={getCurrentCode()} language={files[activeFile]?.language??'python'} visible={terminalVisible} height={terminalHeight} onHeightChange={setTerminalHeight} />
        </div>
        {rightPanelVisible && <div className={`${styles.resizeHandle} ${isDragging==='right'?styles.dragging:''}`} onMouseDown={onMouseDownRight} />}
        {activePanel===PANEL.AI && <AIPanel visible loading={loading} loadingAction={loadingAction} reviewResult={reviewResult} outputResult={outputResult} error={error} onJumpToLine={jumpToLine} onClearReview={()=>{clearReview();setComplexityData(null);setRagSummary(null)}} onCopyReport={handleCopyReport} onApplyFix={handleApplyFix} onAddTestFile={handleAddTestFile} onClose={()=>setActivePanel(PANEL.NONE)} onOpenHistory={()=>setActivePanel(PANEL.HISTORY)} complexityData={complexityData} ragSummary={ragSummary} style={rightStyle} />}
        {activePanel===PANEL.ALGO && <Visualizer visible onClose={()=>setActivePanel(PANEL.NONE)} style={rightStyle} />}
        {activePanel===PANEL.CODE_VIZ && <CodeVisualizer visible onClose={()=>setActivePanel(PANEL.NONE)} style={rightStyle} {...codeViz} />}
        {activePanel===PANEL.HISTORY && <ReviewHistory onClose={()=>setActivePanel(PANEL.NONE)} style={rightStyle} />}
      </div>
      <StatusBar status={statusText} language={files[activeFile]?.language??''} lines={lineCount} chars={charCount} cursor={cursor} />
      {toast && <div className="toast">{toast}</div>}
    </div>
  )
}
