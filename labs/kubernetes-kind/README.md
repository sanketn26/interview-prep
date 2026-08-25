# Lab: Kubernetes Request Path (kind)

Pairs with [Kubernetes](../../docs/kubernetes/index.md) and its request-flow simulator — the biggest gap in the labs before this, since that page had no real cluster to point at. A real 3-node kind cluster (1 control-plane + 2 workers), a real ingress controller, and a Deployment you can genuinely break in the specific ways that page warns about.

## Requirements

This one needs two extra tools beyond Docker:

```bash
brew install kind kubectl
```

## Start it

```bash
cd labs/kubernetes-kind
kind create cluster --name labs-k8s --config kind-config.yaml
kind get kubeconfig --name labs-k8s > /tmp/kind-labs-k8s.kubeconfig
export KUBECONFIG=/tmp/kind-labs-k8s.kubeconfig
kubectl get nodes   # wait for all three Ready
```

Install the ingress controller (the standard kind recipe — this cluster's `extraPortMappings` in `kind-config.yaml` are what let it bind to your host's port 8080):

```bash
kubectl apply -f https://raw.githubusercontent.com/kubernetes/ingress-nginx/main/deploy/static/provider/kind/deploy.yaml
kubectl wait --namespace ingress-nginx --for=condition=ready pod \
  --selector=app.kubernetes.io/component=controller --timeout=180s
```

Deploy the app:

```bash
kubectl apply -f manifests/app.yaml
kubectl wait --for=condition=ready pod -l app=hello --timeout=60s
curl http://localhost:8080/
```

You should see `hello from <pod-name>` — hit it a few times and watch the pod name rotate across the 3 replicas.

!!! note "A 503 on your very first request is normal"
    Right after `kubectl apply`, the ingress controller needs a moment to sync its config to match the new Ingress object. If the very first `curl` returns a 503, just retry — this is itself a small real lesson: the Ingress object existing doesn't mean the controller has picked it up yet.

## Exercise 1 — Break the Service selector (the classic lie)

```bash
kubectl patch service hello -p '{"spec":{"selector":{"app":"hello-typo"}}}'
kubectl get endpoints hello   # ENDPOINTS column: <none>
```

**Predict first:** does `curl http://localhost:8080/` fail immediately? Try it a few times in a row. The first request or two may still succeed — an already-open keepalive connection through the ingress controller can serve one more response before it notices the backend is gone. Keep going and it settles into a clean `503`. This is [Kubernetes](../../docs/kubernetes/index.md)'s "3/3 Ready, Grafana is green, users get 504" scenario, and the keepalive quirk is why it doesn't fail instantly and cleanly — a real incident often looks exactly this confusing at first.

Fix it:

```bash
kubectl patch service hello -p '{"spec":{"selector":{"app":"hello"}}}'
kubectl get endpoints hello   # back to 3 IPs
```

## Exercise 2 — Break a readiness probe (Running ≠ Ready ≠ serving traffic)

```bash
kubectl patch deployment hello --type=json \
  -p='[{"op":"replace","path":"/spec/template/spec/containers/0/readinessProbe/httpGet/port","value":9999}]'
```

This starts a rolling update where the new pods' readiness probe points at a port nothing is listening on. Watch it:

```bash
kubectl get pods -l app=hello -w
```

**Predict first:** does the rollout replace all 3 old pods with broken new ones? It shouldn't — Kubernetes won't route traffic to a not-ready pod, and by default won't finish a rolling update while new pods stay unready, so your old pods keep serving the whole time (`curl http://localhost:8080/` should keep working throughout). Diagnose the stuck pod the way [Kubernetes](../../docs/kubernetes/index.md#the-objects-that-matter) tells you to — walk the hop, don't guess:

```bash
kubectl describe pod -l app=hello --field-selector=status.phase=Running | grep -A2 Unhealthy
```

Expect `Readiness probe failed: ... connect: connection refused` — the exact failure, not a guess. Fix it:

```bash
kubectl patch deployment hello --type=json \
  -p='[{"op":"replace","path":"/spec/template/spec/containers/0/readinessProbe/httpGet/port","value":5678}]'
```

## Tear down

```bash
kind delete cluster --name labs-k8s
```

## What this doesn't teach

This is a single-machine kind cluster — every node is a container on your laptop, so there's no real multi-AZ scheduling, no real cloud LB in front of Ingress, and node-level resource pressure won't look like a real cluster's. For the CPU-throttle vs. OOMKilled distinction from [Kubernetes](../../docs/kubernetes/index.md#the-objects-that-matter)'s requests/limits section, you'd need to actually set tight limits on the Deployment and load-test it — a good next exercise to add to `manifests/app.yaml` yourself.
