/**
 * CodeVisualizer.jsx
 * Right panel that visualizes the ACTUAL code written in the Monaco editor.
 *
 * Flow:
 *   1. User clicks "▶ Visualize" in TopBar
 *   2. Editor code is sent to POST /api/visualize
 *   3. Backend safely executes and traces the code
 *   4. Returns step-by-step frames with variable states
 *   5. This panel animates through those frames
 *   6. Monaco editor highlights the currently executing line
 */
import React from 'react'
import ArrayView      from './ArrayView'
import VariablesPanel from './VariablesPanel'
import { StackView, QueueView } from './StackQueueView'
import styles from './CodeVisualizer.module.css'

const ALGO_LABELS = {
  bubble_sort:     'Bubble Sort',
  selection_sort:  'Selection Sort',
  insertion_sort:  'Insertion Sort',
  merge_sort:      'Merge Sort',
  quick_sort:      'Quick Sort',
  binary_search:   'Binary Search',
  linear_search:   'Linear Search',
  bfs:             'BFS',
  dfs:             'DFS',
  fibonacci:       'Fibonacci',
  factorial:       'Factorial',
  linked_list:     'Linked List',
  stack:           'Stack',
  queue:           'Queue',
  array_operation: 'Array Ops',
  general:         'General',
}

export default function CodeVisualizer({
  visible,
  onClose,
  style,
  // From useCodeVisualizer hook
  steps,
  frameIdx,
  playing,
  loading,
  error,
  truncated,
  algoHint,
  speed,
  currentStep,
  prevStep,
  progressPercent,
  togglePlay,
  stepBack,
  stepFwd,
  reset,
  clear,
  setSpeed,
}) {
  if (!visible) return null

  const viz      = currentStep?.visualization ?? {}
  const vars     = currentStep?.variables     ?? {}
  const prevVars = prevStep?.variables        ?? {}
  const hasSteps = steps.length > 0

  // Determine what to render based on viz type
  const renderViz = () => {
    if (!currentStep) return null

    switch (viz.type) {
      case 'array':
        return (
          <ArrayView
            vizState={viz}
            varName={viz.array_name}
          />
        )
      case 'stack': {
        const stackVarName = Object.keys(vars).find(
          k => Array.isArray(vars[k]) &&
               k.toLowerCase().includes('stack')
        ) ?? 'stack'
        return (
          <StackView
            items={viz.stack ?? vars[stackVarName] ?? []}
            varName={stackVarName}
          />
        )
      }
      case 'queue': {
        const queueVarName = Object.keys(vars).find(
          k => Array.isArray(vars[k]) &&
               (k.toLowerCase().includes('queue') || k === 'q')
        ) ?? 'queue'
        return (
          <QueueView
            items={viz.queue ?? vars[queueVarName] ?? []}
            varName={queueVarName}
          />
        )
      }
      default:
        return null
    }
  }

  return (
    <aside className={styles.panel} style={style}>

      {/* ── Header ─────────────────────────────────────── */}
      <div className={styles.header}>
        <span className={styles.headerIcon}>🎬</span>
        <span className={styles.headerTitle}>Code Visualizer</span>
        {algoHint && algoHint !== 'general' && (
          <span className={styles.algoChip}>
            {ALGO_LABELS[algoHint] ?? algoHint}
          </span>
        )}
        <button className={styles.closeBtn} onClick={onClose}>×</button>
      </div>

      {/* ── Playback controls ──────────────────────────── */}
      <div className={styles.controls}>
        <button className={styles.ctrlBtn} onClick={reset}
          disabled={!hasSteps} title="Go to start">⏮</button>

        <button className={styles.ctrlBtn} onClick={stepBack}
          disabled={!hasSteps || frameIdx === 0} title="Previous step">◀</button>

        <button className={`${styles.ctrlBtn} ${styles.playBtn}`}
          onClick={togglePlay} disabled={!hasSteps}
          title={playing ? 'Pause' : 'Play'}>
          {playing ? '⏸' : '▶'}
        </button>

        <button className={styles.ctrlBtn} onClick={stepFwd}
          disabled={!hasSteps || frameIdx === steps.length - 1}
          title="Next step">▶</button>

        <button className={styles.ctrlBtn} onClick={reset}
          disabled={!hasSteps} title="Restart">↺</button>

        {hasSteps && (
          <span className={styles.stepInfo}>
            {frameIdx + 1} / {steps.length}
          </span>
        )}

        <div className={styles.speedControl}>
          <span className={styles.speedLabel}>Speed</span>
          <input
            type="range" min={1} max={5} value={speed}
            onChange={e => setSpeed(+e.target.value)}
            className={styles.speedSlider}
          />
          <span className={styles.speedLabel}>{speed}×</span>
        </div>
      </div>

      {/* ── Progress bar ───────────────────────────────── */}
      {hasSteps && (
        <div className={styles.progressBar}>
          <div className={styles.progressFill}
            style={{ width: `${progressPercent}%` }} />
        </div>
      )}

      {/* ── Body ───────────────────────────────────────── */}
      <div className={styles.body}>

        {/* Loading */}
        {loading && (
          <div className={styles.loading}>
            <div className={styles.loadingRing} />
            <div className={styles.loadingText}>Tracing your code…</div>
          </div>
        )}

        {/* Error */}
        {!loading && error && (
          <div className={styles.errorBox}>
            <div className={styles.errorTitle}>⛔ Execution Error</div>
            <div className={styles.errorMsg}>{error}</div>
          </div>
        )}

        {/* Truncation warning */}
        {!loading && truncated && (
          <div className={styles.truncateWarning}>
            ⚠️ Output truncated at 500 steps. Use a smaller input array to see the full visualization.
          </div>
        )}

        {/* Empty state */}
        {!loading && !error && !hasSteps && (
          <div className={styles.empty}>
            <div className={styles.emptyOrb}>🎬</div>
            <div className={styles.emptyTitle}>No visualization yet</div>
            <div className={styles.emptySub}>
              Write Python code in the editor and click{' '}
              <strong style={{ color: 'var(--green)' }}>▶ Visualize</strong>{' '}
              to see your code execute step by step with live variable tracking.
            </div>
          </div>
        )}

        {/* Main visualization */}
        {!loading && hasSteps && currentStep && (
          <>
            {/* Data structure visualization */}
            {renderViz()}

            {/* Array visualization for all arrays in variables */}
            {viz.type === 'array' && viz.all_arrays &&
              Object.keys(viz.all_arrays).length > 1 &&
              Object.entries(viz.all_arrays)
                .filter(([k]) => k !== viz.array_name)
                .slice(0, 2)
                .map(([name, arr]) => (
                  <ArrayView
                    key={name}
                    vizState={{ ...viz, array: arr, array_name: name, comparing: [], swapped: [] }}
                    varName={name}
                  />
                ))
            }

            {/* Step description */}
            {currentStep.description && (
              <div className={styles.stepBox}>
                <div
                  className={styles.stepText}
                  dangerouslySetInnerHTML={{ __html: currentStep.description }}
                />
              </div>
            )}

            {/* Variables panel */}
            <VariablesPanel
              variables={vars}
              prevVariables={prevVars}
            />
          </>
        )}
      </div>

      {/* ── Legend ─────────────────────────────────────── */}
      {hasSteps && (
        <div className={styles.legend}>
          {[
            { color: '#2040aa', label: 'Default' },
            { color: '#ffcc00', label: 'Comparing' },
            { color: '#ff4466', label: 'Swapped'  },
            { color: '#00ff9d', label: 'Sorted'   },
          ].map(l => (
            <div key={l.label} className={styles.legendItem}>
              <div className={styles.legendDot} style={{ background: l.color }} />
              {l.label}
            </div>
          ))}
        </div>
      )}

      {/* ── Footer ─────────────────────────────────────── */}
      <div className={styles.footer}>
        <button className="btn" style={{ flex: 1 }} onClick={clear}>
          🗑 Clear
        </button>
        <button className="btn" style={{ flex: 1 }}
          onClick={() => { reset(); setTimeout(togglePlay, 100) }}
          disabled={!hasSteps}>
          ↺ Replay
        </button>
      </div>
    </aside>
  )
}
