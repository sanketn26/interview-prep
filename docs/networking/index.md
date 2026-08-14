---
title: Networking
description: The request path before your code: DNS, TCP, TLS, then the load balancer.
---

# Networking

The request path before your code: DNS, TCP, TLS, then the load balancer.

---

## Why This Exists

Before a single line of your code runs, a request has already spent most of its life elsewhere: resolving a name, opening a connection, negotiating encryption, and being routed by a load balancer.

This matters because **the slowest part of a fast request is usually setup, not work.** A handler that executes in 5 ms can sit behind 150 ms of DNS lookup, TCP handshake, and TLS negotiation. Optimizing the handler is then pointless — you are tuning 3% of the latency.

It also matters because these layers produce the confusing incidents. "The service is up and healthy, but 5% of users get connection errors" is never an application bug. It is a connection pool, a keepalive timeout, a stale DNS entry, or a load balancer health check — and if you have no model of this layer, you cannot debug it.

---

## Mental Model: What a Request Actually Costs

```
Cold request (nothing cached, nothing pooled)
─────────────────────────────────────────────
DNS lookup            ~20-120 ms   (cacheable — often 0)
TCP handshake          1 RTT       (~1 ms local, ~150 ms cross-continent)
TLS 1.3 handshake      1 RTT       (~1 ms local, ~150 ms cross-continent)
─────────────────────────────────
Setup subtotal:        2 RTT + DNS      ← paid BEFORE your code runs
Your handler           ~5 ms
```

Cross-continent, that setup is ~300 ms against a 5 ms handler. **Warm** — DNS cached, connection pooled and kept alive — setup drops to roughly zero and the same request takes 5 ms.

!!! tip "This is why connection pooling is not a micro-optimization"
    Reusing a connection eliminates 2 round trips per request. At 150 ms per RTT, pooling is a 60× improvement on the critical path — far larger than anything you will achieve inside the handler.

---

## The Three Things That Cause Real Incidents

**1. Connection pool exhaustion.** Your pool holds 100 connections. A downstream dependency slows from 10 ms to 2 s. Now each connection is held 200× longer, the pool drains, and requests queue for a connection that never frees. Your service reports itself healthy while every request times out. **The pool size and the downstream timeout are a single coupled decision** — this is [Little's Law](../foundations/math.md) in operational form:

```python
"""Little's Law applied to a connection pool: L = λ × W."""


def required_pool_size(arrival_rate_rps: float, latency_seconds: float,
                       headroom: float = 2.0) -> int:
    """Concurrency in flight = arrival rate × time each request holds a slot."""
    return int(arrival_rate_rps * latency_seconds * headroom)


if __name__ == "__main__":
    rps = 500
    for latency_ms in (10, 100, 2000):
        need = required_pool_size(rps, latency_ms / 1000)
        status = "OK" if need <= 100 else "POOL EXHAUSTED (configured: 100)"
        print(f"{rps} rps @ {latency_ms:>5} ms → need {need:>5} connections   {status}")
```

```
500 rps @    10 ms → need    10 connections   OK
500 rps @   100 ms → need   100 connections   OK
500 rps @  2000 ms → need  2000 connections   POOL EXHAUSTED (configured: 100)
```

Nothing about your traffic changed — only the downstream got slower — and a pool sized correctly for 100 ms is 20× too small at 2 s. This is why timeouts are mandatory: an unbounded timeout means an unbounded pool requirement.

**2. Stale DNS.** You failed over to a new IP; clients cached the old one for the TTL and keep hammering a dead host. DNS TTL is the floor on your failover time, and many clients ignore TTLs entirely.

**3. Health checks that lie.** A `/health` endpoint returning `200 OK` because the process is alive — while its database connection is dead — keeps a broken instance in rotation. A health check must verify the dependencies the service actually needs.

---

## Load Balancing: Layer 4 vs Layer 7

| | **L4 (transport)** | **L7 (application)** |
|---|---|---|
| Sees | IP + port | Full HTTP: path, headers, cookies |
| Can route on | Connection tuple | URL, host, header, user |
| Cost | Very low — packet forwarding | Higher — terminates and parses |
| Enables | Raw throughput | Path routing, retries, TLS termination, canaries |

L4 is a traffic cop; L7 is a receptionist that reads your request and decides where it belongs. Modern API gateways are L7 because everything interesting — routing `/api/v2` to a new service, sticky sessions, per-route rate limits — requires reading the request.

The algorithm matters less than people think, with one exception: **least-connections beats round-robin whenever request costs vary**, because round-robin cheerfully sends request #101 to the instance already stuck on ten slow queries.

---

## Pages in This Section

| Page | Status |
|------|--------|
| [HTTP & TCP](http-tcp.md) | Complete + DNS/TCP sims |
| [Load Balancing](load-balancing.md) | Complete + visualizer |
| [Proxies, Ingress, and Egress](proxies-ingress.md) | **Complete** — Forward/reverse proxies, K8s Ingress, egress control, AAA, payment gateway case study |
| [Cloud Load Balancers](load-balancers-cloud.md) | **Complete** — AWS NLB/ALB/GWLB, GCP Cloud LB, Azure LB/AppGateway, cost comparison, pitfalls |
| [Modern Protocols & Service Mesh](modern-protocols-service-mesh.md) | **Complete** — HTTP/3 (QUIC), gRPC, Istio, Linkerd, mTLS, zero-trust, eBPF observability |
| [gRPC vs HTTP in K8s & Load Balancing](grpc-http-k8s-load-balancing.md) | **Complete** — Connection models, service discovery, hotspot problem, DNS caching, skewed traffic, failure modes, solutions |

[HTTP & TCP](http-tcp.md) walks the full request path with DNS-resolution and TCP-lifecycle simulators, plus HTTP/1.1 vs 2 vs 3 and head-of-line blocking.

[Load Balancing](load-balancing.md) covers the algorithms with a visualizer where you can kill a backend and watch traffic redistribute.

[Proxies, Ingress, and Egress](proxies-ingress.md) explains forward proxies (client-side), reverse proxies (server-side), Kubernetes Ingress controllers, egress gateways, and AAA (authentication/authorization/accounting) at the proxy layer. Includes a payment API gateway case study.

[Cloud Load Balancers](load-balancers-cloud.md) deep-dives AWS NLB (L4, extreme throughput), ALB (L7, HTTP routing), and GWLB (appliances), plus GCP and Azure equivalents. Covers when to use each, cost comparison, and real-world pitfalls.

[Modern Protocols & Service Mesh](modern-protocols-service-mesh.md) covers latest developments in networking: HTTP/3 (QUIC) for mobile and packet-loss networks, gRPC for inter-service performance, Istio vs Linkerd service meshes with mTLS and distributed tracing, zero-trust networking (SPIFFE identity), BBR congestion control, and eBPF-based observability (Cilium/Hubble).

[gRPC vs HTTP in K8s & Load Balancing](grpc-http-k8s-load-balancing.md) is the deep-dive on production issues: HTTP/1.1 pools connections (distributed), HTTP/2 multiplexes one connection (hotspot), gRPC reuses connections (hotspot). K8s service discovery: DNS caching defeats load balancing. kube-proxy iptables/IPVS behavior. L4/L7 load balancer implications. Why traffic gets skewed (DNS round-robin + connection reuse). Failure modes (slow backend cascades, connection leaks). Solutions: service mesh (Istio/Linkerd), client-side load balancing, connection pooling. Interview-focused with real scenarios.

---

## Key Takeaways

- **Setup often dominates work.** 2 RTT + DNS is paid before your handler starts.
- **Connection pooling removes 2 RTT per request** — the highest-leverage networking change you can make.
- **Pool size = arrival rate × latency.** When a dependency slows down, your pool silently becomes too small.
- **Every remote call needs a timeout**, or your pool requirement is unbounded.
- **Health checks must check dependencies**, not just process liveness.
- **L7 buys routing intelligence; L4 buys raw speed.** Use least-connections when request costs vary.
