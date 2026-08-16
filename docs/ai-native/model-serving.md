---
title: Model Serving
description: Serving an LLM is a batching and memory problem, not a REST-API problem — queueing, KV cache, GPU cold starts, and the cost model that follows from all three.
prerequisites:
  - Basic familiarity with REST API serving (helpful context)
---

# Model Serving

**Prerequisites:** none strictly required — helpful to have served a conventional REST API before.

[← AI-Native Design](index.md)

---

## Why This Exists

A conventional REST API's cost model is roughly: more requests, more CPU, scale horizontally, done — each request is cheap, stateless, and independent. Serving a large model breaks every part of that assumption. A single inference request can occupy tens of gigabytes of GPU memory, take seconds instead of milliseconds, and produce output token-by-token rather than all at once. Treating model serving like "a REST API that happens to call a model" produces systems that either waste enormous GPU spend on underutilization or fall over the first time concurrent load actually arrives.

The interview-relevant skill is understanding that model serving is fundamentally a **batching and memory management problem wearing an HTTP API's clothes.** Throughput and latency are in direct tension — batching more requests together raises GPU utilization and throughput but raises the latency of every request in that batch, because they all wait for the slowest one. Get that trade-off right and autoscaling, cost, and failure modes all follow logically.

!!! tip "Mental model"
    A GPU running inference is like a **kitchen with one large oven that's only efficient when full.** Cooking one dish at a time wastes most of the oven's capacity — most of a modern GPU's compute goes idle serving one request, because it's memory-bandwidth bound, not compute bound, at batch size one. Cramming in more dishes (bigger batches) uses the oven efficiently, but now every dish waits for the slowest one to finish, and if you queue too many, the first orders get cold before they're served. The whole discipline of model serving is deciding how full to pack the oven and how long anyone's willing to wait for the batch to fill.

---

## Batching Strategies

**Static batching** — the naive approach: collect N requests, run them through the model together as one fixed-size batch, return all N results together. Simple, but the batch can't start until it's full (adds latency waiting to fill) and the whole batch is only as fast as its longest-generating request — a request needing 500 output tokens holds up 31 other requests that only needed 20.

**Dynamic / continuous batching** (the vLLM-style approach that most production serving stacks now use) — requests join and leave the batch at the token-generation-step granularity, not per-request. As soon as one request finishes generating, its slot in the batch is immediately reused by the next waiting request, instead of waiting for the entire batch to complete. This turns a batch-of-32 that was previously bottlenecked by its slowest member into a rolling pipeline where GPU utilization stays high and no finished request's slot sits idle.

**KV cache management** — during autoregressive generation, each new token's attention computation needs the key/value tensors from every previous token in the sequence. Recomputing them from scratch each step would be enormously wasteful, so they're cached (the "KV cache") and reused. The catch: the KV cache grows linearly with sequence length and is held in GPU memory for the entire lifetime of a request — it's usually the actual constraint on how many concurrent requests fit on a GPU, not the model weights themselves. This is why techniques like **PagedAttention** (allocating KV cache in non-contiguous, page-sized blocks, the same idea as OS virtual memory paging) matter: naive contiguous allocation fragments memory and wastes a large fraction of it, capping concurrency well below what the hardware could otherwise support.

---

## Request Flow Through a Model Server

```mermaid
flowchart LR
    REQ[Incoming request] --> Q[Request queue]
    Q --> BAT["Continuous batcher<br/>(admits/evicts per token step)"]
    BAT --> GPU["GPU inference<br/>(KV cache resident in memory)"]
    GPU -->|next token| BAT
    GPU -->|stream tokens as generated| STREAM[Streamed response to client]
    BAT -.request finished, slot freed.-> Q
    style GPU fill:#6a1b9a,color:#fff
```

The loop back from GPU to batcher is the key structural difference from a stateless REST call: a single request occupies a slot across many iterations of this loop (one per output token), not one pass through.

---

## Autoscaling and Cold Starts

Autoscaling a conventional container is fast — pull an image (probably cached), start a process, pass a health check, seconds. Autoscaling a model server is not: **loading model weights onto a GPU is the dominant cost of a cold start**, and it scales with model size — a few seconds for a small model, tens of seconds to minutes for a large one, before the instance can serve a single request. An autoscaler that reacts to a traffic spike by launching new GPU instances is often too slow to help with that spike; by the time the new instance is warm, the spike may have passed (or, worse, already caused a cascade of timeouts upstream).

The practical implications:

- **Scale on a leading indicator**, not on current load — queue depth or request-rate trend, provisioned ahead of the traffic pattern where predictable, rather than reactive CPU/GPU-utilization-based scaling that only reacts after the GPU is already saturated.
- **Keep a warm minimum** of instances rather than scaling to zero, if latency SLOs can't tolerate a multi-minute cold start.
- **Model versioning / canary rollout** carries the same cold-start tax on every new revision: rolling a new model version means loading a second copy of (potentially) tens of GB of weights onto GPU memory before it can take traffic, so canarying a model version is a slower, more resource-intensive version of canarying a stateless service — budget GPU memory headroom for the old and new version to coexist during the rollout window, not just replica count.

---

## Cost Model

GPU serving is billed by **GPU-hours**, not by request — so the unit economics that matter are GPU-hours-per-request (a function of batch efficiency and generation length) and GPU utilization (idle GPU-hours are pure waste, same as idle EC2 instances, just far more expensive per hour).

**Quantization** is the primary lever for trading cost/latency against quality: running a model at lower numerical precision (FP16 → INT8 → INT4) shrinks its memory footprint and increases throughput, at some cost to output quality that's workload-dependent — noticeable on tasks needing precise reasoning or exact recall, often negligible on tasks like classification or casual generation. The engineering judgment call is not "quantize or don't," it's "what's the actual quality delta on *this* workload," measured with an eval set, not assumed.

| Lever | Effect on cost | Effect on latency/quality |
|---|---|---|
| Larger batch size | Lower cost per request (better GPU utilization) | Higher per-request latency (more requests sharing compute) |
| Quantization (FP16 → INT8/INT4) | Lower cost (smaller memory footprint, higher throughput) | Some quality loss, workload-dependent |
| Smaller/distilled model | Lower cost | Lower ceiling on task complexity the model can handle |
| Managed inference API vs. self-hosted | Pay-per-token, no idle cost | No control over batching/quantization decisions, per-token markup |

---

## Realistic Example

**Serving a 70B-parameter model on A100 80GB GPUs — illustrative numbers, but internally consistent with how the memory math actually works.**

A 70B-parameter model at FP16 needs roughly 140GB just for weights (2 bytes/parameter × 70B) — too large for a single A100 80GB. Tensor-parallel across **2× A100 80GB** gives 160GB of combined GPU memory: ~140GB for weights, leaving **~20GB for KV cache** across all concurrent requests.

KV cache cost per token (a 80-layer, 8-KV-head, 128-head-dim architecture, FP16): `2 (K and V) × 80 layers × 8 KV heads × 128 head-dim × 2 bytes ≈ 320KB per token`. At an average context length of ~2,048 tokens in flight per request, one request's KV cache costs `2,048 × 320KB ≈ 640MB`. A **batch size of 32** therefore needs `32 × 640MB ≈ 20GB` — which is exactly the KV cache budget left over after weights. This is why batch size 32 is close to the practical ceiling for this model/hardware pair before hitting OOM, not an arbitrary round number.

**Throughput:** continuous batching at batch 32 on this 2-GPU setup yields roughly **1,120 aggregate output tokens/sec**. Because all 32 requests share that aggregate rate, each individual request progresses at about `1,120 ÷ 32 ≈ 35 tokens/sec`. For an average response length of 300 output tokens, that's `1,120 ÷ 300 ≈ 3.7 requests/sec` completing end-to-end.

**Cost:** on-demand A100 80GB pricing (illustrative, ~$4.10/GPU-hour) × 2 GPUs = **$8.20/hr**. That works out to:

- `$8.20 ÷ (1,120 tokens/sec × 3,600 sec/hr) × 1,000,000 ≈ $2.03 per 1M output tokens`
- `$8.20 ÷ (3.7 req/sec × 3,600 sec/hr) ≈ $0.0006 per request` (at the 300-token average response length above)

**The lever this makes concrete:** quantizing to INT8 roughly halves the weight footprint (140GB → ~70GB), which on the same 2× A100 80GB setup frees ~90GB for KV cache instead of ~20GB — enough headroom to roughly quadruple the batch size (and therefore aggregate throughput) before hitting the same memory ceiling, at whatever quality cost INT8 has on this specific workload. That's the batching/memory/cost triangle from the sections above, with numbers attached instead of just relationships.

---

## Failure Modes

**OOM from bad batch sizing.** The KV cache's memory footprint depends on both batch size *and* sequence length, and long-sequence requests arriving unpredictably can push a server past its memory budget mid-batch — a batch that fit fine with short-average-length requests OOMs the moment a handful of long-context requests land in it together. Production servers need admission control that accounts for *sequence length*, not just request count, when deciding what to admit into a batch.

**Tail latency from head-of-line blocking.** Even with continuous batching, a request needing an unusually long output can occupy a batch slot for far longer than its neighbors, and if admission control isn't fair, new short requests queue up behind it. This shows up as a p50 that looks fine and a p99 that's wildly worse — a classic tail-latency signature, but caused by generation-length variance rather than the usual resource-contention causes.

**Thundering herd on model reload.** When a model server restarts or a new version deploys, every held-open client connection and every in-flight request either fails or queues, and clients that retry immediately all hit the newly-started instance at once — during the exact window it's still loading weights and hasn't warmed up. This is the model-serving version of a classic cache-stampede pattern, except the "cache" here is tens of gigabytes of GPU-resident weights, so the recovery window is much longer and the herd has much more time to pile up.

---

## Production Debugging

**"Why is p99 latency spiking while p50 looks normal?"**

- Check output-length distribution for the spiking window — a shift toward longer generations (a prompt pattern change, a different user cohort) inflates tail latency even with unchanged request volume.
- Check queue depth and batch admission logs — if requests are waiting longer before being admitted to a batch, that's a saturation signal, not a generation-length signal.
- Decision tree: long queue wait + normal generation time once admitted → under-provisioned, add capacity. Short queue wait + long generation time → output-length driven, consider max-token caps or a separate queue class for long-generation requests.

**"Why did we get a wave of 5xxs / OOM restarts?"**

- Correlate OOM restart timestamps against request volume *and* average sequence length — a volume-flat but sequence-length-up window points at admission control not accounting for KV cache size, not raw overload.
- Check GPU memory utilization metrics leading up to the crash — a slow climb points at a KV cache leak (requests not releasing their cache slot on completion/cancellation); a sudden spike points at an admission-control gap on a single oversized batch.

**"Why did latency spike right after a model deploy?"**

- Check whether the new version's instances were serving traffic before finishing weight load — a rollout that routes traffic before the readiness check accounts for weight-load completion (not just process-up) will serve from a cold/partially-loaded instance.
- Confirm canary traffic percentage and GPU memory headroom during the rollout window — insufficient headroom for old+new versions coexisting can force premature eviction of the old version's warm instances before the new one is fully validated.

---

## Trade-offs

| Approach | Win | Cost |
|---|---|---|
| Self-hosted GPU serving (vLLM, TGI, Triton) | Full control over batching, quantization, cost tuning; no per-token markup | You own capacity planning, scaling, and every failure mode above |
| Managed inference API (hosted model endpoints) | No infra to run, pay-per-token, someone else handles batching/scaling | Per-token cost is higher at scale; no control over batching strategy or model version pinning cadence |
| Serverless GPU (scale-to-zero GPU platforms) | No idle cost during low/no traffic | Cold-start weight-load tax on every scale-from-zero event; poor fit for latency-sensitive, spiky-but-frequent traffic |
| Static batching | Simple to reason about and implement | Head-of-line blocking by design; poor GPU utilization at low load |
| Continuous batching | High GPU utilization, better tail latency under mixed workloads | More complex serving stack; needs a framework (vLLM, TGI) rather than a hand-rolled batcher |
| Aggressive quantization (INT4) | Large cost/throughput win | Quality regression that must be measured per-workload, not assumed acceptable |

---

## Interview Questions

=== "Foundation"
    **Q: Why can't you just serve a large model the way you'd serve a normal REST API?**

    "A normal REST API request is cheap, stateless, and fast — you scale by adding more identical processes. A model-serving request occupies significant GPU memory for the KV cache, takes much longer per request, and generates output incrementally. Because of that, GPU utilization at batch-size-one is poor — most of the GPU sits idle waiting on memory bandwidth, not compute. So serving efficiently means batching multiple requests together to keep the GPU busy, which introduces a real latency/throughput trade-off that a stateless REST API never has to make."

=== "Senior"
    **Q: Your model server's p99 latency is 5x its p50, but overall GPU utilization looks healthy. What's your hypothesis and how do you confirm it?**

    "My first hypothesis is generation-length variance combined with head-of-line blocking — a small number of requests needing long outputs are occupying batch slots much longer than the median request, and if admission control isn't accounting for that, short requests queue up behind them. I'd confirm by pulling the output-token-count distribution for the slow window and checking whether it correlates with the p99 spike, and separately checking queue-wait time versus in-batch generation time for the slow requests — long queue wait points at pure saturation, long generation time points at the length-variance theory. If it's length variance, the fix is either a separate queue/priority class for long-generation requests or a max-token cap, not just adding more GPU capacity, which wouldn't fix the underlying head-of-line blocking."

=== "Staff"
    **Q: Your org is deciding between self-hosting model serving on GPUs versus using a managed inference API, for a product with unpredictable, bursty traffic. How do you frame the decision?**

    "This is a build-vs-buy decision shaped by traffic predictability and by how much the cost-per-token actually matters at your volume, not a categorical 'self-host is always cheaper' answer — because at low-to-moderate, bursty volume, the idle GPU-hours you pay for while under-provisioned to handle bursts frequently cost more than a managed API's per-token markup would. I'd model both: for self-hosting, GPU-hours needed to cover the traffic pattern including headroom for bursts, plus the engineering cost of building and operating the serving stack, cold-start mitigation, and monitoring; for managed, the per-token cost at projected volume plus the constraint of not controlling batching or quantization decisions. The crossover point is usually a function of steady-state utilization — if traffic is bursty and unpredictable, a managed API's pay-per-token model avoids paying for idle capacity; once volume is large and predictable enough to keep self-hosted GPUs consistently utilized, the economics flip toward self-hosting. I'd also flag that this isn't a permanent decision — a product can start on a managed API to avoid the upfront serving-infra investment and migrate to self-hosted once volume justifies the operational cost."

---

## Key Takeaways

!!! success "Remember"
    1. Model serving is a batching and memory problem, not a stateless-request problem — GPU utilization at batch-size-one is poor because inference is memory-bandwidth bound
    2. Continuous batching (vLLM-style) beats static batching by admitting/evicting requests at the token-step level instead of waiting for a whole batch to finish
    3. The KV cache, not the model weights, is usually the actual constraint on concurrency — it grows with sequence length and lives in GPU memory for the request's full lifetime
    4. GPU cold starts are dominated by weight-load time, which can be far worse than a container cold start — scale on leading indicators or keep a warm minimum, don't rely on reactive autoscaling alone
    5. Quantization and batch size are the two levers on the cost/latency/quality triangle — measure quality impact per-workload, don't assume it

**Previous:** [AI-Native Design](index.md)
