/**
 * StackQueueView.jsx
 * Renders stack or queue data structures detected from user code.
 */
import React from 'react'
import styles from './CodeVisualizer.module.css'

export function StackView({ items = [], varName }) {
  return (
    <div className={styles.stackWrap}>
      <div className={styles.vizTitle}>
        Stack: {varName} ({items.length} items)
      </div>
      {items.length === 0 ? (
        <div style={{ padding: 10, fontSize: 12, color: 'var(--tx3)',
                      border: '1px dashed var(--border1)', borderRadius: 6, textAlign: 'center' }}>
          Empty stack
        </div>
      ) : (
        <div className={styles.stackCells}>
          {items.map((val, i) => (
            <div key={i}
              className={`${styles.stackCell} ${i === items.length - 1 ? styles.top : ''}`}>
              {String(val)}
              {i === items.length - 1 && (
                <span style={{ marginLeft: 8, fontSize: 9, opacity: 0.6 }}>← TOP</span>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

export function QueueView({ items = [], varName }) {
  return (
    <div className={styles.queueWrap}>
      <div className={styles.vizTitle}>
        Queue: {varName} ({items.length} items)
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
        <div style={{ fontSize: 10, color: 'var(--tx3)', marginRight: 2 }}>FRONT→</div>
        {items.length === 0 ? (
          <div style={{ padding: '6px 14px', fontSize: 12, color: 'var(--tx3)',
                        border: '1px dashed var(--border1)', borderRadius: 6 }}>
            Empty queue
          </div>
        ) : (
          <div className={styles.queueRow}>
            {items.map((val, i) => (
              <div key={i}
                className={`${styles.queueCell} ${i === 0 ? styles.front : ''}`}>
                {String(val)}
              </div>
            ))}
          </div>
        )}
        <div style={{ fontSize: 10, color: 'var(--tx3)', marginLeft: 2 }}>←REAR</div>
      </div>
    </div>
  )
}
