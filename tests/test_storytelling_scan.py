import unittest
from pathlib import Path

from scripts.storytelling_scan import body_lines, classify


class StorytellingScanTest(unittest.TestCase):
    def test_body_lines_remove_front_matter_and_heading(self) -> None:
        text = """---
title: Example
---
# Example

An on-call sees p99 latency fail during an outage.
"""
        self.assertEqual(body_lines(text), ["An on-call sees p99 latency fail during an outage."])

    def test_scene_requires_actor_observable_and_stake(self) -> None:
        result = classify("An on-call sees p99 latency fail and the service is down.")
        self.assertEqual(result, ("scene/hook", 3, 1, 1, 1))

    def test_scanner_source_is_repository_relative(self) -> None:
        self.assertTrue(Path("scripts/storytelling_scan.py").is_file())


if __name__ == "__main__":
    unittest.main()
