# Lab: etcd Cluster (3 nodes, Raft)

Pairs with [Consensus & Raft](../../docs/distributed-systems/raft.md) and the [Raft simulator](../../docs/playgrounds/index.md), and is literally the "CP" row in [CAP Theorem](../../docs/distributed-systems/cap-theorem.md)'s database table — this lab makes that row's claim checkable instead of asserted.

## Start it

```bash
cd labs/etcd-cluster
docker compose up -d
docker compose ps   # wait for all three (healthy)
```

## Exercise 1 — Find the leader

```bash
docker exec labs-etcd-etcd1-1 etcdctl \
  --endpoints=http://etcd1:2379,http://etcd2:2379,http://etcd3:2379 \
  endpoint status --write-out=table
```

One row shows `IS LEADER: true`. Write something and read it back from a different node:

```bash
docker exec labs-etcd-etcd1-1 etcdctl --endpoints=http://etcd1:2379 put /config/flag hello
docker exec labs-etcd-etcd1-1 etcdctl --endpoints=http://etcd2:2379 get /config/flag
```

## Exercise 2 — Kill a minority (1 of 3), writes keep working

```bash
docker stop labs-etcd-etcd1-1
docker exec labs-etcd-etcd2-1 etcdctl --endpoints=http://etcd2:2379 put /config/flag still-works
```

**Predict first:** why does this succeed? A majority (2 of 3) can still commit — this is `⌊n/2⌋+1` from [Raft](../../docs/distributed-systems/raft.md#mental-model), not a special case.

## Exercise 3 — Kill a majority (2 of 3), writes stop

```bash
docker stop labs-etcd-etcd3-1
docker exec labs-etcd-etcd2-1 etcdctl --endpoints=http://etcd2:2379 --dial-timeout=3s put /config/flag should-fail
```

This should fail with `context deadline exceeded` — not corrupt, not silently accept, just **refuse**. This is the CP choice from [CAP Theorem](../../docs/distributed-systems/cap-theorem.md) made concrete: etcd chose consistency over availability during this partition. No stale write, no split value — just unavailability until quorum returns.

```bash
docker start labs-etcd-etcd1-1 labs-etcd-etcd3-1   # restore quorum, writes resume
```

## Exercise 4 — Serializable vs. linearizable reads (the nuance most people miss)

With a majority still down (repeat exercise 3's kill first), try both read modes:

```bash
docker exec labs-etcd-etcd2-1 etcdctl --endpoints=http://etcd2:2379 --dial-timeout=3s get /config/flag --consistency=s   # serializable
docker exec labs-etcd-etcd2-1 etcdctl --endpoints=http://etcd2:2379 --dial-timeout=3s get /config/flag --consistency=l   # linearizable (default)
```

**Predict first:** one of these succeeds without quorum, one doesn't. `--consistency=s` (serializable) reads whatever the local node has — fast, no quorum round trip, but possibly stale. `--consistency=l` (linearizable, the default) requires confirming with a quorum that this node's view is current — which is exactly the CAP-theorem "Consistency" definition from that page (single-copy, real-time-ordered), and exactly why it fails without a majority. This is the precise mechanism behind [CAP Theorem](../../docs/distributed-systems/cap-theorem.md#how-real-databases-behave)'s etcd row: etcd defaults to linearizable reads (a quorum round trip); opting into serializable skips quorum at the cost of possibly-stale data.

## Tear down

```bash
docker compose down -v
```

## What this doesn't teach

This cluster runs with all three nodes in one Docker network with near-zero peer latency — you won't see the effect of a slow (not down) network link on election timeouts or on linearizable-read latency. For that, the [Quorum Replication simulator](../../docs/distributed-systems/replication.md)'s latency-spike control is the faster way to build intuition.
