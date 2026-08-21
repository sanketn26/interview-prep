---
title: Cache Stampede
description: Understanding cache stampedes and how to prevent them — mutex locks, jitter, and stale-while-revalidate.
---

# Cache Stampede

**Prerequisites:** [Caching Strategies](cache-strategies.md)

---

## Why This Exists

Your cache is working perfectly — 99% hit rate, DB load is 1% of what it would be without the cache. Then a hot key expires.

In the next millisecond, 1,000 clients all miss the cache simultaneously. All 1,000 send the same query to the database. The DB, previously handling 10 req/s, suddenly gets 1,000 req/s. It slows down. That makes the cache miss window longer, so more clients pile up. The DB crashes. All services depending on it fail.

This is a **cache stampede** (also called **thundering herd**).

---

## Mental Model

```
Normal operation:                  After hot key expires:

Client₁ ──→ Cache HIT              Client₁ ──→ Cache MISS ──→ DB ──┐
Client₂ ──→ Cache HIT              Client₂ ──→ Cache MISS ──→ DB   │ DB
Client₃ ──→ Cache HIT              Client₃ ──→ Cache MISS ──→ DB   │ over-
...                                ...                              │ loaded!
Client₁₀₀₀ → Cache HIT            Client₁₀₀₀ → Cache MISS ──→ DB ─┘
```

---

## Interactive Simulation

<div class="sim-container">
  <div class="sim-title">💥 Cache Stampede Simulator</div>

  <div class="sim-controls">
    <button class="sim-btn" onclick="document.getElementById('strat-none').click()">Strategy: None</button>
    <button class="sim-btn success" onclick="document.getElementById('strat-lock').click()">Strategy: Mutex Lock</button>
    <button class="sim-btn success" onclick="document.getElementById('strat-jitter').click()">Strategy: Jitter</button>
    <button class="sim-btn success" onclick="document.getElementById('strat-stale').click()">Strategy: Stale-While-Revalidate</button>
  </div>
  <div style="display:none">
    <input type="radio" id="strat-none" name="strat" value="none" onclick="window._stampede && window._stampede.setStrategy('none')" checked>
    <input type="radio" id="strat-lock" name="strat" value="lock" onclick="window._stampede && window._stampede.setStrategy('lock')">
    <input type="radio" id="strat-jitter" name="strat" value="jitter" onclick="window._stampede && window._stampede.setStrategy('jitter')">
    <input type="radio" id="strat-stale" name="strat" value="stale" onclick="window._stampede && window._stampede.setStrategy('stale')">
  </div>

  <div style="margin:1rem 0">
    <button class="sim-btn danger" onclick="window._stampede && window._stampede.expireKey()">💣 Expire Hot Cache Key</button>
  </div>

  <div id="stampede-canvas"></div>

  <div class="sim-stats">
    <div class="sim-stat">
      <div class="sim-stat-label">Cache Status</div>
      <div class="sim-stat-value" id="stampede-cache">HIT</div>
    </div>
    <div class="sim-stat">
      <div class="sim-stat-label">DB Queries</div>
      <div class="sim-stat-value" id="stampede-db-load">1</div>
    </div>
    <div class="sim-stat">
      <div class="sim-stat-label">Clients</div>
      <div class="sim-stat-value" id="stampede-clients">100</div>
    </div>
  </div>

  <div class="sim-log" id="stampede-log"></div>
</div>

**Try each strategy:** Expire the key with Strategy=None first (observe the DB flood), then switch strategies and observe the difference.

---

## Solutions

### 1. Mutex / Lock

Only one request goes to the database. All others wait (or serve stale data).

```python
import time
import redis

cache = redis.Redis()

def get_user(user_id: str) -> dict:
    key = f"user:{user_id}"
    cached = cache.get(key)
    if cached:
        return json.loads(cached)

    # threading.Lock() only coordinates threads in this process, not across pods.
    # Distributed single-flight: SET NX across the fleet.
    lock_key = f"lock:{key}"
    acquired = cache.set(lock_key, "1", nx=True, ex=10)
    if acquired:
        try:
            cached = cache.get(key)  # double-check after lock
            if cached:
                return json.loads(cached)
            result = db.query("SELECT * FROM users WHERE id = ?", user_id)
            cache.setex(key, 300, json.dumps(result))
            return result
        finally:
            cache.delete(lock_key)

    time.sleep(0.05)  # lost the race — wait, then re-read
    cached = cache.get(key)
    if cached:
        return json.loads(cached)
    result = db.query("SELECT * FROM users WHERE id = ?", user_id)
    cache.setex(key, 300, json.dumps(result))
    return result
```

**Pros:** One DB fetch per key across pods (Redis SET NX / single-flight)
**Cons:** Other requests wait (or you serve stale); lock expiry must exceed fetch time

### 2. TTL Jitter

Add randomness to cache expiry so not all copies expire simultaneously:

```python
import random

def cache_set(key: str, value: any, base_ttl: int = 300):
    # Add ±20% jitter to TTL
    jitter = random.randint(-base_ttl // 5, base_ttl // 5)
    cache.setex(key, base_ttl + jitter, json.dumps(value))
```

**Best for:** Preventing synchronized expiry of many keys (e.g., all user sessions set at login → expire at exactly the same time)

**Cons:** Doesn't help with a single extremely hot key

### 3. Stale-While-Revalidate

Serve stale (expired) data immediately while refreshing in the background:

```python
import time
import threading

def get_with_stale(key: str, fetch_fn, ttl=300, stale_ttl=30):
    data = cache.get(key)
    meta = cache.get(f"{key}:meta")

    if data and meta:
        meta = json.loads(meta)
        age = time.time() - meta['set_at']
        if age < ttl:
            return json.loads(data)  # fresh
        elif age < ttl + stale_ttl:
            # Stale but serve immediately, refresh in background
            threading.Thread(target=_refresh, args=(key, fetch_fn, ttl)).start()
            return json.loads(data)  # stale but fast

    # Cache miss — fetch synchronously
    return _refresh(key, fetch_fn, ttl)

def _refresh(key, fetch_fn, ttl):
    result = fetch_fn()
    cache.setex(key, ttl + 30, json.dumps(result))
    cache.setex(f"{key}:meta", ttl + 30, json.dumps({'set_at': time.time()}))
    return result
```

**Best for:** High-traffic endpoints where slightly stale data is acceptable (homepage, product listings, trending content)

### 4. Early Recomputation (Probabilistic)

Randomly recompute before expiry — probability increases as TTL approaches:

```python
import math
import random

def get_with_early_recompute(key: str, fetch_fn, ttl=300, beta=1.0):
    result = cache.get(key)
    if result:
        data, expiry = json.loads(result)
        remaining = expiry - time.time()
        # Increase recompute probability as TTL runs out
        if -beta * math.log(random.random()) < remaining:
            return data  # serve from cache

    # Recompute (either expired or early recompute triggered)
    fresh = fetch_fn()
    cache.setex(key, ttl, json.dumps([fresh, time.time() + ttl]))
    return fresh
```

---

## Failure Modes

### Cache Avalanche
Multiple keys expire at the same time (e.g., cache restart, bulk TTL set).

**Symptoms:** Periodic DB spike, correlates with cache deploys or bulk operations
**Fix:** Stagger TTLs, warm cache before cutover, circuit breaker on DB

### Cache Penetration
Requests for keys that **don't exist** in cache or DB — cache can't help, every request hits DB.

**Cause:** Often from bots/scrapers querying non-existent IDs, or bugs generating invalid keys
**Symptoms:** DB load high and cache **hit rate is low** — every unknown key is a miss. A *high* hit rate of empty results is what you see **after** negative caching, not before.
**Fix:** Cache negative results (cache `null` with short TTL), Bloom filter to reject clearly non-existent keys

### Cache Breakdown
A very hot key expires while under extreme load — similar to stampede but specific to a single key that has no replicas.

**Fix:** Hot key replication, never-expire with manual invalidation

---

## Production Debugging

```
Symptom: DB CPU spike every 5 minutes

Investigation:
1. Check cache TTL settings
   → Are all keys set with the same TTL?
   → redis-cli TTL key → all expire at the same second?
2. Check cache miss rate spike pattern
   → cache_miss_rate metric → spikes at regular intervals?
3. Correlate with DB slow query log
   → Same query type flooding DB?
4. Check for cache restart events
   → Redis restart → all keys gone → full stampede

Fix:
- Add jitter to TTLs (±20%)
- Implement stale-while-revalidate for hot endpoints
- Cache warming strategy after Redis restart
```

---

## Trade-offs

| Strategy | Latency | DB Load | Staleness | Complexity |
|----------|---------|---------|-----------|------------|
| No protection | Very high during miss | Very high | Fresh | None |
| Mutex lock | High during miss (waiting) | Low (1 req) | Fresh | Low |
| TTL Jitter | Normal | Medium | Fresh | Very Low |
| Stale-while-revalidate | Always low | Low | Slightly stale | Medium |
| Early recompute | Always low | Very low | Slightly stale | Medium |

---

## Interview Questions

=== "Basic"
    **Q: What is a cache stampede and how do you prevent it?**

    "A cache stampede occurs when a popular cached key expires and many concurrent requests all miss the cache simultaneously, flooding the database with identical queries. Prevention strategies: (1) Mutex lock — only one request regenerates the cache; (2) TTL jitter — randomize expiry times to prevent synchronized expiration; (3) Stale-while-revalidate — serve stale data instantly while refreshing in background."

=== "Senior"
    **Q: When would you use stale-while-revalidate vs mutex locks?**

    "They address different trade-offs. Stale-while-revalidate is best when users can tolerate slightly stale data — home page recommendations, trending topics, product listings. It gives the best latency (always fast) but the data might be seconds/minutes old. Mutex locks are for data that must always be fresh — user account balances, permission checks. The downside is users queue during the miss window. I'd also consider the combination: mutex + serving stale to waiting requests while one thread fetches fresh data."

=== "Staff"
    **Q: Our Redis cluster failed and came back after 5 minutes. How do you prevent a DB-killing stampede on recovery?**

    "This is a cache avalanche scenario — all keys are gone simultaneously. Strategy: (1) Circuit breaker on the DB layer — if DB request rate exceeds N×normal, shed load with a 503 rather than cascading failure; (2) Progressive cache warming — on Redis recovery, actively warm the most critical/hot keys before routing traffic back; (3) Read-through cache with concurrency limit — cap simultaneous DB queries to DB capacity rather than letting all traffic through; (4) Feature flags — disable non-critical features temporarily to reduce read load; (5) Multi-layer caching — local in-process cache (LRU) provides a last line of defense when Redis is gone."

---

## Key Takeaways

!!! success "Remember"
    1. Cache stampede = hot key expires + many concurrent misses → DB flood
    2. Mutex lock: one DB request, others wait — best for fresh-data requirements
    3. TTL jitter: prevents synchronized expiry across many keys — easiest to implement
    4. Stale-while-revalidate: always fast, slightly stale — best for high-traffic endpoints
    5. Cache penetration (non-existent keys) and avalanche (full cache loss) are related but distinct problems
    6. Always have a circuit breaker on the DB as the last line of defense

