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
| [Requirements & capacity estimation](requirements-estimation.md) | First release — calculator |
| [Stateless vs stateful applications](stateless-vs-stateful.md) | Complete |
| [System design framework](framework.md) | First release — 19-step method |
| [Engineering mathematics](math.md) | Complete |

Read them in that order. Requirements-estimation gives you the arithmetic and an interactive calculator, stateless-vs-stateful gives you the vocabulary the rest of the curriculum assumes when it talks about session affinity and horizontal scaling, the framework gives you the checklist, and math gives you the queueing theory behind *why* systems fall over at 80% utilization rather than 100%.

---

## Self-Test Questions

Think you know system design? Try answering these without Googling — expand each for a reference answer.

??? question "1. How would you design a URL shortener that handles 100M requests a day?"
    "100M requests/day" is not yet enough to design against — ask for the read:write ratio before picking an architecture (typically redirects heavily outnumber link creations, but state that as an assumption you're confirming, not a fact you inferred from the total). Take 100M as an *average*: 100M/day ≈ 1,160 QPS average, but per the peak-multiplier point above, size the system for peak (3×–10×), not average — a design that only survives 1,160 QPS is under-built the moment traffic isn't flat. Generate short codes with a counter + base62 encoding (not a hash) to avoid collision retries, store the mapping in a KV store, and put a cache in front once the read:write ratio confirms reads dominate. The redirect response (301/302) has to be constructed and returned by something that speaks HTTP — an edge/CDN layer, a reverse proxy, or the app server can serve it from a cache-backed lookup, but a cache store like Redis on its own only returns the stored mapping, not an HTTP response. The interesting failure mode is a single link going viral: that turns a flat traffic problem into a hot-key caching problem.

??? question "2. What happens when your database becomes the bottleneck?"
    First figure out *which* resource is saturated — CPU, IO, or connections — because the fix is different for each. Cheapest lever first: add a read replica and route reads there, or add a cache to absorb repeat reads. If writes are the bottleneck, that's harder — vertical scaling buys time, but the real fix is sharding or moving to an async write path (queue + batch). The trap is reaching for sharding before confirming the bottleneck isn't just a missing index or an N+1 query.

??? question "3. How do you decide between vertical and horizontal scaling?"
    Vertical scaling (bigger machine) is simpler — no distributed-systems tax — but it hits a ceiling and creates a single point of failure. Horizontal scaling (more machines) has no ceiling but requires the workload to be partitionable and the app to be stateless. In practice: vertical scale first because it's free of complexity, and only go horizontal once you hit the ceiling or need redundancy anyway. Stateful services (databases) resist horizontal scaling far more than stateless app servers do.

??? question "4. What's the tradeoff between strong and eventual consistency?"
    Strong consistency means every read sees the latest write, at the cost of latency and availability during a partition — you may have to block or reject a read to guarantee that. Eventual consistency lets reads return stale data but stays fast and available, converging "eventually." The decision is per-field, not per-system: an account balance needs strong consistency, a "like" count usually doesn't. Picking eventual consistency without saying which staleness window is tolerable is a red flag in an interview.

??? question "5. How would you design a rate limiter?"
    Pick an algorithm based on what you're protecting: token bucket allows bursts and is the default choice; sliding-window log is precise but memory-heavy; fixed window is cheap but allows a 2x burst at window boundaries. State needs to live somewhere shared (Redis) if you have multiple app servers, or the limit is per-instance and effectively N times too generous. The real design question is where it sits — client SDK, API gateway, or per-service — and what happens on the store being unavailable (fail open vs. fail closed).

??? question "6. When does a load balancer become a single point of failure?"
    The instant you run only one of them. The fix isn't "add a bigger load balancer," it's active-passive or active-active LB pairs behind a floating IP or DNS, so a health check failure triggers failover. People often solve backend SPOFs carefully and then leave a single LB in front of it all, which just moves the SPOF up one layer instead of removing it.

??? question "7. How do you handle a hot partition in a sharded database?"
    First diagnose why: a bad shard key (e.g., sharding by date when all writes are for "today") is the usual cause, and no amount of infrastructure fixes a bad key. Mitigations: add a random suffix to spread a hot key across sub-shards ("salting"), cache the hot key's reads, or move to a shard key with better cardinality. Re-sharding under live traffic is the expensive path — it should be the last resort, not the first reflex.

??? question "8. What's the difference between a CDN and a reverse proxy in your design?"
    A CDN caches content geographically close to the user, on infrastructure you don't run, mainly to cut latency and origin load for static/cacheable content. A reverse proxy sits in front of your own servers for routing, TLS termination, load balancing, or caching — it's part of your infra, not a third-party network. They're often layered: CDN at the edge, reverse proxy at your origin, each solving a different distance problem.

??? question "9. How would you design a system that survives a full region outage?"
    Nothing in a single region survives a regional outage, so the requirement forces multi-region by definition. Active-passive is cheaper and simpler: replicate data async to a standby region and fail over DNS on outage, accepting some data loss (RPO) and downtime (RTO) during failover. Active-active removes both but multiplies complexity — you now need conflict resolution for concurrent writes in two regions, which drags in the same consistency tradeoffs as question 4.

??? question "10. What breaks first when you 10x your traffic overnight?"
    Whatever was already closest to saturated — almost always the database, since app servers scale horizontally easily but a single primary database often doesn't. The second thing to break is anything with a fixed connection pool or thread pool sized for the old load, which fails as a cascading timeout storm rather than a clean rejection. This is why capacity planning uses a peak multiplier (see above) instead of designing for the average — "overnight 10x" is exactly the scenario averages hide.

---

## Key Takeaways

- **Requirements → numbers → bottleneck → architecture.** Never skip a step, never reverse the order.
- **You need three numbers**: QPS, read:write ratio, and data volume + growth.
- **Design for peak, not average.** Use a 3× multiplier as a floor.
- **Memory is ~1,000× faster than SSD; cross-region is ~150 ms.** Most caching and colocation decisions follow directly.
- **Every box needs a bottleneck to justify it.** If you cannot name the pressure, you have not earned the component.

**Exit:** given a vague prompt, you ask the right questions, estimate scale, draw V1, and name the first bottleneck without naming Kafka.
