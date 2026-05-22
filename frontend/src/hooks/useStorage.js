import { useCallback, useRef } from 'react'
const FILES_KEY = 'codemind_files'
const ACTIVE_KEY = 'codemind_active_file'
const DEBOUNCE_MS = 500
const MAX_BYTES = 4 * 1024 * 1024

export function saveFilesToStorage(files, activeFile) {
  try {
    const json = JSON.stringify(files)
    if (json.length > MAX_BYTES) return
    localStorage.setItem(FILES_KEY, json)
    localStorage.setItem(ACTIVE_KEY, activeFile)
  } catch (e) { console.warn('Save failed:', e.message) }
}

export function loadFilesFromStorage() {
  try {
    const raw = localStorage.getItem(FILES_KEY)
    const active = localStorage.getItem(ACTIVE_KEY)
    if (!raw) return null
    const files = JSON.parse(raw)
    const valid = Object.entries(files).every(([,v]) => typeof v === 'object' && 'language' in v && 'content' in v)
    if (!valid || Object.keys(files).length === 0) return null
    return { files, activeFile: active && active in files ? active : Object.keys(files)[0] }
  } catch { return null }
}

export function clearStorage() {
  localStorage.removeItem(FILES_KEY)
  localStorage.removeItem(ACTIVE_KEY)
}

export function useDebouncedSave() {
  const timer = useRef(null)
  return useCallback((files, activeFile) => {
    clearTimeout(timer.current)
    timer.current = setTimeout(() => saveFilesToStorage(files, activeFile), DEBOUNCE_MS)
  }, [])
}
