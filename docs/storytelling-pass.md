---
title: Storytelling pass — plan
description: Validated audit of why the curriculum does not hold attention, and the file-level rewrite plan to add narrative without diluting engineering.
---

# Storytelling pass — plan

**Status:** Plan only. No page rewrites in this change.  
**Date:** 2026-09-15  
**Trigger:** Reader feedback — content is valued; it does not hold attention. Primary cause named by readers: **lack of storytelling**.

This document is the scan, the verdict, the change list, and the execution order. Implement against it; do not start a free-form "make it more engaging" rewrite.

---

## Verdict

The feedback is **correct**, and it is **not a coverage or accuracy problem**.

The academy already opens most concept pages on a problem (`Why This Exists`), already has V1 → bottleneck → V2 on design exercises, and already has STAR stories on behavioural pages. That is why readers appreciate the content.

What they bounce on is the **texture after the first heading**: thesis, taxonomy, abstraction tabs, then a catalog. The page is a well-organized handbook. It is rarely a story with an actor, a clock, a stake, and a next beat.

A 2026-08 accuracy pass (`content-review.md`) and a quality-matrix pedagogy pass (`quality-matrix.md`) already ran. Neither audited **attention**. This pass is the missing column.

---

## What we scanned

Method (reproducible):

1. Close-read gold vs weak openings across concept, design exercise, DSA, LLD, lab, behavioural, and vendor-DB pages.
2. Score **210** `docs/**/*.md` pages (excluding `assets/` and the process pages `content-review.md`, `dashboard.md`, `project-status.md`, `quality-matrix.md`, `roadmap.md`, `how-to-use.md`) for story signals: scene words, incident blocks, analogy, V1/break arc, character ("you/I/we"), quoted dialogue, time/place, stakes in the opening.
3. Classify the first ~12 body lines as `scene/hook`, `problem-led`, `definition/meta`, or `mixed`.

Heuristic grades are a **triage tool**, not a quality score. A page can be technically Complete and still be `weak` on story.

| Signal | Result |
|--------|--------|
| Pages scanned | 210 |
| Opening type `definition/meta` | **144 / 210 (69%)** |
| Opening type `scene/hook` | 21 |
| Opening type `problem-led` | 20 |
| Pages with `!!! example "Incident narrative"` | **1** (`reliability/failure-library.md`) |
| `## Why This Exists` (or pattern/question variant) | 111 |
| V1 / bottleneck / "what breaks" language somewhere | 115 |
| Heuristic `strong` / `partial` / `weak` | 8 / 74 / 128 |

Worst clusters (almost all `weak` on story, even when Complete on the quality matrix):

| Cluster | n | Story grade | Typical shape |
|---------|---|-------------|---------------|
| DSA | 20 | 20 weak | Pattern + complexity + visualizer. No scene. |
| LLD exercises | 16 | 16 weak | "Design a parking lot." Then FR list, entities, UML. |
| Labs (docs stubs) | 11 | 11 weak | One paragraph + YAML include + GitHub link. |
| Databases (esp. vendor drafts) | 12 | 10 weak | Encyclopedia parts ("Part 1: MVCC"). |
| Networking | 8 | 7 weak | Protocol catalog after a decent one-line why. |
| System-design exercises | 37 | 19 weak, 17 partial, 1 strong | Interview protocol: Problem → questions → FR/NFR table. |
| Behavioural | 12 | 10 partial, 2 weak | Framework first; the actual story is buried in seniority tabs. |

First-release vertical slice (what README tells people to study) is **mixed**. Circuit breaker, Kafka, cache stampede, Raft, tail latency, debugging playbook, and the design framework already *are* stories. CAP, sharding, consistent hashing, URL shortener, DSA patterns, and technical-disagreement are not.

---

## What "storytelling" means here

Not fiction. Not TED-talk metaphors. Not "corporate storytelling" (the behavioural hub already rejects that).

For this academy, a page has a story when a reader can answer, after the first screen:

1. **Who** is under pressure (on-call, user, interviewer, a specific service).
2. **What just happened** (a metric, a remap storm, a hung checkout, a LeetCode clock).
3. **What is at stake** if they get the next decision wrong.
4. **What they will try first** (the naive, respectable move).
5. **What that move breaks** — with a number.
6. **What mechanism is earned by that break.**

If those six beats are present, the rest of the page can stay dense. If they are missing, diagrams and interview Q&A will not hold attention.

**One plot per page.** Every later section is a beat of that plot, not a new chapter of a textbook.

---

## Why the current contract produces this

Three process facts, not three author failures:

1. **`CONTRIBUTING.md` mandates a 10-section handbook** (Why → Mental model → Architecture → Internals → Example → Failures → Debugging → Trade-offs → Interview Q → Takeaways). That is a completeness checklist. It is also a story-killer: authors satisfy the list instead of carrying one incident through the page.
2. **`quality-matrix.md` scores Req / Pred / # / V1 / Fail / Mech / Viz / Prod / TO / Exit.** A page can tick every column and still open like a definition. There is no Story / cold-open column.
3. **Abstraction Levels tabs** (`Mental Model` / `Interview Simplification` / `Production Reality` / `Where This Stops Being True`) often sit **immediately after the hook**, before the plot has a second beat. They are the right content in the wrong place — they belong after the first failure, as commentary on the story, not as a glossary interrupt.

Design exercises have a fourth cause: the **interview protocol is the page outline** (clarifying questions → FR → NFR table → capacity). That is how you *practice*. It is not how you *enter*. Pastebin and food-delivery already prove you can keep the protocol *and* put a distinguishing insight in the problem statement; most exercises still open as "Design a URL shortening service (like bit.ly)."

---

## Gold standards (copy these, do not invent a new voice)

Use existing pages as the style guide. Do not introduce a second authorial persona.

| Page | Why it holds attention |
|------|------------------------|
| [`reliability/circuit-breakers.md`](reliability/circuit-breakers.md) | Named services (Payments, Fraud), a number (p99 80ms → latched), a stupid-respectable next move (retries ×3 = 4 attempts), the murder of the dependency, *then* the fuse analogy. |
| [`messaging/kafka.md`](messaging/kafka.md) | "1 producer → 1 topic → 1 consumer, 10 MB/s. Works. Now 500 MB/s." Scale is the antagonist. |
| [`performance/cache-stampede.md`](performance/cache-stampede.md) | Happy cache → one hot key expires → 1,000 identical queries. Time-to-disaster is one paragraph. |
| [`performance/tail-latency.md`](performance/tail-latency.md) | Dashboard looks fine; Slack is on fire. The lie of the average is the opening scene. |
| [`distributed-systems/raft.md`](distributed-systems/raft.md) | Three servers, five questions, split brain as the thing you can *see*. |
| [`foundations/framework.md`](foundations/framework.md) | Interviewer prompt + the freeze + the Super Bowl / celebrity / offline-device beats. |
| [`observability/debugging-playbook.md`](observability/debugging-playbook.md) | "You do not start with a definition of p99. You start with a page that looks *almost* fine." Then a concrete dashboard. |
| [`reliability/failure-library.md`](reliability/failure-library.md) | Only page with `!!! example "Incident narrative"` — 8–12 lines, one system, one number, one fix. This is the reusable incident block. |
| [`foundations/reasoning-transcripts.md`](foundations/reasoning-transcripts.md) | Inner monologue of a senior in the first 15 minutes. Voice to steal for design-exercise cold opens. |
| [`behavioural/production-incident.md`](behavioural/production-incident.md) (seniority tabs only) | The Staff answer *is* a story (Black Friday, Zoom, scribe, VP every 10 minutes). The page *around* it is still a framework. Promote the story; demote the preamble. |

---

## Anti-patterns found (do not repeat)

| Anti-pattern | Example | Fix |
|--------------|---------|-----|
| Definition after the H1 | Sharding: physical limits, then "**Sharding** = splitting data…" | Keep the limit. Cut the bold definition; let the split *happen* in a scene (one primary, write QPS, disk full at 02:00). |
| History-as-opening | CAP: "In 2000, Eric Brewer observed…" | Brewer can stay as a footnote. Open on two nodes and a pulled cable (the mental model already does this — *move it up*). |
| Protocol-as-opening | URL shortener, Parking Lot, most LLD/design pages | 8-line product failure or interview freeze *before* "1. Problem Statement". Keep the numbered protocol. |
| Framework-before-story | Technical disagreement: "Why this question gets asked" → interviewer bullet list → STAR diagram → *then* the Mongo vs Postgres quote | Lead with the disagreement scene. Teach STAR as the retell, not the cold open. |
| Encyclopedia parts | `postgresql.md` Parts 1–7 | One running incident (a slow `UPDATE` under read load) that *discovers* MVCC, then indexes, then pooling. |
| Tabs too early | CAP, circuit breaker, HTTP/TCP | Delay Abstraction Levels until after Naive → Break. |
| Analogy without a body | Sharding's library-room note is good; it sits under ASCII art, not in the plot | Make the analogy the second beat, not a sidebar. |
| Lab as YAML | `docs/labs/*.md` | Cold open: what you will *cause*, what to predict, what the log line looks like if you are right. YAML after. |
| Length without beats | `cache-strategies.md` (~5.5k words), several 5k+ design exercises | Do not add story on top. Cut a catalog section for every scene you add. Net word count should not grow more than ~10% per page; prefer replace. |
| Vague "you" | "Most engineers learn failure modes one incident at a time" | Named service + metric + time. Failure-library incident blocks already show the density. |

---

## Change contract (new, additive)

Add this as a **required beat**, not a 11th encyclopedia section. Update `CONTRIBUTING.md` and add a **Story** column to `quality-matrix.md` in Phase 0.

### Cold open (first screen, before any tab set)

8–12 lines after the title/prereqs. Must contain actor, system, observable, stake, and a question the page will answer. No definition of the term in sentence one.

### Plot beats for a concept page

| Beat | Heading (flexible) | Job |
|------|--------------------|-----|
| 1. Cold open | (no heading, or `## Why This Exists` rewritten as a scene) | Hook |
| 2. Naive move | `## What you try first` / existing `Naive System → What Breaks` | Respectable wrong answer |
| 3. The break | numbers, a log line, a dashboard | Earn the mechanism |
| 4. Mechanism | existing Architecture / Mechanics | Only what the break requires |
| 5. The mechanism's own failure | existing Failure Modes | Next antagonist |
| 6. When it stops being true | existing Abstraction tab / Production Reality | Staff-level turn |
| 7. 60-second retell | one interview answer that *narrates the same plot* | Transfer |

Keep diagrams, sims, trade-off tables, interview Qs, takeaways. Reorder so they sit on beats 3–7, not on beat 1.

### Incident block (reuse everywhere)

```markdown
!!! example "Incident"
    **02:14** checkout p99 80ms → 6s. CPU 40%. Fraud p99 4s. Payments has no timeout.
    **Naive:** retry Fraud ×3. Load at Fraud ×4. Circuit never opens; thread pool latches.
    **Move:** timeout 150ms, retry budget 10%, breaker on Fraud only.
    **Tell:** "We were latched to a sick dependency. Timeouts first, then a budget, then a breaker."
```

One of these per concept page. Failure-library already has the voice.

### What not to add

- Invented companies with lore
- Joke-heavy analogies that do not map 1:1 onto the mechanism
- A "story" section that restates the page
- Extra length on pages already >4,000 words without a matching cut

---

## Genre-specific changes

### A. Concept pages (distributed systems, reliability, performance, messaging, foundations)

**Change:** Rewrite the opening and delay Abstraction Levels. Do not rebuild the internals.

**Highest leverage files (first-release + obvious definition opens):**

| File | Current open | Required change |
|------|--------------|-----------------|
| `distributed-systems/cap-theorem.md` | Brewer 2000 + three definitions | Pulled cable, Node A, accept-or-reject. Definitions after the choice. |
| `databases/sharding.md` | Vertical limits then a bold definition | One primary at write ceiling; the first range split; the hot new-user shard. |
| `databases/consistent-hashing.md` | Modular hashing formula | 1 TB / 3 nodes / add a 4th / 750 GB move — already in the page, **make it the first paragraph**, with an on-call who just scheduled the expansion. |
| `distributed-systems/cap-theorem.md` vs `consistency-models.md` | Overlapping glossary | One shared incident (asymmetric partition) told twice at different zoom. |
| `reliability/rate-limiting.md` | Weaker than the rate-limiter *exercise* | Steal the 200k rps / 20M keys transcript from `foundations/reasoning-transcripts.md`. |
| `performance/cache-stampede.md` | Already a story | Add one incident block; add predict-before-click (quality-matrix Pred gap). Story work is light. |
| `reliability/circuit-breakers.md` | Gold | Move Abstraction Levels below Naive → Break. Do not rewrite the open. |
| `messaging/kafka.md` | Gold open | Same: delay tabs; add one incident (rebalance during a deploy). |
| `foundations/api-design.md` | Needs review *and* definition-led | Idempotent `POST /charge` double-submit scene. |
| `architecture-patterns/microservices-communication.md` | Pattern list | One order-flow: sync User+Inventory vs events, and the night the inventory call timed out. |

### B. System-design exercises

**Do not throw away** clarifying questions, FR/NFR, capacity, V1. That protocol *is* the practice.

**Do** add a **cold open above "1. Problem Statement"** (or replace the first paragraph of it) that is a 10-line product/interview scene. Pastebin already has the seed ("This looks like the URL shortener. It is not."). Food-delivery already has the three-party / prep-time antagonist. URL shortener does not.

| File | Cold open to write |
|------|-------------------|
| `system-design-exercises/url-shortener.md` | Marketing wants `sho.rt/launch` by Friday; 115k redirects/s on one row; celebrity code. |
| `system-design-exercises/rate-limiter.md` | One API key is 40% of traffic; Redis is the limiter and the outage. |
| `system-design-exercises/whatsapp.md` | Tick on a 1:1 chat vs a 256-member group; online fan-out vs offline queue. |
| `system-design-exercises/payment-processing.md` | Double-charge after a 504 from the PSP. Outbox vs "just retry." |
| `system-design-exercises/pastebin.md` | Light touch — distinguishing insight is already there; add a burn-after-read / celebrity-paste beat. |
| Remaining 21 "evolves and clicks" exercises | Same 10-line open; **do not** re-outline. Priority: food-delivery, ride-hailing, search-engine, collaborative-editor, video-calling (long + definition-led). |

Optional later: a "voiceover" `???` box before V1 ("Predict what dies first") that is already the pedagogy; make the prompt *narrative* ("the launch tweet goes out; which box smokes?").

### C. DSA

Every pattern page should open on **one concrete problem as a scene**, not "Why this pattern exists" + brute-force complexity.

Template:

1. Interviewer reads a problem in one sentence (with an array on the page).
2. Candidate writes nested loops. Clock: 8 minutes gone. N=10^5, TLE.
3. The *clue* ("contiguous", "sorted", "union these accounts") that names the pattern.
4. Then the existing mental-model ASCII / visualizer.

Priority: the three first-release pages `dsa/sliding-window.md`, `dsa/bfs-dfs.md`, `dsa/dynamic-programming.md`, then `two-pointers`, `binary-search`, `union-find`. Do not story-rewrite Aho-Corasick internals until the first-release three land.

### D. LLD concept + LLD exercises

Concept pages (`oop-fundamentals`, `solid-principles`, `design-patterns`, `concurrency-basics`) are definition pages and already **Needs review** on the quality matrix. Combine that pass with story: SOLID opens on a `Ticket` class that prices, prints, and persists — **that example is the story**; move it above the letters.

Exercises: add a **user scene** before "1. Problem Statement".

Example, parking lot: *Saturday, two gates, a motorcycle in a large spot, a truck turned away while compact spots sit empty, two attendants allocating the last compact at the same time.* Then the 9-step protocol.

Do this for all 15, but they are mechanical — one paragraph each. Do not rewrite UML.

### E. Behavioural + growth-mindset

The stories already exist inside seniority tabs. The attention problem is **front-loading the rubric**.

Change: **lead with the strongest story quote** (the Senior or Staff answer), then "here is why that scored," then STAR. Flip the current order on:

- `behavioural/technical-disagreement.md` (currently weak; Mongo vs Postgres quote is buried)
- `behavioural/production-incident.md` (Staff Black Friday story should be beat 1)
- `behavioural/mentorship.md` (webhook jitter story is already excellent — promote it)

Growth-mindset pages are essay-dense (`self-respect.md` is a treatise). Add **one workplace scene per page** (a design review, a pushback, a 1:1) and cut an equivalent amount of abstraction. Do not turn them into STAR fakes.

### F. Labs

`docs/labs/*.md` are not tutorials yet; they are includes. Storytelling here is a **predict loop in narrative**:

> You are going to kill broker 2 while the consumer group is reading. Write down: who becomes leader for partition 0, and whether the consumer pauses. Then run it. The log line that proves you right is `...`.

Keep YAML. Add 8–12 lines of stakes + prediction above the compose file. Pair with the existing lab README rather than duplicating it.

### G. Vendor databases, networking, cloud catalogs

Lowest attention, highest encyclopedia residue. Do **not** do these first.

When their quality-matrix "Needs review" pass runs, the story requirement is: **one running incident per page** (Postgres: readers blocked on a writer before MVCC; Redis: a hot key and a fail-over; HTTP/TCP: "the API is slow" and the hop that was actually the SYN). Parts 2–7 become chapters of that incident, or get cut.

### H. Reference, cheat sheets, glossary, trade-off matrix, calculators

**Out of scope.** Catalogs should stay catalogs. A one-line "when this pages you" on cheat-sheet rows is enough; no narrative arc.

---

## Execution order (PRs)

Small PRs. Each PR is one cluster or the first-release slice, never "rewrite all docs."

| Phase | PR | Scope | Exit |
|-------|----|-------|------|
| **0** | Contract | `CONTRIBUTING.md` beat list; Story column on `quality-matrix.md`; 1 worked example of the incident block in CONTRIBUTING; link this page from Start Here | Authors cannot satisfy Complete without a cold open |
| **1** | First-release concepts | CAP, sharding, consistent hashing, Kafka (light), stampede (light), circuit breaker (reorder only), Raft (light), tail latency (light), framework (light), debugging playbook (already gold — skip or incident-block only) | README vertical slice holds attention on first screen |
| **2** | Flagship design exercises | URL shortener, rate limiter, WhatsApp, payments (+ pastebin light) | Cold open on all four README exercises |
| **3** | First-release DSA + behavioural flip | sliding window, BFS/DFS, DP; technical disagreement; production incident | Pattern pages open on a TLE; behavioural pages open on the story |
| **4** | Remaining design-exercise cold opens | The 21 "evolves and clicks" pages — opening paragraph only | Mechanical; can batch 5–7 per PR |
| **5** | LLD | Four concept pages (combine with Needs-review) + 15 exercise cold opens | Combined quality + story |
| **6** | Labs | 10 lab stubs: stakes + predict + log line | Labs feel like a scene, not a gist |
| **7** | Long tail | Vendor DBs, networking, cloud Needs-review pages, growth-mindset scenes | Only after Phases 0–3; do not block the academy on these |

Do not start Phase 7 while Phase 1 is open. The feedback is about *the tutorials people actually read*.

---

## Validation for each rewritten page

A page is done when **all** of these are true:

1. A reader who only sees the first screen can retell the plot in one spoken sentence.
2. The term's definition is not sentence one.
3. There is a naive move and a numbered break before the architecture diagram.
4. Abstraction Levels (if present) start *after* that break.
5. Net word count ≤ 110% of the previous page (cut to add).
6. No factual regression vs `content-review.md` (capacity math, CAP/Kafka shorthand, fencing, etc.).
7. `mkdocs build --strict` still passes.
8. Quality-matrix columns other than Story do not get worse (especially Pred, #, V1, Fail, TO).

Spot-check by reading aloud the first 40 seconds. If it sounds like a lecture title, it is not done.

---

## Tracker updates (when implementing, not in this plan commit beyond a Planned row)

- `project-status.md` — Planned item: storytelling pass, Phases 0–3 required for first-release honesty.
- `quality-matrix.md` — add Story column after Req; gold first-release rows should move from implicit ~ to ✓ as Phase 1 lands.
- `how-to-use.md` — one paragraph: pages are meant to be read as incidents, not as chapter summaries; predict the break before the reveal.
- `content-review.md` — do **not** mix this into the accuracy checklist. Accuracy and attention are different passes.

---

## Explicit non-goals

- New simulations, new exercises, new pillars.
- A second writing style or a "fun" tone that fights the existing blunt production voice.
- Rewriting Complete behavioural stories into fiction.
- Generating 150 incident blocks with the same Payments/Fraud cast. Rotate domains (checkout, feed, logs, billing, search) so the academy does not feel like one company.

---

## Appendix: first-release story grade (human, not heuristic)

| Module | Today | Phase |
|--------|-------|-------|
| Design methodology | Hook present | 1 light |
| Requirements & estimation | Problem-led, dry | 1 optional |
| CAP theorem | Textbook | **1 required** |
| Sharding | Definition | **1 required** |
| Consistent hashing | Formula then storm | **1 required** |
| Raft | Hook present | 1 light |
| Kafka consumer groups | Hook present | 1 light |
| Cache stampede | Hook present | 1 light |
| Circuit breaker | Gold | 1 reorder |
| Tail latency | Hook present | 1 light |
| URL shortener | Protocol | **2 required** |
| Rate limiter (exercise) | Protocol | **2 required** |
| WhatsApp | Protocol | **2 required** |
| Payments | Protocol | **2 required** |
| Sliding window / BFS / DP | Pattern dump | **3 required** |
| Technical disagreement | Framework-first | **3 required** |
| Production incident | Story buried in tabs | **3 required** |
| Debugging playbook | Gold | skip / block only |
| Kubernetes debugging | Partial-strong | later |

---

## Appendix: how to re-run the heuristic scan

The 2026-09-15 triage used opening-type classification plus weights for incident blocks, analogy, V1/break language, scene words, stakes, and quoted dialogue. Re-run after Phase 1: the first-release files above should move from `definition/meta` to `scene/hook` or `problem-led`, and `reliability/failure-library.md` should no longer be the only page with an incident admonition.

Target after Phases 0–3: **definition/meta openings under 50%** of concept+exercise+DSA pages that students are told to study (the README table), not of the entire 210-file corpus. Reference and lab stubs will keep the corpus average down until Phases 6–7.
