/**
 * API Endpoint Structure Validation
 * This file documents the expected request/response formats for testing
 */

// ============================================
// 1. LOGIN ENDPOINT (Enhanced)
// ============================================

// POST /api/auth/login
const loginRequest = {
  username: "johndoe",
  password: "password123"
};

const loginResponse = {
  success: true,
  auth: true,
  token: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  _id: "507f1f77bcf86cd799439011",
  username: "johndoe",
  email: "john@example.com",
  role: "staff",
  position: "cashier",
  reportsTo: null,
  staffId: "507f1f77bcf86cd799439012",  // NEW: Added for payslip access
  staffName: "John Doe"                   // NEW: Display name
};

// ============================================
// 2. STAFF PAYSLIPS ENDPOINT
// ============================================

// GET /api/staff/:staffId/payslips?startDate=2025-01-01&endDate=2025-12-31
// Headers: Authorization: Bearer <token>

const staffPayslipsResponse = {
  success: true,
  count: 3,
  data: [
    {
      _id: "507f1f77bcf86cd799439013",
      staffId: {
        _id: "507f1f77bcf86cd799439012",
        name: "John Doe",
        position: "Cashier",
        sssNumber: "12-3456789-0",
        philHealthNumber: "PH-12345678",
        pagIbigNumber: "PG-123456789012",
        tinNumber: "123-456-789"
      },
      payrollPeriod: "2025-11-15T00:00:00.000Z",
      basicPay: 13000,
      overtimePay: 500,
      allowances: 1000,
      holidayPay: 0,
      thirteenthMonthPay: 0,
      bonuses: {
        holiday: 0,
        performance: 500,
        other: 0
      },
      deductions: {
        late: 0,
        absence: 0,
        sss: 650,           // NEW: SSS deduction
        philHealth: 325,    // NEW: PhilHealth deduction
        pagIbig: 200,       // NEW: Pag-IBIG deduction
        withholdingTax: 0
      },
      netPay: 13825,
      totalHoursWorked: 160,
      createdAt: "2025-11-15T08:00:00.000Z"
    }
  ]
};

// ============================================
// 3. SINGLE PAYSLIP DETAIL ENDPOINT
// ============================================

// GET /api/staff/payslip/:payslipId
// Headers: Authorization: Bearer <token>

const payslipDetailResponse = {
  success: true,
  data: {
    _id: "507f1f77bcf86cd799439013",
    staffId: {
      _id: "507f1f77bcf86cd799439012",
      name: "John Doe",
      position: "Cashier",
      sssNumber: "12-3456789-0",
      philHealthNumber: "PH-12345678",
      pagIbigNumber: "PG-123456789012",
      tinNumber: "123-456-789",
      email: "john@example.com",
      contactNumber: "09123456789"
    },
    payrollPeriod: "2025-11-15T00:00:00.000Z",
    basicPay: 13000,
    overtimePay: 500,
    allowances: 1000,
    holidayPay: 0,
    thirteenthMonthPay: 0,
    bonuses: {
      holiday: 0,
      performance: 500,
      other: 0
    },
    deductions: {
      late: 0,
      absence: 0,
      sss: 650,
      philHealth: 325,
      pagIbig: 200,
      withholdingTax: 0
    },
    netPay: 13825,
    totalHoursWorked: 160,
    overtimeHours: 10,
    timeLogs: [
      {
        _id: "507f1f77bcf86cd799439014",
        clockIn: "2025-11-15T08:00:00.000Z",
        clockOut: "2025-11-15T17:00:00.000Z",
        totalHours: 8
      }
    ],
    createdAt: "2025-11-15T08:00:00.000Z",
    updatedAt: "2025-11-15T08:00:00.000Z"
  }
};

// ============================================
// 4. CREATE PAYROLL WITH BONUSES (Enhanced)
// ============================================

// POST /api/payroll/create-with-bonuses
// Headers: Authorization: Bearer <token>

const createPayrollRequest = {
  staffId: "507f1f77bcf86cd799439012",
  payrollPeriod: "2025-11-15T00:00:00.000Z",
  basicPay: 13000,
  overtimePay: 500,
  totalHoursWorked: 160,
  overtimeHours: 10,
  allowances: 1000,
  holidayPay: 0,
  thirteenthMonthPay: 0,
  bonuses: {
    holiday: 0,
    performance: 500,
    other: 0
  },
  holidaysWorked: [],
  deductions: {
    late: 0,
    absence: 0,
    sss: 650,           // NEW: Calculated by backend
    philHealth: 325,    // NEW: Calculated by backend
    pagIbig: 200        // NEW: Calculated by backend
  },
  netPay: 13825,
  timeLogs: ["507f1f77bcf86cd799439014", "507f1f77bcf86cd799439015"]
};

const createPayrollResponse = {
  success: true,
  message: "Payroll created successfully",
  data: {
    _id: "507f1f77bcf86cd799439013",
    staffId: "507f1f77bcf86cd799439012",
    payrollPeriod: "2025-11-15T00:00:00.000Z",
    basicPay: 13000,
    overtimePay: 500,
    allowances: 1000,
    bonuses: {
      holiday: 0,
      performance: 500,
      other: 0
    },
    deductions: {
      late: 0,
      absence: 0,
      sss: 650,
      philHealth: 325,
      pagIbig: 200,
      withholdingTax: 0
    },
    netPay: 13825,
    totalHoursWorked: 160,
    overtimeHours: 10,
    governmentDeductions: {        // NEW: Detailed breakdown
      sss: {
        amount: 650,
        hasId: true,
        msc: 13000
      },
      philHealth: {
        amount: 325,
        hasId: true
      },
      pagIbig: {
        amount: 200,
        hasId: true
      },
      total: 1175,
      breakdown: {
        sss: 650,
        philHealth: 325,
        pagIbig: 200
      }
    },
    createdAt: "2025-11-15T08:00:00.000Z"
  }
};

// ============================================
// 5. ACCESS CONTROL TESTS
// ============================================

// Staff trying to access another staff's payslips
// GET /api/staff/507f1f77bcf86cd799439099/payslips
// (When logged in as staffId: 507f1f77bcf86cd799439012)

const unauthorizedResponse = {
  success: false,
  message: "You can only view your own payslips"
};

// Manager accessing any staff's payslips - ALLOWED
// GET /api/staff/507f1f77bcf86cd799439099/payslips
// (When logged in as position: shift_manager)

const managerAccessResponse = {
  success: true,
  count: 5,
  data: [/* payslips of other staff */]
};

// ============================================
// 6. ERROR RESPONSES
// ============================================

// Invalid payslip ID
const invalidIdResponse = {
  success: false,
  message: "Invalid payslip ID"
};

// Payslip not found
const notFoundResponse = {
  success: false,
  message: "Payslip not found"
};

// Missing staffId in userData
const missingStaffIdResponse = {
  success: false,
  message: "Staff information not found"
};

// ============================================
// TESTING CHECKLIST
// ============================================

/*
MANUAL TESTING STEPS:

1. Login Tests
   [ ] Login with cashier account
   [ ] Verify staffId is present in localStorage
   [ ] Check userData contains: id, staffId, staffName, position

2. Staff Payslip List Tests
   [ ] Navigate to "My Payslips" from sidebar
   [ ] Verify list displays all payslips for logged-in staff
   [ ] Test date range filter (start date, end date)
   [ ] Clear filter and verify all records show

3. Staff Payslip Detail Tests
   [ ] Click "View Details" on a payslip
   [ ] Verify employee information displays correctly
   [ ] Check earnings breakdown shows all components
   [ ] Verify government deductions section:
       - SSS amount and ID number
       - PhilHealth amount and ID number
       - Pag-IBIG amount and ID number
   [ ] Verify missing ID notice if applicable
   [ ] Check net pay calculation is correct

4. Manager Payroll Generation Tests
   [ ] Login with manager account
   [ ] Navigate to Payroll System
   [ ] Select an employee with all government IDs
   [ ] Generate payroll and verify:
       - Government deductions calculated automatically
       - Deductions display in breakdown
       - Net pay includes government deductions
   [ ] Test employee with missing IDs
       - Verify only deductions for present IDs apply
       - Check "Note:" message displays missing IDs

5. Access Control Tests
   [ ] Login as cashier (staffId A)
   [ ] Try accessing /my-payslips
   [ ] Verify only shows own payslips (staffId A)
   [ ] Login as manager
   [ ] Verify can generate payroll for any staff
   [ ] Verify can view payroll history for any staff

6. Data Persistence Tests
   [ ] Generate new payroll with government deductions
   [ ] Refresh page
   [ ] Verify deductions still present
   [ ] Check database record directly
   [ ] Verify all deduction fields saved correctly

7. Edge Cases
   [ ] Employee with salary below ₱10,000 (PhilHealth floor)
   [ ] Employee with salary above ₱100,000 (PhilHealth ceiling)
   [ ] Employee with salary above ₱35,000 (SSS maximum MSC)
   [ ] Employee with no government IDs
   [ ] Employee with partial government IDs
*/

module.exports = {
  loginRequest,
  loginResponse,
  staffPayslipsResponse,
  payslipDetailResponse,
  createPayrollRequest,
  createPayrollResponse,
  unauthorizedResponse,
  managerAccessResponse
};
