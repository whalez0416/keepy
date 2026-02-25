# Keepy Render Deployment Guide

## 🚀 Quick Deployment Steps

### 1. Setup Neon/Supabase PostgreSQL

1. Create account at [Neon](https://neon.tech) or [Supabase](https://supabase.com)
2. Create new PostgreSQL database
3. Copy the **DATABASE_URL** connection string
   - Format: `postgresql://user:password@host:5432/database?sslmode=require`

### 2. Deploy to Render

1. **Create Web Service**
   - Go to [Render Dashboard](https://dashboard.render.com)
   - Click "New +" → "Web Service"
   - Connect your GitHub/GitLab repository

2. **Configure Build Settings**
   - Render will auto-detect `render.yaml`
   - Verify:
     - Build Command: `npm ci && npm run build`
     - Start Command: `npm start`
     - Health Check Path: `/health`

3. **Add Environment Variables**
   ```bash
   NODE_ENV=production
   DATABASE_URL=<your-neon-or-supabase-url>
   DB_SYNC=true
   JWT_SECRET=<generate-random-64-char-string>
   ```

   **Generate JWT_SECRET:**
   ```bash
   # On Linux/Mac
   openssl rand -base64 64
   
   # On Windows PowerShell
   -join ((48..57) + (65..90) + (97..122) | Get-Random -Count 64 | % {[char]$_})
   ```

4. **Deploy**
   - Click "Create Web Service"
   - Wait for deployment (3-5 minutes)

### 3. Verify Deployment

**Health Check:**
```bash
curl https://keepy-api.onrender.com/health
```

Expected response:
```json
{"status":"ok","service":"Keepy Backend"}
```

**Check Logs:**
- Look for these startup messages:
  ```
  [STATIC] Serving static files from: /opt/render/project/src/public
  ✅ Database connected successfully
     - Type: PostgreSQL
     - Synchronize: ENABLED (⚠️ Pilot mode)
     - SSL: ENABLED
  🚀 Keepy server running on port 10000
  ```

---

## 📋 Environment Variables Reference

| Variable | Required | Default | Description |
|:---------|:---------|:--------|:------------|
| `NODE_ENV` | ✅ | - | Set to `production` |
| `DATABASE_URL` | ✅ | - | PostgreSQL connection string |
| `DB_SYNC` | ✅ | `false` | Set to `true` for pilot (auto-sync schema) |
| `JWT_SECRET` | ✅ | - | Random 64+ character string |
| `PORT` | ❌ | `3000` | Auto-injected by Render |
| `BRIDGE_TIMEOUT_MS` | ❌ | `5000` | Bridge API timeout |

---

## ✅ Post-Deployment Verification Checklist

### Automated Tests

- [ ] `GET /health` returns 200 OK
- [ ] `GET /login.html` loads successfully
- [ ] `GET /dashboard.html` loads successfully
- [ ] `GET /admin.html` loads successfully

### Authentication Flow

- [ ] Register new user via `/auth/register`
- [ ] Login via `/auth/login` returns JWT token
- [ ] Access protected endpoint with token succeeds

### Admin Access

- [ ] Login with admin credentials
- [ ] Access `/admin/stats` endpoint
- [ ] Verify admin-only data returned

### Bridge Connectivity

- [ ] Trigger onboarding for minhospital.co.kr
- [ ] Verify Ping step succeeds
- [ ] Verify Board Discovery returns tables

### Spam Detection

- [ ] Trigger manual scan
- [ ] Check MonitoringLog table for entries
- [ ] Verify spam detection logic executes

### RBAC Verification

- [ ] Test User role permissions
- [ ] Test Admin role permissions
- [ ] Verify `can_user_delete_spam` flag works

---

## 🔧 Troubleshooting

### "Server not responding"
- Check Render logs for PORT binding
- Verify `process.env.PORT` is used in code
- Ensure health check path is `/health`

### "HTML files 404"
- Check `[STATIC]` log shows correct path
- Verify `public/` directory exists in deployment
- Check `dist/` structure includes `public/` at root level

### "Database connection failed"
- Verify DATABASE_URL format
- Check SSL is enabled (`NODE_ENV=production`)
- Test connection from Render shell: `psql $DATABASE_URL`

### "JWT errors"
- Verify JWT_SECRET is set
- Check secret is at least 32 characters
- Ensure no spaces or special characters in env var

---

## 🎯 Production Transition Plan

**Current State: Pilot (DB_SYNC=true)**

After pilot stabilization:

1. **Disable Auto-Sync**
   - Set `DB_SYNC=false` in Render dashboard
   - Redeploy

2. **Implement Migrations** (Phase 2)
   - Create migration scripts
   - Update `render.yaml` build command
   - Test migration process

3. **Monitor**
   - Check logs for schema changes
   - Verify no data loss
   - Test all critical paths

---

## 📞 Support

For deployment issues:
1. Check Render logs
2. Verify environment variables
3. Test health endpoint
4. Review database connection

**Deployment URL:** `https://keepy-pqfo.onrender.com`
