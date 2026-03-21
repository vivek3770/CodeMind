/**
 * components/OutputPanel.jsx
 * Renders the result of Explain / Fix Code / Generate Tests actions.
 * - explain → formatted markdown-ish text
 * - fix     → code block with "Apply to Editor" button
 * - tests   → code block with "Add to Project" button
 */
import React from 'react'
import styles from './OutputPanel.module.css'

function simpleMarkdown(text) {
  return text
    .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
    .replace(/`([^`\n]+)`/g, '<code class="inline-code">$1</code>')
    .replace(/^### (.+)$/gm, '<div class="md-h3">$1</div>')
    .replace(/^## (.+)$/gm,  '<div class="md-h2">$1</div>')
    .replace(/^# (.+)$/gm,   '<div class="md-h1">$1</div>')
    .replace(/^[-*] (.+)$/gm,'<div class="md-li">• $1</div>')
    .replace(/\n/g, '<br>')
}

export default function OutputPanel({ output, onApplyFix, onAddTestFile }) {
  if (!output) return null
  const { type, content, changes, framework, filename } = output

  return (
    <div className={styles.panel}>
      {/* ── Explain ── */}
      {type === 'explain' && (
        <div className={styles.section}>
          <div className={styles.head}>
            <span>💡 Code Explanation</span>
            <button
              className={styles.copyBtn}
              onClick={() => navigator.clipboard.writeText(content)}
            >
              Copy
            </button>
          </div>
          <div
            className={styles.body}
            dangerouslySetInnerHTML={{ __html: simpleMarkdown(content) }}
          />
        </div>
      )}

      {/* ── Fix ── */}
      {type === 'fix' && (
        <>
          <div className={styles.section}>
            <div className={styles.head}>
              <span>🔧 Fixed Code</span>
              <button className={styles.applyBtn} onClick={() => onApplyFix?.(content)}>
                Apply to Editor
              </button>
            </div>
            <div className={styles.body}>
              <pre className={styles.code}>{content}</pre>
            </div>
          </div>

          {changes?.length > 0 && (
            <div className={styles.changeList}>
              <div className={styles.changeTitle}>Changes made</div>
              {changes.map((c, i) => (
                <div key={i} className={styles.changeItem}>✓ {c}</div>
              ))}
            </div>
          )}
        </>
      )}

      {/* ── Tests ── */}
      {type === 'tests' && (
        <>
          <div className={styles.section}>
            <div className={styles.head}>
              <span>🧪 Unit Tests ({framework})</span>
              <button
                className={styles.applyBtn}
                onClick={() => onAddTestFile?.(content, filename)}
              >
                Add to Project
              </button>
            </div>
            <div className={styles.body}>
              <pre className={styles.code}>{content}</pre>
            </div>
          </div>
          <div className={styles.testInfo}>
            <span className={styles.testFilename}>📁 {filename}</span>
            <span className={styles.testHint}>Click "Add to Project" to create this file.</span>
          </div>
        </>
      )}
    </div>
  )
}
