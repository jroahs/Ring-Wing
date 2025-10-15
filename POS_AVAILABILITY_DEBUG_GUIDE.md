# POS Menu Availability Debug Guide

**Issue:** POS component not showing real-time availability updates despite receiving socket events and updating state.

**Status:** Socket emissions working, frontend receiving events, state updating - UI not re-rendering

---

## Diagnostic Checklist

### Step 1: Verify Socket Event Reception

Open POS in browser and check console for these logs when ingredient stock is depleted:

**Expected Console Output:**
```javascript
[POS] Menu availability changed: {
  menuItemId: "683c2408ec6a7e4a45a6fa11",
  isAvailable: false,
  reason: "Insufficient ingredients",
  insufficientIngredients: ["kangkong"]
}

[POS] Item 683c2408ec6a7e4a45a6fa11 is now unavailable: Insufficient ingredients
```

**If logs appear:** Socket system working, proceed to Step 2  
**If logs DON'T appear:** Socket connection issue, check authentication

---

### Step 2: Verify State Update

Add temporary debugging to PointofSale.jsx socket listener:

```javascript
// Around line 187
socketConnection.on('menuAvailabilityChanged', (data) => {
  console.log('[POS] Menu availability changed:', data);
  
  if (data.menuItemId) {
    console.log('[POS] BEFORE update - menuItems count:', menuItems.length);
    console.log('[POS] Looking for item:', data.menuItemId);
    
    const targetItem = menuItems.find(item => item._id === data.menuItemId);
    console.log('[POS] Found item:', targetItem?.name, 'Current availability:', targetItem?.isAvailable);
    
    setMenuItems(prev => {
      const updated = prev.map(item => 
        item._id === data.menuItemId 
          ? { ...item, isAvailable: data.isAvailable }
          : item
      );
      
      console.log('[POS] AFTER update - Updated item:', 
        updated.find(item => item._id === data.menuItemId)
      );
      
      return updated;
    });
  }
});
```

**Expected Output:**
```
[POS] BEFORE update - menuItems count: 50
[POS] Looking for item: 683c2408ec6a7e4a45a6fa11
[POS] Found item: Boneless Bangsilog, Current availability: true
[POS] AFTER update - Updated item: { _id: '...', name: '...', isAvailable: false }
```

**If state updates correctly:** React re-rendering issue, proceed to Step 3  
**If state doesn't update:** MenuItemId mismatch or data structure problem

---

### Step 3: Check MenuItemCard Re-rendering

Add temporary debugging to MenuItemCard component:

```javascript
// MenuItemCard.jsx - Add at top of component
export const MenuItemCard = ({ item, onClick, isUnavailable = false }) => {
  console.log('[MenuItemCard] Rendering:', item.name, 'isUnavailable:', isUnavailable);
  
  // Rest of component...
}
```

**Expected Output:**
```
[MenuItemCard] Rendering: Boneless Bangsilog isUnavailable: false
[MenuItemCard] Rendering: Boneless Bangsilog isUnavailable: false  // Re-render
```

**If MenuItemCard doesn't re-render:** React optimization issue, try solutions below  
**If MenuItemCard re-renders but UI doesn't change:** CSS/styling issue

---

## Potential Solutions

### Solution 1: Force Re-render with Key Prop

**Problem:** React may be reusing MenuItemCard instances

**Fix:** Add availability to key prop in PointofSale.jsx:

```javascript
// Line 1530 - Change from:
<div key={item._id} className="flex-shrink-0" style={{ width: '200px' }}>

// To:
<div key={`${item._id}-${item.isAvailable}`} className="flex-shrink-0" style={{ width: '200px' }}>
```

**Why:** Forces React to treat unavailable items as new components

---

### Solution 2: Add Render Counter

**Problem:** Silent re-render skipping

**Fix:** Add render tracking state:

```javascript
// PointofSale.jsx - Add state
const [renderTrigger, setRenderTrigger] = useState(0);

// In socket listener
socketConnection.on('menuAvailabilityChanged', (data) => {
  console.log('[POS] Menu availability changed:', data);
  
  if (data.menuItemId) {
    setMenuItems(prev => prev.map(item => 
      item._id === data.menuItemId 
        ? { ...item, isAvailable: data.isAvailable }
        : item
    ));
    
    // Force re-render
    setRenderTrigger(prev => prev + 1);
  }
});
```

**Why:** Guarantees component re-evaluation

---

### Solution 3: useMemo for Filtered Menu Items

**Problem:** Menu items filtered before render, React may cache

**Fix:** Wrap filtered items in useMemo with proper dependencies:

```javascript
// PointofSale.jsx - Around line 1520
const displayedItems = useMemo(() => {
  return menuItems
    .filter(item => item.category === activeCategory)
    .filter(item => /* subcategory filter */)
    .filter(item => /* search filter */);
}, [menuItems, activeCategory, selectedSubCategories, searchTerm]);

// Then use in JSX:
{displayedItems.map(item => (
  <div key={item._id}>
    <MenuItemCard
      item={item}
      onClick={() => item.isAvailable !== false ? addToOrder(item) : null}
      isUnavailable={item.isAvailable === false}
    />
  </div>
))}
```

**Why:** Ensures filtering recalculates when menuItems changes

---

### Solution 4: Direct Prop Update

**Problem:** `isUnavailable` calculation may be cached

**Fix:** Pass entire item and let MenuItemCard decide:

```javascript
// PointofSale.jsx
<MenuItemCard
  item={item}
  onClick={() => item.isAvailable !== false ? addToOrder(item) : null}
  // Remove isUnavailable prop, let component check item.isAvailable directly
/>

// MenuItemCard.jsx - Update to read from item
export const MenuItemCard = ({ item, onClick }) => {
  const isUnavailable = item.isAvailable === false;
  // Rest of component...
}
```

**Why:** Eliminates prop calculation layer

---

## Testing Each Solution

### Test Procedure:
1. Apply one solution at a time
2. Open POS in browser
3. Open InventorySystem in another tab
4. Deplete ingredient stock below threshold
5. Observe POS for "UNAVAILABLE" overlay

**Success Criteria:**
- Orange "UNAVAILABLE" banner appears within 1 second
- No page refresh needed
- Console shows state update logs
- MenuItemCard re-renders with isUnavailable=true

---

## Root Cause Hypotheses

### Most Likely:
1. **React Optimization:** React may be preventing re-renders due to shallow comparison
2. **Key Prop Issue:** Same key for available/unavailable items
3. **Stale Closure:** Socket listener may have stale menuItems reference

### Less Likely:
4. **CSS Z-Index:** UNAVAILABLE overlay may be hidden (but you can inspect element)
5. **Data Mismatch:** MenuItemId format inconsistency (ObjectId vs string)

---

## Quick Verification Steps

### 1. Check if item exists in menuItems array:
```javascript
// In browser console
const menuItems = [...]; // Your menuItems state
menuItems.find(item => item._id === "683c2408ec6a7e4a45a6fa11");
// Should return the item object
```

### 2. Check if isAvailable prop is reaching MenuItemCard:
```javascript
// Use React DevTools
// Select MenuItemCard component
// Check Props panel for isUnavailable value
```

### 3. Verify socket event has correct menuItemId format:
```javascript
// Backend log should show:
[SocketService] Emitted: menuAvailabilityChanged
menuItemId: 683c2408ec6a7e4a45a6fa11  // Check if this matches your item _id
```

---

## Next Steps

1. Run Step 1-3 diagnostics with console logging
2. Try Solution 1 (key prop) first - simplest fix
3. If Solution 1 fails, try Solution 2 (render trigger)
4. If still failing, implement Solution 3 (useMemo)
5. Report findings for deeper investigation

---

## Alternative: Manual Refresh Fallback

If all solutions fail, implement periodic refresh as temporary workaround:

```javascript
// PointofSale.jsx
useEffect(() => {
  const interval = setInterval(() => {
    // Refetch menu availability
    fetchMenuItems();
  }, 30000); // Every 30 seconds
  
  return () => clearInterval(interval);
}, []);
```

**Note:** This defeats the purpose of real-time updates but ensures eventual consistency.
