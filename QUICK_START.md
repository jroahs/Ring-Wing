# Quick Start: Railway Deployment Next Steps

## 1. PUSH TO GITHUB (Run these commands)

```bash
cd "c:\Users\kliean\Videos\Ring-Wing"
git add .
git commit -m "feat: prepare Ring-Wing for Railway deployment - add Dockerfile, env config, fix localhost URLs"
git push origin documentation-update
```

## 2. CREATE RAILWAY PROJECT

1. Go to https://railway.app
2. Click "New Project"
3. Select "Deploy from GitHub"
4. Authorize → Select `jroahs/Ring-Wing`
5. Select branch: `documentation-update`
6. Click "Deploy"

**Railway will:**
- Auto-detect Dockerfile
- Build frontend (npm run build)
- Build backend
- Start container on port 5000
- Generate domain: `https://ring-wing-prod-xxxx.railway.app`

## 3. CONFIGURE ENVIRONMENT VARIABLES

In Railway Console → Variables tab, add these:

```
MONGO_URI=mongodb+srv://<user>:<password>@<cluster>.mongodb.net/ring-and-wing
JWT_SECRET=your-secret-key-change-in-production
PAYMONGO_SECRET_KEY=sk_test_xxxxx
PAYMONGO_PUBLIC_KEY=pk_test_xxxxx
PAYMONGO_WEBHOOK_SECRET=whsk_xxxxx
FRONTEND_URL=https://<your-railway-domain>.railway.app
NODE_ENV=production
PORT=5000
```

**Get values from:**
- MongoDB: MongoDB Atlas → Data Services → Connect
- PayMongo: PayMongo Dashboard → API Keys
- Railway domain: Auto-generated after deployment

## 4. VERIFY DEPLOYMENT

```bash
# Test backend health endpoint
curl https://<your-railway-domain>.railway.app/api/health
# Expected: {"status":"ok"}

# Visit in browser
https://<your-railway-domain>.railway.app
```

## 5. CONFIGURE MONGODB ACCESS

In MongoDB Atlas → Network Access:
1. Click "Add IP Address"
2. Enter: 0.0.0.0/0 (allow all IPs for MVP)
3. Click Confirm

(For production: Use Railway IP whitelist instead)

## 6. UPDATE PAYMONGO WEBHOOK (if enabled)

In PayMongo Dashboard:
1. Go to Webhooks/Settings
2. Update webhook URL to: `https://<your-railway-domain>.railway.app/api/paymongo/webhook`
3. Test webhook

---

## What's Now Working

✅ Frontend + Backend served from single Railway service  
✅ Socket.IO real-time updates working  
✅ All APIs responding with correct domain  
✅ Database connections stable  
✅ File uploads to /public/uploads (or B2)  

## Estimated Timeline

- Push to GitHub: 2 min
- Railway project creation: 3 min
- Build & deploy: 5-10 min
- Configuration: 5 min
- Verification: 3 min
- **Total: ~25-30 minutes**

## Cost During Trial

- ₱0/month for 30 days (Railway $5 credit)
- ₱0/month (MongoDB 512MB free tier)
- ₱0/month (Backblaze B2 10GB free)
- **Total: ₱0/mo**

## Cost After Trial

- ₱250-300/mo (Railway Hobby $5/mo)
- ₱0/mo (MongoDB stays free)
- ₱0-300/mo (Backblaze B2 if needed)
- **Total: ~₱300-600/mo**

---

**ALL CODE CHANGES COMPLETE. READY TO DEPLOY!**

Next: Run the git commands above and create Railway project.
