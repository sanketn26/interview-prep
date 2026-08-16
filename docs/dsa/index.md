---
title: DSA Patterns
description: Pattern recognition and visual walkthroughs — not a random problem dump.
---

# DSA Patterns

Clue → pattern. Code is Python first, Go second. Visualizers: Prev/Next via Step, Reset, Auto Play.

---

## Why This Exists

There are thousands of LeetCode problems and roughly **fifteen** underlying patterns. Engineers who grind problems randomly memorize solutions and freeze the moment they see something unfamiliar. Engineers who learn patterns recognize the shape of a new problem in the first minute.

The skill being tested is not "have you seen this problem." It is: **can you map an unfamiliar problem onto a technique you know, and justify the complexity?** That is a translation skill, and it is trainable in a way that memorization is not.

So the unit of study here is the *clue*, not the problem. "Contiguous subarray" is a clue. "Sorted array" is a clue. Each points at a small set of techniques, and knowing the mapping converts a blank-page panic into a mechanical process.

---

## Mental Model: The Complexity Ladder

Nearly every optimization in interviews is a move down this ladder. Knowing which rung you are on tells you whether to keep optimizing:

```
O(n!)      permutations           ← 10 items = 3.6M ops. Only for tiny n.
O(2ⁿ)      every subset           ← 30 items = 1B ops. Needs memo or DP.
O(n³)      triple nested loop     ← rarely acceptable
O(n²)      nested loop / all pairs← the brute force you must improve
O(n log n) sort, heap, divide&conq← usually the target for comparison work
O(n)       single pass            ← usually optimal; you must read the input
O(log n)   binary search, balanced tree
O(1)       hash lookup, math
```

**The most common interview arc is O(n²) → O(n).** You get there with one of three moves:

1. **Hash map** — trade memory for lookup. "Have I seen this before?" becomes O(1).
2. **Two pointers / sliding window** — exploit sortedness or contiguity to avoid re-scanning.
3. **Sort first** — pay O(n log n) once to make the rest linear.

!!! tip "Say the complexity out loud, unprompted"
    State time *and* space after describing your approach, and state the brute force before optimizing it. Interviewers are grading whether you know the cost of what you wrote — silence reads as not knowing.

---

## The Clue Table

This is the core of pattern recognition. Read the problem, find the clue, get the technique:

| Clue in the problem | Reach for | Why it works |
|---|---|---|
| "contiguous subarray/substring" | [Sliding window](sliding-window.md) | Window slides instead of re-scanning |
| "sorted array" + find a pair | [Two pointers](two-pointers.md) | Sortedness makes one direction provably right |
| "sorted" or "monotonic" + search | [Binary search](binary-search.md) | Halve the space each step |
| "shortest path", unweighted | [BFS](bfs-dfs.md) | First arrival is shortest by construction |
| "all paths", "connected components" | [DFS](bfs-dfs.md) | Recursion explores exhaustively |
| "how many ways" / "min or max cost" | [Dynamic programming](dynamic-programming.md) | Overlapping subproblems |
| "top k" / "k largest" | Heap | O(n log k) instead of full sort |
| "have I seen this before" | Hash map/set | O(1) membership |
| "next greater element" | Monotonic stack | Amortized O(n) |
| "detect a cycle" | Fast/slow pointers | Meets inside the cycle |

Two clarifications that recur:

**Why BFS for shortest path?** BFS explores in rings of increasing distance, so the first time it reaches a node, no shorter route exists. DFS may reach the same node by a long path first and has no such guarantee — the property is structural, not incidental.

**When is it DP?** Two conditions together: *overlapping subproblems* (the same sub-answer is needed repeatedly) and *optimal substructure* (the best overall solution is built from best sub-solutions). Fibonacci has both. If subproblems never repeat, it is divide-and-conquer, not DP.

---

## The Move That Wins Most Interviews

Here is the O(n²) → O(n) transformation in its purest form — worth internalizing because it recurs constantly:

```python
"""Two Sum: the canonical 'trade memory for a lookup' optimization."""


def two_sum_brute(nums: list[int], target: int) -> tuple[int, int] | None:
    """Check every pair. O(n²) time, O(1) space."""
    for i in range(len(nums)):
        for j in range(i + 1, len(nums)):
            if nums[i] + nums[j] == target:
                return (i, j)
    return None


def two_sum_hash(nums: list[int], target: int) -> tuple[int, int] | None:
    """One pass. O(n) time, O(n) space.

    The insight: instead of searching for the partner, remember what you have
    seen. At each element, the partner you need is fully determined
    (target - num), so membership is a single lookup.
    """
    seen: dict[int, int] = {}
    for i, num in enumerate(nums):
        if (complement := target - num) in seen:
            return (seen[complement], i)
        seen[num] = i
    return None


if __name__ == "__main__":
    nums, target = [2, 7, 11, 15], 26
    print(f"brute: {two_sum_brute(nums, target)}")   # (2, 3) → 11 + 15
    print(f"hash:  {two_sum_hash(nums, target)}")    # (2, 3) → same answer

    # Why it matters at scale: comparisons performed
    for n in (100, 10_000, 1_000_000):
        print(f"n={n:>9,}  brute≈{n * n // 2:>15,}   hash≈{n:>9,}")
```

```
brute: (2, 3)
hash:  (2, 3)
n=      100  brute≈          5,000   hash≈      100
n=   10,000  brute≈     50,000,000   hash≈   10,000
n=1,000,000  brute≈500,000,000,000   hash≈1,000,000
```

At a million elements the brute force needs ~500 billion comparisons — minutes to hours. The hash version needs a million — milliseconds. **Same problem, same correctness, different data structure.**

---

## How to Practice

1. **Read the problem and find the clue before writing anything.** Name the pattern out loud.
2. **State the brute force and its complexity.** This is free credit and establishes the baseline you are improving.
3. **Improve it using the clue**, and say which of the three moves you are making.
4. **Walk one small example by hand** before coding — most bugs are off-by-one and surface here.
5. **Only then write code**, then state final time and space.

Skipping to step 5 is the most common way strong programmers fail these interviews.

---

## First Release

| Pattern | Clue | Status |
|---------|------|--------|
| [Foundations / Big-O](foundations.md) | how to approach any DSA problem | Complete |
| [Sliding window](sliding-window.md) | contiguous subarray / longest window | Complete |
| [Two pointers](two-pointers.md) | sorted array pair / in-place compaction | Complete |
| [Binary search](binary-search.md) | sorted / monotonic search space | Complete |
| [BFS & DFS](bfs-dfs.md) | shortest unweighted path / explore all | Complete |
| [Dynamic programming](dynamic-programming.md) | overlapping subproblems | Complete |
| [Pattern index](pattern-recognition.md) | which pattern for which clue | Complete |
| [Heaps & Priority Queues](heaps.md) | top k / k-th largest / merge k streams | Complete |
| [Graph Algorithms](graph-algorithms.md) | shortest weighted path / MST / dependency order | Complete |
| [Union-Find](union-find.md) | dynamic connectivity / cycle detection | Complete |
| [Backtracking](backtracking.md) | all configurations under constraints | Complete |
| [Sorting Algorithms](sorting.md) | quicksort / merge sort / heapsort trade-offs | Complete |
| [Tries](tries.md) | prefix search / autocomplete | Complete |
| [Greedy Algorithms](greedy.md) | locally optimal choice, provably global | Complete |
| [String Matching](string-matching.md) | substring search (KMP / Rabin-Karp) | Complete |

Start with [foundations](foundations.md) for Big-O and the approach loop, then work the patterns in the order above — each has an animated visualizer with Step / Reset / Auto Play.

---

## Key Takeaways

- **~15 patterns cover thousands of problems.** Learn the mapping, not the answers.
- **The clue is in the problem statement.** "Contiguous," "sorted," "shortest," "how many ways."
- **Most optimizations are O(n²) → O(n)** via hash map, two pointers, or sorting first.
- **State complexity unprompted**, both time and space, brute force and final.
- **Walk an example by hand before coding.** It catches the off-by-one you would otherwise ship.
