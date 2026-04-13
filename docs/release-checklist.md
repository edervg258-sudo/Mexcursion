# Release Checklist

## Preflight (must pass)
- `npm run release:preflight`
- `npm run build:e2e` (Android) and smoke E2E with `npm run test:e2e`
- Verify `.env.production` values in deployment platform
- Confirm Supabase migrations applied (`supabase/migration.sql`)

## Feature Flags
- Review current defaults in `lib/feature-flags.ts`
- If needed, set temporary overrides for staged rollout
- Keep risky features behind flags for first 24h after release

## Go/No-Go
- Crash-free sessions (Sentry) stable in last 24h
- Payment success rate normal (no spike in checkout errors)
- API error rate stable
- No critical accessibility regressions in booking flow

## Rollback Plan
1. Stop rollout by disabling risky feature flags.
2. Re-deploy previous successful build from CI artifact/tag.
3. Pause paid traffic campaigns.
4. Verify login, booking, payment, and confirmation flows.
5. Publish postmortem note with root cause and fix ETA.

## Post-Release (first 60 min)
- Monitor Sentry issues tagged `feature=payments` and `feature=analytics`
- Confirm reservations are being created and no duplicate folios
- Confirm analytics events are arriving in `analytics_eventos`
- Run one manual booking flow on low-end Android device

