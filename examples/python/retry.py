"""Retry a callable with exponential backoff and jitter.

``full`` jitter sleeps ``random(0, cap)`` where
``cap = min(max_delay, base_delay * 2**(attempt-1))``. That avoids synchronized
retry storms when many clients fail together.
"""

from __future__ import annotations

from collections.abc import Callable, Iterable
import random
import time
from typing import TypeVar

T = TypeVar("T")


class RetryError(Exception):
    """Optional wrapper. ``retry()`` re-raises the last exception by default."""

    def __init__(self, attempts: int, last: BaseException) -> None:
        super().__init__(f"failed after {attempts} attempts: {last}")
        self.attempts = attempts
        self.last = last


def backoff_delay(
    attempt: int,
    *,
    base_delay: float,
    max_delay: float,
    jitter: str,
    rng: random.Random,
) -> float:
    """Delay *before* attempt index ``attempt`` (0-based; first try sleeps 0)."""
    if attempt <= 0:
        return 0.0
    cap = min(max_delay, base_delay * (2 ** (attempt - 1)))
    if jitter == "none":
        return cap
    if jitter == "full":
        return rng.random() * cap
    if jitter == "equal":
        return cap / 2.0 + rng.random() * (cap / 2.0)
    raise ValueError(f"unknown jitter: {jitter}")


def retry(
    fn: Callable[[], T],
    *,
    attempts: int = 3,
    base_delay: float = 0.05,
    max_delay: float = 2.0,
    jitter: str = "full",
    retry_on: Iterable[type[BaseException]] = (Exception,),
    sleep_fn: Callable[[float], None] | None = None,
    sleep: Callable[[float], None] | None = None,
    rng: random.Random | None = None,
) -> T:
    """Call ``fn`` up to ``attempts`` times (including the first try).

    Exhaustion re-raises the last matching exception.
    """
    if attempts < 1:
        raise ValueError("attempts must be >= 1")
    sleeper = sleep_fn or sleep or time.sleep
    types = tuple(retry_on)
    rng = rng or random.Random()
    last: BaseException | None = None
    for i in range(attempts):
        if i:
            sleeper(backoff_delay(i, base_delay=base_delay, max_delay=max_delay, jitter=jitter, rng=rng))
        try:
            return fn()
        except types as exc:
            last = exc
    assert last is not None
    raise last


retry_call = retry
