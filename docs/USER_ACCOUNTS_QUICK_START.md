# User Accounts System - Quick Start Guide

## 🚀 Quick Implementation Roadmap

This is a condensed guide for implementing customer accounts on the self-checkout page. For full details, see `USER_ACCOUNTS_SYSTEM_ANALYSIS.md`.

---

## 📋 Prerequisites

- ✅ Existing self-checkout system is functional
- ✅ Cart persistence via localStorage works
- ✅ Order creation API works
- ✅ MongoDB database is accessible
- ✅ Socket.io is configured

---

## 🎯 Core Features to Implement

### 1. Customer Authentication
- Phone number as primary identifier
- Password-based login
- JWT token management (separate from staff tokens)
- Session persistence

### 2. Order Linking
- Link orders to customer accounts
- Store customer details snapshot in orders
- Enable order history viewing

### 3. Delivery Address Management
- Save multiple delivery addresses
- Set default address
- Select address during checkout

### 4. Order Status Tracking
- Real-time status updates
- Order history view
- Reorder functionality

---

## 📦 New Data Models Summary

### Customer
```javascript
{
  phone: String (unique, required),
  email: String (optional),
  password: String (hashed),
  firstName: String,
  lastName: String,
  defaultAddressId: ObjectId,
  totalOrders: Number,
  totalSpent: Number,
  createdAt: Date,
  lastLogin: Date
}
```

### CustomerAddress
```javascript
{
  customerId: ObjectId (required),
  label: String (home/work/other),
  recipientName: String,
  recipientPhone: String,
  street: String,
  barangay: String,
  city: String,
  province: String,
  postalCode: String,
  landmark: String,
  deliveryNotes: String,
  isDefault: Boolean,
  isActive: Boolean
}
```

### Order (Enhanced)
```javascript
{
  // ADD THESE FIELDS:
  customerId: ObjectId (reference to Customer),
  deliveryAddressId: ObjectId (reference to CustomerAddress),
  customerDetails: {
    name: String,
    phone: String,
    email: String
  },
  deliveryAddress: { /* snapshot */ }
  
  // EXISTING FIELDS REMAIN
}
```

---

## 🏗️ File Structure

### Backend Files to Create

```
ring-and-wing-backend/
├── models/
│   ├── Customer.js ⭐ NEW
│   ├── CustomerAddress.js ⭐ NEW
│   └── Order.js ✏️ ENHANCE
│
├── routes/
│   ├── customerAuthRoutes.js ⭐ NEW
│   ├── customerAddressRoutes.js ⭐ NEW
│   └── orderRoutes.js ✏️ ENHANCE
│
├── controllers/
│   ├── customerAuthController.js ⭐ NEW
│   ├── customerAddressController.js ⭐ NEW
│   └── customerOrderController.js ⭐ NEW
│
├── middleware/
│   └── customerAuthMiddleware.js ⭐ NEW
│
└── server.js ✏️ ENHANCE (register routes)
```

### Frontend Files to Create

```
ring-and-wing-frontend/src/
├── components/customer/
│   ├── CustomerAuthModal.jsx ⭐ NEW
│   ├── CustomerAccountMenu.jsx ⭐ NEW
│   ├── DeliveryAddressSelector.jsx ⭐ NEW
│   ├── AddressFormModal.jsx ⭐ NEW
│   ├── OrderStatusCard.jsx ⭐ NEW
│   └── OrderHistoryModal.jsx ⭐ NEW
│
├── contexts/
│   └── CustomerAuthContext.jsx ⭐ NEW
│
├── hooks/
│   ├── useCustomerAuth.js ⭐ NEW
│   ├── useCustomerOrders.js ⭐ NEW
│   └── useCustomerAddresses.js ⭐ NEW
│
└── SelfCheckout.jsx ✏️ ENHANCE
```

---

## 🔌 Key API Endpoints

### Authentication
```
POST   /api/customer/auth/signup
POST   /api/customer/auth/login
GET    /api/customer/auth/me
POST   /api/customer/auth/logout
```

### Addresses
```
GET    /api/customer/addresses
POST   /api/customer/addresses
PUT    /api/customer/addresses/:id
DELETE /api/customer/addresses/:id
PUT    /api/customer/addresses/:id/set-default
```

### Orders
```
GET    /api/customer/orders
GET    /api/customer/orders/:id
POST   /api/customer/orders/:id/reorder
```

---

## 🎨 UI Integration Points

### Self-Checkout Header
```
BEFORE: [Ring & Wings Logo] ................ [Cart Icon]

AFTER:  [Ring & Wings Logo] [Login] [Sign Up] [Cart Icon]
        (when not logged in)

AFTER:  [Ring & Wings Logo] [Welcome, Juan ▼] [Cart Icon]
        (when logged in - dropdown with My Orders, Addresses, Logout)
```

### Checkout Flow Enhancement
```
Existing: Order Type → Payment → Submit

Enhanced: Order Type → Address (if Delivery) → Payment → Submit
          └─ Show saved addresses or "Add New Address"
```

### New Tab/Section: "My Orders"
```
[Menu] [Cart] [My Orders]
                └─ Order history
                └─ Current order status
                └─ Reorder button
```

---

## ⚙️ Implementation Steps (Simplified)

### Week 1: Backend Setup

**Days 1-2: Models & Auth**
1. Create `Customer.js` model
2. Create `CustomerAddress.js` model
3. Create auth controller and routes
4. Test signup/login endpoints

**Days 3-4: Address & Order APIs**
1. Create address controller and routes
2. Enhance Order model with customer fields
3. Create customer order routes
4. Test all endpoints with Postman

### Week 2: Frontend Integration

**Days 5-6: Authentication UI**
1. Create `CustomerAuthContext`
2. Create `CustomerAuthModal` (login/signup)
3. Create `CustomerAccountMenu`
4. Integrate into `SelfCheckout.jsx` header

**Days 7-8: Address Management**
1. Create `DeliveryAddressSelector`
2. Create `AddressFormModal`
3. Integrate into checkout flow

**Days 9-10: Order History**
1. Create `OrderHistoryModal`
2. Create `OrderStatusCard`
3. Add "My Orders" section
4. Implement reorder functionality

**Days 11-12: Testing & Polish**
1. End-to-end testing
2. Bug fixes
3. Mobile responsiveness
4. Error handling improvements

---

## 🔐 Security Considerations

### Token Management
```javascript
// Separate tokens for customers vs staff
localStorage.setItem('customer_token', token); // Customer
localStorage.setItem('token', token);          // Staff

// JWT payload differentiation
{ _id, phone, type: 'customer' }  // Customer token
{ _id, role, type: 'staff' }      // Staff token
```

### Password Requirements
- Minimum 8 characters
- At least 1 letter
- At least 1 number
- Hashed with bcrypt (12 rounds)

---

## 🧪 Testing Checklist

### Must Test
- [ ] Customer can sign up
- [ ] Customer can login
- [ ] Login persists after page refresh
- [ ] Cart persists after login
- [ ] Customer can save delivery address
- [ ] Address appears in checkout
- [ ] Order is linked to customer
- [ ] Order history shows past orders
- [ ] Order status updates in real-time
- [ ] Reorder adds items to cart
- [ ] Logout clears session

---

## 📊 Database Setup

### Create Indexes (MongoDB)
```javascript
// Run in MongoDB shell or Compass
db.customers.createIndex({ phone: 1 }, { unique: true });
db.customers.createIndex({ email: 1 }, { sparse: true, unique: true });
db.customeraddresses.createIndex({ customerId: 1, isDefault: 1 });
db.orders.createIndex({ customerId: 1, createdAt: -1 });
```

---

## 🎯 Success Criteria

### Technical
- ✅ Orders linked to customer accounts
- ✅ Cart persists across sessions
- ✅ Addresses saved and selectable
- ✅ Real-time order status updates
- ✅ <500ms API response time

### User Experience
- ✅ <3 clicks to sign up
- ✅ <2 clicks to login
- ✅ <4 clicks to complete order
- ✅ Order history loads instantly

---

## 🚨 Common Pitfalls to Avoid

1. **Token Confusion**: Don't mix customer and staff tokens
2. **Cart Merge**: Handle localStorage cart + server cart properly
3. **Address Validation**: Always validate Philippine address format
4. **Default Address**: Ensure only one default per customer
5. **Guest Orders**: Decide if guest checkout is allowed
6. **Security**: Never expose password in API responses
7. **Socket.io**: Subscribe customer to their own room only
8. **Session Management**: Clear tokens on logout

---

## 📞 Quick Commands

### Backend Development
```bash
# Create new model
cd ring-and-wing-backend/models
# Create Customer.js

# Create new route
cd ring-and-wing-backend/routes
# Create customerAuthRoutes.js

# Test with MongoDB Compass
# Connect to mongodb://localhost:27017
# Check collections: customers, customeraddresses
```

### Frontend Development
```bash
# Create new component
cd ring-and-wing-frontend/src/components/customer
# Create CustomerAuthModal.jsx

# Create new context
cd ring-and-wing-frontend/src/contexts
# Create CustomerAuthContext.jsx

# Test in browser
npm start
# Open http://localhost:3000/self-checkout
```

---

## 🔗 Related Documentation

- **Full Analysis**: `USER_ACCOUNTS_SYSTEM_ANALYSIS.md`
- **Self-Checkout Context**: `SelfCheckout_Complete_Context.md`
- **Payment Verification**: `MANUAL_PAYMENT_VERIFICATION_PLAN.md`
- **Socket.io Setup**: `SOCKET_IO_SETUP_COMPLETE.md`

---

## 💡 Pro Tips

1. **Start with Backend**: Get models and APIs working first
2. **Test with Postman**: Verify all endpoints before frontend work
3. **Reuse Components**: Leverage existing theme and component patterns
4. **Copy Auth Logic**: Reference existing staff auth for JWT patterns
5. **Use TypeScript**: Consider adding TypeScript for better type safety
6. **Error Boundaries**: Add React error boundaries for graceful failures
7. **Loading States**: Always show loading indicators during API calls
8. **Optimistic UI**: Update UI before API confirmation for better UX

---

## 🎉 Next Step

**Start with Phase 1** - Create the Customer model:

```bash
cd ring-and-wing-backend/models
# Create Customer.js with schema from analysis doc
```

Then proceed to auth routes and test with Postman before moving to frontend!

---

**Questions?** Refer to the full analysis document or existing staff auth code for examples.
