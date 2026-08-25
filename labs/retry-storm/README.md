# Lab: Retry Storm (Toxiproxy fault injection)

Pairs with [Circuit Breakers](../../docs/reliability/circuit-breakers.md), which opens with this exact scenario: "Payments API calls Fraud. Fraud's p99 is 80ms... Fraud's DB locks... you add retries: 3 retries = 4 attempts... 4000 rps at Fraud if every try is a full call." This lab reproduces that math with a real backend, a real proxy, and real curl requests — not a diagram.

`backend` is a trivial, otherwise-healthy HTTP server that logs every request it receives. `toxiproxy` sits between the client and it — the standard tool for injecting real network faults (latency, timeouts, connection resets) without touching application code.

## Start it

```bash
cd labs/retry-storm
docker compose up -d

# wire up the proxy
curl -s -X POST http://localhost:8474/proxies \
  -d '{"name":"backend","listen":"0.0.0.0:20001","upstream":"backend:8000"}' \
  -H "Content-Type: application/json"
```

## Exercise 1 — Healthy baseline: 1 client request = 1 backend hit

```bash
before=$(docker logs labs-retry-storm-backend-1 2>&1 | grep -c "received request")
for i in $(seq 1 10); do curl -s -m 0.3 --retry 3 --retry-delay 0 http://localhost:20001/ > /dev/null & done
wait
after=$(docker logs labs-retry-storm-backend-1 2>&1 | grep -c "received request")
echo "10 client requests -> $((after-before)) backend hits"
```

Should print `10`. Retries never fire because nothing is failing.

## Exercise 2 — Make Fraud sick: a downstream timeout toxic

```bash
curl -s -X POST http://localhost:8474/proxies/backend/toxics \
  -d '{"name":"slow-fraud","type":"timeout","stream":"downstream","attributes":{"timeout":5000}}' \
  -H "Content-Type: application/json"
```

This toxic still lets the request **reach** the backend (it gets logged — the backend is doing real work, just like Fraud's DB-locked threads in the docs) but holds the **response** for 5 seconds before resetting the connection. From the client's point of view, this looks exactly like a hung dependency.

## Exercise 3 — Retry amplification, measured

```bash
before=$(docker logs labs-retry-storm-backend-1 2>&1 | grep -c "received request")
for i in $(seq 1 10); do
  curl -s -m 0.3 --retry 3 --retry-delay 0 --retry-all-errors http://localhost:20001/ > /dev/null &
done
wait
sleep 1
after=$(docker logs labs-retry-storm-backend-1 2>&1 | grep -c "received request")
echo "10 client requests -> $((after-before)) backend hits"
```

**Predict first:** with `--retry 3` (4 attempts total) and every attempt timing out, how many times should each of the 10 client requests actually hit the backend? Run it — expect roughly **40** (10 × 4), not 10. This is [Circuit Breakers](../../docs/reliability/circuit-breakers.md)'s "1000 rps inbound → 4000 rps at Fraud" turned into a number you just measured, not a claim you read.

## Exercise 4 — Recovery

```bash
curl -s -X DELETE http://localhost:8474/proxies/backend/toxics/slow-fraud
```

Re-run Exercise 1's loop — back to a clean 1:1 ratio.

## Tear down

```bash
docker compose down -v
```

## What this doesn't teach

This lab stops at the retry math — it doesn't include a stateful client that actually opens/closes a circuit breaker (the toxic is added and removed by hand, not detected and reacted to automatically). For the breaker state machine itself (CLOSED → OPEN → HALF-OPEN), the [Circuit Breaker simulator](../../docs/playgrounds/index.md) is the faster way to build that intuition; this lab's job is just to make the amplification math undeniable.
