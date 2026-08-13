package examples

import (
	"crypto/md5"
	"encoding/binary"
	"sort"
)

type Ring struct {
	vnodes int
	keys   []uint32
	nodes  map[uint32]string
}

func NewRing(vnodes int) *Ring {
	return &Ring{vnodes: vnodes, nodes: map[uint32]string{}}
}

func hash(s string) uint32 {
	sum := md5.Sum([]byte(s))
	return binary.BigEndian.Uint32(sum[:4])
}

func (r *Ring) Add(name string) {
	for i := 0; i < r.vnodes; i++ {
		h := hash(name + "#" + string(rune('0'+i)))
		r.nodes[h] = name
		r.keys = append(r.keys, h)
	}
	sort.Slice(r.keys, func(i, j int) bool { return r.keys[i] < r.keys[j] })
}

func (r *Ring) Owner(key string) string {
	if len(r.keys) == 0 {
		return ""
	}
	h := hash(key)
	i := sort.Search(len(r.keys), func(i int) bool { return r.keys[i] >= h })
	if i == len(r.keys) {
		i = 0
	}
	return r.nodes[r.keys[i]]
}
