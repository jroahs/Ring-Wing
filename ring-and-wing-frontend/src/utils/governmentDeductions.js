/**
 * Government Deductions Utility (Frontend)
 * Calculates Philippine government-mandated deductions (SSS, PhilHealth, Pag-IBIG)
 * Based on 2024 official rates and tables
 * This mirrors the backend calculations for frontend preview
 * 
 * IMPORTANT: This file calculates BOTH employee and employer contributions
 * for compliance with Philippine government regulations.
 */

// SSS Monthly Salary Credit (MSC) Brackets - 2024
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

// SSS Rates - 2024 (Employee 5%, Employer 10%)
const SSS_CONFIG = {
  employeeRate: 0.05,    // 5% employee contribution
  employerRate: 0.10,    // 10% employer contribution
  ecThreshold: 15000,    // MSC threshold for EC rate
  ecLowRate: 10,         // ₱10 EC for MSC ≤ ₱15,000
  ecHighRate: 30         // ₱30 EC for MSC > ₱15,000
};

// PhilHealth Configuration - 2024
const PHILHEALTH_CONFIG = {
  floor: 10000,           // Minimum salary for calculation (MBS floor)
  ceiling: 100000,        // Maximum salary for calculation (MBS ceiling)
  totalRate: 0.05,        // 5% total premium
  employeeShare: 0.025,   // 2.5% employee portion (50% of total)
  employerShare: 0.025    // 2.5% employer portion (50% of total)
};

// Pag-IBIG Configuration - 2024
const PAGIBIG_CONFIG = {
  employeeRate: 0.02,     // 2% employee contribution
  employerRate: 0.02,     // 2% employer contribution
  mfsCap: 10000,          // Maximum Fund Salary (MFS) cap ₱10,000
  maxContribution: 200    // Maximum ₱200 monthly contribution each
};

/**
 * Find the appropriate Monthly Salary Credit (MSC) for a given salary
 * @param {number} salary - Monthly salary amount
 * @returns {number} - Monthly Salary Credit
 */
function findMSC(salary) {
  for (const bracket of SSS_MSC_BRACKETS) {
    if (salary >= bracket.min && salary <= bracket.max) {
      return bracket.msc;
    }
  }
  // Default to highest MSC if salary exceeds all brackets
  return SSS_MSC_BRACKETS[SSS_MSC_BRACKETS.length - 1].msc;
}

/**
 * Calculate SSS (Social Security System) contributions
 * Returns BOTH employee and employer shares including EC
 * @param {number} monthlySalary - Monthly salary amount
 * @param {boolean} hasSSSNumber - Whether employee has SSS number
 * @returns {object} - SSS contribution breakdown
 */
export function calculateSSS(monthlySalary, hasSSSNumber) {
  if (!hasSSSNumber || !monthlySalary || monthlySalary <= 0) {
    return {
      employeeAmount: 0,
      employerAmount: 0,
      ecAmount: 0,
      totalContribution: 0,
      msc: 0,
      amount: 0 // Legacy field for backward compatibility
    };
  }
  
  const msc = findMSC(monthlySalary);
  const employeeAmount = Number((msc * SSS_CONFIG.employeeRate).toFixed(2));
  const employerAmount = Number((msc * SSS_CONFIG.employerRate).toFixed(2));
  
  // EC (Employees' Compensation) is based on MSC threshold
  const ecAmount = msc <= SSS_CONFIG.ecThreshold ? SSS_CONFIG.ecLowRate : SSS_CONFIG.ecHighRate;
  
  const totalContribution = employeeAmount + employerAmount + ecAmount;
  
  return {
    employeeAmount,
    employerAmount,
    ecAmount,
    totalContribution: Number(totalContribution.toFixed(2)),
    msc,
    amount: employeeAmount // Legacy field for backward compatibility
  };
}

/**
 * Calculate PhilHealth (Philippine Health Insurance) contributions
 * Returns BOTH employee and employer shares
 * @param {number} monthlySalary - Monthly salary amount
 * @param {boolean} hasPhilHealthNumber - Whether employee has PhilHealth number
 * @returns {object} - PhilHealth contribution breakdown
 */
export function calculatePhilHealth(monthlySalary, hasPhilHealthNumber) {
  if (!hasPhilHealthNumber || !monthlySalary || monthlySalary <= 0) {
    return {
      employeeAmount: 0,
      employerAmount: 0,
      totalContribution: 0,
      mbs: 0,
      amount: 0 // Legacy field for backward compatibility
    };
  }
  
  // Apply floor and ceiling to get Monthly Basic Salary (MBS)
  const mbs = Math.max(
    PHILHEALTH_CONFIG.floor, 
    Math.min(monthlySalary, PHILHEALTH_CONFIG.ceiling)
  );
  
  const employeeAmount = Number((mbs * PHILHEALTH_CONFIG.employeeShare).toFixed(2));
  const employerAmount = Number((mbs * PHILHEALTH_CONFIG.employerShare).toFixed(2));
  const totalContribution = employeeAmount + employerAmount;
  
  return {
    employeeAmount,
    employerAmount,
    totalContribution: Number(totalContribution.toFixed(2)),
    mbs,
    amount: employeeAmount // Legacy field for backward compatibility
  };
}

/**
 * Calculate Pag-IBIG (Home Development Mutual Fund) contributions
 * Returns BOTH employee and employer shares
 * @param {number} monthlySalary - Monthly salary amount
 * @param {boolean} hasPagIbigNumber - Whether employee has Pag-IBIG number
 * @returns {object} - Pag-IBIG contribution breakdown
 */
export function calculatePagIbig(monthlySalary, hasPagIbigNumber) {
  if (!hasPagIbigNumber || !monthlySalary || monthlySalary <= 0) {
    return {
      employeeAmount: 0,
      employerAmount: 0,
      totalContribution: 0,
      mfs: 0,
      amount: 0 // Legacy field for backward compatibility
    };
  }
  
  // Apply MFS cap (Maximum Fund Salary)
  const mfs = Math.min(monthlySalary, PAGIBIG_CONFIG.mfsCap);
  
  // Calculate contributions (capped at max contribution)
  const employeeAmount = Math.min(
    mfs * PAGIBIG_CONFIG.employeeRate, 
    PAGIBIG_CONFIG.maxContribution
  );
  const employerAmount = Math.min(
    mfs * PAGIBIG_CONFIG.employerRate, 
    PAGIBIG_CONFIG.maxContribution
  );
  
  const totalContribution = employeeAmount + employerAmount;
  
  return {
    employeeAmount: Number(employeeAmount.toFixed(2)),
    employerAmount: Number(employerAmount.toFixed(2)),
    totalContribution: Number(totalContribution.toFixed(2)),
    mfs,
    amount: Number(employeeAmount.toFixed(2)) // Legacy field for backward compatibility
  };
}

/**
 * Calculate all government deductions for an employee
 * Returns full breakdown including employee shares, employer shares, and EC
 * @param {number} monthlySalary - Monthly salary amount
 * @param {object} employee - Employee object with government IDs
 * @returns {object} - Object containing all contribution amounts and details
 */
export function calculateAllGovernmentDeductions(monthlySalary, employee) {
  const hasSSSNumber = !!(employee?.sssNumber && employee.sssNumber.trim());
  const hasPhilHealthNumber = !!(employee?.philHealthNumber && employee.philHealthNumber.trim());
  const hasPagIbigNumber = !!(employee?.pagIbigNumber && employee.pagIbigNumber.trim());
  
  const sss = calculateSSS(monthlySalary, hasSSSNumber);
  const philHealth = calculatePhilHealth(monthlySalary, hasPhilHealthNumber);
  const pagIbig = calculatePagIbig(monthlySalary, hasPagIbigNumber);
  
  // Calculate totals
  const employeeTotal = sss.employeeAmount + philHealth.employeeAmount + pagIbig.employeeAmount;
  const employerTotal = sss.employerAmount + sss.ecAmount + philHealth.employerAmount + pagIbig.employerAmount;
  const grandTotal = employeeTotal + employerTotal;
  
  // Legacy total (employee share only, for backward compatibility)
  const total = employeeTotal;
  
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
    // New compliance fields
    totals: {
      employeeTotal: Number(employeeTotal.toFixed(2)),
      employerTotal: Number(employerTotal.toFixed(2)),
      grandTotal: Number(grandTotal.toFixed(2))
    },
    // Employer breakdown for reporting
    employerBreakdown: {
      sss: sss.employerAmount,
      sssEc: sss.ecAmount,
      philHealth: philHealth.employerAmount,
      pagIbig: pagIbig.employerAmount
    },
    // Contribution basis for compliance reporting
    contributionBasis: {
      sss: { msc: sss.msc },
      philHealth: { mbs: philHealth.mbs },
      pagIbig: { mfs: pagIbig.mfs }
    },
    // Legacy fields for backward compatibility
    total,
    breakdown: {
      sss: sss.employeeAmount,
      philHealth: philHealth.employeeAmount,
      pagIbig: pagIbig.employeeAmount
    }
  };
}

/**
 * Get configuration details (for display/info purposes)
 * @returns {object} - Current configuration settings
 */
export function getGovernmentDeductionConfig() {
  return {
    sss: {
      employeeRate: SSS_CONFIG.employeeRate,
      employerRate: SSS_CONFIG.employerRate,
      ecThreshold: SSS_CONFIG.ecThreshold,
      ecLowRate: SSS_CONFIG.ecLowRate,
      ecHighRate: SSS_CONFIG.ecHighRate,
      mscBrackets: SSS_MSC_BRACKETS,
      description: 'Social Security System - Employee 5% + Employer 10% of MSC + EC'
    },
    philHealth: {
      ...PHILHEALTH_CONFIG,
      description: 'Philippine Health Insurance - Employee 2.5% + Employer 2.5% of MBS (floor: ₱10,000, ceiling: ₱100,000)'
    },
    pagIbig: {
      ...PAGIBIG_CONFIG,
      description: 'Home Development Mutual Fund - Employee 2% + Employer 2% of MFS (cap: ₱10,000, max ₱200 each)'
    }
  };
}
