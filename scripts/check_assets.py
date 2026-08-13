#!/usr/bin/env python3
"""Guard against the class of bug where an asset referenced by mkdocs.yml lives
outside docs_dir. MkDocs only copies files from docs_dir into the built site, so
a stray repo-root asset silently 404s on the deployed page while everything
still builds green locally."""

import re
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
DOCS = ROOT / "docs"


def referenced_assets(config_text):
    """Pull local paths out of extra_css / extra_javascript list blocks."""
    found = []
    for key in ("extra_css", "extra_javascript"):
        block = re.search(rf"^{key}:\n((?:\s*-\s+.*\n)+)", config_text, re.MULTILINE)
        if not block:
            continue
        for line in block.group(1).splitlines():
            value = line.strip().lstrip("-").strip()
            if value and not value.startswith(("http://", "https://", "//")):
                found.append((key, value))
    return found


def main():
    config_text = (ROOT / "mkdocs.yml").read_text()
    problems = []

    for key, rel in referenced_assets(config_text):
        if not (DOCS / rel).is_file():
            problems.append(f"{key}: '{rel}' is not a file under docs/")

    # A repo-root assets/ directory is the specific mistake that caused this:
    # it looks authoritative but is never published.
    if (ROOT / "assets").exists():
        problems.append(
            "repo-root 'assets/' exists; it is never published. "
            "Move its contents into docs/assets/."
        )

    if problems:
        print("Asset check FAILED:", file=sys.stderr)
        for problem in problems:
            print(f"  - {problem}", file=sys.stderr)
        return 1

    print("check_assets: ok")
    return 0


if __name__ == "__main__":
    sys.exit(main())
