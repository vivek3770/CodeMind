/**
 * utils/markerUtils.js
 * Helpers for applying and clearing Monaco editor diagnostic markers.
 */

/**
 * Maps a string severity to the Monaco MarkerSeverity enum value.
 */
export function toMonacoSeverity(monaco, severity) {
  switch (severity) {
    case 'error':   return monaco.MarkerSeverity.Error
    case 'warning': return monaco.MarkerSeverity.Warning
    default:        return monaco.MarkerSeverity.Info
  }
}

/**
 * Applies a list of AI-detected issues as Monaco editor markers (squiggles).
 * @param {object} monaco - The monaco namespace
 * @param {object} model  - The current editor model
 * @param {Array}  issues - Flat array of {line, message, severity, category}
 */
export function applyMarkers(monaco, model, issues) {
  if (!monaco || !model) return
  const markers = issues.map((issue) => ({
    startLineNumber: issue.line ?? 1,
    endLineNumber:   issue.line ?? 1,
    startColumn: 1,
    endColumn:   200,
    message:  `[${issue.category}] ${issue.message}`,
    severity: toMonacoSeverity(monaco, issue.severity),
    source:   'AI Review',
  }))
  monaco.editor.setModelMarkers(model, 'ai-review', markers)
}

/**
 * Clears all AI Review markers from the current model.
 */
export function clearMarkers(monaco, model) {
  if (!monaco || !model) return
  monaco.editor.setModelMarkers(model, 'ai-review', [])
}
