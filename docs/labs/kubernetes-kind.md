---
title: "Lab: Kubernetes (kind)"
description: A real 3-node local Kubernetes cluster — break a Service selector or a readiness probe and diagnose it with real kubectl.
---

# Lab: Kubernetes (kind)

**Pairs with:** [Kubernetes](../kubernetes/index.md)

A real 3-node cluster (1 control-plane + 2 workers) with a real ingress controller. Break a Service selector and watch a stale keepalive connection survive it briefly before failing; break a readiness probe mid-rollout and watch Kubernetes correctly refuse to finish replacing working pods with broken ones — diagnosed with real `kubectl describe`, not a guess.

Needs `kind` and `kubectl` in addition to Docker: `brew install kind kubectl`.

## kind-config.yaml

```yaml
--8<-- "labs/kubernetes-kind/kind-config.yaml"
```

## manifests/app.yaml

```yaml
--8<-- "labs/kubernetes-kind/manifests/app.yaml"
```

## Exercises

The full walkthrough (deploy, break the Service selector, break a readiness probe, diagnose each with `kubectl`) lives in the lab's README:

**[labs/kubernetes-kind/README.md on GitHub](https://github.com/sanketn26/interview-prep/blob/main/labs/kubernetes-kind/README.md)**

```bash
git clone https://github.com/sanketn26/interview-prep
cd interview-prep/labs/kubernetes-kind
kind create cluster --name labs-k8s --config kind-config.yaml
```

[← All Labs](index.md)
