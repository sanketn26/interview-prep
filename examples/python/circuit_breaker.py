"""Circuit breaker: closed → open → half-open.

* **closed** — calls pass; consecutive failures increment a counter.
* **open** — calls fail immediately until ``recovery_timeout`` or ``probe()``.
* **half-open** — probe calls; ``success_threshold`` successes close the circuit.
"""

from __future__ import annotations

from collections.abc import Callable
from enum import Enum
import time
from typing import TypeVar

T = TypeVar("T")


class State(str, Enum):
    CLOSED = "closed"
    OPEN = "open"
    HALF_OPEN = "half_open"


CircuitState = State


class CircuitOpenError(Exception):
    """Raised while the breaker is open (fail-fast)."""


class CircuitBreaker:
    def __init__(
        self,
        *,
        failure_threshold: int = 5,
        success_threshold: int = 1,
        recovery_timeout: float = 30.0,
        half_open_max_calls: int = 1,
        now: Callable[[], float] | None = None,
    ) -> None:
        if failure_threshold < 1:
            raise ValueError("failure_threshold must be >= 1")
        if success_threshold < 1:
            raise ValueError("success_threshold must be >= 1")
        if recovery_timeout < 0:
            raise ValueError("recovery_timeout must be >= 0")
        if half_open_max_calls < 1:
            raise ValueError("half_open_max_calls must be >= 1")
        self.failure_threshold = failure_threshold
        self.success_threshold = success_threshold
        self.recovery_timeout = recovery_timeout
        self.half_open_max_calls = half_open_max_calls
        self._now = now or time.monotonic
        self._state = State.CLOSED
        self._failures = 0
        self._successes = 0
        self._opened_at = 0.0
        self._half_open_inflight = 0

    @property
    def state(self) -> State:
        self._maybe_half_open()
        return self._state

    def probe(self) -> None:
        """Force half-open (tests / operator)."""
        self._state = State.HALF_OPEN
        self._half_open_inflight = 0
        self._successes = 0
        self._failures = 0

    def _maybe_half_open(self) -> None:
        if self._state is State.OPEN:
            if self._now() - self._opened_at >= self.recovery_timeout:
                self.probe()

    def call(self, fn: Callable[[], T]) -> T:
        self._maybe_half_open()
        if self._state is State.OPEN:
            raise CircuitOpenError("circuit is open")
        if self._state is State.HALF_OPEN:
            if self._half_open_inflight >= self.half_open_max_calls:
                raise CircuitOpenError("circuit is half-open; probe budget exhausted")
            self._half_open_inflight += 1
        try:
            result = fn()
        except Exception:
            self._on_failure()
            raise
        self._on_success()
        return result

    def _on_success(self) -> None:
        self._failures = 0
        if self._state is State.HALF_OPEN:
            self._successes += 1
            self._half_open_inflight = max(0, self._half_open_inflight - 1)
            if self._successes >= self.success_threshold:
                self._state = State.CLOSED
                self._successes = 0
            return
        self._state = State.CLOSED

    def _on_failure(self) -> None:
        if self._state is State.HALF_OPEN:
            self._trip()
            return
        self._failures += 1
        if self._failures >= self.failure_threshold:
            self._trip()

    def _trip(self) -> None:
        self._state = State.OPEN
        self._opened_at = self._now()
        self._half_open_inflight = 0
        self._failures = 0
        self._successes = 0
