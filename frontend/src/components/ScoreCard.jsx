import React from 'react'
import styles from './ScoreCard.module.css'

const R = 28
const CIRC = 2 * Math.PI * R

function scoreColor(s) {
  if (s >= 8) return '#00ff9d'
  if (s >= 6) return '#00d4ff'
  if (s >= 4) return '#ffcc00'
  return '#ff4466'
}

const BARS = [
  { key: 'correctness', label: 'Correct', color: '#00d4ff' },
  { key: 'performance', label: 'Perf',    color: '#ffcc00' },
  { key: 'security',    label: 'Secure',  color: '#ff4466' },
  { key: 'readability', label: 'Read',    color: '#00ff9d' },
]

export default function ScoreCard({ score, summary, scoreBreakdown = {} }) {
  const color   = scoreColor(score)
  const dashOff = CIRC * (1 - score / 10)

  return (
    <div className={styles.card}>
      <div className={styles.ring}>
        <svg width="72" height="72" viewBox="0 0 72 72" style={{ color }}>
          <circle cx="36" cy="36" r={R} fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="5" />
          <circle cx="36" cy="36" r={R} fill="none" stroke={color} strokeWidth="5"
            strokeDasharray={CIRC.toFixed(2)} strokeDashoffset={dashOff.toFixed(2)}
            strokeLinecap="round"
            style={{ transition: 'stroke-dashoffset 1.2s cubic-bezier(0.4,0,0.2,1)', filter: `drop-shadow(0 0 6px ${color})` }}
          />
        </svg>
        <div className={styles.ringVal} style={{ color }}>{score}</div>
      </div>

      <div className={styles.info}>
        <div className={styles.title}>Quality Score</div>
        <div className={styles.summary}>{summary}</div>
        {BARS.map(({ key, label, color: c }) => {
          const val = scoreBreakdown[key] ?? 7
          return (
            <div key={key} className={styles.barRow}>
              <span className={styles.barLabel}>{label}</span>
              <div className={styles.barTrack}>
                <div className={styles.barFill}
                  style={{ width: `${(val / 10) * 100}%`, background: c, boxShadow: `0 0 6px ${c}40` }} />
              </div>
              <span className={styles.barVal}>{val}/10</span>
            </div>
          )
        })}
      </div>
    </div>
  )
}
