from examples.python.retry import retry


def test_retries_then_succeeds() -> None:
    n = {"i": 0}

    def flaky() -> str:
        n["i"] += 1
        if n["i"] < 3:
            raise RuntimeError("nope")
        return "ok"

    assert retry(flaky, attempts=4, sleep_fn=lambda _d: None) == "ok"
    assert n["i"] == 3


def test_gives_up() -> None:
    def boom() -> None:
        raise ValueError("x")

    try:
        retry(boom, attempts=2, retry_on=(ValueError,), sleep_fn=lambda _d: None)
    except ValueError:
        return
    raise AssertionError("expected ValueError")
