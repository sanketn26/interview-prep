---
title: Messaging
description: 1 producer → 1 partition → 1 consumer works until it does not.
---

# Messaging

1 producer → 1 partition → 1 consumer works until it does not.

---

## Why This Exists

A queue is how you say **"this does not have to happen right now."**

When a user uploads a video, the synchronous path — transcode to five resolutions, generate thumbnails, run moderation, notify followers — takes four minutes. Nobody waits four minutes for an HTTP response. So you accept the upload, drop a message on a queue, return `202 Accepted` in 50 ms, and let workers do the slow part.

That single move buys you three things at once:

- **Latency**: the user gets a response immediately.
- **Buffering**: a traffic spike queues up instead of knocking over the transcoder. The queue absorbs the burst.
- **Decoupling**: the transcoder can be down for ten minutes and nothing is lost — work resumes from the backlog.

And it costs you one thing that shows up in every interview follow-up: **the system is now eventually consistent, and you must design for messages arriving twice, out of order, or much later than you expected.**

---

## Mental Model

```
Synchronous                        Asynchronous
───────────                        ────────────
Client ──→ API ──→ Transcode       Client ──→ API ──→ [ QUEUE ] ──→ Worker
       ←──────────  4 min                 ←── 50 ms       │           │
                                                          │       ┌───┴───┐
  Spike → API dies                          Spike →  queue grows  │Worker │
  Worker down → request fails               Worker down → backlog └───────┘
                                                          waits
```

The queue turns a **failure** into a **delay**. That is the whole value proposition, and also the whole risk: delays are invisible until someone measures them. An unmonitored backlog is an outage nobody has noticed yet.

---

## Queue vs Log — The Distinction People Get Wrong

This is the most common conceptual gap in messaging interviews. RabbitMQ and Kafka are not competing implementations of the same idea.

| | **Queue** (RabbitMQ, SQS) | **Log** (Kafka, Pulsar) |
|---|---|---|
| On consume | Message is **removed** | Message **stays**; consumer advances an offset |
| Replay | Impossible — it is gone | Rewind the offset and reprocess |
| Consumers | Compete for messages | Independent groups each read everything |
| Ordering | Per queue, easily lost on redelivery | Strict **per partition** |
| Natural fit | Task distribution ("do this job") | Event streaming ("this happened") |

The mental shift: **a log is not a queue that keeps things — it is a durable, ordered record of facts, and consumption is just a bookmark.** That is why Kafka lets a new analytics service replay two years of history that a queue would have discarded milliseconds after delivery.

!!! tip "Interview signal"
    "Should we use Kafka or RabbitMQ?" → "Do we need replay and multiple independent consumers of the same events, or are we distributing tasks to workers?" Answering with the question shows you understand the axis that matters.

---

## Delivery Semantics: You Get to Pick Your Poison

There are three theoretical guarantees, and in practice **only two are real**.

```python
"""The three delivery semantics — and why exactly-once is a processing property."""

def at_most_once(msg, handler, ack):
    ack(msg)                 # acknowledge FIRST
    handler(msg)             # crash here → message lost forever
    # Use when: metrics, telemetry. Losing one sample is fine.

def at_least_once(msg, handler, ack):
    handler(msg)             # process FIRST
    ack(msg)                 # crash here → redelivered → DUPLICATE
    # Use when: almost always. You must make `handler` idempotent.

def effectively_once(msg, handler, ack, seen: set):
    """'Exactly-once' in practice: at-least-once delivery + idempotent processing."""
    if msg.id in seen:       # dedupe on a business key
        ack(msg)
        return
    handler(msg)
    seen.add(msg.id)
    ack(msg)
```

**At-most-once** acknowledges before working — crash and the message is gone. **At-least-once** works before acknowledging — crash and it is redelivered, so you see duplicates. There is no ordering of those two operations that gives you neither loss nor duplication, because the crash can land between them no matter what.

True exactly-once *delivery* is impossible across a network (it reduces to the two-generals problem). What systems actually sell as "exactly-once" is at-least-once delivery plus deduplication — **the guarantee lives in your handler, not in the broker.** This is the same [idempotency](../distributed-systems/index.md) argument from distributed systems, arriving from a different direction.

!!! warning "The follow-up you should expect"
    Say "we use at-least-once" and a good interviewer immediately asks "so what happens when this message arrives twice?" Have the dedupe key ready: a business identifier like `order_id`, not a broker-generated message ID that changes on redelivery.

---

## Parallelism Is Capped by Partitions

The most common Kafka operational surprise, in one line: **adding consumers past the partition count does nothing.**

```
Topic with 3 partitions
                                    Consumer group (3 members)      (5 members)
  P0 ──────────────────────────→    C1                              C1
  P1 ──────────────────────────→    C2                              C2
  P2 ──────────────────────────→    C3                              C3
                                                                    C4  ← IDLE
                                    max parallelism = 3             C5  ← IDLE
```

A partition is assigned to exactly one consumer in a group, which is precisely what preserves ordering within that partition. So partition count is your parallelism ceiling, chosen at topic-creation time and awkward to raise later — increasing it changes which key maps to which partition, breaking the ordering guarantee for existing keys.

The practical rule: **over-provision partitions early.** They are cheap; re-partitioning a live topic is not.

---

## Pages in This Section

| Page | Status |
|------|--------|
| [Kafka consumer groups](kafka.md) | Complete + simulator |
| [Queue patterns](patterns.md) | Complete |
| [Sagas](../architecture-patterns/sagas.md) | First release + simulator |

[Kafka](kafka.md) covers partitions, consumer groups, rebalancing and ordering, with a simulator where you can kill a consumer and watch the rebalance. [Queue patterns](patterns.md) covers pub/sub, work queues, dead-letter queues, and backpressure. [Sagas](../architecture-patterns/sagas.md) handles the case where a multi-step workflow fails halfway and you need compensating actions.

---

## Key Takeaways

- **A queue converts failure into delay** — and an unmonitored backlog is an undetected outage.
- **Queue vs log is about replay**, not performance. Logs keep messages; queues discard them.
- **Exactly-once delivery does not exist.** At-least-once + idempotent handler is the real answer.
- **Dedupe on a business key**, not a broker message ID.
- **Partitions cap consumer parallelism.** Extra consumers sit idle.
- **Always ask "what is consumer lag?"** — it is the health metric for every async system.
