/**
 * Government Configuration Validation Utility
 * Ensures compliance with Philippine government regulations
 * 
 * 2024 Legal Requirements:
 * - SSS: Employee 5%, Employer 10%, EC ₱10/₱30
 * - PhilHealth: Employee 2.5%, Employer 2.5%, MBS floor ₱10,000, ceiling ₱100,000
 * - Pag-IBIG: Employee 2%, Employer 2%, MFS cap ₱10,000, max contribution ₱200
 */

// Legal rate boundaries (these should match official government regulations)
const RATE_LIMITS = {
  sss: {
    employeeRate: { min: 0.01, max: 0.10, default: 0.05 },
    employerRate: { min: 0.01, max: 0.15, default: 0.10 },
    ecLowRate: { min: 0, max: 50, default: 10 },
    ecHighRate: { min: 0, max: 100, default: 30 },
    ecThreshold: { min: 10000, max: 30000, default: 15000 },
    mscMin: { min: 1000, max: 10000, default: 5000 },  // Updated: MSC starts at 5000
    mscMax: { min: 20000, max: 100000, default: 35000 }
  },
  philHealth: {
    employeeRate: { min: 0.01, max: 0.05, default: 0.025 },
    employerRate: { min: 0.01, max: 0.05, default: 0.025 },
    floor: { min: 5000, max: 20000, default: 10000 },
    ceiling: { min: 50000, max: 200000, default: 100000 }
  },
  pagIbig: {
    employeeRate: { min: 0.01, max: 0.05, default: 0.02 },
    employerRate: { min: 0.01, max: 0.05, default: 0.02 },
    maxContribution: { min: 100, max: 500, default: 200 },
    mfsCap: { min: 5000, max: 20000, default: 10000 }
  }
};

// Government ID validation patterns
const ID_PATTERNS = {
  sss: /^\d{2}-\d{7}-\d{1}$/,  // Format: 12-3456789-0
  philHealth: /^(\d{12}|PH-?\d{8,12})$/i,  // 12 digits or PH-prefix
  pagIbig: /^(\d{12}|PG-?\d{12})$/i,  // 12 digits or PG-prefix
  tin: /^\d{3}-?\d{3}-?\d{3}(-?\d{3})?$/  // TIN format
};

/**
 * Validate a single rate value against limits
 */
function validateRate(value, limits, fieldName) {
  const errors = [];
  
  if (value === undefined || value === null) {
    return { valid: true, value: limits.default }; // Use default
  }
  
  const numValue = Number(value);
  
  if (isNaN(numValue)) {
    errors.push(`${fieldName} must be a valid number`);
    return { valid: false, errors, value: limits.default };
  }
  
  if (numValue < limits.min) {
    errors.push(`${fieldName} cannot be less than ${limits.min * 100}%`);
  }
  
  if (numValue > limits.max) {
    errors.push(`${fieldName} cannot exceed ${limits.max * 100}%`);
  }
  
  return {
    valid: errors.length === 0,
    errors,
    value: errors.length === 0 ? numValue : limits.default
  };
}

/**
 * Validate SSS configuration
 */
function validateSSSConfig(sss) {
  const errors = [];
  const warnings = [];
  const validated = {};
  
  // Employee rate
  const empRate = validateRate(sss?.employeeRate, RATE_LIMITS.sss.employeeRate, 'SSS Employee Rate');
  if (!empRate.valid) errors.push(...empRate.errors);
  validated.employeeRate = empRate.value;
  
  // Employer rate
  const emplrRate = validateRate(sss?.employerRate, RATE_LIMITS.sss.employerRate, 'SSS Employer Rate');
  if (!emplrRate.valid) errors.push(...emplrRate.errors);
  validated.employerRate = emplrRate.value;
  
  // EC configuration
  validated.ec = {
    threshold: sss?.ec?.threshold || RATE_LIMITS.sss.ecThreshold.default,
    lowRate: sss?.ec?.lowRate || RATE_LIMITS.sss.ecLowRate.default,
    highRate: sss?.ec?.highRate || RATE_LIMITS.sss.ecHighRate.default
  };
  
  // Validate EC threshold
  if (validated.ec.threshold < RATE_LIMITS.sss.ecThreshold.min || 
      validated.ec.threshold > RATE_LIMITS.sss.ecThreshold.max) {
    warnings.push(`EC threshold ${validated.ec.threshold} is outside normal range`);
  }
  
  // MSC Brackets validation
  if (!sss?.mscBrackets || !Array.isArray(sss.mscBrackets) || sss.mscBrackets.length === 0) {
    errors.push('SSS MSC brackets are required');
    validated.mscBrackets = [];
  } else {
    validated.mscBrackets = [];
    let prevMax = -1;
    
    for (let i = 0; i < sss.mscBrackets.length; i++) {
      const bracket = sss.mscBrackets[i];
      
      if (bracket.min === undefined || bracket.max === undefined || bracket.msc === undefined) {
        errors.push(`SSS bracket ${i + 1}: min, max, and msc are required`);
        continue;
      }
      
      // Handle Infinity or large max values for the final bracket
      const isUnboundedMax = bracket.max === Infinity || bracket.max >= 9999999;
      
      if (bracket.min >= bracket.max && !isUnboundedMax) {
        errors.push(`SSS bracket ${i + 1}: min must be less than max`);
        continue;
      }
      
      if (bracket.msc <= 0) {
        errors.push(`SSS bracket ${i + 1}: MSC must be greater than 0`);
        continue;
      }
      
      // Check for gaps in coverage
      if (i > 0 && bracket.min > prevMax + 1) {
        warnings.push(`SSS brackets have gap between ${prevMax} and ${bracket.min}`);
      }
      
      validated.mscBrackets.push({
        min: Number(bracket.min),
        // Use large number for MongoDB instead of Infinity
        max: isUnboundedMax ? 9999999.99 : Number(bracket.max),
        msc: Number(bracket.msc),
        employeeContribution: Number((bracket.msc * validated.employeeRate).toFixed(2)),
        employerContribution: Number((bracket.msc * validated.employerRate).toFixed(2)),
        ecContribution: bracket.msc <= validated.ec.threshold ? validated.ec.lowRate : validated.ec.highRate
      });
      
      prevMax = bracket.max;
    }
    
    // Sort brackets by min salary
    validated.mscBrackets.sort((a, b) => a.min - b.min);
  }
  
  validated.description = sss?.description || 'Social Security System';
  
  return { validated, errors, warnings };
}

/**
 * Validate PhilHealth configuration
 */
function validatePhilHealthConfig(philHealth) {
  const errors = [];
  const warnings = [];
  const validated = {};
  
  // Employee rate
  const empRate = validateRate(philHealth?.employeeRate, RATE_LIMITS.philHealth.employeeRate, 'PhilHealth Employee Rate');
  if (!empRate.valid) errors.push(...empRate.errors);
  validated.employeeRate = empRate.value;
  
  // Employer rate
  const emplrRate = validateRate(philHealth?.employerRate, RATE_LIMITS.philHealth.employerRate, 'PhilHealth Employer Rate');
  if (!emplrRate.valid) errors.push(...emplrRate.errors);
  validated.employerRate = emplrRate.value;
  
  // Floor
  validated.floor = Number(philHealth?.floor) || RATE_LIMITS.philHealth.floor.default;
  if (validated.floor < RATE_LIMITS.philHealth.floor.min || validated.floor > RATE_LIMITS.philHealth.floor.max) {
    warnings.push(`PhilHealth floor ${validated.floor} is outside normal range`);
  }
  
  // Ceiling
  validated.ceiling = Number(philHealth?.ceiling) || RATE_LIMITS.philHealth.ceiling.default;
  if (validated.ceiling < RATE_LIMITS.philHealth.ceiling.min || validated.ceiling > RATE_LIMITS.philHealth.ceiling.max) {
    warnings.push(`PhilHealth ceiling ${validated.ceiling} is outside normal range`);
  }
  
  // Floor must be less than ceiling
  if (validated.floor >= validated.ceiling) {
    errors.push('PhilHealth floor must be less than ceiling');
  }
  
  validated.description = philHealth?.description || 'Philippine Health Insurance';
  
  return { validated, errors, warnings };
}

/**
 * Validate Pag-IBIG configuration
 */
function validatePagIbigConfig(pagIbig) {
  const errors = [];
  const warnings = [];
  const validated = {};
  
  // Employee rate
  const empRate = validateRate(pagIbig?.employeeRate, RATE_LIMITS.pagIbig.employeeRate, 'Pag-IBIG Employee Rate');
  if (!empRate.valid) errors.push(...empRate.errors);
  validated.employeeRate = empRate.value;
  
  // Employer rate
  const emplrRate = validateRate(pagIbig?.employerRate, RATE_LIMITS.pagIbig.employerRate, 'Pag-IBIG Employer Rate');
  if (!emplrRate.valid) errors.push(...emplrRate.errors);
  validated.employerRate = emplrRate.value;
  
  // Max contribution
  validated.maxContribution = Number(pagIbig?.maxContribution) || RATE_LIMITS.pagIbig.maxContribution.default;
  if (validated.maxContribution < RATE_LIMITS.pagIbig.maxContribution.min || 
      validated.maxContribution > RATE_LIMITS.pagIbig.maxContribution.max) {
    warnings.push(`Pag-IBIG max contribution ${validated.maxContribution} is outside normal range`);
  }
  
  // MFS Cap
  validated.mfsCap = Number(pagIbig?.mfsCap) || RATE_LIMITS.pagIbig.mfsCap.default;
  if (validated.mfsCap < RATE_LIMITS.pagIbig.mfsCap.min || validated.mfsCap > RATE_LIMITS.pagIbig.mfsCap.max) {
    warnings.push(`Pag-IBIG MFS cap ${validated.mfsCap} is outside normal range`);
  }
  
  validated.description = pagIbig?.description || 'Home Development Mutual Fund';
  
  return { validated, errors, warnings };
}

/**
 * Validate full government configuration
 */
function validateGovernmentConfig(config) {
  const allErrors = [];
  const allWarnings = [];
  const validatedConfig = {};
  
  // Year validation
  const currentYear = new Date().getFullYear();
  if (!config.year || config.year < 2020 || config.year > currentYear + 2) {
    allErrors.push(`Year must be between 2020 and ${currentYear + 2}`);
  }
  validatedConfig.year = config.year || currentYear;
  
  // Effective date
  if (config.effectiveDate) {
    const effectiveDate = new Date(config.effectiveDate);
    if (isNaN(effectiveDate.getTime())) {
      allErrors.push('Invalid effective date');
    }
    validatedConfig.effectiveDate = effectiveDate;
  } else {
    validatedConfig.effectiveDate = new Date();
  }
  
  // SSS validation
  const sssResult = validateSSSConfig(config.sss);
  allErrors.push(...sssResult.errors);
  allWarnings.push(...sssResult.warnings);
  validatedConfig.sss = sssResult.validated;
  
  // PhilHealth validation
  const philHealthResult = validatePhilHealthConfig(config.philHealth);
  allErrors.push(...philHealthResult.errors);
  allWarnings.push(...philHealthResult.warnings);
  validatedConfig.philHealth = philHealthResult.validated;
  
  // Pag-IBIG validation
  const pagIbigResult = validatePagIbigConfig(config.pagIbig);
  allErrors.push(...pagIbigResult.errors);
  allWarnings.push(...pagIbigResult.warnings);
  validatedConfig.pagIbig = pagIbigResult.validated;
  
  // Notes
  validatedConfig.notes = config.notes || '';
  
  return {
    valid: allErrors.length === 0,
    errors: allErrors,
    warnings: allWarnings,
    config: validatedConfig
  };
}

/**
 * Validate government ID format
 */
function validateGovernmentId(type, value) {
  if (!value || !value.trim()) {
    return { valid: true, value: null, message: 'No ID provided' };
  }
  
  const cleanValue = value.trim().toUpperCase();
  const pattern = ID_PATTERNS[type];
  
  if (!pattern) {
    return { valid: false, message: `Unknown ID type: ${type}` };
  }
  
  if (!pattern.test(cleanValue)) {
    return { 
      valid: false, 
      message: `Invalid ${type.toUpperCase()} format. Expected format: ${getExpectedFormat(type)}` 
    };
  }
  
  return { valid: true, value: cleanValue };
}

/**
 * Get expected format description for ID type
 */
function getExpectedFormat(type) {
  const formats = {
    sss: '12-3456789-0 (XX-XXXXXXX-X)',
    philHealth: '123456789012 (12 digits) or PH-12345678',
    pagIbig: '123456789012 (12 digits) or PG-123456789012',
    tin: '123-456-789 or 123-456-789-000'
  };
  return formats[type] || 'Unknown format';
}

/**
 * Validate staff government IDs
 */
function validateStaffGovernmentIds(staff) {
  const results = {};
  const errors = [];
  
  if (staff.sssNumber) {
    const sssResult = validateGovernmentId('sss', staff.sssNumber);
    results.sss = sssResult;
    if (!sssResult.valid) errors.push(sssResult.message);
  }
  
  if (staff.philHealthNumber) {
    const phResult = validateGovernmentId('philHealth', staff.philHealthNumber);
    results.philHealth = phResult;
    if (!phResult.valid) errors.push(phResult.message);
  }
  
  if (staff.pagIbigNumber) {
    const piResult = validateGovernmentId('pagIbig', staff.pagIbigNumber);
    results.pagIbig = piResult;
    if (!piResult.valid) errors.push(piResult.message);
  }
  
  if (staff.tinNumber) {
    const tinResult = validateGovernmentId('tin', staff.tinNumber);
    results.tin = tinResult;
    if (!tinResult.valid) errors.push(tinResult.message);
  }
  
  return {
    valid: errors.length === 0,
    errors,
    results
  };
}

/**
 * Express middleware for validating government config requests
 */
function validateConfigMiddleware(req, res, next) {
  const result = validateGovernmentConfig(req.body);
  
  if (!result.valid) {
    return res.status(400).json({
      success: false,
      message: 'Validation failed',
      errors: result.errors,
      warnings: result.warnings
    });
  }
  
  // Attach validated config to request
  req.validatedConfig = result.config;
  req.validationWarnings = result.warnings;
  
  next();
}

/**
 * Get default 2024 compliant configuration
 */
function getDefault2024Config() {
  return {
    year: 2024,
    effectiveDate: new Date('2024-01-01'),
    sss: {
      employeeRate: 0.05,
      employerRate: 0.10,
      ec: {
        threshold: 15000,
        lowRate: 10,
        highRate: 30
      },
      mscBrackets: generateDefaultMSCBrackets(),
      description: 'Social Security System - 2024 Rates'
    },
    philHealth: {
      employeeRate: 0.025,
      employerRate: 0.025,
      floor: 10000,
      ceiling: 100000,
      description: 'Philippine Health Insurance - 2024 Rates'
    },
    pagIbig: {
      employeeRate: 0.02,
      employerRate: 0.02,
      maxContribution: 200,
      mfsCap: 10000,
      description: 'Home Development Mutual Fund - 2024 Rates'
    },
    notes: 'Default 2024 compliant configuration',
    isActive: true
  };
}

/**
 * Generate default MSC brackets for 2024
 * Based on official SSS Circular No. 2023-033
 * MSC starts at ₱5,000 (minimum) and goes up to ₱35,000 (maximum)
 */
function generateDefaultMSCBrackets() {
  const brackets = [];
  const employeeRate = 0.05;
  const employerRate = 0.10;
  const ecThreshold = 15000;
  
  // First bracket: 0 - 4,999 maps to MSC 5,000
  brackets.push({
    min: 0, max: 4999.99, msc: 5000,
    employeeContribution: Number((5000 * employeeRate).toFixed(2)),
    employerContribution: Number((5000 * employerRate).toFixed(2)),
    ecContribution: 10
  });
  
  // Second bracket: 5,000 - 5,249 also maps to MSC 5,000
  brackets.push({
    min: 5000, max: 5249.99, msc: 5000,
    employeeContribution: Number((5000 * employeeRate).toFixed(2)),
    employerContribution: Number((5000 * employerRate).toFixed(2)),
    ecContribution: 10
  });
  
  // Standard brackets from 5,500 to 35,000 (500 increments)
  for (let msc = 5500; msc <= 35000; msc += 500) {
    const min = msc - 250;
    // Use large number for MongoDB instead of Infinity
    const max = msc === 35000 ? 9999999.99 : msc + 249.99;
    const ec = msc <= ecThreshold ? 10 : 30;
    
    brackets.push({
      min: min,
      max: max,
      msc: msc,
      employeeContribution: Number((msc * employeeRate).toFixed(2)),
      employerContribution: Number((msc * employerRate).toFixed(2)),
      ecContribution: ec
    });
  }
  
  return brackets;
}

module.exports = {
  validateGovernmentConfig,
  validateSSSConfig,
  validatePhilHealthConfig,
  validatePagIbigConfig,
  validateGovernmentId,
  validateStaffGovernmentIds,
  validateConfigMiddleware,
  getDefault2024Config,
  generateDefaultMSCBrackets,
  RATE_LIMITS,
  ID_PATTERNS
};
