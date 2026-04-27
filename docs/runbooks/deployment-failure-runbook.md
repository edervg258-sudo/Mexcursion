# Deployment Failure Runbook

**Severity**: Critical  
**On-Call**: DevOps/Backend team  
**Estimated Resolution Time**: 15-60 minutes

## Quick Diagnosis

```bash
# Check GitHub Actions status
# https://github.com/edervg258/MiPrimerApp/actions

# Check Vercel deployment status
# https://vercel.com/edervg258/mercursion/deployments

# Check Railway deployment status
# https://railway.app/project/[PROJECT_ID]

# Check recent commits
git log --oneline -10

# Check CI/CD logs
# GitHub Actions > Latest run > Job logs
```

## Common Failures

| Stage | Issue | Root Cause |
|-------|-------|-----------|
| **Test** | Tests fail | Code breaking tests; missing dependency |
| **Build** | Build fails | TypeScript errors; missing assets; Expo export issue |
| **Deploy (Vercel)** | Deploy fails | Invalid environment variables; build output missing |
| **Deploy (Railway)** | Deploy fails | Dockerfile issue; port mismatch; health check failing |

## Response Steps

### Step 1: Identify Failure Stage (2 min)

```bash
# Check GitHub Actions run
# Look at which job failed: test, build, deploy-staging, deploy, or e2e

# If test failed:
npm test -- --testNamePattern="failing-test"

# If build failed:
npx expo export --platform web --clear

# If deploy failed:
# Check Vercel/Railway logs in their dashboards
```

### Step 2: Fix the Issue (10-30 min)

**Test Failures:**
```bash
# Run tests locally
npm test -- --coverage

# Fix failing tests
# Update snapshots if intentional
npm test -- -u

# Commit and push
git add lib/
git commit -m "fix: update tests for new behavior"
git push origin feature/my-feature
```

**Build Failures - TypeScript Errors:**
```bash
# Check TypeScript compilation
npx tsc --noEmit

# Fix types
# grep error message in code and fix

# Verify with full build
npm run build:web
```

**Build Failures - Missing Exports:**
```bash
# Check dist/ directory structure
ls -la dist/

# Verify Expo export completed
# Look for index.html, assets/, etc.

# Manual fix
npx expo export --platform web --clear --dump-sourcemap
```

**Vercel Deploy Failure:**
```bash
# Check environment variables in Vercel dashboard
# Settings > Environment Variables

# Verify all required vars are set:
# - EXPO_PUBLIC_SUPABASE_URL
# - EXPO_PUBLIC_SUPABASE_ANON_KEY
# - EXPO_PUBLIC_SENTRY_DSN
# etc.

# Trigger manual deploy from dashboard
# Deployments > Redeploy
```

**Railway Deploy Failure:**
```bash
# Check Railway logs
# Deployments > [Deployment] > Logs

# Common issues:
# 1. Port mismatch (app listening on 3000, Railway expects 8080)
# 2. Dockerfile invalid
# 3. Health check failing

# Fix and push to trigger redeploy
git push origin main
```

### Step 3: Verify Fix (5 min)

```bash
# 1. Run full CI pipeline locally
npm run release:preflight

# 2. Test affected features
# If payments: npm test -- --testNamePattern="payment"
# If auth: npm test -- --testNamePattern="auth"

# 3. Wait for CI to pass
# Check GitHub Actions > workflow status

# 4. Verify deployment
# Vercel: Check deployment is live
# Railway: Check app is running
curl https://your-domain.com/health
```

### Step 4: Rollback if Needed (5-10 min)

```bash
# If current deployment is broken and fix not ready:

# Option 1: Rollback to previous version
git revert HEAD
git push origin main
# CI will auto-deploy previous version

# Option 2: Use Vercel/Railway rollback button
# Vercel: Deployments > [Previous] > Promote
# Railway: Deployments > [Previous] > Redeploy

# Option 3: Disable problematic feature with flag
# Update environment variable or feature flag
supabase secrets set FEATURE_NEW_PAYMENT_FLOW=false
```

## Prevention

### Pre-deployment Checklist

- [ ] All tests pass: `npm test -- --watchAll=false`
- [ ] Linting passes: `npm run lint`
- [ ] TypeScript compiles: `npx tsc --noEmit`
- [ ] Full build succeeds: `npm run build:web`
- [ ] Environment variables set in Vercel/Railway
- [ ] No breaking changes to API
- [ ] Database migrations tested
- [ ] Monitoring/alerts ready

### Monitoring

```bash
# Check deployment status
curl https://your-domain.com/health

# Monitor errors
# Sentry Dashboard > Issues > Last 24h

# Monitor performance
# Lighthouse CI reports
# Check: LCP < 2.5s, CLS < 0.1, FID < 100ms
```

## Communication

**During Deployment Failure:**
```
[#incidents] @oncall

🚨 DEPLOYMENT FAILED

Deployment of main branch failed at [build/test/deploy] stage
Commit: [hash - commit message]
Status: Investigating

Next update in 5 minutes
```

**After Fix:**
```
[#incidents]

✅ DEPLOYMENT RECOVERED

Issue: [Brief description of root cause]
Fixed: [What was changed]
Verifying: Checking all systems normal

Status: Back to normal
Duration: X minutes downtime
```

## Escalation

- 5 min: Alert on-call if blocking production
- 15 min: Notify team lead
- 30 min: Escalate to CTO if unresolved
- 60 min: Consider rollback or hotfix from different branch

## Post-Incident

- [ ] Root cause analysis: What let this slip through CI?
- [ ] Add test or check to prevent recurrence
- [ ] Update deployment runbook if new failure type
- [ ] Review commit that broke deployment
- [ ] Update monitoring/alerting if needed

## Helpful Links

- [GitHub Actions Logs](https://github.com/edervg258/MiPrimerApp/actions)
- [Vercel Deployments](https://vercel.com/edervg258/mercursion/deployments)
- [Railway Dashboard](https://railway.app/)
- [Expo Export Docs](https://docs.expo.dev/build/setup/)

---

**Last Updated**: 2026-04-24  
**Version**: 1.0
