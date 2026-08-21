---
title: Sliding Window Pattern
description: Master the sliding window DSA pattern with interactive animation, multiple variants, and interview problems.
---

# Sliding Window Pattern

**Difficulty:** Medium | **Pattern Type:** Array/String optimization

[← DSA Overview](index.md) | [Next: Two Pointers →](two-pointers.md)

---

## Why This Pattern Exists

**Problem:** Find the maximum sum of any subarray of length K.

**Brute force:** For each starting position, sum the next K elements.
- Time: O(N × K)
- For N=10,000, K=1,000: 10 million operations

**Insight:** When we move the window forward by 1, we only need to:
- **Add** one new element (the new right boundary)
- **Remove** one old element (the old left boundary)

Instead of recalculating the sum each time (O(K)), we update it in O(1).

**Result:** O(N) instead of O(N × K).

---

## Mental Model

```
Array: [3, 1, 2, 5, 8, 2, 6, 1, 4, 9]  K=3
         ↑           ↑
         L           R

Window slides from left to right:
[3, 1, 2] → sum=6
   [1, 2, 5] → sum=8
      [2, 5, 8] → sum=15  ← maximum
         [5, 8, 2] → sum=15
            [8, 2, 6] → sum=16 ← new max
               [2, 6, 1] → sum=9
                  [6, 1, 4] → sum=11
                     [1, 4, 9] → sum=14
```

---

## Interactive Visualizer

<div class="sim-container">
  <div class="sim-title">🎯 Sliding Window Visualizer</div>

  <div class="sim-controls">
    <button class="sim-btn success" onclick="window._sw && window._sw.runMaxSumSubarray(3)">▶ Run (K=3)</button>
    <button class="sim-btn" onclick="window._sw && window._sw.runMaxSumSubarray(4)">▶ Run (K=4)</button>
    <button class="sim-btn danger" onclick="window._sw && window._sw.reset()">Reset</button>
  </div>

  <div style="margin:1rem 0">
    <div class="dsa-array" id="sw-array"></div>
  </div>

  <div id="sw-info" style="color:#90caf9;font-family:monospace;font-size:0.85rem;margin:0.5rem 0;"></div>

  <div class="sim-log" id="sw-log"></div>
</div>

**Legend:**
<span style="background:#1b5e20;padding:2px 8px;border-radius:4px;color:#fff;font-size:0.8rem">Window</span>
<span style="background:#1565c0;padding:2px 8px;border-radius:4px;color:#fff;font-size:0.8rem;margin-left:8px">Left pointer</span>
<span style="background:#e65100;padding:2px 8px;border-radius:4px;color:#fff;font-size:0.8rem;margin-left:8px">Right pointer</span>

---

## Two Variants

### Fixed Window (Window size = K)

The window always has exactly K elements.

```python
def max_sum_subarray(arr: list[int], k: int) -> int:
    """Maximum sum of any subarray of length k."""
    if len(arr) < k:
        return -1

    # Initialize window with first k elements
    window_sum = sum(arr[:k])
    max_sum = window_sum

    # Slide window: add one element, remove one element
    for i in range(k, len(arr)):
        window_sum += arr[i]       # add new right element
        window_sum -= arr[i - k]   # remove old left element
        max_sum = max(max_sum, window_sum)

    return max_sum  # O(n) time, O(1) space

# Test
print(max_sum_subarray([3, 1, 2, 5, 8, 2, 6, 1, 4, 9], 3))  # 16
```

### Variable Window (Window shrinks/grows based on condition)

The window size changes to maintain a constraint.

The visualizer above is **fixed-window max sum** (not this variable-window problem). If a HUD ever showed `Target=11`, that was leftover state from a target-sum mode this page does not run.

```python
def longest_subarray_with_sum_le_k(arr: list[int], k: int) -> int:
    """Longest contiguous subarray with sum ≤ k.
    Assumes non-negative arr — shrinking from the left is only safe then
    (a negative could make the sum smaller, so you might need a different algorithm)."""
    left = 0
    current_sum = 0
    max_length = 0

    for right in range(len(arr)):
        current_sum += arr[right]  # expand window

        # Shrink window until constraint satisfied
        while current_sum > k:
            current_sum -= arr[left]
            left += 1

        # Window [left..right] satisfies constraint
        max_length = max(max_length, right - left + 1)

    return max_length  # O(n) — each element enters/exits window once
```

---

## Common Sliding Window Problems

### 1. Longest Substring Without Repeating Characters

```python
def length_of_longest_substring(s: str) -> int:
    """
    Pattern: Variable window — shrink when duplicate found
    Clue: "longest substring" + "without repeating" → sliding window
    """
    char_index = {}  # char → last seen index
    left = 0
    max_len = 0

    for right, char in enumerate(s):
        # If char seen and within current window
        if char in char_index and char_index[char] >= left:
            left = char_index[char] + 1  # skip past duplicate

        char_index[char] = right
        max_len = max(max_len, right - left + 1)

    return max_len

# "abcabcbb" → 3 ("abc")
# "pwwkew"   → 3 ("wke")
# Time: O(n), Space: O(min(m,n)) where m=charset size
```

### 2. Minimum Window Substring

```python
def min_window(s: str, t: str) -> str:
    """
    Find the smallest window in s containing all chars of t.
    Pattern: Variable window with character frequency tracking
    """
    from collections import Counter

    need = Counter(t)
    have = {}
    formed = 0     # how many chars satisfy the required frequency
    required = len(need)  # how many unique chars need to be satisfied
    left = 0
    min_len = float('inf')
    result = ""

    for right, char in enumerate(s):
        have[char] = have.get(char, 0) + 1
        if char in need and have[char] == need[char]:
            formed += 1

        # Try to shrink window
        while formed == required:
            if right - left + 1 < min_len:
                min_len = right - left + 1
                result = s[left:right + 1]

            left_char = s[left]
            have[left_char] -= 1
            if left_char in need and have[left_char] < need[left_char]:
                formed -= 1
            left += 1

    return result  # O(s + t) time, O(s + t) space
```

### 3. Maximum Sum of K Consecutive Cards (Circular)

```python
def max_score(card_points: list[int], k: int) -> int:
    """
    Pick k cards from left or right end of array.
    Insight: picking k from ends = leaving n-k in the middle.
    Find minimum sum window of size n-k, answer = total - min_window.
    """
    n = len(card_points)
    window_size = n - k
    total = sum(card_points)

    if window_size == 0:
        return total

    window_sum = sum(card_points[:window_size])
    min_window = window_sum

    for i in range(window_size, n):
        window_sum += card_points[i] - card_points[i - window_size]
        min_window = min(min_window, window_sum)

    return total - min_window
```

---

## Pattern Recognition

**When to use Sliding Window:**

| Clue in problem | Window type |
|----------------|-------------|
| "subarray/substring of length K" | Fixed window |
| "longest subarray/substring satisfying X" | Variable window (expand right, shrink left) |
| "minimum window containing..." | Variable window with frequency map |
| "contiguous", "consecutive" | Sliding window |
| "at most K distinct", "no more than K" | Variable window |

**Template — Variable Window:**

```python
def sliding_window_template(arr, constraint):
    left = 0
    state = initial_state()  # e.g., Counter(), sum, set
    result = initial_result()

    for right in range(len(arr)):
        update_state(arr[right], state)  # add arr[right]

        while not constraint(state):     # window violates constraint
            undo_state(arr[left], state) # remove arr[left]
            left += 1

        result = update_result(result, left, right)

    return result
```

---

## Complexity Analysis

| Problem | Time | Space | Key Insight |
|---------|------|-------|-------------|
| Max sum of k elements | O(n) | O(1) | Fixed window, running sum |
| Longest without repeating | O(n) | O(min(m,n)) | Variable window, hash map |
| Minimum window substring | O(s+t) | O(s+t) | Variable window, frequency count |
| Permutation in string | O(s+p) | O(p) | Fixed window, frequency match |

---

## Edge Cases

```python
# Always check:
# 1. Empty array/string
# 2. k > len(arr) (fixed window)
# 3. All same characters
# 4. Window never satisfies constraint (return 0 or "")
# 5. Answer is entire array

def robust_max_sum(arr, k):
    if not arr or k > len(arr) or k <= 0:
        return 0  # or raise ValueError
    # ... rest of solution
```

---

## Interview Follow-ups

1. **"What if the array is circular?"** — Use the complement trick (find min window of n-k)
2. **"What if we need top-K windows, not just max?"** — Use a heap of window sums
3. **"What if we can skip at most 1 element in the window?"** — Extend variable window; try both including and excluding each element
4. **"What's the space complexity if elements are very large?"** — Space depends on state tracking (hash map size), not element values

---

## Key Takeaways

!!! success "Remember"
    1. Fixed window: O(N×K) brute force → O(N) by maintaining a running state
    2. Variable window: expand right to include, shrink left when constraint violated — each element enters/exits once → O(N)
    3. Key signal: "contiguous subarray/substring" + optimization goal → Sliding Window
    4. State tracking (sum, frequency map, set) is the variable that changes; update incrementally
    5. Template: `for right: add; while violated: remove left, left++; update result`

