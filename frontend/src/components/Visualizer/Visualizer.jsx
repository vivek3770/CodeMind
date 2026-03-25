/**
 * Visualizer.jsx — Algorithm Visualizer Panel
 * Replaces the AI Panel when activated from the TopBar.
 * Supports: Sorting · Searching · Graph Traversal · Recursion · Data Structures
 */
import React, { useState, useEffect, useRef, useCallback } from 'react'
import SortingView from './SortingView'
import SearchView  from './SearchView'
import GraphView   from './GraphView'
import RecursionView from './RecursionView'
import { StackView, QueueView, LinkedListView } from './DataStructureView'
import {
  bubbleSort, insertionSort, selectionSort, mergeSort, quickSort,
  linearSearch, binarySearch,
  bfsTraversal, dfsTraversal,
  fibonacciTree, factorialTree,
  stackOperations, queueOperations, linkedListOps,
  randomArray, parseArray,
  ALGORITHM_CATALOG, DEFAULT_GRAPH, DEFAULT_STACK_OPS, DEFAULT_QUEUE_OPS, DEFAULT_LL_OPS,
} from './algorithms'
import styles from './Visualizer.module.css'

const CATEGORIES = [
  { id: 'sorting',        label: '↕ Sort'   },
  { id: 'searching',      label: '🔍 Search' },
  { id: 'graph',          label: '🕸 Graph'  },
  { id: 'recursion',      label: '🌀 Recur'  },
  { id: 'datastructures', label: '📦 DS'     },
]

function generateFrames(algoId, inputStr, target) {
  const arr = parseArray(inputStr)
  if (!arr.length) return []

  switch (algoId) {
    case 'bubble':    return bubbleSort(arr)
    case 'insertion': return insertionSort(arr)
    case 'selection': return selectionSort(arr)
    case 'merge':     return mergeSort(arr)
    case 'quick':     return quickSort(arr)
    case 'linear':    return linearSearch(arr, parseInt(target) || arr[0])
    case 'binary':    return binarySearch(arr, parseInt(target) || arr[0])
    case 'bfs':       return bfsTraversal(DEFAULT_GRAPH, 0)
    case 'dfs':       return dfsTraversal(DEFAULT_GRAPH, 0)
    case 'fibonacci': return fibonacciTree(Math.min(parseInt(inputStr) || 5, 7))
    case 'factorial': return factorialTree(Math.min(parseInt(inputStr) || 5, 8))
    case 'stack':     return stackOperations(DEFAULT_STACK_OPS)
    case 'queue':     return queueOperations(DEFAULT_QUEUE_OPS)
    case 'linkedlist':return linkedListOps(DEFAULT_LL_OPS)
    default:          return []
  }
}

function getComplexity(algoId) {
  for (const cat of Object.values(ALGORITHM_CATALOG)) {
    const found = cat.find(a => a.id === algoId)
    if (found) return found
  }
  return null
}

export default function Visualizer({ visible, onClose, style }) {
  const [category, setCategory]   = useState('sorting')
  const [algoId,   setAlgoId]     = useState('bubble')
  const [inputStr, setInputStr]   = useState('64,34,25,12,22,11,90')
  const [target,   setTarget]     = useState('25')
  const [frames,   setFrames]     = useState([])
  const [frameIdx, setFrameIdx]   = useState(0)
  const [playing,  setPlaying]    = useState(false)
  const [speed,    setSpeed]      = useState(3)  // 1=slow … 5=fast

  const intervalRef = useRef(null)
  const frame = frames[frameIdx] || null
  const info  = getComplexity(algoId)

  const speedMs = [900, 600, 350, 180, 60][speed - 1]

  // Change category → pick first algo in that category
  const handleCategory = (cat) => {
    setCategory(cat)
    const first = ALGORITHM_CATALOG[cat][0].id
    setAlgoId(first)
    setFrames([])
    setFrameIdx(0)
    setPlaying(false)
    // Set sensible default input
    if (cat === 'recursion') setInputStr('6')
    else if (cat === 'graph' || cat === 'datastructures') setInputStr('')
    else setInputStr('64,34,25,12,22,11,90')
  }

  // Generate frames
  const handleGenerate = useCallback(() => {
    const f = generateFrames(algoId, inputStr, target)
    setFrames(f)
    setFrameIdx(0)
    setPlaying(false)
  }, [algoId, inputStr, target])

  // Auto-generate when algo changes
  useEffect(() => {
    handleGenerate()
  }, [algoId]) // eslint-disable-line

  // Playback
  useEffect(() => {
    if (playing) {
      intervalRef.current = setInterval(() => {
        setFrameIdx(prev => {
          if (prev >= frames.length - 1) { setPlaying(false); return prev }
          return prev + 1
        })
      }, speedMs)
    }
    return () => clearInterval(intervalRef.current)
  }, [playing, speedMs, frames.length])

  const togglePlay = () => {
    if (frameIdx >= frames.length - 1) { setFrameIdx(0); setPlaying(true); return }
    setPlaying(p => !p)
  }
  const stepBack  = () => { setPlaying(false); setFrameIdx(i => Math.max(0, i - 1)) }
  const stepFwd   = () => { setPlaying(false); setFrameIdx(i => Math.min(frames.length - 1, i + 1)) }
  const reset     = () => { setPlaying(false); setFrameIdx(0) }

  const randomize = () => {
    if (category === 'sorting' || category === 'searching') {
      const arr = randomArray(10, 99)
      setInputStr(arr.join(','))
      if (category === 'searching') setTarget(String(arr[Math.floor(Math.random() * arr.length)]))
    } else if (category === 'recursion') {
      setInputStr(String(Math.floor(Math.random() * 4) + 4))
    }
  }

  if (!visible) return null

  const needsInput   = !['bfs','dfs','stack','queue','linkedlist'].includes(algoId)
  const needsTarget  = ['linear','binary'].includes(algoId)
  const isRecursion  = category === 'recursion'

  return (
    <aside className={styles.panel} style={style}>
      {/* Header */}
      <div className={styles.header}>
        <span className={styles.headerIcon}>📊</span>
        <span className={styles.headerTitle}>Algorithm Visualizer</span>
        <button className={styles.closeBtn} onClick={onClose} title="Close">×</button>
      </div>

      {/* Category tabs */}
      <div className={styles.selector}>
        <div className={styles.categoryTabs}>
          {CATEGORIES.map(c => (
            <button key={c.id}
              className={`${styles.categoryTab} ${category === c.id ? styles.active : ''}`}
              onClick={() => handleCategory(c.id)}>
              {c.label}
            </button>
          ))}
        </div>

        <select className={styles.algoSelect} value={algoId}
          onChange={e => { setAlgoId(e.target.value); setFrames([]); setFrameIdx(0); setPlaying(false) }}>
          {ALGORITHM_CATALOG[category].map(a => (
            <option key={a.id} value={a.id}>{a.label}</option>
          ))}
        </select>
      </div>

      {/* Input */}
      {(needsInput || needsTarget) && (
        <div className={styles.inputArea}>
          {needsInput && (
            <>
              <div className={styles.inputLabel}>{isRecursion ? 'Input number' : 'Array (comma-separated)'}</div>
              <div className={styles.inputRow}>
                <input className={styles.inputField} value={inputStr}
                  onChange={e => setInputStr(e.target.value)}
                  placeholder={isRecursion ? 'e.g. 6' : 'e.g. 5,3,8,1,9'}
                  onKeyDown={e => e.key === 'Enter' && handleGenerate()}
                />
                {!isRecursion && <button className={styles.randomBtn} onClick={randomize}>↺ Random</button>}
                <button className={styles.randomBtn} onClick={handleGenerate} style={{ background: 'rgba(0,212,255,0.1)', borderColor: 'rgba(0,212,255,0.3)', color: 'var(--cyan)' }}>▶ Generate</button>
              </div>
            </>
          )}
          {needsTarget && (
            <>
              <div className={styles.inputLabel}>Target to search</div>
              <div className={styles.inputRow}>
                <input className={styles.inputField} value={target}
                  onChange={e => setTarget(e.target.value)}
                  placeholder="Target value" style={{ maxWidth: 120 }}
                />
              </div>
            </>
          )}
        </div>
      )}

      {/* Playback controls */}
      <div className={styles.controls}>
        <button className={styles.ctrlBtn} onClick={reset} disabled={!frames.length} title="Reset">⏮</button>
        <button className={styles.ctrlBtn} onClick={stepBack} disabled={!frames.length || frameIdx === 0} title="Step back">◀</button>
        <button className={`${styles.ctrlBtn} ${styles.playBtn}`} onClick={togglePlay}
          disabled={!frames.length} title={playing ? 'Pause' : 'Play'}>
          {playing ? '⏸' : '▶'}
        </button>
        <button className={styles.ctrlBtn} onClick={stepFwd} disabled={!frames.length || frameIdx === frames.length - 1} title="Step forward">▶</button>
        <button className={styles.ctrlBtn} onClick={() => { reset(); setPlaying(false); handleGenerate() }} title="Restart">↺</button>

        {frames.length > 0 && (
          <span className={styles.stepInfo}>{frameIdx + 1}/{frames.length}</span>
        )}

        <div className={styles.speedControl}>
          <span className={styles.speedLabel}>Speed</span>
          <input type="range" min={1} max={5} value={speed}
            onChange={e => setSpeed(+e.target.value)}
            className={styles.speedSlider} />
          <span className={styles.speedLabel}>{speed}×</span>
        </div>
      </div>

      {/* Visualization canvas */}
      <div className={styles.canvas}>
        {!frames.length ? (
          <div className={styles.empty}>
            <div className={styles.emptyOrb}>📊</div>
            <div className={styles.emptyTitle}>Ready to Visualize</div>
            <div className={styles.emptySub}>Select an algorithm and click ▶ Generate to see it animate step by step.</div>
          </div>
        ) : (
          <>
            {/* Algorithm-specific view */}
            {category === 'sorting' && <SortingView frame={frame} />}
            {category === 'searching' && <SearchView frame={frame} algoId={algoId} />}
            {category === 'graph' && <GraphView frame={frame} algoId={algoId} />}
            {category === 'recursion' && <RecursionView frame={frame} />}
            {category === 'datastructures' && algoId === 'stack' && <StackView frame={frame} />}
            {category === 'datastructures' && algoId === 'queue' && <QueueView frame={frame} />}
            {category === 'datastructures' && algoId === 'linkedlist' && <LinkedListView frame={frame} />}

            {/* Step explanation */}
            {frame?.description && (
              <div className={styles.stepBox}>
                <div className={styles.stepText}
                  dangerouslySetInnerHTML={{ __html: frame.description }} />
              </div>
            )}

            {/* Stats */}
            <div className={styles.statsBar}>
              {frame?.comparisons !== undefined && (
                <div className={styles.statChip}>
                  <span>Comparisons</span>
                  <strong style={{ color: 'var(--yellow)' }}>{frame.comparisons}</strong>
                </div>
              )}
              {frame?.swaps !== undefined && (
                <div className={styles.statChip}>
                  <span>Swaps</span>
                  <strong style={{ color: 'var(--orange)' }}>{frame.swaps}</strong>
                </div>
              )}
              {frame?.callCount !== undefined && (
                <div className={styles.statChip}>
                  <span>Calls</span>
                  <strong style={{ color: '#b060ff' }}>{frame.callCount}</strong>
                </div>
              )}
              {frame?.steps !== undefined && (
                <div className={styles.statChip}>
                  <span>Steps</span>
                  <strong style={{ color: 'var(--cyan)' }}>{frame.steps}</strong>
                </div>
              )}
              {info && (
                <div className={styles.statChip}>
                  <span>Time</span>
                  <strong style={{ color: 'var(--green)' }}>{info.complexity}</strong>
                </div>
              )}
              {info && (
                <div className={styles.statChip}>
                  <span>Space</span>
                  <strong style={{ color: 'var(--cyan)' }}>{info.space}</strong>
                </div>
              )}
            </div>

            {/* Progress bar */}
            <div style={{ height: 3, background: 'var(--surface3)', borderRadius: 2, overflow: 'hidden', flexShrink: 0 }}>
              <div style={{
                height: '100%',
                background: 'linear-gradient(90deg, #6020cc, #b060ff)',
                width: `${frames.length > 1 ? (frameIdx / (frames.length - 1)) * 100 : 100}%`,
                transition: 'width 0.2s',
                boxShadow: '0 0 6px rgba(176,96,255,0.5)',
              }} />
            </div>
          </>
        )}
      </div>

      {/* Legend */}
      {frames.length > 0 && category === 'sorting' && (
        <div className={styles.legend}>
          {[
            { color: '#4060cc', label: 'Default' },
            { color: '#ffcc00', label: 'Comparing' },
            { color: '#ff4466', label: 'Swapping' },
            { color: '#00ff9d', label: 'Sorted' },
            { color: '#b060ff', label: 'Pivot' },
          ].map(l => (
            <div key={l.label} className={styles.legendItem}>
              <div className={styles.legendDot} style={{ background: l.color }} />
              {l.label}
            </div>
          ))}
        </div>
      )}
    </aside>
  )
}
