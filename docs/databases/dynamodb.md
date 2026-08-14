---
title: DynamoDB Deep Dive
description: Partition keys, capacity modes, GSI, streams, and the hot partition problem.
---

# DynamoDB Deep Dive: Managed Serverless Scale

DynamoDB is AWS's **serverless key-value database**. You don't manage clusters or nodes — AWS handles replication, failover, and scaling transparently.

---

## Why DynamoDB

DynamoDB trades **operational complexity for simplicity**:

| Concern | DynamoDB | Cassandra |
|---|---|---|
| **Cluster management** | Zero (AWS does it) | You own it (gossip, repair, compaction) |
| **Scaling** | Automatic (provisioned or on-demand) | Manual (add nodes, rebalance) |
| **Availability** | Multi-AZ by default | You configure |
| **Query flexibility** | Limited (keys only, or GSI) | Design your schema carefully |
| **Consistency** | Eventually consistent (or strong per-request) | Tunable (CL) |
| **Cost** | Pay per request or reserved | Pay per node + operations |

---

## Part 1: Partition Keys and Sort Keys

### Partition Key (Required)

Every table has a **partition key** that determines which partition stores the item:

```
Partition key: user_id

user_id="alice" → hash("alice") % 4096 = partition 512
user_id="bob"   → hash("bob") % 4096 = partition 1840

AWS stores replicas of partition 512 across 3 nodes (implicit replication factor = 3)
```

### Sort Key (Optional)

Adds a second dimension for sorting within a partition:

```sql
CREATE TABLE orders (
  user_id string PRIMARY KEY,      -- partition key
  order_id string SORT KEY         -- sort key
);

Items:
  user_id="alice", order_id="order_1"
  user_id="alice", order_id="order_2"
  user_id="alice", order_id="order_3"

Query:
  SELECT * FROM orders WHERE user_id="alice" ORDER BY order_id DESC;
  → Fast: queries one partition, sorts by order_id
```

### Composite Key

```
Partition key: user_id
Sort key: timestamp (DESC)

Query: "Get all events for user_id='alice' in last 7 days"

WHERE user_id = 'alice' AND timestamp > now() - 7 days
→ Scans partition for alice, filters by timestamp
→ Fast (if sorted order matches query)
```

---

## Part 2: Global Secondary Indexes (GSI)

GSI lets you query by **any attribute**, not just the partition key:

```sql
CREATE TABLE users (
  user_id string PRIMARY KEY,
  email string,
  name string,
  created_at timestamp
);

-- Primary key query (fast, no GSI needed)
SELECT * FROM users WHERE user_id = 'alice';

-- Query by email (need GSI)
CREATE GLOBAL SECONDARY INDEX ON users(email);
SELECT * FROM users WHERE email = 'alice@example.com';

-- Query by created_at (need GSI)
CREATE GLOBAL SECONDARY INDEX ON users(created_at);
SELECT * FROM users WHERE created_at > '2024-01-01';
```

### GSI Cost

**GSI consumes separate capacity**:

```
Main table (user_id partition):
  Allocated: 1000 RCU (read capacity units), 500 WCU (write capacity units)

GSI (email partition):
  Allocated: 1000 RCU, 500 WCU (separate from main table!)
  
Total cost = main table + all GSIs

Write a user:
  Main table: 1 WCU
  GSI-1 (email): 1 WCU
  GSI-2 (created_at): 1 WCU
  → 3 WCU total
```

**Interview signal**: "Every GSI increases write cost and storage. Only create indexes for queries you actually run."

### Sparse Indexes

If an attribute is missing from many items, create a **sparse index** (only indexes items where the attribute exists):

```
Table: 1 billion users
Attribute: phone (only 10% have it)

Without sparse index:
  GSI stores 1 billion items (even if 900M have null)

With sparse index:
  GSI stores 100 million items (only those with phone)
  Much smaller, cheaper
```

---

## Part 3: Capacity Modes

### Provisioned Capacity

You pay for reserved capacity (even if unused):

```
Allocated: 1000 RCU, 500 WCU per second

Cost: $0.47/month per 100 RCU + $0.94/month per 100 WCU
      (rough pricing; varies by region)

1000 RCU: ~$47/month
500 WCU: ~$47/month
Total: ~$94/month

If you exceed capacity:
  → Requests are throttled (HTTP 400 ProvisionedThroughputExceededException)
  → Application must retry
```

**Good for**: predictable workloads (you know capacity needs).

### On-Demand Capacity

You pay per request (no reserved capacity):

```
Cost: ~$0.25 per million RCU + ~$1.25 per million WCU

1 million reads: $0.25
1 million writes: $1.25

If traffic spikes:
  → Capacity auto-scales
  → Cost increases, but no throttling
```

**Good for**: unpredictable workloads, spiky traffic, or prototype phases.

### Choosing Between Modes

| Workload | Provisioned | On-Demand |
|---|---|---|
| Steady 10K RCU/sec | $470/month | $0.87/day if 10K RCU uniform |
| Spiky (0-100K RCU/sec) | Over-provision (pay for 100K) | Auto-scale (pay per request) |
| Dev/prototype | On-demand (cheap) | On-demand (cheap) |

---

## Part 4: Streams and Change Capture

### DynamoDB Streams

Track changes to items in a stream (like Kafka):

```
Item: user_id="alice", balance=100

UPDATE users SET balance = 50 WHERE user_id="alice";

DynamoDB Stream:
  MODIFY: {
    "user_id": {"S": "alice"},
    "balance": {"N": "100"}        -- old value
  }
  →
  {
    "user_id": {"S": "alice"},
    "balance": {"N": "50"}         -- new value
  }
```

### Lambda Integration

Trigger Lambda on every DynamoDB change:

```
DynamoDB table → stream → Lambda function
                          (e.g., update cache, send email, log analytics)
```

**Use case**: Sync DynamoDB writes to Elasticsearch for full-text search:

```
1. Write to DynamoDB
2. Stream captures change
3. Lambda reads stream, indexes in ES
4. ES stays in sync with DynamoDB
```

---

## Part 5: The Hot Partition Problem

DynamoDB partitions data by hash(partition_key). **If one partition key gets all traffic, one partition serves everything**:

```
Partition key: user_id

Celebrity user (100M followers):
  Every write to user_id="elon" goes to one partition
  That partition maxes out write capacity
  Other partitions sit idle

Actual: 1 partition at 95% capacity while others at 5%
```

### Solutions

**Solution 1: Distribute Key Writes**

```
Instead of: user_id="elon"
Write to: "elon#" + random(0, 100)

"elon#0": write 1
"elon#1": write 1
...
"elon#99": write 1

Total: 100 writes distributed across 100 partitions

Read: Query "elon#*" (all 100 keys)
```

**Solution 2: Cache Hot Reads**

```
If elon's profile is read 10M times/sec:
  Cache in ElastiCache (Redis)
  Only cache misses hit DynamoDB
```

**Solution 3: Adaptive Sharding**

```
AWS DynamoDB now has adaptive capacity:
  If one partition is hot, AWS automatically replicates it
  (newer feature, not always available)
```

---

## Part 6: Transactions

DynamoDB supports **atomic transactions** across multiple items (different partition keys):

```
BEGIN TRANSACTION
  UPDATE accounts SET balance = 100 WHERE user_id="alice";
  UPDATE accounts SET balance = 50 WHERE user_id="bob";
COMMIT;

If either update fails → entire transaction rolls back
Both succeed → both changes persist
```

**Cost**: Transactions consume 2× the capacity (coordination overhead).

```
Normal write: 1 WCU
Transactional write: 2 WCU

If you do 1000 transactional writes/sec:
  Provisioned: 2000 WCU (vs 1000 for normal writes)
  Cost: 2× higher
```

---

## Part 7: Operational Patterns

### Point-in-Time Recovery (PITR)

```
Backup automatically (up to 35 days retention)

Restore: restore_time="2024-08-10 03:00:00"
→ DynamoDB creates a new table with data from that point
→ No downtime for original table
```

### TTL (Time-to-Live)

Auto-delete items after a time period:

```
CREATE TABLE sessions (
  session_id string PRIMARY KEY,
  created_at timestamp,
  ttl_timestamp timestamp
);

Set TTL on column: ttl_timestamp

INSERT sessions VALUES ('session_123', now(), now() + 1 hour);
-- After 1 hour, item is automatically deleted (no write cost)
```

### Global Tables

Multi-region replication (for low-latency reads across regions):

```
DynamoDB table in us-east-1
  ↕ (replicates both ways)
DynamoDB table in eu-west-1

Write in us-east-1 → automatically replicated to eu-west-1 (< 1 second)
Read from nearest region → always fast
```

---

## Interview Scenarios

| Scenario | Answer |
|---|---|
| "How do we prevent hot partitions?" | "Monitor by partition key. If one key gets > 30% of traffic: distribute writes across multiple sub-keys (user_123#0 through #99), cache hot reads in Redis, or enable DynamoDB adaptive capacity." |
| "When should we use provisioned vs on-demand?" | "Provisioned: steady, predictable traffic (save money). On-demand: spiky or unpredictable. Measure your peak/average ratio — if > 5×, on-demand is cheaper." |
| "Can we do complex queries?" | "Not really. Query by partition key + sort key only (or GSI). Complex filtering (multiple columns) requires ExpressionAttribute. No JOINs. If you need that, consider Postgres." |
| "GSI capacity — how much do we need?" | "Same as main table for the same throughput. Writes flow to both. If GSI falls behind (lag), queries might return stale data. Monitor with metrics." |
| "How do we sync DynamoDB to ES for search?" | "DynamoDB Streams → Lambda → ES. Every write triggers Lambda, which updates ES. Lag depends on Lambda cold start (typically < 1 second)." |

---

## Key Takeaways

- **Partition key is fundamental**: determines which partition stores data. Choose carefully (avoid hotkeys).
- **GSI costs extra**: each GSI is a separate table with its own capacity. Write goes to main table + all GSIs.
- **Provisioned vs On-Demand**: provisioned is cheap at steady scale; on-demand is cheap for spiky/prototype.
- **Hot partitions can't be solved in the app**: distribute key writes across sub-keys or cache hot reads.
- **Transactions are 2× cost**: use only when needed (multi-item atomicity).
- **Streams + Lambda: powerful event-driven pattern**. Use for real-time sync to ES, caches, analytics.
- **TTL is cheap**: auto-delete items without write cost.

