/**
 * Government Deductions Utility
 * Calculates Philippine government-mandated deductions (SSS, PhilHealth, Pag-IBIG)
 * Reads configuration from database with fallback to hardcoded 2024 rates
 */

const GovernmentDeductionConfig = require('../models/GovernmentDeductionConfig');

// Cache for configuration (refreshed every 5 minutes)
let cachedConfig = null;
let cacheTimestamp = null;
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

// Fallback configuration - 2024 rates (used if database unavailable)
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

const FALLBACK_SSS_EMPLOYEE_RATE = 0.05; // 5% employee contribution

// PhilHealth Fallback Configuration - 2024
const FALLBACK_PHILHEALTH_CONFIG = {
  floor: 10000,           // Minimum salary for calculation
  ceiling: 100000,        // Maximum salary for calculation
  totalRate: 0.05,        // 5% total premium
  employeeShare: 0.025    // 2.5% employee portion (50% of total)
};

// Pag-IBIG Fallback Configuration - 2024
const FALLBACK_PAGIBIG_CONFIG = {
  rate: 0.02,   // 2% employee contribution
  cap: 200      // Maximum ₱200 monthly contribution
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
 * Get configuration (from database or fallback to hardcoded)
 * @returns {Object} - Configuration object
 */
async function getConfig() {
  const dbConfig = await getActiveConfig();
  
  if (dbConfig) {
    return {
      sss: {
        employeeRate: dbConfig.sss.employeeRate,
        mscBrackets: dbConfig.sss.mscBrackets
      },
      philHealth: {
        employeeRate: dbConfig.philHealth.employeeRate,
        floor: dbConfig.philHealth.floor,
        ceiling: dbConfig.philHealth.ceiling
      },
      pagIbig: {
        rate: dbConfig.pagIbig.employeeRate,
        cap: dbConfig.pagIbig.maxContribution
      }
    };
  }

  // Fallback to hardcoded values
  console.warn('Using fallback government deduction configuration');
  return {
    sss: {
      employeeRate: FALLBACK_SSS_EMPLOYEE_RATE,
      mscBrackets: FALLBACK_SSS_MSC_BRACKETS
    },
    philHealth: {
      employeeRate: FALLBACK_PHILHEALTH_CONFIG.employeeShare,
      floor: FALLBACK_PHILHEALTH_CONFIG.floor,
      ceiling: FALLBACK_PHILHEALTH_CONFIG.ceiling
    },
    pagIbig: {
      rate: FALLBACK_PAGIBIG_CONFIG.rate,
      cap: FALLBACK_PAGIBIG_CONFIG.cap
    }
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
 * Calculate SSS (Social Security System) deduction
 * @param {number} monthlySalary - Monthly salary amount
 * @param {boolean} hasSSSNumber - Whether employee has SSS number
 * @param {Object} config - Government deduction configuration
 * @returns {number} - SSS deduction amount (0 if no SSS number)
 */
async function calculateSSS(monthlySalary, hasSSSNumber, config = null) {
  if (!hasSSSNumber || !monthlySalary || monthlySalary <= 0) {
    return 0;
  }

  if (!config) {
    config = await getConfig();
  }
  
  const msc = findMSC(monthlySalary, config.sss.mscBrackets);
  const sssDeduction = msc * config.sss.employeeRate;
  
  return Number(sssDeduction.toFixed(2));
}

/**
 * Calculate PhilHealth (Philippine Health Insurance) deduction
 * @param {number} monthlySalary - Monthly salary amount
 * @param {boolean} hasPhilHealthNumber - Whether employee has PhilHealth number
 * @param {Object} config - Government deduction configuration
 * @returns {number} - PhilHealth deduction amount (0 if no PhilHealth number)
 */
async function calculatePhilHealth(monthlySalary, hasPhilHealthNumber, config = null) {
  if (!hasPhilHealthNumber || !monthlySalary || monthlySalary <= 0) {
    return 0;
  }

  if (!config) {
    config = await getConfig();
  }
  
  // Apply floor and ceiling
  const baseSalary = Math.max(
    config.philHealth.floor, 
    Math.min(monthlySalary, config.philHealth.ceiling)
  );
  
  const philHealthDeduction = baseSalary * config.philHealth.employeeRate;
  
  return Number(philHealthDeduction.toFixed(2));
}

/**
 * Calculate Pag-IBIG (Home Development Mutual Fund) deduction
 * @param {number} monthlySalary - Monthly salary amount
 * @param {boolean} hasPagIbigNumber - Whether employee has Pag-IBIG number
 * @param {Object} config - Government deduction configuration
 * @returns {number} - Pag-IBIG deduction amount (0 if no Pag-IBIG number)
 */
async function calculatePagIbig(monthlySalary, hasPagIbigNumber, config = null) {
  if (!hasPagIbigNumber || !monthlySalary || monthlySalary <= 0) {
    return 0;
  }

  if (!config) {
    config = await getConfig();
  }
  
  // Calculate rate% of salary, capped at max contribution
  const pagIbigDeduction = Math.min(
    monthlySalary * config.pagIbig.rate, 
    config.pagIbig.cap
  );
  
  return Number(pagIbigDeduction.toFixed(2));
}

/**
 * Calculate all government deductions for an employee
 * @param {number} monthlySalary - Monthly salary amount
 * @param {object} staff - Staff object with government IDs
 * @returns {object} - Object containing all calculated deductions
 */
async function calculateAllGovernmentDeductions(monthlySalary, staff) {
  const config = await getConfig();
  
  const hasSSSNumber = !!(staff.sssNumber && staff.sssNumber.trim());
  const hasPhilHealthNumber = !!(staff.philHealthNumber && staff.philHealthNumber.trim());
  const hasPagIbigNumber = !!(staff.pagIbigNumber && staff.pagIbigNumber.trim());
  
  const sss = await calculateSSS(monthlySalary, hasSSSNumber, config);
  const philHealth = await calculatePhilHealth(monthlySalary, hasPhilHealthNumber, config);
  const pagIbig = await calculatePagIbig(monthlySalary, hasPagIbigNumber, config);
  
  const total = sss + philHealth + pagIbig;
  
  return {
    sss: {
      amount: sss,
      hasId: hasSSSNumber,
      msc: hasSSSNumber ? findMSC(monthlySalary, config.sss.mscBrackets) : 0
    },
    philHealth: {
      amount: philHealth,
      hasId: hasPhilHealthNumber
    },
    pagIbig: {
      amount: pagIbig,
      hasId: hasPagIbigNumber
    },
    total,
    breakdown: {
      sss,
      philHealth,
      pagIbig
    }
  };
}

/**
 * Get configuration details (for admin interface)
 * @returns {object} - Current configuration settings
 */
function getGovernmentDeductionConfig() {
  return {
    sss: {
      employeeRate: SSS_EMPLOYEE_RATE,
      mscBrackets: SSS_MSC_BRACKETS,
      description: 'Social Security System - 5% of Monthly Salary Credit'
    },
    philHealth: {
      ...PHILHEALTH_CONFIG,
      description: 'Philippine Health Insurance - 2.5% of salary (floor: ₱10,000, ceiling: ₱100,000)'
    },
    pagIbig: {
      ...PAGIBIG_CONFIG,
      description: 'Home Development Mutual Fund - 2% of salary (capped at ₱200)'
    }
  };
}

module.exports = {
  calculateSSS,
  calculatePhilHealth,
  calculatePagIbig,
  calculateAllGovernmentDeductions,
  getGovernmentDeductionConfig,
  getConfig,
  // Export constants for testing
  FALLBACK_SSS_MSC_BRACKETS,
  FALLBACK_SSS_EMPLOYEE_RATE,
  FALLBACK_PHILHEALTH_CONFIG,
  FALLBACK_PAGIBIG_CONFIG
};
