---
title: SQL Deep Dive
description: Query optimization, window functions, normalization vs denormalization, and performance tuning.
---

# SQL Deep Dive: Mastering Query Performance

SQL is the lingua franca of databases. But writing SQL is easy; writing **fast SQL** requires understanding how the database executes queries.

---

## Why SQL Matters in Interviews

SQL knowledge separates senior engineers from midlevels:

```
Junior: "The query is slow. Let me add an index."
Senior: "The query is slow. Let me check the query plan, the schema, 
         the data distribution, and the access pattern."
```

Most performance problems are not "no index" — they're bad schema design, missing statistics, or queries that can't be optimized.

---

## Part 1: Query Execution and EXPLAIN

### EXPLAIN: Reading the Execution Plan

```sql
EXPLAIN ANALYZE
SELECT u.name, COUNT(o.id) as order_count
FROM users u
LEFT JOIN orders o ON u.id = o.user_id
WHERE u.created_at > '2024-01-01'
GROUP BY u.id, u.name;

OUTPUT:
                          QUERY PLAN
──────────────────────────────────────────────────────────────
 GroupAggregate (cost=0.43..2.50 rows=1)
   Group Key: u.id, u.name
   → Hash Join (cost=0.14..2.00 rows=50)
        Join Cond: (u.id = o.user_id)
        → Seq Scan on users u (cost=0.00..0.50 rows=100)
              Filter: (created_at > '2024-01-01')
        → Seq Scan on orders o (cost=0.00..0.32 rows=200)
```

**What to read**:

| Line | Meaning |
|---|---|
| `Seq Scan on users` | Full table scan (no index used) |
| `cost=0.00..0.50` | Estimated cost (arbitrary units) |
| `rows=100` | Estimated rows; compare to actual in parentheses |
| `Hash Join` | Join algorithm (also: Nested Loop, Merge Join) |

### Join Algorithms

```
Nested Loop:
  FOR each row in outer table
    FOR each row in inner table
      IF join condition matches
        OUTPUT result

Cost: O(M × N) — terrible for large tables, good for small inner table

Hash Join:
  Build hash table of inner table (on join key)
  FOR each row in outer table
    Probe hash table
    OUTPUT matching results

Cost: O(M + N) — much better for large tables

Sort-Merge Join:
  Sort outer table by join key
  Sort inner table by join key
  Merge sorted tables

Cost: O(M log M + N log N) — good when both tables already sorted
```

**Interview signal**: "Hash Join is best for most cases. Nested Loop only if inner table is small. Sort-Merge if join key is already indexed."

---

## Part 2: Indexing Strategies

### Single-Column Indexes

```sql
CREATE INDEX ON orders(user_id);

-- Fast: uses index
SELECT * FROM orders WHERE user_id = 123;

-- Slow: full scan
SELECT * FROM orders WHERE status = 'pending';  -- no index on status
```

### Composite Indexes (Multi-Column)

Order matters:

```sql
-- Index: (user_id, created_at)
CREATE INDEX ON orders(user_id, created_at);

-- This query uses the index:
SELECT * FROM orders WHERE user_id = 123 AND created_at > '2024-01-01';

-- This query uses the index:
SELECT * FROM orders WHERE user_id = 123;

-- This query does NOT use the index (missing user_id):
SELECT * FROM orders WHERE created_at > '2024-01-01';
```

**Rule**: Index columns in order of filtering (most selective first).

### Covering Indexes

Include columns in the index so the query doesn't need to fetch from disk:

```sql
-- Without covering index:
SELECT user_id, amount FROM orders WHERE user_id = 123;
  → Index returns matching row IDs
  → Fetch full rows from disk
  → Extract user_id, amount

-- With covering index:
CREATE INDEX ON orders(user_id) INCLUDE (amount);
  → Index contains: user_id, amount
  → No disk fetch needed (index has all columns)
  → Much faster (index-only scan)
```

### Partial Indexes

Index only rows matching a condition:

```sql
-- Index all 100M users (large)
CREATE INDEX ON users(email);

-- Index only active users (small, faster)
CREATE INDEX ON users(email) WHERE is_active = true;
```

If 90% of queries filter on `is_active = true`, this is much faster.

---

## Part 3: Query Optimization Techniques

### Avoid SELECT *

```sql
-- Bad: retrieves all columns (including LOB types like images, JSON)
SELECT * FROM users WHERE id = 1;

-- Good: only needed columns
SELECT id, name, email FROM users WHERE id = 1;

Savings: 100 bytes per row → 10 bytes per row (10× faster)
```

### Push Filtering Down

```sql
-- Bad: fetch all orders, filter in application
SELECT * FROM orders;
foreach order:
  if order.user_id == 123:
    process(order)

-- Good: filter in database
SELECT * FROM orders WHERE user_id = 123;

Savings: 1M rows transferred → 100 rows transferred (10,000× faster)
```

### Use LIMIT for Sampling

```sql
-- Count estimate (instead of full scan)
SELECT COUNT(*) FROM orders;  -- scans all 1B rows, 10 seconds

SELECT (
  SELECT COUNT(*) FROM (
    SELECT 1 FROM orders TABLESAMPLE BERNOULLI(0.1) LIMIT 10000
  )
) * 1000 as estimated_count;
-- samples 0.1% of rows, estimates total in milliseconds
```

### Batch Operations

```sql
-- Bad: 1000 round trips to database
for user_id in user_ids:
  INSERT INTO audit_log VALUES (...);

-- Good: one batch insert
INSERT INTO audit_log VALUES
  (...),
  (...),
  (...);

Speedup: 1000× (network round-trip dominates)
```

---

## Part 4: Window Functions

Advanced SQL feature for analytical queries:

```sql
SELECT
  user_id,
  amount,
  ROW_NUMBER() OVER (PARTITION BY user_id ORDER BY created_at) as order_seq,
  SUM(amount) OVER (PARTITION BY user_id) as lifetime_value,
  LAG(amount, 1) OVER (PARTITION BY user_id ORDER BY created_at) as prev_amount
FROM orders;

Output:
user_id | amount | order_seq | lifetime_value | prev_amount
───────────────────────────────────────────────────────────
1       | 100    | 1         | 250            | NULL
1       | 150    | 2         | 250            | 100
2       | 200    | 1         | 200            | NULL
```

**Window functions**:
- `ROW_NUMBER()`: sequential number per partition
- `RANK()`: rank with ties (1, 1, 3)
- `DENSE_RANK()`: rank without gaps (1, 1, 2)
- `LAG()`, `LEAD()`: access previous/next row
- `SUM()`, `AVG()` OVER: running aggregate

**Use case**: "Get user's rank vs. others; previous purchase amount; cumulative spending."

---

## Part 5: Normalization vs Denormalization

### Normalization (3NF)

Every fact appears once (avoids redundancy):

```
❌ Denormalized (redundant):
users:
  id, name, address, city, state, country, country_code

country_code is derivable from country (redundant)

✅ Normalized (3NF):
users:
  id, name, address, city, state, country_id
countries:
  id, code, name
```

**Pros**: Update once, reflected everywhere; compact storage.
**Cons**: Joins required for queries; slower reads.

### Denormalization (Performance Optimization)

Duplicate data to avoid joins:

```
✅ Denormalized:
orders:
  id, user_id, user_name, user_email, amount

// No join needed to get user details
SELECT user_name, amount FROM orders WHERE id = 1;

❌ Cost:
// User renames: must update all orders
UPDATE orders SET user_name = "Alice Smith" WHERE user_id = 1;
```

**Interview rule**: "Normalize first (design time). Denormalize only if reads are slow and writes can tolerate stale data."

---

## Part 6: Materialized Views

Precomputed query results (denormalization at scale):

```sql
-- Daily sales report (computed once per day)
CREATE MATERIALIZED VIEW daily_sales AS
SELECT
  DATE(created_at) as date,
  category,
  COUNT(*) as order_count,
  SUM(amount) as total_revenue
FROM orders
GROUP BY DATE(created_at), category;

-- Fast query (uses precomputed view)
SELECT * FROM daily_sales WHERE date = '2024-08-14';

-- Refresh the view (daily)
REFRESH MATERIALIZED VIEW daily_sales;
```

**Tradeoff**: Stale data (refreshed periodically), but fast queries.

---

## Part 7: Common Pitfalls

### Implicit Type Conversion

```sql
-- phone is VARCHAR
SELECT * FROM users WHERE phone = 123;
  → Database converts 123 to '123'
  → Index on phone (text) is not used
  → Full scan

-- Fix: explicit type
SELECT * FROM users WHERE phone = '123';
  → Index used
```

### IN Clause with Subquery

```sql
-- Bad: subquery executed for every row
SELECT * FROM orders
WHERE user_id IN (SELECT user_id FROM users WHERE country = 'USA');
  → Executes subquery for each order (plan-dependent)

-- Good: use JOIN
SELECT DISTINCT o.*
FROM orders o
JOIN users u ON o.user_id = u.id
WHERE u.country = 'USA';
  → Subquery executed once, joined efficiently
```

### NULL Handling

```sql
-- NULL is not equal to anything (even NULL)
SELECT * FROM users WHERE email = NULL;  → 0 rows (wrong!)
SELECT * FROM users WHERE email IS NULL; → correct

-- NULL in IN clause
SELECT * FROM users WHERE id IN (1, 2, NULL);
  → NULL makes entire IN true/false/unknown
  → Avoid NULLs in WHERE clauses when possible
```

### NOT IN with NULLs

```sql
SELECT * FROM users WHERE id NOT IN (SELECT user_id FROM orders WHERE status = 'complete');

-- If subquery returns [1, 2, NULL]:
-- NULL in NOT IN → unknown
-- Unknown in WHERE → row is filtered out (incorrect)

-- Fix: use NOT EXISTS
SELECT * FROM users u
WHERE NOT EXISTS (
  SELECT 1 FROM orders o
  WHERE o.user_id = u.id AND o.status = 'complete'
);
```

---

## Part 8: Monitoring and Alerting

### Slow Query Log

```sql
SET GLOBAL slow_query_log = 'ON';
SET GLOBAL long_query_time = 1;  -- log queries > 1 second

-- Check slow queries
SELECT * FROM mysql.slow_log;
```

### Query Performance Insights

```sql
-- Top 10 slowest queries
SELECT query, COUNT(*) as executions, SUM(exec_time) as total_time
FROM query_log
GROUP BY query
ORDER BY total_time DESC
LIMIT 10;
```

---

## Interview Scenarios

| Scenario | Answer |
|---|---|
| "This query is slow. How do we fix it?" | "Run EXPLAIN ANALYZE. Check: full table scans (missing indexes), wrong join order (reorder tables), implicit type conversion (add WHERE type = cast(val)). Add index on filter columns. Use LIMIT for pagination." |
| "Should we normalize or denormalize?" | "Normalize for correctness (schema design). Denormalize only if reads > writes by 10:1 and stale data is OK. Materialized views are a middle ground." |
| "When do window functions matter?" | "Running aggregates (sum so far), ranking (top N per group), comparison to previous row. They eliminate self-joins, much faster." |
| "How do we avoid cache stampede in queries?" | "Probabilistic early refresh: if cache TTL < random(0%, 50% of TTL), refresh in background. Serves stale results while refresh happens." |
| "JOIN order impacts query speed?" | "Yes, dramatically. Optimizer tries to join smallest table first (filter early). If it chooses wrong, EXPLAIN shows the plan. Reorder SELECT / FROM / WHERE to hint the optimizer." |

---

## Key Takeaways

- **EXPLAIN ANALYZE is your best friend**: always check the plan before tuning.
- **Index order matters**: (filter, sort, include). Put most selective column first.
- **Covering indexes eliminate disk fetches**: include non-key columns if they're queried.
- **Partial indexes save space and speed**: index only rows matching WHERE.
- **Normalization first, denormalization only when needed**: most queries are fast with proper indexes.
- **Window functions eliminate self-joins**: 10× faster for analytical queries.
- **Batch operations**: single INSERT with 1000 rows is 1000× faster than 1000 INSERTs.
- **NULL breaks logic**: use IS NULL, not = NULL; avoid NOT IN with NULLs.

