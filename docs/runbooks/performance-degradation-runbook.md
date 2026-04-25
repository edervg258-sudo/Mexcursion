# Performance Degradation Runbook

**Severity**: Medium  
**On-Call**: Performance/Backend team  
**Estimated Resolution Time**: 30-90 minutes

## Quick Diagnosis

```bash
# Check Sentry performance metrics
# https://sentry.io/ > Performance > Transactions

# Check Lighthouse CI results
# Latest main branch deployment

# Check database query performance
# Supabase Dashboard > Logs > Slow Queries

# Check web vitals
# Check: LCP, FID, CLS metrics
```

## Symptoms

- **Slow page loads** (>3s to first paint)
- **Laggy interactions** (>100ms response to user input)
- **Layout shifts** (visual instability)
- **High memory usage** (app crashes on low-memory devices)
- **Slow API responses** (>1s for typical request)
- **Network waterfall** (many sequential requests)

## Response Steps

### Step 1: Locate Performance Bottleneck (5 min)

```bash
# 1. Check Lighthouse score
# Latest deploy: Look at LCP, FID, CLS

# 2. Check server-side metrics
# Supabase: Logs > Filter by duration > Show slow queries

# 3. Check client-side metrics
# Browser DevTools > Performance tab > Record

# 4. Check specific endpoints
curl -w "@curl-format.txt" -o /dev/null -s https://your-domain.com/api/trips
```

### Step 2: Identify Root Cause

**If Largest Contentful Paint (LCP) Slow (>2.5s):**
```bash
# Usually: JavaScript, CSS, or images blocking render

# Check:
1. Bundle size: npm run analyze-bundle
2. Image optimization: Check image sizes in network tab
3. CSS delivery: Are critical styles inlined?
4. JavaScript execution: Any long tasks?

# Fix:
- Code split: Lazy load non-critical JavaScript
- Image optimization: Use WebP, compress images
- CSS optimization: Inline critical CSS, defer non-critical
- Remove unused dependencies: npm audit --production
```

**If First Input Delay (FID) Slow (>100ms):**
```bash
# Usually: JavaScript parsing/execution on main thread

# Check:
1. Long JavaScript tasks (>50ms)
2. Heavy computations in render paths
3. Unoptimized React renders

# Fix:
- Break up long tasks: Use setTimeout(..., 0)
- Optimize renders: React.memo, useMemo
- Move heavy work: Web Workers or background tasks
- Profile: DevTools > Performance > Record
```

**If Cumulative Layout Shift (CLS) High (>0.1):**
```bash
# Usually: Unsized images, late-loading ads/banners, dynamic content

# Check:
1. All images have width/height
2. No late-loading content shifts layout
3. Modals/popovers don't push content

# Fix:
- Add aspect-ratio or dimensions to images
- Reserve space for dynamic content
- Use transform: translate() instead of margin changes
```

**If API Slow (>1s):**
```sql
-- Check slow queries
SELECT query, mean_time, calls 
FROM pg_stat_statements 
ORDER BY mean_time DESC 
LIMIT 10;

-- Check for N+1 queries
SELECT count(*) FROM trips;  -- Should be 1 query
SELECT count(*) FROM trips t 
  JOIN users u ON t.user_id = u.id;  -- Should be 1, not N queries

-- Add missing indexes
CREATE INDEX idx_trips_user_id ON trips(user_id);
CREATE INDEX idx_bookings_trip_id ON bookings(trip_id);
ANALYZE;

-- Check for missing eager loading
-- Update Supabase client queries to use .select('*, relation(*)')
```

### Step 3: Implement Fix (15-45 min)

**Bundle Size Too Large:**
```bash
# Analyze current bundle
npm run build:web
node scripts/analyze-bundle.js

# Remove unused dependencies
npm list --depth=0
npm uninstall [unused-package]

# Code split routes
import { lazy } from 'react';
const DetailScreen = lazy(() => import('./DetailScreen'));

# Compress images
npx imagemin src/assets/**/*.png --out-dir=public/assets
```

**Slow Database Query:**
```sql
-- Example: Get trips with user details (N+1 problem)

-- ❌ Bad (N+1):
SELECT * FROM trips;  -- 1 query
-- Then in app: for each trip, SELECT * FROM users WHERE id = trip.user_id;  -- N queries

-- ✅ Good (Join):
SELECT t.*, u.name, u.avatar 
FROM trips t 
JOIN users u ON t.user_id = u.id;  -- 1 query

-- ✅ Better (Eager load in client):
const { data } = await supabase
  .from('trips')
  .select('*, users(name, avatar)');
```

**React Render Performance:**
```typescript
// ❌ Bad: Re-renders on every parent render
function TripList({ trips }) {
  return (
    <FlatList
      data={trips}
      renderItem={({ item }) => <TripCard trip={item} />}
    />
  );
}

// ✅ Good: Memoized component, stable key
const TripCard = React.memo(({ trip }: { trip: Trip }) => (
  <View>
    <Text>{trip.name}</Text>
  </View>
));

function TripList({ trips }) {
  return (
    <FlatList
      data={trips}
      renderItem={({ item }) => <TripCard trip={item} />}
      keyExtractor={(item) => item.id}
      removeClippedSubviews
      initialNumToRender={6}
      maxToRenderPerBatch={8}
    />
  );
}
```

### Step 4: Measure Improvement (5-10 min)

```bash
# 1. Re-run Lighthouse locally
npm run build:web
npx lighthouse https://localhost:3000 --view

# 2. Check bundle size reduced
node scripts/analyze-bundle.js

# 3. Profile in DevTools
# DevTools > Performance > Record > Load page > Stop

# 4. Monitor in production
# Wait 5 min for metrics to propagate
# Check: Sentry Performance Dashboard
# Check: Lighthouse CI latest results
```

### Step 5: Verify Fix Deployed

```bash
# 1. Deploy to staging
git push origin develop

# 2. Test on staging
curl -w "%{time_total}\n" -o /dev/null -s https://staging.mercursion.app/

# 3. Deploy to production
git push origin main

# 4. Monitor metrics
# Sentry: Performance > Transactions
# Check: LCP, FID, CLS improved
```

## Advanced Diagnostics

### Memory Profiling
```bash
# iOS
Xcode > Debug Navigator > Memory

# Android
Android Studio > Profiler > Memory

# Web (Chrome)
DevTools > Memory > Take heap snapshot > Compare
```

### Network Analysis
```bash
# Check waterfall
DevTools > Network tab > Filter by timing

# Check compression
# Should see: Content-Encoding: gzip

# Check caching
# Should see: Cache-Control headers
```

### Monitoring Setup

```typescript
// Add custom performance tracking
import { trackAsyncOperation } from './lib/performance';

// Track slow operations
await trackAsyncOperation('fetch_trips', async () => {
  return fetch('/api/trips');
}, 500);  // Warn if >500ms
```

## Prevention

### Performance Budget

```bash
# In Lighthouse CI config (lighthouserc.json)
"cumulative-layout-shift": ["error", { "maxNumericValue": 0.1 }],
"largest-contentful-paint": ["error", { "maxNumericValue": 2500 }],
"first-input-delay": ["error", { "maxNumericValue": 100 }],
```

### Monitoring

```bash
# Set up Sentry performance alerts
# Alerts > Create New > Performance Regression

# Set up real user monitoring
# Dashboard > Web Vitals > Set thresholds
```

## Communication

```
[#incidents] @oncall

⚠️ PERFORMANCE DEGRADATION DETECTED

Page load time increased from 1.5s → 3.2s
Largest Contentful Paint: 2.5s (target: <2.5s)

Investigating...
```

## Post-Incident

- [ ] Root cause analysis
- [ ] Add performance test to catch regression
- [ ] Update performance budget in Lighthouse CI
- [ ] Review code for similar issues
- [ ] Document solution for team

---

**Last Updated**: 2026-04-24  
**Version**: 1.0
