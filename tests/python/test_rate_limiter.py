from examples.python.rate_limiter import TokenBucket


def test_burst_then_reject() -> None:
    b = TokenBucket(rate=10, burst=3, tokens=3, last=0)
    assert b.allow(now=0)
    assert b.allow(now=0)
    assert b.allow(now=0)
    assert not b.allow(now=0)


def test_refill() -> None:
    b = TokenBucket(rate=10, burst=3, tokens=0, last=0)
    assert not b.allow(now=0)
    assert b.allow(now=0.15)
