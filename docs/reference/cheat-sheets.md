---
title: Cheat Sheets
description: Dense, glance-before-the-interview tables — system design checklist, Big-O, HTTP status codes, latency numbers, and a distributed-systems quick glossary.
---

# Cheat Sheets

Reference material, not teaching material. For the "why," follow the links into the concept pages. For the "what do I say in the next five minutes," this page.

---

## System Design Interview Checklist

Work the steps in order. Naming a database before you have a requirement is the single most common way to lose a system design round.

| # | Step | What to actually do | Time budget (45 min round) |
|---|------|----------------------|------------------------------|
| 1 | **Clarify requirements** | Functional (what does it do) + non-functional (consistency, latency, availability targets). Ask about read/write ratio, scale, and what "correct" means for this domain. | 5 min |
| 2 | **Estimate scale** | Back-of-envelope: DAU, QPS (avg + peak), storage/day, bandwidth. See [Calculators](calculators.md). This decides "one Postgres box" vs "sharded cluster" before you draw anything. | 5 min |
| 3 | **High-level design** | Draw boxes: client → LB → services → data stores. Get one end-to-end request working on the whiteboard before going deep. | 10 min |
| 4 | **Deep dive** | Pick 1–2 components the interviewer cares about (usually the data model, the hot path, or a specific trade-off) and go deep — schema, algorithm, concurrency. | 15 min |
| 5 | **Identify bottlenecks** | Say the number out loud: "at 50k QPS the single Postgres primary is the ceiling." Name the first thing that breaks, not the tenth. | 3 min |
| 6 | **Discuss trade-offs** | CP vs AP, SQL vs NoSQL, sync vs async — justify with the requirements from step 1, not with defaults. See the [Trade-off Matrix](tradeoff-matrix.md). | 5 min |
| 7 | **Wrap up** | Summarize the design, name what you'd do differently with more time (monitoring, DR, cost), and flag known gaps. | 2 min |

!!! tip "Staff-level tell"
    Juniors jump straight to step 3. Staff engineers spend real time on step 1 — because the wrong requirement makes every later decision wrong too.

---

## Big-O Complexity Cheat Table

### Data structure operations

| Structure | Access | Search | Insert | Delete | Notes |
|-----------|--------|--------|--------|--------|-------|
| Array | O(1) | O(n) | O(n) | O(n) | Insert/delete O(1) at the end |
| Linked List | O(n) | O(n) | O(1) | O(1) | O(1) insert/delete only with a node reference |
| Hash Table | — | O(1) avg / O(n) worst | O(1) avg | O(1) avg | Worst case from collisions/resize |
| Binary Search Tree (balanced) | O(log n) | O(log n) | O(log n) | O(log n) | Unbalanced BST degrades to O(n) |
| Heap (binary) | O(1) min/max | O(n) | O(log n) | O(log n) | Peek is O(1); arbitrary search is O(n) |
| Trie | — | O(k) | O(k) | O(k) | k = key length, not n |
| Skip List | O(log n) | O(log n) | O(log n) | O(log n) | Probabilistic balance |

### Sorting algorithms

| Algorithm | Best | Average | Worst | Space | Stable |
|-----------|------|---------|-------|-------|--------|
| Quicksort | O(n log n) | O(n log n) | O(n²) | O(log n) | No |
| Mergesort | O(n log n) | O(n log n) | O(n log n) | O(n) | Yes |
| Heapsort | O(n log n) | O(n log n) | O(n log n) | O(1) | No |
| Timsort (Python/Java default) | O(n) | O(n log n) | O(n log n) | O(n) | Yes |
| Bubble/Insertion sort | O(n) | O(n²) | O(n²) | O(1) | Yes |
| Counting/Radix sort | O(n+k) | O(n+k) | O(n+k) | O(n+k) | Yes |

### Graph algorithms

| Algorithm | Time | Space | Use When |
|-----------|------|-------|----------|
| BFS | O(V+E) | O(V) | Shortest path, unweighted |
| DFS | O(V+E) | O(V) | Cycle detection, topological sort, connectivity |
| Dijkstra | O((V+E) log V) | O(V) | Shortest path, non-negative weights |
| Bellman-Ford | O(V·E) | O(V) | Shortest path, negative weights (detects negative cycles) |
| Union-Find (path compression + rank) | ~O(α(n)) amortized | O(V) | Connectivity, Kruskal's MST |
| Topological sort (Kahn's / DFS) | O(V+E) | O(V) | DAG ordering, build/dependency graphs |

### Common algorithmic patterns (interview shorthand)

| Pattern | Typical complexity | Signal in the prompt |
|---------|--------------------|-----------------------|
| Two pointers | O(n) | Sorted array, pair sum, in-place partition |
| Sliding window | O(n) | Substring/subarray with a constraint |
| Binary search | O(log n) | Sorted or monotonic search space |
| Dynamic programming | O(n·m) typical | "Number of ways," "min/max cost," overlapping subproblems |
| Backtracking | Exponential (pruned) | "All combinations/permutations," constraint satisfaction |

See [DSA](../dsa/index.md) for the full pattern library.

---

## HTTP Status Code Quick Table

The ones interviewers actually ask about — know when to use which, not just the number.

| Code | Name | When to use it |
|------|------|-----------------|
| **200** | OK | Successful GET/PUT/POST with a body |
| **201** | Created | POST that created a resource — return the `Location` header |
| **202** | Accepted | Request accepted for async processing (queued, not yet done) |
| **204** | No Content | Success, nothing to return (e.g. DELETE) |
| **301 / 308** | Moved Permanently | Permanent redirect; 308 preserves the HTTP method, 301 may not |
| **302 / 307** | Found / Temporary Redirect | Temporary redirect; 307 preserves method |
| **304** | Not Modified | Conditional GET with matching `ETag`/`If-Modified-Since` — caching |
| **400** | Bad Request | Malformed request — client sent something the server can't parse |
| **401** | Unauthorized | Missing/invalid authentication (really means "unauthenticated") |
| **403** | Forbidden | Authenticated but not allowed — do not leak *why* to the client |
| **404** | Not Found | Resource doesn't exist (or you don't want to confirm it does, for security) |
| **409** | Conflict | Concurrent modification — optimistic locking, version mismatch |
| **422** | Unprocessable Entity | Syntactically valid, semantically invalid (validation failure) |
| **429** | Too Many Requests | Rate limit exceeded — always pair with `Retry-After`. See [Rate Limiting](../reliability/rate-limiting.md) |
| **500** | Internal Server Error | Unhandled exception — the server's fault, generically |
| **502** | Bad Gateway | Upstream/proxy got an invalid response from a downstream service |
| **503** | Service Unavailable | Overloaded or intentionally shedding load — pair with `Retry-After`. This is what an open [circuit breaker](../reliability/circuit-breakers.md) should return |
| **504** | Gateway Timeout | Upstream didn't respond in time — distinct from 502 (upstream responded, but badly) |

!!! note "Interview tell"
    Confusing 401 vs 403, or not knowing that 429/503 need `Retry-After`, reads as "hasn't operated a production API." Also: never use 200 with an error payload in the body — status codes exist so infra (LBs, retries, monitoring) can reason about the response without parsing it.

---

## Latency Numbers Every Engineer Should Know

Order-of-magnitude numbers for back-of-envelope math. Approximate, but the *ratios* between rows are the part that matters in an interview.

| Operation | Latency |
|-----------|---------|
| L1 cache reference | ~1 ns |
| Branch mispredict | ~5 ns |
| L2 cache reference | ~7 ns |
| Mutex lock/unlock | ~25 ns |
| Main memory reference (RAM) | ~100 ns |
| Compress 1 KB with a fast compressor | ~2,000 ns (2 µs) |
| Send 1 KB over 1 Gbps network | ~10,000 ns (10 µs) |
| Read 1 MB sequentially from RAM | ~10,000 ns (10 µs) |
| SSD random read | ~100,000 ns (100 µs) |
| Read 1 MB sequentially from SSD | ~1,000,000 ns (1 ms) |
| Round trip within same datacenter | ~500,000 ns (0.5 ms) |
| Disk seek (spinning HDD) | ~10,000,000 ns (10 ms) |
| Read 1 MB sequentially from HDD | ~20,000,000 ns (20 ms) |
| Round trip cross-country (US) | ~50,000,000 ns (50 ms) |
| Round trip intercontinental (US ↔ Europe/Asia) | ~150,000,000 ns (150 ms) |

**Rules of thumb this implies:**

- Memory is ~100× faster than SSD, and SSD is ~10-20× faster than spinning disk.
- A same-DC round trip (~0.5 ms) is cheap; a cross-region round trip (~150 ms) is 300× that — never do it in a hot request path if you can avoid it.
- Network beats disk seeks: sending 1 KB over the LAN is faster than one HDD disk seek.

See [Calculators](calculators.md) for Little's Law and capacity math built on these numbers, and [Engineering Math](../foundations/math.md) if it's filled in.

---

## Distributed Systems Glossary — Quick Table

One line each. Full treatment is one click away.

| Concept | One-liner | Full page |
|---------|-----------|-----------|
| **CAP theorem** | During a network partition, choose consistency or availability — not both. | [CAP Theorem](../distributed-systems/cap-theorem.md) |
| **PACELC** | Extends CAP: even without a partition, there's a latency vs consistency trade-off. | [CAP Theorem](../distributed-systems/cap-theorem.md) |
| **Quorum** | A majority (`⌊n/2⌋+1`) of nodes must agree before a read/write is considered durable/valid. | [Raft](../distributed-systems/raft.md) |
| **Consensus** | Getting a set of unreliable nodes to agree on a single value/log despite crashes and delays. | [Consensus & Raft](../distributed-systems/raft.md) |
| **Leader election** | Automatically picking one node to sequence writes after the previous leader fails. | [Consensus & Raft](../distributed-systems/raft.md) |
| **Replication lag** | The delay between a write committing on the primary and becoming visible on a replica. | [Replication](../distributed-systems/replication.md) |
| **Consistent hashing** | Maps keys and nodes onto a ring so only ~K/N keys move when a node is added or removed. | [Consistent Hashing](../databases/consistent-hashing.md) |
| **Sharding** | Horizontal partitioning of data across independent database instances by a shard key. | [Database Sharding](../databases/sharding.md) |
| **Split brain** | Two nodes both believe they are the leader/primary and both accept writes. | [Consensus & Raft](../distributed-systems/raft.md) |
| **Consumer lag** | How far behind a consumer is from the latest offset in a partition/queue. | [Kafka Deep Dive](../messaging/kafka.md) |
| **Cache stampede** | A hot key expires and many concurrent requests all miss the cache at once, flooding the DB. | [Cache Stampede](../performance/cache-stampede.md) |
| **Circuit breaker** | Trips open after too many failures to a dependency, failing fast instead of piling up threads. | [Circuit Breakers](../reliability/circuit-breakers.md) |
| **Rate limiting** | Bounds how many requests a client can make per window — fairness, stability, and cost control. | [Rate Limiting](../reliability/rate-limiting.md) |
| **Tail latency** | p99/p999 latency — dominated by queueing, GC pauses, and slow dependencies, not the median. | [Tail Latency](../performance/tail-latency.md) |
| **Saga** | A sequence of local transactions with compensations, used instead of a distributed 2PC transaction. | [Sagas](../architecture-patterns/sagas.md) |

---

*Pair this page with the [Trade-off Matrix](tradeoff-matrix.md) for comparisons and the [Glossary](glossary.md) for definitions outside distributed systems (databases, caching, general SWE terms).*
