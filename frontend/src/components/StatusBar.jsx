import React from 'react'
import styles from './StatusBar.module.css'

export default function StatusBar({ status, language, lines, chars, cursor }) {
  return (
    <div className={styles.bar}>
      <div className={styles.statusChip}>
        <div className={styles.dot} />
        <span>{status || 'Ready'}</span>
      </div>

      <div className={styles.langChip}>
        {language?.toUpperCase() || 'PYTHON'}
      </div>

      <div className={styles.right}>
        <div className={styles.item}>⌥ Ln {cursor.line}</div>
        <div className={styles.item}>Col {cursor.col}</div>
        <div className={styles.item}>{lines} lines</div>
        <div className={styles.item}>{chars} chars</div>
        <div className={styles.item}>UTF-8</div>
        <div className={styles.item}>CRLF</div>
      </div>
    </div>
  )
}
