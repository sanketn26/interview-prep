# Contributing to Senior Engineer Academy

Thank you for contributing! This guide covers the standards and process for adding content.

## Quality Standard

Before submitting, ask: *After reading this page, can the engineer:*
- Explain it clearly in a 2-minute interview answer?
- Recognize where it applies in a system design?
- Identify when it fails / its limitations?
- Debug a production issue involving this?
- Explain the trade-offs vs alternatives?

If **no** to any → improve before submitting.

Update [`docs/project-status.md`](docs/project-status.md) with every page. Never mark a stub complete. Do not add dozens of empty exercises for coverage.

## Content Structure

Every concept page must include:

1. **Why this exists** — the problem it solves (not a definition)
2. **Mental model** — a simple analogy or visual explanation
3. **Architecture** — Mermaid diagram
4. **How it works internally** — mechanisms, not just what
5. **Realistic example** — concrete numbers and context
6. **Failure modes** — what breaks and why
7. **Production debugging** — metrics, commands, decision trees
8. **Trade-offs** — explicit comparison table
9. **Interview questions** — Basic / Senior / Staff with sample answers
10. **Key takeaways** — 5 bullet points max

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
