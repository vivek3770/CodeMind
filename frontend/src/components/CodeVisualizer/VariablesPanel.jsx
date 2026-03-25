/**
 * VariablesPanel.jsx
 * Shows all local variables from the current trace step.
 * Highlights variables that changed from the previous step.
 */
import React from 'react'
import styles from './CodeVisualizer.module.css'

function formatValue(v) {
  if (v === null || v === undefined) return 'None'
  if (typeof v === 'string') return `"${v}"`
  if (Array.isArray(v)) {
    if (v.length > 12) return `[${v.slice(0, 8).join(', ')}, … (${v.length} items)]`
    return `[${v.join(', ')}]`
  }
  if (typeof v === 'object') {
    const entries = Object.entries(v).slice(0, 6)
    return '{' + entries.map(([k, val]) => `${k}: ${val}`).join(', ') + '}'
  }
  return String(v)
}

export default function VariablesPanel({ variables, prevVariables }) {
  if (!variables || Object.keys(variables).length === 0) return null

  const entries = Object.entries(variables)

  return (
    <div className={styles.varsWrap}>
      <div className={styles.vizTitle} style={{ padding: '10px 12px 0' }}>
        Variables
      </div>
      <table className={styles.varsTable}>
        <tbody>
          {entries.map(([name, value]) => {
            const prevVal = prevVariables?.[name]
            const isNew     = prevVariables && !(name in prevVariables)
            const isChanged = !isNew && prevVal !== undefined && prevVal !== value

            return (
              <tr key={name} className={isChanged || isNew ? styles.changed : ''}>
                <td className={styles.varName}>
                  {name}
                  {isNew && <span className={styles.varNew}>NEW</span>}
                </td>
                <td className={styles.varValue}>
                  {formatValue(value)}
                  {isChanged && prevVal !== undefined && (
                    <span style={{
                      marginLeft: 8, fontSize: 10,
                      color: 'var(--tx3)', fontFamily: 'var(--font-mono)'
                    }}>
                      (was {formatValue(prevVal)})
                    </span>
                  )}
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}
