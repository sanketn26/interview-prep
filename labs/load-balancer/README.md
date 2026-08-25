# Lab: Load Balancer Algorithms (nginx)

Pairs with [Load Balancing](../../docs/networking/load-balancing.md) and its simulator. Three real backends (`backend1`, `backend2` fast; `backend3` deliberately slow, 300ms/request) behind a real nginx `upstream` block — swap the algorithm by editing config and reloading, the same way you would in production.

## Start it

```bash
cd labs/load-balancer
docker compose up -d
docker compose ps
```

## Exercise 1 — Round robin, verified

```bash
for i in $(seq 1 12); do curl -s http://localhost:8080/; echo; done | sort | uniq -c
```

Should print `4 backend1 / 4 backend2 / 4 backend3` — perfectly even, blind rotation. Note it doesn't know or care that `backend3` is slower.

## Exercise 2 — Kill a backend, watch nginx route around it

```bash
docker stop labs-load-balancer-backend2-1
for i in $(seq 1 12); do curl -s -m 2 http://localhost:8080/; echo; done | sort | uniq -c
```

**Predict first:** does the client see any errors? Run it — expect `6 backend1 / 6 backend3`, zero failed requests. `proxy_next_upstream` + `max_fails`/`fail_timeout` in [`nginx.conf`](nginx.conf) mean nginx retries a failed backend against the next one in the pool *within the same client request* — the client never sees the dead backend at all. This is [Load Balancing](../../docs/networking/load-balancing.md#when-does-a-load-balancer-become-a-single-point-of-failure)'s passive health check in action.

```bash
docker start labs-load-balancer-backend2-1
```

## Exercise 3 — Swap the algorithm

Edit [`nginx.conf`](nginx.conf): comment out the round-robin `upstream backend_pool` block near the top, uncomment the **Exercise 5 (least connections)** block below it, then:

```bash
docker compose restart lb   # see note below on why "restart", not just reload
docker exec labs-load-balancer-lb-1 nginx -t
```

!!! warning "Bind-mount caching gotcha (real, not hypothetical)"
    On macOS with Colima/Docker Desktop, editing a bind-mounted file on the host and running `nginx -s reload` can fail with `pread() returned only N bytes instead of M` — the container's virtiofs layer served a stale cached file size after the host-side edit. This is a genuine filesystem-caching quirk of the virtualization layer, not a config error. `docker compose restart lb` forces a fresh mount read and reliably fixes it; a bare `nginx -s reload` sometimes doesn't. Worth knowing before you assume your config is broken.

Now fire concurrent (not sequential) requests — the difference from round robin only shows up when requests actually overlap in time:

```bash
for i in $(seq 1 15); do curl -s http://localhost:8080/ > "/tmp/lb_$i.txt" & done
wait
cat /tmp/lb_*.txt | grep -o "backend[0-9]" | sort | uniq -c
rm -f /tmp/lb_*.txt
```

**Predict first:** should `backend3` (the slow one) get an equal, greater, or smaller share than round robin gave it? Least-connections routes to whichever backend currently has the fewest in-flight requests — since `backend3` takes 300ms to finish each one, it accumulates in-flight requests fast and stops looking "least busy" almost immediately, so it should end up with noticeably *fewer* requests than the two fast backends, unlike round robin's blind even split.

Revert `nginx.conf` back to round robin (comment `least_conn` block, uncomment the plain one) and `docker compose restart lb` when done, so the lab resets to its default state for the next run.

## Exercise 4 — Weighted round robin

Same swap procedure, using the **Exercise 4 (weighted)** block instead — `backend1` gets weight 5 vs. 1 for the others. Re-run Exercise 1's sequential loop and confirm `backend1` gets roughly 5× the others' share.

## Tear down

```bash
docker compose down -v
```

## What this doesn't teach

This is L7 (HTTP-aware) load balancing via nginx's `proxy_pass`. It doesn't cover L4 (TCP-level) balancing, consistent-hash-based routing for session affinity, or a real DNS-based/anycast layer in front of the LB itself — see [Load Balancing](../../docs/networking/load-balancing.md) for where those fit and why they're different problems.
