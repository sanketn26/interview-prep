# Labs

Docker Compose environments for the topics that benefit from a real process to kill, not just a canvas simulation. The [browser simulators](../docs/playgrounds/index.md) teach the mechanism fast and safely; these labs are the next step — the same failure, on a real Kafka broker or a real Postgres replica, with real timing and real edge cases the JS model doesn't bother simulating.

## Requirements

- Docker and Docker Compose v2 (`docker compose version` should work)
- [`labs/kubernetes-kind`](kubernetes-kind/) additionally needs `kind` and `kubectl` (`brew install kind kubectl`)
- [`labs/terraform-docker`](terraform-docker/) additionally needs Terraform (`brew install hashicorp/tap/terraform`)
- A few GB of free RAM if you run more than one lab at a time — these are not lightweight
- Nothing here is meant to stay running; every lab ends with `docker compose down -v` (or `kind delete cluster` for the K8s lab)

## Labs

| Lab | Pairs with | What you can actually do that the simulator can't show |
|---|---|---|
| [Kafka cluster](kafka/) | [Kafka Deep Dive](../docs/messaging/kafka.md) | Kill a real broker mid-traffic, watch a real leader election and a real consumer-group rebalance |
| [Postgres replication](postgres-replication/) | [Replication](../docs/distributed-systems/replication.md) | Flip sync/async live, watch a sync write hang when its standby is down, cause a real split-brain with `pg_promote()` |
| [Redis Sentinel](redis-cluster/) | [Replication](../docs/distributed-systems/replication.md), [Quorum Replication simulator](../docs/playgrounds/index.md) | Watch a 3-node quorum vote a new master in after killing the old one, and watch it reconfigure the old master as a replica automatically |
| [Sharded Postgres (Citus)](sharding-citus/) | [Sharding](../docs/databases/sharding.md) | Query `pg_dist_shard_placement` to see real shard balance, watch a cross-shard query plan fan out, reproduce a real hot shard |
| [etcd cluster](etcd-cluster/) | [Raft](../docs/distributed-systems/raft.md), [CAP Theorem](../docs/distributed-systems/cap-theorem.md) | Kill a minority (writes keep working) vs. a majority (writes refuse, not corrupt) of a real Raft quorum; watch `--consistency=serializable` succeed without quorum while `linearizable` fails |
| [Rate limiter races](rate-limiter/) | [Rate Limiting](../docs/reliability/rate-limiting.md) | Reproduce a real TOCTOU race that lets 20 requests through a limit of 5, and a real "TTL never expires" bug — then fix both with one atomic Lua script |
| [Retry storm](retry-storm/) | [Circuit Breakers](../docs/reliability/circuit-breakers.md) | Inject a real fault with Toxiproxy and measure retry amplification directly: 10 client requests become ~40 real backend hits |
| [Load balancer algorithms](load-balancer/) | [Load Balancing](../docs/networking/load-balancing.md) | Swap round robin / weighted / least-connections on a real nginx `upstream` block and watch the distribution actually change; watch a dead backend get routed around with zero client-visible errors |
| [Kubernetes (kind)](kubernetes-kind/) | [Kubernetes](../docs/kubernetes/index.md) | A real 3-node cluster: break a Service selector and watch a stale keepalive connection survive it briefly before failing; break a readiness probe and watch a rollout correctly refuse to finish |
| [Terraform + Docker](terraform-docker/) | [Infrastructure as Code](../docs/cloud/infrastructure-as-code.md), [Terraform](../docs/cloud/terraform.md) | Real `plan`/`apply`/`destroy` against real containers (no cloud account): prove idempotency, trigger real drift detection, and watch a real `-/+` forced replacement |

## How to use one

Each lab is self-contained: `cd labs/<name> && docker compose up -d`, then follow that lab's README, which is a numbered sequence of exercises — predict the outcome before running each command, the same discipline the [playgrounds](../docs/playgrounds/index.md) page asks for. Tear down when done; nothing here is designed to be left running.

## A note on what these are for

None of these are production-representative deployments — they use `trust` auth, no TLS, no resource limits, and configurations chosen for clarity over security or performance. Do not copy these compose files into anything that isn't a throwaway local lab. The point is to make one specific mechanism (leader election, quorum failover, shard placement) observable in minutes, not to teach production Kafka/Postgres/Redis operations end to end.
