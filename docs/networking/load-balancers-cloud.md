---
title: "Cloud Load Balancers: NLB, ALB, and Multi-Cloud"
description: "AWS NLB/ALB/ELB, GCP Load Balancer, Azure Load Balancer. When to use each, performance trade-offs, and why they're not all the same."
prerequisites:
  - Load Balancing basics
  - Networking concepts
---

# Cloud Load Balancers: NLB, ALB, and Multi-Cloud

**Prerequisites:** [Load Balancing](load-balancing.md), [Proxies & Ingress](proxies-ingress.md)

[← Networking Overview](index.md)

---

## Why This Exists

You have 1M QPS. You deploy behind AWS ALB. It works for a day, then starts dropping requests. Why? You hit ALB's throughput limit, not because the code is slow, but because the load balancer itself became the bottleneck.

This page teaches the layer, throughput, and cost differences so you pick the right load balancer for your use case — not the one Marketing says is "simpler."

---

## The OSI Stack Matters

| Layer | Name | Proxy | AWS | GCP | Azure |
|-------|------|-------|-----|-----|-------|
| **L3/L4** | Transport (TCP/UDP) | IPVS, HAProxy | **NLB** | TCP/UDP LB | Basic LB |
| **L7** | Application (HTTP/HTTPS) | nginx, Envoy | **ALB** | HTTP(S) LB | Application Gateway |
| **L4 Ultra** | Extreme throughput | Maglev | — | **Cloud Load Balancer** (internal) | — |

### Layer 4 (NLB)

**What it sees:** TCP/UDP packets, source/dest IP, port, seq numbers.

**What it can do:**
- Route by port number
- Route by IP protocol
- Very fast (millions of packets/sec)
- Cannot read HTTP headers (doesn't know what `/api` is)
- Cannot cache responses

**Use case:** Databases, gaming servers, extreme throughput, non-HTTP protocols.

```
Request: TCP packet to 203.0.113.1:443
NLB: "Port 443? Route to backend pool 1"
(NLB doesn't care if it's HTTPS or SSL or something else)
```

### Layer 7 (ALB)

**What it sees:** Full HTTP request (headers, body, path, query string).

**What it can do:**
- Route by HTTP path (`/api` → api-servers, `/static` → cdn)
- Route by hostname (`api.example.com` → api-servers, `web.example.com` → web-servers)
- Route by HTTP method (POST → api-servers, GET → cache)
- Route by HTTP header values
- Cache responses
- Slower than L4 (must parse HTTP)
- Suitable for 10k–100k RPS per instance

**Use case:** Microservices, REST APIs, websites, anything HTTP.

```
Request: GET /api/users HTTP/1.1
ALB: "Path is /api? Route to api-servers"
```

---

## AWS Load Balancers

### AWS Classic LB (ELB) — Don't Use

Old (2009). Supports L4 and basic L7. Deprecated in favor of ALB/NLB.

### AWS Network Load Balancer (NLB)

**For:** Ultra-high throughput, low latency, non-HTTP protocols.

**Throughput:** Millions of requests per second.  
**Latency:** ~100µs (microseconds).  
**Cost:** $0.006 per LCU-hour + $0.006 per GB processed.

**Capabilities:**
- L4 routing (TCP, UDP, TLS)
- Source IP affinity (sticky sessions via IP hash)
- Connection draining (gradual shutdown)
- Cross-zone load balancing (automatic, slight latency cost)

**When to use:**
- Gaming servers (UDP, extreme latency-sensitive)
- Databases (TCP, high concurrency)
- IoT endpoints (MQTT, custom protocols)
- Extremely high throughput (>100k RPS) where ALB becomes bottleneck

**When NOT to use:**
- HTTP APIs (use ALB instead, cheaper and simpler)
- Request-based routing (cannot read HTTP headers)

**Example: Databases behind NLB**
```
NLB (L4 routing)
├─ Backend 1: postgres-1:5432 (primary)
├─ Backend 2: postgres-2:5432 (replica)
└─ Backend 3: postgres-3:5432 (replica)

Client: TCP connection to NLB:5432
NLB: Hash(client_ip) % 3 → routes to one backend consistently
```

### AWS Application Load Balancer (ALB)

**For:** HTTP/HTTPS, REST APIs, microservices, websites.

**Throughput:** 10k–100k RPS (depending on request size).  
**Latency:** ~10–20ms.  
**Cost:** $0.0225 per LCU-hour + $0.006 per GB processed.

**Capabilities:**
- L7 routing (HTTP methods, paths, hostnames, headers)
- Host-based routing (`api.example.com` → api-servers)
- Path-based routing (`/api/v1/*` → api-servers, `/static/*` → cache)
- Query string routing
- HTTP header routing
- Request prioritization
- Cookie-based sticky sessions

**When to use:**
- REST APIs (99% of microservices use this)
- Multiple services behind one load balancer
- Request-based routing logic
- HTTP caching

**When NOT to use:**
- Extreme throughput (>100k RPS) — use NLB
- Non-HTTP protocols (databases, gaming) — use NLB
- Extreme latency sensitivity (ALB adds ~10ms) — use NLB

**Example: Microservices behind ALB**
```
ALB
├─ Rule: api.shop.com/api → api-service:8080
├─ Rule: api.shop.com/auth → auth-service:8080
├─ Rule: web.shop.com → web-service:3000
├─ Rule: cdn.shop.com → cdn-service:8080
└─ Default → 404

Client: GET https://api.shop.com/api/users
ALB: "Host is api.shop.com, path is /api → api-service"
ALB: "Route to api-service:8080"
```

### AWS Gateway Load Balancer (GWLB)

**For:** Third-party appliances (firewalls, proxies, intrusion detection).

**How it works:** Transparently inserts appliances into the traffic path without changing routing.

```
Client → GWLB → [Appliance 1, 2, 3] → Backend

Appliance can inspect/modify traffic (firewall rules, logging).
```

---

## GCP Load Balancers

### GCP Cloud Load Balancer (Internal)

**For:** L4 ultra-high throughput (Maglev algorithm).

**Throughput:** Millions of packets/sec (internal).  
**Latency:** ~1µs (sub-millisecond).  
**Cost:** $0.02 per hour + $0.01 per GB.

**Why it's fast:** Maglev algorithm (consistent hashing) distributes traffic across load balancer instances.

### GCP Cloud Load Balancer (External, L7)

**For:** Global HTTPS load balancing.

**Throughput:** 1M+ RPS (auto-scales).  
**Latency:** Depends on geography (traffic goes to nearest edge).  
**Cost:** $0.025 per hour + $0.02 per million requests.

**Capabilities:**
- L7 HTTP(S) routing
- Geographic routing (route to nearest data center)
- URL path routing
- Request-rate based autoscaling
- Global load balancing (routes across regions)

**Comparison with AWS:**

| Feature | AWS ALB | GCP Cloud LB |
|---------|---------|---|
| **Geographic routing** | Regional only | Global (automatic) |
| **Autoscaling** | Per-target group | Built-in, unlimited |
| **Cost model** | Per-LCU (complex) | Per-request (simple) |
| **SSL/TLS termination** | Yes | Yes (at edge) |
| **URL path routing** | Yes | Yes |

---

## Azure Load Balancer

### Azure Basic LB

**For:** Simple internal load balancing (similar to AWS NLB but L4 only).

**Throughput:** 1M–5M flows.  
**Latency:** Low (L4).  
**Cost:** $0.025 per hour.

**Capabilities:**
- L4 TCP/UDP routing
- Port forwarding
- Outbound NAT rules

### Azure Application Gateway

**For:** L7 HTTP(S) load balancing (similar to AWS ALB).

**Throughput:** 10k–100k RPS.  
**Latency:** ~20ms.  
**Cost:** $0.01 per hour + $0.009 per GB.

**Capabilities:**
- L7 HTTP routing
- WAF (Web Application Firewall)
- SSL/TLS termination
- URL-based routing
- Host-based routing
- Cookie-based sessions

### Azure Front Door

**For:** Global CDN + load balancing (similar to GCP Cloud LB).

**Throughput:** Unlimited.  
**Latency:** Geographic (routes to nearest edge).  
**Cost:** $0.01 per hour + $0.06 per million requests.

---

## Comparison Table: When to Use What

| Requirement | AWS | GCP | Azure |
|---|---|---|---|
| **Ultra-high throughput (>1M pps)** | NLB | Cloud LB (internal) | — |
| **REST APIs, microservices** | ALB | Cloud LB (external) | App Gateway |
| **Gaming, databases** | NLB | — | Basic LB |
| **Global load balancing** | CloudFront or Route53 | Cloud LB (native) | Front Door |
| **Cost-sensitive, request-based** | ALB | Cloud LB | App Gateway |
| **WAF needed** | ALB + ModSecurity | Cloud Armor | App Gateway + WAF |

---

## Real-World Pitfalls

### Pitfall 1: Picking NLB When ALB Suffices

**Wrong:** Microservices behind NLB because "NLB is faster."

Problem: You lose HTTP routing. Every service needs its own NLB = expensive. You pay for ultra-high throughput you don't use.

**Right:** Use ALB for microservices. If p99 latency is a problem, measure it. ALB adds ~10ms; if your SLO is 100ms, it's fine.

### Pitfall 2: Hitting ALB Throughput Limit

**Scenario:** 500k RPS, 1KB requests, behind one ALB.

ALB can handle this (capacity is in LCUs, not request count). But if you misconfigure and the ALB becomes a bottleneck, your SLO breaks before you realize it.

**Fix:** Monitor ALB metrics (ProcessedBytes, TargetCount, UnHealthyHostCount). Use multiple ALBs or NLB if you outgrow ALB.

### Pitfall 3: Cookie-Based Sticky Sessions Breaking

```
Request 1: User logs in, ALB routes to server-1
         Server-1 sets AWSALB cookie
Request 2: User makes another request, ALB sees AWSALB cookie
         Routes to server-1 (sticky)

Server-1 crashes.
Request 3: User makes request, ALB tries to route to server-1 (dead)
         If ALB can't reach server-1 after N seconds, routes to another server
         User sees: "You've been logged out" (because new server doesn't have their session)
```

**Fix:** Don't rely on sticky sessions for sessions. Use a session store (Redis) instead.

### Pitfall 4: Cross-Zone Load Balancing Cost

```
ALB in us-east-1a sends traffic to backends in us-east-1b
Cost: $0.006 per GB (in addition to normal LCU cost)

If you have 1 TB/day = $6/day = $180/month extra.
```

**Fix:** Place backends in the same AZ as the ALB (for cost). Or accept the cost if you need HA across AZs.

---

## Cost Comparison: Real Numbers

### Scenario: 100k RPS, 1KB average request

**AWS ALB:**
- LCU: ~$0.0225/hour × 730 hours = $16.4/month
- Data processed: 100k RPS × 1KB × 86400s/day × 30 days = 260 GB/day
  = $0.006/GB × 260 GB/month = $1.56/month
- **Total: ~$18/month**

**AWS NLB:**
- LCU: ~$0.006/hour × 730 hours = $4.4/month
- Data: $0.006/GB × 260 GB/month = $1.56/month
- **Total: ~$6/month**

**GCP Cloud LB (external):**
- Fixed: $0.025/hour × 730 = $18.3/month
- Requests: 100k RPS × 86400s × 30 days = 2.592B requests
  = $0.02/M × 2592 = $51.8/month
- **Total: ~$70/month**

**Conclusion:** For this scenario, AWS NLB is cheapest (if throughput is the need). GCP is expensive for request-heavy workloads.

---

## Interview Questions

=== "Foundation"
    **Q: You have a REST API backend. Should you use NLB or ALB?**
    
    "ALB, because it can read HTTP headers and route by path/hostname. NLB can't inspect HTTP, so you'd need one NLB per service. ALB is designed for this use case and will be cheaper."

=== "Senior"
    **Q: Your ALB is dropping requests at 100k RPS. How do you fix it?**
    
    "First, confirm ALB is actually the bottleneck (not the backends). Check ALB metrics: ProcessedBytes, ActiveConnectionCount, TargetCount. If ALB is saturated, you have two options: (1) Switch to NLB if the workload allows it, or (2) Use multiple ALBs and route traffic across them via Route53 or Global Accelerator. I'd also check if you're using inefficient routing (e.g., evaluating thousands of rules per request). Simplify the rule set if possible."

=== "Staff"
    **Q: Design a global load balancing system for a SaaS app that spans AWS and GCP.**
    
    "I'd use geographic load balancing at the DNS layer: Route53 (AWS) or Cloud DNS (GCP) with latency-based routing. Each region has ALB/Cloud LB pointing to local backends. Traffic automatically routes to the nearest region. For failover, I'd implement active-active (both regions serve traffic) and use health checks to detect region failure. Cost: Route53 is cheap (~$0.50/M queries); GCP Cloud LB is more expensive but handles failover automatically. I'd lean towards AWS Route53 + regional ALBs for cost efficiency, unless GCP's global load balancing provides clear value (e.g., automatic edge caching)."

---

## Key Takeaways

!!! success "Remember"
    1. **L4 LB (NLB)** = ultra-fast, can't read HTTP, route by IP/port only
    2. **L7 LB (ALB)** = can read HTTP headers, route by path/hostname, slower but sufficient for most APIs
    3. **NLB for:** Gaming, databases, UDP, extreme throughput (>100k RPS where latency is critical)
    4. **ALB for:** REST APIs, microservices, websites, request-based routing
    5. **AWS ALB cheaper per request than GCP Cloud LB** for typical workloads
    6. **Cross-zone load balancing costs** (data transfer between AZs)
    7. **Sticky sessions break when backends die** — use session store instead
    8. **Global load balancing:** GCP built-in, AWS requires Route53 + regional LBs

**Previous:** [Proxies & Ingress](proxies-ingress.md)
