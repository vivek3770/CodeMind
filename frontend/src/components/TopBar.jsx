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
  onTogglePanel, loading, loadingAction,
}) {
  const mkBtn = (action, label, icon, cls, handler) => {
    const busy = loadingAction === action
    return (
      <button className={`btn ${cls} ${styles.actionBtn}`}
        onClick={handler} disabled={loading} title={label}>
        {busy ? <span className="spinner" /> : <span>{icon}</span>}
        <span>{busy ? 'Working…' : label}</span>
      </button>
    )
  }

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
        {mkBtn('review',  'Review Code', '🔍', 'btn-primary', onReview)}
        {mkBtn('explain', 'Explain',     '💡', 'btn-success', onExplain)}
        {mkBtn('fix',     'Fix Code',    '🔧', 'btn-warn',    onFix)}
        {mkBtn('tests',   'Gen Tests',   '🧪', 'btn-purple',  onTests)}

        <div className={styles.sep} />

        <div className={styles.statusPill}>
          <div className={styles.statusDot} />
          <span>{loading ? 'AI thinking…' : 'Ready'}</span>
        </div>

        <button className={styles.toggleBtn} onClick={onTogglePanel} title="Toggle AI Panel">
          ⊞
        </button>
      </div>
    </header>
  )
}
