---
title: Database Sharding
description: Horizontal sharding — partitioning, routing, cross-shard queries, and hot shard mitigation.
---

# Database Sharding

**Prerequisites:** [Consistent Hashing](consistent-hashing.md)

---

## Why This Exists

A single database server has physical limits: disk I/O bandwidth, CPU for query processing, memory for buffer pool, network bandwidth. When your write throughput exceeds what one node can handle, you need to scale writes horizontally — **sharding**.

**Sharding** = splitting data across multiple database instances based on a **shard key**.

---

## Mental Model

```
Single DB (vertical limit):         Sharded (horizontal):
┌─────────────────┐                 ┌──────┐ ┌──────┐ ┌──────┐
│   All 100M      │                 │ 33M  │ │ 33M  │ │ 34M  │
│   Users         │        →        │Users │ │Users │ │Users │
│   (1 server)    │                 │Shard0│ │Shard1│ │Shard2│
└─────────────────┘                 └──────┘ └──────┘ └──────┘
```

---

## Sharding Strategies

### 1. Range-Based Sharding

```
Shard 0: user_id 1 – 33,333,333
Shard 1: user_id 33,333,334 – 66,666,666
Shard 2: user_id 66,666,667 – 100,000,000
```

**Pros:** Range queries efficient, easy to reason about
**Cons:** Uneven load if recent users are more active (new users go to shard 2 only → hot shard)

### 2. Hash-Based Sharding

```python
shard_id = hash(user_id) % num_shards
# user_id=1 → shard 0
# user_id=2 → shard 2
# user_id=3 → shard 1
```

**Pros:** Even distribution
**Cons:** Range queries require scatter-gather; resharding expensive (use consistent hashing)

### 3. Directory-Based Sharding

Lookup table: `user_id → shard_id` stored in a separate service.

**Pros:** Flexible, can move data between shards without changing shard key logic
**Cons:** Lookup service is a bottleneck and single point of failure

---

## Architecture

```mermaid
graph TD
    App[Application] --> SR{Shard Router}
    SR -->|user_id % 3 = 0| S0[(Shard 0)]
    SR -->|user_id % 3 = 1| S1[(Shard 1)]
    SR -->|user_id % 3 = 2| S2[(Shard 2)]
    S0 --> R0[(Replica 0)]
    S1 --> R1[(Replica 1)]
    S2 --> R2[(Replica 2)]
```

---

## Interactive Simulation

Four hash shards. Run write load, then **Hot key 70%** — consistent hashing cannot save a celebrity `user_id`. Add a shard to see modular hash remap everything; **Reshard** simulates the even cutover you wish you had.

<div class="sim-container">
  <div class="sim-title">Database Sharding</div>
  <div class="sim-controls">
    <button class="sim-btn" onclick="window._shard && window._shard.reset()">Reset</button>
    <button class="sim-btn success" onclick="window._shard && window._shard.run()">Write load</button>
    <button class="sim-btn" onclick="window._shard && window._shard.pause()">Pause</button>
    <button class="sim-btn" onclick="window._shard && window._shard.addShard()">Add shard</button>
    <button class="sim-btn danger" onclick="window._shard && window._shard.hotKey()">Hot key 70%</button>
    <button class="sim-btn" onclick="window._shard && window._shard.reshard()">Reshard</button>
  </div>
  <canvas id="shard-canvas" class="sim-canvas" style="width:100%;height:240px;"></canvas>
  <div class="sim-stats">
    <div class="sim-stat"><div class="sim-stat-label">Shards</div><div class="sim-stat-value" id="shard-n">4</div></div>
    <div class="sim-stat"><div class="sim-stat-label">Hot shard</div><div class="sim-stat-value" id="shard-hot">—</div></div>
    <div class="sim-stat"><div class="sim-stat-label">Writes</div><div class="sim-stat-value" id="shard-w">0</div></div>
  </div>
  <div class="sim-log" id="shard-log"></div>
</div>

---

## Choosing a Shard Key

**Good shard keys:**
- High cardinality (many distinct values)
- Even distribution (no hot values)
- Used in most queries (avoid cross-shard queries)
- Stable (doesn't change after record creation)

**Poor shard keys:**
- `user_country` — uneven distribution (US >> all others)
- `created_at` — range hot shard problem
- `status` — low cardinality (active vs inactive)

**Examples:**
- E-commerce: `user_id` → all orders for a user on one shard
- Multi-tenant SaaS: `tenant_id` → all data for a tenant on one shard
- Time-series: `(device_id, timestamp_bucket)` → device data co-located

---

## Problems with Sharding

### Cross-Shard Queries
```sql
-- This requires querying all shards and merging results:
SELECT * FROM orders WHERE total > 1000 AND created_at > '2024-01-01'
-- Solution: denormalize, use a separate reporting DB (not sharded), or accept scatter-gather
```

### Hot Shard
One shard receives disproportionate traffic (e.g., one large tenant, one viral product).

**Detection:** Per-shard CPU/IOPS metrics diverge significantly
**Fix:** Shard splitting, move hot tenant to dedicated shard, application-level caching

### Resharding
Adding new shards requires moving data. With consistent hashing, only K/N keys move. With modular hashing, almost everything moves.

**Zero-downtime resharding:**
1. Dual-write to old and new shard
2. Backfill data to new shard
3. Validate consistency
4. Switch reads to new shard
5. Remove old shard

### Distributed Transactions
A transaction touching data on multiple shards requires a distributed transaction protocol (2PC) — complex, slow, and failure-prone.

**Better solution:** Design shard key so related data is co-located (no cross-shard transactions). See [Sagas](../architecture-patterns/sagas.md) when a business flow must touch two shards anyway.

---

## Production Debugging

```
Symptom: One shard's CPU is 90%, others 20%. p99 only for some users.

1. Per-shard QPS, CPU, IOPS, replication lag
   → if one shard: hot key or bad range. if all: you need more shards or bigger boxes.
2. Top keys / tenants by request rate
   → celebrity user_id, one tenant, one viral SKU
3. Router metrics: scatter-gather fan-out
   → a missing shard key in the WHERE clause
4. After a reshard: dual-write mismatch rate
   → checksum row counts and sampled hashes
5. Cross-shard TX failures / 2PC coordinator logs
   → you accidentally coupled two user_ids in one checkout
```

**Metrics:** `qps{shard}`, `cpu{shard}`, `rows{shard}`, `scatter_queries`, `reshard_lag`, `hot_key_share`.

---

## Scaling Limits

- Modular `hash % N` is fine until the first reshard. Plan consistent hashing or a directory *before* you are on fire.
- A single hot key is a **vertical** problem; more shards do not help.
- Cross-shard joins at request time will not survive 50 shards. Reporting belongs on a warehouse.
- Practical primary count: dozens is routine; hundreds needs automation for schema, backups, and failover.

---

## Trade-offs

| Dimension | Range | Hash | Directory |
|-----------|-------|------|-----------|
| Even load | Poor if time-skewed | Good (except hot keys) | As good as your placement |
| Range queries | Excellent | Scatter-gather | Depends |
| Reshard cost | Split a range | Almost all keys (mod N) | Move listed keys |
| Extra hop | No | No | Yes (cache the map) |

---

## Interview Questions

=== "Basic"
    **Q: What is database sharding and when would you use it?**

    "Sharding is horizontal partitioning — splitting data across multiple database instances based on a shard key. Each shard is an independent database handling a subset of the data. You use it when a single database instance can't handle your write throughput or storage requirements. Read replicas handle read scaling; sharding handles write scaling."

=== "Senior"
    **Q: How do you choose a shard key?**

    "Four criteria: (1) High cardinality — must have enough distinct values to distribute data; (2) Even distribution — no 'hot' values that concentrate load; (3) Query locality — the shard key should appear in most queries to avoid cross-shard scatter-gather; (4) Immutability — the key shouldn't change after record creation (changing it means moving data between shards). For most user-centric applications, user_id is the natural choice. For B2B SaaS, tenant_id. For time-series, a compound key like (device_id, time_bucket)."

=== "Staff"
    **Q: How would you migrate a single PostgreSQL database to a sharded architecture with zero downtime?**

    "This is a multi-week migration. Phase 1: Set up the new sharded infrastructure alongside the existing DB. Phase 2: Implement dual-write in the application — new writes go to both old DB and the correct shard. Phase 3: Backfill existing data to the sharded setup. Phase 4: Validate — compare row counts, spot-check records, run read traffic against sharded DB in shadow mode. Phase 5: Shift read traffic to shards gradually (canary → 10% → 50% → 100%). Phase 6: Remove writes to old DB. Phase 7: Decommission old DB. Key risks: dual-write consistency during migration, backfill causing load on old DB, application bugs in shard routing logic. I'd budget 8–12 weeks and have a rollback plan at each phase."

---

## Key Takeaways

!!! success "Remember"
    1. Sharding solves write scaling; read replicas solve read scaling
    2. Shard key choice determines everything — get this wrong and resharding is painful
    3. Co-locate related data to avoid cross-shard queries
    4. Use consistent hashing to minimize data movement during resharding
    5. Hot shards require shard splitting or dedicated resources — there's no automatic fix
