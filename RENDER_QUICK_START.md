# 🎯 Render Deployment - Quick Reference

**Branch**: `production`  
**Status**: ✅ Ready to Deploy  
**Date**: November 19, 2025

---

## 📦 What Was Implemented

### ✅ Files Created/Modified

| File | Type | Purpose |
|------|------|---------|
| `render.yaml` | New | Render Blueprint config for automated deployment |
| `RENDER_DEPLOYMENT_GUIDE.md` | New | Comprehensive step-by-step deployment guide |
| `ring-and-wing-backend/.env.production.template` | New | Production environment variables template |
| `ring-and-wing-frontend/.env.production` | New | Frontend production configuration |
| `.gitignore` | Modified | Protect sensitive production env files |
| `ring-and-wing-backend/server.js` | Modified | CORS + Socket.IO support for Render URLs |
| `ring-and-wing-frontend/src/App.jsx` | Modified | Self-checkout-only route guard implementation |

### 🔧 Key Changes

#### 1. **Self-Checkout-Only Route Guard** (`App.jsx`)
```javascript
const IS_SELF_CHECKOUT_ONLY = import.meta.env.VITE_DEPLOYMENT_MODE === 'self_checkout_only';
```
- When `VITE_DEPLOYMENT_MODE=self_checkout_only`, only `/mobile` and `/self-checkout` routes are accessible
- All POS, Admin, Dashboard, Inventory routes are conditionally hidden
- Login attempts redirect to self-checkout
- ✅ Deployed version: Self-checkout only
- ✅ Local version: Full access (when env var is unset)

#### 2. **Backend CORS Configuration** (`server.js`)
```javascript
const allowedOrigins = [
  'http://localhost:3000',
  'http://localhost:5173',
  'http://localhost:5174',
  process.env.RENDER_FRONTEND_URL,    // NEW
  process.env.RENDER_BACKEND_URL,     // NEW
  process.env.FRONTEND_URL,
  undefined
].filter(Boolean);
```
- Added support for Render deployment URLs
- Updated both HTTP CORS and Socket.IO CORS
- Updated Content Security Policy for images

#### 3. **Render Blueprint** (`render.yaml`)
- **Backend Web Service**: Node.js/Express API + Socket.IO
  - Build: `cd ring-and-wing-backend && npm ci`
  - Start: `node --max-old-space-size=512 --expose-gc server.js`
  - Health check: `/api/health`
  - Plan: Free ($0/mo) or Starter ($7/mo recommended)
  
- **Frontend Static Site**: React SPA (Self-Checkout only)
  - Build: `cd ring-and-wing-frontend && npm ci && npm run build`
  - Publish: `ring-and-wing-frontend/dist`
  - Plan: Free ($0/mo, unlimited bandwidth)

---

## 🚀 Next Steps

### 1. Push to GitHub
```powershell
git push origin production
```

### 2. Set Up MongoDB Atlas (15 min)
- Create free M0 cluster at https://www.mongodb.com/cloud/atlas
- Create database user
- Whitelist all IPs (0.0.0.0/0)
- Get connection string

### 3. Deploy to Render (20 min)
1. Go to https://render.com
2. Sign up with GitHub
3. New → Connect `jroahs/Ring-Wing` repository
4. Select `production` branch
5. Render auto-detects `render.yaml`
6. Add environment variables (see guide)
7. Deploy!

### 4. Update Local Environment (2 min)
Edit `ring-and-wing-frontend/.env`:
```env
# Change from:
VITE_API_URL=http://localhost:5000

# To (your actual Render backend URL):
VITE_API_URL=https://ring-wing-backend.onrender.com
```
**Do NOT add `VITE_DEPLOYMENT_MODE` locally** - keep full access

---

## 📝 Environment Variables Needed

### Backend Service (Render Dashboard)
```env
NODE_ENV=production
PORT=10000
MONGO_URI=mongodb+srv://username:password@cluster.mongodb.net/ring-and-wing
JWT_SECRET=<generate with: node -e "console.log(require('crypto').randomBytes(32).toString('hex'))">
PAYMONGO_SECRET_KEY=sk_test_xxxxx (or sk_live_xxxxx)
PAYMONGO_PUBLIC_KEY=pk_test_xxxxx (or pk_live_xxxxx)
PAYMONGO_WEBHOOK_SECRET=whsk_xxxxx
OPENROUTER_API_KEY=<optional>
GEMINI_API_KEY=<optional>
RENDER_FRONTEND_URL=https://ring-wing-self-checkout.onrender.com
RENDER_BACKEND_URL=https://ring-wing-backend.onrender.com
FRONTEND_URL=https://ring-wing-self-checkout.onrender.com
```

### Frontend Service (Render Dashboard)
```env
VITE_API_URL=https://ring-wing-backend.onrender.com
VITE_DEPLOYMENT_MODE=self_checkout_only
```

---

## 🔍 Testing Checklist

### Deployed Self-Checkout (Public)
- [ ] Visit `https://ring-wing-self-checkout.onrender.com`
- [ ] Redirects to `/self-checkout`
- [ ] Menu loads correctly
- [ ] Can add items to cart
- [ ] Checkout process works
- [ ] `/login`, `/pos`, `/dashboard` all redirect to `/self-checkout`

### Local POS/Admin (Private)
- [ ] Visit `http://localhost:5173`
- [ ] Can access login page
- [ ] Can log in with credentials
- [ ] POS system accessible at `/pos`
- [ ] Dashboard accessible at `/dashboard`
- [ ] Connects to production backend (new orders sync)

### Backend
- [ ] Health check: `https://ring-wing-backend.onrender.com/api/health` returns `{"status":"ok"}`
- [ ] No CORS errors in browser console
- [ ] Socket.IO connects successfully
- [ ] Database queries work (check Render logs)

---

## 💰 Cost Breakdown

| Service | Plan | Monthly Cost |
|---------|------|--------------|
| Render Backend | Free | $0 (750 hrs, sleeps after 15min) |
| Render Backend | Starter | $7 (always-on, recommended) |
| Render Frontend | Static | $0 (unlimited) |
| MongoDB Atlas | M0 Free | $0 (512MB) |
| PayMongo | Fees | ~3.5% per transaction |
| **Total** | | **$0-7/mo** + transaction fees |

**Recommendation**: Use Starter plan ($7/mo) for backend to prevent sleep mode and ensure webhook reliability.

---

## 📚 Resources

- **Full Guide**: `RENDER_DEPLOYMENT_GUIDE.md` (comprehensive 400+ line guide)
- **Render Docs**: https://render.com/docs
- **MongoDB Atlas**: https://www.mongodb.com/docs/atlas/
- **PayMongo API**: https://developers.paymongo.com/docs

---

## 🆘 Common Issues

### "Backend sleeps after 15 minutes"
**Solution**: Upgrade to Starter plan ($7/mo) or use keep-alive ping service

### "CORS errors in console"
**Solution**: Verify `RENDER_FRONTEND_URL` is set correctly in backend environment

### "Socket.IO won't connect"
**Solution**: Check both services are in same region, verify CORS config includes Render URLs

### "Frontend shows blank page"
**Solution**: Check `VITE_API_URL` points to correct backend URL, verify backend is running

---

## ✨ Features

### Self-Checkout Deployment
- ✅ Public customer-facing interface
- ✅ Menu browsing and ordering
- ✅ PayMongo payment integration
- ✅ Real-time order status via Socket.IO
- ✅ Responsive (mobile, tablet, desktop)
- ✅ Global CDN distribution (via Render Static Site)

### Local POS/Admin
- ✅ Full system access (POS, Dashboard, Inventory, etc.)
- ✅ Connects to same production backend
- ✅ Real-time sync with self-checkout orders
- ✅ Secure (not exposed to public)
- ✅ Zero latency (local instance)

---

**Status**: ✅ Ready for deployment  
**Next Action**: Follow `RENDER_DEPLOYMENT_GUIDE.md` → Section "Phase 3: Push to GitHub"

**Estimated Time to Deploy**: 45-60 minutes (including MongoDB setup)
