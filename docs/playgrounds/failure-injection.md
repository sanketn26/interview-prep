---
title: Failure-injection tasks
description: Predict-then-run drills on existing simulations — no new canvases.
---

# Failure-injection tasks

Use the sims that already live on host pages (`docs/assets/js/simulations.js`). Do **not** treat this as a game. For each row: **predict** what fails first and why, **then** press the control, **then** explain the log line.

Full index of canvases: [Playgrounds](index.md). Several have a real-process twin in [Labs](../labs/index.md).

!!! warning "Protocol"
    Write the prediction down (one sentence + which metric moves). If the screen surprises you, the mental model is wrong — re-read the host page before the next task.

---

## Hot partitions

| | |
|---|---|
| **Open** | [Kafka](../messaging/kafka.md) — Partition & consumer group simulator |
| **Change** | Start producer. Then **Hot key**. |
| **Predict** | Which consumer’s lag grows? Do extra consumers help? Why is parallelism still `min(consumers, partitions)`? |
| **Fails first** | Partition 0 / C0 saturates; other partitions look healthy. Adding a consumer does nothing for a single hot partition. |
| **Already wired** | `KafkaSimulator.setHotKey(true)` — button **Hot key**. |

Same shape on [Sharding](../databases/sharding.md): **Hot key 70%**. Predict: one shard’s write bar explodes; the other three idle. Consistent hashing is not the fix for a celebrity `user_id`.

---

## Replica loss

| | |
|---|---|
| **Open** | [Replication](../distributed-systems/replication.md) — Quorum replication |
| **Change** | Traffic on, RF=3, strict quorum (W=2,R=2). **Kill node** once, then again. |
| **Predict** | After 1 death: writes still succeed? After 2: do writes fail or just slow down? When do stale reads appear? |
| **Fails first** | Writes fail when `up < W`, *before* the cluster “looks down.” Availability % is not the same as write success. |
| **Already wired** | `ReplicationSimulator.killNode()` / `healNode()`. |

Also: [Raft](../distributed-systems/raft.md) **Kill Leader** — cluster is unavailable until a majority elects; 2 of 3 dead stays down. [Kafka](../messaging/kafka.md) **Kill C0** — rebalance; remaining consumers take extra partitions (this is *consumer* loss, not broker RF).

Lab twins: [Postgres replication](../labs/postgres-replication.md), [Redis Sentinel](../labs/redis-cluster.md), [etcd](../labs/etcd-cluster.md).

---

## Increased latency

| | |
|---|---|
| **Open** | [Replication](../distributed-systems/replication.md) |
| **Change** | Traffic on, **Latency spike**. Compare strict quorum vs **Quorum: strict→weak**. |
| **Predict** | Does availability drop, or do stale reads climb? Which knob trades errors for lies? |
| **Fails first** | Replication lag widens the staleness window. Weak R makes *stale reads* the failure, not 5xx. |
| **Already wired** | `latencySpike()`. |

Also: [Tail latency](../performance/tail-latency.md) **HOL blocking** and **Slow 1% dep** — p50 stays fine, p99 does not. [Circuit breaker](../reliability/circuit-breakers.md) retry-storm **Slow downstream** — inbound RPS unchanged, downstream RPS multiplies.

---

## Changed read/write ratio (working-set vs capacity)

There is no separate “read/write ratio” slider. The cache capacity sim is the one that makes miss-rate × QPS visible.

| | |
|---|---|
| **Open** | [Cache strategies](../performance/cache-strategies.md) — Cache capacity |
| **Change** | Traffic on. Cycle **Working set: small→large**, then **Cache size: large→small**, then **TTL: long→short**. |
| **Predict** | Hit rate vs DB QPS. A small hit-rate drop at high RPS is a large DB jump. |
| **Fails first** | Origin QPS, not the cache process. When working set ≫ cache, you are thrashing; TTL tweaks will not save you. |
| **Already wired** | `cycleWorkingSet()`, `cycleCacheSize()`, `cycleTTL()`. |

For “the write path is now the problem,” use [Sharding](../databases/sharding.md) **Write load** + hot key — replicas do not scale writes.

---

## Packet loss

| | |
|---|---|
| **Open** | [HTTP & TCP](../networking/http-tcp.md) — TCP lifecycle |
| **Change** | Run handshake, then **Drop** (and **Timeout** if present). |
| **Predict** | User-facing symptom? Is it “API down” or a 200ms–1s retransmit hole in p99? What happens if the caller retries the POST? |
| **Fails first** | p99 (retransmit timer), then connect timeout, then duplicate submit if the first SYN later succeeds. |
| **Already wired** | `TcpSim.drop()` / `timeout()`. |

DNS sim **failNs** is the sibling: a name lookup failure looks like the API is gone before TCP starts.

---

## Slow consumers

| | |
|---|---|
| **Open** | [Kafka](../messaging/kafka.md) |
| **Change** | Start producer. **Kill C0** (that consumer is now infinitely slow). Optionally **+ Consumer** until consumers > partitions. |
| **Predict** | Where does lag go? Does the idle extra consumer take the dead one’s work without a rebalance? |
| **Fails first** | Lag on partitions assigned to the slow/dead consumer, then a rebalance. Extra consumers beyond partition count stay idle — they are not a speedup. |
| **Already wired** | `killConsumer`, `addConsumer`. There is no separate “slow but alive” slider; death is the extreme slow consumer. |

Related: [Tail latency](../performance/tail-latency.md) **Slow 1% dep** — one slow downstream call poisons the caller’s p99.

---

## Hot keys

| | |
|---|---|
| **Open** | [Cache stampede](../performance/cache-stampede.md) |
| **Change** | Strategy **None**, then **Expire Hot Cache Key**. Repeat with Mutex, Jitter, SWR. |
| **Predict** | DB queries at expiry. Which strategy does *not* help a single celebrity key? |
| **Fails first** | Origin. Jitter does not save one key; single-flight / SWR does. |
| **Already wired** | `expireKey()` + strategy radios. |

Also [Sharding](../databases/sharding.md) **Hot key 70%**, [Kafka](../messaging/kafka.md) **Hot key**.

---

## High cardinality

No dedicated “cardinality” canvas. Two existing hooks:

| | |
|---|---|
| **Open** | [Cache strategies](../performance/cache-strategies.md) |
| **Change** | **Working set: small→large** until working set ≫ cache. |
| **Predict** | Hit rate collapse; stampede size on **Expire all**. |
| **Fails first** | DB QPS. High-cardinality keyspace with a small cache is a miss factory. |
| **Already wired** | `cycleWorkingSet()`, `expireAll()`. |

Read the [Kubernetes](../kubernetes/index.md) **cardinality trap** callout (metric labels vs log fields) — that failure is conceptual; do not look for a button.

Rate limiter [concept sim](../reliability/rate-limiting.md): burst a huge distinct-key workload in your *head* — sliding log memory is the cardinality tax; the canvas is algorithm behaviour, not 20M keys.

---

## Inject-failure buttons (already on host pages)

Use these as the drill, not as extra UI work.

| Host | Control | Class / method |
|------|---------|----------------|
| Kafka | Hot key, Kill C0/C1 | `KafkaSimulator.setHotKey`, `killConsumer` |
| Sharding | Hot key 70%, Traffic skewed, Reshard | `ShardingSimulator.hotKey`, `cycleDistribution` |
| Replication | Kill node, Latency spike, weak quorum | `killNode`, `latencySpike`, `cycleQuorum` |
| Cache stampede | Expire hot key | `expireKey` |
| Cache capacity | Expire all, working set / size / TTL | `expireAll`, `cycleWorkingSet` |
| Load balancer | Kill N0 | `LoadBalancerSim.killNode` |
| Retry storm | Slow downstream | `RetryStormSim.slowDownstream` |
| Circuit breaker | Fail 80% | `CircuitBreakerSim.injectFailure(0.8)` |
| Raft | Kill leader, Partition N1 | `killLeader`, `partition` |
| Saga | Fail charge / fail ship | `failAt('charge')`, `failAt('ship')` |
| Tail latency | HOL, Slow 1% | `injectHol`, `injectSlowDep` |
| TCP | Drop packet | `TcpSim.drop` |
| DNS | Fail NS | `failNs` |
| K8s request flow | Empty endpoints / unready | `failEndpoints`, `failReadiness` |

If a control is missing for a story you care about, **do not add JS** for it here — change the prediction, or use the matching [lab](../labs/index.md).
