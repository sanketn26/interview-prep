"""Back-of-envelope capacity estimation.

The arithmetic that turns product numbers (DAU, actions per user) into
engineering numbers (QPS, storage, connection pool size). These are the
estimates that pick an architecture: 1.4M reads/sec rules out a single
database before you have drawn a single box.

Round aggressively. Being 15% off never changes the design; being 100× off
always does.
"""

from __future__ import annotations

from dataclasses import dataclass

SECONDS_PER_DAY = 86_400
DAYS_PER_YEAR = 365


@dataclass(frozen=True)
class Capacity:
    """Derived load and storage figures for a workload."""

    write_qps_avg: float
    write_qps_peak: float
    read_qps_avg: float
    read_qps_peak: float
    storage_per_day_gb: float
    storage_per_year_tb: float

    def summary(self) -> str:
        return (
            f"writes {self.write_qps_avg:,.0f}/s avg, {self.write_qps_peak:,.0f}/s peak\n"
            f"reads  {self.read_qps_avg:,.0f}/s avg, {self.read_qps_peak:,.0f}/s peak\n"
            f"storage {self.storage_per_day_gb:,.1f} GB/day, "
            f"{self.storage_per_year_tb:,.1f} TB/year"
        )


def estimate(
    daily_active_users: int,
    actions_per_user_per_day: int,
    read_write_ratio: int,
    bytes_per_write: int,
    peak_multiplier: float = 3.0,
) -> Capacity:
    """Turn product numbers into engineering numbers.

    `peak_multiplier` matters more than people expect: traffic is never flat,
    and the system must survive the peak rather than the average. 3× is a
    conservative floor; event-driven spikes can reach 10×.
    """
    if peak_multiplier < 1:
        raise ValueError("peak_multiplier must be >= 1")

    writes_per_day = daily_active_users * actions_per_user_per_day
    write_qps = writes_per_day / SECONDS_PER_DAY
    read_qps = write_qps * read_write_ratio

    return Capacity(
        write_qps_avg=write_qps,
        write_qps_peak=write_qps * peak_multiplier,
        read_qps_avg=read_qps,
        read_qps_peak=read_qps * peak_multiplier,
        storage_per_day_gb=writes_per_day * bytes_per_write / 1e9,
        storage_per_year_tb=writes_per_day * DAYS_PER_YEAR * bytes_per_write / 1e12,
    )


def required_pool_size(
    arrival_rate_rps: float,
    latency_seconds: float,
    headroom: float = 2.0,
) -> int:
    """Little's Law: L = λ × W.

    Concurrency in flight equals arrival rate times how long each request holds
    a slot. This is why a pool sized for a 100 ms dependency is 20× too small
    when that dependency degrades to 2 s — and why every remote call needs a
    timeout, since an unbounded wait implies an unbounded pool.
    """
    return max(1, int(arrival_rate_rps * latency_seconds * headroom))


def tail_amplification(single_call_slow_rate: float, calls_per_request: int) -> float:
    """Probability a fan-out request hits at least one slow backend call.

    A 1% slow rate looks harmless until one page makes 100 calls, at which
    point ~63% of pages are slow.
    """
    return 1 - (1 - single_call_slow_rate) ** calls_per_request


if __name__ == "__main__":
    # "Design Twitter": 200M DAU, 2 posts/day, 100:1 reads, 300 B per post.
    print(estimate(200_000_000, 2, 100, 300).summary())

    print()
    for latency_ms in (10, 100, 2000):
        need = required_pool_size(500, latency_ms / 1000)
        print(f"500 rps @ {latency_ms:>5} ms -> {need:>5} connections needed")

    print()
    for n in (1, 10, 100):
        print(f"{n:>3} calls @ 1% slow -> {tail_amplification(0.01, n):.1%} slow requests")
