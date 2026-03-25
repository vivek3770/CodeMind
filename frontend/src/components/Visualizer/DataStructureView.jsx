/**
 * DataStructureView.jsx — Stack, Queue, Linked List visualizations
 */
import React from 'react'
import styles from './Visualizer.module.css'

export function StackView({ frame }) {
  if (!frame) return null
  const { stack, op, val, result } = frame

  return (
    <div className={styles.stackWrap}>
      <div className={styles.stackTitle}>Stack (LIFO) {op && <span style={{ color: 'var(--cyan)', marginLeft: 6, fontSize: 11 }}>→ {op.toUpperCase()}{val != null ? `(${val})` : ''}</span>}</div>

      {stack.length === 0
        ? <div style={{ padding: '12px', textAlign: 'center', color: 'var(--tx3)', fontSize: 12, border: '1px dashed var(--border1)', borderRadius: 6 }}>Empty Stack</div>
        : (
          <div className={styles.stackCells}>
            {stack.map((item, i) => (
              <div key={i} className={`${styles.stackCell} ${i === stack.length - 1 ? styles.top : ''} ${item.isNew ? styles.new : ''}`}>
                {item.val}
                {i === stack.length - 1 && <span style={{ marginLeft: 8, fontSize: 9, opacity: 0.6 }}>← TOP</span>}
              </div>
            ))}
          </div>
        )
      }

      {result !== null && result !== undefined && (
        <div style={{ marginTop: 8, padding: '6px 10px', background: 'rgba(0,255,157,0.08)', border: '1px solid rgba(0,255,157,0.2)', borderRadius: 6, fontSize: 12, color: 'var(--green)' }}>
          Return value: <strong>{result}</strong>
        </div>
      )}
    </div>
  )
}

export function QueueView({ frame }) {
  if (!frame) return null
  const { queue, op, val, result } = frame

  return (
    <div className={styles.queueWrap}>
      <div className={styles.queueTitle}>Queue (FIFO) {op && <span style={{ color: 'var(--cyan)', marginLeft: 6, fontSize: 11 }}>→ {op.toUpperCase()}{val != null ? `(${val})` : ''}</span>}</div>

      <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
        <div style={{ fontSize: 10, color: 'var(--tx3)', marginRight: 4, writingMode: 'vertical-rl', transform: 'rotate(180deg)' }}>FRONT</div>
        {queue.length === 0
          ? <div style={{ padding: '12px 20px', textAlign: 'center', color: 'var(--tx3)', fontSize: 12, border: '1px dashed var(--border1)', borderRadius: 6, flex: 1 }}>Empty Queue</div>
          : (
            <div className={styles.queueCells} style={{ flex: 1 }}>
              {queue.map((item, i) => (
                <div key={i} className={`${styles.queueCell} ${item.isFront ? styles.front : ''} ${item.isNew ? styles.new : ''}`}>
                  {item.val}
                </div>
              ))}
            </div>
          )
        }
        <div style={{ fontSize: 10, color: 'var(--tx3)', marginLeft: 4, writingMode: 'vertical-rl' }}>REAR</div>
      </div>

      <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 6, fontSize: 10, color: 'var(--tx3)' }}>
        <span>← dequeue</span>
        <span>enqueue →</span>
      </div>
    </div>
  )
}

export function LinkedListView({ frame }) {
  if (!frame) return null
  const { list, current } = frame

  return (
    <div className={styles.linkedListWrap}>
      <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--tx3)', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 12 }}>Linked List</div>

      {list.length === 0
        ? <div style={{ padding: '12px', textAlign: 'center', color: 'var(--tx3)', fontSize: 12, border: '1px dashed var(--border1)', borderRadius: 6 }}>Empty List → NULL</div>
        : (
          <div className={styles.linkedListRow}>
            <div style={{ fontSize: 10, color: 'var(--purple)', fontFamily: 'var(--font-mono)', marginRight: 4 }}>HEAD</div>
            <span style={{ fontSize: 16, color: 'var(--border2)', marginRight: 4 }}>→</span>
            {list.map((node, i) => (
              <React.Fragment key={i}>
                <div className={`${styles.llNode} ${i === current ? styles.current : ''} ${node.isVisited ? styles.visited : ''}`}>
                  <div className={styles.llVal}>{node.val}</div>
                  <div className={styles.llPtr}>*next</div>
                </div>
                <span className={`${styles.llArrow} ${i === current ? styles.active : ''}`}>→</span>
              </React.Fragment>
            ))}
            <div className={styles.llNull}>NULL</div>
          </div>
        )
      }

      <div style={{ marginTop: 8, fontSize: 11, color: 'var(--tx2)', fontFamily: 'var(--font-mono)' }}>
        Size: {list.length} nodes
        {list.length > 0 && <> · Head: <strong style={{ color: 'var(--cyan)' }}>{list[0]?.val}</strong> · Tail: <strong style={{ color: 'var(--purple)' }}>{list[list.length-1]?.val}</strong></>}
      </div>
    </div>
  )
}
