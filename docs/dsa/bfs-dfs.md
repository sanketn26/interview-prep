---
title: BFS & DFS
description: Master BFS and DFS with interactive graph visualizer, implementation patterns, and when to choose each.
---

# BFS & DFS

**Difficulty:** Medium | **Pattern Type:** Graph / Tree Traversal

[← DSA Overview](index.md) | [Next: Dynamic Programming →](dynamic-programming.md)

---

## Why These Algorithms Exist

Any time you need to **explore** a graph or tree — finding a path, checking connectivity, finding all reachable nodes — you need a systematic traversal strategy.

BFS and DFS are the two fundamental traversal strategies. Understanding *which one to choose* is more important than implementing either.

---

## Mental Model

**BFS (Breadth-First Search):** Explore layer by layer. Like ripples in a pond — all nodes at distance 1, then distance 2, then distance 3.

**DFS (Depth-First Search):** Go as deep as possible before backtracking. Like exploring a maze — follow one path until you hit a dead end, then backtrack.

```
Graph:        BFS order:           DFS order:
    A         A → B, C             A → B → D → E → C → F → G
   / \        B, C → D, E, F, G
  B   C
 / \ / \
D  E F  G
```

---

## Interactive Graph Visualizer

<div class="sim-container">
  <div class="sim-title">🔍 BFS / DFS Graph Visualizer</div>

  <div class="sim-controls">
    <button class="sim-btn success" onclick="window._gv && window._gv.bfs(0)">▶ Run BFS from A</button>
    <button class="sim-btn success" onclick="window._gv && window._gv.dfs(0)">▶ Run DFS from A</button>
    <button class="sim-btn danger" onclick="window._gv && window._gv.reset()">Reset</button>
  </div>

  <canvas id="graph-canvas" style="width:100%;height:300px;"></canvas>

  <div style="margin:0.5rem 0;font-size:0.8rem">
    <span style="background:#37474f;padding:2px 8px;border-radius:4px;color:#fff">Unvisited</span>
    <span style="background:#f57f17;padding:2px 8px;border-radius:4px;color:#fff;margin-left:8px">In Queue/Stack</span>
    <span style="background:#b71c1c;padding:2px 8px;border-radius:4px;color:#fff;margin-left:8px">Current</span>
    <span style="background:#1565c0;padding:2px 8px;border-radius:4px;color:#fff;margin-left:8px">Visited</span>
  </div>

  <div class="sim-log" id="graph-log"></div>
</div>

---

## BFS Implementation

```python
from collections import deque

def bfs(graph: dict, start: int) -> list[int]:
    """
    graph: adjacency list {node: [neighbors]}
    Returns: nodes in BFS order
    """
    visited = set([start])
    queue = deque([start])
    order = []

    while queue:
        node = queue.popleft()  # FIFO
        order.append(node)

        for neighbor in graph[node]:
            if neighbor not in visited:
                visited.add(neighbor)
                queue.append(neighbor)

    return order
    # Time: O(V + E)  Space: O(V)
```

**BFS for Shortest Path:**

```python
def bfs_shortest_path(graph: dict, start: int, end: int) -> int:
    """Returns minimum number of edges from start to end."""
    if start == end:
        return 0

    visited = set([start])
    queue = deque([(start, 0)])  # (node, distance)

    while queue:
        node, dist = queue.popleft()

        for neighbor in graph[node]:
            if neighbor == end:
                return dist + 1
            if neighbor not in visited:
                visited.add(neighbor)
                queue.append((neighbor, dist + 1))

    return -1  # unreachable
```

---

## DFS Implementation

=== "Recursive"
    ```python
    def dfs_recursive(graph: dict, start: int, visited: set = None) -> list[int]:
        if visited is None:
            visited = set()

        visited.add(start)
        order = [start]

        for neighbor in graph[start]:
            if neighbor not in visited:
                order.extend(dfs_recursive(graph, neighbor, visited))

        return order
    # Time: O(V + E)  Space: O(V) for recursion stack
    ```

=== "Iterative (Stack)"
    ```python
    def dfs_iterative(graph: dict, start: int) -> list[int]:
        visited = set()
        stack = [start]
        order = []

        while stack:
            node = stack.pop()  # LIFO
            if node in visited:
                continue
            visited.add(node)
            order.append(node)

            # Add neighbors in reverse to maintain left-to-right order
            for neighbor in reversed(graph[node]):
                if neighbor not in visited:
                    stack.append(neighbor)

        return order
    ```

!!! warning "Recursive DFS"
    Python's default recursion limit is 1,000. For deep graphs, use iterative DFS or `sys.setrecursionlimit()`.

---

## When to Use Which

| Scenario | Choose | Why |
|----------|--------|-----|
| Shortest path (unweighted) | **BFS** | BFS explores by distance layers; first time you reach the target = shortest |
| All paths / DFS-based | **DFS** | Natural fit for path exploration with backtracking |
| Level-order traversal | **BFS** | Processes all nodes at depth d before depth d+1 |
| Cycle detection | Either | DFS with recursion stack tracking is more natural |
| Topological sort | **DFS** | Post-order DFS; Kahn's algorithm uses BFS |
| Connected components | Either | Both work; DFS slightly simpler |
| Bipartite check | **BFS** | Color alternation level-by-level |
| Tree diameter | **BFS** or 2× DFS | Classic: DFS from any node → farthest node; DFS again |
| Word ladder | **BFS** | Shortest transformation sequence |

---

## Common Problems and Patterns

### Number of Islands

```python
def num_islands(grid: list[list[str]]) -> int:
    """DFS: mark visited cells to count connected components."""
    if not grid:
        return 0

    rows, cols = len(grid), len(grid[0])
    count = 0

    def dfs(r, c):
        if r < 0 or r >= rows or c < 0 or c >= cols or grid[r][c] != '1':
            return
        grid[r][c] = '0'  # mark visited
        dfs(r+1, c); dfs(r-1, c)
        dfs(r, c+1); dfs(r, c-1)

    for r in range(rows):
        for c in range(cols):
            if grid[r][c] == '1':
                dfs(r, c)
                count += 1

    return count  # O(m×n) time and space
```

### Word Ladder (BFS Shortest Path)

```python
from collections import deque

def word_ladder(begin_word: str, end_word: str, word_list: set[str]) -> int:
    """Minimum transformations from begin to end, changing one letter at a time."""
    if end_word not in word_list:
        return 0

    queue = deque([(begin_word, 1)])  # (word, steps)
    visited = {begin_word}

    while queue:
        word, steps = queue.popleft()

        for i in range(len(word)):
            for c in 'abcdefghijklmnopqrstuvwxyz':
                next_word = word[:i] + c + word[i+1:]
                if next_word == end_word:
                    return steps + 1
                if next_word in word_list and next_word not in visited:
                    visited.add(next_word)
                    queue.append((next_word, steps + 1))

    return 0  # Time closer to O(N · L² · 26): each of N words, L positions, 26 letters;
              # word[:i]+c+word[i+1:] copies O(L) characters. Space: O(N) visited.
```

### Course Schedule (Cycle Detection / Topological Sort)

```python
def can_finish(num_courses: int, prerequisites: list[list[int]]) -> bool:
    """DFS cycle detection — can we complete all courses?"""
    graph = [[] for _ in range(num_courses)]
    for course, prereq in prerequisites:
        graph[prereq].append(course)

    # State: 0=unvisited, 1=in-progress, 2=done
    state = [0] * num_courses

    def has_cycle(node: int) -> bool:
        if state[node] == 1: return True   # back edge = cycle
        if state[node] == 2: return False  # already processed

        state[node] = 1  # mark in-progress
        for neighbor in graph[node]:
            if has_cycle(neighbor):
                return True
        state[node] = 2  # mark done
        return False

    return not any(has_cycle(i) for i in range(num_courses) if state[i] == 0)
```

---

## Tree-Specific Traversals

```
Tree:
        1
       / \
      2   3
     / \
    4   5

pre-order   (Root → L → R):  1 2 4 5 3    — visit before descending (serialization)
in-order    (L → Root → R):  4 2 5 1 3    — sorted order on a BST
post-order  (L → R → Root):  4 5 2 3 1    — visit after both subtrees (safe deletion)
level-order (BFS, layer by layer): 1 2 3 4 5
```

```python
class TreeNode:
    def __init__(self, val, left=None, right=None):
        self.val = val; self.left = left; self.right = right

# DFS variants:
def inorder(root):   # Left → Root → Right (BST sorted order)
    if root:
        yield from inorder(root.left)
        yield root.val
        yield from inorder(root.right)

def preorder(root):  # Root → Left → Right (tree serialization)
    if root:
        yield root.val
        yield from preorder(root.left)
        yield from preorder(root.right)

def postorder(root): # Left → Right → Root (delete tree)
    if root:
        yield from postorder(root.left)
        yield from postorder(root.right)
        yield root.val

# BFS: Level-order
def level_order(root) -> list[list[int]]:
    if not root: return []
    result, queue = [], deque([root])
    while queue:
        level = []
        for _ in range(len(queue)):
            node = queue.popleft()
            level.append(node.val)
            if node.left: queue.append(node.left)
            if node.right: queue.append(node.right)
        result.append(level)
    return result
```

---

## Complexity Summary

| Algorithm | Time | Space (graph) | Space (tree) |
|-----------|------|--------------|--------------|
| BFS | O(V + E) | O(V) — queue | O(width) |
| DFS recursive | O(V + E) | O(V) — call stack | O(height) |
| DFS iterative | O(V + E) | O(V) — stack | O(height) |

For a balanced binary tree: height = O(log N), width = O(N).
For a skewed tree: height = O(N), width = O(1).

**BFS space = O(max width)** — can be O(N) for wide graphs.
**DFS space = O(max depth)** — can be O(N) for deep graphs.

---

## Interview Follow-ups

1. **"BFS vs DFS for very deep graphs?"** — DFS may stack overflow; use BFS or iterative DFS
2. **"How do you handle disconnected graphs?"** — Loop over all unvisited nodes, call BFS/DFS from each
3. **"Bidirectional BFS?"** — BFS from both ends simultaneously; meets in the middle; reduces time from O(b^d) to O(b^(d/2)) where b=branching factor, d=depth

---

## Key Takeaways

!!! success "Remember"
    1. BFS uses a **queue** (FIFO) → processes level by level → guarantees shortest path in unweighted graphs
    2. DFS uses a **stack** (LIFO, or recursion) → goes deep before backtracking
    3. Both are O(V + E) time and O(V) space
    4. **Shortest path** → BFS. **All paths/combinations** → DFS.
    5. Mark nodes as visited **before enqueuing** (BFS) or at start of visit (DFS) to prevent cycles
    6. DFS on trees: in/pre/post-order are just DFS traversal orders with different yield positions

