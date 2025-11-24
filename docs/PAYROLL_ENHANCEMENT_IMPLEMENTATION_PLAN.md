# Payroll Enhancement Implementation Plan

## Project Overview
Implement comprehensive government deductions (SSS, PhilHealth, Pag-IBIG) and staff-level payslip viewing functionality in the Ring-Wing payroll system.

**Date Created:** November 24, 2025  
**Status:** Planning Phase  
**Estimated Duration:** 10 Phases

---

## Table of Contents
1. [Current System Analysis](#current-system-analysis)
2. [Requirements Summary](#requirements-summary)
3. [System Architecture](#system-architecture)
4. [Implementation Phases](#implementation-phases)
5. [Technical Specifications](#technical-specifications)
6. [Database Schema Changes](#database-schema-changes)
7. [API Endpoints](#api-endpoints)
8. [UI/UX Changes](#uiux-changes)
9. [Testing Strategy](#testing-strategy)
10. [Deployment Plan](#deployment-plan)

---

## Current System Analysis

### Existing Models
**Backend:**
- **Payroll Model** (`ring-and-wing-backend/models/Payroll.js`)
  - Current deductions: `late` and `absence` only
  - Fields: `basicPay`, `overtimePay`, `allowances`, `holidayPay`, `thirteenthMonthPay`, `bonuses`
  - Net pay calculation: `grossPay - (late + absence deductions)`
  
- **Staff Model** (`ring-and-wing-backend/models/Staff.js`)
  - Has fields: `sssNumber`, `tinNumber`, `philHealthNumber`
  - Fields exist but not used in payroll calculations

**Frontend:**
- **PayrollSystem.jsx** (1214 lines)
  - Manager-only access (shift_manager, general_manager, admin)
  - Generates payroll for employees
  - Displays breakdown: regular pay, overtime, bonuses, deductions
  - Current deductions: late minutes, absences
  
- **PayrollReports.jsx**
  - Summary reports for management
  - Export functionality

### Current User Roles & Permissions
```javascript
Positions Hierarchy:
1. cashier - POS only
2. inventory - Inventory + POS
3. shift_manager - Dashboard, POS, Inventory, Menu, Staff, Payroll, Reports
4. general_manager - Full access except system settings
5. admin - Complete system access
```

### Current Navigation Structure
```
Sidebar (for managers):
├── Staff
│   ├── Employee Management (/employees)
│   └── Payroll System (/payroll)
```

**Gap:** No staff-level payroll viewing component

---

## Requirements Summary

### 1. Government Deductions

#### SSS (Social Security System)
- **Calculation:** 5% of Monthly Salary Credit (MSC)
- **MSC Range:** ₱5,000 – ₱35,000
- **Logic:** Based on salary bracket, not exact salary
- **Condition:** Only if `sssNumber` exists
- **Example:** Salary ₱15,000 → MSC ₱15,000 → Deduction = ₱750

#### PhilHealth (Philippine Health Insurance)
- **Calculation:** 2.5% of monthly salary (employee portion)
- **Total Premium:** 5% (split 50/50 employer/employee)
- **Floor:** ₱10,000
- **Ceiling:** ₱100,000
- **Condition:** Only if `philHealthNumber` exists
- **Example:** Salary ₱15,000 → Deduction = ₱375

#### Pag-IBIG (Home Development Mutual Fund)
- **Calculation:** 2% of monthly salary
- **Cap:** Maximum ₱200
- **Condition:** Only if `pagIbigNumber` exists (need to add this field)
- **Example:** Salary ₱15,000 → 2% = ₱300 → Capped at ₱200

#### Withholding Tax
- **Status:** Currently not implemented
- **Requirement:** Include in future phases if needed
- **For now:** Display as 0 or placeholder

### 2. Net Pay Calculation Formula
```
Net Pay = Gross Pay 
          - SSS (if exists)
          - PhilHealth (if exists)
          - Pag-IBIG (if exists)
          - Withholding Tax (if applicable)
          - Late Deductions
          - Absence Deductions

Where Gross Pay = Basic Pay + Overtime + Allowances + Holiday Pay + 13th Month + Bonuses
```

### 3. Staff Payslip Component
- **Access Level:** All staff (cashier, inventory, shift_manager, general_manager, admin)
- **Location:** New sidebar item "My Payslip"
- **Features:**
  - View detailed payslip for current/past periods
  - Display all income components
  - Display all deduction components
  - Show calculation breakdown
  - Download as PDF
- **Security:** Staff can only view their own payslips

### 4. Configuration Requirements
- Rates must be configurable for future updates
- Admin interface to update:
  - SSS MSC brackets and rates
  - PhilHealth floor/ceiling/rate
  - Pag-IBIG rate and cap
  - Withholding tax brackets (future)

---

## System Architecture

### Data Flow
```
┌─────────────────────────────────────────────────────────────┐
│                    PAYROLL ENHANCEMENT SYSTEM                │
└─────────────────────────────────────────────────────────────┘

MANAGER VIEW (Existing + Enhanced)
┌─────────────────────┐
│  PayrollSystem.jsx  │
│  (Manager Interface)│
└──────────┬──────────┘
           │
           ├─> Select Employee
           ├─> Calculate Payroll
           │   ├─> Basic Pay (hours × rate)
           │   ├─> Overtime Pay
           │   ├─> Allowances
           │   ├─> Holiday Pay
           │   ├─> 13th Month
           │   ├─> Bonuses
           │   └─> Deductions
           │       ├─> Late/Absence
           │       └─> Government Deductions ← NEW
           │           ├─> SSS (if sssNumber exists)
           │           ├─> PhilHealth (if philHealthNumber exists)
           │           └─> Pag-IBIG (if pagIbigNumber exists)
           │
           ├─> Save to Database
           └─> Generate PDF

STAFF VIEW (New Component)
┌─────────────────────┐
│  StaffPayslip.jsx   │
│  (Staff Interface)  │
└──────────┬──────────┘
           │
           ├─> Fetch Own Payroll Records
           │   ├─> GET /api/payroll/my-payslips
           │   └─> Authenticated by authMiddleware
           │
           ├─> Display Detailed Breakdown
           │   ├─> Gross Pay Components
           │   ├─> Government Deductions
           │   ├─> Other Deductions
           │   └─> Net Pay
           │
           └─> Download PDF

DATABASE LAYER
┌─────────────────────┐
│   Payroll Model     │
│   (Enhanced)        │
└──────────┬──────────┘
           │
           └─> deductions: {
                 late: Number,
                 absence: Number,
                 sss: Number,          ← NEW
                 philHealth: Number,   ← NEW
                 pagIbig: Number,      ← NEW
                 withholdingTax: Number ← NEW
               }

┌─────────────────────┐
│   Staff Model       │
│   (Add Field)       │
└──────────┬──────────┘
           │
           └─> pagIbigNumber: String ← NEW

CONFIGURATION SYSTEM (New)
┌─────────────────────┐
│ PayrollConfig Model │
└──────────┬──────────┘
           │
           └─> Store configurable rates
               ├─> SSS MSC Brackets
               ├─> PhilHealth rates/floors
               ├─> Pag-IBIG rate/cap
               └─> Tax brackets (future)
```

---

## Implementation Phases

### Phase 1: Database Schema & Government Deductions Backend
**Duration:** 2-3 hours  
**Priority:** High

#### Tasks:
1. **Update Payroll Model** (`models/Payroll.js`)
   ```javascript
   deductions: {
     late: { type: Number, default: 0, min: 0 },
     absence: { type: Number, default: 0, min: 0 },
     sss: { type: Number, default: 0, min: 0 },
     philHealth: { type: Number, default: 0, min: 0 },
     pagIbig: { type: Number, default: 0, min: 0 },
     withholdingTax: { type: Number, default: 0, min: 0 }
   }
   ```

2. **Add Pag-IBIG field to Staff Model** (`models/Staff.js`)
   ```javascript
   pagIbigNumber: {
     type: String,
     required: false
   }
   ```

3. **Create Government Deductions Utility** (`utils/governmentDeductions.js`)
   - `calculateSSS(monthlySalary, hasSSSNumber)`
   - `calculatePhilHealth(monthlySalary, hasPhilHealthNumber)`
   - `calculatePagIbig(monthlySalary, hasPagIbigNumber)`
   - MSC bracket mapping for SSS
   - Configurable rates (hardcoded initially, move to config later)

4. **Update Payroll Virtual Fields**
   ```javascript
   payrollSchema.virtual('totalDeductions').get(function() {
     return this.deductions.late + 
            this.deductions.absence + 
            this.deductions.sss + 
            this.deductions.philHealth + 
            this.deductions.pagIbig + 
            this.deductions.withholdingTax;
   });
   ```

#### Files to Create/Modify:
- ✏️ `ring-and-wing-backend/models/Payroll.js`
- ✏️ `ring-and-wing-backend/models/Staff.js`
- 🆕 `ring-and-wing-backend/utils/governmentDeductions.js`

---

### Phase 2: Update Net Pay Calculation Logic
**Duration:** 2-3 hours  
**Priority:** High

#### Tasks:
1. **Update Payroll Routes** (`routes/payrollRoutes.js`)
   - Import government deductions utility
   - Calculate deductions in `POST /create-with-bonuses`
   - Include in net pay calculation

2. **Update Pre-save Middleware** in Payroll Model
   ```javascript
   payrollSchema.pre('save', function(next) {
     const totalDeductions = 
       (this.deductions.late || 0) + 
       (this.deductions.absence || 0) + 
       (this.deductions.sss || 0) + 
       (this.deductions.philHealth || 0) + 
       (this.deductions.pagIbig || 0) + 
       (this.deductions.withholdingTax || 0);
     
     this.netPay = this.grossPay - totalDeductions;
     next();
   });
   ```

3. **Add Calculation Logic**
   ```javascript
   // In payroll creation endpoint
   const staff = await Staff.findById(staffId);
   const monthlySalary = basicPay; // or calculate monthly equivalent
   
   const sss = calculateSSS(monthlySalary, !!staff.sssNumber);
   const philHealth = calculatePhilHealth(monthlySalary, !!staff.philHealthNumber);
   const pagIbig = calculatePagIbig(monthlySalary, !!staff.pagIbigNumber);
   
   deductions: {
     late: deductions?.late || 0,
     absence: deductions?.absence || 0,
     sss,
     philHealth,
     pagIbig,
     withholdingTax: 0 // placeholder
   }
   ```

#### Files to Modify:
- ✏️ `ring-and-wing-backend/routes/payrollRoutes.js`
- ✏️ `ring-and-wing-backend/models/Payroll.js`

---

### Phase 3: Frontend Payroll UI Enhancement
**Duration:** 3-4 hours  
**Priority:** High

#### Tasks:
1. **Update PayrollSystem.jsx** calculation function
   - Import/replicate government deduction logic
   - Update `calculateNetSalary()` to include government deductions
   - Add state for government deductions

2. **Add Government Deductions Display**
   ```jsx
   {/* Government Deductions Section */}
   <div className="bg-opacity-10 p-4 rounded mb-4">
     <h3>Government Deductions</h3>
     
     {selectedEmployee.sssNumber && (
       <div className="flex justify-between">
         <span>SSS:</span>
         <span>- ₱{calculations.sss.toFixed(2)}</span>
       </div>
     )}
     
     {selectedEmployee.philHealthNumber && (
       <div className="flex justify-between">
         <span>PhilHealth:</span>
         <span>- ₱{calculations.philHealth.toFixed(2)}</span>
       </div>
     )}
     
     {selectedEmployee.pagIbigNumber && (
       <div className="flex justify-between">
         <span>Pag-IBIG:</span>
         <span>- ₱{calculations.pagIbig.toFixed(2)}</span>
       </div>
     )}
   </div>
   ```

3. **Update API call** to include government deductions in payroll submission

4. **Add Manual Override** (Optional)
   - Allow managers to manually adjust government deductions if needed
   - Add input fields with calculated defaults

#### Files to Modify:
- ✏️ `ring-and-wing-frontend/src/PayrollSystem.jsx`
- 🆕 `ring-and-wing-frontend/src/utils/governmentDeductions.js` (frontend version)

---

### Phase 4: Staff Payslip View Component (Backend)
**Duration:** 2 hours  
**Priority:** High

#### Tasks:
1. **Create Staff Payslip Routes** (`routes/staffPayslipRoutes.js`)
   ```javascript
   // GET /api/staff-payslip/my-payslips
   router.get('/my-payslips', auth, async (req, res) => {
     // Get authenticated staff's ID from req.staff
     const staffId = req.staff._id;
     
     // Fetch payroll records for this staff member
     const payrolls = await Payroll.find({ staffId })
       .populate('staffId', 'name position')
       .sort('-payrollPeriod');
     
     res.json({ success: true, data: payrolls });
   });
   
   // GET /api/staff-payslip/my-payslips/:payrollId
   router.get('/my-payslips/:payrollId', auth, async (req, res) => {
     const payroll = await Payroll.findById(req.params.payrollId)
       .populate('staffId', 'name position sssNumber tinNumber philHealthNumber pagIbigNumber');
     
     // Verify ownership
     if (payroll.staffId._id.toString() !== req.staff._id.toString()) {
       return res.status(403).json({ 
         success: false, 
         message: 'Access denied' 
       });
     }
     
     res.json({ success: true, data: payroll });
   });
   ```

2. **Add Route to Server**
   - Register in `server.js` or main app file
   - Ensure `auth` middleware is applied

#### Files to Create/Modify:
- 🆕 `ring-and-wing-backend/routes/staffPayslipRoutes.js`
- ✏️ `ring-and-wing-backend/server.js` (register route)

---

### Phase 5: Staff Payslip View Component (Frontend)
**Duration:** 4-5 hours  
**Priority:** High

#### Tasks:
1. **Create StaffPayslip.jsx Component**
   ```jsx
   import { useState, useEffect } from 'react';
   import api from './services/apiService';
   import { FiDownload, FiCalendar } from 'react-icons/fi';
   
   const StaffPayslip = () => {
     const [payslips, setPayslips] = useState([]);
     const [selectedPayslip, setSelectedPayslip] = useState(null);
     const [isLoading, setIsLoading] = useState(true);
     
     useEffect(() => {
       fetchPayslips();
     }, []);
     
     const fetchPayslips = async () => {
       try {
         const { data } = await api.get('/api/staff-payslip/my-payslips');
         setPayslips(data.data);
       } catch (error) {
         toast.error('Failed to load payslips');
       } finally {
         setIsLoading(false);
       }
     };
     
     return (
       <div className="p-6">
         <h1>My Payslips</h1>
         
         {/* Payslip List */}
         <div className="grid gap-4">
           {payslips.map(payslip => (
             <PayslipCard 
               key={payslip._id}
               payslip={payslip}
               onClick={() => setSelectedPayslip(payslip)}
             />
           ))}
         </div>
         
         {/* Detailed View Modal/Panel */}
         {selectedPayslip && (
           <PayslipDetail 
             payslip={selectedPayslip}
             onClose={() => setSelectedPayslip(null)}
           />
         )}
       </div>
     );
   };
   ```

2. **Create PayslipDetail Component**
   - Display all income components (basic, OT, allowances, bonuses)
   - Display all deduction components (late, absence, government)
   - Show calculation breakdown
   - Add download button (triggers PDF generation)

3. **Styling**
   - Match existing PayrollSystem design
   - Use centralized colors from theme
   - Responsive design

#### Files to Create:
- 🆕 `ring-and-wing-frontend/src/StaffPayslip.jsx`
- 🆕 `ring-and-wing-frontend/src/components/PayslipDetail.jsx`
- 🆕 `ring-and-wing-frontend/src/components/PayslipCard.jsx`

---

### Phase 6: PDF Generation & Download Feature
**Duration:** 3-4 hours  
**Priority:** Medium

#### Tasks:
1. **Install PDF Library**
   ```bash
   npm install jspdf jspdf-autotable
   # or
   npm install @react-pdf/renderer
   ```

2. **Create PDF Generation Utility** (`utils/payslipPDF.js`)
   ```javascript
   import jsPDF from 'jspdf';
   import 'jspdf-autotable';
   
   export const generatePayslipPDF = (payslip, staffInfo) => {
     const doc = new jsPDF();
     
     // Header
     doc.setFontSize(20);
     doc.text('Ring & Wing', 105, 20, { align: 'center' });
     doc.setFontSize(12);
     doc.text('Payslip', 105, 30, { align: 'center' });
     
     // Employee Info
     doc.setFontSize(10);
     doc.text(`Employee: ${staffInfo.name}`, 20, 45);
     doc.text(`Position: ${staffInfo.position}`, 20, 52);
     doc.text(`Period: ${formatDate(payslip.payrollPeriod)}`, 20, 59);
     
     // Income Table
     doc.autoTable({
       startY: 70,
       head: [['Income', 'Amount']],
       body: [
         ['Basic Pay', `₱${payslip.basicPay.toFixed(2)}`],
         ['Overtime Pay', `₱${payslip.overtimePay.toFixed(2)}`],
         ['Allowances', `₱${payslip.allowances.toFixed(2)}`],
         ['Holiday Pay', `₱${payslip.holidayPay.toFixed(2)}`],
         // ... other income
         ['Gross Pay', `₱${payslip.grossPay.toFixed(2)}`]
       ]
     });
     
     // Deductions Table
     doc.autoTable({
       startY: doc.lastAutoTable.finalY + 10,
       head: [['Deductions', 'Amount']],
       body: [
         ['SSS', `₱${payslip.deductions.sss.toFixed(2)}`],
         ['PhilHealth', `₱${payslip.deductions.philHealth.toFixed(2)}`],
         ['Pag-IBIG', `₱${payslip.deductions.pagIbig.toFixed(2)}`],
         ['Late/Absence', `₱${(payslip.deductions.late + payslip.deductions.absence).toFixed(2)}`],
         ['Total Deductions', `₱${payslip.totalDeductions.toFixed(2)}`]
       ]
     });
     
     // Net Pay
     doc.setFontSize(14);
     doc.text(`Net Pay: ₱${payslip.netPay.toFixed(2)}`, 20, doc.lastAutoTable.finalY + 20);
     
     // Save
     doc.save(`payslip-${staffInfo.name}-${formatDate(payslip.payrollPeriod)}.pdf`);
   };
   ```

3. **Add Download Button**
   - In StaffPayslip component
   - In PayrollSystem (manager view)

#### Files to Create/Modify:
- 🆕 `ring-and-wing-frontend/src/utils/payslipPDF.js`
- ✏️ `ring-and-wing-frontend/src/StaffPayslip.jsx`
- ✏️ `ring-and-wing-frontend/src/PayrollSystem.jsx`

---

### Phase 7: Configuration System for Rates
**Duration:** 4-5 hours  
**Priority:** Medium

#### Tasks:
1. **Create PayrollConfig Model** (`models/PayrollConfig.js`)
   ```javascript
   const payrollConfigSchema = new mongoose.Schema({
     configType: {
       type: String,
       enum: ['SSS', 'PhilHealth', 'PagIbig', 'Tax'],
       required: true,
       unique: true
     },
     sss: {
       mscBrackets: [{
         min: Number,
         max: Number,
         msc: Number,
         employeeRate: { type: Number, default: 0.05 }
       }]
     },
     philHealth: {
       floor: { type: Number, default: 10000 },
       ceiling: { type: Number, default: 100000 },
       totalRate: { type: Number, default: 0.05 },
       employeeShare: { type: Number, default: 0.025 }
     },
     pagIbig: {
       rate: { type: Number, default: 0.02 },
       cap: { type: Number, default: 200 }
     },
     isActive: {
       type: Boolean,
       default: true
     },
     effectiveDate: {
       type: Date,
       required: true
     }
   }, { timestamps: true });
   ```

2. **Create Configuration Routes** (`routes/payrollConfigRoutes.js`)
   - GET /api/payroll-config (fetch current config)
   - PUT /api/payroll-config/:type (update config - admin only)
   - POST /api/payroll-config (create initial config)

3. **Update Government Deductions Utility**
   - Fetch rates from database instead of hardcoded
   - Cache in memory for performance

4. **Create Admin Configuration UI** (Optional for Phase 7, can be Phase 11)
   - Form to update rates
   - Display current effective config
   - History of changes

#### Files to Create/Modify:
- 🆕 `ring-and-wing-backend/models/PayrollConfig.js`
- 🆕 `ring-and-wing-backend/routes/payrollConfigRoutes.js`
- ✏️ `ring-and-wing-backend/utils/governmentDeductions.js`
- 🆕 `ring-and-wing-frontend/src/PayrollConfiguration.jsx` (admin UI)

---

### Phase 8: Monthly Summary Reports Enhancement
**Duration:** 2 hours  
**Priority:** Medium

#### Tasks:
1. **Update PayrollReports.jsx**
   - Add columns for government deductions in summary table
   - Update statistics cards to include:
     - Total SSS collected
     - Total PhilHealth collected
     - Total Pag-IBIG collected
   - Update export to include new fields

2. **Add Breakdown View**
   ```jsx
   <div className="grid grid-cols-4 gap-4">
     <StatCard 
       title="Total SSS"
       value={`₱${totalSSS.toFixed(2)}`}
       icon={<FiDollarSign />}
     />
     <StatCard 
       title="Total PhilHealth"
       value={`₱${totalPhilHealth.toFixed(2)}`}
       icon={<FiDollarSign />}
     />
     {/* ... */}
   </div>
   ```

3. **Update Accounting Export**
   - Include government deductions in CSV/Excel export
   - Separate sheet for government contributions summary

#### Files to Modify:
- ✏️ `ring-and-wing-frontend/src/PayrollReports.jsx`

---

### Phase 9: Sidebar Navigation & Permissions
**Duration:** 1-2 hours  
**Priority:** High

#### Tasks:
1. **Update Sidebar.jsx**
   ```jsx
   const navigationItems = [
     // ... existing items
     
     // Add for ALL staff positions
     { 
       path: '/my-payslip', 
       icon: <FiFileText size={iconSize} className="text-white" />, 
       label: 'My Payslip',
       positions: ['cashier', 'inventory', 'shift_manager', 'general_manager', 'admin']
     }
   ];
   ```

2. **Update App.jsx Routing**
   ```jsx
   <Route path="/my-payslip" element={
     <ProtectedRoute>
       <StaffPayslip />
     </ProtectedRoute>
   } />
   ```

3. **Update Permissions** (if needed)
   - All authenticated staff can access their own payslip
   - No special position requirement

#### Files to Modify:
- ✏️ `ring-and-wing-frontend/src/Sidebar.jsx`
- ✏️ `ring-and-wing-frontend/src/App.jsx`

---

### Phase 10: Testing & Validation
**Duration:** 3-4 hours  
**Priority:** Critical

#### Tasks:
1. **Unit Tests**
   - Test government deduction calculations
   - Test MSC bracket mapping
   - Test conditional logic (with/without government IDs)

2. **Integration Tests**
   - Test payroll creation with new deductions
   - Test staff payslip retrieval
   - Test PDF generation

3. **Manual Testing Scenarios**
   ```
   Test Case 1: Employee with all government IDs
   - Salary: ₱15,000
   - Expected SSS: ₱750
   - Expected PhilHealth: ₱375
   - Expected Pag-IBIG: ₱200
   - Expected Net Pay: ₱13,675 (assuming no other deductions)
   
   Test Case 2: Employee with only SSS
   - Salary: ₱15,000
   - Expected SSS: ₱750
   - Expected PhilHealth: ₱0
   - Expected Pag-IBIG: ₱0
   
   Test Case 3: High earner (₱50,000)
   - MSC: ₱35,000 (capped)
   - SSS: ₱1,750
   - PhilHealth: ₱1,250
   - Pag-IBIG: ₱200 (capped)
   
   Test Case 4: Staff accessing own payslip
   - Should see only their records
   - Should not see other staff payslips
   
   Test Case 5: PDF generation
   - All fields populated correctly
   - Proper formatting
   - Download works
   ```

4. **Security Testing**
   - Verify staff can't access other staff payslips
   - Test authentication middleware
   - Test authorization for config updates

5. **Performance Testing**
   - Test with multiple payroll records
   - Verify calculation speed
   - Check PDF generation time

#### Testing Checklist:
- [ ] SSS calculation correct across all brackets
- [ ] PhilHealth floor/ceiling applied correctly
- [ ] Pag-IBIG cap works
- [ ] Conditional deductions based on government IDs
- [ ] Net pay calculation accurate
- [ ] Staff can view only their payslips
- [ ] PDF generation works
- [ ] Reports include new deductions
- [ ] Configuration system works
- [ ] No breaking changes to existing payroll

---

## Technical Specifications

### Government Deduction Formulas

#### SSS Monthly Salary Credit (MSC) Brackets (2024)
```javascript
const SSS_MSC_BRACKETS = [
  { min: 0, max: 4249.99, msc: 4000 },
  { min: 4250, max: 4749.99, msc: 4500 },
  { min: 4750, max: 5249.99, msc: 5000 },
  { min: 5250, max: 5749.99, msc: 5500 },
  { min: 5750, max: 6249.99, msc: 6000 },
  { min: 6250, max: 6749.99, msc: 6500 },
  { min: 6750, max: 7249.99, msc: 7000 },
  { min: 7250, max: 7749.99, msc: 7500 },
  { min: 7750, max: 8249.99, msc: 8000 },
  { min: 8250, max: 8749.99, msc: 8500 },
  { min: 8750, max: 9249.99, msc: 9000 },
  { min: 9250, max: 9749.99, msc: 9500 },
  { min: 9750, max: 10249.99, msc: 10000 },
  { min: 10250, max: 10749.99, msc: 10500 },
  { min: 10750, max: 11249.99, msc: 11000 },
  { min: 11250, max: 11749.99, msc: 11500 },
  { min: 11750, max: 12249.99, msc: 12000 },
  { min: 12250, max: 12749.99, msc: 12500 },
  { min: 12750, max: 13249.99, msc: 13000 },
  { min: 13250, max: 13749.99, msc: 13500 },
  { min: 13750, max: 14249.99, msc: 14000 },
  { min: 14250, max: 14749.99, msc: 14500 },
  { min: 14750, max: 15249.99, msc: 15000 },
  { min: 15250, max: 15749.99, msc: 15500 },
  { min: 15750, max: 16249.99, msc: 16000 },
  { min: 16250, max: 16749.99, msc: 16500 },
  { min: 16750, max: 17249.99, msc: 17000 },
  { min: 17250, max: 17749.99, msc: 17500 },
  { min: 17750, max: 18249.99, msc: 18000 },
  { min: 18250, max: 18749.99, msc: 18500 },
  { min: 18750, max: 19249.99, msc: 19000 },
  { min: 19250, max: 19749.99, msc: 19500 },
  { min: 19750, max: 20249.99, msc: 20000 },
  { min: 20250, max: 20749.99, msc: 20500 },
  { min: 20750, max: 21249.99, msc: 21000 },
  { min: 21250, max: 21749.99, msc: 21500 },
  { min: 21750, max: 22249.99, msc: 22000 },
  { min: 22250, max: 22749.99, msc: 22500 },
  { min: 22750, max: 23249.99, msc: 23000 },
  { min: 23250, max: 23749.99, msc: 23500 },
  { min: 23750, max: 24249.99, msc: 24000 },
  { min: 24250, max: 24749.99, msc: 24500 },
  { min: 24750, max: 29999.99, msc: 25000 },
  { min: 30000, max: 34999.99, msc: 30000 },
  { min: 35000, max: Infinity, msc: 35000 }
];

const SSS_EMPLOYEE_RATE = 0.05; // 5%
```

#### PhilHealth Premium Calculation
```javascript
const PHILHEALTH_CONFIG = {
  floor: 10000,
  ceiling: 100000,
  totalRate: 0.05,      // 5% total
  employeeShare: 0.025  // 2.5% employee portion
};

function calculatePhilHealth(monthlySalary) {
  const baseSalary = Math.max(PHILHEALTH_CONFIG.floor, 
                       Math.min(monthlySalary, PHILHEALTH_CONFIG.ceiling));
  return baseSalary * PHILHEALTH_CONFIG.employeeShare;
}
```

#### Pag-IBIG Contribution
```javascript
const PAGIBIG_CONFIG = {
  rate: 0.02,  // 2%
  cap: 200     // Maximum ₱200
};

function calculatePagIbig(monthlySalary) {
  return Math.min(monthlySalary * PAGIBIG_CONFIG.rate, PAGIBIG_CONFIG.cap);
}
```

### Calculation Examples

#### Example 1: ₱15,000 Monthly Salary (All IDs present)
```
Basic Pay: ₱15,000

Government Deductions:
- SSS: ₱15,000 → MSC ₱15,000 → ₱15,000 × 5% = ₱750
- PhilHealth: ₱15,000 × 2.5% = ₱375
- Pag-IBIG: ₱15,000 × 2% = ₱300 → Capped at ₱200

Total Govt Deductions: ₱1,325

Net Pay (before other deductions): ₱15,000 - ₱1,325 = ₱13,675
```

#### Example 2: ₱8,000 Monthly Salary (Only SSS)
```
Basic Pay: ₱8,000

Government Deductions:
- SSS: ₱8,000 → MSC ₱8,000 → ₱8,000 × 5% = ₱400
- PhilHealth: ₱0 (no philHealthNumber)
- Pag-IBIG: ₱0 (no pagIbigNumber)

Total Govt Deductions: ₱400

Net Pay: ₱8,000 - ₱400 = ₱7,600
```

#### Example 3: ₱50,000 Monthly Salary (All IDs present)
```
Basic Pay: ₱50,000

Government Deductions:
- SSS: ₱50,000 → MSC ₱35,000 (capped) → ₱35,000 × 5% = ₱1,750
- PhilHealth: ₱50,000 × 2.5% = ₱1,250
- Pag-IBIG: ₱50,000 × 2% = ₱1,000 → Capped at ₱200

Total Govt Deductions: ₱3,200

Net Pay: ₱50,000 - ₱3,200 = ₱46,800
```

---

## Database Schema Changes

### Payroll Model (Enhanced)
```javascript
{
  staffId: ObjectId,
  payrollPeriod: Date,
  basicPay: Number,
  overtimePay: Number,
  allowances: Number,
  holidayPay: Number,
  thirteenthMonthPay: Number,
  bonuses: {
    holiday: Number,
    performance: Number,
    other: Number
  },
  deductions: {
    late: Number,
    absence: Number,
    sss: Number,              // NEW
    philHealth: Number,       // NEW
    pagIbig: Number,          // NEW
    withholdingTax: Number    // NEW
  },
  totalHoursWorked: Number,
  overtimeHours: Number,
  netPay: Number,
  timestamps: true
}
```

### Staff Model (Add Field)
```javascript
{
  // ... existing fields
  sssNumber: String,
  tinNumber: String,
  philHealthNumber: String,
  pagIbigNumber: String,  // NEW
  // ... rest of fields
}
```

### PayrollConfig Model (New)
```javascript
{
  configType: String,  // 'SSS', 'PhilHealth', 'PagIbig', 'Tax'
  sss: {
    mscBrackets: [{
      min: Number,
      max: Number,
      msc: Number,
      employeeRate: Number
    }]
  },
  philHealth: {
    floor: Number,
    ceiling: Number,
    totalRate: Number,
    employeeShare: Number
  },
  pagIbig: {
    rate: Number,
    cap: Number
  },
  isActive: Boolean,
  effectiveDate: Date,
  timestamps: true
}
```

---

## API Endpoints

### New Endpoints

#### Staff Payslip Routes
```
GET    /api/staff-payslip/my-payslips
       - Authentication: Required (auth middleware)
       - Access: All staff (view own records only)
       - Returns: Array of payroll records for authenticated staff
       
GET    /api/staff-payslip/my-payslips/:payrollId
       - Authentication: Required
       - Access: Owner only
       - Returns: Detailed payroll record with full breakdown
       
GET    /api/staff-payslip/download-pdf/:payrollId
       - Authentication: Required
       - Access: Owner only
       - Returns: PDF file stream
```

#### Payroll Config Routes (Admin Only)
```
GET    /api/payroll-config
       - Authentication: Required
       - Access: Admin only
       - Returns: Current effective configuration
       
PUT    /api/payroll-config/:type
       - Authentication: Required
       - Access: Admin only
       - Body: Updated configuration object
       - Returns: Updated config
       
POST   /api/payroll-config
       - Authentication: Required
       - Access: Admin only
       - Body: New configuration
       - Returns: Created config
       
GET    /api/payroll-config/history
       - Authentication: Required
       - Access: Admin only
       - Returns: History of configuration changes
```

### Modified Endpoints

#### Payroll Creation
```
POST   /api/payroll/create-with-bonuses
       - Enhanced to include government deductions
       - Request body adds:
         {
           // ... existing fields
           calculateGovernmentDeductions: true  // Optional flag
         }
       - Response includes:
         {
           // ... existing fields
           deductions: {
             late: Number,
             absence: Number,
             sss: Number,
             philHealth: Number,
             pagIbig: Number,
             withholdingTax: Number
           }
         }
```

---

## UI/UX Changes

### 1. PayrollSystem.jsx (Manager View)
**Location:** Staff > Payroll System

**Changes:**
- Add "Government Deductions" section in payroll calculation panel
- Display SSS, PhilHealth, Pag-IBIG with calculated amounts
- Show conditional message if government ID is missing
- Update Net Pay calculation display
- Add tooltip/info icons explaining each deduction

**Wireframe:**
```
┌─────────────────────────────────────┐
│ Payroll Calculation                 │
├─────────────────────────────────────┤
│ Income                              │
│  ├─ Basic Pay:         ₱15,000.00   │
│  ├─ Overtime Pay:      ₱1,200.00    │
│  ├─ Allowances:        ₱500.00      │
│  ├─ Holiday Pay:       ₱800.00      │
│  └─ Gross Pay:         ₱17,500.00   │
│                                     │
│ Government Deductions  ℹ️            │
│  ├─ SSS:              -₱750.00 ✓    │
│  ├─ PhilHealth:       -₱375.00 ✓    │
│  └─ Pag-IBIG:         -₱200.00 ✓    │
│      (⚠️ No ID: not calculated)     │
│                                     │
│ Other Deductions                    │
│  ├─ Late:             -₱100.00      │
│  └─ Absence:          -₱200.00      │
│                                     │
│ Net Pay:               ₱15,875.00   │
└─────────────────────────────────────┘
```

### 2. StaffPayslip.jsx (Staff View) - NEW
**Location:** Sidebar > My Payslip

**Features:**
- List of all payslip periods (most recent first)
- Click to view detailed breakdown
- Download PDF button
- Responsive card-based layout

**Wireframe:**
```
┌─────────────────────────────────────┐
│ My Payslips                         │
└─────────────────────────────────────┘

┌─────────────────────────────────────┐
│ November 2025              ₱15,875  │
│ Net Pay                             │
│                        [View] [PDF] │
└─────────────────────────────────────┘

┌─────────────────────────────────────┐
│ October 2025               ₱14,200  │
│ Net Pay                             │
│                        [View] [PDF] │
└─────────────────────────────────────┘
```

**Detailed View (Modal/Panel):**
```
┌─────────────────────────────────────┐
│ Payslip - November 2025        [X]  │
├─────────────────────────────────────┤
│ Employee: John Doe                  │
│ Position: Cashier                   │
│ Period: November 2025               │
│                                     │
│ ┌─────────────────────────────────┐ │
│ │ Income                          │ │
│ │ Basic Pay:          ₱15,000.00  │ │
│ │ Overtime Pay:       ₱1,200.00   │ │
│ │ Allowances:         ₱500.00     │ │
│ │ Holiday Pay:        ₱800.00     │ │
│ │ Gross Pay:          ₱17,500.00  │ │
│ └─────────────────────────────────┘ │
│                                     │
│ ┌─────────────────────────────────┐ │
│ │ Deductions                      │ │
│ │ SSS:               -₱750.00     │ │
│ │ PhilHealth:        -₱375.00     │ │
│ │ Pag-IBIG:          -₱200.00     │ │
│ │ Late:              -₱100.00     │ │
│ │ Absence:           -₱200.00     │ │
│ │ Total Deductions:  -₱1,625.00   │ │
│ └─────────────────────────────────┘ │
│                                     │
│ ┌─────────────────────────────────┐ │
│ │ NET PAY:            ₱15,875.00  │ │
│ └─────────────────────────────────┘ │
│                                     │
│          [Download PDF]             │
└─────────────────────────────────────┘
```

### 3. Sidebar Navigation - Updated
**New Item:**
```
Sidebar Items:
├── Dashboard (Managers)
├── POS (Cashiers, Managers)
├── Orders
├── Inventory (Inventory, Managers)
├── Time Clock (All)
├── Staff (Managers)
│   ├── Employee Management
│   └── Payroll System
├── My Payslip (All Staff) ← NEW
├── Expenses (Managers)
└── Revenue Reports (Managers)
```

### 4. PayrollReports.jsx - Enhanced
**Changes:**
- Add columns for government deductions in summary table
- Add statistics cards for total government contributions
- Update export to include government deductions

**Additional Stats:**
```
┌─────────────────────────────────────┐
│ Government Contributions (Monthly)  │
├─────────────────────────────────────┤
│ Total SSS:         ₱12,450.00       │
│ Total PhilHealth:  ₱6,225.00        │
│ Total Pag-IBIG:    ₱3,200.00        │
│ Total:             ₱21,875.00       │
└─────────────────────────────────────┘
```

---

## Testing Strategy

### 1. Unit Testing

#### Backend Tests
```javascript
// tests/utils/governmentDeductions.test.js

describe('Government Deductions', () => {
  describe('SSS Calculation', () => {
    test('should calculate correct SSS for ₱15,000 salary', () => {
      const result = calculateSSS(15000, true);
      expect(result).toBe(750);
    });
    
    test('should return 0 if no SSS number', () => {
      const result = calculateSSS(15000, false);
      expect(result).toBe(0);
    });
    
    test('should cap at MSC ₱35,000', () => {
      const result = calculateSSS(50000, true);
      expect(result).toBe(1750);
    });
  });
  
  describe('PhilHealth Calculation', () => {
    test('should calculate correct PhilHealth for ₱15,000 salary', () => {
      const result = calculatePhilHealth(15000, true);
      expect(result).toBe(375);
    });
    
    test('should apply floor of ₱10,000', () => {
      const result = calculatePhilHealth(5000, true);
      expect(result).toBe(250);
    });
    
    test('should apply ceiling of ₱100,000', () => {
      const result = calculatePhilHealth(150000, true);
      expect(result).toBe(2500);
    });
  });
  
  describe('Pag-IBIG Calculation', () => {
    test('should calculate correct Pag-IBIG for ₱15,000 salary', () => {
      const result = calculatePagIbig(15000, true);
      expect(result).toBe(200);
    });
    
    test('should cap at ₱200', () => {
      const result = calculatePagIbig(50000, true);
      expect(result).toBe(200);
    });
  });
});
```

#### Frontend Tests
```javascript
// tests/components/StaffPayslip.test.jsx

describe('StaffPayslip Component', () => {
  test('should render payslip list', async () => {
    // Mock API response
    // Render component
    // Verify payslips displayed
  });
  
  test('should show only own payslips', () => {
    // Test authentication/authorization
  });
  
  test('should open detail view on click', () => {
    // Test modal/panel opening
  });
});
```

### 2. Integration Testing

#### Payroll Creation Flow
```javascript
describe('Payroll Creation with Government Deductions', () => {
  test('should create payroll with all deductions', async () => {
    const staff = await createTestStaff({
      sssNumber: '12-3456789-0',
      philHealthNumber: '12-345678901-2',
      pagIbigNumber: '1234-5678-9012'
    });
    
    const payroll = await createPayroll({
      staffId: staff._id,
      basicPay: 15000,
      // ... other fields
    });
    
    expect(payroll.deductions.sss).toBe(750);
    expect(payroll.deductions.philHealth).toBe(375);
    expect(payroll.deductions.pagIbig).toBe(200);
    expect(payroll.netPay).toBe(13675); // Assuming no other deductions
  });
});
```

### 3. End-to-End Testing

#### Test Scenarios
1. **Manager creates payroll for employee with all government IDs**
   - Navigate to Payroll System
   - Select employee
   - Select pay period
   - Enter hours worked
   - Verify government deductions calculated automatically
   - Submit payroll
   - Verify saved correctly

2. **Staff views own payslip**
   - Login as staff
   - Navigate to "My Payslip"
   - Verify list of payslips displayed
   - Click to view detail
   - Verify all deductions shown correctly
   - Download PDF
   - Verify PDF content correct

3. **Staff attempts to view another staff's payslip (negative test)**
   - Should be blocked by backend
   - Should show access denied error

---

## Deployment Plan

### Pre-Deployment Checklist
- [ ] All tests passing
- [ ] Code review completed
- [ ] Database migrations prepared
- [ ] Configuration seeded (initial payroll config)
- [ ] Documentation updated
- [ ] PDF library installed
- [ ] Environment variables configured

### Deployment Steps

#### 1. Database Updates
```bash
# Run migration to add new fields to Payroll model
# This is handled automatically by Mongoose schema updates

# Seed initial payroll configuration
node ring-and-wing-backend/seeds/seedPayrollConfig.js
```

#### 2. Backend Deployment
```bash
cd ring-and-wing-backend
npm install  # Install any new dependencies (if PDF generation on backend)
# Deploy backend code
# Restart backend server
```

#### 3. Frontend Deployment
```bash
cd ring-and-wing-frontend
npm install jspdf jspdf-autotable  # or @react-pdf/renderer
npm run build
# Deploy frontend build
```

#### 4. Post-Deployment Verification
- [ ] Test government deduction calculations
- [ ] Test staff payslip access
- [ ] Test PDF generation
- [ ] Test payroll reports
- [ ] Verify no breaking changes to existing payroll

### Rollback Plan
- Keep backup of Payroll model before changes
- Ability to revert database schema
- Frontend can be easily rolled back via build
- Configuration can be deactivated without code changes

---

## Risk Assessment

### Identified Risks

1. **Data Migration Risk**
   - **Risk:** Existing payroll records don't have government deductions
   - **Mitigation:** New fields default to 0, old records remain valid
   - **Impact:** Low

2. **Calculation Accuracy Risk**
   - **Risk:** Incorrect government deduction formulas
   - **Mitigation:** Extensive testing with official rate tables
   - **Impact:** High (financial impact)

3. **Performance Risk**
   - **Risk:** PDF generation might slow down with large payroll data
   - **Mitigation:** Async PDF generation, client-side generation
   - **Impact:** Medium

4. **Security Risk**
   - **Risk:** Staff accessing other staff's payslips
   - **Mitigation:** Backend authentication/authorization checks
   - **Impact:** High (privacy violation)

5. **Configuration Update Risk**
   - **Risk:** Incorrect rate updates affecting all payroll calculations
   - **Mitigation:** Admin-only access, audit trail, effective date tracking
   - **Impact:** High

### Mitigation Strategies
- Comprehensive testing before deployment
- Gradual rollout (test with single employee first)
- Monitor for issues in first week
- Have rollback plan ready
- Keep backup of database before major changes

---

## Success Metrics

### Phase Completion Metrics
- [ ] Phase 1: Government deduction calculations accurate (verified with test cases)
- [ ] Phase 2: Net pay calculation includes all deductions
- [ ] Phase 3: Manager UI displays government deductions correctly
- [ ] Phase 4: Staff payslip API secured and functional
- [ ] Phase 5: Staff can view their own payslips
- [ ] Phase 6: PDF generation works for all payslips
- [ ] Phase 7: Configuration system allows rate updates
- [ ] Phase 8: Reports include government deduction summaries
- [ ] Phase 9: Staff can access "My Payslip" from sidebar
- [ ] Phase 10: All tests pass, no critical bugs

### User Acceptance Criteria
- Managers can generate payroll with accurate government deductions
- Staff can view their detailed payslips
- Staff can download payslips as PDF
- Admin can update government deduction rates
- Reports show accurate government contribution totals
- No breaking changes to existing payroll functionality

---

## Maintenance & Future Enhancements

### Ongoing Maintenance
- Update MSC brackets annually (SSS announces changes)
- Update PhilHealth rates/floors/ceilings as needed
- Update Pag-IBIG rates as needed
- Monitor for changes in Philippine labor law

### Future Enhancements (Phase 11+)
1. **Withholding Tax Implementation**
   - Implement BIR tax brackets
   - Calculate tax based on annual income
   - Handle tax exemptions

2. **13th Month Tax Calculation**
   - Implement tax exemption for 13th month pay (up to ₱90,000)
   - Split across December payroll

3. **Payslip Email Notifications**
   - Auto-send payslips via email when generated
   - Configurable email templates

4. **Mobile App Integration**
   - Mobile-friendly payslip viewing
   - Push notifications for new payslips

5. **Advanced Reporting**
   - Year-end BIR reports (2316, Alphalist)
   - Quarterly government contribution reports
   - Export to accounting software formats

6. **Payroll History Analytics**
   - Trend analysis for staff compensation
   - Government deduction trends
   - Cost projections

7. **Multi-Currency Support** (if needed in future)
   - Support for different currencies
   - Exchange rate handling

---

## Appendix

### A. Reference Documents
- SSS Contribution Table 2024: [SSS Official Website]
- PhilHealth Premium Rate 2024: [PhilHealth Official Website]
- Pag-IBIG Contribution Rate: [Pag-IBIG Official Website]
- BIR Tax Tables (for future withholding tax): [BIR Official Website]

### B. Code Snippets

#### SSS MSC Calculation Function
```javascript
function findMSC(salary) {
  for (const bracket of SSS_MSC_BRACKETS) {
    if (salary >= bracket.min && salary <= bracket.max) {
      return bracket.msc;
    }
  }
  return SSS_MSC_BRACKETS[SSS_MSC_BRACKETS.length - 1].msc;
}

function calculateSSS(monthlySalary, hasSSSNumber) {
  if (!hasSSSNumber) return 0;
  
  const msc = findMSC(monthlySalary);
  return msc * SSS_EMPLOYEE_RATE;
}
```

### C. Database Seed Scripts

#### Initial Payroll Configuration
```javascript
// seeds/seedPayrollConfig.js
const PayrollConfig = require('../models/PayrollConfig');

async function seedPayrollConfig() {
  // SSS Configuration
  await PayrollConfig.create({
    configType: 'SSS',
    sss: {
      mscBrackets: [
        // ... full SSS MSC brackets
      ]
    },
    isActive: true,
    effectiveDate: new Date('2024-01-01')
  });
  
  // PhilHealth Configuration
  await PayrollConfig.create({
    configType: 'PhilHealth',
    philHealth: {
      floor: 10000,
      ceiling: 100000,
      totalRate: 0.05,
      employeeShare: 0.025
    },
    isActive: true,
    effectiveDate: new Date('2024-01-01')
  });
  
  // Pag-IBIG Configuration
  await PayrollConfig.create({
    configType: 'PagIbig',
    pagIbig: {
      rate: 0.02,
      cap: 200
    },
    isActive: true,
    effectiveDate: new Date('2024-01-01')
  });
}
```

### D. Testing Data

#### Test Employees
```javascript
const testEmployees = [
  {
    name: 'Juan Dela Cruz',
    salary: 15000,
    sssNumber: '12-3456789-0',
    philHealthNumber: '12-345678901-2',
    pagIbigNumber: '1234-5678-9012',
    expectedSSS: 750,
    expectedPhilHealth: 375,
    expectedPagIbig: 200
  },
  {
    name: 'Maria Santos',
    salary: 8000,
    sssNumber: '12-3456789-1',
    philHealthNumber: null,
    pagIbigNumber: null,
    expectedSSS: 400,
    expectedPhilHealth: 0,
    expectedPagIbig: 0
  },
  {
    name: 'Pedro Rodriguez',
    salary: 50000,
    sssNumber: '12-3456789-2',
    philHealthNumber: '12-345678901-3',
    pagIbigNumber: '1234-5678-9013',
    expectedSSS: 1750,
    expectedPhilHealth: 1250,
    expectedPagIbig: 200
  }
];
```

---

## Contact & Support

**Implementation Team:**
- Backend Developer: [Name]
- Frontend Developer: [Name]
- QA Tester: [Name]
- Project Manager: [Name]

**Questions or Issues:**
- Create GitHub issue in repository
- Contact project manager directly
- Refer to this document for implementation guidance

---

## Document Version History

| Version | Date | Author | Changes |
|---------|------|--------|---------|
| 1.0 | Nov 24, 2025 | AI Agent | Initial implementation plan |

---

**End of Document**
