---
title: "Lab: Postgres Replication"
description: A real primary + 2 streaming replicas — flip sync/async live, watch a sync write hang, cause a real split-brain with pg_promote().
---

# Lab: Postgres Replication

**Pairs with:** [Replication](../distributed-systems/replication.md)

A real primary + 2 streaming replicas, cloned via `pg_basebackup`. Flip synchronous/asynchronous replication live, watch a synchronous write hang when its standby is down, and cause a real split-brain by running `pg_promote()` — the naive failover [Replication](../distributed-systems/replication.md#failover-mechanics) warns about.

## docker-compose.yml

```yaml
--8<-- "labs/postgres-replication/docker-compose.yml"
```

## replica-entrypoint.sh

The replica's custom entrypoint — clones from the primary via `pg_basebackup` on first boot, then hands off to the standard postgres entrypoint:

```bash
--8<-- "labs/postgres-replication/replica-entrypoint.sh"
```

## Exercises

The full walkthrough (confirm replication, flip sync/async live, watch a sync write hang, promote a replica and observe the resulting split-brain) lives in the lab's README:

**[labs/postgres-replication/README.md on GitHub](https://github.com/sanketn26/interview-prep/blob/main/labs/postgres-replication/README.md)**

```bash
git clone https://github.com/sanketn26/interview-prep
cd interview-prep/labs/postgres-replication
docker compose up -d
```

[← All Labs](index.md)
