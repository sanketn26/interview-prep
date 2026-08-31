---
title: Reasoning transcripts
description: Short worked examples of how an experienced engineer thinks — requirement to V2, not a dump of the full exercise.
---

# Reasoning transcripts

These are **parallel worked examples**, not the assignment. Each is the voice in a senior engineer’s head during the first 15 minutes. Full designs live on the linked exercise / concept pages.

Method on every row: **Requirement → Assumption → Calculation → Bottleneck → Option A vs B → Decision → New failure → V2**.

Canonical modules that *are* this method: [URL shortener](../system-design-exercises/url-shortener.md), [Rate limiter](../system-design-exercises/rate-limiter.md), [Circuit breakers](../reliability/circuit-breakers.md), [Sharding](../databases/sharding.md). Score yourself with the [design assessment rubric](../system-design-exercises/assessment.md).

---

## 1. URL shortener

[Full exercise](../system-design-exercises/url-shortener.md)

**Requirement.** `POST /shorten` → short URL; `GET /{code}` → 302/301 to the long URL. Analytics optional.

**Assumption.** 100M URLs, 1B redirects/day, codes do not expire unless deleted, single-region V1 is allowed.

**Calculation.** Writes ≈ 1M/day ≈ 12/s. Reads ≈ 1B/86,400 ≈ 11.5k/s, peak ~10× → ~115k/s. Row ~300 B → 30 GB total. Fits in one Postgres + a lot of RAM for hot codes.

**Bottleneck.** Redirect p99, not storage. 115k/s to the primary is the first thing that dies. CPU on code generation is irrelevant at 12 writes/s.

**A vs B.** Sequential `base62(counter)` vs hash of the URL. Counter: short, sortable, needs a unique allocator. Hash: no allocator, collisions, ugly codes. Custom aliases need a uniqueness check either way.

**Decision.** V1 = one API + Postgres `code PK` + `base62` from a DB sequence. 302 so we can change targets and count later. No Redis yet — 30 GB is not why we add a cache.

**New failure.** Peak 115k reads/s on one primary; p99 blows past 100ms; a celebrity code is one row with all the heat.

**V2.** Read replica or a cache in front of redirects; CDN/edge for the hottest codes; keep writes on the primary. Cache is justified by the *read* bottleneck, not by “everyone uses Redis.”

---

## 2. Rate limiter

[Full exercise](../system-design-exercises/rate-limiter.md) · [Algorithm sim](../reliability/rate-limiting.md)

**Requirement.** Per API key, N req / window, 429 + `Retry-After`, <2ms extra latency, 200k rps peak, 20M keys/day.

**Assumption.** ±5% accuracy is OK on free tier. Fail-open vs fail-closed is a product call — we must pick one out loud.

**Calculation.** 200k decisions/s is not one Redis core. Sliding log: 200k × 60s × 16 B ≈ 192 MB/min of timestamps *before* cardinality. Token bucket: ~32 B/key × 2M hot keys ≈ 64 MB — survives.

**Bottleneck.** Cardinality of *keys*, then hot keys (one scraper), then the limiter becoming the outage if Redis is required for every request.

**A vs B.** Local in-memory counter (fast, wrong under multiple pods) vs Redis token bucket + Lua (shared, extra hop). Sliding window log is the interview default and the production tax.

**Decision.** V1 = token bucket in Redis, Lua INCR+expire or a proper bucket, at the gateway. Fail-closed for paid write endpoints, fail-open for public reads if product agrees.

**New failure.** Redis blip → either the API dies (fail-closed) or a scrape gets through (fail-open). Multi-region wants a *global* quota the local buckets cannot see.

**V2.** Local token bucket + periodic sync (eventual, ±5%); sticky routing for paid keys if we need tighter; explicit regional vs global quota. Do not start at “global strongly consistent limiter.”

---

## 3. WhatsApp / messaging

[Full exercise](../system-design-exercises/whatsapp.md)

**Requirement.** 1:1 + groups ≤256, sent/delivered/read, history, presence, media pointers. 200M DAU.

**Assumption.** At-least-once + client dedup is acceptable. E2E encryption is a later box. Voice/video out of scope.

**Calculation.** 50 msgs/user/day → 10B/day ≈ 116k/s avg, ~900k/s evening peak. Payload ~200 B + metadata. Fan-out is the cost, not the write of one row.

**Bottleneck.** Online delivery path (websocket fleet) and **group fan-out**. 256 members × 900k/s is not 256× if we are stupid; a naive “write N inbox rows in the request” will timeout.

**A vs B.** Push fan-out on write (WhatsApp-style for small groups) vs fan-out on read (Twitter-style). For 256, write-time fan-out into per-user queues is still cheaper than making every open-chat scan a group log.

**Decision.** V1 = connection gateway + one chat service + Postgres for history + one queue per user for online push. No Cassandra, no Kafka yet. Message id = sender + monotonic seq.

**New failure.** Recipient offline: queue grows. Multi-device: one TCP is not the user. Group of 10k: write-time fan-out melts. Gateway death drops “online.”

**V2.** Durable offline inbox; session per device; for large groups switch to fan-out-on-read; presence as ephemeral store with TTL, not a row we UPDATE on every ping.

---

## 4. Payments

[Full exercise](../system-design-exercises/payment-processing.md)

**Requirement.** Charge card/wallet for an order. Never double-charge. Refunds, audit, notify order service.

**Assumption.** We are not a PSP; we talk to Stripe-class processors. 1M orders/day peak season.

**Calculation.** 1M/86,400 ≈ 11.5 TPS avg, ~115 TPS peak. Storage is boring (2 KB × 1M/day). **Correctness** is the constraint, not QPS. 115 TPS fits on one well-run primary; that does not mean a single box is the architecture.

**Bottleneck.** The network call to the PSP: timeout with unknown outcome. Retry without idempotency = double charge. “Write order paid, then charge” vs “charge, then write” both have a crash window.

**A vs B.** Orchestrate in the request (sync, simple, holds the user) vs state machine + outbox (crash-safe, slower to write). 2PC across us and Stripe is not an option; Stripe is not in our transaction.

**Decision.** V1 = `payments` row with unique `idempotency_key`, states `created → pending → charged|failed`. Client retries the same key. We retry the PSP only with *their* idempotency key. User waits on the first attempt.

**New failure.** We charged, crashed before persist. PSP timeout: we do not know. Order service never hears. Webhook arrives twice.

**V2.** Outbox for “notify order service”; reconcile job against PSP for `pending` older than T; webhooks as the source of truth with the local row as a projection. Exactly-once is **idempotent state transitions**, not a magic queue flag.

---

## 5. Kafka consumer groups

[Concept](../messaging/kafka.md) · [Failure tasks](../playgrounds/failure-injection.md)

**Requirement.** 500 MB/s of `orders` must be processed by a fleet without double-processing in the common case, and without a single consumer cap.

**Assumption.** Order per customer must stay ordered. Cross-customer order is not required. At-least-once is OK if the writer is idempotent.

**Calculation.** One consumer disk/CPU will not eat 500 MB/s. Parallelism = partition count, not consumer count. 50 MB/s/consumer → ~10 partitions minimum, plus headroom for rebalance and hot keys.

**Bottleneck.** (1) More consumers than partitions → idle. (2) Key = `tenant_id` of a whale → one partition 70%. (3) Kill a consumer → stop-the-world rebalance (eager).

**A vs B.** More partitions now (operational cost, cannot shrink) vs start small and increase later (rebalance, key mapping changes). Cooperative rebalance vs eager.

**Decision.** V1 = topic with N partitions hashed on `customer_id`, one consumer group, auto-commit off, commit after the side effect (or transactional produce if the output is Kafka).

**New failure.** Hot key still pins one partition. Async processing inside a consumer **breaks** partition order. A second consumer group does not share load — it duplicates the topic.

**V2.** Split the whale key (`tenant_id + bucket`); dedicated topic for the whale; keep side effects idempotent. Do not “add a consumer” to a hot partition.

---

## 6. Sharding

[Concept](../databases/sharding.md) · [Sim](../playgrounds/failure-injection.md)

**Requirement.** Writes have outgrown one primary. Reads are already on replicas. Need horizontal write scale.

**Assumption.** Access is user-centric: almost every query has `user_id`. Reporting can be eventually consistent.

**Calculation.** If one box does 10k writes/s and we need 40k, four shards is the *average* story. Power-law users mean the 99th-percentile shard is nothing like 10k.

**Bottleneck.** Shard key. `created_at` → all new writes on the last range. `country` → US shard melts. Cross-shard join on the request path.

**A vs B.** Range vs hash vs directory. Range is great for scans, terrible for time. Hash is even until a celebrity. Directory is movable and is another SPOF unless cached.

**Decision.** V1 = hash on `user_id` into a handful of Postgres instances, router in the app. No 2PC. Put a user’s orders on the same shard as the user.

**New failure.** Celebrity `user_id` (sim: Hot key 70%). `hash % N` remap on add-shard. Product wants “orders last 7 days across everyone” on the live path.

**V2.** Consistent hashing / directory for reshard; split the hot key or dedicated shard for the whale tenant; warehouse for scatter-gather reporting. More shards do **not** fix one hot key.

---

## 7. Consistent hashing

[Concept](../databases/consistent-hashing.md)

**Requirement.** Add/remove cache or store nodes without moving almost every key.

**Assumption.** Nodes are not equal forever; we will lose one at 3 a.m. Virtual nodes exist to smear load.

**Calculation.** Modular `hash % N`: add node 4 → ~75% of keys remap. Consistent hashing: ~1/N of keys remap. With vnodes, that 1/N is many small arcs instead of one pizza slice.

**Bottleneck.** The remap itself (thundering miss on the backing store) and **skew** if vnode count is too low. A single hot key still hashes to one node.

**A vs B.** Consistent hashing vs a lookup table (directory). Directory: precise placement, extra hop, must be highly available. Ring: no extra lookup, harder to pin a tenant to a box.

**Decision.** V1 = ring with vnodes for the cache pool. Client-side hashing so the cache nodes are not coordinating.

**New failure.** Node death → its arc’s keys miss at once (stampede on DB). Two clients with different vnode configs disagree on placement. Hot key.

**V2.** Replication of a key to the next R nodes on the ring (or a separate primary store); gossip/config so all clients share vnode map; hot-key exception list. Hashing is placement, not a durability protocol.

---

## 8. Cache stampede

[Concept](../performance/cache-stampede.md)

**Requirement.** 99% hit rate, hot object, TTL 5 minutes. Must not melt the DB when that key expires.

**Assumption.** 1,000 concurrent readers of the same key. DB can do ~50 qps of that query, not 1,000.

**Calculation.** Miss amplification = concurrent waiters. 1,000 identical queries × 50ms = a herd. Jittering TTL by ±20% on *many* keys helps the synchronized-expiry case, not one celebrity key.

**Bottleneck.** Single-key expiry, then lock expiry shorter than the DB fetch, then every pod’s in-process lock (not distributed).

**A vs B.** Mutex / single-flight vs serve-stale-while-revalidate vs jitter. Jitter is cheapest and wrong for one key. Lock is correct and adds wait. SWR keeps p99 flat and risks serving 30s-stale.

**Decision.** V1 for a celebrity key: **single-flight** (`SET NX` lock or request coalescing) + slightly stale fallback if the lock is held. Jitter on the rest of the keyspace.

**New failure.** Lock holder dies; others wait 10s then stampede. SWR serves a deleted permission. Cache is down → 100% to DB (this is now a cache *outage*, not a stampede).

**V2.** Combine: SWR for read-mostly public data, single-flight for expensive unique keys, cache-aside with a hard budget on origin QPS (shed). See also [cache capacity sim](../performance/cache-strategies.md).

---

## 9. Circuit breaker

[Concept](../reliability/circuit-breakers.md)

**Requirement.** Payments calls Fraud. Fraud p99 is 80ms. We cannot latch our thread pool to Fraud’s worst day.

**Assumption.** 1,000 rps checkout. Fraud timeout currently “none.” Retry ×3 felt safe.

**Calculation.** No timeout: threads ≈ QPS × service time. 200 rps × 5s hang = 1,000 threads. Retry ×3 on failure: 1,000 rps × ~4 attempts → up to 4,000 rps at a sick dependency. Breaker trip in tens of ms at 1k rps once you actually *see* failures.

**Bottleneck.** Timeouts first, then retries, then the breaker. Starting at the breaker with a 30s client is a thermometer in a fireproof box.

**A vs B.** Fail-fast 503 vs fallback (cached score, allow <$50). Fail-fast protects us; fallback protects conversion and can be wrong (fraud).

**Decision.** V1 = timeout 150ms, retry **0** on POST /charge, retry 1 with full jitter on GET-like fraud *if* idempotent, breaker on Fraud, separate pool (bulkhead).

**New failure.** Every pod half-opens at once (probe stampede). 4xx from a bad token trips the breaker. Fallback hits the same DB Fraud uses.

**V2.** Cluster-wide probe limiter, trip only on 5xx/timeout, fallback to a *different* failure domain, retry budget ~10% extra load. Run the retry-storm sim before arguing for more retries.

---

## 10. Raft

[Concept](../distributed-systems/raft.md)

**Requirement.** A replicated log: config, metadata, or a small KV. Need to survive one node death in a 3-node cluster without split-brain.

**Assumption.** WAN between voters is a bad idea at 3 nodes. Clients can retry. We need linearizable writes, not max throughput.

**Calculation.** Majority of 3 = 2. One death: still writable. Two deaths: unavailable. Throughput is **leader disk + serialize-on-leader**, not “3×”. A few 10k small commits/s on LAN is plausible; 100k needs batching.

**Bottleneck.** Leader failure → election (heartbeat timeout). Stretching 2+1 across two regions: one region loss steals majority **or** leaves a leader that cannot commit.

**A vs B.** Raft (understandable, leader, strong) vs ad-hoc primary + async replicas (fast, stale, split-brain on bad failover). Paxos vs Raft is not the interview; **who is allowed to commit** is.

**Decision.** V1 = 3-node Raft in one region, three AZs. Writes through the leader. Reads: linearizable via leader, or stale follower if the product allows.

**New failure.** Isolated leader: writes hang (correct). Slow disk on leader: missed heartbeats, extra elections. Two-AZ deploy. Uncommitted tail on old leader is overwritten — clients who treated “sent” as “committed” are wrong.

**V2.** 5 voters if you need two-fault, or a non-voter learner in DR. Timeouts on monotonic clocks. Never ACK until committed. The sim: kill leader, partition N1, confirm a minority cannot elect.

---

## How to use these

Cover the linked page. Talk this transcript out loud in 3 minutes. Then change one assumption (10× traffic, multi-region, “must be linearizable”) and redo **Bottleneck → A vs B → V2**. If the architecture does not move, you were decorating, not designing.
