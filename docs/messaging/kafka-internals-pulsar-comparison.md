---
title: Kafka Internals & Pulsar Comparison
description: ISR, rebalancing, exactly-once guarantees, consumer lag, and when to use Kafka vs Pulsar.
prerequisites:
  - Kafka consumer groups (partitions, offsets, consumer groups)
  - Distributed systems (leader election, replication)
---

# Kafka Internals & Pulsar Comparison

**Prerequisites:** [Kafka consumer groups](kafka.md), [Distributed Systems](../distributed-systems/fundamentals.md)

[← Messaging Overview](index.md)

---

## Why This Exists

You know Kafka works. But when you're designing a system, you need to know:

1. **How does Kafka actually guarantee order and durability?** (answer: in-sync replicas + leader)
2. **What breaks during a rebalance?** (answer: processing stops, latency spikes)
3. **Can you get exactly-once semantics?** (answer: yes, but read carefully)
4. **What is consumer lag, and why does it matter?** (answer: it's the outage metric)
5. **When is Kafka wrong for this job?** (answer: when you need multi-tenancy, or Pulsar's scaling model)

This page teaches the internals, the failure modes, and the Pulsar alternative.

---

## Part 1: Kafka Internals — How It Actually Works

### In-Sync Replicas (ISR): The Source of Truth

Every partition has **N replicas** distributed across N brokers. One is the **leader**; the rest are **followers** (in-sync replicas or ISR).

```
Topic "orders", Partition 0, RF=3

Leader (Broker 0)              Follower (Broker 1)         Follower (Broker 2)
┌──────────────────────┐      ┌──────────────────────┐     ┌──────────────────────┐
│ Offset 0..100        │      │ Offset 0..100        │     │ Offset 0..100        │
│ (all committed)      │      │ (lagging)            │     │ (lagging)            │
│                      │      │                      │     │                      │
│ Producer writes:     │  ──→ │ Leader replicates    │ ──→ │ Followers replicate  │
│ [msg101]             │      │ [msg101]             │     │ [msg101]             │
└──────────────────────┘      └──────────────────────┘     └──────────────────────┘
         ↑
   Consumers read from leader
```

**The ISR guarantee:** A message is considered **committed** (durable) only after:
- The leader writes it
- **All replicas in the ISR acknowledge it**

If the leader crashes before a replica syncs, that message is **lost** (if the replica becomes leader).

**Risk:** If `min.insync.replicas=1` (default), only the leader needs to ack. A leader crash loses data. If `min.insync.replicas=2` (with RF=3), the leader must wait for one replica before acking—more durable, higher latency.

```go
// Kafka Producer config
config.Producer.RequiredAcks = sarama.WaitForAll  // min.insync.replicas >= 2
// Now: producer blocks until ack from leader + followers

// vs
config.Producer.RequiredAcks = sarama.WaitForLocal  // min.insync.replicas=1
// Faster: producer gets ack from leader only (risky)
```

### Rebalancing: The Latency Killer

When a consumer joins/leaves the group, Kafka **stops all consumption** while reassigning partitions.

```
Scenario: 3 consumers, 6 partitions (2 each)

State 0 (steady)          State 1 (C3 joins)       State 2 (rebalance done)
─────────────────         ──────────────────       ─────────────────────
C1: P0, P1                C1, C2, C3 all STOP     C1: P0, P2
C2: P2, P3                No consumption           C2: P1, P4
C3: P4, P5                (for 5-30 seconds)      C3: P3, P5

Timeline:
t=0:     C3 sends JoinGroup
t=1-5ms: Stop-the-world (pause all consumers)
t=10ms:  Leader computes new assignment (C1-C3 have no assigned partitions yet)
t=20ms:  Assignment sent to all consumers
t=25ms:  Consumers resume (now processing assigned partitions)

During rebalance window (t=1-25ms):
  - No messages consumed
  - Lag builds up in all partitions
  - Downstream services starved for data
```

**Why rebalancing is slow:**

1. **Pause/resume is serial** — cannot parallelize
2. **Offset commit must succeed** — if commit fails, consumer is stuck
3. **State machine in each consumer** — must transition through JOIN_WAIT, OFFSET_COMMIT, RUNNING

**Failure scenario:**
```
C1 crashes mid-rebalance
├─ Was committing offset
├─ Commit times out
├─ Whole group stuck in limbo
├─ After session timeout (30-45 sec)
├─ Rebalance retries
└─ Lag spike
```

**How to minimize:**
- `max.poll.interval.ms`: How long you can take per poll before rebalance trigger (default 300s). **Increase if processing is slow.**
- `session.timeout.ms`: How long before a consumer is declared dead (default 10s). **Lower = faster failover, but more false positives and rebalances.**

### Consumer Lag: The Real Health Metric

**Definition:** `lag = latest_offset_in_partition - consumer_committed_offset`

```
Partition 0:
  Latest offset: 1000
  Consumer committed: 950
  Lag = 50 messages

Meaning: Consumer is 50 messages behind production.
```

**Why it matters:**

- **Lag = 0:** System is keeping up
- **Lag = 100:** System is ~1 second behind (if 100 msg/sec production)
- **Lag = 10,000:** System is ~100 seconds behind; data is stale

**SLO violation threshold:** If SLO says "data lag < 60 seconds" and you see lag > 600 messages (assuming 10 msg/sec), you have violated SLO and should page.

**Causes of growing lag:**
1. Consumer is slow (long message processing time)
2. Consumer crashed (backlog accumulating)
3. Rebalance (lag builds during rebalance window)
4. Network issue (consumer can't fetch)
5. GC pause (Java: 500ms GC = lag increase = 500ms × producer_rate)

**Monitoring lag:**
```python
# Kafka admin API
from kafka.admin import KafkaAdminClient, ConfigResource, ConfigResourceType

admin = KafkaAdminClient(bootstrap_servers=['localhost:9092'])
for partition in admin.describe_consumer_groups()['consumer_groups'][0].member_metadata:
    lag = partition.latest_offset - partition.committed_offset
    print(f"P{partition.partition}: lag={lag}")
```

### Ordering Guarantees

**Within a partition:** Strict ordering (offset 0, 1, 2, 3, ...)

**Across partitions:** No ordering guarantee.

```
Topic "orders" with 3 partitions

P0: order 1, order 4, order 7
P1: order 2, order 5, order 8
P2: order 3, order 6, order 9

Consumer sees: [1, 2, 3, 4, 5, 6, 7, 8, 9] (if polling all partitions)
            or [1, 4, 7, 2, 5, 8, 3, 6, 9] (if fetching in round-robin)
            or any interleaving

Only within partition is order guaranteed.
```

**How to get global order:** Use a single partition (kills parallelism, max throughput = 1 partition speed) or use an **ordering key** and route all orders for the same `order_id` to the same partition.

```go
// Kafka producer routing by key
producer.SendMessage(&sarama.ProducerMessage{
    Topic: "orders",
    Key:   sarama.StringEncoder("order_123"),  // Same key → same partition
    Value: sarama.StringEncoder(orderJSON),
})
```

### Exactly-Once Semantics (Read Carefully)

Kafka 0.11+ added **transactional writes**, which gives you **exactly-once delivery** *if* you implement it correctly.

```python
# Exactly-once read-process-write pattern
# (process: update database, commit offset as one transaction)

def exactly_once_consumer():
    for msg in kafka_consumer:
        # Start transaction
        with transaction:
            processed = process(msg)
            db.insert(processed)
            kafka_consumer.commit_async()  # Async commit inside transaction
        # If anything above fails, entire transaction rolls back
        # Message is redelivered, dedupe on business key
```

**The catch:** This requires:
1. The *processing* to be idempotent (processing same message twice = same result)
2. Offset commits must go to Kafka (not external DB), or you need distributed transaction
3. End-to-end exactly-once from source→Kafka→processing→sink is extremely hard

**In practice:** Most systems use **at-least-once** + **idempotent deduplication.**

```python
# At-least-once + idempotent
def at_least_once_consumer():
    seen = set()  # or cache like Redis
    for msg in kafka_consumer:
        if msg.id in seen:
            continue  # Skip duplicate
        process(msg)
        db.insert_dedupe_key(msg.id)  # Idempotent key in DB
        seen.add(msg.id)
        kafka_consumer.commit_async()
```

### Replication Lag (Not Consumer Lag)

This is a **different** problem: followers lag behind the leader.

```
Leader has offset 0..100
Follower1 has offset 0..95 (lagging)
Follower2 has offset 0..100 (in sync)

If min.insync.replicas=2:
  Producer waits for both follower1 (slow!) and follower2 to ack
  
If follower1 falls too far behind (default: 10s), it is kicked out of ISR
  Then producer only waits for follower2
```

**Causes:**
- Follower is slow (overloaded)
- Network hiccup between leader and follower
- Follower rebooting

**Monitoring:** Check `kafka.server:type=ReplicaManager,name=UnderReplicatedPartitions`

---

## Part 2: Pulsar — Kafka's Alternative

Apache Pulsar is a newer messaging system (Splunk/Yahoo backed) that solves some of Kafka's pain points. It's not "better," but it's different.

### Mental Model: Pulsar's Architecture

```
Kafka: All broker nodes are peers
       Each broker stores partition replicas
       
Pulsar: Tiered architecture
        ├─ Brokers (stateless) ← can add/remove without rebalancing
        ├─ BookKeepers (stateful durable log) ← separate from brokers
        └─ Metadata store (ZK/etcd) ← coordination
```

### Key Differences

| Aspect | Kafka | Pulsar |
|--------|-------|--------|
| **Broker scaling** | Adding a broker requires rebalancing | Add broker, it joins immediately (no rebalance) |
| **Multi-tenancy** | Single cluster shared by all topics | Namespaces isolate teams/customers |
| **Geo-replication** | Complex; needs federation | Built-in; replicate topic across regions |
| **Storage scaling** | Brokers store all data → rebalance needed | BookKeepers scale independently |
| **Consumer groups** | One per consumer | Shared subscriptions; also per-consumer |
| **Exactly-once** | Difficult; transactional API | Easier; deduplication window built-in |
| **Operational complexity** | Simpler; one component (brokers + ZK) | More complex; three layers (broker, BK, metadata) |

### Pulsar Partitioning Model

Kafka: `Topic → Partitions → Replicas on Brokers`

Pulsar: `Tenant → Namespace → Topic → Partitions → Ledgers on BookKeepers`

```
Tenant: "company-a"
├─ Namespace: "production"
│  └─ Topic: "orders"
│     ├─ Partition-0: [Ledger1 on BK1, Ledger2 on BK2, Ledger3 on BK3]
│     └─ Partition-1: [Ledger4 on BK1, Ledger5 on BK2, Ledger6 on BK3]
└─ Namespace: "staging"
   └─ Topic: "orders"
      └─ ...
```

**Ledgers:** Immutable log segments. When full, Pulsar creates a new ledger. BookKeepers store them. This separation means:
- Storage can scale independent of brokers
- Brokers are stateless (restart = no rebalancing)
- Old ledgers can be offloaded to S3 (Pulsar feature)

### Multi-tenancy in Pulsar

```
Kafka cluster: One team or many teams sharing
              → One team misconfigures topic → affects everyone
              → One team's consumer lag spike → rebalance affects everyone

Pulsar cluster: Tenants are isolated
               → company-a:prod isolated from company-b:prod
               → Quotas per tenant (message rate, storage)
               → Different policies (retention, replication)
```

**Example:** Stripe could give each customer a Pulsar tenant with isolated quotas.

### Geo-Replication

**Kafka:** Manually set up MirrorMaker or Confluent Replicator. Complex.

**Pulsar:** Built-in.
```python
# Pulsar: One-line configuration
pulsar-admin topics create-partitioned-topic \
  persistent://tenant/namespace/topic \
  --replication-clusters us-east,us-west,eu

# Now topic is automatically replicated across regions
```

### Consumer Subscriptions

Kafka has **consumer groups**. Pulsar has **subscriptions** with multiple modes:

| Subscription Type | Behavior |
|---|---|
| **Exclusive** | Only one consumer can subscribe; others wait (Kafka default) |
| **Shared** | Multiple consumers share messages (like Kafka with round-robin) |
| **Failover** | One active consumer; others are standbys. Failover on consumer crash |
| **Key_Shared** | Messages with same key always go to same consumer (like Kafka key-routing) |

**Advantage:** No rebalancing on Exclusive/Failover. When active consumer crashes, a standby instantly takes over (no rebalance delay).

### Tiered Storage

Pulsar can automatically offload old ledgers to S3/GCS.

```
BookKeeper storage:            S3:
├─ Recent ledgers              ├─ Old ledgers
│ (hot, in memory)             │ (cold, archived)
│ ~10GB                        │ ~10TB
│ Fast reads                   │ Cheap, slow reads
└─ Offload threshold:          └─ Can be replayed if needed
  when ledger is 2 weeks old
```

**Why:** Kafka requires brokers to store all data on local disk. Pulsar lets you keep only recent data "hot" and archive old data cheaply.

### Exactly-Once Deduplication

Pulsar has built-in deduplication on a **producer sequence ID**:

```python
# Pulsar: Automatic deduplication
producer = client.create_producer(
    topic='my-topic',
    deduplication_enabled=True,  # Global dedup, window = 1 hour
)

msg = producer.send(
    content='message',
    sequence_id=123  # Producer seq ID
)

# If producer crashes and retries:
# - Message with seq_id=123 is idempotent
# - Sent 100 times → only stored once
```

Kafka requires you to implement dedup yourself.

---

## Kafka vs Pulsar: Decision Matrix

| Use Kafka if... | Use Pulsar if... |
|---|---|
| You have one team, one use case | You have multiple teams/tenants |
| Operational simplicity > everything | You need geo-replication built-in |
| You can tolerate rebalance latency spikes | You need <100ms consumer lag SLO |
| Your data is "hot" (recent messages only) | You need cheap long-term storage (tiered storage) |
| You have the Kafka expertise in-house | You want to avoid Kafka's operational pain |
| You're not worried about rebalancing cascades | Rebalancing is a bottleneck in your ops |
| Your message volume is modest (<100MB/s) | You're at massive scale or multi-region |

### Real Numbers: When Pulsar Wins

**Scenario: 500,000 RPS, multi-region (US + EU), 5 teams**

**Kafka:**
- One cluster per region (2 clusters)
- Each cluster: ~15 brokers
- Each team's topic: ~6 partitions
- Cost: Brokers at full RF=3 size
- Rebalancing overhead: When any broker restarts, 10-30s of elevated latency cluster-wide
- Multi-region: Manual federation, lag = 5-60 seconds

**Pulsar:**
- One cluster, multi-region replication enabled
- BookKeepers: ~12 (scales independently)
- Brokers: ~6 (mostly idle)
- Each team: 3 partitions
- Cost: Lower (BookKeepers cheaper than Kafka brokers)
- Rebalancing: None (brokers are stateless)
- Multi-region: Automatic, lag < 100ms

**Cost difference:** Kafka = $20k/month, Pulsar = $8k/month (rough estimate at this scale)

---

## Antipatterns

### Antipattern 1: Partition Count Too Low

```
Topic: 10 partitions
Consumers: 100

→ 90 consumers are idle
→ Parallelism capped at 10
→ Max throughput = single consumer speed × 10

If single consumer can handle 10k msg/s:
Max throughput = 100k msg/s
Actual throughput = 100k msg/s (OK)

But if production is 200k msg/s:
Lag builds forever
```

**Fix:** Over-provision partitions early. 10x your expected consumer parallelism.

### Antipattern 2: Not Monitoring Consumer Lag

```
System appears healthy for weeks
Behind the scenes: lag is growing (consumer is slow)
Customer complains: "My data is 8 hours old"
Postmortem: Nobody was monitoring lag
```

**Fix:** Alert on lag > SLO threshold. Lag is the real health metric.

### Antipattern 3: min.insync.replicas=1

```
Default setting: only leader needs to ack
Leader crashes: message written but not replicated
New leader elected: message is gone forever
Customer notices: data loss
```

**Fix:** Set `min.insync.replicas=2` (or higher). Producers wait for replicas.

### Antipattern 4: No Backpressure on Producer

```
Producer: fire and forget
Queue starts filling (consumer slow)
Queue fills: 1000, 10000, 100000 messages
Memory: producer process OOM
System: cascading failure

Better: Producer should respect queue length
If queue > threshold: producer backed off or rejected
```

**Fix:** Use callbacks/futures in producer; track inflight requests.

---

## Interview Questions

=== "Foundation"
    **Q: What is consumer lag and why does it matter?**
    
    "Consumer lag = latest_offset - committed_offset. If lag is 0, consumer is keeping up. If lag is 100 messages and production is 10 msg/sec, the consumer is ~10 seconds behind. Lag growing = red flag (consumer slow, crashed, rebalancing, or GC pause). It's the real health metric for async systems."
    
    **Q: What is an in-sync replica (ISR)?**
    
    "An ISR is a replica that has caught up to the leader. A message is considered 'committed' (safe from loss) only when ALL brokers in the ISR have replicated it. If you have RF=3 and min.insync.replicas=2, the producer waits for leader + 1 replica to ack before returning. Higher min.insync.replicas = more durable but slower."

=== "Senior"
    **Q: Your Kafka consumer group is rebalancing every 30 seconds. Why and how do you fix it?**
    
    "Rebalancing means a consumer is crashing or getting kicked out. Check: (1) Consumer logs for exceptions, (2) `max.poll.interval.ms` — if processing takes longer than this, consumer is kicked out and rebalances, (3) `session.timeout.ms` — if consumer is slow to heartbeat, it's declared dead. Increase `max.poll.interval.ms` if processing is legitimately slow. Or: optimize processing to be faster."
    
    **Q: When should you use Kafka vs Pulsar?**
    
    "Kafka if: you have one team, simple use case, Kafka expertise, operational simplicity matters. Pulsar if: multiple teams/tenants need isolation, you need geo-replication, you want to avoid rebalancing pain, tiered storage saves cost. Kafka is simpler to operate at small scale; Pulsar wins at multi-region or multi-tenant scale."

=== "Staff"
    **Q: Design a messaging system for a SaaS platform where different customers have different retention/replication policies.**
    
    "I'd use Pulsar with multi-tenancy: each customer gets a tenant, each tenant has namespaces for prod/staging. Within Pulsar: (1) Subscriptions with `Key_Shared` mode (no rebalancing on consumer crash), (2) Tiered storage (recent data on BookKeepers; old data on S3), (3) Geo-replication enabled for HA, (4) Per-tenant quotas (msg/sec, storage). Operational advantages: (1) brokers are stateless (add/remove without rebalance), (2) consumer failover <1s (standby subscription), (3) storage scales independently of brokers. Cost: ~40-60% cheaper than Kafka at multi-region scale."
    
    **Alternatively (if Kafka is mandated):** "I'd use Kafka with federation (MirrorMaker) between regions. Each team gets a topic with `RF=3, min.insync.replicas=2`. Consumer groups use manual assignments with sticky assignors to minimize rebalance impact. Monitoring: lag alerts per partition, GC pause monitoring (Java), and circuit breakers on slow consumers to prevent cascading rebalances. This is more operational burden than Pulsar but doable at moderate scale."

---

## Key Takeaways

!!! success "Remember"
    1. **ISR = in-sync replicas.** Message is committed only when all ISRs ack. If min.insync.replicas=1, only leader matters (risky).
    2. **Rebalancing stops consumption** (5-30 seconds typical). This is the #1 operational pain in Kafka.
    3. **Consumer lag = health metric.** Lag growing = red flag. Set SLO (e.g., lag < 60 sec) and alert.
    4. **Ordering is per-partition**, not global. Use a key to route related messages to same partition.
    5. **Exactly-once is impossible.** At-least-once + idempotent handler is the answer.
    6. **Pulsar has stateless brokers** (no rebalancing) and multi-tenancy built-in.
    7. **Kafka simpler at small scale; Pulsar wins at multi-region/multi-tenant scale.**
    8. **Over-provision partitions.** Adding partitions later re-hashes keys (breaks ordering).
    9. **Monitor lag religiously.** It's invisible until someone looks, then it's too late.
    10. **Rebalancing cascades can kill availability.** Use sticky assignors and `max.poll.interval.ms` tuning.

---

**Previous:** [Kafka consumer groups](kafka.md) | **Next:** [Queue patterns](patterns.md)

