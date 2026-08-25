# Lab: Rate Limiter Races (Redis)

Pairs with [Rate Limiting](../../docs/reliability/rate-limiting.md) and its simulator. Every exercise here reproduces a real race with plain `redis-cli` — no app code needed, just concurrent shell processes hitting the same Redis instance.

## Start it

```bash
cd labs/rate-limiter
docker compose up -d
docker compose ps
```

## Exercise 1 — The "TTL never actually expires" bug

The naive fixed-window counter pattern is `INCR key; EXPIRE key <window>` on every request. Run it continuously, faster than the window:

```bash
docker exec labs-rate-limiter-redis-1 redis-cli DEL rl:naive
for i in $(seq 1 8); do
  docker exec labs-rate-limiter-redis-1 redis-cli INCR rl:naive > /dev/null
  docker exec labs-rate-limiter-redis-1 redis-cli EXPIRE rl:naive 2 > /dev/null
  echo "req $i: count=$(docker exec labs-rate-limiter-redis-1 redis-cli GET rl:naive) ttl=$(docker exec labs-rate-limiter-redis-1 redis-cli TTL rl:naive)"
  sleep 0.8
done
```

**Predict first:** with a 2-second window and requests every 0.8s, should the count ever reset? Run it — the count climbs to 8 and never resets, because **every** request re-arms the TTL to 2, not just the first. Under continuous traffic, this "fixed window" never actually closes — it's not a 2-second window, it's an unbounded counter as long as traffic keeps arriving.

## Exercise 2 — Fix it: EXPIRE only on the window's first request

```bash
SHA=$(docker exec labs-rate-limiter-redis-1 redis-cli SCRIPT LOAD "$(cat atomic_incr_expire.lua)")
docker exec labs-rate-limiter-redis-1 redis-cli DEL rl:atomic
for i in $(seq 1 8); do
  echo "req $i: count=$(docker exec labs-rate-limiter-redis-1 redis-cli EVALSHA "$SHA" 1 rl:atomic 2) ttl=$(docker exec labs-rate-limiter-redis-1 redis-cli TTL rl:atomic)"
  sleep 0.8
done
```

Read [`atomic_incr_expire.lua`](atomic_incr_expire.lua) — the fix is `if count == 1 then EXPIRE end`, run atomically inside `EVAL` so no other client can interleave between the `INCR` and the conditional `EXPIRE`. Watch the count actually cycle 1→2→3→1→2→3 as the window really closes every 2 seconds now.

## Exercise 3 — The check-then-act race (over-admission under concurrency)

A naive limiter reads the count, decides, then writes:

```bash
docker exec labs-rate-limiter-redis-1 redis-cli DEL rl:toctou
for i in $(seq 1 20); do
  (
    cur=$(docker exec labs-rate-limiter-redis-1 redis-cli GET rl:toctou); [ -z "$cur" ] && cur=0
    if [ "$cur" -lt 5 ]; then docker exec labs-rate-limiter-redis-1 redis-cli INCR rl:toctou > /dev/null; echo ALLOWED; else echo DENIED; fi
  ) &
done
wait
echo "final count: $(docker exec labs-rate-limiter-redis-1 redis-cli GET rl:toctou)"
```

**Predict first:** limit is 5, 20 concurrent requests fire. How many get `ALLOWED`? In this lab, expect close to all 20 — every request's `GET` races every other request's `GET`, all reading the same stale "under limit" value before any `INCR` lands. This is a textbook time-of-check-to-time-of-use (TOCTOU) bug, and it's the exact race [Rate Limiting](../../docs/reliability/rate-limiting.md)'s self-assessment checklist means by "why app clocks and `INCR`+`EXPIRE` are racy" — separate read-then-write steps are never safe under concurrency, regardless of which two commands you pick.

## Exercise 4 — Fix it: increment-then-check, atomically

```bash
docker exec labs-rate-limiter-redis-1 redis-cli DEL rl:fixed
SHA2=$(docker exec labs-rate-limiter-redis-1 redis-cli SCRIPT LOAD "$(cat atomic_fixed_window.lua)")
for i in $(seq 1 20); do
  (
    res=$(docker exec labs-rate-limiter-redis-1 redis-cli EVALSHA "$SHA2" 1 rl:fixed 10 5)
    [ "$res" = "1" ] && echo ALLOWED || echo DENIED
  ) &
done
wait
echo "final count: $(docker exec labs-rate-limiter-redis-1 redis-cli GET rl:fixed)"
```

[`atomic_fixed_window.lua`](atomic_fixed_window.lua) does the increment and the limit check inside one `EVAL` — there is no separate read step for two requests to race on. Run this and exactly 5 of the 20 concurrent requests should be `ALLOWED`, no matter how many times you repeat it.

## Tear down

```bash
docker compose down -v
```

## What this doesn't teach

This is single-instance Redis — it doesn't show the "per-instance limit is N× too generous" failure mode from having multiple app servers each with their own local counter (also called out in [Rate Limiting](../../docs/reliability/rate-limiting.md)). That failure needs a real multi-app-server setup to reproduce, not a Redis config change; the fix (shared Redis, which this lab already uses) is the point, not the bug.
