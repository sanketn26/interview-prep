---
title: Content Review Checklist
description: Curriculum accuracy pass — mistakes, capacity math, contradictions, missing explanations.
---

# Content review checklist (2026-08)

Full-curriculum accuracy pass: factual mistakes, capacity math, contradictions, overly dense or missing explanations. Items are **done** unless marked remaining.

---

## Distributed systems

- [x] `fundamentals.md` — clock skew: fast clock expires early (not slow)
- [x] `fundamentals.md` — fencing token, not client-side TTL
- [x] `fundamentals.md` — vector clocks: merge then increment once
- [x] `fundamentals.md` — isolated Raft leader still believes it is leader; cannot commit
- [x] `fundamentals.md` — Raft term diagram winner matches labels
- [x] `fundamentals.md` — Lamport receive = `max(local, msg) + 1`
- [x] `fundamentals.md` — Redlock is best-effort; Kleppmann / fencing
- [x] `index.md` Q1 — PACELC: no-partition case is still L vs C
- [x] `replication.md` — DynamoDB is per-partition leader, not leaderless Dynamo
- [x] `consistency-models.md` — `R+W>N` is overlap, not linearizability
- [x] `raft.md` — left as gold standard (own-term commit / joint consensus)

## Foundations / math

- [x] `math.md` — 99.95% series downtime via `8760 × (1 − 0.9995^5)`
- [x] `math.md` — 1 MB sequential RAM ~100–250 µs
- [x] `requirements-estimation.md` — average vs peak QPS labels
- [x] `api-design.md` — idempotency race / gateway vs resource

## Databases

- [x] `redis.md` — Cluster *does* automatic failover (async data-loss caveat)
- [x] `redis.md` — node counts aligned; `ZRANGE` ascending
- [x] `redis.md` vs `consistent-hashing.md` — hash slots, not a pure ring
- [x] `consistent-hashing.md` — add ≈ K/(N+1), remove ≈ K/N
- [x] `dynamodb.md` — GSI Query needs equality on PK; time-range bucket+SK
- [x] `dynamodb.md` — provisioned price order-of-magnitude + hot-key takeaway
- [x] `cassandra.md` — `⌊N/2⌋+1`; batch types; secondary-index scatter-gather
- [x] `cassandra.md` — quorum overlap ≠ “strong reads”
- [x] `sql-vs-nosql.md` — BASE is not family-wide
- [x] `ddia-concepts.md` — isolation = anomalies then MVCC vs 2PL; hash ≠ hot-key
- [x] `ddia-concepts.md` — LWW register vs CRDT counters
- [x] `sql-deep-dive.md` — `IN` subquery, TABLESAMPLE estimator, FROM-order myth, index column order
- [x] `databases/index.md` — vendor/SQL pages **Draft / needs review**, not Coming soon

## Messaging / reliability / performance

- [x] `kafka.md` — lag = offset gap, not rate difference
- [x] `kafka-internals-pulsar-comparison.md` — `acks=all` vs `min.insync.replicas`
- [x] `kafka-internals-pulsar-comparison.md` — Kafka EOS ≠ local DB + `commit_async`
- [x] `kafka-internals-pulsar-comparison.md` — broker add ≠ group rebalance; rebalance times; `session.timeout.ms` 45s
- [x] `pulsar-primer.md` — cost units, partitioned topics, write vs ack quorum, `pulsar://`
- [x] `messaging/index.md` — redelivery IDs are not Kafka offsets
- [x] `cache-stampede.md` — Redis `SET NX` across pods
- [x] `cache-strategies.md` — write-through diagram = DB then cache
- [x] `rate-limiting.md` — leaky bucket section; INCR/EXPIRE race
- [x] Timeouts — request budget shrinks inward; idle: LB closes first
- [x] Retries — 3 retries = 4 attempts; default full jitter

## Networking / security / cloud / observability / K8s

- [x] HTTP/2: no HTTP HOL; TCP HOL remains
- [x] QUIC first flight 1-RTT; 0-RTT is resumption
- [x] BBR ≈ BDP; CUBIC ×0.7
- [x] ALB 100k RPS cost not ~$18/month
- [x] NLB is not a Postgres writer/reader router
- [x] `limit_req_zone` in `http{}`; no Istio `kind: EgressGateway`
- [x] Refresh-token theft mints access tokens
- [x] JWT signed (JWS), not encrypted (JWE)
- [x] OIDC ID token = user, not the client/valet
- [x] Env vars not in `ps aux`; GCP Assume Role ≠ SA keys
- [x] cProfile tottime/cumtime; four golden signals include saturation
- [x] Contract tests: additive JSON is not breaking
- [x] Liveness vs readiness vs dependency checks
- [x] CPU affinity needs `LockOSThread`; `GOGC` via `SetGCPercent`

## System-design exercises

- [x] Video streaming — Little’s law concurrent + 36 PB/day egress
- [x] Collaborative editor — ~28K concurrent docs; OT vs CRDT is a choice
- [x] Autocomplete — 1.2 **trillion** lookups/month; timeout vs SLO
- [x] URL shortener — 1000:1 R/W; 7 hex chars tiny keyspace; CDN recosted
- [x] Pastebin — no CDN for burn-after-read / private
- [x] Payments — outbox ≠ PSP charge; PCI reduced scope; webhook ack; V1 called out
- [x] API gateway BFF — Order then User (not same `par`)
- [x] E-commerce / food / ride-hail / recs / social / logs / metrics / Instagram NFRs internally consistent
- [x] Notification self-assessment matches crash-after-provider
- [x] EDA — charging on `OrderPlaced` framed as antipattern
- [x] Video calling — NACK/RTX/FEC, not “no retries”
- [x] KV store — Dynamo paper vs DynamoDB; GET 200 + `values[]`
- [x] Hotel/flight typo + catalog units

## LLD

- [x] Splitwise remainder → payer
- [x] Logger `FileHandleRegistry` + non-blocking shutdown sentinel
- [x] Parking lot duplicate plate
- [x] Task scheduler priority among due tasks

## DSA

- [x] KMP mismatch `'c'` vs `'d'` + real fallback
- [x] HyperLogLog ~12 KB
- [x] Bucket sort 0.42 in `[0.4, 0.6)`
- [x] Aho-Corasick failure links, not merged `"he"` node
- [x] `heapq.heapify` in place
- [x] Variable window assumes non-negative; viz HUD no bogus Target
- [x] DP / Dijkstra viz vs snippet called out
- [x] Union by rank ≠ union by size
- [x] Pattern-recognition links; word-ladder complexity
- [x] `dsa/index.md` does not claim every page has Step/Go

## Status / how-to-study / reference

- [x] README — rest of curriculum is shipped, not stubs
- [x] `project-status.md` — LLD all 15 Complete; no “remaining 11”
- [x] `how-to-use.md` — Learn/Interview/Staff tabs not wired
- [x] Story count = 6 on behavioural + how-to-use
- [x] Production incident — reversible mitigation, then RCA
- [x] Playgrounds / home — 15 priority sims + DSA visualizers
- [x] Glossary DSA terms + CQRS link
- [x] Cheat sheet Dijkstra space, Timsort/Java, consistent hashing add vs remove
- [x] Roadmap — start DSA patterns in week 1

---

## Remaining (not this pass)

- Interview-mode tab UX as a reusable component (still Planned)
- Capstone + Go example parity
- Vendor DB pages stay **Draft / needs review** (facts patched; not gold-template)
- Extra V1-first rewrite on leftover “finished diagram first” exercises
- Visualizers that still simplify the algorithm (Dijkstra O(V²), DP loop order) are labeled, not rewritten
