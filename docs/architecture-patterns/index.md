---
title: Architecture Patterns
description: Patterns you earn from a failure — not a catalog to sprinkle on every design.
---

# Architecture Patterns

A pattern is a named response to a pressure you have already identified. If you cannot name the pressure, you do not get the box.

---

## Why This Exists

Patterns are the most abused vocabulary in system design interviews. A candidate says "I'd use CQRS with event sourcing and a saga orchestrator" thirty seconds into a problem that has 100 users and no stated consistency requirement. That answer is worse than "I'd use Postgres," because it demonstrates recall without judgment.

Every pattern here **buys** something specific and **costs** something specific. The cost is almost always the same currency: **complexity, and a consistency guarantee you used to get for free.** A senior engineer names both sides of that trade before adopting a pattern. A mid-level engineer names only the benefit.

The discipline: *identify the pressure, then earn the pattern.*

---

## Mental Model: Patterns Are Answers to Pressures

```
   PRESSURE (what hurts)                    PATTERN (what you earn)
   ─────────────────────                    ───────────────────────
   "Writes and reads have wildly    ──────→  CQRS
    different shapes and scale"

   "A transaction spans services    ──────→  Saga
    that cannot share a DB"

   "We need to know why the state   ──────→  Event sourcing
    is what it is, not just what"

   "One slow consumer must not      ──────→  Queue / pub-sub
    block the producer"

   "This dependency's failure       ──────→  Circuit breaker + bulkhead
    keeps taking us down"
```

Read that table right-to-left and you get cargo cult. Read it left-to-right and every box in your design has a reason you can defend under questioning.

!!! tip "The question that separates levels"
    For any pattern you propose, an interviewer will ask **"what does this cost you?"** Have the answer ready:
    *Saga* → no atomic rollback, you write compensations, and intermediate states are visible.
    *CQRS* → the read model is stale by some window you must specify.
    *Event sourcing* → schema evolution of old events is genuinely hard, and rebuilds get slow.
    *Microservices* → every function call becomes a network call that can fail three ways.

---

## The Distributed Transaction Problem

The pressure that generates most of this section: **you cannot use a database transaction across service boundaries.**

Within one database, this is atomic — all of it happens or none of it does:

```sql
BEGIN;
  UPDATE inventory SET stock = stock - 1 WHERE id = 42;
  INSERT INTO orders (user_id, item_id) VALUES (7, 42);
  UPDATE accounts SET balance = balance - 25 WHERE user_id = 7;
COMMIT;
```

Split those three tables across three services and the guarantee evaporates. Now you have three separate calls, any of which can fail — or worse, time out ambiguously. Charge the customer, then fail to reserve inventory, and you have taken money for an order that does not exist.

Two-phase commit exists but is rarely acceptable: it holds locks across services for the duration, and a coordinator crash can block participants indefinitely. So the industry answer is the **saga** — give up atomicity, and instead make every step undoable:

```python
"""Saga: a sequence of local transactions, each with a compensating action."""

from __future__ import annotations

from dataclasses import dataclass
from typing import Callable


@dataclass
class Step:
    name: str
    action: Callable[[], None]
    compensate: Callable[[], None]


def run_saga(steps: list[Step]) -> bool:
    """Execute forward; on failure, undo completed steps in reverse order."""
    completed: list[Step] = []
    try:
        for step in steps:
            step.action()
            completed.append(step)
            print(f"  ✓ {step.name}")
        return True
    except Exception as exc:
        print(f"  ✗ {step.name} failed: {exc}")
        # Compensate in REVERSE order — later steps may depend on earlier ones.
        for done in reversed(completed):
            done.compensate()
            print(f"  ↩ compensated {done.name}")
        return False


if __name__ == "__main__":
    def fail() -> None:
        raise RuntimeError("out of stock")

    ok = run_saga([
        Step("charge card",      lambda: None, lambda: print("    → refund issued")),
        Step("reserve inventory", fail,        lambda: print("    → release hold")),
        Step("schedule shipping", lambda: None, lambda: print("    → cancel shipment")),
    ])
    print(f"\nsaga succeeded: {ok}")
```

```
  ✓ charge card
  ✗ reserve inventory failed: out of stock
    → refund issued
  ↩ compensated charge card

saga succeeded: False
```

Notice what a saga is **not**: a rollback. The charge genuinely happened and a genuine refund reversed it. The customer may see both on their statement. There is a real window where money was taken for an order that failed — you cannot eliminate it, only shorten it and communicate it.

!!! warning "Compensations are business logic, not technical undo"
    You cannot un-send an email; you send a correction. You cannot un-ship a package; you initiate a return. Every compensating action is a product decision that someone must define, which is why sagas cost more than they first appear.

---

## Microservices: The Pattern With the Worst Ratio

Worth stating plainly because interviews reward the nuance: **most systems that adopt microservices do not have the pressure that justifies them.**

The real pressure is **organizational** — many teams stepping on each other in one deployable, unable to release independently. It is not "scalability"; a well-built monolith scales horizontally just fine behind a load balancer.

What you pay: every in-process call becomes a network call that can fail, time out, or arrive twice. Transactions become sagas. Debugging needs distributed tracing. Local development needs orchestration. A single deploy becomes a versioned contract negotiation.

The credible interview position: **start with a modular monolith** — clear internal boundaries, one deployable — and extract a service when a specific boundary demonstrates a specific pressure: independent scaling, independent release cadence, or team ownership friction. That answer shows judgment; "microservices for scalability" shows recall.

---

## Pages in This Section

| Page | Status |
|------|--------|
| [Sagas](sagas.md) | Complete — orchestrator simulator |
| [Microservices Communication](microservices-communication.md) | Complete |
| [Event Sourcing & CQRS](event-sourcing-cqrs.md) | **Complete** — when they earn their complexity, trade-offs, projections, failure modes |
| [Microservices vs. Monolith](microservices-vs-monolith.md) | **Complete** — antipatterns, real tradeoffs, when to adopt, Netflix case study |
| [Event-Driven Architecture](event-driven-architecture.md) | **Complete** — notification vs. state-transfer events, choreography vs. orchestration, the distributed-monolith antipattern |
| [Stream Processing](stream-processing.md) | **Complete** — Flink/Kafka Streams/Spark Structured Streaming, event time vs. processing time, watermarks, checkpointing, exactly-once |
| [Serverless vs. Containers](serverless-vs-containers.md) | **Complete** — monolith vs. microservices vs. serverless spectrum, cold starts, cost model crossover |
| [CRDTs](crdts.md) | **Complete** — state-based vs. operation-based, G-Counter/OR-Set/RGA, convergence guarantees and where they break |

[Sagas](sagas.md) covers orchestration vs choreography with a simulator where shipping fails after the card is charged and you watch compensations run. Prerequisites: [distributed systems](../distributed-systems/index.md) for why the ambiguity exists, and [messaging](../messaging/index.md) for the delivery semantics sagas depend on.

[Microservices Communication](microservices-communication.md) surveys the eight patterns services use to talk to each other — REST, gRPC, queues, pub/sub, choreography, orchestration, event sourcing + CQRS, and service mesh — and what coupling each one trades away.

[Event Sourcing & CQRS](event-sourcing-cqrs.md) explains why you'd store events instead of snapshots, how separate read/write models solve the shape-mismatch problem, when they earn their complexity, projections, snapshots, schema evolution, and production failure modes. Includes e-commerce order system case study and interview progression.

[Microservices vs. Monolith](microservices-vs-monolith.md) teaches the organizational pressure that actually drives microservices (not scaling), the real tradeoffs (debugging complexity, operational overhead, data consistency), five critical antipatterns (shared database, chatty services, circular deps, synchronous everything, missing ownership), and when to adopt (start with a modular monolith, extract only when concrete pressure exists). Includes Netflix transition case study and interview progression from foundation to staff level.

[Event-Driven Architecture](event-driven-architecture.md) covers events as the default coordination style between services: notification vs. event-carried-state-transfer payloads, why choreography trades traceability for extensibility, when to switch to orchestration instead, and the "distributed monolith wearing an event bus" antipattern where 200 event types replace direct calls but keep all the coupling. Distinguishes event-driven architecture from event sourcing — related, composable, but answering different questions.

[Stream Processing](stream-processing.md) covers why batch has an inescapable latency floor, event time vs. processing time, watermarks and windowing (tumbling/sliding/session), stateful processing with checkpointing, and exactly-once semantics in Flink and Kafka Streams. Compares Flink, Kafka Streams, and Spark Structured Streaming head to head, with production debugging for watermark stalls, state bloat, and backpressure.

[Serverless vs. Containers](serverless-vs-containers.md) frames monolith, microservices, and serverless as one spectrum of operational control vs. responsibility rather than three unrelated choices. Covers cold starts, statelessness, the pay-per-invocation vs. pay-per-reservation cost crossover, and when each point on the spectrum wins — with a three-way trade-off table.

[CRDTs](crdts.md) goes deeper than the [DDIA Concepts](../databases/ddia-concepts.md) mention: state-based vs. operation-based CRDTs, concrete types (G-Counter, PN-Counter, G-Set, 2P-Set, OR-Set, LWW-Register, RGA), convergence guarantees, and where they genuinely can't help (global invariants like non-negative balances).

---

## Key Takeaways

- **Name the pressure before the pattern.** A box without a reason is a liability.
- **Every pattern trades complexity for a guarantee**, usually a consistency one.
- **You cannot transact across services.** Sagas trade atomicity for compensations.
- **Compensations are business decisions**, not technical rollbacks — and intermediate states are user-visible.
- **Microservices solve an organizational pressure**, not a scaling one. Start with a modular monolith.
- **Be ready for "what does this cost?"** on every pattern you name.
