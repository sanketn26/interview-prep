---
title: Behavioural & Leadership
description: STAR + Reflection. Engineering judgement, not corporate storytelling.
---

# Behavioural & Leadership

One story, three seniority levels. Measure impact. Own the failure class, not just the ticket.

---

## Why This Exists

Strong engineers lose senior offers in the behavioural round more often than in system design. The reason is a misunderstanding of what is being tested.

Candidates treat these questions as a personality check — be likeable, sound collaborative, avoid saying anything negative. So they tell vague, flattering stories: *"We had a tough deadline, I worked hard, we shipped it, the team was happy."*

That answer is unfalsifiable and therefore worthless. The interviewer is not assessing whether you are pleasant. They are assessing **engineering judgement under constraint**: what you did when the information was incomplete, the deadline was real, and reasonable people disagreed. They want evidence of how you *decide*, not proof that you are nice.

The good news: this is the most improvable interview round, because the gap is almost always structural rather than substantive. You already did the work — you are just narrating it badly.

---

## Mental Model: What Level Is This Story?

The single biggest scoring lever is **scope of impact**. The same incident can be told at three levels, and the level you tell it at is the level you get hired at.

```
Story: "The payment service went down."

MID-LEVEL     "I found the bug and fixed it."
              → scope: the ticket
              → evidence of: competence

SENIOR        "I restored service, then found the root cause was an
               unbounded retry. I added backoff + a circuit breaker,
               and cut recovery time from 45 to 4 minutes."
              → scope: the system
              → evidence of: ownership + measurement

STAFF         "...and I audited every service for the same pattern,
               found three more, added a lint rule to CI, and wrote
               the retry guidance now used by four teams."
              → scope: the failure CLASS, across the org
              → evidence of: leverage
```

The distinction is not seniority of vocabulary — it is **blast radius of the fix**. Mid-level fixes the instance. Senior fixes the system and measures it. Staff fixes the category and makes recurrence structurally unlikely.

!!! tip "The upgrade question"
    After drafting any story, ask: *"What stopped this from happening again — for everyone, not just my service?"* If you have no answer, you have a senior story, not a staff one. If you have one and left it out, you just lost the level.

---

## STAR + Reflection

Plain STAR is necessary but not sufficient — it gets you a complete story with no evidence of learning. This academy uses STAR plus a fifth element:

| Part | What goes here | Time |
|---|---|---|
| **Situation** | Minimum context to make the stakes legible | 10% |
| **Task** | What was *yours* specifically to solve | 10% |
| **Action** | What **you** did, decisions and trade-offs | 50% |
| **Result** | Measured outcome, with a number | 20% |
| **Reflection** | What you would do differently; what changed after | 10% |

Two failure modes dominate:

**Too much Situation.** Three minutes of background before anything happens. The interviewer needs just enough to judge the decision.

**"We" instead of "I".** Team framing is a good instinct that reads as evasion here. The interviewer is evaluating *you*, and cannot give credit for "we decided." Say what you argued for, what you built, and what you got wrong. Use "we" for context and "I" for your contribution.

!!! warning "A result without a number is not a result"
    "It was much faster" → *"p99 went from 2.4 s to 180 ms, and support tickets about timeouts dropped to zero."* If you genuinely lack metrics, use magnitude and direction: "cut the weekly on-call pages for that service from about a dozen to one or two."

---

## Build a Story Bank, Not Scripts

You cannot script answers to unpredictable questions, but the questions cluster. Prepare **six stories** and map them to the clusters — most prompts are one of these wearing a different hat:

| Cluster | Prompts it covers |
|---|---|
| **Conflict / disagreement** | "Disagreed with a senior engineer", "convinced a skeptical team" |
| **Failure you caused** | "A mistake you made", "something that went wrong" |
| **Incident / pressure** | "Production outage", "tight deadline", "ambiguous problem" |
| **Influence without authority** | "Drove a cross-team change", "improved a process" |
| **Technical judgement** | "A hard trade-off", "a decision you would revisit" |
| **Mentorship / growth** | "Helped someone improve", "raised the bar" |

For each, write the five STAR+R beats as bullets — never a paragraph. Bullets let you re-order for the actual question; memorized paragraphs collapse the moment the phrasing shifts.

**Reuse is fine and expected.** One good incident can serve conflict, failure, and pressure depending on which beat you emphasize.

---

## The Failure Story Is the Highest-Signal One

"Tell me about a time you failed" is where candidates most often self-sabotage, in two directions.

**The fake failure:** "I care too much about quality, so I over-engineered." This reads as evasion and costs you more than a real failure would.

**The unowned failure:** "The requirements changed and QA missed it." Blame outside yourself, and the interviewer learns you will not catch your own mistakes.

What they are actually testing is whether you can hold **genuine ownership without spiraling** — a real mistake, real consequences, clear-eyed causes, and a concrete change afterward. Own the decision you made with the information you had, explain what you misjudged, and show what is different now. Engineers who can do this calmly are trusted with bigger systems, because everyone senior has broken production and the ones worth hiring learned something transferable.

---

## Pages in This Section

| Page | Status |
|------|--------|
| [Framework (STAR + Reflection)](framework.md) | First release |
| [Technical disagreement](technical-disagreement.md) | Complete |
| [Leading a production incident](production-incident.md) | Complete |
| [Failure & learning](failure-learning.md) | Complete |

Start with the [framework](framework.md) for structure and the seniority ladder, then work the three story pages — each shows the same scenario answered at mid, senior, and staff level so you can hear the difference directly.

---

## Key Takeaways

- **You are being tested on judgement under constraint**, not likeability.
- **Scope of impact sets your level:** the ticket (mid), the system (senior), the failure class (staff).
- **Action is half the story.** Compress Situation ruthlessly.
- **Say "I", not "we"**, for your own contribution.
- **Every result needs a number**, or at minimum a magnitude and direction.
- **Prepare six flexible stories as bullets**, not scripts — the clusters repeat.
- **Own your failures without spiraling.** That is the highest-signal answer you can give.
