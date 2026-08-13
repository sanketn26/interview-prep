---
title: Observability
description: You cannot debug what you cannot see. Start from the symptom, not the dashboard wallpaper.
---

# Observability

You cannot debug what you cannot see. Start from the symptom, not the dashboard wallpaper.

---

## Why This Exists

At 3 a.m. the page fires: **"checkout p99 is 8 seconds."** You have forty dashboards. Which do you open?

Most engineers open the one they built, or the one they remember. They browse charts hoping something looks wrong, find a spiky graph, and start theorizing about it — usually the wrong graph, because in a system of any size *something* always looks spiky.

Observability is not "we have dashboards." It is the property that **you can answer a question you did not anticipate**, without shipping new code. Monitoring tells you *that* something is broken; observability lets you find out *why* when the cause is something nobody predicted.

The difference shows up precisely during novel incidents — which is to say, the ones that actually hurt.

---

## Mental Model: The Three Pillars Answer Different Questions

```
        METRICS                 TRACES                    LOGS
        ───────                 ──────                    ────
   "Is something wrong?"   "Where is it slow?"    "What exactly happened?"

   Cheap, aggregated       One request's full     Full detail for
   Numbers over time       path across services   a specific event
   Alert on these          Find the slow hop      Read after you know
                                                  where to look
   p99 = 8s ──────────────→ auth: 12ms
   (something is wrong)     cart: 8ms
                            inventory: 7.9s ──────→ "connection pool
                            payment: 30ms           timeout after 7900ms"
                            (found the hop)         (found the cause)
```

They are a **funnel, not alternatives**. Metrics detect, traces localize, logs explain. Debugging that skips a stage is guesswork: reading logs before you have a trace means grepping millions of lines with no idea which service to grep.

!!! tip "The senior debugging move"
    Start from the **symptom the user reported**, then walk down the funnel. Do not start from a dashboard you like. "Checkout is slow" → trace a slow checkout → find the hop → read that service's logs for that request ID.

---

## The One Thing That Makes Traces Work

A trace is only useful if you can follow a single request across service boundaries. That requires propagating a **correlation ID** through every call — and this is where most homegrown setups fail:

```python
"""Correlation IDs: how one request stays identifiable across many services."""

from __future__ import annotations

import uuid
from contextvars import ContextVar

# ContextVar (not a global) so concurrent requests never share state.
_request_id: ContextVar[str] = ContextVar("request_id", default="")


def begin_request(incoming_header: str | None) -> str:
    """Reuse the caller's ID if present; otherwise start a new trace.

    Reusing is the critical half — generating a fresh ID at every hop gives
    you five disconnected IDs instead of one traceable request.
    """
    rid = incoming_header or f"req-{uuid.uuid4().hex[:12]}"
    _request_id.set(rid)
    return rid


def outbound_headers() -> dict[str, str]:
    """Attach the current ID to every downstream call."""
    return {"X-Request-ID": _request_id.get()}


def log(message: str) -> None:
    """Structured log lines carry the ID so they are greppable per request."""
    print(f'{{"request_id": "{_request_id.get()}", "msg": "{message}"}}')


if __name__ == "__main__":
    rid = begin_request(None)          # edge service: no upstream header
    log("checkout received")
    headers = outbound_headers()        # passed to inventory service

    begin_request(headers["X-Request-ID"])  # inventory service reuses it
    log("inventory lookup slow: 7900ms")

    print(f"\nboth log lines share request_id={rid} → one greppable trace")
```

```
{"request_id": "req-a3f9c21b8e04", "msg": "checkout received"}
{"request_id": "req-a3f9c21b8e04", "msg": "inventory lookup slow: 7900ms"}

both log lines share request_id=req-a3f9c21b8e04 → one greppable trace
```

Without this, an incident becomes archaeology: you know checkout was slow at 03:14 and you have five services' logs with no way to tell which lines belong to the same request.

!!! warning "Sampling will hide your incident"
    Tracing every request is expensive, so most systems sample — often 1%. But the requests you need are the slow and failed ones, which are rare by definition. Use **tail-based sampling**: buffer the trace, then keep it if it was slow or errored. Head-based sampling at 1% discards 99% of your evidence.

---

## What to Actually Alert On

The most common failure is alerting on causes rather than symptoms. "CPU > 80%" pages you at 3 a.m. for something that may be entirely fine. Nobody is harmed by high CPU; users are harmed by slow or failed requests.

Alert on the **four golden signals**, which are all user-visible:

| Signal | Question | Typical alert |
|---|---|---|
| **Latency** | Are requests slow? | p99 above SLO for 5 min |
| **Traffic** | How much demand? | Sudden drop = something upstream broke |
| **Errors** | Are requests failing? | Error rate > 1% |
| **Saturation** | How full is the system? | Queue depth, pool utilization > 80% |

Note that **latency alerts must use percentiles, not averages** — for the [tail-amplification](../performance/index.md) reasons in the performance section. And measure latency for *failed* requests separately: fast failures can make your p99 look wonderful while everything is broken.

---

## Pages in This Section

| Page | Status |
|------|--------|
| [Debugging playbook](debugging-playbook.md) | First release — high p99 + Kafka lag |

The [debugging playbook](debugging-playbook.md) works two real incidents end to end — a high-p99 investigation and Kafka consumer lag — showing the hypothesis-and-eliminate loop rather than a list of tools. Related: [tail latency](../performance/tail-latency.md) for what p99 actually means, and the [failure library](../reliability/failure-library.md) for recognizing patterns quickly.

---

## Key Takeaways

- **Monitoring says something is wrong; observability tells you why** — including for causes nobody predicted.
- **Metrics detect, traces localize, logs explain.** Use them in that order.
- **Correlation IDs must be propagated, not regenerated**, or traces fragment.
- **Tail-based sampling** keeps the slow and failed traces that head-based sampling throws away.
- **Alert on symptoms (golden signals), not causes** like CPU.
- **Start from the user-reported symptom**, never from a favorite dashboard.
