/**
 * ClassifierBadge.jsx
 * Small badge in the status bar showing bug classifier status.
 * Green = trained and ready, Yellow = not trained yet.
 */
import React, { useState, useEffect } from 'react'
import { API_ROOT } from '../config/api'

export default function ClassifierBadge() {
  const [info, setInfo] = useState(null)

  useEffect(() => {
    fetch(`${API_ROOT}/health`)
      .then(r => r.json())
      .then(d => setInfo(d.bug_classifier))
      .catch(() => {})
  }, [])

  if (!info) return null

  const ready   = info.available
  const acc     = info.accuracy ? `${(info.accuracy * 100).toFixed(0)}%` : null
  const color   = ready ? '#00ff9d' : '#ffcc00'
  const label   = ready
    ? `🧠 Classifier${acc ? ` ${acc}` : ''}`
    : '🧠 Not trained'

  return (
    <span style={{
      padding:      '0 10px',
      height:       '100%',
      display:      'flex',
      alignItems:   'center',
      gap:          5,
      borderRight:  '1px solid rgba(255,255,255,0.08)',
      fontSize:     11,
      fontFamily:   'var(--font-mono)',
      color,
      cursor:       'default',
      letterSpacing: '0.03em',
    }}
    title={info.message ?? (ready ? 'Bug classifier ready' : 'Run data_collector.py to train')}
    >
      <span style={{
        width: 5, height: 5,
        borderRadius: '50%',
        background: color,
        boxShadow: `0 0 5px ${color}`,
        flexShrink: 0,
      }} />
      {label}
    </span>
  )
}
