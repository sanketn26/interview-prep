---
title: Performance Fundamentals — Threads, Memory, and OS-Level Tuning
description: Why systems are slow — thread models, memory pressure, goroutine leaks, logging overhead, and OS-level optimizations.
prerequisites:
  - Operating Systems basics
  - Your language's runtime (Go, Python, Java)
---

# Performance Fundamentals

[← Performance Overview](index.md)

---

## Why This Exists

"Why is this slow?" is the most common production question, and the answer is almost never "the algorithm is O(n²)." It's almost always one of:

1. **Thread exhaustion** — waiting for a thread that never becomes available
2. **Goroutine leak** — goroutines that **never return** (blocked forever). Unbounded spawn is a different bug (load), not automatically a leak.
3. **Unbounded allocation** — every request allocates a map with 100k entries
4. **Synchronous logging** — each request waits for disk I/O to complete
5. **Lock contention** — a shared mutex that 1,000 goroutines are fighting over
6. **Kernel context switching** — too many threads thrashing the CPU
7. **Page cache misses** — reading 10GB of data forces eviction of your working set

This page teaches the mental model of where bottlenecks actually live, how to find them, and what the trade-offs are when you fix them.

---

## Mental Model: Where Performance Actually Matters

```
┌─────────────────────────────────┐
│ User makes request (10 ms p99)  │
└────────────┬────────────────────┘
             │
    ┌────────┴────────┐
    ▼                 ▼
[Network: 5ms]   [Your code: 5ms]
    │                 │
    ├─DNS lookup      ├─Acquire thread (blocked?)
    ├─TCP handshake   ├─Parse request (allocations)
    └─TLS negotiate   ├─Database call
                      │  ├─Network latency
                      │  └─Lock contention on DB
                      ├─Serialize response (allocations, logging)
                      └─Release thread
```

Fast code on a slow thread is still slow. The question: **what resource is actually saturated?**

---

## Part 1: Thread Models and Context Switching

### User-Space Threads vs. Kernel-Level Threads

**Kernel-level threads** (OS threads, Java threads, Python threads):
- One thread = one kernel thread
- Context switch cost: ~1-10 µs (requires OS scheduler intervention)
- Stack size: ~1-2 MB per thread (allocated upfront)
- Total overhead: 1,000 threads = 1-2 GB just for stacks
- Limit: typically 10,000-100,000 threads per process before OS scheduler thrashes

**User-space threads** (Go goroutines, Rust async, greenlets):
- Multiple user threads map to N kernel threads (M:N multiplexing)
- Context switch cost: ~50-100 ns (just a register save; no OS involvement)
- Stack size: ~2-4 KB per goroutine (dynamically growing)
- Total overhead: 1,000,000 goroutines ≈ 2-4 GB but much more CPU-efficient
- Limit: can go into millions before hitting practical limits

**Why this matters:**

```go
// Kernel threads: Java thread-per-request pattern
// 10,000 concurrent users = 10,000 threads = 10-20 GB ram, thrashing scheduler

// User-space: Go goroutine-per-request pattern  
// 10,000 concurrent users = 10,000 goroutines ≈ 40-80 MB ram, 4-8 kernel threads

// Same application, 100-200× more efficient memory use
```

### Thread Pool Exhaustion (Most Common Bottleneck)

```
Thread pool size: 100
Concurrent requests: 500

Request 1-100: get a thread, execute
Request 101-500: wait in queue

If each request takes 1 second and waits for downstream DB:
  Queue backlog = 400 requests
  Queue wait time = 4 seconds (400 requests × 1s each)
  User perceives: 1s (execution) + 4s (queue wait) = 5s total

Meanwhile, downstream is fine (only 100 requests hitting it).
The bottleneck is your thread pool, not the downstream.
```

**How to diagnose:**
- Check thread pool queue length (if available)
- Measure `time_in_queue` vs `time_executing`
- Check if downstream latency changed (if not, it's your thread pool)
- CPU usage is low (threads are blocked, not running)

**How to fix:**
- Increase thread pool size (but beware context switching)
- Move blocking I/O to async (Go's http.Client is async by default; Java needs Project Reactor/Vert.x)
- Add circuit breaker to fail fast (don't queue infinite requests waiting for a dead downstream)

### The Context Switch Tax

When you have **more runnable threads than cores**, the OS scheduler context-switches constantly.

```
Example: 200 threads on 8 cores (25 threads per core)

Context switch every 10 ms:
  Save registers: 1 µs
  Flush TLB (translation lookaside buffer): varies
  Load new thread: 1 µs
  Total: ~1-10 µs per switch × 25 threads × 1000 switches/sec = 25-250 µs wasted per core
  
If application thread uses 100 µs per time-slice:
  Context switch overhead = 25% of CPU time!
```

**The cliff:** Performance degrades sharply around `threads ≈ 2-4 × cores`.

| Threads | Status | Context-Switch Overhead |
|---------|--------|------------------------|
| 1-2 per core | Good | <1% |
| 4-8 per core | Acceptable | 1-5% |
| 8-16 per core | Bad | 5-20% |
| 16+ per core | Terrible | 20-50% |

**How to keep it healthy:**
- Go: Let it manage goroutine → thread mapping. Typically 1 kernel thread per core.
- Java: Keep thread pool at `cores * 2 to 4` for I/O workloads
- Python: Threading is bad (GIL); use processes or async

---

## Part 2: Goroutine Leaks and Unbounded Allocation

### Goroutine Leaks: The Silent Killer

```go
// BAD: Goroutine leak
func subscribe(eventChan chan Event) {
    for event := range eventChan {
        go func() {
            // Process event
        }()
    }
}

// Unbounded spawn is not the same as a leak.
// If each goroutine *returns*, you have a load/memory spike, then they go away.
// A leak is a goroutine that *never returns* (blocked on a chan/mutex/context).
// This example is unbounded spawn; it becomes a leak only if process() never exits.

// GOOD: Reuse goroutines with worker pool
func subscribe(eventChan chan Event) {
    for i := 0; i < 100; i++ {
        go func() {
            for event := range eventChan {
                // Process event
            }
        }()
    }
}
// Always 100 goroutines regardless of request rate
```

**How to find leaks:**
```go
import "runtime"

func diagnosticGoroutineCount() {
    for {
        count := runtime.NumGoroutine()
        log.Printf("Active goroutines: %d", count)
        time.Sleep(10 * time.Second)
    }
}

// If this number constantly increases, you have a leak
```

**Common sources:**
1. Background goroutines that never exit (missing close of channel or missing break)
2. Goroutines waiting on a channel that's never closed
3. Goroutines blocked on mutex/semaphore that's never released
4. Context that's never cancelled
5. HTTP client that doesn't respect timeout

### Unbounded Channel Buffers

```go
// BAD: Unbounded buffer
eventQueue := make(chan Event, 1000000)  // Crash if more than 1M events queue

// Every send waits for receive; if receiver is slow:
// - Queue fills up
// - Sender blocks
// - Upstream backs up
// - Cascading failure

// GOOD: Bounded with backpressure
eventQueue := make(chan Event, 1000)  // Only buffer 1000

// If sender is faster than receiver:
// - Sender blocks on send
// - Upstream gets backpressure signal
// - Upstream can shed load (drop requests, fail fast)
```

### Unbounded Map/Slice Growth

```go
// BAD: Unbounded allocation
func cacheUserPrefs(userID int, prefs map[string]interface{}) {
    globalCache := make(map[int]map[string]interface{})
    globalCache[userID] = prefs  // No eviction policy
}

// After 1 million users:
// - globalCache has 1M entries
// - Each entry has nested map (at least 200 bytes)
// - Total: 200 MB minimum, plus GC pressure

// GOOD: Bounded cache
type BoundedCache struct {
    max int
    mu sync.Mutex
    cache map[int]map[string]interface{}
    lru *lru.Cache  // Evict least-used when full
}

func (c *BoundedCache) Set(userID int, prefs map[string]interface{}) {
    c.mu.Lock()
    defer c.mu.Unlock()
    if c.cache.Len() > c.max {
        c.cache.RemoveOldest()
    }
    c.cache[userID] = prefs
}
```

---

## Part 3: Memory Pressure and GC Pauses

### Where Memory Actually Gets Allocated

Every allocation has overhead:

| Operation | Allocations | Typical Size | Why |
|-----------|-------------|--------------|-----|
| `make(map[string]int, 1000)` | 1 | ~50KB (bucket array + metadata) | Bucket array pre-allocated |
| `append(slice, x)` | 1 (if cap exceeded) | 2x current (doubles) | Doubling strategy |
| `strings.Builder` (good) | 1 | Starting capacity | Reuses underlying array |
| `"a" + "b" + "c"` (bad) | 3 | "a" + "b" = tmp1, tmp1 + "c" = tmp2 | Creates intermediate strings |
| `json.Marshal(struct)` | 2-3 | Size of output + encoder buffer | Reflection + buffer allocation |

### Inherent Memory Guzzlers

**String concatenation in loops:**
```go
// BAD: O(n²) memory allocations
var result string
for i := 0; i < 10000; i++ {
    result += fmt.Sprintf("item %d,", i)  // New string each time
}
// Creates 10,000 intermediate strings, ~5MB garbage

// GOOD: StringBuilder (or strings.Builder in Go)
var buf strings.Builder
for i := 0; i < 10000; i++ {
    fmt.Fprintf(&buf, "item %d,", i)
}
result := buf.String()  // One allocation
```

**Unbounded collections:**
```go
// BAD: Map grows without bound
seenIDs := make(map[int]bool)
for event := range eventStream {
    seenIDs[event.ID] = true  // Never pruned
    // After 1M events: 8MB (int64 key + bool value + bucket overhead)
}

// GOOD: Use TTL or bounded LRU
cache := lru.New(100000)  // Only keep 100k most recent
for event := range eventStream {
    cache.Add(event.ID, true)
}
```

**High-cardinality metrics/logging:**
```go
// BAD: Cardinality explosion
log.Printf("Request from user_id=%d, path=%s", userID, path)
// 1 million unique userIDs = 1 million log patterns
// Logging system allocates string + buffer for each unique pattern

// GOOD: Use structured logging, filter cardinality
log.WithFields(log.Fields{"path": path}).Info("request")  // Cardinality = 100s of paths
// Log user_id separately if needed, with sampling
```

### GC Pause Times (The Silent Killer in Latency-Sensitive Apps)

```go
// A single GC pause can spike latency

Request timeline:
  t=0ms: Request arrives
  t=1ms: Allocate 100MB for processing
  t=2ms: Processing halfway done
  t=2.5ms: STOP-THE-WORLD GC pause starts (all goroutines stop)
  t=50ms: GC pause ends (48ms latency spike!)
  t=52ms: Processing resumes
  t=55ms: Response sent
  
  User sees: p99 latency = 55ms (was 5ms before)
```

**How to tune GC:**
```go
// Default GOGC=100: Trigger GC when heap doubles
// Lower GOGC = more frequent GC, shorter pauses, higher CPU
// Higher GOGC = fewer pauses, longer pauses when they happen, less CPU

import _ "net/http/pprof"
// Profile with pprof to see GC frequency

// Option 1: Reduce allocation rate (best fix)
// Option 2: Tune GOGC *before* start, or call debug.SetGCPercent at runtime.
// os.Setenv("GOGC", "50") after the process has started does NOT retune GC.
debug.SetGCPercent(50)  // this is what actually changes the running process

// Option 3: GOMEMLIMIT (Go 1.19+) as a soft heap cap, with SetMemoryLimit
```

---

## Part 4: Antipatterns

### Antipattern 1: Mutex Contention in Hot Paths

```go
// BAD: Shared mutex on hot path
type Counter struct {
    mu sync.Mutex
    val int64
}

func (c *Counter) Increment() {
    c.mu.Lock()
    c.val++
    c.mu.Unlock()  // 100,000 RPS = 100k locks/sec
}
// At scale, context switch cost of locking dominates

// GOOD: Atomic or sharded
type Counter struct {
    val atomic.Int64
}
func (c *Counter) Increment() {
    c.val.Add(1)  // No lock, no context switch, CPU cache-friendly
}

// OR: Shard across cores
type ShardedCounter struct {
    shards [runtime.NumCPU()]atomic.Int64
}
func (c *ShardedCounter) Increment() {
    cpu := getcpu()  // or use hash of thread-local ID
    c.shards[cpu].Add(1)
}
```

### Antipattern 2: Reflection in Hot Path

```go
// BAD: JSON marshaling per request
type Response struct {
    UserID int
    Name string
}

func handleRequest(w http.ResponseWriter, r *http.Request) {
    resp := Response{UserID: 123, Name: "Alice"}
    json.NewEncoder(w).Encode(resp)  // Reflection + allocation per request
}
// 10,000 RPS = 10k reflection operations/sec

// GOOD: Pre-marshal or use code generation
var cachedResponse []byte = []byte(`{"UserID":123,"Name":"Alice"}`)
func handleRequest(w http.ResponseWriter, r *http.Request) {
    w.Write(cachedResponse)  // No allocation
}

// OR: Use code-gen (easiest)
// easyjson, protobuf, or sqlc generate marshaling code at compile time
```

### Antipattern 3: Goroutine Per Request (Without Pooling)

```go
// BAD: Unbounded goroutine creation (this is a load bound, not a leak
// unless the goroutine never returns)
func handleRequest(w http.ResponseWriter, r *http.Request) {
    go func() {  // New goroutine for each request!
        // Process
    }()
}
// 1 million concurrent requests = 1 million goroutines = 2-4 GB memory
// Context switching thrashing if > cores × 4
// Leak = those goroutines *never exit*. Spawn-per-request that finishes is "too many", not "leaked".

// GOOD: HTTP server already pools goroutines internally
// Go's net/http reuses goroutines (connection pooling)
// Additional goroutines only if you need background work

func handleRequest(w http.ResponseWriter, r *http.Request) {
    // This runs in a goroutine already managed by HTTP server
    // Only create new goroutine if you need async work after response
}

// If you DO need background work:
func handleRequest(w http.ResponseWriter, r *http.Request) {
    w.WriteHeader(200)
    w.Write([]byte("OK"))
    
    go asyncTask()  // Fire-and-forget, but bounded!
}
// But: you need a worker pool to bound goroutines
type BackgroundTasks struct {
    queue chan Task
}
func NewBackgroundTasks(workers int) *BackgroundTasks {
    q := make(chan Task, 1000)  // Bounded queue
    for i := 0; i < workers; i++ {
        go func() {
            for task := range q {
                task.Execute()
            }
        }()
    }
    return &BackgroundTasks{queue: q}
}
```

---

## Part 5: Logging Impact (The Silent Bottleneck)

### Synchronous vs. Asynchronous Logging

```go
// BAD: Synchronous logging (every log waits for disk)
log.Info("Processing request")  // Waits for disk write (~5ms)
process()
log.Info("Done")                 // Waits for disk write (~5ms)
// Total: 10ms added to request latency just for logging!

// GOOD: Asynchronous logging (buffer in memory, flush batch)
asyncLog.Info("Processing request")  // Enqueues, returns immediately
process()
asyncLog.Info("Done")                 // Enqueues, returns immediately
// Background goroutine batches and writes every 10ms
// Added latency: <1ms
```

**Implementation:**
```go
type AsyncLogger struct {
    queue chan LogEntry
}

func NewAsyncLogger(bufferSize int) *AsyncLogger {
    l := &AsyncLogger{queue: make(chan LogEntry, bufferSize)}
    go l.flushLoop()  // Background goroutine
    return l
}

func (l *AsyncLogger) flushLoop() {
    batch := []LogEntry{}
    ticker := time.NewTicker(100 * time.Millisecond)
    for {
        select {
        case entry := <-l.queue:
            batch = append(batch, entry)
            if len(batch) > 1000 {  // Flush when full
                l.flush(batch)
                batch = []LogEntry{}
            }
        case <-ticker.C:
            if len(batch) > 0 {
                l.flush(batch)
                batch = []LogEntry{}
            }
        }
    }
}
```

### Log Volume and Cardinality

```
Scenario: 10,000 RPS, log one line per request
80 bytes per log line (typical)

10,000 RPS × 80 bytes × 86,400 sec/day = 69 GB/day
Cost: Storage, network (log shipping), parsing

If you log the user_id (high cardinality):
  "user_id=123456" appears 100 times (0.001% of 10M daily users)
  Log aggregation system sees: 10,000 unique "user_id" patterns
  Cardinality explosion in index/search systems
```

**How to manage:**
1. **Sampling:** Log only 1-in-100 requests
2. **Structured logging:** Use fields, not string formatting
3. **Avoid high-cardinality on metrics**, not logs: `request_id` belongs in **logs** (correlation). Do not put `request_id` / `user_id` on Prometheus labels. Logging the request ID is required for observability.
4. **Use stderr for errors only:** Info/debug to async log file

```go
// GOOD: Structured logging with sampling
import "go.uber.org/zap"

logger, _ := zap.NewProduction()
if rand.Intn(100) == 0 {  // Sample 1-in-100
    logger.Info("request",
        zap.String("path", r.URL.Path),        // Low cardinality
        zap.Int("status", 200),                 // Low cardinality
        zap.Duration("latency", duration),      // OK: will be bucketed
    )
}
```

---

## Part 6: OS-Level Optimizations

### CPU Affinity (Bind Goroutines to Cores)

```go
// Problem: Goroutine migrates between cores, flushing CPU cache
// Solution: Pin goroutine to a core

import (
    "runtime"
    "golang.org/x/sys/unix"
)

func pinToCPU(cpuID int) {
    runtime.LockOSThread()  // required: affinity is per OS thread, not per goroutine
    var cpuSet unix.CPUSet
    cpuSet.Set(cpuID)
    unix.SchedSetaffinity(0, &cpuSet)  // bind the locked OS thread
}

func main() {
    // Each worker goroutine handles a shard — must stay on that OS thread
    for i := 0; i < runtime.NumCPU(); i++ {
        go func(cpu int) {
            pinToCPU(cpu)
            worker()  // never unlock the OS thread if you want the pin to stick
        }(i)
    }
}
```

**When to use:** Latency-sensitive services (p99 < 10ms requirement). Cache-locality matters.

### NUMA Awareness

On multi-socket servers, accessing memory on a different socket is **10-50× slower**.

```
Server with 2 sockets × 8 cores = 16 cores
Socket 0: cores 0-7, local memory (fast)
Socket 1: cores 8-15, local memory (fast)

Goroutine on core 0 accessing memory allocated by core 10 = SLOW
```

**How to avoid:**
- Allocate memory on the same socket where it's used
- Go's runtime handles this implicitly; rarely a problem unless you're tuning for extreme performance

### MMAP vs Read (For Large Data)

```go
// BAD: Read entire file into memory
data, _ := ioutil.ReadFile("bigfile.bin")  // 10GB file = 10GB allocation + copy
process(data)

// GOOD: Memory-map the file
f, _ := os.Open("bigfile.bin")
m, _ := unix.Mmap(int(f.Fd()), 0, 10<<30, unix.PROT_READ, unix.MAP_SHARED)
// Linux manages paging; only accessed pages are in RAM
// Kernel evicts pages when memory is needed
process(m)
unix.Munmap(m)
```

### Swap Tuning (Disable for Servers)

```bash
# BAD: Swap enabled on server
# When RAM fills, kernel starts paging to disk
# One page fault = 10,000× latency (disk is 10,000× slower than RAM)
# p99 latency goes from 10ms to 10 seconds unpredictably

# GOOD: Disable swap (or set very high priority to not use it)
sysctl vm.swappiness=0  # Don't use swap unless OOM

# Or: Set swappiness low
sysctl vm.swappiness=1  # Use swap only if memory is very tight
```

### Kernel Parameters for Network Services

```bash
# File descriptor limit (especially for long-lived connections)
ulimit -n 1000000  # Raise from default 1024

# TCP buffer sizes (for high-throughput)
sysctl net.core.rmem_max=134217728  # 128MB read buffer
sysctl net.core.wmem_max=134217728  # 128MB write buffer

# TCP backlog (for thundering herd)
sysctl net.ipv4.tcp_max_syn_backlog=4096  # Prevent SYN drops

# Time-wait sockets (reuse connection quickly)
sysctl net.ipv4.tcp_tw_reuse=1
```

---

## Part 7: Profiling and Diagnosis

### CPU Profiling (Find Hot Functions)

```go
import _ "net/http/pprof"

// Start server with pprof: go run main.go
// In another terminal:
// go tool pprof http://localhost:6060/debug/pprof/profile?seconds=30

// This creates a profile showing CPU time spent in each function
// Sort by cumulative time to find real bottlenecks

// Output:
// (pprof) top
// Showing nodes accounting for 2500ms, 98.5% of 2540ms total
//       flat  flat%   sum%        cum   cum%
//      800ms 31.5% 31.5%      1500ms 59.1%  encoding/json.Marshal
//      600ms 23.6% 55.1%       600ms 23.6%  runtime.memclr
//      400ms 15.7% 70.8%       900ms 35.4%  sync.(*Mutex).Lock
```

### Memory Profiling (Find Allocations)

```go
// go tool pprof http://localhost:6060/debug/pprof/heap

// (pprof) top -cum
// Shows most-allocated functions

// (pprof) alloc_space  (total allocated, not just live)
// vs live_space (currently held in memory)

// Typical output shows allocation hotspots:
// 1. JSON marshaling
// 2. String concatenation
// 3. Map growth
```

### Goroutine Profiling

```go
import "runtime"
import "runtime/pprof"

func diagnostics() {
    f, _ := os.Create("goroutine.prof")
    pprof.Lookup("goroutine").WriteTo(f, 1)
    
    // or: go tool pprof http://localhost:6060/debug/pprof/goroutine
}

// This shows all goroutine stack traces
// Look for goroutines stuck on:
//   - channel receive (channel never closed)
//   - mutex (holding lock too long)
//   - network (socket read timeout missing)
```

### Benchmarking

```go
import "testing"

func BenchmarkJSONMarshal(b *testing.B) {
    data := Response{UserID: 123, Name: "Alice"}
    b.ResetTimer()
    for i := 0; i < b.N; i++ {
        json.Marshal(data)
    }
}

// Run: go test -bench=. -benchmem
// Output:
// BenchmarkJSONMarshal-8   1000000   1234 ns/op   128 B/op   2 allocs/op
//                          ^^^^^^^^  ^^^^         ^^^         ^
//                          iterations per-op ns   allocs/op   # of allocs
```

---

## Interview Questions

=== "Foundation"
    **Q: Your service is taking 100ms per request. How do you find where the time goes?**
    
    "First, decompose: is it network latency (DNS, TCP, TLS)? Or application code? Use CPU profiling (pprof) to see which function consumes most CPU. If no hot function jumps out, the service is probably blocked — waiting for a thread, waiting on I/O. Check thread pool queue length and downstream service latency."
    
    **Q: What's the difference between user-space threads (goroutines) and kernel threads?**
    
    "Goroutines are user-space; M goroutines run on N kernel threads (managed by Go runtime). Goroutine context switch is ~50 ns (no OS involvement). Kernel thread switch is ~10 µs (requires OS scheduler). So Go can handle 10,000+ goroutines efficiently; Java with 10,000 threads would thrash the scheduler. Stack: kernel thread = 1-2 MB allocated upfront; goroutine = 2-4 KB and grows. Result: Go can spawn millions of goroutines; Java cannot."

=== "Senior"
    **Q: Your p99 latency is 10ms, but after adding one extra service call, it jumps to 100ms. Why?**
    
    "Tail amplification. If each service has 1% of requests slower than 10ms, then a request calling 10 services has 1-(0.99^10)=9.6% slow rate. One extra call, if it's on the critical path and occasionally slow, multiplies the tail latency. The fix: (1) move it off critical path (async), (2) add a timeout so failures fast-fail, or (3) use hedged requests (send to two servers, return first response)."
    
    **Q: You see memory grows 100MB per hour, but heap profiling shows no large allocations. What's happening?**
    
    "Likely goroutine leak. Each goroutine has ~2-4 KB stack. 100 MB / 4 KB = 25,000 goroutines. Check runtime.NumGoroutine() over time. If it's increasing, you have a leak. Look for goroutines that: (1) never exit, (2) are blocked on a channel that's never closed, (3) are waiting on a mutex that's never released, or (4) are waiting on context that's never cancelled. Use goroutine profiling (pprof) to see stuck goroutines' stack traces."

=== "Staff"
    **Q: Design a high-performance request-processing system that must hit <5ms p99 latency at 100k RPS.**
    
    "Start with async logging (batch and flush every 10ms, not on critical path). Bound goroutines (worker pool, not unbounded spawn — spawn ≠ leak; leak = never returns). Profile to remove allocations. Tune GC with debug.SetGCPercent (os.Setenv(\"GOGC\") after start does not retune). Bind workers with runtime.LockOSThread() plus affinity. Log request_id for correlation; keep it off metric labels. Circuit-breaker to downstream to fail-fast. Identify which resource saturates first at 100k RPS and tune there."

---

## Key Takeaways

!!! success "Remember"
    1. **Thread pool exhaustion is the #1 bottleneck.** Monitor queue length; add circuit breaker to fail fast.
    2. **Context switching is expensive:** avoid having more threads than 4× cores.
    3. **Goroutine leaks silently drain memory.** Monitor runtime.NumGoroutine(); rising = leak.
    4. **Unbounded allocations destroy performance.** Bound channels, caches, maps. Use LRU eviction.
    5. **Synchronous logging blocks the critical path.** Use async logging with batching.
    6. **High-cardinality is a metrics problem.** Put `request_id` in logs (correlation); never as a metric label.
    7. **GC pauses cause latency spikes.** Reduce allocation rate or tune GOGC; measure pause times.
    8. **Reflection in hot path is slow.** Use code-gen (easyjson, protobuf) for serialization.
    9. **Mutex contention kills throughput.** Use atomic operations or sharding for hot counters.
    10. **Profile before optimizing.** CPU profiling finds hot functions; memory profiling finds allocations.
    11. **Swap on servers = 10,000× latency spike when full.** Disable or set swappiness to 0.
    12. **CPU affinity matters for <5ms p99.** Bind critical workers to cores.
    13. **Tail amplification:** 1% slow × 10 calls ≈ 10% slow pages. Move non-critical calls off critical path.

---

**Next:** [Cache Strategies](cache-strategies.md)

