# Authentication Issues Runbook

**Severity**: High  
**On-Call**: Auth/Backend team  
**Estimated Resolution Time**: 20-45 minutes

## Quick Diagnosis

```bash
# Check Sentry for auth errors
# Filter: auth OR login OR session OR token

# Check Supabase auth status
supabase status

# Test auth manually
curl -X POST https://your-supabase.supabase.co/auth/v1/token \
  -H "apikey: $SUPABASE_ANON_KEY" \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"test123"}'
```

## Common Issues

| Issue | Symptoms | Root Cause |
|-------|----------|-----------|
| **Token Expired** | 401 errors on API calls | JWT expiration; no refresh happening |
| **Session Invalid** | Users logged out randomly | Session corrupted or Redis cleared |
| **Auth Service Down** | All logins fail | Supabase auth service issue |
| **RLS Blocking Access** | 403 errors | Row-level security policy denying access |
| **Email Unverified** | Can't access features | Email verification required but not sent |
| **Rate Limiting** | 429 errors on login attempts | Too many failed login attempts |

## Response Steps

### Step 1: Confirm Issue (3 min)

```bash
# 1. Check Supabase health
curl https://your-supabase.supabase.co/health

# 2. Check auth logs
SELECT * FROM auth.logs 
WHERE created_at > NOW() - interval '10 minutes'
ORDER BY created_at DESC
LIMIT 20;

# 3. Test auth locally
npm test -- --testNamePattern="auth"
```

### Step 2: Identify Specific Issue (5-10 min)

**If all users affected:**
- Check Supabase status page
- Check `EXPO_PUBLIC_SUPABASE_URL` and `EXPO_PUBLIC_SUPABASE_ANON_KEY`
- Verify JWT secret not changed recently

**If specific users affected:**
```sql
-- Check user session status
SELECT id, email, last_sign_in_at, email_confirmed_at 
FROM auth.users 
WHERE email = 'user@example.com';

-- Check for RLS issues
SELECT * FROM roles 
WHERE user_id = 'user-uuid'
ORDER BY created_at DESC;
```

**If token expiration issue:**
```typescript
// Check token refresh logic in lib/supabase.ts
// Verify refreshSession() is called on app resume
// Check SUPABASE_AUTH_REFRESH_INTERVAL
```

### Step 3: Mitigation

**For Expired Tokens:**
```typescript
// In lib/supabase.ts, force refresh
const { data, error } = await supabaseClient.auth.refreshSession();
if (error) logout();
```

**For RLS Blocking Access:**
```sql
-- Check RLS policies
SELECT * FROM pg_policies 
WHERE schemaname = 'public' 
  AND tablename = 'orders';

-- Temporarily disable RLS for debugging
ALTER POLICY "..." ON public.orders DISABLE;
-- Re-enable after investigation
```

**For Rate Limiting:**
```bash
# Check Supabase rate limit settings
# Default: 1000 auth requests per 10 seconds

# Temporarily increase limit if spike expected
# Contact Supabase support to adjust
```

### Step 4: Recovery

```bash
# 1. Clear cached auth state if corrupted
# App: Settings > Clear App Data

# 2. Force re-authentication
// In app: logout() then re-login

# 3. Verify sessions restored
SELECT COUNT(*) FROM auth.sessions 
WHERE created_at > NOW() - interval '5 minutes';
```

## Customer Communication

```
Subject: We're investigating login issues

We've detected that some users may be having trouble logging in.
Our team is working on a fix.

If you're affected, please try:
1. Clearing app cache and logging in again
2. Waiting 5 minutes and trying again

We'll have this fixed within 30 minutes.
```

## Post-Incident

- [ ] Document trigger event
- [ ] Review auth logs for patterns
- [ ] Test token refresh under load
- [ ] Update error boundaries in app

---

**Last Updated**: 2026-04-24  
**Version**: 1.0
