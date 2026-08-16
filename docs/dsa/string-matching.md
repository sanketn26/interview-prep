---
title: String Matching (KMP & Rabin-Karp)
description: KMP and Rabin-Karp pattern matching algorithms with an interactive pointer-movement visualizer.
---

# String Matching — KMP & Rabin-Karp

**Difficulty:** Hard | **Pattern Type:** Substring search

[← DSA Overview](index.md) | [← Greedy Algorithms](greedy.md) | [Back to DSA Overview →](index.md)

---

## Why These Algorithms Exist

The naive way to find a pattern of length m inside a text of length n checks every starting position and compares character by character: O(nm) worst case. For text search at scale (log scanning, DNA sequence matching, plagiarism detection), that's too slow.

**KMP (Knuth-Morris-Pratt)** and **Rabin-Karp** both achieve better-than-naive matching, but via completely different mechanisms:

- **KMP** never re-examines a text character it has already matched — it uses information about the pattern's own internal structure to skip redundant comparisons.
- **Rabin-Karp** uses a rolling hash to compare whole substrings in O(1) amortized per position, only falling back to character comparison on a hash collision.

---

## Mental Model

**KMP's insight:** when a mismatch occurs after matching some prefix of the pattern, you already know exactly what the last few text characters were — they equal the pattern's prefix up to the mismatch. If that prefix has a shorter substring that is *both* a prefix and a suffix of itself, you can resume matching from there instead of restarting the pattern at position 0 and re-scanning text you already saw.

```
Text:     a  b  a  b  c  a  b  a  b  a  b  d
Pattern:  a  b  a  b  d
                    ^ mismatch: text 'a' vs pattern 'd' — but "abab" already matched

LPS table for "ababd": [0,0,1,2,0]
  lps[3] = 2 means "ab" is both a prefix and suffix of "abab"

Instead of restarting pattern at index 0 (and rewinding text), jump pattern's
j to lps[3]=2 — resume comparing "ab" (already known to match) forward.
The TEXT pointer never moves backward. That's the O(n) guarantee.
```

**Rabin-Karp's insight:** compute a hash of the pattern once, then slide a window across the text computing each window's hash incrementally (O(1) per shift via a rolling hash formula), and only do a full character comparison when hashes collide — hash equality is necessary but not sufficient for a real match.

---

## Interactive Pattern Matching Visualizer

<div class="sim-container">
  <div class="sim-title">🔎 KMP: Pattern Matching with the Failure Function</div>

  <div class="sim-controls">
    <button class="sim-btn success" onclick="window._kmp && window._kmp.run()">▶ Run KMP</button>
    <button class="sim-btn danger" onclick="window._kmp && window._kmp.reset()">Reset</button>
  </div>

  <div id="kmp-strip" style="margin:1rem 0;"></div>

  <div style="margin:0.5rem 0;font-size:0.8rem">
    <span style="background:#1e1e3a;border:2px solid #3a3a6a;padding:2px 8px;border-radius:4px;color:#e0e0ff">Unmatched</span>
    <span style="background:#e65100;padding:2px 8px;border-radius:4px;color:#fff;margin-left:8px">Text pointer (i)</span>
    <span style="background:#1565c0;padding:2px 8px;border-radius:4px;color:#fff;margin-left:8px">Pattern pointer (j)</span>
    <span style="background:#1a237e;padding:2px 8px;border-radius:4px;color:#fff;margin-left:8px">Confirmed match</span>
  </div>

  <div class="sim-log" id="kmp-log"></div>
</div>

Watch the pattern row shift right on a mismatch, using the LPS table instead of restarting from scratch — the top (text) row's pointer never moves backward.

---

## Implementation

### KMP

```python
def compute_lps(pattern: str) -> list[int]:
    """Longest Proper Prefix that's also a Suffix, for every prefix of pattern.
    lps[i] = length of the longest string that is both a prefix and suffix of pattern[:i+1]."""
    lps = [0] * len(pattern)
    length = 0  # length of the previous longest prefix-suffix
    i = 1

    while i < len(pattern):
        if pattern[i] == pattern[length]:
            length += 1
            lps[i] = length
            i += 1
        elif length > 0:
            length = lps[length - 1]  # fall back within the pattern, don't reset to 0
        else:
            lps[i] = 0
            i += 1

    return lps
    # Time: O(m) where m = len(pattern)


def kmp_search(text: str, pattern: str) -> list[int]:
    """Returns all starting indices where pattern occurs in text."""
    if not pattern:
        return []

    lps = compute_lps(pattern)
    matches = []
    i = j = 0  # i: text pointer, j: pattern pointer

    while i < len(text):
        if text[i] == pattern[j]:
            i += 1
            j += 1
            if j == len(pattern):
                matches.append(i - j)
                j = lps[j - 1]  # continue searching for overlapping matches
        elif j > 0:
            j = lps[j - 1]  # fall back using the failure function — i never moves backward
        else:
            i += 1

    return matches
    # Time: O(n + m) — i only ever increases; total pattern-pointer decreases are bounded by
    #        total increases, so the amortized work is linear
    # Space: O(m) for the LPS table
```

### Rabin-Karp

```python
def rabin_karp_search(text: str, pattern: str, base: int = 256, mod: int = 10**9 + 7) -> list[int]:
    """Rolling hash — compare hashes first, fall back to full comparison on collision."""
    n, m = len(text), len(pattern)
    if m > n or m == 0:
        return []

    high_order = pow(base, m - 1, mod)  # base^(m-1) mod p, for removing the leading digit
    pattern_hash = 0
    window_hash = 0
    for i in range(m):
        pattern_hash = (pattern_hash * base + ord(pattern[i])) % mod
        window_hash = (window_hash * base + ord(text[i])) % mod

    matches = []
    for i in range(n - m + 1):
        if pattern_hash == window_hash:
            if text[i:i + m] == pattern:  # verify — hash collisions are possible
                matches.append(i)

        if i < n - m:
            # Roll the window: remove text[i]'s contribution, shift, add text[i+m]
            window_hash = (window_hash - ord(text[i]) * high_order) % mod
            window_hash = (window_hash * base + ord(text[i + m])) % mod
            window_hash %= mod  # normalize in case of negative modulo

    return matches
    # Time: O(n + m) average (O(1) amortized per shift); O(nm) worst case under
    #        adversarial input that causes many hash collisions
    # Space: O(1) extra beyond the output list
```

!!! warning "Rabin-Karp's worst case is not guaranteed linear"
    A poorly chosen modulus (or an adversary who knows it) can force many spurious hash collisions, degrading to O(nm) — every window triggers a full O(m) verification. KMP has a hard O(n+m) guarantee regardless of input; Rabin-Karp trades that guarantee for simplicity and for being trivially extensible to **multi-pattern search** (hash all patterns, check every window's hash against the set).

---

## When to Use Which

| Scenario | Algorithm | Why |
|----------|-----------|-----|
| Single pattern, need a hard worst-case guarantee | **KMP** | O(n+m) always, no adversarial degradation |
| Searching for **many patterns** at once | **Rabin-Karp** (or Aho-Corasick for true multi-pattern) | Hash set of pattern hashes makes multi-pattern nearly free per position |
| 2D pattern matching (e.g., substring in a grid) | **Rabin-Karp** | Rolling hash generalizes to 2D more naturally than KMP's linear failure function |
| Plagiarism / duplicate detection across huge corpora | **Rabin-Karp** (or its cousin, Rabin fingerprinting for chunking) | Hash-based comparison scales to comparing many documents pairwise |
| Simplicity matters more than worst-case guarantee | **Rabin-Karp** | Conceptually simpler to implement correctly than the LPS table |
| Streaming text, can't re-scan | **KMP** | Never needs to look backward in the text — genuinely one-pass |
| Built-in language function is available | **Use it** (`str.find`, `in`) | Production string search in most languages is already highly optimized (often Boyer-Moore or a hybrid) — implement KMP/Rabin-Karp for interviews, not for a real substring search in application code |

---

## Common Problems and Patterns

### Find the Index of the First Occurrence (strStr)

```python
def str_str(haystack: str, needle: str) -> int:
    """Classic KMP application — the canonical 'implement strstr' interview question."""
    if not needle:
        return 0
    matches = kmp_search(haystack, needle)
    return matches[0] if matches else -1
    # Time: O(n + m)
```

### Repeated Substring Pattern (KMP's LPS Table, Repurposed)

```python
def repeated_substring_pattern(s: str) -> bool:
    """s is built by repeating a substring iff len(s) is divisible by
    (len(s) - lps[-1]), the length of the smallest repeating unit."""
    lps = compute_lps(s)
    n = len(s)
    period = n - lps[-1]
    return period != n and n % period == 0
    # Time: O(n) — reuses the LPS computation directly, no extra search needed
```

### Longest Duplicate Substring (Rabin-Karp + Binary Search)

```python
def longest_dup_substring(s: str) -> str:
    """Binary search on answer length; for each length, use rolling hashes to
    check in O(n) whether any substring of that length repeats."""
    def search(length: int) -> int:
        if length == 0:
            return -1
        base, mod = 26, 2**63 - 1
        h = 0
        for i in range(length):
            h = (h * base + (ord(s[i]) - 97)) % mod
        seen = {h: [0]}
        high_order = pow(base, length - 1, mod)

        for start in range(1, len(s) - length + 1):
            h = (h - (ord(s[start - 1]) - 97) * high_order) % mod
            h = (h * base + (ord(s[start + length - 1]) - 97)) % mod
            h %= mod
            if h in seen:
                for prev_start in seen[h]:
                    if s[prev_start:prev_start + length] == s[start:start + length]:
                        return start
                seen[h].append(start)
            else:
                seen[h] = [start]
        return -1

    lo, hi, result = 1, len(s) - 1, ""
    while lo <= hi:
        mid = (lo + hi) // 2
        start = search(mid)
        if start != -1:
            result = s[start:start + mid]
            lo = mid + 1  # try to find a longer duplicate
        else:
            hi = mid - 1
    return result
    # Time: O(n log n) average — binary search over length × O(n) rolling-hash check per length
```

---

## Complexity Summary

| Algorithm | Time (average) | Time (worst case) | Space | Guarantee |
|-----------|------|------|-------|-----------|
| Naive search | O(nm) | O(nm) | O(1) | None |
| KMP | O(n + m) | O(n + m) | O(m) for LPS table | Hard guarantee, no degradation |
| Rabin-Karp | O(n + m) | O(nm) | O(1) extra | Probabilistic — degrades on hash collisions |
| Aho-Corasick (multi-pattern, not detailed above) | O(n + Σm + z) | Same | O(Σm) | z = number of matches; extends KMP's failure function to a trie |

n = text length, m = pattern length.

---

## Interview Follow-ups

1. **"Why doesn't KMP's text pointer ever move backward?"** — The failure function encodes exactly how much of the already-matched text can be reused as the start of a new match attempt — that's the entire point of building the LPS table.
2. **"How would you extend Rabin-Karp to search for multiple patterns simultaneously?"** — Hash all patterns into a set upfront; for each text window, compute its rolling hash and check set membership — O(1) average per window regardless of pattern count, versus O(k(n+m)) for k separate KMP passes.
3. **"What breaks Rabin-Karp in an adversarial setting?"** — An attacker who knows your modulus can craft many strings that collide under your hash, forcing O(m) verification at every position — use a large random modulus, or a cryptographic hash if adversarial input is a real threat.
4. **"KMP vs Z-function — what's the difference?"** — The Z-function computes, for every position, the length of the longest substring starting there that matches the text's prefix — a different but related preprocessing tool; both solve pattern matching in O(n+m), and the Z-function is often considered more intuitive to derive from scratch.

---

## Key Takeaways

!!! success "Remember"
    1. **KMP** precomputes the pattern's LPS (failure function) table so the **text pointer never moves backward** — hard O(n+m) guarantee.
    2. **Rabin-Karp** uses a rolling hash for O(1) amortized comparison per position, falling back to full comparison on collision — O(n+m) average, O(nm) worst case.
    3. KMP wins when you need a **guarantee**; Rabin-Karp wins when you need **simplicity** or **multi-pattern** search.
    4. The LPS table answers: "if I mismatch here, how much of what I already matched can I reuse?" — that's the entire mechanism.
    5. In real production code, use the language's built-in substring search — implement these from scratch for interviews and for genuinely specialized cases (streaming, multi-pattern, adversarial-input hardening).
