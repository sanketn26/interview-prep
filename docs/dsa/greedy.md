---
title: Greedy Algorithms
description: Interval scheduling, Huffman coding, and activity selection — greedy algorithms with an interactive interval-scheduling visualizer.
---

# Greedy Algorithms

**Difficulty:** Medium | **Pattern Type:** Locally optimal choices

[← DSA Overview](index.md) | [← Tries](tries.md) | [Next: String Matching →](string-matching.md)

---

## Why This Technique Exists

Some optimization problems don't need dynamic programming's "try every combination and remember the best" — a sequence of purely **local** best choices, made once and never revisited, provably produces the **global** optimum. When that holds, greedy is dramatically simpler and faster than DP: O(n log n) for a sort instead of O(n²) or worse for a full DP table.

The catch is that greedy is only correct when the problem has a specific structure (below) — applied to the wrong problem, it produces a plausible-looking wrong answer with no warning. Knowing *when* greedy is valid is the actual interview skill.

---

## Mental Model

A greedy algorithm makes the choice that looks best **right now**, commits to it, and never reconsiders. This is valid exactly when the problem has:

1. **Greedy choice property** — a locally optimal choice leads to a globally optimal solution; you never need to backtrack.
2. **Optimal substructure** — the optimal solution to the whole problem contains optimal solutions to its subproblems (same requirement DP has).

```
Interval scheduling — maximize the count of non-overlapping intervals:

  A: [1,4]  B: [3,5]  C: [0,6]  D: [5,7]
  |----|
      |----|
  |--------------|
                |----|

Greedy rule: sort by END time, always take the interval that ends soonest
among those still compatible. This is provably optimal — the interval that
ends earliest can never be a worse choice than any other, because it leaves
the most room for everything after it.
```

The proof pattern for most greedy correctness arguments is an **exchange argument**: take any optimal solution that differs from the greedy one, show you can swap in the greedy choice without making it worse — therefore greedy is at least as good.

---

## Interactive Interval Scheduling Visualizer

<div class="sim-container">
  <div class="sim-title">📅 Greedy Interval Scheduling</div>

  <div class="sim-stats">
    <div class="sim-stat"><div class="sim-stat-label">Accepted</div><div class="sim-stat-value" id="greedy-count">—</div></div>
  </div>

  <div class="sim-controls">
    <button class="sim-btn success" onclick="window._greedy && window._greedy.run()">▶ Run (sort by end time)</button>
    <button class="sim-btn danger" onclick="window._greedy && window._greedy.reset()">Reset</button>
  </div>

  <canvas id="greedy-canvas" style="width:100%;height:300px;"></canvas>

  <div style="margin:0.5rem 0;font-size:0.8rem">
    <span style="background:#37474f;padding:2px 8px;border-radius:4px;color:#fff">Pending</span>
    <span style="background:#f57f17;padding:2px 8px;border-radius:4px;color:#fff;margin-left:8px">Considering</span>
    <span style="background:#1b5e20;padding:2px 8px;border-radius:4px;color:#fff;margin-left:8px">Accepted</span>
    <span style="background:#7f1d1d;padding:2px 8px;border-radius:4px;color:#fff;margin-left:8px">Rejected (overlaps)</span>
  </div>

  <div class="sim-log" id="greedy-log"></div>
</div>

---

## Implementation

### Activity Selection (Interval Scheduling)

```python
def max_activities(intervals: list[tuple[int, int]]) -> list[tuple[int, int]]:
    """Maximize count of non-overlapping intervals. Sort by END time — the
    provably optimal greedy rule for this problem (NOT start time, NOT duration)."""
    if not intervals:
        return []

    sorted_intervals = sorted(intervals, key=lambda iv: iv[1])
    selected = [sorted_intervals[0]]
    last_end = sorted_intervals[0][1]

    for start, end in sorted_intervals[1:]:
        if start >= last_end:  # compatible — doesn't overlap the last accepted interval
            selected.append((start, end))
            last_end = end

    return selected
    # Time: O(n log n) for the sort, O(n) for the single pass
    # Space: O(n) for the result
```

!!! warning "Sort by end time, not start time or duration"
    Sorting by **start time** greedily picks whichever interval appears first, which can lock in a long interval that blocks many short ones later. Sorting by **duration** (shortest first) also fails — a short interval in the "wrong" place can still block more total activities than a longer one ending earlier. Only end-time sorting is provably optimal here; verify this on a small counterexample before trusting a greedy rule in an interview.

### Huffman Coding (Optimal Prefix-Free Compression)

```python
import heapq
from collections import Counter

class HuffmanNode:
    def __init__(self, freq: int, char: str | None = None, left=None, right=None):
        self.freq = freq; self.char = char; self.left = left; self.right = right
    def __lt__(self, other):  # heap needs a total order
        return self.freq < other.freq

def build_huffman_tree(text: str) -> HuffmanNode:
    """Greedy: always merge the two least-frequent nodes. Minimizes weighted path
    length = expected code length, which is exactly what compression wants."""
    freq = Counter(text)
    heap = [HuffmanNode(f, ch) for ch, f in freq.items()]
    heapq.heapify(heap)

    while len(heap) > 1:
        left = heapq.heappop(heap)
        right = heapq.heappop(heap)
        merged = HuffmanNode(left.freq + right.freq, left=left, right=right)
        heapq.heappush(heap, merged)

    return heap[0]
    # Time: O(k log k) where k = number of distinct characters


def build_codes(node: HuffmanNode, prefix: str = "", codes: dict[str, str] | None = None) -> dict[str, str]:
    if codes is None:
        codes = {}
    if node.char is not None:  # leaf
        codes[node.char] = prefix or "0"  # handle single-character input
        return codes
    build_codes(node.left, prefix + "0", codes)
    build_codes(node.right, prefix + "1", codes)
    return codes
    # Frequent characters end up near the root → short codes.
    # Result is prefix-free: no code is a prefix of another, so decoding is unambiguous.
```

**Example** — text with character frequencies a:5, b:3, c:2, d:1 (11 characters total). Each step merges the two least-frequent nodes in the heap:

```
  merge d(1) + c(2) → N1(3)
  merge b(3) + N1(3) → N2(6)     (tie on freq=3; either order is a valid Huffman tree)
  merge a(5) + N2(6) → root(11)

                    root(11)
                   /        \
               a(5)          N2(6)
             code=0         /      \
                         b(3)      N1(3)
                       code=10    /      \
                               d(1)      c(2)
                             code=110   code=111

  Fixed-width baseline: 11 chars x 2 bits = 22 bits
  Huffman cost: 5x1 + 3x2 + 1x3 + 2x3 = 5+6+3+6 = 20 bits

  a is the most frequent symbol and lands as a direct child of the root
  (shortest code); c and d are the rarest and end up deepest (longest
  codes) — that's the "why" behind the compression.
```

### Fractional Knapsack (Greedy Works Here; 0/1 Knapsack Needs DP)

```python
def fractional_knapsack(items: list[tuple[int, int]], capacity: int) -> float:
    """items: (value, weight). Greedy on value/weight ratio — valid ONLY because
    items can be split. 0/1 knapsack (whole items only) requires DP instead."""
    items = sorted(items, key=lambda iv: iv[0] / iv[1], reverse=True)
    total_value = 0.0
    remaining = capacity

    for value, weight in items:
        if remaining <= 0:
            break
        take = min(weight, remaining)
        total_value += value * (take / weight)
        remaining -= take

    return total_value
    # Time: O(n log n) for the sort
```

---

## When to Use Which

| Scenario | Use | Why |
|----------|-----|-----|
| Maximize non-overlapping intervals | **Greedy, sort by end time** | Exchange argument proves earliest-end is never a worse choice |
| Minimum number of meeting rooms | **Greedy + heap of end times**, or sort start/end separately | Track concurrent overlap as a sweep |
| Optimal prefix-free encoding | **Huffman (greedy merge of least-frequent)** | Provably minimizes expected code length |
| Items are **divisible** (fractional knapsack) | **Greedy on value/weight ratio** | Splitting removes the combinatorial trap that makes 0/1 knapsack hard |
| Items are **indivisible** (0/1 knapsack) | **Dynamic programming** | Greedy on ratio can strand capacity on a suboptimal combination — no exchange argument holds |
| "How many ways" / need the actual optimal *value* under combinatorial constraints | **DP**, not greedy | Greedy only works when local optimality is *provably* global — default to DP unless you can prove the exchange argument |
| Jump game / can-you-reach-the-end | **Greedy, track farthest reachable index** | Provable: if you can reach index i, you can reach anything ≤ max-reachable seen so far |
| Coin change with **arbitrary** denominations | **DP**, not greedy | Greedy (always take the largest coin) fails for non-canonical denominations (e.g., [1,3,4] making 6 — greedy gives 4+1+1=3 coins, optimal is 3+3=2) |

---

## Common Problems and Patterns

### Jump Game (Greedy Reachability)

```python
def can_jump(nums: list[int]) -> bool:
    """Track the farthest index reachable so far — greedy because reaching
    farther is never worse than reaching less far, from any position."""
    farthest = 0
    for i, num in enumerate(nums):
        if i > farthest:
            return False  # this index is unreachable, and nothing later can be either
        farthest = max(farthest, i + num)
    return True
    # Time: O(n)  Space: O(1)
```

### Minimum Number of Meeting Rooms

```python
import heapq

def min_meeting_rooms(intervals: list[tuple[int, int]]) -> int:
    """Sort by start; use a heap of active end times to track concurrent overlap."""
    if not intervals:
        return 0

    intervals = sorted(intervals, key=lambda iv: iv[0])
    heap = []  # end times of rooms currently in use

    for start, end in intervals:
        if heap and heap[0] <= start:
            heapq.heappop(heap)  # earliest-ending room freed up before this meeting starts
        heapq.heappush(heap, end)

    return len(heap)  # max concurrent rooms needed
    # Time: O(n log n)  Space: O(n)
```

### Gas Station (Greedy Single Pass)

```python
def can_complete_circuit(gas: list[int], cost: list[int]) -> int:
    """If total gas >= total cost, a valid start exists. Greedy: whenever the
    running tank goes negative, no station up to here can be the start — reset."""
    if sum(gas) < sum(cost):
        return -1

    tank, start = 0, 0
    for i in range(len(gas)):
        tank += gas[i] - cost[i]
        if tank < 0:
            start = i + 1  # this station, and none before it up to here, can start
            tank = 0

    return start
    # Time: O(n)  Space: O(1)
```

---

## Complexity Summary

| Problem | Time | Space |
|---------|------|-------|
| Activity selection / interval scheduling | O(n log n) | O(n) |
| Huffman coding | O(k log k), k = distinct symbols | O(k) |
| Fractional knapsack | O(n log n) | O(1) extra |
| Jump game | O(n) | O(1) |
| Minimum meeting rooms | O(n log n) | O(n) |
| Gas station | O(n) | O(1) |

---

## Interview Follow-ups

1. **"How do you prove a greedy algorithm is correct?"** — Exchange argument: assume an optimal solution differs from greedy's first choice, show swapping in the greedy choice doesn't make it worse, conclude by induction that greedy is at least as good everywhere.
2. **"When does greedy fail where DP is needed?"** — Whenever the locally best choice can strand you in a worse global position — classic example: 0/1 knapsack (can't split items) or coin change with non-canonical denominations.
3. **"Greedy vs DP — how do you decide which to reach for first?"** — Try to find a greedy rule and a small counterexample for it. If you can't break it after a genuine attempt, it's probably correct and you save enormous complexity over DP. If you find a counterexample, that's your signal to move to DP.
4. **"Why does Huffman coding produce a prefix-free code?"** — Every character is a leaf in the final binary tree; no leaf is an ancestor of another, so no code can be a prefix of a different code — decoding is unambiguous left to right.

---

## Key Takeaways

!!! success "Remember"
    1. Greedy is valid only with **greedy choice property + optimal substructure** — prove it (exchange argument) or find a counterexample before trusting it.
    2. **Interval scheduling**: sort by **end time** — not start time, not duration. This is the single most common greedy interview trap.
    3. **Huffman coding**: repeatedly merge the two least-frequent nodes — minimizes expected code length, guarantees prefix-free codes.
    4. **Fractional knapsack works greedily** (sort by value/weight); **0/1 knapsack does not** — divisibility is the deciding factor.
    5. When in doubt, try to break your greedy rule with a small adversarial example before committing to it in an interview — a wrong greedy answer looks confident and is often wrong.
