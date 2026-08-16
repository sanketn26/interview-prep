---
title: Backtracking
description: Backtracking and constraint satisfaction — N-Queens, Sudoku, subsets, and permutations — with an interactive N-Queens visualizer.
---

# Backtracking & Constraint Satisfaction

**Difficulty:** Hard | **Pattern Type:** Exhaustive search with pruning

[← DSA Overview](index.md) | [← Union-Find](union-find.md) | [Next: Sorting →](sorting.md)

---

## Why This Technique Exists

Some problems have no shortcut — you genuinely must try combinations to find one (or all) that satisfy the constraints: place queens so none attack each other, fill a Sudoku grid, find every subset or permutation. Brute-force enumeration of every possibility is correct but often wasteful, because most partial attempts are doomed early.

**Backtracking** is brute force with an escape hatch: build a solution incrementally, and the moment a partial choice violates a constraint, abandon it immediately instead of completing it. That pruning is the entire value proposition — the search tree explored can be exponentially smaller than the full space.

---

## Mental Model

Think of it as **DFS over a decision tree**, where each node is a partial solution and each edge is one choice. At every node:

1. **Choose** — make a candidate choice.
2. **Explore** — recurse on the resulting partial solution.
3. **Un-choose (backtrack)** — undo the choice before trying the next one, restoring state for the sibling branch.

```
place_queen(row=0):
  try col=0 → valid → place_queen(row=1)
                         try col=0 → conflict (same column) → skip
                         try col=1 → conflict (diagonal) → skip
                         try col=2 → valid → place_queen(row=2)...
                                               all cols conflict → BACKTRACK to row=1
                         try col=3 → valid → ...
  try col=1 → valid → place_queen(row=1) → ...
```

The "un-choose" step is what separates backtracking from plain recursive brute force with no undo — it's what makes state reusable across branches instead of copying it every time.

---

## Interactive N-Queens Visualizer

<div class="sim-container">
  <div class="sim-title">👑 N-Queens Backtracking (8×8)</div>

  <div class="sim-stats">
    <div class="sim-stat"><div class="sim-stat-label">Attempts</div><div class="sim-stat-value" id="nq-steps">0</div></div>
    <div class="sim-stat"><div class="sim-stat-label">Solutions</div><div class="sim-stat-value" id="nq-solutions">0</div></div>
  </div>

  <div class="sim-controls">
    <button class="sim-btn success" onclick="window._nq && window._nq.solve()">▶ Solve (stop at first solution)</button>
    <button class="sim-btn" onclick="window._nq && window._nq.stop()">Stop</button>
    <button class="sim-btn danger" onclick="window._nq && window._nq.reset()">Reset</button>
  </div>

  <div id="nqueens-board"></div>

  <div style="margin:0.5rem 0;font-size:0.8rem">
    <span style="background:#e65100;padding:2px 8px;border-radius:4px;color:#fff">Trying (conflict)</span>
    <span style="background:#1565c0;padding:2px 8px;border-radius:4px;color:#fff;margin-left:8px">Trying (valid, placing)</span>
    <span style="background:#1a237e;padding:2px 8px;border-radius:4px;color:#fff;margin-left:8px">♛ Placed queen</span>
  </div>

  <div class="sim-log" id="nqueens-log"></div>
</div>

---

## Implementation

### N-Queens

```python
def solve_n_queens(n: int) -> list[list[int]]:
    """Returns all solutions as board[row] = col. O(1) conflict checks via sets."""
    solutions: list[list[int]] = []
    cols: set[int] = set()
    diag1: set[int] = set()  # row - col is constant along a "\" diagonal
    diag2: set[int] = set()  # row + col is constant along a "/" diagonal
    board = [-1] * n

    def backtrack(row: int) -> None:
        if row == n:
            solutions.append(board[:])  # copy — board is mutated after this
            return

        for col in range(n):
            if col in cols or (row - col) in diag1 or (row + col) in diag2:
                continue  # prune: this branch can never succeed

            board[row] = col
            cols.add(col); diag1.add(row - col); diag2.add(row + col)

            backtrack(row + 1)

            cols.discard(col); diag1.discard(row - col); diag2.discard(row + col)  # undo

        board[row] = -1

    backtrack(0)
    return solutions
    # Time: O(n!) worst case, pruned heavily in practice by the O(1) conflict sets
    # Space: O(n) for recursion depth + constraint sets
```

### Sudoku Solver

```python
def solve_sudoku(board: list[list[str]]) -> bool:
    """In-place solve. board[r][c] is '1'-'9' or '.'. Mutates board to the solution."""
    def valid(r: int, c: int, val: str) -> bool:
        for i in range(9):
            if board[r][i] == val or board[i][c] == val:
                return False
        br, bc = (r // 3) * 3, (c // 3) * 3
        for i in range(br, br + 3):
            for j in range(bc, bc + 3):
                if board[i][j] == val:
                    return False
        return True

    def backtrack() -> bool:
        for r in range(9):
            for c in range(9):
                if board[r][c] != ".":
                    continue
                for val in "123456789":
                    if valid(r, c, val):
                        board[r][c] = val
                        if backtrack():
                            return True
                        board[r][c] = "."  # undo
                return False  # no valid digit here — this whole branch fails
        return True  # no empty cells left — solved

    return backtrack()
    # Time: O(9^m) where m = number of empty cells, worst case — pruned heavily by valid()
    # Space: O(1) extra beyond recursion stack (board mutated in place)
```

### Subsets and Permutations (the "shape" every backtracking problem shares)

```python
def subsets(nums: list[int]) -> list[list[int]]:
    """Every subset — the decision at each index is include / exclude."""
    result: list[list[int]] = []
    path: list[int] = []

    def backtrack(start: int) -> None:
        result.append(path[:])  # every partial path IS a valid subset
        for i in range(start, len(nums)):
            path.append(nums[i])
            backtrack(i + 1)     # move forward only — avoids duplicate subsets
            path.pop()           # undo

    backtrack(0)
    return result
    # Time: O(2^n) subsets, O(n) to copy each  Space: O(n) recursion depth


def permutations(nums: list[int]) -> list[list[int]]:
    """Every ordering — the decision at each step is which remaining element goes next."""
    result: list[list[int]] = []
    path: list[int] = []
    used = [False] * len(nums)

    def backtrack() -> None:
        if len(path) == len(nums):
            result.append(path[:])
            return
        for i in range(len(nums)):
            if used[i]:
                continue
            used[i] = True
            path.append(nums[i])
            backtrack()
            path.pop()            # undo
            used[i] = False       # undo
    backtrack()
    return result
    # Time: O(n! · n)  Space: O(n) recursion depth
```

---

## When to Use Which

| Scenario | Use | Why |
|----------|-----|-----|
| Need **all** valid configurations, constraints prune heavily | **Backtracking** | Exhaustive but avoids completing doomed branches |
| Need any **one** valid configuration | **Backtracking, stop at first hit** | Same tree, early-exit on the first success |
| "How many ways" / optimal count over overlapping subproblems | **Dynamic programming** | If subproblems repeat, memoize instead of re-deriving — see [Dynamic Programming](dynamic-programming.md) |
| Generate all subsets/combinations/permutations | **Backtracking** | The include/exclude or "pick next" tree is the canonical shape |
| Constraint satisfaction with a huge branching factor and no good pruning | **Backtracking is too slow** | Consider heuristics (constraint propagation, MRV ordering) or approximate/greedy methods |
| Shortest path / reachability only, no need to enumerate | **BFS/DFS or DP** | Don't backtrack if you don't need every path — see [BFS & DFS](bfs-dfs.md) |

**Backtracking vs. plain recursion:** plain recursion explores every branch to completion; backtracking actively **prunes** using constraint checks (the `if col in cols: continue` in N-Queens) so invalid branches die immediately instead of being fully built and then discarded.

---

## Common Problems and Patterns

### Combination Sum (Reuse Allowed)

```python
def combination_sum(candidates: list[int], target: int) -> list[list[int]]:
    """Each number can be reused — the recursion doesn't advance `start` on reuse."""
    result: list[list[int]] = []
    path: list[int] = []

    def backtrack(start: int, remaining: int) -> None:
        if remaining == 0:
            result.append(path[:])
            return
        if remaining < 0:
            return  # prune: overshot the target
        for i in range(start, len(candidates)):
            path.append(candidates[i])
            backtrack(i, remaining - candidates[i])  # i, not i+1: allow reuse
            path.pop()

    backtrack(0, target)
    return result
    # Time: exponential, pruned by the remaining<0 cutoff
```

### Word Search (Grid Backtracking)

```python
def exist(board: list[list[str]], word: str) -> bool:
    """Backtrack through the grid, marking visited cells and unmarking on retreat."""
    rows, cols = len(board), len(board[0])

    def backtrack(r: int, c: int, i: int) -> bool:
        if i == len(word):
            return True
        if r < 0 or r >= rows or c < 0 or c >= cols or board[r][c] != word[i]:
            return False

        temp, board[r][c] = board[r][c], "#"  # mark visited (avoid a separate visited set)
        found = (backtrack(r+1, c, i+1) or backtrack(r-1, c, i+1) or
                 backtrack(r, c+1, i+1) or backtrack(r, c-1, i+1))
        board[r][c] = temp  # undo — required even on success, to leave board unchanged

        return found

    return any(backtrack(r, c, 0) for r in range(rows) for c in range(cols))
    # Time: O(rows · cols · 4^L) where L = len(word)
```

### Palindrome Partitioning

```python
def partition(s: str) -> list[list[str]]:
    """Every way to split s such that every piece is a palindrome."""
    result: list[list[str]] = []
    path: list[str] = []

    def is_palindrome(sub: str) -> bool:
        return sub == sub[::-1]

    def backtrack(start: int) -> None:
        if start == len(s):
            result.append(path[:])
            return
        for end in range(start + 1, len(s) + 1):
            piece = s[start:end]
            if is_palindrome(piece):
                path.append(piece)
                backtrack(end)
                path.pop()  # undo

    backtrack(0)
    return result
    # Time: O(n · 2^n) worst case (every split is a palindrome, e.g. "aaaa")
```

---

## Complexity Summary

| Problem | Time (worst case) | Space |
|---------|------|-------|
| N-Queens | O(n!) | O(n) |
| Sudoku | O(9^m), m = empty cells | O(1) extra |
| Subsets | O(2^n) | O(n) recursion |
| Permutations | O(n! · n) | O(n) recursion |
| Combination sum | O(2^target) worst case | O(target) recursion |
| Word search | O(rows·cols·4^L) | O(L) recursion |

The theoretical worst case is almost always exponential or factorial — backtracking's value is entirely in how much of that space real inputs let you prune. Always state the brute-force complexity, then explain what the pruning saves.

---

## Interview Follow-ups

1. **"How is this different from plain DFS on a decision tree?"** — Same traversal shape; backtracking adds an explicit **undo** step and constraint checks that prune invalid branches before fully exploring them.
2. **"How would you speed up N-Queens further?"** — Bitmask the column/diagonal sets instead of Python `set`s for O(1) checks with lower constant factor; or order columns by "most constrained first" (a constraint-propagation heuristic).
3. **"When does backtracking become dynamic programming?"** — When subproblems repeat and you only need an optimal value/count (not every configuration), memoize instead — same recursive shape, but cache results. If you need to *enumerate* every solution, DP's memoization doesn't apply cleanly; backtracking remains the tool.
4. **"What's the risk of forgetting to undo state?"** — Silent correctness bugs — a later sibling branch inherits corrupted state from a branch that "succeeded" but never cleaned up (classic Word Search bug: forgetting to restore the grid cell).

---

## Key Takeaways

!!! success "Remember"
    1. Backtracking = **DFS + choose/explore/un-choose**, with constraint checks that prune dead branches early.
    2. The **undo step is mandatory**, even on a successful path — sibling branches depend on clean shared state.
    3. Canonical shapes: **include/exclude** (subsets), **pick next unused** (permutations), **try each option with a constraint check** (N-Queens, Sudoku).
    4. Theoretical complexity is exponential/factorial — always state the brute force, then explain what pruning buys you.
    5. If subproblems repeat and you only need an optimal count/value (not every solution), that's a DP problem instead — see [Dynamic Programming](dynamic-programming.md).
