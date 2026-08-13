"""Token-bucket rate limiter.

A bucket holds up to ``burst`` tokens and refills at ``rate`` tokens/second.
Each allowed call consumes ``n`` tokens. Empty bucket → reject.

``allow(now=…)`` is deterministic for tests. Production callers omit ``now``
and use the wall clock.
"""

from __future__ import annotations

from collections.abc import Callable
import time


class TokenBucket:
    def __init__(
        self,
        rate: float,
        burst: float | None = None,
        *,
        capacity: float | None = None,
        tokens: float | None = None,
        last: float = 0.0,
        now: Callable[[], float] | None = None,
    ) -> None:
        cap = burst if burst is not None else capacity
        if cap is None:
            raise ValueError("burst or capacity is required")
        if rate <= 0:
            raise ValueError("rate must be > 0")
        if cap <= 0:
            raise ValueError("burst must be > 0")
        self.rate = float(rate)
        self.burst = float(cap)
        self.capacity = self.burst
        self.tokens = float(cap if tokens is None else tokens)
        self.last = float(last)
        self._clock = now

    def allow(self, now: float | None = None, n: float = 1.0) -> bool:
        if n <= 0:
            raise ValueError("n must be > 0")
        t = self._clock() if now is None and self._clock is not None else now
        if t is None:
            t = time.monotonic()
        elapsed = t - self.last
        if elapsed < 0:
            elapsed = 0.0
        self.tokens = min(self.burst, self.tokens + elapsed * self.rate)
        self.last = t
        if self.tokens >= n:
            self.tokens -= n
            return True
        return False
