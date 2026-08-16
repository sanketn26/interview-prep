---
title: Advanced String Matching
description: Aho-Corasick multi-pattern matching, Z-algorithm, suffix arrays, Boyer-Moore, and Manacher's algorithm, with an interactive Aho-Corasick automaton visualizer.
---

# Advanced String Matching

**Difficulty:** Hard | **Pattern Type:** Multi-pattern / linear-time string algorithms

[← DSA Overview](index.md) | [← Advanced Hashing Techniques](hashing-techniques.md) | [Back to DSA Overview →](index.md)

---

## Why These Algorithms Exist

[String Matching (KMP & Rabin-Karp)](string-matching.md) covers the baseline: find one pattern inside one text, in linear time. That's necessary but not sufficient for a lot of real problems:

- You need to find **thousands of patterns at once** in a single pass over the text (intrusion detection, spam filters scanning for banned phrases, DNA motif search).
- You need to answer **substring queries** — "does this substring repeat anywhere else?" — repeatedly against the same text, where re-running KMP each time is wasteful.
- You're matching against a **large alphabet** (natural-language text, not just DNA's 4 letters), where a different heuristic than KMP's failure function wins in practice.
- You need the **longest palindromic substring**, which none of the single-pattern-search algorithms address at all — it's a genuinely different problem shape.

Each algorithm below is the answer to one of those shapes. They're grouped here, distinct from `string-matching.md`, because they build on KMP's core ideas (failure functions, prefix-suffix structure) but solve harder problems.

---

## Aho-Corasick (Multi-Pattern Matching)

### Mental Model

Aho-Corasick answers: **given a fixed set of patterns, find every occurrence of every pattern in one linear pass over the text.** Running KMP once per pattern would cost O(k·(n+m)) for k patterns — Aho-Corasick does it in O(n + Σm + z) regardless of k, where z is the number of matches found.

The construction has two parts:

1. **Build a trie** of all the patterns (exactly like [Tries](tries.md)) — this handles the "many patterns share prefixes" case for free, since shared prefixes share trie nodes.
2. **Add failure links** — this is KMP's insight, generalized from a single pattern's self-similarity to *cross-pattern* similarity. Each trie node's failure link points to the node representing the longest proper suffix of its path that is *also* a prefix present somewhere in the trie (possibly belonging to a completely different pattern).

```
Patterns: "he", "she", "his", "hers"

Trie:
        (root)
        /    \
       h      s
       |      |
       e      h
      / \      \
     r   (his   e ── "she" ends here
     |    branch)     |
     s               (shares 'he' node with "he"!)
     |
    "hers" ends here

Failure links (dashed): each node points to the longest suffix of its
path that's also a prefix elsewhere in the trie. E.g. the node for "sh"
fails to the node for "h" (since "h" is a prefix, and the longest proper
suffix of "sh" that matches a trie prefix is "h").
```

**Why failure links generalize KMP:** in single-pattern KMP, a mismatch falls back to *the same pattern's* own prefix-suffix structure. In Aho-Corasick, a mismatch falls back to *any other pattern's* matching prefix — because the trie holds many patterns simultaneously, "the text I've already matched might be the start of a different pattern" becomes a real, common case, not just a theoretical one.

Scanning the text: walk the automaton one character at a time. At each node, if the current character has a matching child, descend. If not, follow the failure link (possibly repeatedly) until a matching child is found or you're back at the root. At every node, check whether it (or anything reachable via its *chain* of failure links) marks the end of a pattern — that's a match ending at the current text position.

---

## Interactive Aho-Corasick Visualizer

<div class="sim-container">
  <div class="sim-title">🕸️ Aho-Corasick: Trie + Failure Links + Multi-Pattern Scan</div>

  <div class="sim-controls">
    <input type="text" id="ac-text" placeholder="text to scan..." value="ushersheishishers" style="max-width:260px" />
    <button class="sim-btn success" onclick="window._ac && window._ac.scan(document.getElementById('ac-text').value)">▶ Scan</button>
    <button class="sim-btn danger" onclick="window._ac && window._ac.reset()">Reset</button>
  </div>

  <p style="font-size:0.8rem;color:#9e9ec8">Patterns loaded: <code>he</code>, <code>she</code>, <code>his</code>, <code>hers</code></p>

  <canvas id="ac-canvas" style="width:100%;height:280px;"></canvas>

  <div style="margin:0.5rem 0;font-size:0.8rem">
    <span style="background:#37474f;padding:2px 8px;border-radius:4px;color:#fff">Trie node</span>
    <span style="background:#1b5e20;padding:2px 8px;border-radius:4px;color:#fff;margin-left:8px">Pattern end (output node)</span>
    <span style="background:#b71c1c;padding:2px 8px;border-radius:4px;color:#fff;margin-left:8px">Current automaton state</span>
    <span style="border-bottom:2px dashed #7e57c2;padding:0 6px;margin-left:8px">Failure link</span>
  </div>

  <div id="ac-strip" style="margin:1rem 0;"></div>

  <div class="sim-log" id="ac-log"></div>
</div>

Watch the automaton state (red node) move through the trie as the text scans left to right. When a character has no matching child, the state follows a failure link (dashed purple edge) instead of restarting from the root — the text pointer never moves backward, exactly like KMP, just generalized across every pattern simultaneously. Green nodes mark pattern endings; reaching one (directly or via inherited output through a failure link) logs a match.

---

## Aho-Corasick Implementation

```python
from collections import deque


class AhoCorasick:
    """Trie + failure links (a.k.a. the Aho-Corasick automaton).
    Finds every occurrence of every pattern in one pass over the text."""

    def __init__(self, patterns: list[str]):
        # Each node: {char: child_node}, plus 'fail' link and 'output' pattern list
        self.root = {"children": {}, "fail": None, "output": []}
        for p in patterns:
            self._insert(p)
        self._build_failure_links()

    def _insert(self, word: str) -> None:
        node = self.root
        for ch in word:
            node = node["children"].setdefault(ch, {"children": {}, "fail": None, "output": []})
        node["output"].append(word)
        # Time: O(len(word)) per pattern

    def _build_failure_links(self) -> None:
        """BFS over the trie. A node's failure link points to the longest
        proper suffix of its path that is also a prefix present in the trie."""
        queue = deque()
        for child in self.root["children"].values():
            child["fail"] = self.root
            queue.append(child)

        while queue:
            current = queue.popleft()
            for ch, child in current["children"].items():
                fail_node = current["fail"]
                while fail_node is not self.root and ch not in fail_node["children"]:
                    fail_node = fail_node["fail"]
                child["fail"] = fail_node["children"].get(ch, self.root)
                if child["fail"] is child:
                    child["fail"] = self.root
                # Inherit output: any pattern ending at the failure target
                # also "ends" here, because that suffix is present in the text too
                child["output"] = child["output"] + child["fail"]["output"]
                queue.append(child)
        # Time: O(Σ pattern lengths) total across the whole trie

    def search(self, text: str) -> list[tuple[int, str]]:
        """Returns (start_index, pattern) for every match, in one linear pass."""
        node = self.root
        matches = []
        for i, ch in enumerate(text):
            while node is not self.root and ch not in node["children"]:
                node = node["fail"]
            node = node["children"].get(ch, self.root)
            for pattern in node["output"]:
                matches.append((i - len(pattern) + 1, pattern))
        return matches
        # Time: O(n + z) where n = len(text), z = number of matches
        #        (the failure-link-following is amortized O(1) per character,
        #        same argument as KMP's text pointer never moving backward)
        # Space: O(Σ pattern lengths) for the trie + failure links
```

!!! tip "This is exactly KMP's LPS table, generalized"
    KMP's `lps` array is a special case of Aho-Corasick's failure links where the trie has exactly one branch (a single pattern). Understanding Aho-Corasick retroactively makes KMP's failure function easier to explain: "the longest prefix of what I've matched so far that could also be the start of a fresh match" — Aho-Corasick just applies that across a whole set of patterns instead of one.

---

## Z-Algorithm

### Mental Model

The **Z-array** for a string `s` is defined as: `Z[i]` = the length of the longest substring starting at `i` that matches a prefix of `s`. `Z[0]` is conventionally undefined (or set to `len(s)`).

```
s = "aabxaabxcaabxaabxay"
     0123456789...

Z[4] = 4  → "aabx" starting at index 4 matches the prefix "aabx" (4 chars)
Z[9] = 4  → same, at index 9
```

**Using it for pattern matching:** concatenate `pattern + separator + text` (separator is a character that appears in neither), compute the Z-array of the combined string. Any position in the text-portion where `Z[i] == len(pattern)` is a full match — the substring starting there matches the whole pattern.

```
pattern = "aab", text = "xaabxaaby"
combined = "aab#xaabxaaby"
Z-array at positions after '#': wherever Z[i] == 3 (len("aab")), that's a match start.
```

The computation itself uses a clever invariant: maintain a window `[L, R]` that's the rightmost prefix-match found so far. For each new `i`, if `i` falls inside `[L, R]`, you already know a lower bound on `Z[i]` from the mirror position inside the earlier match (avoiding re-comparison of characters you've effectively already checked) — extend from there instead of starting from scratch.

```python
def z_array(s: str) -> list[int]:
    n = len(s)
    z = [0] * n
    z[0] = n
    left, right = 0, 0
    for i in range(1, n):
        if i < right:
            z[i] = min(right - i, z[i - left])
        while i + z[i] < n and s[z[i]] == s[i + z[i]]:
            z[i] += 1
        if i + z[i] > right:
            left, right = i, i + z[i]
    return z
    # Time: O(n) — the same amortized argument as KMP: 'right' only ever increases


def z_search(text: str, pattern: str) -> list[int]:
    combined = pattern + "\x00" + text  # separator not in either string
    z = z_array(combined)
    m = len(pattern)
    return [i - m - 1 for i in range(m + 1, len(combined)) if z[i] == m]
    # Time: O(n + m)
```

**Z-algorithm vs KMP:** both are O(n+m) single-pattern matchers with a similar "don't re-examine what you've already matched" core. The Z-array is often considered more intuitive to derive and directly reusable for other problems (e.g. finding all borders, string periodicity) because it exposes prefix-match lengths at *every* position directly, rather than encoding that information indirectly in a failure function.

---

## Suffix Array

### Mental Model

A suffix array is the sorted order (as indices) of every suffix of a string. Once built, it turns substring existence and longest-common-substring queries into **binary search**, because a sorted list of suffixes groups suffixes with common prefixes next to each other — exactly the property binary search needs.

```
s = "banana"
Suffixes:              Sorted (suffix array = starting indices):
0: banana               5: a
1: anana                3: ana
2: nana                 1: anana
3: ana                  0: banana
4: na                   4: na
5: a                    2: nana

suffix_array = [5, 3, 1, 0, 4, 2]
```

**Substring search via binary search:** to check if "ana" is a substring of "banana", binary search the suffix array for a suffix that *starts with* "ana" — O(m log n) where m is the pattern length, n is the text length. This is worse per-query than KMP (O(n+m)) for a *single* search, but the suffix array is a **reusable index**: build it once in O(n log n), then answer any number of substring queries in O(m log n) each — the right trade when you have one large text and many queries against it.

**Longest common substring** between two strings: concatenate them with a separator, build the suffix array (plus the LCP — longest common prefix — array between adjacent suffixes), and the answer is the maximum LCP value between two suffixes that originate from different original strings.

```python
def build_suffix_array(s: str) -> list[int]:
    """O(n log^2 n) via sort-by-doubling — good enough for interviews.
    (Production implementations use O(n log n) or O(n) construction, e.g. SA-IS.)"""
    n = len(s)
    suffixes = sorted(range(n), key=lambda i: s[i:])
    return suffixes
    # Naive Python slicing makes this O(n^2 log n) in practice — fine for small n,
    # explain the O(n log n) doubling-and-radix-sort approach verbally in interviews.


def lcp_array(s: str, suffix_array: list[int]) -> list[int]:
    """lcp[i] = longest common prefix between suffix_array[i-1] and suffix_array[i]."""
    n = len(s)
    lcp = [0] * n
    for i in range(1, n):
        a, b = suffix_array[i - 1], suffix_array[i]
        k = 0
        while a + k < n and b + k < n and s[a + k] == s[b + k]:
            k += 1
        lcp[i] = k
    return lcp
    # Time: O(n^2) naive; production builds this via Kasai's algorithm in O(n)
    #        given the suffix array
```

---

## Boyer-Moore

### Mental Model

Boyer-Moore is the odd one out here: instead of scanning left-to-right and never skipping, it compares the pattern against the text **right-to-left**, and on a mismatch, uses two independent heuristics to skip *multiple text positions at once* — often examining far fewer than n characters total, sublinear in practice (though not worst-case).

- **Bad-character rule:** on a mismatch at text character `c`, shift the pattern so that the rightmost occurrence of `c` in the pattern lines up with the mismatch position (or past the pattern entirely if `c` doesn't appear in it at all).
- **Good-suffix rule:** the text suffix already matched (before the mismatch) tells you something too — shift the pattern to the next position where that already-matched suffix could plausibly occur again in the pattern.

```
Text:     "HERE IS A SIMPLE EXAMPLE"
Pattern:  "EXAMPLE"

Compare pattern's LAST character 'E' against text position 6 first: text[6]='S' != 'E'.
Bad-character rule: 'S' doesn't appear anywhere in "EXAMPLE" at all ->
shift the pattern entirely past this position — skip 7 characters in one step,
instead of KMP/naive's single-character shifts.
```

**Why it beats KMP for large alphabets in practice:** the bad-character rule's power scales with alphabet size — in natural-language text (large alphabet), a random mismatched character is unlikely to appear anywhere in the pattern at all, triggering large skips constantly. On a tiny alphabet (like DNA's 4 letters), mismatched characters are common in the pattern, skips are small, and KMP's guaranteed linear scan (no wasted re-comparison) tends to win. This is why production text editors' "find" (and Unix `grep -F`) typically use Boyer-Moore or a hybrid, while bioinformatics tools lean on KMP/Aho-Corasick/suffix structures.

```python
def boyer_moore_search(text: str, pattern: str) -> list[int]:
    """Bad-character rule only (the simpler, still-effective half of Boyer-Moore)."""
    n, m = len(text), len(pattern)
    if m == 0:
        return []

    last_occurrence = {ch: i for i, ch in enumerate(pattern)}  # rightmost index per char
    matches = []
    shift = 0
    while shift <= n - m:
        j = m - 1
        while j >= 0 and pattern[j] == text[shift + j]:
            j -= 1
        if j < 0:
            matches.append(shift)
            shift += 1  # could use a good-suffix shift here for a bigger jump
        else:
            bad_char = text[shift + j]
            last = last_occurrence.get(bad_char, -1)
            shift += max(1, j - last)  # skip past the bad character's last occurrence
    return matches
    # Time: O(nm) worst case (rare, adversarial pattern/alphabet combos)
    # Time: O(n/m) best case — sublinear, because most mismatches skip m positions
    # Space: O(alphabet size + m) for the last-occurrence table
```

!!! warning "Worst case is still O(nm)"
    Like Rabin-Karp, Boyer-Moore trades a worst-case guarantee for excellent average/practical performance. KMP remains the answer when you need a hard O(n+m) bound regardless of input.

---

## Manacher's Algorithm (Longest Palindromic Substring)

### Mental Model

The brute-force way to find the longest palindromic substring expands around every possible center: O(n) centers x O(n) expansion each = O(n^2). Manacher's algorithm gets this to O(n) by reusing information from palindromes already found, the same "don't redo work you've already done" idea running through this whole page.

**The trick:** transform the string by inserting a separator between every character (e.g. `"abc"` -> `"^#a#b#c#$"`) so that even-length and odd-length palindromes are handled uniformly (every palindrome in the transformed string has odd length, centered on a real character). Then, while sweeping left to right and expanding around each center, maintain the **rightmost palindrome boundary found so far** `[L, R]` and its center `C`. For a new center `i` inside that boundary, its mirror position `2C - i` (already processed) gives a *lower bound* on how far `i`'s palindrome extends — because the region around `C` is itself a palindrome, so the palindrome-structure around the mirror position is reflected around `i`, at least up to the boundary `R`. Expansion only needs to continue checking *past* that lower bound, not from scratch.

```python
def longest_palindromic_substring(s: str) -> str:
    if not s:
        return ""

    # Transform: insert separators to unify even/odd-length palindromes
    t = "#" + "#".join(s) + "#"
    n = len(t)
    p = [0] * n  # p[i] = radius of the palindrome centered at i in t
    center = right = 0

    for i in range(n):
        if i < right:
            mirror = 2 * center - i
            p[i] = min(right - i, p[mirror])  # reuse work from the mirrored center

        # Attempt to expand past the reused lower bound
        while i - p[i] - 1 >= 0 and i + p[i] + 1 < n and t[i - p[i] - 1] == t[i + p[i] + 1]:
            p[i] += 1

        if i + p[i] > right:  # this palindrome extends further right than any found so far
            center, right = i, i + p[i]

    max_len = max(p)
    center_index = p.index(max_len)
    start = (center_index - max_len) // 2  # map back from transformed to original indices
    return s[start : start + max_len]
    # Time: O(n) — 'right' only ever moves forward, same amortized argument as
    #        KMP's text pointer and the Z-algorithm's window
    # Space: O(n) for the transformed string and the p array
```

**Why this belongs on this page:** it's the same structural trick as everywhere else here — KMP's failure function, the Z-algorithm's `[L,R]` window, and Manacher's `[L,R]` palindrome boundary are all instances of *"maintain the furthest-right progress made so far, and use it to avoid re-deriving information for positions still inside that progress."*

---

## Comparison Table

| Algorithm | Problem solved | Time | Space | Key mechanism |
|-----------|-----------------|------|-------|----------------|
| KMP ([basic page](string-matching.md)) | Single pattern search | O(n+m) | O(m) | Failure function (self-similarity) |
| Rabin-Karp ([basic page](string-matching.md)) | Single/multi pattern search | O(n+m) avg | O(1) | Rolling hash |
| **Aho-Corasick** | Many patterns, one pass | O(n + Σm + z) | O(Σm) | Trie + failure links (KMP generalized) |
| **Z-algorithm** | Single pattern search, or prefix-similarity queries | O(n+m) | O(n) | Z-array via `[L,R]` window reuse |
| **Suffix array** | Repeated substring queries on one text | O(n log n) build, O(m log n)/query | O(n) | Sorted suffixes → binary search |
| **Boyer-Moore** | Single pattern, large alphabet | O(n/m) best, O(nm) worst | O(alphabet+m) | Right-to-left scan + bad-character/good-suffix skips |
| **Manacher's** | Longest palindromic substring | O(n) | O(n) | `[L,R]` palindrome-boundary reuse |

Cross-reference: [String Matching (KMP & Rabin-Karp)](string-matching.md) covers the single-pattern baseline these all build on.

---

## Interview Follow-ups

1. **"When would you reach for Aho-Corasick instead of running Rabin-Karp with a hash set of patterns?"** — When you need a hard guarantee independent of hash collisions, or when you need to know exactly *which* pattern(s) matched at each position cheaply — Aho-Corasick's output links give you that for free during the scan.
2. **"How is the Z-algorithm related to KMP's failure function?"** — Both encode prefix-suffix self-similarity, but the Z-array gives the match length starting at *every* position directly, while KMP's `lps` array is defined in terms of *prefix* lengths ending at each position — different indexing convention, same underlying O(n) "don't re-scan matched text" guarantee.
3. **"Why would you build a suffix array instead of just running KMP for each query?"** — Amortization: building costs O(n log n) once, and after that every substring query is O(m log n) instead of O(n+m) — a clear win when you have many queries against a fixed, large text (e.g. a genome, a codebase search index).
4. **"Why does Boyer-Moore need both the bad-character and good-suffix rules?"** — The bad-character rule alone can produce a small or even negative shift in some cases (mitigated by taking `max(1, shift)` as shown above); the good-suffix rule provides an independent, always-safe shift amount, and production implementations take the larger of the two shifts.
5. **"Could you extend Manacher's algorithm to find all palindromic substrings, not just the longest?"** — Yes — the `p[]` array, once computed, already encodes the maximal palindrome radius at every center; summing `(p[i] + 1) // 2` over all centers (accounting for the transformed-string indexing) counts every palindromic substring in O(n) total, with no extra scanning.

---

## Key Takeaways

!!! success "Remember"
    1. **Aho-Corasick** = trie + failure links = KMP's failure function generalized to many patterns simultaneously. O(n + Σm + z) for scanning k patterns in one pass — dramatically better than k separate KMP runs.
    2. **Z-algorithm** computes, for every position, how much of the string's prefix matches starting there — an alternative O(n+m) single-pattern matcher, often more intuitive to derive than KMP.
    3. **Suffix array**: sort all suffixes once (O(n log n)), then answer substring/LCS queries via binary search (O(m log n) each) — the right trade for many queries against one fixed text.
    4. **Boyer-Moore** scans right-to-left and skips multiple characters per mismatch via bad-character/good-suffix rules — beats KMP in practice on large alphabets, but has no worst-case guarantee (O(nm)).
    5. **Manacher's algorithm** finds the longest palindromic substring in O(n) by reusing palindrome structure from a maintained `[L,R]` boundary — the same "don't redo already-known work" idea as KMP, the Z-algorithm, and Aho-Corasick, applied to a genuinely different problem shape.
