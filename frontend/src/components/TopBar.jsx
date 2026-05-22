import React from 'react'
import styles from './TopBar.module.css'

const LANGUAGES = [
  { value: 'python', label: 'Python' }, { value: 'javascript', label: 'JavaScript' },
  { value: 'typescript', label: 'TypeScript' }, { value: 'java', label: 'Java' },
  { value: 'cpp', label: 'C++' }, { value: 'go', label: 'Go' }, { value: 'rust', label: 'Rust' },
]

export default function TopBar({ language, onLanguageChange, onReview, onExplain, onFix, onTests, onVisualize, onTogglePanel, onToggleAlgoVisualizer, onToggleTerminal, loading, loadingAction, codeVizLoading, activePanel, terminalVisible }) {
  const mkBtn = (action, label, icon, cls, handler) => {
    const busy = loadingAction === action
    return (
      <button className={`btn ${cls} ${styles.actionBtn}`} onClick={handler} disabled={loading || codeVizLoading} title={label}>
        {busy ? <span className="spinner" /> : <span>{icon}</span>}
        <span>{busy ? 'Working…' : label}</span>
      </button>
    )
  }
  const isVizActive = activePanel === 'codeviz', isAlgoActive = activePanel === 'algo', isAiActive = activePanel === 'ai'

  return (
    <header className={styles.topbar}>
      <div className={styles.logo}><div className={styles.logoIcon}>⚡</div><span className={styles.logoText}>CodeMind IDE</span></div>
      <div className={styles.sep} />
      <select className={styles.langSelect} value={language} onChange={e => onLanguageChange(e.target.value)}>
        {LANGUAGES.map(l => <option key={l.value} value={l.value}>{l.label}</option>)}
      </select>
      <div className={styles.sep} />
      <div className={styles.actions}>
        {mkBtn('review', 'Review Code', '🔍', 'btn-primary', onReview)}
        {mkBtn('explain', 'Explain', '💡', 'btn-success', onExplain)}
        {mkBtn('fix', 'Fix Code', '🔧', 'btn-warn', onFix)}
        {mkBtn('tests', 'Gen Tests', '🧪', 'btn-purple', onTests)}
        <div className={styles.sep} />
        <button className={`btn ${styles.actionBtn}`} onClick={onVisualize} disabled={loading || codeVizLoading} title="Visualize your code"
          style={{ background: isVizActive ? 'rgba(0,255,157,0.15)' : 'rgba(0,255,157,0.08)', borderColor: isVizActive ? 'var(--green)' : 'rgba(0,255,157,0.3)', color: 'var(--green)', fontWeight: 600, boxShadow: isVizActive ? '0 0 14px rgba(0,255,157,0.3)' : 'none' }}>
          {codeVizLoading ? <><span className="spinner" style={{ borderTopColor: 'var(--green)' }} /><span>Tracing…</span></> : <><span>🎬</span><span>Visualize</span></>}
        </button>
        <button className={styles.toggleBtn} onClick={onToggleTerminal} title="Toggle Terminal"
          style={terminalVisible ? { borderColor: 'var(--green)', color: 'var(--green)', background: 'rgba(0,255,157,0.12)', boxShadow: '0 0 10px rgba(0,255,157,0.25)' } : {}}>&gt;_</button>
        <button className={styles.toggleBtn} onClick={onToggleAlgoVisualizer} title="Algorithm Visualizer"
          style={isAlgoActive ? { borderColor: '#b060ff', color: '#b060ff', background: 'rgba(176,96,255,0.12)' } : {}}>📊</button>
        <button className={styles.toggleBtn} onClick={onTogglePanel} title="Toggle AI Panel"
          style={isAiActive ? { borderColor: 'var(--cyan)', color: 'var(--cyan)', background: 'var(--cyan-glow)' } : {}}>⊞</button>
        <div className={styles.sep} />
        <div className={styles.statusPill}><div className={styles.statusDot} /><span>{codeVizLoading ? 'Tracing…' : loading ? 'AI thinking…' : 'Ready'}</span></div>
      </div>
    </header>
  )
}
