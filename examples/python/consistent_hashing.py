"""Consistent hash ring with virtual nodes.

Keys and node replicas are hashed onto a 32-bit ring. A key is owned by the
first replica clockwise. Adding or removing a physical node remaps roughly
K/N keys instead of almost all of them (modular hashing).
"""

from __future__ import annotations

from bisect import bisect_right
import hashlib


class ConsistentHashRing:
    def __init__(self, vnodes: int = 150, virtual_nodes: int | None = None) -> None:
        n = virtual_nodes if virtual_nodes is not None else vnodes
        if n < 1:
            raise ValueError("vnodes must be >= 1")
        self.vnodes = n
        self.virtual_nodes = n
        self._ring: dict[int, str] = {}
        self._sorted: list[int] = []
        self._nodes: set[str] = set()

    @staticmethod
    def _hash(key: str) -> int:
        return int(hashlib.md5(key.encode("utf-8")).hexdigest(), 16) % (2**32)

    def add_node(self, node: str) -> None:
        if node in self._nodes:
            raise ValueError(f"node already present: {node}")
        self._nodes.add(node)
        for i in range(self.vnodes):
            pos = self._hash(f"{node}:vnode:{i}")
            if pos in self._ring:
                continue
            self._ring[pos] = node
            self._sorted.append(pos)
        self._sorted.sort()

    def remove_node(self, node: str) -> None:
        if node not in self._nodes:
            raise KeyError(node)
        self._nodes.remove(node)
        self._ring = {p: n for p, n in self._ring.items() if n != node}
        self._sorted = [p for p in self._sorted if p in self._ring]

    def owner(self, key: str) -> str:
        if not self._sorted:
            raise RuntimeError("ring has no nodes")
        pos = self._hash(key)
        idx = bisect_right(self._sorted, pos) % len(self._sorted)
        return self._ring[self._sorted[idx]]

    get_node = owner

    def nodes(self) -> frozenset[str]:
        return frozenset(self._nodes)
