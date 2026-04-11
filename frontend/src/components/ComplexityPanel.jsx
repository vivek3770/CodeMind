/**
 * ComplexityPanel.jsx
 * Shows per-function complexity metrics after a Review Code action.
 * Displayed as a collapsible section inside the AI panel.
 */
import React, { useState } from 'react'
import styles from './ComplexityPanel.module.css'

const RANK_COLOR = {
  A: '#00ff9d', B: '#00d4ff',
  C: '#ffcc00', D: '#ff8040',
  E: '#ff4466', F: '#ff0033',
}

function RankBadge({ rank }) {
  return (
    <span className={styles.rankBadge}
      style={{ background: `${RANK_COLOR[rank] ?? '#888'}22`,
               color: RANK_COLOR[rank] ?? '#888',
               border: `1px solid ${RANK_COLOR[rank] ?? '#888'}44` }}>
      {rank}
    </span>
  )
}

function MetricBar({ value, max = 25, color }) {
  const pct = Math.min(100, (value / max) * 100)
  return (
    <div className={styles.metricBar}>
      <div className={styles.metricFill}
        style={{ width: `${pct}%`, background: color }} />
    </div>
  )
}

export default function ComplexityPanel({ data, onJumpToLine }) {
  const [open, setOpen] = useState(true)

  if (!data) return null

  const { functions = [], file_metrics = {}, error } = data
  const fm = file_metrics

  return (
    <div className={styles.section}>
      {/* Header */}
      <div className={styles.head} onClick={() => setOpen(o => !o)}>
        <span className={styles.icon}>🔬</span>
        <span className={styles.title}>Complexity Analysis</span>
        <span className={styles.badge}
          style={{ background: `${RANK_COLOR[fm.overall_rank] ?? '#888'}22`,
                   color: RANK_COLOR[fm.overall_rank] ?? '#888',
                   border: `1px solid ${RANK_COLOR[fm.overall_rank] ?? '#888'}44` }}>
          Rank {fm.overall_rank ?? '?'}
        </span>
        <span className={`${styles.chevron} ${open ? styles.chevronOpen : ''}`}>›</span>
      </div>

      {open && (
        <div className={styles.body}>
          {error && (
            <div className={styles.error}>⚠️ {error}</div>
          )}

          {/* File-level metrics */}
          <div className={styles.fileMeta}>
            <div className={styles.metaItem}>
              <span className={styles.metaLabel}>Lines of code</span>
              <span className={styles.metaVal}>{fm.lines?.code ?? '—'}</span>
            </div>
            <div className={styles.metaItem}>
              <span className={styles.metaLabel}>Max nesting</span>
              <span className={styles.metaVal}
                style={{ color: (fm.max_nesting_depth ?? 0) > 4 ? 'var(--red)' : 'var(--green)' }}>
                {fm.max_nesting_depth ?? '—'}
              </span>
            </div>
            {fm.maintainability_index != null && (
              <div className={styles.metaItem}>
                <span className={styles.metaLabel}>Maintainability</span>
                <span className={styles.metaVal}
                  style={{ color: fm.maintainability_index > 65 ? 'var(--green)'
                                : fm.maintainability_index > 40 ? 'var(--yellow)'
                                : 'var(--red)' }}>
                  {fm.maintainability_index}/100
                </span>
              </div>
            )}
            <div className={styles.metaItem}>
              <span className={styles.metaLabel}>Functions</span>
              <span className={styles.metaVal}>{fm.function_count ?? 0}</span>
            </div>
          </div>

          {/* Per-function table */}
          {functions.length > 0 && (
            <div className={styles.funcList}>
              <div className={styles.funcHeader}>
                <span>Function</span>
                <span>Cyclomatic</span>
                <span>Cognitive</span>
                <span>Rank</span>
              </div>
              {functions.map((f, i) => (
                <div key={i}
                  className={styles.funcRow}
                  onClick={() => onJumpToLine?.(f.line)}
                  title={`Jump to line ${f.line}`}>
                  <div className={styles.funcName}>
                    <span className={styles.funcLine}>L{f.line}</span>
                    {f.name}
                  </div>
                  <div className={styles.metricCell}>
                    <MetricBar value={f.cyclomatic} color={RANK_COLOR[f.rank]} />
                    <span className={styles.metricNum}>{f.cyclomatic}</span>
                  </div>
                  <div className={styles.metricCell}>
                    <MetricBar value={f.cognitive} color={RANK_COLOR[f.rank]} />
                    <span className={styles.metricNum}>{f.cognitive}</span>
                  </div>
                  <RankBadge rank={f.rank} />
                </div>
              ))}
            </div>
          )}

          {functions.length === 0 && !error && (
            <div className={styles.noFuncs}>No functions detected</div>
          )}

          {/* Legend */}
          <div className={styles.legend}>
            {[['A', '1–5'], ['B', '6–10'], ['C', '11–15'], ['D', '16–20'], ['E/F', '21+']].map(([r, range]) => (
              <div key={r} className={styles.legendItem}>
                <span style={{ color: RANK_COLOR[r[0]] }}>{r}</span>
                <span className={styles.legendRange}>{range}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
