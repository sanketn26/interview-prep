---
title: "Design: Payment Processing System"
description: Complete guided design of a payment processing system — idempotency, exactly-once, consistency, failure handling.
---

# Design: Payment Processing System

**Difficulty:** Senior/Staff | **Time:** 60–90 minutes

!!! warning "This is hard. That's the point."
    Payment systems are the canonical example of distributed systems correctness requirements. Money must never be created or destroyed. This design reveals most distributed systems challenges simultaneously.

---

## 1. Problem Statement

Design a payment processing system for an e-commerce platform. Users can pay for orders using cards or wallets. The system processes payments, handles failures gracefully, and never charges users incorrectly.

---

## 2. Clarifying Questions

??? question "What to ask"
    - **Payment methods:** Cards? Bank transfers? Wallets? Crypto?
    - **Integration:** Do we integrate with Stripe/Braintree or build PSP connections ourselves?
    - **Volumes:** Transactions per day? Peak TPS?
    - **Geographic scope:** Single country or global? Multiple currencies?
    - **Regulatory:** PCI DSS scope? 3D Secure? RBI regulations (India)?
    - **Refunds, disputes, chargebacks?**
    - **Idempotency:** What if a client retries a payment?
    - **SLA:** How long can payment be unavailable?

---

## 3. Functional Requirements

- Accept payments (card, wallet) for orders
- Process refunds
- Query payment status
- Handle failures with retries — never double-charge
- Audit trail: every state change persisted
- Notify order service of payment result

## 4. Non-Functional Requirements

| Property | Requirement | Reasoning |
|----------|-------------|-----------|
| Exactly-once processing | Critical | Double charge destroys user trust |
| Availability | 99.99% | Revenue directly impacted |
| Latency | < 3s p99 (card), < 500ms p99 (wallet) | User experience |
| Durability | Never lose a transaction record | Regulatory + trust |
| Consistency | Strong (no eventual) | Money correctness |
| Audit | Immutable event log | Regulatory, disputes |

---

## 5. Capacity Estimation

```
E-commerce platform:
  1M orders/day peak (sale season)
  70% paid by card, 30% by wallet
  1M / 86,400s ≈ 11.5 TPS average
  Peak (10×): ~115 TPS

Payment record storage:
  Per transaction: ~2 KB (all fields + audit)
  1M/day × 2 KB = 2 GB/day
  3-year retention: ~2 TB

Refunds: ~5% of transactions = 50K/day
```

!!! note "Note on TPS"
    115 TPS is not technically demanding. The challenge is **correctness** under failure, not raw throughput. Payment systems are hard because of distributed transactions, not scale.

---

## 6. API Design

```
POST /v1/payments
Request:
  {
    "idempotency_key": "order-789-attempt-1",  ← CRITICAL
    "order_id": "order-789",
    "amount": { "value": 2999, "currency": "INR" },
    "payment_method": {
      "type": "card",
      "token": "tok_visa_xxxx"    ← tokenized by frontend SDK
    },
    "return_url": "https://merchant.com/payment/complete"
  }
Response:
  {
    "payment_id": "pay_abc123",
    "status": "PENDING",      ← async processing
    "redirect_url": "https://3ds.bank.com/authenticate?..."
  }

GET /v1/payments/{payment_id}
Response: { "payment_id": "...", "status": "SUCCESS|FAILED|PENDING|REFUNDED" }

POST /v1/payments/{payment_id}/refund
Request:  { "amount": { "value": 2999, "currency": "INR" }, "reason": "customer_request" }
Response: { "refund_id": "ref_xyz", "status": "PENDING" }
```

!!! warning "Production Trap ⚠️"
    **Never handle raw card numbers** in your service. Use a frontend tokenization SDK (Stripe.js, Braintree SDK) — the card token is sent to PSP, not your server. This removes you from PCI DSS scope entirely.

---

## 7. Data Model

```sql
-- Payments table (source of truth)
CREATE TABLE payments (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    idempotency_key VARCHAR(255) UNIQUE NOT NULL,
    order_id        UUID NOT NULL,
    user_id         UUID NOT NULL,
    amount          BIGINT NOT NULL,      -- in smallest currency unit (paise, cents)
    currency        CHAR(3) NOT NULL,
    status          VARCHAR(20) NOT NULL, -- PENDING, PROCESSING, SUCCESS, FAILED, REFUNDED
    psp_reference   VARCHAR(255),         -- reference from Stripe/Braintree
    failure_reason  VARCHAR(500),
    created_at      TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMP NOT NULL DEFAULT NOW(),
    version         INT NOT NULL DEFAULT 0,  -- optimistic locking
    INDEX idx_order_id (order_id),
    INDEX idx_idempotency_key (idempotency_key),
    INDEX idx_user_id (user_id)
);

-- Immutable audit log (append-only)
CREATE TABLE payment_events (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    payment_id  UUID NOT NULL REFERENCES payments(id),
    event_type  VARCHAR(50) NOT NULL,  -- CREATED, PROCESSING, SUCCEEDED, FAILED, REFUND_INITIATED
    event_data  JSONB NOT NULL,
    created_at  TIMESTAMP NOT NULL DEFAULT NOW(),
    INDEX idx_payment_id (payment_id)
);

-- Outbox for reliable event publishing (Transactional Outbox Pattern)
CREATE TABLE payment_outbox (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    payment_id  UUID NOT NULL,
    event_type  VARCHAR(50) NOT NULL,
    payload     JSONB NOT NULL,
    published   BOOLEAN DEFAULT FALSE,
    created_at  TIMESTAMP DEFAULT NOW(),
    INDEX idx_unpublished (published, created_at)
);
```

---

## 8. Architecture

```mermaid
graph TD
    subgraph Client
        MobileApp[Mobile App]
        WebApp[Web App]
    end

    subgraph APIGateway["API Gateway"]
        GW[API Gateway\nAuth + Rate Limit]
    end

    subgraph PaymentService["Payment Service"]
        PS[Payment Service\nIdempotency + State Machine]
    end

    subgraph PSP["Payment Service Providers"]
        Stripe[Stripe]
        Razorpay[Razorpay]
        Juspay[Juspay]
    end

    subgraph Storage
        PG[(PostgreSQL\nPrimary — Multi-AZ)]
        RD[(Redis\nIdempotency Cache)]
    end

    subgraph Messaging
        KF[Kafka\npayment-events topic]
    end

    subgraph Consumers
        OS[Order Service]
        NS[Notification Service]
        AS[Analytics Service]
    end

    MobileApp --> GW
    WebApp --> GW
    GW --> PS
    PS -->|Check idempotency key| RD
    PS -->|Write payment + outbox| PG
    PS -->|Charge| Stripe
    PS -->|Charge| Razorpay
    Stripe -->|Webhook| PS
    PS -->|Outbox processor| KF
    KF --> OS
    KF --> NS
    KF --> AS
```

---

## 9. Critical Design: Idempotency

**The core problem:** Network failures cause clients to retry. Without idempotency, the same payment is processed multiple times.

```
Client                    Payment Service         Stripe

POST /payments ───────────→ Processing...
                           ──────────────→ Charge $29.99
(timeout!)                 ←────────────── Success!
Client doesn't know if
payment succeeded...
POST /payments (retry) ──→ ????
                          Should this create a new charge?
                          NO! Stripe already charged the user.
```

**Solution: Idempotency Key**

```python
class PaymentService:
    def create_payment(self, request: PaymentRequest) -> Payment:
        # 1. Check idempotency cache first
        cached = redis.get(f"idem:{request.idempotency_key}")
        if cached:
            return Payment.from_json(cached)  # return previous result

        # 2. Check DB for existing payment
        existing = db.query(
            "SELECT * FROM payments WHERE idempotency_key = ?",
            request.idempotency_key
        )
        if existing:
            redis.setex(f"idem:{request.idempotency_key}", 86400, existing.to_json())
            return existing

        # 3. Create new payment (with DB-level unique constraint)
        try:
            payment = Payment(
                idempotency_key=request.idempotency_key,
                status="PENDING",
                ...
            )
            db.insert(payment)
            redis.setex(f"idem:{request.idempotency_key}", 86400, payment.to_json())
            return payment
        except UniqueConstraintViolation:
            # Race condition: another request inserted first
            existing = db.query("SELECT * FROM payments WHERE idempotency_key = ?", ...)
            return existing
```

---

## 10. Payment State Machine

```mermaid
stateDiagram-v2
    [*] --> PENDING: POST /payments
    PENDING --> PROCESSING: PSP call initiated
    PROCESSING --> AWAITING_3DS: 3DS required
    AWAITING_3DS --> PROCESSING: User completes 3DS
    AWAITING_3DS --> FAILED: 3DS timeout/failure
    PROCESSING --> SUCCESS: PSP confirms charge
    PROCESSING --> FAILED: PSP declines / timeout
    FAILED --> [*]
    SUCCESS --> REFUND_INITIATED: POST /refund
    REFUND_INITIATED --> REFUNDED: PSP confirms refund
    REFUND_INITIATED --> REFUND_FAILED: PSP refund fails
    REFUNDED --> [*]
```

**State transitions must be atomic and persisted before external calls:**

```python
def process_payment(payment_id: str):
    with db.transaction():
        payment = db.select_for_update("SELECT * FROM payments WHERE id = ? AND status = 'PENDING'")
        if not payment:
            return  # already processed (concurrent call)

        # Persist state change first
        db.execute("UPDATE payments SET status = 'PROCESSING', version = version + 1 WHERE id = ? AND version = ?",
                   payment_id, payment.version)
        db.execute("INSERT INTO payment_events (payment_id, event_type) VALUES (?, 'PROCESSING')", payment_id)

    # Now call external PSP (outside transaction — idempotency handles retries)
    result = stripe.charge(payment.psp_token, payment.amount)

    with db.transaction():
        new_status = 'SUCCESS' if result.success else 'FAILED'
        db.execute("UPDATE payments SET status = ?, psp_reference = ? WHERE id = ?",
                   new_status, result.reference, payment_id)
        db.execute("INSERT INTO payment_outbox (...) VALUES (...)", ...)
```

---

## 11. Transactional Outbox Pattern

**Problem:** After a payment succeeds, we need to notify the Order Service. How do we guarantee the notification is sent without creating a distributed transaction?

**Wrong approach:**
```
1. UPDATE payments SET status = 'SUCCESS'
2. kafka.publish("payment-succeeded")  ← what if this fails after step 1?
```

**Correct approach (Transactional Outbox):**
```
1. BEGIN TRANSACTION
2. UPDATE payments SET status = 'SUCCESS'
3. INSERT INTO payment_outbox (event_type, payload)  ← same DB transaction
4. COMMIT

Background process:
5. SELECT * FROM payment_outbox WHERE published = FALSE
6. kafka.publish(event)
7. UPDATE payment_outbox SET published = TRUE
```

Steps 2 + 3 are atomic (same DB transaction). The outbox poller handles step 6 reliably, with retries.

---

## 12. Handling PSP Webhooks

PSPs (Stripe, Razorpay) send webhooks for async events (3DS completion, refund confirmation). Webhooks can be delivered multiple times.

```python
@app.post("/webhooks/stripe")
def handle_stripe_webhook(payload: dict, signature: str):
    # 1. Verify signature
    if not stripe.verify_webhook_signature(payload, signature, WEBHOOK_SECRET):
        return Response(status=401)

    # 2. Idempotent processing by event_id
    event_id = payload["id"]
    if redis.setnx(f"webhook:{event_id}", 1):
        redis.expire(f"webhook:{event_id}", 86400)
        process_stripe_event(payload)
    # If already processed: return 200 (PSP won't retry)

    return Response(status=200)  # Always 200 to PSP — retry logic is ours
```

!!! warning "Production Trap ⚠️"
    Always return 200 to PSP webhooks even if you've already processed them. If you return an error, the PSP will retry indefinitely. Use idempotency to skip duplicate processing.

---

## 13. Failure Modes

=== "PSP Timeout"
    - **Symptom:** Payment stuck in PROCESSING state
    - **Detection:** `payments WHERE status = 'PROCESSING' AND updated_at < NOW() - INTERVAL '5 min'`
    - **Fix:** Background job queries PSP for status using `psp_reference`; updates payment record; retries if PSP has no record

=== "Database Primary Fails During Payment"
    - **Symptom:** Payments fail to persist; PSP may have charged
    - **Risk:** PSP charged → our DB didn't record → revenue loss + user angry
    - **Fix:** Charge PSP only after DB confirms PROCESSING state; reconciliation job compares PSP records vs DB daily

=== "Double Processing Race Condition"
    - **Symptom:** Two servers process same payment simultaneously
    - **Fix:** `SELECT FOR UPDATE` on payment record; `version` column for optimistic locking; DB unique constraint on `idempotency_key`

=== "Kafka Outbox Processing Failure"
    - **Symptom:** Order Service not notified of payment success
    - **Fix:** Outbox has retry logic; Order Service periodically queries payment status as fallback; eventual consistency is acceptable here (order status, not money)

---

## 14. Observability

```
Critical alerts (PagerDuty immediately):
- Payment failure rate > 2%
- PSP latency p99 > 10 seconds
- Payments stuck in PROCESSING > 10 minutes
- Revenue drop > 20% from baseline

Metrics:
- payment_success_rate (by PSP, by method, by currency)
- payment_latency_p50/p95/p99
- psp_timeout_rate
- idempotency_key_collision_rate (indicates client retry behavior)
- outbox_processing_lag

Dashboards:
- Real-time transaction volume + success rate (revenue dashboard)
- PSP performance comparison (use when routing between PSPs)
- Error breakdown by failure type (insufficient funds vs fraud vs timeout)
```

---

## 15. Security

- Card numbers never touch your servers — use PSP tokenization SDK
- Store only PSP payment tokens, never raw card data
- Sign PSP webhooks and verify signatures
- Rate limit payment attempts by user/card (3 failed attempts → 24h block)
- Fraud detection: ML model or use PSP's built-in (Stripe Radar)
- All payment data encrypted at rest
- Audit log immutable — no UPDATE/DELETE on payment_events

---

## Staff Engineer Extensions

=== "Multi-PSP Routing"
    Route payments to cheapest PSP for each combination of currency + card type. When Stripe has an outage, automatically route to Razorpay. Maintain per-PSP success rates; reduce routing to degraded PSPs automatically.

=== "Global Multi-Region"
    Each region (US, EU, IN) has its own payment stack. EU payments stay in EU (GDPR). Global reconciliation job aggregates across regions. Cross-region payment (APAC user, EUR transaction) routes to EU region, processes there, replicates result back.

=== "30% Cost Reduction"
    Negotiate volume-based rates with PSPs. Route domestic transactions to local PSP (lower interchange). Batch small refunds (process daily instead of immediately). Implement intelligent retry strategies (failed card → retry at different time reduces auth decline fees).

---

## Self-Assessment

- [ ] Can I explain why idempotency keys are required, with a concrete failure scenario?
- [ ] Can I draw the payment state machine from memory?
- [ ] Can I explain the transactional outbox pattern and why it's needed?
- [ ] Can I describe what happens when the database fails after the PSP charge succeeds?
- [ ] Can I explain why we never store raw card numbers?
