/**
 * RecursionView.jsx — renders the recursion call tree as an SVG
 */
import React, { useMemo } from 'react'
import styles from './Visualizer.module.css'

const NODE_W = 52, NODE_H = 26, H_GAP = 8, V_GAP = 44

function layoutTree(calls) {
  if (!calls.length) return { nodes: [], edges: [], width: 300, height: 100 }

  // Group by depth
  const byDepth = {}
  calls.forEach(c => {
    if (!byDepth[c.depth]) byDepth[c.depth] = []
    byDepth[c.depth].push(c)
  })

  const maxDepth = Math.max(...calls.map(c => c.depth))
  const positions = {}
  const totalWidth = Math.max(300, calls.length * (NODE_W + H_GAP))

  // Position nodes level by level
  Object.entries(byDepth).forEach(([depth, nodes]) => {
    const y = 20 + +depth * (NODE_H + V_GAP)
    const totalW = nodes.length * (NODE_W + H_GAP) - H_GAP
    const startX = (totalWidth - totalW) / 2
    nodes.forEach((node, i) => {
      positions[node.id] = { x: startX + i * (NODE_W + H_GAP), y }
    })
  })

  const edges = calls
    .filter(c => c.parentId !== null && positions[c.parentId])
    .map(c => ({
      x1: positions[c.parentId].x + NODE_W / 2,
      y1: positions[c.parentId].y + NODE_H,
      x2: positions[c.id].x + NODE_W / 2,
      y2: positions[c.id].y,
      id: c.id,
    }))

  const height = 20 + (maxDepth + 1) * (NODE_H + V_GAP) + 20

  return { nodes: calls.map(c => ({ ...c, ...positions[c.id] })), edges, width: totalWidth, height }
}

function nodeColor(call, currentId) {
  if (call.id === currentId) return { bg: '#6020cc', stroke: '#b060ff', text: '#fff' }
  if (call.state === 'returning') return { bg: 'rgba(0,255,157,0.12)', stroke: '#00ff9d', text: '#00ff9d' }
  return { bg: 'rgba(255,255,255,0.04)', stroke: 'rgba(255,255,255,0.12)', text: '#a8c8e8' }
}

export default function RecursionView({ frame }) {
  if (!frame) return null
  const { calls, current } = frame
  const { nodes, edges, width, height } = useMemo(() => layoutTree(calls), [calls])

  if (!nodes.length) {
    return (
      <div className={styles.arrayWrap}>
        <div className={styles.arrayTitle}>Recursion Call Tree</div>
        <div style={{ padding: '20px', textAlign: 'center', color: 'var(--tx3)', fontSize: 12 }}>Building call tree…</div>
      </div>
    )
  }

  return (
    <div className={styles.arrayWrap} style={{ overflowX: 'auto' }}>
      <div className={styles.arrayTitle}>Recursion Call Tree ({calls.length} calls)</div>
      <svg width={width} height={height} style={{ display: 'block', minWidth: width }}>
        {/* Edges */}
        {edges.map((e, i) => (
          <line key={i} x1={e.x1} y1={e.y1} x2={e.x2} y2={e.y2}
            stroke="rgba(255,255,255,0.1)" strokeWidth={1.5} />
        ))}

        {/* Nodes */}
        {nodes.map(node => {
          const c = nodeColor(node, current)
          const label = node.result !== null ? `=${node.result}` : `f(${node.num})`
          return (
            <g key={node.id}>
              <rect x={node.x} y={node.y} width={NODE_W} height={NODE_H}
                rx={5} fill={c.bg} stroke={c.stroke} strokeWidth={1.5}
                style={{ transition: 'fill 0.3s, stroke 0.3s', filter: node.id === current ? 'drop-shadow(0 0 6px #b060ff)' : 'none' }}
              />
              <text x={node.x + NODE_W / 2} y={node.y + NODE_H / 2 + 4}
                textAnchor="middle" fill={c.text}
                fontSize={10} fontFamily="var(--font-mono)" fontWeight="600"
              >{label}</text>
            </g>
          )
        })}
      </svg>
    </div>
  )
}
