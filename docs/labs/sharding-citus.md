---
title: "Lab: Sharded Postgres (Citus)"
description: A real sharded Postgres cluster — query real shard placement, watch a cross-shard query plan fan out, reproduce a real hot shard.
---

# Lab: Sharded Postgres (Citus)

!!! example "Prediction checkpoint"
    You will run a co-located query and then one that crosses shards. Predict which query stays on one worker and which requires coordination. The distributed plan—not elapsed time alone—shows whether the shard key served the access pattern.

**Pairs with:** [Sharding](../databases/sharding.md)

A real Citus cluster — 1 coordinator + 3 workers. Distribute a table by shard key, query `pg_dist_shard_placement` to see where data actually landed, compare a cross-shard query plan against a single-shard one, and reproduce a real hot shard with `docker stats` showing one container doing all the work.

## docker-compose.yml

```yaml
--8<-- "labs/sharding-citus/docker-compose.yml"
```

## Exercises

The full walkthrough (distribute a table, verify real shard balance, feel the cross-shard query cost, simulate a hot key) lives in the lab's README:

**[labs/sharding-citus/README.md on GitHub](https://github.com/sanketn26/interview-prep/blob/main/labs/sharding-citus/README.md)**

```bash
git clone https://github.com/sanketn26/interview-prep
cd interview-prep/labs/sharding-citus
docker compose up -d --wait coordinator worker1 worker2 worker3
docker compose up cluster-init
```

!!! note "Apple Silicon / arm64"
    Citus only publishes `linux/amd64` images — Docker runs it under emulation on an arm64 host. Works fine, just slower to start.

[← All Labs](index.md)
