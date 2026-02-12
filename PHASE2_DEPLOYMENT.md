# Keepy Phase 2 Deployment Guide

## 🚀 Quick Deployment Checklist

### Pre-Deployment
- [x] Build successful (`npm run build`)
- [x] Migration file created
- [x] RBAC middleware implemented
- [x] Seed service updated
- [ ] Code committed to Git
- [ ] Environment variables ready

---

## Step 1: Commit Changes

```bash
git add .
git commit -m "feat: Phase 2 hybrid multi-tenant architecture

- Add SiteMember entity for N:M User-Site relationship
- Implement RBAC middleware (requireSiteAccess, requireSiteRole)
- Create migration system (preserves userId for compatibility)
- Add system_role for SuperAdmin access
- Maintain backward compatibility with existing controllers

BREAKING: None (Hybrid approach maintains all existing functionality)
NEW: Multi-tenant infrastructure ready for Phase 3"

git push origin main
```

---

## Step 2: Run Migration Locally (Optional Test)

**Test migration before deploying:**

```bash
# Set local DATABASE_URL
export DATABASE_URL="postgresql://user:pass@localhost:5432/keepy_test"

# Run migration
npm run migration:run

# Verify
npm run migration:show

# If needed, rollback
npm run migration:revert
```

**Expected Output:**
```
[MIGRATION] Multi-tenancy migration completed (Hybrid mode - userId preserved)
✅ 1 migration executed
```

---

## Step 3: Deploy to Render

### A. Trigger Deployment

1. Push to GitHub (done in Step 1)
2. Render auto-deploys on push
3. Monitor build logs

### B. Run Migration on Render

**Option 1: Via Render Shell**
```bash
# Open Render Dashboard → Shell
npm run migration:run
```

**Option 2: Add to Build Command (Automatic)**

Update `render.yaml`:
```yaml
buildCommand: npm ci && npm run build && npm run migration:run
```

> ⚠️ **Recommendation:** Use Option 1 for first deploy to monitor migration

---

## Step 4: Verify Deployment

### Health Check
```bash
curl https://keepy-api.onrender.com/health
```

**Expected:**
```json
{
  "status": "ok",
  "service": "Keepy Backend",
  "database": "connected",
  "timestamp": "2026-02-12T..."
}
```

### Check Logs

**Look for:**
```
[MIGRATION] Multi-tenancy migration completed (Hybrid mode - userId preserved)
[SEED] Admin account created (email: admin@keepy.com, password: tempAdmin123!)
[SEED] System role: superadmin (full access to all sites)
✅ Database connected successfully
   - Synchronize: DISABLED
   - SSL: ENABLED
```

### Database Verification

**Connect to Neon/Supabase and verify:**

```sql
-- Check system_role added
SELECT email, role, system_role FROM users;

-- Check site_members table created
SELECT COUNT(*) FROM site_members;

-- Verify migration
SELECT * FROM site_members WHERE role = 'owner';

-- Confirm userId preserved
SELECT id, site_name, "userId" FROM sites LIMIT 5;
```

---

## Step 5: Test Multi-Tenant Features

### Login as SuperAdmin
```bash
POST /api/auth/login
{
  "email": "admin@keepy.com",
  "password": "tempAdmin123!"
}
```

**Verify Response:**
```json
{
  "token": "...",
  "user": {
    "email": "admin@keepy.com",
    "role": "admin",
    "system_role": "superadmin"  // ✅ Should be present
  }
}
```

### Test RBAC Middleware

**Access any site (should work for superadmin):**
```bash
GET /api/sites/:siteId
Authorization: Bearer <token>
```

**Expected:** ✅ Access granted (superadmin bypasses checks)

---

## Environment Variables

### Required
```bash
NODE_ENV=production
DATABASE_URL=<neon-or-supabase-postgresql-url>
JWT_SECRET=<random-64-character-string>
```

### Optional
```bash
PORT=3000  # Auto-set by Render
```

### Removed
```bash
DB_SYNC=true  # ❌ No longer used (migrations handle schema)
```

---

## Rollback Plan

### If Migration Fails

**Option 1: Revert Migration**
```bash
npm run migration:revert
```

**Option 2: Restore Database Backup**
```sql
-- Neon/Supabase: Use point-in-time restore
-- Restore to timestamp before migration
```

**Option 3: Redeploy Previous Version**
```bash
git revert HEAD
git push origin main
```

---

## Troubleshooting

### Migration Already Run Error
```
QueryFailedError: relation "site_members" already exists
```

**Solution:** Migration already applied, skip to verification

### Missing system_role Column
```
column "system_role" does not exist
```

**Solution:** Run migration again
```bash
npm run migration:run
```

### Build Fails on Render
```
Cannot find module 'SiteMember'
```

**Solution:** Ensure all files committed
```bash
git status
git add src/models/SiteMember.ts
git commit -m "fix: add missing SiteMember entity"
git push
```

---

## Post-Deployment Tasks

### 1. Change Admin Password
```bash
POST /api/auth/change-password
Authorization: Bearer <admin-token>
{
  "currentPassword": "tempAdmin123!",
  "newPassword": "<strong-password>"
}
```

### 2. Monitor Logs
- Watch for errors
- Check database connection
- Verify migration success

### 3. Test Existing Features
- Site registration
- Spam detection
- User login
- Dashboard access

---

## Phase 3 Preparation

### Next Steps
1. ✅ Phase 2 deployed successfully
2. Monitor for 24-48 hours
3. Plan Phase 3 controller migration
4. Implement site member management UI
5. Remove `userId` column (final migration)

### Phase 3 Goals
- Migrate all controllers to use `members`
- Remove legacy `user` relationship
- Full multi-tenant API
- Site member management endpoints
- Invitation system

---

## Success Criteria

- [x] Build successful
- [x] Migration created
- [x] RBAC middleware ready
- [ ] Code committed
- [ ] Deployed to Render
- [ ] Migration executed
- [ ] Health check passing
- [ ] SuperAdmin role verified
- [ ] Existing features working

---

**Status:** Ready for Deployment  
**Risk Level:** Low (Hybrid approach, zero breaking changes)  
**Estimated Downtime:** None (migration runs during build)
