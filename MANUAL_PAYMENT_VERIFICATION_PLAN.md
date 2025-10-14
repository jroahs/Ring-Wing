# Manual Payment Verification System - Implementation Plan
**Status:** Ready for Implementation ✅  
**Last Updated:** January 13, 2025  
**Purpose:** Enable delivery/takeout orders with GCash/PayMaya payment verification

## 🎯 Quick Summary

This system allows customers to:
1. Order via self-checkout and pay with GCash/PayMaya
2. Upload proof of payment (screenshot OR reference number)
3. Wait for cashier verification (2-hour timeout)
4. Receive order once payment is verified

### **Why This Is Needed:**
- Current POS is designed for **dine-in only** (payment at counter)
- New requirement: **Delivery/takeout** orders need pre-payment
- GCash/PayMaya don't have direct API integration (manual verification required)
- Solution: User pays → uploads proof → cashier verifies → kitchen processes

### **Critical Distinction - Two Types of "Pending":**

**1. POS "Pending Orders" (Existing System - Unchanged):**
- Status: `pending`
- PaymentMethod: `pending`
- Purpose: **Editable draft orders** at the counter
- Workflow: Customer at counter → Cashier builds order → Customer decides → Process payment
- **Can be modified** (add/remove items before payment)
- Used for: Dine-in counter orders

**2. Payment Verification Orders (NEW System):**
- Status: `pending_payment`
- PaymentMethod: `e-wallet`
- Purpose: **Locked-in orders** awaiting payment verification
- Workflow: Customer pays online → Uploads proof → Cashier verifies → Order locked
- **Cannot be modified** (order is final, just verifying payment)
- Used for: Takeout/delivery e-wallet orders

**These are completely separate workflows!** Payment verification orders should NOT appear in the POS "Pending Orders" tab.

### **Key Design Decision:**
🎯 **Order Type Selection in SelfCheckout:**
- User chooses: **Dine-in** OR **Takeout/Delivery** at checkout
- **Dine-in orders:** Use traditional system (proceed to counter, pay there)
- **Takeout/Delivery orders:** Require payment verification (GCash/PayMaya with proof)

### **Key Features:**
✅ Order type selector (Dine-in vs Takeout/Delivery)  
✅ Flexible proof input (image, text, or both)  
✅ Real-time updates via Socket.io  
✅ 2-hour timeout with visual warnings  
✅ Integrated into existing Dashboard  
✅ POS blocks unverified takeout/delivery orders  
✅ Admin controls for wallet settings  
✅ Traditional dine-in flow unchanged  

---

## Overview
Implement a manual payment verification system for GCash and PayMaya payments for delivery/takeout orders. Users pay via e-wallet before order submission, upload proof of payment, and cashiers verify the payment before the order is processed in the kitchen.

## Current System Analysis

### Order Model Structure (`models/Order.js`)
- `paymentMethod`: ['cash', 'e-wallet', 'pending']
- `paymentDetails`: { cashReceived, change, eWalletProvider, eWalletReferenceNumber, eWalletName }
- `orderType`: ['self_checkout', 'chatbot', 'pos']
- `status`: ['received', 'preparing', 'ready', 'completed', 'pending']
- **Note:** Currently no `fulfillmentType` field to distinguish dine-in vs takeout/delivery

### Settings Model Structure (`models/Settings.js`)
- `cashFloat`: Cash management settings
- `system`: Business name, timezone, currency
- `pos`: Receipt footer, tax rate
- No merchant wallet settings yet (to be added)

### Current Flow
1. User places order via SelfCheckout (`SelfCheckout.jsx`)
2. `paymentMethod` set to 'pending', `orderType` set to 'self_checkout'
3. Order saved to database via `POST /api/orders`
4. User told to "proceed to counter for payment" (current limitation)
5. POS system (`PointofSale.jsx`) designed for dine-in only - no delivery/takeout support yet

### Proposed New Flow (With Order Type Selection)
1. User adds items to cart in SelfCheckout
2. **User selects order type: [Dine-in] or [Takeout/Delivery]**
3. **If Dine-in selected:**
   - Skip payment verification
   - `paymentMethod` = 'pending'
   - `fulfillmentType` = 'dine_in'
   - Order submitted → "Proceed to counter for payment" (existing flow)
4. **If Takeout/Delivery selected:**
   - Show payment method options (GCash/PayMaya)
   - User pays and uploads proof
   - `paymentMethod` = 'e-wallet'
   - `fulfillmentType` = 'takeout' or 'delivery'
   - Order submitted with `status` = 'pending_payment'
   - Awaits cashier verification

## ✅ Clarified Implementation Requirements

### **Key Decisions Made:**
1. ✅ **Payment Flow**: User pays BEFORE submitting order, cashier only verifies proof
2. ✅ **Stay on Page**: All payment/upload happens on SelfCheckout page - no redirects
3. ✅ **Proof Options**: User can provide image upload OR text reference OR both (flexible)
4. ✅ **Order Status**: `['pending_payment', 'payment_verified', 'preparing', 'ready', 'completed', 'cancelled']`
5. ✅ **Timeout Timer**: 2-hour timeout with visual warnings (recommended: YES, include it)
6. ✅ **Wallet Settings**: Static QR images uploaded by admin via new Settings page
7. ✅ **Payment Methods**: Enable/disable GCash/PayMaya individually
8. ✅ **Dashboard Integration**: Verification dashboard integrated into main Dashboard (toggle like Revenue Reports)
9. ✅ **POS Strategy**: Show unverified orders with blocking + visual indicators (Option A)
10. ✅ **Real-time Updates**: Socket.io WebSocket (no polling!)

## Proposed Implementation

### 1. Backend Model Updates

#### Order Schema Extensions (`models/Order.js`)
```javascript
// Add new field to distinguish order fulfillment type
fulfillmentType: {
  type: String,
  enum: ['dine_in', 'takeout', 'delivery'],
  required: true,
  default: 'dine_in'
},

// Add to existing Order model after paymentDetails
proofOfPayment: {
  imageUrl: String,                    // Path to uploaded screenshot (optional)
  transactionReference: String,        // Reference number (optional)
  accountName: String,                 // Account name for text reference (optional)
  uploadedAt: Date,                    // When proof was uploaded
  verificationStatus: {
    type: String,
    enum: ['pending', 'verified', 'rejected'],
    default: 'pending'
  },
  verifiedAt: Date,                    // When admin/cashier verified
  verifiedBy: {                        // Staff who verified
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  verificationNotes: String,           // Admin notes/rejection reason
  expiresAt: Date                      // Timeout timestamp (2 hours from creation)
},

// Update status enum to match new workflow
status: {
  type: String,
  enum: ['pending_payment', 'payment_verified', 'preparing', 'ready', 'completed', 'cancelled'],
  default: 'pending_payment'
},

// Add cancellation tracking
cancelledAt: Date,
cancellationReason: String
```

#### Settings Model Extensions (`models/Settings.js`)
```javascript
// Add after pos settings section
merchantWallets: {
  gcash: {
    enabled: { type: Boolean, default: true },
    accountNumber: String,
    accountName: String,
    qrCodeUrl: String              // Path to uploaded QR image
  },
  paymaya: {
    enabled: { type: Boolean, default: true },
    accountNumber: String,
    accountName: String,
    qrCodeUrl: String              // Path to uploaded QR image
  }
},

// Payment verification settings
paymentVerification: {
  timeoutMinutes: { type: Number, default: 120 },  // 2 hours default
  autoCancel: { type: Boolean, default: true },
  warningThresholds: {
    yellow: { type: Number, default: 60 },         // 1 hour remaining
    orange: { type: Number, default: 30 },         // 30 min remaining
    red: { type: Number, default: 15 }             // 15 min remaining
  }
}
```

### 2. Frontend Components

#### New Components to Create (in `src/components/`)
- **`OrderTypeSelector.jsx`** - Choose Dine-in OR Takeout/Delivery (NEW - CRITICAL)
- `PaymentMethodSelector.jsx` - Choose Cash/GCash/PayMaya (only for takeout/delivery)
- `PaymentInstructionsModal.jsx` - Display merchant wallet details & QR code
- `ProofOfPaymentUpload.jsx` - Flexible proof input (image OR text OR both)
- `PaymentVerificationDashboard.jsx` - Cashier/admin verification interface
- `OrderTimeoutTimer.jsx` - Countdown timer with color-coded warnings
- `PaymentSettings.jsx` - Admin page for wallet configuration

#### Updated Components (Existing Files)
- `SelfCheckout.jsx` - Integrate payment flow (stay on same page throughout)
- `Dashboard.jsx` - Add toggle for Payment Verification (like RevenueReports toggle)
- `PointofSale.jsx` - Add payment status badges, blocking logic for unverified orders
- `DashboardMinimal.jsx` - May need payment verification metrics widget

### 3. API Endpoints

#### New Routes (to add to `routes/orderRoutes.js`)
```javascript
POST   /api/orders/:id/upload-proof          # Upload payment proof (image or text)
PUT    /api/orders/:id/verify-payment        # Cashier/admin verification
PUT    /api/orders/:id/reject-payment        # Reject payment with reason
GET    /api/orders/pending-verification      # Get orders awaiting verification
GET    /api/orders/:id/verification-status   # Check specific order status
POST   /api/orders/:id/extend-timeout        # Admin extends timeout (future)
```

#### New Routes (to add to `routes/settingsRoutes.js`)
```javascript
PUT    /api/settings/merchant-wallets        # Update GCash/PayMaya settings
POST   /api/settings/merchant-wallets/qr     # Upload QR code images
GET    /api/settings/merchant-wallets        # Get current wallet settings
PUT    /api/settings/payment-verification    # Update timeout/warning settings
```

#### File Upload Configuration (extend `config/multer.js`)
- Leverage existing multer setup (already configured)
- Add new destination: `public/uploads/payment-proofs/` (for payment screenshots)
- Add new destination: `public/uploads/qr-codes/` (for merchant QR codes)
- Validate: image files only (jpeg, png, webp), max 5MB
- Generate unique filenames: `payment-proof-{orderId}-{timestamp}.{ext}`
- Existing structure already handles menu images in `public/uploads/menu/`

### 4. User Flow

#### Self-Checkout Process (All on `SelfCheckout.jsx` page)
1. **Item Selection** → Add items to cart (existing functionality)
2. **🆕 Order Type Selection** → Choose: **[Dine-in]** or **[Takeout/Delivery]**
3. **Branch Based on Order Type:**

**Path A: Dine-in Selected** (Traditional Flow - No Changes)
- Skip payment verification entirely
- Submit order with `fulfillmentType: 'dine_in'`, `paymentMethod: 'pending'`
- Show message: "Proceed to counter for payment"
- Order appears in POS immediately (existing behavior)

**Path B: Takeout/Delivery Selected** (New Payment Verification Flow)
1. **Payment Method Selection** → Choose GCash or PayMaya
2. **Payment Instructions** → Modal shows wallet details & QR code
3. **User Pays** → Transfer money via their GCash/PayMaya app
4. **Proof Upload** → Upload screenshot OR enter reference (flexible)
5. **Order Submission** → Create order with:
   - `fulfillmentType: 'takeout'` or `'delivery'`
   - `paymentMethod: 'e-wallet'`
   - `status: 'pending_payment'`
6. **Timeout Timer Starts** → 2-hour countdown displayed on page
7. **Confirmation** → Show order number, "Awaiting verification" message
8. **Wait for Verification** → Timer shows remaining time with color warnings

#### Cashier Verification Process (Via Dashboard)
1. **Dashboard Access** → Navigate to "Payment Verification" section (toggle)
2. **View Pending List** → See all orders awaiting verification
3. **Select Order** → Click to view details
4. **Review Proof** → Check uploaded image OR text reference
5. **Cross-verify** → Check GCash/PayMaya merchant app for actual transaction
6. **Approve** → Mark as `payment_verified` → Order appears in POS
7. **Reject** → Mark as `rejected`, add reason → Notify customer
8. **Real-time Update** → POS and customer see status change immediately (Socket.io)

### 5. Order Status Workflow

**DINE-IN ORDERS** (Traditional Flow - Unchanged):
```
pending (submitted from SelfCheckout)
    ↓ [payment at counter in POS]
received (payment processed at counter)
    ↓ [kitchen processes]
preparing → ready → completed
```

**TAKEOUT/DELIVERY ORDERS** (New Verification Flow):
```
pending_payment (initial status for e-wallet orders)
    ↓ [proof uploaded - automatic]
pending_payment (with proofOfPayment data)
    ↓ [cashier verifies payment]
payment_verified (order now visible in POS)
    ↓ [POS processes order]
preparing (kitchen making order)
    ↓ [order completed]
ready (ready for pickup/delivery)
    ↓ [customer receives order]
completed

ALTERNATE PATHS:
pending_payment → [timeout exceeded] → cancelled (auto-cancel after 2 hours)
pending_payment → [cashier rejects] → cancelled (manual rejection)
```

**Status Definitions:**
- `pending`: Dine-in order awaiting counter payment (traditional flow)
- `pending_payment`: Takeout/delivery e-wallet order awaiting verification
- `payment_verified`: Payment confirmed, ready for kitchen processing
- `preparing`: Kitchen is making the order
- `ready`: Order completed, ready for pickup/delivery
- `completed`: Customer received order
- `cancelled`: Timeout or rejected payment

### 6. Security Considerations

#### File Upload Security
- File type validation (images only)
- Size limits (max 5MB)
- Unique filename generation
- Secure file storage path
- Image processing (resize/compress)

#### Admin Access Control
- Role-based access to verification dashboard
- Audit trail for all verification actions
- Admin authentication required

#### Data Privacy
- Secure storage of payment proofs
- Admin-only access to uploaded images
- Optional data retention policies

### 7. UI/UX Design Considerations

#### Mobile-First Design
- Responsive upload interface
- Touch-friendly file selection
- Mobile camera integration (future)

#### Admin Dashboard
- Filter by payment method, date, status
- Bulk actions for multiple orders
- Image preview modal
- Search by order number/reference

#### User Experience
- Clear step-by-step payment process
- Progress indicators
- Error handling for failed uploads
- Real-time status updates

### 8. Technical Implementation Details

#### Frontend State Management
- Add payment flow state to SelfCheckout
- Integrate with existing CartContext
- Handle file upload progress

#### Backend Validation
- Order status validation (can't verify non-pending orders)
- File upload validation
- Admin permission checks

#### Database Indexes
- Index on `status` for pending payment queries
- Index on `createdAt` for date filtering
- Index on `proofOfPayment.verificationStatus`

### 9. Testing Strategy

#### Unit Tests
- File upload validation
- Order status transitions
- Payment verification logic

#### Integration Tests
- Full payment flow (user → admin → completion)
- File upload and storage
- Admin dashboard functionality

#### User Acceptance Testing
- Mobile device testing
- Various image formats
- Network connectivity issues

### 10. Deployment Considerations

#### Database Migration
- Add new fields to existing Order documents
- Update Settings with wallet configuration
- Data migration for existing pending orders

#### File Storage
- Setup upload directory structure
- Configure static file serving
- Backup strategy for uploaded files

#### Rollback Plan
- Feature flag to disable manual payments
- Fallback to existing POS payment flow
- Data cleanup procedures

## ✅ All Key Decisions Made

### **Implementation Decisions:**
1. ✅ **File Storage**: Local filesystem (`public/uploads/payment-proofs/`)
2. ✅ **Image Processing**: No compression for now (future enhancement)
3. ✅ **QR Codes**: Static images uploaded by admin
4. ✅ **Notification System**: Socket.io real-time updates (no polling)
5. ✅ **Verification Roles**: Admin & Cashiers (position-based access)
6. ✅ **Order Timeout**: 2 hours (configurable in settings)
7. ✅ **Timeout Action**: Auto-cancel with warnings at 60/30/15 min
8. ✅ **Bulk Verification**: No - individual review only
9. ✅ **Audit Trail**: Log all verifications with user, timestamp, notes
10. ✅ **Proof Options**: Image OR text OR both (flexible, at least one required)

### **Integration Decisions:**
11. ✅ **Verification Dashboard**: Integrated into main Dashboard (toggle like Revenue Reports)
12. ✅ **POS Display Strategy**: Show all orders, block unverified ones (Option A)
13. ✅ **Self-Checkout Flow**: All steps on same page, no redirects
14. ✅ **Payment Methods**: Enable/disable GCash/PayMaya individually via settings
15. ✅ **Real-time Updates**: WebSocket (Socket.io) for instant status changes

### **Outstanding Items (For Later):**
- Mobile camera integration (future enhancement)
- Offline support (future enhancement)
- Admin timeout extension (future enhancement)
- Email/SMS notifications (future enhancement)
- Image compression/resize (future enhancement)

## 🚀 Implementation Phases

### **Phase 1: Backend Foundation** (Start Here)
**Files to modify:**
- `models/Order.js` - Add **fulfillmentType** field, proofOfPayment fields, update status enum, add timeout logic
- `models/Settings.js` - Add merchantWallets and paymentVerification settings
- `config/multer.js` - Extend to handle payment-proofs/ and qr-codes/ directories
- `routes/orderRoutes.js` - Add upload-proof, verify-payment, pending-verification endpoints
- `routes/settingsRoutes.js` - Add merchant-wallets management endpoints
- `controllers/orderController.js` - Create verification logic (new file or extend existing)
- `controllers/settingsController.js` - Add wallet settings handlers

**Deliverables:**
- ✅ Database models updated with fulfillmentType and payment verification fields
- ✅ API endpoints for proof upload and verification
- ✅ File upload configured for payment proofs and QR codes
- ✅ Settings API for merchant wallet configuration

---

### **Phase 2: Real-time Infrastructure & Self-Checkout**
**Files to create:**
- **`src/components/OrderTypeSelector.jsx`** - Dine-in vs Takeout/Delivery selector (CRITICAL)
- `src/components/PaymentMethodSelector.jsx` - Payment method picker (for takeout/delivery only)
- `src/components/PaymentInstructionsModal.jsx` - Wallet details + QR display
- `src/components/ProofOfPaymentUpload.jsx` - Flexible proof input component
- `src/components/OrderTimeoutTimer.jsx` - Countdown timer with warnings

**Files to modify:**
- `ring-and-wing-backend/server.js` - Add Socket.io setup
- `src/SelfCheckout.jsx` - Add order type selection, integrate conditional payment flow
- Create `src/services/socketService.js` - Socket.io client wrapper

**Deliverables:**
- ✅ Order type selector (dine-in vs takeout/delivery)
- ✅ Socket.io WebSocket setup (backend & frontend)
- ✅ Conditional payment flow based on order type
- ✅ Proof upload integrated into SelfCheckout (takeout/delivery only)
- ✅ Timeout timer with visual warnings
- ✅ Real-time event system ready

---

### **Phase 3: Verification Dashboard & Settings**
**Files to create:**
- `src/components/PaymentVerificationDashboard.jsx` - Detailed verification interface
- `src/components/PaymentSettings.jsx` - Admin wallet settings page

**Files to modify:**
- `src/Dashboard.jsx` - Add Payment Verification toggle (like Revenue Reports pattern)
- `src/components/DashboardMinimal.jsx` - Add pending payments widget (optional)

**UI Pattern to Follow:**
```javascript
// Follow RevenueReportsPage.jsx pattern
<div className="toggle-buttons">
  <button onClick={() => setActiveTab('overview')}>Overview</button>
  <button onClick={() => setActiveTab('payments')}>Payment Verification</button>
</div>

{activeTab === 'payments' && <PaymentVerificationDashboard />}
```

**Verification Dashboard Design (Like ReceiptHistory.jsx):**
- Similar layout: filters, search, list view
- Date filters: [All] [Today] [Week] [Month]
- Payment method filter: [All] [GCash] [PayMaya]
- Search by: Order number, customer name, reference number
- List view with order cards showing:
  - Order number, amount, time remaining
  - Payment proof preview (image thumbnail OR reference text)
  - Customer details
  - [View Details] [Verify] [Reject] buttons
- Detail modal: Full payment proof view, order items, verification notes

**Purpose:**
- **Quick verifications:** Done in POS "Dine/Take-outs" tab
- **Detailed review:** Done in Dashboard verification interface
- **Reporting/History:** View all verification activity
- **Complex cases:** Review multiple proofs, add detailed notes

**Deliverables:**
- ✅ Verification dashboard integrated into Dashboard (like Revenue Reports)
- ✅ Consistent UI pattern with existing features
- ✅ Admin settings page for wallet configuration
- ✅ Real-time updates in verification dashboard
- ✅ Proof preview and approval/rejection workflow
- ✅ Verification history and reporting

---

### **Phase 4: POS Integration & Testing**
**Files to modify:**
- `src/PointofSale.jsx` - Add new "Dine/Take-outs" tab with quick verification
- `src/components/PendingOrder.jsx` - No changes needed (only for editable drafts)

**Critical POS Changes:**
1. **Order View Tabs (Updated):**
   ```
   Before: [Ready Orders] [Pending Orders]
   
   After:  [Ready Orders] [Pending Orders] [Dine/Take-outs] ← NEW
   ```

2. **New "Dine/Take-outs" Tab:**
   - Shows ALL takeout/delivery orders (both verified and unverified)
   - Quick verification interface (no need to go to Dashboard for simple cases)
   - Display order details + payment proof (image OR reference)
   - Actions: [View Full Details] [Verify ✓] [Reject ✗]
   - For complex cases: link to full verification dashboard

3. **Order Display Logic:**
   ```
   Ready Orders: Immediate orders ready to cook (dine-in + verified takeout/delivery)
   Pending Orders: Editable draft orders (unchanged)
   Dine/Take-outs: All takeout/delivery orders (verified + awaiting verification)
   ```

4. **Quick Verification in POS:**
   - Cashier sees payment proof directly in order card
   - One-click verify/reject buttons
   - No navigation needed for straightforward verifications
   - Full dashboard available for detailed review if needed

**Deliverables:**
- ✅ Add "Dine/Take-outs" tab to POS
- ✅ Show payment proof inline (image preview OR text reference)
- ✅ Quick verify/reject actions in POS
- ✅ Verified orders remain visible (show "VERIFIED" badge)
- ✅ Unverified orders show "AWAITING VERIFICATION" status
- ✅ Link to full verification dashboard for detailed review
- ✅ Dine-in orders completely unaffected
- ✅ POS "Pending Orders" tab unchanged (only editable drafts)

**Testing:**
- ✅ **Dine-in flow:** SelfCheckout → Counter Payment → POS (traditional - no verification)
- ✅ **Takeout/Delivery flow:** SelfCheckout → Upload → Verify → POS → Kitchen
- ✅ Timeout scenarios (warnings, auto-cancel)
- ✅ Real-time updates across all interfaces
- ✅ Mobile responsiveness
- ✅ Role-based access control
- ✅ Security audit (file upload, authentication)

## Success Metrics

- Reduction in payment processing time
- User satisfaction with payment process
- Admin efficiency in verification
- Error rate in payment processing
- System reliability and uptime

---

## 🎯 Technical Implementation Details

### **Socket.io Event Structure**

**Backend Events (Emit):**
```javascript
io.emit('paymentVerified', { orderId, receiptNumber, verifiedBy })
io.emit('paymentRejected', { orderId, receiptNumber, reason })
io.emit('orderTimeout', { orderId, receiptNumber })
io.emit('newPendingPayment', { orderId, receiptNumber, amount, provider })
```

**Frontend Listeners:**
```javascript
// In PaymentVerificationDashboard.jsx
socket.on('newPendingPayment', (data) => { /* refresh list */ })
socket.on('paymentVerified', (data) => { /* remove from pending */ })

// In PointofSale.jsx
socket.on('paymentVerified', (data) => { /* add to active orders */ })

// In SelfCheckout.jsx (user view)
socket.on('paymentVerified', (data) => { /* show success message */ })
socket.on('paymentRejected', (data) => { /* show rejection reason */ })
```

### **File Upload Flow**

1. **Payment Proof Upload:**
   ```
   User selects file → Frontend validates (type, size) → POST /api/orders/:id/upload-proof
   → Multer handles upload → Save to /public/uploads/payment-proofs/
   → Update Order.proofOfPayment.imageUrl → Return success
   ```

2. **QR Code Upload (Admin):**
   ```
   Admin selects file → POST /api/settings/merchant-wallets/qr
   → Multer handles upload → Save to /public/uploads/qr-codes/
   → Update Settings.merchantWallets.{provider}.qrCodeUrl → Return success
   ```

### **Database Indexes for Performance**

Add to `models/Order.js`:
```javascript
orderSchema.index({ status: 1, createdAt: -1 });
orderSchema.index({ 'proofOfPayment.verificationStatus': 1 });
orderSchema.index({ 'proofOfPayment.expiresAt': 1 });
orderSchema.index({ orderType: 1, paymentMethod: 1 });
```

### **Timeout Cleanup Job**

Create `services/orderTimeoutService.js`:
```javascript
// Runs every 5 minutes, checks for expired orders
// Auto-cancels orders where proofOfPayment.expiresAt < now
// Emits 'orderTimeout' socket event
```

---

## 🗂️ Current Codebase Structure

### **Backend Files:**
- ✅ `models/Order.js` - Exists, needs payment verification fields
- ✅ `models/Settings.js` - Exists, needs merchant wallet settings
- ✅ `config/multer.js` - Exists, needs payment-proofs destination
- ✅ `routes/orderRoutes.js` - Exists, needs verification endpoints
- ✅ `routes/settingsRoutes.js` - Exists, needs wallet endpoints
- ✅ `server.js` - Exists, needs Socket.io setup

### **Frontend Files:**
- ✅ `src/SelfCheckout.jsx` - Exists, needs payment flow integration
- ✅ `src/Dashboard.jsx` - Exists, uses DashboardMinimal component
- ✅ `src/PointofSale.jsx` - Large file (2015 lines), needs payment status logic
- ✅ `src/components/DashboardMinimal.jsx` - Exists, may need payment metrics
- ✅ `src/components/PendingOrder.jsx` - Exists, may need payment status
- ❌ Payment verification components (to be created)

---

## Clarified Requirements & Detailed Recommendations

### ✅ **Agreed Points**
- **Local File Storage**: Simpler for initial implementation, can migrate to cloud later
- **Static QR Codes**: Easier management, store as image files in settings
- **POS Notifications**: Real-time updates when payments are verified
- **Admin & Cashier Access**: Both roles can verify payments
- **1-Hour Timeout**: Reasonable window for payment verification
- **No Bulk Operations**: Individual review prevents oversight in small cafe

### 💡 **Additional Requirements**
- **Flexible Proof Input**: Users can choose image upload OR text reference (account name + number) - **ONE CHOICE ONLY**
- **Separate Verification Dashboard**: Dedicated interface for cashiers (not integrated into POS)
- **POS Order Blocking**: Orders cannot be processed until `payment_verified` status
- **Visual Warnings**: Timeout warnings for both users and staff
- **Status Indicators**: Clear visual status for verified vs unverified payments in POS

### 🎯 **My Recommendations**

#### 1. **Proof Input Choice**
**Implementation**: Radio button selection between "Upload Image" or "Enter Reference"
**Backend**: Validation ensures only one method is provided
**UI**: Clear toggle between the two input modes

#### 2. **Timeout Warnings**
**User Side**: 
- Self-checkout shows countdown timer
- Warning message when < 15 minutes remain
- Red styling when < 5 minutes remain

**Staff Side**:
- Verification dashboard shows expiration time
- Color-coded urgency (yellow > 30min, orange > 15min, red > 5min)
- Auto-refresh to show current status

#### 3. **POS Status Indicators**
**Implementation**:
- Payment status column in order list
- Color coding: 🔴 Pending, 🟡 Verifying, 🟢 Verified
- Tooltip showing verification details
- Filter options for payment status

#### 4. **Delivery/Takeout Focus**
**Current POS Limitation**: Designed for dine-in only
**Future POS Changes**: Will need modifications for delivery/takeout order types
**Current Scope**: Focus on payment verification workflow first

### 🎯 **Detailed Recommendations**

#### 1. **Proof Input Flexibility**
**Implementation:**
```jsx
<ProofOfPaymentUpload>
  <RadioGroup>
    <Radio value="image">Upload Screenshot</Radio>
    <Radio value="text">Enter Reference Number</Radio>
    <Radio value="both">Both (Recommended)</Radio>
  </RadioGroup>
  
  {/* Show relevant inputs based on selection */}
  {showImageUpload && <FileUploader />}
  {showTextInput && <ReferenceForm />}
</ProofOfPaymentUpload>
```

**Backend Validation:**
```javascript
// At least one method required
if (!proofOfPayment.imageUrl && !proofOfPayment.transactionReference) {
  return res.status(400).json({ error: 'Please provide proof of payment' });
}
```

#### 2. **Verification Dashboard Integration**
**Why Integrated:** 
- Cashiers already use Dashboard for other tasks
- Consistent UI/UX with Revenue Reports toggle pattern
- No separate navigation needed

**Implementation in `Dashboard.jsx`:**
```jsx
<div className="dashboard-toggles">
  <button onClick={() => setView('overview')}>Overview</button>
  <button onClick={() => setView('revenue')}>Revenue Reports</button>
  <button onClick={() => setView('payments')}>Payment Verification</button>
</div>

{view === 'payments' && <PaymentVerificationDashboard />}
```

#### 3. **POS Integration Strategy** (Updated - Two-Level Approach!)

**NEW POS Tab Structure:**
```
POS Tabs:
[Ready Orders] [Pending Orders] [Dine/Take-outs] ← NEW
```

**Tab Purposes:**
- **Ready Orders:** Immediate dine-in orders ready to cook
- **Pending Orders:** Editable draft orders (unchanged)
- **Dine/Take-outs:** All takeout/delivery orders (quick verification interface)

**"Dine/Take-outs" Tab Display:**
```
┌─────────────────────────────────────────────────────────────┐
│  Dine/Take-outs Orders                                       │
├─────────────────────────────────────────────────────────────┤
│  ⏳ #124 | 📦 Takeout | GCash | ₱320 (45 min left)         │
│  Payment Proof: [Screenshot Preview] OR Ref: 1234567890     │
│  [View Details] [✓ Verify] [✗ Reject]                      │
├─────────────────────────────────────────────────────────────┤
│  ✅ #126 | 🚚 Delivery | PayMaya | ₱450 ✓ VERIFIED         │
│  Verified by: Ana (2 min ago)                               │
│  [Process to Kitchen] [View Details]                        │
├─────────────────────────────────────────────────────────────┤
│  ⏳ #130 | 📦 Takeout | GCash | ₱280 (15 min left) 🔴      │
│  Payment Proof: Account: Juan Cruz, Ref: 9876543210         │
│  [View Details] [✓ Verify] [✗ Reject]                      │
└─────────────────────────────────────────────────────────────┘
```

**Two-Level Verification Approach:**

**Level 1: Quick Verification (POS "Dine/Take-outs" Tab)**
- For straightforward cases
- See payment proof inline
- One-click verify/reject
- No navigation needed
- Typical use: Clear screenshot or obvious reference number

**Level 2: Detailed Verification (Dashboard)**
- For complex cases
- Full-screen proof preview
- Add verification notes
- View customer history
- Compare multiple proofs
- Typical use: Unclear proof, need more investigation

**Code Logic:**
```javascript
// Get orders for "Dine/Take-outs" tab
function getDineTakeoutOrders() {
  return orders.filter(order => 
    order.fulfillmentType === 'takeout' || 
    order.fulfillmentType === 'delivery'
  ).sort((a, b) => {
    // Sort unverified first, then by urgency
    if (a.status === 'pending_payment' && b.status !== 'pending_payment') return -1;
    if (a.status !== 'pending_payment' && b.status === 'pending_payment') return 1;
    return a.proofOfPayment?.expiresAt - b.proofOfPayment?.expiresAt;
  });
}
```

**Why This Approach:**
- ✅ **Efficient workflow** - Most verifications done in POS (no context switching)
- ✅ **Flexible** - Dashboard available for complex cases
- ✅ **Familiar pattern** - Like ReceiptHistory in Revenue Reports
- ✅ **Clean separation** - Pending orders tab unchanged
- ✅ **Better visibility** - Cashiers see takeout/delivery orders in one place
- ✅ **Progressive disclosure** - Simple interface → detailed interface as needed

#### 4. **Timeout Warning System**
**Color Coding:**
```javascript
const getTimeoutColor = (remainingMinutes) => {
  if (remainingMinutes > 60) return 'green';   // > 1 hour
  if (remainingMinutes > 30) return 'yellow';  // 30-60 min
  if (remainingMinutes > 15) return 'orange';  // 15-30 min
  return 'red';                                 // < 15 min
};
```

**User Warnings:**
```jsx
<OrderTimeoutTimer expiresAt={order.proofOfPayment.expiresAt}>
  {remainingTime > 15 && <span className="text-yellow">Order expires in {remainingTime} min</span>}
  {remainingTime <= 15 && <span className="text-red animate-pulse">⚠️ URGENT: Order expires in {remainingTime} min!</span>}
</OrderTimeoutTimer>
```

**Cashier Dashboard:**
- Sort by expiration time (most urgent first)
- Red badge for < 15 min remaining
- Auto-remove expired orders from list

#### 5. **Real-time Updates (Socket.io)**
**Setup Effort:** ~2 hours initial setup

**Backend (`server.js`):**
```javascript
const socketIo = require('socket.io');
const io = socketIo(server, { cors: { origin: FRONTEND_URL } });

io.on('connection', (socket) => {
  console.log('Client connected');
  
  // Auth check
  socket.on('authenticate', (token) => {
    // Verify JWT token
  });
});

// In verification endpoint
io.emit('paymentVerified', { orderId, receiptNumber });
```

**Frontend:**
```javascript
import io from 'socket.io-client';

const socket = io(API_URL);

useEffect(() => {
  socket.on('paymentVerified', (data) => {
    // Update UI immediately
  });
  
  return () => socket.disconnect();
}, []);
```

**Benefits:**
- ✅ Instant updates (no 30s polling lag)
- ✅ Better UX for users and staff
- ✅ Lower server load
- ✅ Scales better

---

## 🎨 UI/UX Design Patterns (From Plan)

---

## 📱 Payment Verification Dashboard Design (Reference)
```
┌─────────────────────────────────────────────────────────────┐
│  PAYMENT VERIFICATION DASHBOARD                    [Logout] │
├─────────────────────────────────────────────────────────────┤
│  ┌─ Filters ─────────────────────────────────────────────┐ │
│  │ Status: [All ▼] [Pending] [Verified] [Rejected]       │ │
│  │ Time: [Last Hour] [Today] [Last 24h] [All]            │ │
│  │ Search: [___________________________] 🔍              │ │
│  └────────────────────────────────────────────────────────┘ │
├─────────────────────────────────────────────────────────────┤
│  ┌─ Pending Payments (3) ──────────────────────────────┐   │
│  │┌─────────────────────────────────────────────────────┐│   │
│  ││ 🔔 Order #RNG-123456 (23 min left)                 ││   │
│  ││ Amount: ₱450.00 | GCash | 11:30 AM                 ││   │
│  ││ 👤 Customer: Juan Dela Cruz                        ││   │
│  ││ 📝 Items: 2x Wings, 1x Fries                       ││   │
│  ││ └─ [View Details] [Verify] [Reject] ──────────────┘│   │
│  ├─────────────────────────────────────────────────────┤   │
│  │ 🔔 Order #RNG-123457 (45 min left)                  │   │
│  │ Amount: ₱275.00 | PayMaya | 11:15 AM                │   │
│  │ 👤 Customer: Maria Santos                           │   │
│  │ 📝 Items: 1x Combo Meal                             │   │
│  │ └─ [View Details] [Verify] [Reject] ────────────────┘   │
│  └─────────────────────────────────────────────────────────┘ │
├─────────────────────────────────────────────────────────────┤
│  ┌─ Recently Verified (2) ─────────────────────────────┐   │
│  │ ✅ Order #RNG-123455 (Verified 2 min ago)           │   │
│  │ Amount: ₱320.00 | GCash | Verified by: Ana (Cashier)│   │
│  │ └─ [View Details] ───────────────────────────────────┘   │
│  └─────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────┘
```

### **Modal: Payment Verification Details**
```
┌─ Payment Verification: Order #RNG-123456 ──────────────────┐
│                                                                 │
│  ┌─ Order Summary ──────────────────────────────────────────┐  │
│  │ Receipt: RNG-123456-789                                 │  │
│  │ Amount: ₱450.00                                         │  │
│  │ Method: GCash                                            │  │
│  │ Time: Today 11:30 AM                                     │  │
│  │ Expires: 12:30 PM (23 min left)                         │  │
│  └─────────────────────────────────────────────────────────┘  │
│                                                                 │
│  ┌─ Customer Details ───────────────────────────────────────┐  │
│  │ Name: Juan Dela Cruz                                     │  │
│  │ Items: 2x Buffalo Wings (₱220), 1x Fries (₱45)         │  │
│  │ Total: ₱450.00                                          │  │
│  └─────────────────────────────────────────────────────────┘  │
│                                                                 │
│  ┌─ Payment Proof ──────────────────────────────────────────┐  │
│  │ 📷 Image Proof:                                          │  │
│  │ [Screenshot Preview]                                     │  │
│  │ └─ [View Full Size] ─────────────────────────────────────┘  │
│  │                                                           │  │
│  │ OR                                                        │  │
│  │                                                           │  │
│  │ 📝 Text Reference:                                        │  │
│  │ Account: Juan D. Cruz                                    │  │
│  │ Reference: 1234567890                                     │  │
│  └─────────────────────────────────────────────────────────┘  │
│                                                                 │
│  ┌─ Verification Actions ───────────────────────────────────┐  │
│  │ [✓ VERIFY PAYMENT] [✗ REJECT PAYMENT]                   │  │
│  └─────────────────────────────────────────────────────────┘  │
│                                                                 │
│  *Reject Reason (if rejecting):                               │  │
│  [________________________________________________________]   │  │
│                                                                 │
│  [Cancel] [Submit Verification]                               │  │
└─────────────────────────────────────────────────────────────┘
```

### **Key Design Principles**
1. **Streamlined**: Clean, minimal interface focused on verification tasks
2. **Urgency Indicators**: Clear time remaining with color coding
3. **Quick Actions**: One-click verify/reject from main list
4. **Status Overview**: Separate sections for pending vs verified
5. **Mobile Friendly**: Responsive design for tablet use
6. **Real-time Updates**: Auto-refresh every 30 seconds

### **Color Coding System**
- 🔴 **Red**: < 15 minutes remaining (urgent)
- 🟠 **Orange**: 15-30 minutes remaining (warning)  
- 🟡 **Yellow**: 30-60 minutes remaining (normal)
- 🟢 **Green**: Verified payments
- ⚪ **Gray**: Rejected payments

### **Navigation & Access**
- Accessible via Dashboard toggle (like Revenue Reports)
- Requires cashier or admin role
- Quick access button from main POS (future integration)
- Real-time auto-refresh

---

### **Phase 1: Backend Foundation** 🔄
- [ ] Add `fulfillmentType` field to `models/Order.js` (dine_in/takeout/delivery)
- [ ] Update `models/Order.js` with proofOfPayment fields
- [ ] Update `models/Settings.js` with merchantWallets
- [ ] Extend `config/multer.js` for payment-proofs directory
- [ ] Add verification endpoints to `routes/orderRoutes.js`
- [ ] Add wallet settings endpoints to `routes/settingsRoutes.js`
- [ ] Create `controllers/paymentVerificationController.js`
- [ ] Add database indexes for performance
- [ ] Test all new endpoints with Postman

### **Phase 2: Real-time & Self-Checkout** 🔄
- [ ] Install socket.io on backend
- [ ] Setup Socket.io in `server.js`
- [ ] Install socket.io-client on frontend
- [ ] Create `services/socketService.js`
- [ ] **Create `OrderTypeSelector.jsx` (Dine-in vs Takeout/Delivery)**
- [ ] Create `PaymentMethodSelector.jsx` (shown only for takeout/delivery)
- [ ] Create `PaymentInstructionsModal.jsx`
- [ ] Create `ProofOfPaymentUpload.jsx`
- [ ] Create `OrderTimeoutTimer.jsx`
- [ ] Integrate order type selection and conditional payment flow into `SelfCheckout.jsx`
- [ ] Test dine-in flow (traditional - no verification)
- [ ] Test takeout/delivery flow (payment verification)

### **Phase 3: Verification Dashboard** 🔄
- [ ] Create `PaymentVerificationDashboard.jsx` (follow ReceiptHistory.jsx pattern)
- [ ] Add filters: date range, payment method, search
- [ ] Add list view with order cards
- [ ] Add detail modal for full proof review
- [ ] Add verification notes capability
- [ ] Create `PaymentSettings.jsx` for admin
- [ ] Integrate into `Dashboard.jsx` with toggle (like Revenue Reports)
- [ ] Connect Socket.io listeners
- [ ] Add QR code upload functionality
- [ ] Test verification workflow end-to-end

### **Phase 4: POS Integration & Testing** 🔄
- [ ] Add "Dine/Take-outs" tab to `PointofSale.jsx`
- [ ] Display takeout/delivery orders with inline payment proof
- [ ] Add quick verify/reject buttons in order cards
- [ ] Show verification status badges (⏳ Awaiting / ✓ Verified)
- [ ] Add urgency indicators (color-coded time remaining)
- [ ] Add "View Full Details" link to verification dashboard
- [ ] Ensure verified orders can be processed to kitchen
- [ ] Do NOT modify `PendingOrder.jsx` (only for editable drafts)
- [ ] Test that POS "Pending Orders" tab only shows editable drafts
- [ ] Test quick verification workflow in POS
- [ ] Test detailed verification workflow in Dashboard
- [ ] Create timeout cleanup service
- [ ] Test dine-in flow (ensure no disruption)
- [ ] Test takeout/delivery verification flows
- [ ] Mobile responsiveness testing
- [ ] Security audit
- [ ] User acceptance testing
- [ ] Add fulfillment type badges to `PointofSale.jsx` (Dine-in/Takeout/Delivery)
- [ ] Add payment status badges for takeout/delivery orders
- [ ] Implement order blocking logic (only for unverified takeout/delivery)
- [ ] Add visual indicators (colors, icons)
- [ ] Add filter/sort for fulfillment type and payment status
- [ ] Create timeout cleanup service
- [ ] Test dine-in flow (ensure no disruption)
- [ ] Test takeout/delivery verification flow
- [ ] Mobile responsiveness testing
- [ ] Security audit
- [ ] User acceptance testingting
- [ ] Mobile responsiveness testing
- [ ] Security audit
- [ ] User acceptance testing

---

## 🚀 Ready to Start!

**Next Action:** Begin Phase 1 - Backend Model Updates

All requirements are clarified, codebase is analyzed, and the plan is complete. Ready to start implementation? 🎯