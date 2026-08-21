---
title: Advanced Hashing Techniques
description: Bloom filters, counting Bloom filters, cuckoo hashing, and HyperLogLog with an interactive Bloom filter visualizer.
---

# Advanced Hashing Techniques

**Difficulty:** Hard | **Pattern Type:** Probabilistic data structures / space-efficient hashing

[← DSA Overview](index.md) | [← String Matching](string-matching.md) | [Next: Probabilistic Sketches →](probabilistic-sketches.md)

---

## Why These Structures Exist

A regular hash set answers "have I seen this exact key?" exactly, but it pays for that exactness with O(n) space — one full entry per key. At scale, that's a real cost: deduplicating a billion-URL crawl frontier, checking "might this key exist before I do an expensive disk read," or counting how many distinct users hit an endpoint today.

The structures on this page all make the same trade: **give up exactness, in a well-understood and bounded way, in exchange for orders-of-magnitude less memory.** Each one exists because a specific caller can tolerate a specific kind of imprecision:

- **Bloom filter** — tolerates false positives, never false negatives. Used as a cheap pre-check before an expensive lookup.
- **Counting Bloom filter** — same, but also supports deletion.
- **Cuckoo hashing** — a hash table layout, not a probabilistic filter, but it solves the same "space-efficient membership + deletion" problem with a different mechanism, and interviewers often ask you to contrast it with Bloom filters.
- **HyperLogLog** — tolerates a small, bounded percentage error on a *count*, in exchange for using almost no memory regardless of how large the count is.

---

## Bloom Filter

### Mental Model

A Bloom filter is a bit array of size `m`, all zeros to start, plus `k` independent hash functions. To **add** an item, hash it `k` ways and set those `k` bits to 1. To **query** an item, hash it the same `k` ways and check whether all `k` bits are set.

```
Add "cat":   hash1("cat")=2, hash2("cat")=5, hash3("cat")=9  → set bits 2, 5, 9
Add "dog":   hash1("dog")=1, hash2("dog")=5, hash3("dog")=7  → set bits 1, 5, 7

Bit array: 0 1 1 0 0 1 0 1 0 1 0 ...
             ^ ^         ^   ^ ^
             1 2         5   7 9

Query "cat": check bits 2, 5, 9 → all 1 → "possibly present"
Query "fox": hash1=1, hash2=7, hash3=9 → bits 1,7,9 all happen to be 1 (set by
             cat and dog combined) → "possibly present" — but fox was NEVER added.
             This is a FALSE POSITIVE.
Query "owl": hash1=0, hash2=3, hash3=9 → bit 0 is 0 → "definitely NOT present"
             (bit 0 was never set by anything, so owl can't have set it either)
```

The asymmetry is the entire point: **a "no" answer is a mathematical certainty. A "yes" answer is a probabilistic maybe.** That only works in one direction because setting a bit is a one-way, lossy operation — once bit 5 is set by both "cat" and "dog", there's no way to tell which item (or which combination) set it. This is also *why* a Bloom filter can't support deletion: clearing a bit for "cat" might also clear a bit that "dog" still depends on.

### Sizing Formula

Given `n` expected items and a target false-positive rate `p`, the optimal bit array size and number of hash functions are:

```
m = -(n · ln p) / (ln 2)²        # bits needed
k = (m / n) · ln 2               # optimal number of hash functions
```

**Intuition without the derivation:** more bits per item (`m/n`) lowers the false-positive rate, but there's a sweet spot for `k` — too few hash functions and each item doesn't spread its "signal" enough; too many and you saturate the bit array with 1s faster than necessary, making every query more likely to hit an all-set false positive.

### Use Cases

- **Databases (e.g. Cassandra, HBase, RocksDB):** before doing a disk read for a key, check a Bloom filter of "keys that exist in this SSTable" — a "definitely not present" answer skips the disk I/O entirely; a "maybe present" answer falls through to the real (expensive) lookup.
- **Web crawlers:** "have I already queued this URL?" — a Bloom **false positive** means you skip a URL that was never added, so you **miss a page**. Bloom filters have **no false negatives**: if the filter says "no," the URL is definitely not in the set, so you will not skip a URL you already queued. The trade at crawl scale is missing some pages, not re-crawling.
- **CDN / cache layers:** "has this content ever been requested before?" to avoid caching one-hit-wonders (cache admission policies).
- **Malicious URL / password blocklists** (e.g. browsers checking against a huge "known bad" list without downloading it all): a Bloom filter compresses the list; false positives trigger a slower authoritative check.

---

## Interactive Bloom Filter Visualizer

<div class="sim-container">
  <div class="sim-title">💧 Bloom Filter: Bit Array Fill + Membership Query</div>

  <div class="sim-stats">
    <div class="sim-stat"><div class="sim-stat-label">Items Added</div><div class="sim-stat-value" id="bloom-added">0</div></div>
    <div class="sim-stat"><div class="sim-stat-label">Est. False-Positive Rate</div><div class="sim-stat-value" id="bloom-fpr">0.0%</div></div>
  </div>

  <div class="sim-controls">
    <input type="text" id="bloom-word" placeholder="word..." style="max-width:160px" />
    <button class="sim-btn success" onclick="window._bloom && window._bloom.add(document.getElementById('bloom-word').value)">➕ Add</button>
    <button class="sim-btn" onclick="window._bloom && window._bloom.query(document.getElementById('bloom-word').value)">🔍 Query</button>
    <button class="sim-btn danger" onclick="window._bloom && window._bloom.reset()">Reset</button>
  </div>

  <div id="bloom-bits" style="margin:1rem 0;"></div>

  <div style="margin:0.5rem 0;font-size:0.8rem">
    <span style="background:#1e1e3a;border:2px solid #3a3a6a;padding:2px 8px;border-radius:4px;color:#e0e0ff">Bit = 0 (unset)</span>
    <span style="background:#1a237e;padding:2px 8px;border-radius:4px;color:#fff;margin-left:8px">Bit = 1 (set)</span>
    <span style="background:#e65100;padding:2px 8px;border-radius:4px;color:#fff;margin-left:8px">Currently checked position</span>
  </div>

  <div class="sim-log" id="bloom-log"></div>
</div>

Add a few words, then query one you added (true positive) and one you never added (watch for the occasional false positive as the bit array fills up) and one clearly absent (a bit hits 0 → instant, certain miss). Try adding many words — the false-positive rate climbs as the array saturates, exactly as the sizing formula predicts.

---

## Bloom Filter Implementation

```python
import hashlib


class BloomFilter:
    """Fixed-size bit array + k independent hash functions.
    No deletion — see CountingBloomFilter below for that."""

    def __init__(self, size: int, num_hashes: int):
        self.size = size
        self.num_hashes = num_hashes
        self.bits = [0] * size

    def _hashes(self, item: str) -> list[int]:
        """Derive k hash positions from two base hashes (double hashing) —
        avoids needing k genuinely independent hash functions."""
        h1 = int(hashlib.md5(item.encode()).hexdigest(), 16)
        h2 = int(hashlib.sha1(item.encode()).hexdigest(), 16)
        return [(h1 + i * h2) % self.size for i in range(self.num_hashes)]

    def add(self, item: str) -> None:
        for pos in self._hashes(item):
            self.bits[pos] = 1
        # Time: O(k)

    def might_contain(self, item: str) -> bool:
        return all(self.bits[pos] for pos in self._hashes(item))
        # Time: O(k)
        # False positives possible. False negatives impossible.


# Optimal sizing given expected n items and target false-positive rate p
def optimal_bloom_params(n: int, p: float) -> tuple[int, int]:
    import math
    m = int(-(n * math.log(p)) / (math.log(2) ** 2))
    k = max(1, round((m / n) * math.log(2)))
    return m, k
    # e.g. n=1,000,000 items, p=0.01 (1% FPR) → m ≈ 9.6M bits (~1.2 MB), k ≈ 7
```

!!! warning "False negatives are impossible only if you never delete"
    The entire "no means no" guarantee depends on bits only ever going from 0 → 1. The moment you allow clearing a bit (naive deletion), you can create a false negative for some *other* item that also depends on that bit — which is why plain Bloom filters flatly don't support deletion.

---

## Counting Bloom Filter (Supports Deletion)

**Mental model:** replace each bit with a small counter (typically 4 bits, values 0–15). Adding an item increments its `k` counters; deleting decrements them. An item is "possibly present" if all `k` counters are non-zero.

```python
class CountingBloomFilter:
    """Each slot is a small counter instead of a single bit — supports deletion."""

    def __init__(self, size: int, num_hashes: int, max_count: int = 15):
        self.size = size
        self.num_hashes = num_hashes
        self.max_count = max_count
        self.counters = [0] * size

    def _hashes(self, item: str) -> list[int]:
        import hashlib
        h1 = int(hashlib.md5(item.encode()).hexdigest(), 16)
        h2 = int(hashlib.sha1(item.encode()).hexdigest(), 16)
        return [(h1 + i * h2) % self.size for i in range(self.num_hashes)]

    def add(self, item: str) -> None:
        for pos in self._hashes(item):
            if self.counters[pos] < self.max_count:
                self.counters[pos] += 1

    def remove(self, item: str) -> None:
        """Only safe to call for an item you're confident was actually added —
        removing an item that was never added can corrupt other items' counts."""
        for pos in self._hashes(item):
            if self.counters[pos] > 0:
                self.counters[pos] -= 1

    def might_contain(self, item: str) -> bool:
        return all(self.counters[pos] > 0 for pos in self._hashes(item))
        # Time: O(k) for all operations
        # Space: ~4x a plain Bloom filter (4-bit counters vs 1-bit)
```

The counter width is a trade-off: wider counters (more bits) support more overlapping items before saturating (a counter hitting `max_count` and refusing further increments), at the cost of proportionally more memory — a 4-bit counting Bloom filter uses 4x the space of a plain Bloom filter for the same `m`.

---

## Cuckoo Hashing

### Mental Model

Cuckoo hashing is a hash **table** design (stores actual keys, not just a bit signature), where every item has exactly **2 candidate slots**, computed by 2 independent hash functions. Insertion is optimistic: try slot 1; if occupied, *evict* whoever is there and place the new item, then re-insert the evicted item into *its* other candidate slot — displacing whoever's there, and so on, like a cuckoo bird pushing another egg out of a nest (hence the name).

```
Insert "cat" → candidate slots: h1("cat")=3, h2("cat")=7
  Slot 3 is empty → place "cat" at slot 3. Done.

Insert "dog" → candidate slots: h1("dog")=3, h2("dog")=1
  Slot 3 is occupied by "cat" → evict "cat", place "dog" at slot 3.
  "cat" must go to ITS other slot: h2("cat")=7 → slot 7 is empty → place "cat" at slot 7.
  Done. (One displacement.)

Insert "fox" → candidate slots: h1("fox")=7, h2("fox")=1
  Slot 7 occupied by "cat" → evict "cat", place "fox" at slot 7.
  "cat" tries slot 3 → occupied by "dog" → evict "dog", place "cat" at slot 3.
  "dog" tries slot 1 → empty → place "dog" at slot 1.
  Done. (A chain of 2 displacements.)
```

If a displacement chain becomes too long (cycles back to an already-displaced item — a genuine cycle in the "who displaces whom" graph), the table **rehashes** with new hash functions and re-inserts everything. This is rare at reasonable load factors but must be handled.

### Why It Supports Deletion (Unlike Bloom Filters)

Cuckoo hashing stores the actual key in the slot — deleting an item just clears its slot directly, with no risk of affecting any other item, because no information was ever combined across items (unlike a Bloom filter's shared bits). This is the fundamental difference: Bloom filters trade exactness for space by *overlapping* signal across items; cuckoo hashing keeps items fully separate and instead spends its cleverness on where an item can live.

### Load Factor Limits

Cuckoo hashing with 2 hash functions works reliably up to roughly **50% load factor** before displacement chains become likely to cycle (theoretically it can go higher with more candidate slots per item — "d-ary cuckoo hashing" — or a small auxiliary "stash" for the rare item that won't settle). This is worse space utilization than a well-tuned open-addressing hash table, but cuckoo hashing pays for it with a hard **O(1) worst-case lookup** — you only ever check 2 fixed slots, never a probe sequence of unbounded length.

```python
class CuckooHashTable:
    """Simplified 2-hash-function cuckoo hash table."""

    def __init__(self, size: int, max_displacements: int = 500):
        self.size = size
        self.max_displacements = max_displacements
        self.table: list[str | None] = [None] * size

    def _h1(self, key: str) -> int:
        return hash(("h1", key)) % self.size

    def _h2(self, key: str) -> int:
        return hash(("h2", key)) % self.size

    def contains(self, key: str) -> bool:
        return self.table[self._h1(key)] == key or self.table[self._h2(key)] == key
        # Time: O(1) worst case — always exactly 2 checks

    def remove(self, key: str) -> bool:
        for pos in (self._h1(key), self._h2(key)):
            if self.table[pos] == key:
                self.table[pos] = None
                return True
        return False
        # Time: O(1) worst case

    def insert(self, key: str) -> bool:
        for _ in range(self.max_displacements):
            pos = self._h1(key)
            if self.table[pos] is None:
                self.table[pos] = key
                return True
            key, self.table[pos] = self.table[pos], key  # evict and carry forward
            pos = self._h2(key)
            if self.table[pos] is None:
                self.table[pos] = key
                return True
            key, self.table[pos] = self.table[pos], key
        return False  # displacement chain too long — caller should rehash and retry
        # Time: O(1) amortized, but a single insert can trigger a chain of displacements
```

---

## HyperLogLog

### Mental Model

HyperLogLog estimates **cardinality** — "how many distinct items have I seen?" — without storing the items at all, using a clever probabilistic observation: if you hash each item to a uniformly random bit string, the **longest run of leading zeros** you've observed across all hashes tells you, statistically, roughly how many distinct items you must have hashed.

```
Intuition: a fair coin flip sequence of leading zeros in a hash...
  P(hash starts with 0 zeros) = 1/2   — common, happens almost every item
  P(hash starts with 1 zero)  = 1/4   — happens for roughly 1 in 4 items
  P(hash starts with k zeros) = 1/2^(k+1)

  If the MAXIMUM leading-zero count you've seen across all distinct items is k,
  you've probably seen on the order of 2^k distinct items — because it took
  that many "coin flips" (independent hashes) for one to be unlucky/lucky
  enough to produce k leading zeros.
```

A single leading-zero-count estimate is extremely noisy (one lucky hash swings the answer wildly), so HyperLogLog splits incoming items across `m` independent buckets (using a few bits of the hash to pick the bucket, the rest of the hash to compute leading zeros), keeps the **max leading-zero count per bucket**, and averages across buckets using a harmonic mean (chosen specifically because it's robust to the occasional bucket with an outlier-high count).

### Why ~log(log(n)) Space

Storing the actual distinct items to count them exactly needs O(n) space. HyperLogLog instead stores, per bucket, only a small counter representing "the longest leading-zero run seen" — and since hash outputs are typically 32 or 64 bits, that counter only needs `log2(64) = 6 bits` to represent any possible value. With `m` buckets each needing a handful of bits, total space is **O(m)**, independent of `n` — and because the *value stored* in each bucket only needs to represent up to `log2(n)` (the max possible leading-zero count for n hashes), some formulations describe the per-counter cost as O(log log n). In practice: with `m = 16,384` buckets × 6 bits each, that's `16,384 × 6 / 8 = 12,288 bytes ≈ 12 KB` — counting **billions of distinct items accurately with roughly 12 KB of memory** is the actual headline number, and it matches what Redis documents for its `PFCOUNT`/`PFADD` implementation.

### Standard Error Characteristics

HyperLogLog's standard error is approximately:

```
error ≈ 1.04 / √m
```

where `m` is the number of buckets. More buckets → lower error, at a direct memory cost — this is a pure, tunable trade-off, unlike a Bloom filter where `n` (expected items) also factors into the sizing decision. With `m = 16,384` buckets (a common default), the standard error is about **0.8%** — but that scale-independence only holds in HyperLogLog's **mid-to-large range**, and only for an implementation that includes the algorithm's small-range and large-range correction terms. The raw harmonic-mean estimator (the `alpha * m * m / sum(...)` formula alone, as coded below) is systematically biased at low cardinality — badly enough that it estimates roughly **11,800 items for a completely empty sketch** (`n=0`) if used uncorrected, because the harmonic mean of all-zero registers doesn't naturally tend toward zero. The original HyperLogLog paper's fix is a **small-range correction**: when the raw estimate falls below `2.5m`, fall back to linear counting (`m * ln(m / V)`, where `V` is the count of buckets still at zero) instead of the harmonic-mean formula. Without that correction, the 0.8%-at-16K-buckets claim does not hold uniformly "at 1,000 items and at a billion" — it holds once cardinality is comfortably past the small-range regime, which is exactly what the correction exists to handle.

```python
# Conceptual sketch — production use should reach for redis, datasketches, etc.
import hashlib


class HyperLogLog:
    def __init__(self, num_buckets_pow2: int = 14):  # m = 2^14 = 16384 buckets
        self.p = num_buckets_pow2
        self.m = 1 << self.p
        self.buckets = [0] * self.m

    def add(self, item: str) -> None:
        h = int(hashlib.sha1(item.encode()).hexdigest(), 16) & ((1 << 64) - 1)
        bucket_idx = h & (self.m - 1)          # low p bits select the bucket
        remaining = h >> self.p                 # remaining bits, count leading zeros in these
        leading_zeros = self._leading_zeros(remaining, 64 - self.p) + 1
        self.buckets[bucket_idx] = max(self.buckets[bucket_idx], leading_zeros)

    def _leading_zeros(self, value: int, bit_width: int) -> int:
        if value == 0:
            return bit_width
        count = 0
        for i in range(bit_width - 1, -1, -1):
            if (value >> i) & 1:
                break
            count += 1
        return count

    def estimate(self) -> float:
        alpha = 0.7213 / (1 + 1.079 / self.m)  # bias-correction constant
        raw = alpha * self.m * self.m / sum(2.0 ** -b for b in self.buckets)

        # Small-range correction — without this, an empty or near-empty
        # sketch wildly overestimates (an all-zero sketch estimates
        # ~11,800 with the raw formula alone, when it should be ~0).
        if raw <= 2.5 * self.m:
            zero_buckets = self.buckets.count(0)
            if zero_buckets > 0:
                return self.m * __import__("math").log(self.m / zero_buckets)
        return raw
        # Time: O(m) for the estimate; O(1) per add()
        # Space: O(m) — independent of the number of distinct items added
```

---

## When to Use Which

| Requirement | Choose | Why |
|-------------|--------|-----|
| "Is this key possibly in a huge set?" before an expensive lookup | **Bloom filter** | Smallest memory footprint; false positives are acceptable (they just cost one wasted expensive lookup) |
| Same, but items get removed from the set over time | **Counting Bloom filter** | Supports deletion at ~4x the memory of a plain Bloom filter |
| Need to store/retrieve actual keys with O(1) worst-case lookup | **Cuckoo hashing** | No false positives; supports deletion natively; but caps load factor around 50% and can trigger rehashing |
| "How many distinct values have I seen?" at huge scale | **HyperLogLog** | O(m) space independent of cardinality; ~0.8% error at 16K buckets — can't tell you *which* items, only *how many* |
| Need exact membership, moderate scale | **Regular hash set** | No approximation — use this unless memory is genuinely the constraint |
| Need exact distinct count, moderate scale | **Regular hash set + `len()`** | HyperLogLog only pays off when a hash set's memory would be prohibitive |
| Delete + compact membership (not full keys) | **[Cuckoo filter](probabilistic-sketches.md)** | Fingerprints, not bits; insert can fail when full |
| Frequency / heavy hitters | **[Count-Min Sketch](probabilistic-sketches.md)** | Overestimates; never underestimates non-negative adds |
| p99 without storing samples | **[t-digest / HDRHistogram](probabilistic-sketches.md)** | Not HLL (that's cardinality) |
| Set similarity | **[MinHash](probabilistic-sketches.md)** | Jaccard, not membership |

---

## Worked Examples

**Bloom filter sizing:** you expect 10 million URLs in a crawl frontier dedup filter and want a 1% false-positive rate.
`m = -(10,000,000 × ln(0.01)) / (ln 2)² ≈ 95.8 million bits ≈ 12 MB`, `k ≈ 7`. Compare to a hash set of 10M URLs (~30-50 bytes each with Python object overhead) costing 300-500 MB — roughly a 25-40x memory reduction for a 1% false-positive tolerance.

**Cuckoo vs Bloom for a spell-checker dictionary:** you need to both check membership *and* occasionally support removing obsolete words. A Bloom filter can't remove; a counting Bloom filter can but at higher memory; cuckoo hashing gives exact answers (no false positives at all) with native deletion — often the right call when the dictionary is small enough that the modest extra memory over a Bloom filter doesn't matter.

**HyperLogLog in analytics:** counting unique daily active users across a service with 500 million events/day. Storing a hash set of user IDs seen today could be hundreds of MB to GB depending on ID size; a HyperLogLog with 16K buckets uses ~12 KB (`16,384 × 6 / 8 = 12,288` bytes) and gives you the count within <1% error — this is exactly what Redis's `PFADD`/`PFCOUNT` and Google's original HyperLogLog paper (built for exactly this problem at Google) target.

---

## Interview Follow-ups

1. **"Why can't a Bloom filter have false negatives?"** — Because bits only ever get set (never cleared in the plain version), if an item was truly added, every one of its `k` bits is guaranteed still set — a query for it can never see an unset bit.
2. **"How would you estimate the false-positive rate of a Bloom filter you've already built?"** — `(fraction of bits set)^k` — as the array fills with 1s, each of the `k` checks is more likely to spuriously pass.
3. **"Why does cuckoo hashing cap out around 50% load factor with 2 hash functions?"** — Above that density, the "who displaces whom" relationships between candidate slots start forming cycles frequently enough that insertions fail to terminate within a reasonable number of displacements, forcing a rehash.
4. **"Why use a harmonic mean in HyperLogLog instead of an arithmetic mean across buckets?"** — The harmonic mean is dominated by small values, making it robust to the rare bucket that got a spuriously huge leading-zero count (an outlier that would badly skew an arithmetic mean upward).
5. **"When would you pick a counting Bloom filter over cuckoo hashing?"** — When you only need membership (not to retrieve/store the actual key) and want the smaller memory footprint — counting Bloom filters are still meaningfully smaller than a full key-storing hash table, even accounting for the 4-bit-per-slot overhead over a plain Bloom filter.

---

## Key Takeaways

!!! success "Remember"
    1. **Bloom filter**: bit array + k hash functions. False positives possible, **false negatives impossible**. No deletion.
    2. **Counting Bloom filter**: same idea with small counters instead of bits — trades ~4x memory for deletion support.
    3. **Cuckoo hashing**: each item has 2 candidate slots; insertion displaces occupants like a cuckoo bird. O(1) worst-case lookup, native deletion, but capped near 50% load factor.
    4. **HyperLogLog**: estimates cardinality from the longest observed run of leading zeros across hash buckets — O(m) space independent of the actual count, ~1.04/√m standard error.
    5. All four structures trade **exactness for space** in a mathematically bounded way — know exactly what kind of error each one accepts (false positive, no exact values, or a bounded count error) before reaching for one. Frequency, p99, Jaccard, and deletable compact filters: [Probabilistic Sketches](probabilistic-sketches.md).
