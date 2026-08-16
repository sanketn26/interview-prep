---
title: Tries (Prefix Trees)
description: Trie insert, search, and prefix search for autocomplete — with an interactive trie visualizer.
---

# Tries (Prefix Trees)

**Difficulty:** Medium | **Pattern Type:** String prefix indexing

[← DSA Overview](index.md) | [← Sorting](sorting.md) | [Next: Greedy Algorithms →](greedy.md)

---

## Why This Data Structure Exists

A hash set answers "is this exact word present?" in O(1) — but it can't answer "what words *start with* this prefix?" without scanning every entry. Autocomplete, spell-check, and IP routing all need fast **prefix** queries, not just exact-match queries.

A **trie** (from re**trie**val) restructures a set of strings so that every prefix is a real path in the tree, shared across every word with that prefix. Lookup and prefix search both cost O(L) — proportional to the query length, completely independent of how many words are stored.

---

## Mental Model

Each node represents one character position; a path from the root spells out a prefix. Words that share a prefix share the path — "car," "card," and "care" all reuse the c→a→r nodes and only branch afterward.

```
        (root)
        /    \
       c      d
       |      |
       a      o
      / \      \
     t   r      g*
     *   |
         [d*, e*]

* = end-of-word marker

Words stored: cat, car, card, care, dog
"car" is itself a word (marked) AND a prefix of "card"/"care" — the end
marker is a flag on the node, not something that removes the node's children.
```

The key insight: **a node existing does not mean it's a word.** "ca" is a valid path (shared prefix of "car"/"card"/"care"/"cat") but never marked as a complete word unless explicitly inserted.

---

## Interactive Trie Visualizer

<div class="sim-container">
  <div class="sim-title">🌳 Trie: Insert / Search</div>

  <div class="sim-controls">
    <input type="text" id="trie-input" placeholder="word" style="width:120px">
    <button class="sim-btn success" onclick="window._trie && window._trie.insert(document.getElementById('trie-input').value)">▶ Insert</button>
    <button class="sim-btn" onclick="window._trie && window._trie.search(document.getElementById('trie-input').value)">Search</button>
    <button class="sim-btn danger" onclick="window._trie && window._trie.reset()">Reset</button>
  </div>

  <canvas id="trie-canvas" style="width:100%;height:320px;"></canvas>

  <div style="margin:0.5rem 0;font-size:0.8rem">
    <span style="background:#37474f;padding:2px 8px;border-radius:4px;color:#fff">Node (not end-of-word)</span>
    <span style="background:#1b5e20;padding:2px 8px;border-radius:4px;color:#fff;margin-left:8px">End-of-word</span>
    <span style="background:#b71c1c;padding:2px 8px;border-radius:4px;color:#fff;margin-left:8px">On current path</span>
  </div>

  <div class="sim-log" id="trie-log"></div>
</div>

Preloaded with cat, car, card, care, dog, do — try inserting "cart" to see it branch off "car," or searching "ca" to see a valid-prefix-but-not-a-word result.

---

## Implementation

```python
class TrieNode:
    def __init__(self) -> None:
        self.children: dict[str, "TrieNode"] = {}
        self.is_end: bool = False


class Trie:
    def __init__(self) -> None:
        self.root = TrieNode()

    def insert(self, word: str) -> None:
        node = self.root
        for ch in word:
            if ch not in node.children:
                node.children[ch] = TrieNode()
            node = node.children[ch]
        node.is_end = True
        # Time: O(L) where L = len(word)  Space: O(L) new nodes worst case

    def search(self, word: str) -> bool:
        """Exact match — the full word must exist AND be marked as a word."""
        node = self._walk(word)
        return node is not None and node.is_end
        # Time: O(L)

    def starts_with(self, prefix: str) -> bool:
        """Prefix match — the path must exist, but no end-of-word requirement."""
        return self._walk(prefix) is not None
        # Time: O(L)

    def _walk(self, s: str) -> "TrieNode | None":
        node = self.root
        for ch in s:
            if ch not in node.children:
                return None
            node = node.children[ch]
        return node
```

### Autocomplete (Collect All Words Under a Prefix)

```python
class AutocompleteTrie(Trie):
    def autocomplete(self, prefix: str, limit: int = 5) -> list[str]:
        """Walk to the prefix's node, then DFS to collect completions."""
        node = self._walk(prefix)
        if node is None:
            return []

        results: list[str] = []

        def dfs(node: "TrieNode", path: str) -> None:
            if len(results) >= limit:
                return
            if node.is_end:
                results.append(path)
            for ch, child in sorted(node.children.items()):  # alphabetical order
                dfs(child, path + ch)

        dfs(node, prefix)
        return results
        # Time: O(P + N) where P = len(prefix), N = nodes visited in the matching subtree
        # In production, each trie node also caches its top-k most-searched completions
        # to avoid a DFS per keystroke — see "Interview Follow-ups" below.
```

---

## When to Use Which

| Scenario | Use | Why |
|----------|-----|-----|
| Exact-match membership only | **Hash set** | O(1) average, simpler, no prefix capability needed |
| Prefix search / autocomplete / "starts with" | **Trie** | O(L) regardless of dataset size; hash set would need a full scan |
| Need sorted iteration of stored strings | **Trie (DFS gives lexicographic order)** or sorted structure | Trie's alphabetical child order falls out for free |
| Very large alphabet (e.g., Unicode) or sparse branching | **Trie with a hash map for children**, not a fixed array | Array-per-node (26 slots) wastes memory outside small fixed alphabets |
| Memory-constrained, many long shared prefixes | **Trie** | Shared prefixes are stored once — better than a hash set of full strings when overlap is high |
| Fuzzy/edit-distance search | **Trie + DFS with a distance budget**, or a specialized index (BK-tree) | Plain trie only does exact prefix matching |
| IP routing / longest-prefix match | **Trie (bitwise, "radix trie")** | Exactly the same structure applied to binary strings |

---

## Common Problems and Patterns

### Word Search II (Trie-Guided Grid DFS)

```python
def find_words(board: list[list[str]], words: list[str]) -> list[str]:
    """Build a trie of all target words; DFS the grid but only down paths the trie allows —
    this prunes grid search the same way trie prefixes prune string search."""
    trie = Trie()
    for w in words:
        trie.insert(w)

    rows, cols = len(board), len(board[0])
    found: set[str] = set()

    def dfs(r: int, c: int, node: TrieNode, path: str) -> None:
        if r < 0 or r >= rows or c < 0 or c >= cols or board[r][c] == "#":
            return
        ch = board[r][c]
        if ch not in node.children:
            return  # prune: no word in the trie continues this way
        nxt = node.children[ch]
        path += ch
        if nxt.is_end:
            found.add(path)

        board[r][c] = "#"  # mark visited
        for dr, dc in [(1,0),(-1,0),(0,1),(0,-1)]:
            dfs(r + dr, c + dc, nxt, path)
        board[r][c] = ch  # undo (backtracking)

    for r in range(rows):
        for c in range(cols):
            dfs(r, c, trie.root, "")

    return list(found)
    # Time: O(rows·cols·4^L) worst case, heavily pruned by trie membership checks
```

### Longest Word in Dictionary Built One Character at a Time

```python
def longest_word(words: list[str]) -> str:
    """Find the longest word such that every prefix of it is also in the word list."""
    trie = Trie()
    for w in words:
        trie.insert(w)

    best = ""

    def dfs(node: TrieNode, path: str) -> None:
        nonlocal best
        if len(path) > len(best) or (len(path) == len(best) and path < best):
            best = path
        for ch in sorted(node.children):
            child = node.children[ch]
            if child.is_end:  # only descend through nodes that are themselves complete words
                dfs(child, path + ch)

    dfs(trie.root, "")
    return best
    # Time: O(sum of word lengths) to build + O(N) to DFS the valid subtree
```

### Replace Words (Shortest Root Substitution)

```python
def replace_words(dictionary: list[str], sentence: str) -> str:
    """Replace each word with the shortest dictionary root that prefixes it."""
    trie = Trie()
    for root in dictionary:
        trie.insert(root)

    def find_root(word: str) -> str:
        node = trie.root
        prefix = ""
        for ch in word:
            if ch not in node.children:
                return word  # no root found — keep original word
            prefix += ch
            node = node.children[ch]
            if node.is_end:
                return prefix  # shortest root, since we stop at the first match
        return word

    return " ".join(find_root(w) for w in sentence.split())
    # Time: O(total dictionary length + total sentence length)
```

---

## Complexity Summary

| Operation | Time | Space |
|-----------|------|-------|
| Insert | O(L) | O(L) new nodes worst case |
| Search (exact word) | O(L) | O(1) extra |
| Prefix search (`starts_with`) | O(L) | O(1) extra |
| Autocomplete (collect k completions) | O(P + nodes in subtree) | O(k) for results |
| Total space for n words, avg length L | O(n·L) worst case, less with shared prefixes | Shared prefixes reduce this substantially |

L = length of the word/prefix being processed. Crucially, **none of these depend on how many words are stored** — only on the query length.

---

## Interview Follow-ups

1. **"How would you make autocomplete fast at scale (millions of queries/sec)?"** — Cache the top-k most frequent completions at each node (updated periodically, not per-query), so a lookup is O(P) to reach the node plus O(1) to read the cached list — no DFS per keystroke.
2. **"Trie vs hash set for a spell-checker?"** — Trie additionally gives you "did-you-mean" suggestions cheaply (DFS near the failed path) and prefix-based fuzzy matching; a hash set only answers yes/no.
3. **"How do you handle a huge alphabet (Unicode) without wasting memory?"** — Use a hash map for `children` (as above) instead of a fixed-size array — pay for only the branches that exist.
4. **"How would you delete a word from a trie?"** — Unmark `is_end`, then walk back up removing nodes that have no children and aren't themselves end-of-word — otherwise you'd delete shared prefixes still needed by other words.

---

## Key Takeaways

!!! success "Remember"
    1. A trie makes every **prefix** a real, shared path — words with common prefixes share nodes.
    2. Insert/search/prefix-search are all **O(L)**, independent of how many words are stored — the win over a hash set is prefix queries, not exact match speed.
    3. **A node existing ≠ a complete word** — `is_end` is a separate flag; "ca" can be a valid path without being a stored word.
    4. Reach for a trie on the clue **"autocomplete," "prefix," "starts with,"** or grid/string search where you can prune using a fixed dictionary (Word Search II).
    5. Production autocomplete caches top-k completions per node instead of DFS-ing on every keystroke.
