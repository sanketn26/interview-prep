import pytest

from examples.python.idempotency import (
    ConflictError,
    IdempotencyStore,
    InFlightError,
)


def _counting_charge(calls: list[float]):
    def charge(user: str, amount: float) -> str:
        calls.append(amount)
        return f"receipt-{len(calls)}"

    return charge


def test_retry_replays_response_without_re_executing() -> None:
    calls: list[float] = []
    store = IdempotencyStore()
    params = {"user": "alice", "amount": 99.0}

    first = store.run("key-1", params, _counting_charge(calls))
    second = store.run("key-1", params, _counting_charge(calls))

    assert first == second
    assert len(calls) == 1


def test_distinct_keys_execute_independently() -> None:
    calls: list[float] = []
    store = IdempotencyStore()
    charge = _counting_charge(calls)

    store.run("key-1", {"user": "a", "amount": 1.0}, charge)
    store.run("key-2", {"user": "a", "amount": 1.0}, charge)

    assert len(calls) == 2


def test_same_key_different_params_conflicts() -> None:
    store = IdempotencyStore()
    charge = _counting_charge([])

    store.run("key-1", {"user": "alice", "amount": 99.0}, charge)

    with pytest.raises(ConflictError):
        store.run("key-1", {"user": "alice", "amount": 500.0}, charge)


def test_param_order_does_not_affect_identity() -> None:
    calls: list[float] = []
    store = IdempotencyStore()
    charge = _counting_charge(calls)

    store.run("key-1", {"user": "alice", "amount": 99.0}, charge)
    store.run("key-1", {"amount": 99.0, "user": "alice"}, charge)

    assert len(calls) == 1


def test_failed_attempt_is_not_cached() -> None:
    store = IdempotencyStore()
    attempts = {"n": 0}

    def flaky(user: str) -> str:
        attempts["n"] += 1
        if attempts["n"] == 1:
            raise RuntimeError("transient")
        return "ok"

    with pytest.raises(RuntimeError):
        store.run("key-1", {"user": "a"}, flaky)

    # A transient failure must remain retryable rather than being replayed.
    assert store.run("key-1", {"user": "a"}, flaky) == "ok"
    assert attempts["n"] == 2


def test_reentrant_call_reports_in_flight() -> None:
    store = IdempotencyStore()

    def reenter(user: str) -> str:
        # Simulates a concurrent retry arriving before the first call finished.
        store.run("key-1", {"user": user}, lambda user: "inner")
        return "outer"

    with pytest.raises(InFlightError):
        store.run("key-1", {"user": "a"}, reenter)
