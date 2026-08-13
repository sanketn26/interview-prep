---
title: Senior Engineer Academy
description: A complete interactive learning environment for senior engineers targeting Staff / Senior / Lead roles.
hide:
  - navigation
  - toc
---

# Senior Engineer Academy

<div class="grid cards" markdown>

-   :material-map-marker-path: **[Start Here — Roadmap](roadmap.md)**

    ---
    3-phase learning plan from "I can build an API" to "I can reason about planetary-scale systems."

-   :material-tools: **[How to Study](how-to-use.md)**

    ---
    Interview modes, three-level explanation model, and how to navigate the academy.

-   :material-drawing-box: **[Learn — System Design](foundations/index.md)**

    ---
    CAP, sharding, Kafka, caching, reliability, observability, Kubernetes — with visual simulations.

-   :material-code-braces: **[Practice — DSA Patterns](dsa/index.md)**

    ---
    Problem-solving patterns, not random LeetCode. Animated visualizers included.

-   :material-account-group: **[Behavioural](behavioural/index.md)**

    ---
    STAR+Reflection, seniority differentiation, Staff-level examples.

-   :material-lightning-bolt: **[Design Exercises](system-design-exercises/index.md)**

    ---
    Gold-standard guided designs (URL shortener, rate limiter, WhatsApp, payments). More exercises are planned, not faked.

-   :material-play-circle: **[Simulations](playgrounds/index.md)**

    ---
    Fifteen priority simulations: hashing, Kafka, Raft, retry storms, K8s request flow, capacity.

-   :material-trophy-outline: **[Your Progress](dashboard.md)**

    ---
    Points, streaks, badges and completion by section. Tracked locally in your browser.

-   :material-checkbox-marked-outline: **[Project Status](project-status.md)**

    ---
    Honest Complete / Interactive / Planned. Never treat a stub as finished.

</div>

## What You Will Learn

> **Give me an unfamiliar system, its workload and constraints, and I can derive a sensible architecture, explain its trade-offs, predict how it will fail, debug it in production, and evolve it as the organization and scale grow.**

This academy teaches you to **derive** architectures from requirements — not memorize them.

Every concept answers: **WHAT? WHY? HOW? WHEN? WHAT BREAKS? WHAT ARE THE TRADE-OFFS?**

## Three-Level Understanding

=== "Level 1 — Intuition"
    Simple language + mental models + diagrams. Interview-ready explanations.

=== "Level 2 — Engineering"
    Algorithms, architecture, operational behaviour, bottlenecks, internal mechanics.

=== "Level 3 — Production"
    Scale limits, failure modes, monitoring, cost, security, debugging, real incidents.

## Target Audience

- Senior Software / Backend / Platform / Distributed Systems Engineers
- Staff Engineer & Tech Lead candidates
- Senior SRE/DevOps engineers
- Engineers targeting ₹40–70+ LPA (India) or equivalent global senior interviews

**Assume:** basic programming knowledge
**Does not assume:** deep distributed-systems knowledge

## Priority Topics (Gold Standard Modules)

| Module | Type | Status |
|--------|------|--------|
| [Design methodology](foundations/framework.md) | Concept | First release |
| [CAP Theorem](distributed-systems/cap-theorem.md) | Concept | First release |
| [Database Sharding](databases/sharding.md) | Concept + sim | First release |
| [Consistent Hashing](databases/consistent-hashing.md) | Concept + sim | First release |
| [Kafka Consumer Groups](messaging/kafka.md) | Concept + sim | First release |
| [Cache Stampede](performance/cache-stampede.md) | Concept + sim | First release |
| [Circuit breaker](reliability/circuit-breakers.md) | Concept + sim | First release |
| [Tail latency](performance/tail-latency.md) | Concept + sim | First release |
| [Raft](distributed-systems/raft.md) | Concept + sim | First release |
| [URL Shortener](system-design-exercises/url-shortener.md) | Design | First release |
| [Rate limiter](system-design-exercises/rate-limiter.md) | Design | First release |
| [WhatsApp](system-design-exercises/whatsapp.md) | Design | First release |
| [Payment Processing](system-design-exercises/payment-processing.md) | Design | First release |
| [Sliding Window](dsa/sliding-window.md) | DSA | First release |
| [BFS & DFS](dsa/bfs-dfs.md) | DSA | First release |
| [Dynamic programming](dsa/dynamic-programming.md) | DSA | First release |
| [Technical Disagreement](behavioural/technical-disagreement.md) | Behavioural | First release |
| [Production Incident](behavioural/production-incident.md) | Behavioural | First release |
| [Debugging playbook](observability/debugging-playbook.md) | Production | First release |
| [Kubernetes debugging](kubernetes/index.md) | Production | First release |

## Local Development

```bash
git clone https://github.com/sanketn26/interview-prep.git
cd interview-prep
python -m venv .venv
source .venv/bin/activate   # Windows: .venv\Scripts\activate
pip install -r requirements.txt
mkdocs serve
# Open http://127.0.0.1:8000
```

## Learning Philosophy

!!! tip "Guiding Principle"
    Do not teach people to memorize architectures. Teach them how to **derive** architectures from requirements, constraints, failure modes and trade-offs.

Every concept page follows the same structure:

1. Why this exists
2. Mental model
3. Architecture (Mermaid diagram)
4. How it works internally
5. Realistic example
6. Interactive explainer / simulation
7. Failure modes
8. Production debugging
9. Scaling limits
10. Trade-offs
11. Interview questions (basic → senior → staff)
12. Reasoning exercises
13. Key takeaways
