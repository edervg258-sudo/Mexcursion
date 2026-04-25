# Railway.toml Deployment Configuration

This document explains the `railway.toml` file used to configure Mercursión deployments on Railway.

## Overview

Railway uses `railway.toml` to define build and deployment settings. For Mercursión, we use:
- **Builder**: Dockerfile (multi-stage build)
- **Internal Port**: 8080 (where the app listens)
- **Health Check**: GET / with 60-second timeout
- **Restart Policy**: ON_FAILURE (max 10 retries)

## Configuration Breakdown

### `[build]` Section

```toml
[build]
builder = "DOCKERFILE"
dockerfilePath = "Dockerfile"
```

- **builder**: Use Dockerfile (not Heroku buildpack)
- **dockerfilePath**: Path to the Dockerfile relative to project root

**What it does:**
1. Reads `Dockerfile` in project root
2. Executes multi-stage build:
   - **Stage 1 (builder)**: Node 20 Alpine → compile Expo app → generates `dist/`
   - **Stage 2 (final)**: nginx:alpine → serves `dist/` on port 8080

### `[deploy]` Section

```toml
[deploy]
restartPolicyType = "ON_FAILURE"
restartPolicyMaxRetries = 10
healthcheckPath = "/"
healthcheckTimeout = 60
```

**Parameters:**

| Parameter | Value | Purpose |
|-----------|-------|---------|
| `restartPolicyType` | `ON_FAILURE` | Restart container only if it exits with error (not 0) |
| `restartPolicyMaxRetries` | `10` | Max 10 restart attempts before giving up |
| `healthcheckPath` | `/` | Check health at root URL (GET /) |
| `healthcheckTimeout` | `60` | Wait max 60 seconds for health check response |

**What it does:**
- Monitors container health by hitting GET /
- If app crashes or becomes unresponsive, Railway restarts it
- After 10 failed restarts, Railway alerts you (doesn't restart anymore)

### `[[services]]` Section

```toml
[[services]]
internalPort = 8080
```

**Parameters:**

| Parameter | Value | Purpose |
|-----------|-------|---------|
| `internalPort` | `8080` | Port inside container where app listens |

**Note**: Railway automatically assigns external URL (e.g., `mercursion.up.railway.app`)

## Dockerfile Reference

The Dockerfile implements a multi-stage build:

```dockerfile
# Stage 1: Build app
FROM node:20-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci --ignore-scripts
COPY . .
RUN npx expo export --platform web

# Stage 2: Serve with nginx
FROM nginx:alpine
COPY --from=builder /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf
EXPOSE 8080
CMD ["nginx", "-g", "daemon off;"]
```

**Build process:**
1. Install dependencies (npm ci --ignore-scripts)
2. Expo export compiles React Native → web (outputs to `dist/`)
3. Nginx serves `dist/` on port 8080

## Environment Variables

Railway reads environment variables from:
1. **Railway Dashboard** > Settings > Environment Variables
2. **`.env.production`** (if committed - NOT RECOMMENDED)

**Required variables for Mercursión:**

```bash
EXPO_PUBLIC_SUPABASE_URL=https://your-supabase.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
EXPO_PUBLIC_SENTRY_DSN=https://sentry-dsn
EXPO_PUBLIC_GOOGLE_MAPS_API_KEY=your-maps-key
# ... others from .env.production
```

**Best practice**: Set in Railway Dashboard, NOT in version control.

## Deployment Flow

```
1. Push to main branch
   ↓
2. GitHub Actions CI/CD runs
   ├─ Test job
   ├─ Build job
   └─ Deploy job (triggers Railway)
   ↓
3. Railway receives webhook
   ↓
4. Railway clones repo
   ↓
5. Railway runs: docker build -f Dockerfile .
   ├─ Stage 1: Node build (npm ci, expo export)
   └─ Stage 2: Nginx image with dist/
   ↓
6. Railway starts container on port 8080
   ↓
7. Health check: GET / → 200 OK
   ↓
8. Traffic routed to new container
   ↓
9. Old container stopped
```

## Health Check Details

```toml
healthcheckPath = "/"
healthcheckTimeout = 60
```

**What Railway does:**
- After container starts, pings `GET http://localhost:8080/`
- Waits max 60 seconds for 200-ish response
- If successful: declares container healthy
- If timeout/failure: retries up to 10 times
- If still failing: alerts ops team

**For Mercursión:**
- Nginx automatically serves `index.html` for GET /
- Returns 200 OK immediately
- Health check always passes (unless disk full/nginx crashes)

## Scaling Configuration

Railway scales automatically based on:
1. **Memory**: Default 512MB (usually enough for nginx + static files)
2. **CPU**: Shared by default (suitable for web serving)
3. **Instances**: 1 instance by default

**If you need to scale:**
- Open Railway Dashboard > Resources
- Increase Memory or CPU if needed
- Add multiple instances if traffic spikes

## Monitoring & Logs

**View logs:**
```bash
# Via Railway Dashboard
# Deployments > [Latest] > Logs tab

# Or via Railway CLI
railway logs
```

**Check deployment status:**
- Railway Dashboard > Deployments
- Shows: Build time, deploy time, status
- Green = healthy, Red = crashed

**Common log errors:**
- `nginx: command not found` → Docker build failed
- `ENOENT dist/index.html` → Expo export didn't complete
- `listen EADDRINUSE` → Port 8080 already in use

## Troubleshooting

### Deployment Fails
```bash
# 1. Check build logs
# Railway Dashboard > [Failed Deployment] > Logs

# 2. Common causes:
# - Dockerfile syntax error: npx dockerlint Dockerfile
# - Missing dependencies: npm ci locally
# - Large bundle: node scripts/analyze-bundle.js

# 3. Re-trigger deployment
# Push new commit: git commit --allow-empty -m "redeploy"
```

### App Crashes After Deploy
```bash
# Check health check logs
railway logs | grep health

# Verify app listens on 8080
# In Dockerfile, check EXPOSE 8080

# Test locally:
docker build -f Dockerfile -t mercursion .
docker run -p 8080:8080 mercursion
curl http://localhost:8080/
```

### Slow Deployments
```bash
# 1. Check build time
# Railway Dashboard > Deployment > Duration

# Typical: 2-3 min (npm ci + expo export)
# If >5 min: Check for large dependencies or network issues

# 2. Optimize:
# - Use npm ci (cached) instead of npm install
# - Remove unused dependencies
# - Parallel builds if multi-service
```

## Configuration Variations

### Staging Deployment

If deploying `develop` branch to staging Railway service:

```toml
# railway.toml (same for both)
[build]
builder = "DOCKERFILE"

[deploy]
healthcheckPath = "/"
```

**Deploy job uses different Railway token:**
```yaml
# .github/workflows/ci-cd.yml
- uses: amondnet/vercel-action@v25
  with:
    vercel-token: ${{ secrets.RAILWAY_STAGING_TOKEN }}
```

### Custom nginx.conf

If you need custom routing:

```nginx
server {
  listen 8080;
  location / {
    try_files $uri $uri/ /index.html;
  }
}
```

Railway uses this to serve SPA (all routes → index.html).

## Related Documentation

- [Dockerfile](../Dockerfile) - Build configuration
- [nginx.conf](../nginx.conf) - Web server configuration
- [.github/workflows/ci-cd.yml](../.github/workflows/ci-cd.yml) - GitHub Actions deployment
- [Railway Docs](https://docs.railway.app/)

## Support

**Issues with deployment?**
1. Check Railway status: https://status.railway.app
2. Review this guide and troubleshooting section
3. Check GitHub Actions logs for CI/CD errors
4. Contact Railway support with deployment ID

---

**Last Updated**: 2026-04-24  
**Version**: 1.0
