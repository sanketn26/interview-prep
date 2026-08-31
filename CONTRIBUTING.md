# Contributing to Senior Engineer Academy

Thank you for contributing! This guide covers the standards and process for adding content.

## Quality Standard

Before submitting, ask: *After this page, can the engineer explain it, apply it, say when it fails, debug it, and teach the trade-offs?* If **no** to any → improve before submitting.

A module is **Complete** only when it is technically reviewed, intuitive, visual where useful, runnable where useful, contains reasoning/prediction, discusses failure and production caveats, has exit criteria, links exercises, and tests executable material. Finished prose is not Complete. The contract columns live in [`docs/quality-matrix.md`](docs/quality-matrix.md).

Update [`docs/project-status.md`](docs/project-status.md) with every page. Never mark a stub complete. Do not add dozens of empty exercises for coverage. Freeze expansion while existing Completes fail the matrix.

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
