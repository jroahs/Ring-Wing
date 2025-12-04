/**
 * Philippine Labor Law Compliance Constants
 * 
 * Based on DOLE (Department of Labor and Employment) regulations
 * These are MINIMUM legal requirements - companies can pay MORE but never LESS
 * 
 * Reference: Labor Code of the Philippines, DOLE Department Orders
 */

const Settings = require('../models/Settings');

// ========================================
// MINIMUM LEGAL MULTIPLIERS (DOLE Mandated)
// ========================================

const DOLE_MINIMUM_MULTIPLIERS = {
  // Overtime on Regular Working Day (beyond 8 hours)
  // Labor Code Art. 87: At least 25% premium
  OVERTIME_REGULAR: 1.25,
  
  // Work on Regular Holiday (first 8 hours)
  // Labor Code Art. 94: At least 200% of daily wage
  REGULAR_HOLIDAY: 2.0,
  
  // Overtime on Regular Holiday (beyond 8 hours)
  // Base holiday rate + 30% = 200% + 60% = 260%
  OVERTIME_ON_REGULAR_HOLIDAY: 2.6,
  
  // Work on Special Non-Working Holiday (first 8 hours)
  // If employee works: At least 130% of daily wage
  SPECIAL_HOLIDAY: 1.3,
  
  // Overtime on Special Holiday (beyond 8 hours)
  // Base special rate + 30% = 130% + 39% = 169%
  OVERTIME_ON_SPECIAL_HOLIDAY: 1.69,
  
  // Work on Rest Day (first 8 hours)
  // Labor Code Art. 93: At least 30% premium
  REST_DAY: 1.3,
  
  // Overtime on Rest Day (beyond 8 hours)
  // Rest day rate + 30% = 130% + 39% = 169%
  OVERTIME_ON_REST_DAY: 1.69,
  
  // Work on Regular Holiday falling on Rest Day
  // 200% + 30% (rest day premium) = 260%
  REGULAR_HOLIDAY_ON_REST_DAY: 2.6,
  
  // Overtime on Regular Holiday falling on Rest Day
  // Base rate + 30% OT premium = 260% + 78% = 338%
  OVERTIME_ON_REGULAR_HOLIDAY_REST_DAY: 3.38,
  
  // Work on Special Holiday falling on Rest Day
  // 130% + 50% (rest day premium on special) = 150%
  SPECIAL_HOLIDAY_ON_REST_DAY: 1.5,
  
  // Overtime on Special Holiday falling on Rest Day
  // Base rate + 30% = 150% + 45% = 195%
  OVERTIME_ON_SPECIAL_HOLIDAY_REST_DAY: 1.95,
  
  // Night Shift Differential (10PM - 6AM)
  // Labor Code Art. 86: At least 10% premium
  NIGHT_DIFFERENTIAL: 1.1
};

// ========================================
// DEFAULT MULTIPLIERS (Company Settings)
// ========================================

const DEFAULT_MULTIPLIERS = {
  // Start with legal minimums
  ...DOLE_MINIMUM_MULTIPLIERS,
  
  // Companies can override these higher (but never lower)
  OVERTIME_REGULAR: 1.25,
  REGULAR_HOLIDAY: 2.0,
  SPECIAL_HOLIDAY: 1.3,
  REST_DAY: 1.3
};

// ========================================
// DEDUCTION SETTINGS
// ========================================

const DEFAULT_DEDUCTION_SETTINGS = {
  // Late deduction calculation method
  // 'minute' = per minute late, 'hour' = round to nearest hour
  lateDeductionMethod: 'minute',
  
  // Grace period in minutes before late deduction applies
  graceMinutes: 15,
  
  // Absence deduction: full day rate or pro-rated
  absenceDeductionMethod: 'daily', // 'daily' | 'hourly'
  
  // Whether to apply minimum wage protection
  // (deductions cannot reduce pay below minimum wage)
  enforceMinimumWage: true,
  
  // Current minimum wage (NCR as of 2024)
  // Update this based on region
  minimumDailyWage: 610
};

// ========================================
// VALIDATION FUNCTIONS
// ========================================

/**
 * Validate if a multiplier meets legal minimum
 * @param {string} type - Multiplier type (e.g., 'OVERTIME_REGULAR')
 * @param {number} value - Value to validate
 * @returns {Object} { valid: boolean, message: string, minimum: number }
 */
function validateMultiplier(type, value) {
  const minimum = DOLE_MINIMUM_MULTIPLIERS[type];
  
  if (!minimum) {
    return { valid: true, message: 'Unknown multiplier type', minimum: null };
  }
  
  if (value < minimum) {
    return {
      valid: false,
      message: `${type} multiplier cannot be less than ${minimum}× (DOLE minimum requirement)`,
      minimum
    };
  }
  
  return {
    valid: true,
    message: 'Compliant with DOLE requirements',
    minimum
  };
}

/**
 * Validate all multipliers in a settings object
 * @param {Object} settings - Object containing multiplier settings
 * @returns {Object} { valid: boolean, errors: Array }
 */
function validateAllMultipliers(settings) {
  const errors = [];
  
  const multiplierFields = [
    { field: 'overtimeMultiplier', type: 'OVERTIME_REGULAR' },
    { field: 'regularHolidayMultiplier', type: 'REGULAR_HOLIDAY' },
    { field: 'specialHolidayMultiplier', type: 'SPECIAL_HOLIDAY' },
    { field: 'restDayMultiplier', type: 'REST_DAY' },
    { field: 'overtimeOnHolidayMultiplier', type: 'OVERTIME_ON_REGULAR_HOLIDAY' },
    { field: 'overtimeOnRestDayMultiplier', type: 'OVERTIME_ON_REST_DAY' }
  ];
  
  multiplierFields.forEach(({ field, type }) => {
    if (settings[field] !== undefined) {
      const result = validateMultiplier(type, settings[field]);
      if (!result.valid) {
        errors.push({
          field,
          type,
          value: settings[field],
          minimum: result.minimum,
          message: result.message
        });
      }
    }
  });
  
  return {
    valid: errors.length === 0,
    errors
  };
}

/**
 * Get the effective multiplier for a given work scenario
 * Now fetches from global Settings instead of per-schedule settings
 * @param {Object} params - Parameters for calculation
 * @param {boolean} params.isOvertime - Is this overtime work?
 * @param {boolean} params.isHoliday - Is this a holiday?
 * @param {string} params.holidayType - 'regular' or 'special'
 * @param {boolean} params.isRestDay - Is this a rest day?
 * @param {Object} params.customMultipliers - Optional custom multipliers (overrides global settings)
 * @returns {Promise<number>} Effective multiplier
 */
async function getEffectiveMultiplier({
  isOvertime = false,
  isHoliday = false,
  holidayType = null,
  isRestDay = false,
  customMultipliers = null
}) {
  // Get global settings if custom multipliers not provided
  let multiplierSettings = customMultipliers;
  if (!multiplierSettings) {
    try {
      const settings = await Settings.getSettings();
      // Multipliers are nested under payroll.multipliers
      const m = settings.payroll?.multipliers || {};
      multiplierSettings = {
        overtimeMultiplier: m.overtime,
        regularHolidayMultiplier: m.regularHoliday,
        specialHolidayMultiplier: m.specialHoliday,
        restDayMultiplier: m.restDay,
        overtimeOnRegularHolidayMultiplier: m.overtimeOnHoliday,
        overtimeOnSpecialHolidayMultiplier: m.overtimeOnSpecialHoliday,
        overtimeOnRestDayMultiplier: m.restDayOvertime
      };
    } catch (error) {
      console.error('[LaborLaw] Error fetching global settings, using DOLE minimums:', error.message);
      multiplierSettings = {};
    }
  }
  
  // Start with base rate
  let multiplier = 1.0;
  
  // Apply holiday premium first
  if (isHoliday) {
    if (holidayType === 'regular') {
      multiplier = multiplierSettings.regularHolidayMultiplier || DOLE_MINIMUM_MULTIPLIERS.REGULAR_HOLIDAY;
    } else {
      multiplier = multiplierSettings.specialHolidayMultiplier || DOLE_MINIMUM_MULTIPLIERS.SPECIAL_HOLIDAY;
    }
  }
  
  // Apply rest day premium
  if (isRestDay && !isHoliday) {
    multiplier = multiplierSettings.restDayMultiplier || DOLE_MINIMUM_MULTIPLIERS.REST_DAY;
  } else if (isRestDay && isHoliday) {
    // Holiday + Rest Day stacking
    if (holidayType === 'regular') {
      multiplier = DOLE_MINIMUM_MULTIPLIERS.REGULAR_HOLIDAY_ON_REST_DAY;
    } else {
      multiplier = DOLE_MINIMUM_MULTIPLIERS.SPECIAL_HOLIDAY_ON_REST_DAY;
    }
  }
  
  // Apply overtime premium
  if (isOvertime) {
    if (isHoliday && holidayType === 'regular') {
      multiplier = isRestDay 
        ? DOLE_MINIMUM_MULTIPLIERS.OVERTIME_ON_REGULAR_HOLIDAY_REST_DAY
        : (multiplierSettings.overtimeOnRegularHolidayMultiplier || DOLE_MINIMUM_MULTIPLIERS.OVERTIME_ON_REGULAR_HOLIDAY);
    } else if (isHoliday && holidayType === 'special') {
      multiplier = isRestDay
        ? DOLE_MINIMUM_MULTIPLIERS.OVERTIME_ON_SPECIAL_HOLIDAY_REST_DAY
        : (multiplierSettings.overtimeOnSpecialHolidayMultiplier || DOLE_MINIMUM_MULTIPLIERS.OVERTIME_ON_SPECIAL_HOLIDAY);
    } else if (isRestDay) {
      multiplier = multiplierSettings.overtimeOnRestDayMultiplier || DOLE_MINIMUM_MULTIPLIERS.OVERTIME_ON_REST_DAY;
    } else {
      // Regular overtime
      multiplier = multiplierSettings.overtimeMultiplier || DOLE_MINIMUM_MULTIPLIERS.OVERTIME_REGULAR;
    }
  }
  
  return multiplier;
}

/**
 * Synchronous version - Get the effective multiplier using provided settings (no DB call)
 * Use this when you already have the global settings loaded
 * @param {Object} params - Parameters for calculation
 * @param {boolean} params.isOvertime - Is this overtime work?
 * @param {boolean} params.isHoliday - Is this a holiday?
 * @param {string} params.holidayType - 'regular' or 'special'
 * @param {boolean} params.isRestDay - Is this a rest day?
 * @param {Object} params.multiplierSettings - Pre-loaded multiplier settings
 * @returns {number} Effective multiplier
 */
function getEffectiveMultiplierSync({
  isOvertime = false,
  isHoliday = false,
  holidayType = null,
  isRestDay = false,
  multiplierSettings = {}
}) {
  // Start with base rate
  let multiplier = 1.0;
  
  // Apply holiday premium first
  if (isHoliday) {
    if (holidayType === 'regular') {
      multiplier = multiplierSettings.regularHolidayMultiplier || DOLE_MINIMUM_MULTIPLIERS.REGULAR_HOLIDAY;
    } else {
      multiplier = multiplierSettings.specialHolidayMultiplier || DOLE_MINIMUM_MULTIPLIERS.SPECIAL_HOLIDAY;
    }
  }
  
  // Apply rest day premium
  if (isRestDay && !isHoliday) {
    multiplier = multiplierSettings.restDayMultiplier || DOLE_MINIMUM_MULTIPLIERS.REST_DAY;
  } else if (isRestDay && isHoliday) {
    // Holiday + Rest Day stacking
    if (holidayType === 'regular') {
      multiplier = DOLE_MINIMUM_MULTIPLIERS.REGULAR_HOLIDAY_ON_REST_DAY;
    } else {
      multiplier = DOLE_MINIMUM_MULTIPLIERS.SPECIAL_HOLIDAY_ON_REST_DAY;
    }
  }
  
  // Apply overtime premium
  if (isOvertime) {
    if (isHoliday && holidayType === 'regular') {
      multiplier = isRestDay 
        ? DOLE_MINIMUM_MULTIPLIERS.OVERTIME_ON_REGULAR_HOLIDAY_REST_DAY
        : (multiplierSettings.overtimeOnRegularHolidayMultiplier || DOLE_MINIMUM_MULTIPLIERS.OVERTIME_ON_REGULAR_HOLIDAY);
    } else if (isHoliday && holidayType === 'special') {
      multiplier = isRestDay
        ? DOLE_MINIMUM_MULTIPLIERS.OVERTIME_ON_SPECIAL_HOLIDAY_REST_DAY
        : (multiplierSettings.overtimeOnSpecialHolidayMultiplier || DOLE_MINIMUM_MULTIPLIERS.OVERTIME_ON_SPECIAL_HOLIDAY);
    } else if (isRestDay) {
      multiplier = multiplierSettings.overtimeOnRestDayMultiplier || DOLE_MINIMUM_MULTIPLIERS.OVERTIME_ON_REST_DAY;
    } else {
      // Regular overtime
      multiplier = multiplierSettings.overtimeMultiplier || DOLE_MINIMUM_MULTIPLIERS.OVERTIME_REGULAR;
    }
  }
  
  return multiplier;
}

/**
 * Format multiplier for display with percentage
 * @param {number} multiplier - The multiplier value
 * @returns {string} Formatted string (e.g., "1.25× (125%)")
 */
function formatMultiplier(multiplier) {
  const percentage = Math.round(multiplier * 100);
  return `${multiplier}× (${percentage}%)`;
}

/**
 * Get compliance status badge info
 * @param {number} value - Current multiplier value
 * @param {string} type - Multiplier type
 * @returns {Object} { status: 'compliant'|'above'|'violation', color, message }
 */
function getComplianceStatus(value, type) {
  const minimum = DOLE_MINIMUM_MULTIPLIERS[type];
  
  if (!minimum) return { status: 'unknown', color: 'gray', message: 'Unknown type' };
  
  if (value < minimum) {
    return {
      status: 'violation',
      color: 'red',
      message: `Below DOLE minimum (${minimum}×)`
    };
  }
  
  if (value > minimum) {
    return {
      status: 'above',
      color: 'green',
      message: `Above DOLE minimum (+${((value - minimum) * 100).toFixed(0)}%)`
    };
  }
  
  return {
    status: 'compliant',
    color: 'blue',
    message: 'At DOLE minimum'
  };
}

module.exports = {
  DOLE_MINIMUM_MULTIPLIERS,
  DEFAULT_MULTIPLIERS,
  DEFAULT_DEDUCTION_SETTINGS,
  validateMultiplier,
  validateAllMultipliers,
  getEffectiveMultiplier,
  getEffectiveMultiplierSync,
  formatMultiplier,
  getComplianceStatus
};
