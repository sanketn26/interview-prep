---
title: Databases at Scale
description: Access patterns pick the store. Sharding is what you do when one primary cannot take the writes.
---

# Databases at Scale

Access patterns pick the store. Sharding is what you do when one primary cannot take the writes.

---

## Why This Exists

"Which database should we use?" is the most common bad question in system design. It invites a religious answer — Postgres vs Mongo vs Cassandra — when the real answer is a question back: **what are the access patterns?**

Databases are not general-purpose. Each one makes a bet about how you will read and write, and optimizes ruthlessly for that bet. Pick the store whose bet matches your workload and everything is easy. Pick against it and you will spend two years building workarounds for a decision you made in an afternoon.

The senior move is to describe the access pattern first, then let it select the store.

---

## Mental Model

Scaling a database happens in a fixed order. Each step is cheap; each *next* step costs an order of magnitude more in complexity. **Never skip ahead.**

```
1. One database                    ← you are here; it is fine longer than you think
        │  reads too slow
        ▼
2. Add indexes                     ← usually the whole problem
        │  still too slow
        ▼
3. Add a cache                     ← read-heavy workloads stop here
        │  reads still too slow
        ▼
4. Add read replicas               ← now you own replication lag
        │  WRITES too slow
        ▼
5. Shard                           ← last resort; you lose cross-shard joins,
                                     transactions, and easy schema changes
```

!!! tip "The interview tell"
    Candidates who jump straight to "shard it" have not understood the cost. Steps 2–4 solve **read** pressure. Only step 5 solves **write** pressure — which is why the diagnostic question is always *"are we read-limited or write-limited?"*

A single modern Postgres instance handles roughly 5–15K transactions/sec and comfortably stores single-digit terabytes. Below that, sharding is usually premature.

---

## Access Patterns Choose the Store

| If your access pattern is… | You want… | Because |
|---|---|---|
| Fetch a row by primary key | Anything (KV store is fastest) | Every store does this well |
| Query flexibly across many columns, with joins | Relational (Postgres, MySQL) | Query planner + secondary indexes |
| Write enormous volume, read by a known key | Wide-column (Cassandra, DynamoDB) | LSM writes are append-only and fast |
| Full-text search / relevance ranking | Search engine (Elasticsearch) | Inverted index + scoring |
| Traverse relationships several hops deep | Graph (Neo4j) | Index-free adjacency beats recursive joins |
| Time-ordered metrics, roll-ups | Time-series (Timescale, Prometheus) | Time-partitioned, compression-friendly |

The critical insight underneath the table: **B-trees optimize reads, LSM-trees optimize writes.** Postgres uses a B-tree — reads are a handful of page fetches, but every write updates the tree in place. Cassandra uses an LSM-tree — writes are appended to a memory buffer and flushed sequentially, making them extremely fast, at the cost of reads that may check several files. That single structural difference explains most of the table, and it is covered in [Indexing & storage engines](indexing.md).

---

## Why One Bad Index Is Worth More Than Any Architecture

Before any distributed anything, understand what an index actually costs and saves. A missing index turns a lookup into a full scan — the difference is not 2×, it is thousands of times:

```python
"""Why the shard key and the index must match your access pattern."""

import bisect
import random


def full_scan(rows: list[tuple[int, str]], target: int) -> int:
    """No index: touch every row. O(n)."""
    return sum(1 for _ in rows)  # comparisons performed


def indexed_lookup(sorted_keys: list[int], target: int) -> int:
    """B-tree index: binary search. O(log n)."""
    bisect.bisect_left(sorted_keys, target)
    return max(1, len(sorted_keys).bit_length())  # comparisons ≈ log2(n)


if __name__ == "__main__":
    for n in (1_000, 1_000_000, 1_000_000_000):
        rows = [(i, "x") for i in range(min(n, 1000))]  # sample; math scales
        scan = n
        seek = max(1, n.bit_length())
        print(f"n={n:>13,}  full scan: {scan:>13,} comparisons   "
              f"indexed: {seek:>2} comparisons   speedup: {scan // seek:>11,}×")
```

```
n=        1,000  full scan:         1,000 comparisons   indexed: 10 comparisons   speedup:         100×
n=    1,000,000  full scan:     1,000,000 comparisons   indexed: 20 comparisons   speedup:      50,000×
n=1,000,000,000  full scan: 1,000,000,000 comparisons   indexed: 30 comparisons   speedup:  33,333,333×
```

The lesson generalizes past indexes: **a billion-row table costs 30 comparisons if you query along the indexed path, and a billion if you do not.** The same logic governs shard keys — query along the shard key and you hit one node; query across it and you scatter to all of them.

!!! warning "Indexes are not free"
    Every index speeds reads and *slows writes* — each insert must update every index on the table. On a write-heavy table, six indexes can halve your write throughput. This is the read/write trade-off in its most concrete form.

---

## The Sharding Cliff

Sharding is the step people underestimate, because the cost is not the sharding — it is everything you give up:

- **Cross-shard joins stop working.** You now join in application code, or denormalize.
- **Transactions stop being easy.** A transaction spanning shards needs two-phase commit or a [saga](../architecture-patterns/sagas.md).
- **Unique constraints stop being global.** `UNIQUE(email)` cannot be enforced across shards without a lookup table.
- **Rebalancing is an operation, not a config change** — unless you used [consistent hashing](consistent-hashing.md), which is exactly why it exists.
- **Hot shards ruin the average.** One celebrity user can make one shard carry 70% of traffic while the rest idle.

The shard key choice is effectively permanent and determines all of the above. Choosing it badly is the single most expensive mistake in this section.

---

## Pages in This Section

### Foundational Concepts

| Page | Status |
|------|--------|
| [DDIA Concepts](ddia-concepts.md) | **Complete** — Replication, partitioning, transactions, consistency, quorum, consensus, CRDTs |
| [Indexing & storage engines](indexing.md) | Complete |
| [SQL vs NoSQL](sql-vs-nosql.md) | Complete |
| [Sharding](sharding.md) | Complete + simulator |
| [Consistent hashing](consistent-hashing.md) | Complete + ring |

### Database Deep-Dives

| Page | Status |
|------|--------|
| [PostgreSQL Deep Dive](postgresql.md) | Draft / needs review |
| [MongoDB Deep Dive](mongodb.md) | Draft / needs review |
| [Cassandra Deep Dive](cassandra.md) | Draft / needs review |
| [DynamoDB Deep Dive](dynamodb.md) | Draft / needs review |
| [Redis Deep Dive](redis.md) | Draft / needs review |
| [SQL Deep Dive](sql-deep-dive.md) | Draft / needs review |

Start with [DDIA Concepts](ddia-concepts.md) — replication, partitioning, and transactions are universal. Then [indexing](indexing.md) — B-tree vs LSM explains most of what the database pages assert. Then [SQL vs NoSQL](sql-vs-nosql.md) for choosing a store. Database deep-dives explain the specific trade-offs of each system. [Sharding](sharding.md) and [consistent hashing](consistent-hashing.md) cover distributed patterns shared across systems.

---

## Key Takeaways

- **Access patterns pick the store**, not preference or popularity.
- **Scale in order:** index → cache → replicas → shard. Steps 2–4 fix reads; only sharding fixes writes.
- **B-trees favor reads, LSM-trees favor writes.** That one fact explains most store comparisons.
- **Indexes trade write throughput for read speed.** Nothing is free.
- **Sharding costs you joins, transactions, and global constraints.** Earn it with a number before you propose it.
