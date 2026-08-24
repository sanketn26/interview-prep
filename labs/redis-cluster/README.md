# Lab: Redis Sentinel (quorum-based failover)

Pairs with the [Quorum Replication simulator](../../docs/playgrounds/index.md) and [Replication](../../docs/distributed-systems/replication.md). One master, two async replicas, three Sentinels watching with quorum 2.

This is Sentinel (leader-follower + a separate quorum-voting layer), not Redis Cluster (hash-slot sharding). Sharding is covered separately by the [sharding lab](../sharding-citus/) — Sentinel and Cluster solve different problems and this lab deliberately isolates the failover one.

## Start it

```bash
cd labs/redis-cluster
docker compose up -d
docker compose ps   # 6 containers: 1 master, 2 replicas, 3 sentinels
```

## Exercise 1 — Confirm the quorum sees everyone

```bash
docker exec labs-redis-sentinel-sentinel1-1 redis-cli -p 26379 sentinel master mymaster
docker exec labs-redis-sentinel-sentinel1-1 redis-cli -p 26379 sentinel replicas mymaster
```

You should see one master and two replicas, both `flags: slave` and streaming.

## Exercise 2 — Kill the master, watch Sentinel elect a new one

```bash
docker exec labs-redis-sentinel-redis-master-1 redis-cli SET k1 hello
docker stop labs-redis-sentinel-redis-master-1
```

Poll until it flips:

```bash
watch -n1 'docker exec labs-redis-sentinel-sentinel1-1 redis-cli -p 26379 sentinel get-master-addr-by-name mymaster'
```

**Predict first:** how long should this take? `down-after-milliseconds` is 5000 and `failover-timeout` is 10000 in this lab's config — so a healthy quorum should agree the master is down and promote a replica within roughly that window, not instantly.

!!! note "If it doesn't happen"
    Check `docker logs labs-redis-sentinel-sentinel1-1` for `+tilt mode entered`. Sentinel's TILT protection pauses failover decisions whenever its internal clock sees a gap it doesn't trust (the mechanism exists specifically so failover doesn't fire on a bad signal). On a heavily loaded or oversubscribed Docker host — a laptop under load, a throttled CI runner — Sentinel can enter TILT repeatedly and never clear it, which stalls this exercise indefinitely without indicating a config problem. If you hit this, it's a real, worth-knowing failure mode of Sentinel in production too (a paused/descheduled VM can trigger the same thing) — try on a quieter host, or read the [Replication simulator](../../docs/distributed-systems/replication.md)'s quorum failure behavior as the deterministic version of the same lesson.

## Exercise 3 — Bring the old master back

```bash
docker start labs-redis-sentinel-redis-master-1
docker exec labs-redis-sentinel-sentinel1-1 redis-cli -p 26379 sentinel replicas mymaster
```

The old master should rejoin as a **replica** of whichever node Sentinel promoted — Sentinel reconfigures it automatically. This is the "no automatic split-brain" behavior [Replication](../../docs/distributed-systems/replication.md#failover-mechanics)'s failover-mechanics section is describing: unlike the manual `pg_promote()` in the Postgres lab, nothing here left two writable masters.

## Tear down

```bash
docker compose down -v
```

## What this doesn't teach

Sentinel gives you failover, not sharding — every node here holds the full dataset. For "my dataset doesn't fit on one node," see the [sharding lab](../sharding-citus/) instead; conflating the two is a common interview mistake this split is meant to prevent.
