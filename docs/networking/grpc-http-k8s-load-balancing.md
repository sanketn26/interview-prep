---
title: "gRPC vs HTTP vs HTTP/2 — K8s, Load Balancing, Traffic Distribution"
description: "Connection models, K8s service discovery implications, L4/L7 load balancer behavior, why traffic gets skewed, and production failure modes."
prerequisites:
  - HTTP & TCP basics
  - Kubernetes networking concepts
  - Load balancing fundamentals
---

# gRPC vs HTTP vs HTTP/2 in Production

**Prerequisites:** [HTTP & TCP](http-tcp.md), [Load Balancing](load-balancing.md), [Cloud Load Balancers](load-balancers-cloud.md)

[← Networking Overview](index.md)

---

## Why This Exists

You've chosen your protocol (HTTP, gRPC, HTTP/2). Now you deploy it. In development, everything works. In production, 80% of traffic goes to one backend and that backend is now the bottleneck. This page explains why it happens and how to fix it.

The root cause is almost always **connection pooling + load balancer + service discovery** interacting in ways nobody expected.

---

## Part 1: Connection Model Fundamentals

### HTTP/1.1

```
Model: One request per connection (or connection pooling)

Timeline:
Client connection 1:  [Request 1] ──→ [Response 1] ──→ CLOSE or IDLE
Client connection 2:  [Request 2] ──→ [Response 2] ──→ CLOSE or IDLE
Client connection 3:  [Request 3] ──→ [Response 3] ──→ CLOSE or IDLE

With connection pooling (realistic):
Client pool (size=10):
  Conn 1: [Req A] ──→ [Resp A] ──→ [Req D] ──→ [Resp D]  (backend-1)
  Conn 2: [Req B] ──→ [Resp B] ──→ [Req E] ──→ [Resp E]  (backend-2)
  Conn 3: [Req C] ──→ [Resp C] ──→ [Req F] ──→ [Resp F]  (backend-3)
  Conn 4-10: IDLE (waiting for work)

Distribution: If each connection is round-robin'd to a backend,
              then Req A,D → backend-1, Req B,E → backend-2, etc.
              Traffic distributed across backends.
```

**Key properties:**
- ✓ Traffic distributed (pooling across N backends)
- ✓ Connection setup cost amortized (connection reused)
- ✗ Pool size must match concurrency (if 1000 concurrent requests, need pool size ≥ 1000)
- ✗ Head-of-line blocking within connection (one slow request stalls others on same connection)

### HTTP/2

```
Model: One connection, many concurrent streams

Timeline:
Single client connection:
  ├─ Stream 1: [Request A] ──→ [Response A]
  ├─ Stream 2: [Request B] ──→ [Response B]  (concurrent!)
  ├─ Stream 3: [Request C] ──→ [Response C]
  └─ Stream N: [Request N] ──→ [Response N]
  
All streams multiplexed on one TCP connection.

Distribution: All streams on one connection → routed to ONE backend
              → That backend handles all traffic from this client
              → UNEVEN DISTRIBUTION (hotspot)
```

**Key properties:**
- ✓ Connection setup cost minimal (one connection carries 1000s of streams)
- ✓ No head-of-line blocking (lost stream doesn't stall others)
- ✗ All traffic on one connection → one backend → hotspot
- ✗ To distribute traffic, need multiple HTTP/2 connections

### gRPC

gRPC is built on HTTP/2 (or HTTP/1.1 with connection pooling). Inherits connection model from underlying protocol.

```
gRPC over HTTP/2:
  Client creates ONE connection (or small pool)
  Each RPC call = new stream on that connection
  → All calls to same backend → hotspot

Example (Python gRPC):
import grpc

# One channel per target
channel = grpc.aio.secure_channel("payment:50051", ...)
stub = PaymentServiceStub(channel)

for i in range(1000):
    response = await stub.Charge(ChargeRequest(...))
    # All 1000 calls on ONE connection to ONE backend
```

**Why gRPC has this problem:**
- Designed for efficient inter-service communication (one connection, amortize setup)
- Assumed client-side load balancing (create multiple channels)
- In Kubernetes, often deployed without explicit pooling

---

## Part 2: Load Balancing + Service Discovery Interaction

### Non-Kubernetes (Direct Connection)

```
Client code:
  hosts = ["backend-1:50051", "backend-2:50051", "backend-3:50051"]
  for host in hosts:
    channel = grpc.Channel(host)
    channels.append(channel)  # Pool of channels
  
  for i in range(1000):
    channel = channels[i % len(channels)]  # Round-robin
    response = stub.Call(channel)

Result: Traffic distributed round-robin across backends
        Each backend gets ~333 requests
```

**This works well but requires:**
- Application code to manage channel pool
- Discovery: hardcoded list or config management
- Failover: manual handling (try next host)

### Kubernetes with ClusterIP Service + Direct Connection

```
Service: payment
  Endpoints: 10.0.1.5:50051 (pod-1)
            10.0.1.6:50051 (pod-2)
            10.0.1.7:50051 (pod-3)

DNS resolution (payment:50051 → 10.0.1.5):
  Every 30 seconds (default TTL)
  Returns ONE A record (round-robin per query)
  
Query 1: payment → 10.0.1.5 → Client creates connection to 10.0.1.5
Query 2: payment → 10.0.1.6 → (but connection to 10.0.1.5 already cached)
Query 3: payment → 10.0.1.7 → (no new connection)

Result: 100% of traffic on 10.0.1.5 (the first resolved IP)
        Hotspot on pod-1
```

**Why this happens:**
- DNS client-side caching (JVM caches indefinitely by default)
- gRPC connection reuse (creates one channel, reuses forever)
- No explicit load balancing

### Kubernetes with Service Mesh (Envoy Sidecar)

```
Client pod:
  ├─ Application container
  └─ Envoy sidecar (intercepts all traffic)
     └─ Knows about all endpoints (via control plane)
     └─ Load-balances across endpoints
     └─ Health checks failing endpoints
     └─ Retries on failure

Traffic flow:
  App → localhost:50051 (local Envoy)
     → Envoy round-robins to backend pod Envoys
     → 10.0.1.5, 10.0.1.6, 10.0.1.7 equally
     
Result: Even distribution
        Each backend gets ~333 requests
```

**This works because:**
- Envoy has upstream list (updated dynamically)
- Envoy round-robins per request (or per connection, configurable)
- Health checks remove failing endpoints
- Retries on failure

### Kubernetes with kube-proxy (iptables mode)

```
Service: payment (ClusterIP 10.0.0.10)

iptables rules:
  -A KUBE-SERVICES -d 10.0.0.10/32 -p tcp -m tcp --dport 50051
    -j KUBE-SVC-XYZ123

  -A KUBE-SVC-XYZ123
    -m statistic --mode random --probability 0.33
      -j KUBE-SEP-POD1
    -m statistic --mode random --probability 0.50
      -j KUBE-SEP-POD2
    -j KUBE-SEP-POD3

  -A KUBE-SEP-POD1 -j DNAT --to-destination 10.0.1.5:50051
  -A KUBE-SEP-POD2 -j DNAT --to-destination 10.0.1.6:50051
  -A KUBE-SEP-POD3 -j DNAT --to-destination 10.0.1.7:50051
```

**Behavior:**
- Per-packet random selection (each packet could go to different backend)
- BUT: For TCP, NAT is connection-based (SYN packet determines backend)
- Once connection established, all packets on that connection → same backend

**Result:**
- First packet (SYN) → random backend
- Connection lifetime: all packets → same backend
- But new connections → different backends (probabilistic)
- Over time: roughly even distribution (but with variance)

**Problem with gRPC:**
```
gRPC client creates 1 channel (1 TCP connection)
That connection established to random backend at SYN time
All 1000 gRPC calls on that connection → same backend
Result: UNEVEN if client created connection early (high traffic on one backend)
        EVEN only if connections are short-lived (unlikely for gRPC)
```

### Kubernetes with kube-proxy (IPVS mode)

```
IPVS (IP Virtual Server):
  More intelligent than iptables
  Per-connection or per-packet load balancing available
  Sticky session support
  
Configuration:
  ipvs.k8s.io/lb-algorithm: rr  (round-robin, per-connection)
                           wrr  (weighted round-robin)
                           lc   (least connections)
                           sh   (source hash)
```

**Behavior with gRPC:**
- `rr` (round-robin): Round-robin per new connection → even if connections are created round-robin
- `lc` (least connections): Route to backend with fewest active connections → handles long-lived connections better
- `sh` (source hash): Same source IP always goes to same backend → bad for gRPC (one client = one backend)

**Result:** `lc` is better for gRPC (adapts to long-lived connections)

---

## Part 3: Why Traffic Gets Skewed (The Hotspot Problem)

### Scenario: gRPC with DNS + Connection Pooling

```
Setup:
  3 backend pods
  10 client pods
  Each client creates 1 gRPC channel (1 TCP connection)
  
Expected: 10 * N calls / 3 backends = 3.33N calls per backend
Actual: 9 * N calls to backend-1, N/2 calls to backend-2, N/2 calls to backend-3

Why:
1. DNS returns A records in round-robin (per-query):
   Client-1 query: payment → 10.0.1.5 (backend-1) → connects
   Client-2 query: payment → 10.0.1.6 (backend-2) → connects
   Client-3 query: payment → 10.0.1.7 (backend-3) → connects
   Client-4 query: payment → 10.0.1.5 (backend-1) → connects
   ...
   Client-9 query: payment → 10.0.1.5 (backend-1) → connects (3rd connection)
   Client-10 query: payment → 10.0.1.6 (backend-2) → connects

2. Result: Backend-1 has connections from clients 1,4,7,10 (but 9 clients map to it)
   Wait, let me recalculate...
   
Actually, DNS round-robin per query:
   Query 1 → pod-1
   Query 2 → pod-2
   Query 3 → pod-3
   Query 4 → pod-1
   Query 5 → pod-2
   ...
   
10 clients:
   Clients 1,4,7,10 → pod-1 (4 clients)
   Clients 2,5,8 → pod-2 (3 clients)
   Clients 3,6,9 → pod-3 (3 clients)

If each client sends 1000 calls:
   pod-1: 4000 calls
   pod-2: 3000 calls
   pod-3: 3000 calls
   
Unevenness: 4000/3000 = 1.33x imbalance (minor)

But with more variance (if some clients send faster):
   pod-1 might get 4000, pod-2 2500, pod-3 1500
   Imbalance: 4000/1500 = 2.67x
```

### Real Hotspot Scenario: Client + Backend Affinity

```
Setup:
  1 client pod (makes many requests)
  3 backend pods
  Client uses single gRPC channel (1 connection)

Timeline:
1. Client pod starts
2. DNS query for payment → resolves to pod-1 (random selection)
3. Client creates single channel → connects to pod-1:50051
4. Client sends 100k requests → all on connection to pod-1

Result:
   pod-1: 100k requests (100%)
   pod-2: 0 requests (0%)
   pod-3: 0 requests (0%)

Why:
   - gRPC connection pooling (single channel)
   - DNS caching (channel reused)
   - No failover (pod-1 responsive, so connection stays)
```

### Multiple Clients, Bursty Traffic

```
Setup:
  10 clients, each makes requests
  3 backends
  
Scenario 1 (even clients):
  Each client distributed to backends (DNS round-robin)
  Each client makes steady requests
  → Even distribution (if load per client is balanced)

Scenario 2 (bursty traffic):
  Client A starts (connects to backend-1)
  Client B starts (connects to backend-2)
  Client C starts (connects to backend-3)
  Clients D-J start (connect to backends 1-3)
  
  Traffic suddenly: All 10 clients make requests simultaneously
  Distributed across 3 backends (10/3 ≈ 3.33 clients per backend)
  
  BUT: If backend-1 is slower (GC pause, CPU spike):
    Requests queue up on backend-1
    Latency increases
    Clients retransmit
    More requests pile up
    Cascading failure

Result: Backend-1 becomes hotspot due to performance variance
```

---

## Part 4: K8s-Specific Issues and Solutions

### Problem 1: Java DNS Caching (Eternal TTL)

```java
// Java networking caches DNS infinitely by default
InetAddress.getByName("payment");  // Caches result forever

// Fix: Set TTL to 0 (disabled caching) or small value
java.security.Security.setProperty("networkaddress.cache.ttl", "10");

// Or: Use different resolver
new URL("http://payment:8080").openConnection();  // Uses resolver
```

**Impact:** Java client connects once, never reconnects → always same backend

### Problem 2: HTTP/2 Idle Connection Reuse

```go
// Go HTTP/2 client (http.Client with default transport)

client := &http.Client{
    Transport: &http.Transport{
        MaxIdleConns: 100,
        MaxIdleConnsPerHost: 100,  // ← Reuse connection to each host
        IdleConnTimeout: 90 * time.Second,
    },
}

// Each host (backend pod IP) gets ONE connection
// All requests to that IP reused on same connection
// If DNS resolves to one IP, all traffic on one connection
```

**Solution:**
```go
// For Kubernetes, create pool of connections to service IP
// OR use multiple hostnames and round-robin between them

// Option 1: Multiple backends, connect to each
hosts := []string{"backend-1", "backend-2", "backend-3"}
clients := make([]*http.Client, len(hosts))
for i, host := range hosts {
    clients[i] = &http.Client{...}
    clients[i].Get(fmt.Sprintf("http://%s:8080/api", host))
}

// Option 2: Service mesh handles this (Envoy)
// Don't worry about pooling, let Envoy do it
```

### Problem 3: Readiness Probe Affecting gRPC

```yaml
apiVersion: v1
kind: Pod
metadata:
  name: grpc-server
spec:
  containers:
    - name: grpc
      image: grpc-server:latest
      ports:
        - name: grpc
          containerPort: 50051
      livenessProbe:
        exec:
          command: ["/bin/grpc_health_probe", "-addr=:50051"]
        initialDelaySeconds: 10
        periodSeconds: 10
      readinessProbe:
        exec:
          command: ["/bin/grpc_health_probe", "-addr=:50051"]
        initialDelaySeconds: 5
        periodSeconds: 5
```

**Issue:** Health probe makes gRPC connection, takes up a slot in connection pool

**Better:** Use gRPC health check (protocol-native)

```protobuf
service Health {
  rpc Check(HealthCheckRequest) returns (HealthCheckResponse);
  rpc Watch(HealthCheckRequest) returns (stream HealthCheckResponse);
}
```

### Problem 4: Connection Pool Exhaustion

```
Setup:
  Backend service with gRPC connection pool
  Database query (20 ms latency)
  
Scenario:
1. 100 clients connect (100 connections to backend)
2. Each client makes 100 requests per second
3. Each request → database call (20 ms)
4. Backend goroutines: 1 per request = 100 * 100 = 10,000 goroutines
5. Each goroutine blocked on database call (20 ms) = 20ms wait

Normal case:
   Throughput: 100 * 1000 / 0.020 = 5,000,000 requests/sec (ideal)
   Actual: ~5,000 requests/sec (100 requests/sec/connection × 100 connections)

If connection limit is hit (OS default ~1024):
   New connections rejected (ECONNREFUSED)
   Clients see errors
   Retries overwhelm system
```

**Solution:**
```go
// Configure connection pool at load balancer
// AWS ALB: TargetGroup connection draining

// Or: Increase OS limits
// /etc/security/limits.conf
* soft nofile 65535
* hard nofile 65535

// Or: Limit connections per client (server-side)
maxConnectionsPerClient := 10
semaphore := make(chan struct{}, maxConnectionsPerClient)
```

---

## Part 5: HTTP/1.1 vs HTTP/2 vs gRPC — Comparison Table

| Aspect | HTTP/1.1 | HTTP/2 | gRPC |
|--------|----------|--------|------|
| **Connection model** | Pool of connections | One connection, many streams | One connection (HTTP/2) or pool (HTTP/1.1) |
| **Concurrent requests** | Limited by pool size | Unlimited (streams) | Depends on underlying protocol |
| **Default distribution** | Even (if pool round-robin'd) | Hotspot (all traffic on one connection) | Hotspot (gRPC reuses connection) |
| **Head-of-line blocking** | Yes (per connection) | No (per stream) | No (per stream) |
| **Latency per request** | 1-5 ms (pool setup amortized) | 0.5-1 ms (stream overhead) | 0.5-1 ms (stream overhead) |
| **Total connections at scale** | Many (pool size × clients) | Few (1 per client) | Few (1 per client) |
| **Complexity (application)** | Simple (standard) | Medium (need multiplexing library) | Medium (need gRPC library) |
| **Complexity (operations)** | Simple | Medium (HTTP/2 specific tuning) | High (gRPC + connection pooling + LB) |
| **K8s friendliness** | Good (simple discovery) | Medium (needs smart LB/SM) | Medium (needs SM or client-side LB) |

---

## Part 6: Production Failure Modes and Recovery

### Failure Mode 1: Slow Backend Cascades Through gRPC

```
Setup:
  10 clients, 1 backend connection each (gRPC)
  Backend A: handling all 10 clients
  Backend B, C: idle

Failure:
  Backend A: GC pause (500 ms)
  → All 10 clients' requests timeout or queue
  → Clients retry
  → More requests pile up
  → Backend A CPU spikes
  → Cascading failure

Recovery depends on:
  ✓ Timeout on client (requests fail fast, retry to different backend)
  ✗ No timeout (requests wait, no retry, cascade)
  
Better: Multiple backend connections per client
        If one connection slow, other connections still work
```

### Failure Mode 2: Connection Leak + Gradual Exhaustion

```
Setup:
  Client makes N requests per day
  Each request creates gRPC channel (connection)
  Channels never closed

Day 1: 1000 connections open
Day 2: 2000 connections open
Day 3: 3000 connections open
...
Day 10: 10,000 connections open → OS limit reached → ECONNREFUSED

Production impact:
  Gradual degradation
  No obvious failure
  Only noticed after weeks
```

**Root cause:** Client-side connection leak

**Fix:**
```go
// Ensure channels are closed
defer channel.Close()

// Or use context cancellation
ctx, cancel := context.WithCancel(context.Background())
defer cancel()

// Client detects channel close and reconnects
```

### Failure Mode 3: DNS TTL Expiry + Stale Backend

```
Setup:
  Backend pod created at 9:00 AM (IP 10.0.1.5)
  DNS TTL: 30 seconds
  Client cached DNS result at 9:00:01 AM
  
9:00:31 AM:
  Backend pod killed (IP 10.0.1.5 no longer exists)
  New pod created (IP 10.0.1.99)
  Service updated to point to new pod
  
Client still holds connection to 10.0.1.5 (stale)
Requests timeout (connection reset)
After timeout, client retries
DNS query now returns 10.0.1.99
New connection to new pod
Requests succeed

Duration of outage: Request timeout (default 30s) before retry
```

**Better:** Use short DNS TTL + service mesh
- Service mesh: Envoy continuously probes endpoints, removes dead ones instantly
- DNS: Lower TTL (5-10s) so stale entries expire faster

---

## Part 7: Solutions and Best Practices

### Solution 1: Service Mesh (Istio/Linkerd)

```yaml
# Linkerd: automatic load balancing across connections

apiVersion: v1
kind: Service
metadata:
  name: payment
spec:
  selector:
    app: payment
  ports:
    - port: 50051

# Envoy sidecar handles:
#   - Service discovery (watches endpoints)
#   - Load balancing (round-robin across endpoints)
#   - Health checks (removes failing endpoints)
#   - Retries (automatic)
#   - Timeout (automatic)
#
# Client connects to localhost:50051 (local Envoy)
# Envoy round-robins to backend pods
# Result: Even distribution, automatic failover
```

**Pros:**
- Automatic load balancing
- No application code changes
- Observability (Prometheus metrics)
- Retries and timeouts centralized

**Cons:**
- Adds sidecar memory overhead (50-100MB per pod)
- Adds latency (1-2ms per hop)
- Operational complexity

### Solution 2: Client-Side Load Balancing (gRPC LB Policy)

```go
// gRPC with built-in load balancer

import "google.golang.org/grpc"
import "google.golang.org/grpc/balancer/roundrobin"

// Explicit round-robin balancer
conn, _ := grpc.Dial(
    "payment:50051",
    grpc.WithDefaultCallOptions(...),
    grpc.WithDefaultServiceConfig(`{
        "loadBalancingConfig": [{"round_robin":{}}]
    }`),
)

// gRPC now:
//   Resolves "payment" DNS to multiple addresses
//   Creates connection to EACH address (not just first)
//   Round-robins requests across connections
//
// Result: Even distribution
```

**Pros:**
- No service mesh overhead
- Application controls load balancing
- Works without Kubernetes

**Cons:**
- Requires gRPC client library support
- Application must manage balancer
- No automatic failover (unless client detects)

### Solution 3: Multiple Backends + External LB

```
Setup:
  AWS ALB with target group
  Health checks per backend
  
ALB routing:
  Client connection → ALB
  ALB picks backend round-robin (per new connection)
  Connection pinned to backend for lifetime
  
Result: Even distribution (if clients create connections uniformly)
        Automatic failover (unhealthy backend removed)
```

**Pros:**
- Transparent to application
- Automatic failover

**Cons:**
- External LB cost
- L7 awareness required (HTTP/2)
- Not available for on-prem

### Solution 4: Connection Pooling + Explicit Round-Robin

```python
# gRPC connection pool (manual)

class PaymentServicePool:
    def __init__(self, hosts, pool_size=10):
        self.channels = []
        for host in hosts:
            for _ in range(pool_size // len(hosts)):
                channel = grpc.aio.secure_channel(host, ...)
                self.channels.append(channel)
        self.index = 0
    
    async def call(self, method, request):
        channel = self.channels[self.index % len(self.channels)]
        self.index += 1
        stub = PaymentServiceStub(channel)
        return await method(stub, request)

# Result: Requests distributed round-robin across all channels
#         → All backends get even traffic
```

**Pros:**
- Simple, explicit control
- No external dependencies

**Cons:**
- Application must implement
- Manual failover handling
- Doesn't scale (hardcoded host list)

---

## Part 8: Tuning and Monitoring

### Tuning: Connection Keepalive

```go
// gRPC server
import "google.golang.org/grpc/keepalive"

server := grpc.NewServer(
    grpc.KeepaliveParams(keepalive.ServerParameters{
        Time:    10 * time.Second,  // Ping client every 10s
        Timeout: 1 * time.Second,   // Wait 1s for pong
    }),
)

// gRPC client
conn, _ := grpc.Dial(
    "payment:50051",
    grpc.WithKeepaliveParams(keepalive.ClientParameters{
        Time:                10 * time.Second,
        Timeout:             1 * time.Second,
        PermitWithoutStream: true,  // Ping even if no active calls
    }),
)
```

**Why:** Detects stale connections early, enables faster failover

### Tuning: Connection Pool Size

```
Formula: pool_size = target_rps × per_request_latency × headroom

Example:
  Target RPS: 10,000
  Per-request latency: 50 ms (depends on backend)
  Headroom: 2 (tolerance for latency variance)
  
  pool_size = 10,000 × 0.050 × 2 = 1,000 connections

Implementation:
  Option 1: Create 1,000 channels upfront
  Option 2: Create channels on-demand, up to 1,000
```

### Monitoring: Connection Distribution

```prometheus
# Measure traffic per backend

histogram_quantile(0.99,
  rate(grpc_server_handled_total[5m])
) by (backend)

# Expected: ~equal (within 10% variance)
# Bad: One backend 3-4x higher than others

# Check why:
#   1. DNS resolution (one backend favored in round-robin)
#   2. Connection reuse (client creating single connection)
#   3. Backend performance (one backend slower, connections queue)
```

### Monitoring: Connection Count

```prometheus
# Count active connections

grpc_server_started_total - grpc_server_handled_total
by (instance)

# Expected: stable (within 10% variance)
# Bad: Continuously increasing (connection leak)
# Bad: Sudden spikes (thundering herd / cascade)
```

---

## Interview Questions

=== "Foundation"
    **Q: You deploy a gRPC service in Kubernetes. Traffic is uneven: 80% to pod-1, 10% each to pod-2 and pod-3. Why?**
    
    "Most likely: DNS caching. Client resolved 'payment' to pod-1's IP, created a gRPC channel (connection) to that IP, and reuses it for all requests. Since gRPC multiplexes all calls on one connection, all traffic goes to pod-1. Fix: (1) Use service mesh (Envoy sidecar) to load-balance, (2) Create multiple gRPC channels and round-robin between them, (3) Use gRPC's built-in round-robin resolver (not all clients support it), or (4) Disable DNS caching (Java TTL=0)."
    
    **Q: What's the difference between HTTP/2 and HTTP/1.1 in terms of connection pooling?**
    
    "HTTP/1.1 creates a pool of connections (size N), each connection handles one request at a time, connections are reused. HTTP/2 creates one connection and multiplexes many concurrent requests as streams on that connection. Result: HTTP/1.1 needs larger pool (more memory, more TCP overhead) but distributes traffic across backends naturally. HTTP/2 uses minimal connections but all traffic on one connection goes to one backend (hotspot)."

=== "Senior"
    **Q: Design a gRPC client in Kubernetes that ensures even traffic distribution across backend pods.**
    
    "Use a service mesh (Istio/Linkerd) for transparent load balancing. Client connects to localhost:50051 (Envoy sidecar), which round-robins requests to backend pods. Envoy also handles health checks and retries. If SM is not available, implement client-side load balancing: (1) Use gRPC's built-in round-robin resolver (resolve 'payment:50051' to multiple IPs, create channel to each, round-robin calls), (2) Or manually create N channels to different backend IPs and round-robin between them. Key: Avoid single connection per client (causes hotspot)."
    
    **Q: Your Java service makes gRPC calls to a backend. Traffic shows 100% to one backend pod. How do you fix it?**
    
    "Three causes: (1) DNS caching (Java caches DNS infinitely by default), (2) gRPC connection reuse, (3) Single gRPC channel. Fixes: (1) Set `java.security.Security.setProperty("networkaddress.cache.ttl", "10")` to cache DNS for 10 seconds, (2) Create multiple gRPC channels (e.g., 10 channels), round-robin between them on each call, (3) Or use service mesh (no code change). Test: Monitor traffic per backend (Prometheus), confirm it's now balanced."

=== "Staff"
    **Q: You're running 1000 microservices in Kubernetes with gRPC inter-service communication. 5% of service pairs show 3-4x traffic imbalance. How do you solve this systematically?**
    
    "I'd implement a multi-layered approach: (1) **Service mesh (Istio/Linkerd)** for automatic load balancing (transparent, no app changes, but adds 50MB memory + 1-2ms latency per sidecar), (2) **Client-side gRPC load balancing** where service mesh is too heavy (use gRPC's round-robin resolver with DNS SRV records), (3) **Monitoring**: continuously track traffic distribution (Prometheus histograms), alert if imbalance > 20%, (4) **Capacity testing**: for known hotspots, test with multiple connections and confirm linear scaling, (5) **DNS tuning**: short TTLs (5-10s) to detect pod changes quickly. Phased rollout: (a) Instrument all services (count connections/requests per backend), (b) Deploy service mesh to critical path services first, (c) Monitor and extend. Cost: SM adds ~$10k/month infrastructure, but prevents cascading failures worth 10x+ that."

---

## Key Takeaways

!!! success "Remember"
    1. **HTTP/1.1 pools connections** (many connections, traffic distributed by pool), **HTTP/2 multiplexes on one connection** (all traffic on one connection = hotspot).
    2. **gRPC inherits HTTP/2 behavior:** one channel = one connection = one backend = hotspot. Fix: create multiple channels or use service mesh.
    3. **DNS caching + gRPC reuse = hotspot:** Client resolves DNS once, creates channel to that IP, reuses forever. Result: 100% traffic to one backend.
    4. **K8s service discovery**: ClusterIP service is DNS entry. DNS resolves to random backend per query (but client-side caching defeats this). Fix: service mesh or client-side LB.
    5. **kube-proxy iptables/IPVS:** Round-robins per new connection. With gRPC (long-lived connection), that's one backend for entire lifetime.
    6. **L4 LB (NLB):** Sees TCP/gRPC as opaque flows. Pins connection to backend → hotspot.
    7. **L7 LB (ALB):** Can see HTTP/2, but routing is complex. Still pins connection → hotspot unless explicitly configured.
    8. **Service mesh solves this:** Envoy sidecars load-balance across all backends, automatically. Cost: memory + latency.
    9. **Client-side load balancing:** Multiple connections, round-robin between them. No service mesh, but requires app changes.
    10. **Monitor constantly:** Track connection count and traffic per backend. Hotspots will appear; fix before they cascade.

---

**Previous:** [Modern Protocols & Service Mesh](modern-protocols-service-mesh.md)

