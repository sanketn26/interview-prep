# Lab: Kafka Cluster (3 brokers, KRaft mode)

Pairs with [Kafka Deep Dive](../../docs/messaging/kafka.md) and the [Kafka simulator](../../docs/playgrounds/index.md). The browser sim shows the mechanism; this lab lets you actually kill a broker and watch a real leader election happen.

No ZooKeeper — this uses KRaft (Kafka's built-in Raft-based metadata quorum, the modern default), so all three containers are both brokers and controllers.

## Start it

```bash
cd labs/kafka
docker compose up -d
docker compose ps   # wait for all three to show (healthy)
```

Kafka UI is at [http://localhost:8080](http://localhost:8080) if you'd rather click around than use the CLI.

## Exercise 1 — Partitions and replication, for real

```bash
docker exec -it labs-kafka-kafka1-1 /opt/kafka/bin/kafka-topics.sh \
  --create --topic orders --bootstrap-server localhost:9092 \
  --partitions 3 --replication-factor 3

docker exec labs-kafka-kafka1-1 /opt/kafka/bin/kafka-topics.sh \
  --describe --topic orders --bootstrap-server localhost:9092
```

Read the output. Each partition has a **Leader** and a set of **Isr** (in-sync replicas) — this is [Kafka Deep Dive](../../docs/messaging/kafka.md)'s "1 topic, 3 partitions" diagram, except now it's three real processes on three real ports.

## Exercise 2 — Kill a broker, watch leader election

Pick whichever broker owns a partition's leadership from the `describe` output above (say it's broker 2), then:

```bash
docker stop labs-kafka-kafka2-1
sleep 5
docker exec labs-kafka-kafka1-1 /opt/kafka/bin/kafka-topics.sh \
  --describe --topic orders --bootstrap-server localhost:9092
```

**Predict before you run it:** which partitions change Leader? What happens to the ISR list for partitions that had broker 2 as a follower? Then check your answer against the output — the surviving brokers should show the killed one's ID dropped from every ISR list.

```bash
docker start labs-kafka-kafka2-1   # bring it back; it rejoins and catches up
```

## Exercise 3 — Consumer groups and rebalancing

Open two terminals:

```bash
# terminal 1
docker exec -it labs-kafka-kafka1-1 /opt/kafka/bin/kafka-console-consumer.sh \
  --topic orders --bootstrap-server localhost:9092 --group order-processors

# terminal 2 — start a second consumer in the SAME group
docker exec -it labs-kafka-kafka1-1 /opt/kafka/bin/kafka-console-consumer.sh \
  --topic orders --bootstrap-server localhost:9092 --group order-processors
```

Produce a burst of messages from a third terminal:

```bash
docker exec -it labs-kafka-kafka1-1 /opt/kafka/bin/kafka-console-producer.sh \
  --topic orders --bootstrap-server localhost:9092
# type a few lines, Ctrl+D when done
```

With 3 partitions and 2 consumers, each consumer should own roughly 1–2 partitions. Start a **third** consumer in the same group — watch a rebalance happen live (each consumer's ownership churns for a moment). Start a **fourth** — it sits idle, because there are only 3 partitions. This is [Kafka Deep Dive](../../docs/messaging/kafka.md)'s "more consumers than partitions → some consumers are idle" rule, not a diagram anymore.

## Exercise 4 — Check consumer lag

```bash
docker exec labs-kafka-kafka1-1 /opt/kafka/bin/kafka-consumer-groups.sh \
  --bootstrap-server localhost:9092 --describe --group order-processors
```

The `LAG` column is the number the [circuit breakers](../../docs/reliability/circuit-breakers.md) and [replication](../../docs/distributed-systems/replication.md) pages both point at as the thing that actually pages someone — not "is Kafka up," but "is a specific consumer group falling behind."

## Tear down

```bash
docker compose down -v
```

## What this doesn't teach

This is a single-machine, single-Docker-network cluster — every broker resolves every other broker's hostname instantly and there's no real network partition. It's excellent for leader-election and rebalancing mechanics; it will not show you cross-AZ replication lag or a genuine split-brain scenario. For that, see the [Postgres replication lab](../postgres-replication/) and the [Replication simulator](../../docs/distributed-systems/replication.md), which model latency and partial failure explicitly.
