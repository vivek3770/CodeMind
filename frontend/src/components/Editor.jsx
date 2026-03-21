/**
 * components/Editor.jsx
 * Monaco Editor wrapper. Defines the custom "codemind" dark theme,
 * syncs the model when the active file changes, and exposes cursor
 * position updates to the parent via onCursorChange.
 */
import React, { useEffect, useRef } from 'react'
import MonacoEditor from '@monaco-editor/react'
import styles from './Editor.module.css'

// Custom GitHub-dark-inspired theme definition
const THEME_DEF = {
  base: 'vs-dark',
  inherit: true,
  rules: [
    { token: 'comment',   foreground: '6a9955', fontStyle: 'italic' },
    { token: 'keyword',   foreground: '569cd6' },
    { token: 'string',    foreground: 'ce9178' },
    { token: 'number',    foreground: 'b5cea8' },
    { token: 'type',      foreground: '4ec9b0' },
    { token: 'delimiter', foreground: '569cd6' },
    { token: 'variable',  foreground: '9cdcfe' },
  ],
  colors: {
    'editor.background':                '#0d1117',
    'editor.foreground':                '#e6edf3',
    'editorLineNumber.foreground':      '#484f58',
    'editorLineNumber.activeForeground':'#8b949e',
    'editor.selectionBackground':       '#264f78',
    'editor.lineHighlightBackground':   '#161b22',
    'editorCursor.foreground':          '#58a6ff',
    'editor.inactiveSelectionBackground':'#1c2128',
    'editorWidget.background':          '#161b22',
    'editorWidget.border':              '#30363d',
    'editorSuggestWidget.background':   '#161b22',
    'editorSuggestWidget.border':       '#30363d',
    'editorSuggestWidget.selectedBackground': '#264f78',
    'editorHoverWidget.background':     '#161b22',
    'editorHoverWidget.border':         '#30363d',
    'editorGutter.background':          '#0d1117',
    'scrollbarSlider.background':       '#484f5840',
    'scrollbarSlider.hoverBackground':  '#484f5870',
    'minimap.background':               '#0d1117',
    'tab.activeBackground':             '#0d1117',
    'tab.inactiveBackground':           '#161b22',
    'titleBar.activeBackground':        '#161b22',
  },
}

const EDITOR_OPTIONS = {
  fontSize: 13.5,
  fontFamily: "'JetBrains Mono', 'Fira Code', 'Cascadia Code', monospace",
  fontLigatures: true,
  lineNumbers: 'on',
  minimap: { enabled: true, scale: 1 },
  scrollBeyondLastLine: false,
  wordWrap: 'on',
  automaticLayout: true,
  padding: { top: 12, bottom: 12 },
  cursorBlinking: 'smooth',
  cursorSmoothCaretAnimation: 'on',
  smoothScrolling: true,
  renderLineHighlight: 'all',
  bracketPairColorization: { enabled: true },
  guides: { bracketPairs: true, indentation: true },
  suggest: { showKeywords: true },
  quickSuggestions: true,
  tabSize: 4,
  insertSpaces: true,
  scrollbar: { verticalScrollbarSize: 6, horizontalScrollbarSize: 6 },
}

export default function Editor({
  files,
  activeFile,
  onMount,
  onCursorChange,
  onContentChange,
}) {
  const monacoRef  = useRef(null)
  const editorRef  = useRef(null)
  const prevFile   = useRef(null)

  function handleBeforeMount(monaco) {
    monaco.editor.defineTheme('codemind', THEME_DEF)
  }

  function handleMount(editor, monaco) {
    editorRef.current  = editor
    monacoRef.current  = monaco
    prevFile.current   = activeFile
    onMount?.(editor, monaco)

    editor.onDidChangeCursorPosition((e) => {
      onCursorChange?.({
        line: e.position.lineNumber,
        col:  e.position.column,
      })
    })

    editor.onDidChangeModelContent(() => {
      onContentChange?.({
        value:     editor.getValue(),
        lineCount: editor.getModel()?.getLineCount() ?? 0,
      })
    })
  }

  // Swap the editor model when activeFile changes
  useEffect(() => {
    const editor = editorRef.current
    const monaco = monacoRef.current
    if (!editor || !monaco || !activeFile || prevFile.current === activeFile) return

    const file = files[activeFile]
    if (!file) return

    // Dispose old model to avoid memory leaks
    const oldModel = editor.getModel()

    const newModel = monaco.editor.createModel(file.content, file.language)
    editor.setModel(newModel)

    newModel.onDidChangeContent(() => {
      onContentChange?.({
        value:     editor.getValue(),
        lineCount: newModel.getLineCount(),
      })
    })

    oldModel?.dispose()
    prevFile.current = activeFile
  }, [activeFile, files, onContentChange])

  const file = files[activeFile]
  if (!file) return <div className={styles.empty}>No file open</div>

  return (
    <div className={styles.editorWrap}>
      <MonacoEditor
        height="100%"
        language={file.language}
        value={file.content}
        theme="codemind"
        beforeMount={handleBeforeMount}
        onMount={handleMount}
        options={EDITOR_OPTIONS}
      />
    </div>
  )
}
