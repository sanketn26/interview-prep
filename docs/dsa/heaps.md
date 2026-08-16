---
title: Heaps & Priority Queues
description: Master min-heaps and priority queues with an interactive insert/extract-min visualizer, heapify, and top-k patterns.
---

# Heaps & Priority Queues

**Difficulty:** Medium | **Pattern Type:** Priority-ordered access

[← DSA Overview](index.md) | [← BFS & DFS](bfs-dfs.md) | [Next: Graph Algorithms →](graph-algorithms.md)

---

## Why This Data Structure Exists

Sorting an entire collection to repeatedly pull the smallest (or largest) element is wasteful — O(n log n) up front when you may only need the top few. A **heap** gives you the minimum (or maximum) in O(1) and lets you insert or remove it in O(log n), without ever fully sorting anything.

Any time the clue is **"top k"**, **"k-th smallest/largest"**, **"merge k sorted lists"**, or **"schedule by priority"**, a heap is the tool: it maintains partial order — just enough to always know what's next.

---

## Mental Model

A binary heap is a **complete binary tree stored in an array**. "Complete" means every level is full except possibly the last, which fills left to right — that's what lets it live in an array with no pointers:

```
Array:  [2, 4, 5, 12, 9, 15, 7]
Index:   0  1  2   3  4   5  6

Tree:
              2(0)
            /      \
         4(1)        5(2)
        /    \       /    \
    12(3)   9(4)  15(5)  7(6)

parent(i) = (i-1) // 2
left(i)   = 2i + 1
right(i)  = 2i + 2
```

**Min-heap invariant:** every parent ≤ both children. The root is always the minimum — but siblings and cousins have **no** ordering relationship to each other. A heap is not a sorted array; it's the minimum amount of order needed to answer "what's smallest?" in O(1).

Two operations restore the invariant after it breaks:

- **Sift up (bubble up):** after inserting at the end, swap with the parent while smaller than it.
- **Sift down (bubble down):** after removing the root, move the last element to the root and swap with the smaller child while larger than it.

---

## Interactive Heap Visualizer

<div class="sim-container">
  <div class="sim-title">🌡️ Min-Heap: Insert / Extract-Min</div>

  <div class="sim-stats">
    <div class="sim-stat"><div class="sim-stat-label">Size</div><div class="sim-stat-value" id="heap-size">0</div></div>
    <div class="sim-stat"><div class="sim-stat-label">Min (root)</div><div class="sim-stat-value" id="heap-min">—</div></div>
  </div>

  <div class="sim-controls">
    <input type="number" id="heap-input" placeholder="value" style="width:80px">
    <button class="sim-btn success" onclick="window._heap && window._heap.insert(parseInt(document.getElementById('heap-input').value))">▶ Insert</button>
    <button class="sim-btn success" onclick="window._heap && window._heap.insert(undefined)">▶ Insert Random</button>
    <button class="sim-btn" onclick="window._heap && window._heap.extractMin()">Extract-Min</button>
    <button class="sim-btn" onclick="window._heap && window._heap.heapify()">Heapify Random Array</button>
    <button class="sim-btn danger" onclick="window._heap && window._heap.reset()">Reset</button>
  </div>

  <canvas id="heap-canvas" style="width:100%;height:280px;"></canvas>

  <div style="margin:0.5rem 0;font-size:0.8rem">
    <span style="background:#1565c0;padding:2px 8px;border-radius:4px;color:#fff">Root (min)</span>
    <span style="background:#37474f;padding:2px 8px;border-radius:4px;color:#fff;margin-left:8px">Node</span>
    <span style="background:#b71c1c;padding:2px 8px;border-radius:4px;color:#fff;margin-left:8px">Active (sifting)</span>
  </div>

  <div class="sim-log" id="heap-log"></div>
</div>

---

## Implementation

Python's `heapq` module implements a **min-heap** on a plain list. There is no built-in max-heap — negate values instead.

```python
import heapq

def heap_basics() -> None:
    heap: list[int] = []
    for v in [5, 3, 8, 1, 9, 2]:
        heapq.heappush(heap, v)     # O(log n) — insert + sift up

    smallest = heapq.heappop(heap)  # O(log n) — remove root + sift down
    print(smallest)                 # 1

    heapq.heapify([9, 3, 7, 1])     # O(n) — build heap in place, cheaper than n pushes
```

**Building a heap from scratch (heapify / insert / extract):**

```python
class MinHeap:
    def __init__(self) -> None:
        self.data: list[int] = []

    def _parent(self, i: int) -> int: return (i - 1) // 2
    def _left(self, i: int) -> int: return 2 * i + 1
    def _right(self, i: int) -> int: return 2 * i + 2

    def insert(self, val: int) -> None:
        self.data.append(val)
        self._sift_up(len(self.data) - 1)
        # Time: O(log n) — height of a complete binary tree

    def _sift_up(self, i: int) -> None:
        while i > 0 and self.data[self._parent(i)] > self.data[i]:
            p = self._parent(i)
            self.data[i], self.data[p] = self.data[p], self.data[i]
            i = p

    def extract_min(self) -> int:
        if not self.data:
            raise IndexError("extract_min from empty heap")
        min_val = self.data[0]
        last = self.data.pop()
        if self.data:
            self.data[0] = last
            self._sift_down(0)
        return min_val
        # Time: O(log n)

    def _sift_down(self, i: int) -> None:
        n = len(self.data)
        while True:
            l, r, smallest = self._left(i), self._right(i), i
            if l < n and self.data[l] < self.data[smallest]: smallest = l
            if r < n and self.data[r] < self.data[smallest]: smallest = r
            if smallest == i:
                break
            self.data[i], self.data[smallest] = self.data[smallest], self.data[i]
            i = smallest

    @classmethod
    def heapify(cls, arr: list[int]) -> "MinHeap":
        """Build a heap in O(n), not O(n log n)."""
        h = cls()
        h.data = arr[:]
        for i in range(len(arr) // 2 - 1, -1, -1):
            h._sift_down(i)
        return h
        # Time: O(n) — most nodes are near the bottom and sift a short distance;
        # this beats n calls to insert (O(n log n)) by an amortized argument.
```

!!! tip "Why heapify is O(n), not O(n log n)"
    Insert-based construction sifts every element up to O(log n) — pessimistic, because most elements start near the leaves. Bottom-up heapify sifts *down*, and the number of nodes at height h is n / 2^(h+1), so the total work is a convergent sum: Σ (n / 2^(h+1)) · h = O(n).

---

## When to Use Which

| Scenario | Use | Why |
|----------|-----|-----|
| Need min or max repeatedly, with insertions interleaved | **Heap** | O(log n) insert/extract vs O(n) for a scanning min, or O(n log n) re-sort |
| "Top k" / "k-th largest" of a stream | **Heap of size k** | O(n log k) — never sort the full n |
| Merge k sorted lists/streams | **Heap of k heads** | O(n log k) instead of O(nk) pairwise merges |
| Need full sorted order once | **Sort** | O(n log n) either way; sorting is simpler and cache-friendlier |
| Need arbitrary-key lookup, not just min/max | **Hash map / BST** | Heaps only expose the root efficiently |
| Priority changes after insertion (e.g. Dijkstra decrease-key) | **Heap + lazy deletion** or indexed heap | Python's `heapq` has no decrease-key; push a new entry and skip stale ones on pop |
| Median of a stream | **Two heaps** (max-heap below, min-heap above) | O(log n) insert, O(1) median read |

---

## Common Problems and Patterns

### Kth Largest Element in a Stream

```python
import heapq

class KthLargest:
    """Maintain a min-heap of size k — its root is the k-th largest seen so far."""
    def __init__(self, k: int, nums: list[int]) -> None:
        self.k = k
        self.heap = nums[:]
        heapq.heapify(self.heap)
        while len(self.heap) > k:
            heapq.heappop(self.heap)

    def add(self, val: int) -> int:
        heapq.heappush(self.heap, val)
        if len(self.heap) > self.k:
            heapq.heappop(self.heap)
        return self.heap[0]
        # Time: O(log k) per add — the heap never grows past size k
```

### Merge K Sorted Lists

```python
import heapq
from typing import Optional

class ListNode:
    def __init__(self, val=0, next=None):
        self.val = val; self.next = next

def merge_k_lists(lists: list[Optional[ListNode]]) -> Optional[ListNode]:
    """Push each list's head; always pop the global minimum."""
    heap = []
    for i, node in enumerate(lists):
        if node:
            heapq.heappush(heap, (node.val, i, node))  # tie-break with index (nodes aren't comparable)

    dummy = tail = ListNode()
    while heap:
        val, i, node = heapq.heappop(heap)
        tail.next = node
        tail = tail.next
        if node.next:
            heapq.heappush(heap, (node.next.val, i, node.next))

    return dummy.next
    # Time: O(n log k) where n = total nodes, k = number of lists
    # Space: O(k) for the heap
```

### Top K Frequent Elements

```python
import heapq
from collections import Counter

def top_k_frequent(nums: list[int], k: int) -> list[int]:
    """Count frequencies, then keep only the k most frequent via a heap."""
    counts = Counter(nums)
    # heapq.nlargest is O(n log k) internally — a size-k heap under the hood
    return heapq.nlargest(k, counts.keys(), key=counts.get)
    # Time: O(n log k)  Space: O(n) for the counter
```

---

## Complexity Summary

| Operation | Time | Notes |
|-----------|------|-------|
| Peek min/max | O(1) | Root of the array |
| Insert | O(log n) | Sift up, height of tree |
| Extract min/max | O(log n) | Sift down, height of tree |
| Heapify (build from array) | O(n) | Bottom-up, amortized |
| Search arbitrary value | O(n) | No ordering below the root — heaps are not search structures |
| Space | O(n) | Array-backed, no pointer overhead |

---

## Interview Follow-ups

1. **"How do you implement a max-heap in Python?"** — `heapq` is min-heap only; push negated values, negate again on pop.
2. **"Decrease-key isn't supported — how do you handle Dijkstra?"** — Push a new `(new_dist, node)` entry instead of mutating; on pop, skip any entry whose distance is stale (larger than the best known).
3. **"Why not just keep the array sorted?"** — Insertion into a sorted array is O(n) (shifting); a heap trades full order for O(log n) insert, which is the right trade when you only ever need the extreme.
4. **"Heap vs BST for a priority queue?"** — Heap is simpler, more cache-friendly, and O(1) peek; BST gives you O(log n) arbitrary search/predecessor/successor that a heap can't.

---

## Key Takeaways

!!! success "Remember"
    1. A heap is a **complete binary tree in an array** — `parent = (i-1)//2`, `left = 2i+1`, `right = 2i+2`.
    2. Min-heap invariant: parent ≤ children, recursively. The root is the min; nothing else is ordered.
    3. **Insert** = append + sift up. **Extract** = swap root with last, pop, sift down. Both O(log n).
    4. **Heapify an array is O(n)**, not O(n log n) — bottom-up sift-down beats n inserts.
    5. Reach for a heap on the clue **"top k"**, **"k-th largest"**, or **"merge k sorted streams"** — O(n log k) beats sorting everything.
    6. Python's `heapq` is min-heap only and has no decrease-key — negate for max-heap, use lazy deletion for Dijkstra-style updates.
