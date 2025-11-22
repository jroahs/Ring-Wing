# User Accounts System - Implementation Checklist

## 📋 Overview

This checklist provides a step-by-step implementation guide for building the customer account system. Check off items as you complete them to track progress.

**Estimated Timeline**: 12 days  
**Team Size**: 1-2 developers  
**Starting Date**: _____________

---

## 🎯 Pre-Implementation Setup

- [ ] **Review all documentation**
  - [ ] Read `USER_ACCOUNTS_SYSTEM_ANALYSIS.md`
  - [ ] Read `USER_ACCOUNTS_QUICK_START.md`
  - [ ] Review `USER_ACCOUNTS_ARCHITECTURE.md`
  
- [ ] **Set up development environment**
  - [ ] Create feature branch: `git checkout -b feature/customer-accounts`
  - [ ] Backup MongoDB database
  - [ ] Test current self-checkout functionality
  - [ ] Install any missing dependencies

- [ ] **Create project tracking**
  - [ ] Create GitHub issues/tasks for each phase
  - [ ] Set up project board (if applicable)
  - [ ] Schedule daily check-ins

---

## 📅 Phase 1: Backend Foundation (Days 1-2)

### Day 1: Customer Model & Authentication

#### Morning: Customer Model
- [ ] Create `models/Customer.js`
  - [ ] Define schema with all fields
  - [ ] Add password hashing pre-save hook
  - [ ] Add password comparison method
  - [ ] Add indexes (phone, email)
  - [ ] Add virtual for fullName
  - [ ] Test model creation in MongoDB

- [ ] Create `models/CustomerAddress.js`
  - [ ] Define schema with all fields
  - [ ] Add pre-save hook for default address logic
  - [ ] Add indexes (customerId, isDefault)
  - [ ] Test model creation in MongoDB

#### Afternoon: Authentication Controller & Routes
- [ ] Create `controllers/customerAuthController.js`
  - [ ] Implement `signup` function
    - [ ] Validate input (phone format, password strength)
    - [ ] Check for existing customer
    - [ ] Hash password
    - [ ] Save customer
    - [ ] Generate JWT token
    - [ ] Return customer + token
  - [ ] Implement `login` function
    - [ ] Validate credentials
    - [ ] Compare password
    - [ ] Generate JWT token
    - [ ] Update lastLogin
    - [ ] Return customer + token
  - [ ] Implement `getMe` function (get current customer)
  - [ ] Implement `logout` function

- [ ] Create `routes/customerAuthRoutes.js`
  - [ ] POST `/api/customer/auth/signup`
  - [ ] POST `/api/customer/auth/login`
  - [ ] GET `/api/customer/auth/me`
  - [ ] POST `/api/customer/auth/logout`

- [ ] Create `middleware/customerAuthMiddleware.js`
  - [ ] Implement `authenticateCustomer` middleware
  - [ ] Token extraction from Authorization header
  - [ ] JWT verification
  - [ ] Customer lookup and validation
  - [ ] Attach customer to `req.customer`

- [ ] Register routes in `server.js`
  - [ ] Import customerAuthRoutes
  - [ ] Use middleware: `app.use('/api/customer/auth', customerAuthRoutes)`

#### Testing (Day 1 End)
- [ ] Test signup with Postman/Thunder Client
  - [ ] Valid signup
  - [ ] Duplicate phone number
  - [ ] Invalid phone format
  - [ ] Weak password
- [ ] Test login
  - [ ] Valid credentials
  - [ ] Invalid credentials
  - [ ] Non-existent customer
- [ ] Test `/me` endpoint with token
- [ ] Verify MongoDB documents

### Day 2: Address Management & Order Enhancement

#### Morning: Address Controller & Routes
- [ ] Create `controllers/customerAddressController.js`
  - [ ] Implement `getAddresses` (list all for customer)
  - [ ] Implement `createAddress`
    - [ ] Validate address data
    - [ ] Handle default address logic
    - [ ] Save address
  - [ ] Implement `updateAddress`
  - [ ] Implement `deleteAddress`
  - [ ] Implement `setDefaultAddress`

- [ ] Create `routes/customerAddressRoutes.js`
  - [ ] GET `/api/customer/addresses`
  - [ ] POST `/api/customer/addresses`
  - [ ] PUT `/api/customer/addresses/:id`
  - [ ] DELETE `/api/customer/addresses/:id`
  - [ ] PUT `/api/customer/addresses/:id/set-default`

- [ ] Register routes in `server.js`
  - [ ] Import customerAddressRoutes
  - [ ] Use with auth: `app.use('/api/customer/addresses', authenticateCustomer, customerAddressRoutes)`

#### Afternoon: Order Model Enhancement
- [ ] Update `models/Order.js`
  - [ ] Add `customerId` field (ObjectId, ref: 'Customer', sparse)
  - [ ] Add `deliveryAddressId` field (ObjectId, ref: 'CustomerAddress')
  - [ ] Add `customerDetails` object (name, phone, email)
  - [ ] Add `deliveryAddress` object (snapshot)
  - [ ] Add indexes (customerId + createdAt, customerId + status)

- [ ] Create `controllers/customerOrderController.js`
  - [ ] Implement `getCustomerOrders` (with pagination)
  - [ ] Implement `getOrderById` (verify ownership)
  - [ ] Implement `reorderById` (return cart items)

- [ ] Update `routes/orderRoutes.js`
  - [ ] Add GET `/api/customer/orders` (protected)
  - [ ] Add GET `/api/customer/orders/:id` (protected)
  - [ ] Add POST `/api/customer/orders/:id/reorder` (protected)

- [ ] Update order creation logic in `routes/orderRoutes.js`
  - [ ] Accept `customerId` in request body
  - [ ] Accept `deliveryAddressId` in request body
  - [ ] Fetch and snapshot customer details if customerId provided
  - [ ] Fetch and snapshot delivery address if deliveryAddressId provided
  - [ ] Update customer's `totalOrders` and `totalSpent`

#### Testing (Day 2 End)
- [ ] Test address CRUD operations
  - [ ] Create address
  - [ ] List addresses
  - [ ] Update address
  - [ ] Delete address
  - [ ] Set default address
- [ ] Test order creation with customer link
  - [ ] Order with customerId
  - [ ] Order with deliveryAddressId
  - [ ] Verify customer details snapshot
  - [ ] Verify address snapshot
- [ ] Test customer order endpoints
  - [ ] Get order history
  - [ ] Get specific order
  - [ ] Reorder functionality
- [ ] Verify MongoDB documents and relationships

---

## 📅 Phase 2: Frontend Authentication (Days 3-4)

### Day 3: Authentication Context & Modal

#### Morning: Customer Auth Context
- [ ] Create `contexts/CustomerAuthContext.jsx`
  - [ ] Define context shape (customer, token, isAuthenticated, isLoading)
  - [ ] Create CustomerAuthProvider component
  - [ ] Implement state management
  - [ ] Create context hook `useCustomerAuth`

- [ ] Create `hooks/useCustomerAuth.js`
  - [ ] Implement `signup` function
    - [ ] Validate form data
    - [ ] Call API endpoint
    - [ ] Store token in localStorage
    - [ ] Update context state
  - [ ] Implement `login` function
    - [ ] Call API endpoint
    - [ ] Store token in localStorage
    - [ ] Update context state
  - [ ] Implement `logout` function
    - [ ] Clear token from localStorage
    - [ ] Clear context state
  - [ ] Implement `refreshCustomer` function (called on app load)
    - [ ] Check localStorage for token
    - [ ] Call `/api/customer/auth/me`
    - [ ] Update context state
  - [ ] Add error handling

#### Afternoon: Authentication UI Components
- [ ] Create `components/customer/CustomerAuthModal.jsx`
  - [ ] Create modal container with backdrop
  - [ ] Add tabs: "Login" and "Sign Up"
  - [ ] Create LoginForm sub-component
    - [ ] Phone input (with validation)
    - [ ] Password input
    - [ ] Submit button
    - [ ] Error display
    - [ ] Loading state
  - [ ] Create SignupForm sub-component
    - [ ] First name input
    - [ ] Last name input
    - [ ] Phone input (with format hint)
    - [ ] Email input (optional)
    - [ ] Password input (with requirements)
    - [ ] Confirm password input
    - [ ] Submit button
    - [ ] Error display
    - [ ] Loading state
  - [ ] Add form validation
  - [ ] Style with theme colors
  - [ ] Make responsive (mobile-first)

- [ ] Create `components/customer/CustomerAccountMenu.jsx`
  - [ ] Dropdown trigger: "Welcome, [Name] ▼"
  - [ ] Dropdown menu items:
    - [ ] "My Orders" → Navigate to My Orders tab
    - [ ] "My Addresses" → Open address management modal
    - [ ] Divider
    - [ ] "Logout" → Call logout function
  - [ ] Style dropdown
  - [ ] Add click outside to close

#### Testing (Day 3 End)
- [ ] Test signup flow in browser
  - [ ] Valid signup
  - [ ] Error handling (duplicate phone, weak password)
  - [ ] Success message
  - [ ] Auto-login after signup
- [ ] Test login flow
  - [ ] Valid login
  - [ ] Invalid credentials error
  - [ ] Success redirect
- [ ] Test token persistence
  - [ ] Refresh page while logged in
  - [ ] Token still valid
  - [ ] Customer data restored
- [ ] Test logout
  - [ ] Token cleared
  - [ ] UI updated

### Day 4: Integration into Self-Checkout

#### Morning: Self-Checkout Integration
- [ ] Update `SelfCheckout.jsx`
  - [ ] Wrap with `CustomerAuthContext.Provider`
  - [ ] Add state for showing auth modal
  - [ ] Add "Login" button to header (when not logged in)
  - [ ] Add "Sign Up" button to header (when not logged in)
  - [ ] Add `CustomerAccountMenu` to header (when logged in)
  - [ ] Hide auth buttons when logged in
  - [ ] Add `CustomerAuthModal` component
  - [ ] Handle modal open/close

- [ ] Update header layout
  - [ ] Adjust spacing for new buttons
  - [ ] Ensure mobile responsiveness
  - [ ] Test on different screen sizes

#### Afternoon: Cart Integration
- [ ] Update `hooks/useCart.js`
  - [ ] Add function to sync cart to server
  - [ ] Add function to load cart from server
  - [ ] Add function to merge carts on login
  - [ ] Update cart operations to sync when logged in

- [ ] Create `routes/customerCartRoutes.js` (backend - optional)
  - [ ] GET `/api/customer/cart`
  - [ ] POST `/api/customer/cart/sync`
  - [ ] DELETE `/api/customer/cart`

- [ ] Create `models/CustomerCart.js` (backend - optional)
  - [ ] Define schema
  - [ ] Add TTL index for auto-expiration

- [ ] Implement cart merge logic
  - [ ] On login: Fetch server cart
  - [ ] Merge with localStorage cart
  - [ ] Sync merged cart to server
  - [ ] Update UI

#### Testing (Day 4 End)
- [ ] Test full auth flow in self-checkout
  - [ ] Signup → See account menu
  - [ ] Logout → See login/signup buttons
  - [ ] Login → Account menu appears
- [ ] Test cart persistence
  - [ ] Add items to cart (not logged in)
  - [ ] Login
  - [ ] Cart items preserved
- [ ] Test cart sync
  - [ ] Add items on Device 1
  - [ ] Login on Device 2
  - [ ] Cart synced correctly
- [ ] Test mobile view
  - [ ] Auth buttons visible
  - [ ] Modal is responsive
  - [ ] Account menu works on mobile

---

## 📅 Phase 3: Delivery Address Management (Days 5-6)

### Day 5: Address Components

#### Morning: Address Selector Component
- [ ] Create `components/customer/DeliveryAddressSelector.jsx`
  - [ ] Display saved addresses as radio buttons
  - [ ] Show address details (street, city, etc.)
  - [ ] Highlight default address
  - [ ] Add "Add New Address" button
  - [ ] Add "Edit" button for each address
  - [ ] Handle address selection
  - [ ] Style component

- [ ] Create `hooks/useCustomerAddresses.js`
  - [ ] Implement `fetchAddresses` function
  - [ ] Implement `addAddress` function
  - [ ] Implement `updateAddress` function
  - [ ] Implement `deleteAddress` function
  - [ ] Implement `setDefaultAddress` function
  - [ ] Add loading and error states

#### Afternoon: Address Form Modal
- [ ] Create `components/customer/AddressFormModal.jsx`
  - [ ] Modal container
  - [ ] Form fields:
    - [ ] Recipient name
    - [ ] Recipient phone
    - [ ] Street address
    - [ ] Barangay
    - [ ] City (with default: Manila)
    - [ ] Province (with default: Metro Manila)
    - [ ] Postal code
    - [ ] Landmark (optional)
    - [ ] Delivery notes (optional, textarea)
    - [ ] Label selector (Home/Work/Other)
    - [ ] "Set as default" checkbox
  - [ ] Validation
  - [ ] Submit button
  - [ ] Cancel button
  - [ ] Loading state
  - [ ] Success/error messages
  - [ ] Make responsive

#### Testing (Day 5 End)
- [ ] Test address form
  - [ ] Add new address
  - [ ] Validation errors display
  - [ ] Success message
  - [ ] Address appears in list
- [ ] Test address list
  - [ ] Saved addresses display
  - [ ] Default address highlighted
  - [ ] Edit address works
  - [ ] Delete address works
- [ ] Test on mobile
  - [ ] Form is usable
  - [ ] All fields accessible

### Day 6: Checkout Flow Integration

#### Morning: Integrate Address Selector into Checkout
- [ ] Update checkout flow in `SelfCheckout.jsx`
  - [ ] Add step for delivery address selection (after order type, if delivery)
  - [ ] Conditionally render `DeliveryAddressSelector`
  - [ ] Handle address selection state
  - [ ] Show "Add New Address" flow
  - [ ] Validate address selected before payment step

- [ ] Update order creation logic
  - [ ] Include `deliveryAddressId` in payload
  - [ ] Verify address belongs to customer (backend validation)
  - [ ] Handle errors gracefully

#### Afternoon: Address Management Page (Optional)
- [ ] Create standalone address management view (optional)
  - [ ] List all addresses
  - [ ] Add/edit/delete functionality
  - [ ] Set default address
  - [ ] Accessible from account menu

- [ ] Polish UI
  - [ ] Consistent styling
  - [ ] Loading indicators
  - [ ] Empty state ("No addresses saved")
  - [ ] Confirmation dialogs for delete

#### Testing (Day 6 End)
- [ ] Test checkout flow with delivery
  - [ ] Select delivery order type
  - [ ] Address selector appears
  - [ ] Select existing address
  - [ ] Complete order
  - [ ] Verify address in order document
- [ ] Test "Add New Address" during checkout
  - [ ] Opens address form
  - [ ] Saves address
  - [ ] Address auto-selected after save
  - [ ] Checkout continues
- [ ] Test default address
  - [ ] Default address pre-selected
  - [ ] Change default address
  - [ ] New default used in next order

---

## 📅 Phase 4: Order History & Status (Days 7-8)

### Day 7: Order Status Component

#### Morning: Order Status Card
- [ ] Create `components/customer/OrderStatusCard.jsx`
  - [ ] Display order number
  - [ ] Display status badge with color coding
  - [ ] Display progress timeline
    - [ ] Order Placed ✅
    - [ ] Payment Verified 🔵
    - [ ] Preparing ⚪
    - [ ] Ready ⚪
    - [ ] Completed ⚪
  - [ ] Display estimated time (if applicable)
  - [ ] Display order items (expandable)
  - [ ] Display total
  - [ ] Add "Track Order" button
  - [ ] Add "View Receipt" button
  - [ ] Style with theme
  - [ ] Make responsive

- [ ] Implement status color mapping
  - [ ] pending_payment → Orange
  - [ ] preparing → Blue
  - [ ] ready → Green
  - [ ] completed → Gray
  - [ ] cancelled → Red

#### Afternoon: Real-time Status Updates
- [ ] Update Socket.io subscription in `SelfCheckout.jsx`
  - [ ] Subscribe to customer-specific room on login
  - [ ] Subscribe to order-specific room after order placement
  - [ ] Listen for `orderStatusUpdate` events
  - [ ] Update order status in state
  - [ ] Show notification on status change

- [ ] Create notification system (simple)
  - [ ] Toast/banner component
  - [ ] "Your order is now [status]" message
  - [ ] Auto-dismiss after 5 seconds

#### Testing (Day 7 End)
- [ ] Test order status display
  - [ ] Place order
  - [ ] Status card appears
  - [ ] Shows correct initial status
- [ ] Test real-time updates
  - [ ] Use POS to update order status
  - [ ] Self-checkout shows update instantly
  - [ ] Notification appears
- [ ] Test on mobile
  - [ ] Status card readable
  - [ ] Timeline fits screen

### Day 8: Order History

#### Morning: Order History Component
- [ ] Create `components/customer/OrderHistoryModal.jsx`
  - [ ] Modal container (or full-screen on mobile)
  - [ ] Header: "My Orders"
  - [ ] Tabs: "Current Orders" and "Past Orders"
  - [ ] Current Orders section
    - [ ] Show in-progress orders
    - [ ] Use OrderStatusCard component
  - [ ] Past Orders section
    - [ ] List of completed/cancelled orders
    - [ ] Order card with:
      - [ ] Order number
      - [ ] Date
      - [ ] Status badge
      - [ ] Total
      - [ ] Item count
      - [ ] "View Details" button
      - [ ] "Reorder" button
  - [ ] Pagination/infinite scroll
  - [ ] Loading state
  - [ ] Empty state ("No orders yet")
  - [ ] Style and make responsive

- [ ] Create `hooks/useCustomerOrders.js`
  - [ ] Implement `fetchOrders` function (with pagination)
  - [ ] Implement `fetchOrderById` function
  - [ ] Implement `reorder` function
  - [ ] Add loading and error states

#### Afternoon: Reorder Functionality
- [ ] Implement reorder logic
  - [ ] Fetch order items
  - [ ] Check menu item availability
  - [ ] Add available items to cart
  - [ ] Show message if items unavailable
  - [ ] Navigate to cart tab

- [ ] Add "My Orders" tab to self-checkout
  - [ ] New tab in navigation (after Cart)
  - [ ] Only visible when logged in
  - [ ] Shows OrderHistoryModal content inline
  - [ ] Or opens modal on click

#### Testing (Day 8 End)
- [ ] Test order history view
  - [ ] Past orders display correctly
  - [ ] Order details expandable
  - [ ] Pagination works
- [ ] Test reorder
  - [ ] Click "Reorder" button
  - [ ] Items added to cart
  - [ ] Navigate to cart
  - [ ] Can modify and checkout
- [ ] Test "My Orders" tab
  - [ ] Tab visible when logged in
  - [ ] Tab hidden when logged out
  - [ ] Content loads correctly

---

## 📅 Phase 5: Polish & Testing (Days 9-10)

### Day 9: UI/UX Polish

#### Morning: Loading States & Error Handling
- [ ] Add loading spinners to all async operations
  - [ ] Login/signup
  - [ ] Address fetch/save
  - [ ] Order history load
  - [ ] Order creation
- [ ] Add error messages for all failures
  - [ ] Network errors
  - [ ] Validation errors
  - [ ] Server errors
- [ ] Add success messages
  - [ ] Login success
  - [ ] Signup success
  - [ ] Address saved
  - [ ] Order placed
- [ ] Add confirmation dialogs
  - [ ] Delete address
  - [ ] Logout
  - [ ] Clear cart

#### Afternoon: Mobile Responsiveness
- [ ] Test on mobile devices (or Chrome DevTools)
  - [ ] Auth modal fits screen
  - [ ] Forms are usable
  - [ ] Buttons are tappable
  - [ ] Navigation works
  - [ ] No horizontal scroll
- [ ] Adjust styles as needed
  - [ ] Font sizes
  - [ ] Button spacing
  - [ ] Modal heights
- [ ] Test on tablet sizes
- [ ] Test on different orientations

#### Testing (Day 9 End)
- [ ] Full UI walkthrough on desktop
- [ ] Full UI walkthrough on mobile
- [ ] All loading states work
- [ ] All error states work
- [ ] All success messages appear

### Day 10: Integration & E2E Testing

#### Morning: End-to-End Scenarios
- [ ] **Scenario 1: New Customer Signup & Order**
  - [ ] Sign up new account
  - [ ] Browse menu
  - [ ] Add items to cart
  - [ ] Checkout (delivery)
  - [ ] Add new delivery address
  - [ ] Complete payment
  - [ ] Order appears in "My Orders"
  - [ ] Status updates in real-time

- [ ] **Scenario 2: Returning Customer**
  - [ ] Login with existing account
  - [ ] Cart from localStorage preserved
  - [ ] View order history
  - [ ] Reorder from past order
  - [ ] Checkout with saved address
  - [ ] Complete order

- [ ] **Scenario 3: Guest Checkout (if implemented)**
  - [ ] Browse and add to cart (not logged in)
  - [ ] Checkout without account
  - [ ] Order created
  - [ ] Option to create account after order

- [ ] **Scenario 4: Multi-Device**
  - [ ] Add items on Device 1
  - [ ] Login on Device 2
  - [ ] Cart synced
  - [ ] Place order on Device 2
  - [ ] Order appears on Device 1

#### Afternoon: Bug Fixes & Performance
- [ ] Fix any bugs found during testing
- [ ] Check performance
  - [ ] API response times
  - [ ] Page load times
  - [ ] Cart sync time
- [ ] Optimize as needed
  - [ ] Add React.memo where appropriate
  - [ ] Lazy load heavy components
  - [ ] Optimize images
- [ ] Code review
  - [ ] Check for security issues
  - [ ] Check for memory leaks
  - [ ] Ensure proper error handling

#### Testing (Day 10 End)
- [ ] All scenarios pass
- [ ] No critical bugs
- [ ] Performance acceptable
- [ ] Ready for deployment

---

## 📅 Phase 6: Final Review & Deployment (Days 11-12)

### Day 11: Documentation & Code Cleanup

#### Morning: Code Cleanup
- [ ] Remove console.logs
- [ ] Remove commented-out code
- [ ] Add JSDoc comments to functions
- [ ] Ensure consistent code style
- [ ] Run linter and fix issues
- [ ] Update component PropTypes

#### Afternoon: Documentation
- [ ] Update README with new features
- [ ] Document API endpoints (if not already)
- [ ] Add inline code comments where needed
- [ ] Create deployment notes
  - [ ] Environment variables
  - [ ] Database migrations needed
  - [ ] New indexes to create
- [ ] Update existing documentation with changes

### Day 12: Deployment & Monitoring

#### Morning: Pre-Deployment Checklist
- [ ] **Database**
  - [ ] Backup production database
  - [ ] Create indexes on production
  - [ ] Test database connection
- [ ] **Environment Variables**
  - [ ] JWT_SECRET set
  - [ ] JWT_EXPIRES_IN set
  - [ ] All required env vars present
- [ ] **Code**
  - [ ] All tests passing
  - [ ] Build succeeds
  - [ ] No TypeScript/linting errors

#### Afternoon: Deploy & Monitor
- [ ] Deploy backend
  - [ ] Push to production branch
  - [ ] Deploy to server (Render/Heroku/etc.)
  - [ ] Verify deployment successful
  - [ ] Check logs for errors
- [ ] Deploy frontend
  - [ ] Build production bundle
  - [ ] Deploy to hosting
  - [ ] Verify deployment successful
  - [ ] Test on production URL
- [ ] Post-deployment testing
  - [ ] Test signup on production
  - [ ] Test login on production
  - [ ] Test full order flow
  - [ ] Test real-time updates
- [ ] Set up monitoring
  - [ ] Error tracking (Sentry, etc.)
  - [ ] Performance monitoring
  - [ ] Database monitoring

---

## 🎉 Post-Launch Tasks

### Week 1 After Launch
- [ ] Monitor error logs daily
- [ ] Track user signups
- [ ] Gather user feedback
- [ ] Fix any critical bugs immediately

### Week 2 After Launch
- [ ] Analyze usage patterns
- [ ] Identify areas for improvement
- [ ] Plan Phase 2 enhancements
  - [ ] Email verification
  - [ ] Password reset
  - [ ] SMS notifications
  - [ ] Loyalty program

---

## 📊 Success Metrics Tracking

### Technical Metrics
- [ ] Set up tracking for:
  - [ ] API response times (target: <500ms)
  - [ ] Order creation success rate (target: >95%)
  - [ ] Cart sync success rate (target: >98%)
  - [ ] Real-time update delivery (target: <2s)

### User Metrics
- [ ] Set up tracking for:
  - [ ] Account creation rate
  - [ ] Login success rate
  - [ ] Order completion rate
  - [ ] Reorder usage
  - [ ] Address save rate

### Business Metrics
- [ ] Set up tracking for:
  - [ ] Orders from logged-in users vs guests
  - [ ] Average order value (logged-in vs guest)
  - [ ] Repeat customer rate
  - [ ] Cart abandonment rate

---

## 🚨 Common Issues & Solutions

### Issue: "Token expired" errors
**Solution**: Check JWT_EXPIRES_IN setting, implement token refresh

### Issue: Cart not syncing
**Solution**: Check network requests, verify API endpoint, check authentication

### Issue: Socket.io not connecting
**Solution**: Check CORS settings, verify Socket.io server config

### Issue: Addresses not saving
**Solution**: Check authentication middleware, verify schema validation

### Issue: Orders not linked to customer
**Solution**: Verify customerId is being sent, check backend order creation logic

### Issue: Real-time updates delayed
**Solution**: Check Socket.io room subscriptions, verify emit/on event names

---

## 📞 Help Resources

- **Full Analysis**: `docs/USER_ACCOUNTS_SYSTEM_ANALYSIS.md`
- **Quick Start**: `docs/USER_ACCOUNTS_QUICK_START.md`
- **Architecture**: `docs/USER_ACCOUNTS_ARCHITECTURE.md`
- **Existing Auth Code**: `routes/authRoutes.js`, `models/User.js`
- **Existing Cart Code**: `hooks/useCart.js`, `contexts/CartContext.jsx`

---

## ✅ Definition of Done

### Per Feature
- [ ] Code written and tested
- [ ] Unit tests added (if applicable)
- [ ] Manual testing passed
- [ ] Code reviewed
- [ ] Documentation updated
- [ ] No console errors
- [ ] Mobile responsive

### Per Phase
- [ ] All tasks completed
- [ ] Integration testing passed
- [ ] No critical bugs
- [ ] Performance acceptable
- [ ] Code committed to Git

### Overall Project
- [ ] All phases completed
- [ ] End-to-end testing passed
- [ ] Deployed to production
- [ ] Documentation complete
- [ ] Team trained
- [ ] Monitoring set up

---

**Start Date**: __________  
**Target Completion**: __________  
**Actual Completion**: __________

**Notes**:
_Use this space to track blockers, decisions, or important notes during implementation_

---

Good luck with the implementation! 🚀
