---
title: "Lab: Load Balancer Algorithms"
description: A real nginx upstream block in front of three real backends — swap algorithms and watch the distribution actually change.
---

# Lab: Load Balancer Algorithms

!!! example "Prediction checkpoint"
    One backend will become slow without becoming unhealthy. Predict how round-robin and least-connections distribute the next requests and which latency percentile moves first. Compare the observed assignment and timing before changing algorithms.

**Pairs with:** [Load Balancing](../networking/load-balancing.md)

Three real backends (two fast, one deliberately slow) behind a real nginx `upstream` block. Swap round robin for weighted or least-connections by editing config and reloading — the same way you would in production — kill a backend and watch nginx route around it with zero client-visible errors.

## docker-compose.yml

```yaml
--8<-- "labs/load-balancer/docker-compose.yml"
```

## nginx.conf

```nginx
--8<-- "labs/load-balancer/nginx.conf"
```

## Exercises

The full walkthrough (verify round robin, kill a backend, swap to least-connections and weighted, measure the distribution difference) lives in the lab's README — including a real bind-mount caching gotcha on macOS/Colima worth knowing about:

**[labs/load-balancer/README.md on GitHub](https://github.com/sanketn26/interview-prep/blob/main/labs/load-balancer/README.md)**

```bash
git clone https://github.com/sanketn26/interview-prep
cd interview-prep/labs/load-balancer
docker compose up -d
```

[← All Labs](index.md)
