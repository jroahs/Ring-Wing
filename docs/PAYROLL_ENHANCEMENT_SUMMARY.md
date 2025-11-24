# Payroll Enhancement - Project Summary

## Quick Overview

**Goal:** Implement Philippine government-mandated deductions (SSS, PhilHealth, Pag-IBIG) and staff-level payslip viewing functionality.

**Timeline:** 10 Phases, ~25-35 hours total development time

**Status:** ✅ Planning Complete - Ready for Implementation

---

## What We're Building

### 1. Government Deductions System
Add automatic calculation of mandatory Philippine government contributions:

- **SSS (Social Security)** - 5% of Monthly Salary Credit
- **PhilHealth** - 2.5% of salary (employee portion)
- **Pag-IBIG** - 2% of salary, capped at ₱200
- **Smart Logic:** Only deduct if employee has the corresponding government ID number

### 2. Staff Payslip Viewer
New component for employees to:
- View their own payslips
- See detailed breakdown of income and deductions
- Download payslips as PDF
- Access through sidebar navigation

### 3. Enhanced Reports
Update manager reports to include:
- Government deduction totals
- Monthly contribution summaries
- Export with complete deduction data

---

## Current System Analysis

### ✅ What Already Exists

**Backend:**
- Payroll model with basic/overtime/allowances/bonuses
- Staff model with government ID fields (sssNumber, tinNumber, philHealthNumber)
- Current deductions: late and absence only

**Frontend:**
- PayrollSystem.jsx (Manager view) - 1214 lines
- PayrollReports.jsx for summaries
- Role-based access control

### ⚠️ What's Missing

- No government deduction calculations
- No staff-level payslip viewing
- Government ID fields exist but unused
- Missing pagIbigNumber field
- No PDF generation for payslips
- No configuration system for rates

---

## Implementation Phases (Quick Reference)

| Phase | Focus | Duration | Priority |
|-------|-------|----------|----------|
| 1 | Database Schema & Backend Deductions | 2-3 hrs | High |
| 2 | Net Pay Calculation Update | 2-3 hrs | High |
| 3 | Frontend Payroll UI Enhancement | 3-4 hrs | High |
| 4 | Staff Payslip API (Backend) | 2 hrs | High |
| 5 | Staff Payslip Component (Frontend) | 4-5 hrs | High |
| 6 | PDF Generation & Download | 3-4 hrs | Medium |
| 7 | Configuration System for Rates | 4-5 hrs | Medium |
| 8 | Monthly Summary Reports | 2 hrs | Medium |
| 9 | Sidebar Navigation & Permissions | 1-2 hrs | High |
| 10 | Testing & Validation | 3-4 hrs | Critical |

---

## Key Technical Decisions

### Calculation Formulas

#### SSS
```
Salary: ₱15,000
MSC (Monthly Salary Credit): ₱15,000
Deduction: ₱15,000 × 5% = ₱750
```

#### PhilHealth
```
Salary: ₱15,000
(Floor: ₱10,000, Ceiling: ₱100,000)
Deduction: ₱15,000 × 2.5% = ₱375
```

#### Pag-IBIG
```
Salary: ₱15,000
Calculation: ₱15,000 × 2% = ₱300
Cap: ₱200 (maximum)
Deduction: ₱200
```

### Net Pay Formula
```
Net Pay = Gross Pay 
          - SSS (if exists)
          - PhilHealth (if exists)
          - Pag-IBIG (if exists)
          - Late Deductions
          - Absence Deductions
          - Withholding Tax (future)
```

---

## New Files to Create

### Backend
```
ring-and-wing-backend/
├── utils/
│   └── governmentDeductions.js (NEW)
├── models/
│   └── PayrollConfig.js (NEW)
└── routes/
    ├── staffPayslipRoutes.js (NEW)
    └── payrollConfigRoutes.js (NEW)
```

### Frontend
```
ring-and-wing-frontend/
├── src/
│   ├── StaffPayslip.jsx (NEW)
│   ├── components/
│   │   ├── PayslipDetail.jsx (NEW)
│   │   └── PayslipCard.jsx (NEW)
│   └── utils/
│       ├── payslipPDF.js (NEW)
│       └── governmentDeductions.js (NEW)
```

---

## Files to Modify

### Backend
- ✏️ `models/Payroll.js` - Add government deduction fields
- ✏️ `models/Staff.js` - Add pagIbigNumber field
- ✏️ `routes/payrollRoutes.js` - Include deduction calculations

### Frontend
- ✏️ `PayrollSystem.jsx` - Show government deductions
- ✏️ `PayrollReports.jsx` - Include in reports
- ✏️ `Sidebar.jsx` - Add "My Payslip" navigation
- ✏️ `App.jsx` - Add routing for staff payslip
- ✏️ `EmployeeManagement.jsx` - Add pagIbigNumber input field

---

## Sample Test Cases

### Test Case 1: Full Deductions (₱15,000 salary)
```
✓ Has SSS Number → Deduct ₱750
✓ Has PhilHealth Number → Deduct ₱375
✓ Has Pag-IBIG Number → Deduct ₱200
Expected Net: ₱15,000 - ₱1,325 = ₱13,675
```

### Test Case 2: Partial Deductions (₱15,000 salary)
```
✓ Has SSS Number → Deduct ₱750
✗ No PhilHealth Number → Deduct ₱0
✗ No Pag-IBIG Number → Deduct ₱0
Expected Net: ₱15,000 - ₱750 = ₱14,250
```

### Test Case 3: High Earner (₱50,000 salary)
```
✓ SSS: MSC capped at ₱35,000 → ₱1,750
✓ PhilHealth: ₱50,000 × 2.5% → ₱1,250
✓ Pag-IBIG: Capped at ₱200
Expected Deductions: ₱3,200
Expected Net: ₱46,800
```

### Test Case 4: Low Earner (₱8,000 salary)
```
✓ SSS: MSC ₱8,000 → ₱400
✓ PhilHealth: Floor ₱10,000 → ₱250
✓ Pag-IBIG: ₱8,000 × 2% = ₱160
Expected Deductions: ₱810
Expected Net: ₱7,190
```

---

## Security Considerations

### Staff Payslip Access
- ✅ Staff can ONLY view their own payslips
- ✅ Backend validates ownership via `req.staff._id`
- ✅ Frontend respects authentication tokens
- ✅ API endpoints protected by auth middleware

### Configuration Updates
- ✅ Only admin can update government deduction rates
- ✅ Audit trail for all rate changes
- ✅ Effective date tracking for historical accuracy

---

## Next Steps (Phased Approach)

### Immediate (Phases 1-3)
1. Update database models for government deductions
2. Implement calculation utilities
3. Enhance PayrollSystem.jsx UI

### Short-term (Phases 4-6)
4. Build staff payslip API
5. Create StaffPayslip.jsx component
6. Add PDF generation

### Medium-term (Phases 7-9)
7. Build configuration system
8. Enhance reports
9. Update navigation

### Final (Phase 10)
10. Comprehensive testing and validation

---

## Dependencies to Install

### Frontend
```bash
npm install jspdf jspdf-autotable
# OR
npm install @react-pdf/renderer
```

### Backend
No new dependencies required (uses existing Mongoose, Express)

---

## Risk Mitigation

| Risk | Impact | Mitigation |
|------|--------|------------|
| Wrong calculations | HIGH | Extensive testing with official rate tables |
| Security breach (staff access) | HIGH | Backend authorization checks |
| Performance issues (PDF) | MEDIUM | Client-side PDF generation |
| Config update errors | HIGH | Admin-only, audit trail, effective dates |
| Breaking existing payroll | HIGH | Default values for new fields, backward compatible |

---

## Success Criteria

✅ **Phase Complete When:**
- [ ] All government deductions calculated correctly
- [ ] Staff can view only their own payslips
- [ ] PDF generation works for all payslips
- [ ] No breaking changes to existing payroll
- [ ] All tests pass
- [ ] Reports include government deductions
- [ ] Configuration system functional

✅ **User Acceptance:**
- Managers can generate accurate payroll
- Staff can download their payslips
- Admin can update rates as needed
- System complies with Philippine labor law

---

## Reference Rates (2024)

### SSS
- Employee Rate: 5% of MSC
- MSC Range: ₱5,000 - ₱35,000
- 45 salary brackets defined

### PhilHealth
- Employee Rate: 2.5%
- Floor: ₱10,000
- Ceiling: ₱100,000

### Pag-IBIG
- Employee Rate: 2%
- Maximum: ₱200

---

## Questions & Support

**For Implementation Questions:**
- Refer to: `PAYROLL_ENHANCEMENT_IMPLEMENTATION_PLAN.md`
- Contains detailed technical specifications
- Includes code snippets and examples

**For Testing:**
- See Phase 10 in implementation plan
- Test cases and scenarios provided
- Expected results documented

---

## Document Links

- 📄 **Full Implementation Plan:** `PAYROLL_ENHANCEMENT_IMPLEMENTATION_PLAN.md`
- 📊 **Database Schema:** See Section 6 of implementation plan
- 🔌 **API Endpoints:** See Section 7 of implementation plan
- 🎨 **UI Wireframes:** See Section 8 of implementation plan

---

**Last Updated:** November 24, 2025  
**Status:** Planning Complete ✅  
**Ready to Start:** Phase 1
