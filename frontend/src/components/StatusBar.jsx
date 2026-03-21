/**
 * components/StatusBar.jsx
 * Bottom status bar showing AI status, language, line/col, encoding.
 */
import React from 'react'
import styles from './StatusBar.module.css'

export default function StatusBar({ status, language, lines, chars, cursor }) {
  return (
    <div className={styles.bar}>
      <span className={styles.left}>
        <span className={styles.dot} />
        <span>{status || 'Ready'}</span>
      </span>

      <span className={styles.item}>{language}</span>

      <span className={styles.right}>
        <span className={styles.item}>Lines: {lines}</span>
        <span className={styles.item}>Chars: {chars}</span>
        <span className={styles.item}>
          Ln {cursor.line}, Col {cursor.col}
        </span>
        <span className={styles.item}>UTF-8</span>
      </span>
    </div>
  )
}
