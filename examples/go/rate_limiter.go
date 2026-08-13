package examples

// TokenBucket is a process-local limiter. Distributed limiting needs a shared store.
type TokenBucket struct {
	Rate   float64
	Burst  float64
	Tokens float64
	Last   float64
}

func (b *TokenBucket) Allow(now float64, n float64) bool {
	if b.Last == 0 {
		b.Tokens = b.Burst
		b.Last = now
	}
	elapsed := now - b.Last
	if elapsed < 0 {
		elapsed = 0
	}
	b.Tokens += elapsed * b.Rate
	if b.Tokens > b.Burst {
		b.Tokens = b.Burst
	}
	b.Last = now
	if b.Tokens >= n {
		b.Tokens -= n
		return true
	}
	return false
}
