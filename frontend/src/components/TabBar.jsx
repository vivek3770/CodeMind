/**
 * components/TabBar.jsx
 * Horizontal tab strip showing all open files above the editor.
 */
import React from 'react'
import { getIconForFilename } from '../utils/fileUtils'
import styles from './TabBar.module.css'

export default function TabBar({ files, activeFile, onOpenFile, onCloseFile }) {
  return (
    <div className={styles.tabBar}>
      {Object.keys(files).map((fname) => (
        <div
          key={fname}
          className={`${styles.tab} ${fname === activeFile ? styles.active : ''}`}
          onClick={() => onOpenFile(fname)}
          title={fname}
        >
          <span className={styles.icon}>{getIconForFilename(fname)}</span>
          <span className={styles.name}>{fname}</span>
          <button
            className={styles.closeBtn}
            onClick={(e) => {
              e.stopPropagation()
              onCloseFile(fname)
            }}
            title={`Close ${fname}`}
          >
            ×
          </button>
        </div>
      ))}
    </div>
  )
}
