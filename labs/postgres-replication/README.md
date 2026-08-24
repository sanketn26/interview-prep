# Lab: PostgreSQL Streaming Replication (1 primary + 2 replicas)

Pairs with [Replication](../../docs/distributed-systems/replication.md) and the [Quorum Replication simulator](../../docs/playgrounds/index.md) on that page. Real `pg_basebackup`-cloned streaming replicas — you can watch replication lag, flip sync/async live, and actually run `pg_promote()`.

## Start it

```bash
cd labs/postgres-replication
docker compose up -d
docker compose ps   # wait for all three healthy/running
```

Both replicas start **asynchronous** — see why below before you change that.

## Exercise 1 — Confirm replication is real

```bash
docker exec labs-pg-replication-primary-1 psql -U appuser -d appdb \
  -c "CREATE TABLE t(id int); INSERT INTO t VALUES (1),(2),(3);"

docker exec labs-pg-replication-replica1-1 psql -U appuser -d appdb -c "SELECT * FROM t;"
```

Check the primary's view of its replicas:

```bash
docker exec labs-pg-replication-primary-1 psql -U appuser -d appdb \
  -c "SELECT application_name, state, sync_state, replay_lag FROM pg_stat_replication;"
```

## Exercise 2 — Turn on synchronous replication, live

This is the flip [Replication](../../docs/distributed-systems/replication.md#synchronous-vs-asynchronous-replication)'s trade-off table describes — do it yourself instead of reading about it:

```bash
docker exec labs-pg-replication-primary-1 psql -U appuser -d appdb \
  -c "ALTER SYSTEM SET synchronous_standby_names = 'replica1';"
docker exec labs-pg-replication-primary-1 psql -U appuser -d appdb \
  -c "SELECT pg_reload_conf();"
docker exec labs-pg-replication-primary-1 psql -U appuser -d appdb \
  -c "SELECT application_name, sync_state FROM pg_stat_replication;"
```

`replica1` should now show `sync`; `replica2` stays `async`. **Why didn't we start with this on?** Because `synchronous_commit=on` with `synchronous_standby_names` set means the primary blocks every write — including its *own startup* — until that standby acknowledges. Turn it on before any standby exists and the primary deadlocks waiting for an ACK that can never arrive. This is a real, easy-to-hit production trap, not just a lab quirk.

Time a write with sync on vs. off (stop replica1 first to feel the effect — a sync write will now hang):

```bash
docker stop labs-pg-replication-replica1-1
docker exec labs-pg-replication-primary-1 psql -U appuser -d appdb -c "INSERT INTO t VALUES (4);"
# hangs — the primary is waiting for an ACK from a standby that's down.
# Ctrl+C, then either restart replica1 or drop synchronous_standby_names to recover.
```

## Exercise 3 — Failover: promote a replica

```bash
docker exec labs-pg-replication-replica2-1 psql -U appuser -d appdb -c "SELECT pg_is_in_recovery();"  # t
docker exec labs-pg-replication-replica2-1 psql -U appuser -d appdb -c "SELECT pg_promote();"
docker exec labs-pg-replication-replica2-1 psql -U appuser -d appdb -c "SELECT pg_is_in_recovery();"  # f
```

`replica2` is now a standalone writable primary. This is the **naive/manual** failover [Replication](../../docs/distributed-systems/replication.md#failover-mechanics) warns about: nothing here checked whether `replica2`'s log was actually the most complete, and the old primary is still running and still thinks it's primary — you've just built a two-primary split-brain by hand. Confirm it:

```bash
docker exec labs-pg-replication-primary-1 psql -U appuser -d appdb -c "SELECT pg_is_in_recovery();"  # also f — two primaries now
```

This is exactly why [Raft](../../docs/distributed-systems/raft.md)-based failover (Patroni, repmgr with fencing) exists instead of a human running `pg_promote()`: it guarantees only one node can win an election and that the winner's log is at least as complete as a majority.

## Tear down

```bash
docker compose down -v
```

## What this doesn't teach

Both replicas clone from the primary over the same Docker network with near-zero latency — you won't see the multi-hundred-millisecond replication lag a real cross-region replica has. To feel that, add `pg_ctl` throttling or just reason about it via the [Quorum Replication simulator](../../docs/playgrounds/index.md)'s latency-spike control instead.
