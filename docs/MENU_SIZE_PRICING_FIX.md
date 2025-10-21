# Menu System Size and Pricing Fix

## Issues Identified

### 1. Size Name Mismatch
**Problem**: The `menuConfig` was storing display names instead of the actual size objects, causing a mismatch between:
- Form field registration: `pricing.${sizeName}` where `sizeName = size.name`
- Validation logic: Trying to access `data.pricing[size.name]` but iterating through display names

**Example**:
```javascript
// menuConfig had:
sizes: ["Medium", "Large"]  // Display names

// But form fields were registered as:
pricing.M  // Internal name
pricing.L  // Internal name

// Validation tried to access:
data.pricing["Medium"]  // ❌ undefined!
data.pricing["Large"]   // ❌ undefined!
```

### 2. MenuConfig vs Database Categories Inconsistency
**Problem**: The validation logic used the static `menuConfig` fallback, while the UI used dynamic `categories` from the database. This caused mismatches when custom sizes were added.

### 3. Missing Pricing Field Initialization
**Problem**: When switching subcategories or editing items, pricing fields weren't properly initialized or cleared, leading to stale data or undefined values.

### 4. Poor Error Messages
**Problem**: Error message "Invalid price for undefined" didn't indicate which size or what the actual issue was.

## Solutions Implemented

### 1. Fixed menuConfig Size Mapping (Line ~588-607)
Changed from storing just display names to storing full size objects:

```javascript
// OLD CODE (WRONG):
const sizes = subCat.sizes && subCat.sizes.length > 0 
  ? subCat.sizes.map(size => size.displayName || size.name || size)
  : [];

// NEW CODE (CORRECT):
const sizes = subCat.sizes && subCat.sizes.length > 0 
  ? subCat.sizes.map(size => {
      if (typeof size === 'object' && size.name) {
        return {
          name: size.name,              // Internal key for form fields
          displayName: size.displayName || size.name  // User-facing label
        };
      }
      return {
        name: size,
        displayName: size
      };
    })
  : [];
```

### 2. Updated onSubmit Validation (Line ~1078-1145)
Changed from using static `menuConfig` to dynamic `categories` from database:

```javascript
// OLD CODE (WRONG):
const categoryConfig = menuConfig[data.category];
const subCategory = categoryConfig.subCategories[data.subCategory];
subCategory.sizes.forEach(size => {
  const price = parseFloat(data.pricing[size.name]);
  if (isNaN(price)) throw new Error(`Invalid price for ${size.name}`);
});

// NEW CODE (CORRECT):
const backendCategory = categories.find(c => (c.name || c.category) === data.category);
const subCategory = subcats.find(sub => (sub.name || sub.displayName) === data.subCategory);
const sizes = subCategory?.sizes || subCategoryConfig.sizes || [];

const missingPrices = [];
sizes.forEach(size => {
  const sizeName = size.name || size;
  const priceValue = data.pricing?.[sizeName];
  const price = parseFloat(priceValue);
  
  if (priceValue === undefined || priceValue === null || priceValue === '') {
    missingPrices.push(size.displayName || sizeName);
  } else if (isNaN(price)) {
    throw new Error(`Invalid price for ${size.displayName || sizeName}: "${priceValue}" is not a valid number`);
  } else {
    processedPricing[sizeName] = price;
  }
});

if (missingPrices.length > 0) {
  throw new Error(`Missing prices for: ${missingPrices.join(', ')}. Please fill in all size prices.`);
}
```

### 3. Enhanced Form Initialization for Edit Mode (Line ~263-295)
Added proper normalization and validation of pricing data when loading items for editing:

```javascript
// Ensure all pricing values are properly initialized as numbers or empty strings
Object.keys(normalizedPricing).forEach(key => {
  const value = normalizedPricing[key];
  if (value === null || value === undefined) {
    normalizedPricing[key] = '';
  } else if (typeof value === 'number') {
    normalizedPricing[key] = value;
  } else {
    const parsed = parseFloat(value);
    normalizedPricing[key] = isNaN(parsed) ? '' : parsed;
  }
});

console.log('Initializing edit form with pricing:', normalizedPricing);
```

### 4. Added Subcategory Change Handler (Line ~365-407)
Clears pricing fields when subcategory changes (for new items only):

```javascript
useEffect(() => {
  if (!selectedItem?._id && selectedSubCategory) {
    // Get the sizes for the new subcategory
    const backendCategory = categories.find(c => (c.name || c.category) === selectedCategory);
    let newSizes = [];
    
    // [... get sizes from backend or menuConfig ...]
    
    const clearedPricing = {};
    if (newSizes.length > 0) {
      newSizes.forEach(size => {
        const sizeName = size.name || size;
        clearedPricing[sizeName] = '';
      });
    } else {
      clearedPricing.single = '';
    }
    
    setValue('pricing', clearedPricing);
    setValue('ignoreSizes', false);
  }
}, [selectedSubCategory, selectedItem, categories, selectedCategory, menuConfig, watch, setValue]);
```

### 5. Improved Debug Logging (Line ~2230-2235)
Added console logging to help diagnose future issues:

```javascript
if (hasSizes) {
  console.log('Pricing section - sizes detected:', sizes.map(s => ({
    name: s.name || s,
    displayName: s.displayName || s.name || s
  })));
}
```

### 6. Enhanced Error Messages
Replaced generic error messages with specific, actionable ones:
- ❌ OLD: "Invalid price for undefined"
- ✅ NEW: "Missing prices for: Medium, Large. Please fill in all size prices."
- ✅ NEW: "Invalid price for Medium: 'abc' is not a valid number"

## Additional Fix: Single Price Items Not Loading in Edit Mode

### Issue
When editing items with no size modifiers (e.g., "Churros Sticks" - APP02 in Appetizers/Sandwiches), the price field showed "0.00" instead of the actual saved price.

### Root Cause
- Database stores single-price items with `pricing.base` property
- Form expects `pricing.single` property for items without sizes
- The conversion was happening but not being reliably set in the form

### Solution
Enhanced the form initialization to:
1. Better detect single-price vs size-based items
2. Always convert `base` to `single` for items without size variations
3. Properly set the `ignoreSizes` flag based on subcategory configuration
4. Add a safety check to force `setValue` if form hook doesn't update properly

```javascript
// Improved detection
const hasSizePricing = Object.keys(normalizedPricing).some(key => 
  key !== 'base' && key !== 'single' && key !== '_id'
);

// Convert base to single for non-size items
if (!hasSizePricing && normalizedPricing.base !== undefined) {
  normalizedPricing.single = normalizedPricing.base;
  delete normalizedPricing.base;
}

// Safety check with setTimeout to ensure form is updated
if (normalizedPricing.single !== undefined && normalizedPricing.single !== null) {
  setTimeout(() => {
    const currentValue = getValues('pricing.single');
    if (currentValue !== normalizedPricing.single) {
      setValue('pricing.single', normalizedPricing.single);
    }
  }, 100);
}
```

## Testing Checklist

- [ ] Create a new menu item with custom sizes (e.g., Fresh Lemonade with Medium, Large)
- [ ] Create a new menu item with single pricing (Lemon Yakult)
- [ ] Edit an existing item with multiple sizes and verify all prices load correctly
- [ ] **Edit an existing item with single pricing (e.g., Churros Sticks - APP02) - verify price loads correctly**
- [ ] **Edit items in subcategories with no sizes configured - verify price field populates**
- [ ] Switch subcategories while creating a new item - verify pricing fields reset
- [ ] Try to submit without filling all size prices - verify helpful error message
- [ ] Try to submit with invalid price values - verify helpful error message
- [ ] Add a new size to a subcategory and verify it appears in the form
- [ ] Toggle "ignore sizes" checkbox and verify single price field appears/disappears

## Files Modified

- `ring-and-wing-frontend/src/MenuManagement.jsx`
  - Lines ~588-607: Fixed menuConfig size mapping
  - Lines ~1078-1145: Updated onSubmit validation logic
  - Lines ~263-295: Enhanced form initialization for edit mode
  - Lines ~365-407: Added subcategory change handler
  - Lines ~2230-2235: Added debug logging

## Root Cause Summary

The fundamental issue was a **data structure mismatch** between:
1. How sizes were stored in memory (strings vs objects)
2. How form fields were registered (using `size.name`)
3. How validation accessed the data (using display names)

This caused the form to register fields like `pricing.M` and `pricing.L`, but validation to look for `pricing.Medium` and `pricing.Large`, resulting in undefined values and the error "Invalid price for undefined".

The fix ensures consistency across all layers by:
- Storing full size objects with both `name` (internal) and `displayName` (user-facing) properties
- Using the same data source (database categories) for both UI and validation
- Properly initializing and clearing pricing fields on state changes
