/**
 * ArrayView.jsx
 * Renders the array state from a trace step.
 * Automatically picks bar chart (numeric) or cell grid (mixed).
 */
import React from 'react'
import styles from './CodeVisualizer.module.css'

export default function ArrayView({ vizState, varName }) {
  const arr = vizState?.array ?? []
  if (!arr.length) return null

  const comparing = vizState?.comparing ?? []
  const swapped   = vizState?.swapped   ?? []
  const sorted    = vizState?.sorted    ?? []

  const allNumeric = arr.every(v => typeof v === 'number')
  const max = allNumeric ? Math.max(...arr, 1) : 1

  function cellClass(i) {
    if (swapped.includes(i))  return styles.swapped
    if (comparing.includes(i)) return styles.compare
    if (sorted.includes(i))   return styles.sorted
    return styles.default
  }

  const title = varName
    ? `Array: ${varName} (${arr.length} items)`
    : `Array (${arr.length} items)`

  return (
    <div className={styles.arrayWrap}>
      <div className={styles.vizTitle}>{title}</div>

      {/* Bar chart for numeric arrays */}
      {allNumeric && arr.length <= 30 ? (
        <div className={styles.bars}>
          {arr.map((val, i) => {
            let barCls = styles.barDefault
            if (swapped.includes(i))   barCls = styles.barSwapped
            else if (comparing.includes(i)) barCls = styles.barCompare
            else if (sorted.includes(i))    barCls = styles.barSorted
            return (
              <div key={i}
                className={`${styles.bar} ${barCls}`}
                style={{ height: `${Math.max(6, (val / max) * 90)}px` }}>
                {arr.length <= 20 && (
                  <span className={styles.barLabel}>{val}</span>
                )}
              </div>
            )
          })}
        </div>
      ) : (
        /* Cell grid for non-numeric or large arrays */
        <div className={styles.cells}>
          {arr.map((val, i) => (
            <div key={i} className={`${styles.cell} ${cellClass(i)}`}>
              {String(val).slice(0, 4)}
              <span className={styles.cellIdx}>{i}</span>
            </div>
          ))}
        </div>
      )}

      {/* Index labels for bar chart */}
      {allNumeric && arr.length <= 30 && (
        <div style={{
          display: 'flex', gap: 3, marginTop: 4,
          paddingLeft: 0, fontSize: 9,
          fontFamily: 'var(--font-mono)', color: 'var(--tx3)'
        }}>
          {arr.map((_, i) => (
            <div key={i} style={{ flex: 1, textAlign: 'center' }}>{i}</div>
          ))}
        </div>
      )}

      {/* Comparing label */}
      {comparing.length === 2 && (
        <div style={{
          marginTop: 10, fontSize: 11,
          color: 'var(--yellow)', fontFamily: 'var(--font-mono)'
        }}>
          Comparing: arr[{comparing[0]}]={arr[comparing[0]]}
          {' '}vs{' '}
          arr[{comparing[1]}]={arr[comparing[1]]}
        </div>
      )}
    </div>
  )
}
