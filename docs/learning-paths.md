---
title: Learning paths
description: Six ways through existing content — no new modules, no skipped gold-standard method.
---

# Learning paths

All links are **existing** pages. Status on each title is whatever [project status](project-status.md) says today — do not treat a Needs review page as gold.

How to move through any path: [How to Study](how-to-use.md). The method itself: [Design framework](foundations/framework.md).

---

## The method (do not skip)

Four canonical modules *are* the intended loop — **requirements → numbers → bottleneck → smallest justified architecture → failure → evolution**. If you only have a week, do these four properly instead of skimming twenty.

1. [URL shortener](system-design-exercises/url-shortener.md) — V1 is one primary; cache/CDN are earned.
2. [Rate limiter](system-design-exercises/rate-limiter.md) — cardinality and fail-open vs fail-closed before Redis folklore.
3. [Circuit breakers](reliability/circuit-breakers.md) — timeout → retry math → breaker; run the storm sim.
4. [Sharding](databases/sharding.md) — hot key vs more boxes; then [consistent hashing](databases/consistent-hashing.md).

Short voice-over of the same loop: [Reasoning transcripts](foundations/reasoning-transcripts.md). Score designs with [assessment](system-design-exercises/assessment.md).

---

## Senior Backend

Goal: derive a service, store, cache, and async path without cargo-culting.

1. [Framework](foundations/framework.md) + [estimation](foundations/requirements-estimation.md) + [math](foundations/math.md)
2. [Stateless vs stateful](foundations/stateless-vs-stateful.md) · [API design](foundations/api-design.md) *(Needs review — use for HTTP contracts, not as Complete)*
3. [SQL vs NoSQL](databases/sql-vs-nosql.md) · [Indexing](databases/indexing.md) · [Sharding](databases/sharding.md)
4. [Cache strategies](performance/cache-strategies.md) · [Cache stampede](performance/cache-stampede.md)
5. [Queue patterns](messaging/patterns.md) · [Kafka](messaging/kafka.md)
6. [Rate limiter](system-design-exercises/rate-limiter.md) · [URL shortener](system-design-exercises/url-shortener.md) · [Notification system](system-design-exercises/notification-system.md)
7. [Circuit breakers](reliability/circuit-breakers.md) · [Debugging playbook](observability/debugging-playbook.md)
8. LLD: [Parking Lot](lld-exercises/parking-lot.md) + [SOLID](low-level-design/solid-principles.md) *(principles page is Needs review; the exercise is Complete)*

---

## Staff Distributed Systems

Goal: replication, consensus, partitions, and evolution under failure.

1. Canonical four above
2. [CAP](distributed-systems/cap-theorem.md) · [Consistency models](distributed-systems/consistency-models.md) · [Replication](distributed-systems/replication.md) · [Raft](distributed-systems/raft.md)
3. [Distributed fundamentals](distributed-systems/fundamentals.md) · [Multi-region DR](distributed-systems/multi-region-dr.md)
4. [WhatsApp](system-design-exercises/whatsapp.md) · [Payments](system-design-exercises/payment-processing.md) · [Distributed KV](system-design-exercises/distributed-kv-store.md)
5. [Sagas](architecture-patterns/sagas.md) · [CRDTs](architecture-patterns/crdts.md) · [Event-driven architecture](architecture-patterns/event-driven-architecture.md)
6. [Failure library](reliability/failure-library.md) · [Failure-injection tasks](playgrounds/failure-injection.md)
7. [Social feed](system-design-exercises/social-feed.md) or [Collaborative editor](system-design-exercises/collaborative-editor.md)

---

## Platform / Infrastructure

Goal: traffic path, clusters, change, cost.

1. [HTTP & TCP](networking/http-tcp.md) · [Load balancing](networking/load-balancing.md)
2. [Docker](cloud/docker.md) · [Kubernetes](kubernetes/index.md) · [K8s kind lab](labs/kubernetes-kind.md)
3. [Deployment strategies](cloud/deployment-strategies.md) · [FinOps](cloud/finops.md)
4. [CI/CD](cloud/cicd.md) · [Terraform](cloud/terraform.md) *(both Needs review — labs still useful: [Terraform+Docker](labs/terraform-docker.md))*
5. [Load balancer exercise](system-design-exercises/load-balancer.md) · [API gateway](system-design-exercises/api-gateway.md)
6. [IAM & managed services](cloud/iam-managed-services.md) · [Testing strategy](observability/testing-strategy.md)
7. [Code deployment / release orchestration](system-design-exercises/deployment-orchestration.md)

---

## Data / Streaming

Goal: logs, consumers, batch vs stream, hot partitions.

1. [Queue patterns](messaging/patterns.md) · [Kafka](messaging/kafka.md) · [Kafka lab](labs/kafka.md)
2. Canonical: [Sharding](databases/sharding.md) + Kafka hot-key [injection task](playgrounds/failure-injection.md)
3. [Stream processing](architecture-patterns/stream-processing.md) · [Event sourcing & CQRS](architecture-patterns/event-sourcing-cqrs.md)
4. [DDIA concepts](databases/ddia-concepts.md) · [Indexing](databases/indexing.md)
5. [Distributed message queue](system-design-exercises/distributed-message-queue.md) · [Log aggregation](system-design-exercises/log-aggregation.md) · [Metrics & monitoring](system-design-exercises/metrics-monitoring.md)
6. [Batch/ETL](architecture-patterns/batch-etl-lambda-kappa.md) *(Needs review)* — prefer stream-processing + DDIA until it is rewritten
7. [Kafka internals / Pulsar](messaging/kafka-internals-pulsar-comparison.md) *(Needs review)* after Kafka consumer groups is solid

---

## Interview Sprint

Goal: 10–14 days to be fluent, not encyclopedic.

**Days 1–2.** [How to Study](how-to-use.md) · [Framework](foundations/framework.md) · [Estimation](foundations/requirements-estimation.md) · [Math](foundations/math.md)

**Days 3–5.** Canonical four (shortener, limiter, breaker, sharding) + [CAP](distributed-systems/cap-theorem.md) + [Raft](distributed-systems/raft.md)

**Days 6–8.** [WhatsApp](system-design-exercises/whatsapp.md) · [Payments](system-design-exercises/payment-processing.md) · [Kafka](messaging/kafka.md) · [Cache stampede](performance/cache-stampede.md)

**Days 9–10.** DSA: [Sliding window](dsa/sliding-window.md) · [BFS/DFS](dsa/bfs-dfs.md) · [DP](dsa/dynamic-programming.md) · [Pattern recognition](dsa/pattern-recognition.md)

**Days 11–12.** [Technical disagreement](behavioural/technical-disagreement.md) · [Production incident](behavioural/production-incident.md) · [Debugging playbook](observability/debugging-playbook.md)

**Days 13–14.** One mock scored with [assessment](system-design-exercises/assessment.md); [failure-injection](playgrounds/failure-injection.md) on Kafka + Raft + breaker; skim [cheat sheets](reference/cheat-sheets.md)

---

## Production Debugging

Goal: symptom → hop → mechanism.

1. [Debugging playbook](observability/debugging-playbook.md) (p99 + Kafka lag)
2. [Kubernetes](kubernetes/index.md) request path + [K8s sim](playgrounds/index.md)
3. [Tail latency](performance/tail-latency.md) · [Circuit breakers](reliability/circuit-breakers.md) · [Retry-storm lab](labs/retry-storm.md)
4. [Failure library](reliability/failure-library.md) · [Failure-injection tasks](playgrounds/failure-injection.md)
5. [Replication](distributed-systems/replication.md) + [Postgres lab](labs/postgres-replication.md)
6. [Cache stampede](performance/cache-stampede.md) · [Single points of failure](reliability/single-points-of-failure.md) *(Needs review — still the right prompt: “point at the one box”)*
7. [Production incident](behavioural/production-incident.md) · [Production reliability practices](observability/production-reliability-practices.md)

---

## After a path

Mark pages on [Your Progress](dashboard.md). If a module is **Needs review**, you may still read it — just do not confuse notes with a finished learning loop. Track honesty on the [quality matrix](quality-matrix.md).
