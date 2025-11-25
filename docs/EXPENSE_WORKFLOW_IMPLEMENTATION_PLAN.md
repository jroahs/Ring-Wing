# Expense Management Role-Based Workflow Implementation Plan

## Executive Summary

This document outlines a comprehensive implementation plan for updating the Expense Management module to support role-based workflows with separate Staff and Admin experiences.

---

## Current State Analysis

### Database Model (`models/expense.js`)
Current fields:
- `date`, `amount`, `category`, `description`, `paymentMethod`
- `disbursed` (boolean) - marks as paid
- `disbursementDate` - when marked as paid
- `permanent` (boolean) - prevents daily reset

**Missing:** No user association, no approval workflow, no receipt upload support.

### Backend Routes (`routes/expenseRoutes.js`)
Current endpoints:
- `POST /` - Create expense (no auth)
- `GET /` - Get all expenses with filters
- `PUT /:id` - Update expense
- `DELETE /:id` - Delete expense
- `POST /reset-disbursement` - Get daily stats

**Missing:** No role-based access control, no approval endpoints.

### Frontend (`ExpenseDisbursement.jsx`)
- Full-featured admin dashboard with charts, analytics, filters
- No role-based conditional rendering
- No separate staff view

### Authentication System
- **User Model:** `role` field with values `['staff', 'manager']`
- **Position field:** `['cashier', 'inventory', 'shift_manager', 'general_manager', 'admin']`
- **Auth middleware:** Available in `middleware/authMiddleware.js`
- **Position-based routing:** Already implemented in `App.jsx` and `Sidebar.jsx`

---

## Proposed Changes

### 1. Database Schema Changes (`models/expense.js`)

Add new fields to expense schema:

```javascript
const expenseSchema = new mongoose.Schema({
  // Existing fields...
  
  // NEW: Workflow Status
  status: {
    type: String,
    enum: ['for_approval', 'approved', 'rejected', 'paid', 'created'],
    default: 'created'  // Admin-created expenses start as 'created'
  },
  
  // NEW: Requester Information (for staff requests)
  requesterId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null
  },
  requesterName: {
    type: String,
    default: null
  },
  requesterPosition: {
    type: String,
    default: null
  },
  
  // NEW: Approval Information
  approvedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null
  },
  approverName: {
    type: String,
    default: null
  },
  approvedAt: {
    type: Date,
    default: null
  },
  rejectionReason: {
    type: String,
    default: null
  },
  
  // NEW: Receipt/File Upload
  receiptUrl: {
    type: String,
    default: null
  },
  receiptFileName: {
    type: String,
    default: null
  },
  
  // NEW: Creator tracking
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null
  },
  creatorRole: {
    type: String,
    enum: ['staff', 'manager', 'admin'],
    default: null
  }
});
```

### 2. Backend API Changes (`routes/expenseRoutes.js`)

#### A. Add Authentication Middleware
```javascript
const { auth, authorize } = require('../middleware/authMiddleware');
const multer = require('multer');
const path = require('path');

// Configure multer for receipt uploads
const storage = multer.diskStorage({
  destination: './uploads/receipts',
  filename: (req, file, cb) => {
    cb(null, `receipt-${Date.now()}${path.extname(file.originalname)}`);
  }
});
const upload = multer({ storage, limits: { fileSize: 5 * 1024 * 1024 } });
```

#### B. New/Modified Endpoints

| Endpoint | Method | Access | Description |
|----------|--------|--------|-------------|
| `POST /` | POST | All authenticated | Create expense (auto-sets status based on role) |
| `GET /` | GET | Admin: all, Staff: own only | Get expenses with role-based filtering |
| `GET /my-requests` | GET | Staff | Get only the logged-in staff's expense requests |
| `POST /:id/approve` | POST | Admin/Manager | Approve a staff expense request |
| `POST /:id/reject` | POST | Admin/Manager | Reject a staff expense request |
| `POST /:id/mark-paid` | POST | Admin/Manager | Mark approved expense as paid |
| `POST /upload-receipt` | POST | All | Upload receipt file |
| `GET /pending-approvals` | GET | Admin/Manager | Get all expenses awaiting approval |

#### C. Role-Based Creation Logic
```javascript
// In POST / endpoint:
if (req.user.role === 'staff' || 
    !['shift_manager', 'general_manager', 'admin'].includes(req.user.position)) {
  // Staff creates expense request
  expense.status = 'for_approval';
  expense.requesterId = req.user._id;
  expense.requesterName = req.user.username;
  expense.requesterPosition = req.user.position;
} else {
  // Admin/Manager creates expense directly
  expense.status = 'created';
  expense.createdBy = req.user._id;
  expense.creatorRole = req.user.role;
}
```

### 3. Frontend Changes

#### A. New Component: `StaffExpenseRequests.jsx`
A simplified expense page for staff users showing:
- Form to create new expense request
- List of their own requests with statuses
- Status badges: For Approval (yellow), Approved (blue), Rejected (red), Paid (green)
- No charts, analytics, or other users' data

**Features:**
- Create expense request form with receipt upload
- View own requests in a simple card/list format
- Filter by status (For Approval, Approved, Rejected, Paid)
- Cancel pending requests (optional)

#### B. Modified: `ExpenseDisbursement.jsx` (Admin View)
Add new tabs/sections:
- **Pending Approvals Tab**: Shows expenses awaiting approval with approve/reject buttons
- **All Expenses Tab**: Existing view with all expenses
- Add requester name display for staff-created expenses
- Add approval workflow actions

#### C. Sidebar Changes (`Sidebar.jsx`)
```javascript
// Add new nav item for staff
{
  path: '/my-expense-requests',
  icon: <FiDollarSign size={iconSize} className="text-white" />,
  label: 'My Expense Requests',
  positions: ['cashier', 'inventory']  // Staff-only positions
},
// Modify existing expenses entry
{
  path: '/expenses',
  icon: <FiTrendingDown size={iconSize} className="text-white" />,
  label: 'Expense Management',
  positions: ['shift_manager', 'general_manager', 'admin']  // Admin/Manager only
}
```

#### D. App.jsx Route Updates
```jsx
// Staff expense requests route
<Route path="/my-expense-requests" element={
  <PositionProtectedRoute requiredPositions={['cashier', 'inventory']}>
    <StaffExpenseRequests colors={colors} />
  </PositionProtectedRoute>
} />

// Admin expense management (existing, unchanged)
<Route path="/expenses" element={
  <PositionProtectedRoute requiredPositions={['shift_manager', 'general_manager', 'admin']}>
    <ExpenseTracker colors={colors} />
  </PositionProtectedRoute>
} />
```

### 4. File Upload System

#### Backend Setup
1. Create `uploads/receipts` directory
2. Add multer configuration to expense routes
3. Serve static files from `/uploads/receipts`

#### Frontend Component: Receipt Upload (in StaffExpenseRequests)
- Reuse patterns from `ProofOfPaymentUpload.jsx`
- Accept image files (JPG, PNG, WEBP)
- 5MB max file size
- Show preview before submission

---

## Implementation Order

### Phase 1: Backend Foundation
1. Update `models/expense.js` with new schema fields
2. Add authentication middleware to expense routes
3. Implement role-based expense creation
4. Add approve/reject endpoints
5. Set up file upload for receipts

### Phase 2: Admin Dashboard Updates
1. Add "Pending Approvals" tab to `ExpenseDisbursement.jsx`
2. Create approval/rejection UI components
3. Display requester info on staff-created expenses
4. Add "Mark as Paid" action for approved expenses

### Phase 3: Staff Interface
1. Create `StaffExpenseRequests.jsx` component
2. Add form with receipt upload
3. Display request list with status badges
4. Add route to `App.jsx` and nav item to `Sidebar.jsx`

### Phase 4: Testing & Polish
1. Test staff workflow end-to-end
2. Test admin workflow end-to-end
3. Verify position-based access controls
4. Handle edge cases (cancellation, editing, etc.)

---

## Files to Create

| File | Purpose |
|------|---------|
| `frontend/src/StaffExpenseRequests.jsx` | Staff expense request page |
| `frontend/src/components/ui/ExpenseRequestCard.jsx` | Card component for staff requests |
| `frontend/src/components/ui/ExpenseApprovalCard.jsx` | Card component for admin approvals |
| `frontend/src/components/ui/ReceiptUpload.jsx` | Receipt file upload component |

## Files to Modify

| File | Changes |
|------|---------|
| `backend/models/expense.js` | Add workflow fields |
| `backend/routes/expenseRoutes.js` | Add auth, new endpoints |
| `backend/server.js` | Add static file serving for receipts |
| `frontend/src/ExpenseDisbursement.jsx` | Add pending approvals tab |
| `frontend/src/Sidebar.jsx` | Add staff expense nav item |
| `frontend/src/App.jsx` | Add staff expense route |

---

## Workflow Diagrams

### Staff Workflow
```
Staff Creates Request → Status: "For Approval"
          ↓
    Admin Reviews
     /        \
  Approve    Reject
     ↓          ↓
"Approved"  "Rejected"
     ↓
Admin Marks Paid
     ↓
  "Paid"
```

### Admin Workflow
```
Admin Creates Expense → Status: "Created"
          ↓
   Admin Marks Paid
          ↓
       "Paid"
```

---

## Status Definitions

| Status | Description | Can Be Changed To |
|--------|-------------|-------------------|
| `for_approval` | Staff request awaiting admin review | approved, rejected |
| `approved` | Admin approved, ready for payment | paid |
| `rejected` | Admin rejected the request | (terminal) |
| `paid` | Payment completed | (terminal) |
| `created` | Admin-created expense | paid |

---

## Security Considerations

1. **Authentication Required**: All expense endpoints require valid JWT token
2. **Position-Based Authorization**: 
   - Staff can only view/create their own requests
   - Only managers+ can approve/reject/mark paid
3. **File Upload Validation**: Strict file type and size limits
4. **Audit Trail**: All status changes tracked with user ID and timestamp

---

## Ready for Implementation

This plan provides a complete roadmap. Shall I proceed with implementing:
1. **Phase 1**: Backend changes first?
2. **All phases**: Complete implementation in one go?

Please confirm to begin coding.
