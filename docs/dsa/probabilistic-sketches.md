---
title: Probabilistic Sketches & Compact Filters
description: Cuckoo / quotient / XOR filters, Count-Min Sketch, t-digest, and MinHash — what you reach for after Bloom filters.
---

# Probabilistic Sketches & Compact Filters

**Difficulty:** Hard | **Pattern Type:** Probabilistic data structures / streaming summaries

[← DSA Overview](index.md) | [← Advanced Hashing](hashing-techniques.md) | [Next: Skip Lists & Range Trees →](skip-lists-fenwick-segment-trees.md)

!!! note "Read Bloom first"
    [Advanced Hashing](hashing-techniques.md) covers Bloom filters, counting Bloom filters, cuckoo *hashing*, and HyperLogLog. This page is the next interview: **delete without 4-bit counters**, **frequency**, **percentiles**, **set similarity**. Cuckoo *filter* is not cuckoo hashing.

---

## Why These Structures Exist

A Bloom filter answers one question: *might this key be in the set?* That is the wrong tool for the next four questions production systems actually ask:

```
"Was this IP in the blocklist, and can I *remove* it when the ban expires?"
  → Bloom cannot delete. Counting Bloom can, at ~4× memory.
    A cuckoo filter stores fingerprints and deletes in place.

"How many times did this URL appear in the last billion events?"
  → Bloom is boolean. Count-Min Sketch estimates frequency.

"What is p99 latency this minute, without storing every sample?"
  → HyperLogLog counts *distinct*. t-digest / HDRHistogram summarize *distribution*.

"Are these two user-item sets similar enough to recommend?"
  → MinHash estimates Jaccard without materializing the intersection.
```

Every structure on this page makes the same deal Bloom does — **bounded error, orders-of-magnitude less memory** — for a different query.

!!! tip "Mental Model"
    Bloom / compact filters = *membership*. Count-Min = *how often*. t-digest = *where in the distribution*. MinHash = *how alike two sets are*. If you cannot name the query, you do not have a sketch yet.

---

## Compact Membership Filters (after Bloom)

### Cuckoo filter

A **cuckoo filter** stores a short **fingerprint** of each item in a table of buckets (typically 2–4 slots per bucket). Lookup hashes the item to two candidate buckets (same kick-out idea as [cuckoo hashing](hashing-techniques.md#cuckoo-hashing)) and checks whether *that fingerprint* lives in either bucket.

```
Bloom:          bits only. Cannot delete. False positives. Tiny.
Cuckoo hashing: stores the full key. Exact. Deletes. Not a filter.
Cuckoo filter:  stores a fingerprint (e.g. 8–16 bits), not the key.
                Can delete that fingerprint. False positives. Insert
                can *fail* when the table is too full (unlike Bloom).
```

```
Insert "banned-ip":
  fingerprint f = hash("banned-ip") low 8 bits
  buckets h1, h2 = two candidate rows
  if a slot in h1 or h2 is empty → store f there
  else kick a victim fingerprint to *its* other bucket (cuckoo walk)
  if the walk exceeds a limit → insert fails; grow / rehash
```

**Why delete works:** you remove the fingerprint from its slot. You do not clear a bit that other keys share. The cost is false positives (a different item can hash to the same fingerprint in the same buckets) and a load-factor ceiling — typical sweet spot is ~95% with 4 slots/bucket, much better occupancy than 2-slot cuckoo *hashing*.

```python
import hashlib


class CuckooFilter:
    """Fingerprint table. Lookup is exact for stored fingerprints, probabilistic for keys."""

    def __init__(self, num_buckets: int = 32, slots: int = 4, fp_bits: int = 8, max_kicks: int = 32):
        self.n = num_buckets
        self.slots = slots
        self.fp_mask = (1 << fp_bits) - 1
        self.max_kicks = max_kicks
        self.table: list[list[int | None]] = [[None] * slots for _ in range(num_buckets)]

    def _fp(self, item: str) -> int:
        h = int(hashlib.md5(item.encode()).hexdigest(), 16)
        return (h & self.fp_mask) or 1  # fingerprint 0 reserved for empty

    def _h1(self, item: str) -> int:
        h = int(hashlib.md5(item.encode()).hexdigest(), 16)
        return (h >> 16) % self.n

    def _h2(self, bucket: int, fp: int) -> int:
        return (bucket ^ (fp * 0x5bd1e995)) % self.n

    def insert(self, item: str) -> bool:
        fp = self._fp(item)
        i1 = self._h1(item)
        i2 = self._h2(i1, fp)
        for i in (i1, i2):
            for s, occ in enumerate(self.table[i]):
                if occ is None:
                    self.table[i][s] = fp
                    return True
        i = i1
        for _ in range(self.max_kicks):
            s = 0
            fp, self.table[i][s] = self.table[i][s], fp
            i = self._h2(i, fp)
            for s, occ in enumerate(self.table[i]):
                if occ is None:
                    self.table[i][s] = fp
                    return True
        return False  # table too full — unlike Bloom, insert can fail

    def might_contain(self, item: str) -> bool:
        fp = self._fp(item)
        i1 = self._h1(item)
        i2 = self._h2(i1, fp)
        return fp in self.table[i1] or fp in self.table[i2]

    def delete(self, item: str) -> bool:
        """Safe only for an item you previously inserted (same as counting Bloom)."""
        fp = self._fp(item)
        i1 = self._h1(item)
        i2 = self._h2(i1, fp)
        for i in (i1, i2):
            for s, occ in enumerate(self.table[i]):
                if occ == fp:
                    self.table[i][s] = None
                    return True
        return False
        # Time: O(1) typical; insert worst case O(max_kicks)
```

**Interview contrast:** pick cuckoo filter when you need **delete** and still want compact membership. Pick Bloom when the set only grows, insert must never fail, and you want the smallest possible "no". Pick counting Bloom if you already have Bloom in production and only need delete.

### Quotient filter

Split a hash into **quotient** (high bits → bucket index) and **remainder** (stored in the bucket). Remainders in a run are kept **sorted**. That layout is **cache-friendly** (sequential remainders, not k random bit probes) and **mergeable** (two filters over the same universe concatenate like sorted lists). Production code packs those runs into one array with three metadata bits (`is_occupied`, `is_continuation`, `is_shifted`); the version below keeps one sorted remainder list per quotient so the split is obvious.

```
hash = 0b 000101 | 11001011
         quotient   remainder
         bucket 5   store 0xCB in bucket 5's run
```

```python
import hashlib
from bisect import bisect_left, insort


class QuotientFilter:
    """Quotienting: bucket = high bits, store only the remainder. Soft FPs, deleteable."""

    def __init__(self, q_bits: int = 10, r_bits: int = 8):
        self.n_buckets = 1 << q_bits
        self.r_bits = r_bits
        self.r_mask = (1 << r_bits) - 1
        self.runs: list[list[int]] = [[] for _ in range(self.n_buckets)]

    def _qr(self, item: str) -> tuple[int, int]:
        h = int(hashlib.md5(item.encode()).hexdigest(), 16)
        remainder = h & self.r_mask
        quotient = (h >> self.r_bits) % self.n_buckets
        return quotient, remainder

    def insert(self, item: str) -> None:
        q, r = self._qr(item)
        run = self.runs[q]
        i = bisect_left(run, r)
        if i == len(run) or run[i] != r:
            insort(run, r)
        # Time: O(run length) — runs stay short at reasonable load

    def might_contain(self, item: str) -> bool:
        q, r = self._qr(item)
        run = self.runs[q]
        i = bisect_left(run, r)
        return i < len(run) and run[i] == r

    def delete(self, item: str) -> bool:
        q, r = self._qr(item)
        run = self.runs[q]
        i = bisect_left(run, r)
        if i < len(run) and run[i] == r:
            run.pop(i)
            return True
        return False
```

Two filters with the same `(q_bits, r_bits)` merge by merging each bucket's sorted remainder lists — that is the property Bloom does not have.

### XOR filter (static)

Build **once** from a known set. Fingerprints sit in an array `B` such that `fp(x) = B[h1(x)] XOR B[h2(x)] XOR B[h3(x)]`. Lookup is three reads and an XOR — typically **~20–30% smaller than Bloom** at the same FPR. Construction *peels* a 3-uniform hypergraph: repeatedly take a cell that only one remaining key uses, remember that assignment, and set `B` in reverse so the XOR identity holds.

No incremental insert. If peeling fails, retry with a new seed. Frozen dictionaries, shipped blocklists, SSTable bloom-replacements.

```python
import hashlib


def _u64(item: str, seed: int) -> int:
    digest = hashlib.sha1(f"{seed}:{item}".encode()).digest()
    return int.from_bytes(digest[:8], "little")


class XorFilter:
    def __init__(self, keys: list[str], seed: int = 1):
        keys = list(dict.fromkeys(keys))  # unique, stable
        self.B: list[int] = []
        self.n_part = 0
        self.seed = seed
        if not keys:
            return
        n = len(keys)
        m = int(1.23 * n) + 33
        while m % 3:
            m += 1
        part = m // 3
        for attempt in range(16):
            s = seed + attempt
            triples = []
            for k in keys:
                h = _u64(k, s)
                triples.append((
                    h % part,
                    part + ((h >> 21) % part),
                    2 * part + ((h >> 42) % part),
                    (h & 0xFF) or 1,
                ))
            placed = self._peel(m, triples)
            if placed is not None:
                self.B = placed
                self.n_part = part
                self.seed = s
                return
        raise RuntimeError("XOR filter: peeling failed — grow m or change seed")

    def _peel(self, m: int, triples: list[tuple[int, int, int, int]]) -> list[int] | None:
        count = [0] * m
        at: list[list[int]] = [[] for _ in range(m)]
        for i, (a, b, c, _) in enumerate(triples):
            for x in (a, b, c):
                count[x] += 1
                at[x].append(i)
        queue = [i for i in range(m) if count[i] == 1]
        order: list[tuple[int, int]] = []  # (key index, cell we peel it from)
        used = [False] * len(triples)
        qi = 0
        while qi < len(queue):
            cell = queue[qi]
            qi += 1
            if count[cell] != 1:
                continue
            kid = next((i for i in at[cell] if not used[i]), None)
            if kid is None:
                continue
            used[kid] = True
            order.append((kid, cell))
            for x in triples[kid][:3]:
                count[x] -= 1
                if count[x] == 1:
                    queue.append(x)
        if len(order) != len(triples):
            return None
        B = [0] * m
        for kid, cell in reversed(order):
            a, b, c, fp = triples[kid]
            B[cell] = fp ^ B[a] ^ B[b] ^ B[c]  # cell is still 0, so this sets it
        return B

    def might_contain(self, item: str) -> bool:
        if not self.B:
            return False
        h = _u64(item, self.seed)
        p = self.n_part
        a, b, c = h % p, p + ((h >> 21) % p), 2 * p + ((h >> 42) % p)
        fp = (h & 0xFF) or 1
        return (self.B[a] ^ self.B[b] ^ self.B[c]) == fp
        # Time: O(1). Space: ~1.23 fingerprints per key, built once.
```

---

## Count-Min Sketch — "how often?"

### Why it exists

HyperLogLog answers *how many distinct*. It cannot tell you that `/api/checkout` appeared 4.2 million times. A hash map of counts is exact and O(distinct keys). At a billion distinct keys that map is the product.

Count-Min Sketch (CMS) is a **d × w** grid of counters. Each incoming item increments **one cell per row**, using a different hash per row. The estimate for a key is the **minimum** of those `d` cells — every cell is an overestimate (collisions only add), so the smallest is the least polluted.

```
d=3 rows, w=8 columns. Add "cat", then "dog", then "cat":

Row 0 hashes: cat→2, dog→5
Row 1 hashes: cat→6, dog→1
Row 2 hashes: cat→0, dog→4

After those adds, query "cat" = min(row0[2], row1[6], row2[0])
  which is at least 2 (true count) and maybe more if something else
  collided into all three cells — that's the overestimate.
```

**Never underestimates** (for non-negative updates). Overestimate is bounded in probability by ε with `w ≈ e/ε` and `d ≈ ln(1/δ)`. Heavy hitters (keys whose count exceeds a fraction of the stream) are the usual query — you do not scan the sketch for "all keys"; you query candidates or keep a separate heap of current heavy keys.

### Interactive Count-Min Sketch

<div class="sim-container">
  <div class="sim-title">📊 Count-Min Sketch: increment and query</div>

  <div class="sim-stats">
    <div class="sim-stat"><div class="sim-stat-label">Adds</div><div class="sim-stat-value" id="cms-adds">0</div></div>
    <div class="sim-stat"><div class="sim-stat-label">Last estimate</div><div class="sim-stat-value" id="cms-est">—</div></div>
    <div class="sim-stat"><div class="sim-stat-label">True count</div><div class="sim-stat-value" id="cms-true">—</div></div>
  </div>

  <div class="sim-controls">
    <input type="text" id="cms-word" placeholder="word..." style="max-width:160px" />
    <button class="sim-btn success" onclick="window._cms && window._cms.add(document.getElementById('cms-word').value)">➕ Add</button>
    <button class="sim-btn" onclick="window._cms && window._cms.query(document.getElementById('cms-word').value)">🔍 Query</button>
    <button class="sim-btn danger" onclick="window._cms && window._cms.reset()">Reset</button>
  </div>

  <div id="cms-grid" style="margin:1rem 0;"></div>

  <div style="margin:0.5rem 0;font-size:0.8rem">
    <span style="background:#1e1e3a;border:2px solid #3a3a6a;padding:2px 8px;border-radius:4px;color:#e0e0ff">Counter</span>
    <span style="background:#e65100;padding:2px 8px;border-radius:4px;color:#fff;margin-left:8px">Just updated / queried</span>
  </div>

  <div class="sim-log" id="cms-log"></div>
</div>

Add `cat` twice and `dog` once, then query `cat`. The estimate is ≥ 2. Query a word you never added — you may still see a small positive (collision). That leftover is why the answer is **min across rows**, not sum or average.

```python
import hashlib


class CountMinSketch:
    def __init__(self, depth: int = 4, width: int = 64):
        self.d = depth
        self.w = width
        self.table = [[0] * width for _ in range(depth)]

    def _idx(self, item: str, row: int) -> int:
        h = int(hashlib.md5(f"{row}:{item}".encode()).hexdigest(), 16)
        return h % self.w

    def add(self, item: str, count: int = 1) -> None:
        for r in range(self.d):
            self.table[r][self._idx(item, r)] += count
        # Time: O(d)

    def estimate(self, item: str) -> int:
        return min(self.table[r][self._idx(item, r)] for r in range(self.d))
        # Time: O(d)
        # Always ≥ true count (non-negative updates). Never a false "zero"
        # if the item was added — the analogue of Bloom's no false negatives,
        # for counts.
```

**Production trap:** CMS overestimates popular keys *and* unpopular keys. For heavy-hitters detection that is usually fine (you would rather flag a slightly inflated hot key than miss it). For "charge this user per request" it is not — do not bill from a sketch.

---

## t-digest & HDR Histogram — "where is p99?"

Averages lie; percentiles need a **distribution**. Storing every sample for a 100k QPS service is another product.

### HDR Histogram (and a simpler log-uniform approximation)

The real **HDR Histogram** (HdrHistogram) fixes the number of **significant figures** you care about (e.g. 3 digits from 1 µs to 1 hour) by laying buckets out as exponent ranges each split into a fixed number of linear sub-buckets — that layout is what delivers the "N sig figs everywhere" guarantee, and it's more involved than a single log formula. Record is O(1): map the value onto a bucket index and increment. p99 is a walk from the high end until 1% of counts remain.

```
Latencies in µs, 3 significant figures:
  1–10    → 1 µs buckets
  10–100  → 1 µs still (3 sig figs)
  100–1000 → 10 µs buckets
  ...
You never need a bucket per nanosecond out at 30 seconds.
```

This is what you want for **service latency** when the range is known (1 µs … 60 s) and you need stable p99/p999 in the dashboard. Merge across hosts is adding bucket arrays.

Below is a much simpler **log-uniform histogram** — bucket boundaries spaced evenly in log10 space — that captures the same idea (exponentially growing bucket widths, O(1) record, mergeable) without the real HDR bucket/sub-bucket layout. It is *not* significant-figure accurate: at `sig_digits=2` adjacent buckets differ by a constant ratio (10^(1/100) ≈ 2.3%), not by "2 significant digits" the way true HDR buckets are, so treat `sig_digits` here as a resolution knob, not a precision guarantee. Reach for a real HdrHistogram library when the interview or the dashboard needs the actual guarantee.

```python
import math


class LogUniformHistogram:
    """Log10-uniform buckets (constant ratio between adjacent buckets), not a real HDR Histogram. Values ≥ 1."""

    def __init__(self, highest: int = 10**7, sig_digits: int = 2):
        self.scale = 10 ** sig_digits          # 100 buckets per decade at sig_digits=2
        self.counts = [0] * (int(math.log10(highest) * self.scale) + 2)
        self.n = 0

    def _idx(self, v: int) -> int:
        v = max(1, v)
        return min(int(math.log10(v) * self.scale), len(self.counts) - 1)

    def _value_at(self, idx: int) -> int:
        return max(1, int(round(10 ** (idx / self.scale))))

    def record(self, value: int) -> None:
        self.counts[self._idx(int(value))] += 1
        self.n += 1
        # Time: O(1)

    def merge(self, other: "LogUniformHistogram") -> None:
        assert len(other.counts) == len(self.counts)
        for i, c in enumerate(other.counts):
            self.counts[i] += c
        self.n += other.n

    def percentile(self, q: float) -> int:
        if self.n == 0:
            return 0
        target = q * self.n
        seen = 0
        for i, c in enumerate(self.counts):
            seen += c
            if seen >= target:
                return self._value_at(i)
        return self._value_at(len(self.counts) - 1)
        # Time for percentile: O(buckets) ≪ O(samples)
```

### t-digest

A list of **centroids** (mean × weight) that *cover* the distribution. New samples merge into nearby centroids; the algorithm keeps more centroids in the **tails** than in the middle — so p99/p999 stay accurate while the body of the distribution is compressed.

```
Samples: 12, 13, 14, 800, 900, 1100
Centroids after compression (schematic):
  (13 × 3)     — body collapsed
  (800 × 1), (900 × 1), (1100 × 1)  — tails kept
p99 interpolates between the high-end centroids, not from a single average.
```

**t-digest vs HDRHistogram:** t-digest has no fixed range (good for unbounded values, mergeable across arbitrary streams). HDRHistogram is faster to record and simpler to reason about when you already know min/max (latency). Neither recovers the original samples. You **cannot** compute an exact p99 from already-averaged rollups — that is why [metrics & monitoring](../system-design-exercises/metrics-monitoring.md) stores sketches at write time.

```python
class TDigest:
    """Merging centroids with a scale function: more capacity in the tails than the body.

    Production: use a battle-tested t-digest. This is the algorithm, not the paper's
    full interpolation / combined-buffer variant.
    """

    def __init__(self, compression: float = 50.0):
        self.delta = compression
        self.centroids: list[list[float]] = []  # [mean, count]

    def add(self, x: float, w: int = 1) -> None:
        self.centroids.append([float(x), float(w)])
        if len(self.centroids) > self.delta * 4:
            self.compress()

    def _cap(self, q: float, n: float) -> float:
        # Smaller cap near q=0 and q=1 → tails stay unmerged.
        return max(1.0, self.delta * 4 * q * (1 - q))

    def compress(self) -> None:
        if not self.centroids:
            return
        self.centroids.sort()
        n = sum(c[1] for c in self.centroids)
        out: list[list[float]] = []
        seen = 0.0
        for mean, w in self.centroids:
            q = (seen + w / 2) / n
            if out and out[-1][1] + w <= self._cap(q, n):
                m0, w0 = out[-1]
                out[-1] = [(m0 * w0 + mean * w) / (w0 + w), w0 + w]
            else:
                out.append([mean, w])
            seen += w
        self.centroids = out

    def quantile(self, q: float) -> float:
        self.compress()
        if not self.centroids:
            return float("nan")
        n = sum(c[1] for c in self.centroids)
        target = q * n
        seen = 0.0
        for mean, w in self.centroids:
            seen += w
            if seen >= target:
                return mean
        return self.centroids[-1][0]
```

---

## MinHash — "how similar are these sets?"

Jaccard similarity of two sets is `|A ∩ B| / |A ∪ B|`. Computing it exactly means storing both sets. MinHash: hash every element, keep the **k smallest hash values**. The fraction of matching minima estimates Jaccard.

```
A = {cat, dog, fox}     min-hashes (k=2, schematic): [17, 44]
B = {cat, dog, owl}     min-hashes:                   [17, 51]
Intersection of signatures: 1/2  →  estimated Jaccard 0.5
True Jaccard = 2/4 = 0.5
```

This is the engine behind **near-duplicate detection** (pages, papers), **collaborative-filter "users who look like you"**, and LSH (band the k hashes so similar sets collide in a table).

```python
import hashlib


def _h(item: str) -> int:
    return int(hashlib.sha1(item.encode()).hexdigest(), 16)


def minhash(items: set[str], k: int = 128) -> tuple[int, ...]:
    """k independent hashes approximated by (h + i * h2) — same trick as Bloom."""
    sig = [2**64] * k
    for item in items:
        a, b = _h(item + ":a"), _h(item + ":b")
        for i in range(k):
            sig[i] = min(sig[i], (a + i * b) % (2**64))
    return tuple(sig)


def estimated_jaccard(sig_a: tuple[int, ...], sig_b: tuple[int, ...]) -> float:
    return sum(x == y for x, y in zip(sig_a, sig_b)) / len(sig_a)
    # Time to build: O(|set| · k). Compare two sets: O(k), independent of set size.
```

**Error:** standard error shrinks as `1/√k`. k=128 is a common default (~few percent). MinHash does **not** estimate counts or membership of a single key — wrong sketch.

---

## When to Use Which

| Question | Structure | Error you accept |
|----------|-----------|------------------|
| Might this key be in a growing set? Insert must never fail | [Bloom filter](hashing-techniques.md) | False positives; no delete |
| Same, but keys get removed | Cuckoo filter (or counting Bloom) | False positives; insert can fail when full |
| Frozen set, smallest "maybe" | XOR filter | No incremental insert |
| Cache-friendly / mergeable membership | Quotient filter | Implementation complexity |
| How often did this key appear? | Count-Min Sketch | Overestimate; never underestimate |
| How many *distinct*? | [HyperLogLog](hashing-techniques.md) | ±~1% cardinality, no identities |
| p99 of a latency stream | HDRHistogram (known range) or t-digest | Approximate quantile |
| Are two sets similar? | MinHash | Approximate Jaccard |

---

## Worked Example With Numbers

**Heavy URLs in a 10 GB access log (≈50M lines), find keys above 0.1% of traffic.**

Exact map: 50M string keys at ~80 bytes ≈ 4 GB if every URL is unique — possible, painful on a 8 GB box, and you still pay hash-map overhead.

CMS with ε=0.001, δ=0.01: `w ≈ e/0.001 ≈ 2718`, `d ≈ ln(100) ≈ 5` → ~14k integer counters ≈ **56 KB**. Query each candidate URL (or keep a heap of current heavies while streaming). A key whose true count is 0.1% of 50M = 50k will estimate ≥ 50k; collisions may inflate it, which is conservative for "page this URL."

If the follow-up is "and p99 latency of those requests," that is a **t-digest per heavy URL** or one HDRHistogram, not a bigger CMS.

---

## Interview Follow-ups

1. **"Cuckoo filter vs cuckoo hashing?"** — Hashing stores the key (exact, table of keys). Filter stores a fingerprint (probabilistic membership, compact, deletable). Do not mix them up.
2. **"Why min in Count-Min, not mean?"** — Every cell is biased **up**. The mean of biased-up values is still biased up; the min is the least-biased overestimate. A min of overestimates cannot go below the truth for non-negative adds.
3. **"Can CMS underestimate?"** — Not for non-negative increments. Conserved-decay / negative updates (some count-mean-min variants) can. If the interviewer says "deletes in the stream," say you need a different estimator or an extra conservative margin.
4. **"Why can't I roll up p99 from five-minute averages?"** — Percentiles are not linear. Average of p99s is not p99; p99 of averages hides bursts. Store a histogram/t-digest in each time bucket and merge those.
5. **"MinHash vs HyperLogLog for 'unique users who saw both campaigns'?"** — HLL union is cheap (`max` of registers) and estimates `|A ∪ B|`. Intersection via inclusion-exclusion on HLLs is noisy. MinHash signatures compare Jaccard directly. Pick the query: cardinality of a union → HLL; similarity of two sets → MinHash.

---

## Key Takeaways

!!! success "Remember"
    1. **Cuckoo filter** = fingerprints + cuckoo buckets. Deletes. Insert can fail. Not cuckoo hashing.
    2. **XOR filter** is the smallest membership structure for a *static* set; Bloom still wins if the set grows.
    3. **Count-Min Sketch** overestimates frequency; `min` across rows is the whole idea.
    4. **t-digest / HDRHistogram** are how you keep p99 without storing samples — not HLL, not CMS.
    5. **MinHash** estimates Jaccard in O(k) independent of set size. Match the sketch to the question.

**Next:** [Skip Lists, Fenwick & Segment Trees](skip-lists-fenwick-segment-trees.md) — the *exact* log-time structures you use when approximation is not allowed.
