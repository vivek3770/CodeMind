/**
 * algorithms.js
 * Pure functions that generate step-by-step animation frames
 * for every supported algorithm. Each function returns an array
 * of "frames" — snapshots of state the visualizer renders one by one.
 *
 * Frame shape varies by algorithm type but always includes:
 *   { description, comparisons, swaps, ...algorithmSpecificState }
 */

// ═══════════════════════════════════════════════════════════════
// SORTING ALGORITHMS
// ═══════════════════════════════════════════════════════════════

export function bubbleSort(inputArr) {
  const arr = [...inputArr]
  const frames = []
  const n = arr.length
  let comparisons = 0, swaps = 0

  frames.push({ arr: [...arr], comparing: [], swapping: [], sorted: [], pivot: null, comparisons, swaps, description: 'Starting Bubble Sort. We compare adjacent elements and swap if needed.' })

  for (let i = 0; i < n - 1; i++) {
    for (let j = 0; j < n - i - 1; j++) {
      comparisons++
      frames.push({ arr: [...arr], comparing: [j, j + 1], swapping: [], sorted: Array.from({ length: i }, (_, k) => n - 1 - k), pivot: null, comparisons, swaps, description: `Comparing <strong>arr[${j}]=${arr[j]}</strong> and <strong>arr[${j+1}]=${arr[j+1]}</strong>` })

      if (arr[j] > arr[j + 1]) {
        swaps++
        ;[arr[j], arr[j + 1]] = [arr[j + 1], arr[j]]
        frames.push({ arr: [...arr], comparing: [], swapping: [j, j + 1], sorted: Array.from({ length: i }, (_, k) => n - 1 - k), pivot: null, comparisons, swaps, description: `Swapping! <strong>${arr[j+1]}</strong> was greater than <strong>${arr[j]}</strong>. Moved to correct position.` })
      }
    }
    frames.push({ arr: [...arr], comparing: [], swapping: [], sorted: Array.from({ length: i + 1 }, (_, k) => n - 1 - k), pivot: null, comparisons, swaps, description: `Pass ${i + 1} complete. Element <strong>${arr[n - 1 - i]}</strong> is now in its final position.` })
  }
  frames.push({ arr: [...arr], comparing: [], swapping: [], sorted: Array.from({ length: n }, (_, k) => k), pivot: null, comparisons, swaps, description: `✓ Bubble Sort complete! ${swaps} swaps, ${comparisons} comparisons. Final array is sorted.` })
  return frames
}

export function insertionSort(inputArr) {
  const arr = [...inputArr]
  const frames = []
  const n = arr.length
  let comparisons = 0, swaps = 0

  frames.push({ arr: [...arr], comparing: [], swapping: [], sorted: [0], pivot: null, comparisons, swaps, description: 'Starting Insertion Sort. First element is trivially sorted.' })

  for (let i = 1; i < n; i++) {
    const key = arr[i]
    let j = i - 1
    frames.push({ arr: [...arr], comparing: [i], swapping: [], sorted: Array.from({ length: i }, (_, k) => k), pivot: i, comparisons, swaps, description: `Picking key = <strong>${key}</strong> at index ${i}. Will insert into correct position.` })

    while (j >= 0 && arr[j] > key) {
      comparisons++
      frames.push({ arr: [...arr], comparing: [j, j + 1], swapping: [], sorted: Array.from({ length: i }, (_, k) => k), pivot: i, comparisons, swaps, description: `<strong>${arr[j]}</strong> > <strong>${key}</strong>, shift right.` })
      arr[j + 1] = arr[j]
      swaps++
      frames.push({ arr: [...arr], comparing: [], swapping: [j, j + 1], sorted: Array.from({ length: i }, (_, k) => k), pivot: null, comparisons, swaps, description: `Shifted <strong>${arr[j]}</strong> to position ${j + 1}.` })
      j--
    }
    arr[j + 1] = key
    frames.push({ arr: [...arr], comparing: [], swapping: [], sorted: Array.from({ length: i + 1 }, (_, k) => k), pivot: null, comparisons, swaps, description: `Inserted <strong>${key}</strong> at position ${j + 1}. Left portion is sorted.` })
  }
  frames.push({ arr: [...arr], comparing: [], swapping: [], sorted: Array.from({ length: n }, (_, k) => k), pivot: null, comparisons, swaps, description: `✓ Insertion Sort complete! Array sorted in ${swaps} shifts and ${comparisons} comparisons.` })
  return frames
}

export function selectionSort(inputArr) {
  const arr = [...inputArr]
  const frames = []
  const n = arr.length
  let comparisons = 0, swaps = 0

  frames.push({ arr: [...arr], comparing: [], swapping: [], sorted: [], minIdx: null, comparisons, swaps, description: 'Starting Selection Sort. Each pass finds the minimum element.' })

  for (let i = 0; i < n - 1; i++) {
    let minIdx = i
    frames.push({ arr: [...arr], comparing: [i], swapping: [], sorted: Array.from({ length: i }, (_, k) => k), minIdx, comparisons, swaps, description: `Pass ${i + 1}: Looking for minimum starting from index ${i}.` })

    for (let j = i + 1; j < n; j++) {
      comparisons++
      frames.push({ arr: [...arr], comparing: [j, minIdx], swapping: [], sorted: Array.from({ length: i }, (_, k) => k), minIdx, comparisons, swaps, description: `Comparing <strong>${arr[j]}</strong> with current min <strong>${arr[minIdx]}</strong>.` })
      if (arr[j] < arr[minIdx]) {
        minIdx = j
        frames.push({ arr: [...arr], comparing: [j], swapping: [], sorted: Array.from({ length: i }, (_, k) => k), minIdx, comparisons, swaps, description: `New minimum found: <strong>${arr[minIdx]}</strong> at index ${minIdx}.` })
      }
    }

    if (minIdx !== i) {
      swaps++
      ;[arr[i], arr[minIdx]] = [arr[minIdx], arr[i]]
      frames.push({ arr: [...arr], comparing: [], swapping: [i, minIdx], sorted: Array.from({ length: i }, (_, k) => k), minIdx: null, comparisons, swaps, description: `Swapping minimum <strong>${arr[i]}</strong> to position ${i}.` })
    }
    frames.push({ arr: [...arr], comparing: [], swapping: [], sorted: Array.from({ length: i + 1 }, (_, k) => k), minIdx: null, comparisons, swaps, description: `Position ${i} is finalized with <strong>${arr[i]}</strong>.` })
  }
  frames.push({ arr: [...arr], comparing: [], swapping: [], sorted: Array.from({ length: n }, (_, k) => k), minIdx: null, comparisons, swaps, description: `✓ Selection Sort complete! ${swaps} swaps and ${comparisons} comparisons total.` })
  return frames
}

export function mergeSort(inputArr) {
  const frames = []
  let comparisons = 0, swaps = 0

  function merge(arr, left, mid, right) {
    const L = arr.slice(left, mid + 1)
    const R = arr.slice(mid + 1, right + 1)
    let i = 0, j = 0, k = left

    while (i < L.length && j < R.length) {
      comparisons++
      frames.push({ arr: [...arr], comparing: [left + i, mid + 1 + j], swapping: [], sorted: [], description: `Merging: comparing <strong>${L[i]}</strong> and <strong>${R[j]}</strong>.`, comparisons, swaps })
      if (L[i] <= R[j]) { arr[k++] = L[i++] }
      else { arr[k++] = R[j++]; swaps++ }
      frames.push({ arr: [...arr], comparing: [], swapping: [k - 1], sorted: [], description: `Placed <strong>${arr[k-1]}</strong> into position ${k-1}.`, comparisons, swaps })
    }
    while (i < L.length) { arr[k++] = L[i++] }
    while (j < R.length) { arr[k++] = R[j++] }
    frames.push({ arr: [...arr], comparing: [], swapping: [], sorted: Array.from({ length: right - left + 1 }, (_, x) => left + x), description: `Subarray [${left}..${right}] merged and sorted.`, comparisons, swaps })
  }

  function mergeSortHelper(arr, left, right) {
    if (left >= right) return
    const mid = Math.floor((left + right) / 2)
    frames.push({ arr: [...arr], comparing: [left, right], swapping: [], sorted: [], description: `Dividing array from index ${left} to ${right}. Mid = ${mid}.`, comparisons, swaps })
    mergeSortHelper(arr, left, mid)
    mergeSortHelper(arr, mid + 1, right)
    merge(arr, left, mid, right)
  }

  const arr = [...inputArr]
  frames.push({ arr: [...arr], comparing: [], swapping: [], sorted: [], description: 'Starting Merge Sort. Divide and conquer — split, sort, merge.', comparisons, swaps })
  mergeSortHelper(arr, 0, arr.length - 1)
  frames.push({ arr: [...arr], comparing: [], swapping: [], sorted: Array.from({ length: arr.length }, (_, k) => k), description: `✓ Merge Sort complete! O(n log n) time, ${comparisons} comparisons.`, comparisons, swaps })
  return frames
}

export function quickSort(inputArr) {
  const frames = []
  let comparisons = 0, swaps = 0

  function partition(arr, low, high) {
    const pivot = arr[high]
    frames.push({ arr: [...arr], comparing: [], swapping: [], sorted: [], pivot: high, description: `Pivot chosen: <strong>${pivot}</strong> at index ${high}.`, comparisons, swaps })
    let i = low - 1

    for (let j = low; j < high; j++) {
      comparisons++
      frames.push({ arr: [...arr], comparing: [j, high], swapping: [], sorted: [], pivot: high, description: `Comparing <strong>${arr[j]}</strong> with pivot <strong>${pivot}</strong>.`, comparisons, swaps })
      if (arr[j] < pivot) {
        i++
        swaps++
        ;[arr[i], arr[j]] = [arr[j], arr[i]]
        frames.push({ arr: [...arr], comparing: [], swapping: [i, j], sorted: [], pivot: high, description: `<strong>${arr[i]}</strong> < pivot, swapping to left partition.`, comparisons, swaps })
      }
    }
    swaps++
    ;[arr[i + 1], arr[high]] = [arr[high], arr[i + 1]]
    frames.push({ arr: [...arr], comparing: [], swapping: [i + 1, high], sorted: [i + 1], pivot: null, description: `Pivot <strong>${arr[i+1]}</strong> placed at final position ${i + 1}.`, comparisons, swaps })
    return i + 1
  }

  function qs(arr, low, high) {
    if (low < high) {
      const pi = partition(arr, low, high)
      qs(arr, low, pi - 1)
      qs(arr, pi + 1, high)
    }
  }

  const arr = [...inputArr]
  frames.push({ arr: [...arr], comparing: [], swapping: [], sorted: [], pivot: null, description: 'Starting Quick Sort. Pick a pivot, partition, recurse.', comparisons, swaps })
  qs(arr, 0, arr.length - 1)
  frames.push({ arr: [...arr], comparing: [], swapping: [], sorted: Array.from({ length: arr.length }, (_, k) => k), pivot: null, description: `✓ Quick Sort complete! Average O(n log n), ${comparisons} comparisons, ${swaps} swaps.`, comparisons, swaps })
  return frames
}

// ═══════════════════════════════════════════════════════════════
// SEARCHING ALGORITHMS
// ═══════════════════════════════════════════════════════════════

export function linearSearch(inputArr, target) {
  const arr = [...inputArr]
  const frames = []
  let comparisons = 0

  frames.push({ arr: [...arr], current: -1, found: -1, visited: [], comparisons, description: `Searching for <strong>${target}</strong> using Linear Search.` })

  for (let i = 0; i < arr.length; i++) {
    comparisons++
    frames.push({ arr: [...arr], current: i, found: -1, visited: Array.from({ length: i }, (_, k) => k), comparisons, description: `Checking index ${i}: <strong>${arr[i]}</strong> ${arr[i] === target ? '==' : '!='} ${target}` })
    if (arr[i] === target) {
      frames.push({ arr: [...arr], current: i, found: i, visited: Array.from({ length: i + 1 }, (_, k) => k), comparisons, description: `✓ Found <strong>${target}</strong> at index ${i}! Took ${comparisons} comparisons.` })
      return frames
    }
  }
  frames.push({ arr: [...arr], current: -1, found: -1, visited: Array.from({ length: arr.length }, (_, k) => k), comparisons, description: `✗ <strong>${target}</strong> not found after checking all ${comparisons} elements.` })
  return frames
}

export function binarySearch(inputArr, target) {
  const arr = [...inputArr].sort((a, b) => a - b)
  const frames = []
  let comparisons = 0
  let low = 0, high = arr.length - 1

  frames.push({ arr: [...arr], low, high, mid: -1, found: -1, comparisons, description: `Binary Search for <strong>${target}</strong>. Array must be sorted first.` })

  while (low <= high) {
    const mid = Math.floor((low + high) / 2)
    comparisons++
    frames.push({ arr: [...arr], low, high, mid, found: -1, comparisons, description: `Range [${low}..${high}], mid = ${mid}. Checking <strong>${arr[mid]}</strong> vs <strong>${target}</strong>.` })

    if (arr[mid] === target) {
      frames.push({ arr: [...arr], low, high, mid, found: mid, comparisons, description: `✓ Found <strong>${target}</strong> at index ${mid}! Binary search took only ${comparisons} comparisons.` })
      return frames
    } else if (arr[mid] < target) {
      frames.push({ arr: [...arr], low, high, mid, found: -1, comparisons, description: `<strong>${arr[mid]}</strong> < <strong>${target}</strong>. Eliminate left half. New low = ${mid + 1}.` })
      low = mid + 1
    } else {
      frames.push({ arr: [...arr], low, high, mid, found: -1, comparisons, description: `<strong>${arr[mid]}</strong> > <strong>${target}</strong>. Eliminate right half. New high = ${mid - 1}.` })
      high = mid - 1
    }
  }
  frames.push({ arr: [...arr], low, high, mid: -1, found: -1, comparisons, description: `✗ <strong>${target}</strong> not found. Binary search eliminated all possibilities in ${comparisons} steps.` })
  return frames
}

// ═══════════════════════════════════════════════════════════════
// GRAPH / TREE TRAVERSAL
// ═══════════════════════════════════════════════════════════════

export function bfsTraversal(graph, start) {
  const frames = []
  const visited = new Set()
  const queue = [start]
  const visitedArr = []
  visited.add(start)
  let steps = 0

  frames.push({ graph, visited: [], queue: [start], current: null, order: [], description: `BFS from node <strong>${start}</strong>. Using a queue (FIFO).`, steps })

  while (queue.length > 0) {
    const node = queue.shift()
    visitedArr.push(node)
    steps++

    frames.push({ graph, visited: [...visitedArr], queue: [...queue], current: node, order: [...visitedArr], description: `Dequeued <strong>${node}</strong>. Visiting and exploring its neighbors.`, steps })

    const neighbors = graph[node] || []
    for (const neighbor of neighbors) {
      if (!visited.has(neighbor)) {
        visited.add(neighbor)
        queue.push(neighbor)
        frames.push({ graph, visited: [...visitedArr], queue: [...queue], current: node, order: [...visitedArr], description: `Found unvisited neighbor <strong>${neighbor}</strong>. Added to queue.`, steps })
      }
    }
  }

  frames.push({ graph, visited: [...visitedArr], queue: [], current: null, order: visitedArr, description: `✓ BFS complete! Visited order: ${visitedArr.join(' → ')}. Total nodes: ${visitedArr.length}`, steps })
  return frames
}

export function dfsTraversal(graph, start) {
  const frames = []
  const visited = new Set()
  const stack = []
  const visitedArr = []
  let steps = 0

  function dfs(node) {
    visited.add(node)
    visitedArr.push(node)
    stack.push(node)
    steps++
    frames.push({ graph, visited: [...visitedArr], stack: [...stack], current: node, order: [...visitedArr], description: `Visiting <strong>${node}</strong>. Stack depth: ${stack.length}.`, steps })

    for (const neighbor of (graph[node] || [])) {
      if (!visited.has(neighbor)) {
        frames.push({ graph, visited: [...visitedArr], stack: [...stack], current: node, order: [...visitedArr], description: `From <strong>${node}</strong>: exploring neighbor <strong>${neighbor}</strong>.`, steps })
        dfs(neighbor)
      }
    }
    stack.pop()
    frames.push({ graph, visited: [...visitedArr], stack: [...stack], current: node, order: [...visitedArr], description: `Backtracking from <strong>${node}</strong>. Stack: [${stack.join(', ')}]`, steps })
  }

  frames.push({ graph, visited: [], stack: [], current: null, order: [], description: `DFS from node <strong>${start}</strong>. Using a stack (LIFO) — goes deep first.`, steps })
  dfs(start)
  frames.push({ graph, visited: [...visitedArr], stack: [], current: null, order: visitedArr, description: `✓ DFS complete! Visited order: ${visitedArr.join(' → ')}. Explored all reachable nodes.`, steps })
  return frames
}

// ═══════════════════════════════════════════════════════════════
// RECURSION TREES
// ═══════════════════════════════════════════════════════════════

export function fibonacciTree(n) {
  const frames = []
  const calls = []
  let callCount = 0

  function fib(num, depth, parentId) {
    const id = callCount++
    calls.push({ id, num, depth, parentId, state: 'calling', result: null })
    frames.push({ calls: JSON.parse(JSON.stringify(calls)), current: id, description: `Calling <strong>fib(${num})</strong> at depth ${depth}. Call #${id + 1}.`, callCount: id + 1 })

    if (num <= 1) {
      calls[id].state = 'returning'
      calls[id].result = num
      frames.push({ calls: JSON.parse(JSON.stringify(calls)), current: id, description: `Base case: <strong>fib(${num}) = ${num}</strong>. Returning.`, callCount: id + 1 })
      return num
    }

    const left  = fib(num - 1, depth + 1, id)
    const right = fib(num - 2, depth + 1, id)
    const result = left + right

    calls[id].state = 'returning'
    calls[id].result = result
    frames.push({ calls: JSON.parse(JSON.stringify(calls)), current: id, description: `<strong>fib(${num})</strong> = fib(${num-1}) + fib(${num-2}) = ${left} + ${right} = <strong>${result}</strong>`, callCount: id + 1 })
    return result
  }

  frames.push({ calls: [], current: -1, description: `Computing <strong>fibonacci(${n})</strong> recursively. Watch the call tree grow!`, callCount: 0 })
  const result = fib(n, 0, null)
  frames.push({ calls: JSON.parse(JSON.stringify(calls)), current: -1, description: `✓ fibonacci(${n}) = <strong>${result}</strong>. Made ${callCount} total function calls!`, callCount })
  return frames
}

export function factorialTree(n) {
  const frames = []
  const calls = []
  let callCount = 0

  function fact(num, depth, parentId) {
    const id = callCount++
    calls.push({ id, num, depth, parentId, state: 'calling', result: null })
    frames.push({ calls: JSON.parse(JSON.stringify(calls)), current: id, description: `Calling <strong>factorial(${num})</strong>. Call stack depth: ${depth + 1}.`, callCount: id + 1 })

    if (num <= 1) {
      calls[id].state = 'returning'
      calls[id].result = 1
      frames.push({ calls: JSON.parse(JSON.stringify(calls)), current: id, description: `Base case: <strong>factorial(${num}) = 1</strong>. Stack starts unwinding!`, callCount: id + 1 })
      return 1
    }

    const sub = fact(num - 1, depth + 1, id)
    const result = num * sub
    calls[id].state = 'returning'
    calls[id].result = result
    frames.push({ calls: JSON.parse(JSON.stringify(calls)), current: id, description: `<strong>factorial(${num})</strong> = ${num} × factorial(${num-1}) = ${num} × ${sub} = <strong>${result}</strong>`, callCount: id + 1 })
    return result
  }

  frames.push({ calls: [], current: -1, description: `Computing <strong>factorial(${n})</strong> recursively.`, callCount: 0 })
  fact(n, 0, null)
  return frames
}

// ═══════════════════════════════════════════════════════════════
// DATA STRUCTURES
// ═══════════════════════════════════════════════════════════════

export function stackOperations(ops) {
  const frames = []
  const stack = []

  frames.push({ stack: [], op: null, val: null, result: null, description: 'Stack initialized. Empty. LIFO — Last In First Out.' })

  for (const { op, val } of ops) {
    if (op === 'push') {
      stack.push({ val, isNew: true })
      frames.push({ stack: stack.map((x, i) => ({ ...x, isNew: i === stack.length - 1 })), op, val, result: null, description: `PUSH <strong>${val}</strong>. Stack size: ${stack.length}. Top = <strong>${val}</strong>.` })
      setTimeout(() => { if (stack[stack.length - 1]) stack[stack.length - 1].isNew = false }, 500)
    } else if (op === 'pop') {
      if (stack.length === 0) {
        frames.push({ stack: [], op, val: null, result: 'UNDERFLOW', description: '⚠️ Stack Underflow! Cannot pop from an empty stack.' })
      } else {
        const top = stack.pop()
        frames.push({ stack: [...stack], op, val: top.val, result: top.val, description: `POP returned <strong>${top.val}</strong>. Stack size: ${stack.length}.` })
      }
    } else if (op === 'peek') {
      const top = stack[stack.length - 1]
      frames.push({ stack: stack.map((x, i) => ({ ...x, isTop: i === stack.length - 1 })), op, val: null, result: top?.val ?? null, description: top ? `PEEK: Top element is <strong>${top.val}</strong>. Stack unchanged.` : 'PEEK: Stack is empty.' })
    }
  }
  return frames
}

export function queueOperations(ops) {
  const frames = []
  const queue = []

  frames.push({ queue: [], op: null, val: null, result: null, description: 'Queue initialized. Empty. FIFO — First In First Out.' })

  for (const { op, val } of ops) {
    if (op === 'enqueue') {
      queue.push({ val, isNew: true })
      frames.push({ queue: queue.map((x, i) => ({ ...x, isNew: i === queue.length - 1, isFront: i === 0 })), op, val, result: null, description: `ENQUEUE <strong>${val}</strong> at the rear. Queue size: ${queue.length}.` })
    } else if (op === 'dequeue') {
      if (queue.length === 0) {
        frames.push({ queue: [], op, val: null, result: 'UNDERFLOW', description: '⚠️ Queue Underflow! Cannot dequeue from empty queue.' })
      } else {
        const front = queue.shift()
        frames.push({ queue: queue.map((x, i) => ({ ...x, isNew: false, isFront: i === 0 })), op, val: front.val, result: front.val, description: `DEQUEUE removed <strong>${front.val}</strong> from front. Queue size: ${queue.length}.` })
      }
    }
  }
  return frames
}

export function linkedListOps(ops) {
  const frames = []
  let list = []
  let currentIdx = -1

  frames.push({ list: [], current: -1, description: 'Linked List initialized. Empty. Each node holds data + pointer to next.' })

  for (const { op, val, pos } of ops) {
    if (op === 'append') {
      list.push({ val, isNew: true })
      frames.push({ list: list.map((x, i) => ({ ...x, isNew: i === list.length - 1, isCurrent: false })), current: list.length - 1, description: `APPEND <strong>${val}</strong>. Traversed to end, linked new node. Size: ${list.length}.` })
      list[list.length - 1].isNew = false
    } else if (op === 'prepend') {
      list.unshift({ val, isNew: true })
      frames.push({ list: list.map((x, i) => ({ ...x, isNew: i === 0, isCurrent: i === 0 })), current: 0, description: `PREPEND <strong>${val}</strong> at head. Updated head pointer. Size: ${list.length}.` })
      list[0].isNew = false
    } else if (op === 'delete') {
      const idx = list.findIndex(n => n.val === val)
      if (idx !== -1) {
        frames.push({ list: list.map((x, i) => ({ ...x, isCurrent: i === idx })), current: idx, description: `DELETE: Found <strong>${val}</strong> at index ${idx}. Relinking pointers.` })
        list.splice(idx, 1)
        frames.push({ list: [...list], current: -1, description: `Deleted node <strong>${val}</strong>. Pointer from previous node now points to next. Size: ${list.length}.` })
      }
    } else if (op === 'traverse') {
      for (let i = 0; i < list.length; i++) {
        frames.push({ list: list.map((x, j) => ({ ...x, isCurrent: j === i, isVisited: j < i })), current: i, description: `Traversing: at node ${i}, value = <strong>${list[i].val}</strong>. Following next pointer.` })
      }
      frames.push({ list: list.map(x => ({ ...x, isVisited: true, isCurrent: false })), current: -1, description: `Traversal complete. Visited all ${list.length} nodes: [${list.map(n => n.val).join(' → ')}]` })
    }
  }
  return frames
}

// ═══════════════════════════════════════════════════════════════
// HELPERS
// ═══════════════════════════════════════════════════════════════

export function randomArray(size = 10, max = 99) {
  return Array.from({ length: size }, () => Math.floor(Math.random() * max) + 1)
}

export function parseArray(str) {
  return str.split(',').map(s => parseInt(s.trim())).filter(n => !isNaN(n))
}

export const ALGORITHM_CATALOG = {
  sorting: [
    { id: 'bubble',    label: 'Bubble Sort',    complexity: 'O(n²)',      space: 'O(1)' },
    { id: 'insertion', label: 'Insertion Sort', complexity: 'O(n²)',      space: 'O(1)' },
    { id: 'selection', label: 'Selection Sort', complexity: 'O(n²)',      space: 'O(1)' },
    { id: 'merge',     label: 'Merge Sort',     complexity: 'O(n log n)', space: 'O(n)' },
    { id: 'quick',     label: 'Quick Sort',     complexity: 'O(n log n)', space: 'O(log n)' },
  ],
  searching: [
    { id: 'linear', label: 'Linear Search', complexity: 'O(n)',      space: 'O(1)' },
    { id: 'binary', label: 'Binary Search', complexity: 'O(log n)', space: 'O(1)' },
  ],
  graph: [
    { id: 'bfs', label: 'Breadth-First Search (BFS)', complexity: 'O(V+E)', space: 'O(V)' },
    { id: 'dfs', label: 'Depth-First Search (DFS)',   complexity: 'O(V+E)', space: 'O(V)' },
  ],
  recursion: [
    { id: 'fibonacci', label: 'Fibonacci Recursion', complexity: 'O(2ⁿ)', space: 'O(n)' },
    { id: 'factorial', label: 'Factorial Recursion', complexity: 'O(n)',  space: 'O(n)' },
  ],
  datastructures: [
    { id: 'stack',      label: 'Stack Operations',       complexity: 'O(1)', space: 'O(n)' },
    { id: 'queue',      label: 'Queue Operations',       complexity: 'O(1)', space: 'O(n)' },
    { id: 'linkedlist', label: 'Linked List Operations', complexity: 'O(n)', space: 'O(n)' },
  ],
}

// Default graph for BFS/DFS
export const DEFAULT_GRAPH = {
  0: [1, 2],
  1: [0, 3, 4],
  2: [0, 5],
  3: [1],
  4: [1, 6],
  5: [2, 6],
  6: [4, 5],
}

export const DEFAULT_STACK_OPS = [
  { op: 'push', val: 10 }, { op: 'push', val: 20 }, { op: 'push', val: 30 },
  { op: 'peek' }, { op: 'pop' }, { op: 'push', val: 40 }, { op: 'pop' }, { op: 'pop' },
]

export const DEFAULT_QUEUE_OPS = [
  { op: 'enqueue', val: 'A' }, { op: 'enqueue', val: 'B' }, { op: 'enqueue', val: 'C' },
  { op: 'dequeue' }, { op: 'enqueue', val: 'D' }, { op: 'dequeue' }, { op: 'dequeue' },
]

export const DEFAULT_LL_OPS = [
  { op: 'append', val: 10 }, { op: 'append', val: 20 }, { op: 'append', val: 30 },
  { op: 'prepend', val: 5 }, { op: 'traverse' }, { op: 'delete', val: 20 }, { op: 'traverse' },
]
