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

const LOADING_LABELS = {
  review:  'Reviewing your code',
  explain: 'Analysing code logic',
  fix:     'Fixing all issues',
  tests:   'Writing unit tests',
}

export default function AIPanel({ style,
  visible, loading, loadingAction,
  reviewResult, outputResult, error,
  onJumpToLine, onClearReview, onCopyReport,
  onApplyFix, onAddTestFile, onClose,
}) {
  if (!visible) return null

  const totalIssues = reviewResult
    ? (reviewResult.bugs?.length        ?? 0)
    + (reviewResult.security?.length    ?? 0)
    + (reviewResult.performance?.length ?? 0)
    + (reviewResult.readability?.length ?? 0)
    : 0

  return (
    <aside className={styles.panel} style={style}>
      {/* Header */}
      <div className={styles.header}>
        <span className={styles.headerIcon}>🤖</span>
        <span className={styles.headerTitle}>AI Review</span>
        {totalIssues > 0 && (
          <span className={styles.badge}>{totalIssues} ISSUES</span>
        )}
        <button className={styles.closeBtn} onClick={onClose} title="Close panel">×</button>
      </div>

      {/* Scrollable body */}
      <div className={styles.body}>

        {/* Loading */}
        {loading && (
          <div className={styles.loading}>
            <div className={styles.loadingRing} />
            <div className={styles.loadingText}>
              {LOADING_LABELS[loadingAction] ?? 'Working'}<span className={styles.dots} />
            </div>
            <div className={styles.loadingHint}>Powered by Gemini AI</div>
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
            <div className={styles.emptyOrb}>🔍</div>
            <div className={styles.emptyTitle}>No Review Yet</div>
            <div className={styles.emptySub}>
              Click <strong>Review Code</strong> for AI-powered bug detection,
              security scanning, performance tips, and a quality score.
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

        {/* Output panel */}
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
