from examples.python.consistent_hashing import ConsistentHashRing


def test_owner_stable_until_ring_changes() -> None:
    r = ConsistentHashRing(vnodes=20)
    r.add_node("a")
    r.add_node("b")
    r.add_node("c")
    first = r.owner("user:42")
    assert r.owner("user:42") == first


def test_add_node_moves_only_a_fraction() -> None:
    r = ConsistentHashRing(vnodes=30)
    for n in "abc":
        r.add_node(n)
    keys = [f"k{i}" for i in range(200)]
    before = {k: r.owner(k) for k in keys}
    r.add_node("d")
    moved = sum(1 for k in keys if before[k] != r.owner(k))
    assert 0 < moved < 120
