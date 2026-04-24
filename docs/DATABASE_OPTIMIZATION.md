# Database Optimization Guide

Performance troubleshooting and optimization strategies for MiPrimerApp's Supabase database.

## Identifying Slow Queries

### 1. Enable Query Logging (Supabase Dashboard)

In Supabase dashboard → Database → Logs:
- Navigate to "Database Logs"
- Filter by slow queries (> 1000ms)
- Check for:
  - Missing indexes (sequential scans)
  - N+1 query patterns (loop in app, repeated requests)
  - Large data transfers (unnecessary columns)

### 2. EXPLAIN ANALYZE Pattern

Before deploying any query, test with `EXPLAIN ANALYZE`:

```sql
EXPLAIN ANALYZE
SELECT r.id, r.folio, r.total, e.nombre
FROM reservas r
JOIN estados e ON r.destino = e.nombre
WHERE r.usuario_id = 'user-uuid'
AND r.created_at > NOW() - INTERVAL '30 days'
ORDER BY r.created_at DESC
LIMIT 50;
```

**What to look for:**
- "Seq Scan" (full table scan) — missing index
- "Planning Time" >> "Execution Time" — query planner overhead
- Row counts changing at each step — data inconsistency

## Common Performance Patterns

### Pattern 1: N+1 Queries (Most Common)

**Problem:**
```typescript
// WRONG: N+1 pattern
const reservas = await supabase
  .from('reservas')
  .select('*')
  .eq('usuario_id', userId);

// Loop fetches destination details 1-by-1
for (const reserva of reservas) {
  const estado = await supabase
    .from('estados')
    .select('nombre, descripcion')
    .eq('nombre', reserva.destino)
    .single();
}
```

**Solution: Batch in single query**
```typescript
// CORRECT: Single batch query
const reservas = await supabase
  .from('reservas')
  .select('*, estados(nombre, descripcion)')
  .eq('usuario_id', userId);
// estados are joined in response
```

### Pattern 2: Unnecessary Columns

**Problem:**
```typescript
// WRONG: Fetches all columns including large JSON
const eventos = await supabase
  .from('analytics_eventos')
  .select('*')
  .eq('event_name', 'checkout_start');
```

**Solution: Select only needed columns**
```typescript
// CORRECT: Only fetch needed columns
const eventos = await supabase
  .from('analytics_eventos')
  .select('id, event_name, created_at')
  .eq('event_name', 'checkout_start');
```

### Pattern 3: Unbounded Result Sets

**Problem:**
```typescript
// WRONG: Fetches ALL user favorites (could be 100k+ rows)
const favoritos = await supabase
  .from('favoritos')
  .select('*')
  .eq('usuario_id', userId);
```

**Solution: Use pagination**
```typescript
// CORRECT: Fetch with limit and offset
const PAGE_SIZE = 50;
const favoritos = await supabase
  .from('favoritos')
  .select('*')
  .eq('usuario_id', userId)
  .order('created_at', { ascending: false })
  .range(0, PAGE_SIZE - 1);
```

### Pattern 4: Filtering Before Aggregation

**Problem:**
```sql
-- WRONG: Counts all reservations, then filters
SELECT COUNT(*) as total
FROM reservas
WHERE usuario_id = 'user-uuid'
AND estado = 'confirmada';
-- Calculates COUNT(*) on full table, then filters
```

**Solution: Filter first**
```sql
-- CORRECT: Filters first, then counts
SELECT COUNT(*) as total
FROM reservas
WHERE usuario_id = 'user-uuid'
AND estado = 'confirmada';
-- Uses index on usuario_id, then estado
```

## Database Tuning

### 1. Connection Pooling

Supabase manages connection pooling automatically. If you see "too many connections" errors:

- Reduce connection timeout (settings in Supabase dashboard)
- Use long-lived connections (avoid creating new clients per request)
- Check for connection leaks in application code

### 2. RLS Performance Impact

Row-Level Security has a small performance cost (~5-10ms per query). If you need high-throughput:

- Use `service_role` key for batch operations (bypass RLS)
- Cache RLS results when possible
- Monitor RLS policy complexity (deeply nested EXISTS checks slow down queries)

### 3. Statistics & Query Planner

The Postgres query planner uses table statistics to decide index usage:

```sql
-- Force statistics update
ANALYZE public.reservas;
ANALYZE public.usuarios;
ANALYZE public.estados;
```

## Monitoring Queries

### Active Connections & Queries

```sql
-- See currently running queries
SELECT pid, usename, query, query_start
FROM pg_stat_activity
WHERE state = 'active'
ORDER BY query_start DESC;
```

### Table Bloat

```sql
-- Check table size and bloat
SELECT schemaname, tablename, 
       pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) as size
FROM pg_tables
WHERE schemaname = 'public'
ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC;
```

### Index Usage

```sql
-- Find unused indexes (candidates for removal)
SELECT schemaname, tablename, indexname, idx_scan
FROM pg_stat_user_indexes
WHERE idx_scan = 0
AND indexname NOT LIKE '%_pkey'
ORDER BY pg_relation_size(indexrelid) DESC;
```

## Query Optimization Checklist

Before deploying a new feature:

- [ ] **Joins:** Use relationship joins, not loop + separate queries
- [ ] **Pagination:** Limit results with `.range()` or `LIMIT/OFFSET`
- [ ] **Columns:** Select only needed columns, not `SELECT *`
- [ ] **Filters:** Apply WHERE before aggregations (COUNT, SUM)
- [ ] **Sorting:** Use indexes for ORDER BY (avoid filesort)
- [ ] **Testing:** Run `EXPLAIN ANALYZE` on production dataset size
- [ ] **Monitoring:** Check Supabase Logs for slow query patterns
- [ ] **Caching:** Cache read-only data (favorites, states) when possible

## Common Slow Query Fixes

### Fix 1: Add Index for Frequent Filter

```sql
-- If querying "eventos by user created in last 30 days" is slow:
CREATE INDEX idx_analytics_user_date 
ON analytics_eventos(user_id, created_at DESC)
WHERE created_at > NOW() - INTERVAL '90 days';
```

### Fix 2: Partition Large Tables

If `analytics_eventos` grows to millions of rows:

```sql
-- Partition by month for better performance
CREATE TABLE analytics_eventos_202604 PARTITION OF analytics_eventos
FOR VALUES FROM ('2026-04-01') TO ('2026-05-01');
```

### Fix 3: Archive Old Data

```sql
-- Move old analytics events to cold storage
DELETE FROM analytics_eventos
WHERE created_at < NOW() - INTERVAL '1 year'
RETURNING *; -- export to CSV for archive
```

## Performance Targets

| Operation | Target | Notes |
|-----------|--------|-------|
| Single row SELECT | < 10ms | With index |
| List with pagination (50 rows) | < 50ms | With proper index |
| JOIN two tables | < 30ms | With FK index |
| COUNT aggregation | < 20ms | With WHERE filter |
| INSERT single row | < 10ms | With validation trigger |
| UPDATE single row | < 15ms | With RLS check |

## Monitoring in Production

Set up alerts for:
- Query time > 1000ms (Sentry integrations)
- Slow transaction lag (replica lag > 100ms)
- Connection pool saturation (> 80% of max connections)
- Large result sets (> 10MB transferred per query)

Use Supabase Logs + Sentry to catch performance regressions early.
