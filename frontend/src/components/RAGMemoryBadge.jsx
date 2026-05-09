/**
 * RAGMemoryBadge.jsx
 * Shows in the AI panel when a similar code snippet was reviewed before.
 * "Similar code reviewed 3 days ago — score was 3/10, SQL injection found"
 */
import React from 'react'

function scoreColor(s) {
  if (s >= 8) return '#00ff9d'
  if (s >= 6) return '#58a6ff'
  if (s >= 4) return '#ffcc00'
  return '#ff4466'
}

export default function RAGMemoryBadge({ summary }) {
  if (!summary) return null

  const color = scoreColor(summary.score ?? 5)

  return (
    <div style={{
      background:   'rgba(0,212,255,0.04)',
      border:       '1px solid rgba(0,212,255,0.18)',
      borderRadius: 8,
      padding:      '9px 12px',
      fontSize:     11,
      color:        'var(--tx2)',
      lineHeight:   1.6,
      flexShrink:   0,
    }}>
      <div style={{
        fontSize:     10,
        fontWeight:   700,
        color:        'var(--cyan-dim)',
        textTransform:'uppercase',
        letterSpacing:'0.1em',
        marginBottom: 4,
        display:      'flex',
        alignItems:   'center',
        gap:          5,
      }}>
        <span>🧠</span> RAG Memory
      </div>
      <span>Similar code reviewed </span>
      <strong style={{ color: 'var(--tx1)' }}>
        {summary.timestamp || 'before'}
      </strong>
      <span> — previous score was </span>
      <strong style={{ color }}>
        {summary.score}/10
      </strong>
      {summary.issues && summary.issues !== 'no major issues' && (
        <span> with <strong style={{ color: 'var(--yellow)' }}>{summary.issues}</strong></span>
      )}
    </div>
  )
}
