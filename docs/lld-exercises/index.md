---
title: LLD Problem Roadmap
description: Beginner to advanced low-level design problems, worked with the 9-step approach. Architecture is revealed only after you've earned each class.
---

# LLD Problem Roadmap

Work each exercise with the solution covered — design your own classes first, then compare. Every exercise applies the [9-step approach](../low-level-design/index.md#the-9-step-approach-use-it-on-every-problem): requirements → entities → classes → relationships → abstractions → patterns → core code → edge cases → concurrency.

Read [OOP Fundamentals](../low-level-design/oop-fundamentals.md), [SOLID](../low-level-design/solid-principles.md), [Design Patterns](../low-level-design/design-patterns.md), and [Concurrency Basics](../low-level-design/concurrency-basics.md) first — these exercises assume that vocabulary rather than re-teaching it each time.

---

## Beginner

Entity modeling, basic composition, simple state — no concurrency pressure yet.

| Problem | Status | Core skill |
|---------|--------|------------|
| [Parking Lot](parking-lot.md) | Complete | Composition, Strategy (pricing), spot allocation |
| Tic Tac Toe | Planned | Simple state machine, win-condition checking |
| Library Management | Planned | Multi-entity relationships (Book, Member, Loan), due-date rules |
| Splitwise | Planned | Graph simplification (debt netting), Strategy (split types) |

## Intermediate

State machines, multi-entity coordination, strategy selection under real constraints.

| Problem | Status | Core skill |
|---------|--------|------------|
| [Elevator System](elevator-system.md) | Complete | State machine, Strategy (scheduling algorithm), request coordination |
| ATM | Planned | State machine (card inserted → PIN → transaction), State pattern |
| Vending Machine | Planned | State pattern, inventory + payment coordination |
| Chess | Planned | Polymorphism (piece movement rules), move validation, Command pattern (undo) |
| Car Rental | Planned | Inventory + reservation overlap, pricing strategy |

## Advanced

Data-structure design under real constraints, concurrency, extensibility at scale.

| Problem | Status | Core skill |
|---------|--------|------------|
| [LRU Cache](lru-cache.md) | Complete | Data structure design (hash map + doubly linked list), O(1) constraint, thread safety |
| Rate Limiter (LLD) | Planned | Algorithm choice (token bucket vs. sliding window) at the class level — pairs with [Rate Limiting](../reliability/rate-limiting.md) for the distributed-systems version |
| Logger | Planned | Singleton (carefully — see the trap below), Strategy (sinks), async writes |
| Notification System (LLD) | Planned | Observer, Strategy (channels) — pairs with [Notification System](../system-design-exercises/notification-system.md) for the distributed version |
| Pub/Sub | Planned | Observer at scale, thread-safe subscriber management |
| Task Scheduler | Planned | Priority queue, Strategy (scheduling policy), concurrency (worker pool) |

These will be written to the same bar as Parking Lot, Elevator System, and LRU Cache — they are **not** complete.

!!! warning "The Singleton trap"
    Logger is listed here because it's the canonical Singleton example — and also the canonical example of Singleton done badly: a global mutable object that's hard to test (can't inject a fake), hides a dependency (any class can silently call `Logger.instance()`), and gets shared state bugs the moment logging becomes concurrent. When you reach it, the interesting design question isn't "implement a Singleton," it's "what does dependency-injecting a `Logger` instance buy you over a global, and is there ever a case a true singleton is actually correct" (there is — genuinely global config, unique resource handles — but state it as a deliberate trade-off, not a default).

---

## How to Use These Pages

Each exercise follows the same structure so you can compare your own attempt against it section by section:

1. **Problem statement** — a real prompt, not a toy simplification
2. **Requirements** — functional scope, explicitly out-of-scope items
3. **Entities** — the nouns, before any class is written
4. **Class design** — a `classDiagram` (Mermaid) plus the actual field/method signatures
5. **Patterns applied** — named only where a real variation point earns them
6. **Core code** — the 2-3 operations that matter, fully implemented
7. **Edge cases** — the ones interviewers actually probe
8. **Concurrency** — what breaks with two threads, and the fix
9. **Extensibility** — what changes, and what doesn't, when a new requirement arrives

**Next:** [Parking Lot](parking-lot.md)
