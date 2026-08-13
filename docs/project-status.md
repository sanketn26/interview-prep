---
title: Project Status
description: Honest completion tracker for the Senior Engineer Academy. Never treat a stub as done.
---

# Project Status

This page is the source of truth. A module is **Complete** only if it follows the concept or exercise template, has original diagrams, failure analysis, explicit trade-offs, and a working interactive piece where the first-release bar requires one.

| Status | Meaning |
|--------|---------|
| Complete | Gold-standard vertical slice. Usable in an interview tomorrow. |
| Interactive | Simulation/calculator exists and is wired. |
| In progress | Real draft, missing sections or review. |
| Planned | Nav placeholder or stub — do not study as if finished. |
| Needs review | Content exists; quality pass outstanding. |

---

## First release (vertical slice)

Target: MkDocs + Pages + roadmap + design framework + capacity calculator + §12 gold-standard + K8s debugging intro + 15 priority simulations.

| Item | Status | Notes |
|------|--------|--------|
| MkDocs Material, search, Mermaid, Pages deploy | Complete | `mkdocs build --strict` + Actions |
| Information architecture / nav | Complete | Concepts ≠ exercises ≠ playgrounds ≠ production |
| How to study + roadmap | Complete | |
| Design methodology (19-step) | Complete | `foundations/framework.md` |
| Capacity calculator | Interactive | `foundations/requirements-estimation.md`, `reference/calculators.md` |
| CAP theorem | Complete | |
| Database sharding + sim | Complete | |
| Consistent hashing + ring | Complete | |
| Kafka consumer groups + sim | Complete | |
| Cache stampede + sim | Complete | |
| Circuit breaker + retry storm | Complete | |
| Tail latency + sim | Complete | |
| Raft + election sim | Complete | |
| URL shortener | Complete | |
| Rate limiter (design exercise) | Complete | |
| WhatsApp / messaging | Complete | |
| Payment processing | Complete | |
| Sliding window viz | Complete | |
| BFS / DFS viz | Complete | |
| Dynamic programming viz | Complete | |
| Technical disagreement | Complete | |
| Leading a production incident | Complete | |
| Debugging high p99 | Complete | Playbook |
| Diagnosing Kafka consumer lag | Complete | Playbook |
| K8s debugging intro + request-flow sim | Complete | |
| Load balancer / DNS / TCP / Saga sims | Interactive | Host pages in networking / architecture-patterns |
| DSA: foundations, two pointers, binary search, pattern recognition | Complete | Written to sliding-window.md bar |
| Distributed systems: consistency models, replication | Complete | Cross-linked with CAP / Raft |
| Databases: indexing, SQL vs NoSQL | Complete | |
| Foundations: engineering mathematics | Complete | Little's Law, percentiles, availability math |
| Messaging: queue patterns | Complete | Pub/sub, DLQs, delivery semantics, outbox |
| Performance: cache strategies | Complete | Cache-aside/through/behind, eviction, invalidation |
| Reliability: failure library | Complete | 14-entry catalog across 5 failure categories |
| Distributed cache (exercise) | Complete | |
| Behavioural: failure & learning | Complete | |
| Reference: cheat sheets, glossary, trade-off matrix | Complete | |
| Payment processing — Alternative Architectures + Interview Follow-ups | Complete | Backfilled to match sibling exercises |
| Load balancer (exercise) | Complete | Embeds `LoadBalancerSim` |
| API gateway (exercise) | Complete | |
| Notification system (exercise) | Complete | |
| Web crawler (exercise) | Complete | |
| Autocomplete / typeahead (exercise) | Complete | |
| Distributed KV store (exercise) | Complete | Embeds `ConsistentHashingRing`; explicitly differentiated from distributed-cache |
| Social feed / Twitter-X (exercise) | Complete | |

---

## Priority simulations (must work)

| Simulation | Host page | Status |
|------------|-----------|--------|
| Consistent hashing ring | [Consistent hashing](databases/consistent-hashing.md) | Interactive |
| DB sharding | [Sharding](databases/sharding.md) | Interactive |
| Kafka partitions & consumer groups | [Kafka](messaging/kafka.md) | Interactive |
| Cache stampede | [Cache stampede](performance/cache-stampede.md) | Interactive |
| Rate limiter | [Rate limiting](reliability/rate-limiting.md) | Interactive |
| Load balancer | [Load balancing](networking/load-balancing.md) | Interactive |
| Retry storm | [Circuit breakers](reliability/circuit-breakers.md) | Interactive |
| Circuit breaker | [Circuit breakers](reliability/circuit-breakers.md) | Interactive |
| Raft election | [Raft](distributed-systems/raft.md) | Interactive |
| Saga | [Sagas](architecture-patterns/sagas.md) | Interactive |
| Tail latency | [Tail latency](performance/tail-latency.md) | Interactive |
| DNS resolution | [HTTP & TCP](networking/http-tcp.md) | Interactive |
| TCP lifecycle | [HTTP & TCP](networking/http-tcp.md) | Interactive |
| K8s request flow | [Kubernetes](kubernetes/index.md) | Interactive |
| Capacity calculator | [Requirements & estimation](foundations/requirements-estimation.md) | Interactive |

---

## Planned (not first release)

Do **not** mass-generate these as stubs.

- Remaining ~27 system-design exercises (Pastebin, Uber, Netflix, …)
- Security & Auth (`security/index.md` is still a 10-line stub — OAuth2/OIDC/JWT/sessions/RBAC/Zero Trust all missing)
- Event Sourcing & CQRS deep dives (Sagas is the only pattern in this family written so far); Streams/Flink
- Distributed fundamentals as its own concept page (Lamport/vector clocks, leader election, leases, distributed locks, split-brain — currently only asides inside replication.md/consistency-models.md)
- Monolith vs Microservices vs Serverless
- Cloud vendor catalog (`ai-native/`, `cloud/` are still index-only stubs), CI/CD & IaC, FinOps, AI-native serving
- Capstone project; interview-mode tabs (Learn/Practice/Hint/Interview/Solution/Staff) as a reusable UX pattern; Go example parity for retry/queue/thread-pool/producer-consumer/distributed-lock/WebSocket/gRPC/REST
- Deeper distributed-systems topics: vector clocks, gossip protocols, Paxos, two-phase commit, CRDTs, distributed locks, service discovery
- Remaining DSA visualizers and topics (heaps, Dijkstra, union-find, backtracking, sorting, tries, greedy, KMP/Rabin-Karp)
- Remaining behavioural themes (hiring, tech debt, influence, mentorship, managing up, saying no, ambiguity)
- Production/observability depth: SLI/SLO & error budgets, distributed tracing, chaos engineering, capacity/load testing, blameless postmortems
- Python/Go servers (WebSocket, gRPC) beyond the core library examples

---

## Needs review

Re-read after each content pass: are we still opening with a problem? Does every box in a design earn its existence? Are completion checkmarks honest?
