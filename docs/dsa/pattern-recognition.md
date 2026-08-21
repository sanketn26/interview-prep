---
title: DSA Pattern Recognition Guide
description: A synthesis page mapping problem clues, keywords, and constraints to the right DSA pattern across sliding window, two pointers, binary search, BFS/DFS, and DP.
---

# DSA Pattern Recognition Guide

**Difficulty:** All levels | **Pattern Type:** Meta / Synthesis

[← Dynamic Programming](dynamic-programming.md) | [DSA Overview](index.md)

---

## Why This Page Exists

**Problem:** You're 90 seconds into reading an unfamiliar interview problem. It doesn't scream "this is a sliding window problem" the way a textbook chapter title would.

**Brute force approach:** Try coding *something*, usually nested loops, and hope a pattern emerges as you go.
- Unpredictable time to a working solution
- Often locks you into the wrong data structure before you've thought it through

**Insight:** Every pattern on this site answers a *specific shape* of question, and that shape is visible in the problem's **keywords, input shape, and constraints** before you write any code. "Pattern recognition" isn't memorizing 200 problems — it's memorizing the ~15 signals below and practicing spotting them fast.

**Result:** A 30-60 second triage step that gets you to the right family of technique before you commit to code, which is exactly what staff-level interviewers are evaluating when they watch your first few minutes.

---

## Mental Model

Think of pattern recognition as narrowing a funnel: constraints eliminate whole complexity classes, then keywords select the specific technique within what's left.

```
                     Read the problem statement
                              |
              +---------------+----------------+
              |                                 |
      constraints (n, bounds)          input shape (array/string/
              |                         tree/graph/matrix/stream)
              v                                 v
       eliminates complexity           eliminates technique FAMILIES
       classes (see foundations.md)    (tree traversal vs array scan
              |                         vs graph search, etc.)
              +---------------+----------------+
                              |
                        keyword match
                     (see table below)
                              |
                              v
                     candidate pattern(s)
                              |
                    confirm: does the problem have the
                    STRUCTURAL property the pattern needs?
                    (sorted? monotonic? overlapping subproblems?)
                              |
                              v
                         commit + code
```

The "confirm" step matters — matching a keyword isn't enough. "Longest" appears in both sliding window problems (longest substring) and DP problems (longest increasing subsequence) — the difference is whether the answer region must be *contiguous* (sliding window) or can *skip elements* (DP).

---

## Master Clue Table

| Clue phrase / signal | Likely pattern | Page |
|---|---|---|
| "contiguous subarray/substring", "longest/shortest window satisfying X" | Sliding Window | [sliding-window.md](sliding-window.md) |
| "sorted array" + "pair/triplet sums to target" | Two Pointers (opposite direction) | [two-pointers.md](two-pointers.md) |
| "remove duplicates in place", "partition array" | Two Pointers (same direction) | [two-pointers.md](two-pointers.md) |
| "cycle in linked list", "find middle of list" | Two Pointers (fast/slow) | [two-pointers.md](two-pointers.md) |
| "sorted array" + "find target/index/boundary" | Binary Search (classic) | [binary-search.md](binary-search.md) |
| "minimize the maximum" / "maximize the minimum" + easy feasibility check | Binary Search on the Answer | [binary-search.md](binary-search.md) |
| "shortest path", "unweighted graph/grid" | BFS | [bfs-dfs.md](bfs-dfs.md) |
| "all paths", "explore all combinations", "connected components" | DFS | [bfs-dfs.md](bfs-dfs.md) |
| "level order", "minimum transformations/steps" | BFS | [bfs-dfs.md](bfs-dfs.md) |
| "count the number of ways", "can we reach a total", "min/max cost to reach" | Dynamic Programming | [dynamic-programming.md](dynamic-programming.md) |
| "overlapping subproblems", "optimal substructure", "longest increasing subsequence" (non-contiguous) | Dynamic Programming | [dynamic-programming.md](dynamic-programming.md) |
| "n ≤ 20" | Backtracking / bitmask DP (exponential is acceptable) | [foundations.md](foundations.md) |
| "n ≤ 10^5" and answer needs O(n log n) | Sorting, heaps, binary search, divide & conquer | [foundations.md](foundations.md) |
| "n ≤ 10^7-10^8" and answer needs O(n) | Sliding window, two pointers, hashing, single pass | [sliding-window.md](sliding-window.md) |
| "top K", "Kth largest/smallest" | Heap (priority queue) | [heaps.md](heaps.md) |
| "topological order", "course prerequisites", "build order" | Topological Sort (DFS or Kahn's BFS) | [bfs-dfs.md](bfs-dfs.md) |
| "group/merge connected items", "detect cycle in undirected graph" | Union-Find | [union-find.md](union-find.md) |
| "weighted shortest path" | Dijkstra (best-first with a min-heap) | [graph-algorithms.md](graph-algorithms.md) |
| "generate all subsets/permutations", "explore then undo a choice" | Backtracking | [backtracking.md](backtracking.md) |
| "matrix/grid", "flood fill", "islands" | BFS or DFS on grid | [bfs-dfs.md](bfs-dfs.md) |
| Stream of data, can't look back | Sliding window or running aggregate (O(1) space per step) | [sliding-window.md](sliding-window.md) |
| "might this key exist" before an expensive lookup | Bloom filter | [hashing-techniques.md](hashing-techniques.md) |
| "how many times did this key appear" in a huge stream | Count-Min Sketch | [probabilistic-sketches.md](probabilistic-sketches.md) |
| p99 / percentile of a live stream | t-digest or HDRHistogram | [probabilistic-sketches.md](probabilistic-sketches.md) |
| Jaccard / near-duplicate sets | MinHash | [probabilistic-sketches.md](probabilistic-sketches.md) |
| compact membership **with delete** | Cuckoo filter (not cuckoo hashing) | [probabilistic-sketches.md](probabilistic-sketches.md) |
| "range sum after point updates", n ≈ 10^5 | Fenwick tree | [skip-lists-fenwick-segment-trees.md](skip-lists-fenwick-segment-trees.md) |
| "range min/max" or "range add then query" | Segment tree (lazy if range add) | [skip-lists-fenwick-segment-trees.md](skip-lists-fenwick-segment-trees.md) |
| ordered map, no rotations, Redis ZSET-shaped | Skip list | [skip-lists-fenwick-segment-trees.md](skip-lists-fenwick-segment-trees.md) |

---

## Constraint-Driven Decision Table

Use `n` (or the relevant size bound) as a fast filter before keyword-matching:

| Constraint signal | What it rules in | What it rules out |
|---|---|---|
| n ≤ 20 | Bitmask DP, full backtracking, brute-force subsets/permutations | Anything assuming polynomial-only is required — exponential is fine and often expected |
| n ≤ 500 | O(n^3) DP (e.g. interval DP, matrix chain) | O(2^n) unless n is at the very low end of this range |
| n ≤ 5,000 | O(n^2) — nested loops, brute-force pair comparison, simple DP | O(n^3) is risky; aim for O(n^2) |
| n ≤ 10^5 – 10^6, need O(n log n) | Sorting, heaps/priority queue, binary search, divide & conquer, balanced BST-backed structures | O(n^2) brute force |
| n ≤ 10^7 – 10^8, need O(n) | Sliding window, two pointers, hashing, single-pass DP, BFS/DFS (O(V+E)) | Anything with an extra log factor if it's tight |
| n very large / streaming, need O(log n) or O(1) | Binary search on the answer, math/closed-form formula, online/streaming algorithms | Anything requiring full materialization of the input |
| "shortest path" + unweighted | BFS | DFS-based shortest path (doesn't guarantee shortest) |
| "shortest path" + weighted, non-negative | Dijkstra | Plain BFS (ignores weights) |
| "count ways" / "number of distinct ways" | DP (often with modulo arithmetic) | Greedy (rarely counts correctly) |
| Feasibility of an answer is monotonic (yes/no flips once) | Binary search on the answer | Direct computation, if it's harder than the feasibility check |

Cross-reference with [foundations.md](foundations.md) for the full Big-O-to-pattern mapping and the general 6-step problem-solving process.

---

## Worked Example: End-to-End Reasoning

**Problem:** "You are given an array of integers `weights` representing package weights, and an integer `days`. Packages must be shipped in order (you cannot reorder them), and each day's shipment cannot exceed the ship's capacity. Find the minimum capacity needed to ship all packages within `days` days."

**Step 1 — clarify constraints:** Say `weights.length` up to 5×10^4, weights up to 500 each. That's large enough to rule out anything above roughly O(n log(range)).

**Step 2 — input shape:** A 1D array, values must stay in original order (no sorting/reordering allowed) — this immediately rules out sorting-based array techniques and two pointers (which typically need reordering flexibility or a sorted precondition).

**Step 3 — keyword scan:** "minimum capacity... such that all ship within `days` days." That's the **"minimize X such that a feasibility condition holds"** phrasing — a strong signal for *binary search on the answer*, not a direct DP or greedy formula.

**Step 4 — confirm the structural property:** Is `feasible(capacity)` monotonic? If capacity `C` works (all packages fit within `days` days), does any capacity `> C` also work? Yes — more capacity can only reduce or maintain the number of days needed. Monotonic confirmed.

**Step 5 — define search space:** Minimum possible capacity = `max(weights)` (must fit the heaviest single package). Maximum possible capacity = `sum(weights)` (ship everything in one day). This is our `[lo, hi]` range.

**Step 6 — define the feasibility check:** `days_needed(capacity)` — greedily pack each day until adding the next package would exceed capacity, then start a new day. This is O(n) per check.

**Step 7 — combine:** Binary search over `[lo, hi]`, calling the O(n) `days_needed` check at each step → O(n log(sum(weights))) total. This satisfies the constraint bound from Step 1.

**Step 8 — code, test, restate complexity:** (full solution in [binary-search.md](binary-search.md#4-capacity-to-ship-packages-within-d-days-binary-search-on-the-answer)) — "This runs in O(n log(sum(weights))) time because we binary search over a bounded capacity range, and each feasibility check is a single O(n) linear scan. Space is O(1) beyond the input."

This is the reasoning chain interviewers want to see *out loud*, not just the final code.

---

## Multi-Pattern Problems

Some problems combine two patterns — recognizing the combination is itself a signal of seniority:

| Combination | Example |
|---|---|
| Sliding window + hash map | Minimum window substring (window + frequency counting) |
| Two pointers + sorting | 3Sum (sort, then two-pointer per anchor) |
| Binary search + greedy feasibility check | Koko Eating Bananas, Ship Within Days |
| BFS + state tracking | Word Ladder (BFS where "neighbors" are computed, not given) |
| DFS + memoization | Any DP problem expressed as recursion first, then memoized (top-down DP) |
| Binary search + BFS/DFS | "Minimize the largest edge weight to keep the graph connected" — binary search on edge weight, DFS/union-find to check connectivity |

---

## Interview Follow-ups

1. **"How do you handle a problem that doesn't match any pattern you know?"** — Fall back to the [foundations.md](foundations.md) process: state brute force + complexity, then look for *any* structural property (sorted? monotonic? small state space?) you can exploit, even partially.
2. **"What if two patterns both seem to fit?"** — Pick whichever has the tighter proven complexity for the given constraints, and mention the alternative to show you considered tradeoffs.
3. **"How do you avoid pattern-matching on a coincidental keyword?"** — Always confirm the *structural precondition* (e.g., sortedness for two pointers, monotonicity for binary search on the answer) — don't commit on keyword alone.
4. **"Staff-level follow-up: how would you generalize this pattern to a related problem?"** — Practice articulating the *invariant* your technique relies on (e.g., "the window sum only needs O(1) updates because add/remove are both O(1)") — that's what transfers to novel problems.

---

## Key Takeaways

!!! success "Remember"
    1. Pattern recognition = constraints (narrow complexity class) + input shape (narrow technique family) + keywords (pick specific pattern) + structural confirmation (verify the precondition actually holds).
    2. Keywords alone are insufficient — "longest" means sliding window only if the answer must be *contiguous*; otherwise it's likely DP.
    3. Use `n` as your fastest filter: it tells you the target Big-O before you've even parsed the problem's story (see [foundations.md](foundations.md)).
    4. Many real interview problems combine two patterns (e.g., binary search + greedy feasibility, sort + two pointers) — naming both, and why, signals seniority.
    5. When nothing matches, fall back to the general process, not memorized templates — the process is what generalizes to novel problems.
