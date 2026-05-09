import React from 'react'
import styles from './TopBar.module.css'

const LANGUAGES = [
  { value: 'python',     label: 'Python'     },
  { value: 'javascript', label: 'JavaScript' },
  { value: 'typescript', label: 'TypeScript' },
  { value: 'java',       label: 'Java'       },
  { value: 'cpp',        label: 'C++'        },
  { value: 'go',         label: 'Go'         },
  { value: 'rust',       label: 'Rust'       },
]

export default function TopBar({
  language, onLanguageChange,
  onReview, onExplain, onFix, onTests,
  onVisualize,
  onTogglePanel, onToggleAlgoVisualizer,
  loading, loadingAction,
  codeVizLoading,
  activePanel,
}) {
  const mkBtn = (action, label, icon, cls, handler) => {
    const busy = loadingAction === action
    return (
      <button className={`btn ${cls} ${styles.actionBtn}`}
        onClick={handler} disabled={loading || codeVizLoading} title={label}>
        {busy ? <span className="spinner" /> : <span>{icon}</span>}
        <span>{busy ? 'Working…' : label}</span>
      </button>
    )
  }

  const isVizActive   = activePanel === 'codeviz'
  const isAlgoActive  = activePanel === 'algo'
  const isAiActive    = activePanel === 'ai'

  return (
    <header className={styles.topbar}>
      <div className={styles.logo}>
        <div className={styles.logoIcon}>⚡</div>
        <span className={styles.logoText}>CodeMind IDE</span>
      </div>

      <div className={styles.sep} />

      <select className={styles.langSelect} value={language}
        onChange={e => onLanguageChange(e.target.value)}>
        {LANGUAGES.map(l => <option key={l.value} value={l.value}>{l.label}</option>)}
      </select>

      <div className={styles.sep} />

      <div className={styles.actions}>
        {/* AI buttons */}
        {mkBtn('review',  'Review Code', '🔍', 'btn-primary', onReview)}
        {mkBtn('explain', 'Explain',     '💡', 'btn-success', onExplain)}
        {mkBtn('fix',     'Fix Code',    '🔧', 'btn-warn',    onFix)}
        {mkBtn('tests',   'Gen Tests',   '🧪', 'btn-purple',  onTests)}

        <div className={styles.sep} />

        {/* Visualize YOUR code button */}
        <button
          className={`btn ${styles.actionBtn}`}
          onClick={onVisualize}
          disabled={loading || codeVizLoading}
          title="Visualize your code — trace execution step by step"
          style={{
            background:   isVizActive ? 'rgba(0,255,157,0.15)'   : 'rgba(0,255,157,0.08)',
            borderColor:  isVizActive ? 'var(--green)'            : 'rgba(0,255,157,0.3)',
            color:        'var(--green)',
            boxShadow:    isVizActive ? '0 0 14px rgba(0,255,157,0.3)' : 'none',
            fontWeight:   600,
          }}
        >
          {codeVizLoading
            ? <><span className="spinner" style={{ borderTopColor: 'var(--green)' }} /><span>Tracing…</span></>
            : <><span>🎬</span><span>Visualize</span></>
          }
        </button>
        {/* Run Button */}
        <button className={`btn ${styles.actionBtn}`}
          onClick={() => window.__terminalRun?.()}
          style={{ background:'rgba(0,255,157,0.08)', borderColor:'rgba(0,255,157,0.3)', color:'var(--green)', fontWeight:600 }}>
          <span>▶</span><span>Run</span>
        </button>
        <div className={styles.sep} />

        {/* Toggle algo visualizer (pre-built demos) */}
        <button
          className={styles.toggleBtn}
          onClick={onToggleAlgoVisualizer}
          title="Algorithm Visualizer (demos)"
          style={isAlgoActive ? {
            borderColor: '#b060ff', color: '#b060ff',
            background: 'rgba(176,96,255,0.12)',
            boxShadow: '0 0 12px rgba(176,96,255,0.3)',
          } : {}}
        >
          📊
        </button>

        {/* Toggle AI panel */}
        <button
          className={styles.toggleBtn}
          onClick={onTogglePanel}
          title="Toggle AI Review Panel"
          style={isAiActive ? {
            borderColor: 'var(--cyan)', color: 'var(--cyan)',
            background: 'var(--cyan-glow)',
            boxShadow: '0 0 12px var(--cyan-glow2)',
          } : {}}
        >
          ⊞
        </button>

        <div className={styles.sep} />

        <div className={styles.statusPill}>
          <div className={styles.statusDot} />
          <span>
            {codeVizLoading ? 'Tracing…'
            : loading ? 'AI thinking…'
            : 'Ready'}
          </span>
        </div>
      </div>
    </header>
  )
}
