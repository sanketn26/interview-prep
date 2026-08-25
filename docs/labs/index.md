---
title: Labs
description: Docker Compose (and one Terraform) environments for the topics that benefit from a real process to kill, not just a canvas simulation.
---

# Labs

The [Playgrounds](../playgrounds/index.md) simulate a mechanism in the browser, fast and safely. These are the next step: the same failure, on a real Kafka broker, a real Postgres replica, a real Kubernetes cluster — with the timing, edge cases, and outright bugs a JS model doesn't bother simulating.

Each lab's page here shows its actual `docker-compose.yml` (or Terraform/Kubernetes config) inline — always in sync with the real file, since the page pulls it in at build time rather than copy-pasting it. The step-by-step exercises are longer and live in the lab's own `README.md` in the repo's [`labs/`](https://github.com/sanketn26/interview-prep/blob/main/labs) directory, linked from each page below. Every lab in this list has actually been run end-to-end while building it, not just written.

## Requirements

- Docker and Docker Compose v2 (`docker compose version` should work)
- [`kubernetes-kind`](https://github.com/sanketn26/interview-prep/blob/main/labs/kubernetes-kind) additionally needs `kind` and `kubectl` (`brew install kind kubectl`)
- [`terraform-docker`](https://github.com/sanketn26/interview-prep/blob/main/labs/terraform-docker) additionally needs Terraform (`brew install hashicorp/tap/terraform`)
- A few GB of free RAM if you run more than one lab at a time
- Nothing here is meant to stay running — every lab ends with `docker compose down -v` (or `kind delete cluster` / `terraform destroy`)

## Labs

| Lab | Pairs with | What you can actually do that the simulator can't show |
|---|---|---|
| [Kafka cluster](kafka.md) | [Kafka Deep Dive](../messaging/kafka.md) | Kill a real broker mid-traffic, watch a real leader election and a real consumer-group rebalance |
| [Postgres replication](postgres-replication.md) | [Replication](../distributed-systems/replication.md) | Flip sync/async live, watch a sync write hang when its standby is down, cause a real split-brain with `pg_promote()` |
| [Redis Sentinel](redis-cluster.md) | [Replication](../distributed-systems/replication.md) | Watch a 3-node quorum vote a new master in after killing the old one, and watch it reconfigure the old master as a replica automatically |
| [Sharded Postgres (Citus)](sharding-citus.md) | [Sharding](../databases/sharding.md) | Query `pg_dist_shard_placement` to see real shard balance, watch a cross-shard query plan fan out, reproduce a real hot shard |
| [etcd cluster](etcd-cluster.md) | [Raft](../distributed-systems/raft.md), [CAP Theorem](../distributed-systems/cap-theorem.md) | Kill a minority (writes keep working) vs. a majority (writes refuse, not corrupt) of a real Raft quorum; watch `--consistency=serializable` succeed without quorum while the default (linearizable) fails |
| [Rate limiter races](rate-limiter.md) | [Rate Limiting](../reliability/rate-limiting.md) | Reproduce a real TOCTOU race that lets 20 requests through a limit of 5, and a real "TTL never expires" bug — then fix both with one atomic Lua script |
| [Retry storm](retry-storm.md) | [Circuit Breakers](../reliability/circuit-breakers.md) | Inject a real fault with Toxiproxy and measure retry amplification directly: 10 client requests become ~40 real backend hits |
| [Load balancer algorithms](load-balancer.md) | [Load Balancing](../networking/load-balancing.md) | Swap round robin / weighted / least-connections on a real nginx `upstream` block and watch the distribution actually change |
| [Kubernetes (kind)](kubernetes-kind.md) | [Kubernetes](../kubernetes/index.md) | A real 3-node cluster: break a Service selector, break a readiness probe, diagnose both with real `kubectl` |
| [Terraform + Docker](terraform-docker.md) | [Infrastructure as Code](../cloud/infrastructure-as-code.md), [Terraform](../cloud/terraform.md) | Real `plan`/`apply`/`destroy` against real containers (no cloud account): prove idempotency, trigger real drift detection, watch a real `-/+` forced replacement |

## How to use one

```bash
git clone https://github.com/sanketn26/interview-prep
cd interview-prep/labs/<name>
```

Then follow that lab's `README.md` — a numbered sequence of exercises. Predict the outcome before running each command, the same discipline the [Playgrounds](../playgrounds/index.md) page asks for. Tear down when done; nothing here is designed to be left running.

## A note on what these are for

None of these are production-representative deployments — they use `trust` auth, no TLS, no resource limits, and configurations chosen for clarity over security or performance. Do not copy these compose files into anything that isn't a throwaway local lab. The point is to make one specific mechanism (leader election, quorum failover, shard placement, retry amplification) observable in minutes, not to teach production operations end to end.
