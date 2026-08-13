---
title: Architecture Failure Library
description: A catalog of distributed-system failure modes — symptom, root cause, mitigation — the vocabulary senior engineers use in incident reviews and design interviews.
---

# Architecture Failure Library

**Prerequisites:** [Reliability Overview](index.md), [Circuit Breakers](circuit-breakers.md)

[← Reliability](index.md)

---

## Why This Exists

Most engineers learn failure modes one incident at a time, over years, at whatever company happens to break in front of them. That's slow and it's biased toward whatever your stack does badly. This page is the shortcut: a catalog of the failure modes that recur across every distributed system, regardless of language or cloud provider, so you can **recognize the shape of a problem** before it finishes happening.

This is not a deep-dive on any one mechanism — [Circuit Breakers](circuit-breakers.md) already does that for cascading failures. This is a field guide: symptom → root cause → mitigation, entry after entry, so that when a system starts behaving strangely at 2am (or in a system-design interview), you have a name for it and a shape for the fix.

!!! tip "How to use this page"
    Don't memorize it front to back. Read it once, then come back when something smells familiar — "this looks like a hot key" or "this feels like split brain" — and confirm the mitigation. In interviews, naming the failure mode *and* its standard mitigation is what separates "I've read about this" from "I've been paged for this."

---

## Cascading Failures

One component's distress becomes every component's distress. These are the failure modes where the *response* to a problem is what turns it into an outage.

### Thundering Herd

**Symptom:** A cache, lock, or resource expires/releases and every waiting client rushes it at the same instant, overwhelming the thing they were all waiting for.

**Root cause:** Synchronized wake-ups — a shared TTL, a shared cron schedule, a shared lock release — with no randomization in when clients act.

**Mitigation:** Jitter on expiry and retry ("full jitter" backoff), staggered cache TTLs, request coalescing (single-flight — only one request actually goes to the origin, others wait on it), and pre-warming caches before old entries expire.

!!! example "Incident narrative"
    A product's homepage cache had a flat 5-minute TTL set at deploy time, so every pod's cache expired within the same second. Every 5 minutes, traffic to the origin database spiked 40× for about 800ms, tripping connection pool exhaustion alerts every cycle. The fix was jittering the TTL by ±60 seconds per pod — the spikes disappeared entirely.

### Retry Storms

**Symptom:** A downstream service slows down, clients retry, the extra retry traffic makes the downstream service slower, which causes more retries — traffic to the dependency exceeds the traffic that would exist if it had simply failed outright.

**Root cause:** Retries without a budget, without backoff, or without jitter — see [Circuit Breakers](circuit-breakers.md) for the full mechanics and the Little's Law math behind why 3 retries can turn 1,000 rps into 3,000+ rps at a dependency that is already failing.

**Mitigation:** Timeouts shorter than the caller's SLO, exponential backoff with jitter, a global retry budget (cap retries at ~10% of traffic), and a circuit breaker that fails fast once a dependency is clearly unhealthy so retries stop being issued at all.

!!! example "Incident narrative"
    A checkout service retried failed calls to a fraud-scoring service 3 times with no backoff. When fraud-scoring degraded to an 80% failure rate during a deploy, the retries amplified inbound load 2.4×, and the fraud service — which might have recovered on its own — never got the chance. See [Circuit Breakers](circuit-breakers.md) for the full walkthrough of this exact scenario.

### Cache Stampede

**Symptom:** A single popular cache key expires and dozens or hundreds of concurrent requests for that same key all miss simultaneously, all fall through to the origin at once, and re-populate the cache redundantly — sometimes overwhelming the origin badly enough that it never gets the chance to succeed and refill the cache.

**Root cause:** No coordination between concurrent cache misses for the same key — every request independently decides "the cache is empty, I must go compute this," instead of one request computing it and the rest waiting on that result.

**Mitigation:** Request coalescing / "single-flight" (only the first miss triggers a fetch; concurrent misses for the same key subscribe to that in-flight result), probabilistic early recomputation (refresh a key slightly *before* it expires, weighted by how expensive it is to recompute), and locking the key during recomputation so only one worker rebuilds it.

!!! example "Incident narrative"
    A pricing-calculation cache key for a popular product page expired during peak traffic. Roughly 300 concurrent requests all missed at once and all triggered the same expensive pricing computation against the database simultaneously — the database, which normally saw one computation per cache period, took 300 in the same second and stalled. The fix was single-flight request coalescing, reducing simultaneous recomputation to exactly one request per key regardless of concurrent miss volume.

---

## Resource Exhaustion

The system doesn't crash from a single dramatic failure — it runs out of *something* it needed to keep going, usually slowly enough that nobody notices until the last unit is gone.

### Connection Pool Exhaustion

**Symptom:** Requests start queuing or timing out with "no connections available" even though the database or downstream service is healthy and has spare capacity.

**Root cause:** A slow dependency (or a missing timeout) holds connections checked out of the pool longer than expected. Little's Law: `pool_size = throughput × hold_time`. If hold time triples because a dependency is slow, you need 3× the pool — or the pool empties and everyone queues behind it.

**Mitigation:** Size pools from Little's Law using realistic p99 hold times, set aggressive checkout timeouts so a stuck connection fails fast rather than blocking a thread, use separate pools per dependency (bulkheads) so one slow dependency can't starve unrelated traffic, and alert on `pool_active / pool_max` approaching 1.0 well before it saturates.

!!! example "Incident narrative"
    A reporting endpoint ran a query that occasionally took 45 seconds against a table missing an index. The app used one shared connection pool of 20 connections for all endpoints. A burst of report requests held 20/20 connections for 45 seconds each; every other endpoint on the service — including login — returned 503s until the pool freed up.

### Memory Leaks

**Symptom:** Memory usage climbs steadily over hours or days regardless of load, eventually triggering OOM kills, GC thrashing, or swap death; the service needs periodic restarts to stay healthy ("the leak is a feature now").

**Root cause:** References held longer than intended — unbounded caches, listeners never unregistered, closures capturing large objects, or connection/file handles never released on error paths.

**Mitigation:** Bound every in-process cache with a max size and eviction policy, use weak references for listener/callback registries, load-test with soak tests (24h+ at steady load) not just burst tests, and graph heap/RSS over days, not minutes, in dashboards.

!!! example "Incident narrative"
    A service cached parsed configuration objects keyed by request ID, intending them to be garbage collected once the request finished — but a logging middleware held a reference to the full request context for the lifetime of the process for "debug purposes." Memory grew ~200MB/hour; pods restarted every 18 hours automatically, masking the leak for months until a slow week without traffic (and therefore fewer natural restarts) caused pods to OOM-kill during business hours instead.

### File Descriptor Limits

**Symptom:** Sudden `EMFILE` / "too many open files" errors, new connections and file opens fail, but the process shows no memory or CPU pressure.

**Root cause:** Sockets, files, or pipes opened faster than they're closed — often from a missing `close()` on an error path, or a connection pool that leaks connections under specific failure conditions.

**Mitigation:** Always close resources in a `finally`/`defer`/context-manager, monitor open FD count per process against `ulimit -n`, raise limits deliberately (not by accident) when the workload genuinely needs more concurrent connections, and add FD-count to the same dashboard as memory and pool utilization.

!!! example "Incident narrative"
    An HTTP client library was reused across requests but a retry code path opened a fresh TCP connection on timeout without closing the original — under normal conditions this never triggered, but a network blip caused a wave of timeouts, and the process hit its 1,024 FD limit within four minutes, refusing all new connections including health checks.

### Noisy Neighbor

**Symptom:** One tenant, job, or workload on shared infrastructure degrades performance for everyone else sharing that infrastructure, even though each individual tenant is within its "allowed" usage.

**Root cause:** Shared resources (CPU, disk I/O, network bandwidth, a shared database, a shared thread pool) without per-tenant isolation or quotas — one tenant's burst consumes capacity that others assumed they had.

**Mitigation:** Per-tenant rate limiting and quotas, resource isolation (separate pools, containers with CPU/memory limits, dedicated shards for the largest tenants), and QoS tiers so best-effort workloads get throttled before paying-tier workloads.

!!! example "Incident narrative"
    A multi-tenant analytics platform ran all customers' scheduled batch jobs on a shared compute cluster. One customer's monthly report job scanned a dataset that had grown 50× since it was scheduled, saturating cluster I/O for two hours and pushing every other customer's dashboard queries to 10x their normal latency. There was no per-tenant I/O quota until after this incident.

### Deadlocks Under Load

**Symptom:** Throughput drops sharply under high concurrency even though CPU and memory look fine; threads or transactions appear stuck waiting on each other, and the system sometimes recovers on its own after a lock-wait timeout, only to repeat the pattern minutes later.

**Root cause:** Two or more transactions/threads acquire locks on shared resources in inconsistent order — transaction A locks row 1 then wants row 2, while transaction B locks row 2 then wants row 1 — and neither can proceed. Low concurrency rarely triggers it; it becomes common exactly when load is highest, which is the worst possible time.

**Mitigation:** Always acquire locks in a globally consistent order (e.g., always lock lower primary key first), keep transactions short and lock scope minimal, use `SELECT ... FOR UPDATE SKIP LOCKED` patterns where applicable, set aggressive lock-wait timeouts so a deadlocked transaction fails fast and retries rather than hanging, and let the database's deadlock detector kill one side rather than relying on client-side timeouts alone.

!!! example "Incident narrative"
    A batch reconciliation job and the normal order-update path both touched `orders` and `inventory` tables, but in opposite lock order — the batch job locked inventory first, the order path locked orders first. Under normal load this almost never overlapped; during a high-traffic sale, concurrent batch runs and order updates collided constantly, and the database's deadlock detector was killing several transactions per second, each retried by the application, doubling effective load for no forward progress.

---

## Network Partitions & Split Brain

The network is not reliable, and systems that assume it is eventually get surprised in the worst possible way — by two parts of the same system disagreeing about who's in charge.

### Network Partition

**Symptom:** A subset of nodes can't reach another subset (or a quorum service), while each subset independently believes it's healthy and continues serving traffic — leading to divergent state.

**Root cause:** A network is not a single reliable wire; switches fail, cross-AZ links saturate, DNS resolves inconsistently. Systems built assuming "if I can't reach it, it's down" rather than "if I can't reach it, I don't know its state" behave incorrectly during a partition.

**Mitigation:** Design for the partition explicitly — decide up front whether the system favors consistency (refuse writes without quorum) or availability (serve stale/local data) per CAP trade-offs, use consensus protocols (Raft/Paxos) for anything that must have a single source of truth, and add partition-detection tests to chaos engineering exercises rather than only testing full-node failure.

!!! example "Incident narrative"
    A cross-AZ network link degraded (not fully down — 30% packet loss) between two AZs hosting a stateful service's nodes. Nodes in AZ-A stopped receiving heartbeats from AZ-B and, lacking a real partition-detection strategy, both sides assumed the other was dead and began accepting independent writes, producing conflicting state that took a manual reconciliation script to repair.

### Split Brain

**Symptom:** Two nodes both believe they are the primary/leader and both accept writes, producing conflicting data that has to be manually reconciled after the fact.

**Root cause:** A leader-election or failover mechanism without a strict quorum requirement — usually triggered by a network partition where the old primary can't tell it's been demoted, so it keeps acting like a leader while a new primary has already been elected on the other side.

**Mitigation:** Require a strict majority quorum for leader election (an odd number of voting members), use fencing tokens so a demoted primary's writes are rejected by downstream storage even if it doesn't know it's demoted, and prefer battle-tested consensus systems (etcd, ZooKeeper, Raft-based stores) over hand-rolled leader election.

!!! example "Incident narrative"
    A database cluster's automated failover promoted a replica to primary after losing contact with the original primary during a brief network blip, but the original primary's network recovered 4 seconds later and it never received a "you are no longer primary" signal. Both nodes accepted writes for roughly 90 seconds before monitoring caught the divergence — the write conflicts took the on-call team most of a day to reconcile.

### CPU Starvation From Background Work

**Symptom:** Foreground request latency degrades in periodic bursts that don't correlate with request volume — p99 spikes every few minutes even during quiet traffic periods.

**Root cause:** A background task (GC, a scheduled compaction job, a metrics-flush routine, a cron-triggered batch job) competes for the same CPU cores as request-handling threads, and without CPU isolation or scheduling priority, the background work occasionally wins, starving foreground latency-sensitive work for the duration of its burst.

**Mitigation:** Run background work on separate CPU cores or separate nodes entirely where possible, give foreground threads higher scheduling priority (nice/cgroup shares), smooth bursty background work into smaller, more frequent chunks rather than large periodic ones, and correlate latency dashboards against background job schedules specifically — "does this spike align with the hourly compaction job" is a five-minute check that saves hours of guessing.

!!! example "Incident narrative"
    A service's p99 latency spiked to 4× normal for about 15 seconds every 5 minutes, with no corresponding traffic spike. It took a day to correlate the pattern with a metrics-aggregation job that ran on the same host every 5 minutes and briefly consumed 3 of the host's 4 CPU cores. Moving the metrics job to a dedicated sidecar with a CPU limit resolved it immediately — the fix was cheaper than the multi-day investigation that found it.

---

## Data Issues

Failures that live in the data itself, not the network or the process — these are often the hardest to reproduce because they depend on the *shape* of specific data, not just load.

### Hot Partition / Hot Key

**Symptom:** One shard, partition, or cache key receives dramatically more traffic than its siblings, saturating that single node while the rest of the cluster sits idle.

**Root cause:** A partitioning scheme that doesn't account for skewed access patterns — a celebrity user, a viral post, a popular product ID, or a partition key like "date" where "today" gets 1000× the traffic of any other day.

**Mitigation:** Choose partition keys with high cardinality and even access distribution (consistent hashing helps distribute *storage* evenly but not necessarily *access* — see [Consistent Hashing](../databases/consistent-hashing.md)), add a random suffix to hot keys to spread them across multiple partitions ("key salting"), and cache hot keys at a layer in front of the partitioned store so the partition itself never sees the full request volume.

!!! example "Incident narrative"
    A social platform sharded posts by `user_id`. When a celebrity account posted something that went viral, every read for that post hit the single shard holding that user's data, saturating it while 999 other shards idled. The fix was a read-through cache in front of the shard layer plus detection logic that replicates a post's data across multiple nodes once its read rate crosses a threshold.

### Clock Skew

**Symptom:** Events appear out of order, "expired" tokens are rejected before their actual expiry, or distributed locks/leases are released early or held past their intended duration — all without any obvious application bug.

**Root cause:** Server clocks drift relative to each other (NTP sync issues, VM host clock jumps, leap seconds) and code that assumes wall-clock timestamps from different machines are directly comparable.

**Mitigation:** Use logical clocks (Lamport timestamps, vector clocks) or hybrid logical clocks for ordering instead of raw wall-clock time where correctness depends on order, add a tolerance buffer around any expiry/lease comparison, and monitor NTP sync drift across the fleet as an infrastructure SLO, not an afterthought.

!!! example "Incident narrative"
    A distributed lock implementation used wall-clock timestamps to determine lease expiry. One node's clock had drifted 8 seconds ahead due to a misconfigured NTP client. That node repeatedly believed leases held by other nodes had already expired and stole them mid-operation, causing duplicate processing of the same job until the clock drift was noticed and NTP was fixed.

### Poison Messages

**Symptom:** A queue consumer crashes, hangs, or throws repeatedly on one specific message, and if the message is auto-requeued on failure, that one message effectively blocks the entire queue or gets redelivered forever.

**Root cause:** A malformed, unexpectedly-shaped, or edge-case message that the consumer's code doesn't handle, combined with a redelivery policy that has no cap — "retry forever" turns one bad message into a permanent outage for that queue.

**Mitigation:** Dead-letter queues with a max redelivery count, defensive deserialization that catches and logs malformed messages rather than crashing the consumer process, and alerting on DLQ depth so poison messages are visible and triaged rather than silently piling up.

!!! example "Incident narrative"
    A payment-events consumer crashed on startup parsing a message with a null field that an old, deprecated producer still occasionally emitted. Because the queue redelivered unacked messages to a fresh consumer instance, every restart immediately crashed again on the same message, taking the entire consumer group offline for 40 minutes until someone manually purged the single bad message.

---

## Dependency Failures

Failures that originate entirely outside your service, in something you called — and the ways your own code can turn "a dependency is having a bad day" into "my service is now also having a bad day."

### Slow Dependency Without a Timeout

**Symptom:** A single downstream call that would normally take 20ms starts taking 30 seconds; nothing crashes, but the calling service's threads, connections, or event-loop capacity gets consumed waiting, and unrelated requests start failing.

**Root cause:** No timeout set on the outbound call (or a timeout set absurdly high, like a default of 30-60s), so the calling code waits as long as the dependency is willing to make it wait — turning the dependency's latency into your own resource exhaustion problem.

**Mitigation:** Set every outbound call's timeout below the caller's own SLO, treat "no explicit timeout configured" as a code review blocker, and pair timeouts with the resource sizing math in [Circuit Breakers](circuit-breakers.md) — a pool is only correctly sized once you know the maximum hold time.

!!! example "Incident narrative"
    A checkout service called a third-party tax-calculation API with the HTTP client's default timeout of 60 seconds. When the tax API's database began locking, calls started taking 45-55 seconds instead of the usual 100ms. Checkout's own thread pool — sized for 100ms calls — exhausted within two minutes, and the storefront started failing unrelated requests like login and cart updates.

### Cascading Timeouts

**Symptom:** A request chain A → B → C → D has a timeout budget that isn't divided sensibly across hops, so by the time the failure surfaces at A, several seconds (or the full budget of every hop) have been wasted rather than failing fast.

**Root cause:** Each service in a call chain sets its own timeout independently without an overall deadline being passed down the chain, so A might wait 10s for B, which waits 10s for C, which waits 10s for D — a single slow leaf can make the whole chain take 30+ seconds instead of failing at the point closest to the problem.

**Mitigation:** Propagate a single deadline (not a fixed timeout) down the call chain — each hop computes "how much time is left" rather than resetting its own clock — and ensure each hop's timeout budget shrinks as you go deeper, so the leaf fails faster than its caller's own SLO allows for.

!!! example "Incident narrative"
    An API gateway had a 5s timeout on its call to a mid-tier service, which itself had an independent 5s timeout on its call to a backend service. When the backend started timing out, requests failing at the backend after 5s were retried once by the mid-tier (another 5s), and the whole chain took 10-15s to fail at the gateway — well past the gateway's own advertised 3s SLO — instead of the backend failing fast within a shared 3s budget.

---

## Key Takeaways

!!! success "Remember"
    1. Most catastrophic outages are not one failure — they're a normal failure (a slow dependency, an expired TTL, a network blip) meeting a system that **amplifies** it (unbounded retries, no timeout, no quorum, no jitter).
    2. Resource exhaustion is rarely sudden — it's a slow leak or a missing bound that finally crosses a threshold. Dashboard the trend, not just the current value.
    3. Anything involving "who is in charge" (leader election, locks, partitions) needs a strict quorum and fencing — assuming the network is reliable is how split brain happens.
    4. Skewed access patterns (hot keys) break systems that are correctly designed for *even* load — always ask "what if 90% of traffic hits one key?" in a design review.
    5. Naming the failure mode is half the diagnosis. "This looks like a retry storm" or "this smells like a hot partition" gets you to the mitigation pattern faster than re-deriving it from first principles at 2am.

**Previous:** [Reliability](index.md) | **See also:** [Circuit Breakers](circuit-breakers.md), [Debugging Playbook](../observability/debugging-playbook.md)
