---
title: Security
description: "Identity, encryption, and authorization. The primitives that keep systems from leaking user data."
---

# Security

Security is not an afterthought — it's baked into every design. This section covers the primitives that appear in every interview:

---

## Why This Exists

In interviews, security is often treated as a checkbox ("we use HTTPS and store passwords hashed"). But senior engineers reason about security like any other system property: threat model, trade-offs, failure modes.

The questions you'll face:
- "How does a user prove they are who they say?"
- "How do you prevent one user from seeing another's data?"
- "If someone steals the database, what are they actually stealing?"
- "Can a single credential compromise be contained, or does the whole system break?"

This section teaches the tools to answer them.

---

## Pages in This Section

| Page | Status |
|------|--------|
| [Authentication & Authorization Fundamentals](authentication-authorization.md) | **Complete** — TLS, encryption, JWT/OAuth2, RBAC, secrets, payment system case study |
| [Zero Trust Architecture](zero-trust-architecture.md) | **Complete** — mTLS, SPIFFE/SPIRE, policy-as-code, perimeter-to-Zero-Trust migration sequencing |
| [Threat Modeling](threat-modeling.md) | **Complete** — trust boundaries, STRIDE, attack trees, risk scoring and acceptance |
| [OAuth2 & OIDC Deep Dive](oauth2-oidc.md) | **Complete** — Authorization Code + PKCE flow internals, token validation, refresh rotation, vulnerabilities |
| [Session Management Deep Dive](session-management.md) | **Complete** — server-side sessions vs JWT, cookie security, fixation/hijacking, revocation problem |
| [Data Privacy & Compliance](data-privacy-compliance.md) | **Complete** — PII classification, data residency, right-to-erasure across replicas/backups/warehouses, encryption key management |

[Authentication & Authorization Fundamentals](authentication-authorization.md) covers how users prove identity (TLS, passwords, OAuth2), how data is protected (encryption, secrets management), and how permissions work (RBAC, least privilege). Includes a payment system case study where PCI compliance drives design decisions.

[Zero Trust Architecture](zero-trust-architecture.md) covers why network location stopped being a valid trust signal, how service identity (mTLS, SPIFFE/SPIRE) and centrally enforced policy replace it, and — the part most explanations skip — how to migrate an existing perimeter-model system to Zero Trust without an outage.

[Threat Modeling](threat-modeling.md) covers how to systematically find security gaps before an attacker does: trust-boundary diagrams, the STRIDE checklist, attack trees for high-value targets, and how to rank and explicitly accept/mitigate/fix what you find instead of trying to fix everything.

[OAuth2 & OIDC Deep Dive](oauth2-oidc.md) goes past the intro-level flow covered in Auth Fundamentals: the Authorization Code + PKCE sequence in full, why Implicit and Resource Owner Password grants are deprecated, JWT structure and the five checks real validation requires, refresh token rotation and revocation, and the vulnerability classes (open redirect, CSRF via `state`, code interception, `alg:none`, confused deputy) that show up when any of it is implemented sloppily.

[Session Management Deep Dive](session-management.md) covers how identity persists across stateless HTTP requests: server-side sessions vs stateless JWTs, the cookie attributes that actually matter (Secure, HttpOnly, SameSite), session fixation and hijacking defenses, scaling strategies (sticky sessions, centralized Redis, stateless JWT), and the JWT revocation problem that never fully goes away.

[Data Privacy & Compliance](data-privacy-compliance.md) covers data privacy as an architectural constraint rather than a legal checkbox: PII classification, data residency's collision with multi-region DR, right-to-erasure as a distributed-systems problem spanning replicas/caches/backups/event logs, and why encryption at rest only means something if key management is separate from the data it protects.

---

## Mental Model: The Security Stack

```
Layer 1: Transport Security (TLS)
         User ←→ Network ←→ Server
         (Encrypt the pipe so attackers on the network can't read passwords)

Layer 2: Authentication
         User proves identity (password, TOTP, biometric, OAuth2)
         (Server: "Are you really alice?")

Layer 3: Authorization
         Server checks permissions (RBAC: "Is alice allowed to read this?")
         (Guard: "alice is staff, so she can view any order")

Layer 4: Data Protection
         Secrets, encryption at rest, audit logs
         (If attacker gains DB access: what do they actually get?)
```

Get layer 2 wrong and one user can impersonate another. Get layer 3 wrong and one user can access another's data. Get layer 4 wrong and a DB breach leaks passwords or payment info.

---

## Common Interview Weaknesses

Most candidates say: "We use HTTPS, bcrypt passwords, and JWT tokens."

Senior engineers add: "Here's our threat model. An attacker who gains DB access cannot impersonate users (passwords are hashed). An attacker who steals a JWT can only use it for 15 minutes (it expires). If a credential is compromised, we can revoke it without affecting other users. We log access to sensitive data (audit trail). Support staff can view orders but cannot modify them."

The difference: specific trade-offs, not generic patterns.

---

## Key Takeaways

!!! success "Remember"
    1. **Security is a property of the system, not a feature tacked on**
    2. **You have four layers: transport → auth → authz → data protection**
    3. **TLS encrypts the wire; encryption at rest protects stored data**
    4. **Passwords should be hashed (bcrypt), not encrypted** (hashing is one-way)
    5. **Tokens should be short-lived and signed** (JWT with expiration)
    6. **Authorization belongs in every query** — never return data without checking permissions
    7. **Secrets should be in a secrets manager, not in files**
    8. **One compromised credential should not compromise the whole system** (least privilege principle)

**Next:** [Authentication & Authorization Fundamentals](authentication-authorization.md)
