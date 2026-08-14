---
title: Caching & Performance
description: Caches hide load until they expire together. Averages hide outages.
---

# Caching & Performance

Caches hide load until they expire together. Averages hide outages.

---

## Why This Exists

Two ideas in this section will change how you read a dashboard.

**The first:** a cache does not make your system faster — it makes your system *dependent*. A 99% hit rate means your database is sized for 1% of traffic. That is a wonderful deal right up until the hit rate drops, at which point the database receives 100× its provisioned load and dies. Caches convert a performance problem into an availability problem, and most outages in cached systems are the cache misbehaving rather than the database being slow.

**The second:** your average latency is a lie. If p50 is 20 ms and p99 is 2 seconds, then one request in a hundred takes two seconds — and at scale, that is millions of users daily. Worse, a single page often makes dozens of backend calls, so the *user's* experience tracks your p99, not your p50. Averages are the most confidently wrong number on your dashboard.

---

## Mental Model: The Cache Is Load-Bearing

```
Steady state (99% hit rate)          Cache fails / mass expiry
──────────────────────────           ─────────────────────────
 100,000 req/s                        100,000 req/s
      │                                    │
      ▼                                    ▼
   ┌──────┐  99,000 served            ┌──────┐  0 served
   │ CACHE│ ────────────→             │ DEAD │
   └──┬───┘                           └──┬───┘
      │ 1,000 req/s                      │ 100,000 req/s
      ▼                                  ▼
   ┌──────┐  comfortable              ┌──────┐  100× over capacity
   │  DB  │                           │  DB  │  ☠ cascading failure
   └──────┘                           └──────┘
```

The database was never sized for the real traffic. It was sized for the *miss* traffic — and the difference between those two numbers is your blast radius.

!!! warning "Ask this in every design"
    "What happens the moment the cache is empty?" If the answer is "the database falls over," you have not designed a cache — you have designed a single point of failure with good latency. Cold starts, deploys, and evictions all produce that moment.

---

## Why Percentiles Beat Averages

The arithmetic is worth doing once, because it is genuinely counterintuitive:

```python
"""Why p99 matters more than the average — and why fan-out makes it worse."""


def tail_amplification(p99: float, calls_per_request: int) -> float:
    """Probability that a request touching `calls_per_request` services
    hits at least one p99-slow call."""
    return 1 - (0.99 ** calls_per_request)


if __name__ == "__main__":
    latencies = [20] * 99 + [2000]  # 99 fast requests, 1 slow one (ms)
    average = sum(latencies) / len(latencies)
    print(f"average latency:      {average:.0f} ms  ← looks fine")
    print(f"p99 latency:          {max(latencies)} ms  ← the truth\n")

    for n in (1, 10, 100):
        pct = tail_amplification(0.99, n) * 100
        print(f"{n:>3} backend calls → {pct:5.1f}% of requests hit a slow path")
```

```
average latency:      40 ms  ← looks fine
p99 latency:          2000 ms  ← the truth

  1 backend calls →   1.0% of requests hit a slow path
 10 backend calls →   9.6% of requests hit a slow path
100 backend calls →  63.4% of requests hit a slow path
```

That last line is the punchline. A service with a "healthy" 1% slow rate, called 100 times to render one page, produces a slow page **63% of the time**. This is *tail amplification*, and it is why microservice architectures feel slow even when every individual service reports good numbers.

!!! tip "The senior framing"
    "Our p99 is 200 ms" is a much stronger statement than "our average is 40 ms" — and "our p99 is 200 ms and we fan out to 30 services" is stronger still, because it shows you know the fan-out multiplies your tail.

---

## The Three Failure Modes of Caching

Almost every cache incident is one of these:

**1. Stampede (thundering herd).** A hot key expires; a thousand concurrent requests all miss and all hit the database simultaneously. Fixed with a mutex/single-flight lock, jitter, or stale-while-revalidate. See [cache stampede](cache-stampede.md).

**2. Synchronized expiry.** You warmed 10,000 keys at deploy time with an identical TTL, so they all expire in the same second. The fix is jitter: `ttl = base + random(0, base * 0.1)`. Never use a constant TTL for a bulk-loaded set.

**3. Staleness after write.** You updated the database and forgot the cache, so users read old data until the TTL lapses. The fix depends on your write strategy — cache-aside with invalidation, write-through, or accepting bounded staleness deliberately. See [cache strategies](cache-strategies.md).

The unifying lesson: **caching is a consistency decision disguised as a performance decision.** The moment you cache, you have two copies of the truth and must decide how wrong the second one may be.

---

## Pages in This Section

| Page | Status |
|------|--------|
| [Fundamentals](fundamentals.md) | **Complete** — threads, memory, goroutine leaks, logging impact, OS tuning, profiling |
| [Cache strategies](cache-strategies.md) | Complete |
| [Cache stampede](cache-stampede.md) | Complete + simulator |
| [Tail latency](tail-latency.md) | First release + simulator |

Read [Fundamentals](fundamentals.md) first for the foundation — thread models (user-space vs kernel), where memory actually gets allocated, goroutine leaks, logging overhead, lock contention, and OS-level tuning. Then [cache strategies](cache-strategies.md) for write patterns and eviction policies, [cache stampede](cache-stampede.md) for the classic failure — with a simulator where you can expire a hot key and watch the database melt, and [tail latency](tail-latency.md) for percentiles and hedged requests.

---

## Key Takeaways

- **A cache makes the database load-bearing at 1% capacity.** Always ask what happens when it empties.
- **Averages hide outages; design and report on p99.**
- **Tail amplification is brutal:** 1% slow × 100 calls ≈ 63% slow pages.
- **Jitter every bulk TTL.** Identical TTLs create synchronized expiry.
- **Caching is a consistency decision.** Two copies of the truth means choosing how stale the second may be.
