---
title: "Lab: Kafka Cluster"
description: A real 3-broker Kafka cluster in KRaft mode — kill a broker, watch a real leader election and consumer-group rebalance.
---

# Lab: Kafka Cluster

**Pairs with:** [Kafka Deep Dive](../messaging/kafka.md)

A 3-broker Kafka cluster in KRaft mode (no ZooKeeper). Create a real topic, kill a real broker mid-traffic, and watch a real leader election and consumer-group rebalance — not a canvas animation.

## docker-compose.yml

```yaml
--8<-- "labs/kafka/docker-compose.yml"
```

## Exercises

The full step-by-step walkthrough (create a topic, kill a broker and predict what happens to leadership/ISR, watch a live consumer-group rebalance, check consumer lag) lives in the lab's README:

**[labs/kafka/README.md on GitHub](https://github.com/sanketn26/interview-prep/blob/main/labs/kafka/README.md)**

```bash
git clone https://github.com/sanketn26/interview-prep
cd interview-prep/labs/kafka
docker compose up -d
```

[← All Labs](index.md)
