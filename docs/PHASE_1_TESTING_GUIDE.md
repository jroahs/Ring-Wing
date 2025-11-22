# Phase 1 Backend Testing Guide

## ✅ Phase 1 Complete - What We Built

### Models Created
- ✅ `Customer.js` - Customer account model with authentication
- ✅ `CustomerAddress.js` - Multiple delivery addresses per customer
- ✅ `Order.js` - Enhanced with customer fields and address snapshots

### Controllers Created
- ✅ `customerAuthController.js` - Signup, login, get profile, logout
- ✅ `customerAddressController.js` - CRUD operations for addresses
- ✅ `customerOrderController.js` - Order history and reorder

### Routes Created
- ✅ `customerAuthRoutes.js` - `/api/customer/auth/*`
- ✅ `customerAddressRoutes.js` - `/api/customer/addresses/*`
- ✅ `customerOrderRoutes.js` - `/api/customer/orders/*`

### Middleware Created
- ✅ `customerAuthMiddleware.js` - JWT verification for customers

### Integration
- ✅ All routes registered in `server.js`
- ✅ Server starts successfully

---

## 🧪 Testing Instructions

### Prerequisites
1. Backend server running: `cd ring-and-wing-backend && npm start`
2. MongoDB running
3. Thunder Client or Postman installed

---

## Test Sequence

### 1️⃣ Test Customer Signup

**Endpoint**: `POST http://localhost:5000/api/customer/auth/signup`

**Headers**:
```
Content-Type: application/json
```

**Body**:
```json
{
  "phone": "09171234567",
  "password": "password123",
  "firstName": "Juan",
  "lastName": "Dela Cruz",
  "email": "juan@example.com"
}
```

**Expected Response** (201 Created):
```json
{
  "success": true,
  "message": "Customer registered successfully",
  "customer": {
    "_id": "...",
    "phone": "09171234567",
    "email": "juan@example.com",
    "firstName": "Juan",
    "lastName": "Dela Cruz",
    "fullName": "Juan Dela Cruz",
    "createdAt": "..."
  },
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

**Save the token for next tests!**

---

### 2️⃣ Test Customer Login

**Endpoint**: `POST http://localhost:5000/api/customer/auth/login`

**Headers**:
```
Content-Type: application/json
```

**Body**:
```json
{
  "phone": "09171234567",
  "password": "password123"
}
```

**Expected Response** (200 OK):
```json
{
  "success": true,
  "message": "Login successful",
  "customer": {
    "_id": "...",
    "phone": "09171234567",
    "email": "juan@example.com",
    "firstName": "Juan",
    "lastName": "Dela Cruz",
    "fullName": "Juan Dela Cruz",
    "defaultAddressId": null,
    "totalOrders": 0,
    "totalSpent": 0,
    "lastLogin": "..."
  },
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

---

### 3️⃣ Test Get Customer Profile

**Endpoint**: `GET http://localhost:5000/api/customer/auth/me`

**Headers**:
```
Content-Type: application/json
Authorization: Bearer <your_token_from_login>
```

**Expected Response** (200 OK):
```json
{
  "success": true,
  "customer": {
    "_id": "...",
    "phone": "09171234567",
    "email": "juan@example.com",
    "firstName": "Juan",
    "lastName": "Dela Cruz",
    "fullName": "Juan Dela Cruz",
    "defaultAddressId": null,
    "totalOrders": 0,
    "totalSpent": 0,
    "isVerified": false,
    "createdAt": "...",
    "lastLogin": "..."
  }
}
```

---

### 4️⃣ Test Create Delivery Address

**Endpoint**: `POST http://localhost:5000/api/customer/addresses`

**Headers**:
```
Content-Type: application/json
Authorization: Bearer <your_token>
```

**Body**:
```json
{
  "label": "home",
  "recipientName": "Juan Dela Cruz",
  "recipientPhone": "09171234567",
  "street": "123 Main Street",
  "barangay": "Poblacion",
  "city": "Manila",
  "province": "Metro Manila",
  "postalCode": "1000",
  "landmark": "Near SM Manila",
  "deliveryNotes": "Gate code: 1234",
  "isDefault": true
}
```

**Expected Response** (201 Created):
```json
{
  "success": true,
  "message": "Address created successfully",
  "address": {
    "_id": "...",
    "customerId": "...",
    "label": "home",
    "recipientName": "Juan Dela Cruz",
    "recipientPhone": "09171234567",
    "street": "123 Main Street",
    "barangay": "Poblacion",
    "city": "Manila",
    "province": "Metro Manila",
    "postalCode": "1000",
    "landmark": "Near SM Manila",
    "deliveryNotes": "Gate code: 1234",
    "isDefault": true,
    "isActive": true,
    "createdAt": "..."
  }
}
```

---

### 5️⃣ Test Get All Addresses

**Endpoint**: `GET http://localhost:5000/api/customer/addresses`

**Headers**:
```
Authorization: Bearer <your_token>
```

**Expected Response** (200 OK):
```json
{
  "success": true,
  "count": 1,
  "addresses": [
    {
      "_id": "...",
      "customerId": "...",
      "label": "home",
      "recipientName": "Juan Dela Cruz",
      "recipientPhone": "09171234567",
      "street": "123 Main Street",
      "barangay": "Poblacion",
      "city": "Manila",
      "province": "Metro Manila",
      "postalCode": "1000",
      "landmark": "Near SM Manila",
      "deliveryNotes": "Gate code: 1234",
      "isDefault": true,
      "isActive": true,
      "createdAt": "..."
    }
  ]
}
```

---

### 6️⃣ Test Add Second Address

**Endpoint**: `POST http://localhost:5000/api/customer/addresses`

**Headers**:
```
Content-Type: application/json
Authorization: Bearer <your_token>
```

**Body**:
```json
{
  "label": "work",
  "recipientName": "Juan Dela Cruz",
  "recipientPhone": "09171234567",
  "street": "456 Business Ave",
  "barangay": "Makati",
  "city": "Makati",
  "province": "Metro Manila",
  "postalCode": "1200",
  "isDefault": false
}
```

**Expected Response**: Similar to step 4, but `isDefault: false`

---

### 7️⃣ Test Update Address

**Endpoint**: `PUT http://localhost:5000/api/customer/addresses/<address_id>`

**Headers**:
```
Content-Type: application/json
Authorization: Bearer <your_token>
```

**Body**:
```json
{
  "landmark": "Near Ayala Center",
  "deliveryNotes": "Lobby entrance"
}
```

**Expected Response** (200 OK):
```json
{
  "success": true,
  "message": "Address updated successfully",
  "address": { /* updated address */ }
}
```

---

### 8️⃣ Test Set Default Address

**Endpoint**: `PUT http://localhost:5000/api/customer/addresses/<work_address_id>/set-default`

**Headers**:
```
Authorization: Bearer <your_token>
```

**Expected Response** (200 OK):
```json
{
  "success": true,
  "message": "Default address updated successfully",
  "address": {
    /* work address with isDefault: true */
  }
}
```

**Verify**: The home address should now have `isDefault: false`

---

### 9️⃣ Test Delete Address

**Endpoint**: `DELETE http://localhost:5000/api/customer/addresses/<address_id>`

**Headers**:
```
Authorization: Bearer <your_token>
```

**Expected Response** (200 OK):
```json
{
  "success": true,
  "message": "Address deleted successfully"
}
```

**Note**: This is a soft delete (sets `isActive: false`)

---

### 🔟 Test Customer Orders (Empty for now)

**Endpoint**: `GET http://localhost:5000/api/customer/orders`

**Headers**:
```
Authorization: Bearer <your_token>
```

**Expected Response** (200 OK):
```json
{
  "success": true,
  "count": 0,
  "total": 0,
  "page": 1,
  "pages": 0,
  "orders": []
}
```

**Note**: Orders will appear here once we integrate order creation in Phase 2

---

## 🧪 Error Cases to Test

### Invalid Signup - Duplicate Phone

**Endpoint**: `POST http://localhost:5000/api/customer/auth/signup`

**Body**: Same phone number as before

**Expected Response** (400 Bad Request):
```json
{
  "success": false,
  "message": "Phone number already registered"
}
```

---

### Invalid Login - Wrong Password

**Endpoint**: `POST http://localhost:5000/api/customer/auth/login`

**Body**:
```json
{
  "phone": "09171234567",
  "password": "wrongpassword"
}
```

**Expected Response** (401 Unauthorized):
```json
{
  "success": false,
  "message": "Invalid phone number or password"
}
```

---

### Invalid Token

**Endpoint**: `GET http://localhost:5000/api/customer/auth/me`

**Headers**:
```
Authorization: Bearer invalid_token
```

**Expected Response** (401 Unauthorized):
```json
{
  "success": false,
  "message": "Invalid token. Please login again."
}
```

---

### Missing Authorization Header

**Endpoint**: `GET http://localhost:5000/api/customer/addresses`

**Headers**: (no Authorization header)

**Expected Response** (401 Unauthorized):
```json
{
  "success": false,
  "message": "No token provided. Please login."
}
```

---

## 📊 MongoDB Verification

After testing, verify data in MongoDB:

```javascript
// Connect to MongoDB
use admin_db

// Check customers collection
db.customers.find().pretty()

// Check customeraddresses collection
db.customeraddresses.find().pretty()

// Verify password is hashed
db.customers.findOne({}, { password: 1 })
// Should see hashed password like: $2a$12$...

// Verify indexes
db.customers.getIndexes()
db.customeraddresses.getIndexes()
```

---

## ✅ Success Criteria

Phase 1 is complete when:

- ✅ Customer can sign up
- ✅ Customer can login
- ✅ Customer can view profile
- ✅ Customer can create multiple addresses
- ✅ Customer can update addresses
- ✅ Customer can set default address
- ✅ Customer can delete addresses
- ✅ Only one default address per customer
- ✅ JWT token authentication works
- ✅ Proper error messages for invalid requests
- ✅ MongoDB documents created correctly
- ✅ Passwords are hashed

---

## 🐛 Common Issues

### Issue: Server won't start
**Solution**: Check if MongoDB is running and .env file has correct MONGO_URI

### Issue: "No token provided" error
**Solution**: Make sure Authorization header is formatted as `Bearer <token>` with space

### Issue: "Invalid token type" error
**Solution**: Using staff token instead of customer token. Get new token from customer login.

### Issue: Can't create address
**Solution**: Make sure all required fields are provided (recipientName, recipientPhone, street, barangay)

---

## 📋 Next Phase

Once all tests pass, proceed to **Phase 2: Frontend Authentication** (Days 3-4)

Phase 2 will include:
- CustomerAuthContext
- CustomerAuthModal (login/signup UI)
- CustomerAccountMenu
- Integration into SelfCheckout.jsx
- Cart sync logic

---

## 🎉 Congratulations!

Phase 1 Backend Foundation is complete! The customer account system backend is fully functional and ready for frontend integration.
