# POS "Dine/Take-outs" Tab - Design Specification

## 🎯 Purpose
Quick verification interface for takeout/delivery orders directly in POS, eliminating need to navigate to Dashboard for straightforward cases.

---

## 📐 Layout Design

### **Tab Structure**
```
┌─────────────────────────────────────────────────────────────┐
│  Point of Sale                                               │
├─────────────────────────────────────────────────────────────┤
│  [ Ready Orders ] [ Pending Orders ] [ Dine/Take-outs ]     │ ← NEW TAB
└─────────────────────────────────────────────────────────────┘
```

---

## 🎨 "Dine/Take-outs" Tab Interface

```
┌─────────────────────────────────────────────────────────────┐
│  Dine/Take-outs                          [Filter ▼] [🔄]    │
├─────────────────────────────────────────────────────────────┤
│  Filters: [All] [Unverified] [Verified] [GCash] [PayMaya]  │
│  Search: [_________________________________] 🔍              │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  ┌───────────────────────────────────────────────────────┐  │
│  │ ⏳ AWAITING VERIFICATION                              │  │
│  │ Order #RNG-124 | 📦 Takeout | GCash | ₱320          │  │
│  │ Time left: 45:23 🟢                                   │  │
│  │                                                       │  │
│  │ 👤 Customer: Juan Dela Cruz                          │  │
│  │ 📝 Items: 2x Buffalo Wings, 1x Fries                │  │
│  │                                                       │  │
│  │ 💳 Payment Proof:                                    │  │
│  │ ┌─────────────────────┐                              │  │
│  │ │ [Screenshot Preview]│  OR  Ref: 1234567890         │  │
│  │ │     [Tap to view]   │      Account: Juan Cruz      │  │
│  │ └─────────────────────┘                              │  │
│  │                                                       │  │
│  │ [View Full Details] [✓ Verify Payment] [✗ Reject]   │  │
│  └───────────────────────────────────────────────────────┘  │
│                                                              │
│  ┌───────────────────────────────────────────────────────┐  │
│  │ ✅ VERIFIED                                           │  │
│  │ Order #RNG-126 | 🚚 Delivery | PayMaya | ₱450       │  │
│  │ Verified by: Ana (2 minutes ago)                     │  │
│  │                                                       │  │
│  │ 👤 Customer: Maria Santos                            │  │
│  │ 📝 Items: 1x Combo Meal, 1x Milktea                 │  │
│  │                                                       │  │
│  │ [Process to Kitchen] [View Details]                  │  │
│  └───────────────────────────────────────────────────────┘  │
│                                                              │
│  ┌───────────────────────────────────────────────────────┐  │
│  │ ⏳ URGENT - 15:30 left 🔴                            │  │
│  │ Order #RNG-130 | 📦 Takeout | GCash | ₱280          │  │
│  │                                                       │  │
│  │ 👤 Customer: Pedro Reyes                             │  │
│  │ 📝 Items: 1x Snack Platter                          │  │
│  │                                                       │  │
│  │ 💳 Payment Proof:                                    │  │
│  │ Account: Pedro R.                                     │  │
│  │ Reference: 9876543210                                 │  │
│  │                                                       │  │
│  │ [View Full Details] [✓ Verify Payment] [✗ Reject]   │  │
│  └───────────────────────────────────────────────────────┘  │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

---

## 🎨 Order Card Components

### **Unverified Order Card**
```jsx
<OrderCard status="pending_payment">
  <StatusBadge>⏳ AWAITING VERIFICATION</StatusBadge>
  <TimeRemaining color={urgencyColor}>45:23</TimeRemaining>
  
  <OrderHeader>
    <OrderNumber>#RNG-124</OrderNumber>
    <FulfillmentBadge>📦 Takeout</FulfillmentBadge>
    <PaymentMethod>GCash</PaymentMethod>
    <Amount>₱320</Amount>
  </OrderHeader>
  
  <CustomerInfo>
    👤 Juan Dela Cruz
  </CustomerInfo>
  
  <ItemsList>
    📝 2x Buffalo Wings, 1x Fries
  </ItemsList>
  
  <PaymentProof>
    {hasImage ? (
      <ImagePreview src={proofUrl} onClick={viewFullSize} />
    ) : (
      <TextReference>
        Ref: 1234567890
        Account: Juan Cruz
      </TextReference>
    )}
  </PaymentProof>
  
  <Actions>
    <Button variant="secondary">View Full Details</Button>
    <Button variant="success">✓ Verify Payment</Button>
    <Button variant="danger">✗ Reject</Button>
  </Actions>
</OrderCard>
```

### **Verified Order Card**
```jsx
<OrderCard status="payment_verified">
  <StatusBadge variant="success">✅ VERIFIED</StatusBadge>
  <VerificationInfo>
    Verified by: Ana (2 minutes ago)
  </VerificationInfo>
  
  <OrderHeader>
    <OrderNumber>#RNG-126</OrderNumber>
    <FulfillmentBadge>🚚 Delivery</FulfillmentBadge>
    <PaymentMethod>PayMaya</PaymentMethod>
    <Amount>₱450</Amount>
  </OrderHeader>
  
  <CustomerInfo>
    👤 Maria Santos
  </CustomerInfo>
  
  <ItemsList>
    📝 1x Combo Meal, 1x Milktea
  </ItemsList>
  
  <Actions>
    <Button variant="primary">Process to Kitchen</Button>
    <Button variant="secondary">View Details</Button>
  </Actions>
</OrderCard>
```

---

## 🎨 Color Coding

### **Status Colors**
- 🔴 **Red**: < 15 minutes remaining (urgent)
- 🟠 **Orange**: 15-30 minutes remaining (warning)
- 🟡 **Yellow**: 30-60 minutes remaining (normal)
- 🟢 **Green**: > 1 hour remaining (plenty of time)
- ✅ **Blue**: Verified (ready to process)

### **Badge Styles**
```css
.badge-unverified {
  background: #FEF3C7; /* Light yellow */
  color: #92400E;
  border: 2px solid #F59E0B;
}

.badge-verified {
  background: #D1FAE5; /* Light green */
  color: #065F46;
  border: 2px solid #10B981;
}

.badge-urgent {
  background: #FEE2E2; /* Light red */
  color: #991B1B;
  border: 2px solid #EF4444;
  animation: pulse 2s infinite;
}
```

---

## 🔄 Interaction Flows

### **Quick Verify Flow**
```
1. Cashier sees unverified order in "Dine/Take-outs" tab
   ↓
2. Reviews payment proof inline (image preview OR text reference)
   ↓
3. Opens their GCash/PayMaya merchant app to cross-verify
   ↓
4. Clicks [✓ Verify Payment] button
   ↓
5. Order status changes to "VERIFIED"
   ↓
6. Order card updates to show verification info
   ↓
7. Order can now be processed to kitchen
```

### **View Full Details Flow**
```
1. Cashier clicks [View Full Details] button
   ↓
2. Opens full verification modal OR
3. Navigates to Dashboard verification page
   ↓
4. Shows:
   - Full-size payment proof image
   - Complete order history
   - Customer information
   - Add verification notes
   ↓
5. Verify or reject with detailed notes
```

### **Reject Flow**
```
1. Cashier clicks [✗ Reject] button
   ↓
2. Modal opens: "Rejection Reason"
   ↓
3. Options:
   - Invalid/unclear proof
   - Amount doesn't match
   - Transaction not found
   - Other (text input)
   ↓
4. Order status changes to "REJECTED"
   ↓
5. Customer receives notification
   ↓
6. Order removed from list (or moved to "Rejected" section)
```

---

## 📊 Sorting & Filtering

### **Default Sort Order**
1. Unverified orders first
2. Most urgent first (expiring soonest)
3. Then verified orders (newest first)

### **Filter Options**
- **By Status:**
  - All
  - Awaiting Verification
  - Verified
  - Rejected

- **By Payment Method:**
  - All
  - GCash
  - PayMaya

- **By Urgency:**
  - Urgent (< 15 min)
  - Expiring Soon (< 30 min)
  - Normal

- **By Fulfillment Type:**
  - All
  - Takeout
  - Delivery

### **Search**
- By order number
- By customer name
- By reference number
- By phone number (if available)

---

## 🔔 Real-time Updates

### **Socket.io Events**
```javascript
// New unverified order arrives
socket.on('newPaymentOrder', (order) => {
  // Add to top of list
  // Show toast notification
  // Play sound alert (optional)
});

// Order verified by another cashier
socket.on('paymentVerified', (orderId) => {
  // Update order card status
  // Move to verified section
});

// Order timeout
socket.on('orderTimeout', (orderId) => {
  // Remove from list
  // Show notification
});
```

---

## 💡 UX Enhancements

### **Quick Actions**
- Double-click order card → Opens full details
- Keyboard shortcuts:
  - `V` → Verify selected order
  - `R` → Reject selected order
  - `↑↓` → Navigate orders
  - `Enter` → View details

### **Bulk Operations** (Future)
- Select multiple verified orders
- "Process All to Kitchen" button
- Useful during busy periods

### **Statistics Panel** (Optional)
```
┌─────────────────────────────────────────┐
│ Today's Verification Stats              │
│ Pending: 3 | Verified: 24 | Rejected: 1│
│ Avg. Verification Time: 2.5 minutes     │
└─────────────────────────────────────────┘
```

---

## ✅ Benefits Over Dashboard-Only Approach

1. **⚡ Faster Workflow**
   - No navigation needed
   - See orders while working in POS
   - One-click verification

2. **🎯 Context Preservation**
   - Stay in POS interface
   - Don't lose place in order flow
   - Quick verification during quiet moments

3. **👥 Better for Multiple Staff**
   - Different cashiers can handle different tasks
   - One verifies, another processes orders
   - No bottleneck

4. **📱 Mobile Friendly**
   - Works on tablet POS systems
   - Touch-friendly buttons
   - Swipe gestures (future)

5. **🔄 Flexible Approach**
   - Quick cases: Handle in POS
   - Complex cases: Use Dashboard
   - Best of both worlds

---

## 🎯 Following Existing Patterns

### **Inspired by:**
- `RevenueReportsPage.jsx` - Toggle pattern
- `ReceiptHistory.jsx` - List view, filters, search
- `PendingOrder.jsx` - Order card layout
- `OrderProcessingModal.jsx` - Action buttons

### **Consistent with:**
- Color scheme from `theme.js`
- Button styles from existing components
- Modal patterns from POS
- Icon library (react-icons)

---

**Status:** ✅ Design specification complete - Ready for implementation tomorrow!
