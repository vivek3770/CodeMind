import React, { useState, useRef, useCallback } from 'react'
import styles from './FileUpload.module.css'
import { getLanguageFromFilename } from '../utils/fileUtils'

const SUPPORTED = ['.py','.js','.jsx','.ts','.tsx','.java','.cpp','.c','.h','.go','.rs','.html','.css','.json','.md','.txt','.sh','.yaml','.yml']

function isSupported(name) { return SUPPORTED.includes('.' + name.split('.').pop().toLowerCase()) }

function readFile(file) {
  return new Promise((res, rej) => {
    const r = new FileReader()
    r.onload = e => res(e.target.result)
    r.onerror = () => rej(new Error(`Failed to read ${file.name}`))
    r.readAsText(file)
  })
}

export default function FileUpload({ onFilesUploaded, children }) {
  const [dragging, setDragging] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [errors, setErrors] = useState([])
  const inputRef = useRef(null)

  const processFiles = useCallback(async (fileList) => {
    setUploading(true); setErrors([])
    const errs = [], uploads = []
    for (const file of Array.from(fileList)) {
      if (file.size > 1024 * 1024) { errs.push(`${file.name}: too large (max 1MB)`); continue }
      if (!isSupported(file.name)) { errs.push(`${file.name}: unsupported type`); continue }
      try { uploads.push({ filename: file.name, content: await readFile(file), language: getLanguageFromFilename(file.name) }) }
      catch (e) { errs.push(`${file.name}: ${e.message}`) }
    }
    if (uploads.length > 0) onFilesUploaded(uploads)
    if (errs.length > 0) { setErrors(errs); setTimeout(() => setErrors([]), 4000) }
    setUploading(false)
  }, [onFilesUploaded])

  const onDrop = e => { e.preventDefault(); setDragging(false); processFiles(e.dataTransfer.files) }

  return (
    <div className={styles.dropZone} onDragOver={e => { e.preventDefault(); setDragging(true) }} onDragLeave={e => { e.preventDefault(); setDragging(false) }} onDrop={onDrop}>
      <input ref={inputRef} type="file" multiple accept={SUPPORTED.join(',')} className={styles.hiddenInput} onChange={e => { if (e.target.files?.length) { processFiles(e.target.files); e.target.value = '' } }} />
      {children}
      {dragging && <div className={styles.overlay}><div className={styles.overlayContent}><div className={styles.overlayIcon}>📂</div><div className={styles.overlayText}>Drop files here</div><div className={styles.overlaySub}>.py .js .ts .java .go .rs …</div></div></div>}
      {uploading && <div className={styles.uploadingBar}><div className={styles.uploadingSpinner} />Reading files…</div>}
      {errors.length > 0 && <div className={styles.errors}>{errors.map((e,i) => <div key={i} className={styles.errorItem}>⚠️ {e}</div>)}</div>}
      <button className={styles.uploadBtn} onClick={() => inputRef.current?.click()} disabled={uploading} title="Upload files or drag & drop">{uploading ? '…' : '↑ Upload Files'}</button>
    </div>
  )
}
