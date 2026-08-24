# Lab: Sharded PostgreSQL (Citus — 1 coordinator + 3 workers)

Pairs with [Sharding](../../docs/databases/sharding.md) and its [sharding simulator](../../docs/playgrounds/index.md). Citus distributes real Postgres tables across real worker nodes by shard key, so you can watch data actually land on different machines instead of just watching a canvas bar chart.

!!! note "Apple Silicon / arm64 hosts"
    Citus only publishes `linux/amd64` images. Docker will run it under emulation (Rosetta or QEMU) on an arm64 host — it works, just slower to start. If `docker compose up` looks stuck, give it another minute before assuming something's wrong.

## Start it

```bash
cd labs/sharding-citus
docker compose up -d --wait coordinator worker1 worker2 worker3
docker compose up cluster-init   # wires the 3 workers into the coordinator
```

## Exercise 1 — Distribute a table by shard key

```bash
docker exec labs-sharding-coordinator-1 psql -U appuser -d appdb -c "
CREATE TABLE events (id bigserial, user_id int, payload text, created_at timestamptz default now());
SELECT create_distributed_table('events', 'user_id');
"
```

`user_id` is the shard key — every row's placement is determined by hashing it. This is [Sharding](../../docs/databases/sharding.md#choosing-a-shard-key)'s "high cardinality, even distribution, used in most queries" advice, applied for real.

## Exercise 2 — Load data, then look at where it actually landed

```bash
docker exec labs-sharding-coordinator-1 psql -U appuser -d appdb -c "
INSERT INTO events (user_id, payload)
SELECT g, 'row-' || g FROM generate_series(1, 5000) g;
"

docker exec labs-sharding-coordinator-1 psql -U appuser -d appdb -c "
SELECT nodename, count(*) AS shard_count
FROM pg_dist_shard_placement GROUP BY nodename;
"
```

You should see roughly even shard counts across `worker1`, `worker2`, `worker3` (Citus defaults to 32 shards, hash-distributed). This is a real answer to "how do I know sharding actually balanced" — not a claim, a query.

## Exercise 3 — Feel the cross-shard query cost

```bash
docker exec labs-sharding-coordinator-1 psql -U appuser -d appdb -c "
EXPLAIN SELECT count(*) FROM events WHERE payload LIKE 'row-4%';
"
```

Compare that plan to a query that includes the shard key:

```bash
docker exec labs-sharding-coordinator-1 psql -U appuser -d appdb -c "
EXPLAIN SELECT * FROM events WHERE user_id = 42;
"
```

The first plan has to fan out to every shard and merge; the second routes to exactly one. This is [Sharding](../../docs/databases/sharding.md#problems-with-sharding)'s cross-shard-query problem, visible in an actual query plan instead of asserted in prose.

## Exercise 4 — Simulate a hot key

Pick one `user_id` and give it disproportionate write volume:

```bash
docker exec labs-sharding-coordinator-1 psql -U appuser -d appdb -c "
INSERT INTO events (user_id, payload)
SELECT 1, 'hot-row-' || g FROM generate_series(1, 20000) g;
"

docker exec labs-sharding-coordinator-1 psql -U appuser -d appdb -c "
SELECT nodename, count(*) FROM pg_dist_shard_placement
WHERE shardid = (SELECT get_shard_id_for_distribution_column('events', 1))
GROUP BY nodename;
"
```

`user_id = 1` now dominates whichever single shard it hashes to — the exact "one shard melts while others idle" scenario the [sharding simulator](../../docs/playgrounds/index.md)'s **Hot key 70%** button shows, except now it's real disk I/O on one real container. Check it with `docker stats` while the insert runs.

## Tear down

```bash
docker compose down -v
```

## What this doesn't teach

Citus's coordinator is itself a single point of failure and a query-routing bottleneck at high enough fan-out — this lab doesn't stand up coordinator HA. It also uses hash-based sharding with a fixed shard count; it won't show you the "reshard cutover" pain the [sharding simulator](../../docs/playgrounds/index.md)'s **Reshard** button represents, because Citus's `rebalance_table_shards()` handles that far more gracefully than a hand-rolled resharding migration would.
