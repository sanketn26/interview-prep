---
title: Design-exercise assessment
description: Score the reasoning, not whether the boxes match a reference architecture.
---

# Design-exercise assessment

Use this rubric after you work an exercise with the solution covered. It is also how a reviewer should score a mock.

!!! danger "Do not require matching a reference architecture"
    A candidate who draws “our” diagram from memory and cannot defend it **fails**. A candidate who draws a smaller system, names the bottleneck that would force the next box, and defends the trade-off **passes**. The pages in this folder are one viable evolution, not the answer key.

Flagship exercises with a harder five-level self-check (Explain → Predict → Diagnose → Design → Defend): [URL shortener](url-shortener.md), [Rate limiter](rate-limiter.md), [Payment processing](payment-processing.md), [WhatsApp](whatsapp.md). Apply the same five questions anywhere.

Worked examples of the *voice* this rubric is listening for: [Reasoning transcripts](../foundations/reasoning-transcripts.md).

---

## Rubric

Score each row **0 / 1 / 2**. Total /16. Passing mock: **11+** with no zero on bottleneck, failure modes, or tradeoff defense.

| Score | Meaning |
|------:|---------|
| 0 | Skipped, generic, or wrong in a way that would ship an outage |
| 1 | Present but shallow (lists tools, does not connect to *this* workload) |
| 2 | Specific to the requirements, with a number or a named failure |

| Dimension | 0 | 1 | 2 |
|-----------|---|---|---|
| **Requirements clarification** | Jumps to boxes. No functional vs NFR split. | Asks traffic/SLA questions, does not pin decisions. | States in/out of scope, NFRs with units, what “done” means for V1. |
| **Estimates** | No numbers, or numbers that cannot affect the design. | QPS/storage arithmetic with no peak or row size. | Back-of-envelope that *kills a design* (this fits in RAM; this does not fit on one primary). |
| **Bottleneck identification** | “We’ll scale it” / adds Kafka pre-emptively. | Names a component as hot without the path. | Names the first thing that dies at the calculated load, *before* adding infrastructure. |
| **Architectural justification** | Every fashionable box is present. | Each box has a sentence. | Every box exists to kill a named bottleneck from the previous step. |
| **Failure modes** | Happy path only. | Lists “replica, retry, timeout” as a checklist. | Walks crash windows (retry = double charge, cache expiry = stampede, quorum < W = write fail). |
| **Alternatives** | “We could also use X.” | Mentions one alternative. | Option A vs B with the condition that would flip the choice. |
| **Operational concerns** | No metrics, no deploy, no ownership. | Names a dashboard. | SLIs, what to page on, how to migrate, what the on-call run looks like. |
| **Tradeoff defense** | “Best practice.” | Table copied from a blog. | Explicit loser: latency vs correctness, fail-open vs fail-closed, cost vs p99 — and who pays. |

---

## What not to penalize

- Different datastore than the write-up if the access pattern still matches.
- Stopping at V1 when the numbers still fit, if they say what would force V2.
- Skipping a CDN, Kafka, or service mesh the reference page introduced later.
- Using a cloud managed service instead of self-drawn boxes.

## What is an automatic fail

- Double-charge / lost money / split-brain hand-waved.
- Global order claimed from Kafka without a partition key.
- Cache as a source of truth with no origin story.
- “Mongo is AP, Postgres is CA” as the whole CAP answer.

---

## How to run a mock (30–45 min)

1. Cover the solution. Prompt is the **Problem Statement** only.
2. Candidate has 3 minutes to ask questions. If they do not, give one NFR and note the miss.
3. Demand estimates before architecture.
4. Freeze V1. Ask “what dies at 10×.” Only then allow V2.
5. Pick one failure from the [failure library](../reliability/failure-library.md) and make them diagnose it on *their* diagram.
6. Score with this sheet. Debrief with the exercise’s Self-Assessment, not by flipping to the final mermaid first.
