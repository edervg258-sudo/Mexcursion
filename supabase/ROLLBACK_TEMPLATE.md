# Database Rollback Procedures

This document explains how to safely rollback database migrations and handle incidents.

## Quick Reference

For each migration in `supabase/migrations/`, there's a corresponding `supabase/rollbacks/down_*.sql` file that reverses it.

**To rollback:**
1. Identify the migration to revert: `20260424_120100_seed_data.sql`
2. Run the down script: `down_20260424_120100_seed_data.sql`
3. Verify with `schema_migrations` table
4. Update deployment (re-deploy code without the problematic feature)

## Migration Rollback Pattern

Each rollback script follows this pattern:

### Example: Rolling back seed data migration

**Original (forward) migration:**
```sql
-- Migration: 20260424_120100_seed_data.sql
INSERT INTO public.estados (id, nombre, ...) VALUES (...) ON CONFLICT (id) DO NOTHING;
```

**Rollback (down) script:**
```sql
-- Rollback: down_20260424_120100_seed_data.sql
-- Removes states added by 20260424_120100
DELETE FROM public.estados WHERE id BETWEEN 1 AND 32;

-- Remove from migration tracking
DELETE FROM schema_migrations WHERE version = '20260424_120100';
```

### Example: Rolling back schema changes

**Original (forward) migration:**
```sql
-- Migration: 20260424_120200_add_column.sql
ALTER TABLE public.reservas ADD COLUMN new_field TEXT;
```

**Rollback (down) script:**
```sql
-- Rollback: down_20260424_120200_add_column.sql
ALTER TABLE public.reservas DROP COLUMN IF EXISTS new_field;

DELETE FROM schema_migrations WHERE version = '20260424_120200';
```

## Step-by-Step Rollback Procedure

### 1. Identify the Problem Migration

Check Supabase logs or Sentry for error details:

```sql
-- Query the migration history
SELECT version, description, installed_on, success
FROM schema_migrations
ORDER BY installed_on DESC
LIMIT 5;
```

If `success = false`, that migration failed and needs fixing.

### 2. Prepare the Rollback

Before running anything in production:

1. **Test in staging:**
   ```bash
   # Connect to staging Supabase URL
   psql postgresql://user:pass@staging-db.supabase.co:5432/postgres
   
   # Run the down script
   \i supabase/rollbacks/down_20260424_120200_add_column.sql
   
   # Verify data integrity
   SELECT COUNT(*) FROM reservas;
   ```

2. **Create backup** (optional, Supabase handles this):
   - Supabase auto-backs up after every migration
   - You can restore from "Backups" in dashboard

### 3. Execute Rollback in Production

**Option A: Via Supabase Dashboard (Recommended)**

1. Go to Supabase Dashboard → SQL Editor
2. Open `supabase/rollbacks/down_*.sql`
3. Run the query
4. Verify: `SELECT * FROM schema_migrations WHERE version = '20260424_120200';` (should be gone)

**Option B: Via CLI (if Supabase CLI is set up)**

```bash
# Not recommended yet—use dashboard for safety
supabase db pull  # Fetch current schema
# Manually edit migrations
supabase db push  # Push rollback
```

### 4. Verify Rollback Success

```sql
-- Check migration was removed
SELECT * FROM schema_migrations WHERE version = '20260424_120200';
-- Result: No rows (rollback successful)

-- Check data integrity
SELECT COUNT(*) as reserva_count FROM reservas;
SELECT COUNT(*) as usuario_count FROM usuarios;

-- Check RLS still enabled
SELECT tablename, rowleveldb_security
FROM pg_tables
WHERE schemaname = 'public' AND rowleveldb_security = true;
```

## Incident Response Workflows

### Incident Type 1: Failed Migration (Bad SQL Syntax)

```
✗ Migration 20260424_120200 failed: Syntax error
↓
1. Check schema_migrations: success = false
2. Run: down_20260424_120200_*.sql
3. Fix the SQL in migrations/20260424_120200_*.sql
4. Re-run migrations/20260424_120200_*.sql
5. Verify: SELECT * FROM schema_migrations WHERE version = '20260424_120200'
```

### Incident Type 2: Data Corruption (Bad Query Logic)

```
✗ Migration 20260424_120100 deleted wrong data
↓
1. Check Supabase Backups → Restore from 30 min ago
2. OR: Run rollback script: down_20260424_120100_*
3. Investigate root cause
4. Re-run migration with fixed logic
```

### Incident Type 3: Deployment Rollback (Feature Bug)

```
✗ Feature X is broken, needs immediate revert
↓
1. Code: git revert <commit-hash> or git checkout <previous-tag>
2. Database: Run rollback for related migrations
3. Deploy code and database changes together
4. Verify: Integration tests + E2E tests pass
```

## Safe Rollback Practices

1. **Always test first in staging** before touching production
2. **Backup before rollback** (Supabase keeps 7-day backup history)
3. **Communicate** with team via Slack/email before starting
4. **Verify data** after rollback with spot checks
5. **Monitor** Sentry for errors in the 10 minutes after rollback
6. **Document** what went wrong and how you fixed it (postmortem)

## Rollback Checklist

Before marking incident as resolved:

- [ ] Migration rolled back successfully (verified in `schema_migrations`)
- [ ] Data integrity checked (row counts, spot checks)
- [ ] RLS still enabled on all tables
- [ ] Code deployed (reverted feature)
- [ ] E2E tests pass on staging
- [ ] Sentry errors cleared (or explained)
- [ ] Team notified of status
- [ ] Postmortem scheduled (for critical incidents)

## Creating New Rollback Scripts

When adding a new migration, create a rollback script immediately:

**1. Add migration:**
```bash
touch supabase/migrations/20260424_120300_new_feature.sql
# Write migration SQL
```

**2. Create corresponding rollback:**
```bash
touch supabase/rollbacks/down_20260424_120300_new_feature.sql
# Write INVERSE of migration logic
```

**3. Test rollback:**
```bash
# In staging:
# 1. Run forward migration
# 2. Run rollback
# 3. Run forward again
# Verify: Data should be consistent before/after
```

## Time Estimates

| Operation | Time | Notes |
|-----------|------|-------|
| Identify problem | 5 min | Check logs |
| Test rollback in staging | 10 min | Safety critical |
| Execute rollback production | 2 min | SQL execution |
| Verify integrity | 5 min | Spot checks |
| Deploy code revert | 5 min | CI/CD pipeline |
| Monitor for errors | 10 min | Sentry/logs |
| **Total** | **37 min** | Full incident response |

## Reference

- **Schema:** `supabase/migrations/` (forward) and `supabase/rollbacks/` (backward)
- **Tracking:** `schema_migrations` table (version, success, installed_on)
- **Audit:** `supabase/rls_audit.sql` (verify RLS after rollback)
- **Backups:** Supabase Dashboard → Backups (restore from point-in-time)
