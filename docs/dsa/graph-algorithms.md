---
title: Graph Algorithms
description: Dijkstra's shortest path, minimum spanning tree (Prim/Kruskal), and topological sort with an interactive Dijkstra visualizer.
---

# Graph Algorithms — Shortest Path, MST, Topological Sort

**Difficulty:** Hard | **Pattern Type:** Weighted graph traversal / ordering

[← DSA Overview](index.md) | [← Heaps](heaps.md) | [Next: Union-Find →](union-find.md)

!!! note "Not covered here"
    Unweighted traversal (BFS/DFS, connected components, cycle detection with plain graphs) already has its own page: [BFS & DFS](bfs-dfs.md). This page starts where that one stops — **weighted** edges and **ordering** constraints.

---

## Why These Algorithms Exist

BFS finds shortest paths — but only when every edge costs the same. The moment edges have different weights (latency, distance, cost), "first arrival" no longer means "cheapest arrival," and you need an algorithm that accounts for weight: **Dijkstra**.

A related but different question: given a weighted graph, what's the cheapest way to connect *every* node — a network with no cycles and minimum total edge cost? That's a **Minimum Spanning Tree (MST)**, solved by **Prim's** or **Kruskal's** algorithm.

A third question is about *ordering*, not distance: if some tasks must happen before others (build systems, course prerequisites, package installs), what's a valid execution order? That's **topological sort**.

All three show up constantly in system design (routing, network cost minimization, dependency resolution) and are classic interview staples.

---

## Mental Model

**Dijkstra:** Greedy BFS with a priority queue instead of a plain queue. Always expand the *closest unvisited* node next, and **relax** (try to improve) the distance to its neighbors. Once a node is popped as the minimum, its distance is final — it can never be improved later, because all other paths to it would have to go through a farther node first.

```
   4        Relax: dist[B] = min(dist[B], dist[A] + w(A,B))
A ---- B
 \    /
2 \  / 1
   C

dist[A]=0 → visit A → relax B(4), C(2)
visit C(2) → relax B via C: 2+1=3 < 4, update B(3)
visit B(3) → done. Shortest A→B = 3, not the direct edge's 4.
```

**Prim's MST:** Grow one tree from an arbitrary start node, always adding the cheapest edge that connects the tree to a new node. Nearly identical code shape to Dijkstra — the difference is what you minimize (edge weight vs. cumulative distance).

**Kruskal's MST:** Sort all edges by weight; greedily add each edge unless it would create a cycle (checked via [Union-Find](union-find.md)). Global greedy on edges, not tree growth from a node.

**Topological sort:** Only valid on a **DAG** (directed, acyclic). Kahn's algorithm (BFS): repeatedly remove nodes with in-degree 0. DFS-based: post-order traversal, then reverse.

---

## Interactive Dijkstra Visualizer

!!! note "Scope of this visualizer"
    This interactive simulation demonstrates **Dijkstra's algorithm only**. MST (Prim's/Kruskal's) and Topological Sort are covered in full in the code walkthroughs below, but don't yet have a dedicated visualization.

<div class="sim-container">
  <div class="sim-title">🛰️ Dijkstra's Shortest Path</div>

  <div class="sim-controls">
    <button class="sim-btn success" onclick="window._dijkstra && window._dijkstra.run(0)">▶ Run from A</button>
    <button class="sim-btn danger" onclick="window._dijkstra && window._dijkstra.reset()">Reset</button>
  </div>

  <canvas id="dijkstra-canvas" style="width:100%;height:300px;"></canvas>

  <div style="margin:0.5rem 0;font-size:0.8rem">
    <span style="background:#37474f;padding:2px 8px;border-radius:4px;color:#fff">Unvisited</span>
    <span style="background:#f57f17;padding:2px 8px;border-radius:4px;color:#fff;margin-left:8px">Frontier (relaxed)</span>
    <span style="background:#b71c1c;padding:2px 8px;border-radius:4px;color:#fff;margin-left:8px">Current (being settled)</span>
    <span style="background:#1565c0;padding:2px 8px;border-radius:4px;color:#fff;margin-left:8px">Settled (final)</span>
    <span style="background:#66bb6a;padding:2px 8px;border-radius:4px;color:#000;margin-left:8px">Shortest-path tree edge</span>
  </div>

  <div class="sim-log" id="dijkstra-log"></div>
</div>

---

## Dijkstra's Algorithm

```python
import heapq

def dijkstra(graph: dict[int, list[tuple[int, int]]], start: int) -> dict[int, int]:
    """
    graph: adjacency list {node: [(neighbor, weight), ...]}
    Returns: shortest distance from start to every reachable node.
    Requires non-negative weights — a negative edge can invalidate the
    greedy "once popped, final" guarantee.
    """
    dist = {start: 0}
    heap = [(0, start)]  # (distance, node)
    visited = set()

    while heap:
        d, node = heapq.heappop(heap)
        if node in visited:
            continue  # stale entry (we don't support decrease-key, so skip)
        visited.add(node)

        for neighbor, weight in graph.get(node, []):
            nd = d + weight
            if nd < dist.get(neighbor, float("inf")):
                dist[neighbor] = nd
                heapq.heappush(heap, (nd, neighbor))

    return dist
    # Time: O((V + E) log V) — each edge may push once, heap ops are O(log V)
    # Space: O(V)
```

!!! warning "Negative weights break Dijkstra"
    The greedy guarantee relies on "closest unvisited is final." A negative edge discovered later could still improve an already-settled node. Use **Bellman-Ford** (O(VE)) for graphs with negative weights, or **Johnson's algorithm** for all-pairs with negative edges (but no negative cycles).

---

## Minimum Spanning Tree

=== "Prim's (grow a tree)"
    ```python
    import heapq

    def prim_mst(graph: dict[int, list[tuple[int, int]]], start: int) -> int:
        """Returns total weight of the MST. Structurally = Dijkstra with a
        different relaxation rule: minimize edge weight, not cumulative distance."""
        visited = {start}
        heap = graph.get(start, [])[:]  # (neighbor, weight) — heapify by weight
        heap = [(w, n) for n, w in heap]
        heapq.heapify(heap)
        total = 0

        while heap and len(visited) < len(graph):
            w, node = heapq.heappop(heap)
            if node in visited:
                continue
            visited.add(node)
            total += w
            for neighbor, weight in graph.get(node, []):
                if neighbor not in visited:
                    heapq.heappush(heap, (weight, neighbor))

        return total
        # Time: O(E log V)  Space: O(V + E)
    ```

=== "Kruskal's (sort edges, union-find)"
    ```python
    class DSU:
        def __init__(self, n: int) -> None:
            self.parent = list(range(n))
            self.rank = [0] * n

        def find(self, x: int) -> int:
            if self.parent[x] != x:
                self.parent[x] = self.find(self.parent[x])  # path compression
            return self.parent[x]

        def union(self, a: int, b: int) -> bool:
            ra, rb = self.find(a), self.find(b)
            if ra == rb:
                return False  # already connected — adding this edge would cycle
            if self.rank[ra] < self.rank[rb]:
                ra, rb = rb, ra
            self.parent[rb] = ra
            if self.rank[ra] == self.rank[rb]:
                self.rank[ra] += 1
            return True

    def kruskal_mst(n: int, edges: list[tuple[int, int, int]]) -> int:
        """edges: (weight, u, v). Sort globally, add unless it creates a cycle."""
        edges = sorted(edges)
        dsu = DSU(n)
        total = 0
        for weight, u, v in edges:
            if dsu.union(u, v):
                total += weight
        return total
        # Time: O(E log E) for the sort, near-O(E) for union-find with compression
        # Space: O(V)
    ```

**Prim vs Kruskal:** Prim grows one connected tree — better for **dense** graphs (adjacency matrix, O(V²) variant). Kruskal processes edges globally — better for **sparse** graphs, and it's the natural choice when edges already come sorted or as a flat list.

---

## Topological Sort

=== "Kahn's algorithm (BFS, in-degree)"
    ```python
    from collections import deque

    def topo_sort_kahn(num_nodes: int, edges: list[tuple[int, int]]) -> list[int]:
        """edges: (u, v) meaning u must come before v."""
        graph = [[] for _ in range(num_nodes)]
        in_degree = [0] * num_nodes
        for u, v in edges:
            graph[u].append(v)
            in_degree[v] += 1

        queue = deque(i for i in range(num_nodes) if in_degree[i] == 0)
        order = []

        while queue:
            node = queue.popleft()
            order.append(node)
            for neighbor in graph[node]:
                in_degree[neighbor] -= 1
                if in_degree[neighbor] == 0:
                    queue.append(neighbor)

        if len(order) != num_nodes:
            raise ValueError("Cycle detected — no valid topological order")
        return order
        # Time: O(V + E)  Space: O(V)
    ```

=== "DFS post-order + reverse"
    ```python
    def topo_sort_dfs(num_nodes: int, edges: list[tuple[int, int]]) -> list[int]:
        graph = [[] for _ in range(num_nodes)]
        for u, v in edges:
            graph[u].append(v)

        state = [0] * num_nodes  # 0=unvisited, 1=in-progress, 2=done
        order = []

        def visit(node: int) -> None:
            if state[node] == 2:
                return
            if state[node] == 1:
                raise ValueError("Cycle detected")
            state[node] = 1
            for neighbor in graph[node]:
                visit(neighbor)
            state[node] = 2
            order.append(node)  # post-order: node appended after all its dependents

        for i in range(num_nodes):
            if state[i] == 0:
                visit(i)

        return order[::-1]  # reverse post-order = valid topo order
        # Time: O(V + E)  Space: O(V) recursion stack
    ```

---

## When to Use Which

| Scenario | Algorithm | Why |
|----------|-----------|-----|
| Shortest path, weighted, non-negative edges | **Dijkstra** | O((V+E) log V), greedy correctness holds |
| Shortest path, negative edges allowed | **Bellman-Ford** | Relaxes all edges V-1 times; also detects negative cycles |
| Shortest path, unweighted | **BFS** | Simpler and faster — see [BFS & DFS](bfs-dfs.md) |
| Cheapest way to connect all nodes | **Prim or Kruskal (MST)** | Minimizes total edge weight with no cycles |
| Dense graph MST | **Prim** (matrix form) | O(V²) without a heap, competitive when E ≈ V² |
| Sparse graph MST, or edges already listed | **Kruskal** | O(E log E), union-find keeps cycle checks near O(1) |
| Valid execution order under dependencies | **Topological sort** | Only defined on a DAG; a cycle means no valid order exists |
| Detect a cycle in a directed graph | **DFS with 3-color state**, or topo sort that leaves nodes unprocessed | Both are O(V+E) |

---

## Common Problems and Patterns

### Network Delay Time (Dijkstra)

```python
import heapq

def network_delay_time(times: list[list[int]], n: int, k: int) -> int:
    """Signal sent from node k — time for it to reach all n nodes, or -1."""
    graph: dict[int, list[tuple[int, int]]] = {}
    for u, v, w in times:
        graph.setdefault(u, []).append((v, w))

    dist = {k: 0}
    heap = [(0, k)]
    while heap:
        d, node = heapq.heappop(heap)
        if d > dist.get(node, float("inf")):
            continue
        for neighbor, weight in graph.get(node, []):
            nd = d + weight
            if nd < dist.get(neighbor, float("inf")):
                dist[neighbor] = nd
                heapq.heappush(heap, (nd, neighbor))

    return max(dist.values()) if len(dist) == n else -1
    # Time: O((V+E) log V)
```

### Course Schedule II (Topological Sort)

```python
from collections import deque

def find_order(num_courses: int, prerequisites: list[list[int]]) -> list[int]:
    """Return a valid course order, or [] if impossible (cycle)."""
    graph = [[] for _ in range(num_courses)]
    in_degree = [0] * num_courses
    for course, prereq in prerequisites:
        graph[prereq].append(course)
        in_degree[course] += 1

    queue = deque(i for i in range(num_courses) if in_degree[i] == 0)
    order = []
    while queue:
        node = queue.popleft()
        order.append(node)
        for nxt in graph[node]:
            in_degree[nxt] -= 1
            if in_degree[nxt] == 0:
                queue.append(nxt)

    return order if len(order) == num_courses else []
    # Time: O(V + E)
```

### Min Cost to Connect All Points (MST via Kruskal)

```python
def min_cost_connect_points(points: list[list[int]]) -> int:
    """Manhattan-distance MST over n points — classic Kruskal on a dense-ish graph."""
    n = len(points)
    edges = []
    for i in range(n):
        for j in range(i + 1, n):
            dist = abs(points[i][0] - points[j][0]) + abs(points[i][1] - points[j][1])
            edges.append((dist, i, j))
    edges.sort()

    parent = list(range(n))

    def find(x: int) -> int:
        while parent[x] != x:
            parent[x] = parent[parent[x]]
            x = parent[x]
        return x

    total, used = 0, 0
    for dist, i, j in edges:
        ri, rj = find(i), find(j)
        if ri != rj:
            parent[ri] = rj
            total += dist
            used += 1
            if used == n - 1:
                break

    return total
    # Time: O(V² log V) dominated by sorting O(V²) edges — fine for this problem's constraints
```

---

## Complexity Summary

| Algorithm | Time | Space | Notes |
|-----------|------|-------|-------|
| Dijkstra (heap) | O((V+E) log V) | O(V) | Non-negative weights only |
| Bellman-Ford | O(VE) | O(V) | Handles negative weights, detects negative cycles |
| Prim's MST (heap) | O(E log V) | O(V+E) | Good for dense graphs (matrix variant O(V²)) |
| Kruskal's MST | O(E log E) | O(V) | Good for sparse graphs; dominated by the sort |
| Topological sort (Kahn's / DFS) | O(V + E) | O(V) | DAG only; a cycle means no valid order |

---

## Interview Follow-ups

1. **"Why does Dijkstra fail with negative edges?"** — The proof that "popped = final" relies on all remaining paths being at least as long as the current minimum; a later negative edge can undercut that.
2. **"How do you detect a cycle during topological sort?"** — Kahn's: if the output order has fewer than V nodes, a cycle exists among the leftovers. DFS: a "gray" (in-progress) node revisited means a back edge = cycle.
3. **"A* vs Dijkstra?"** — A* is Dijkstra with a heuristic added to the priority (f = g + h); with an admissible heuristic it explores far fewer nodes toward a single target.
4. **"How would you find the actual shortest path, not just the distance?"** — Track a `prev[]` array during relaxation and walk it backward from the target once done — same idea used in the visualizer above.

---

## Key Takeaways

!!! success "Remember"
    1. **Dijkstra = greedy BFS with a min-heap.** Always settle the closest unvisited node; that distance is then final.
    2. Dijkstra requires **non-negative weights** — use Bellman-Ford otherwise.
    3. **MST** connects every node at minimum total cost with no cycles: **Prim** grows a tree (dense graphs), **Kruskal** sorts edges globally and uses union-find to reject cycles (sparse graphs).
    4. **Topological sort** only exists on a DAG — Kahn's algorithm (in-degree BFS) or DFS post-order reversed.
    5. All of these reduce to variations on "process nodes/edges in the right order and track just enough state" — the same skeleton as BFS/DFS with a smarter frontier.
