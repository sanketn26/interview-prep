---
title: "Lab: Terraform + Docker"
description: Real Terraform plan/apply/destroy against real containers — no cloud account needed. Prove idempotency, trigger real drift, watch a real forced replacement.
---

# Lab: Terraform + Docker

!!! example "Prediction checkpoint"
    You will change managed infrastructure outside Terraform, then run a plan. Predict which drift is detected and whether apply replaces or updates the resource. Read the plan as a proposed state transition before approving it.

**Pairs with:** [Infrastructure as Code](../cloud/infrastructure-as-code.md), [Terraform](../cloud/terraform.md)

Real Terraform, managing real containers on your local Docker daemon via the [`kreuzwerker/docker`](https://registry.terraform.io/providers/kreuzwerker/docker/latest) provider. Every concept from the two pages above is reproducible here: `plan`/`apply`, idempotency, drift, forced replacement, blast radius via `count` — with zero AWS/GCP/Azure account needed.

Needs Terraform in addition to Docker: `brew tap hashicorp/tap && brew install hashicorp/tap/terraform`.

## main.tf

```hcl
--8<-- "labs/terraform-docker/main.tf"
```

## variables.tf

```hcl
--8<-- "labs/terraform-docker/variables.tf"
```

## outputs.tf

```hcl
--8<-- "labs/terraform-docker/outputs.tf"
```

## Exercises

The full walkthrough (idempotent re-apply, real drift detection, scaling via a variable without touching existing resources, a real `-/+` forced-replacement plan) lives in the lab's README:

**[labs/terraform-docker/README.md on GitHub](https://github.com/sanketn26/interview-prep/blob/main/labs/terraform-docker/README.md)**

```bash
git clone https://github.com/sanketn26/interview-prep
cd interview-prep/labs/terraform-docker
export DOCKER_HOST=$(docker context inspect -f '{{.Endpoints.docker.Host}}')
terraform init
terraform apply
```

[← All Labs](index.md)
