import pytest

from examples.python.capacity import (
    estimate,
    required_pool_size,
    tail_amplification,
)


def test_twitter_scale_estimate() -> None:
    cap = estimate(200_000_000, 2, 100, 300)

    # 400M writes/day / 86400 s ≈ 4630/s
    assert cap.write_qps_avg == pytest.approx(4629.6, rel=1e-3)
    assert cap.write_qps_peak == pytest.approx(cap.write_qps_avg * 3)
    # 100:1 read ratio pushes peak reads past a million/sec — no single DB.
    assert cap.read_qps_peak > 1_000_000
    assert cap.storage_per_day_gb == pytest.approx(120.0)
    assert cap.storage_per_year_tb == pytest.approx(43.8, rel=1e-2)


def test_peak_multiplier_scales_only_peaks() -> None:
    base = estimate(1_000_000, 1, 10, 100, peak_multiplier=1.0)
    spiky = estimate(1_000_000, 1, 10, 100, peak_multiplier=10.0)

    assert base.write_qps_avg == spiky.write_qps_avg
    assert spiky.write_qps_peak == pytest.approx(base.write_qps_peak * 10)
    assert base.storage_per_day_gb == spiky.storage_per_day_gb


def test_peak_multiplier_below_one_rejected() -> None:
    with pytest.raises(ValueError):
        estimate(1000, 1, 1, 100, peak_multiplier=0.5)


def test_pool_size_grows_with_dependency_latency() -> None:
    # Little's Law: same traffic, slower dependency, far larger pool.
    assert required_pool_size(500, 0.010) == 10
    assert required_pool_size(500, 0.100) == 100
    assert required_pool_size(500, 2.000) == 2000


def test_pool_size_never_zero() -> None:
    assert required_pool_size(1, 0.0001) == 1


def test_tail_amplification_compounds_with_fan_out() -> None:
    assert tail_amplification(0.01, 1) == pytest.approx(0.01)
    assert tail_amplification(0.01, 100) == pytest.approx(0.634, abs=1e-3)
    # More calls is strictly worse.
    assert tail_amplification(0.01, 10) > tail_amplification(0.01, 1)


def test_tail_amplification_edges() -> None:
    assert tail_amplification(0.0, 100) == 0.0
    assert tail_amplification(1.0, 3) == 1.0
