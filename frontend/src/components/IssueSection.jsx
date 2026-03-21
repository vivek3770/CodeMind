/**
 * components/IssueSection.jsx
 * A collapsible section (Bugs / Security / Performance / Readability)
 * that lists individual issues. Clicking an issue jumps the editor to that line.
 */
import React, { useState } from 'react'
import styles from './IssueSection.module.css'

const COUNT_COLORS = {
  red:    styles.countRed,
  yellow: styles.countYellow,
  blue:   styles.countBlue,
  green:  styles.countGreen,
  gray:   styles.countGray,
}

function badgeColor(issues, category) {
  if (!issues.length) return 'gray'
  if (category === 'bugs' || category === 'security') {
    return issues.some((i) => i.severity === 'error') ? 'red' : 'yellow'
  }
  if (category === 'performance') return 'yellow'
  return 'blue'
}

function severityClass(sev) {
  if (sev === 'error')   return styles.sevError
  if (sev === 'warning') return styles.sevWarning
  return styles.sevInfo
}

export default function IssueSection({ icon, title, issues = [], category, onJumpToLine }) {
  const [open, setOpen] = useState(issues.length > 0)
  const color = badgeColor(issues, category)

  return (
    <div className={styles.section}>
      {/* Header row */}
      <div className={styles.head} onClick={() => setOpen((o) => !o)}>
        <span className={styles.icon}>{icon}</span>
        <span className={styles.title}>{title}</span>
        <span className={`${styles.count} ${COUNT_COLORS[color]}`}>{issues.length}</span>
        <span className={`${styles.chevron} ${open ? styles.chevronOpen : ''}`}>›</span>
      </div>

      {/* Issue list */}
      {open && (
        <div className={styles.list}>
          {issues.length === 0 ? (
            <div className={styles.empty}>✓ No issues found</div>
          ) : (
            issues.map((issue, idx) => (
              <div
                key={idx}
                className={styles.item}
                onClick={() => onJumpToLine?.(issue.line)}
                title={`Jump to line ${issue.line}`}
              >
                <div className={styles.msg}>{issue.message}</div>
                <div className={styles.meta}>
                  <span className={styles.line}>Line {issue.line ?? '?'}</span>
                  <span className={`${styles.sev} ${severityClass(issue.severity)}`}>
                    {issue.severity ?? 'info'}
                  </span>
                </div>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  )
}
