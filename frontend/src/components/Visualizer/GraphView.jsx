/**
 * GraphView.jsx — SVG graph for BFS and DFS traversal
 */
import React, { useMemo } from 'react'
import styles from './Visualizer.module.css'

// Position nodes in a circle
function getNodePositions(graph) {
  const nodes = Object.keys(graph).map(Number)
  const cx = 150, cy = 130, r = 100
  const positions = {}
  nodes.forEach((n, i) => {
    const angle = (i / nodes.length) * 2 * Math.PI - Math.PI / 2
    positions[n] = {
      x: cx + r * Math.cos(angle),
      y: cy + r * Math.sin(angle),
    }
  })
  return positions
}

function nodeColor(n, current, visited, queue, stack) {
  if (n === current) return { fill: '#b060ff', stroke: '#d090ff', glow: 'rgba(176,96,255,0.6)' }
  if (queue?.includes(n) || stack?.includes(n)) return { fill: '#cc9900', stroke: '#ffcc00', glow: 'rgba(255,204,0,0.5)' }
  if (visited?.includes(n)) return { fill: '#0099aa', stroke: '#00d4ff', glow: 'rgba(0,212,255,0.4)' }
  return { fill: '#1d2f40', stroke: '#253a4d', glow: 'none' }
}

export default function GraphView({ frame, algoId }) {
  if (!frame) return null
  const { graph, visited, current, queue, stack, order } = frame
  const positions = useMemo(() => getNodePositions(graph), [graph])

  // Collect unique edges
  const edges = useMemo(() => {
    const seen = new Set()
    const result = []
    for (const [a, neighbors] of Object.entries(graph)) {
      for (const b of neighbors) {
        const key = [Math.min(+a, b), Math.max(+a, b)].join('-')
        if (!seen.has(key)) { seen.add(key); result.push([+a, b]) }
      }
    }
    return result
  }, [graph])

  return (
    <div className={styles.arrayWrap}>
      <div className={styles.arrayTitle}>Graph — {algoId === 'bfs' ? 'BFS' : 'DFS'} Traversal</div>
      <svg width="300" height="260" style={{ display: 'block', margin: '0 auto' }}>
        <defs>
          {Object.keys(graph).map(n => {
            const c = nodeColor(+n, current, visited, queue, stack)
            return (
              <filter key={n} id={`glow-${n}`} x="-50%" y="-50%" width="200%" height="200%">
                <feDropShadow dx="0" dy="0" stdDeviation="4" floodColor={c.glow} />
              </filter>
            )
          })}
        </defs>

        {/* Edges */}
        {edges.map(([a, b], i) => {
          const pa = positions[a], pb = positions[b]
          const bothVisited = visited?.includes(a) && visited?.includes(b)
          return (
            <line key={i}
              x1={pa.x} y1={pa.y} x2={pb.x} y2={pb.y}
              stroke={bothVisited ? 'rgba(0,212,255,0.4)' : 'rgba(255,255,255,0.08)'}
              strokeWidth={bothVisited ? 2 : 1.5}
              style={{ transition: 'stroke 0.3s' }}
            />
          )
        })}

        {/* Nodes */}
        {Object.keys(graph).map(n => {
          const c = nodeColor(+n, current, visited, queue, stack)
          const pos = positions[+n]
          return (
            <g key={n} style={{ filter: c.glow !== 'none' ? `url(#glow-${n})` : 'none' }}>
              <circle cx={pos.x} cy={pos.y} r={18}
                fill={c.fill} stroke={c.stroke} strokeWidth={2}
                style={{ transition: 'fill 0.3s, stroke 0.3s' }}
              />
              <text x={pos.x} y={pos.y + 4}
                textAnchor="middle"
                fill="#fff"
                fontSize={12}
                fontFamily="var(--font-mono)"
                fontWeight="700"
              >{n}</text>
            </g>
          )
        })}
      </svg>

      {/* Queue / Stack indicator */}
      {(queue?.length > 0 || stack?.length > 0) && (
        <div style={{ marginTop: 8 }}>
          <div style={{ fontSize: 10, color: 'var(--tx3)', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 4 }}>
            {algoId === 'bfs' ? 'Queue' : 'Stack'}
          </div>
          <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
            {(queue || stack || []).map((n, i) => (
              <div key={i} style={{ padding: '3px 8px', borderRadius: 4, background: 'rgba(255,204,0,0.12)', border: '1px solid rgba(255,204,0,0.3)', color: 'var(--yellow)', fontSize: 12, fontFamily: 'var(--font-mono)', fontWeight: 600 }}>{n}</div>
            ))}
          </div>
        </div>
      )}

      {/* Visit order */}
      {order?.length > 0 && (
        <div style={{ marginTop: 8 }}>
          <div style={{ fontSize: 10, color: 'var(--tx3)', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 4 }}>Visit Order</div>
          <div style={{ fontSize: 12, fontFamily: 'var(--font-mono)', color: 'var(--cyan)' }}>
            {order.join(' → ')}
          </div>
        </div>
      )}
    </div>
  )
}
