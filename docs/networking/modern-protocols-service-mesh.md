---
title: Modern Protocols & Service Mesh — HTTP/3, gRPC, Istio, and eBPF
description: HTTP/3 (QUIC), gRPC performance and use cases, service mesh internals (Istio/Linkerd), mTLS, zero-trust networking, and observability with eBPF.
prerequisites:
  - HTTP & TCP fundamentals
  - Load Balancing basics
  - Kubernetes familiarity
---

# Modern Protocols & Service Mesh

[← Networking Overview](index.md)

---

## Why This Exists

HTTP/1.1 shipped in 1997. HTTP/2 in 2015. HTTP/3 is shipping now (2024). gRPC is the modern inter-service protocol. Service meshes handle networking that was previously "just TCP" and invisible. Zero-trust means every network hop requires authentication and encryption.

This page is what changed in networking from 2020 to 2025, and what you need to know about operating systems at that scale.

---

## Part 1: HTTP/3 and QUIC — The Modern Transport

### The Problem HTTP/2 Doesn't Solve

```
HTTP/2 multiplexing over TCP:

Stream 1: [Request] ──→ [Response]
Stream 2: [Request] ──→ [Response]
Stream 3: [Request] ──→ [Response]

One TCP connection carries all streams.
All streams share one congestion window.

If one packet is lost:
  TCP waits for retransmission (1-10ms typical)
  ALL streams wait
  → Slow page (63% slow pages, tail amplification)
```

HTTP/3 replaces TCP with QUIC (a custom transport layer on UDP).

### QUIC: The Key Insight

```
TCP: Ordered byte stream
     Lost packet → entire stream stalled (HOL blocking)
     
QUIC: Multiplexed streams over UDP
      Lost packet in stream 1 → stream 1 stalls
      Streams 2, 3, 4 keep moving
      → No head-of-line blocking
```

**Architecture:**
```
HTTP/3 layer     (requests/responses, semantics)
    ↓
QUIC layer       (streams, congestion control, connection migration)
    ↓
UDP layer        (datagram transport)
    ↓
IP layer
```

### Performance Gains

| Metric | HTTP/2 over TCP | HTTP/3 over QUIC |
|--------|-----------------|------------------|
| **0-RTT resumption** | No (new connection = new handshake) | Yes (client caches key from prev session) |
| **Head-of-line blocking** | Yes (lost TCP packet stalls all streams) | No (each stream independent) |
| **Connection migration** | No (IP/port change = new connection) | Yes (client can switch networks; connection persists) |
| **Handshake latency** | TCP: 1 RTT + TLS: 1 RTT = 2 RTT | QUIC: 0 RTT (encrypted payload in first packet) |
| **Packet loss tolerance** | One lost packet = cascading retransmits | One lost packet affects only that stream |

### When HTTP/3 Matters

**Mobile networks (cellular):**
```
User on train, switches from LTE to WiFi.
HTTP/2: Connection dies → reconnect → new TLS handshake (1+ RTT)
HTTP/3: Connection persists → seamless handoff
```

**High packet loss networks:**
```
Scenario: WiFi with 1% packet loss
100 requests per page × 1% loss = 63% probability of at least one lost packet

HTTP/2: One loss → all streams pause → user waits
HTTP/3: One loss → only affected stream pauses → page loads
```

**Low latency is critical (< 100ms SLO):**
```
HTTP/2: 3-4 RTT (DNS, TCP, TLS, request/response)
QUIC: 1 RTT (TLS 0-RTT, embedded in first packet) 
Savings: 150-300ms → user-perceptible improvement
```

### Operational Gotchas

**1. NAT/firewall breaks UDP:** Many corporate firewalls drop UDP. QUIC works, but some clients fall back to HTTP/2.

**2. QUIC CPU cost:** QUIC offloading to NIC is still new. Brokers may see higher CPU usage.

**3. Client support:** Safari/Chrome full support (2024). Mobile clients lag. Fall-back to HTTP/2 is transparent.

**Implementation:**
```go
// Go HTTP/3 server (quic-go)
import "github.com/quic-go/quic-go/http3"

// Listen on QUIC
quicServer := &http3.Server{
    Addr:    ":443",
    Handler: mux,
}
go quicServer.ListenAndServe()

// TLS/1.3 required
// cert/key management same as HTTP/2
```

---

## Part 2: gRPC — Inter-Service Communication

### Why gRPC > REST for Internal Services

```
REST to fetch user details:
  GET /users/123
  Response: {"id": 123, "email": "alice@example.com", "name": "Alice", ...}
  
Serialization: JSON encoding/decoding on every call
Overhead: Text format, schema discovery (OpenAPI), per-endpoint versioning

gRPC to fetch user details:
  service UserService {
    rpc GetUser(UserID) returns (User);
  }
  
  // Wire format: Protocol Buffers (binary)
  // Same payload: ~200 bytes JSON vs ~50 bytes protobuf (4× smaller)
  // Schema codegen at compile time (no runtime reflection)
  // Single connection carries multiple concurrent calls (HTTP/2 multiplexing)
```

### gRPC Performance

| Metric | REST + JSON | gRPC + Protobuf |
|--------|-------------|-----------------|
| **Payload size** | 1000 bytes | 250 bytes |
| **Serialization time** | ~100 µs (encoding) + 100 µs (decoding) | ~10 µs (encoding) + 10 µs (decoding) |
| **Connections per server** | 1 per client (connection pooling) | 1 per client (shared HTTP/2) |
| **Max concurrent calls** | Pool size limited | Unlimited (HTTP/2 streams) |
| **Latency** | 5-10 ms typical | 1-2 ms typical |

**Real-world example (100 microservices calling each other):**

```
REST setup: Each call
  DNS (cached): 0
  TCP (pooled): 0
  TLS (pooled): 0
  HTTP overhead: ~50 bytes headers
  JSON serialization: 100 µs
  Network: 1 ms (local)
  Total: ~1.15 ms per call

gRPC setup: Each call
  DNS/TCP/TLS: 0 (reused)
  HTTP/2 framing: ~10 bytes overhead
  Protobuf serialization: 10 µs
  Network: 1 ms
  Total: ~1.01 ms per call

Per 1M calls/sec:
  REST: 150 ms overhead
  gRPC: 10 ms overhead
  Difference: 140 ms = cascading latency spike
```

### When to Use gRPC

✓ Internal service-to-service (your code controls both ends)  
✓ High throughput (>10k RPS per connection)  
✓ Latency-sensitive (<10ms p99)  
✓ Bidirectional streaming (gRPC native support)  
✓ Language diversity (protobuf code-gen for Go, Java, Python, Rust, etc.)

✗ Public APIs (clients expect REST, JSON)  
✗ Browser clients (browsers don't fully support gRPC-web)  
✗ Simple request/response (REST is adequate)

### gRPC Server and Client

```go
// Server
type UserServiceImpl struct{}

func (s *UserServiceImpl) GetUser(ctx context.Context, 
    req *pb.UserID) (*pb.User, error) {
    // Fetch user
    return &pb.User{
        Id:    req.Id,
        Name:  "Alice",
        Email: "alice@example.com",
    }, nil
}

func main() {
    lis, _ := net.Listen("tcp", ":50051")
    server := grpc.NewServer()
    pb.RegisterUserServiceServer(server, &UserServiceImpl{})
    server.Serve(lis)
}

// Client (connection pooling automatic)
conn, _ := grpc.Dial("userservice:50051", 
    grpc.WithTransportCredentials(creds))
client := pb.NewUserServiceClient(conn)

for i := 0; i < 1000; i++ {
    user, _ := client.GetUser(ctx, &pb.UserID{Id: int32(i)})
    // All 1000 calls multiplexed on single HTTP/2 connection
}
```

### gRPC Streaming

```go
// Server-side streaming (e.g., downloading a large file)
func (s *FileServiceImpl) Download(req *pb.FileID, 
    stream pb.FileService_DownloadServer) error {
    // Stream chunks to client
    for chunk := range readChunks(file) {
        stream.Send(&pb.FileChunk{Data: chunk})
    }
    return nil
}

// Bidirectional streaming (e.g., websocket-like)
func (s *ChatServiceImpl) Stream(stream pb.ChatService_StreamServer) error {
    for {
        msg, _ := stream.Recv()  // Receive from client
        // Process
        stream.Send(&pb.Message{})  // Send to client
    }
}
```

---

## Part 3: Service Mesh Internals — Istio and mTLS

### The Problem Service Mesh Solves

```
Microservices architecture (20 services):
  Order → Payment → Auth
  Order → Inventory → DB
  Order → Shipping → Logistics
  
Current state:
  - No encryption between services (plaintext)
  - No authentication (just IP-based)
  - Timeouts scattered across 20 services
  - Retries scattered across 20 services
  - Load balancing per service (20 different configs)
  - Observability: logging only
  
Desired state:
  - All service-to-service encrypted (mTLS)
  - Mutual authentication (service knows caller is legitimate)
  - Centralized policies (timeouts, retries, rate limiting)
  - Centralized load balancing and failover
  - Centralized observability (trace every call)
```

A **service mesh** moves all of this from application code to infrastructure (sidecar proxies).

### Architecture: Istio

```
┌─────────────────────────────────────────────────┐
│ Kubernetes Cluster                              │
├─────────────────────────────────────────────────┤
│                                                 │
│  Pod: order-service                             │
│  ├─ order container (your code)                │
│  └─ istio-proxy sidecar (Envoy)                │
│     └─ Intercepts all inbound/outbound TCP     │
│                                                 │
│  Pod: payment-service                           │
│  ├─ payment container                          │
│  └─ istio-proxy sidecar (Envoy)                │
│                                                 │
│  Control plane (istiod):                       │
│  ├─ Watches Kubernetes resources               │
│  ├─ Computes routing policies                  │
│  └─ Pushes config to all Envoy sidecars        │
│                                                 │
└─────────────────────────────────────────────────┘
```

**How traffic flows:**
```
1. order-container wants to call payment
2. order-container makes request to localhost:9080 (envoy)
3. Envoy sidecar intercepts:
   - Adds mTLS encryption
   - Validates payment service certificate
   - Applies retry policy (3x on 5xx)
   - Applies timeout (5s)
   - Selects backend using load balancing
   - Sends to payment-service:8080
4. payment-proxy (Envoy) receives, verifies mTLS
5. Forwards to payment-container:8080
6. Response flows back through both proxies
```

### mTLS in Istio

```bash
# Enable mTLS for entire namespace
apiVersion: security.istio.io/v1beta1
kind: PeerAuthentication
metadata:
  name: default
  namespace: production
spec:
  mtls:
    mode: STRICT  # Require mTLS for all connections

# Now:
# - Every service gets auto-generated certificate (from cert controller)
# - Every sidecar enforces mTLS on inbound
# - Every sidecar uses mTLS on outbound
# - Certificate rotation: automatic every 24 hours
```

**Certificate chain:**
```
CA (Istio built-in or external)
  └─ Intermediate CA
     └─ Service cert (order-service)
     └─ Service cert (payment-service)
     
Each service cert:
  - Issued by Istio
  - Valid for 24 hours
  - Auto-rotated before expiry
  - Subject: spiffe://cluster.local/ns/production/sa/order-service
     (SPIFFE = Secure Production Identity Framework)
```

### Istio VirtualService and DestinationRule

```yaml
# Define endpoints (backends)
apiVersion: v1
kind: Service
metadata:
  name: payment-service
spec:
  selector:
    app: payment
  ports:
    - port: 8080

# Istio: Load balancing policy
apiVersion: networking.istio.io/v1beta1
kind: DestinationRule
metadata:
  name: payment
spec:
  host: payment-service
  trafficPolicy:
    connectionPool:
      tcp:
        maxConnections: 100
      http:
        http1MaxPendingRequests: 50
        http2MaxRequests: 100
        maxRequestsPerConnection: 2
    loadBalancer:
      simple: LEAST_REQUEST  # Load balance by active connections
    outlierDetection:
      consecutive5xxErrors: 5
      interval: 30s
      baseEjectionTime: 30s  # Eject backend after 5 errors

# Route traffic with retry policy
apiVersion: networking.istio.io/v1beta1
kind: VirtualService
metadata:
  name: payment
spec:
  hosts:
    - payment-service
  http:
    - match:
        - uri:
            prefix: /api/v1
      route:
        - destination:
            host: payment-service
            port:
              number: 8080
      timeout: 5s
      retries:
        attempts: 3
        perTryTimeout: 1s
      fault:  # Chaos testing
        delay:
          percentage: 10  # 10% get 5s delay
          fixedDelay: 5s
```

### Istio Observability

```bash
# Kiali: Mesh visualization
#   Shows service topology
#   Shows traffic flow, error rates, latency
#   
# Jaeger: Distributed tracing
#   Envoy sidecar propagates trace context
#   Every hop (order → payment → auth) logged with latency
#   
# Prometheus: Metrics
#   Envoy exposes metrics per service pair
#   request_duration_seconds{source="order",dest="payment"}
#   request_errors_total{source="order",dest="payment",status="500"}
```

### Istio Overhead

✓ Benefits:
- mTLS everywhere (no app code changes)
- Centralized retry/timeout policy
- Circuit breaker without code
- Observability without instrumentation

✗ Costs:
- Sidecar memory: ~50-100 MB per pod (1000 pods = 50-100 GB)
- Latency: Envoy adds ~1-2 ms per hop
- CPU: Proxying, mTLS handshakes (cryptography is expensive)
- Operational complexity: Istio is notoriously complex to debug

---

## Part 4: Linkerd — The Lightweight Mesh

Linkerd is a simpler alternative to Istio, focusing on reliability without the complexity.

```
Istio:     Feature-rich, complex, mature
Linkerd:   Minimal, lightweight, easy to operate

Istio data plane:   Envoy (C++, 30MB+, complex)
Linkerd data plane: Linkerd-proxy (Rust, 10MB, simple)

Istio CRDs:   30+ (VirtualService, DestinationRule, Gateway, etc.)
Linkerd:      3 CRDs (ServiceProfile, TrafficPolicy, Authorization)
```

**Linkerd strengths:**
- Easier to understand (not feature-parity with Istio)
- Smaller footprint (proxy is Rust, optimized)
- Faster to debug (simpler config model)
- Auto-mTLS with zero configuration

**Linkerd setup:**

```bash
# Install
linkerd install | kubectl apply -f -

# Inject sidecars into namespace
kubectl annotate namespace production linkerd.io/inject=enabled

# Define retries
apiVersion: linkerd.io/v1beta1
kind: ServiceProfile
metadata:
  name: payment
spec:
  service:
    name: payment
    namespace: production
  routes:
    - name: POST /api/charges
      condition:
        method: POST
        pathRegex: /api/charges
      isRetryable: true
      timeout: 5s
```

---

## Part 5: Modern Congestion Control

### BBR vs CUBIC

**CUBIC (default in most Linux):**
```
On packet loss:
  Shrink window by 20% (W_new = W_old * 0.8)
  
Implication:
  Loss detected → immediate throughput drop → slow recovery
  
Problem: Induces queue buildup
  Window stays high → queue fills
  Loss happens → whole queue is lost
```

**BBR (Google):**
```
Instead of window size, track:
  Bandwidth: Max bandwidth observed
  RTT: Min RTT observed
  
pacing_rate = bandwidth × 1.25 (slight overshoot to find new bandwidth)

On packet loss:
  Reduce inflight by 15% (gradual)
  Reprobe bandwidth (don't get stuck)
  
Advantage:
  Keeps queue small (only 2-3 packets)
  Faster recovery (reprobe continuously)
  Better for high-latency networks (satellite, geo-distributed)
```

**When BBR helps:**
```
Scenario: 1 Gbps network, 100 ms latT, BW product = 12.5 MB

CUBIC:
  Window opens to 12.5 MB
  Queue fills to 8-10 MB
  Latency skyrockets to 500+ ms
  Loss → window shrinks → slow recovery

BBR:
  Measures bandwidth (1 Gbps)
  Maintains inflight = 2-3 packets
  Latency stays at ~100 ms
  Reprobe continuously for higher bandwidth
```

**Enable BBR:**
```bash
# /etc/sysctl.conf
net.ipv4.tcp_congestion_control=bbr
net.ipv4.tcp_notsent_lowat=16384
net.core.default_qdisc=fq

# Apply
sysctl -p
```

---

## Part 6: Zero-Trust Networking

Traditional: "Trust the internal network."

Modern: "Never trust. Always authenticate and encrypt."

```
Old model:
  Internal network (VPN) → trusted
  Any service on VPN → can talk to any other
  
New model (zero-trust):
  No implicit trust
  Every connection: verify identity (mTLS)
  Every connection: verify authorization (policy)
  Every connection: encrypted
```

### Implementation in Kubernetes

```yaml
# Default: deny all traffic
apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
metadata:
  name: default-deny
spec:
  podSelector: {}
  policyTypes:
    - Ingress
    - Egress

# Explicit allow: order → payment
apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
metadata:
  name: allow-order-to-payment
spec:
  podSelector:
    matchLabels:
      app: payment
  policyTypes:
    - Ingress
  ingress:
    - from:
        - podSelector:
            matchLabels:
              app: order
      ports:
        - protocol: TCP
          port: 8080
```

### SPIFFE/SVID for Service Identity

**SPIFFE = Secure Production Identity Framework for Everyone**

```
Every service gets an identity:
  URI: spiffe://cluster.local/ns/production/sa/order-service
  
Certificate (SVID = SPIFFE Verifiable Identity Document):
  Subject: spiffe://cluster.local/ns/production/sa/order-service
  Issued by: Cluster's CA
  Valid for: 24 hours (auto-rotated)
  
When order-service calls payment-service:
  1. order-service presents SPIFFE cert
  2. payment-service verifies it's from order-service
  3. Policy check: is order-service allowed to call payment?
  4. Call allowed or rejected
```

---

## Part 7: Network Observability with eBPF

**eBPF = extended Berkeley Packet Filter** — run custom code in the kernel without recompiling it.

### Traditional Network Observability

```
tcpdump: Capture packets (expensive, can drop packets)
ss/netstat: Socket stats (coarse, can miss events)
iptables rules: Log dropped packets (expensive)
Application logs: "We called this service" (high latency)

Problem: Low visibility into kernel, races in measurement
```

### eBPF Tools

**Cilium (networking)**
```
Attach eBPF program to kernel network stack
  On every packet:
    - Identify source service (by IP)
    - Identify dest service (by IP/port)
    - Extract connection metadata
    - Forward to userspace for aggregation
    
Result:
  Service topology map (who calls whom)
  Traffic matrix (bytes/packets per service-pair)
  Latency distribution (TCP handshake, RTT)
  Zero overhead (eBPF runs in kernel)
```

**Hubble (Cilium observability)**
```
Metrics:
  connections_total{source_ns=production,source_app=order,
                     dest_ns=production,dest_app=payment}
  connection_duration_seconds{source_app=order,dest_app=payment}
  packets_dropped_total{reason=policy_denied}

Visibility:
  Real-time flow graph (order → payment, payment → db)
  Packet-level retransmit detection (TCP fast retransmit)
  Connection establishment latency (TCP handshake time)
  All without app instrumentation
```

**Falco (runtime security via eBPF)**
```
Monitor system calls:
  execve() → detect unexpected processes
  open() → detect unexpected file access
  connect() → detect unexpected network connections
  
Alert on anomalies:
  Process running in pod that shouldn't
  Container writing to unexpected files
  Service making outbound connection it shouldn't
```

---

## Interview Questions

=== "Foundation"
    **Q: What's the advantage of HTTP/3 over HTTP/2?**
    
    "HTTP/3 uses QUIC (UDP-based) instead of TCP. Key advantage: no head-of-line blocking. In HTTP/2, one lost TCP packet stalls all streams. In HTTP/3, each stream is independent; one lost packet only affects that stream. Also: 0-RTT resumption (cache key from prev session, encrypted payload in first packet) and connection migration (switch networks, connection persists)."
    
    **Q: When should you use gRPC instead of REST?**
    
    "gRPC for internal service-to-service (you control both ends). Benefits: 4-10× smaller payload (protobuf vs JSON), 10-100× faster serialization (no reflection), HTTP/2 multiplexing (multiple concurrent calls on one connection). REST for public APIs or browser clients. At 100k RPS across microservices, gRPC saves ~100ms latency vs REST."

=== "Senior"
    **Q: Explain how Istio's mTLS works and why you'd use it.**
    
    "Istio injects Envoy sidecars into every pod. Sidecar intercepts all traffic. On outbound: adds mTLS encryption, validates destination cert, applies retry/timeout policies. On inbound: accepts mTLS, validates caller cert, enforces authorization policies. Why: (1) mTLS without app code changes, (2) centralized retry/timeout/circuit breaker policies, (3) encrypted all service-to-service traffic, (4) SPIFFE identity (every service has cert proving who it is). Cost: ~50-100 MB memory per pod, ~1-2 ms latency per hop, operational complexity."
    
    **Q: Would you use Istio or Linkerd? Why?**
    
    "Linkerd for simplicity and ease of operation. Lighter weight (Rust proxy vs Envoy), fewer CRDs, auto-mTLS with minimal config, easier to debug. Istio if you need advanced features: traffic mirroring, A/B testing, multi-cluster management. At small-to-medium scale (<100 services), Linkerd's simplicity wins. At large scale with complex routing, Istio's power wins."

=== "Staff"
    **Q: Design a zero-trust network for a SaaS platform with 50 microservices, multi-region (US, EU), 10k RPS.**
    
    "I'd implement: (1) Cilium for networking (eBPF-based, zero-overhead observability), (2) SPIFFE/SVID for service identity (every service gets auto-rotated cert), (3) Linkerd for data plane (mTLS, retry, timeout policies, low operational burden), (4) NetworkPolicy for explicit allow-lists (default deny, add allow rules per service pair), (5) Observability via Hubble (service topology, latency, drop metrics from kernel, no app changes). Architecture: single Kubernetes cluster per region, Linkerd handles per-region mTLS, federation between clusters for multi-region (eventual consistency acceptable). Cost: Linkerd ~1% CPU overhead per service, memory ~50MB, Cilium adds ~100MB kernel memory. Security: every connection authenticated + encrypted, policy violations logged and alerted."

---

## Key Takeaways

!!! success "Remember"
    1. **HTTP/3 (QUIC):** No head-of-line blocking, 0-RTT resumption, connection migration. Matters for mobile and packet-loss networks.
    2. **gRPC:** 4-10× smaller payload, 10× faster serialization, HTTP/2 multiplexing. Use for internal service-to-service at scale.
    3. **Service mesh:** Moves networking concerns (mTLS, retries, timeouts, circuit breakers) from app code to infrastructure (Envoy/Linkerd sidecars).
    4. **Istio:** Feature-rich (30+ CRDs), complex, powerful. For large-scale microservices with advanced routing.
    5. **Linkerd:** Lightweight, simple, easy to debug. Rust-based proxy, minimal CRDs. Better at small-medium scale.
    6. **mTLS in production:** SPIFFE identity, auto-rotated certs, zero-trust networking (default deny + explicit allow).
    7. **Congestion control:** BBR better than CUBIC for high-latency/high-BW networks (satellite, geo-distributed). Keeps queues small.
    8. **eBPF observability:** Zero-overhead network visibility (Cilium/Hubble) without app instrumentation.
    9. **Zero-trust:** Every connection authenticated (mTLS), authorized (NetworkPolicy), encrypted. No implicit trust.
    10. **Trade-offs:** Service mesh adds complexity, memory, and latency. Worth it at 20+ services with complex routing needs.

---

**Previous:** [Cloud Load Balancers](load-balancers-cloud.md)

