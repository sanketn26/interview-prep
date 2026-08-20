---
title: Protecting Your Sanity
description: Why burnout is a design flaw in how you work, not a badge of commitment — and the concrete signs you're past the line before you can see it yourself.
prerequisites:
  - Growth Mindset Overview
---

# Protecting Your Sanity

**Prerequisites:** [Growth Mindset](index.md)

[← Growth Mindset](index.md) | **Previous:** [Crucial Conversations](crucial-conversations.md) | **Next:** [Don't Say Yes When You Mean No](boundaries.md)

---

## Why This Exists

Every engineer eventually meets a version of the following story, often from inside it: three months of nights and weekends to hit a launch date, praised loudly for the sacrifice, and then six months later either quietly worse at the job or quietly gone from it. **The system rewards the sprint and is indifferent to what it costs the person who ran it — which means protecting your own sustainability is not something the organization does for you by default. It's something you have to actively do for yourself, and the skill of doing it is as real and learnable as any technical skill on this site.**

This isn't an argument for working less, or for treating every deadline as negotiable. It's an argument that **burnout is a predictable systems failure with recognizable leading indicators, not a mysterious thing that happens to people who aren't tough enough** — and that a senior engineer's judgement is supposed to extend to managing their own capacity, the same way it extends to managing a system's.

---

## Mental Model: Capacity Is a Budget, Not a Character Trait

```
   Healthy pattern                        Burnout pattern
   ────────────────                       ────────────────
   Sprint → recover → sprint              Sprint → sprint → sprint
   Intensity is episodic                  Intensity becomes baseline
   Recovery is scheduled, not             "I'll rest when this is
     contingent on nothing going wrong      done" — but something is
                                             always "this"
   You can name what the sprint           You can no longer remember
     was FOR                                what the original urgency was
```

Sustainable engineers aren't the ones who never work hard — they're the ones who treat intensity as a **budget with a recovery cycle**, spent deliberately on things that actually warrant it, rather than as a baseline state that creeps upward because nobody explicitly decided to raise it. The failure isn't working hard during a real crunch. It's the crunch never actually ending because nobody — including you — noticed it had quietly become the default.

---

## The Signs You're Past the Line, Before You Can See It Yourself

The reason burnout sneaks up on capable people specifically is that the first symptoms don't feel like exhaustion — they feel like the job or the people around you getting worse, which is a much easier story to believe than "I am running on empty."

| What it feels like | What it actually is |
|---|---|
| "This codebase is a mess and nobody cares about quality anymore" | Reduced patience, not a genuine change in the codebase — a sudden spike in how much friction bothers you is a personal-capacity signal, not always a code-quality signal |
| "My teammates keep asking dumb questions" | Reduced tolerance for the normal cost of collaboration, not a sudden drop in your teammates' competence |
| "I just need to push through this one thing and then I'll rest" | Said convincingly, and often true the first time — the tell is when it's the fourth consecutive "one thing" with no rest actually happening in between |
| Cynicism about work that used to feel meaningful | One of the most reliable early markers in the burnout literature — it shows up before exhaustion does, not after |
| Physical: disrupted sleep, appetite changes, getting sick more often | The body's signal is usually more honest and arrives earlier than the mental one, and is the one people are most likely to override with caffeine and willpower |

!!! tip "The test that cuts through the noise"
    Ask yourself: *"If I described this exact workload and duration to a friend I respect, would I tell them it's sustainable, or would I tell them to slow down?"* People are far more honest evaluating someone else's unsustainable pace than their own — use that asymmetry deliberately.

---

## Why "Powering Through" Doesn't Work the Way It Feels Like It Does

The intuitive model is that willpower is a dial you can turn up indefinitely if the stakes are high enough. The actual pattern, visible in retrospect almost every time: **output holds up for a while past the point where it should have degraded, because you're spending down reserves rather than genuinely sustaining the pace — and then it doesn't degrade gracefully, it drops sharply**, often taking the form of a mistake that wouldn't have happened at a lower, sustained intensity, or an exit from the role or company that could have been avoided with an earlier correction. The three months of unsustainable crunch don't just cost three months — they cost whatever recovery time follows, plus whatever mistake happened at the trough, plus, often, the trust or motivation that doesn't fully come back even after the recovery.

**The senior-engineer reframe:** treating your own capacity as a system with a failure mode you're responsible for managing is not weakness — it's the same discipline you'd apply to any resource with a finite budget and a recovery time. Nobody praises a service for having no rate limiter right up until it falls over.

---

## What Actually Protects It

- **Name the crunch's actual end condition, out loud, before it starts.** "Until launch" is vague enough to quietly become permanent. "Until the 15th, then I take the following Monday off regardless of what's on fire" is a commitment with a forcing function.
- **Track your own leading indicators, not just the team's deadline.** If cynicism or disrupted sleep shows up before the deadline arrives, that's information the deadline itself doesn't contain — it's about you, not the project.
- **Say the real reason when you protect the boundary, not an invented excuse.** "I'm taking this weekend, I've been at this pace for six weeks and I need it to stay useful next month" is a stronger and more honest position than a fabricated conflict — and it models the behavior for everyone junior to you watching how you handle it.
- **Distinguish a genuine, bounded crisis from a chronically under-resourced team's steady state.** The first justifies real intensity for a real, short window. The second is a structural problem that intensity doesn't fix and that repeated heroics actively hide from the people who could actually fix it — see [Technical Debt](../behavioural/technical-debt.md) for the parallel failure mode of individual effort masking a systemic gap.

!!! warning "Being the person who always says yes to the crunch has an org-level cost too"
    If you reliably absorb unsustainable crunches without complaint, the organization has no signal that the pace is unsustainable — you've removed the feedback loop that would otherwise force a fix (more headcount, a scoped-down launch, a pushed date). Protecting your own sustainability is sometimes also the only thing standing between a broken process and someone noticing it's broken.

---

## Interview Questions

=== "Foundation"
    **Q: How do you know when you're approaching burnout, before it affects your work?**

    "For me the earliest signal isn't feeling tired — it's a drop in patience for things that normally don't bother me, and a sense of cynicism about work I usually find meaningful. Those show up before I'd describe myself as exhausted, so I've learned to treat them as the actual signal rather than waiting to feel physically depleted, which tends to arrive later and after some damage is already done."

=== "Senior"
    **Q: Tell me about a time you had to protect your own capacity even though it meant disappointing someone.**

    "During a compliance-driven migration with a hard external deadline, I'd been working consistent 60-hour weeks for about five weeks, and I noticed I was starting to make small mistakes I wouldn't normally make — a botched migration script that needed a rollback, which cost more time than the extra hours I'd put in that week had saved. I told my manager directly: the pace wasn't sustainable, I was going to scope my involvement back to core-hours plus two focused evenings a week for the remaining three weeks, and here's specifically what I'd need to deprioritize to make that work. It wasn't a comfortable conversation, but the mistake I'd made was better evidence for the case than an abstract 'I'm tired' would have been. My output quality actually went up for the rest of the project, and the deadline still held because the deprioritized items genuinely weren't critical-path."

=== "Staff"
    **Q: You notice a high-performing engineer on your team has been in an unsustainable crunch for months, but they haven't raised it themselves and seem to take pride in the pace. How do you handle it?**

    "I wouldn't wait for them to raise it — the pattern of taking pride in an unsustainable pace is exactly the profile most likely to burn out hard, because they're the least likely to self-correct before it breaks something. I'd have a direct, private conversation naming the specific pattern I'm seeing — not a vague 'take care of yourself' but concrete observations (consistent late-night commits, missed the last two social team events, a recent uncharacteristic mistake) — because specific evidence is harder to wave off than a general concern, and it shows I'm paying attention rather than reciting a platitude.

    I'd also look at whether their workload is genuinely a temporary crunch or a symptom of a structural understaffing problem their individual effort is currently masking — if it's the latter, the fix isn't a conversation with them, it's fixing the resourcing, because otherwise I'm asking one person to keep absorbing a gap that's actually the team's or the org's to solve. And I'd watch for whether the praise they're getting for the pace is itself part of the problem — if visible reward is what's reinforcing the behavior, that's something I can change directly, by making sure what gets praised is sustainable output, not the pace itself."

---

## Key Takeaways

!!! success "Remember"
    1. **Capacity is a budget with a recovery cycle, not a character trait you either have or don't** — sustainable engineers spend intensity deliberately, not as a creeping baseline.
    2. **The earliest burnout signals rarely feel like exhaustion** — cynicism, reduced patience, and disrupted sleep usually show up first, and get misread as the world getting worse rather than your capacity dropping.
    3. **Powering through doesn't degrade gracefully** — output holds up on borrowed reserves, then drops sharply, usually as a mistake or an exit that costs more than the crunch saved.
    4. **Name the crunch's end condition out loud before it starts** — vague endpoints ("until launch") are how temporary becomes permanent.
    5. **Reliably absorbing unsustainable pace removes the org's only signal that something structural needs to change** — protecting your own sustainability is sometimes the only thing forcing a real fix.

**Previous:** [Crucial Conversations](crucial-conversations.md) | **Next:** [Don't Say Yes When You Mean No](boundaries.md)
