# Lab: Terraform Against Docker (no cloud account needed)

Pairs with [Infrastructure as Code](../../docs/cloud/infrastructure-as-code.md) and [Terraform](../../docs/cloud/terraform.md). Real Terraform, managing real containers on your local Docker daemon via the [`kreuzwerker/docker`](https://registry.terraform.io/providers/kreuzwerker/docker/latest) provider — every concept from those two pages (plan/apply, idempotency, drift, forced replacement, blast radius via `count`) is reproducible here without touching AWS/GCP/Azure.

## Requirements

```bash
brew tap hashicorp/tap
brew install hashicorp/tap/terraform   # terraform was pulled from homebrew-core; this tap is the official source
```

Terraform's Docker provider talks to the daemon over its socket, not the `docker` CLI — point it at whichever socket your Docker context actually uses (Docker Desktop, Colima, Rancher Desktop all differ here):

```bash
export DOCKER_HOST=$(docker context inspect -f '{{.Endpoints.docker.Host}}')
```

Run this in every new shell before using this lab — it's not saved anywhere.

## Start it

```bash
cd labs/terraform-docker
terraform init
terraform plan
```

Read the plan like [Terraform](../../docs/cloud/terraform.md#the-core-workflow) tells you to: `+` create, `~` update in place, `-/+` destroy-and-recreate. This one should be all `+` — 1 image, 2 containers, nothing exists yet.

```bash
terraform apply -auto-approve
docker ps
curl http://localhost:8080/   # nginx welcome page, served by a container Terraform just created
curl http://localhost:8081/
```

## Exercise 1 — Idempotency, proven

```bash
terraform plan
```

Should print `No changes. Your infrastructure matches the configuration.` Run `apply` again if you like — nothing happens. This is [Infrastructure as Code](../../docs/cloud/infrastructure-as-code.md#idempotency-the-property-that-makes-re-running-safe)'s core property, not a claim: the same config, applied twice, produces the same result as applying it once.

## Exercise 2 — Drift, detected

Delete a container the way an on-call engineer would at 2am — by hand, outside Terraform:

```bash
docker stop tf-web-1 && docker rm tf-web-1
terraform plan
```

**Predict first:** does Terraform notice? Run it — expect `1 to add, 0 to change, 0 to destroy`. Terraform's refresh step queried the real Docker daemon, found `tf-web-1` gone, and is proposing to recreate it. This is [Terraform](../../docs/cloud/terraform.md)'s drift detection working exactly as designed — reality diverged from state, and `plan` surfaced the diff instead of silently ignoring it.

```bash
terraform apply -auto-approve   # recreates tf-web-1
```

## Exercise 3 — Scale via a variable, blast radius contained

```bash
terraform apply -auto-approve -var="web_count=4"
docker ps --format "{{.Names}}"
```

**Predict first:** does this touch `tf-web-0` and `tf-web-1`? It shouldn't — Terraform's dependency graph knows only `tf-web-2` and `tf-web-3` are new, and leaves the existing two running untouched. Compare this to what an imperative "delete everything, recreate N containers" script would have done.

## Exercise 4 — Forced replacement (`-/+`), and why it's dangerous

Edit `main.tf`: change `internal = 80` to `internal = 8080` in the `ports` block, then:

```bash
terraform plan -var="web_count=4"
```

**Predict first:** update in place, or destroy-and-recreate? Port mappings can't be changed on a running container — Docker requires removing and re-creating it — so expect `~ internal = 80 -> 8080 # forces replacement` on every container, and `4 to add, 0 to change, 4 to destroy`. This is [Terraform](../../docs/cloud/terraform.md#the-core-workflow)'s warning made concrete: "`-/+` is the line that causes outages... for a database means data loss unless you've planned for it." Here it's harmless (stateless nginx containers) — for a real database resource, this exact plan output is the moment to stop and find a non-destructive path instead of applying.

Revert the port change back to `80` before continuing.

## Tear down

```bash
terraform destroy -auto-approve
```

Confirm nothing's left: `docker ps -a` should show no `tf-web-*` containers.

## What this doesn't teach

This lab has no remote backend — state lives in a local `terraform.tfstate` file (gitignored), so it can't demonstrate the multi-engineer state-race problem [Terraform](../../docs/cloud/terraform.md#state-the-part-that-actually-matters) describes, or real locking. It also uses a single flat config, not the module structure or multi-state blast-radius split that page recommends for production — both are worth reading about even though this lab, deliberately, doesn't need them at this size.
