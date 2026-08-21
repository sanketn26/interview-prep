---
title: Skip Lists, Fenwick Trees & Segment Trees
description: Exact ordered maps and log-time range queries — skip lists, binary indexed trees, and segment trees with visualizers.
---

# Skip Lists, Fenwick Trees & Segment Trees

**Difficulty:** Hard | **Pattern Type:** Ordered maps / range queries

[← DSA Overview](index.md) | [← Probabilistic Sketches](probabilistic-sketches.md) | [Back to DSA Overview →](index.md)

!!! note "Exact on purpose"
    [Bloom / sketches](probabilistic-sketches.md) trade correctness for RAM. This page is the other fork: **the answer must be exact**, updates and queries both have to be faster than O(n), and you are willing to pay O(n) memory. Redis sorted sets, prefix-sum interviews, and "range add, range min" all live here.

---

## Why These Structures Exist

A sorted array gives O(log n) search and O(n) insert. A balanced BST gives O(log n) insert/search but not "sum of keys in `[L, R]`" without extra work. (A heap gives O(1) access to the extremum but O(n) search for an arbitrary key — it's not a substitute for a balanced BST here.) A prefix-sum array gives O(1) range sum and O(n) point update.

The three structures on this page close those gaps:

```
Need an ordered map that stays simple under concurrency?     Skip list
Need point update + prefix/range sum, tiny code?            Fenwick (BIT)
Need range min/max, range add, or arbitrary range functions? Segment tree
```

They show up in **system** interviews too: Redis `ZSET` is a skip list + hash table; Fenwick/segment trees are the "n = 10^5, many range queries" DSA tell.

!!! tip "Mental Model"
    Skip list = express lanes on a sorted linked list (coin flips instead of rotations). Fenwick = the prefix-sum array's updatable cousin (each index owns a power-of-two range). Segment tree = the full binary tree over the array (every interval has a node).

---

## Skip List

### Why it exists

AVL/red-black trees keep O(log n) by **rotations**. Those are easy to get wrong and unpleasant to lock. A skip list keeps several linked-list levels: layer 0 is every node; each higher layer is a random subset that skips ahead. Search walks right on the highest level until the next key would overshoot, then drops down. Expected search/insert/delete is O(log n) with **no rotations** — just coin flips at insert.

```
L2:  HEAD ----------------------------- 9 -------------- NIL
L1:  HEAD ----------- 4 -------------- 9 ----- 12 ----- NIL
L0:  HEAD -- 1 -- 3 -- 4 -- 7 --------- 9 -- 10 -- 12 -- NIL
                  ↑
Search 7: start L2, 9 is too big → drop. L1: 4 < 7, 9 too big → drop.
L0: 4 → 7. Found.
```

Java `ConcurrentSkipListMap` and Redis sorted sets use this shape (Redis: skip list for order + hash table for O(1) by member). Interviewers like it because you can draw it and implement it in a whiteboard hour, unlike a correct red-black tree.

### Interactive Skip List

<div class="sim-container">
  <div class="sim-title">🪂 Skip list: insert (coin-flip height) and search</div>

  <div class="sim-stats">
    <div class="sim-stat"><div class="sim-stat-label">Nodes</div><div class="sim-stat-value" id="skip-n">0</div></div>
    <div class="sim-stat"><div class="sim-stat-label">Max level</div><div class="sim-stat-value" id="skip-lvl">0</div></div>
  </div>

  <div class="sim-controls">
    <input type="number" id="skip-val" placeholder="key" style="width:80px" />
    <button class="sim-btn success" onclick="window._skip && window._skip.insert(Number(document.getElementById('skip-val').value))">Insert</button>
    <button class="sim-btn" onclick="window._skip && window._skip.search(Number(document.getElementById('skip-val').value))">Search</button>
    <button class="sim-btn danger" onclick="window._skip && window._skip.reset()">Reset</button>
  </div>

  <div id="skip-view" style="margin:1rem 0;font-family:monospace;font-size:0.85rem;line-height:1.8;"></div>
  <div class="sim-log" id="skip-log"></div>
</div>

Insert a handful of keys (3, 9, 1, 7, 12, 4). Heights will differ across runs — that randomness *is* the balance. Then search for 7 and watch the path drop a level each time the next pointer would overshoot.

```python
import random
from dataclasses import dataclass, field


@dataclass
class SkipNode:
    key: int
    forward: list["SkipNode | None"] = field(default_factory=list)


class SkipList:
    def __init__(self, max_level: int = 16, p: float = 0.5):
        self.max_level = max_level
        self.p = p
        self.level = 0
        self.head = SkipNode(key=-(10**18), forward=[None] * max_level)

    def _random_level(self) -> int:
        lvl = 1
        while random.random() < self.p and lvl < self.max_level:
            lvl += 1
        return lvl

    def search(self, key: int) -> bool:
        cur = self.head
        for i in range(self.level - 1, -1, -1):
            while cur.forward[i] and cur.forward[i].key < key:
                cur = cur.forward[i]
        cur = cur.forward[0]
        return cur is not None and cur.key == key
        # Expected time: O(log n)

    def insert(self, key: int) -> None:
        update = [self.head] * self.max_level
        cur = self.head
        for i in range(self.level - 1, -1, -1):
            while cur.forward[i] and cur.forward[i].key < key:
                cur = cur.forward[i]
            update[i] = cur
        lvl = self._random_level()
        self.level = max(self.level, lvl)
        node = SkipNode(key=key, forward=[None] * lvl)
        for i in range(lvl):
            node.forward[i] = update[i].forward[i]
            update[i].forward[i] = node
        # Expected time: O(log n)

    def delete(self, key: int) -> bool:
        update = [self.head] * self.max_level
        cur = self.head
        for i in range(self.level - 1, -1, -1):
            while cur.forward[i] and cur.forward[i].key < key:
                cur = cur.forward[i]
            update[i] = cur
        target = cur.forward[0]
        if target is None or target.key != key:
            return False
        for i in range(len(target.forward)):
            update[i].forward[i] = target.forward[i]
        while self.level > 0 and self.head.forward[self.level - 1] is None:
            self.level -= 1
        return True
        # Expected time: O(log n)
```

**Failure mode:** a pathological RNG that never promotes nodes degenerates toward O(n). In practice `p=0.5` and a decent PRNG make that vanishingly rare — the same class of argument as "hash tables are O(1) expected."

---

## Fenwick Tree (Binary Indexed Tree)

### Why it exists

Prefix sums: build `pref[i] = a[1]+…+a[i]` in O(n), range sum `[L,R]` in O(1), then someone says "now support point updates." Rebuilding is O(n) per update.

A Fenwick tree stores, at index `i`, the sum of a **responsibility range** ending at `i` whose length is the lowest set bit of `i`. Update and prefix query walk by flipping that bit: O(log n), tiny constant, ~n extra ints, and the code is ten lines.

```
Index:     1    2    3    4    5    6    7    8
Array:     3    2   -1    6    5    4    2    3
bit[i] covers:
  1: [1]           2: [1..2]       4: [1..4]       8: [1..8]
  3: [3]           6: [5..6]       5: [5]          7: [7]
```

**Indexes are 1-based.** `i + (i & -i)` moves to the next parent on update; `i -= (i & -i)` walks toward 0 on prefix query. Range `[L,R] = prefix(R) - prefix(L-1)`.

### Interactive Fenwick prefix sums

<div class="sim-container">
  <div class="sim-title">🌲 Fenwick: point add, then prefix / range sum</div>

  <div class="sim-stats">
    <div class="sim-stat"><div class="sim-stat-label">Last prefix</div><div class="sim-stat-value" id="fw-pref">—</div></div>
    <div class="sim-stat"><div class="sim-stat-label">Last range</div><div class="sim-stat-value" id="fw-range">—</div></div>
  </div>

  <div class="sim-controls">
    <button class="sim-btn success" onclick="window._fenwick && window._fenwick.add(3, 2)">Add +2 at i=3</button>
    <button class="sim-btn" onclick="window._fenwick && window._fenwick.prefix(5)">Prefix sum(5)</button>
    <button class="sim-btn" onclick="window._fenwick && window._fenwick.range(2, 6)">Range [2,6]</button>
    <button class="sim-btn danger" onclick="window._fenwick && window._fenwick.reset()">Reset</button>
  </div>

  <div id="fw-arr" style="margin:0.75rem 0;"></div>
  <div id="fw-bit" style="margin:0.5rem 0;"></div>
  <div class="sim-log" id="fw-log"></div>
</div>

Watch which `bit[]` cells light up on `add` (they are not "the one index you edited"). Prefix query lights a *different* subset — that mismatch is the structure.

```python
class Fenwick:
    """1-indexed point add + prefix sum. Range [L,R] = prefix(R) - prefix(L-1)."""

    def __init__(self, n: int):
        self.n = n
        self.bit = [0] * (n + 1)

    def add(self, i: int, delta: int) -> None:
        while i <= self.n:
            self.bit[i] += delta
            i += i & -i
        # Time: O(log n)

    def prefix(self, i: int) -> int:
        s = 0
        while i > 0:
            s += self.bit[i]
            i -= i & -i
        return s
        # Time: O(log n)

    def range_sum(self, left: int, right: int) -> int:
        return self.prefix(right) - self.prefix(left - 1)
```

**What Fenwick is bad at:** range minimum (the responsibility ranges do not combine with `min` the way they do with `+`). Range-add + point-query is fine with a *single* Fenwick tree over the difference array (add `delta` at `L`, subtract at `R+1`, point-query is just `prefix(i)`); it's range-add + range-sum that needs two Fenwick trees. The moment the interviewer says "range add *and* range min," you want a segment tree.

---

## Segment Tree

### Why it exists

A Fenwick tree is a compressed segment tree for **invertible** operations (sum, xor). A segment tree stores an explicit node for every dyadic interval:

```
                   [1..8]
           [1..4]            [5..8]
       [1..2]  [3..4]    [5..6]  [7..8]
      [1] [2] [3] [4]   [5] [6] [7] [8]
```

Each node holds `f` of its interval — sum, min, max, gcd. A query interval splits into O(log n) canonical nodes. A point update touches the leaf and O(log n) ancestors.

**Lazy propagation** is the reason staff candidates mention segment trees in a system-flavoured round: a range add writes the delta on O(log n) nodes and postpones pushing it to children until a query needs those children. Fenwick can do range-add + prefix-sum with a difference array; it cannot do range-add + range-min without this tree.

```python
class SegmentTree:
    """Point update + range sum. 0-indexed externally, heap layout internally."""

    def __init__(self, arr: list[int]):
        self.n = len(arr)
        self.t = [0] * (4 * self.n)
        self._build(arr, 1, 0, self.n - 1)

    def _build(self, arr: list[int], v: int, l: int, r: int) -> None:
        if l == r:
            self.t[v] = arr[l]
            return
        m = (l + r) // 2
        self._build(arr, v * 2, l, m)
        self._build(arr, v * 2 + 1, m + 1, r)
        self.t[v] = self.t[v * 2] + self.t[v * 2 + 1]

    def add(self, idx: int, delta: int) -> None:
        self._add(1, 0, self.n - 1, idx, delta)

    def _add(self, v: int, l: int, r: int, idx: int, delta: int) -> None:
        if l == r:
            self.t[v] += delta
            return
        m = (l + r) // 2
        if idx <= m:
            self._add(v * 2, l, m, idx, delta)
        else:
            self._add(v * 2 + 1, m + 1, r, idx, delta)
        self.t[v] = self.t[v * 2] + self.t[v * 2 + 1]
        # Time: O(log n)

    def range_sum(self, ql: int, qr: int) -> int:
        return self._query(1, 0, self.n - 1, ql, qr)

    def _query(self, v: int, l: int, r: int, ql: int, qr: int) -> int:
        if qr < l or r < ql:
            return 0
        if ql <= l and r <= qr:
            return self.t[v]
        m = (l + r) // 2
        return self._query(v * 2, l, m, ql, qr) + self._query(v * 2 + 1, m + 1, r, ql, qr)
        # Time: O(log n)
        # Space: O(n) nodes (4n array is the usual allocation)
```

**Lazy range add** (the staff follow-up): write the delta on O(log n) nodes and push it down only when a child is needed.

```python
class LazySegmentTree:
    """Range add + range sum. `lazy[v]` is a delta not yet pushed to children."""

    def __init__(self, n: int):
        self.n = n
        self.t = [0] * (4 * n)
        self.lazy = [0] * (4 * n)

    def _push(self, v: int, l: int, r: int) -> None:
        if not self.lazy[v] or l == r:
            self.t[v] += self.lazy[v] * (r - l + 1)
            if l != r:
                self.lazy[v * 2] += self.lazy[v]
                self.lazy[v * 2 + 1] += self.lazy[v]
            self.lazy[v] = 0

    def range_add(self, ql: int, qr: int, delta: int) -> None:
        self._add(1, 0, self.n - 1, ql, qr, delta)

    def _add(self, v: int, l: int, r: int, ql: int, qr: int, delta: int) -> None:
        self._push(v, l, r)
        if qr < l or r < ql:
            return
        if ql <= l and r <= qr:
            self.lazy[v] += delta
            self._push(v, l, r)
            return
        m = (l + r) // 2
        self._add(v * 2, l, m, ql, qr, delta)
        self._add(v * 2 + 1, m + 1, r, ql, qr, delta)
        self.t[v] = self.t[v * 2] + self.t[v * 2 + 1]

    def range_sum(self, ql: int, qr: int) -> int:
        return self._sum(1, 0, self.n - 1, ql, qr)

    def _sum(self, v: int, l: int, r: int, ql: int, qr: int) -> int:
        self._push(v, l, r)
        if qr < l or r < ql:
            return 0
        if ql <= l and r <= qr:
            return self.t[v]
        m = (l + r) // 2
        return self._sum(v * 2, l, m, ql, qr) + self._sum(v * 2 + 1, m + 1, r, ql, qr)
        # Time: O(log n) add and query
```

**Sparse table** — static cousin: O(n log n) preprocess, O(1) range min (any **idempotent** op: min, max, gcd). No updates.

```python
class SparseTable:
    def __init__(self, arr: list[int]):
        n = len(arr)
        k = max(1, n.bit_length())
        self.st = [arr[:]]
        for j in range(1, k):
            prev = self.st[j - 1]
            step = 1 << (j - 1)
            row = [min(prev[i], prev[i + step]) for i in range(n - (1 << j) + 1)]
            self.st.append(row)
        self.log = [0] * (n + 1)
        for i in range(2, n + 1):
            self.log[i] = self.log[i // 2] + 1

    def range_min(self, left: int, right: int) -> int:
        j = self.log[right - left + 1]
        return min(self.st[j][left], self.st[j][right - (1 << j) + 1])
        # Time: O(1) query. Cannot support updates — rebuild if the array changes.
```

---

## When to Use Which

| Need | Structure | Why not the others |
|------|-----------|-------------------|
| Ordered map, concurrent-friendly, Redis-shaped | **Skip list** | Trees need rotations; Fenwick is not a map |
| Point update + range/prefix **sum** (or xor), tiny code | **Fenwick** | Segment tree is 3–4× more code for the same op |
| Range min/max, range add + range query, lazy | **Segment tree** | Fenwick responsibility ranges are not min-friendly |
| Static array, range min, no updates | Sparse table | Segment tree still works, wasteful |
| Approximate counts / p99 / membership | **Not these** — [sketches](probabilistic-sketches.md) | Exact log-time structures will not fit a billion keys |

**Complexity (all of Fenwick / segment tree / skip list expected):** build O(n), point update O(log n), query O(log n), space O(n). Skip list extra: O(n) expected pointers with `p=0.5`.

---

## Worked Example With Numbers

**n = 10^5 scores, 10^5 operations:** "add 5 to student i" and "sum of ranks L..R."

Nested loops: 10^5 × 10^5 = 10^10 — timeout. Prefix array: queries O(1) until the first add, then O(n) rebuild.

Fenwick: each add and each range is O(log 10^5) ≈ 17 operations. 2×10^5 × 17 ≈ 3 million — easy. Segment tree also fine (~2× the constant). Skip list is the wrong tool unless you also need "the next student with score ≥ X" as an ordered-map operation.

If the ops change to "add 5 to *everyone in [L,R]* and then min of [L,R]": Fenwick is out; segment tree + lazy is the answer.

---

## Interview Follow-ups

1. **"Why 1-based Fenwick?"** — `i & -i` on two's-complement is the lowest set bit. Index 0 is a sink (`0 & -0 = 0`, infinite loop). Always size `n+1` and ignore `bit[0]`.
2. **"Skip list vs balanced BST?"** — Same expected bounds. Skip list wins on implementation simplicity and fine-grained locking (lock a tower, not a rotated subtree). BST wins on worst-case if you actually implement it (or use the language's tree). Redis chose skip list for ZSET.
3. **"Can Fenwick do range minimum?"** — Not with the same `i & -i` layout: min is not invertible (you cannot subtract a min). Segment tree, or a sparse table if static.
4. **"Space of a segment tree?"** — 4n is the usual heap-style array. The exact node count is 2n–1 for a full compact tree; 4n avoids off-by-one at non-power-of-two n.
5. **"Where does this show up outside LeetCode?"** — Inversion count and 2-D Fenwick on grids; range-sum dashboards with live updates; game leaderboards (skip list / ZSET); compiler interval analysis (segment tree). If the data is a firehose of *approximate* p99, you wanted a t-digest, not a Fenwick of every sample.

---

## Key Takeaways

!!! success "Remember"
    1. **Skip list**: multi-level linked list, coin-flip height, expected O(log n), no rotations — Redis ZSET.
    2. **Fenwick**: 1-based, `i ± (i & -i)`, point add + prefix sum in O(log n) and almost no code.
    3. **Range [L,R] on a Fenwick** is `prefix(R) - prefix(L-1)`, never a second structure.
    4. **Segment tree** is the general range machine (min/max, lazy range updates). Fenwick is the sum specialist.
    5. If n is billions and error is allowed, you are on the [sketches](probabilistic-sketches.md) page, not this one.
