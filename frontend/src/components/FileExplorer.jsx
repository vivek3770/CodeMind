import React, { useState } from 'react'
import { getIconForFilename } from '../utils/fileUtils'
import SemanticSearch from './SemanticSearch'
import FileUpload from './FileUpload'
import styles from './FileExplorer.module.css'

export default function FileExplorer({ files, activeFile, onOpenFile, onAddFile, onCloseFile, onFilesUploaded, issueCounts = {}, style, jumpToLine }) {
  const [showModal, setShowModal] = useState(false)
  const [newName, setNewName] = useState('')

  const handleAdd = () => {
    const name = newName.trim()
    if (!name) return
    onAddFile(name); setNewName(''); setShowModal(false)
  }

  return (
    <aside className={styles.sidebar} style={style}>
      <div className={styles.header}>Explorer</div>
      <SemanticSearch onResultClick={result => { onOpenFile(result.filename); setTimeout(() => jumpToLine?.(result.start_line), 100) }} />
      <FileUpload onFilesUploaded={onFilesUploaded}>
        <div className={styles.tree}>
          <div className={styles.treeRoot}>▾ src/</div>
          {Object.keys(files).map(fname => {
            const count = issueCounts[fname] ?? 0
            return (
              <div key={fname} className={`${styles.fileItem} ${fname === activeFile ? styles.active : ''}`} onClick={() => onOpenFile(fname)}>
                <span className={styles.icon}>{getIconForFilename(fname)}</span>
                <span className={styles.name}>{fname}</span>
                {count > 0 && <span className={styles.badge}>{count}</span>}
                <button className={styles.closeBtn} onClick={e => { e.stopPropagation(); onCloseFile(fname) }}>×</button>
              </div>
            )
          })}
        </div>
        <div className={styles.footer}>
          <button className={styles.addBtn} onClick={() => setShowModal(true)}>+ New File</button>
        </div>
      </FileUpload>
      {showModal && (
        <div className={styles.modalBackdrop} onClick={() => setShowModal(false)}>
          <div className={styles.modal} onClick={e => e.stopPropagation()}>
            <div className={styles.modalTitle}>New File</div>
            <input className={styles.modalInput} value={newName} onChange={e => setNewName(e.target.value)} onKeyDown={e => e.key === 'Enter' && handleAdd()} placeholder="filename.py" autoFocus />
            <div className={styles.modalActions}>
              <button className="btn" onClick={() => setShowModal(false)}>Cancel</button>
              <button className="btn btn-primary" onClick={handleAdd}>Create</button>
            </div>
          </div>
        </div>
      )}
    </aside>
  )
}
