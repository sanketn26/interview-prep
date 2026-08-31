---
title: System Design Exercises
description: Guided designs. Architecture is revealed only after you have earned each box.
---

# System Design Exercises

Work each exercise with the solution covered. V1 is always the simplest useful system. A component that does not kill a named bottleneck does not belong.

Score a mock with the [assessment rubric](assessment.md) — do **not** require matching a reference architecture. Short worked examples of the reasoning loop: [Reasoning transcripts](../foundations/reasoning-transcripts.md).

!!! tip "Going past the checklist"
    Every exercise ends with a Self-Assessment checklist — good for confirming you covered the material. A few flagship exercises ([URL shortener](url-shortener.md), [Rate limiter](rate-limiter.md), [Payment processing](payment-processing.md), [WhatsApp](whatsapp.md)) also carry a **Five-Level Self-Assessment** (Explain → Predict → Diagnose → Design → Defend) — a harder bar than "did I cover it," testing whether you can reason about the design under a new scenario, not just recall it. Apply the same five questions to any other exercise here once you've worked through it: state the core mechanism in one sentence, predict what breaks under a named change in load, diagnose a symptom back to its likely cause, extend the design to a new requirement, and defend your choice against the next-most-obvious alternative.

## First release

| Exercise | Level | Status |
|----------|-------|--------|
| [Architectural subtraction](architectural-subtraction.md) | Senior / Staff | Complete |
| [URL shortener](url-shortener.md) | Foundation | Complete |
| [Rate limiter](rate-limiter.md) | Foundation / Senior | Complete |
| [Payment processing](payment-processing.md) | Senior / Staff | Complete |
| [WhatsApp / messaging](whatsapp.md) | Senior / Staff | Complete |
| [Distributed cache](distributed-cache.md) | Foundation / Senior | Complete |
| [Load balancer](load-balancer.md) | Foundation | Complete |
| [Autocomplete / typeahead](autocomplete.md) | Senior | Complete |
| [API gateway](api-gateway.md) | Senior | Complete |
| [Distributed KV store](distributed-kv-store.md) | Staff | Complete |
| [Web crawler](web-crawler.md) | Senior / Staff | Complete |
| [Notification system](notification-system.md) | Senior | Complete |
| [Social feed (Twitter/X)](social-feed.md) | Staff | Complete |
| [Pastebin](pastebin.md) | Foundation | Complete |
| [Instagram](instagram.md) | Staff | Complete |
| [YouTube / Netflix](video-streaming.md) | Staff | Complete |
| [Uber / Ride-Hailing](ride-hailing.md) | Staff | Complete |
| [Google Drive / File Sync](file-storage-sync.md) | Senior / Staff | Complete |
| [Collaborative Editor (Google Docs)](collaborative-editor.md) | Staff | Complete |
| [Distributed Message Queue](distributed-message-queue.md) | Staff | Complete |
| [Maps / Navigation](maps-navigation.md) | Staff | Complete |
| [Food Delivery](food-delivery.md) | Staff | Complete |
| [E-Commerce Platform](ecommerce-platform.md) | Senior / Staff | Complete |
| [Ticket Booking](ticket-booking.md) | Senior / Staff | Complete |
| [Hotel & Flight Booking](hotel-flight-booking.md) | Senior / Staff | Complete |
| [Online Auction](online-auction.md) | Senior / Staff | Complete |
| [Search Engine](search-engine.md) | Staff | Complete |
| [Recommendation System](recommendation-system.md) | Staff | Complete |
| [Ad Serving](ad-serving.md) | Staff | Complete |
| [Metrics & Monitoring](metrics-monitoring.md) | Senior / Staff | Complete |
| [Log Aggregation](log-aggregation.md) | Senior / Staff | Complete |
| [Distributed Job Scheduler](distributed-job-scheduler.md) | Staff | Complete |
| [Code Deployment / Release Orchestration](deployment-orchestration.md) | Staff | Complete |
| [Video Calling](video-calling.md) | Staff | Complete |
| [Capstone: The Scaling Journey (1K → 100M)](capstone-scaling-journey.md) | Staff | Complete |

## Planned

None — the original planned list is fully shipped.

Use the [capacity calculator](../foundations/requirements-estimation.md) and [design framework](../foundations/framework.md) on every exercise.
