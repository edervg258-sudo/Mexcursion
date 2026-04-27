# Database Issues Runbook

**Severity**: Critical  
**On-Call**: Database/Backend team  
**Estimated Resolution Time**: 30 min - 2 hours

## Quick Diagnosis

```bash
# Check database connection
psql "postgresql://user:pass@host:5432/mercursion" -c "SELECT 1"

# Check Supabase status
curl https://your-supabase.supabase.co/health

# Check recent errors in Sentry
# Filter: database OR postgres OR connection OR RLS
```

## Common Issues

| Issue | Symptom | Root Cause |
|-------|---------|-----------|
| **Connection Pool Exhausted** | 403 "too many connections" | Idle connections not closed |
| **Query Timeout** | 504 errors | Slow/unoptimized query running |
| **Disk Space Full** | Write failures | Database storage at 100% |
| **RLS Policy Error** | 403 forbidden on valid queries | Misconfigured row-level security |
| **Missing Index** | Slow response | Query not using index |
| **Corrupted Data** | Application errors | Migration failed or data inconsistent |

## Response Steps

### Step 1: Assess Database Health (2 min)

```sql
-- Connection status
SELECT datname, count(*) as connections 
FROM pg_stat_activity 
GROUP BY datname 
ORDER BY connections DESC;

-- Long-running queries
SELECT pid, usename, query, query_start 
FROM pg_stat_activity 
WHERE query != '<IDLE>' 
  AND query_start < NOW() - interval '5 minutes'
ORDER BY query_start DESC;

-- Disk usage
SELECT 
  schemaname,
  tablename,
  pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) AS size
FROM pg_tables 
WHERE schemaname NOT IN ('pg_catalog', 'information_schema')
ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC;

-- Active locks
SELECT * FROM pg_stat_activity WHERE wait_event IS NOT NULL;
```

### Step 2: Mitigation Actions

**For Connection Pool Exhausted:**
```sql
-- Kill idle connections
SELECT pg_terminate_backend(pid) 
FROM pg_stat_activity 
WHERE state = 'idle' 
  AND query_start < NOW() - interval '30 minutes';

-- Check connection limits
SHOW max_connections;  -- Usually 500 on Supabase
SHOW max_prepared_transactions;
```

**For Slow Query:**
```sql
-- Find culprit
SELECT query, mean_time, calls 
FROM pg_stat_statements 
ORDER BY mean_time DESC 
LIMIT 5;

-- Create missing index
CREATE INDEX idx_orders_user_id ON orders(user_id);
ANALYZE orders;

-- Kill slow query if blocking others
SELECT pg_terminate_backend(pid) 
WHERE query LIKE '%problematic_query%';
```

**For Disk Full:**
```sql
-- Check vacuum status
SELECT schemaname, tablename, last_vacuum, last_autovacuum 
FROM pg_stat_user_tables 
WHERE last_autovacuum < NOW() - interval '1 day';

-- Trigger manual vacuum
VACUUM FULL;  -- Aggressive (locks tables)
VACUUM ANALYZE;  -- Standard (preferred)

-- If critical, contact Supabase to increase disk
```

**For RLS Issues:**
```sql
-- Check problematic policy
SELECT * FROM pg_policies 
WHERE tablename = 'orders' 
  AND schemaname = 'public';

-- Temporarily disable for debugging
ALTER POLICY "..." ON public.orders DISABLE;

-- Test without RLS
SELECT COUNT(*) FROM public.orders;

-- Re-enable and fix policy
ALTER POLICY "..." ON public.orders ENABLE;
```

### Step 3: Verify Recovery

```sql
-- Check all systems normal
SELECT COUNT(*) FROM pg_stat_activity WHERE state = 'active';

-- No long-running queries
SELECT COUNT(*) FROM pg_stat_activity 
WHERE query_start < NOW() - interval '2 minutes';

-- Disk usage stable
SELECT pg_size_pretty(pg_database_size('mercursion'));

-- No locks waiting
SELECT COUNT(*) FROM pg_stat_activity WHERE wait_event IS NOT NULL;
```

## If Data Corruption Suspected

```bash
# 1. Check recent backups
# Supabase Dashboard > Database > Backups

# 2. Run integrity checks
psql -d mercursion -c "REINDEX DATABASE mercursion;"

# 3. Restore from backup if needed
# Contact Supabase support for PITR (point-in-time recovery)

# 4. Run application consistency checks
npm run check:data-integrity
```

## Escalation

- 5 min: Alert database on-call
- 15 min: Notify CTO
- 30 min: Contact Supabase support if unresolved

## Post-Incident

- [ ] Review slow query logs
- [ ] Add missing indexes
- [ ] Update connection pool settings
- [ ] Improve monitoring/alerting

---

**Last Updated**: 2026-04-24  
**Version**: 1.0
