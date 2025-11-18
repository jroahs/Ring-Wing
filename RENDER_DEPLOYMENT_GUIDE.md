# 🚀 Ring-Wing Self-Checkout Deployment Guide for Render

## Overview

This guide walks you through deploying **only the self-checkout component** of Ring-Wing to Render, while keeping POS and admin sections accessible only on your local laptop. Both will connect to the same production backend and database.

### Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                      RENDER CLOUD                            │
│                                                              │
│  ┌──────────────────────┐      ┌─────────────────────────┐ │
│  │  Backend Web Service │◄────►│ Frontend Static Site     │ │
│  │  (Node.js/Express)   │      │ (React - Self-Checkout)  │ │
│  │  - API endpoints     │      │ - Customer-facing only   │ │
│  │  - Socket.IO         │      │ - Public access          │ │
│  │  - Always-on ($7/mo) │      │ - Free tier ($0/mo)      │ │
│  └──────────┬───────────┘      └─────────────────────────┘ │
│             │                                                │
└─────────────┼────────────────────────────────────────────────┘
              │
              │ MongoDB Atlas (Cloud Database - Free)
              ▼
    ┌─────────────────────┐
    │   MongoDB Atlas      │
    │   M0 Free Tier       │
    │   512MB Storage      │
    └─────────────────────┘
              ▲
              │
┌─────────────┼────────────────────────────────────────────────┐
│             │             YOUR LAPTOP                         │
│  ┌──────────┴───────────┐                                    │
│  │  Local Frontend       │                                    │
│  │  (Full Access)        │                                    │
│  │  - POS System         │                                    │
│  │  - Admin Dashboard    │                                    │
│  │  - Inventory Mgmt     │                                    │
│  │  → Connects to Render Backend                             │
│  └──────────────────────┘                                    │
└────────────────────────────────────────────────────────────────┘
```

---

## 📋 Prerequisites

Before starting, ensure you have:

- [x] Git installed and configured
- [x] GitHub account with Ring-Wing repository access
- [x] Node.js 18+ installed locally
- [x] Current branch: `production` (created from `documentation-update`)
- [x] MongoDB data ready for migration (optional)

### Required Accounts (Free to create)

1. **Render** - https://render.com (Sign up with GitHub)
2. **MongoDB Atlas** - https://www.mongodb.com/cloud/atlas
3. **PayMongo** (if using payments) - https://dashboard.paymongo.com

---

## 🎯 Deployment Steps

### Phase 1: MongoDB Atlas Setup (15 minutes)

#### 1.1 Create MongoDB Atlas Cluster

1. Go to https://www.mongodb.com/cloud/atlas
2. Sign up or log in
3. Click **"Build a Database"**
4. Select **"M0 FREE"** tier
5. Choose provider: **AWS** (recommended) or **Google Cloud**
6. Choose region: **closest to your location** (e.g., Singapore for Asia)
7. Cluster Name: `ring-wing-cluster`
8. Click **"Create"**
9. Wait 3-5 minutes for cluster creation

#### 1.2 Create Database User

1. In Atlas, go to **"Database Access"** (left sidebar)
2. Click **"Add New Database User"**
3. Authentication Method: **Password**
4. Username: `ringwing_admin`
5. Password: **Generate** and **save securely** (or create strong password)
6. Database User Privileges: **Read and write to any database**
7. Click **"Add User"**

#### 1.3 Whitelist All IPs (for Render compatibility)

1. Go to **"Network Access"** (left sidebar)
2. Click **"Add IP Address"**
3. Select **"Allow Access from Anywhere"**
4. Confirm IP: `0.0.0.0/0`
5. Description: `Render Web Service`
6. Click **"Confirm"**

> ⚠️ **Security Note**: In production, you can restrict this to Render's specific IP ranges after deployment.

#### 1.4 Get Connection String

1. Go to **"Database"** (left sidebar)
2. Click **"Connect"** on your cluster
3. Choose **"Connect your application"**
4. Driver: **Node.js**, Version: **4.1 or later**
5. Copy the connection string (looks like this):
   ```
   mongodb+srv://ringwing_admin:<password>@ring-wing-cluster.xxxxx.mongodb.net/?retryWrites=true&w=majority
   ```
6. Replace `<password>` with your actual database user password
7. Add database name: Change `/?retryWrites` to `/ring-and-wing?retryWrites`
8. **Save this connection string** - you'll need it for Render

**Final format:**
```
mongodb+srv://ringwing_admin:YOUR_PASSWORD@ring-wing-cluster.xxxxx.mongodb.net/ring-and-wing?retryWrites=true&w=majority
```

#### 1.5 (Optional) Migrate Existing Data

If you have existing local MongoDB data:

```powershell
# Export from local MongoDB
cd C:\capstone\Ring-Wing
mongodump --uri="mongodb://admin:admin@localhost:27017/admin_db?authSource=admin" --out="./backup"

# Import to MongoDB Atlas
mongorestore --uri="mongodb+srv://ringwing_admin:YOUR_PASSWORD@ring-wing-cluster.xxxxx.mongodb.net/" --dir="./backup/admin_db" --nsFrom="admin_db.*" --nsTo="ring-and-wing.*"
```

> 💡 **Tip**: Test with a small dataset first before full migration.

---

### Phase 2: Generate Secrets (5 minutes)

#### 2.1 Generate JWT Secret

Open PowerShell and run:

```powershell
# Generate secure random string (64 characters)
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

Copy the output and save it as your `JWT_SECRET`.

Example output: `a7f8c9b2d1e3f4a5b6c7d8e9f0a1b2c3d4e5f6a7b8c9d0e1f2a3b4c5d6e7f8a9`

#### 2.2 Prepare PayMongo Keys

If using **test mode** (for development):
- Use your existing test keys from `.env`:
  - `PAYMONGO_SECRET_KEY=sk_test_xxxxx`
  - `PAYMONGO_PUBLIC_KEY=pk_test_xxxxx`
  - `PAYMONGO_WEBHOOK_SECRET=whsk_test_xxxxx`

If using **live mode** (for production):
1. Go to https://dashboard.paymongo.com/developers/api-keys
2. Copy **Live** keys:
   - Secret Key: `sk_live_xxxxx`
   - Public Key: `pk_live_xxxxx`
3. Go to Webhooks tab, create webhook (after backend deploys)

---

### Phase 3: Push to GitHub (2 minutes)

```powershell
cd C:\capstone\Ring-Wing

# Verify you're on production branch
git branch
# Should show: * production

# Stage all changes
git add .

# Commit with descriptive message
git commit -m "feat: configure Render deployment for self-checkout-only mode

- Add render.yaml Blueprint configuration
- Implement self-checkout-only route guard in App.jsx
- Update backend CORS for Render URLs
- Add production environment templates
- Update .gitignore for production files"

# Push to GitHub
git push origin production
```

---

### Phase 4: Deploy Backend to Render (15 minutes)

#### 4.1 Create Render Account

1. Go to https://render.com
2. Click **"Get Started"**
3. Sign up with **GitHub**
4. Authorize Render to access your GitHub repositories

#### 4.2 Create New Web Service

1. From Render Dashboard, click **"New +"** → **"Web Service"**
2. Connect Repository:
   - Find `jroahs/Ring-Wing` in the list
   - Click **"Connect"**
3. Configure Service:
   - **Name**: `ring-wing-backend`
   - **Region**: Same as MongoDB Atlas (e.g., `Oregon` or `Singapore`)
   - **Branch**: `production` ⚠️ **Important!**
   - **Root Directory**: Leave empty
   - **Environment**: `Node`
   - **Build Command**: `cd ring-and-wing-backend && npm ci`
   - **Start Command**: `cd ring-and-wing-backend && node --max-old-space-size=512 --expose-gc server.js`
   - **Plan**: Start with **Free** (or **Starter** for always-on $7/mo)

#### 4.3 Add Environment Variables

In the **Environment Variables** section, add these (click **"Add Environment Variable"** for each):

| Key | Value | Notes |
|-----|-------|-------|
| `NODE_ENV` | `production` | Required |
| `PORT` | `10000` | Render's default port |
| `MONGO_URI` | Your Atlas connection string | From Phase 1.4 |
| `JWT_SECRET` | Your generated secret | From Phase 2.1 |
| `PAYMONGO_SECRET_KEY` | `sk_test_xxxxx` or `sk_live_xxxxx` | Your PayMongo key |
| `PAYMONGO_PUBLIC_KEY` | `pk_test_xxxxx` or `pk_live_xxxxx` | Your PayMongo key |
| `PAYMONGO_WEBHOOK_SECRET` | `whsk_xxxxx` | Your PayMongo webhook secret |
| `OPENROUTER_API_KEY` | `your_key_or_skip` | Optional - for AI features |
| `GEMINI_API_KEY` | `your_key_or_skip` | Optional - for AI features |

> ℹ️ **Note**: We'll add `RENDER_FRONTEND_URL` and `RENDER_BACKEND_URL` after services are deployed.

#### 4.4 Deploy Backend

1. Click **"Create Web Service"**
2. Wait for build and deployment (5-10 minutes)
3. Monitor logs in the **"Logs"** tab
4. Look for success message: `Server running in production mode`
5. Copy your backend URL: `https://ring-wing-backend.onrender.com` (or similar)

#### 4.5 Test Backend Health

```powershell
# Test health endpoint
curl https://ring-wing-backend.onrender.com/api/health
```

Expected response:
```json
{"status":"ok"}
```

---

### Phase 5: Deploy Frontend to Render (10 minutes)

#### 5.1 Create Static Site

1. From Render Dashboard, click **"New +"** → **"Static Site"**
2. Connect to same repository: `jroahs/Ring-Wing`
3. Configure Static Site:
   - **Name**: `ring-wing-self-checkout`
   - **Branch**: `production` ⚠️ **Important!**
   - **Root Directory**: Leave empty
   - **Build Command**: `cd ring-and-wing-frontend && npm ci && npm run build`
   - **Publish Directory**: `ring-and-wing-frontend/dist`

#### 5.2 Add Environment Variables

| Key | Value | Notes |
|-----|-------|-------|
| `VITE_API_URL` | `https://ring-wing-backend.onrender.com` | Your backend URL from Phase 4.4 |
| `VITE_DEPLOYMENT_MODE` | `self_checkout_only` | Restricts routes |

#### 5.3 Deploy Frontend

1. Click **"Create Static Site"**
2. Wait for build (3-5 minutes)
3. Copy your frontend URL: `https://ring-wing-self-checkout.onrender.com`

#### 5.4 Test Self-Checkout

1. Open `https://ring-wing-self-checkout.onrender.com` in browser
2. Should redirect to `/self-checkout`
3. Verify menu loads
4. Try adding items to cart
5. Test checkout flow

---

### Phase 6: Update Cross-References (5 minutes)

#### 6.1 Update Backend Environment Variables

Go back to your backend service in Render:

1. Click on `ring-wing-backend` service
2. Go to **"Environment"** tab
3. Add/Update these variables:

| Key | Value |
|-----|-------|
| `FRONTEND_URL` | `https://ring-wing-self-checkout.onrender.com` |
| `RENDER_FRONTEND_URL` | `https://ring-wing-self-checkout.onrender.com` |
| `RENDER_BACKEND_URL` | `https://ring-wing-backend.onrender.com` |

4. Click **"Save Changes"**
5. Backend will automatically redeploy

#### 6.2 Configure PayMongo Webhook (if using payments)

1. Go to https://dashboard.paymongo.com/developers/webhooks
2. Click **"Add Webhook"**
3. Webhook URL: `https://ring-wing-backend.onrender.com/api/paymongo/webhook`
4. Select events:
   - `payment.paid`
   - `payment.failed`
   - `source.chargeable`
5. Copy the webhook secret
6. Update `PAYMONGO_WEBHOOK_SECRET` in Render backend environment

---

### Phase 7: Configure Local Environment (5 minutes)

#### 7.1 Update Local Frontend to Use Production Backend

Edit `ring-and-wing-frontend/.env`:

```env
# Change this line:
VITE_API_URL=http://localhost:5000

# To this (your actual Render backend URL):
VITE_API_URL=https://ring-wing-backend.onrender.com

# DO NOT add VITE_DEPLOYMENT_MODE - we want full access locally
```

#### 7.2 Test Local POS/Admin Access

```powershell
# Start local frontend
cd C:\capstone\Ring-Wing\ring-and-wing-frontend
npm run dev
```

1. Open http://localhost:5173 in browser
2. Login with your admin credentials
3. Verify POS system is accessible
4. Verify admin dashboard works
5. Verify it connects to production backend (check MongoDB Atlas for new data)

**What you should see:**
- ✅ Local frontend has **full access** (POS, Admin, Inventory, etc.)
- ✅ Deployed frontend has **only self-checkout**
- ✅ Both connect to the **same production backend and database**

---

## ✅ Verification Checklist

After deployment, verify all functionality:

### Deployed Self-Checkout (Public)
- [ ] `https://ring-wing-self-checkout.onrender.com` loads
- [ ] Automatically redirects to `/self-checkout`
- [ ] Menu items display correctly
- [ ] Can add items to cart
- [ ] Cart persists on page reload
- [ ] Can select order type (dine-in, takeout, delivery)
- [ ] Checkout process works
- [ ] Payment methods show correctly
- [ ] Can submit order successfully
- [ ] Order appears in MongoDB Atlas
- [ ] Accessing `/login` or `/pos` redirects to `/self-checkout`

### Local POS/Admin (Private)
- [ ] http://localhost:5173 loads with full navigation
- [ ] Can access `/login`, `/pos`, `/dashboard`, etc.
- [ ] Can log in with admin credentials
- [ ] POS system functional
- [ ] Orders appear in real-time from self-checkout
- [ ] Inventory updates reflect in both systems
- [ ] Socket.IO connects successfully

### Backend API
- [ ] Health check responds: `https://ring-wing-backend.onrender.com/api/health`
- [ ] No CORS errors in browser console
- [ ] Socket.IO connects from both frontend and local
- [ ] Database queries successful
- [ ] Logs show no critical errors

### PayMongo Integration (if enabled)
- [ ] Webhook receives payment events
- [ ] GCash/PayMaya checkout sessions create successfully
- [ ] Payment verification works
- [ ] Orders update status on payment completion

---

## 🐛 Troubleshooting

### Issue: Backend service sleeps (free tier)

**Symptom**: First request after 15 minutes takes 50 seconds.

**Solutions**:
1. Upgrade to Starter plan ($7/mo) for always-on service
2. Implement keep-alive ping (already configured in `render.yaml`)
3. Use external monitoring service (e.g., UptimeRobot) to ping `/api/health` every 14 minutes

### Issue: CORS errors in browser console

**Symptom**: `Access to fetch at '...' from origin '...' has been blocked by CORS policy`

**Solutions**:
1. Verify `RENDER_FRONTEND_URL` is set correctly in backend environment
2. Check backend logs for CORS warnings
3. Ensure both services are on the same Render region
4. Clear browser cache and hard reload (Ctrl+Shift+R)

### Issue: MongoDB connection timeout

**Symptom**: `MongoServerError: connection timed out`

**Solutions**:
1. Verify `MONGO_URI` is correct in Render environment
2. Check MongoDB Atlas Network Access allows `0.0.0.0/0`
3. Test connection string locally first
4. Verify database name is `ring-and-wing` in connection string

### Issue: Frontend build fails

**Symptom**: Build fails with `npm ci` or dependency errors

**Solutions**:
1. Check build logs for specific error
2. Verify `ring-and-wing-frontend/package.json` is committed
3. Try building locally first: `cd ring-and-wing-frontend && npm ci && npm run build`
4. Check Node.js version (should be 18+)

### Issue: PayMongo webhook not receiving events

**Symptom**: Payments complete but orders don't update

**Solutions**:
1. Backend on free tier sleeps - upgrade to Starter ($7/mo)
2. Verify webhook URL is correct: `https://YOUR_BACKEND.onrender.com/api/paymongo/webhook`
3. Check `PAYMONGO_WEBHOOK_SECRET` matches dashboard
4. Check Render logs for webhook requests
5. Test webhook manually with PayMongo dashboard

### Issue: Self-checkout shows blank page

**Symptom**: Deployed site loads but shows blank white page

**Solutions**:
1. Check browser console for errors
2. Verify `VITE_API_URL` points to backend URL
3. Check backend is running (visit `/api/health`)
4. Verify build completed successfully in Render logs
5. Check static site publish directory is correct: `ring-and-wing-frontend/dist`

### Issue: Local POS still restricted

**Symptom**: Local frontend only shows self-checkout

**Solutions**:
1. Verify `ring-and-wing-frontend/.env` does NOT have `VITE_DEPLOYMENT_MODE` set
2. Restart local dev server: Stop (Ctrl+C) and `npm run dev`
3. Clear browser cache and reload
4. Check `.env` file (not `.env.production`)

---

## 💰 Cost Breakdown

| Service | Plan | Cost | Notes |
|---------|------|------|-------|
| **Render Backend** | Free | $0/mo | Sleeps after 15min, 750 hours/mo |
| **Render Backend** | Starter | $7/mo | Always-on, recommended for webhooks |
| **Render Frontend** | Static Site | $0/mo | Unlimited bandwidth, global CDN |
| **MongoDB Atlas** | M0 Free | $0/mo | 512MB storage, shared CPU |
| **PayMongo** | Transaction | ~3.5% | Per successful payment |
| **Domain** (optional) | Custom | ~$12/yr | From Namecheap, Google Domains, etc. |

**Total**: $0-7/mo + transaction fees

**Recommended for production**: $7/mo (always-on backend) + transaction fees

---

## 🔒 Security Checklist

- [ ] MongoDB Atlas has strong password
- [ ] MongoDB Atlas Network Access restricted (or 0.0.0.0/0 monitored)
- [ ] JWT_SECRET is 64+ characters and randomly generated
- [ ] PayMongo keys are **live** (not test) for production
- [ ] Environment variables not exposed in logs
- [ ] `.env.production` files not committed to Git
- [ ] Render services set to private (not public GitHub repos)
- [ ] Regular security updates (`npm audit fix`)

---

## 📚 Additional Resources

- **Render Documentation**: https://render.com/docs
- **MongoDB Atlas Docs**: https://www.mongodb.com/docs/atlas/
- **PayMongo API Docs**: https://developers.paymongo.com/docs
- **Vite Environment Variables**: https://vitejs.dev/guide/env-and-mode.html
- **Socket.IO with Render**: https://render.com/docs/deploy-socketio

---

## 🆘 Support

If you encounter issues:

1. Check Render logs: Dashboard → Service → Logs
2. Check MongoDB Atlas logs: Atlas → Clusters → Metrics
3. Check browser console: F12 → Console tab
4. Review this guide's Troubleshooting section
5. Check Render community: https://community.render.com

---

## 🎉 Deployment Complete!

Your Ring-Wing self-checkout is now live and accessible to customers worldwide!

**Deployed Self-Checkout**: `https://ring-wing-self-checkout.onrender.com`

**Local POS/Admin**: `http://localhost:5173` (with full access)

**Both connect to the same production backend and database.**

---

## 📝 Next Steps

1. **Monitor Performance**: Check Render metrics for response times and errors
2. **Set Up Monitoring**: Use UptimeRobot or Pingdom to monitor uptime
3. **Configure Custom Domain** (optional): Add custom domain in Render dashboard
4. **Test Payment Flow**: Do end-to-end test with real payment (small amount)
5. **Train Staff**: Show staff how to access local POS for order management
6. **Customer Testing**: Have beta customers test self-checkout flow
7. **Analytics** (optional): Add Google Analytics to track usage

---

**Last Updated**: November 19, 2025
**Version**: 1.0.0
**Branch**: production
