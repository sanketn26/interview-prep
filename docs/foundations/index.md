---
title: System Design Fundamentals
description: Requirements, capacity, and the 19-step method — the spine of every design in this academy.
---

# System Design Fundamentals

Start here if you can ship an API + database and need a method for everything larger.

---

## Why This Exists

Most engineers fail system design interviews for one reason: **they start drawing boxes before they know what they are building.**

The prompt is "design Twitter." The candidate immediately draws a load balancer, three app servers, a database, and Redis. Forty minutes later the interviewer asks "what happens when Justin Bieber tweets?" and the whole design collapses — because it was never derived from the workload. It was recalled from a diagram someone saw once.

The fix is a **method**. Given any unfamiliar system, you should be able to ask the right questions, put numbers on the answers, and let those numbers force the architecture. Boxes come last, not first.

---

## Mental Model

Every design decision in this academy flows one direction:

```
Requirements ──→ Numbers ──→ Bottleneck ──→ Architecture
     │              │             │              │
  "what and     "how much     "what breaks   "the smallest
   for whom"     per second"    first"        thing that
                                              survives it"
```

Reverse any arrow and you get cargo-cult design. "We use Kafka" is an answer looking for a question. **The bottleneck is what earns you the box.**

!!! tip "The one-sentence test"
    Before adding any component, finish this sentence: *"I need this because \_\_\_ exceeds \_\_\_."*
    If you cannot fill both blanks with a number, you do not need the component yet.

---

## The Three Questions That Drive Everything

Almost every architecture in this curriculum falls out of three numbers.

**1. How many requests per second?**
Decides whether you need one server or a fleet, and whether "just use Postgres" is a complete answer.

**2. What is the read:write ratio?**
Read-heavy → caches and replicas. Write-heavy → sharding and queues. This single ratio eliminates half the design space.

**3. How much data, and how fast does it grow?**
Decides whether it fits on one machine. Everything hard in distributed systems starts the moment the answer is "it does not."

Here is the arithmetic, made concrete:

```python
"""Back-of-envelope sizing: the numbers that pick your architecture."""

SECONDS_PER_DAY = 86_400


def capacity(dau: int, actions_per_user: int, read_write_ratio: int,
             bytes_per_write: int, peak_multiplier: float = 3.0) -> dict:
    """Turn product numbers into engineering numbers.

    `peak_multiplier` matters more than people expect: traffic is never flat,
    and you must survive the peak, not the average.
    """
    writes_per_day = dau * actions_per_user
    write_qps = writes_per_day / SECONDS_PER_DAY
    read_qps = write_qps * read_write_ratio

    return {
        "write_qps_avg": round(write_qps, 1),
        "write_qps_peak": round(write_qps * peak_multiplier, 1),
        "read_qps_peak": round(read_qps * peak_multiplier, 1),
        "storage_per_day_gb": round(writes_per_day * bytes_per_write / 1e9, 2),
        "storage_per_year_tb": round(writes_per_day * 365 * bytes_per_write / 1e12, 2),
    }


# "Design Twitter" — 200M DAU, 2 tweets/day each, 100:1 read:write, 300 B/tweet
if __name__ == "__main__":
    for key, value in capacity(200_000_000, 2, 100, 300).items():
        print(f"{key:22} {value}")
```

Running it prints:

```
write_qps_avg          4629.6
write_qps_peak         13888.9
read_qps_peak          1388888.9
storage_per_day_gb     120.0
storage_per_year_tb    43.8
```

A runnable version, with Little's Law pool sizing and tail amplification, lives in [`examples/python/capacity.py`](https://github.com/sanketn26/interview-prep/blob/main/examples/python/capacity.py).

Now the architecture is no longer a matter of taste. **1.4M reads/sec** means no single database serves reads — you need caching and fan-out. **13.9K writes/sec** is high but survivable on a sharded cluster. **43.8 TB/year** does not fit on one disk, so sharding is mandatory rather than optional. You did not choose those conclusions; the numbers did.

!!! warning "The peak multiplier is where designs die"
    Averaging 4.6K writes/sec sounds comfortable. But traffic concentrates — a 3× peak is conservative, and event-driven spikes (a World Cup goal, a celebrity post) can hit 10×. Designing for the average means designing for an outage.

---

## Numbers Worth Memorizing

You cannot estimate without a few anchors. These are the ones that actually come up:

| Operation | Time | What it means in practice |
|-----------|------|---------------------------|
| L1 cache reference | ~1 ns | Free |
| Main memory reference | ~100 ns | ~100× slower than L1 |
| SSD random read | ~100 µs | ~1,000× slower than memory |
| Network round trip (same datacenter) | ~0.5 ms | ~5,000× slower than memory |
| Disk seek (spinning) | ~10 ms | Avoid |
| Network round trip (cross-continent) | ~150 ms | Physics — you cannot optimize this away |

The single most useful consequence: **memory is ~1,000× faster than SSD, and a cross-region hop costs more than 1,000 memory accesses.** That is why caches exist, and why chatty microservices across regions are a design smell.

| Quantity | Rule of thumb |
|----------|---------------|
| 1 million seconds | ≈ 12 days |
| 1 day | ≈ 86,400 s (round to 100K for mental math) |
| 1M writes/day | ≈ 12 writes/sec |
| Modern server | ~10–50K simple QPS |
| Postgres on good hardware | ~5–15K TPS before tuning hurts |

!!! tip "Round aggressively"
    Use 100,000 seconds per day instead of 86,400. Interviewers care that you can reason about orders of magnitude, not that you can do long division under stress. Being 15% off never changes the architecture; being 100× off always does.

---

## What "Good" Looks Like

A strong candidate's first five minutes contain almost no architecture:

1. **Clarify the actual product.** "Is this read-heavy? Who are the users? What is out of scope?"
2. **Name the constraint that matters.** Latency budget, consistency requirement, or cost ceiling — pick the one that will drive trade-offs.
3. **Estimate.** Out loud, with round numbers.
4. **State the bottleneck.** "At 1.4M reads/sec, the database is the problem, so the design is really about the read path."
5. *Then* draw.

Steps 1–4 are what separates senior from mid-level. Most candidates skip straight to 5.

---

## Pages in This Section

| Page | Status |
|------|--------|
| [System design framework](framework.md) | First release — 19-step method |
| [Requirements & capacity estimation](requirements-estimation.md) | First release — calculator |
| [Engineering mathematics](math.md) | Complete |

Read them in that order. The framework gives you the checklist, requirements-estimation gives you the arithmetic and an interactive calculator, and math gives you the queueing theory behind *why* systems fall over at 80% utilization rather than 100%.

---

## Key Takeaways

- **Requirements → numbers → bottleneck → architecture.** Never skip a step, never reverse the order.
- **You need three numbers**: QPS, read:write ratio, and data volume + growth.
- **Design for peak, not average.** Use a 3× multiplier as a floor.
- **Memory is ~1,000× faster than SSD; cross-region is ~150 ms.** Most caching and colocation decisions follow directly.
- **Every box needs a bottleneck to justify it.** If you cannot name the pressure, you have not earned the component.

**Exit:** given a vague prompt, you ask the right questions, estimate scale, draw V1, and name the first bottleneck without naming Kafka.
