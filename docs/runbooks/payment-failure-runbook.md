# Payment Failure Incident Runbook

**Severity**: High  
**On-Call**: Payment/Backend team  
**Estimated Resolution Time**: 30 minutes - 2 hours

## Quick Diagnosis

```bash
# Check recent payment errors in Sentry
# https://sentry.io/organizations/mercursion/issues/?query=payment+failure

# Check MercadoPago API status
curl -s https://status.mercadopago.com/api/v2/components | jq '.data[] | select(.name | contains("API")) | .status'

# Check recent Edge Function logs
supabase functions list
supabase functions logs create-mercadopago-preference
```

## Severity Assessment

### Critical (Immediate Response)
- **Payment API down**: No payments processing for >5 minutes
- **All payment methods failing**: Every payment method fails
- **Webhook failures**: Payment confirmations not received for >10 minutes

### High (Urgent Response)
- **Specific payment method down**: One method (OXXO, SPEI, cards) failing
- **Intermittent failures**: 10-30% of payment attempts fail
- **Partial webhook failures**: Some webhook deliveries delayed/failing

### Medium (Normal Response)
- **Isolated failures**: <5% failure rate
- **Retryable errors**: Timeout errors that succeed on retry
- **User-specific issues**: Single user or payment method failing

---

## Response Steps

### Step 1: Confirm the Issue (2 min)

```bash
# 1a. Check Sentry for error patterns
# Filter: event.type:"transaction" AND level:"error" AND "mercadopago"

# 1b. Check MercadoPago API status
# Visit: https://status.mercadopago.com

# 1c. Check Supabase Edge Function logs
supabase functions logs create-mercadopago-preference --limit=50

# 1d. Manual test: Create a test payment
curl -X POST https://your-supabase.supabase.co/functions/v1/create-mercadopago-preference \
  -H "Authorization: Bearer $SUPABASE_ANON_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "trip_id": "test-123",
    "user_id": "test-user",
    "amount": 100
  }'
```

### Step 2: Identify Root Cause (5 min)

| Symptom | Likely Cause | Check |
|---------|-------------|-------|
| All payments fail | MercadoPago API down | Check status.mercadopago.com |
| Some payments fail | Rate limiting | Check Edge Function logs for 429 errors |
| Webhooks not arriving | Wrong webhook URL | Check MercadoPago dashboard > Webhooks |
| Wrong amount charged | Exchange rate issue | Check `MERCADOPAGO_CURRENCY_RATE` env var |
| Card payments only fail | Invalid card integration | Check MercadoPago App Credentials |
| OXXO payments only fail | OXXO service down | Contact MercadoPago support |

### Step 3: Immediate Mitigation (5-10 min)

**If MercadoPago API is Down:**
```bash
# 1. Disable payments temporarily
# Update feature flag or environment variable
supabase secrets set PAYMENTS_DISABLED=true

# 2. Queue payments for later processing
# Update database to mark orders as "pending_payment"

# 3. Notify affected users
# See: Customer Communication section
```

**If Webhooks Failing:**
```bash
# 1. Check webhook URL in MercadoPago dashboard
# Dashboard > App Credentials > Webhook Notification URL

# 2. Verify webhook is receiving requests
# Check Supabase logs for POST requests to webhook handler

# 3. Manual webhook retry
curl -X POST https://your-domain.com/api/webhooks/mercadopago \
  -H "Content-Type: application/json" \
  -d '{
    "id": "payment-id",
    "action": "payment.created",
    "data": { "id": "payment-id" }
  }'
```

**If Rate Limiting (429 Errors):**
```bash
# 1. Check current rate limit status
# MercadoPago: 600 requests/min per app

# 2. Implement exponential backoff in Edge Function
# Update: supabase/functions/create-mercadopago-preference/index.ts

# 3. Queue requests if approaching limit
# Use: Supabase pg_cron to spread requests
```

### Step 4: Restore Service (5-30 min)

**Scenario A: MercadoPago API Recovered**
```bash
# 1. Re-enable payments
supabase secrets set PAYMENTS_DISABLED=false

# 2. Reprocess pending payments
SELECT id, user_id, amount FROM orders 
WHERE payment_status = 'pending_payment' 
  AND created_at > NOW() - interval '1 hour'
LIMIT 100;

# 3. Manual retry for each order
# POST /api/retry-payment?order_id=xxx
```

**Scenario B: Webhook Fixed**
```bash
# 1. Confirm webhook receiving requests
tail -f supabase-functions.log | grep "webhook received"

# 2. Reprocess recent payments (last 30 min)
SELECT data FROM payment_webhooks 
WHERE created_at > NOW() - interval '30 minutes'
  AND processed = false;

# 3. Call webhook processor
# POST /api/webhooks/mercadopago with each payload
```

**Scenario C: Rate Limiting Resolved**
```bash
# 1. Verify Edge Function has backoff logic
# grep -A 10 "exponential backoff" supabase/functions/create-mercadopago-preference/index.ts

# 2. Test with load: generate 50 payments in quick succession
# Should succeed with exponential backoff

# 3. Monitor: Check MercadoPago rate limit headers
curl -I -X POST https://api.mercadopago.com/v1/preferences \
  -H "Authorization: Bearer $MERCADOPAGO_ACCESS_TOKEN"
```

---

## Recovery Verification (5 min)

```bash
# 1. Test successful payment creation
npm run test:e2e  # Should pass payment flow test

# 2. Monitor Sentry for new errors
# Should see no new "payment_failure" events

# 3. Check webhook processing
SELECT COUNT(*) FROM orders 
WHERE payment_status = 'completed' 
  AND updated_at > NOW() - interval '5 minutes';

# 4. Verify no customers in queue
SELECT COUNT(*) FROM orders 
WHERE payment_status IN ('pending_payment', 'failed')
  AND created_at > NOW() - interval '1 hour';
```

---

## Customer Communication

### During Outage
```
Subject: We're experiencing payment issues

We've detected a problem with payment processing. Our team is investigating.
Your booking will not be charged until this is resolved.

We'll update you within 30 minutes.
```

### After Resolution
```
Subject: Payment issue resolved

The payment issue has been fixed. If your payment failed earlier, you can:

1. Try booking again (same price reserved)
2. Click "Retry Payment" in your booking details

If you have questions, contact support@mercursion.com
```

---

## Escalation

| Time Elapsed | Action |
|------------|--------|
| 5 min | Alert on-call engineer if not already investigating |
| 15 min | Notify Payment team lead and CTO |
| 30 min | Contact MercadoPago enterprise support if API-related |
| 45 min | Post incident update to #incidents Slack channel |

---

## Post-Incident

### Root Cause Analysis (24 hours)
- [ ] Document the trigger event
- [ ] Identify contributing factors
- [ ] Create ADR or update documentation
- [ ] Schedule implementation of improvements

### Improvements to Consider
- Add circuit breaker pattern to MercadoPago API calls
- Implement payment retry scheduler
- Set up proactive MercadoPago API monitoring
- Add fallback payment methods
- Improve webhook redundancy (multiple endpoints)

### Notification
- [ ] Update team in post-incident review
- [ ] Communicate key learnings
- [ ] Update this runbook with new insights

---

## Helpful Links

- [MercadoPago API Docs](https://www.mercadopago.com.mx/developers/en/docs/payments/api)
- [MercadoPago Status](https://status.mercadopago.com)
- [Sentry: Payment Errors](https://sentry.io/)
- [Supabase: Edge Functions](https://supabase.com/docs/guides/functions)
- [MercadoPago Webhooks](https://www.mercadopago.com.mx/developers/en/docs/webhooks/manage)

---

**Last Updated**: 2026-04-24  
**Author**: DevOps Team  
**Version**: 1.0
