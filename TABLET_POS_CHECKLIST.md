# Tablet POS Feature Checklist

## Quick Reference: Desktop vs Tablet Features

### ✅ Already Implemented
- [x] Basic menu browsing
- [x] Search functionality  
- [x] Simple cart (add/remove/quantity)
- [x] Basic order placement
- [x] Time Clock access
- [x] Order Processing Modal
- [x] Socket.IO connection
- [x] Category navigation (pills)

### ❌ Missing - Must Implement

#### Critical (Do First)
- [ ] **35 State Variables** (currently only 7)
- [ ] **Three-Tab Order System**
  - [ ] Ready Orders tab (exists but needs refinement)
  - [ ] Pending Orders tab
  - [ ] Dine-in/Take-out tab
- [ ] **Order Management**
  - [ ] Load pending order for editing
  - [ ] Update existing order
  - [ ] Delete pending order
  - [ ] Switch between order tabs
- [ ] **Layout Optimization**
  - [ ] Adjust split ratio (70/30 instead of 60/40)
  - [ ] Move order tabs to header
  - [ ] Collapsible order panel

#### High Priority
- [ ] **Payment Methods**
  - [ ] E-Wallet (GCash/Maya/PayMaya) with reference number
  - [ ] Debit Card with details
  - [ ] Credit Card with details
  - [ ] Customer name field
- [ ] **Discount System**
  - [ ] PWD discount card
  - [ ] Senior Citizen discount
  - [ ] Card number input
  - [ ] Discount calculation
- [ ] **Size Selection**
  - [ ] Size modal for multiple-size items
  - [ ] Price adjustment per size
  - [ ] Skip modal for single-size items

#### Medium Priority
- [ ] **Payment Verification**
  - [ ] Display orders awaiting payment
  - [ ] View payment proof image
  - [ ] Approve payment button
  - [ ] Reject payment button
  - [ ] Expandable image viewer
- [ ] **Subcategories**
  - [ ] Meals subcategories (5 types)
  - [ ] Beverages subcategories (8 types)
  - [ ] Breadcrumb navigation
  - [ ] Dynamic subcategory tabs
- [ ] **Real-time Updates**
  - [ ] Listen to menuItemUpdated
  - [ ] Listen to orderCreated
  - [ ] Listen to orderUpdated
  - [ ] Listen to orderDeleted
  - [ ] Listen to paymentVerified
- [ ] **Error Handling**
  - [ ] Loading screen
  - [ ] Error screen
  - [ ] Toast notifications (replace alerts)
  - [ ] Retry mechanisms

#### Low Priority
- [ ] **Staff Management**
  - [ ] Cash Float modal
  - [ ] End of Shift modal
  - [ ] Cash float tracking
  - [ ] Shift reports
- [ ] **Receipt System**
  - [ ] Receipt modal
  - [ ] Print functionality
  - [ ] Receipt preview
  - [ ] Order number display
- [ ] **UX Enhancements**
  - [ ] Locked item states (blue overlay)
  - [ ] Keyboard shortcuts (Enter to search)
  - [ ] Cart item notes
  - [ ] Duplicate item function
  - [ ] Clear cart button
  - [ ] Touch haptic feedback
  - [ ] Swipe gestures

---

## State Variables Checklist

### Currently Implemented (7/35)
- [x] menuItems
- [x] cart
- [x] categories
- [x] selectedCategory
- [x] searchTerm
- [x] showTimeClock
- [x] showOrderModal
- [x] activeOrders
- [x] socket

### To Add (28 more)

#### Order Management (8)
- [ ] currentOrder
- [ ] readyOrderCart
- [ ] pendingOrderCart
- [ ] orderViewType ('ready'|'pending'|'dineTakeout')
- [ ] editingPendingOrder
- [ ] isPendingOrderMode
- [ ] pendingOrderItems
- [ ] takeoutOrders

#### Category Navigation (5)
- [ ] selectedMealSubCategory
- [ ] selectedBeverageSubCategory
- [ ] activeCategory
- [ ] selectedSubCategories (object)
- [ ] menuConfig (object with subcategories)

#### Payment & Checkout (6)
- [ ] paymentMethod
- [ ] showReceipt
- [ ] savedOrderData
- [ ] cashAmount
- [ ] eWalletDetails (object)
- [ ] discountCardDetails (object)
- [ ] customerName

#### Modals & UI (7)
- [ ] showCashFloatModal
- [ ] showEndOfShiftModal
- [ ] showTimeClockModal
- [ ] showPaymentProcessingModal
- [ ] showVerificationModal
- [ ] showSizeModal
- [ ] selectedItemForSize
- [ ] selectedVerificationOrder
- [ ] expandedImage

#### System State (5)
- [ ] loading
- [ ] error
- [ ] windowWidth
- [ ] isUserAdmin
- [ ] isManager

---

## Functions Checklist

### Currently Implemented
- [x] fetchMenuItems()
- [x] fetchCategories()
- [x] fetchActiveOrders()
- [x] addToCart()
- [x] removeFromCart()
- [x] updateQuantity()
- [x] calculateTotal()
- [x] handleCheckout()
- [x] initializeSocket()

### To Implement

#### Order Management (6)
- [ ] loadPendingOrderForEdit(order)
- [ ] deletePendingOrder(orderId)
- [ ] updatePendingOrder()
- [ ] switchOrderTab(tabName)
- [ ] clearPendingOrderMode()
- [ ] fetchTakeoutOrders()

#### Payment (8)
- [ ] handlePaymentMethodChange(method)
- [ ] handleEWalletDetailsChange(field, value)
- [ ] handleDiscountCardChange(field, value)
- [ ] calculateDiscount()
- [ ] validatePaymentDetails()
- [ ] approvePayment(orderId)
- [ ] rejectPayment(orderId, reason)
- [ ] openVerificationModal(order)

#### Size Selection (3)
- [ ] openSizeModal(item)
- [ ] selectSize(item, sizeOption)
- [ ] closeSizeModal()

#### Receipt & Printing (3)
- [ ] showReceiptModal()
- [ ] handlePrint()
- [ ] closeReceiptModal()

#### Cash Float (4)
- [ ] openCashFloatModal()
- [ ] submitCashFloat(amount, denominations)
- [ ] openEndOfShiftModal()
- [ ] generateShiftReport()

#### Socket Handlers (5)
- [ ] handleMenuItemUpdated(data)
- [ ] handleOrderCreated(data)
- [ ] handleOrderUpdated(data)
- [ ] handleOrderDeleted(data)
- [ ] handlePaymentVerified(data)

#### UI Helpers (5)
- [ ] isItemLocked(item)
- [ ] getActiveCart() (returns correct cart based on tab)
- [ ] setActiveCart(items) (sets correct cart based on tab)
- [ ] showAllItems()
- [ ] handleKeyboardShortcut(event)

---

## Components Checklist

### Currently Used (Existing - Reuse)
- [x] MenuItemCard
- [x] SearchBar
- [x] TimeClockInterface
- [x] OrderProcessingModal

### To Add/Modify

#### New Tablet Components (6)
- [ ] TabletOrderTabs (3-tab system)
- [ ] TabletPaymentPanel (payment method selection)
- [ ] TabletPendingOrdersList (list of pending orders)
- [ ] TabletVerificationModal (payment verification)
- [ ] TabletSizeModal (size selection)
- [ ] TabletSubcategoryNav (subcategory navigation)

#### Existing to Import (5)
- [ ] OrderItem (for cart items)
- [ ] PaymentPanel (payment details form)
- [ ] Receipt (for printing)
- [ ] CashFloatModal (cash float management)
- [ ] EndOfShiftModal (shift reports)

#### UI Enhancements (2)
- [ ] MenuItemCard - Add `isLocked` prop support
- [ ] Modal wrapper (reusable)

---

## API Endpoints Checklist

### Currently Used
- [x] GET /api/menu-items
- [x] GET /api/categories  
- [x] GET /api/orders
- [x] POST /api/orders

### To Add
- [ ] PATCH /api/orders/:id (update order)
- [ ] DELETE /api/orders/:id (delete order)
- [ ] POST /api/orders/:id/verify-payment (approve/reject)
- [ ] GET /api/orders?status=awaiting_payment (takeout orders)
- [ ] GET /api/orders?status=pending (pending orders)
- [ ] POST /api/cash-float (record float)
- [ ] GET /api/cash-float (get current float)
- [ ] POST /api/end-of-shift (generate report)

---

## Socket Events Checklist

### To Listen
- [ ] menuItemUpdated
- [ ] orderCreated
- [ ] orderUpdated
- [ ] orderDeleted
- [ ] paymentVerified

### To Emit (handled by backend)
- Backend automatically emits when:
  - Order created
  - Order updated
  - Order deleted
  - Payment verified

---

## Testing Checklist

### Core Flows (6)
- [ ] Create new order
- [ ] Edit existing pending order
- [ ] Delete pending order
- [ ] Verify payment
- [ ] Approve payment
- [ ] Reject payment

### Payment Methods (4)
- [ ] Cash payment works
- [ ] E-Wallet payment works
- [ ] Debit card payment works
- [ ] Credit card payment works

### Discounts (2)
- [ ] PWD discount applies correctly
- [ ] Senior Citizen discount applies correctly

### Menu Navigation (5)
- [ ] Browse categories
- [ ] Filter by subcategory
- [ ] Search by name
- [ ] Search by code
- [ ] Size selection works

### Cart Operations (5)
- [ ] Add item
- [ ] Remove item
- [ ] Update quantity
- [ ] Clear cart
- [ ] Total calculates correctly

### Staff Features (3)
- [ ] Record cash float
- [ ] Clock in/out
- [ ] Generate shift report

### Real-time (5)
- [ ] Menu changes sync
- [ ] New orders appear
- [ ] Order updates sync
- [ ] Order deletions sync
- [ ] Payment verifications sync

---

## Quick Start Guide

### Step 1: Copy State from Desktop
```javascript
// Copy lines 25-95 from PointofSale.jsx to PointOfSaleTablet.jsx
```

### Step 2: Copy Core Functions
```javascript
// Copy these functions from PointofSale.jsx:
// - loadPendingOrderForEdit (line ~500)
// - deletePendingOrder (line ~507)
// - updatePendingOrder (line ~1400)
```

### Step 3: Add Order Tabs
```javascript
// Create TabletOrderTabs.jsx component
// Import and use in header
```

### Step 4: Add Payment Panel
```javascript
// Import PaymentPanel from components/ui
// Add payment method selection
```

### Step 5: Test Each Feature
```javascript
// Test after adding each major feature
// Use iPad Mini view in Chrome DevTools
```

---

## Progress Tracking

**Total Features:** 100+
**Currently Implemented:** ~15 (15%)
**Target:** 100 (100%)

**Estimated Time Remaining:** 18-25 hours

---

*Use this checklist to track implementation progress. Check off items as you complete them.*
