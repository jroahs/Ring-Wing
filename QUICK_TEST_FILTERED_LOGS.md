# Quick Test - See Socket Emissions Clearly

## Problem:
Cost analysis is flooding the backend logs, making it impossible to see socket emission logs.

## Quick Solution:

### Option 1: Filter Backend Logs (Recommended)

In your backend terminal, run the backend with filtered logging:

**Windows PowerShell:**
```powershell
cd ring-and-wing-backend
node server.js | Select-String -Pattern "SocketService|INGREDIENT_MAPPING" -Context 0,2
```

**OR use findstr (if Select-String doesn't work):**
```powershell
cd ring-and-wing-backend
node server.js 2>&1 | findstr /i "SocketService INGREDIENT_MAPPING"
```

This will ONLY show lines containing "SocketService" or "INGREDIENT_MAPPING".

---

### Option 2: Quick Frontend Fix

We can comment out the cost analysis polling temporarily just for testing:

1. Open `ring-and-wing-frontend/src/MenuManagement.jsx`

2. Find lines 620-640 (the useEffect with `fetchCostAnalysis`)

3. Comment out the fetchCostAnalysis calls:

```javascript
useEffect(() => {
  if (currentFormItem && currentFormItem._id) {
    fetchMenuItemIngredients(currentFormItem._id);
    // fetchCostAnalysis(currentFormItem._id); // 🔥 TEMP: Disabled for testing
    checkMenuItemAvailability(currentFormItem._id);
  } else if (selectedItem && selectedItem._id && !currentFormItem) {
    fetchMenuItemIngredients(selectedItem._id);
    // fetchCostAnalysis(selectedItem._id); // 🔥 TEMP: Disabled for testing
    checkMenuItemAvailability(selectedItem._id);
  } else {
    setSelectedIngredients([]);
  }
}, [currentFormItem, selectedItem]);
```

4. Save and let the frontend hot-reload

---

### Option 3: Just Look for the Key Line

When you map an ingredient, just scroll through the backend terminal and look for **ONLY** this line:

```
[SocketService] Emitted: ingredientMappingChanged
```

If you see that line anywhere after you save an ingredient, **THE SYSTEM WORKS!** ✅

---

## Recommended Approach:

**Use Option 1** (filtered logging) - it's the cleanest:

```powershell
cd ring-and-wing-backend
node server.js 2>&1 | findstr /i "SocketService"
```

Then:
1. Restart your backend with this filtered command
2. Map an ingredient in MenuManagement
3. You'll ONLY see socket-related logs

---

**Which option do you want to try?** I recommend Option 1 (filtered logging) as it's non-invasive and gives you exactly what you need to see! 🔍
