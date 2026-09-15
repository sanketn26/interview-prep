#!/usr/bin/env python3
"""Emit an auditable triage of Markdown opening structure."""

from __future__ import annotations

import argparse
import csv
import re
from pathlib import Path

EXCLUDED_NAMES = {"content-review.md", "dashboard.md", "how-to-use.md", "project-status.md", "quality-matrix.md", "roadmap.md", "storytelling-pass.md", "storytelling-reader-test.md"}
SCENE = re.compile(r"\b(on-call|interviewer|candidate|customer|user|client|service|team|operator|engineer)\b", re.I)
OBSERVABLE = re.compile(r"\b(p\d\d|latency|qps|rps|cpu|memory|error|timeout|failed|crash|lag|metric|log|tle|minutes?|seconds?|ms)\b", re.I)
STAKE = re.compile(r"\b(risk|cost|lose|lost|wrong|down|outage|deadline|revenue|blocked|breaks?|fails?|cannot|can't)\b", re.I)
PROBLEM = re.compile(r"\b(problem|need|must|require|limit|bottleneck|why this exists|design)\b", re.I)
DEFINITION = re.compile(r"\b(is|means|refers to|defined as|consists of|is the process of)\b", re.I)


def body_lines(text: str) -> list[str]:
    text = re.sub(r"\A---\n.*?\n---\n", "", text, flags=re.S)
    lines: list[str] = []
    in_fence = False
    for raw in text.splitlines():
        line = raw.strip()
        if line.startswith("```"):
            in_fence = not in_fence
            continue
        if in_fence or not line or line == "---" or line.startswith("# "):
            continue
        if line.startswith(("**Prerequisites:**", "[←", "!!! note \"Instructions\"")):
            continue
        lines.append(re.sub(r"[`*_>#\[\]()]", " ", line).strip())
        if len(lines) == 12:
            break
    return lines


def classify(opening: str) -> tuple[str, int, int, int, int]:
    actor = int(bool(SCENE.search(opening)))
    observable = int(bool(OBSERVABLE.search(opening)))
    stake = int(bool(STAKE.search(opening)))
    problem = int(bool(PROBLEM.search(opening)))
    definition = int(bool(DEFINITION.search(opening)))
    if actor and observable and stake:
        label = "scene/hook"
    elif problem and not definition:
        label = "problem-led"
    elif definition and not (actor and observable):
        label = "definition/meta"
    else:
        label = "mixed"
    return label, actor + observable + stake, actor, observable, stake


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--docs", type=Path, default=Path("docs"))
    parser.add_argument("--output", type=Path, default=Path("artifacts/storytelling-baseline.csv"))
    args = parser.parse_args()
    paths = sorted(
        p for p in args.docs.rglob("*.md")
        if "assets" not in p.parts
        and p.name not in EXCLUDED_NAMES
        and p != args.docs / "index.md"
    )
    args.output.parent.mkdir(parents=True, exist_ok=True)
    with args.output.open("w", newline="", encoding="utf-8") as handle:
        writer = csv.writer(handle, lineterminator="\n")
        writer.writerow(["path", "opening_type", "story_score", "actor", "observable", "stake", "opening"])
        for path in paths:
            opening = " ".join(body_lines(path.read_text(encoding="utf-8")))
            label, score, actor, observable, stake = classify(opening)
            writer.writerow([path.as_posix(), label, score, actor, observable, stake, opening])
    print(f"wrote {len(paths)} rows to {args.output}")


if __name__ == "__main__":
    main()
