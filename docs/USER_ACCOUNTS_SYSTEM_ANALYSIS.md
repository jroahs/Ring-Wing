# User Accounts System - Complete Analysis & Implementation Plan

## 📋 Executive Summary

This document provides a comprehensive analysis of the current Ring & Wings self-checkout system and detailed recommendations for building a **customer user account system from scratch**. The accounts will be integrated directly into the self-checkout page to enable order persistence, delivery address management, and order status tracking.

---

## 🔍 Current System Analysis

### Existing Infrastructure

#### Frontend (React)
- **Main Component**: `SelfCheckout.jsx` (791 lines)
  - Cart management via `CartContext` and `useCart` hook
  - localStorage-based cart persistence (key: `ringwing_cart_v1`)
  - Payment flow integrated (PayMongo, GCash, PayMaya)
  - Order type selection (dine-in, takeout, delivery)
  - Socket.io integration for real-time updates
  - AI Assistant integration via `SelfCheckoutAIAssistant`

- **Cart System**: 
  - Context: `CartContext.jsx`
  - Hook: `useCart.js` (204 lines)
  - Features: Add/remove items, quantity updates, size selection
  - **Current Limitation**: Cart stored in localStorage only (not linked to any user)

- **Menu System**:
  - Context: `MenuContext.jsx`
  - Hook: `useMenu.js`
  - Real-time availability updates
  - Category-based navigation

#### Backend (Node.js/Express)
- **Order Model** (`models/Order.js`):
  ```javascript
  {
    receiptNumber: String (unique),
    items: Array,
    totals: Object,
    customerName: String (currently optional),
    paymentMethod: String,
    orderType: String (self_checkout, chatbot, pos),
    fulfillmentType: String (dine_in, takeout, delivery),
    proofOfPayment: Object,
    paymentGateway: Object (PayMongo integration),
    status: String,
    createdAt: Date,
    completedAt: Date
  }
  ```

- **User Model** (`models/User.js`):
  ```javascript
  {
    username: String,
    email: String,
    password: String (hashed),
    role: String (staff, manager),
    position: String (cashier, inventory, etc.),
    reportsTo: ObjectId
  }
  ```
  - **Current Limitation**: User model is for STAFF/ADMIN only, not customers

- **API Endpoints**:
  - `/api/orders` - POST (create), GET (list with filters)
  - `/api/orders/:id/upload-proof` - POST (payment proof upload)
  - `/api/auth/register` - POST (staff registration)
  - `/api/auth/login` - POST (staff login)

### Key Observations

1. ✅ **Cart Persistence Exists** - via localStorage
2. ❌ **No Customer Accounts** - users are anonymous
3. ✅ **Order Creation Works** - but orders not linked to customer accounts
4. ❌ **No Order History** - customers can't view past orders
5. ❌ **No Address Storage** - delivery addresses not saved
6. ✅ **Payment System Ready** - PayMongo, e-wallet flows complete
7. ✅ **Real-time Updates** - Socket.io infrastructure exists

---

## 🎯 Requirements & Goals

### Core Requirements
1. **Account Creation** - Simple sign-up directly on self-checkout page
2. **Order Persistence** - Link cart and orders to customer accounts
3. **Order Status Tracking** - Customers can view order progress
4. **Delivery Address Management** - Save multiple delivery addresses
5. **Order History** - View past orders and reorder capability
6. **Session Management** - Maintain login across browser sessions
7. **Guest Checkout** - Optional - allow ordering without account

### Non-Requirements
- ❌ No social login (Facebook, Google)
- ❌ No email verification initially
- ❌ No password reset flow (Phase 1)
- ❌ No loyalty/rewards program
- ❌ No third-party authentication

---

## 📊 Proposed Data Models

### 1. Customer Model (NEW)

```javascript
// models/Customer.js
const customerSchema = new mongoose.Schema({
  // Authentication
  phone: {
    type: String,
    required: true,
    unique: true,
    trim: true,
    match: /^(\+63|0)[0-9]{10}$/ // Philippine phone format
  },
  email: {
    type: String,
    sparse: true, // Optional but unique if provided
    trim: true,
    lowercase: true
  },
  password: {
    type: String,
    required: true,
    select: false // Don't return password in queries
  },
  
  // Profile
  firstName: {
    type: String,
    required: true,
    trim: true
  },
  lastName: {
    type: String,
    required: true,
    trim: true
  },
  
  // Account status
  isVerified: {
    type: Boolean,
    default: false
  },
  isActive: {
    type: Boolean,
    default: true
  },
  
  // Preferences
  defaultAddressId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'CustomerAddress'
  },
  
  // Metadata
  createdAt: {
    type: Date,
    default: Date.now
  },
  lastLogin: Date,
  
  // Statistics (for future use)
  totalOrders: {
    type: Number,
    default: 0
  },
  totalSpent: {
    type: Number,
    default: 0
  }
});

// Indexes for performance
customerSchema.index({ phone: 1 });
customerSchema.index({ email: 1 });
customerSchema.index({ createdAt: -1 });

// Virtual for full name
customerSchema.virtual('fullName').get(function() {
  return `${this.firstName} ${this.lastName}`;
});

// Password hashing (same as User model)
customerSchema.pre('save', async function(next) {
  if (!this.isModified('password')) return next();
  const bcrypt = require('bcryptjs');
  this.password = await bcrypt.hash(this.password, 12);
  next();
});

// Password comparison method
customerSchema.methods.comparePassword = async function(candidatePassword) {
  const bcrypt = require('bcryptjs');
  return bcrypt.compare(candidatePassword, this.password);
};

module.exports = mongoose.model('Customer', customerSchema);
```

### 2. Customer Address Model (NEW)

```javascript
// models/CustomerAddress.js
const customerAddressSchema = new mongoose.Schema({
  customerId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Customer',
    required: true,
    index: true
  },
  
  // Address type
  label: {
    type: String,
    enum: ['home', 'work', 'other'],
    default: 'home'
  },
  
  // Recipient information
  recipientName: {
    type: String,
    required: true,
    trim: true
  },
  recipientPhone: {
    type: String,
    required: true,
    trim: true
  },
  
  // Address details
  street: {
    type: String,
    required: true,
    trim: true
  },
  barangay: {
    type: String,
    required: true,
    trim: true
  },
  city: {
    type: String,
    required: true,
    trim: true,
    default: 'Manila'
  },
  province: {
    type: String,
    required: true,
    trim: true,
    default: 'Metro Manila'
  },
  postalCode: {
    type: String,
    trim: true
  },
  
  // Additional notes
  landmark: String,
  deliveryNotes: String,
  
  // Status
  isDefault: {
    type: Boolean,
    default: false
  },
  isActive: {
    type: Boolean,
    default: true
  },
  
  // Metadata
  createdAt: {
    type: Date,
    default: Date.now
  },
  lastUsed: Date
});

// Indexes
customerAddressSchema.index({ customerId: 1, isDefault: 1 });
customerAddressSchema.index({ customerId: 1, isActive: 1 });

// Ensure only one default address per customer
customerAddressSchema.pre('save', async function(next) {
  if (this.isDefault) {
    await this.constructor.updateMany(
      { customerId: this.customerId, _id: { $ne: this._id } },
      { $set: { isDefault: false } }
    );
  }
  next();
});

module.exports = mongoose.model('CustomerAddress', customerAddressSchema);
```

### 3. Updated Order Model

```javascript
// Add to existing Order model (models/Order.js)

// Add new field:
customerId: {
  type: mongoose.Schema.Types.ObjectId,
  ref: 'Customer',
  index: true,
  sparse: true // Allow null for guest orders
},

// Add delivery address reference
deliveryAddressId: {
  type: mongoose.Schema.Types.ObjectId,
  ref: 'CustomerAddress'
},

// Expand customer details for historical record
customerDetails: {
  name: String,
  phone: String,
  email: String
},

// Add delivery address snapshot (for historical record)
deliveryAddress: {
  recipientName: String,
  recipientPhone: String,
  street: String,
  barangay: String,
  city: String,
  province: String,
  postalCode: String,
  landmark: String,
  deliveryNotes: String
},

// Add new indexes:
orderSchema.index({ customerId: 1, createdAt: -1 });
orderSchema.index({ customerId: 1, status: 1 });
```

### 4. Customer Session/Cart Model (NEW - Optional)

```javascript
// models/CustomerCart.js
// For persisting cart server-side when user logs in

const customerCartSchema = new mongoose.Schema({
  customerId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Customer',
    required: true,
    unique: true,
    index: true
  },
  
  items: [{
    menuItemId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'MenuItem'
    },
    name: String,
    price: Number,
    quantity: Number,
    selectedSize: String,
    availableSizes: [String],
    pricing: mongoose.Schema.Types.Mixed,
    addedAt: {
      type: Date,
      default: Date.now
    }
  }],
  
  updatedAt: {
    type: Date,
    default: Date.now
  },
  
  expiresAt: {
    type: Date,
    default: () => Date.now() + 7 * 24 * 60 * 60 * 1000 // 7 days
  }
});

// Automatically update timestamp
customerCartSchema.pre('save', function(next) {
  this.updatedAt = Date.now();
  next();
});

// Auto-delete expired carts
customerCartSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

module.exports = mongoose.model('CustomerCart', customerCartSchema);
```

### 5. Order Status History Model (NEW - Optional)

```javascript
// models/OrderStatusHistory.js
// For tracking order status changes with timestamps

const orderStatusHistorySchema = new mongoose.Schema({
  orderId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Order',
    required: true,
    index: true
  },
  
  status: {
    type: String,
    required: true
  },
  
  changedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User', // Staff member who changed status
    sparse: true
  },
  
  changedByRole: {
    type: String,
    enum: ['system', 'staff', 'manager', 'customer']
  },
  
  notes: String,
  
  timestamp: {
    type: Date,
    default: Date.now
  }
});

orderStatusHistorySchema.index({ orderId: 1, timestamp: -1 });

module.exports = mongoose.model('OrderStatusHistory', orderStatusHistorySchema);
```

---

## 🏗️ Architecture & Integration Points

### Frontend Components Structure

```
SelfCheckout.jsx (Main Component)
│
├── Customer Authentication Section (NEW)
│   ├── LoginForm (NEW)
│   ├── SignupForm (NEW)
│   └── AccountMenu (NEW)
│
├── Menu Display (Existing)
│   └── MenuItem Cards
│
├── Cart Display (Existing)
│   └── Cart Items
│
├── Checkout Flow (Existing/Enhanced)
│   ├── OrderTypeSelector
│   ├── DeliveryAddressSelector (NEW)
│   ├── PaymentMethodSelector
│   └── ProofOfPaymentUpload
│
└── Order Status/History Section (NEW)
    ├── CurrentOrderStatus (NEW)
    └── OrderHistory (NEW)
```

### New Components to Create

#### 1. `components/customer/CustomerAuthModal.jsx`
```jsx
// Unified modal for login and signup
- Login tab
- Signup tab
- Phone number input (primary identifier)
- Password field
- Basic validation
- Integration with CustomerAuthContext
```

#### 2. `components/customer/CustomerAccountMenu.jsx`
```jsx
// Dropdown menu when logged in
- Welcome message with customer name
- View Profile
- Order History
- Delivery Addresses
- Logout
```

#### 3. `components/customer/DeliveryAddressSelector.jsx`
```jsx
// Address selection during checkout
- List saved addresses (radio buttons)
- "Add New Address" button
- Address form modal
- Set as default option
```

#### 4. `components/customer/AddressFormModal.jsx`
```jsx
// Form for adding/editing addresses
- Recipient name and phone
- Street, Barangay, City, Province
- Postal code
- Landmark (optional)
- Delivery notes (optional)
- Label (Home/Work/Other)
- Set as default checkbox
```

#### 5. `components/customer/OrderStatusCard.jsx`
```jsx
// Display current order status
- Order number
- Status badge with color coding
- Progress timeline
- Estimated time (if applicable)
- Real-time updates via Socket.io
```

#### 6. `components/customer/OrderHistoryModal.jsx`
```jsx
// Full order history view
- List of past orders
- Date, items, total
- Order status
- "Reorder" button
- "View Details" expandable
- Pagination/infinite scroll
```

### New Contexts to Create

#### 1. `contexts/CustomerAuthContext.jsx`
```javascript
// Customer authentication state management
{
  customer: null | { id, phone, firstName, lastName, ... },
  isAuthenticated: boolean,
  isLoading: boolean,
  login: (phone, password) => Promise,
  signup: (customerData) => Promise,
  logout: () => void,
  refreshCustomer: () => Promise
}
```

#### 2. `contexts/CustomerCartContext.jsx` (Enhanced)
```javascript
// Extend existing cart context
{
  ...existingCartFunctions,
  syncCartToServer: () => Promise, // Save cart to server when logged in
  loadCartFromServer: () => Promise, // Load cart from server on login
  mergeCartOnLogin: () => Promise // Merge localStorage cart with server cart
}
```

### New Hooks to Create

#### 1. `hooks/useCustomerAuth.js`
```javascript
// Handle customer authentication logic
- JWT token management (separate from staff tokens)
- localStorage key: 'customer_token'
- Auto-refresh token on app load
- Handle login/signup/logout flows
```

#### 2. `hooks/useCustomerOrders.js`
```javascript
// Fetch and manage customer orders
- fetchOrders(customerId)
- fetchOrderById(orderId)
- subscribeToOrderUpdates(orderId) - Socket.io
- reorder(orderId)
```

#### 3. `hooks/useCustomerAddresses.js`
```javascript
// Manage customer addresses
- fetchAddresses(customerId)
- addAddress(addressData)
- updateAddress(addressId, addressData)
- deleteAddress(addressId)
- setDefaultAddress(addressId)
```

---

## 🔌 Backend API Endpoints

### Customer Authentication Routes

```javascript
// routes/customerAuthRoutes.js

POST /api/customer/auth/signup
Body: {
  phone: string,
  email?: string,
  password: string,
  firstName: string,
  lastName: string
}
Response: {
  success: true,
  customer: { id, phone, firstName, lastName, ... },
  token: string
}

POST /api/customer/auth/login
Body: {
  phone: string,
  password: string
}
Response: {
  success: true,
  customer: { id, phone, firstName, lastName, ... },
  token: string
}

GET /api/customer/auth/me
Headers: { Authorization: Bearer <token> }
Response: {
  success: true,
  customer: { id, phone, firstName, lastName, ... }
}

POST /api/customer/auth/logout
Headers: { Authorization: Bearer <token> }
Response: { success: true }
```

### Customer Address Routes

```javascript
// routes/customerAddressRoutes.js

GET /api/customer/addresses
Headers: { Authorization: Bearer <token> }
Response: {
  success: true,
  addresses: [...]
}

POST /api/customer/addresses
Headers: { Authorization: Bearer <token> }
Body: {
  label: string,
  recipientName: string,
  recipientPhone: string,
  street: string,
  barangay: string,
  city: string,
  province: string,
  postalCode?: string,
  landmark?: string,
  deliveryNotes?: string,
  isDefault?: boolean
}
Response: {
  success: true,
  address: {...}
}

PUT /api/customer/addresses/:id
Headers: { Authorization: Bearer <token> }
Body: { ...address fields to update }
Response: {
  success: true,
  address: {...}
}

DELETE /api/customer/addresses/:id
Headers: { Authorization: Bearer <token> }
Response: { success: true }

PUT /api/customer/addresses/:id/set-default
Headers: { Authorization: Bearer <token> }
Response: {
  success: true,
  address: {...}
}
```

### Customer Order Routes

```javascript
// Extend routes/orderRoutes.js

GET /api/customer/orders
Headers: { Authorization: Bearer <token> }
Query: { limit?, page?, status? }
Response: {
  success: true,
  orders: [...],
  pagination: { total, page, limit }
}

GET /api/customer/orders/:id
Headers: { Authorization: Bearer <token> }
Response: {
  success: true,
  order: {...}
}

POST /api/customer/orders/:id/reorder
Headers: { Authorization: Bearer <token> }
Response: {
  success: true,
  cartItems: [...] // Items to add to cart
}
```

### Customer Cart Routes (Optional)

```javascript
// routes/customerCartRoutes.js

GET /api/customer/cart
Headers: { Authorization: Bearer <token> }
Response: {
  success: true,
  cart: { items: [...] }
}

POST /api/customer/cart/sync
Headers: { Authorization: Bearer <token> }
Body: {
  items: [...]
}
Response: {
  success: true,
  cart: { items: [...] }
}

DELETE /api/customer/cart
Headers: { Authorization: Bearer <token> }
Response: { success: true }
```

---

## 🔐 Authentication & Security

### JWT Token Strategy

**Separate tokens for customers and staff:**

- **Staff Token**: `localStorage.getItem('token')` or `localStorage.getItem('authToken')`
- **Customer Token**: `localStorage.getItem('customer_token')`

**Token Payload:**
```javascript
// Staff JWT
{
  _id: userId,
  role: 'staff' | 'manager',
  position: 'cashier' | 'manager' | ...,
  type: 'staff'
}

// Customer JWT
{
  _id: customerId,
  phone: string,
  type: 'customer'
}
```

### Middleware

```javascript
// middleware/customerAuthMiddleware.js

const authenticateCustomer = async (req, res, next) => {
  try {
    const token = req.headers.authorization?.split(' ')[1];
    if (!token) {
      return res.status(401).json({ message: 'No token provided' });
    }
    
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    
    // Verify it's a customer token
    if (decoded.type !== 'customer') {
      return res.status(403).json({ message: 'Invalid token type' });
    }
    
    const customer = await Customer.findById(decoded._id);
    if (!customer || !customer.isActive) {
      return res.status(401).json({ message: 'Customer not found or inactive' });
    }
    
    req.customer = customer;
    next();
  } catch (error) {
    res.status(401).json({ message: 'Invalid or expired token' });
  }
};
```

### Password Requirements

- Minimum 8 characters
- At least one letter
- At least one number
- Hashed with bcrypt (salt rounds: 12)

---

## 🎨 UI/UX Flow

### 1. Initial Self-Checkout Page Load

**Scenario A: User Not Logged In**
```
┌────────────────────────────────────────┐
│  Ring & Wings Logo                     │
│  [Login] [Sign Up]          🛒 (0)    │
├────────────────────────────────────────┤
│  🔍 Search menu...                     │
├────────────────────────────────────────┤
│  [Menu] [Cart]                         │
├────────────────────────────────────────┤
│  Menu Items Grid                       │
│  ...                                   │
└────────────────────────────────────────┘
```

**Scenario B: User Logged In**
```
┌────────────────────────────────────────┐
│  Ring & Wings Logo                     │
│  Welcome, Juan! ▼          🛒 (3)     │
│  └─ My Orders                          │
│  └─ Addresses                          │
│  └─ Logout                             │
├────────────────────────────────────────┤
│  🔍 Search menu...                     │
├────────────────────────────────────────┤
│  [Menu] [Cart] [My Orders]             │
├────────────────────────────────────────┤
│  Menu Items Grid                       │
│  ...                                   │
└────────────────────────────────────────┘
```

### 2. Sign Up Flow

**Step 1: Click "Sign Up"**
```
┌─────────────────────────────────────────┐
│  Create Your Account                    │
├─────────────────────────────────────────┤
│  First Name: [____________]             │
│  Last Name:  [____________]             │
│  Phone:      [____________]             │
│              (e.g., 09171234567)        │
│  Email:      [____________] (optional)  │
│  Password:   [____________]             │
│  Confirm:    [____________]             │
├─────────────────────────────────────────┤
│  [Cancel]              [Create Account] │
└─────────────────────────────────────────┘
```

**Step 2: Success → Auto-login**
```
✅ Account created successfully!
Redirecting...
```

### 3. Login Flow

**Step 1: Click "Login"**
```
┌─────────────────────────────────────────┐
│  Welcome Back!                          │
├─────────────────────────────────────────┤
│  Phone Number: [____________]           │
│  Password:     [____________]           │
├─────────────────────────────────────────┤
│  [Cancel]                     [Login]   │
│  Don't have an account? [Sign Up]       │
└─────────────────────────────────────────┘
```

### 4. Checkout Flow with Account

**Logged In + Cart Has Items + Click Checkout**

```
┌─────────────────────────────────────────┐
│  Checkout - Order #RNG-123456           │
├─────────────────────────────────────────┤
│  1. Order Type                          │
│     ⚪ Dine-In                          │
│     ⚪ Take-Out                         │
│     ⚪ Delivery                         │
├─────────────────────────────────────────┤
│  2. Delivery Address (if Delivery)      │
│     ⚪ Home - 123 Street, Manila        │
│     ⚪ Work - 456 Ave, Makati           │
│     [+ Add New Address]                 │
├─────────────────────────────────────────┤
│  3. Payment Method                      │
│     ⚪ GCash                            │
│     ⚪ PayMaya                          │
│     ⚪ PayMongo (Credit Card)           │
├─────────────────────────────────────────┤
│  Total: ₱450.00                         │
│  [Back]                  [Place Order]  │
└─────────────────────────────────────────┘
```

### 5. Order Status View

**After Order Placed**
```
┌─────────────────────────────────────────┐
│  Order #RNG-123456                      │
│  🕐 Pending Payment                     │
├─────────────────────────────────────────┤
│  Timeline:                              │
│  ✅ Order Placed         2:45 PM        │
│  🔵 Awaiting Payment     Now            │
│  ⚪ Payment Verified                    │
│  ⚪ Preparing                           │
│  ⚪ Ready for Pickup/Delivery           │
│  ⚪ Completed                           │
├─────────────────────────────────────────┤
│  Items:                                 │
│  • 2x Fried Chicken (Large) - ₱250     │
│  • 1x Iced Tea (Medium) - ₱50          │
├─────────────────────────────────────────┤
│  Total: ₱450.00                         │
│  [Track Order] [View Receipt]           │
└─────────────────────────────────────────┘
```

### 6. Order History

**Click "My Orders"**
```
┌─────────────────────────────────────────┐
│  My Orders                              │
├─────────────────────────────────────────┤
│  📦 Order #RNG-123456        Nov 23     │
│     🔵 Preparing            ₱450.00     │
│     [View Details] [Track]              │
├─────────────────────────────────────────┤
│  ✅ Order #RNG-123445        Nov 22     │
│     Completed               ₱320.00     │
│     [View Details] [Reorder]            │
├─────────────────────────────────────────┤
│  ✅ Order #RNG-123434        Nov 20     │
│     Completed               ₱580.00     │
│     [View Details] [Reorder]            │
├─────────────────────────────────────────┤
│  [Load More]                            │
└─────────────────────────────────────────┘
```

---

## 📝 Implementation Phases

### Phase 1: Backend Foundation (Days 1-2)

**Tasks:**
1. ✅ Create `Customer` model with validation
2. ✅ Create `CustomerAddress` model
3. ✅ Update `Order` model with customer references
4. ✅ Create customer authentication controller
5. ✅ Create customer auth routes (`/api/customer/auth/*`)
6. ✅ Create customer auth middleware
7. ✅ Test customer signup/login/logout endpoints
8. ✅ Create address management controller
9. ✅ Create address routes (`/api/customer/addresses/*`)
10. ✅ Test address CRUD endpoints

**Deliverables:**
- Working customer auth API
- Working address management API
- Postman/Thunder Client tests

### Phase 2: Frontend Authentication (Days 3-4)

**Tasks:**
1. ✅ Create `CustomerAuthContext`
2. ✅ Create `useCustomerAuth` hook
3. ✅ Create `CustomerAuthModal` component (login/signup)
4. ✅ Create `CustomerAccountMenu` component
5. ✅ Integrate auth into `SelfCheckout.jsx` header
6. ✅ Add "Login" and "Sign Up" buttons
7. ✅ Handle login flow and token storage
8. ✅ Display customer name when logged in
9. ✅ Add logout functionality
10. ✅ Test full auth flow in browser

**Deliverables:**
- Functional login/signup UI
- Session persistence across refreshes
- Proper error handling

### Phase 3: Cart Integration (Day 5)

**Tasks:**
1. ✅ Update `useCart` hook to support customer ID
2. ✅ Create `CustomerCart` model (optional)
3. ✅ Create cart sync endpoints (optional)
4. ✅ Implement cart merge logic on login
5. ✅ Link cart to customer on checkout
6. ✅ Clear localStorage cart after successful order
7. ✅ Test cart persistence across login/logout

**Deliverables:**
- Cart persists when logged in
- Cart merges correctly on login

### Phase 4: Delivery Address Management (Days 6-7)

**Tasks:**
1. ✅ Create `DeliveryAddressSelector` component
2. ✅ Create `AddressFormModal` component
3. ✅ Create `useCustomerAddresses` hook
4. ✅ Integrate into checkout flow (for delivery orders)
5. ✅ Show saved addresses during checkout
6. ✅ Add "Add New Address" functionality
7. ✅ Implement "Set as Default" feature
8. ✅ Test address selection in checkout

**Deliverables:**
- Address selector in checkout
- Address management UI
- Default address handling

### Phase 5: Order Creation with Customer Link (Day 8)

**Tasks:**
1. ✅ Update order creation logic in `SelfCheckout.jsx`
2. ✅ Include `customerId` in order payload
3. ✅ Include `deliveryAddressId` for delivery orders
4. ✅ Store customer details snapshot in order
5. ✅ Store delivery address snapshot in order
6. ✅ Test order creation with customer link
7. ✅ Verify orders appear in customer's order history

**Deliverables:**
- Orders linked to customer accounts
- Customer and address data stored in orders

### Phase 6: Order History & Status (Days 9-10)

**Tasks:**
1. ✅ Create `useCustomerOrders` hook
2. ✅ Create customer order endpoints (`/api/customer/orders`)
3. ✅ Create `OrderStatusCard` component
4. ✅ Create `OrderHistoryModal` component
5. ✅ Add "My Orders" tab/section to self-checkout
6. ✅ Display current order status after checkout
7. ✅ Implement real-time status updates via Socket.io
8. ✅ Add "View Details" for past orders
9. ✅ Add "Reorder" functionality
10. ✅ Test order history and status tracking

**Deliverables:**
- Order history view
- Real-time order status updates
- Reorder functionality

### Phase 7: Polish & Testing (Days 11-12)

**Tasks:**
1. ✅ Add loading states to all components
2. ✅ Add error handling and user feedback
3. ✅ Add form validation messages
4. ✅ Style components consistently with theme
5. ✅ Add mobile responsiveness checks
6. ✅ Test guest checkout flow (if implemented)
7. ✅ Test logged-in checkout flow
8. ✅ Test order history pagination
9. ✅ Test address management edge cases
10. ✅ Perform end-to-end testing

**Deliverables:**
- Polished, production-ready UI
- Comprehensive testing
- Bug fixes

---

## 🎛️ Configuration & Environment Variables

### Backend `.env` additions

```bash
# JWT Secret (reuse existing or create new for customers)
JWT_SECRET=your_jwt_secret_here

# JWT Expiration
JWT_EXPIRES_IN=7d

# Customer token expiration (optional, separate from staff)
CUSTOMER_JWT_EXPIRES_IN=30d
```

---

## 🧪 Testing Checklist

### Backend Tests
- [ ] Customer signup with valid data
- [ ] Customer signup with duplicate phone
- [ ] Customer login with correct credentials
- [ ] Customer login with incorrect credentials
- [ ] JWT token generation and verification
- [ ] Address creation with valid data
- [ ] Address update
- [ ] Address deletion
- [ ] Set default address
- [ ] Order creation with customer ID
- [ ] Fetch customer orders
- [ ] Order filtering by status

### Frontend Tests
- [ ] Login modal opens and closes
- [ ] Signup modal opens and closes
- [ ] Form validation errors display
- [ ] Login success redirects
- [ ] Token persists in localStorage
- [ ] Page refresh maintains login state
- [ ] Logout clears token
- [ ] Cart persists after login
- [ ] Address selector shows saved addresses
- [ ] Add new address form works
- [ ] Default address is pre-selected
- [ ] Order history displays correctly
- [ ] Reorder adds items to cart
- [ ] Real-time status updates work

---

## 📊 Database Indexes for Performance

```javascript
// Customer collection
db.customers.createIndex({ phone: 1 }, { unique: true });
db.customers.createIndex({ email: 1 }, { sparse: true, unique: true });
db.customers.createIndex({ createdAt: -1 });

// CustomerAddress collection
db.customeraddresses.createIndex({ customerId: 1, isDefault: 1 });
db.customeraddresses.createIndex({ customerId: 1, isActive: 1 });

// Order collection (add to existing indexes)
db.orders.createIndex({ customerId: 1, createdAt: -1 });
db.orders.createIndex({ customerId: 1, status: 1 });
```

---

## 🔄 Real-time Updates Strategy

### Socket.io Integration

**Customer-specific order updates:**

```javascript
// Backend - emit when order status changes
io.to(`customer:${customerId}`).emit('orderStatusUpdate', {
  orderId,
  status,
  timestamp
});

// Frontend - subscribe on login
socket.on('connect', () => {
  socket.emit('subscribeToCustomerOrders', customerId);
});

socket.on('orderStatusUpdate', (data) => {
  // Update order status in UI
  updateOrderStatus(data.orderId, data.status);
  // Show notification
  showNotification(`Your order #${data.orderId} is now ${data.status}`);
});
```

---

## 🚧 Known Limitations & Future Enhancements

### Current Limitations
1. No email verification (accounts immediately active)
2. No password reset flow
3. No SMS OTP verification
4. No social login
5. No loyalty/rewards system
6. No order rating/review system

### Future Enhancements
1. **Email verification** - Send verification link on signup
2. **Password reset** - "Forgot password" flow via email/SMS
3. **SMS OTP** - Two-factor authentication
4. **Profile management** - Edit name, email, password
5. **Payment methods storage** - Save e-wallet details
6. **Order notifications** - Push notifications/SMS
7. **Favorites/Wishlist** - Save favorite menu items
8. **Reorder shortcuts** - Quick reorder from history
9. **Guest order linking** - Link past guest orders to new account
10. **Loyalty points** - Reward system for frequent customers

---

## 📚 Key Files Reference

### Frontend Files to Create
```
ring-and-wing-frontend/src/
├── components/
│   └── customer/
│       ├── CustomerAuthModal.jsx (NEW)
│       ├── CustomerAccountMenu.jsx (NEW)
│       ├── DeliveryAddressSelector.jsx (NEW)
│       ├── AddressFormModal.jsx (NEW)
│       ├── OrderStatusCard.jsx (NEW)
│       └── OrderHistoryModal.jsx (NEW)
├── contexts/
│   ├── CustomerAuthContext.jsx (NEW)
│   └── CustomerCartContext.jsx (ENHANCE)
├── hooks/
│   ├── useCustomerAuth.js (NEW)
│   ├── useCustomerOrders.js (NEW)
│   ├── useCustomerAddresses.js (NEW)
│   └── useCart.js (ENHANCE)
└── SelfCheckout.jsx (ENHANCE)
```

### Backend Files to Create
```
ring-and-wing-backend/
├── models/
│   ├── Customer.js (NEW)
│   ├── CustomerAddress.js (NEW)
│   ├── CustomerCart.js (NEW - OPTIONAL)
│   ├── OrderStatusHistory.js (NEW - OPTIONAL)
│   └── Order.js (ENHANCE)
├── routes/
│   ├── customerAuthRoutes.js (NEW)
│   ├── customerAddressRoutes.js (NEW)
│   ├── customerCartRoutes.js (NEW - OPTIONAL)
│   └── orderRoutes.js (ENHANCE)
├── controllers/
│   ├── customerAuthController.js (NEW)
│   ├── customerAddressController.js (NEW)
│   └── customerOrderController.js (NEW)
├── middleware/
│   └── customerAuthMiddleware.js (NEW)
└── server.js (ENHANCE - add new routes)
```

---

## 🎯 Success Metrics

### Technical Metrics
- [ ] 100% of orders linked to customer accounts (when logged in)
- [ ] <500ms API response time for customer endpoints
- [ ] Cart sync time <1 second on login
- [ ] Real-time status updates within 2 seconds
- [ ] Zero data loss during cart merge

### User Experience Metrics
- [ ] <3 clicks to complete signup
- [ ] <2 clicks to login
- [ ] <4 clicks to place order (logged in)
- [ ] Order history loads in <1 second
- [ ] Address selection in <2 clicks

### Business Metrics
- [ ] 70% of users create accounts
- [ ] 60% of users reorder from history
- [ ] 80% of delivery users save addresses
- [ ] <5% cart abandonment after login

---

## 🔗 API Integration Examples

### Example: Creating an Order with Customer

```javascript
// Frontend - SelfCheckout.jsx
const createOrderWithCustomer = async () => {
  const { customer } = useCustomerAuth();
  
  const orderData = {
    customerId: customer?._id, // Include if logged in
    items: cartItems.map(item => ({
      name: item.name,
      price: item.price,
      quantity: item.quantity,
      selectedSize: item.selectedSize,
      // ...
    })),
    totals: calculateTotal(),
    orderType: 'self_checkout',
    fulfillmentType: selectedFulfillmentType,
    // Include customer details snapshot
    customerDetails: customer ? {
      name: `${customer.firstName} ${customer.lastName}`,
      phone: customer.phone,
      email: customer.email
    } : null,
    // Include delivery address if delivery order
    deliveryAddressId: selectedFulfillmentType === 'delivery' ? selectedAddressId : null
  };
  
  const response = await fetch(`${API_URL}/api/orders`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': customer ? `Bearer ${customer.token}` : undefined
    },
    body: JSON.stringify(orderData)
  });
  
  const result = await response.json();
  // Handle success...
};
```

### Example: Fetching Order History

```javascript
// Frontend - useCustomerOrders.js
export const useCustomerOrders = () => {
  const { customer } = useCustomerAuth();
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(false);
  
  const fetchOrders = useCallback(async () => {
    if (!customer) return;
    
    setLoading(true);
    try {
      const response = await fetch(`${API_URL}/api/customer/orders`, {
        headers: {
          'Authorization': `Bearer ${customer.token}`
        }
      });
      
      const data = await response.json();
      setOrders(data.orders);
    } catch (error) {
      console.error('Failed to fetch orders:', error);
    } finally {
      setLoading(false);
    }
  }, [customer]);
  
  useEffect(() => {
    fetchOrders();
  }, [fetchOrders]);
  
  return { orders, loading, refetch: fetchOrders };
};
```

---

## 🎉 Conclusion

This comprehensive plan provides:

1. **Complete data models** for customers, addresses, and enhanced orders
2. **Full API specification** for authentication, addresses, and order management
3. **Detailed component structure** for frontend integration
4. **Clear implementation phases** with 12-day timeline
5. **Testing checklist** for quality assurance
6. **Security considerations** with JWT token strategy
7. **Real-time updates** via Socket.io

The system is designed to be **flexible, scalable, and maintainable** while keeping the integration focused on the self-checkout page as requested.

---

## 📞 Next Steps

1. **Review this plan** with the team
2. **Prioritize features** if timeline needs adjustment
3. **Set up development environment** for customer accounts
4. **Create database backups** before schema changes
5. **Begin Phase 1** - Backend foundation

**Ready to implement?** Start with Phase 1 and work through systematically. Each phase builds on the previous one, ensuring steady progress toward a fully functional customer account system.
