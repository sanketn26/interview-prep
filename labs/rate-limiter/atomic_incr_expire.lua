-- Fixed-window counter, done correctly: EXPIRE is set only on the request
-- that creates the key (count == 1), never re-armed on every request.
-- Run atomically via EVAL so no other client can interleave between the
-- INCR and the conditional EXPIRE.
local count = redis.call('INCR', KEYS[1])
if count == 1 then
  redis.call('EXPIRE', KEYS[1], ARGV[1])
end
return count
