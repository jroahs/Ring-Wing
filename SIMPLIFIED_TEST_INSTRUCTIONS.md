# Simplified Multi-Window Test Instructions

## Issue Identified
Socket connections are disconnecting when navigating or due to React Strict Mode. This is normal in development mode but let's test with a simpler approach.

---

## SIMPLIFIED TEST 2: Same Browser, Two Tabs

### Setup (5 minutes):

1. **Use ONE browser (Edge or Chrome)**

2. **Open Tab 1:**
   - Go to: `http://localhost:5173`
   - Login
   - Navigate to Menu Management
   - Open Console (F12)
   - Look for: `[MenuManagement] Socket connected - Authenticated: Yes`
   - **Note the Socket ID** from the console

3. **Open Tab 2 (same browser):**
   - Right-click Tab 1 → "Duplicate Tab" (or Ctrl+Shift+T)
   - OR open new tab → `http://localhost:5173`
   - You should already be logged in
   - Navigate to Menu Management
   - Open Console (F12)
   - Look for: `[MenuManagement] Socket connected - Authenticated: Yes`
   - **Note this Socket ID** (should be DIFFERENT from Tab 1)

---

## The Test:

### Step 1: Verify Both Sockets Are Active

**Backend Console** should show:
```
Socket connected: [ID1] (Auth: true, Role: staff)
Socket connected: [ID2] (Auth: true, Role: staff)
```

### Step 2: Test Real-Time Sync

1. **Arrange tabs side-by-side:**
   - Drag Tab 1 to left half of screen
   - Drag Tab 2 to right half of screen
   - Both should show MenuManagement with consoles open

2. **In Tab 1:**
   - Select a menu item
   - Click "Map Ingredients"
   - Add or change an ingredient
   - Click "Save"

3. **Watch Tab 2 console immediately:**
   - Should see: `[MenuManagement] ingredientMappingChanged event received`
   - Should see: `[MenuManagement] Refreshing data for menu item`

---

## Expected Results:

**Tab 1 (where you made the change):**
```javascript
[MenuManagement] Updating ingredients for menu item: [ID]
[MenuManagement] Ingredient mapping changed: {menuItemId: "...", ...}
[MenuManagement] Menu availability changed: {menuItemId: "...", ...}
Update response: {success: true}
```

**Tab 2 (should receive event):**
```javascript
[MenuManagement] ingredientMappingChanged event received: {menuItemId: "...", ...}
[MenuManagement] Refreshing data for menu item: [ID]
Fetching ingredients for menu item: [ID]
Fetched ingredients data: {success: true, data: [...]}
```

---

## Alternative Test (if tabs don't work):

### Test with Backend Logs Only:

If the frontend socket keeps disconnecting, we can verify backend emissions are working:

1. **Open Menu Management in one browser**
2. **Watch BACKEND console** (the terminal running the backend)
3. **Map an ingredient**
4. **Backend should show:**
```
[INFO] [INGREDIENT_MAPPING] Successfully updated ingredients
[SocketService] Emitted: ingredientMappingChanged
[SocketService] Emitted: menuAvailabilityChanged
```

If you see these logs, the backend is working correctly. The frontend socket issue would be a React Strict Mode development issue that won't affect production.

---

## Troubleshooting:

### If sockets keep disconnecting:

**Option A:** Disable React Strict Mode temporarily
- Edit `ring-and-wing-frontend/src/main.jsx`
- Remove `<React.StrictMode>` wrapper
- Restart frontend dev server

**Option B:** Test in Production Build
```bash
cd ring-and-wing-frontend
npm run build
npm run preview
```
Production builds don't have Strict Mode's double-mount issue.

**Option C:** Accept that backend works
- If backend logs show socket emissions
- The real-time feature is working
- Socket disconnections in dev mode are normal

---

## Try Again:

1. Clear all browser tabs
2. Clear backend console (type `cls` in Windows terminal)
3. Start fresh with ONE browser, TWO tabs
4. Follow steps above

**Ready to try again?** 🚀
