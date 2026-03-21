/**
 * components/ScoreCard.jsx
 * Animated SVG ring showing overall quality score, plus
 * four mini progress bars for the sub-category breakdown.
 */
import React from 'react'
import styles from './ScoreCard.module.css'

const RADIUS  = 26
const CIRC    = 2 * Math.PI * RADIUS

function scoreColor(s) {
  if (s >= 8) return '#3fb950'
  if (s >= 6) return '#58a6ff'
  if (s >= 4) return '#d29922'
  return '#f85149'
}

const BARS = [
  { key: 'correctness', label: 'Correct',  color: '#58a6ff' },
  { key: 'performance', label: 'Perf',     color: '#d29922' },
  { key: 'security',    label: 'Secure',   color: '#f85149' },
  { key: 'readability', label: 'Read',     color: '#3fb950' },
]

export default function ScoreCard({ score, summary, scoreBreakdown = {} }) {
  const color   = scoreColor(score)
  const dashOff = CIRC * (1 - score / 10)

  return (
    <div className={styles.card}>
      {/* Score ring */}
      <div className={styles.ring}>
        <svg width="64" height="64" viewBox="0 0 64 64" style={{ transform: 'rotate(-90deg)' }}>
          <circle cx="32" cy="32" r={RADIUS} fill="none" stroke="var(--bg3)" strokeWidth="5" />
          <circle
            cx="32" cy="32" r={RADIUS}
            fill="none"
            stroke={color}
            strokeWidth="5"
            strokeDasharray={CIRC.toFixed(2)}
            strokeDashoffset={dashOff.toFixed(2)}
            strokeLinecap="round"
            style={{ transition: 'stroke-dashoffset 1s ease' }}
          />
        </svg>
        <div className={styles.ringVal} style={{ color }}>{score}</div>
      </div>

      {/* Info column */}
      <div className={styles.info}>
        <div className={styles.title}>Quality Score</div>
        <div className={styles.summary}>{summary}</div>

        {BARS.map(({ key, label, color: barColor }) => {
          const val = scoreBreakdown[key] ?? 7
          return (
            <div key={key} className={styles.barRow}>
              <span className={styles.barLabel}>{label}</span>
              <div className={styles.barTrack}>
                <div
                  className={styles.barFill}
                  style={{
                    width: `${(val / 10) * 100}%`,
                    background: barColor,
                  }}
                />
              </div>
              <span className={styles.barVal}>{val}/10</span>
            </div>
          )
        })}
      </div>
    </div>
  )
}
