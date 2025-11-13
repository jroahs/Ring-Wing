# Railway Build Fix - Troubleshooting

## Issue Encountered
Railway was auto-detecting the project as a Vite static site (because it found `package.json` in `ring-and-wing-frontend/`) and trying to build it as a static site instead of using our Dockerfile.

**Error:** `vite: Permission denied` during `npm run build`

## Solution Applied

### 1. Added Configuration Files
- **`railway.toml`** - New config file (TOML format, Railway's newer standard)
  - Explicitly tells Railway to use Dockerfile builder
  - Sets start command and environment variables
  
- **`Procfile`** - Traditional Heroku-style process file
  - Backup configuration if railway.toml not recognized
  - Explicitly defines web process

- **`.railwayignore`** - Prevents Railway from analyzing unnecessary files
  - Excludes docs/, node_modules, .md files
  - Forces Railway to focus on root Dockerfile

### 2. Fixed Dockerfile
- Changed `npm install` to `npm ci` (cleaner install for production)
- Fixed working directory paths
- Changed health check from `wget` to `curl` (curl is standard in Alpine)
- Clarified stage names for better debugging

### 3. Key Changes
```dockerfile
# OLD (problematic)
WORKDIR /app/frontend                     # Wrong path
RUN npm install                           # Not locked

# NEW (correct)
WORKDIR /frontend-build                   # Clear temporary path
RUN npm ci                                # Uses package-lock.json
```

## How Railway Now Works

1. **Build Phase:**
   - Reads `railway.toml` (or `railway.json`)
   - Sees `builder = "dockerfile"`
   - Ignores files in `.railwayignore`
   - Builds using Dockerfile

2. **Build Process:**
   - Stage 1: Builds frontend (React + Vite) → dist/
   - Stage 2: Builds backend, copies frontend dist/
   - Result: Single ~400MB Docker image

3. **Deploy Phase:**
   - Runs: `node --max-old-space-size=512 --expose-gc server.js`
   - Server starts on port 5000
   - Serves both API and frontend UI

## Next Steps

1. **In Railway Dashboard:**
   - Click "Redeploy" on your project
   - Monitor build logs
   - Should now see Dockerfile build messages (not Vite errors)

2. **Expected Build Output:**
   ```
   ✓ [frontend-builder stage] Building React app
   ✓ [main stage] Installing backend deps
   ✓ [main stage] Copying frontend dist
   ✓ Health check configured
   ✓ Deployment complete
   ```

3. **Verify Deployment:**
   - Visit your Railway domain
   - Should see login page (no 404s)
   - Check browser console for Socket.IO connection
   - Test a POS action (order creation, etc.)

## If Build Still Fails

### Symptom: "Cannot find module"
**Cause:** Backend dependencies missing
**Fix:** Ensure `ring-and-wing-backend/node_modules` is not in git
```bash
git rm --cached ring-and-wing-backend/node_modules -r
echo "ring-and-wing-backend/node_modules" >> .gitignore
git commit -m "Remove node_modules from git"
git push origin main
```

### Symptom: "Permission denied" on vite/webpack
**Cause:** Railway trying to build frontend as main project
**Fix:** Already fixed - ensure `railway.toml` is at project root
```bash
cat railway.toml  # Should show: builder = "dockerfile"
```

### Symptom: Health check failing
**Cause:** Backend not starting or `/api/health` endpoint missing
**Fix:** Check backend logs in Railway:
```
Railway Dashboard → Logs tab
Search for "health" or "error"
```

## Configuration Files Now in Place

```
project-root/
├── Dockerfile                    ← Used for building
├── railway.json                  ← Backup config (JSON)
├── railway.toml                  ← Primary config (TOML)
├── Procfile                      ← Backup process definition
├── .railwayignore                ← ← Tell Railway to use Dockerfile
├── .dockerignore (both)          ← Optimize build
└── .env.example                  ← Environment template
```

## Cost Impact: NONE
All fixes are configuration-only. No cost changes.

## Timeline
- Push: ✅ Done
- Railway rebuild: 5-10 minutes
- Verification: 5 minutes
- Total time to fix: ~15 minutes

---

**Status:** Configuration fixed. Ready for Railway rebuild.

**Next action in Railway:** Click "Redeploy" on your project
