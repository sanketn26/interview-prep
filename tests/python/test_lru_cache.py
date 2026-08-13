from examples.python.lru_cache import LRUCache


def test_evicts_least_recently_used() -> None:
    c: LRUCache[str, int] = LRUCache(2)
    c.put("a", 1)
    c.put("b", 2)
    assert c.get("a") == 1
    c.put("c", 3)
    assert c.get("b") is None
    assert c.get("a") == 1
    assert c.get("c") == 3
