---
title: Reliability
description: Retries without a budget are an amplifier. Limiters and breakers are how you stay up.
---

# Reliability

Retries without a budget are an amplifier. Limiters and breakers are how you stay up.

---

## Why This Exists

Here is the uncomfortable fact at the center of this section: **the mechanisms you add to survive failure are usually what turn a small failure into an outage.**

A database gets slow. Requests time out. Your client library helpfully retries three times. Now the struggling database receives 4× its normal traffic at the exact moment it can least afford it. It gets slower, so more requests time out, so more retries fire. The database dies — not from the original problem, but from your recovery logic.

This is a **retry storm**, and it is the single most common way well-intentioned reliability engineering causes downtime. The lesson generalizes: under stress, *doing more* is usually wrong. Reliability is mostly about **doing less, deliberately** — shedding load, failing fast, and giving the dependency room to recover.

---

## Mental Model: Retries Multiply Load

```
Healthy                         Degraded (3 retries, no backoff)
───────                         ────────────────────────────────
1,000 rps                       1,000 rps original
    │                               + 3,000 rps retries
    ▼                           ─────────────────────
┌────────┐                        4,000 rps ──→ ┌────────┐
│   DB   │  fine                                │   DB   │ ☠ 4× load
└────────┘                                      └────────┘ while already sick
```

The database's problem was that it was overloaded. Your response quadrupled the load. **A retry is a decision to spend someone else's capacity** — and during an incident, that capacity is exactly what is scarce.

!!! warning "The rule"
    Never retry without three things: **a cap** on attempts, **exponential backoff** so attempts spread out, and **jitter** so clients do not synchronize. Missing any one recreates the storm.

---

## Why Jitter Is Not Optional

Backoff alone is insufficient, and this surprises people. If a thousand clients all fail at the same moment and all back off by exactly 1 s, 2 s, 4 s — they retry **in perfect lockstep**, producing periodic spikes just as damaging as the original storm.

```python
"""Exponential backoff with full jitter — the AWS-recommended default."""

import random


def backoff_delay(attempt: int, base: float = 0.1, cap: float = 30.0,
                  jitter: bool = True) -> float:
    """Delay before retry number `attempt` (0-indexed)."""
    exponential = min(cap, base * (2 ** attempt))
    # Full jitter: sample anywhere in [0, exponential]. Spreads a synchronized
    # herd across the whole window instead of stacking it on one instant.
    return random.uniform(0, exponential) if jitter else exponential


if __name__ == "__main__":
    random.seed(7)
    print("attempt  no-jitter   with-jitter (3 different clients)")
    for attempt in range(5):
        plain = backoff_delay(attempt, jitter=False)
        rolls = [f"{backoff_delay(attempt):5.2f}s" for _ in range(3)]
        print(f"   {attempt}      {plain:5.2f}s     {'  '.join(rolls)}")
```

```
attempt  no-jitter   with-jitter (3 different clients)
   0       0.10s      0.03s   0.02s   0.07s
   1       0.20s      0.01s   0.11s   0.07s
   2       0.40s      0.02s   0.20s   0.01s
   3       0.80s      0.35s   0.06s   0.07s
   4       1.60s      0.68s   1.32s   0.20s
```

Without jitter every client hits at 0.10, 0.20, 0.40… together. With it, the same clients spread across the window — same average backoff, no synchronized spike.

---

## The Three Defenses, and When Each Applies

They are frequently confused. They solve different problems and are not interchangeable:

| Pattern | Protects | Question it answers |
|---|---|---|
| **Rate limiter** | *You*, from callers | "Is this client allowed to send this much?" |
| **Circuit breaker** | *Your dependency*, from you | "Is it pointless to even try right now?" |
| **Bulkhead** | *Other features*, from one sick one | "Can this failure consume the whole pool?" |

**A rate limiter is inbound** — it rejects excess traffic at your door, protecting you from a noisy neighbor or an accidental load test.

**A circuit breaker is outbound.** After N consecutive failures it stops sending requests entirely and fails instantly. Counterintuitively, **failing fast helps the dependency recover** — it removes the load that is keeping it down. It also stops you from burning your own threads waiting on calls you know will time out.

```
CLOSED ──── 5 failures ────→ OPEN ──── after 30s ────→ HALF-OPEN
  ↑          (traffic          │        (cooldown)         │
  │           flows)           │   fail fast,              │ one probe
  │                            │   zero load on            │
  └──── probe succeeds ────────┴───────────────────────────┘  probe fails
                                                              → back to OPEN
```

**A bulkhead** isolates resources so image processing exhausting its 20 threads cannot starve checkout of the shared pool of 100. The name comes from ship compartments: one flooded section should not sink the vessel.

!!! tip "The senior answer"
    "We retry with exponential backoff and jitter, capped at 3 attempts, behind a circuit breaker so we stop retrying a dependency that is clearly down, with a timeout shorter than our caller's timeout." That one sentence covers what most candidates miss entirely.

---

## Timeouts Must Decrease Down the Stack

An underrated detail: if your API has a 10 s timeout and calls a service with a 30 s timeout, the inner call keeps working on a request nobody is waiting for. You have burned a connection and a thread for 20 s of guaranteed waste.

**Each layer's timeout should be shorter than its caller's**, leaving room for the retries you plan to make. Timeouts that increase inward are how thread pools fill up during incidents.

---

## Pages in This Section

| Page | Status |
|------|--------|
| [Single points of failure](single-points-of-failure.md) | Complete |
| [Rate limiting](rate-limiting.md) | Complete + simulator |
| [Circuit breakers](circuit-breakers.md) | First release + retry-storm sim |
| [Failure library](failure-library.md) | Complete |

[Single points of failure](single-points-of-failure.md) covers how to audit a real dependency graph (not just the architecture diagram) for the one box whose failure takes everything down, and the five levers — redundancy, load balancing, failover, replication, monitoring — that remove it. [Rate limiting](rate-limiting.md) covers token bucket, leaky bucket and sliding windows with a simulator for burst behavior. [Circuit breakers](circuit-breakers.md) has the state machine plus a retry-storm simulator that shows 1,000 rps becoming 4,000 rps in real time. [Failure library](failure-library.md) catalogs cascading failures, resource exhaustion, split brain and thundering herd as recognizable patterns.

Working implementations live in [`examples/python/retry.py`](https://github.com/sanketn26/interview-prep/blob/main/examples/python/retry.py), [`circuit_breaker.py`](https://github.com/sanketn26/interview-prep/blob/main/examples/python/circuit_breaker.py), and [`rate_limiter.py`](https://github.com/sanketn26/interview-prep/blob/main/examples/python/rate_limiter.py).

---

## Key Takeaways

- **Retries amplify load.** Unbounded retries turn slowness into an outage.
- **Backoff needs jitter**, or clients synchronize and spike together.
- **Rate limiters protect you; circuit breakers protect your dependencies; bulkheads protect your other features.**
- **Failing fast is a kindness** — it gives a struggling dependency room to recover.
- **Timeouts must shrink as you go deeper**, or threads pile up on abandoned work.
- **Under stress, do less.** Shed load deliberately rather than collapsing indiscriminately.
