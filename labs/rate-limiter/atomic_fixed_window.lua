-- Atomic fixed-window rate limiter: increment-then-check, in one EVAL call.
-- No client can observe a stale count between "read" and "act" because
-- there is no separate read — the increment and the limit check happen
-- inside the same atomic script execution.
-- KEYS[1] = counter key, ARGV[1] = window seconds, ARGV[2] = limit
local count = redis.call('INCR', KEYS[1])
if count == 1 then
  redis.call('EXPIRE', KEYS[1], ARGV[1])
end
if count > tonumber(ARGV[2]) then
  return 0  -- deny
else
  return 1  -- allow
end
