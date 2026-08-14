---
title: DDIA Concepts
description: Designing Data-Intensive Applications core concepts applicable to all databases.
---

# DDIA Concepts: Foundation for All Database Systems

This page distills the critical concepts from *Designing Data-Intensive Applications* by Martin Kleppmann that apply to **every** database system you will encounter in interviews and production.

---

## Why This Matters

Most database problems in production trace back to one of four core issues:

1. **Replication** — How do we keep data consistent across multiple machines?
2. **Partitioning** — How do we distribute data when it no longer fits on one box?
3. **Transactions** — How do we guarantee correctness when multiple clients are writing simultaneously?
4. **Consistency Models** — What guarantees can we actually make, and which are illusions?

Understanding these **transfer across every database**: PostgreSQL, MongoDB, Cassandra, DynamoDB, Redis. The mental model is the same; the implementation details differ.

---

## Part 1: Replication — Keeping Data in Sync

Replication answers: *"How do we copy data to another machine and keep both copies consistent?"*

### Leader-Follower (Primary-Replica)

The dominant replication model:

- **Leader** (primary): accepts all writes, applies them to its local storage
- **Followers** (replicas): receive a stream of write events, apply them
- **Reads**: can go to any replica; writes only to leader

```
Client writes: User(id=1, name="Alice")
    ↓
Leader: UPDATE users SET name = "Alice" WHERE id = 1
    ↓
Replication log sent to followers
    ↓
Follower-1: UPDATE users SET name = "Alice" WHERE id = 1  ← same order, same result
Follower-2: UPDATE users SET name = "Alice" WHERE id = 1  ← same order, same result
```

**Why this works**: All three machines apply the same writes in the same order → same final state.

**Replication lag** — the delay between leader applying a write and followers catching up — is your operational reality:

```
Time: 0ms
  Leader applies: INSERT order(id=1, amount=100)
  
Time: 50ms
  Client immediately reads from replica
  Replica hasn't caught up yet → sees old version (order doesn't exist)
  → "I just placed an order but I can't see it!"
```

This is **read-after-write inconsistency**, the most common replication problem.

**Solutions**:
- Read critical data from leader (write-heavy workloads: read from primary)
- Client-side timestamping: "read data as of timestamp T" (eventual consistency contract)
- Follower with guaranteed lag < 100ms (monitoring + alerts)

### Replication Lag: The Performance vs Consistency Trade-off

| Latency | Replicas Sync | Tradeoff |
|---------|---|---|
| **Async (fire-and-forget)** | Leader returns before replicas ACK | Low latency, high durability risk. Leader crashes → data loss. |
| **Semi-sync** | Leader waits for ≥1 replica, returns to client | Balanced. Leader crash loses only in-flight data. |
| **Sync** | Leader waits for all replicas | High latency. One slow replica blocks all writes. |

*Production rule*: async by default (speed matters), but monitor replication lag religiously. When lag > SLO threshold, alert oncall.

### Handling Replication Failures

When a follower falls behind (network partition, GC pause):

```
Leader:     [Write1] [Write2] [Write3] [Write4]
Follower:   [Write1] [Write2]  ← gap, lag = 2 writes
            
When follower reconnects:
1. Follower asks: "Where did I fall behind?"
2. Leader: "You're missing writes from offset 3 onward"
3. Follower: "Send me everything from offset 3"
4. Leader streams all changes
5. Follower replays them → catches up
```

If the leader crashes and you promote a follower to leader, that follower might be behind. **You chose to lose those unreplicated writes.** This is why async replication has durability risk: those writes exist nowhere else.

### Cascading Failures in Replication

```
Writes are slow (200 ms). Replicas accumulate lag.
  → One replica falls so far behind it disconnects
  → All reads are now served by fewer replicas
  → Each replica gets more load
  → They get slower
  → More fall behind
  → Cascading failure: you end up reading only from leader
```

This is why monitoring replication lag isn't optional.

---

## Part 2: Partitioning (Sharding) — Splitting Data Across Machines

Replication solves **redundancy** (data available on multiple machines). Partitioning solves **scale**: data too large for one machine.

### The Core Problem

```
Dataset: 10 TB
One machine can hold: 2 TB
Solution: 5 machines, 2 TB each
Problem: How do we decide which data goes on which machine?

If partition scheme is wrong:
  - Machine 1: 100 GB
  - Machine 2: 100 GB
  - Machine 3: 9,700 GB  ← hotspot, takes all the queries
```

### Partition by Range

```
User IDs 1-1M → Machine A
User IDs 1M-2M → Machine B
User IDs 2M-3M → Machine C
...
```

**Pros**: Range queries are efficient ("get all users 1M-1.5M" = single machine).

**Cons**: If your keys aren't uniformly distributed, you get hotspots.

```
US users: 500M
European users: 100M
Asian users: 50M

If partitioned by geography:
  US partition gets hammered
  Europe and Asia partitions sit idle
```

### Partition by Hash

```
hash("user_" + user_id) % num_machines = partition
hash("user_1") % 5 = 2 → Machine C
hash("user_2") % 5 = 1 → Machine B
hash("user_1000000") % 5 = 4 → Machine E
```

**Pros**: Distributes load evenly; hotspots become extremely unlikely (even for celebrity users like Elon Musk).

**Cons**: Range queries are lost. "Get all users in range 1M-2M" now requires querying all machines.

```
SELECT * FROM users WHERE id BETWEEN 1000000 AND 2000000;
↓
Single partition (range): 1 machine queried
↓
Hash partition: All 5 machines queried in parallel, results merged
```

**Real cost**: If this is a common query pattern, you're paying for partitioning in latency.

### Consistent Hashing

Standard modulo hashing has a fatal flaw: **adding or removing a machine rehashes everything**.

```
5 machines, user 1000 maps to: hash(1000) % 5 = 2
Add machine 6: hash(1000) % 6 = 0  ← different machine! Must move all data.
```

Consistent hashing solves this:

```
Imagine a clock face (0 to 2^32).
Each machine claims a range on the clock.

User 1000: hash(1000) = 1,000,000,000 → falls in Machine-B's range
Add Machine-F: claims a new range
  Only data in Machine-F's range moves; others unaffected.
```

**Production impact**: Consistent hashing lets you add/remove partitions with minimal reshuffling. Without it, scaling is a full rewrite.

### Hot Partitions (Hotkeys)

Even with hash partitioning, you can get hotspots from data, not distribution:

```
Celebrity user (100M followers) posts → 100M writes to one partition
All other users' partitions sit idle
```

**Solutions**:
- **Separate hot data**: Detect celebrity users, split their writes across multiple partitions with a suffix:
  ```
  partition_key = "user_" + user_id + "_" + random(0, 100)
  Elon Musk writes → "user_1_42", "user_1_87", "user_1_15"...
  Reads: "get me user_1_*" → query all 100 shards (read 100x slower, but write burden distributed)
  ```
- **Caching**: Cache popular data in a distributed cache (Redis), serve reads from cache
- **Rate limiting**: Limit how fast one user can write per partition

---

## Part 3: Transactions — Consistency in the Face of Concurrency

Transactions answer: *"When multiple clients write simultaneously, how do we prevent corruption?"*

### The Classic Problem

```
Alice's bank account: $100
Bob's bank account: $50

Alice sends $30 to Bob:
1. Read Alice's balance: $100
2. Read Bob's balance: $50
3. Deduct from Alice: $70
4. Add to Bob: $80
```

Without transactions, both reads could complete at step 1, then both writes happen out of order:

```
Thread-A: Read Alice=100, Read Bob=50, Write Alice=70, Write Bob=80
Thread-B: Read Alice=100, Read Bob=50, Write Alice=???, Write Bob=???

What if Thread-B's write happens between Thread-A's reads and writes?
→ Dirty read, lost update, inconsistency
```

### ACID Semantics

**A - Atomicity**: "All or nothing"
```
BEGIN TRANSACTION
  UPDATE accounts SET balance = 70 WHERE id = alice;
  UPDATE accounts SET balance = 80 WHERE id = bob;
COMMIT;

If either UPDATE fails → entire transaction rolls back
Both succeed → both changes persist
No partial state where Alice lost $30 but Bob never received it
```

**C - Consistency**: "Invariants hold"
```
Invariant: sum of all balances = total money in system
Transactions are written to preserve invariants
```

**I - Isolation**: "Concurrent transactions don't interfere"
```
Transaction A (Alice sends $30) and Transaction B (Bob sends $20)
run at the same time. Isolation guarantees they execute as if
one happened completely before the other, even though they overlap.
```

**D - Durability**: "Once committed, data is permanent"
```
COMMIT returns → data is written to persistent storage
(disk, replicas, quorum)
Crash happens 1 second later → data still there
```

### Isolation Levels

There is no single "isolation." It's a spectrum of guarantees (and performance).

#### Read Uncommitted
```
Transaction A: INSERT account(balance = 100);
                (not committed yet)
Transaction B: SELECT balance FROM account;
                → sees balance = 100 (dirty read!)
```

**Problem**: B sees data A hasn't committed. If A rolls back, B saw data that never existed.

**Use**: Never in production (or only for analytics on copies).

#### Read Committed
```
Transaction A: INSERT account(balance = 100);
Transaction B: SELECT balance FROM account;
                → blocks until A commits or rolls back
```

**Guarantees**: You only see committed data. No dirty reads.

**Problem**: If A reads row X, then B modifies row X and commits, then A reads again:
```
A: SELECT balance FROM alice;  → 100
B: UPDATE alice SET balance = 70;  COMMIT;
A: SELECT balance FROM alice;  → 70 (non-repeatable read)
```

A's view of Alice's balance changed mid-transaction. This is a **non-repeatable read**.

#### Repeatable Read
```
Transaction A: SELECT balance FROM alice;  → 100
               (acquires read lock)
Transaction B: UPDATE alice SET balance = 70;  COMMIT;
               (waits for A's read lock)
Transaction A: SELECT balance FROM alice;  → 100 (same as before)
               COMMIT;
               (releases lock, B can now write)
```

**Guarantees**: Data you read at the start of the transaction is frozen. Repeatable reads.

**Problem**: Phantom reads. A reads "all users in USA", B inserts a new USA user, A reads again:
```
A: SELECT COUNT(*) FROM users WHERE country = 'USA';  → 500
B: INSERT users(country = 'USA');  COMMIT;
A: SELECT COUNT(*) FROM users WHERE country = 'USA';  → 501 (phantom!)
```

The set of rows matching a query changed mid-transaction.

#### Serializable
```
All transactions execute sequentially, in order.
A: SELECT...
A: UPDATE...
A: COMMIT;
← (A must complete before B starts)
B: SELECT...
B: UPDATE...
B: COMMIT;
```

**Guarantees**: No dirty reads, no non-repeatable reads, no phantoms. Perfect isolation.

**Cost**: Severely limited concurrency. Most production systems can't tolerate this.

### The Trade-off Chart

| Level | Dirty Reads | Non-repeatable | Phantoms | Concurrency |
|---|---|---|---|---|
| Read Uncommitted | Yes | Yes | Yes | Highest |
| Read Committed | No | Yes | Yes | High |
| Repeatable Read | No | No | Yes | Medium |
| Serializable | No | No | No | Low |

**Interview answer**: "Most systems use Read Committed by default because it prevents the worst anomalies (dirty reads) while preserving concurrency. We add explicit locks where Repeatable Read is needed (financial transactions, inventory)."

---

## Part 4: Consistency Models — What Can We Really Guarantee?

This is the most misunderstood topic. When engineers say "our database is consistent," they could mean 5 different things.

### Strong Consistency

All clients see the same data at the same time. Writes are instantly visible to all readers.

```
Client-A writes: value = 100
Client-B reads: immediately sees 100
Client-C reads: immediately sees 100
```

**Cost**: Requires synchronous replication (leader waits for all replicas to acknowledge write before returning). High latency.

**Reality**: True strong consistency only exists on a single machine. Across a network, it's impossible (CAP theorem).

### Eventual Consistency

Writes are applied asynchronously. Clients may see stale data temporarily, but eventually all replicas converge.

```
Client-A writes: value = 100
  ↓ (async replication)
Replicas eventually catch up
  ↓ (300 ms later)
Client-B reads: sees 100
```

**Cost**: Low latency (returns immediately to client).

**Tradeoff**: You must handle stale reads. "I just placed an order, why can't I see it yet?"

### Causal Consistency

A middle ground: "If event B causally depends on event A, all clients see A before B."

```
Alice posts comment: "Great article!"
Bob reads Alice's comment
Bob replies: "I agree"

Causal chain: Alice's comment → Bob's reply

With causal consistency:
- Everyone sees Alice's comment before Bob's reply
- But Alice's comment and an unrelated Carol post might appear out of order
```

**Cost**: More expensive than eventual (requires tracking causality), cheaper than strong (doesn't require all replicas).

### Write Concern (Application-Level Guarantee)

Not a database feature, but how you **use** the database:

```
Option 1: Fire-and-forget
  db.insert(doc, {w: 0})
  Returns immediately, doesn't wait for durability
  Risk: Data loss on crash

Option 2: Wait for primary
  db.insert(doc, {w: 1})
  Waits for primary to acknowledge
  Risk: Replica hasn't caught up; if primary crashes, data loss

Option 3: Wait for quorum (2 of 3 replicas)
  db.insert(doc, {w: 2})
  Guarantees majority has data
  If primary crashes, majority will have the data and survive
  
Option 4: Wait for all
  db.insert(doc, {w: "all"})
  Slow but durable
```

**Interview signal**: "We write with `w: majority` because it provides durability without making writes too slow."

---

## Part 5: Quorum Reads and Writes

Quorum elegantly solves the problem: *"How do I know my data survived, without waiting for everyone?"*

### The Math

```
Nodes: N
Write quorum: W
Read quorum: R

If W + R > N:
  → every read quorum overlaps with every write quorum
  → guaranteed to see at least one replica that has the latest write
```

**Example: 5 nodes**
```
W = 3 (write waits for 3 of 5 nodes to ACK)
R = 3 (read queries 3 of 5 nodes, returns latest version)

W + R = 6 > 5 ✓

Scenario:
1. Write succeeds on nodes [A, B, C]. Returns to client.
2. Nodes [D, E] haven't replicated yet.
3. Read queries nodes [A, D, E].
   → Finds latest version on node A
   → Returns correct data
```

### Read Repair and Hinted Handoff

In practice, quorum is enhanced with:

**Read Repair**: On read, if one replica is stale, overwrite it:
```
Read queries [A, D, E]
  A: version=100
  D: version=50 (stale)
  E: version=100
→ Read repair: send version=100 to D
→ Return version=100 to client
```

**Hinted Handoff**: If a node is down, write to a healthy node with a hint that it's for the unavailable node:
```
Write to [A, B, C]
  A: OK
  B: OK
  C: unavailable
→ Write to D with hint "this is for C"
Later, when C comes online:
  D → C: "Here's data meant for you"
```

---

## Part 6: Consensus — How Distributed Systems Agree

When a master fails, replicas must **agree** on which one becomes the new master. Consensus protocols solve this.

### The Two Generals Problem

```
General A and General B must attack at the same time.
They communicate only via messengers (who might not arrive).

A sends: "Attack at 9 AM"
  Messenger might lose the message → B never knows

A sends: "Attack at 9 AM"
B receives: "OK, I'll attack at 9 AM"
B sends back confirmation
  Messenger might lose the confirmation → A thinks B didn't get it

There is NO sequence of messages that guarantees agreement without a trusted third party.
```

In databases, the "trusted third party" is a **voting majority**.

### Raft Consensus (Simplified)

Raft ensures a majority of nodes agree before any change is permanent.

```
Nodes: [A, B, C, D, E]

Leader: A
Write request: "value = 100"

A logs the entry (uncommitted)
A sends to all replicas: "Log this entry"
B receives, logs it: ACK
C receives, logs it: ACK
A now has majority (3/5): commits the entry
A sends to all: "This entry is now committed"
B, C, D, E mark as committed

If A crashes now → B, C have committed data → new leader will have it
```

**Why this works**: Majority replication means even if half the cluster dies, the surviving half has the latest committed data and can continue.

---

## Part 7: Conflict-Free Replicated Data Types (CRDTs)

CRDTs solve a different problem: *"What if we can't use a single leader?"* (e.g., peer-to-peer systems, offline-first apps).

### Last-Write-Wins (LWW) Counter

```
Device-A: counter = 10 (timestamp: 100ms)
Device-B: counter = 20 (timestamp: 50ms)

Conflict: both sides have different values
LWW rule: higher timestamp wins
Result: counter = 10 (from Device-A, timestamp 100ms)
```

**Problem**: Causal ordering can be wrong. Device-B's increment might have been based on 5, then Device-A increments, but Device-B's timestamp is old so it wins.

### Vector Clocks

```
Each node tracks: [A's clock, B's clock, C's clock]

Device-A: [1, 0, 0]
  A increments counter locally: [2, 0, 0]
Device-B: [0, 1, 0]
  B increments counter locally: [0, 2, 0]

Merge at sync:
  Device-A sees [0, 2, 0]
  Device-B sees [2, 0, 0]
  Vector [2, 2, 0]: both have incremented, no causality conflict
  
BUT: [2, 0, 0] and [0, 2, 0] are concurrent (neither happened-before)
  → need conflict resolution (merge logic)
```

**Application**: Offline-first databases (Couchbase, Firestore) use CRDTs so edits on your laptop can merge with edits on your phone without a server arbitrating.

---

## Part 8: Read Replicas and Analytics Queries

A common pattern: **separate replica specifically for analytics**.

```
Primary (OLTP):
  - Fast inserts/updates
  - Optimized for transactional consistency
  - Handles operational queries

Read Replica (OLAP):
  - Lagged behind primary by minutes/hours
  - Heavily indexed for analytical queries
  - Optimized for aggregation (GROUP BY, JOIN, scan large tables)
```

**Why separate**: Analytics queries scan large datasets, hit many indexes, and are slow. Running them on the primary would block operational traffic.

```
SELECT customer_id, COUNT(*) as orders, SUM(amount) as total
FROM orders
WHERE date BETWEEN '2024-01-01' AND '2024-12-31'
GROUP BY customer_id
ORDER BY total DESC;

On primary: locks the table for 30 seconds, all writes block
On replica: slow query, but primary traffic unaffected
```

---

## Key Interview Answers

| Question | Answer |
|---|---|
| "How do you handle replication lag?" | Monitor it religiously; alerting when lag > SLO. Use read-from-primary for critical data; eventual consistency for non-critical. |
| "When should we use quorum reads?" | High-value data where reads must always be current. Trade-off: 2-3 nodes to read, slower than single-node read. |
| "How do we handle hot partitions?" | Detect via monitoring (one shard gets > X% of traffic). Options: split hot keys across multiple shards with a random suffix, cache in Redis, rate-limit the user. |
| "What consistency level should we use?" | "Read Committed by default (balance). Repeatable Read for transactions where isolation matters (inventory, financial). Serializable almost never (too slow)." |
| "Can we use eventual consistency here?" | "Only if the domain tolerates stale reads. For money, inventory, auth: no. For analytics, feed recommendations, social: yes." |
| "What's the difference between replication and backup?" | "Replication is continuous (seconds of lag). Backup is point-in-time (minutes/hours old). Use both: replication for HA, backups for recovery." |

---

## Key Takeaways

- **Replication keeps data redundant; partitioning makes it scalable.** Neither is optional at scale.
- **Replication lag is real; design for it.** Async replication is fast but durability-risky. Choose read-from-primary for critical data.
- **Transactions are a spectrum (isolation levels).** Most systems use Read Committed; be explicit when you need stronger guarantees.
- **Consistency models matter more than speed.** Strong consistency is impossible across networks; design for eventual and add synchronization where needed.
- **Quorum reads ensure freshness without waiting for all replicas.** W + R > N is the magic formula.
- **Consensus (Raft/Paxos) is how replicas agree on truth.** A majority is sufficient; doesn't need all.
- **Hot partitions are data problems, not distribution problems.** Even hashing fails if one user generates all traffic; solve at the application layer.

