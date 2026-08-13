---
title: DSA Foundations
description: The repeatable process for approaching any DSA interview problem — Big-O intuition, complexity classes, and a decision framework for picking the right pattern.
---

# DSA Foundations

**Difficulty:** Foundational | **Pattern Type:** Process / Meta-skill

[← DSA Overview](index.md) | [Next: Sliding Window →](sliding-window.md)

---

## Why This Exists

**Problem:** Given an unseen problem, most candidates either freeze or jump straight to coding a half-formed idea.

**Brute force approach to interviewing:** Read the problem, immediately start typing, discover a bug or missing case 10 minutes in, backtrack, panic-optimize.
- Time to a correct, optimal solution: unpredictable, often doesn't converge
- Interviewer signal: "can't structure their own thinking"

**Insight:** Every DSA problem — regardless of topic — follows the same shape: constraints imply a target complexity, and target complexity implies a small set of candidate patterns. If you learn to read *constraints* instead of *topics*, you can navigate to the right technique even for problems you've never seen.

**Result:** A repeatable, interviewer-legible process that gets you to a working brute force in minutes and an optimized solution with a clear narrative of *why* it's optimal — which is what's actually being graded.

---

## Mental Model

Think of every problem as a pipeline. Skipping a stage is where candidates lose points, even when the final code is correct.

```
 [1] CLARIFY           [2] BRUTE FORCE        [3] IDENTIFY PATTERN
 constraints,     -->  state the naive   -->  from clues + target
 edge cases,            solution + its         complexity, pick a
 input shape             complexity              candidate technique
      |                       |                        |
      v                       v                        v
 "n <= 1e5, array      "nested loop,           "sorted + pair sum
  sorted? no dupes?"    O(n^2) time"             -> two pointers"

 [4] OPTIMIZE           [5] CODE                [6] TEST + ANALYZE
 apply pattern,   -->   write clean,      -->   walk edge cases,
 restate new              incremental              state final
 complexity               working code             time/space aloud
      |                       |                        |
      v                       v                        v
 "two pointers          def two_sum(...)         "empty array? one
  O(n log n) or            ...                     element? all same
  O(n)"                                             value? -> pass"
```

The pipeline is circular in practice — while coding you may discover a missed edge case and hop back to step 1 — but the *order* matters: never optimize before you've stated brute force + complexity out loud, and never code before you've named the pattern.

---

## Step-by-Step Process

### 1. Clarify constraints

Before writing a line of code, extract three things from the prompt (ask if not given):

- **Input size (n)** — this alone often tells you the required Big-O (see table below).
- **Input shape** — array, string, tree, graph, matrix, stream? This narrows the pattern family.
- **Properties** — sorted? unique elements? negative numbers? can input be empty? is it a stream (can't re-read)?

```python
# Before coding, say out loud:
# "So n can be up to 10^5, the array is unsorted, and values can be
#  negative. That rules out O(n^2) and rules out a pure sorted-array
#  binary search unless I sort first."
```

### 2. Start with brute force — and say its complexity

Even if you know the optimal answer immediately, stating brute force first does two things: it proves correctness intent, and it gives you a baseline to explain the improvement against.

```python
def two_sum_brute(nums: list[int], target: int) -> list[int]:
    """O(n^2) time, O(1) space — check every pair."""
    for i in range(len(nums)):
        for j in range(i + 1, len(nums)):
            if nums[i] + nums[j] == target:
                return [i, j]
    return []
```

### 3. Identify the pattern from clues

Match the constraint + input shape + keywords to a technique family. This is the step most candidates skip mentally — see [Pattern Recognition](pattern-recognition.md) for the full clue table.

### 4. Optimize and restate complexity

State the new time/space complexity *before* coding it — this is your commitment, and the interviewer can course-correct you if you're about to build the wrong thing.

### 5. Code it

Write incrementally. Narrate variable meanings (`left`, `right`, `seen` — what invariant does each maintain?). Prefer clarity over cleverness; a senior candidate's code should look boring and obviously correct.

### 6. Test with edge cases, then analyze complexity out loud

```python
# Standard edge-case checklist:
# - empty input
# - single element
# - all elements identical
# - already sorted / reverse sorted
# - target not achievable / no valid answer
# - integer overflow (less relevant in Python, mention in Java/C++)
# - duplicates
```

Finish by restating: "This runs in O(n) time because each element is visited a constant number of times, and O(1) extra space because we only track a fixed number of pointers/counters."

---

## Big-O Intuition

Big-O describes how work scales as input grows — it deliberately throws away constants because at large n, the *shape* of growth dominates.

```
Operations
    ^
    |                                         O(2^n) — exponential
    |                                    /
    |                              /
    |                        /            O(n^2) — quadratic
    |                   /         .  .
    |              /        . .
    |         /       . . O(n log n) — linearithmic
    |    /  . . .
    |. . _______________________ O(n) — linear
    |_____________________________ O(log n) — logarithmic
    |_____________________________ O(1) — constant
    +------------------------------------> n (input size)
```

Rule of thumb for interviews: **n tells you the target complexity.**

| n (input size) | Required complexity | Typical patterns |
|---|---|---|
| n ≤ 20 | O(2^n) or O(n!) | Backtracking, brute force subsets, bitmask DP |
| n ≤ 500 | O(n^3) | Triple nested loop, simple DP over pairs |
| n ≤ 5,000 | O(n^2) | Nested loops, brute force pair comparison |
| n ≤ 10^5–10^6 | O(n log n) | Sorting, heaps, binary search, divide & conquer |
| n ≤ 10^7–10^8 | O(n) | Single pass, two pointers, sliding window, hashing |
| n very large / streaming | O(log n) or O(1) | Binary search on answer, math formula, online algorithms |

---

## Complexity Classes with Example Problems

| Complexity | Name | Example problem |
|---|---|---|
| O(1) | Constant | Check if a number is even; hash map lookup |
| O(log n) | Logarithmic | Binary search in a sorted array |
| O(n) | Linear | Find max in an array; sliding window sum |
| O(n log n) | Linearithmic | Sort an array; merge k sorted lists with a heap |
| O(n^2) | Quadratic | Brute-force pair sum; bubble sort |
| O(n^3) | Cubic | Triple-nested DP (e.g. matrix chain multiplication) |
| O(2^n) | Exponential | Generate all subsets; naive recursive Fibonacci |
| O(n!) | Factorial | Generate all permutations; brute-force TSP |

**Space complexity** follows the same rules but counts extra memory, not counting the input itself:
- O(1): a few pointers/counters (two pointers, sliding window)
- O(n): a hash map, a visited set, an output array
- O(h) or O(w): recursion stack depth (tree height) or BFS queue width

---

## Decision Framework — "Which Pattern Should I Try First?"

```
                     START: read the problem
                             |
              +--------------+---------------+
              |                              |
        What's the INPUT SHAPE?        What are the CONSTRAINTS?
              |                              |
    +---------+---------+          n <= 20 -> exponential OK
    |    |    |    |    |          n <= 10^5 -> need O(n) or O(n log n)
  array string tree graph  matrix        |
    |    |    |    |    |                v
    |    |    |    |    +-> flood fill / BFS-DFS grid problems
    |    |    |    +----> BFS (shortest/unweighted) or DFS (explore all)
    |    |    +---------> traversal (in/pre/post), BFS for level order
    |    +--------------> sliding window (substr) or two pointers (palindrome)
    v
  Is it SORTED (or sortable)?
    |
  YES --> "find element/boundary" -> binary search
    |      "pair/triplet sum"      -> two pointers
    |
  NO  --> "contiguous subarray/substring" -> sliding window
           "count ways / min-max / overlapping subproblems" -> DP
           "search a monotonic answer space" -> binary search on answer
           "shortest path, weighted" -> Dijkstra / BFS with weights
           "connect/group items" -> union-find
           "order with dependencies" -> topological sort (DFS or Kahn's BFS)
```

Cross-check with the [Pattern Recognition](pattern-recognition.md) page for a full clue-phrase table once you've narrowed the input shape and constraints.

---

## Interview Follow-ups

1. **"Can you do better than O(n log n)?"** — Only if you can exploit a property the general case doesn't have (bounded value range → counting sort, small alphabet → bucket, or you've already sorted for a prior step).
2. **"What if n was 10x larger?"** — Forces you to re-derive from the constraint table; often signals "your O(n^2) needs to become O(n log n) or O(n)."
3. **"Walk me through why this is optimal."** — You should be able to name the lower bound (e.g., "we must look at every element at least once, so O(n) is optimal here; O(n log n) is optimal for anything that fundamentally requires sorting/comparison").
4. **"What's the space-time tradeoff here?"** — Can you trade O(n) extra space (hash map/memoization) for better time, or vice versa (in-place two pointers instead of a hash set)?

---

## Key Takeaways

!!! success "Remember"
    1. The process is fixed regardless of topic: clarify → brute force + complexity → identify pattern → optimize → code → test + re-analyze complexity.
    2. **n is the strongest hint** for target complexity — read it before you read the problem's "story."
    3. Input shape (array/string/tree/graph) plus a sortedness/constraint check narrows you to 2-3 candidate patterns almost every time.
    4. Always state brute force complexity out loud first — it's the baseline your optimization is measured against, and it proves you can reason about correctness before cleverness.
    5. Finish every problem by re-stating time and space complexity in plain language — this is often worth as many points as the code itself.
