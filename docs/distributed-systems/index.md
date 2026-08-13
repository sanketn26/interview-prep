---
title: Distributed Systems
description: Partial failure is the default. Remote calls are not function calls.
---

# Distributed Systems

A remote call can fail, time out, succeed after you gave up, run twice, or arrive out of order.

---

## Why This Exists

A local function call has two outcomes: it returns, or it throws. You have built your entire intuition on that.

A remote call has **three**: success, failure, and *unknown*. The third one is the entire discipline.

```python
response = payments.charge(user_id, amount)  # ← what if this times out?
```

If that call times out, you know exactly one thing: you did not get a response. You do **not** know whether the charge happened. The request may have been lost before arriving, or executed and the reply lost on the way back. From where you stand, those are indistinguishable — and yet in one case the customer was charged and in the other they were not.

Retry, and you might double-charge. Do not retry, and you might lose the payment. There is no third option that avoids the choice. **This ambiguity does not exist in single-machine programming, and no amount of clean code makes it go away.**

Distributed systems is the study of what you can still guarantee once you accept that.

---

## Mental Model

```
        Single machine                    Distributed system
        ─────────────                     ──────────────────
   call ──→ returns or throws        call ──→ returns
                                          ├─→ throws
   Shared clock                           └─→ ??? (timeout)
   Shared memory
   All-or-nothing failure           Independent clocks (skew)
                                    No shared memory (copies drift)
                                    Partial failure (3 of 5 nodes are fine)
```

The three assumptions you silently relied on — one clock, one memory, one failure domain — are all false across a network. Every concept in this section is a response to losing one of them.

---

## The Eight Fallacies (And The Three That Bite)

Peter Deutsch's classic list: the network is reliable, latency is zero, bandwidth is infinite, the network is secure, topology does not change, there is one administrator, transport cost is zero, the network is homogeneous.

In interviews, three do the damage:

**1. "The network is reliable."** It is not, and the failure mode is usually a *timeout*, not a clean error. Timeouts are ambiguous — see above.

**2. "Latency is zero."** A cross-region round trip is ~150 ms, bounded by the speed of light. Ten sequential cross-region calls is 1.5 seconds of pure waiting, no matter how fast your code is.

**3. "Topology does not change."** Nodes join, leave, and get partitioned away mid-request. Any design assuming a fixed member list breaks during the exact incident you built it for.

---

## Idempotency: The One Tool That Makes Retries Safe

Because timeouts are ambiguous, **you will retry**. The only question is whether retrying is safe. It is safe when the operation is *idempotent* — running it twice has the same effect as running it once.

You do not get idempotency for free; you engineer it with a key the client generates and reuses across retries:

```python
"""Idempotent request handling — the standard defense against ambiguous timeouts."""

from __future__ import annotations

from dataclasses import dataclass
from typing import Any


class ConflictError(Exception):
    """Same key replayed with different parameters — a client bug, not a retry."""


@dataclass
class Record:
    fingerprint: int
    response: Any


class IdempotentHandler:
    """Deduplicates retries so an ambiguous timeout cannot double-charge.

    Real deployments store this in Redis or a database table with a TTL and a
    uniqueness constraint on the key; the in-memory dict here keeps the logic
    visible.
    """

    def __init__(self) -> None:
        self._seen: dict[str, Record] = {}

    def handle(self, key: str, params: dict, execute) -> Any:
        prior = self._seen.get(key)
        fingerprint = hash(tuple(sorted(params.items())))

        if prior is not None:
            # Guard against key reuse with different parameters. Silently
            # returning the old response there would hide a real bug.
            if prior.fingerprint != fingerprint:
                raise ConflictError(f"key {key!r} reused with different params")
            return prior.response  # The retry: replay, do not re-execute.

        result = execute(**params)
        self._seen[key] = Record(fingerprint, result)
        return result


if __name__ == "__main__":
    charges: list[float] = []

    def charge(user: str, amount: float) -> str:
        charges.append(amount)
        return f"receipt-{len(charges)}"

    handler = IdempotentHandler()
    key = "client-generated-uuid-42"

    first = handler.handle(key, {"user": "alice", "amount": 99.0}, charge)
    # Client saw a timeout and retried with the SAME key:
    retry = handler.handle(key, {"user": "alice", "amount": 99.0}, charge)

    print(f"responses match: {first == retry}")   # True
    print(f"times actually charged: {len(charges)}")  # 1
```

The critical detail: **the client generates the key before the first attempt and reuses it on every retry.** A server-generated key would be new each time and would defeat the entire mechanism.

A fuller version — with in-flight reservation so two concurrent retries cannot both execute, and correct handling of failed attempts — is in [`examples/python/idempotency.py`](https://github.com/sanketn26/interview-prep/blob/main/examples/python/idempotency.py).

!!! warning "Idempotent is not the same as safe to run twice"
    `SET balance = 100` is idempotent. `balance = balance + 100` is not. Interviewers probe this: when you say "we retry," expect "what makes that safe?"

---

## How These Pages Fit Together

The section builds in dependency order, not alphabetical order:

```
CAP theorem ──────→ Consistency models ──────→ Replication ──────→ Raft
"you must choose    "'consistent' has        "how copies stay   "how nodes
 during a           many strengths"           in sync"           agree on
 partition"                                                      one answer"
```

**[CAP theorem](cap-theorem.md)** frames the fundamental trade-off. **[Consistency models](consistency-models.md)** replaces CAP's crude C/A binary with the spectrum you actually design against — linearizable, causal, eventual. **[Replication](replication.md)** covers the mechanics of keeping copies in sync and the lag that follows. **[Raft](raft.md)** shows how a cluster elects a leader and agrees on a log, with a simulator where you can kill the leader and watch recovery.

| Page | Status |
|------|--------|
| [CAP theorem](cap-theorem.md) | Complete |
| [Raft](raft.md) | First release + simulator |
| [Consistency models](consistency-models.md) | Complete |
| [Replication](replication.md) | Complete |

---

## Key Takeaways

- **A remote call has three outcomes, not two.** The unknown one drives every design here.
- **Timeouts are ambiguous.** You cannot tell "never arrived" from "reply was lost."
- **Retries are inevitable, so make operations idempotent** with a client-generated key.
- **You lost one clock, one memory, and one failure domain.** Every concept in this section restores a guarantee you used to get for free.
- **The interview tell:** saying "we'll just retry" without saying "because the operation is idempotent" marks you as mid-level.
