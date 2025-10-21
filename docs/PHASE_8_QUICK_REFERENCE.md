# Phase 8: Quick Reference Guide 🚀

## What Changed

### Cart Display (Lines 1450-1460)
**Before:**
```jsx
<div className="bg-gray-50 p-3 rounded-lg">
  <p className="font-semibold">{item.name}</p>
  <button onClick={() => removeFromCart(item._id)}>×</button>
  <button onClick={() => updateQuantity(item._id, item.quantity - 1)}>−</button>
  <span>{item.quantity}</span>
  <button onClick={() => updateQuantity(item._id, item.quantity + 1)}>+</button>
</div>
```

**After:**
```jsx
<OrderItem
  key={`${item._id}-${item.size}-${index}`}
  item={item}
  onVoid={removeFromCartWithConfirm}
  onUpdateSize={updateItemSize}
  onUpdateQuantity={updateItemQuantity}
  onDiscountUpdate={updateItemDiscount}
/>
```

---

## New Features

### 1. PWD/Senior Discount Button
Click the user icon (👤) on any item to apply 20% discount + VAT exempt.

**Badge Display:**
```
PWD/Senior: 2x (20% off + VAT exempt)
Card details will be collected at payment
```

---

### 2. Size Selection in Cart
Change item size directly from the cart using the dropdown.

---

### 3. Confirmation Dialogs

**Remove Item:**
```
┌─────────────────────────────┐
│ Remove Item?                │
│                             │
│ Are you sure you want to   │
│ remove "Chicken Wings"?     │
│                             │
│ [Cancel]        [Remove]   │
└─────────────────────────────┘
```

**Clear Cart:**
```
┌─────────────────────────────┐
│ Clear Entire Order?         │
│                             │
│ This will remove all 5      │
│ items from your current     │
│ order. Cannot be undone.    │
│                             │
│ [Cancel]      [Clear All]  │
└─────────────────────────────┘
```

---

### 4. Updated Total Display

**Payment Panel:**
```
Subtotal:           ₱500.00
PWD/Senior (20%):   -₱100.00
─────────────────────────────
TOTAL:              ₱400.00
```

---

## Function Reference

### updateItemDiscount(item, discountedQuantity)
Apply PWD/Senior discount to specific quantity of an item.
- Max quantity: item.quantity
- Discount rate: 20%
- VAT exempt: Yes

### updateItemSize(item, newSize)
Change the size of an item in cart.
- Updates price automatically
- Preserves quantity and discounts

### updateItemQuantity(item, delta)
Adjust quantity (+1 or -1).
- Minimum: 1
- Auto-adjusts PWD discount if needed

### removeFromCartWithConfirm(item)
Remove item with confirmation dialog.

### clearCart()
Clear all items with confirmation dialog.

### calculateTotal()
Returns object:
```javascript
{
  subtotal: "500.00",
  discount: "100.00",
  total: "400.00"
}
```

---

## Testing Quick Guide

### Test PWD/Senior Discount:
1. Add item to cart
2. Click user icon (👤)
3. Select discount quantity
4. Click "Apply"
5. Check blue badge appears
6. Verify discount in total

### Test Size Change:
1. Click size dropdown in cart item
2. Select different size
3. Verify price updates
4. Verify total recalculates

### Test Confirmations:
1. Click remove (🗑️) → Confirm dialog
2. Click "Clear Cart" → Confirm dialog
3. Test Cancel vs Confirm

### Test Pending Order:
1. Load pending order for edit
2. Apply PWD discount
3. Change size
4. Remove item
5. Click "Update Order"
6. Verify changes saved

---

## Code Locations

| Feature | File | Lines |
|---------|------|-------|
| updateItemDiscount | PointOfSaleTablet.jsx | ~520-540 |
| updateItemSize | PointOfSaleTablet.jsx | ~512-520 |
| updateItemQuantity | PointOfSaleTablet.jsx | ~522-545 |
| calculateTotal | PointOfSaleTablet.jsx | ~556-578 |
| OrderItem Integration | PointOfSaleTablet.jsx | ~1452-1460 |
| Remove Confirmation | PointOfSaleTablet.jsx | ~1825-1850 |
| Clear Confirmation | PointOfSaleTablet.jsx | ~1852-1877 |

---

## Desktop POS Reference

All implementations follow these patterns:
- PWD/Senior: Lines 888-930
- calculateTotal: Lines 904-927
- OrderItem usage: Lines 1656-1808

---

## Troubleshooting

### PWD button not showing
- Check: Is OrderItem component imported?
- Check: Is item in cart rendered as <OrderItem>?

### Discount not calculating
- Check: calculateTotal() returns object
- Check: PaymentPanel uses .total, .subtotal, .discount

### Confirmation not appearing
- Check: showRemoveConfirm state exists
- Check: removeFromCartWithConfirm is used (not removeFromCart)

### Size change not working
- Check: item has pricing object
- Check: updateItemSize compares by _id AND size

---

## Feature Parity Checklist

- [x] OrderItem component integration
- [x] PWD/Senior discount per item
- [x] Size selection in cart
- [x] Quantity controls with PWD handling
- [x] Item removal confirmation
- [x] Clear cart confirmation
- [x] Discount calculation (20% flat)
- [x] Order data with pwdSeniorDiscount
- [x] Pending order editing support
- [x] PaymentPanel with discount display

**Status: 100% Complete** ✅

---

Ready to test! 🎉
