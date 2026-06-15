/**
 * ReviewHistory/ReviewHistory.jsx
 * Dashboard showing code quality trends over time.
 * Uses only vanilla JS/CSS — no extra chart library needed.
 */
import React, { useState, useEffect, useCallback } from 'react'
import styles from './ReviewHistory.module.css'
import API_BASE from '../../config/api'

const API = API_BASE

function scoreColor(s) {
  if (s >= 8) return '#00ff9d'
  if (s >= 6) return '#58a6ff'
  if (s >= 4) return '#ffcc00'
  return '#ff4466'
}

function ScoreBadge({ score }) {
  return (
    <span className={styles.scoreBadge} style={{ background: `${scoreColor(score)}22`, color: scoreColor(score), border: `1px solid ${scoreColor(score)}55` }}>
      {score}/10
    </span>
  )
}

// ── Mini line chart (SVG, no library) ─────────────────────────
function TrendChart({ data }) {
  if (!data || data.length < 2) {
    return (
      <div className={styles.chartEmpty}>
        Need at least 2 reviews to show trend
      </div>
    )
  }

  const W = 340, H = 100
  const pad = { top: 10, right: 10, bottom: 24, left: 28 }
  const innerW = W - pad.left - pad.right
  const innerH = H - pad.top - pad.bottom

  const scores = data.map(d => d.score)
  const minS   = Math.max(0, Math.min(...scores) - 1)
  const maxS   = Math.min(10, Math.max(...scores) + 1)

  const xScale = i => pad.left + (i / (data.length - 1)) * innerW
  const yScale = s => pad.top + innerH - ((s - minS) / (maxS - minS)) * innerH

  const points = data.map((d, i) => `${xScale(i)},${yScale(d.score)}`)
  const polyline = points.join(' ')

  // Filled area
  const area = [
    `${xScale(0)},${pad.top + innerH}`,
    ...points,
    `${xScale(data.length - 1)},${pad.top + innerH}`,
  ].join(' ')

  return (
    <svg width="100%" viewBox={`0 0 ${W} ${H}`} className={styles.chart}>
      <defs>
        <linearGradient id="chartGrad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#00ff9d" stopOpacity="0.25" />
          <stop offset="100%" stopColor="#00ff9d" stopOpacity="0.02" />
        </linearGradient>
      </defs>

      {/* Y grid lines */}
      {[0, 5, 10].map(v => {
        if (v < minS || v > maxS) return null
        const y = yScale(v)
        return (
          <g key={v}>
            <line x1={pad.left} y1={y} x2={W - pad.right} y2={y}
              stroke="rgba(255,255,255,0.05)" strokeWidth={1} />
            <text x={pad.left - 4} y={y + 4} textAnchor="end"
              fontSize={9} fill="var(--tx3)" fontFamily="var(--font-mono)">{v}</text>
          </g>
        )
      })}

      {/* Area fill */}
      <polygon points={area} fill="url(#chartGrad)" />

      {/* Line */}
      <polyline points={polyline} fill="none"
        stroke="#00ff9d" strokeWidth={2} strokeLinejoin="round" strokeLinecap="round" />

      {/* Data points */}
      {data.map((d, i) => (
        <g key={i}>
          <circle cx={xScale(i)} cy={yScale(d.score)} r={4}
            fill={scoreColor(d.score)} stroke="var(--surface0)" strokeWidth={1.5} />
          <title>{d.filename} — {d.score}/10 — {d.timestamp?.slice(0, 10)}</title>
        </g>
      ))}

      {/* X axis labels (first and last) */}
      <text x={xScale(0)} y={H - 4} textAnchor="middle"
        fontSize={8} fill="var(--tx3)" fontFamily="var(--font-mono)">
        {data[0]?.timestamp?.slice(5, 10)}
      </text>
      <text x={xScale(data.length - 1)} y={H - 4} textAnchor="middle"
        fontSize={8} fill="var(--tx3)" fontFamily="var(--font-mono)">
        {data[data.length - 1]?.timestamp?.slice(5, 10)}
      </text>
    </svg>
  )
}

// ── Horizontal bar chart for issue types ──────────────────────
function IssueBar({ label, value, max, color }) {
  const pct = max > 0 ? (value / max) * 100 : 0
  return (
    <div className={styles.issueBarRow}>
      <div className={styles.issueBarLabel}>{label}</div>
      <div className={styles.issueBarTrack}>
        <div className={styles.issueBarFill}
          style={{ width: `${pct}%`, background: color }} />
      </div>
      <div className={styles.issueBarVal}>{value}</div>
    </div>
  )
}

// ── Main component ─────────────────────────────────────────────
export default function ReviewHistory({ onClose }) {
  const [stats,   setStats]   = useState(null)
  const [reviews, setReviews] = useState([])
  const [loading, setLoading] = useState(true)
  const [error,   setError]   = useState(null)

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const [statsRes, histRes] = await Promise.all([
        fetch(`${API}/history/stats`),
        fetch(`${API}/history?limit=20`),
      ])
      if (!statsRes.ok || !histRes.ok) throw new Error('Failed to load history')
      const [statsData, histData] = await Promise.all([
        statsRes.json(), histRes.json()
      ])
      setStats(statsData)
      setReviews(histData.reviews ?? [])
    } catch (e) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { load() }, [load])

  const handleClear = async () => {
    if (!window.confirm('Clear all review history?')) return
    await fetch(`${API}/history`, { method: 'DELETE' })
    load()
  }

  const issues = stats?.issue_totals ?? {}
  const maxIssue = Math.max(...Object.values(issues), 1)

  return (
    <div className={styles.panel}>
      {/* Header */}
      <div className={styles.header}>
        <span className={styles.headerIcon}>📈</span>
        <span className={styles.headerTitle}>Review History</span>
        <button className={styles.closeBtn} onClick={onClose}>×</button>
      </div>

      <div className={styles.body}>
        {loading && (
          <div className={styles.loading}>
            <div className={styles.spinner} />
            <span>Loading history…</span>
          </div>
        )}

        {error && (
          <div className={styles.error}>⛔ {error}</div>
        )}

        {!loading && !error && stats?.total_reviews === 0 && (
          <div className={styles.empty}>
            <div className={styles.emptyIcon}>📊</div>
            <div className={styles.emptyTitle}>No reviews yet</div>
            <div className={styles.emptySub}>
              Click <strong>Review Code</strong> to start tracking your code quality over time.
            </div>
          </div>
        )}

        {!loading && !error && stats && stats.total_reviews > 0 && (
          <>
            {/* Stat cards */}
            <div className={styles.statsGrid}>
              <div className={styles.statCard}>
                <div className={styles.statLabel}>Total Reviews</div>
                <div className={styles.statVal} style={{ color: 'var(--cyan)' }}>
                  {stats.total_reviews}
                </div>
              </div>
              <div className={styles.statCard}>
                <div className={styles.statLabel}>Average Score</div>
                <div className={styles.statVal} style={{ color: scoreColor(stats.average_score) }}>
                  {stats.average_score}/10
                </div>
              </div>
              <div className={styles.statCard}>
                <div className={styles.statLabel}>Most Common Issue</div>
                <div className={styles.statVal} style={{ fontSize: 13, color: 'var(--yellow)' }}>
                  {stats.most_common_issue
                    ? stats.most_common_issue.charAt(0).toUpperCase() + stats.most_common_issue.slice(1)
                    : '—'}
                </div>
              </div>
            </div>

            {/* Score trend chart */}
            <div className={styles.section}>
              <div className={styles.sectionTitle}>Score Trend</div>
              <TrendChart data={stats.score_trend ?? []} />
            </div>

            {/* Issue breakdown */}
            <div className={styles.section}>
              <div className={styles.sectionTitle}>Issue Breakdown</div>
              <IssueBar label="Bugs"        value={issues.bugs        ?? 0} max={maxIssue} color="#ff4466" />
              <IssueBar label="Security"    value={issues.security    ?? 0} max={maxIssue} color="#ffcc00" />
              <IssueBar label="Performance" value={issues.performance ?? 0} max={maxIssue} color="#ff8040" />
              <IssueBar label="Readability" value={issues.readability ?? 0} max={maxIssue} color="#58a6ff" />
            </div>

            {/* Per-file table */}
            {(stats.per_file ?? []).length > 0 && (
              <div className={styles.section}>
                <div className={styles.sectionTitle}>Per File</div>
                <table className={styles.table}>
                  <thead>
                    <tr>
                      <th>File</th>
                      <th>Reviews</th>
                      <th>Avg Score</th>
                      <th>Best</th>
                    </tr>
                  </thead>
                  <tbody>
                    {stats.per_file.map((f, i) => (
                      <tr key={i}>
                        <td className={styles.filename}>{f.filename}</td>
                        <td>{f.review_count}</td>
                        <td><ScoreBadge score={f.avg_score} /></td>
                        <td><ScoreBadge score={f.best_score} /></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {/* Recent reviews list */}
            <div className={styles.section}>
              <div className={styles.sectionTitle}>Recent Reviews</div>
              {reviews.map((r, i) => (
                <div key={i} className={styles.reviewItem}>
                  <div className={styles.reviewLeft}>
                    <div className={styles.reviewFile}>{r.filename}</div>
                    <div className={styles.reviewMeta}>
                      {r.timestamp?.slice(0, 16).replace('T', ' ')} · {r.language}
                      {r.bug_count > 0 && <span className={styles.bugChip}>{r.bug_count} bugs</span>}
                      {r.security_count > 0 && <span className={styles.secChip}>{r.security_count} security</span>}
                    </div>
                    {r.summary && <div className={styles.reviewSummary}>{r.summary}</div>}
                  </div>
                  <ScoreBadge score={r.score} />
                </div>
              ))}
            </div>
          </>
        )}
      </div>

      {/* Footer */}
      <div className={styles.footer}>
        <button className="btn" onClick={load} style={{ flex: 1 }}>↺ Refresh</button>
        <button className="btn" onClick={handleClear}
          style={{ flex: 1, color: 'var(--red)', borderColor: 'rgba(255,68,102,0.3)' }}>
          🗑 Clear All
        </button>
      </div>
    </div>
  )
}
