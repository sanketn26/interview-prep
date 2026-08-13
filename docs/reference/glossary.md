---
title: Glossary
description: Alphabetized definitions for the terms used across the Senior Engineer Academy — distributed systems, databases, caching, messaging, reliability, and DSA.
---

# Glossary

One or two sentences each, matching how the concept pages use the term. Where a full page exists, it's linked in the "See also" column — go there for depth.

---

### A

| Term | Definition | See also |
|------|------------|----------|
| **ACID** | Atomicity, Consistency, Isolation, Durability — the transaction guarantees a traditional relational database provides. Contrast with BASE. | [SQL vs NoSQL](../databases/sql-vs-nosql.md) |
| **At-least-once delivery** | A message may be delivered more than once but is never silently dropped. Requires idempotent consumers. | [Kafka Deep Dive](../messaging/kafka.md) |
| **At-most-once delivery** | A message is delivered zero or one times — never duplicated, but may be lost. |  |
| **Availability** | The fraction of requests that receive a non-error response, usually expressed as "nines" (99.9%, 99.99%). | [CAP Theorem](../distributed-systems/cap-theorem.md), [Calculators](calculators.md) |

### B

| Term | Definition | See also |
|------|------------|----------|
| **BASE** | Basically Available, Soft state, Eventually consistent — the looser guarantee model typical of AP/NoSQL systems, contrasted with ACID. | [SQL vs NoSQL](../databases/sql-vs-nosql.md) |
| **Backoff (exponential)** | Increasing the wait time between retries exponentially (`base * 2^attempt`) to avoid hammering a recovering dependency. | [Circuit Breakers](../reliability/circuit-breakers.md) |
| **Bulkhead** | Isolating resources (thread pools, connections) per dependency so one failing dependency can't exhaust resources shared with others. | [Circuit Breakers](../reliability/circuit-breakers.md) |

### C

| Term | Definition | See also |
|------|------------|----------|
| **Cache-aside (lazy loading)** | Application checks the cache first; on a miss, reads from the DB and populates the cache. Most common caching pattern. | [Cache Strategies](../performance/cache-strategies.md) |
| **Cache avalanche** | Many keys expire simultaneously (bulk TTL set, cache restart), causing a broad DB spike rather than a single hot-key spike. | [Cache Stampede](../performance/cache-stampede.md) |
| **Cache penetration** | Requests for keys that don't exist in cache *or* DB, so the cache never helps — every request hits the database. | [Cache Stampede](../performance/cache-stampede.md) |
| **Cache stampede (thundering herd)** | A hot cache key expires and many concurrent requests miss simultaneously, flooding the database with identical queries. | [Cache Stampede](../performance/cache-stampede.md) |
| **CAP Theorem** | A distributed system facing a network partition must choose between Consistency and Availability — Partition Tolerance is not optional. | [CAP Theorem](../distributed-systems/cap-theorem.md) |
| **Causal consistency** | Writes that are causally related are seen in the same order by everyone; unrelated writes may be seen in different orders. | [Consistency Models](../distributed-systems/consistency-models.md) |
| **Circuit breaker** | A per-dependency state machine (closed/open/half-open) that fails fast once failures cross a threshold, preventing retry storms from finishing off a struggling dependency. | [Circuit Breakers](../reliability/circuit-breakers.md) |
| **Consensus** | Getting a set of nodes to agree on a single value or ordered log despite crashes and message delays. Raft and Paxos are consensus algorithms. | [Consensus & Raft](../distributed-systems/raft.md) |
| **Consistency (CAP)** | Every read returns the most recent write (or an error) — all nodes see the same data at the same time. | [CAP Theorem](../distributed-systems/cap-theorem.md) |
| **Consistent hashing** | A hashing scheme mapping both keys and nodes onto a ring so that adding/removing a node remaps only ~K/N keys instead of nearly all of them. | [Consistent Hashing](../databases/consistent-hashing.md) |
| **Consumer group** | A set of Kafka consumers that split the partitions of a topic between them, each partition owned by exactly one consumer in the group at a time. | [Kafka Deep Dive](../messaging/kafka.md) |
| **Consumer lag** | The gap between the latest offset in a partition and the offset a consumer has committed — indicates a consumer falling behind. | [Kafka Deep Dive](../messaging/kafka.md) |
| **CQRS** | Command Query Responsibility Segregation — separating the write model (commands) from the read model (queries), often with different data stores optimized for each. | [Architecture Patterns](../architecture-patterns/index.md) |

### D

| Term | Definition | See also |
|------|------------|----------|
| **Dead letter queue (DLQ)** | A topic/queue where messages are moved after repeated processing failures, so a "poison message" doesn't block a partition forever. | [Kafka Deep Dive](../messaging/kafka.md) |
| **Directory-based sharding** | A lookup table mapping shard keys to shard IDs, stored in a separate service — flexible but adds a hop and a potential bottleneck. | [Database Sharding](../databases/sharding.md) |
| **Durability** | Once a write is acknowledged, it survives crashes — typically achieved via write-ahead logs, fsync, or replication to a majority. | [Consensus & Raft](../distributed-systems/raft.md) |

### E

| Term | Definition | See also |
|------|------------|----------|
| **Eventual consistency** | Given no new writes, all replicas will *eventually* converge to the same value — no bound on how long "eventually" takes. | [CAP Theorem](../distributed-systems/cap-theorem.md), [Consistency Models](../distributed-systems/consistency-models.md) |
| **Exactly-once semantics** | Each message is processed effectively once — no loss, no duplicates. Hard to achieve end-to-end; usually built from at-least-once + idempotency. | [Kafka Deep Dive](../messaging/kafka.md) |

### F

| Term | Definition | See also |
|------|------------|----------|
| **Fixed window rate limiting** | Counts requests in fixed, non-overlapping time windows (e.g. per second). Simple but allows a 2× burst at window boundaries. | [Rate Limiting](../reliability/rate-limiting.md) |
| **Fan-out** | One incoming request triggering multiple downstream calls (e.g. one API call becoming 8 RPCs). The parent's p99 is dominated by the slowest child. | [Calculators](calculators.md) |

### H

| Term | Definition | See also |
|------|------------|----------|
| **Half-open (circuit breaker state)** | After the open timer expires, the breaker allows a small number of probe requests through — success closes the breaker, failure reopens it. | [Circuit Breakers](../reliability/circuit-breakers.md) |
| **Hash-based sharding** | `shard = hash(key) % N` — gives even distribution but requires scatter-gather for range queries and remaps most keys on resharding. | [Database Sharding](../databases/sharding.md) |
| **Hot key / hot shard / hot partition** | A single key, shard, or partition receiving disproportionate traffic — sharding and consistent hashing don't fix this; it needs replication or key-splitting. | [Sharding](../databases/sharding.md), [Consistent Hashing](../databases/consistent-hashing.md), [Kafka](../messaging/kafka.md) |

### I

| Term | Definition | See also |
|------|------------|----------|
| **Idempotency** | An operation that has the same effect whether performed once or many times — the foundation for safely retrying requests. | [Circuit Breakers](../reliability/circuit-breakers.md) |
| **ISR (In-Sync Replicas)** | In Kafka, the set of replicas fully caught up with the partition leader; `acks=all` waits for all ISR replicas to acknowledge. | [Kafka Deep Dive](../messaging/kafka.md) |

### L

| Term | Definition | See also |
|------|------------|----------|
| **Leader election** | The process of automatically choosing one node to act as leader/primary after the previous one fails, without human intervention. | [Consensus & Raft](../distributed-systems/raft.md) |
| **Leaderless replication** | No single node owns writes; any replica can accept a write, and quorum reads/writes reconcile conflicts (e.g. Cassandra, DynamoDB). | [Replication](../distributed-systems/replication.md) |
| **Linearizability** | The strongest consistency model — every operation appears to take effect instantaneously at some point between its start and end, in a single global order. | [Consistency Models](../distributed-systems/consistency-models.md) |
| **Little's Law** | `L = λW` — the average number of requests in-flight equals arrival rate times average time in the system. Turns latency into required concurrency. | [Calculators](calculators.md) |
| **Load balancer** | A component that distributes incoming requests across multiple backend servers, at L4 (connection/transport) or L7 (HTTP-aware). | [Load Balancing](../networking/load-balancing.md) |
| **Load shedding** | Deliberately rejecting or degrading low-priority work when a system is overloaded, to protect its ability to serve the rest. | [Circuit Breakers](../reliability/circuit-breakers.md) |

### P

| Term | Definition | See also |
|------|------------|----------|
| **PACELC** | Extends CAP: **if** Partitioned, choose Availability or Consistency; **else**, choose Latency or Consistency during normal operation. | [CAP Theorem](../distributed-systems/cap-theorem.md) |
| **Partition tolerance** | The system continues operating even when network messages between nodes are lost or delayed. Treated as mandatory in real distributed systems. | [CAP Theorem](../distributed-systems/cap-theorem.md) |
| **Poison message** | A malformed or unprocessable message that repeatedly crashes the consumer trying to process it, stalling that partition until it's moved to a DLQ. | [Kafka Deep Dive](../messaging/kafka.md) |

### Q

| Term | Definition | See also |
|------|------------|----------|
| **Quorum** | The minimum number of nodes (`⌊n/2⌋+1` for majority quorum) that must participate in a read or write for it to be considered valid/durable. | [Consensus & Raft](../distributed-systems/raft.md), [Consistency Models](../distributed-systems/consistency-models.md) |

### R

| Term | Definition | See also |
|------|------------|----------|
| **Raft** | A consensus algorithm using a strong leader, terms, and majority-quorum log replication — designed to be understandable and implementable, unlike classic Paxos. | [Consensus & Raft](../distributed-systems/raft.md) |
| **Range-based sharding** | Splitting data across shards by contiguous key ranges (e.g. user_id 1–33M on shard 0). Efficient range queries, but prone to hot shards from skewed access. | [Database Sharding](../databases/sharding.md) |
| **Rate limiting** | Bounding how many requests a client can make in a time window, for fairness, stability, and cost control. Token bucket, fixed window, and sliding window are the common algorithms. | [Rate Limiting](../reliability/rate-limiting.md) |
| **Rebalancing (Kafka)** | Reassigning partitions among consumers in a group when membership changes — a stop-the-world pause unless cooperative rebalancing is used. | [Kafka Deep Dive](../messaging/kafka.md) |
| **Replication** | Keeping copies of the same data on multiple nodes for durability and read scaling — synchronous (safe, slower) or asynchronous (fast, riskier). | [Replication](../distributed-systems/replication.md) |
| **Replication lag** | The delay between a write committing on the primary/leader and that write becoming visible on a replica/follower. | [Replication](../distributed-systems/replication.md), [CAP Theorem](../distributed-systems/cap-theorem.md) |
| **Retry budget** | A cap on how much extra load retries are allowed to generate (e.g. 10% above baseline), preventing retries from amplifying an outage. | [Circuit Breakers](../reliability/circuit-breakers.md) |
| **Retry storm** | Many clients retrying a failing dependency simultaneously, multiplying load on an already-struggling system and making the outage worse. | [Circuit Breakers](../reliability/circuit-breakers.md) |

### S

| Term | Definition | See also |
|------|------------|----------|
| **Saga** | A sequence of local transactions across services, each with a compensating action, used instead of a distributed transaction (2PC) to keep data consistent across shards/services. | [Sagas](../architecture-patterns/sagas.md) |
| **Sequential consistency** | All operations appear in some single total order that respects each process's own program order, though not necessarily real-time order. | [Consistency Models](../distributed-systems/consistency-models.md) |
| **Sharding** | Horizontal partitioning of data across multiple independent database instances, keyed by a shard key, to scale writes beyond a single node. | [Database Sharding](../databases/sharding.md) |
| **Sliding window (rate limiting)** | A rate-limiting approach that avoids fixed-window boundary bursts by weighting the current and previous windows (approximate) or tracking exact timestamps (log). | [Rate Limiting](../reliability/rate-limiting.md) |
| **SLA / SLO / SLI** | Service Level Agreement (the contract/consequence), Objective (the internal target, e.g. 99.9% availability), Indicator (the measured metric that tracks the objective). | [Calculators](calculators.md) |
| **Split brain** | Two nodes simultaneously believe they are the leader/primary and both accept writes, producing two diverging histories. | [Consensus & Raft](../distributed-systems/raft.md) |
| **Stale-while-revalidate** | A caching strategy that serves expired (stale) data immediately while refreshing it in the background, keeping latency low at the cost of temporary staleness. | [Cache Stampede](../performance/cache-stampede.md) |
| **Strong consistency** | Every read reflects the most recent completed write — see Linearizability for the strictest form. | [Consistency Models](../distributed-systems/consistency-models.md) |

### T

| Term | Definition | See also |
|------|------------|----------|
| **Tail latency** | The latency at high percentiles (p99, p999) rather than the median — usually dominated by queueing, GC pauses, and slow dependencies. | [Tail Latency](../performance/tail-latency.md) |
| **Term (Raft)** | A monotonically increasing logical clock in Raft; at most one leader exists per term. | [Consensus & Raft](../distributed-systems/raft.md) |
| **Thundering herd** | Many clients/processes waking up or retrying at the same instant and overwhelming a shared resource — the general form of a cache stampede. | [Cache Stampede](../performance/cache-stampede.md) |
| **Token bucket** | A rate-limiting algorithm where tokens refill at a fixed rate up to a capacity; each request consumes a token, allowing controlled bursts. | [Rate Limiting](../reliability/rate-limiting.md) |

### V

| Term | Definition | See also |
|------|------------|----------|
| **Virtual nodes** | Multiple ring positions assigned to each physical node in consistent hashing (typically 150–200), used to even out load distribution. | [Consistent Hashing](../databases/consistent-hashing.md) |

### W

| Term | Definition | See also |
|------|------------|----------|
| **Write-behind (write-back) cache** | The cache is updated immediately and the DB write is deferred/batched asynchronously — fast writes, risk of data loss if the cache fails before flushing. | [Cache Strategies](../performance/cache-strategies.md) |
| **Write-through cache** | Every write goes to the cache and the DB synchronously before acknowledging — consistent but adds write latency. | [Cache Strategies](../performance/cache-strategies.md) |

---

*Terms specific to distributed systems also appear as one-liners in the [Cheat Sheets](cheat-sheets.md) quick-reference table. For side-by-side comparisons, see the [Trade-off Matrix](tradeoff-matrix.md).*
