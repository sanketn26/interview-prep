---
title: "Lab: Retry Storm"
description: Toxiproxy fault injection against a real backend — measure retry amplification directly instead of assuming it.
---

# Lab: Retry Storm

!!! example "Prediction checkpoint"
    A dependency will slow while every caller retries. Before injecting latency, calculate the maximum attempt rate and predict which pool saturates first. Then compare request, retry, and latency signals to the causal chain.

**Pairs with:** [Circuit Breakers](../reliability/circuit-breakers.md)

Reproduces that page's opening scenario for real: Toxiproxy injects a downstream timeout in front of a trivial, otherwise-healthy backend that logs every request it actually receives. Measure retry amplification directly — 10 client requests become roughly 40 real backend hits, not an assumed number.

## docker-compose.yml

```yaml
--8<-- "labs/retry-storm/docker-compose.yml"
```

## backend.py

The backend — logs every request it actually receives (excluding its own `/health` endpoint, so container healthchecks don't contaminate the measurement):

```python
--8<-- "labs/retry-storm/backend.py"
```

## Exercises

The full walkthrough (healthy baseline, inject the fault, measure amplification, recover) lives in the lab's README:

**[labs/retry-storm/README.md on GitHub](https://github.com/sanketn26/interview-prep/blob/main/labs/retry-storm/README.md)**

```bash
git clone https://github.com/sanketn26/interview-prep
cd interview-prep/labs/retry-storm
docker compose up -d
```

[← All Labs](index.md)
