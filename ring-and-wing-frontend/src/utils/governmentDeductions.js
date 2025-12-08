/**
 * Government Deductions Utility (Frontend)
 * Calculates Philippine government-mandated deductions (SSS, PhilHealth, Pag-IBIG)
 * Fetches configuration from backend API for real-time accuracy
 * Falls back to hardcoded 2024/2025 rates if API fails
 * 
 * IMPORTANT: This file calculates BOTH employee and employer contributions
 * for compliance with Philippine government regulations.
 */

import api from '../services/api';

// ============================================
// CACHE MANAGEMENT
// ============================================
let cachedConfig = null;
let cacheTimestamp = null;
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

/**
 * Fetch government deduction config from backend API
 * @returns {Object|null} - Active configuration or null if unavailable
 */
async function fetchConfigFromAPI() {
  try {
    const response = await api.get('/api/government-config');
    if (response.data?.success && response.data?.data) {
      return response.data.data;
    }
    return null;
  } catch (error) {
    console.warn('Failed to fetch government config from API, using fallback:', error.message);
    return null;
  }
}

/**
 * Get configuration with caching
 * @returns {Object} - Configuration object
 */
async function getConfig() {
  // Check cache validity
  const now = Date.now();
  if (cachedConfig && cacheTimestamp && (now - cacheTimestamp) < CACHE_DURATION) {
    return cachedConfig;
  }

  // Try to fetch from API
  const apiConfig = await fetchConfigFromAPI();
  
  if (apiConfig) {
    // Use API config
    cachedConfig = {
      _id: apiConfig._id,
      version: apiConfig.version,
      year: apiConfig.year,
      sss: {
        employeeRate: apiConfig.sss.employeeRate,
        employerRate: apiConfig.sss.employerRate,
        ecThreshold: apiConfig.sss.ec?.lowMscThreshold || 15000,
        ecLowRate: apiConfig.sss.ec?.lowMscAmount || 10,
        ecHighRate: apiConfig.sss.ec?.highMscAmount || 30,
        mscBrackets: apiConfig.sss.mscBrackets || FALLBACK_SSS_MSC_BRACKETS
      },
      philHealth: {
        floor: apiConfig.philHealth.floor,
        ceiling: apiConfig.philHealth.ceiling,
        totalRate: apiConfig.philHealth.totalRate,
        employeeShare: apiConfig.philHealth.employeeRate,
        employerShare: apiConfig.philHealth.employerRate
      },
      pagIbig: {
        employeeRate: apiConfig.pagIbig.employeeRate,
        employerRate: apiConfig.pagIbig.employerRate,
        mfsCap: apiConfig.pagIbig.mfsCap,
        maxContribution: apiConfig.pagIbig.maxEmployeeContribution
      }
    };
    cacheTimestamp = now;
    console.log('[Gov Config] Loaded from API:', { version: cachedConfig.version, year: cachedConfig.year });
  } else {
    // Use fallback config
    cachedConfig = {
      _id: null,
      version: 0,
      year: 2024,
      sss: {
        employeeRate: FALLBACK_SSS_CONFIG.employeeRate,
        employerRate: FALLBACK_SSS_CONFIG.employerRate,
        ecThreshold: FALLBACK_SSS_CONFIG.ecThreshold,
        ecLowRate: FALLBACK_SSS_CONFIG.ecLowRate,
        ecHighRate: FALLBACK_SSS_CONFIG.ecHighRate,
        mscBrackets: FALLBACK_SSS_MSC_BRACKETS
      },
      philHealth: FALLBACK_PHILHEALTH_CONFIG,
      pagIbig: FALLBACK_PAGIBIG_CONFIG
    };
    cacheTimestamp = now;
    console.warn('[Gov Config] Using fallback configuration');
  }

  return cachedConfig;
}

/**
 * Clear config cache (call when config is updated)
 */
export function clearConfigCache() {
  cachedConfig = null;
  cacheTimestamp = null;
}

// ============================================
// FALLBACK CONFIGURATION - 2024/2025 Rates
// Used if API is unavailable
// ============================================

// SSS Monthly Salary Credit (MSC) Brackets - 2024
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

// SSS Fallback Config - 2024 (Employee 5%, Employer 10%)
const FALLBACK_SSS_CONFIG = {
  employeeRate: 0.05,    // 5% employee contribution
  employerRate: 0.10,    // 10% employer contribution
  ecThreshold: 15000,    // MSC threshold for EC rate
  ecLowRate: 10,         // ₱10 EC for MSC ≤ ₱15,000
  ecHighRate: 30         // ₱30 EC for MSC > ₱15,000
};

// PhilHealth Fallback Configuration - 2024
const FALLBACK_PHILHEALTH_CONFIG = {
  floor: 10000,           // Minimum salary for calculation (MBS floor)
  ceiling: 100000,        // Maximum salary for calculation (MBS ceiling)
  totalRate: 0.05,        // 5% total premium
  employeeShare: 0.025,   // 2.5% employee portion (50% of total)
  employerShare: 0.025    // 2.5% employer portion (50% of total)
};

// Pag-IBIG Fallback Configuration - 2024
const FALLBACK_PAGIBIG_CONFIG = {
  employeeRate: 0.02,     // 2% employee contribution
  employerRate: 0.02,     // 2% employer contribution
  mfsCap: 10000,          // Maximum Fund Salary (MFS) cap ₱10,000
  maxContribution: 200    // Maximum ₱200 monthly contribution each
};

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
 * Calculate SSS (Social Security System) contributions
 * Returns BOTH employee and employer shares including EC
 * @param {number} monthlySalary - Monthly salary amount
 * @param {boolean} hasSSSNumber - Whether employee has SSS number
 * @param {Object} config - Configuration object (optional, will fetch if not provided)
 * @returns {object} - SSS contribution breakdown
 */
export async function calculateSSS(monthlySalary, hasSSSNumber, config = null) {
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
  
  if (!config) {
    config = await getConfig();
  }
  
  const msc = findMSC(monthlySalary, config.sss.mscBrackets);
  const employeeAmount = Number((msc * config.sss.employeeRate).toFixed(2));
  const employerAmount = Number((msc * config.sss.employerRate).toFixed(2));
  
  // EC (Employees' Compensation) is based on MSC threshold
  const ecAmount = msc <= config.sss.ecThreshold ? config.sss.ecLowRate : config.sss.ecHighRate;
  
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
 * @param {Object} config - Configuration object (optional, will fetch if not provided)
 * @returns {object} - PhilHealth contribution breakdown
 */
export async function calculatePhilHealth(monthlySalary, hasPhilHealthNumber, config = null) {
  if (!hasPhilHealthNumber || !monthlySalary || monthlySalary <= 0) {
    return {
      employeeAmount: 0,
      employerAmount: 0,
      totalContribution: 0,
      mbs: 0,
      amount: 0 // Legacy field for backward compatibility
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
  
  const employeeAmount = Number((mbs * config.philHealth.employeeShare).toFixed(2));
  const employerAmount = Number((mbs * config.philHealth.employerShare).toFixed(2));
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
 * @param {Object} config - Configuration object (optional, will fetch if not provided)
 * @returns {object} - Pag-IBIG contribution breakdown
 */
export async function calculatePagIbig(monthlySalary, hasPagIbigNumber, config = null) {
  if (!hasPagIbigNumber || !monthlySalary || monthlySalary <= 0) {
    return {
      employeeAmount: 0,
      employerAmount: 0,
      totalContribution: 0,
      mfs: 0,
      amount: 0 // Legacy field for backward compatibility
    };
  }
  
  if (!config) {
    config = await getConfig();
  }
  
  // Apply MFS cap (Maximum Fund Salary)
  const mfs = Math.min(monthlySalary, config.pagIbig.mfsCap);
  
  // Calculate contributions (capped at max contribution)
  const employeeAmount = Math.min(
    mfs * config.pagIbig.employeeRate, 
    config.pagIbig.maxContribution
  );
  const employerAmount = Math.min(
    mfs * config.pagIbig.employerRate, 
    config.pagIbig.maxContribution
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
export async function calculateAllGovernmentDeductions(monthlySalary, employee) {
  const hasSSSNumber = !!(employee?.sssNumber && employee.sssNumber.trim());
  const hasPhilHealthNumber = !!(employee?.philHealthNumber && employee.philHealthNumber.trim());
  const hasPagIbigNumber = !!(employee?.pagIbigNumber && employee.pagIbigNumber.trim());
  
  // Fetch config once and reuse for all calculations
  const config = await getConfig();
  
  const sss = await calculateSSS(monthlySalary, hasSSSNumber, config);
  const philHealth = await calculatePhilHealth(monthlySalary, hasPhilHealthNumber, config);
  const pagIbig = await calculatePagIbig(monthlySalary, hasPagIbigNumber, config);
  
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
export async function getGovernmentDeductionConfig() {
  const config = await getConfig();
  
  return {
    _id: config._id,
    version: config.version,
    year: config.year,
    sss: {
      employeeRate: config.sss.employeeRate,
      employerRate: config.sss.employerRate,
      ecThreshold: config.sss.ecThreshold,
      ecLowRate: config.sss.ecLowRate,
      ecHighRate: config.sss.ecHighRate,
      mscBrackets: config.sss.mscBrackets,
      description: `Social Security System - Employee ${(config.sss.employeeRate * 100).toFixed(0)}% + Employer ${(config.sss.employerRate * 100).toFixed(0)}% of MSC + EC`
    },
    philHealth: {
      floor: config.philHealth.floor,
      ceiling: config.philHealth.ceiling,
      totalRate: config.philHealth.totalRate,
      employeeShare: config.philHealth.employeeShare,
      employerShare: config.philHealth.employerShare,
      description: `Philippine Health Insurance - Employee ${(config.philHealth.employeeShare * 100).toFixed(1)}% + Employer ${(config.philHealth.employerShare * 100).toFixed(1)}% of MBS (floor: ₱${config.philHealth.floor.toLocaleString()}, ceiling: ₱${config.philHealth.ceiling.toLocaleString()})`
    },
    pagIbig: {
      employeeRate: config.pagIbig.employeeRate,
      employerRate: config.pagIbig.employerRate,
      mfsCap: config.pagIbig.mfsCap,
      maxContribution: config.pagIbig.maxContribution,
      description: `Home Development Mutual Fund - Employee ${(config.pagIbig.employeeRate * 100).toFixed(0)}% + Employer ${(config.pagIbig.employerRate * 100).toFixed(0)}% of MFS (cap: ₱${config.pagIbig.mfsCap.toLocaleString()}, max ₱${config.pagIbig.maxContribution} each)`
    }
  };
}
