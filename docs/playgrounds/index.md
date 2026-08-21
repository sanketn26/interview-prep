---
title: Playgrounds
description: Priority simulations plus DSA visualizers — what each teaches and where it lives.
---

# Playgrounds

Simulations live on the **host concept page**, next to the failure they illustrate. This hub does not duplicate canvases. Read the mental model, predict the log line, then press the dangerous button.

| Simulation | What you learn | Host |
|------------|----------------|------|
| Consistent hashing ring | Add/remove a node; only a slice remaps | [Consistent hashing](../databases/consistent-hashing.md) |
| Database sharding | Hash shards, 70% hot key, reshard cost | [Sharding](../databases/sharding.md) |
| Kafka partitions & groups | Parallelism = partitions; extra consumers idle; kill → rebalance | [Kafka](../messaging/kafka.md) |
| Cache stampede | Hot key expires; lock / jitter / SWR | [Cache stampede](../performance/cache-stampede.md) |
| Rate limiter | Token bucket vs windows; burst → reject | [Rate limiting](../reliability/rate-limiting.md) |
| Load balancer | RR / weighted / least-conn / hash; dead backend | [Load balancing](../networking/load-balancing.md) |
| Retry storm | 1000 rps × 3 retries = you DDoS yourself | [Circuit breakers](../reliability/circuit-breakers.md) |
| Circuit breaker | CLOSED → OPEN → HALF-OPEN | [Circuit breakers](../reliability/circuit-breakers.md) |
| Raft election | Kill leader, partition a node, majority | [Raft](../distributed-systems/raft.md) |
| Saga | Ship fails after charge — compensations | [Sagas](../architecture-patterns/sagas.md) |
| Tail latency | p50 fine, p99 on fire; HOL / slow 1% | [Tail latency](../performance/tail-latency.md) |
| DNS resolution | Stub → resolver → root → TLD → auth | [HTTP & TCP](../networking/http-tcp.md) |
| TCP lifecycle | Handshake, drop, timeout, why pooling | [HTTP & TCP](../networking/http-tcp.md) |
| K8s request flow | Ingress → Service → Endpoints → Pod | [Kubernetes](../kubernetes/index.md) |
| Capacity calculator | DAU → QPS, miss rate, storage, RF | [Requirements](../foundations/requirements-estimation.md) · [Calculators](../reference/calculators.md) |

**15 priority simulations** above. **16 DSA visualizers** on pattern pages (not every DSA page has one):

| Visualizer | Host |
|------------|------|
| Sliding window (fixed-window max sum) | [Sliding window](../dsa/sliding-window.md) |
| BFS / DFS | [BFS & DFS](../dsa/bfs-dfs.md) |
| Coin-change DP | [Dynamic programming](../dsa/dynamic-programming.md) |
| Heap insert / extract-min | [Heaps](../dsa/heaps.md) |
| Dijkstra (undirected O(V²) demo) | [Graph algorithms](../dsa/graph-algorithms.md) |
| Union-Find | [Union-Find](../dsa/union-find.md) |
| N-Queens backtracking | [Backtracking](../dsa/backtracking.md) |
| Sorting comparison | [Sorting](../dsa/sorting.md) |
| Trie insert / search | [Tries](../dsa/tries.md) |
| Interval scheduling | [Greedy](../dsa/greedy.md) |
| KMP | [String matching](../dsa/string-matching.md) |
| Bloom filter | [Advanced hashing](../dsa/hashing-techniques.md) |
| Count-Min Sketch | [Probabilistic sketches](../dsa/probabilistic-sketches.md) |
| Skip list | [Skip lists & range trees](../dsa/skip-lists-fenwick-segment-trees.md) |
| Fenwick prefix sums | [Skip lists & range trees](../dsa/skip-lists-fenwick-segment-trees.md) |
| Aho-Corasick | [Advanced string matching](../dsa/advanced-string-matching.md) |

Foundations, two pointers, binary search, and the pattern-recognition index have no visualizer. Little's Law / nines sit on [Calculators](../reference/calculators.md).

!!! note "How to use a sim"
    Predict the log line **before** you click Kill / Fail / Hot key. If the screen surprises you, the mental model is wrong — re-read the host page.
