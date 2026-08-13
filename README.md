# 🎓 Senior Engineer Academy

> **A production-quality interactive learning environment for senior software engineers targeting Staff / Senior / Lead roles.**

[![Deploy to GitHub Pages](https://github.com/sanketn26/interview-prep/actions/workflows/deploy.yml/badge.svg)](https://github.com/sanketn26/interview-prep/actions/workflows/deploy.yml)
[![Validate PR](https://github.com/sanketn26/interview-prep/actions/workflows/validate.yml/badge.svg)](https://github.com/sanketn26/interview-prep/actions/workflows/validate.yml)

📚 **[Open the Academy →](https://sanketn26.github.io/interview-prep/)**

---

## What Is This?

This is NOT interview notes. It is a **guided engineering academy** where concepts build on each other. It combines:

- **System Design** — CAP, sharding, Kafka, caching, reliability, Kubernetes, cloud
- **DSA** — Problem-solving patterns with animated visualizers
- **Behavioural** — STAR framework, seniority differentiation, Staff-level examples
- **Distributed Systems** — Raft, consensus, multi-region, disaster recovery
- **Production Engineering** — Debugging playbooks, failure scenarios, incident analysis
- **Interactive Simulations** — Consistent hashing ring, Kafka partitions, cache stampede, rate limiter, BFS/DFS

**Guiding principle:** Do not teach people to memorize architectures. Teach them how to **derive** architectures from requirements, constraints, failure modes, and trade-offs.

---

## Who Is This For?

- Senior Software / Backend / Platform / Distributed Systems Engineers
- Staff Engineer & Tech Lead candidates
- Senior SRE/DevOps engineers
- Engineers targeting **₹40–70+ LPA** (India) or equivalent global senior interviews

**Assumes:** Basic programming knowledge
**Does not assume:** Deep distributed-systems knowledge

---

## What Will I Learn?

> *Give me an unfamiliar system, its workload and constraints, and I can derive a sensible architecture, explain its trade-offs, predict how it will fail, debug it in production, and evolve it as the organization and scale grow.*

---

## Contents

### ✅ Gold-Standard Modules (Complete)

| Module | Type |
|--------|------|
| CAP Theorem | Core Concept |
| Database Sharding | Core Concept |
| Consistent Hashing + Simulation | Concept + Interactive |
| Kafka Consumer Groups + Simulation | Concept + Interactive |
| Cache Stampede + Simulation | Concept + Interactive |
| Rate Limiting + Simulation | Concept + Interactive |
| URL Shortener | System Design Exercise |
| Payment Processing | System Design Exercise |
| Sliding Window + Visualizer | DSA + Interactive |
| BFS & DFS + Visualizer | DSA + Interactive |
| Technical Disagreement | Behavioural |
| Production Incident | Behavioural |

---

## Local Development

```bash
git clone https://github.com/sanketn26/interview-prep.git
cd interview-prep
python -m venv .venv
source .venv/bin/activate   # Windows: .venv\Scripts\activate
pip install -r requirements.txt
mkdocs serve
```

Open [http://127.0.0.1:8000](http://127.0.0.1:8000)

---

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md). All contributions must maintain the quality standard:

> After reading a page: Can the engineer explain it in an interview? Recognize where it applies? Identify when it fails? Debug it in production? Explain trade-offs to another senior engineer? If no → improve.

---

## License

MIT License — see [LICENSE](LICENSE).
