package examples

type node struct {
	k, v       string
	prev, next *node
}

type LRU struct {
	cap        int
	items      map[string]*node
	head, tail *node
}

func NewLRU(cap int) *LRU {
	h, t := &node{}, &node{}
	h.next, t.prev = t, h
	return &LRU{cap: cap, items: map[string]*node{}, head: h, tail: t}
}

func (l *LRU) detach(n *node) {
	n.prev.next = n.next
	n.next.prev = n.prev
}

func (l *LRU) front(n *node) {
	n.next = l.head.next
	n.prev = l.head
	l.head.next.prev = n
	l.head.next = n
}

func (l *LRU) Get(k string) (string, bool) {
	n, ok := l.items[k]
	if !ok {
		return "", false
	}
	l.detach(n)
	l.front(n)
	return n.v, true
}

func (l *LRU) Put(k, v string) {
	if n, ok := l.items[k]; ok {
		n.v = v
		l.detach(n)
		l.front(n)
		return
	}
	n := &node{k: k, v: v}
	l.items[k] = n
	l.front(n)
	if len(l.items) > l.cap {
		lru := l.tail.prev
		l.detach(lru)
		delete(l.items, lru.k)
	}
}
