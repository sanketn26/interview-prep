---
title: "Lab: Rate Limiter Races"
description: Reproduce a real TOCTOU race and a real TTL-never-expires bug with plain redis-cli, then fix both with one atomic Lua script.
---

# Lab: Rate Limiter Races

!!! example "Prediction checkpoint"
    Two workers will consume the final allowance concurrently. Predict the accepted-request count for a read-then-write counter and for an atomic update. The mismatch between the configured limit and observed admissions is the race you must explain.

**Pairs with:** [Rate Limiting](../reliability/rate-limiting.md)

No app code needed — just concurrent shell processes hitting a real Redis instance. Reproduces two real races: a naive `INCR`+`EXPIRE` counter whose window never actually closes under continuous traffic, and a check-then-act limiter that lets 20 requests through a limit of 5 under real concurrency. Both get fixed with one atomic Lua script.

## docker-compose.yml

```yaml
--8<-- "labs/rate-limiter/docker-compose.yml"
```

## atomic_incr_expire.lua

Fixes the "TTL never expires" bug — `EXPIRE` only fires on the request that creates the key:

```lua
--8<-- "labs/rate-limiter/atomic_incr_expire.lua"
```

## atomic_fixed_window.lua

Fixes the check-then-act race — increment and limit check happen inside one atomic `EVAL`, so there's no separate read step for two requests to race on:

```lua
--8<-- "labs/rate-limiter/atomic_fixed_window.lua"
```

## Exercises

The full walkthrough (reproduce both races with exact commands, verify the fix count is exactly 5 allowed / 15 denied under concurrency) lives in the lab's README:

**[labs/rate-limiter/README.md on GitHub](https://github.com/sanketn26/interview-prep/blob/main/labs/rate-limiter/README.md)**

```bash
git clone https://github.com/sanketn26/interview-prep
cd interview-prep/labs/rate-limiter
docker compose up -d
```

[← All Labs](index.md)
