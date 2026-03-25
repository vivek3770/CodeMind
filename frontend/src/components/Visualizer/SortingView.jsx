/**
 * SortingView.jsx — animated bar chart for sorting algorithms
 */
import React from 'react'
import styles from './Visualizer.module.css'

export default function SortingView({ frame }) {
  if (!frame) return null
  const { arr, comparing, swapping, sorted, pivot } = frame
  const max = Math.max(...arr, 1)

  function barClass(i) {
    if (sorted?.includes(i)) return styles.barSorted
    if (swapping?.includes(i)) return styles.barSwap
    if (i === pivot) return styles.barPivot
    if (comparing?.includes(i)) return styles.barCompare
    return styles.barDefault
  }

  return (
    <div className={styles.barsWrap}>
      <div className={styles.barsTitle}>Array State</div>
      <div className={styles.bars}>
        {arr.map((val, i) => (
          <div key={i} className={`${styles.bar} ${barClass(i)}`}
            style={{ height: `${Math.max(6, (val / max) * 110)}px` }}>
            {arr.length <= 20 && <span className={styles.barVal}>{val}</span>}
          </div>
        ))}
      </div>
    </div>
  )
}
