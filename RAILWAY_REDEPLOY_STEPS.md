# Railway Redeploy - Next Steps

## What Was Fixed ✅

Railway was treating the project as a Vite static site instead of using our Dockerfile. This caused the `vite: Permission denied` error.

**Solution:** Added explicit Railway configuration files to force Dockerfile build.

---

## Redeploy Instructions (2 minutes)

### Step 1: Open Railway Dashboard
1. Go to https://railway.app/dashboard
2. Select your "Ring-Wing" project
3. Find the deployment that failed

### Step 2: Trigger Redeploy
- Click the **"..." menu** (three dots) on your service
- Select **"Redeploy"**
- Or click **"Deploy"** tab → **"Redeploy"**

### Step 3: Monitor Build
- Go to **"Deploy"** tab
- Watch build progress (should take 5-10 minutes)
- Look for:
  - ✅ `Dockerfile detected`
  - ✅ `Building frontend...`
  - ✅ `Building backend...`
  - ✅ `Health check passed`

### Step 4: Verify Deployment
Once status shows **"Active"** (green):
1. Copy your Railway domain
2. Open in browser: `https://your-railway-domain.railway.app`
3. Should see login page (not 404 error)

---

## What Changed in Code

| File | Change | Why |
|------|--------|-----|
| `Dockerfile` | Fixed stage paths | Railway was confused about where to copy files |
| `railway.toml` | NEW | Explicitly tells Railway to use Dockerfile |
| `Procfile` | NEW | Backup process definition (standard format) |
| `.railwayignore` | NEW | Prevents Railway from auto-detecting Vite |

---

## If Build Fails Again

### Check Build Logs
1. Go to Railway Deploy tab
2. Scroll down to build logs
3. Look for the exact error message
4. Common issues:
   - `module not found` → Missing dependency (check package.json)
   - `permission denied` → Docker file permissions (shouldn't happen)
   - `cannot connect to MongoDB` → Set MONGO_URI variable

### Quick Fixes
**If you see "Cannot find package.json in ring-and-wing-frontend":**
- Ensure `ring-and-wing-frontend/package.json` exists locally
- Run: `git status` (should show clean)
- Run: `git push origin main` again

**If you see "socket permission denied":**
- Wait 30 seconds and retry rebuild
- Could be temporary Docker daemon issue

---

## Expected Build Output

```
Starting build for Dockerfile...
[Stage 1/2] Building frontend
- npm ci
- npm run build
- Vite successfully compiled

[Stage 2/2] Building backend
- npm ci
- Copying frontend dist
- Creating upload directories
- Health check configured

Build complete. Deploying...
Container started on port 5000
Health check: PASS ✅
Deployment: ACTIVE ✅
```

---

## Deployment Complete Checklist

After redeploy succeeds:

- [ ] Status shows "Active" (green)
- [ ] Browser shows login page (no 404)
- [ ] No CORS errors in console
- [ ] Socket.IO connecting (check console)
- [ ] Can log in with test account
- [ ] Can create a test order
- [ ] Real-time updates working

---

## Testing After Deploy

### Test 1: Frontend Loads
```bash
curl https://your-railway-domain.railway.app/
# Should return HTML (not 404)
```

### Test 2: API Health
```bash
curl https://your-railway-domain.railway.app/api/health
# Should return: {"status":"ok"}
```

### Test 3: In Browser
1. Visit domain
2. Open DevTools (F12)
3. Go to Console tab
4. Should see Socket.IO connection messages
5. Login and test POS features

---

## Estimated Timing

| Step | Time |
|------|------|
| Trigger redeploy | 1 min |
| Docker build | 5-10 min |
| Deploy & health check | 2-3 min |
| Manual verification | 3-5 min |
| **Total** | **~15 min** |

---

## Still Stuck?

1. **Check Railway logs** - Go to Deploy tab, scroll for error details
2. **Check MONGO_URI** - Make sure it's set in Variables tab
3. **Check PORT** - Should be 5000 (default)
4. **Try manual redeploy** - Sometimes helps clear cache

Or see `RAILWAY_BUILD_FIX.md` for detailed troubleshooting.

---

**Ready to redeploy? Go to your Railway Dashboard and click Redeploy! 🚀**
