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

-   :material-drawing-box: **[System Design](foundations/index.md)**

    ---
    CAP, sharding, Kafka, caching, reliability, Kubernetes — with visual simulations.

-   :material-code-braces: **[DSA Patterns](dsa/index.md)**

    ---
    Problem-solving patterns, not random LeetCode. Animated visualizers included.

-   :material-account-group: **[Behavioural](behavioural/index.md)**

    ---
    STAR+Reflection, seniority differentiation, Staff-level examples.

-   :material-lightning-bolt: **[Design Exercises](system-design-exercises/index.md)**

    ---
    30+ complete guided system design modules with progressive architecture evolution.

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
| [CAP Theorem](distributed-systems/cap-theorem.md) | Concept | ✅ Complete |
| [Database Sharding](databases/sharding.md) | Concept | ✅ Complete |
| [Consistent Hashing](databases/consistent-hashing.md) | Concept + Simulation | ✅ Complete |
| [Kafka Consumer Groups](messaging/kafka.md) | Concept + Simulation | ✅ Complete |
| [Cache Stampede](performance/cache-stampede.md) | Concept + Simulation | ✅ Complete |
| [Rate Limiting](reliability/rate-limiting.md) | Concept + Simulation | ✅ Complete |
| [URL Shortener](system-design-exercises/url-shortener.md) | Design Exercise | ✅ Complete |
| [Payment Processing](system-design-exercises/payment-processing.md) | Design Exercise | ✅ Complete |
| [Sliding Window](dsa/sliding-window.md) | DSA + Visualizer | ✅ Complete |
| [BFS & DFS](dsa/bfs-dfs.md) | DSA + Visualizer | ✅ Complete |
| [Technical Disagreement](behavioural/technical-disagreement.md) | Behavioural | ✅ Complete |
| [Production Incident](behavioural/production-incident.md) | Behavioural | ✅ Complete |

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
