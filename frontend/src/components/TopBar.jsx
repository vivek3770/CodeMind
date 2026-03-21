/**
 * components/TopBar.jsx
 * Top toolbar with logo, language selector, and AI action buttons.
 */
import React from 'react'
import styles from './TopBar.module.css'

const LANGUAGES = [
  { value: 'python',     label: 'Python' },
  { value: 'javascript', label: 'JavaScript' },
  { value: 'typescript', label: 'TypeScript' },
  { value: 'java',       label: 'Java' },
  { value: 'cpp',        label: 'C++' },
  { value: 'go',         label: 'Go' },
  { value: 'rust',       label: 'Rust' },
]

export default function TopBar({
  language,
  onLanguageChange,
  onReview,
  onExplain,
  onFix,
  onTests,
  onTogglePanel,
  loading,
  loadingAction,
}) {
  const btn = (action, label, icon, cls) => {
    const isThis = loadingAction === action
    return (
      <button
        className={`btn ${cls} ${styles.actionBtn}`}
        onClick={action === 'review' ? onReview
               : action === 'explain' ? onExplain
               : action === 'fix' ? onFix
               : onTests}
        disabled={loading}
        title={label}
      >
        {isThis ? <span className="spinner" /> : <span>{icon}</span>}
        <span>{isThis ? 'Analyzing…' : label}</span>
      </button>
    )
  }

  return (
    <header className={styles.topbar}>
      {/* Logo */}
      <div className={styles.logo}>
        <div className={styles.logoIcon}>⚡</div>
        <span>CodeMind IDE</span>
      </div>

      <div className={styles.sep} />

      {/* Language selector */}
      <select
        className={styles.langSelect}
        value={language}
        onChange={(e) => onLanguageChange(e.target.value)}
      >
        {LANGUAGES.map((l) => (
          <option key={l.value} value={l.value}>{l.label}</option>
        ))}
      </select>

      <div className={styles.sep} />

      {/* AI action buttons */}
      <div className={styles.actions}>
        {btn('review',  'Review Code', '🔍', 'btn-primary')}
        {btn('explain', 'Explain',     '💡', 'btn-success')}
        {btn('fix',     'Fix Code',    '🔧', 'btn-warn')}
        {btn('tests',   'Gen Tests',   '🧪', 'btn-purple')}

        <div className={styles.sep} />

        <button
          className={styles.toggleBtn}
          onClick={onTogglePanel}
          title="Toggle AI Panel"
        >
          ⊞
        </button>
      </div>
    </header>
  )
}
