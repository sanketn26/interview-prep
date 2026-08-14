---
title: Microservices vs. Monolith — Antipatterns and Tradeoffs
description: Why orgs adopt microservices, what breaks when they do it wrong, and when a monolith was the right call.
prerequisites:
  - Architecture Patterns overview
  - Distributed Systems fundamentals
---

# Microservices vs. Monolith — Antipatterns and Tradeoffs

**Prerequisites:** [Architecture Patterns](index.md), [Distributed Systems](../distributed-systems/fundamentals.md)

[← Back to Patterns](index.md)

---

## Why This Exists

Microservices is the most expensive architectural decision most companies make, and the most poorly understood. The pitch is always "scalability," but **the real pressure is organizational: many teams cannot coordinate inside one deployable.** A startup of 5 people does not have this pressure. A company of 500 across 100 teams does.

This page cuts through the hype: when to adopt microservices (late, not early), what breaks when you do it wrong (everything), and what you should do instead (modular monolith, until the pain is undeniable).

---

## Mental Model: Where Microservices Fit in Your Timeline

```
┌─────────────────────────────────────────────────────────────────┐
│ STARTUP (1–20 people, 1–2 years)                               │
│ ✓ One monolithic service, one database                          │
│ ✓ Everyone deploys the same code                               │
│ ✓ Move fast; complexity is a future problem                    │
│ × Microservices = 10× slower delivery for 0 problems solved    │
└─────────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────────┐
│ GROWTH (20–100 people, 2–5 years)                              │
│ ✓ One modular monolith, clear internal boundaries              │
│ ✓ Different teams own different "domains" but deploy together  │
│ ✓ Local transactions across domains still work (one DB)        │
│ ✓ Testing is fast; debugging is straightforward                │
│ ⚠ Teams starting to step on each other's deploys              │
│ × Only extract a service if a boundary shows concrete pressure │
└─────────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────────┐
│ SCALE (100+ people, 5+ years, many independent teams)          │
│ ✓ Microservices, when boundary pressures are undeniable        │
│ ✓ Different services, different deployment cadences            │
│ ✓ Team ownership is explicit (service per team)                │
│ ✗ Debugging is now distributed                                 │
│ ✗ Every call can fail three ways                               │
│ ✗ Ops complexity explodes (containers, orchestration, tracing) │
│ ✗ A feature that was one transaction is now a saga             │
└─────────────────────────────────────────────────────────────────┘
```

**The pattern:** Almost no company got it right the first time. AWS started as a monolith. Uber started as a monolith. Netflix started as a monolith. The companies that grew fast with microservices from day one are... none that matter. The companies that grew fast, period, are the ones that delayed the decision until the pain was real.

---

## The Organizational Pressure, Not Scaling

**What everyone says:** "We need microservices for scalability."

**What they actually mean (if they're honest):** "We have 40 engineers and three teams; they keep breaking each other's deploys and stepping on each other's changes."

That is a real problem. It is not, however, a *technology* problem. It is an *organizational* problem. Microservices is one answer; a modular monolith with clear team ownership is often a better first answer.

**Scaling a monolith:** a well-built monolith scales horizontally without touching architecture. Deploy 10 copies behind a load balancer, each reads from the same database, and you've just 10× throughput. The database may become the bottleneck, but that is a data-layer problem, not a monolith-is-broken problem.

**Scaling across teams:** this is where monoliths actually break. When teams have independent release cadences, one team's deploy broke three others' tests, and it takes 45 minutes to ship a one-line fix, the pain is acute.

The solution microservices offers: **each service has an owner, a boundary, and an independent deploy cycle.** The organization now reflects in the architecture — Conway's Law in action.

---

## What You Gain (And What It Actually Costs)

### ✓ Independent Deployment

A team ships their service without coordinating with 30 others. No more "we need to wait for the Wednesday deploy window." No more cross-team test suites that take an hour to run.

**Cost:** Every deploy is now a versioned contract negotiation. The API you shipped yesterday must remain compatible with clients on version N-2 for six months, or those services break. A monolith: break the interface, run the tests, ship. A microservices: break the interface in service A, and if service B hasn't upgraded its client library, service B is now silently failing on calls to A.

### ✓ Independent Scaling

If the order service gets traffic spikes during Black Friday, you scale only the order service. You don't scale the recommendation engine or user service if they're fine.

**Cost:** You now need to monitor not one service's capacity, but N. You need to measure not one critical path, but N independent critical paths that may interact in surprising ways. A 10 ms spike in the auth service becomes a 100 ms tail latency spike for orders if orders call auth on every request. You now have to think about what calls what, and order them to hide latency.

### ✓ Fault Isolation

If the recommendation service crashes, users can still place orders. The failure is isolated.

**Cost:** The order service's tests no longer fail when it breaks, because recommendations isn't involved. You need explicit integration tests. You need circuit breakers. You need to define (and enforce) which services can call which. A silent cascade — service A calls B, which calls C, which has a bug that makes it flake — is now plausible. A monolith makes this cascade explicit (the stack trace shows all three). A microservices makes it a distributed tracing puzzle.

---

## Antipattern 1: Shared Database Across Services

**The scenario:**
```
┌─────────────┐  ┌──────────────┐
│ Order svc   │  │ Inventory    │
└──────┬──────┘  └──────┬───────┘
       │                │
       └────────┬───────┘
                │
          ┌─────▼─────┐
          │  Monolith │
          │  Database │
          └───────────┘
```

Each service has its own code but they all read/write the same database. At first, this feels like a win: "We got the benefits of microservices without the operational overhead!"

**Why this fails:**
- **You lose data ownership.** Order service assumes a particular schema for `users` table; inventory service updates the schema; order service's code breaks silently because it wasn't in the deploy chain.
- **Transactions stop working.** A transaction that spans two tables is now a transaction that spans two services. One service commits; the other rolls back mid-flight. You've built a distributed transaction without the safety of one.
- **You haven't actually decoupled anything.** The services still fail together. Database is down? Both down. Schema change? Both services need recompilation. You paid for microservices complexity (distributed tracing, versioned APIs, independent deployment choreography) and got none of the benefits.

**The fix:** Each service owns its schema. If order service needs the user's email, inventory service's `users` table is not the source of truth — order service has its own `users` table (synchronized from a user service or event stream) or queries user service on demand.

**When this is okay:** Never, really. It feels okay in year 1. In year 3, when you have 40 services on a database and a schema change requires coordinating all 40, you will regret it.

---

## Antipattern 2: Services Too Fine-Grained (Chatty Services)

**The scenario:**
```
Order service needs to:
  1. Create order (order-svc)
  2. Reserve inventory (inventory-svc)
  3. Charge card (payment-svc)
  4. Update user loyalty points (loyalty-svc)
  5. Send confirmation email (email-svc)
  6. Log to analytics (analytics-svc)

OrderService.CreateOrder():
  POST /inventory/reserve
  POST /payment/charge
  POST /loyalty/add-points
  POST /email/send
  POST /analytics/log
  
Everything blocks on all 5 calls. 
One slow email service makes order creation slow.
One flaky loyalty service makes orders fail randomly.
```

You have created a monolith made of HTTP calls instead of function calls. All the latency, all the failure modes, and none of the deployability benefits (because you're still coordinating between six services on every order).

**Why this happens:** Teams often design services by technical layer (database service, email service, analytics service) instead of by business capability. Each layer is "small" so it seems like a good idea. Then you have 40 services that each call 8 others, and the transaction graph looks like spaghetti.

**The fix:**
- **Design by business capability, not technical layer.** One "order fulfillment" service owns orders, inventory, payment, and loyalty — they're logically one transaction. Email and analytics? Fire-and-forget (async), or move them out of the critical path.
- **Async is your friend.** After an order is placed, publish an `OrderCreated` event. Loyalty service, email service, and analytics all react asynchronously. The order returns to the user immediately; background jobs handle the rest.
- **Measure critical path latency.** If a request waits on four services in sequence (1 + 2 + 3 + 4 = 8 ms each = 32 ms) plus one that is sometimes slow (payment: p50 = 50 ms, p99 = 5000 ms), your user experience is broken by that one outlier. Redesign to move it off the critical path.

---

## Antipattern 3: Circular Dependencies

**The scenario:**
```
User svc → Auth svc → User svc
  "Validate user"     "Load user roles"
```

Service A calls B, which calls A. At deploy time, which one deploys first? A can't deploy if B isn't compatible with the new API. B can't deploy if A isn't compatible. You're deadlocked.

In a monolith, this is a compile error. With services, it's a subtle runtime cascade that fails at 3am in production.

**The fix:** There's no clean technical fix — the problem is architectural. You have a cycle, which means these services should probably be one service. Or you need to introduce a third service that both call. Or you introduce an event bus (both publish to, rather than call each other).

**How to detect it:** Map your service dependency graph. If there's a cycle, you have this antipattern. Cycles make independent deployment impossible.

---

## Antipattern 4: Synchronous Everything

**The scenario:**
```
POST /orders creates an order.
Service makes these calls:
  1. Check inventory
  2. Charge card
  3. Create shipment
  4. Send confirmation email
  5. Update analytics
  
All synchronous. All block the user's request.
One slow email service (or analytics endpoint)
makes the order creation endpoint slow.
```

**Why this fails:** You've networked every call but left all the tight coupling. User's order endpoint now depends on email service's reliability. Email service is down? Users can't place orders.

**The fix:** Move non-critical operations off the critical path. After creating the order, publish an `OrderCreated` event. Let consumers react:
- Email service subscribes, sends email
- Analytics service subscribes, updates dashboard
- Loyalty service subscribes, updates points
- All asynchronously

Now the order returns in <100ms regardless of email/analytics latency.

---

## Antipattern 5: Services Without Clear Ownership

**The scenario:**
```
Fifteen services, forty engineers, no clear ownership.
- Who owns the auth service?
- Who responds to pages?
- Who owns the SLA?
- Who can deploy it?
```

**Why this fails:** Microservices only work if the organization reflects in the architecture. One team, one service. Clear accountability. Without it, you get "it's someone else's problem" — bugs don't get fixed, deploys don't happen, and the service becomes a shared tax on everyone.

**The fix:** Conway's Law: **Make your org structure match your service structure.** One team, one service. That team owns the SLA, the deploys, the alerts, and the pager rotation.

---

## The Real Tradeoffs

### Debugging

**Monolith:**
```
User reports: "Orders aren't placing."
Stack trace shows:
  OrderService.create() → 
    InventoryService.reserve() →
      Database.reserve() 
      ❌ Unique constraint violation
```

One place. One stack trace. One mental model.

**Microservices:**
```
User reports: "Orders aren't placing."
Look at order-svc logs: "⏱ Timeout calling inventory-svc"
Look at inventory-svc logs: "⏱ Timeout calling db-svc"
Look at db-svc logs: "Database pool exhausted"
Look at network: "packet loss between inventory-svc and db-svc"
Look at infrastructure: "AZ us-east-1a had a network event"

Now trace back: why did packet loss cause pool exhaustion?
Why did pool exhaustion cause this specific order to fail, not the last one?

Distributed tracing helps (Jaeger, Datadog), but it's a tax.
```

**Cost:** You need distributed tracing. You need observability (SLI/SLO/error budgets) everywhere. You need runbooks for cascading failures.

### Data Consistency

**Monolith:**
```sql
BEGIN;
  INSERT INTO orders (user_id, item_id) VALUES (7, 42);
  UPDATE inventory SET stock = stock - 1 WHERE id = 42;
  UPDATE accounts SET balance = balance - 25 WHERE user_id = 7;
COMMIT;
```

Atomic. All or nothing. No in-between states.

**Microservices:**
```python
# Order created
POST /inventory/reserve → succeeds
POST /payment/charge → times out (network hiccup)

# Now what?
# - User was charged but order wasn't reserved? 
# - We refund, but user still sees order in dashboard?
# - How do we even know the payment went through?

# This is a saga (see Architecture Patterns)
# Requires compensations:
if inventory_ok and payment_ok:
  finalize_order()
else:
  refund_user()  # Compensate
  release_inventory()  # Compensate
```

**Cost:** Sagas are harder to reason about. Intermediate states are visible (and the system must be correct in any of them). Schema evolution becomes a nightmare (if the event was "order placed," and you later add a field "urgency," how do you handle old events that don't have it?).

### Operational Complexity

**Monolith:**
- Deploy: push code, run tests, deploy to prod
- Monitor: one service's metrics
- Scale: spawn more replicas
- Secrets: one list of env vars

**Microservices:**
- Deploy: coordinate 40 services, manage API versions, handle partial failures
- Monitor: 40 services' metrics, correlation IDs to trace requests across them
- Scale: each service scales independently, but they interact; scaling auth doesn't help if orders is the bottleneck
- Secrets: 40 services × secrets management, rotation policies, access control
- Networking: service discovery, retry logic, circuit breakers, mutual TLS
- Debugging: distributed tracing, correlation IDs, aggregated logs

**Cost:** DevOps becomes a primary responsibility. Kubernetes becomes a requirement (or equivalent orchestration). Observability isn't optional.

### Team Autonomy

**Monolith:**
- Push a change, all tests run, deploy to prod
- Coordinate with other teams before deploying
- Move fast, but have to wait for the team working on the critical path

**Microservices:**
- Push a change, your service's tests run, deploy independently
- No coordination (but you must maintain API backwards compatibility)
- Move very fast; also very easy to break dependencies silently

**Cost:** You move faster on your service, but the system's coherence is harder to maintain.

---

## When Each Architecture Is Right

### Start With a Modular Monolith

A monolith with clear internal boundaries — think DDD (domain-driven design) bounded contexts — is the right first choice for almost everyone. It has:

- Fast iteration (no distributed-tracing tax)
- Simple debugging (one stack trace)
- Easy transactions (real ACID)
- Shared data structures (if bounded contexts have data overlap, one source of truth)

Extract a service only when you have a *concrete* pressure:

1. **Independent scaling:** One part of the system takes 90% of traffic. Extracting it saves money and headroom.
2. **Independent release cadence:** Your team ships ten times a day; another team ships once a week. Extracting decouples them.
3. **Team ownership friction:** One service is owned by a team that's always on-call, burning out. Splitting lets them own less.

### When Microservices Becomes Necessary

- **50+ engineers** across multiple teams with independent roadmaps
- **Multiple deployment cadences** (some teams deploy 10x/day, others 1x/week)
- **Regulatory isolation** (payment service must be owned by different team for compliance)
- **Technology diversity** (one service is Go, another is Python; monolith doesn't fit)

### Use Serverless to Skip the Ops Tax

If the real pressure is "we need independent deployment and scaling without the ops complexity," **consider serverless (AWS Lambda, GCP Cloud Functions, Azure Functions) before microservices.**

Serverless gives you:
- ✓ Independent scaling (function-level)
- ✓ Independent deployment (push code, it runs)
- ✓ No infrastructure to manage
- ✗ Cold start latency
- ✗ Costs can be unpredictable at scale
- ✗ Vendor lock-in

You get many benefits of microservices without building and operating a container orchestration system.

### Monolith With Database Sharding

If scaling is the only pressure (not team independence), **shard the monolith's database, not the code.**

```
Monolith (one codebase, same binary deployed 40 times)
├─ Instance 1 handles shard A
├─ Instance 2 handles shard B
└─ Instance 3 handles shard C
```

Each instance routes requests to the right shard. Data is independent (shard A's inventory doesn't affect shard B's). Scaling is clean. Debugging is still straightforward.

---

## Real Case Study: Netflix's Microservices Transition

Netflix didn't start with microservices.

**2008–2009:** Monolith (Java), runs on AWS, stores everything in Oracle. Black Friday causes outages because the database connection pool exhausts. Cost is scaling linearly with customers.

**Pressure:** 
- Database can't scale. Oracle is expensive.
- Deploy cycle is slow (monolith is massive).
- AWS started having outages; Netflix needed resilience.

**Transition (2009–2011):**
- Extract critical services: recommendations, user service, streaming decisions
- Each team own one service
- Deploy independently (but discovered chaos — services broke each other)
- Added monitoring, circuit breakers, fault injection (Chaos Monkey)

**Learnings:**
- Service boundaries should reflect how teams work
- Async is critical (don't make the streaming decision wait on recommendations)
- You need pervasive observability (Hystrix, Eureka, Servo)
- Failures are the norm; design for them

**Cost:** 3 years, rebuilt most of the platform. But now Netflix can:
- Deploy 4,000 times per day (across all services)
- Survive AWS region failures
- Scale individual services independently
- Let 200 teams work without stepping on each other

**Would they do it earlier?** Probably not. They started with a monolith because speed mattered more than scale. When they hit the wall, they had the resources and need to rebuild.

---

## Interview Questions

=== "Foundation"
    **Q: When should you adopt microservices?**
    
    "When you have an *organizational* pressure, not a scaling one. The real pressure is multiple teams with independent release cadences stepping on each other in a monolith. A monolith scales fine horizontally (put 10 copies behind a load balancer). But 40 engineers coordinating deploys is a problem. Start with a modular monolith with clear team ownership. Extract a service only when a boundary shows concrete pressure: independent scaling, independent deployment, or team isolation needs."
    
    **Q: What's the cost of microservices?**
    
    "Every in-process function call becomes a network call that can fail or time out. Debugging needs distributed tracing. Transactions become sagas (losable intermediate states). Observability is mandatory. Ops complexity explodes. The org needs clear team-to-service mapping. It's not free."

=== "Senior"
    **Q: You're a 50-engineer startup. Should you adopt microservices?**
    
    "Not yet. Start with a modular monolith. Clear package/module boundaries, each module owned by a team, but one deploy pipeline. As you grow (80+ engineers, multiple release cadences), identify which boundaries have concrete pressure (independent scaling, independent deployment) and extract those to services. The companies that adopted microservices too early spent 2 years fighting ops instead of building product. The companies that delayed extracted only what was truly necessary."
    
    **Q: What would make you extract a service from a monolith?**
    
    "Three things: (1) A boundary that scales differently (orders get 90% of traffic; recommendations get 10%; scaling separately saves cost), (2) Independent release cadence (payment team needs to deploy per PCI requirements; product team ships 10x/day), (3) Team ownership isolation (this module is owned by a different company org and has different SLOs). If none of those is true, the cost of extracting probably exceeds the benefit."

=== "Staff"
    **Q: Design a migration from monolith to microservices for a 200-engineer company.**
    
    "First, map the current org structure to modules. Conway's Law: the service structure will eventually match the org. If you have a payments team, billing team, orders team, etc., those become services. Start with the team(s) that have the most independent release pressure. Extract one boundary at a time; each extraction is a full project (DB migration, API contract definition, monitoring setup).
    
    Use strangler fig pattern: sit a reverse proxy in front of the monolith. Route `/payments/*` to the new payments service; everything else still hits the monolith. Gradually move traffic. When the monolith route is empty, delete the monolith branch.
    
    Invest in observability first: correlation IDs, distributed tracing (Jaeger), SLI/SLO tracking. When a request spans 5 services, you need to know which one is slow or failing.
    
    Plan for 18–24 months. This is not a quick project. Build a platform team to own infrastructure: service discovery, secrets management, deployment pipeline, monitoring templates.
    
    Common pitfall: extracting too many services too fast. You'll regret it. Extract the minimum necessary; re-combine services if they turn out to be too chatty."

---

## Key Takeaways

!!! success "Remember"
    1. **Microservices solve an organizational problem, not a scaling one.** A monolith scales fine behind a load balancer.
    2. **The cost is real:** every call is a network call that can fail or be slow; debugging needs distributed tracing; transactions become complex.
    3. **Start with a modular monolith.** Extract a service only when a boundary shows concrete pressure (independent scaling, independent deployment, team isolation).
    4. **Never share a database across services.** Each service owns its data; sync via events or API.
    5. **Avoid chatty services.** Design by business capability (one transaction = one service or async steps), not by technical layer.
    6. **Services need explicit ownership.** One team, one service. Conway's Law.
    7. **Async is your friend.** Move non-critical operations off the critical path; use events/queues.
    8. **Invest in observability first.** Distributed tracing, correlation IDs, SLI/SLO. You'll need them.
    9. **Consider serverless first.** If you just need independent scaling/deployment without ops complexity, serverless might be better.
    10. **The timing is wrong for 90% of teams.** Wait until the pain is undeniable. There's no prize for being early.

---

**Previous:** [Sagas](sagas.md)

