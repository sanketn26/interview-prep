# Senior Engineer Academy

A guided learning platform for senior / staff / lead engineers targeting ₹40–70+ LPA-equivalent roles. Three tracks: **System Design & Distributed Systems**, **DSA**, and **Behavioural / Leadership**.

This is not a pile of interview notes. It is an interactive textbook + design lab + troubleshooting handbook: you learn to **derive** architectures (requirements → constraints → scale → data model → interfaces → bottlenecks → reliability → cost → evolution), not memorize boxes.

[![Deploy to GitHub Pages](https://github.com/sanketn26/interview-prep/actions/workflows/deploy.yml/badge.svg)](https://github.com/sanketn26/interview-prep/actions/workflows/deploy.yml)
[![Validate PR](https://github.com/sanketn26/interview-prep/actions/workflows/validate.yml/badge.svg)](https://github.com/sanketn26/interview-prep/actions/workflows/validate.yml)
[![Buy Me A Coffee](https://img.shields.io/badge/☕-Buy%20me%20a%20coffee-FFDD00?style=flat-square)](https://buymeacoffee.com/sanketn)

**[Open the Academy →](https://sanketn26.github.io/interview-prep/)**

---

## Who it is for

Senior backend / platform / infra engineers, SREs, DevOps, tech leads, Staff candidates — people who already ship production code and want to reason about scale, trade-offs, and failure.

**Assumes you already have:** 2+ years shipping production code, working knowledge of core data structures & algorithms, comfort with OOP/API design/HTTP/SQL, and enough production exposure to know that things fail.

**Does not assume:** distributed systems, large-scale databases, consensus, networking internals, streams, Kubernetes internals, production debugging, or capacity planning — that's what this teaches.

**Not for:** entry-level / new-grad interview prep, or anyone who wants a CS-fundamentals or "what is an API" style course. There's no glossary-first on-ramp here — concept pages open at "here's the hard problem," not "here's the definition." This is deliberately not beginner-friendly.

---

## What you will be able to do

> Given an unfamiliar system, derive a sensible architecture, explain alternatives, name bottlenecks, predict failures, debug it, and evolve it.

---

## First release (study this)

Gold-standard modules at final quality. Everything else is **planned** — see [project status](docs/project-status.md). Do not treat stubs as complete.

| Module | Track |
|--------|--------|
| [Design methodology](docs/foundations/framework.md) + [capacity calculator](docs/foundations/requirements-estimation.md) | Foundations |
| [CAP](docs/distributed-systems/cap-theorem.md), [sharding](docs/databases/sharding.md), [consistent hashing](docs/databases/consistent-hashing.md), [Raft](docs/distributed-systems/raft.md) | Distributed / data |
| [Kafka consumer groups](docs/messaging/kafka.md), [cache stampede](docs/performance/cache-stampede.md), [circuit breaker](docs/reliability/circuit-breakers.md), [tail latency](docs/performance/tail-latency.md) | Runtime |
| [URL shortener](docs/system-design-exercises/url-shortener.md), [rate limiter](docs/system-design-exercises/rate-limiter.md), [WhatsApp](docs/system-design-exercises/whatsapp.md), [payments](docs/system-design-exercises/payment-processing.md) | Design exercises |
| [Sliding window](docs/dsa/sliding-window.md), [BFS/DFS](docs/dsa/bfs-dfs.md), [DP](docs/dsa/dynamic-programming.md) | DSA |
| [Technical disagreement](docs/behavioural/technical-disagreement.md), [production incident](docs/behavioural/production-incident.md) | Behavioural |
| [Debugging high p99 / Kafka lag](docs/observability/debugging-playbook.md), [K8s debugging](docs/kubernetes/index.md) | Production |

**15 priority simulations** (hash ring, sharding, Kafka, stampede, rate limiter, load balancer, retry storm, circuit breaker, Raft, saga, tail latency, DNS, TCP, K8s flow, capacity calculator) live on those pages and are indexed from [Playgrounds](docs/playgrounds/index.md).

---

## How to study

Read [How to Study](docs/how-to-use.md) and the [roadmap](docs/roadmap.md). Short version:

1. Open with the problem, not the definition.
2. Predict the simulation before you click.
3. For designs: cover the solution, ask questions, estimate, V1 → bottleneck → V2. Never start from the finished diagram.

---

## Local development

```bash
git clone https://github.com/sanketn26/interview-prep.git
cd interview-prep
python -m venv .venv
source .venv/bin/activate          # Windows: .venv\Scripts\activate
pip install -r requirements.txt
mkdocs serve
```

Open [http://127.0.0.1:8000](http://127.0.0.1:8000).

```bash
mkdocs build --strict              # what CI runs
pytest tests/python                # example libraries
bash scripts/validate.sh           # tests + JS syntax
```

Windows: use `py -3 -m venv .venv` then `.venv\Scripts\activate`.

No backend. Interactivity is static JS; examples are local Python / Go.

---

## Deploy

Pushes to `main` run [`.github/workflows/deploy.yml`](.github/workflows/deploy.yml): `mkdocs build --strict` → GitHub Pages.

PRs run [`.github/workflows/validate.yml`](.github/workflows/validate.yml): build, pytest, JS syntax check.

---

## Repo layout

| Path | Role |
|------|------|
| `docs/` | Curriculum (MkDocs) |
| `docs/assets/` | CSS / JS simulations / progress tracking / logo — **everything served must live here** |
| `examples/python`, `examples/go` | Executable algorithms |
| `tests/` | pytest for examples |
| `scripts/` | Local validation |
| `.github/workflows/` | Build, validate, Pages |

---

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md). Quality gate:

> After this page, can the engineer explain it, apply it, say when it fails, debug it, and teach the trade-offs? If not, it is not done.

Never mark a stub complete. Update `docs/project-status.md` with the page.

## License

MIT — see [LICENSE](LICENSE).
