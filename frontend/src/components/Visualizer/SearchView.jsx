/**
 * SearchView.jsx — array cell view for linear/binary search
 */
import React from 'react'
import styles from './Visualizer.module.css'

export default function SearchView({ frame, algoId }) {
  if (!frame) return null

  if (algoId === 'binary') {
    const { arr, low, high, mid, found } = frame
    return (
      <div className={styles.arrayWrap}>
        <div className={styles.arrayTitle}>Array (sorted)</div>
        <div className={styles.arrayCells}>
          {arr.map((val, i) => {
            let cls = styles.default
            if (found === i) cls = styles.sorted
            else if (i === mid) cls = styles.current
            else if (i >= low && i <= high) cls = styles.visited
            else cls = styles.inStack
            return (
              <div key={i} className={`${styles.cell} ${cls}`}>
                {val}
                <div style={{ position: 'absolute', bottom: -16, fontSize: 9, color: 'var(--tx3)', fontFamily: 'var(--font-mono)' }}>{i}</div>
              </div>
            )
          })}
        </div>
        <div style={{ display: 'flex', gap: 16, marginTop: 8, fontSize: 11, fontFamily: 'var(--font-mono)', color: 'var(--tx2)' }}>
          <span style={{ color: 'var(--cyan)' }}>low={low}</span>
          <span style={{ color: '#b060ff' }}>mid={frame.mid >= 0 ? frame.mid : '?'}</span>
          <span style={{ color: 'var(--yellow)' }}>high={high}</span>
        </div>
      </div>
    )
  }

  // Linear search
  const { arr, current, found, visited } = frame
  return (
    <div className={styles.arrayWrap}>
      <div className={styles.arrayTitle}>Array</div>
      <div className={styles.arrayCells}>
        {arr.map((val, i) => {
          let cls = styles.default
          if (found === i) cls = styles.sorted
          else if (i === current) cls = styles.current
          else if (visited?.includes(i)) cls = styles.visited
          return (
            <div key={i} className={`${styles.cell} ${cls}`}>
              {val}
              <div style={{ position: 'absolute', bottom: -16, fontSize: 9, color: 'var(--tx3)', fontFamily: 'var(--font-mono)' }}>{i}</div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
