# Contributing to Senior Engineer Academy

Thank you for contributing! This guide covers the standards and process for adding content.

## Quality Standard

Before submitting, ask: *After this page, can the engineer explain it, apply it, say when it fails, debug it, and teach the trade-offs?* If **no** to any → improve before submitting.

A module is **Complete** only when it is technically reviewed, intuitive, visual where useful, runnable where useful, contains reasoning/prediction, discusses failure and production caveats, has exit criteria, links exercises, and tests executable material. Finished prose is not Complete. The contract columns live in [`docs/quality-matrix.md`](docs/quality-matrix.md).

Update [`docs/project-status.md`](docs/project-status.md) with every page. Never mark a stub complete. Do not add dozens of empty exercises for coverage. Freeze expansion while existing Completes fail the matrix.

## Content Structure

Every concept page must include:

1. **Cold open** — when Story applies, carry a concrete actor or system through an observable, a decision, and a consequence before tabs or definitions
2. **Why this exists** — establish the engineering problem, scope, and requirements
3. **Naive move → break** — show the respectable first attempt and the concrete failure that earns the mechanism, where the topic naturally has one
4. **Mental model** — a simple analogy or visual explanation
5. **Architecture** — Mermaid diagram where it materially helps
6. **How it works internally** — mechanisms, not just what
7. **Realistic example** — concrete numbers and context
8. **Failure modes** — what breaks and why
9. **Production debugging** — metrics, commands, decision trees
10. **Trade-offs** — explicit comparison table
11. **Interview retell** — Basic / Senior / Staff answers should narrate the same reasoning, not introduce a disconnected example
12. **Key takeaways** — 5 bullet points max

Story is genre-applicable, not universal. It is required for tutorials, design/LLD exercises, DSA patterns, behavioural lessons, and labs. It is normally `—` for indexes, glossaries, catalogs, calculators, and process/reference pages. `Req` and `Story` are distinct: Req establishes the problem and scope; Story makes the decision chain concrete and memorable.

### Truthful scenarios

Specific detail must not masquerade as evidence. Every incident, timestamp, metric, quotation, and log line must be sourced and cited, identified as adapted, or labeled **Hypothetical** / **Illustrative**. Never present synthetic output as the exact output of a real product. Distinguish capacity assumptions from measured production results.

Use one running scenario rather than adding a detachable “story” section. An incident admonition is optional:

```markdown
!!! example "Hypothetical incident"
    **02:14:** Checkout p99 rises from 80 ms to 6 s while CPU stays at 40%.
    **Naive move:** Retry Fraud three times; downstream load can rise to 4×.
    **Decision:** Bound the wait, enforce a retry budget, then isolate the dependency.
    **Retell:** “We were latched to a sick dependency; timeouts bounded the damage before the breaker isolated it.”
```

For every rewrite, preserve or improve the other quality-matrix dimensions, keep net word count within 110% unless a reviewer approves the growth, and have a technical reviewer check accuracy-sensitive claims.

## Adding a New Page

1. Create the markdown file in the appropriate `docs/` subdirectory
2. Add it to the `nav:` section in `mkdocs.yml`
3. Link it from the section `index.md`
4. Run `mkdocs build --strict` to validate

## Running Locally

```bash
python -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt
mkdocs serve
```

## Adding Interactive Simulations

Simulations live in `docs/assets/js/simulations.js`. Everything MkDocs serves must live under `docs/` — there is no repo-root asset mirror, and files outside `docs/` are silently omitted from the built site. Follow the existing class patterns:
- Constructor takes `containerId` and `logId`
- Expose public methods for UI buttons
- Use `log()` helper for the log panel
- Use `setStat()` helper for stat panels
- Auto-init in the `DOMContentLoaded` block at the bottom

## Commit Messages

- `feat: Add Raft consensus page with election simulation`
- `fix: Correct consistent hashing virtual node count`
- `docs: Improve CAP theorem interview examples`
