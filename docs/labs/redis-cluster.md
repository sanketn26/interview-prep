---
title: "Lab: Redis Sentinel"
description: A real 3-node Sentinel quorum — kill the master and watch it elect and reconfigure a new one automatically.
---

# Lab: Redis Sentinel

**Pairs with:** [Replication](../distributed-systems/replication.md)

One master, two async replicas, three Sentinels watching with quorum 2. Kill the master and watch a real quorum vote a new one in — and watch it reconfigure the old master as a replica automatically once it comes back, unlike the manual `pg_promote()` split-brain in the [Postgres replication lab](postgres-replication.md).

## docker-compose.yml

```yaml
--8<-- "labs/redis-cluster/docker-compose.yml"
```

## Exercises

The full walkthrough (confirm the quorum sees everyone, kill the master and watch failover, bring the old master back and watch it reconfigure) lives in the lab's README:

**[labs/redis-cluster/README.md on GitHub](https://github.com/sanketn26/interview-prep/blob/main/labs/redis-cluster/README.md)**

```bash
git clone https://github.com/sanketn26/interview-prep
cd interview-prep/labs/redis-cluster
docker compose up -d
```

!!! note "Timing-sensitive"
    Redis Sentinel's failover depends on real clock timing. On a heavily loaded or virtualized Docker host, Sentinel can enter its TILT protection mode and stall failover indefinitely — see the lab README for what to check if this happens. It's a genuine property of Sentinel worth knowing, not just a lab quirk.

[← All Labs](index.md)
