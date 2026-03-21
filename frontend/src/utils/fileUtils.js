/**
 * utils/fileUtils.js
 * Helpers for mapping filenames to language IDs and display icons.
 */

const EXT_TO_LANG = {
  py: 'python',
  js: 'javascript',
  jsx: 'javascript',
  ts: 'typescript',
  tsx: 'typescript',
  java: 'java',
  cpp: 'cpp',
  cc: 'cpp',
  c: 'c',
  go: 'go',
  rs: 'rust',
  html: 'html',
  css: 'css',
  json: 'json',
  md: 'markdown',
  sh: 'shell',
  yaml: 'yaml',
  yml: 'yaml',
}

const LANG_ICONS = {
  python: '🐍',
  javascript: '⚡',
  typescript: '🔷',
  java: '☕',
  cpp: '⚙️',
  c: '⚙️',
  go: '🐹',
  rust: '🦀',
  html: '🌐',
  css: '🎨',
  json: '📋',
  markdown: '📝',
  shell: '💻',
  yaml: '⚙️',
}

/**
 * Returns the Monaco language ID for a given filename.
 */
export function getLanguageFromFilename(filename) {
  const ext = filename.split('.').pop()?.toLowerCase() ?? ''
  return EXT_TO_LANG[ext] ?? 'plaintext'
}

/**
 * Returns an emoji icon for a given filename.
 */
export function getIconForFilename(filename) {
  const lang = getLanguageFromFilename(filename)
  return LANG_ICONS[lang] ?? '📄'
}

/**
 * Derives the test filename for a given source filename and language.
 */
export function getTestFilename(filename, language) {
  const parts = filename.split('.')
  const ext = parts.pop()
  const base = parts.join('.')
  switch (language) {
    case 'python':     return `test_${base}.py`
    case 'javascript': return `${base}.test.js`
    case 'typescript': return `${base}.test.ts`
    case 'java':       return `${base}Test.java`
    case 'go':         return `${base}_test.go`
    default:           return `${base}_test.${ext}`
  }
}

/**
 * Default starter content for a new blank file.
 */
export function getDefaultContent(language) {
  const starters = {
    python:     '# New file\n',
    javascript: '// New file\n',
    typescript: '// New file\n',
    java:       '// New file\npublic class NewFile {\n}\n',
    cpp:        '// New file\n#include <iostream>\n',
    go:         '// New file\npackage main\n',
  }
  return starters[language] ?? ''
}
