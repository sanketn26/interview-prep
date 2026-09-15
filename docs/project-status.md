---
title: Project Status
description: Honest completion tracker for the Senior Engineer Academy. Never treat a stub as done.
---

# Project Status

This page is the source of truth. A module is **Complete** only when it is technically reviewed, intuitive, visual where useful, runnable where useful, contains reasoning/prediction, discusses failure and production caveats, has exit criteria, links exercises, and tests executable material (CROSS-6). Finished prose is not Complete. The column-by-column audit is [`quality-matrix.md`](quality-matrix.md).

| Status | Meaning |
|--------|---------|
| Complete | Gold-standard vertical slice. Usable in an interview tomorrow. Meets CROSS-6, not merely “the page exists.” |
| Interactive | Simulation/calculator exists and is wired. |
| In progress | Real draft, missing sections or review. |
| Planned | Nav placeholder or stub — do not study as if finished. |
| Needs review | Content exists; quality pass outstanding (often 3+ applicable gaps on the quality matrix). |

---

## First release (vertical slice)

Target: MkDocs + Pages + roadmap + design framework + capacity calculator + §12 gold-standard + K8s debugging intro + 15 priority simulations.

| Item | Status | Notes |
|------|--------|--------|
| MkDocs Material, search, Mermaid, Pages deploy | Complete | `mkdocs build --strict` + Actions |
| Information architecture / nav | Complete | Concepts ≠ exercises ≠ playgrounds ≠ production |
| How to study + roadmap | Complete | |
| Learning paths + quality matrix | Complete | `learning-paths.md`, `quality-matrix.md` |
| Reasoning transcripts + design assessment | Complete | `foundations/reasoning-transcripts.md`, `system-design-exercises/assessment.md` |
| Failure-injection tasks | Complete | `playgrounds/failure-injection.md` — existing sims only |
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
| Docker (images, layers, networking, multi-stage builds, security) | Complete | `cloud/docker.md` — no simulation |
| Terraform (state, plan/apply, modules, drift, blast radius) | Needs review | `cloud/terraform.md` — no numbers/V1/bottleneck chain |
| CI/CD (pipeline stages, artifact promotion, GitOps) | Needs review | `cloud/cicd.md` — pipeline catalog, not a reasoning loop |
| Deployment strategies (15, incl. canary, blue-green, expand-contract) | Complete | `cloud/deployment-strategies.md` — no simulation |
| IAM & Managed Services (vendor-mapped IAM/DB/event-bus comparison) | Complete | `cloud/iam-managed-services.md` — no simulation |
| FinOps (tagging, commitment models, rightsizing, cost debugging) | Complete | `cloud/finops.md` — no simulation |
| AI-Native Model Serving (batching, KV cache, GPU autoscaling, quantization) | Complete | `ai-native/model-serving.md` — no simulation |
| Microservices communication (8 patterns) | Needs review | `architecture-patterns/microservices-communication.md` — pattern list without V1/numbers/prediction |
| Low-Level Design: OOP, SOLID, patterns, concurrency basics | Needs review | definition pages; missing prediction/numbers/V1 |
| LLD problems: all 15 (Parking Lot → Task Scheduler) | Complete | `lld-exercises/` — 9-step approach, class diagrams, code, concurrency section per problem |
| Stateless vs stateful applications | Complete | `foundations/stateless-vs-stateful.md` — no simulation |
| Single points of failure | Needs review | `reliability/single-points-of-failure.md` — no prediction/numbers/V1 practice |
| DSA: foundations, two pointers, binary search, pattern recognition | Complete | Written to sliding-window.md bar |
| Distributed systems: consistency models, replication | Complete | Cross-linked with CAP / Raft |
| Databases: indexing, SQL vs NoSQL | Complete | |
| Foundations: engineering mathematics | Complete | Little's Law, percentiles, availability math |
| Messaging: queue patterns | Complete | Pub/sub, DLQs, delivery semantics, outbox |
| Performance: cache strategies | Complete | Cache-aside/through/behind, eviction, invalidation |
| Reliability: failure library | Complete | 14-entry catalog across 5 failure categories |
| Distributed cache (exercise) | Complete | |
| Behavioural: failure & learning | Complete | |
| Behavioural: hiring & raising the bar | Complete | `behavioural/hiring.md` |
| Behavioural: technical debt | Complete | `behavioural/technical-debt.md` |
| Behavioural: influence without authority | Complete | `behavioural/influence-without-authority.md` |
| Behavioural: mentorship | Complete | `behavioural/mentorship.md` |
| Behavioural: managing up | Complete | `behavioural/managing-up.md` |
| Behavioural: saying no | Complete | `behavioural/saying-no.md` |
| Behavioural: ambiguity | Complete | `behavioural/ambiguity.md` |
| Reference: cheat sheets, glossary, trade-off matrix | Complete | |
| Payment processing — Alternative Architectures + Interview Follow-ups | Complete | Backfilled to match sibling exercises |
| Load balancer (exercise) | Complete | Embeds `LoadBalancerSim` |
| API gateway (exercise) | Complete | |
| Notification system (exercise) | Complete | |
| Web crawler (exercise) | Complete | |
| Autocomplete / typeahead (exercise) | Complete | |
| Distributed KV store (exercise) | Complete | Embeds `ConsistentHashingRing`; explicitly differentiated from distributed-cache |
| Social feed / Twitter-X (exercise) | Complete | |
| DDIA Concepts (storage engines, replication topologies, isolation mechanisms, CAP, 2PC, encoding, war-room runbook) | Complete | `databases/ddia-concepts.md` |
| SQL Deep Dive | Needs review | `databases/sql-deep-dive.md` — already Draft on the databases hub |
| Performance Fundamentals (threads, memory, OS-level tuning) | Complete | `performance/fundamentals.md` |
| Kafka Internals & Pulsar Comparison | Needs review | `messaging/kafka-internals-pulsar-comparison.md` — internals dump |
| Pulsar Primer | Needs review | `messaging/pulsar-primer.md` — ops dump |
| Microservices vs Monolith (antipatterns and tradeoffs) | Complete | `architecture-patterns/microservices-vs-monolith.md` |
| Modern Protocols & Service Mesh (HTTP/3, gRPC, Istio, eBPF) | Needs review | `networking/modern-protocols-service-mesh.md` |
| gRPC vs HTTP vs HTTP/2 (K8s, load balancing) | Needs review | `networking/grpc-http-k8s-load-balancing.md` |
| Authentication & Authorization Fundamentals | Needs review | `security/authentication-authorization.md` |
| Zero Trust Architecture | Needs review | `security/zero-trust-architecture.md` |
| Threat Modeling | Complete | `security/threat-modeling.md` — trust boundaries, STRIDE, attack trees, risk scoring |
| OAuth2 & OIDC Deep Dive | Complete | `security/oauth2-oidc.md` — Authorization Code + PKCE flow, token validation, refresh rotation, vulnerabilities |
| Session Management Deep Dive | Complete | `security/session-management.md` — server-side sessions vs JWT, cookie security, fixation/hijacking, revocation problem |
| Event-Driven Architecture | Complete | `architecture-patterns/event-driven-architecture.md` — choreography vs orchestration, notification vs state-transfer events, distributed-monolith antipattern |
| Distributed Fundamentals: leases, gossip, Paxos vs Raft, service discovery | Complete | `distributed-systems/fundamentals.md` — extended from existing clocks/locks content |
| API Design (REST verb contracts, idempotency keys, GraphQL, API Gateway pattern) | Needs review | `foundations/api-design.md` |
| Production Reliability Practices (chaos engineering, capacity/load testing, blameless postmortems) | Complete | `observability/production-reliability-practices.md` |
| Stream Processing (Flink, Kafka Streams, Spark Structured Streaming) | Complete | `architecture-patterns/stream-processing.md` — event time/watermarks/windowing, checkpointing, exactly-once |
| Serverless vs Containers (monolith/microservices/serverless spectrum) | Complete | `architecture-patterns/serverless-vs-containers.md` — cold starts, cost model crossover |
| CRDTs (dedicated deep dive) | Complete | `architecture-patterns/crdts.md` — state-based vs operation-based, concrete types, cross-linked from `databases/ddia-concepts.md` |
| DSA: Heaps & Priority Queues | Interactive | `dsa/heaps.md` — insert/extract-min visualizer |
| DSA: Graph Algorithms (Dijkstra, MST, topo sort) | Interactive | `dsa/graph-algorithms.md` — Dijkstra relaxation visualizer |
| DSA: Union-Find | Interactive | `dsa/union-find.md` — path compression visualizer |
| DSA: Backtracking (N-Queens, Sudoku) | Interactive | `dsa/backtracking.md` — N-Queens 8x8 visualizer |
| DSA: Sorting Algorithms | Interactive | `dsa/sorting.md` — quicksort/merge sort/heapsort/bucket sort comparison visualizer; also covers external merge sort / k-way merge for data that doesn't fit in memory |
| DSA: Tries | Interactive | `dsa/tries.md` — insert/search visualizer |
| DSA: Greedy Algorithms | Interactive | `dsa/greedy.md` — interval scheduling visualizer |
| DSA: String Matching (KMP, Rabin-Karp) | Interactive | `dsa/string-matching.md` — KMP pointer-movement visualizer |
| DSA: Advanced Hashing Techniques | Interactive | `dsa/hashing-techniques.md` — Bloom filter bit-array fill/query visualizer; also covers counting Bloom filters, cuckoo hashing, HyperLogLog |
| DSA: Probabilistic Sketches | Interactive | `dsa/probabilistic-sketches.md` — Count-Min Sketch visualizer; cuckoo/quotient/XOR filters, t-digest, MinHash |
| DSA: Skip Lists, Fenwick & Segment Trees | Interactive | `dsa/skip-lists-fenwick-segment-trees.md` — skip-list insert/search + Fenwick prefix-sum visualizers |
| DSA: Advanced String Matching | Interactive | `dsa/advanced-string-matching.md` — Aho-Corasick trie + failure-link + multi-pattern scan visualizer; also covers Z-algorithm, suffix arrays, Boyer-Moore, Manacher's |
| Multi-Region Architecture & Disaster Recovery | Complete | `distributed-systems/multi-region-dr.md` — RTO/RPO, the four DR tiers, hybrid cloud↔datacenter failover, failback |
| Architecture Decision Records | Complete | `foundations/adrs.md` — format, when to write one, superseding vs. deleting |
| Architecture Reviews | Complete | `foundations/architecture-reviews.md` — four-lens (scalability/reliability/security/cost) review framework |
| Data Privacy & Compliance Architecture | Needs review | `security/data-privacy-compliance.md` |
| Multi-Tenancy Design | Complete | `architecture-patterns/multi-tenancy.md` — silo/pool/bridge isolation, structural tenant_id enforcement, noisy-neighbor mitigation |
| Testing Strategy for Distributed Systems | Complete | `observability/testing-strategy.md` — contract testing, the pyramid redrawn for services, feature flags as a testing tool |
| Batch/ETL & Lambda vs. Kappa Architecture | Needs review | `architecture-patterns/batch-etl-lambda-kappa.md` |
| Common Web Vulnerability Classes | Needs review | `security/web-vulnerability-classes.md` |
| Real-Time Communication | Needs review | `networking/realtime-communication.md` |
| Release Engineering | Needs review | `cloud/release-engineering.md` |
| Growth Mindset (new top-level pillar) | Complete | `growth-mindset/` — 8 pages: self-respect, standing your ground, crucial conversations, protecting your sanity, boundaries (don't say yes to mean no), the strong engineer, seeing what others miss, and storytelling at work. Distinct from `behavioural/` — internalized judgement and office practice, not only STAR-interview framing |
| Concurrency Execution Models | Complete | `low-level-design/concurrency-execution-models.md` — language-agnostic thread pool/work-stealing/lightweight-thread comparison with per-language mapping table, a Visual Reference section (CAS retry loop, memory-visibility, optimistic/pessimistic, throughput-vs-threads, fencing-token diagrams), plus 10 expandable deep-dive questions |

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
| Heap insert / extract-min | [Heaps & Priority Queues](dsa/heaps.md) | Interactive |
| Dijkstra relaxation | [Graph Algorithms](dsa/graph-algorithms.md) | Interactive |
| Union-Find path compression | [Union-Find](dsa/union-find.md) | Interactive |
| N-Queens backtracking | [Backtracking](dsa/backtracking.md) | Interactive |
| Sorting comparison (quicksort/merge/heap) | [Sorting Algorithms](dsa/sorting.md) | Interactive |
| Trie insert / search | [Tries](dsa/tries.md) | Interactive |
| Interval scheduling (greedy) | [Greedy Algorithms](dsa/greedy.md) | Interactive |
| KMP pattern matching | [String Matching](dsa/string-matching.md) | Interactive |
| Bloom filter bit-array fill/query | [Advanced Hashing Techniques](dsa/hashing-techniques.md) | Interactive |
| Count-Min Sketch increment/query | [Probabilistic Sketches](dsa/probabilistic-sketches.md) | Interactive |
| Skip list insert/search | [Skip Lists & Range Trees](dsa/skip-lists-fenwick-segment-trees.md) | Interactive |
| Fenwick point-add / prefix sum | [Skip Lists & Range Trees](dsa/skip-lists-fenwick-segment-trees.md) | Interactive |
| Aho-Corasick trie + failure links + scan | [Advanced String Matching](dsa/advanced-string-matching.md) | Interactive |

---

## Planned (not first release)

Do **not** mass-generate these as stubs.

- System-design exercises: the entire original planned list is now shipped, written to the sharper "evolves and clicks" structure piloted in `pastebin.md` (numbered bottleneck chain, predict-before-reveal `???` boxes, explicit "what stays the same" between versions). 21 exercises shipped to this bar: Pastebin, Instagram, YouTube/Netflix, Uber/Ride-Hailing, Google Drive/File Sync, Collaborative Editor, Distributed Message Queue, Maps/Navigation, Food Delivery, E-Commerce Platform, Ticket Booking, Hotel & Flight Booking, Online Auction, Search Engine, Recommendation System, Ad Serving, Metrics & Monitoring, Log Aggregation, Distributed Job Scheduler, Code Deployment/Release Orchestration, Video Calling — see `system-design-exercises/index.md`. A 2026-08 content-accuracy pass fixed capacity math, CDN/PCI/outbox errors, and sibling NFR contradictions across those exercises (see [content review checklist](content-review.md)). A further prose/pedagogy pass (V1-first on every leftover dump) is still worthwhile.
- LLD problems: **all 15 shipped** (`lld-exercises/` — Parking Lot through Task Scheduler, including Tic Tac Toe, Library, Splitwise, ATM, Vending Machine, Chess, Car Rental, Rate Limiter LLD, Logger, Notification System LLD, Pub/Sub). First-release LLD is complete.
- SQL Deep Dive and vendor DB pages exist as **drafts** (`databases/sql-deep-dive.md`, `postgresql.md`, `mongodb.md`, `cassandra.md`, `dynamodb.md`, `redis.md`) — studyable, not first-release gold. The databases hub lists them as Draft / needs review, not missing files.
- Security & Auth — `security/` pillar now has Authentication & Authorization, Zero Trust Architecture, Threat Modeling, OAuth2 & OIDC Deep Dive, and Session Management Deep Dive all shipped; no known gaps in first-release scope
- Event Sourcing & CQRS — shipped (`architecture-patterns/event-sourcing-cqrs.md`); Event-Driven Architecture also now shipped (`architecture-patterns/event-driven-architecture.md`); Streams/Flink now shipped (`architecture-patterns/stream-processing.md`)
- Distributed fundamentals — `distributed-systems/fundamentals.md` now covers Lamport/vector clocks, leader election, split-brain, distributed locks, leases, gossip protocols, Paxos vs Raft, and service discovery as first-class sections
- Monolith vs Microservices vs Serverless — Microservices vs Monolith now shipped (`architecture-patterns/microservices-vs-monolith.md`); Serverless comparison now shipped (`architecture-patterns/serverless-vs-containers.md`)
- Cloud vendor catalog — shipped (`cloud/iam-managed-services.md`, vendor-mapped IAM/managed-DB/event-bus content); FinOps shipped (`cloud/finops.md`); AI-native serving shipped (`ai-native/model-serving.md` — first real content page). The rest of `ai-native/` (RAG, vector DBs, embeddings, agents, evals) is **deliberately out of scope for this site** — that content lives in a separate repo, see `ai-native/index.md`
- Storytelling pass — implemented across the first-release slice, all design and LLD exercises, DSA patterns, labs, vendor databases, networking, cloud Needs-review tutorials, and growth-mindset pages. Practical office guidance lives in [Storytelling at Work](growth-mindset/storytelling-at-work.md); the reproducible scanner/artifact and reader-test protocol remain checked in separately. Reader outcome validation remains a post-merge measurement; structural compliance is not treated as proof of engagement.
- Capstone project; interview-mode tabs (Learn/Practice/Hint/Interview/Solution/Staff) as a reusable UX pattern; Go example parity for retry/queue/thread-pool/producer-consumer/distributed-lock/WebSocket/gRPC/REST
- Deeper distributed-systems topics — vector clocks, gossip protocols, Paxos vs Raft, distributed locks, leases, and service discovery all now shipped in `distributed-systems/fundamentals.md`; CRDTs now also have a dedicated page (`architecture-patterns/crdts.md`), cross-linked from `databases/ddia-concepts.md`
- DSA visualizers (heaps, Dijkstra, union-find, backtracking, sorting, tries, greedy, KMP/Rabin-Karp, Bloom filters, Aho-Corasick, Count-Min, skip list, Fenwick) — shipped; sketches + range-query pages at `dsa/probabilistic-sketches.md`, `dsa/skip-lists-fenwick-segment-trees.md`
- Remaining behavioural themes — all seven now shipped (hiring, tech debt, influence without authority, mentorship, managing up, saying no, ambiguity)
- Production/observability depth — SLI/SLO & error budgets and distributed tracing basics already covered in `observability/index.md`; chaos engineering, capacity/load testing, and blameless postmortems now shipped in `observability/production-reliability-practices.md`
- Python/Go servers (WebSocket, gRPC) beyond the core library examples

---

## Needs review

Accuracy pass of 2026-08 is recorded in the [content review checklist](content-review.md) (factual errors, capacity math, cross-page contradictions, missing explanations).

**Quality-matrix demotions (2026-08, SEA-1):** Complete → Needs review because 3+ applicable contract columns were missing. See [quality matrix](quality-matrix.md) for the audit method.

- `databases/sql-deep-dive.md` (already Draft on the databases hub)
- `cloud/terraform.md`, `cloud/cicd.md`, `cloud/release-engineering.md`
- `reliability/single-points-of-failure.md`
- `architecture-patterns/microservices-communication.md`, `architecture-patterns/batch-etl-lambda-kappa.md`
- `messaging/kafka-internals-pulsar-comparison.md`, `messaging/pulsar-primer.md`
- `networking/modern-protocols-service-mesh.md`, `networking/grpc-http-k8s-load-balancing.md`, `networking/realtime-communication.md`
- `foundations/api-design.md`
- `low-level-design/oop-fundamentals.md`, `solid-principles.md`, `design-patterns.md`, `concurrency-basics.md`
- `security/authentication-authorization.md`, `zero-trust-architecture.md`, `data-privacy-compliance.md`, `web-vulnerability-classes.md`

Vendor DB pages stay **Draft / needs review**. Remaining: predict-before-click boxes on host sim pages; named exit criteria; DSA viz prediction; leftover V1-first pedagogy. Interview-mode tab UX, capstone UX, and Go example parity still Planned.

Re-read after each content pass: are we still opening with a problem? Does every box in a design earn its existence? Are completion checkmarks honest?
