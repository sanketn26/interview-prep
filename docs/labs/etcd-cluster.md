---
title: "Lab: etcd Cluster"
description: A real 3-node Raft quorum — kill a minority (writes keep working) vs. a majority (writes refuse, not corrupt).
---

# Lab: etcd Cluster

**Pairs with:** [Consensus & Raft](../distributed-systems/raft.md), [CAP Theorem](../distributed-systems/cap-theorem.md)

A real 3-node etcd cluster — literally the "CP" example in [CAP Theorem](../distributed-systems/cap-theorem.md#how-real-databases-behave)'s database table. Kill a minority of nodes and writes keep working; kill a majority and writes cleanly refuse (never corrupt). Then run the exact `--consistency=serializable` vs. default-linearizable comparison that table describes.

## docker-compose.yml

```yaml
--8<-- "labs/etcd-cluster/docker-compose.yml"
```

## Exercises

The full walkthrough (find the leader, kill a minority, kill a majority, compare serializable vs. linearizable reads without quorum) lives in the lab's README:

**[labs/etcd-cluster/README.md on GitHub](https://github.com/sanketn26/interview-prep/blob/main/labs/etcd-cluster/README.md)**

```bash
git clone https://github.com/sanketn26/interview-prep
cd interview-prep/labs/etcd-cluster
docker compose up -d
```

[← All Labs](index.md)
