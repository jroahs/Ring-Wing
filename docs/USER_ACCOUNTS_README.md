# 📱 Customer User Accounts System - Complete Documentation

## Overview

This documentation package provides everything needed to implement a **customer user account system from scratch** for the Ring & Wings self-checkout platform. The system enables order persistence, delivery address management, order history tracking, and real-time status updates—all integrated directly into the self-checkout page.

---

## 🎯 What This System Does

### Core Features
- ✅ **Customer Sign Up & Login** - Phone-based authentication with JWT tokens
- ✅ **Order History** - View all past orders and current order status
- ✅ **Saved Addresses** - Store multiple delivery addresses with defaults
- ✅ **Cart Persistence** - Cart syncs across devices when logged in
- ✅ **Real-Time Updates** - Order status changes appear instantly via Socket.io
- ✅ **Reorder Functionality** - One-click reorder from past orders
- ✅ **Guest Checkout** - Optional checkout without creating an account

### What's NOT Included (Future Enhancements)
- ❌ Email verification
- ❌ Password reset flow
- ❌ Social login (Google, Facebook)
- ❌ SMS OTP verification
- ❌ Loyalty/rewards program
- ❌ Order rating/reviews

---

## 📚 Documentation Files

### **START HERE** → [USER_ACCOUNTS_INDEX.md](./USER_ACCOUNTS_INDEX.md)
**Your navigation hub for all documentation**
- Document overview and when to use each
- Quick navigation guide
- Key concepts summary
- Getting started checklist

---

### **For Planning** → [USER_ACCOUNTS_SYSTEM_ANALYSIS.md](./USER_ACCOUNTS_SYSTEM_ANALYSIS.md)
**Complete technical specification (~150 pages)**
- Current system analysis
- Proposed data models with full schemas
- Complete API endpoint specifications
- Frontend component architecture
- Backend service structure
- Security & authentication strategy
- Real-time updates implementation
- Detailed testing checklist
- 6-phase implementation plan

**Use this for**: Architectural decisions, detailed specifications, database design

---

### **For Quick Reference** → [USER_ACCOUNTS_QUICK_START.md](./USER_ACCOUNTS_QUICK_START.md)
**Condensed implementation guide (~15 pages)**
- Core features summary
- Data models at a glance
- File structure (what files to create)
- Key API endpoints list
- UI integration points
- Simplified implementation steps
- Common pitfalls & solutions
- Quick terminal commands

**Use this for**: Quick lookups, onboarding, high-level overview

---

### **For Visualization** → [USER_ACCOUNTS_ARCHITECTURE.md](./USER_ACCOUNTS_ARCHITECTURE.md)
**Visual diagrams and flows (~40 pages)**
- Database schema relationships (visual)
- Authentication flow diagrams
- Cart management flows (3 scenarios)
- Order creation flow
- Real-time status update flow
- Self-checkout page mockups
- Component hierarchy tree
- Security architecture diagram
- Performance optimization strategies

**Use this for**: Understanding flows, explaining to team, UI design

---

### **For Development** → [USER_ACCOUNTS_IMPLEMENTATION_CHECKLIST.md](./USER_ACCOUNTS_IMPLEMENTATION_CHECKLIST.md)
**Day-by-day implementation tracker (~30 pages)**
- Pre-implementation setup checklist
- 12-day implementation plan with tasks
- Phase-by-phase breakdown
- Daily morning/afternoon tasks
- Testing checkpoints
- Post-launch monitoring tasks
- Success metrics tracking
- Common issues & solutions
- Definition of done criteria

**Use this for**: Daily development work, progress tracking, code reviews

---

## 🚀 Quick Start Guide

### Option 1: Deep Dive (Recommended)
```
Day 0: 
├─ Read USER_ACCOUNTS_INDEX.md (30 min)
├─ Read USER_ACCOUNTS_QUICK_START.md (1 hour)
└─ Skim USER_ACCOUNTS_ARCHITECTURE.md diagrams (30 min)

Day 1-12:
└─ Follow USER_ACCOUNTS_IMPLEMENTATION_CHECKLIST.md
   └─ Reference USER_ACCOUNTS_SYSTEM_ANALYSIS.md as needed
```

### Option 2: Jump Right In (For Experienced Devs)
```
1. Read USER_ACCOUNTS_QUICK_START.md (1 hour)
2. Follow USER_ACCOUNTS_IMPLEMENTATION_CHECKLIST.md
3. Reference other docs when stuck
```

### Option 3: Team Onboarding
```
1. Team lead reads full USER_ACCOUNTS_SYSTEM_ANALYSIS.md
2. Team members read USER_ACCOUNTS_QUICK_START.md
3. Review USER_ACCOUNTS_ARCHITECTURE.md together
4. Divide tasks from USER_ACCOUNTS_IMPLEMENTATION_CHECKLIST.md
```

---

## 📊 Project Scope

### Timeline
- **Total Duration**: 12 days (2.4 weeks)
- **Team Size**: 1-2 developers
- **Skill Level**: Intermediate React + Node.js

### Phases
```
Phase 1: Backend Foundation        Days 1-2   (Models, APIs, Auth)
Phase 2: Frontend Authentication   Days 3-4   (Login, Signup, Context)
Phase 3: Address Management        Days 5-6   (Address CRUD, UI)
Phase 4: Order History & Status    Days 7-8   (History, Real-time)
Phase 5: Polish & Testing          Days 9-10  (UI polish, E2E tests)
Phase 6: Deployment                Days 11-12 (Deploy, Monitor)
```

### Technologies
- **Frontend**: React, Context API, Socket.io-client
- **Backend**: Node.js, Express, MongoDB, Socket.io
- **Authentication**: JWT (bcrypt for passwords)
- **Real-time**: Socket.io
- **Existing**: Self-checkout system, PayMongo integration

---

## 🎯 Key Features Detail

### 1. Customer Authentication
- Phone number as primary identifier (Philippine format)
- Password with strength requirements (min 8 chars, 1 letter, 1 number)
- JWT token with 30-day expiration
- Separate from staff authentication system
- localStorage persistence across sessions

### 2. Order Management
- Orders linked to customer accounts
- Historical snapshot of customer details and address
- Status tracking (pending → preparing → ready → completed)
- Real-time status updates via Socket.io
- Order history with pagination

### 3. Delivery Addresses
- Multiple addresses per customer
- Default address designation
- Address fields: street, barangay, city, province, postal code, landmark
- Saved for reuse in future orders
- Edit/delete functionality

### 4. Cart Persistence
- localStorage for anonymous users
- Server-side sync for logged-in users
- Merge logic on login (local + server carts)
- Cross-device synchronization

### 5. Order History & Reorder
- View all past orders
- See order details (items, total, status)
- One-click reorder functionality
- Checks item availability before reordering

---

## 🗂️ File Structure Overview

### Backend (NEW Files)
```
ring-and-wing-backend/
├── models/
│   ├── Customer.js ⭐ NEW
│   ├── CustomerAddress.js ⭐ NEW
│   └── Order.js ✏️ ENHANCED
├── routes/
│   ├── customerAuthRoutes.js ⭐ NEW
│   ├── customerAddressRoutes.js ⭐ NEW
│   └── orderRoutes.js ✏️ ENHANCED
├── controllers/
│   ├── customerAuthController.js ⭐ NEW
│   ├── customerAddressController.js ⭐ NEW
│   └── customerOrderController.js ⭐ NEW
└── middleware/
    └── customerAuthMiddleware.js ⭐ NEW
```

### Frontend (NEW Files)
```
ring-and-wing-frontend/src/
├── components/customer/
│   ├── CustomerAuthModal.jsx ⭐ NEW
│   ├── CustomerAccountMenu.jsx ⭐ NEW
│   ├── DeliveryAddressSelector.jsx ⭐ NEW
│   ├── AddressFormModal.jsx ⭐ NEW
│   ├── OrderStatusCard.jsx ⭐ NEW
│   └── OrderHistoryModal.jsx ⭐ NEW
├── contexts/
│   └── CustomerAuthContext.jsx ⭐ NEW
├── hooks/
│   ├── useCustomerAuth.js ⭐ NEW
│   ├── useCustomerOrders.js ⭐ NEW
│   └── useCustomerAddresses.js ⭐ NEW
└── SelfCheckout.jsx ✏️ ENHANCED
```

---

## 🔐 Security Highlights

### Token Management
- Separate JWT tokens for customers vs staff
- Customer token: `localStorage.getItem('customer_token')`
- Staff token: `localStorage.getItem('token')`
- Token payload includes type indicator: `{ type: 'customer' }`

### Password Security
- bcrypt hashing with 12 salt rounds
- Password requirements enforced on frontend and backend
- No password exposure in API responses (`select: false` in schema)

### API Security
- Protected routes require valid JWT token
- Customer middleware validates token type
- Order ownership verification before showing history
- Address ownership verification before CRUD operations

---

## 📈 Success Metrics

### Technical KPIs
- API response time: <500ms
- Order creation success rate: >95%
- Cart sync success rate: >98%
- Real-time update latency: <2 seconds

### User Experience KPIs
- Account creation: <3 clicks
- Login: <2 clicks
- Order placement (logged in): <4 clicks
- Order history load time: <1 second

### Business KPIs
- Account creation rate: 70%+
- Reorder usage: 60%+
- Address save rate (delivery orders): 80%+
- Cart abandonment: <5%

---

## 🧪 Testing Strategy

### Backend Testing
- Unit tests for models (validation)
- Integration tests for API endpoints
- Authentication flow testing
- Database query performance testing

### Frontend Testing
- Component unit tests (Jest + React Testing Library)
- Integration tests for user flows
- E2E tests with Cypress/Playwright
- Mobile responsiveness testing

### Manual Testing Scenarios
- New customer signup and first order
- Returning customer with saved data
- Multi-device cart sync
- Real-time order status updates
- Guest checkout (if implemented)

---

## 🚧 Known Limitations

### Current Scope Excludes
1. Email verification on signup
2. Password reset functionality
3. SMS OTP verification
4. Social login integration
5. Loyalty/rewards program
6. Order rating and reviews
7. Saved payment methods

### Future Enhancement Ideas
- Email verification with magic links
- "Forgot password" flow via SMS
- Two-factor authentication (2FA)
- Profile editing (change name, email, password)
- Order notifications via push/SMS
- Favorites/wishlist functionality
- Guest order linking to new accounts

---

## 🆘 Troubleshooting

### Common Issues

**Issue**: Token expired errors  
**Solution**: Check JWT_EXPIRES_IN setting, implement token refresh

**Issue**: Cart not syncing between devices  
**Solution**: Verify API endpoint, check authentication headers, inspect network tab

**Issue**: Socket.io not connecting  
**Solution**: Check CORS settings, verify Socket.io server configuration

**Issue**: Orders not linked to customer  
**Solution**: Ensure customerId is sent in order payload, check backend logging

**Issue**: Real-time updates not working  
**Solution**: Verify Socket.io room subscriptions, check event names (emit vs on)

---

## 📞 Additional Resources

### Related Documentation
- **Self-Checkout System**: `SelfCheckout_Complete_Context.md`
- **Payment Verification**: `MANUAL_PAYMENT_VERIFICATION_PLAN.md`
- **Socket.io Setup**: `SOCKET_IO_SETUP_COMPLETE.md`
- **Development Progress**: `DEVELOPMENT_PROGRESS.md`

### External References
- [JWT.io - JSON Web Tokens](https://jwt.io/)
- [Socket.io Documentation](https://socket.io/docs/v4/)
- [MongoDB Indexes Best Practices](https://www.mongodb.com/docs/manual/indexes/)
- [React Context API](https://react.dev/reference/react/useContext)
- [bcrypt Documentation](https://github.com/kelektiv/node.bcrypt.js)

---

## 🎓 Learning Path

### If You're New to...

**JWT Authentication**:
1. Read USER_ACCOUNTS_SYSTEM_ANALYSIS.md → Authentication Section
2. Review USER_ACCOUNTS_ARCHITECTURE.md → Authentication Flow
3. Study existing staff auth code: `routes/authRoutes.js`

**Socket.io**:
1. Read USER_ACCOUNTS_SYSTEM_ANALYSIS.md → Real-time Updates
2. Review USER_ACCOUNTS_ARCHITECTURE.md → Real-time Status Updates
3. Study existing Socket.io setup in project

**React Context API**:
1. Review existing contexts: `CartContext.jsx`, `MenuContext.jsx`
2. Read USER_ACCOUNTS_QUICK_START.md → CustomerAuthContext
3. Follow CHECKLIST Phase 2 for implementation

**MongoDB Schemas**:
1. Study existing models: `Order.js`, `User.js`
2. Read USER_ACCOUNTS_SYSTEM_ANALYSIS.md → Data Models
3. Reference Mongoose documentation

---

## ✅ Pre-Implementation Checklist

Before starting implementation:

- [ ] **Read all documentation** (at minimum: INDEX + QUICK START)
- [ ] **Backup database** (MongoDB dump or Atlas snapshot)
- [ ] **Create feature branch** (`git checkout -b feature/customer-accounts`)
- [ ] **Test current system** (ensure self-checkout works)
- [ ] **Set up environment** (Node.js, MongoDB, dependencies installed)
- [ ] **Review existing code** (especially Cart, Order, and Auth systems)
- [ ] **Install Postman/Thunder Client** (for API testing)
- [ ] **Set up project board** (GitHub Projects or Trello)
- [ ] **Schedule daily check-ins** (team standup if applicable)
- [ ] **Reserve 12 days** (adjust if team size differs)

---

## 🎉 Ready to Start?

**Recommended First Steps:**

1. **Today**: 
   - Read [USER_ACCOUNTS_INDEX.md](./USER_ACCOUNTS_INDEX.md)
   - Read [USER_ACCOUNTS_QUICK_START.md](./USER_ACCOUNTS_QUICK_START.md)
   - Complete pre-implementation checklist above

2. **Tomorrow (Day 1)**:
   - Open [USER_ACCOUNTS_IMPLEMENTATION_CHECKLIST.md](./USER_ACCOUNTS_IMPLEMENTATION_CHECKLIST.md)
   - Start Phase 1, Day 1, Morning tasks
   - Create `models/Customer.js`

3. **Next 11 Days**:
   - Follow checklist day by day
   - Reference other docs as needed
   - Test frequently
   - Commit code daily

4. **Day 12**:
   - Deploy to production
   - Set up monitoring
   - Celebrate! 🎊

---

## 🤝 Contributing

If you make changes to this system:
1. Update relevant documentation files
2. Keep diagrams in sync with code
3. Update checklist if steps change
4. Add notes to troubleshooting section
5. Update version history in files

---

## 📝 Version

**Version**: 1.0.0  
**Created**: November 23, 2025  
**Author**: AI Agent (GitHub Copilot)  
**Status**: Ready for Implementation  

---

## 💬 Questions?

Refer to:
- **USER_ACCOUNTS_INDEX.md** for navigation help
- **USER_ACCOUNTS_QUICK_START.md** for quick answers
- **USER_ACCOUNTS_SYSTEM_ANALYSIS.md** for detailed specs
- **USER_ACCOUNTS_ARCHITECTURE.md** for visual explanations
- **USER_ACCOUNTS_IMPLEMENTATION_CHECKLIST.md** for step-by-step guidance

---

**Good luck with your implementation!** 🚀

This documentation provides everything you need to build a robust, secure, and scalable customer account system. Follow the plan, test thoroughly, and you'll have a production-ready feature in 12 days.

**You've got this!** 💪
