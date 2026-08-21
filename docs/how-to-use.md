---
title: How to Study
description: Interview modes, three-level explanation model, and how to get the most from this academy.
---

# How to Study This Academy

!!! warning "Prerequisite check"
    This academy assumes you already ship production code, know core data structures & algorithms, and are comfortable with OOP/API design/HTTP/SQL. It teaches distributed systems, scale, and failure reasoning **on top of** that — it does not teach the fundamentals themselves. See [Who This Is For](index.md#who-this-is-for) before you start if you're unsure this is the right level.

## The Three-Level Model

Every concept has three levels of understanding. Switch between them based on context:

| Level | When to use | Focus |
|-------|-------------|-------|
| **Level 1 — Intuition** | Explaining to a non-expert | Simple language, analogies, diagrams |
| **Level 2 — Engineering** | Technical design discussion | Algorithms, architecture, bottlenecks |
| **Level 3 — Production** | Staff+ discussions | Scale limits, failures, cost, debugging |

!!! tip "Interview Tip"
    Start with Level 1 in interviews. Depth-first on what the interviewer probes. Most candidates jump to Level 2 without establishing the mental model — interviewers find this hard to follow.

---

## Interview Modes

The full Learn / Interview / Hint / Solution / Staff **tab switcher is not wired** on concept pages — see [Project Status](project-status.md). Study like this instead:

- **Learn** — the page as written is the default (three-level model: intuition → engineering → production).
- **Hint** — exercises use `???` hint blocks; try before revealing.
- **Solution** — design / LLD exercises have a worked solution after you attempt it.
- **Staff** — some pages have Staff Q&A or seniority tabs (especially behavioural stories); **not** every concept page.

---

## How to Use the Simulations

1. **Read** the concept explanation first
2. **Run** the simulation with default parameters
3. **Experiment** by changing parameters, injecting failures
4. **Predict** what will happen before clicking "Inject Failure"
5. **Explain** the observed behaviour in your own words

!!! warning "Common Mistake"
    Do not click through simulations without reading first. The simulation is for **verification** of your mental model, not a substitute for understanding.

---

## System Design Practice Protocol

For each system design exercise:

1. **Cover** the solution page — work through it yourself first
2. Start with **clarifying questions** (functional requirements)
3. State **non-functional requirements** explicitly (latency, QPS, durability)
4. Do **capacity estimation** (back-of-envelope)
5. Sketch **API + data model** before architecture
6. Start with the **simplest possible architecture**
7. **Identify bottlenecks** before adding components
8. Add components **only when you can justify them**
9. Discuss **failure modes** for every major component
10. Close with **trade-offs and alternatives**

---

## DSA Practice Protocol

1. Read the **problem statement** only
2. Think for 5–10 minutes (no code)
3. Identify the **pattern** from clues
4. Code the **brute force** first
5. Optimize to target complexity
6. Handle **edge cases** explicitly
7. Analyse complexity (time + space)

### Pattern Recognition Clues

| Clue | Pattern |
|------|---------|
| "contiguous subarray / window" | Sliding Window |
| "sorted array, find pair/triplet" | Two Pointers |
| "find in sorted / minimum value that satisfies" | Binary Search |
| "shortest path in unweighted graph" | BFS |
| "all paths / connected components" | DFS |
| "shortest path in weighted graph" | Dijkstra |
| "top K elements" | Heap |
| "dependencies / ordering" | Topological Sort |
| "all combinations / subsets" | Backtracking |
| "minimum possible maximum" | Binary Search on Answer |
| "overlapping subproblems" | Dynamic Programming |
| "same component / merge groups / undirected cycle" | Union-Find |
| "locally optimal / interval scheduling / greedy choice" | Greedy |
| "substring search / pattern in text" | KMP (or Rabin-Karp) |
| "prefix / autocomplete" | Trie |
| "how often in a stream" / p99 / set similarity | Count-Min / t-digest / MinHash |
| "range sum/min with updates" | Fenwick or segment tree |
| "ordered map, Redis ZSET" | Skip list |

Full clue table: [DSA Patterns](dsa/index.md) and [Pattern Recognition](dsa/pattern-recognition.md).

---

## Behavioural Practice Protocol

1. For each theme, draft **3 real stories** from your experience
2. Apply **STAR + Reflection**: Situation → Task → Action → Result → What I Learned
3. Calibrate to seniority level (see differentiation guide)
4. Record yourself and listen back — clarity is a skill
5. Have **6 load-bearing stories** that can be adapted to different questions (see [Behavioural](behavioural/index.md))

---

## Progress Tracking

Every page has a **Mark this page complete** button — check [Your Progress](dashboard.md) for your overall completion, streak, and points across the curriculum.

Use this self-assessment after each module:

- [ ] Can I explain this concept clearly in 2 minutes?
- [ ] Can I design a system that uses this concept?
- [ ] Can I identify when this concept applies?
- [ ] Can I describe when it fails / its limitations?
- [ ] Can I debug a production issue involving this?
- [ ] Can I explain the trade-offs vs alternatives?

If any box is unchecked → review that dimension before moving on.

---

## Common Failure Modes in Interviews

!!! failure "What NOT to do"
    1. **Jumping to architecture** before requirements → interviewer doesn't know what you're optimizing for
    2. **Naming technologies** without justification → "I'll use Kafka" without explaining why
    3. **One-size-fits-all designs** → every problem solved with the same stack
    4. **Ignoring failure modes** → stopping after the happy path
    5. **No capacity estimation** → can't identify where bottlenecks will appear
    6. **Memorized designs** → can't adapt when the interviewer changes a constraint
