---
title: Binary Search Pattern
description: Master binary search — classic search-in-sorted-array plus the senior-level "binary search on the answer" variant, with off-by-one pitfalls and worked problems.
---

# Binary Search Pattern

**Difficulty:** Easy (classic) / Medium-Hard (on the answer) | **Pattern Type:** Search space reduction

[← Two Pointers](two-pointers.md) | [Next: BFS & DFS →](bfs-dfs.md)

---

## Why This Pattern Exists

**Problem:** Find whether a target exists in a sorted array of n elements.

**Brute force:** Scan every element.
- Time: O(n)
- For n=1,000,000: up to a million comparisons

**Insight:** Because the array is sorted, checking the middle element tells you which half the target *must* be in (if present at all) — the other half can be discarded entirely without inspecting it. Each comparison halves the remaining search space.

**Result:** O(log n) instead of O(n). For n=1,000,000, that's ~20 comparisons instead of up to a million.

The deeper, senior-level insight: **binary search doesn't require an array at all.** It only requires a *monotonic predicate* — a yes/no question over a range of candidate answers where the answer flips exactly once (all "no" then all "yes", or vice versa). This generalization is "binary search on the answer," and it's the version staff-level interviews probe for, because it shows you can recognize the *structure* of binary search independent of arrays.

---

## Mental Model

### Classic: search in a sorted array

```
Array (sorted): [1, 3, 5, 7, 9, 11, 13, 15]   target = 11
                 0  1  2  3  4   5   6   7

left=0, right=7
mid = (0+7)//2 = 3 -> arr[3]=7 < 11 -> search right half
                              left=4, right=7

mid = (4+7)//2 = 5 -> arr[5]=11 == 11 -> FOUND at index 5

Each step eliminates half the remaining candidates:
[1,3,5,7,9,11,13,15] -> [9,11,13,15] -> [11,13] -> [11]  (~log2(8)=3 steps)
```

### Binary search on the answer

```
Question: "What's the minimum capacity to ship all packages within D days?"

Candidate answers form a MONOTONIC predicate over capacity:
  capacity too small -> "can we ship in D days?" = NO  (takes too many days)
  capacity too big   -> "can we ship in D days?" = YES (always fits)

capacity:  1    2    3    4    5    6    7    8    9   10
can_ship:  N    N    N    N    Y    Y    Y    Y    Y    Y
                              ^
                    binary search finds this boundary —
                    the SMALLEST capacity where the answer flips to YES

We're not searching an array of values — we're searching a RANGE of
possible answers [min_possible, max_possible], using a feasibility
check (can_ship(capacity)) as our "compare" step instead of arr[mid].
```

---

## Two Templates

### Template 1: Classic search (exact match)

```python
def binary_search(arr: list[int], target: int) -> int:
    """
    Find index of target in sorted arr, or -1 if absent.
    Time: O(log n), Space: O(1)
    """
    left, right = 0, len(arr) - 1  # inclusive bounds

    while left <= right:           # <= because both bounds are valid candidates
        mid = left + (right - left) // 2  # avoids overflow, same as (l+r)//2 in Python
        if arr[mid] == target:
            return mid
        elif arr[mid] < target:
            left = mid + 1          # target is to the right, exclude mid
        else:
            right = mid - 1         # target is to the left, exclude mid

    return -1  # not found
```

### Template 2: Binary search on the answer (find boundary)

```python
def binary_search_on_answer(lo: int, hi: int, feasible) -> int:
    """
    Find the smallest value in [lo, hi] for which feasible(value) is True,
    given feasible() is monotonic: False False False ... True True True.
    Time: O(log(hi - lo)) * cost of feasible()
    """
    while lo < hi:                  # < because we converge to a single point
        mid = lo + (hi - lo) // 2
        if feasible(mid):
            hi = mid                 # mid works; try to find something smaller (or equal)
        else:
            lo = mid + 1              # mid doesn't work; answer must be larger

    return lo  # lo == hi, the boundary
```

---

## Off-by-One Pitfalls

This is where binary search bugs live. Know these cold:

| Pitfall | Symptom | Fix |
|---|---|---|
| `while left <= right` vs `while left < right` | Infinite loop or missed last candidate | Use `<=` when both bounds are valid answers you must still check (exact match search). Use `<` when converging to a single boundary point (search on answer). |
| `mid = mid + 1` vs `mid = mid` on the "feasible" branch | Skips over the actual answer / infinite loop | If `mid` itself could be the answer, keep it in range: `hi = mid` (not `mid - 1`). Only exclude `mid` (`lo = mid + 1` or `hi = mid - 1`) when you've proven mid is NOT the answer. |
| `mid = (left + right) // 2` overflow | Integer overflow in languages like Java/C++ (not Python) | Use `mid = left + (right - left) // 2`. Harmless in Python but good habit / expected in interviews. |
| Forgetting the loop can end with `left == right + 1` (classic) vs `left == right` (on-answer) | Off-by-one on final return value | Know which template you're in — classic returns -1 on failure; on-answer returns `lo` directly since it always converges to a valid value in range. |
| Mixing templates mid-solution | Half-correct code that fails on 2-element arrays | Pick one template for the whole solution and stick to its invariants. |

**Debugging trick:** trace a 2-element array/range by hand (`[a, b]`) before trusting any binary search code — most off-by-one bugs show up immediately at that size.

---

## Common Problems

### 1. Classic Binary Search

Already shown above as Template 1. `O(log n)` time, `O(1)` space.

### 2. Search in Rotated Sorted Array

```python
def search_rotated(nums: list[int], target: int) -> int:
    """
    Array was sorted, then rotated at an unknown pivot, e.g. [4,5,6,7,0,1,2].
    Insight: at any mid, AT LEAST ONE half is still normally sorted.
    Determine which half is sorted, then check if target lies in that
    sorted half's range to decide which side to search.
    Time: O(log n), Space: O(1)
    """
    left, right = 0, len(nums) - 1

    while left <= right:
        mid = left + (right - left) // 2
        if nums[mid] == target:
            return mid

        if nums[left] <= nums[mid]:  # left half [left..mid] is sorted
            if nums[left] <= target < nums[mid]:
                right = mid - 1
            else:
                left = mid + 1
        else:                         # right half [mid..right] is sorted
            if nums[mid] < target <= nums[right]:
                left = mid + 1
            else:
                right = mid - 1

    return -1
```

### 3. Koko Eating Bananas (Binary Search on the Answer)

```python
import math

def min_eating_speed(piles: list[int], h: int) -> int:
    """
    Koko eats at speed k bananas/hour; find minimum k so she finishes
    all piles within h hours.
    Predicate: feasible(k) = "can Koko finish within h hours at speed k?"
    This is monotonic: if speed k works, any speed > k also works.
    Search space: k in [1, max(piles)].
    Time: O(n log(max(piles))), Space: O(1)
    """
    def hours_needed(k: int) -> int:
        return sum(math.ceil(pile / k) for pile in piles)

    lo, hi = 1, max(piles)
    while lo < hi:
        mid = lo + (hi - lo) // 2
        if hours_needed(mid) <= h:
            hi = mid          # mid works; try smaller speed
        else:
            lo = mid + 1       # mid too slow; need faster speed

    return lo
```

### 4. Capacity to Ship Packages Within D Days (Binary Search on the Answer)

```python
def ship_within_days(weights: list[int], days: int) -> int:
    """
    Find minimum ship capacity so all packages ship (in original order,
    without splitting) within `days` days.
    Predicate: feasible(capacity) = "can we ship within `days` days?"
    Search space: [max(weights), sum(weights)] — capacity can't be less
    than the heaviest single package, and never needs to exceed the total.
    Time: O(n log(sum(weights))), Space: O(1)
    """
    def days_needed(capacity: int) -> int:
        days_used, current_load = 1, 0
        for w in weights:
            if current_load + w > capacity:
                days_used += 1
                current_load = 0
            current_load += w
        return days_used

    lo, hi = max(weights), sum(weights)
    while lo < hi:
        mid = lo + (hi - lo) // 2
        if days_needed(mid) <= days:
            hi = mid
        else:
            lo = mid + 1

    return lo
```

---

## Pattern Recognition

| Clue in problem | Variant |
|---|---|
| "sorted array", "find target/index" | Classic binary search |
| "find first/last occurrence", "find insertion point" | Classic binary search with boundary tweak |
| "rotated sorted array" | Classic binary search with sorted-half detection |
| "minimize the maximum", "maximize the minimum" | Binary search on the answer |
| "smallest X such that condition holds", "find threshold" | Binary search on the answer |
| Feasibility check is easy (`O(n)` or better) but direct answer is hard to compute | Binary search on the answer |
| "n up to 10^9" but you only need to evaluate a monotonic check ~30 times | Binary search on the answer |

---

## Complexity Analysis

| Problem | Time | Space | Key Insight |
|---|---|---|---|
| Classic search | O(log n) | O(1) | Halve search space each step |
| Search in rotated array | O(log n) | O(1) | One half is always normally sorted |
| Koko Eating Bananas | O(n log(max(piles))) | O(1) | Binary search on speed, O(n) feasibility check per step |
| Ship Within Days | O(n log(sum(weights))) | O(1) | Binary search on capacity, O(n) feasibility check per step |

---

## Edge Cases

```python
# Always check:
# 1. Empty array (len == 0) -> return -1 / not found immediately
# 2. Single element array
# 3. Target smaller than all elements / larger than all elements
# 4. Duplicate elements (which occurrence should you return?)
# 5. For "on the answer": verify lo/hi bounds are both achievable
#    (e.g. hi must itself satisfy feasible(hi), or the loop can't converge)

def robust_binary_search(arr, target):
    if not arr:
        return -1
    # ... rest of solution
```

---

## Interview Follow-ups

1. **"How would you find the first and last position of a target (duplicates allowed)?"** — Run two modified binary searches: one biased to keep searching left after a match (find leftmost), one biased right (find rightmost).
2. **"The feasibility check itself is O(n) — is the overall complexity still good?"** — Yes if the answer range is bounded reasonably: O(n log(range)) is usually far better than a brute-force O(n * range) linear scan over every candidate answer.
3. **"What if the array has duplicates and is rotated — does search-in-rotated still work?"** — No, duplicates can make it impossible to tell which half is sorted (e.g. `[1,1,1,0,1]`); worst case degrades to O(n) by linearly stepping when `nums[left] == nums[mid] == nums[right]`.
4. **"Can binary search be applied to a non-array domain, like real numbers?"** — Yes — e.g. finding the square root of x via binary search over a floating-point range, stopping when `hi - lo < epsilon` instead of `lo < hi`.

---

## Key Takeaways

!!! success "Remember"
    1. Binary search needs only **monotonicity**, not an array — a sorted array is one instance of a monotonic predicate (`arr[i] >= target` flips exactly once).
    2. Classic search: `while left <= right`, exclude `mid` on both branches once you've proven it's not the answer.
    3. Search on the answer: `while lo < hi`, keep `mid` in range (`hi = mid`) when it's feasible, since it might be the best answer.
    4. Signal for "search on the answer": the problem asks to **minimize a maximum** or **maximize a minimum**, and you can write an `O(n)`-ish `feasible(x)` check that's monotonic.
    5. Always trace a 2-element case by hand before trusting the loop bounds — that's where off-by-one bugs hide.
