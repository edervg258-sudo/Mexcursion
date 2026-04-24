# Deployment Strategy

Safe, incremental deployment procedures for MiPrimerApp with canary deployments and rollback capabilities.

## Deployment Stages

```
Commit → Test → Build → Canary (5%) → Monitor → Ramp (10%) → Full (100%) → Verify
```

### Stage 1: Test & Build
- All tests pass (unit, E2E, security)
- Build succeeds (no bundle bloat > 10%)
- Type checking passes
- Linting passes (including security rules)

### Stage 2: Canary Deployment (5% Traffic)
- Deploy to Railway **staging** environment
- Route 5% of production traffic to staging
- Run E2E tests against staging (live API calls)
- Monitor Sentry errors for 15 min
- Check Postgres query performance
- Verify payment processing works

### Stage 3: Error Rate Monitoring
- If error rate > 5% for 5 min → automatic rollback
- If payment failures > 2% → automatic rollback
- If response time > 2s (p99) → automatic rollback
- Otherwise → proceed to stage 4

### Stage 4: Ramp to 10%
- Increase traffic to 10%
- Monitor for another 5 min
- If no errors, proceed to full

### Stage 5: Full Deployment (100%)
- Route all traffic to new version
- Monitor for 30 min
- Check critical user journeys:
  - Login/registration
  - Search & filtering
  - Booking & payment
  - Profile & favorites

### Stage 6: Verify & Communicate
- Mark deployment as stable
- Post release notes
- Monitor for 24h for issues

## Pre-Deployment Checklist

```bash
# 1. Verify current state
git status                    # clean working tree
git log -1 --oneline        # commit message clear

# 2. Run all tests
npm run release:preflight   # lint, type check, tests, coverage

# 3. Check dependencies
npm audit --audit-level=moderate  # no vulnerabilities

# 4. Build artifact test
npm run build:web           # no build errors
ls -lh dist/                # size check (warn if > 20% increase)

# 5. Database check
# Ensure all pending migrations applied to staging
# Run: supabase/migrations/*.sql

# 6. Feature flag check
# Ensure new features are hidden behind flags in staging

# 7. Sentry check
# Verify correct DSN in .env.production
# Check baseline error rate in production
```

## Canary Deployment Workflow

### Automated (GitHub Actions)

**.github/workflows/canary-deploy.yml** (create this file):

```yaml
name: Canary Deployment
on:
  push:
    branches: [main]
jobs:
  canary:
    runs-on: ubuntu-latest
    if: github.ref == 'refs/heads/main'
    steps:
      # Deploy to staging with 5% traffic
      - name: Deploy to staging (canary 5%)
        run: |
          railway up --environment staging
          # Route 5% traffic via load balancer
          
      # Run E2E tests against live staging
      - name: E2E tests against staging
        run: npm run test:e2e:staging
        
      # Monitor Sentry for 15 minutes
      - name: Monitor error rate
        run: scripts/monitor-sentry.sh 15m 5%
        
      # If all good, ramp to 10%
      - name: Ramp to 10% traffic
        if: success()
        run: railway config traffic --primary 90% --canary 10%
        
      # Final check before full rollout
      - name: Verify metrics
        run: scripts/verify-deployment-metrics.sh
        
      # Full deployment
      - name: Full deployment
        if: success()
        run: railway up --environment production
```

### Manual Deployment Steps

If using manual process:

```bash
# 1. Deploy to staging
git push origin main:staging  # Pushes main to staging branch

# Wait for CI/CD to build staging version

# 2. Verify staging deployment
curl -I https://staging.miprimerapp.com  # 200 OK
# Run smoke tests manually
# Check Sentry for errors

# 3. Create production release tag
node scripts/bump-version.js patch  # 0.1.0 → 0.1.1
npm run release:preflight
git push origin main
./scripts/tag-release.sh v0.1.1

# 4. Deploy to production
# In Railway or Vercel dashboard:
# 1. Select main branch
# 2. Trigger deploy
# 3. Monitor logs

# 5. Monitor for 30 min
# Check: Sentry, Rails logs, database slow queries
# Test critical flows manually

# 6. Mark as stable
echo "v0.1.1 deployed successfully" >> DEPLOYMENT_LOG.md
git commit -am "chore: mark v0.1.1 deployment complete"
```

## Rollback Procedures

### Automatic Rollback Triggers

```bash
# Monitor script checks these metrics every 60 seconds:
- Sentry error rate > 5% for 5 min
- Payment success rate < 95% for 5 min
- API response time (p99) > 2000ms
- Database connection pool exhaustion
- Pod/container crash loops
```

### Manual Rollback (if needed)

**Code Rollback:**
```bash
# 1. Identify previous stable version
git tag -l | grep "^v" | sort -V | tail -3  # Last 3 releases

# 2. Create rollback commit
git revert HEAD  # Reverts deployment commit
git push origin main

# 3. Tag as rollback
./scripts/tag-release.sh v0.1.0-rollback "Rolled back from v0.1.1"

# CI/CD auto-deploys rollback version
```

**Database Rollback:**
```bash
# 1. Identify which migrations caused issue
SELECT * FROM schema_migrations 
WHERE installed_on > NOW() - INTERVAL '1 hour'
ORDER BY installed_on DESC;

# 2. Run rollback scripts in reverse order
psql < supabase/rollbacks/down_20260424_120200.sql
psql < supabase/rollbacks/down_20260424_120100.sql

# 3. Verify data integrity
SELECT COUNT(*) FROM usuarios, reservas, favoritos;

# 4. Update deployment
git push origin main (with rollback marker)
```

**Feature Flag Rollback:**
```bash
# Disable problematic feature immediately (fastest rollback)
node scripts/admin-toggle-flag.js enableNewCheckout false

# Customers are unaffected
# Code remains in production but feature is off
# Buy time for proper fix
```

## Rollback Checklist

After executing rollback:

- [ ] Sentry error rate back to baseline (< 1%)
- [ ] Payment processing working (test transaction)
- [ ] All tables data integrity verified
- [ ] RLS policies re-enabled and working
- [ ] Users redirected to correct version
- [ ] Team notified via Slack
- [ ] Incident documented (postmortem)
- [ ] Root cause identified
- [ ] Fix tested before re-deploy

## Performance Baselines

Track these metrics to detect regressions:

| Metric | Baseline | Alert Threshold |
|--------|----------|-----------------|
| API response time (p95) | 200ms | 500ms |
| API response time (p99) | 500ms | 1500ms |
| Sentry error rate | < 1% | 5% |
| Payment success rate | > 99% | 95% |
| DB query time (p95) | 20ms | 100ms |
| Page load time | 2s | 5s |
| Web bundle size | 450KB | 500KB |

## Monitoring Tools

### Sentry Integration

```bash
# Check error trends
curl -s \
  -H "Authorization: Bearer $SENTRY_AUTH_TOKEN" \
  https://sentry.io/api/0/organizations/eder-vg/stats/ \
  | jq '.[]'  # Recent error counts
```

### Railway Deployment Logs

```bash
# View deployment logs
railway logs --deployment <deployment-id>

# Stream live logs
railway logs --follow
```

### Database Monitoring

```sql
-- Check slow queries
SELECT query, calls, mean_time
FROM pg_stat_statements
WHERE mean_time > 100
ORDER BY mean_time DESC;

-- Check table sizes
SELECT tablename, pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename))
FROM pg_tables
WHERE schemaname = 'public'
ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC;
```

## Communication Protocol

**Before Deployment:**
- Notify team: Slack `#deployments` channel
- Message template: "Deploying v0.1.1 to staging at 14:00 UTC"

**During Deployment:**
- Update status every 5 min
- "5% traffic routed, monitoring..."
- "Ramping to 10%..."
- "Full deployment live"

**After Deployment:**
- "v0.1.1 deployed successfully ✅"
- Link to release notes
- Link to monitoring dashboard

**If Rollback Needed:**
- "Rolling back v0.1.1 due to [reason]"
- Activate incident response
- Create incident postmortem within 24h

## Deployment Frequency

- **Current**: On-demand (git push to main triggers deploy)
- **Recommended**: 1-2x per week for stability
- **Future**: Daily deployments once canary is fully automated

## Checklist for Each Release

- [ ] Version bumped and tagged
- [ ] CHANGELOG.md updated
- [ ] Database migrations tested in staging
- [ ] All tests passing (unit, E2E, security)
- [ ] Code reviewed and approved
- [ ] Feature flags set correctly
- [ ] Deployment plan documented
- [ ] Team notified
- [ ] Monitoring set up
- [ ] Rollback plan ready
- [ ] Deploy to canary
- [ ] Monitor for 15 min
- [ ] Deploy to production
- [ ] Monitor for 30 min
- [ ] Mark as stable
- [ ] Postmortem (if issues) or celebrate success

## References

- [Canary Deployments](https://en.wikipedia.org/wiki/Canary_deployment)
- [Blue-Green Deployments](https://en.wikipedia.org/wiki/Blue-green_deployment)
- [Railway Deployments](https://docs.railway.app/deploy/)
- [Vercel Deployments](https://vercel.com/docs/deployments/overview)
