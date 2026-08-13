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

- Remaining ~35 system-design exercises (Pastebin, Uber, Netflix, …)
- Streams / Flink, Event Sourcing / CQRS deep dives
- Cloud vendor catalog, CI/CD & IaC, FinOps, AI-native serving
- Full failure encyclopedia (beyond the playbook scenarios)
- Remaining DSA visualizers (heaps, Dijkstra, union-find, backtracking, …)
- Remaining behavioural themes (hiring, tech debt, influence, …)
- Python/Go servers (WebSocket, gRPC) beyond the core library examples

---

## Needs review

Re-read after each content pass: are we still opening with a problem? Does every box in a design earn its existence? Are completion checkmarks honest?
