---
title: Pulsar Primer — Getting Started and Operations
description: Pulsar architecture, setup, producing/consuming, multi-tenancy configuration, and when to migrate from Kafka.
prerequisites:
  - Kafka consumer groups
  - Kafka internals & Pulsar comparison (to understand why Pulsar exists)
---

# Pulsar Primer

**Prerequisites:** [Kafka consumer groups](kafka.md), [Kafka internals & Pulsar comparison](kafka-internals-pulsar-comparison.md)

[← Messaging Overview](index.md)

---

## Why This Exists

You've decided Pulsar might be right for your use case. This page answers: **How do you actually run it?** What does the architecture look like on day one, how do you configure multi-tenancy, what operational tasks are different from Kafka, and what are the gotchas?

This is not Pulsar marketing. This is what you need to know to operate it in production.

---

## Architecture at a Glance

```
┌─────────────────────────────────────────────────────────┐
│ Pulsar Cluster                                          │
├─────────────────────────────────────────────────────────┤
│                                                         │
│  Brokers (stateless, horizontally scalable)             │
│  ├─ pulsar-broker-0:6650 (broker port)                 │
│  ├─ pulsar-broker-1:6650                               │
│  └─ pulsar-broker-2:6650                               │
│     Each handles: topic assignment, producer/consumer  │
│     Can add/remove without rebalancing                 │
│                                                         │
│  BookKeepers (distributed log storage)                  │
│  ├─ bookkeeper-0 → /data/ledgers (where data lives)    │
│  ├─ bookkeeper-1                                       │
│  └─ bookkeeper-2                                       │
│     Stores actual messages in immutable ledgers        │
│     Can scale independently of brokers                │
│                                                         │
│  Metadata Store (ZooKeeper or etcd)                    │
│  ├─ Cluster topology                                  │
│  ├─ Topic assignments                                 │
│  ├─ Consumer offsets                                  │
│  └─ Tenant/namespace definitions                      │
│                                                         │
│  Optional: Tiered Storage                             │
│  └─ S3/GCS (for ledgers older than threshold)         │
└─────────────────────────────────────────────────────────┘
```

**Key difference from Kafka:** Brokers are **stateless**. All data lives in BookKeepers. This means:
- Add a broker = instant (no data rebalancing)
- Remove a broker = no cascading effect
- A broker restart = clients reconnect, no rebalance

---

## Setup: Minimal Cluster

### Local Development (Docker)

```bash
# Docker Compose minimal Pulsar (ZK + Broker + BookKeeper)
version: '3'
services:
  zookeeper:
    image: apachepulsar/pulsar:latest
    command: /pulsar/bin/pulsar zookeeper
    ports:
      - "2181:2181"
    environment:
      - PULSAR_MEM="-Xmx512M"

  bookkeeper:
    image: apachepulsar/pulsar:latest
    command: /pulsar/bin/pulsar bookkeeper
    depends_on:
      - zookeeper
    environment:
      - zkServers=zookeeper:2181
      - PULSAR_MEM="-Xmx512M"

  broker:
    image: apachepulsar/pulsar:latest
    command: /pulsar/bin/pulsar broker
    depends_on:
      - zookeeper
      - bookkeeper
    ports:
      - "6650:6650"      # Binary protocol
      - "8080:8080"      # REST API
    environment:
      - zookeeperServers=zookeeper:2181
      - brokerServiceUrl=pulsar://broker:6650
      - PULSAR_MEM="-Xmx1G"
```

### Production Cluster (3 nodes minimum)

```bash
# Hardware: 3 machines
# Each: 16 cores, 64GB RAM, 1TB NVMe

# Machine 1: ZK + Broker + BookKeeper
# Machine 2: ZK + Broker + BookKeeper
# Machine 3: ZK + Broker + BookKeeper

# Config: /etc/pulsar/broker.conf
brokerServiceUrl=pulsar://pulsar-1.internal:6650
webServiceUrl=http://pulsar-1.internal:8080
zookeeperServers=pulsar-1.internal,pulsar-2.internal,pulsar-3.internal
managedLedgerDefaultEnsembleSize=3
managedLedgerDefaultWriteQuorum=2
managedLedgerDefaultAckQuorum=2
```

**Ensemble/Quorum explanation** (`Qa ≤ Qw ≤ E`):
- `EnsembleSize=3` (E): How many bookies are in the ensemble for the ledger
- `WriteQuorum=2` (Qw): How many bookies **receive** the write
- `AckQuorum=2` (Qa): How many of those must **ack** before the write is committed

Do not define both quorums as "wait for 2 to ack" — Qw is fan-out, Qa is the ack threshold. This is the durability analogue of Kafka `RF=3` with a write that must land on Qw and be acked by Qa.

---

## Producing Messages

### Go Client

```go
import "github.com/apache/pulsar-client-go/pulsar"

// Setup
client, err := pulsar.NewClient(pulsar.ClientOptions{
    URL: "pulsar://broker:6650",
})
defer client.Close()

// Create producer
producer, err := client.CreateProducer(pulsar.ProducerOptions{
    Topic: "persistent://public/default/orders",
    // persistent:// = durable (stored in BookKeeper)
    // tenant/namespace/topic structure
})
defer producer.Close()

// Send message
msgID, err := producer.Send(context.Background(), &pulsar.ProducerMessage{
    Payload: []byte(`{"order_id": 123, "amount": 50.00}`),
    Key:     "order_123",  // Route to same partition
})
```

### Key Difference from Kafka

```
Kafka topic: "orders"

Pulsar topic: "persistent://tenant/namespace/topic"
              └─ persistent:// = durable to disk (vs ephemeral = memory)
              └─ public = tenant (default tenant)
              └─ default = namespace (logical group)
              └─ orders = topic name

Multi-tenant example:
  company-a: "persistent://company-a/production/orders"
  company-b: "persistent://company-b/production/orders"
  
  Each tenant is isolated (separate quotas, policies, replication)
```

---

## Consuming Messages

### Go Client with Subscription

```go
// Create consumer with subscription
consumer, err := client.Subscribe(pulsar.ConsumerOptions{
    Topic:            "persistent://public/default/orders",
    SubscriptionName: "order-processor",
    Type:             pulsar.Shared,  // Multiple consumers share messages
    // Alternative: pulsar.Exclusive (one consumer, others wait)
    // Alternative: pulsar.Failover (one active, others standby)
    // Alternative: pulsar.KeyShared (key-routing, no rebalance)
})
defer consumer.Close()

// Consume messages
for {
    msg, err := consumer.Receive(context.Background())
    if err != nil {
        log.Fatal(err)
    }
    
    // Process message
    err = processOrder(msg.Payload())
    
    if err != nil {
        // Negative ack = redelivery
        consumer.Nack(msg)
    } else {
        // Positive ack = committed
        consumer.Ack(msg)
    }
}
```

### Subscription Types

| Type | Behavior | Use Case |
|------|----------|----------|
| **Exclusive** | Only one consumer; others wait | Single consumer processing |
| **Shared** | Multiple consumers share messages (round-robin) | Parallel processing, like Kafka consumer group |
| **Failover** | One active consumer; others are standbys | High availability without rebalance |
| **Key_Shared** | Messages with same key always go to same consumer | Preserving order per key, no rebalance on consumer crash |

**Key advantage:** Exclusive/Failover don't rebalance on consumer crash. Active consumer dies → standby takes over immediately (<1s). Kafka: all consumers rebalance (5-30s).

---

## Multi-Tenancy Configuration

This is where Pulsar shines. Each customer/team gets isolated resources and policies.

### Setup: Create Tenant

```bash
# Create tenant "acme-corp"
pulsar-admin tenants create acme-corp \
  --allowed-clusters standalone \
  --admin-roles acme-admin

# Create namespace (logical group within tenant)
pulsar-admin namespaces create acme-corp/production
pulsar-admin namespaces create acme-corp/staging

# Set policies per namespace
pulsar-admin namespaces set-retention \
  acme-corp/production \
  --time 7d \
  --size 1000G

pulsar-admin namespaces set-replication-clusters \
  acme-corp/production \
  --clusters us-east,us-west,eu

# Set quotas (max messages/sec, storage)
pulsar-admin namespaces set-namespace-message-rate-limits \
  acme-corp/production \
  --publish-threshold 100000 \
  --consume-threshold 100000
```

### Topics Within Tenant

```
acme-corp/production/orders       → Durable, replicated globally, 7-day retention
acme-corp/production/analytics    → Same policies
acme-corp/staging/test-events     → Different retention (1 day), local only

Each team can manage their own namespace (create topics, set policies)
No cross-team interference
```

### User Access Control

```bash
# Create user "acme-team"
pulsar-admin tokens create --secret-key secret.key \
  --subject acme-team

# Grant permissions
pulsar-admin namespaces grant-permission acme-corp/production \
  --role acme-team \
  --actions produce,consume,admin \
  --topics "acme-corp/production/*"

# Now acme-team can:
# - Produce to any topic in acme-corp/production
# - Consume from any topic
# - Manage that namespace
# But CANNOT access acme-corp/staging
```

**Compare to Kafka:** Kafka has no built-in multi-tenancy. All teams share one cluster, one set of ACLs. Pulsar: tenant-level isolation is baked in.

---

## Tiered Storage (The Cost-Saver)

Pulsar can automatically offload old ledgers to S3/GCS, keeping only recent data "hot."

```bash
# Configure tiered storage
pulsar-admin ns-isolation-policy set-policy \
  --auto-failover-policy-type min_available \
  --auto-failover-policy-params min_limit=1,usage_threshold=80 \
  acme-corp/production

# Set tiered storage for namespace
pulsar-admin namespaces set-offload-policies \
  acme-corp/production \
  --offload-driver s3 \
  --offload-bucket my-bucket \
  --offload-region us-west-2 \
  --offload-threshold-in-bytes 10737418240  # 10GB; offload when ledger > 10GB
```

**What happens:**
- Recent messages (hot data) live in BookKeepers (fast, expensive)
- Messages older than 10GB offload to S3 (slow, cheap ~$23/TB-month vs hot disk at **$10/TB-month** in this example — pick one unit; do not mix $/GB-month with $/TB-month)
- If a consumer rewinds to old data, Pulsar fetches from S3 on-demand

**Cost saving example** (same unit: **$/TB-month**):
```
Scenario: 100MB/s production rate, 30-day retention
Logical volume: 100MB/s × 2,592,000s ≈ 259TB

Kafka: 3 replicas × 259TB ≈ 777TB on disk
       Cost: ~$7,770/month at $10/TB-month

Pulsar:
  Hot (BookKeeper, 3 days): 100MB/s × 259,200s ≈ 26TB × 3 copies ≈ 78TB
       ≈ $780/month at $10/TB-month
  Cold (S3, 27 days): ≈ 233TB × $23/TB-month ≈ $5,360/month
  (The win vs Kafka is not paying RF=3 on the full 30-day set.
   75TB-at-$750 only works as $/TB, never as $/GB.)
```

---

## Geo-Replication (Global Cluster)

Pulsar makes global replication trivial.

```bash
# Create clusters (datacenters)
pulsar-admin clusters create us-east \
  --broker-url http://us-east-broker:8080 \
  --broker-url-tls https://us-east-broker:6651

pulsar-admin clusters create us-west \
  --broker-url http://us-west-broker:8080

pulsar-admin clusters create eu \
  --broker-url http://eu-broker:8080

# Enable replication on namespace
pulsar-admin namespaces set-replication-clusters \
  acme-corp/production \
  --clusters us-east,us-west,eu

# Now every message in acme-corp/production is replicated across all 3 regions
# Consumers in any region read latest
# Latency: ~50-200ms between regions (typical inter-region RTT)
```

**How it works:**
- Producer writes to leader (e.g., us-east)
- Leader replicates to us-west and eu automatically
- Consumer in us-west reads local replica (low latency)
- If us-east goes down, consumers can fail over to us-west/eu. **Async geo-replication is not a zero-loss guarantee** — in-flight or not-yet-replicated messages can still be lost; treat it as RPO > 0 unless you designed a synchronous ack across clusters.

**Compare to Kafka:** You need MirrorMaker or Confluent Replicator (separate tools, complex). Pulsar: one namespace setting, automatic.

---

## Operational Differences from Kafka

| Operation | Kafka | Pulsar |
|---|---|---|
| Add broker | Replica reassignment (data movement), not a consumer-group rebalance by itself | Instant (stateless broker) |
| Remove broker | Replica reassignment | Instant |
| Restart broker | Clients reconnect; group rebalance only if consumers miss session/poll timeouts | Consumers reconnect, no group rebalance |
| Add partition | Re-hashes keys (breaks ordering) | Pulsar **has partitioned topics**; adding partitions has the same key-mapping caveat |
| Scale storage | Add more brokers (expensive) | Add BookKeepers (or use tiered storage) |
| Scale globally | MirrorMaker (separate tool) | Set replication-clusters (one command) |
| Per-topic policies | Configure per topic (tedious) | Per-namespace (inherit by topic) |

**Operational wins for Pulsar:**
- No rebalancing cascades
- Broker add/remove is 5-minute task, not 5-hour project
- Tiered storage avoids disk-size scaling
- Geo-replication is operational, not architectural

---

## Pulsar vs Kafka: When to Migrate

### Migrate to Pulsar if...

✓ You have multiple teams/tenants (multi-tenancy isolation is critical)  
✓ You need geo-replication (currently use MirrorMaker or accept lag)  
✓ You're hitting Kafka's rebalancing pain (hourly cascading rebalances)  
✓ You want cheaper long-term storage (tiered storage savings are huge)  
✓ You're running Kafka on expensive hardware (BookKeepers are cheaper)  
✓ You're deploying Kubernetes (Pulsar Helm charts are excellent)

### Stay on Kafka if...

✓ You have one team, one use case (Kafka simpler)  
✓ You have Kafka expertise in-house (migration tax is real)  
✓ Your latency requirement is <5ms p99 (Pulsar adds ~5-10ms due to tiering)  
✓ You're deeply integrated with Kafka ecosystem (Connectors, Stream Processing)  
✓ Your message throughput is modest (<50MB/s) (Kafka fine at this scale)

---

## Production Checklist

### Before Launch

- [ ] Cluster: 3 nodes minimum (ZK + Broker + BookKeeper on each)
- [ ] Replication: EnsembleSize=3, WriteQuorum=2, AckQuorum=2
- [ ] Retention: Set per-namespace (retention-seconds, retention-size)
- [ ] Tiered storage: Configured for long-term data (if needed)
- [ ] Replication: Replicas across multiple data centers (if HA needed)
- [ ] Monitoring: Prometheus metrics collection
- [ ] Authentication: SASL + Tokens for multi-tenant setup
- [ ] Backups: Backup BookKeeper ledgers and ZK data

### Ongoing

- [ ] Monitor broker/BookKeeper disk usage (alert at 80%)
- [ ] Monitor consumer lag per subscription (alert if lag > SLO)
- [ ] Monitor replication lag (alert if > 100ms)
- [ ] Health-check topic: produce ping message, consume within SLO
- [ ] Upgrade strategy: Rolling upgrade (1 broker/BK at a time)
- [ ] Disaster recovery: Test failover to secondary cluster quarterly

### Performance Tuning

```bash
# Broker settings (/etc/pulsar/broker.conf)
# Increase for high throughput
managedLedgerCacheSizeMB=2048  # More cache = fewer disk hits
managedLedgerNumWorkerThreads=32  # Parallelism
managedLedgerMaxOpenFencedLedgers=10000

# BookKeeper tuning
# Increase for higher throughput
numAddWorkerThreads=8
numReadWorkerThreads=8
numJournalCallbackThreads=8
journalFormatVersionToWrite=5  # Latest format
```

---

## Interview Questions

=== "Foundation"
    **Q: What's the difference between Pulsar brokers and BookKeepers?**
    
    "Brokers are stateless—they handle topic assignments, produce/consume coordination, but don't store data. BookKeepers store the actual messages in immutable ledgers on disk. Separating concerns means brokers can be added/removed instantly (no rebalancing), and storage scales independently. Kafka puts everything on the broker, which is why adding a broker triggers a rebalance."
    
    **Q: What is a Pulsar subscription?**
    
    "A subscription is how a consumer group tracks position in a topic. Subscription types: Exclusive (one consumer), Shared (multiple consumers share messages), Failover (one active + standbys), Key_Shared (key-routing, no rebalance on crash). Unlike Kafka (always rebalances), Exclusive/Failover don't rebalance when a consumer crashes—immediate failover."

=== "Senior"
    **Q: Design a multi-tenant messaging system for a SaaS platform using Pulsar.**
    
    "Each customer gets a Pulsar tenant (isolated namespace, quota, replication policy). Namespaces within tenant: prod, staging. Each team can manage their namespaces independently. Topics use format: persistent://customer-id/prod/entity. Quotas: 10k msg/sec per customer, 1TB storage. Tiered storage: recent 7 days on BookKeepers, older on S3. Replication: US+EU (2 regions, automatic failover). Monitoring: lag alerts per subscription (<60s), replication lag (<100ms)."
    
    **Q: When would you migrate from Kafka to Pulsar?**
    
    "If (1) multi-tenancy is critical (Pulsar has built-in isolation; Kafka doesn't), (2) geo-replication is needed (Pulsar automatic; Kafka needs MirrorMaker), (3) rebalancing is a pain (Pulsar stateless brokers = no rebalance), (4) cost optimization matters (tiered storage saves 80-90% on storage). Migration tax: re-write client code, re-train ops. Worth it if those pressures are acute."

=== "Staff"
    **Q: You're operating Pulsar for 50 teams at 1TB/s throughput, 30-day retention, multi-region (US, EU, APAC). Optimize for cost and operational simplicity.**
    
    "I'd use: (1) Tiered storage — 1TB/s × 3 days of hot data is ~259 PB *logical*, not 75TB (75TB was a 100MB/s-scale leftover). Size BookKeepers for that hot window × copies, offload the other 27 days to S3. (2) Geo-replication (async: RPO > 0 unless you ack across clusters). (3) Per-team tenant quotas. (4) Ensemble/WriteQuorum/AckQuorum with Qa ≤ Qw ≤ E. (5) Stateless brokers so adding a broker is not a consumer-group rebalance. Cost is dominated by hot-disk × RF plus S3 for cold; do not quote Kafka-vs-Pulsar dollars without naming $/TB. Operational ease: broker restart is reconnect, not a group stop-the-world."

---

## Key Takeaways

!!! success "Remember"
    1. **Pulsar architecture: stateless brokers + BookKeepers.** Add/remove brokers instantly; no rebalancing.
    2. **Topic format: persistent://tenant/namespace/topic.** Multi-tenancy is first-class.
    3. **Subscription types matter:** Exclusive (one consumer), Failover (instant failover, no rebalance), Key_Shared (ordering per key).
    4. **Tiered storage saves 80-90%** on long-term retention (3-month payback at scale).
    5. **Geo-replication is one command** (`set-replication-clusters`), not a separate tool.
    6. **BookKeeper ensemble/quorum:** Think RF and min.insync like Kafka; tune for latency vs durability.
    7. **Migration cost:** Rewrite clients, retrain ops. Worth it if multi-tenancy or geo-replication is critical.
    8. **Operational wins:** No rebalancing cascades, easier broker scaling, simpler global setup.

---

**Next:** [Kafka internals & Pulsar comparison](kafka-internals-pulsar-comparison.md)

