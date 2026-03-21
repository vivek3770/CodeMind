/**
 * components/AIPanel.jsx
 * The right-side panel that houses:
 *   - Loading spinner while AI is working
 *   - Error state
 *   - Empty state (no review yet)
 *   - Review results: ScoreCard + four IssueSections
 *   - OutputPanel for explain / fix / tests
 *   - Footer actions (Clear, Copy Report)
 */
import React from 'react'
import ScoreCard    from './ScoreCard'
import IssueSection from './IssueSection'
import OutputPanel  from './OutputPanel'
import styles from './AIPanel.module.css'

const SECTIONS = [
  { key: 'bugs',        icon: '🐛', title: 'Bugs',        category: 'bugs'        },
  { key: 'security',    icon: '🔐', title: 'Security',    category: 'security'    },
  { key: 'performance', icon: '⚡', title: 'Performance', category: 'performance' },
  { key: 'readability', icon: '📖', title: 'Readability', category: 'readability' },
]

export default function AIPanel({
  visible,
  loading,
  loadingAction,
  reviewResult,
  outputResult,
  error,
  onJumpToLine,
  onClearReview,
  onCopyReport,
  onApplyFix,
  onAddTestFile,
  onClose,
}) {
  if (!visible) return null

  const totalIssues = reviewResult
    ? (reviewResult.bugs?.length ?? 0)
    + (reviewResult.security?.length ?? 0)
    + (reviewResult.performance?.length ?? 0)
    + (reviewResult.readability?.length ?? 0)
    : 0

  const loadingLabels = {
    review:  'Reviewing your code…',
    explain: 'Analysing code logic…',
    fix:     'Fixing issues…',
    tests:   'Writing unit tests…',
  }

  return (
    <aside className={styles.panel}>
      {/* Header */}
      <div className={styles.header}>
        <span className={styles.headerIcon}>🤖</span>
        <span className={styles.headerTitle}>AI Review</span>
        {totalIssues > 0 && (
          <span className={styles.badge}>
            {totalIssues} issue{totalIssues !== 1 ? 's' : ''}
          </span>
        )}
        <button className={styles.closeBtn} onClick={onClose} title="Close panel">×</button>
      </div>

      {/* Body */}
      <div className={styles.body}>

        {/* Loading */}
        {loading && (
          <div className={styles.loading}>
            <div className={styles.loadingSpinner} />
            <div className={styles.loadingText}>{loadingLabels[loadingAction] ?? 'Working…'}</div>
            <div className={styles.loadingHint}>Powered by Claude AI</div>
          </div>
        )}

        {/* Error */}
        {!loading && error && (
          <div className={styles.errorBox}>
            <div className={styles.errorTitle}>⛔ Error</div>
            <div className={styles.errorMsg}>{error}</div>
          </div>
        )}

        {/* Empty state */}
        {!loading && !error && !reviewResult && !outputResult && (
          <div className={styles.empty}>
            <div className={styles.emptyIcon}>🔍</div>
            <div className={styles.emptyTitle}>No review yet</div>
            <div className={styles.emptySub}>
              Click <strong>Review Code</strong> to get AI-powered analysis —
              bug detection, performance tips, security scan, and a quality score.
            </div>
          </div>
        )}

        {/* Review results */}
        {!loading && !error && reviewResult && (
          <>
            <ScoreCard
              score={reviewResult.score}
              summary={reviewResult.summary}
              scoreBreakdown={reviewResult.score_breakdown ?? reviewResult.scoreBreakdown ?? {}}
            />
            {SECTIONS.map(({ key, icon, title, category }) => (
              <IssueSection
                key={key}
                icon={icon}
                title={title}
                issues={reviewResult[key] ?? []}
                category={category}
                onJumpToLine={onJumpToLine}
              />
            ))}
          </>
        )}

        {/* Explain / Fix / Tests output */}
        {!loading && !error && outputResult && (
          <OutputPanel
            output={outputResult}
            onApplyFix={onApplyFix}
            onAddTestFile={onAddTestFile}
          />
        )}
      </div>

      {/* Footer */}
      <div className={styles.footer}>
        <button className="btn" style={{ flex: 1 }} onClick={onClearReview}>🗑 Clear</button>
        <button className="btn" style={{ flex: 1 }} onClick={onCopyReport}>📋 Copy Report</button>
      </div>
    </aside>
  )
}
