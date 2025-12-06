# Government Deduction Compliance - Comprehensive Implementation Plan

## Executive Summary

This document outlines a comprehensive plan to make the government deduction configuration system compliant with Philippine government regulations for SSS, PhilHealth, and Pag-IBIG contributions. The current system only tracks **employee share** and is missing critical components for full compliance.

---

## 🔴 Current System Gap Analysis

### What We Have Now

| Component | Current Status | Compliance Issue |
|-----------|---------------|------------------|
| **SSS** | Employee rate only (5%) | ❌ Missing employer share (10%), EC (₱10/₱30) |
| **PhilHealth** | Employee rate only (2.5%) | ❌ Missing employer share (2.5%) |
| **Pag-IBIG** | Employee rate only (2%) | ❌ Missing employer share (2%) |
| **MSC Brackets** | 46 brackets configured | ✅ Correct structure |
| **Floor/Ceiling** | PhilHealth only | ⚠️ SSS MSC floor/ceiling not enforced |
| **EC (Employees' Compensation)** | Not implemented | ❌ Missing employer-only contribution |
| **Audit Trail** | Basic (notes, createdBy) | ⚠️ Incomplete, no change history |
| **Validation** | Minimal | ❌ Can save incomplete config |
| **Employer Share Storage** | Not in payroll records | ❌ Not stored for reporting |

### Critical Compliance Gaps

1. **No employer contribution tracking** - Audit failure risk
2. **No EC (Employees' Compensation)** - SSS requirement
3. **Missing MFS cap for Pag-IBIG** (Monthly Fund Salary ₱10,000)
4. **No versioning/rollback** - Compliance risk
5. **No sign-off workflow** - No HR/legal approval
6. **No remittance export** - Manual filing required
7. **No scheduled review reminders** - Rate change risk

---

## 📋 Implementation Phases

### Phase 1: Database Schema Updates (Priority: CRITICAL)

#### 1.1 Update GovernmentDeductionConfig Model

**File:** `ring-and-wing-backend/models/GovernmentDeductionConfig.js`

**New Schema Structure:**

```javascript
const governmentDeductionConfigSchema = new mongoose.Schema({
  // VERSION CONTROL
  version: { type: Number, required: true, default: 1 },
  previousVersion: { type: mongoose.Schema.Types.ObjectId, ref: 'GovernmentDeductionConfig' },
  
  // SSS Configuration (2024 Rates)
  sss: {
    // Contribution Rates
    employeeRate: { type: Number, required: true, default: 0.05 },    // 5%
    employerRate: { type: Number, required: true, default: 0.10 },    // 10%
    totalRate: { type: Number, required: true, default: 0.15 },       // 15% total
    
    // Monthly Salary Credit (MSC) - Basis for contribution
    mscFloor: { type: Number, required: true, default: 4000 },        // Minimum MSC
    mscCeiling: { type: Number, required: true, default: 35000 },     // Maximum MSC (2024)
    
    // MSC Brackets for lookup
    mscBrackets: [{
      min: { type: Number, required: true },
      max: { type: Number, required: true },
      msc: { type: Number, required: true },
      // Pre-computed contributions for quick lookup
      employeeContribution: { type: Number },
      employerContribution: { type: Number },
      ecContribution: { type: Number }  // EC is employer-only
    }],
    
    // Employees' Compensation (EC) - Employer Only
    ec: {
      enabled: { type: Boolean, default: true },
      lowMscThreshold: { type: Number, default: 15000 },  // Below this = ₱10 EC
      lowMscAmount: { type: Number, default: 10 },        // ₱10 for MSC ≤ ₱15,000
      highMscAmount: { type: Number, default: 30 }        // ₱30 for MSC > ₱15,000
    },
    
    description: { type: String },
    legalReference: { type: String, default: 'SSS Circular No. 2023-033' }
  },
  
  // PhilHealth Configuration (2024 Rates)
  philHealth: {
    // Contribution Rates
    employeeRate: { type: Number, required: true, default: 0.025 },   // 2.5%
    employerRate: { type: Number, required: true, default: 0.025 },   // 2.5%
    totalRate: { type: Number, required: true, default: 0.05 },       // 5% total
    
    // Monthly Basic Salary (MBS) - Basis for contribution
    mbsFloor: { type: Number, required: true, default: 10000 },       // Minimum ₱10,000
    mbsCeiling: { type: Number, required: true, default: 100000 },    // Maximum ₱100,000
    
    description: { type: String },
    legalReference: { type: String, default: 'PhilHealth Circular No. 2023-0008' }
  },
  
  // Pag-IBIG Configuration (2024 Rates)
  pagIbig: {
    // Contribution Rates
    employeeRate: { type: Number, required: true, default: 0.02 },    // 2%
    employerRate: { type: Number, required: true, default: 0.02 },    // 2%
    totalRate: { type: Number, required: true, default: 0.04 },       // 4% total
    
    // Monthly Fund Salary (MFS) - Basis for contribution
    mfsCap: { type: Number, required: true, default: 10000 },         // Max ₱10,000 base
    
    // Maximum Contributions
    maxEmployeeContribution: { type: Number, required: true, default: 200 },  // ₱200 max
    maxEmployerContribution: { type: Number, required: true, default: 200 },  // ₱200 max
    
    description: { type: String },
    legalReference: { type: String, default: 'Pag-IBIG Fund Circular No. 395' }
  },
  
  // Withholding Tax Configuration (placeholder for future)
  withholdingTax: {
    enabled: { type: Boolean, default: false },
    brackets: [{
      min: Number,
      max: Number,
      fixedAmount: Number,
      rate: Number
    }]
  },
  
  // Metadata
  effectiveDate: { type: Date, required: true },
  expirationDate: { type: Date },  // For scheduled rate changes
  year: { type: Number, required: true },
  isActive: { type: Boolean, default: false },
  isDraft: { type: Boolean, default: true },  // Draft until approved
  
  // Approval Workflow
  approval: {
    status: { 
      type: String, 
      enum: ['draft', 'pending_review', 'pending_approval', 'approved', 'rejected'],
      default: 'draft'
    },
    submittedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    submittedAt: { type: Date },
    reviewedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    reviewedAt: { type: Date },
    reviewNotes: { type: String },
    approvedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    approvedAt: { type: Date },
    approvalNotes: { type: String }
  },
  
  // Audit Trail
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  updatedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  changeReason: { type: String },  // Required for any update
  supportingDocuments: [{
    name: { type: String },
    url: { type: String },
    uploadedAt: { type: Date }
  }],
  notes: { type: String },
  
  // Change History (immutable)
  changeHistory: [{
    timestamp: { type: Date, default: Date.now },
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    action: { type: String },  // 'created', 'updated', 'approved', 'activated'
    changes: { type: mongoose.Schema.Types.Mixed },  // Diff of changes
    reason: { type: String }
  }],
  
  // Scheduled Review
  nextReviewDate: { type: Date },
  reviewReminder: {
    enabled: { type: Boolean, default: true },
    daysBeforeReview: { type: Number, default: 30 },
    assignedTo: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }]
  }
}, {
  timestamps: true
});
```

#### 1.2 Update Payroll Model to Store Employer Contributions

**File:** `ring-and-wing-backend/models/Payroll.js`

**Add employer contribution fields:**

```javascript
deductions: {
  // Employee Deductions (from net pay)
  late: { type: Number, default: 0, min: 0 },
  absence: { type: Number, default: 0, min: 0 },
  
  // Government Deductions - Employee Share
  sss: { type: Number, default: 0, min: 0 },
  philHealth: { type: Number, default: 0, min: 0 },
  pagIbig: { type: Number, default: 0, min: 0 },
  withholdingTax: { type: Number, default: 0, min: 0 }
},

// NEW: Employer Contributions (for reporting/remittance)
employerContributions: {
  sss: { type: Number, default: 0, min: 0 },
  sssEc: { type: Number, default: 0, min: 0 },  // Employees' Compensation
  philHealth: { type: Number, default: 0, min: 0 },
  pagIbig: { type: Number, default: 0, min: 0 }
},

// NEW: Contribution Basis Details (for audit)
contributionBasis: {
  sss: {
    msc: { type: Number },           // Monthly Salary Credit used
    grossSalary: { type: Number }    // Original salary
  },
  philHealth: {
    mbs: { type: Number },           // Monthly Basic Salary (clamped)
    grossSalary: { type: Number }
  },
  pagIbig: {
    mfs: { type: Number },           // Monthly Fund Salary (capped at ₱10,000)
    grossSalary: { type: Number }
  }
},

// NEW: Government Config Version Reference
governmentConfigId: {
  type: mongoose.Schema.Types.ObjectId,
  ref: 'GovernmentDeductionConfig'
}
```

---

### Phase 2: Backend Calculation Logic Updates (Priority: CRITICAL)

#### 2.1 Update Government Deductions Utility

**File:** `ring-and-wing-backend/utils/governmentDeductions.js`

**Key Changes:**

```javascript
/**
 * Calculate SSS contribution with both employee and employer shares
 * @param {number} monthlySalary - Monthly salary amount
 * @param {boolean} hasSSSNumber - Whether employee has SSS number
 * @param {Object} config - Government deduction configuration
 * @returns {Object} - SSS contribution breakdown
 */
async function calculateSSS(monthlySalary, hasSSSNumber, config = null) {
  if (!hasSSSNumber || !monthlySalary || monthlySalary <= 0) {
    return {
      msc: 0,
      employeeAmount: 0,
      employerAmount: 0,
      ecAmount: 0,
      totalContribution: 0
    };
  }

  if (!config) {
    config = await getConfig();
  }
  
  // Find MSC using bracket lookup
  const msc = findMSC(monthlySalary, config.sss.mscBrackets);
  
  // Calculate contributions based on MSC
  const employeeAmount = Number((msc * config.sss.employeeRate).toFixed(2));
  const employerAmount = Number((msc * config.sss.employerRate).toFixed(2));
  
  // Calculate EC (Employees' Compensation) - Employer only
  let ecAmount = 0;
  if (config.sss.ec && config.sss.ec.enabled) {
    ecAmount = msc <= config.sss.ec.lowMscThreshold 
      ? config.sss.ec.lowMscAmount    // ₱10 for MSC ≤ ₱15,000
      : config.sss.ec.highMscAmount;  // ₱30 for MSC > ₱15,000
  }
  
  return {
    msc,
    employeeAmount,
    employerAmount,
    ecAmount,
    totalContribution: employeeAmount + employerAmount + ecAmount
  };
}

/**
 * Calculate PhilHealth with both shares and proper floor/ceiling
 */
async function calculatePhilHealth(monthlySalary, hasPhilHealthNumber, config = null) {
  if (!hasPhilHealthNumber || !monthlySalary || monthlySalary <= 0) {
    return {
      mbs: 0,
      employeeAmount: 0,
      employerAmount: 0,
      totalContribution: 0
    };
  }

  if (!config) {
    config = await getConfig();
  }
  
  // Apply floor and ceiling to get Monthly Basic Salary (MBS)
  const mbs = Math.max(
    config.philHealth.mbsFloor, 
    Math.min(monthlySalary, config.philHealth.mbsCeiling)
  );
  
  // Calculate contributions (equal split)
  const totalPremium = mbs * config.philHealth.totalRate;
  const employeeAmount = Number((totalPremium / 2).toFixed(2));
  const employerAmount = Number((totalPremium / 2).toFixed(2));
  
  return {
    mbs,
    originalSalary: monthlySalary,
    employeeAmount,
    employerAmount,
    totalContribution: employeeAmount + employerAmount
  };
}

/**
 * Calculate Pag-IBIG with MFS cap and both shares
 */
async function calculatePagIbig(monthlySalary, hasPagIbigNumber, config = null) {
  if (!hasPagIbigNumber || !monthlySalary || monthlySalary <= 0) {
    return {
      mfs: 0,
      employeeAmount: 0,
      employerAmount: 0,
      totalContribution: 0
    };
  }

  if (!config) {
    config = await getConfig();
  }
  
  // Apply MFS cap (₱10,000 max for contribution calculation)
  const mfs = Math.min(monthlySalary, config.pagIbig.mfsCap);
  
  // Calculate contributions with max cap
  const employeeAmount = Math.min(
    Number((mfs * config.pagIbig.employeeRate).toFixed(2)),
    config.pagIbig.maxEmployeeContribution
  );
  
  const employerAmount = Math.min(
    Number((mfs * config.pagIbig.employerRate).toFixed(2)),
    config.pagIbig.maxEmployerContribution
  );
  
  return {
    mfs,
    originalSalary: monthlySalary,
    employeeAmount,
    employerAmount,
    totalContribution: employeeAmount + employerAmount
  };
}

/**
 * Calculate all government deductions with full breakdown
 */
async function calculateAllGovernmentDeductions(monthlySalary, staff) {
  const config = await getConfig();
  
  const hasSSSNumber = !!(staff.sssNumber && staff.sssNumber.trim());
  const hasPhilHealthNumber = !!(staff.philHealthNumber && staff.philHealthNumber.trim());
  const hasPagIbigNumber = !!(staff.pagIbigNumber && staff.pagIbigNumber.trim());
  
  const sss = await calculateSSS(monthlySalary, hasSSSNumber, config);
  const philHealth = await calculatePhilHealth(monthlySalary, hasPhilHealthNumber, config);
  const pagIbig = await calculatePagIbig(monthlySalary, hasPagIbigNumber, config);
  
  return {
    sss: {
      ...sss,
      hasId: hasSSSNumber
    },
    philHealth: {
      ...philHealth,
      hasId: hasPhilHealthNumber
    },
    pagIbig: {
      ...pagIbig,
      hasId: hasPagIbigNumber
    },
    totals: {
      employeeTotal: sss.employeeAmount + philHealth.employeeAmount + pagIbig.employeeAmount,
      employerTotal: sss.employerAmount + sss.ecAmount + philHealth.employerAmount + pagIbig.employerAmount,
      grandTotal: sss.totalContribution + philHealth.totalContribution + pagIbig.totalContribution
    },
    configId: config._id,
    configVersion: config.version
  };
}
```

---

### Phase 3: Validation & Blocking Rules (Priority: HIGH)

#### 3.1 Configuration Validation Middleware

**File:** `ring-and-wing-backend/middleware/governmentConfigValidation.js` (NEW)

```javascript
/**
 * Validation rules for government deduction configuration
 * Prevents saving of incomplete or non-compliant configurations
 */

const validateGovernmentConfig = (req, res, next) => {
  const { sss, philHealth, pagIbig } = req.body;
  const errors = [];
  
  // SSS Validation
  if (sss) {
    // Must have both employee and employer rates
    if (!sss.employeeRate || sss.employeeRate <= 0) {
      errors.push('SSS employee rate is required and must be greater than 0');
    }
    if (!sss.employerRate || sss.employerRate <= 0) {
      errors.push('SSS employer rate is required and must be greater than 0');
    }
    
    // Total rate should be sum of employee + employer
    const expectedTotal = (sss.employeeRate || 0) + (sss.employerRate || 0);
    if (sss.totalRate && Math.abs(sss.totalRate - expectedTotal) > 0.001) {
      errors.push('SSS total rate must equal employee rate + employer rate');
    }
    
    // MSC brackets must exist
    if (!sss.mscBrackets || sss.mscBrackets.length === 0) {
      errors.push('SSS MSC brackets are required (at least one bracket)');
    }
    
    // MSC floor/ceiling validation
    if (sss.mscFloor && sss.mscCeiling && sss.mscFloor >= sss.mscCeiling) {
      errors.push('SSS MSC floor must be less than ceiling');
    }
    
    // EC configuration
    if (sss.ec && sss.ec.enabled) {
      if (!sss.ec.lowMscAmount || sss.ec.lowMscAmount <= 0) {
        errors.push('SSS EC low MSC amount is required when EC is enabled');
      }
      if (!sss.ec.highMscAmount || sss.ec.highMscAmount <= 0) {
        errors.push('SSS EC high MSC amount is required when EC is enabled');
      }
    }
  }
  
  // PhilHealth Validation
  if (philHealth) {
    if (!philHealth.employeeRate || philHealth.employeeRate <= 0) {
      errors.push('PhilHealth employee rate is required');
    }
    if (!philHealth.employerRate || philHealth.employerRate <= 0) {
      errors.push('PhilHealth employer rate is required');
    }
    if (!philHealth.mbsFloor || philHealth.mbsFloor <= 0) {
      errors.push('PhilHealth MBS floor is required');
    }
    if (!philHealth.mbsCeiling || philHealth.mbsCeiling <= 0) {
      errors.push('PhilHealth MBS ceiling is required');
    }
    if (philHealth.mbsFloor >= philHealth.mbsCeiling) {
      errors.push('PhilHealth MBS floor must be less than ceiling');
    }
  }
  
  // Pag-IBIG Validation
  if (pagIbig) {
    if (!pagIbig.employeeRate || pagIbig.employeeRate <= 0) {
      errors.push('Pag-IBIG employee rate is required');
    }
    if (!pagIbig.employerRate || pagIbig.employerRate <= 0) {
      errors.push('Pag-IBIG employer rate is required');
    }
    if (!pagIbig.mfsCap || pagIbig.mfsCap <= 0) {
      errors.push('Pag-IBIG MFS cap is required');
    }
    if (!pagIbig.maxEmployeeContribution || pagIbig.maxEmployeeContribution <= 0) {
      errors.push('Pag-IBIG max employee contribution is required');
    }
    if (!pagIbig.maxEmployerContribution || pagIbig.maxEmployerContribution <= 0) {
      errors.push('Pag-IBIG max employer contribution is required');
    }
  }
  
  // Change reason required for updates
  if (req.method === 'PUT' && !req.body.changeReason) {
    errors.push('Change reason is required when updating configuration');
  }
  
  if (errors.length > 0) {
    return res.status(400).json({
      success: false,
      message: 'Validation failed',
      errors
    });
  }
  
  next();
};

module.exports = { validateGovernmentConfig };
```

---

### Phase 4: Frontend UI Updates (Priority: HIGH)

#### 4.1 Update GovernmentConfigManagement Component

**Key UI Changes Required:**

1. **Two-Column Layout for Rates:**
   - Left column: Employee rates/amounts
   - Right column: Employer rates/amounts

2. **Basis Selection Display:**
   - SSS: Show MSC being used
   - PhilHealth: Show MBS (with floor/ceiling indicators)
   - Pag-IBIG: Show MFS (with cap indicator)

3. **EC Configuration Section:**
   - Toggle for enabling EC
   - Low/High MSC threshold configuration
   - EC amounts configuration

4. **Example Calculator:**
   - Input field for test salary
   - Real-time calculation preview
   - Show breakdown: Employee | Employer | EC | Total

5. **Validation Warnings:**
   - Red border for missing employer rates
   - Warning modal for incomplete configuration
   - Block save until valid

6. **Audit Trail Section:**
   - Change reason input (required)
   - Change history display
   - Previous version comparison

---

### Phase 5: Migration Script (Priority: HIGH)

#### 5.1 Backfill Employer Contributions

**File:** `ring-and-wing-backend/migrations/backfill-employer-contributions.js` (NEW)

```javascript
/**
 * Migration: Backfill employer contributions for existing payroll records
 * 
 * This script:
 * 1. Reads existing payroll records
 * 2. Calculates employer contributions based on employee deductions
 * 3. Updates records with employer contributions
 * 4. Creates audit log of migration
 * 
 * Run with: node migrations/backfill-employer-contributions.js
 * 
 * IMPORTANT: Run in test environment first!
 */

const mongoose = require('mongoose');
const Payroll = require('../models/Payroll');

async function migrate() {
  const startTime = Date.now();
  let processed = 0;
  let updated = 0;
  let errors = [];
  
  console.log('Starting employer contribution backfill migration...');
  
  // Find all payroll records without employer contributions
  const payrolls = await Payroll.find({
    'employerContributions': { $exists: false }
  }).populate('staffId');
  
  console.log(`Found ${payrolls.length} payroll records to process`);
  
  for (const payroll of payrolls) {
    processed++;
    
    try {
      // Calculate employer contributions based on employee amounts
      // Using 2024 standard rates
      const sssEmployer = payroll.deductions.sss * 2;  // 10% / 5% = 2x
      const sssEc = payroll.deductions.sss > 0 
        ? (payroll.basicPay <= 15000 ? 10 : 30) 
        : 0;
      const philHealthEmployer = payroll.deductions.philHealth;  // Equal split
      const pagIbigEmployer = payroll.deductions.pagIbig;  // Equal rate
      
      // Update payroll record
      payroll.employerContributions = {
        sss: sssEmployer,
        sssEc: sssEc,
        philHealth: philHealthEmployer,
        pagIbig: pagIbigEmployer
      };
      
      // Add migration note
      payroll.migrationNotes = payroll.migrationNotes || [];
      payroll.migrationNotes.push({
        date: new Date(),
        type: 'backfill-employer-contributions',
        details: 'Employer contributions calculated from employee amounts'
      });
      
      await payroll.save();
      updated++;
      
    } catch (error) {
      errors.push({
        payrollId: payroll._id,
        error: error.message
      });
    }
    
    if (processed % 100 === 0) {
      console.log(`Processed ${processed}/${payrolls.length}`);
    }
  }
  
  const duration = (Date.now() - startTime) / 1000;
  
  console.log('\n=== Migration Complete ===');
  console.log(`Processed: ${processed}`);
  console.log(`Updated: ${updated}`);
  console.log(`Errors: ${errors.length}`);
  console.log(`Duration: ${duration}s`);
  
  if (errors.length > 0) {
    console.log('\nErrors:');
    errors.forEach(e => console.log(`  - ${e.payrollId}: ${e.error}`));
  }
  
  return { processed, updated, errors };
}

// Rollback function
async function rollback() {
  console.log('Rolling back employer contributions...');
  
  const result = await Payroll.updateMany(
    { 'employerContributions': { $exists: true } },
    { 
      $unset: { employerContributions: 1 },
      $pull: { migrationNotes: { type: 'backfill-employer-contributions' } }
    }
  );
  
  console.log(`Rolled back ${result.modifiedCount} records`);
  return result;
}

module.exports = { migrate, rollback };
```

---

### Phase 6: Reporting & Remittance (Priority: MEDIUM)

#### 6.1 New Report Endpoints

**File:** `ring-and-wing-backend/routes/governmentReportRoutes.js` (NEW)

```javascript
// GET /api/government-reports/contribution-summary
// Returns employee/employer contributions per payroll period per agency

// GET /api/government-reports/monthly-remittance/:agency/:month/:year
// Returns data formatted for agency filing

// GET /api/government-reports/export/:agency/:format
// Exports in CSV/XML format matching agency requirements

// Agency-specific formats:
// - SSS: R3 format (electronic)
// - PhilHealth: ER2 format
// - Pag-IBIG: HDMF MCR format
```

---

### Phase 7: Access Control & Security (Priority: MEDIUM)

#### 7.1 Role-Based Permissions

```javascript
// New permission levels:
const GOVT_CONFIG_PERMISSIONS = {
  VIEW: 'govt_config:view',           // All authenticated users
  EDIT: 'govt_config:edit',           // HR managers only
  APPROVE: 'govt_config:approve',     // Admin + HR lead
  ROLLBACK: 'govt_config:rollback',   // Admin only
  EXPORT: 'govt_config:export'        // HR + Finance
};
```

---

## 📊 Test Vectors for QA

### SSS Test Cases

| Salary | Expected MSC | Employee (5%) | Employer (10%) | EC | Total |
|--------|-------------|---------------|----------------|-----|-------|
| ₱4,500 | ₱5,000 | ₱250 | ₱500 | ₱10 | ₱760 |
| ₱8,000 | ₱8,000 | ₱400 | ₱800 | ₱10 | ₱1,210 |
| ₱15,000 | ₱15,000 | ₱750 | ₱1,500 | ₱10 | ₱2,260 |
| ₱20,000 | ₱20,000 | ₱1,000 | ₱2,000 | ₱30 | ₱3,030 |
| ₱35,000 | ₱35,000 | ₱1,750 | ₱3,500 | ₱30 | ₱5,280 |
| ₱40,000 | ₱35,000 (capped) | ₱1,750 | ₱3,500 | ₱30 | ₱5,280 |

### PhilHealth Test Cases

| Salary | MBS Used | Employee (2.5%) | Employer (2.5%) | Total (5%) |
|--------|----------|-----------------|-----------------|------------|
| ₱8,000 | ₱10,000 (floor) | ₱250 | ₱250 | ₱500 |
| ₱15,000 | ₱15,000 | ₱375 | ₱375 | ₱750 |
| ₱50,000 | ₱50,000 | ₱1,250 | ₱1,250 | ₱2,500 |
| ₱100,000 | ₱100,000 | ₱2,500 | ₱2,500 | ₱5,000 |
| ₱150,000 | ₱100,000 (ceiling) | ₱2,500 | ₱2,500 | ₱5,000 |

### Pag-IBIG Test Cases

| Salary | MFS Used | Employee (2%) | Employer (2%) | Total (4%) |
|--------|----------|---------------|---------------|------------|
| ₱5,000 | ₱5,000 | ₱100 | ₱100 | ₱200 |
| ₱10,000 | ₱10,000 (cap) | ₱200 | ₱200 | ₱400 |
| ₱15,000 | ₱10,000 (cap) | ₱200 | ₱200 | ₱400 |
| ₱50,000 | ₱10,000 (cap) | ₱200 | ₱200 | ₱400 |

---

## 🗓️ Implementation Timeline

| Phase | Description | Estimated Duration | Priority |
|-------|-------------|-------------------|----------|
| Phase 1 | Database Schema Updates | 2-3 days | CRITICAL |
| Phase 2 | Backend Calculation Logic | 2-3 days | CRITICAL |
| Phase 3 | Validation & Blocking | 1-2 days | HIGH |
| Phase 4 | Frontend UI Updates | 3-4 days | HIGH |
| Phase 5 | Migration Script | 1-2 days | HIGH |
| Phase 6 | Reporting & Remittance | 2-3 days | MEDIUM |
| Phase 7 | Access Control & Security | 1-2 days | MEDIUM |
| Testing | Unit & Integration Tests | 2-3 days | HIGH |
| QA | Acceptance Testing | 2-3 days | HIGH |

**Total Estimated Time: 15-25 days**

---

## ⚠️ Risks & Mitigations

| Risk | Impact | Mitigation |
|------|--------|------------|
| Rate changes mid-implementation | HIGH | Lock to 2024 rates, implement versioning first |
| Historical data inconsistency | MEDIUM | Run migration on staging first, verify calculations |
| Performance impact from complex calculations | LOW | Add caching, pre-compute bracket values |
| User confusion with new UI | MEDIUM | Add inline help, example calculator |

---

## 📚 Legal References

- **SSS**: Circular No. 2023-033 (2024 Contribution Schedule)
- **PhilHealth**: Circular No. 2023-0008 (Premium Contribution)
- **Pag-IBIG**: Circular No. 395 (Contribution Table)
- **DOLE**: Department Order No. 227 (Wage Compliance)

---

## 📝 Next Steps

1. [ ] Review and approve this implementation plan
2. [ ] Create backup of current database
3. [ ] Begin Phase 1: Schema updates
4. [ ] Set up test environment with sample data
5. [ ] Implement and test each phase sequentially
6. [ ] Conduct UAT with HR/Finance team
7. [ ] Deploy to production with rollback plan

---

*Document Version: 1.0*  
*Created: December 6, 2025*  
*Author: Development Team*
