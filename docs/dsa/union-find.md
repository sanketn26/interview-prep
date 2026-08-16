---
title: Union-Find (Disjoint Set)
description: Union-Find with path compression and union by rank, visualized as a forest collapsing toward near-O(1) operations.
---

# Union-Find / Disjoint Set Union (DSU)

**Difficulty:** Medium | **Pattern Type:** Dynamic connectivity

[← DSA Overview](index.md) | [← Graph Algorithms](graph-algorithms.md) | [Next: Backtracking →](backtracking.md)

---

## Why This Data Structure Exists

Some problems only ask one question, over and over, as edges stream in: **"are these two things in the same group?"** Recomputing connected components with BFS/DFS after every new connection is O(V+E) each time. Union-Find answers both "which group is X in?" and "merge these two groups" in **near O(1) amortized**, making it the right tool whenever connectivity changes incrementally.

It underlies Kruskal's MST (reject an edge if it would cycle), cycle detection in undirected graphs, "number of islands II" (dynamic grid connectivity), and friend-circle / account-merging style problems.

---

## Mental Model

Each element starts as its own set (its own tree, pointing to itself). **Union** merges two trees by making one root point to the other. **Find** walks parent pointers up to the root — the root **is** the set's identity.

```
Initial:  0  1  2  3  4     (5 singleton sets, each its own root)

union(0,1): 1 → 0           union(2,3): 3 → 2
    0            0
    |            |
    1            1     2
                       |
                       3

union(1,2): root(1)=0, root(2)=2 → attach smaller tree under larger

    0
   / \
  1   2
      |
      3
```

Two optimizations turn "walk to the root" from O(n) worst case into practically O(1):

- **Union by rank/size:** always attach the smaller tree under the bigger tree's root, keeping trees shallow.
- **Path compression:** while walking up during `find`, repoint every visited node directly to the root, so the *next* find on any of them is instant.

Together they give **O(α(n))** amortized per operation, where α is the inverse Ackermann function — for any input size that fits in the universe, α(n) ≤ 4. It is, for all practical purposes, constant time.

---

## Interactive Union-Find Visualizer

<div class="sim-container">
  <div class="sim-title">🌲 Union-Find: Path Compression + Union by Rank</div>

  <div class="sim-controls">
    <button class="sim-btn success" onclick="window._uf && window._uf.union(1,2)">Union(1,2)</button>
    <button class="sim-btn success" onclick="window._uf && window._uf.union(3,4)">Union(3,4)</button>
    <button class="sim-btn success" onclick="window._uf && window._uf.union(2,4)">Union(2,4)</button>
    <button class="sim-btn success" onclick="window._uf && window._uf.union(6,7)">Union(6,7)</button>
    <button class="sim-btn success" onclick="window._uf && window._uf.union(0,7)">Union(0,7)</button>
    <button class="sim-btn" onclick="window._uf && window._uf.find(4)">Find(4)</button>
    <button class="sim-btn danger" onclick="window._uf && window._uf.reset()">Reset</button>
  </div>

  <canvas id="uf-canvas" style="width:100%;height:260px;"></canvas>

  <div style="margin:0.5rem 0;font-size:0.8rem">
    <span style="background:#1565c0;padding:2px 8px;border-radius:4px;color:#fff">Root</span>
    <span style="background:#37474f;padding:2px 8px;border-radius:4px;color:#fff;margin-left:8px">Child</span>
    <span style="background:#b71c1c;padding:2px 8px;border-radius:4px;color:#fff;margin-left:8px">On find/union path</span>
  </div>

  <div class="sim-log" id="uf-log"></div>
</div>

Watch the edges flatten after a few unions — that's path compression collapsing multi-hop chains into direct root pointers.

---

## Implementation

```python
class UnionFind:
    def __init__(self, n: int) -> None:
        self.parent = list(range(n))  # each node is its own root initially
        self.rank = [0] * n           # upper bound on tree height
        self.count = n                # number of disjoint sets

    def find(self, x: int) -> int:
        """Path compression: repoint every node on the path directly to the root."""
        if self.parent[x] != x:
            self.parent[x] = self.find(self.parent[x])  # recursive compression
        return self.parent[x]
        # Time: O(α(n)) amortized

    def union(self, a: int, b: int) -> bool:
        """Union by rank. Returns False if a and b were already connected."""
        ra, rb = self.find(a), self.find(b)
        if ra == rb:
            return False  # already in the same set — this edge would create a cycle

        if self.rank[ra] < self.rank[rb]:
            ra, rb = rb, ra
        self.parent[rb] = ra
        if self.rank[ra] == self.rank[rb]:
            self.rank[ra] += 1
        self.count -= 1
        return True
        # Time: O(α(n)) amortized

    def connected(self, a: int, b: int) -> bool:
        return self.find(a) == self.find(b)
        # Time: O(α(n))
```

**Iterative find (avoids recursion depth issues on adversarial inputs):**

```python
def find_iterative(parent: list[int], x: int) -> int:
    root = x
    while parent[root] != root:
        root = parent[root]
    while parent[x] != root:       # second pass: compress the path
        parent[x], x = root, parent[x]
    return root
    # Time: O(α(n)) amortized, no recursion stack
```

!!! tip "Union by size is equivalent to union by rank"
    Some implementations track subtree *size* instead of *rank* and attach the smaller-size tree under the larger. Both give the same O(α(n)) bound; size has the minor bonus of directly answering "how big is this set?"

---

## When to Use Which

| Scenario | Use | Why |
|----------|-----|-----|
| Connectivity changes incrementally (edges added over time) | **Union-Find** | O(α(n)) per union/find vs. O(V+E) to recompute components from scratch |
| Static graph, connectivity asked once | **BFS/DFS** | No need for the bookkeeping if the graph never changes |
| Cycle detection in an **undirected** graph | **Union-Find** | If `union(u, v)` returns False, `u` and `v` were already connected — adding this edge creates a cycle |
| Cycle detection in a **directed** graph | **DFS with 3-color state** | Union-Find doesn't encode direction |
| MST construction | **Union-Find (inside Kruskal's)** | Reject an edge exactly when it would connect an already-connected pair |
| Need to *remove* a connection later | **Not Union-Find** | Union-Find only supports merging, never splitting — no efficient "un-union" |

---

## Common Problems and Patterns

### Number of Provinces (Friend Circles)

```python
def find_circle_num(is_connected: list[list[int]]) -> int:
    n = len(is_connected)
    uf = UnionFind(n)
    for i in range(n):
        for j in range(i + 1, n):
            if is_connected[i][j] == 1:
                uf.union(i, j)
    return uf.count
    # Time: O(n² · α(n))  Space: O(n)
```

### Redundant Connection (Find the Cycle-Causing Edge)

```python
def find_redundant_connection(edges: list[list[int]]) -> list[int]:
    """First edge whose union() fails (already connected) is the one creating the cycle."""
    n = len(edges)
    uf = UnionFind(n + 1)  # nodes are 1-indexed
    for u, v in edges:
        if not uf.union(u, v):
            return [u, v]
    return []
    # Time: O(E · α(n))
```

### Accounts Merge

```python
from collections import defaultdict

def accounts_merge(accounts: list[list[str]]) -> list[list[str]]:
    """Union accounts that share any email; group emails by root account index."""
    uf = UnionFind(len(accounts))
    email_to_acc: dict[str, int] = {}

    for i, account in enumerate(accounts):
        for email in account[1:]:
            if email in email_to_acc:
                uf.union(i, email_to_acc[email])
            else:
                email_to_acc[email] = i

    grouped: dict[int, set[str]] = defaultdict(set)
    for email, acc_idx in email_to_acc.items():
        grouped[uf.find(acc_idx)].add(email)

    return [[accounts[root][0]] + sorted(emails) for root, emails in grouped.items()]
    # Time: O(n · α(n)) plus O(n log n) for sorting emails within each group
```

---

## Complexity Summary

| Operation | Time (amortized) | Notes |
|-----------|------|-------|
| `find` | O(α(n)) | With path compression |
| `union` | O(α(n)) | With union by rank/size + path compression |
| `find`/`union` with only path compression | O(log n) amortized | Still good, rank adds the last mile |
| `find`/`union` with neither optimization | O(n) worst case | Degenerates to a linked list |
| Space | O(n) | Two arrays: `parent`, `rank` |

α(n), the inverse Ackermann function, is ≤ 4 for any n up to roughly 2^65536 — for interview and real-world purposes, treat it as O(1).

---

## Interview Follow-ups

1. **"Why do you need both optimizations, not just one?"** — Either alone gives O(log n) amortized; together they give O(α(n)), which matters at scale but isn't strictly required to pass most interview correctness checks — mention both anyway, it signals depth.
2. **"Can Union-Find tell you the size of each set?"** — Yes, track `size[]` alongside (or instead of) `rank[]`, updating it on every successful union.
3. **"How would you support 'disconnect' operations?"** — You generally can't efficiently; Union-Find is a one-way merge structure. If disconnection is required, consider an offline approach: process queries in reverse, turning deletions into unions.
4. **"Union-Find vs BFS for cycle detection — when does it matter?"** — For a static graph checked once, BFS/DFS is equally fine. Union-Find wins when edges arrive as a stream and you need the answer after each one, without rebuilding from scratch.

---

## Key Takeaways

!!! success "Remember"
    1. Union-Find answers **"same group?"** and **"merge groups"** in near-O(1) amortized time — the algorithm of choice for dynamic connectivity.
    2. **Path compression** flattens the tree on every `find`; **union by rank** keeps trees shallow by attaching the smaller under the larger.
    3. Together they give **O(α(n))** amortized — practically constant.
    4. `union(a, b)` returning **False** means `a` and `b` were already connected — that's exactly how you detect a cycle in an undirected graph.
    5. Union-Find powers **Kruskal's MST**: sort edges, add each unless `union()` says it would cycle.
    6. It only merges — there's no efficient way to split a set back apart.
