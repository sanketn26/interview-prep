---
title: Architecture Trade-Off Matrix
description: One page of side-by-side comparison tables — consistency, replication, databases, caching, messaging, load balancing, and consensus — pulled from across the site's concept pages for quick review.
---

# Architecture Trade-Off Matrix

These tables are a memory aid, not the argument itself — each one is a compression of a full concept page. Reach for a page when you need the reasoning behind a row, not just the row.

---

## Consistency Models

| Approach | Latency | Availability | Complexity | Use When |
|----------|---------|--------------|------------|----------|
| **Strong / linearizable** | Highest (coordination on every op) | Lowest during partitions (must reach quorum) | Low to reason about, high to implement | Financial balances, inventory counts, config/coordination — see [CAP Theorem](../distributed-systems/cap-theorem.md) |
| **Sequential** | High | Reduced during partitions | Medium | Systems needing a global order without real-time recency (e.g. some log-based systems) |
| **Causal** | Medium | Higher than strong | Medium-high (vector clocks / dependency tracking) | Collaborative apps, comment threads — "replies after the post they reply to" |
| **Session (read-your-writes, monotonic reads)** | Low-medium | High | Low-medium | The practical middle ground most products actually need |
| **Eventual** | Lowest | Highest | Low to implement, high to reconcile (conflict resolution) | Social feeds, shopping carts, DNS, caches — see [Consistency Models](../distributed-systems/consistency-models.md) |

---

## Replication Strategies

| Approach | Pros | Cons | Use When |
|----------|------|------|----------|
| **Synchronous replication** | No data loss on primary failure; replica always caught up | Higher write latency (wait for replica ACK); write availability tied to replica health | Financial/critical data where losing an acknowledged write is unacceptable |
| **Asynchronous replication** | Low write latency; primary doesn't wait on replicas | Replica can lag; failover may lose the last few writes | Read scaling, DR replicas, most consumer-facing workloads |
| **Leader-follower (single primary)** | Simple mental model; strong consistency on the leader; easy conflict-free writes | Leader is the write bottleneck and a single point of failure until failover completes | Most OLTP systems — Postgres/MySQL primary-replica, Raft-based systems |
| **Leaderless (quorum-based)** | No single point of failure for writes; scales writes horizontally | Requires conflict resolution (LWW, vector clocks); weaker default consistency | High write-availability systems — Cassandra, DynamoDB |
| **Multi-leader** | Writes accepted in multiple regions with low local latency | Conflict resolution across leaders is genuinely hard; risk of silent data loss | Multi-region active-active where local write latency matters more than perfect consistency |

See [Replication](../distributed-systems/replication.md) and [Consensus & Raft](../distributed-systems/raft.md) for the mechanics.

---

## Database Types (SQL vs NoSQL Families)

| Approach | Pros | Cons | Use When |
|----------|------|------|----------|
| **Relational (SQL)** | ACID transactions, joins, mature tooling, strong schema guarantees | Vertical scaling limits; sharding is manual and painful | Transactional data with relationships — orders, payments, users |
| **Key-Value (e.g. DynamoDB, Redis)** | Extremely fast point lookups; scales horizontally with ease | No joins, limited query patterns beyond the key | Sessions, caching, feature flags, simple lookups |
| **Document (e.g. MongoDB)** | Flexible schema; natural fit for nested/object data | Weaker cross-document transactions historically; denormalization duplicates data | Content management, catalogs, semi-structured data that changes shape |
| **Wide-column (e.g. Cassandra, HBase)** | Massive write throughput; tunable consistency; good for time-series | Query patterns must be designed upfront (no ad-hoc joins); eventual consistency by default | High-write telemetry, time-series, systems needing AP over CP |
| **Graph (e.g. Neo4j)** | Efficient traversal of deeply connected data | Not built for high-volume simple lookups; smaller ecosystem | Social graphs, recommendation engines, fraud-ring detection |

See [SQL vs NoSQL](../databases/sql-vs-nosql.md) for the full decision framework, and [CAP Theorem](../distributed-systems/cap-theorem.md) for why most NoSQL stores default AP.

---

## Caching Strategies

| Approach | Pros | Cons | Use When |
|----------|------|------|----------|
| **Cache-aside (lazy loading)** | Only requested data is cached; cache failure degrades to DB, doesn't break | First request after a miss/eviction is slow (cold); risk of stale data if invalidation is missed | The default choice for most read-heavy workloads |
| **Write-through** | Cache and DB always consistent; reads are always fresh | Every write pays cache + DB latency; cache fills with data that may never be read | Data that's written once and read often, and must stay consistent |
| **Write-behind (write-back)** | Very fast writes; can batch/coalesce DB writes | Risk of data loss if cache fails before flush; more complex failure handling | High write-throughput scenarios where brief data loss risk is acceptable |
| **Read-through** | Cache-loading logic centralized in the cache layer, not the app | Coupled to a caching library/provider that supports it | Simplifying app code when the cache library supports loader functions |
| **TTL + jitter / stale-while-revalidate** | Prevents synchronized expiry and stampedes; keeps latency low under a miss | Slightly stale data served intentionally | Hot keys and high-traffic endpoints — see [Cache Stampede](../performance/cache-stampede.md) |

See [Cache Strategies](../performance/cache-strategies.md) for implementation details.

---

## Messaging Patterns

### Queue vs Pub/Sub

| Approach | Pros | Cons | Use When |
|----------|------|------|----------|
| **Point-to-point queue** | Each message consumed by exactly one worker; natural load distribution | Not designed for multiple independent consumers needing the same message | Task/job processing — one unit of work, one worker |
| **Pub/Sub (topic)** | Multiple independent consumers/services all receive every message | Requires each consumer to manage its own offset/ack; fan-out increases downstream load | Event broadcasting — order placed, user signed up, multiple services react |
| **Kafka (log-based, hybrid)** | Combines both: partitions give queue-like parallelism, consumer groups give pub/sub fan-out, and the log is replayable | Ordering only within a partition; operational complexity (partitions, rebalancing, ISR) | High-throughput event streaming where replay and multiple consumer groups both matter — see [Kafka Deep Dive](../messaging/kafka.md) |

### Delivery Guarantees

| Approach | Pros | Cons | Use When |
|----------|------|------|----------|
| **At-most-once** | Fastest, simplest (fire and forget) | Messages can be silently lost | Metrics/telemetry where occasional loss is fine |
| **At-least-once** | No message loss | Consumers must handle duplicates (need idempotency) | The default for most systems — pair with idempotent writes |
| **Exactly-once** | No loss, no duplicates from the app's point of view | Significant complexity (idempotent producers + transactional consumers); throughput cost | Financial ledger entries, billing — where duplicates or loss are both unacceptable |

See [Message Queue Patterns](../messaging/patterns.md) and [Kafka Deep Dive](../messaging/kafka.md).

---

## Load Balancing Algorithms

| Approach | Pros | Cons | Use When |
|----------|------|------|----------|
| **Round robin** | Simple, no state needed, even distribution for uniform requests | Ignores backend load/capacity differences | Backends are homogeneous and requests are roughly uniform cost |
| **Least connections** | Adapts to backends with varying request duration | Requires tracking connection state at the LB | Long-lived or variable-duration connections (WebSocket, streaming) |
| **Weighted round robin / least connections** | Accounts for heterogeneous backend capacity | Weights need manual tuning or autoscaling integration | Mixed instance sizes during a rolling deploy or canary |
| **Consistent hashing** | Same client/key routes to the same backend — good for caching/session affinity; minimal remapping on scale change | Doesn't balance load if key distribution is skewed (hot keys) | Sticky routing to a cache or stateful backend — see [Consistent Hashing](../databases/consistent-hashing.md) |
| **Random / power-of-two-choices** | Very cheap, statistically near-optimal at scale | Slightly less even than least-connections under low request counts | Very large fleets where per-request LB overhead must stay minimal |

See [Load Balancing](../networking/load-balancing.md) for L4 vs L7 and health-check mechanics.

---

## Consensus (Raft/Paxos vs Simpler Leader Election)

| Approach | Pros | Cons | Use When |
|----------|------|------|----------|
| **Raft (majority quorum consensus)** | Provably safe leader election and log replication; survives `⌊(n-1)/2⌋` failures with no split-brain | Leader-bound write throughput; operational complexity (terms, disks, membership changes) | Metadata, config, locks, shard maps — small, precious, must-be-correct data. See [Consensus & Raft](../distributed-systems/raft.md) |
| **Paxos** | Same safety guarantees as Raft, more general (doesn't require a stable leader) | Notoriously hard to implement correctly and explain; most teams use Raft or a Paxos derivative (e.g. Multi-Paxos) instead | Historical/foundational systems (Chubby, Spanner's underlying layer); rarely hand-rolled today |
| **Single primary + operator-picked failover** | Simple, cheap (2 nodes), low write latency | Manual promotion is slow (minutes) and risks picking a primary missing recent writes; no protection against split-brain if the old primary comes back | Non-critical internal tools where a few minutes of manual failover is acceptable |
| **Gossip / AP membership (e.g. Cassandra ring)** | Highest availability; scales to hundreds of nodes; no quorum required to stay up | Eventual consistency only; conflict resolution needed; no linearizable reads | Membership and failure detection at scale, not for data needing strong consistency |

!!! note "The practical rule"
    Use consensus (Raft) for the smallest possible dataset — shard maps, leader pointers, feature flags — and let it elect leaders for larger, higher-throughput data systems (per-shard primaries) rather than putting bulk data through consensus directly.

---

## Synchronous vs Asynchronous Processing

| Approach | Pros | Cons | Use When |
|----------|------|------|----------|
| **Synchronous (request/response)** | Simple mental model; caller gets the result (or error) immediately | Caller is blocked for the full duration; slow dependency directly slows the caller | Reads, and writes where the client needs immediate confirmation (payment authorization) |
| **Asynchronous (queue-based)** | Caller returns fast (202 Accepted); smooths bursty load; decouples producer/consumer failure domains | Caller doesn't know the outcome immediately; needs a way to check status or receive a callback | Long-running work (video encoding, report generation, email sending) |
| **Fire-and-forget (async, no ack)** | Lowest caller latency, simplest code | No delivery guarantee at all — silent loss on failure | Best-effort telemetry/logging where loss is acceptable |
| **Async with callback/webhook** | Caller freed immediately, still gets notified on completion | Requires the caller to expose a reachable endpoint; retry/ordering of callbacks adds complexity | Third-party integrations, payment webhooks, long external workflows |

---

## Sharding Strategies

| Approach | Pros | Cons | Use When |
|----------|------|------|----------|
| **Range-based** | Efficient range queries; simple to reason about | Uneven load if keys are time-skewed (new data all lands on one shard) | Time-series or ordered data where range scans matter more than write evenness |
| **Hash-based** | Even distribution across shards | Range queries require scatter-gather; resharding moves almost every key under plain modular hashing | The default for user/entity-keyed data — pair with consistent hashing to make resharding cheap |
| **Directory-based** | Most flexible — can move any key to any shard without changing routing logic | The lookup service is an extra hop and a potential single point of failure | Multi-tenant systems needing to isolate specific large tenants onto dedicated shards |

See [Database Sharding](../databases/sharding.md) and [Consistent Hashing](../databases/consistent-hashing.md) for the mechanics and hot-shard failure modes.

---

*Each table here is deliberately tight (4-6 rows). For the full reasoning, production failure modes, and interview questions behind any row, follow the linked concept page. For one-line term definitions, see the [Glossary](glossary.md); for quick facts and numbers, see [Cheat Sheets](cheat-sheets.md).*
