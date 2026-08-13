---
title: Two Pointers Pattern
description: Master the two pointers DSA pattern — opposite-direction and fast/slow variants, with worked code and the two-pointers-vs-sliding-window distinction.
---

# Two Pointers Pattern

**Difficulty:** Easy-Medium | **Pattern Type:** Array/Linked List optimization

[← Sliding Window](sliding-window.md) | [Next: Binary Search →](binary-search.md)

---

## Why This Pattern Exists

**Problem:** Given a sorted array, find two numbers that sum to a target.

**Brute force:** Check every pair.
- Time: O(n^2)
- For n=100,000: 10 billion operations — far too slow

**Insight:** The array is *sorted*. If the current pair's sum is too small, moving the left pointer right can only increase the sum — moving the right pointer would just retry combinations we've implicitly already ruled out (since it's paired with every value from left to right already covered by increasing left). Symmetric logic holds if the sum is too big. So instead of trying all O(n^2) pairs, we can eliminate one entire "row" or "column" of the search space with each comparison.

**Result:** O(n) instead of O(n^2), because each pointer moves at most n times total, in one direction, never backtracking.

This is the general shape of two pointers: **use a monotonic property of the data (sorted order, or a structural invariant like list cycles) to discard large chunks of the brute-force search space in O(1) per step.**

---

## Mental Model

### Opposite-direction pointers

```
Array (sorted): [-4, -1, 0, 2, 3, 5, 8]   target sum = 7
                  L                    R
                  L=-4, R=8 -> sum=4  too small -> move L right

                      L                R
                      L=-1, R=8 -> sum=7  FOUND -> return

If sum too small: move L right (increase sum)
If sum too big:   move R left  (decrease sum)
Pointers move toward each other, each step eliminates one candidate pair.
```

### Same-direction (fast/slow) pointers

```
Array: [1, 1, 2, 2, 2, 3, 4, 4]     "remove duplicates in place"

slow=0                                 write pointer: next unique slot
fast scans ahead looking for a value different from arr[slow]

 [1, 1, 2, 2, 2, 3, 4, 4]
  S
  F                     fast finds arr[1]==arr[slow] -> skip

  S
     F                  fast finds arr[2]=2 != arr[0]=1 -> slow++, write
     [1, 2, 2, 2, 2, 3, 4, 4]
        S  F

... continues; slow only advances when a new unique value is found
Result: first slow+1 elements are the deduplicated array, O(n) one pass.
```

### Fast/slow for cycle detection (Floyd's algorithm)

```
Linked list with cycle:  1 -> 2 -> 3 -> 4 -> 5
                                    ^         |
                                    +---------+

slow moves 1 step, fast moves 2 steps per iteration.
If there's a cycle, fast eventually laps slow and they meet inside the loop.
If no cycle, fast hits None first.
```

---

## Worked Code

### Opposite-direction: Two Sum on a sorted array

```python
def two_sum_sorted(nums: list[int], target: int) -> list[int]:
    """
    Requires: nums is sorted ascending.
    Time: O(n) — each pointer moves at most n times total.
    Space: O(1) — no extra data structures.
    """
    left, right = 0, len(nums) - 1

    while left < right:
        current = nums[left] + nums[right]
        if current == target:
            return [left, right]
        elif current < target:
            left += 1   # need a bigger sum -> move left pointer right
        else:
            right -= 1  # need a smaller sum -> move right pointer left

    return []  # no valid pair
```

### Opposite-direction: Container With Most Water

```python
def max_area(height: list[int]) -> int:
    """
    Two vertical lines + x-axis form a container; maximize area.
    Insight: area is limited by the SHORTER line. Moving the pointer at
    the taller line can never increase area (width shrinks, height capped
    by the same short line) — so always move the shorter one.
    Time: O(n), Space: O(1)
    """
    left, right = 0, len(height) - 1
    best = 0

    while left < right:
        width = right - left
        current_area = width * min(height[left], height[right])
        best = max(best, current_area)

        if height[left] < height[right]:
            left += 1
        else:
            right -= 1

    return best
```

### Same-direction: Remove Duplicates from Sorted Array (in place)

```python
def remove_duplicates(nums: list[int]) -> int:
    """
    slow = write pointer (next unique position)
    fast = scan pointer
    Time: O(n), Space: O(1) — in-place.
    """
    if not nums:
        return 0

    slow = 0
    for fast in range(1, len(nums)):
        if nums[fast] != nums[slow]:
            slow += 1
            nums[slow] = nums[fast]

    return slow + 1  # length of deduplicated prefix
```

### Same-direction: Linked List Cycle Detection (Floyd's Tortoise and Hare)

```python
class ListNode:
    def __init__(self, val=0, next=None):
        self.val = val
        self.next = next

def has_cycle(head: ListNode) -> bool:
    """
    Time: O(n), Space: O(1) — no visited set needed.
    """
    slow = fast = head

    while fast and fast.next:
        slow = slow.next
        fast = fast.next.next
        if slow is fast:
            return True

    return False
```

---

## Common Problems

### 1. Three Sum

```python
def three_sum(nums: list[int]) -> list[list[int]]:
    """
    Fix one element, two-pointer the rest of the sorted array.
    Pattern: sort + fixed element + opposite-direction two pointers.
    Time: O(n^2) — O(n log n) sort + O(n) outer loop * O(n) two-pointer scan.
    Space: O(1) extra (excluding output and sort space).
    """
    nums.sort()
    result = []
    n = len(nums)

    for i in range(n - 2):
        if i > 0 and nums[i] == nums[i - 1]:
            continue  # skip duplicate anchors

        left, right = i + 1, n - 1
        while left < right:
            total = nums[i] + nums[left] + nums[right]
            if total == 0:
                result.append([nums[i], nums[left], nums[right]])
                left += 1
                right -= 1
                while left < right and nums[left] == nums[left - 1]:
                    left += 1  # skip duplicates
                while left < right and nums[right] == nums[right + 1]:
                    right -= 1
            elif total < 0:
                left += 1
            else:
                right -= 1

    return result
```

### 2. Valid Palindrome (ignoring non-alphanumeric)

```python
def is_palindrome(s: str) -> bool:
    """
    Opposite-direction pointers skipping non-alphanumeric chars.
    Time: O(n), Space: O(1)
    """
    left, right = 0, len(s) - 1

    while left < right:
        while left < right and not s[left].isalnum():
            left += 1
        while left < right and not s[right].isalnum():
            right -= 1
        if s[left].lower() != s[right].lower():
            return False
        left += 1
        right -= 1

    return True
```

### 3. Sort Colors (Dutch National Flag — three-way partition)

```python
def sort_colors(nums: list[int]) -> None:
    """
    Sort an array of 0s, 1s, 2s in one pass, in place.
    Three pointers: low (boundary of 0s), mid (scan), high (boundary of 2s).
    Time: O(n), Space: O(1)
    """
    low, mid, high = 0, 0, len(nums) - 1

    while mid <= high:
        if nums[mid] == 0:
            nums[low], nums[mid] = nums[mid], nums[low]
            low += 1
            mid += 1
        elif nums[mid] == 1:
            mid += 1
        else:  # nums[mid] == 2
            nums[mid], nums[high] = nums[high], nums[mid]
            high -= 1
            # don't advance mid — swapped-in value from high is unchecked
```

---

## Two Pointers vs. Sliding Window

They're both O(n) single/double-pointer techniques on arrays, which is why they're often confused. The distinguishing question: **does the "window" between the pointers matter as a contiguous region you're tracking state over, or are the pointers just two independent search cursors?**

| Signal | Two Pointers | Sliding Window |
|---|---|---|
| What moves | Pointers can move toward each other, or independently at different speeds | Only the right edge expands; left edge only catches up (shrinks) |
| What's tracked | Usually just the two current values/indices | Running state over the region between pointers (sum, frequency map, count) |
| Typical direction | Opposite ends converging, or fast/slow at different speeds | Same direction, both moving rightward |
| Classic clue phrases | "pair/triplet sum", "sorted array", "palindrome", "cycle in linked list" | "longest/shortest **contiguous** subarray/substring", "window satisfying a constraint" |
| Requires sorted input? | Often yes (for sum/target problems) | No — works on any array/string |
| Example | Two Sum II, Container With Most Water, 3Sum | Longest substring without repeating chars, min window substring |

Rule of thumb: if you find yourself asking "what's the sum/count/frequency of everything *between* my two pointers right now," you're doing sliding window. If you're just comparing the two pointed-at values and deciding which one to move, that's two pointers.

---

## Pattern Recognition

| Clue in problem | Variant |
|---|---|
| "sorted array" + "pair/triplet sums to target" | Opposite-direction two pointers |
| "container", "maximize area/volume between two lines" | Opposite-direction two pointers |
| "palindrome" check | Opposite-direction two pointers |
| "remove duplicates in place", "partition array" | Same-direction (slow/fast) two pointers |
| "cycle in linked list", "find middle of linked list" | Fast/slow pointers |
| "merge two sorted lists/arrays" | Two pointers, one per list |

---

## Complexity Analysis

| Problem | Time | Space | Key Insight |
|---|---|---|---|
| Two Sum (sorted) | O(n) | O(1) | Monotonic sum lets you discard a side each step |
| Container With Most Water | O(n) | O(1) | Always move the shorter line's pointer |
| Remove Duplicates | O(n) | O(1) | Slow pointer marks write position |
| Linked List Cycle | O(n) | O(1) | Fast pointer gains 1 node/step on slow inside a cycle |
| 3Sum | O(n^2) | O(1) extra | Sort once, then two-pointer per anchor |

---

## Edge Cases

```python
# Always check:
# 1. Empty array / single element (no valid pair possible)
# 2. All elements identical (dedup / 3Sum duplicate skipping)
# 3. No valid pair exists (return [] / False)
# 4. Linked list of length 0 or 1 (no cycle possible)
# 5. Already sorted vs. requires sorting first (changes complexity!)

def robust_two_sum(nums, target):
    if len(nums) < 2:
        return []
    # ... rest of solution
```

---

## Interview Follow-ups

1. **"What if the array isn't sorted?"** — Either sort first (O(n log n) total) or use a hash set for O(n) time / O(n) space, trading the O(1) space of two pointers for speed on unsorted input.
2. **"How would you find all triplets, not just one pair?"** — Fix one pointer as an anchor and two-pointer the remainder (3Sum); generalizes to k-Sum by recursing down to a 2-pointer base case.
3. **"Can two pointers work on a linked list the same way as an array?"** — Opposite-direction pointers need O(1) random access (arrays), so they don't translate directly; fast/slow pointers work great on linked lists since both only need `.next`.
4. **"What if duplicates should not produce duplicate results?"** — Sort first, then explicitly skip over equal adjacent values after each match (shown in the 3Sum solution above).

---

## Key Takeaways

!!! success "Remember"
    1. Two pointers exploits a **monotonic property** (sorted order, or a speed/structural invariant) to eliminate large chunks of brute-force search space in O(1) per step.
    2. **Opposite-direction**: pointers start at both ends and converge — classic for sorted-array target-sum problems.
    3. **Same-direction (fast/slow)**: both pointers move rightward at different rates — classic for in-place partitioning and cycle detection.
    4. Two pointers vs. sliding window: two pointers compares two positions; sliding window tracks aggregate state over the region *between* two positions.
    5. Almost always O(n) time, O(1) extra space — that's the entire value proposition over an O(n^2) brute force.
