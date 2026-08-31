---
title: Quality matrix
description: Honest audit of Complete modules against the learning-system contract — not a coverage checklist.
---

# Quality matrix

This is a **quality** audit, not a page-count. A green status in [project status](project-status.md) is only honest if the page teaches the way a senior engineer actually works.

## How we audited

We cannot close-read 150 files in one pass. The method:

1. **Deep-read the first-release vertical slice** (README + the first table in [project status](project-status.md)): methodology, CAP/sharding/hashing/Raft, Kafka/stampede/breaker/tail latency, the four flagship designs, the three DSA pattern pages, the two behavioural stories, the debugging playbook, K8s, and the first-release cloud/reliability pages.
2. **Sample every other Complete pillar** (one or two pages): LLD (OOP + Parking Lot), security (OAuth vs privacy), architecture (EDA vs batch/ETL), messaging extras (Pulsar), networking extras (gRPC/K8s), growth-mindset, remaining design exercises (Ad Serving).
3. **Grep the rest** for Predict / V1 / bottleneck / trade-off / exit / failure / Mermaid or sim embed / estimates. Hits are **not** automatic ✓ — a word in passing is ~.
4. **Conservative symbols.** If a heading exists but the section does not actually do the job (a "Key Takeaways" that restates definitions, a diagram with no prediction), mark ~ not ✓.
5. **Applicable columns only.** Behavioural pages n/a simulation and BOE. DSA n/a production ops and design-V1 (brute force counts as V1 when it is actually written). Catalogs (failure library, cheat sheets) n/a evolution. Process pages (ADRs) n/a capacity math.

**Demotion rule (CROSS-6):** if a module marked Complete has **3+ applicable ✗**, it is **Needs review** — finished prose is not Complete.

Symbols: **✓** present and doing the job · **~** partial / implied · **✗** missing · **—** not applicable.

| Column | What “present” means |
|--------|----------------------|
| Req | Opens on a problem / requirements, not a definition |
| Pred | Predict-before-reveal, reasoning exercise, or “predict the log line” |
| # | Back-of-envelope or concrete numbers that change the design |
| V1 | Simplest viable system (or brute force, for DSA) |
| Fail | Named bottleneck or failure that V1 cannot survive |
| Mech | Mechanism introduced *because of* that failure, not because it is fashionable |
| Viz | Mermaid and/or a working sim where it would actually help |
| Prod | Production caveat, debugging, or “this lie will page you” |
| TO | Explicit trade-off defense (table or A vs B with a decision) |
| Exit | Exit criteria, self-assessment, or “you can do X when…” |

---

## First-release vertical slice (deep)

| Module | Req | Pred | # | V1 | Fail | Mech | Viz | Prod | TO | Exit |
|--------|:---:|:---:|:-:|:--:|:----:|:----:|:---:|:----:|:--:|:----:|
| [Design methodology](foundations/framework.md) | ✓ | ~ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |
| [Requirements & estimation](foundations/requirements-estimation.md) | ✓ | ~ | ✓ | ✓ | ✓ | ~ | ✓ | ✓ | ~ | ✓ |
| [CAP theorem](distributed-systems/cap-theorem.md) | ✓ | ~ | ✓ | — | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |
| [Sharding](databases/sharding.md) | ✓ | ✗ | ~ | ~ | ✓ | ~ | ✓ | ✓ | ✓ | ~ |
| [Consistent hashing](databases/consistent-hashing.md) | ✓ | ✗ | ✓ | ~ | ✓ | ✓ | ✓ | ✓ | ✓ | ~ |
| [Raft](distributed-systems/raft.md) | ✓ | ~ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |
| [Kafka consumer groups](messaging/kafka.md) | ✓ | ✗ | ✓ | ~ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |
| [Cache stampede](performance/cache-stampede.md) | ✓ | ~ | ✓ | ~ | ✓ | ✓ | ✓ | ~ | ✓ | ~ |
| [Circuit breaker](reliability/circuit-breakers.md) | ✓ | ~ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ~ |
| [Tail latency](performance/tail-latency.md) | ✓ | ✓ | ✓ | ~ | ✓ | ✓ | ✓ | ✓ | ✓ | ~ |
| [URL shortener](system-design-exercises/url-shortener.md) | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |
| [Rate limiter (exercise)](system-design-exercises/rate-limiter.md) | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |
| [WhatsApp](system-design-exercises/whatsapp.md) | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ~ | ✓ |
| [Payments](system-design-exercises/payment-processing.md) | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |
| [Sliding window](dsa/sliding-window.md) | ✓ | ✗ | ~ | ✓ | — | ✓ | ✓ | — | ~ | ~ |
| [BFS / DFS](dsa/bfs-dfs.md) | ✓ | ✗ | — | ✓ | — | ✓ | ✓ | — | ~ | ~ |
| [Dynamic programming](dsa/dynamic-programming.md) | ✓ | ✗ | ~ | ✓ | — | ✓ | ✓ | — | ~ | ✓ |
| [Technical disagreement](behavioural/technical-disagreement.md) | ✓ | — | — | — | ✓ | — | — | ✓ | ~ | ✓ |
| [Production incident](behavioural/production-incident.md) | ✓ | — | — | — | ✓ | — | — | ✓ | — | ✓ |
| [Debugging playbook](observability/debugging-playbook.md) | ✓ | ~ | ✓ | — | ✓ | ✓ | — | ✓ | ~ | ✓ |
| [Kubernetes](kubernetes/index.md) | ✓ | ~ | ~ | — | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |
| [Docker](cloud/docker.md) | ✓ | ✗ | ~ | — | ✓ | ✓ | ✓ | ✓ | ✓ | ~ |
| [Terraform](cloud/terraform.md) | ✓ | ~ | ✗ | ✗ | ✓ | ~ | ✓ | ✓ | ✓ | ~ |
| [CI/CD](cloud/cicd.md) | ✓ | ✗ | ✗ | ✗ | ~ | ~ | ✓ | ✓ | ~ | ~ |
| [Deployment strategies](cloud/deployment-strategies.md) | ✓ | ✗ | ~ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ~ |
| [IAM & managed services](cloud/iam-managed-services.md) | ✓ | ✗ | ~ | ✗ | ✓ | ✓ | ~ | ✓ | ✓ | ~ |
| [FinOps](cloud/finops.md) | ✓ | ~ | ✓ | — | ✓ | ~ | ~ | ✓ | ✓ | ~ |
| [Model serving](ai-native/model-serving.md) | ✓ | ~ | ✓ | ✓ | ✓ | ✓ | ~ | ✓ | ✓ | ~ |
| [Microservices communication](architecture-patterns/microservices-communication.md) | ✓ | ✗ | ✗ | ✗ | ✓ | ~ | ✓ | ✓ | ✓ | ~ |
| [Stateless vs stateful](foundations/stateless-vs-stateful.md) | ✓ | ✗ | ~ | ~ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |
| [Single points of failure](reliability/single-points-of-failure.md) | ✓ | ✗ | ✗ | ✗ | ✓ | ~ | ✓ | ✓ | ~ | ~ |
| [Consistency models](distributed-systems/consistency-models.md) | ✓ | ✓ | ~ | — | ✓ | ~ | ✓ | ✓ | ✓ | ✓ |
| [Replication](distributed-systems/replication.md) | ✓ | ~ | ✓ | — | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |
| [Indexing](databases/indexing.md) | ✓ | ✓ | ✓ | — | ✓ | ✓ | ~ | ✓ | ✓ | ✓ |
| [SQL vs NoSQL](databases/sql-vs-nosql.md) | ✓ | ✓ | ✓ | — | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |
| [Engineering mathematics](foundations/math.md) | ✓ | ~ | ✓ | — | ✓ | ✓ | ✓ | ~ | ~ | ✓ |
| [Queue patterns](messaging/patterns.md) | ✓ | ~ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |
| [Cache strategies](performance/cache-strategies.md) | ✓ | ✓ | ✓ | ~ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |
| [Failure library](reliability/failure-library.md) | ✓ | — | ✓ | — | ✓ | ✓ | — | ✓ | ~ | ~ |
| [Distributed cache (ex)](system-design-exercises/distributed-cache.md) | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |
| [Load balancer (ex)](system-design-exercises/load-balancer.md) | ✓ | ~ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |
| [API gateway (ex)](system-design-exercises/api-gateway.md) | ✓ | ~ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ~ |
| [Notification system (ex)](system-design-exercises/notification-system.md) | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |
| [Web crawler (ex)](system-design-exercises/web-crawler.md) | ✓ | ~ | ✓ | ✓ | ✓ | ~ | ✓ | ✓ | ✓ | ~ |
| [Autocomplete (ex)](system-design-exercises/autocomplete.md) | ✓ | ~ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ~ |
| [Distributed KV (ex)](system-design-exercises/distributed-kv-store.md) | ✓ | ~ | ✓ | ~ | ✓ | ✓ | ✓ | ✓ | ✓ | ~ |
| [Social feed (ex)](system-design-exercises/social-feed.md) | ✓ | ~ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |

**First-release notes**

- Gold standard is the four flagship exercises plus CAP / Raft / circuit breaker / cache strategies / queue patterns. Those already *are* the method.
- Sharding, consistent hashing, Kafka have working sims and production sections but **no predict-before-click task** on the host page (the sim is used as a demo). That is ~ / ✗ Pred, not a demotion by itself.
- **Terraform, CI/CD, SPOF, microservices communication** miss 3+ applicable columns → demoted. They read as finished notes, not a reasoning loop.
- **SQL Deep Dive** is labeled Complete in the old tracker and **Draft** on the databases hub. Draft wins.

---

## Sampled Complete pillars

| Module | Req | Pred | # | V1 | Fail | Mech | Viz | Prod | TO | Exit | Verdict |
|--------|:---:|:---:|:-:|:--:|:----:|:----:|:---:|:----:|:--:|:----:|---------|
| [OOP fundamentals](low-level-design/oop-fundamentals.md) | ✓ | ✗ | ✗ | ✗ | ~ | ~ | ~ | ~ | ✓ | ~ | Needs review |
| [SOLID](low-level-design/solid-principles.md) | ✓ | ✗ | ✗ | ✗ | ~ | ~ | ~ | ~ | ✓ | ~ | Needs review |
| [Design patterns](low-level-design/design-patterns.md) | ✓ | ✗ | ✗ | ✗ | ~ | ~ | ~ | ~ | ✓ | ~ | Needs review |
| [Concurrency basics](low-level-design/concurrency-basics.md) | ✓ | ~ | ✗ | ✗ | ✓ | ~ | ✓ | ✓ | ✓ | ~ | Needs review |
| [Concurrency execution models](low-level-design/concurrency-execution-models.md) | ✓ | ~ | ~ | — | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | Complete |
| [Parking Lot (LLD)](lld-exercises/parking-lot.md) | ✓ | ✓ | — | ✓ | ✓ | ✓ | ✓ | — | ✓ | ~ | Complete (sample of the 15) |
| [OAuth2 & OIDC](security/oauth2-oidc.md) | ✓ | ~ | ~ | ~ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | Complete |
| [Session management](security/session-management.md) | ✓ | ~ | ~ | ~ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | Complete |
| [Threat modeling](security/threat-modeling.md) | ✓ | — | ~ | — | ✓ | ✓ | ✓ | ~ | ~ | ~ | Complete (process page) |
| [AuthN/Z](security/authentication-authorization.md) | ✓ | ✗ | ✗ | ~ | ✗ | ✓ | ✓ | ✓ | ~ | ~ | Needs review |
| [Zero Trust](security/zero-trust-architecture.md) | ✓ | ✗ | ✗ | ~ | ✓ | ✓ | ✓ | ✓ | ✗ | ~ | Needs review |
| [Data privacy](security/data-privacy-compliance.md) | ✓ | ✗ | ✗ | ✗ | ~ | ~ | ✓ | ~ | ✗ | ~ | Needs review |
| [Web vulns](security/web-vulnerability-classes.md) | ✓ | ~ | ~ | ✗ | ✓ | ✓ | ✓ | ✗ | ✗ | ~ | Needs review |
| [Kafka internals / Pulsar](messaging/kafka-internals-pulsar-comparison.md) | ✓ | ✗ | ✗ | ✗ | ✓ | ~ | ✗ | ✓ | ✗ | ~ | Needs review |
| [Pulsar primer](messaging/pulsar-primer.md) | ✓ | ✗ | ✗ | ✗ | ~ | ✓ | ✗ | ✓ | ✗ | ~ | Needs review |
| [Event-driven architecture](architecture-patterns/event-driven-architecture.md) | ✓ | ~ | ~ | ~ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | Complete |
| [Batch/ETL Lambda vs Kappa](architecture-patterns/batch-etl-lambda-kappa.md) | ✓ | ✗ | ✗ | ✗ | ✓ | ✓ | ✓ | ✓ | ✗ | ~ | Needs review |
| [gRPC vs HTTP in K8s](networking/grpc-http-k8s-load-balancing.md) | ✓ | ✗ | ✓ | — | ✓ | ✗ | ✓ | ✓ | ✗ | ~ | Needs review |
| [Modern protocols / mesh](networking/modern-protocols-service-mesh.md) | ✓ | ✗ | ✗ | — | ✗ | ✗ | ✓ | ✓ | ~ | ~ | Needs review |
| [Realtime communication](networking/realtime-communication.md) | ✓ | ✗ | ✗ | ✗ | ✓ | ✓ | ✓ | ✓ | ✓ | ~ | Needs review |
| [API design](foundations/api-design.md) | ✓ | ~ | ✗ | ✗ | ✓ | ✓ | ✓ | ✓ | ✗ | ~ | Needs review |
| [ADRs](foundations/adrs.md) | ✓ | — | — | — | ✓ | ✓ | — | ✓ | ✓ | ~ | Complete (process) |
| [Architecture reviews](foundations/architecture-reviews.md) | ✓ | — | ~ | — | ✓ | ✓ | — | ✓ | ✓ | ~ | Complete (process) |
| [DDIA concepts](databases/ddia-concepts.md) | ✓ | ~ | ~ | — | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | Complete |
| [SQL Deep Dive](databases/sql-deep-dive.md) | ✓ | ✗ | ✗ | ✗ | ~ | ~ | ✗ | ✗ | ~ | ~ | Needs review (already Draft on the hub) |
| [Ad Serving (ex)](system-design-exercises/ad-serving.md) | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | Complete (V1-first sample of the 21) |
| [Self-respect](growth-mindset/self-respect.md) | ✓ | — | — | — | ✓ | — | — | ✓ | ✓ | ~ | Complete (judgement, not STAR) |
| [Release engineering](cloud/release-engineering.md) | ✓ | ✗ | ✗ | ~ | ✓ | ✓ | ✓ | ✓ | ✗ | ~ | Needs review |

---

## Grep pass (remaining Complete labels)

Not a close read. Sections found → ✓ or ~. Three-plus applicable ✗ still demoted.

| Cluster | Typical shape | Notes |
|---------|---------------|-------|
| Remaining design exercises (Pastebin → Video calling, capstone) | ✓ Req # V1 Fail Mech Prod TO Exit; Pred ~; Viz ~ | Written to the Pastebin “evolves and clicks” bar. Keep Complete. A pedagogy pass on leftover dumps is still listed under Planned. |
| Remaining LLD exercises (15) | ✓ Req V1 Fail Viz; Pred ~; # —; Prod —; Exit ~ | 9-step + class diagrams + concurrency. Sampled Parking Lot. Keep Complete. |
| DSA Interactive pages (heaps → Aho-Corasick) | ✓ pattern + viz; Pred ✗ on most | Status is **Interactive**, not Complete — out of this matrix. |
| DSA written Complete (foundations, two pointers, binary search, pattern recognition) | ✓ problem/pattern; Pred ~; Fail/Mech/TO weak | Keep Complete as **DSA-bar** pages (same as sliding-window), not system-design-bar. Pred-before-viz is the remaining gap. |
| Distributed fundamentals, multi-region DR, CRDTs, stream processing, serverless vs containers, multi-tenancy, microservices vs monolith | ✓ Req Fail Prod; Pred/V1 often ~ | Keep Complete. Not gold-slice. |
| Observability: production reliability, testing strategy | ✓ Req Fail Prod; TO ~ | Keep Complete. |
| Behavioural remaining 7 + growth-mindset remaining 6 | ✓ story/judgement; engineering columns — | Keep Complete. |
| Reference: cheat sheets, glossary, trade-off matrix | catalogs | Keep Complete as **reference**, not concept. Exit is weak (no “you can do X”). |
| Performance fundamentals | ✓ numbers/fail; Viz ✗; Mech ~ | Keep Complete. |

---

## Demoted this pass (Complete → Needs review)

| Page | Why (applicable ✗) |
|------|---------------------|
| [SQL Deep Dive](databases/sql-deep-dive.md) | Tracker said Complete; hub already said Draft. No prediction, V1, visual, production-debug, or failure-driven mechanism. |
| [Terraform](cloud/terraform.md) | No capacity numbers, no smallest-justified V1, no bottleneck chain. State/drift are taught, but not as a reasoning loop. |
| [CI/CD](cloud/cicd.md) | Pipeline catalog. Missing prediction, numbers, V1, bottleneck, mechanism-from-failure. |
| [Release engineering](cloud/release-engineering.md) | Missing prediction, numbers, trade-off defense. |
| [Single points of failure](reliability/single-points-of-failure.md) | Missing prediction, numbers, V1. SPOF hunt is the skill; the page does not make you practice it. |
| [Microservices communication](architecture-patterns/microservices-communication.md) | Eight patterns listed. No numbers, no V1 (sync REST), no prediction. |
| [Batch/ETL Lambda vs Kappa](architecture-patterns/batch-etl-lambda-kappa.md) | Missing prediction, numbers, V1, trade-off table. |
| [Kafka internals & Pulsar](messaging/kafka-internals-pulsar-comparison.md) | Internals dump. Missing prediction, numbers, V1, visual, trade-off defense. |
| [Pulsar primer](messaging/pulsar-primer.md) | Ops dump. Missing prediction, numbers, V1, bottleneck, visual, trade-off. |
| [Modern protocols & mesh](networking/modern-protocols-service-mesh.md) | Missing prediction, numbers, bottleneck, mechanism-from-failure. |
| [gRPC vs HTTP in K8s](networking/grpc-http-k8s-load-balancing.md) | Long production notes; missing prediction, mechanism-from-named-failure, trade-off defense. |
| [Realtime communication](networking/realtime-communication.md) | Missing prediction, numbers, V1. |
| [API design](foundations/api-design.md) | Missing numbers, V1, trade-off defense. |
| [OOP / SOLID / patterns / concurrency basics](low-level-design/index.md) | Definition pages. Missing prediction, numbers, V1. Execution-models stays Complete. |
| [AuthN/Z](security/authentication-authorization.md) | Missing prediction, numbers, bottleneck identification. |
| [Zero Trust](security/zero-trust-architecture.md) | Missing prediction, numbers, trade-off defense. |
| [Data privacy](security/data-privacy-compliance.md) | Missing prediction, numbers, V1, bottleneck, mechanism, production, trade-off. |
| [Web vulnerability classes](security/web-vulnerability-classes.md) | Missing V1, production debugging, trade-off defense. |

Vendor DB pages (`postgresql`, `mongodb`, `cassandra`, `dynamodb`, `redis`) were **already** Draft — left alone.

---

## Remaining gaps (do not pretend these are done)

- **Predict-before-click** on host sim pages (Kafka, sharding, hash ring, stampede, Raft). The [failure-injection lab](playgrounds/failure-injection.md) is the stopgap, not a substitute for a box on each host page.
- **Exit criteria** as a named heading. Most pages have Key Takeaways; few say “you are done when you can…”.
- **DSA visualizers** still run as demos. Brute-force-first and “predict the next highlight” are rare.
- **Demoted pages** need a quality pass, not more topics.
- Interview-mode tabs, capstone UX, and Go example parity remain **Planned**.
- No new system-design #41. Freeze expansion until Completes on this matrix are honest.
