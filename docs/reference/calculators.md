---
title: Calculators
description: Capacity estimation, Little's Law, and availability nines — the arithmetic interviewers expect you to do out loud.
---

# Calculators

**Prerequisites:** [Requirements & Estimation](../foundations/requirements-estimation.md), [Engineering Math](../foundations/math.md)

Back-of-envelope math is not decoration. It is how you decide whether the first design is a laptop Postgres or a sharded cluster — before you draw Kafka.

This hub hosts the same **capacity** inputs used in requirements estimation (`cap-dau` and friends) plus **Little's Law** and **availability** budgets.

---

## Capacity estimator

Fermi numbers, not a quote from procurement. Change DAU, requests/day, peak factor, payload, replication. Read the flags: they tell you which bottleneck appears first.

<div class="sim-container">
  <div class="sim-title">Capacity estimator</div>
  <div class="cap-grid">
    <label>DAU <input id="cap-dau" type="number" value="10000000"></label>
    <label>Req / user / day <input id="cap-rpd" type="number" value="20"></label>
    <label>Peak × average <input id="cap-peak" type="number" value="8"></label>
    <label>Read % <input id="cap-readpct" type="number" value="90"></label>
    <label>Payload bytes <input id="cap-payload" type="number" value="2048"></label>
    <label>Regions <input id="cap-regions" type="number" value="1"></label>
    <label>Replication factor <input id="cap-rf" type="number" value="3"></label>
    <label>Cache hit % <input id="cap-hit" type="number" value="80"></label>
  </div>
  <div class="sim-controls">
    <button class="sim-btn success" onclick="window._cap && window._cap.compute()">Compute</button>
    <button class="sim-btn" onclick="window._cap && window._cap.reset()">Reset</button>
  </div>
  <div class="sim-stats" id="cap-stats"></div>
  <div id="cap-flags"></div>
  <div class="sim-log" id="cap-log"></div>
  <p class="sim-explain">avg QPS = DAU × rpd / 86400 · peak QPS = avg × peak · miss QPS = peak reads × (1 − hit). Storage/day ≈ write QPS × 86400 × payload × RF. Same IDs as the requirements-estimation page so both stay wired to <code>window._cap</code>.</p>
</div>

Same calculator lives on [Requirements & Estimation](../foundations/requirements-estimation.md) when that page is filled in.

---

## Little's Law & availability

**Little's Law:** \(L = \lambda W\)

- \(L\) — average number of requests **in the system** (in-flight)
- \(\lambda\) — arrival rate (req/s)
- \(W\) — average time in the system (seconds)

If you take 2000 QPS at 50ms, you have **100 concurrent** requests. That is thread-pool size, DB connections, and "why did we melt at 2× traffic with the same p50."

**Nines** are a downtime *budget*, not a feeling:

| Availability | Downtime / month (30.44 d) |
|--------------|----------------------------|
| 99% (2 nines) | ~7.3 hours |
| **99.9% (3)** | **≈ 43.8 min** |
| **99.99% (4)** | **≈ 4.38 min** |
| **99.999% (5)** | **≈ 26 s** |

A 30-minute deploy that pages the fleet **is** your monthly 3-nines budget.

<div class="sim-container">
  <div class="sim-title">Little's Law & Availability</div>
  <div>
    <label>Arrival rate λ (req/s) <input id="ll-lambda" type="number" value="2000"></label>
    <label>Latency W (seconds) <input id="ll-w" type="number" value="0.05" step="0.001"></label>
    <label>Nines <input id="ll-nines" type="number" value="3"></label>
  </div>
  <button class="sim-btn success" onclick="window._math && window._math.compute()">Compute</button>
  <div class="sim-stats">
    <div class="sim-stat"><div class="sim-stat-label">L = λW</div><div class="sim-stat-value" id="ll-l">—</div></div>
    <div class="sim-stat"><div class="sim-stat-label">Downtime/mo</div><div class="sim-stat-value" id="ll-down">—</div></div>
  </div>
  <div class="sim-log" id="ll-log"></div>
</div>

!!! tip "How to say it in an interview"
    "10M DAU, 20 requests, 8× peak → about 18k peak QPS. At 50ms we need ~900 in-flight. Three nines is 44 minutes a month — I will not spend that on a blocking deploy."

---

## Quick identities

```
QPS_avg     = DAU × requests_per_user / 86_400
QPS_peak    = QPS_avg × peak_factor          # 3–10 typical consumer; 2–3 B2B
in_flight   = QPS_peak × latency_s           # Little
storage_day = writes_per_s × 86_400 × bytes × RF
bandwidth   = QPS_peak × bytes
```

**Fan-out:** if one user request becomes 8 RPCs, \(\lambda\) for the leaf is 8×. p99 of the parent is dominated by the slowest child (see tail latency).

---

## Interview Questions

=== "Foundation"
    **Q: 1M DAU, 10 requests/user/day, 5× peak. QPS?**

    "10M requests/day ÷ 86400 ≈ 116 average QPS. Peak ≈ 580 QPS. I would still design the DB for a few thousand — estimation is order-of-magnitude, and we will cache."

=== "Senior"
    **Q: We need 99.99%. Can we take a 10-minute failover?**

    "No. 99.99% is about 4.4 minutes a month. A 10-minute regional failover *once* blows the SLO. Either make failover faster (health checks, pre-warmed capacity, not DNS TTL=300) or sell 99.9% honestly."

=== "Staff"
    **Q: Product wants five nines on checkout. What do you actually negotiate?**

    "26 seconds a month is not an engineering number — it is an organizational one: dual-region active-active, no blocking deploys, dependency SLOs tighter than ours, and a cost that is usually 3–5×. I would split SLIs (place order vs generate invoice), put five nines only on authorize+capture, and keep catalog at three. Then show the $ and the page that fires if anyone adds a sync PDF render on the checkout path."

---

## Key Takeaways

!!! success "Remember"
    1. Capacity math exists to find the **first bottleneck**, not the invoice
    2. \(L=\lambda W\) turns latency into **concurrency**
    3. 99.9% ≈ **43.8 min/mo**; 99.99% ≈ **4.38 min**; 99.999% ≈ **26 s**
    4. Peak and miss QPS size the database; average QPS sizes the slide deck
    5. Nines are a budget you **spend** on deploys and incidents
