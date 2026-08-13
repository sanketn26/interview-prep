---
title: Dynamic Programming
description: Derive DP from brute force — Fibonacci, knapsack, coin change, unique paths — with a step-through visualizer.
---

# Dynamic Programming

**Difficulty:** Medium–Hard | **Pattern Type:** Overlapping subproblems

[← BFS & DFS](bfs-dfs.md) | [DSA Overview](index.md)

---

## Why This Pattern Exists

**Problem:** A staircase has `n` steps. You can climb 1 or 2 steps at a time. How many distinct ways can you reach the top?

**Brute force:** from step `i`, try `i+1` and `i+2`. Recurse.

```
ways(5) → ways(4)+ways(3)
ways(4) → ways(3)+ways(2)     ← ways(3) computed twice
ways(3) → ways(2)+ways(1)     ← ways(2) computed many times
```

For `n=40` this is tens of millions of calls. The call tree is exponential, but there are only `n` *different* questions: `ways(k)` for `k = 0..n`.

**Clue:** the same subproblem shows up more than once (**overlapping subproblems**), and the answer to `n` is built only from answers to smaller `n` (**optimal substructure**). That pair is DP. Not “a 2D array.” The array is an implementation detail.

---

## Mental Model

You are **filling a table of answers to smaller questions**, in an order that guarantees those answers already exist.

```
Question: ways(i) = ways(i-1) + ways(i-2)
Base:     ways(0)=1, ways(1)=1

i:     0  1  2  3  4  5
ways:  1  1  2  3  5  8
              ↑
         just looked left
```

If you cannot name the *question a cell answers* in one sentence, you do not have a recurrence yet. Stop coding.

---

## From brute force to optimal — Fibonacci / climb stairs

=== "1. Recursion (TLE)"
    ```python
    def ways(n: int) -> int:
        if n < 0:
            return 0
        if n == 0:
            return 1
        return ways(n - 1) + ways(n - 2)
    # Time: ~φ^n   Space: O(n) stack
    ```

=== "2. Memoize — same tree, cached"
    ```python
    def ways(n: int, memo: dict | None = None) -> int:
        if memo is None:
            memo = {0: 1, 1: 1}
        if n < 0:
            return 0
        if n not in memo:
            memo[n] = ways(n - 1, memo) + ways(n - 2, memo)
        return memo[n]
    # Time: O(n)   Space: O(n)
    ```

=== "3. Bottom-up table"
    ```python
    def ways(n: int) -> int:
        if n <= 1:
            return 1
        dp = [0] * (n + 1)
        dp[0] = dp[1] = 1
        for i in range(2, n + 1):
            dp[i] = dp[i - 1] + dp[i - 2]
        return dp[n]
    ```

=== "4. Rolling variables"
    ```python
    def ways(n: int) -> int:
        a = b = 1  # ways(i-2), ways(i-1)
        for _ in range(n):
            a, b = b, a + b
        return a
    # Time: O(n)   Space: O(1)
    ```

=== "Go"
    ```go
    func ways(n int) int {
        a, b := 1, 1
        for i := 0; i < n; i++ {
            a, b = b, a+b
        }
        return a
    }
    ```

**Observe:** memoization and the table compute the *same* recurrence. Top-down is easier when the state space is sparse; bottom-up is easier to reason about complexity and to shrink space.

---

## Pattern recognition

| You hear… | State is probably… |
|-----------|-------------------|
| “number of ways” | `dp[i] = sum of ways to reach i` |
| “minimum / maximum cost” | `dp[i] = min/max over choices` |
| “can you reach / is it possible” | boolean DP or BFS |
| “include or skip this item” | 0/1 knapsack, `dp[i][w]` |
| “unbounded supply of coins/items” | coin change, inner loop over amounts |
| “longest increasing / common” | `dp[i]` ends at index i |
| grid, “only right/down” | `dp[r][c]` from top/left |

!!! tip "Interview Insight 🎯"
    Say the state out loud: *“`dp[i][j]` is the minimum coins to make amount `j` using the first `i` coin types.”* If the interviewer nods, write the loop. If they frown, the state is wrong — not the syntax.

---

## 0/1 Knapsack — include or skip

**Problem:** `n` items, weights `w[i]`, values `v[i]`, capacity `W`. Each item at most once. Max value.

**Brute force:** `2^n` subsets.

**Structure:** after deciding item `i`, you have a smaller prefix and remaining capacity. Overlap: many prefixes share the same remaining `W`.

```
dp[i][c] = max value using items[0..i) with capacity c

dp[i][c] = dp[i-1][c]                          # skip
         = max(that, v[i-1] + dp[i-1][c-w[i-1]])  # take, if w fits
```

```python
def knapsack(w: list[int], v: list[int], cap: int) -> int:
    n = len(w)
    dp = [[0] * (cap + 1) for _ in range(n + 1)]
    for i in range(1, n + 1):
        for c in range(cap + 1):
            dp[i][c] = dp[i - 1][c]
            if w[i - 1] <= c:
                take = v[i - 1] + dp[i - 1][c - w[i - 1]]
                if take > dp[i][c]:
                    dp[i][c] = take
    return dp[n][cap]  # O(n·cap) time and space
```

Space drop: one row of size `cap+1`, iterate `c` **downward** so `c - w` is still the previous item.

```python
def knapsack_1d(w, v, cap):
    dp = [0] * (cap + 1)
    for wi, vi in zip(w, v):
        for c in range(cap, wi - 1, -1):
            dp[c] = max(dp[c], vi + dp[c - wi])
    return dp[cap]
```

```go
func knapsack(w, v []int, cap int) int {
    dp := make([]int, cap+1)
    for i, wi := range w {
        for c := cap; c >= wi; c-- {
            if t := v[i] + dp[c-wi]; t > dp[c] {
                dp[c] = t
            }
        }
    }
    return dp[cap]
}
```

!!! warning "Production Trap ⚠️"
    `O(n·W)` is **pseudo-polynomial**. `W = 10^9` is not “a loop.” If capacity is huge and `n` is tiny, meet-in-the-middle or branch-and-bound — not a 10^9 array.

---

## Coin change — unbounded knapsack

**Problem:** coins `C`, amount `A`. Fewest coins to make `A`, unlimited of each. Impossible → `-1`.

**Brute force:** recursion on remaining amount — same remainder asked over and over.

**Recurrence:** `dp[x] = min(dp[x], dp[x - coin] + 1)` for each coin that fits.

**Order:** for unbounded, loop **coins outer, amount inner ascending** — you may reuse the same coin.

### Interactive walkthrough

Coins `[1, 3, 4]`, amount `6`. Each cell is `dp[amount]`. `∞` = not yet makeable. Step until `dp[6]`.

<div class="sim-container">
  <div class="sim-title">DP Walkthrough — Coin Change</div>
  <div class="sim-controls">
    <button class="sim-btn" onclick="window._dp && window._dp.reset()">Reset</button>
    <button class="sim-btn" onclick="window._dp && window._dp.step()">Step</button>
    <button class="sim-btn success" onclick="window._dp && window._dp.run()">Auto Play</button>
    <button class="sim-btn" onclick="window._dp && window._dp.pause()">Pause</button>
  </div>
  <div id="dp-grid" class="dsa-array"></div>
  <div id="dp-info" style="color:#90caf9;font-family:monospace;font-size:0.85rem;margin:0.5rem 0;"></div>
  <div class="sim-log" id="dp-log"></div>
</div>

**Legend:** index under cell = amount. Green = finite value. Orange = just relaxed. Blue = `dp[0]`.

```python
def coin_change(coins: list[int], amount: int) -> int:
    inf = amount + 1
    dp = [inf] * (amount + 1)
    dp[0] = 0
    for coin in coins:
        for x in range(coin, amount + 1):
            dp[x] = min(dp[x], dp[x - coin] + 1)
    return dp[amount] if dp[amount] < inf else -1
    # O(len(coins) · amount) time, O(amount) space
```

```go
func coinChange(coins []int, amount int) int {
    inf := amount + 1
    dp := make([]int, amount+1)
    for i := range dp {
        dp[i] = inf
    }
    dp[0] = 0
    for _, c := range coins {
        for x := c; x <= amount; x++ {
            if dp[x-c]+1 < dp[x] {
                dp[x] = dp[x-c] + 1
            }
        }
    }
    if dp[amount] >= inf {
        return -1
    }
    return dp[amount]
}
```

**Variant — number of combinations** (order does not matter): same loop nest, `dp[0]=1`, `dp[x] += dp[x-coin]`. Swap loops (amount outer) and you count *permutations* instead — a classic interview trap.

---

## Unique paths — grid DP

**Problem:** `m × n` grid, start top-left, finish bottom-right, only right or down. How many paths?

**Brute force:** DFS, `C(m+n-2, m-1)` leaves — but overlapping prefixes.

```
dp[r][c] = paths to (r,c) = dp[r-1][c] + dp[r][c-1]
dp[0][*] = dp[*][0] = 1
```

```python
def unique_paths(m: int, n: int) -> int:
    dp = [1] * n
    for _ in range(1, m):
        for c in range(1, n):
            dp[c] += dp[c - 1]
    return dp[-1]  # O(m·n) time, O(n) space
```

Obstacles: set `dp[r][c] = 0` on a blocked cell; first row/col stop propagating after a block.

This is the same *shape* as climb-stairs in 2D. Once you have seen both, you should smell DP on any “count ways on a DAG of states.”

---

## LIS — `dp[i]` means “best ending here”

**Problem:** longest increasing subsequence (not subarray — not sliding window).

```python
def lis_length(a: list[int]) -> int:
    n = len(a)
    dp = [1] * n  # LIS ending at i
    for i in range(n):
        for j in range(i):
            if a[j] < a[i]:
                dp[i] = max(dp[i], dp[j] + 1)
    return max(dp) if dp else 0
    # O(n²). O(n log n): patience sorting / tails binary search
```

**Clue:** “subsequence” + “longest” + no contiguous requirement → usually `dp[i]` or patience, **not** sliding window.

---

## Edge cases

```python
# Coin change
coin_change([2], 3)        # -1, not a crash on ∞
coin_change([1], 0)        # 0
coin_change([1, 2, 5], 11) # 3

# Knapsack
knapsack_1d([], [], 10)    # 0
knapsack_1d([5], [10], 3)  # 0, item does not fit

# Paths
unique_paths(1, 1)         # 1
# Obstacles on start or end → 0
```

Integer overflow: Go `int` is fine for typical LC; “number of ways” problems often need `mod 1e9+7`. Python ints are unbounded — still apply the modulus when the prompt says so.

---

## Complexity cheat sheet

| Problem | Time | Space after squeeze |
|---------|------|---------------------|
| Climb stairs / Fibonacci | O(n) | O(1) |
| 0/1 knapsack | O(nW) | O(W) |
| Coin change (min coins) | O(nA) | O(A) |
| Unique paths | O(mn) | O(n) |
| LIS naive | O(n²) | O(n) |

---

## Interview follow-ups

1. **“Reconstruct the coins, not just the count.”** Keep `prev[x] = coin` that last improved `dp[x]`; walk back from `A`.
2. **“What if coins can be negative?”** Recurrence can cycle. DP on amounts is the wrong model.
3. **“Top-down vs bottom-up?”** Sparse / early exit → memo. Tight loops, space squeeze, interview default → bottom-up.
4. **“Is this greedy?”** Coin change is greedy only for canonical coin systems. `[1,3,4]` amount `6` is `3+3`, not `4+1+1`. If you cannot prove the greedy choice property, use DP.

---

## Key takeaways

!!! success "Remember"
    1. Two properties: overlapping subproblems + optimal substructure. Missing either → not DP (or not *this* DP).
    2. Write the English state, then the recurrence, then the loop order (0/1 vs unbounded is the inner-loop direction).
    3. Brute force → memo → table → roll the array. Do not start at step 4 in an interview.
    4. “Contiguous” is sliding window; “subsequence / ways / min cost with reuse” is DP.
    5. Name the cell: if you cannot, you are guessing indices.
