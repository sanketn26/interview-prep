"""Idempotent request handling — the standard defense against ambiguous timeouts.

A remote call that times out has two indistinguishable explanations: the request
never arrived, or it executed and the response was lost. Retrying is therefore
unavoidable, and safe only if replaying a request cannot repeat its side effect.

The mechanism is a **client-generated** key, reused across every retry of the
same logical operation. A server-generated key would differ per attempt and
defeat the whole scheme.
"""

from __future__ import annotations

from collections.abc import Callable
from dataclasses import dataclass
from typing import Any, TypeVar

T = TypeVar("T")


class ConflictError(Exception):
    """Same idempotency key replayed with different parameters.

    This is a client bug, not a retry. Returning the cached response would
    silently hide it, so surface it instead.
    """


class InFlightError(Exception):
    """The original request is still running; the retry arrived too early."""


@dataclass(frozen=True)
class _Entry:
    fingerprint: int
    response: Any
    complete: bool


def _fingerprint(params: dict[str, Any]) -> int:
    """Stable hash of the request parameters, order-independent."""
    return hash(tuple(sorted((k, repr(v)) for k, v in params.items())))


class IdempotencyStore:
    """In-memory idempotency store.

    Production deployments keep this in Redis or a database table with a TTL
    and a uniqueness constraint on the key; the dict here keeps the control
    flow visible. The reservation step (marking a key in-flight *before* doing
    the work) is what stops two concurrent retries from both executing.
    """

    def __init__(self) -> None:
        self._entries: dict[str, _Entry] = {}

    def run(
        self,
        key: str,
        params: dict[str, Any],
        execute: Callable[..., T],
    ) -> T:
        """Execute `execute(**params)` at most once for `key`.

        Raises:
            ConflictError: `key` was used before with different parameters.
            InFlightError: a prior attempt with this key has not finished.
        """
        fingerprint = _fingerprint(params)
        prior = self._entries.get(key)

        if prior is not None:
            if prior.fingerprint != fingerprint:
                raise ConflictError(f"key {key!r} reused with different parameters")
            if not prior.complete:
                raise InFlightError(f"key {key!r} is still in flight")
            return prior.response  # The retry: replay, do not re-execute.

        # Reserve before executing so a concurrent retry sees "in flight"
        # rather than starting a second execution.
        self._entries[key] = _Entry(fingerprint, None, complete=False)
        try:
            result = execute(**params)
        except Exception:
            # Failed attempts must not be cached, or a transient error would be
            # replayed forever instead of being retried.
            del self._entries[key]
            raise

        self._entries[key] = _Entry(fingerprint, result, complete=True)
        return result

    def __len__(self) -> int:
        return len(self._entries)


if __name__ == "__main__":
    charges: list[float] = []

    def charge(user: str, amount: float) -> str:
        charges.append(amount)
        return f"receipt-{len(charges)}"

    store = IdempotencyStore()
    key = "client-generated-uuid-42"
    params = {"user": "alice", "amount": 99.0}

    first = store.run(key, params, charge)
    retry = store.run(key, params, charge)  # client saw a timeout, retried

    print(f"responses identical: {first == retry}")
    print(f"times actually charged: {len(charges)}")
