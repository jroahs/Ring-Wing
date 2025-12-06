/**
 * Government Deductions Utility
 * Calculates Philippine government-mandated deductions (SSS, PhilHealth, Pag-IBIG)
 * 
 * COMPLIANCE UPDATE: Now calculates BOTH employee AND employer contributions
 * 
 * Rates (2024):
 * - SSS: Employee 5% + Employer 10% + EC (₱10/₱30)
 * - PhilHealth: Employee 2.5% + Employer 2.5%
 * - Pag-IBIG: Employee 2% + Employer 2% (MFS capped at ₱10,000)
 * 
 * Legal References:
 * - SSS: Circular No. 2023-033
 * - PhilHealth: Circular No. 2023-0008
 * - Pag-IBIG: Circular No. 395
 */

const GovernmentDeductionConfig = require('../models/GovernmentDeductionConfig');

// Cache for configuration (refreshed every 5 minutes)
let cachedConfig = null;
let cacheTimestamp = null;
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

// ============================================
// FALLBACK CONFIGURATION - 2024 Compliant Rates
// Used if database configuration is unavailable
// ============================================

const FALLBACK_SSS_CONFIG = {
  employeeRate: 0.05,      // 5%
  employerRate: 0.10,      // 10%
  totalRate: 0.15,         // 15% total
  mscFloor: 4000,          // Minimum MSC
  mscCeiling: 35000,       // Maximum MSC
  ec: {
    enabled: true,
    lowMscThreshold: 15000,  // Below/equal = ₱10 EC
    lowMscAmount: 10,        // ₱10 for MSC ≤ ₱15,000
    highMscAmount: 30        // ₱30 for MSC > ₱15,000
  }
};

const FALLBACK_SSS_MSC_BRACKETS = [
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

// PhilHealth Fallback Configuration - 2024
const FALLBACK_PHILHEALTH_CONFIG = {
  employeeRate: 0.025,     // 2.5%
  employerRate: 0.025,     // 2.5%
  totalRate: 0.05,         // 5% total
  floor: 10000,            // MBS floor ₱10,000
  ceiling: 100000          // MBS ceiling ₱100,000
};

// Pag-IBIG Fallback Configuration - 2024
const FALLBACK_PAGIBIG_CONFIG = {
  employeeRate: 0.02,           // 2%
  employerRate: 0.02,           // 2%
  totalRate: 0.04,              // 4% total
  mfsCap: 10000,                // MFS capped at ₱10,000
  maxEmployeeContribution: 200, // ₱200 max
  maxEmployerContribution: 200  // ₱200 max
};

/**
 * Fetch active government deduction configuration from database
 * Uses caching to reduce database queries
 * @returns {Object|null} - Active configuration or null if unavailable
 */
async function getActiveConfig() {
  try {
    // Check if cache is still valid
    const now = Date.now();
    if (cachedConfig && cacheTimestamp && (now - cacheTimestamp) < CACHE_DURATION) {
      return cachedConfig;
    }

    // Fetch from database
    const config = await GovernmentDeductionConfig.getActiveConfig();
    
    if (config) {
      cachedConfig = config;
      cacheTimestamp = now;
      return config;
    }

    return null;
  } catch (error) {
    console.error('Error fetching government config:', error);
    return null;
  }
}

/**
 * Clear configuration cache (call after config updates)
 */
function clearConfigCache() {
  cachedConfig = null;
  cacheTimestamp = null;
}

/**
 * Get full configuration (from database or fallback to hardcoded)
 * @returns {Object} - Complete configuration object with all rates
 */
async function getConfig() {
  const dbConfig = await getActiveConfig();
  
  if (dbConfig) {
    return {
      _id: dbConfig._id,
      version: dbConfig.version,
      sss: {
        employeeRate: dbConfig.sss.employeeRate || FALLBACK_SSS_CONFIG.employeeRate,
        employerRate: dbConfig.sss.employerRate || FALLBACK_SSS_CONFIG.employerRate,
        totalRate: dbConfig.sss.totalRate || FALLBACK_SSS_CONFIG.totalRate,
        mscFloor: dbConfig.sss.mscFloor || FALLBACK_SSS_CONFIG.mscFloor,
        mscCeiling: dbConfig.sss.mscCeiling || FALLBACK_SSS_CONFIG.mscCeiling,
        mscBrackets: dbConfig.sss.mscBrackets || FALLBACK_SSS_MSC_BRACKETS,
        ec: {
          enabled: dbConfig.sss.ec?.enabled ?? FALLBACK_SSS_CONFIG.ec.enabled,
          lowMscThreshold: dbConfig.sss.ec?.lowMscThreshold || FALLBACK_SSS_CONFIG.ec.lowMscThreshold,
          lowMscAmount: dbConfig.sss.ec?.lowMscAmount || FALLBACK_SSS_CONFIG.ec.lowMscAmount,
          highMscAmount: dbConfig.sss.ec?.highMscAmount || FALLBACK_SSS_CONFIG.ec.highMscAmount
        }
      },
      philHealth: {
        employeeRate: dbConfig.philHealth.employeeRate || FALLBACK_PHILHEALTH_CONFIG.employeeRate,
        employerRate: dbConfig.philHealth.employerRate || FALLBACK_PHILHEALTH_CONFIG.employerRate,
        totalRate: dbConfig.philHealth.totalRate || FALLBACK_PHILHEALTH_CONFIG.totalRate,
        floor: dbConfig.philHealth.floor || FALLBACK_PHILHEALTH_CONFIG.floor,
        ceiling: dbConfig.philHealth.ceiling || FALLBACK_PHILHEALTH_CONFIG.ceiling
      },
      pagIbig: {
        employeeRate: dbConfig.pagIbig.employeeRate || FALLBACK_PAGIBIG_CONFIG.employeeRate,
        employerRate: dbConfig.pagIbig.employerRate || FALLBACK_PAGIBIG_CONFIG.employerRate,
        totalRate: dbConfig.pagIbig.totalRate || FALLBACK_PAGIBIG_CONFIG.totalRate,
        mfsCap: dbConfig.pagIbig.mfsCap || FALLBACK_PAGIBIG_CONFIG.mfsCap,
        maxEmployeeContribution: dbConfig.pagIbig.maxEmployeeContribution || dbConfig.pagIbig.maxContribution || FALLBACK_PAGIBIG_CONFIG.maxEmployeeContribution,
        maxEmployerContribution: dbConfig.pagIbig.maxEmployerContribution || FALLBACK_PAGIBIG_CONFIG.maxEmployerContribution
      }
    };
  }

  // Fallback to hardcoded values
  console.warn('Using fallback government deduction configuration');
  return {
    _id: null,
    version: 0,
    sss: {
      ...FALLBACK_SSS_CONFIG,
      mscBrackets: FALLBACK_SSS_MSC_BRACKETS
    },
    philHealth: { ...FALLBACK_PHILHEALTH_CONFIG },
    pagIbig: { ...FALLBACK_PAGIBIG_CONFIG }
  };
}

/**
 * Find the appropriate Monthly Salary Credit (MSC) for a given salary
 * @param {number} salary - Monthly salary amount
 * @param {Array} mscBrackets - MSC brackets from configuration
 * @returns {number} - Monthly Salary Credit
 */
function findMSC(salary, mscBrackets) {
  for (const bracket of mscBrackets) {
    if (salary >= bracket.min && salary <= bracket.max) {
      return bracket.msc;
    }
  }
  // Default to highest MSC if salary exceeds all brackets
  return mscBrackets[mscBrackets.length - 1].msc;
}

/**
 * Find the full MSC bracket for a given salary (includes pre-computed contributions)
 * @param {number} salary - Monthly salary amount
 * @param {Array} mscBrackets - MSC brackets from configuration
 * @returns {Object} - Full bracket object
 */
function findMSCBracket(salary, mscBrackets) {
  for (const bracket of mscBrackets) {
    if (salary >= bracket.min && salary <= bracket.max) {
      return bracket;
    }
  }
  return mscBrackets[mscBrackets.length - 1];
}

/**
 * Calculate SSS (Social Security System) contributions
 * Returns BOTH employee and employer shares + EC
 * 
 * @param {number} monthlySalary - Monthly salary amount
 * @param {boolean} hasSSSNumber - Whether employee has SSS number
 * @param {Object} config - Government deduction configuration
 * @returns {Object} - SSS contribution breakdown
 */
async function calculateSSS(monthlySalary, hasSSSNumber, config = null) {
  // Return zero object if no SSS number or invalid salary
  if (!hasSSSNumber || !monthlySalary || monthlySalary <= 0) {
    return {
      msc: 0,
      grossSalary: monthlySalary || 0,
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
  const bracket = findMSCBracket(monthlySalary, config.sss.mscBrackets);
  const msc = bracket.msc;
  
  // Use pre-computed values if available, otherwise calculate
  let employeeAmount, employerAmount, ecAmount;
  
  if (bracket.employeeContribution !== undefined) {
    // Use pre-computed values from bracket
    employeeAmount = bracket.employeeContribution;
    employerAmount = bracket.employerContribution;
    ecAmount = bracket.ecContribution || 0;
  } else {
    // Calculate contributions based on MSC
    employeeAmount = Number((msc * config.sss.employeeRate).toFixed(2));
    employerAmount = Number((msc * config.sss.employerRate).toFixed(2));
    
    // Calculate EC (Employees' Compensation) - Employer only
    ecAmount = 0;
    if (config.sss.ec && config.sss.ec.enabled) {
      ecAmount = msc <= config.sss.ec.lowMscThreshold 
        ? config.sss.ec.lowMscAmount    // ₱10 for MSC ≤ ₱15,000
        : config.sss.ec.highMscAmount;  // ₱30 for MSC > ₱15,000
    }
  }
  
  return {
    msc,
    grossSalary: monthlySalary,
    employeeAmount,
    employerAmount,
    ecAmount,
    totalContribution: employeeAmount + employerAmount + ecAmount
  };
}

/**
 * Calculate PhilHealth (Philippine Health Insurance) contributions
 * Returns BOTH employee and employer shares with floor/ceiling applied
 * 
 * @param {number} monthlySalary - Monthly salary amount
 * @param {boolean} hasPhilHealthNumber - Whether employee has PhilHealth number
 * @param {Object} config - Government deduction configuration
 * @returns {Object} - PhilHealth contribution breakdown
 */
async function calculatePhilHealth(monthlySalary, hasPhilHealthNumber, config = null) {
  // Return zero object if no PhilHealth number or invalid salary
  if (!hasPhilHealthNumber || !monthlySalary || monthlySalary <= 0) {
    return {
      mbs: 0,
      grossSalary: monthlySalary || 0,
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
    config.philHealth.floor, 
    Math.min(monthlySalary, config.philHealth.ceiling)
  );
  
  // Calculate total premium and split equally
  const totalPremium = mbs * config.philHealth.totalRate;
  const employeeAmount = Number((totalPremium / 2).toFixed(2));
  const employerAmount = Number((totalPremium / 2).toFixed(2));
  
  return {
    mbs,
    grossSalary: monthlySalary,
    employeeAmount,
    employerAmount,
    totalContribution: employeeAmount + employerAmount
  };
}

/**
 * Calculate Pag-IBIG (Home Development Mutual Fund) contributions
 * Returns BOTH employee and employer shares with MFS cap applied
 * 
 * @param {number} monthlySalary - Monthly salary amount
 * @param {boolean} hasPagIbigNumber - Whether employee has Pag-IBIG number
 * @param {Object} config - Government deduction configuration
 * @returns {Object} - Pag-IBIG contribution breakdown
 */
async function calculatePagIbig(monthlySalary, hasPagIbigNumber, config = null) {
  // Return zero object if no Pag-IBIG number or invalid salary
  if (!hasPagIbigNumber || !monthlySalary || monthlySalary <= 0) {
    return {
      mfs: 0,
      grossSalary: monthlySalary || 0,
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
    grossSalary: monthlySalary,
    employeeAmount,
    employerAmount,
    totalContribution: employeeAmount + employerAmount
  };
}

/**
 * Calculate all government deductions for an employee
 * Returns comprehensive breakdown with BOTH employee and employer contributions
 * 
 * @param {number} monthlySalary - Monthly salary amount
 * @param {object} staff - Staff object with government IDs (sssNumber, philHealthNumber, pagIbigNumber)
 * @returns {object} - Complete government deductions breakdown
 */
async function calculateAllGovernmentDeductions(monthlySalary, staff) {
  const config = await getConfig();
  
  // Check for government IDs
  const hasSSSNumber = !!(staff.sssNumber && staff.sssNumber.trim());
  const hasPhilHealthNumber = !!(staff.philHealthNumber && staff.philHealthNumber.trim());
  const hasPagIbigNumber = !!(staff.pagIbigNumber && staff.pagIbigNumber.trim());
  
  // Calculate all contributions
  const sss = await calculateSSS(monthlySalary, hasSSSNumber, config);
  const philHealth = await calculatePhilHealth(monthlySalary, hasPhilHealthNumber, config);
  const pagIbig = await calculatePagIbig(monthlySalary, hasPagIbigNumber, config);
  
  // Calculate totals
  const employeeTotal = sss.employeeAmount + philHealth.employeeAmount + pagIbig.employeeAmount;
  const employerTotal = sss.employerAmount + sss.ecAmount + philHealth.employerAmount + pagIbig.employerAmount;
  const grandTotal = employeeTotal + employerTotal;
  
  return {
    // SSS breakdown
    sss: {
      ...sss,
      hasId: hasSSSNumber,
      // Legacy compatibility - return employee amount as 'amount'
      amount: sss.employeeAmount
    },
    
    // PhilHealth breakdown
    philHealth: {
      ...philHealth,
      hasId: hasPhilHealthNumber,
      // Legacy compatibility
      amount: philHealth.employeeAmount
    },
    
    // Pag-IBIG breakdown
    pagIbig: {
      ...pagIbig,
      hasId: hasPagIbigNumber,
      // Legacy compatibility
      amount: pagIbig.employeeAmount
    },
    
    // Totals
    totals: {
      employeeTotal,
      employerTotal,
      grandTotal
    },
    
    // Legacy compatibility - employee total
    total: employeeTotal,
    
    // Legacy breakdown (employee only)
    breakdown: {
      sss: sss.employeeAmount,
      philHealth: philHealth.employeeAmount,
      pagIbig: pagIbig.employeeAmount
    },
    
    // NEW: Employer breakdown
    employerBreakdown: {
      sss: sss.employerAmount,
      sssEc: sss.ecAmount,
      philHealth: philHealth.employerAmount,
      pagIbig: pagIbig.employerAmount
    },
    
    // Contribution basis for audit
    contributionBasis: {
      sss: {
        msc: sss.msc,
        grossSalary: monthlySalary
      },
      philHealth: {
        mbs: philHealth.mbs,
        grossSalary: monthlySalary
      },
      pagIbig: {
        mfs: pagIbig.mfs,
        grossSalary: monthlySalary
      }
    },
    
    // Config reference
    configId: config._id,
    configVersion: config.version
  };
}

/**
 * Preview calculation for a specific salary (for UI calculator)
 * @param {number} monthlySalary - Monthly salary to preview
 * @returns {Object} - Full breakdown of all contributions
 */
async function previewCalculation(monthlySalary) {
  const config = await getConfig();
  
  // Calculate assuming all government IDs are present
  const sss = await calculateSSS(monthlySalary, true, config);
  const philHealth = await calculatePhilHealth(monthlySalary, true, config);
  const pagIbig = await calculatePagIbig(monthlySalary, true, config);
  
  return {
    salary: monthlySalary,
    sss: {
      basis: `MSC ₱${sss.msc.toLocaleString()}`,
      employee: sss.employeeAmount,
      employer: sss.employerAmount,
      ec: sss.ecAmount,
      total: sss.totalContribution
    },
    philHealth: {
      basis: `MBS ₱${philHealth.mbs.toLocaleString()}`,
      employee: philHealth.employeeAmount,
      employer: philHealth.employerAmount,
      total: philHealth.totalContribution
    },
    pagIbig: {
      basis: `MFS ₱${pagIbig.mfs.toLocaleString()}`,
      employee: pagIbig.employeeAmount,
      employer: pagIbig.employerAmount,
      total: pagIbig.totalContribution
    },
    summary: {
      totalEmployeeDeductions: sss.employeeAmount + philHealth.employeeAmount + pagIbig.employeeAmount,
      totalEmployerContributions: sss.employerAmount + sss.ecAmount + philHealth.employerAmount + pagIbig.employerAmount,
      grandTotal: sss.totalContribution + philHealth.totalContribution + pagIbig.totalContribution,
      netPayAfterDeductions: monthlySalary - (sss.employeeAmount + philHealth.employeeAmount + pagIbig.employeeAmount)
    }
  };
}

/**
 * Get current configuration details (for admin interface)
 * @returns {object} - Current configuration settings with descriptions
 */
async function getGovernmentDeductionConfig() {
  const config = await getConfig();
  
  return {
    sss: {
      employeeRate: config.sss.employeeRate,
      employerRate: config.sss.employerRate,
      totalRate: config.sss.totalRate,
      mscFloor: config.sss.mscFloor,
      mscCeiling: config.sss.mscCeiling,
      mscBrackets: config.sss.mscBrackets,
      ec: config.sss.ec,
      description: `Social Security System - Employee ${(config.sss.employeeRate * 100).toFixed(0)}% + Employer ${(config.sss.employerRate * 100).toFixed(0)}% of MSC + EC`
    },
    philHealth: {
      employeeRate: config.philHealth.employeeRate,
      employerRate: config.philHealth.employerRate,
      totalRate: config.philHealth.totalRate,
      floor: config.philHealth.floor,
      ceiling: config.philHealth.ceiling,
      description: `Philippine Health Insurance - ${(config.philHealth.totalRate * 100).toFixed(0)}% split equally (floor: ₱${config.philHealth.floor.toLocaleString()}, ceiling: ₱${config.philHealth.ceiling.toLocaleString()})`
    },
    pagIbig: {
      employeeRate: config.pagIbig.employeeRate,
      employerRate: config.pagIbig.employerRate,
      totalRate: config.pagIbig.totalRate,
      mfsCap: config.pagIbig.mfsCap,
      maxEmployeeContribution: config.pagIbig.maxEmployeeContribution,
      maxEmployerContribution: config.pagIbig.maxEmployerContribution,
      description: `Home Development Mutual Fund - ${(config.pagIbig.totalRate * 100).toFixed(0)}% split equally (MFS cap: ₱${config.pagIbig.mfsCap.toLocaleString()}, max: ₱${config.pagIbig.maxEmployeeContribution} each)`
    },
    configId: config._id,
    configVersion: config.version
  };
}

module.exports = {
  // Main calculation functions
  calculateSSS,
  calculatePhilHealth,
  calculatePagIbig,
  calculateAllGovernmentDeductions,
  
  // Utility functions
  getGovernmentDeductionConfig,
  getConfig,
  previewCalculation,
  clearConfigCache,
  findMSC,
  findMSCBracket,
  
  // Export fallback configs for testing
  FALLBACK_SSS_CONFIG,
  FALLBACK_SSS_MSC_BRACKETS,
  FALLBACK_PHILHEALTH_CONFIG,
  FALLBACK_PAGIBIG_CONFIG
};
