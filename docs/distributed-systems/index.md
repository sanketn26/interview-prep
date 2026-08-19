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
| [Consistency models](consistency-models.md) | Complete |
| [Replication](replication.md) | Complete |
| [Fundamentals](fundamentals.md) | **Complete** — Lamport/vector clocks, leader election, split-brain, distributed locks, leases, gossip protocols, Paxos vs Raft, service discovery |
| [File Storage vs. Block Storage](file-and-block-storage.md) | Complete — block devices, POSIX/VFS, why NFS is slow, local-ownership file systems |
| [Raft](raft.md) | First release + simulator |
| [Multi-Region & Disaster Recovery](multi-region-dr.md) | Complete — RTO/RPO, the four DR tiers, cloud-to-DC hybrid failover, failback |

---

## Self-Test Questions

Expand each for a reference answer.

??? question "1. Can a system really be both consistent and available during a partition?"
    No — that's the entire content of CAP theorem. During a partition, a node can either answer (possibly with stale data — available) or refuse to answer until it can confirm it has the latest write (consistent), but it cannot do both for the same request. Outside of a partition you get all three properties; CAP only forces a choice *while the network is actually split*. See [CAP theorem](cap-theorem.md).

??? question "2. What actually happens to in-flight requests when a network partition occurs?"
    They land in the same "unknown" bucket described above: the request may have been applied on the far side of the partition, or never arrived. A synchronous caller sees a timeout, not a clean error, and cannot distinguish "not yet applied" from "applied but the ack was lost." This is exactly why the idempotency section above exists — the system has to be built to survive not knowing.

??? question "3. Why do most 'highly available' systems quietly choose availability over consistency?"
    Because refusing to answer is a worse user experience than answering with slightly stale data for the vast majority of endpoints — a stale product listing is fine, a rejected checkout page is not. So most systems default to AP and layer strong consistency back in only for the specific fields that need it (payments, inventory decrement), rather than making the whole system CP. Marketing the system as "highly available" is often just a polite way of saying "we chose A."

??? question "4. What's the difference between exactly-once and at-least-once delivery — and why is exactly-once mostly a lie?"
    At-least-once retries until it gets an ack, so a message may be delivered more than once; at-most-once never retries, so a message may be lost. "Exactly-once" is usually at-least-once delivery plus idempotent processing on the receiving end — the transport still redelivers, but duplicate application is suppressed via the [idempotency](#idempotency-the-one-tool-that-makes-retries-safe) pattern above. True exactly-once delivery, with no dedup logic anywhere, is not achievable across an unreliable network — the guarantee lives at the application layer, not the wire.

??? question "5. How does a distributed system agree on what time it is?"
    It mostly doesn't try to, because physical clocks drift and NTP sync only gets you to millisecond-ish accuracy with unbounded worst case. Instead systems use logical clocks — Lamport timestamps for a "happened-before" ordering, or vector clocks to detect concurrent (unordered) events — which capture causality without needing agreement on wall-clock time. Google's Spanner is the notable exception: it uses TrueTime with bounded uncertainty windows and *waits out* the uncertainty to get real global ordering, at a real latency cost.

??? question "6. What breaks first in a leader-election setup during a split-brain scenario?"
    Mutual exclusion — naively, both partitions could end up believing they hold the leader role and both accept writes, so the data diverges and reconciliation becomes lossy. Raft doesn't stop a stale leader from *believing* it's still in charge — an isolated old leader on the minority side keeps thinking it's leader until it hears from a node with a higher term. What Raft actually guarantees is narrower but sufficient: at most one leader per term, and a leader stuck in the minority partition can never gather the majority acks it needs to *commit* a new log entry, so its writes never actually take effect even while it believes it's serving them. The real invariant to know is "at most one leader can commit per term," not "only one side ever has a leader" — the majority quorum requirement is what makes the minority side's belief harmless rather than what prevents the belief itself. See [Raft](raft.md).

??? question "7. Why does adding more nodes sometimes make a system slower, not faster?"
    Coordination overhead grows with node count — quorum writes need acks from a majority, gossip and consensus protocols exchange O(n) or O(n²) messages, and cross-node chatter adds network hops that a single node never paid. Past a certain point the added coordination cost outweighs the added throughput, which is why replication factor and cluster size are tuned, not maximized — "more nodes" is not a free lever.

??? question "8. What's the real difference between a quorum and a majority vote?"
    A majority is a specific quorum — more than half — but "quorum" more generally means *any* rule for how many nodes must agree before an operation is considered committed, and it doesn't have to be a strict majority. Systems like Dynamo use tunable read/write quorums (R + W > N) where R and W can be set independently to trade off read vs. write latency, as long as their sum exceeds the replica count to guarantee overlap. Majority-quorum (as in Raft) is the special case optimized for leader election and fault tolerance, not the only valid definition.

??? question "9. How do you detect a failed node versus a slow one?"
    You mostly can't, with certainty — from the outside, a crashed node and a node stuck in a long GC pause look identical: both stop responding. Practical systems use heartbeats with a timeout threshold and accept the tradeoff explicitly: too short a timeout falsely evicts slow-but-alive nodes, too long a timeout delays real failure detection. Phi-accrual failure detectors (used in Cassandra) improve on a fixed threshold by producing a suspicion *level* from heartbeat history instead of a binary up/down call, but the fundamental ambiguity — slow vs. dead — never fully goes away.

??? question "10. What happens to your system's guarantees the moment you add a cache?"
    You've introduced a second copy of the data, which means you've introduced a consistency problem, whether you intended to or not. The cache can now serve stale data after the source of truth changes, and every invalidation strategy (TTL, write-through, write-invalidate) is really just choosing *how* stale and *for how long* you're willing to be wrong. A cache is not a free performance win — it's a deliberate trade of some consistency guarantee for latency, and the interview tell is being able to name which guarantee you gave up.

---

## Key Takeaways

- **A remote call has three outcomes, not two.** The unknown one drives every design here.
- **Timeouts are ambiguous.** You cannot tell "never arrived" from "reply was lost."
- **Retries are inevitable, so make operations idempotent** with a client-generated key.
- **You lost one clock, one memory, and one failure domain.** Every concept in this section restores a guarantee you used to get for free.
- **The interview tell:** saying "we'll just retry" without saying "because the operation is idempotent" marks you as mid-level.
