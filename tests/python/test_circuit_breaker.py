from examples.python.circuit_breaker import CircuitBreaker, CircuitOpenError, State


def test_opens_after_threshold() -> None:
    cb = CircuitBreaker(failure_threshold=2)

    def boom() -> None:
        raise RuntimeError("down")

    for _ in range(2):
        try:
            cb.call(boom)
        except RuntimeError:
            pass
    assert cb.state is State.OPEN
    try:
        cb.call(lambda: 1)
    except CircuitOpenError:
        pass
    else:
        raise AssertionError("expected CircuitOpenError")


def test_half_open_recovers() -> None:
    cb = CircuitBreaker(failure_threshold=1, success_threshold=1)
    try:
        cb.call(lambda: (_ for _ in ()).throw(RuntimeError("x")))
    except RuntimeError:
        pass
    cb.probe()
    assert cb.state is State.HALF_OPEN
    assert cb.call(lambda: 7) == 7
    assert cb.state is State.CLOSED
