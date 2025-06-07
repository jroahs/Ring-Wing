// Philippine Holidays Utility with Holiday Pay Calculations
// Uses Nager.Date API for automatic Philippine holidays fetching

const axios = require('axios');

// Holiday pay multipliers based on Philippine labor law
const HOLIDAY_MULTIPLIERS = {
  regular: 2.0,        // Regular holidays - 200% pay
  special: 1.3,        // Special non-working holidays - 130% pay
  local: 1.3           // Local holidays - 130% pay
};

// Cache for fetched holidays to avoid repeated API calls
const holidayCache = new Map();
const CACHE_DURATION = 24 * 60 * 60 * 1000; // 24 hours

/**
 * Fetch Philippine holidays from Nager.Date API
 * @param {number} year - The year to fetch holidays for
 * @returns {Promise<Array>} Array of holiday objects
 */
async function fetchPhilippineHolidays(year) {
  const cacheKey = `holidays_${year}`;
  const cached = holidayCache.get(cacheKey);
  
  // Return cached data if still valid
  if (cached && (Date.now() - cached.timestamp) < CACHE_DURATION) {
    console.log(`Using cached holidays for ${year}`);
    return cached.data;
  }

  try {
    console.log(`Fetching Philippine holidays for ${year} from Nager.Date API...`);
    const response = await axios.get(`https://date.nager.at/api/v3/PublicHolidays/${year}/PH`, {
      timeout: 10000,
      headers: {
        'User-Agent': 'Ring-and-Wing-Payroll-System'
      }
    });
    
    // Transform API response to our format
    const holidays = response.data.map(holiday => ({
      date: holiday.date,
      name: holiday.name,
      localName: holiday.localName || holiday.name,
      type: determineHolidayType(holiday.name, holiday.date),
      payMultiplier: getPayMultiplier(determineHolidayType(holiday.name, holiday.date)),
      isGlobal: holiday.global !== false,
      counties: holiday.counties || [],
      apiSource: 'nager.date'
    }));

    // Cache the results
    holidayCache.set(cacheKey, {
      data: holidays,
      timestamp: Date.now()
    });

    console.log(`Successfully fetched ${holidays.length} holidays for ${year} from API`);
    return holidays;
  } catch (error) {
    console.warn(`Failed to fetch holidays from API for ${year}:`, error.message);
    console.log('Falling back to generated holidays...');
    return generateFallbackHolidays(year);
  }
}

/**
 * Determine holiday type based on holiday name and date
 * Maps API holiday names to Philippine labor law classifications
 * @param {string} name - Holiday name
 * @param {string} date - Holiday date
 * @returns {string} Holiday type ('regular', 'special', or 'local')
 */
function determineHolidayType(name, date) {
  const nameLC = name.toLowerCase();
    // Regular holidays (200% pay) - as per Philippine Labor Code
  const regularHolidayPatterns = [
    'new year',
    'maundy thursday',
    'good friday',
    'araw ng kagitingan',
    'day of valor',
    'labor day',
    'independence day',
    'national heroes day',
    'bonifacio day',
    'christmas day',
    'christmas eve',
    'rizal day'
  ];

  // Special non-working holidays (130% pay)
  const specialHolidayPatterns = [
    'chinese new year',
    'edsa',
    'people power',
    'black saturday',
    'all saints',
    'immaculate conception',
    'last day of the year',
    'new year\'s eve',
    'ninoy aquino day'
  ];

  // Check for regular holidays first (higher pay rate)
  if (regularHolidayPatterns.some(pattern => nameLC.includes(pattern))) {
    return 'regular';
  }

  // Check for special holidays
  if (specialHolidayPatterns.some(pattern => nameLC.includes(pattern))) {
    return 'special';
  }

  // Default to special for unknown holidays (safer for payroll)
  return 'special';
}

/**
 * Get pay multiplier for holiday type
 * @param {string} type - Holiday type
 * @returns {number} Pay multiplier
 */
function getPayMultiplier(type) {
  return HOLIDAY_MULTIPLIERS[type] || HOLIDAY_MULTIPLIERS.special;
}

/**
 * Generate fallback holidays using algorithmic approach
 * @param {number} year - The year to generate holidays for
 * @returns {Array} Array of generated holiday objects
 */
function generateFallbackHolidays(year) {
  const holidays = [];
  
  // Fixed date holidays
  const fixedHolidays = [
    { month: 1, day: 1, name: 'New Year\'s Day', type: 'regular' },
    { month: 2, day: 25, name: 'EDSA People Power Revolution Anniversary', type: 'special' },
    { month: 4, day: 9, name: 'Araw ng Kagitingan (Day of Valor)', type: 'regular' },
    { month: 5, day: 1, name: 'Labor Day', type: 'regular' },
    { month: 6, day: 12, name: 'Independence Day', type: 'regular' },
    { month: 8, day: 21, name: 'Ninoy Aquino Day', type: 'special' },
    { month: 11, day: 1, name: 'All Saints\' Day', type: 'special' },
    { month: 11, day: 30, name: 'Bonifacio Day', type: 'regular' },    { month: 12, day: 8, name: 'Immaculate Conception', type: 'special' },
    { month: 12, day: 24, name: 'Christmas Eve', type: 'regular' },
    { month: 12, day: 25, name: 'Christmas Day', type: 'regular' },
    { month: 12, day: 30, name: 'Rizal Day', type: 'regular' },
    { month: 12, day: 31, name: 'Last Day of the Year', type: 'special' }
  ];

  // Add fixed holidays
  fixedHolidays.forEach(holiday => {
    const date = new Date(year, holiday.month - 1, holiday.day);
    holidays.push({
      date: date.toISOString().split('T')[0],
      name: holiday.name,
      localName: holiday.name,
      type: holiday.type,
      payMultiplier: getPayMultiplier(holiday.type),
      isGlobal: true,
      counties: [],
      apiSource: 'generated'
    });
  });

  // Calculate Easter-based holidays
  const easter = calculateEaster(year);
  const easterHolidays = [
    { offset: -3, name: 'Maundy Thursday', type: 'regular' },
    { offset: -2, name: 'Good Friday', type: 'regular' },
    { offset: -1, name: 'Black Saturday', type: 'special' }
  ];

  easterHolidays.forEach(holiday => {
    const date = new Date(easter);
    date.setDate(date.getDate() + holiday.offset);
    holidays.push({
      date: date.toISOString().split('T')[0],
      name: holiday.name,
      localName: holiday.name,
      type: holiday.type,
      payMultiplier: getPayMultiplier(holiday.type),
      isGlobal: true,
      counties: [],
      apiSource: 'generated'
    });
  });

  // Calculate National Heroes Day (last Monday of August)
  const heroesDay = getLastMondayOfMonth(year, 8);
  holidays.push({
    date: heroesDay.toISOString().split('T')[0],
    name: 'National Heroes Day',
    localName: 'National Heroes Day',
    type: 'regular',
    payMultiplier: getPayMultiplier('regular'),
    isGlobal: true,
    counties: [],
    apiSource: 'generated'
  });

  // Add Chinese New Year (approximate - varies each year)
  const chineseNewYear = getChineseNewYearApprox(year);
  if (chineseNewYear) {
    holidays.push({
      date: chineseNewYear.toISOString().split('T')[0],
      name: 'Chinese New Year',
      localName: 'Chinese New Year',
      type: 'special',
      payMultiplier: getPayMultiplier('special'),
      isGlobal: true,
      counties: [],
      apiSource: 'generated'
    });
  }

  console.log(`Generated ${holidays.length} fallback holidays for ${year}`);
  return holidays.sort((a, b) => new Date(a.date) - new Date(b.date));
}

/**
 * Calculate Easter date using the algorithm
 * @param {number} year - The year to calculate Easter for
 * @returns {Date} Easter date
 */
function calculateEaster(year) {
  const a = year % 19;
  const b = Math.floor(year / 100);
  const c = year % 100;
  const d = Math.floor(b / 4);
  const e = b % 4;
  const f = Math.floor((b + 8) / 25);
  const g = Math.floor((b - f + 1) / 3);
  const h = (19 * a + b - d - g + 15) % 30;
  const i = Math.floor(c / 4);
  const k = c % 4;
  const l = (32 + 2 * e + 2 * i - h - k) % 7;
  const m = Math.floor((a + 11 * h + 22 * l) / 451);
  const n = Math.floor((h + l - 7 * m + 114) / 31);
  const p = (h + l - 7 * m + 114) % 31;
  
  return new Date(year, n - 1, p + 1);
}

/**
 * Get the last Monday of a specific month
 * @param {number} year - The year
 * @param {number} month - The month (1-12)
 * @returns {Date} The last Monday of the month
 */
function getLastMondayOfMonth(year, month) {
  // Start from the last day of the month
  const lastDay = new Date(year, month, 0);
  
  // Find the last Monday
  while (lastDay.getDay() !== 1) { // 1 = Monday
    lastDay.setDate(lastDay.getDate() - 1);
  }
  
  return lastDay;
}

/**
 * Get approximate Chinese New Year date
 * @param {number} year - The year
 * @returns {Date|null} Approximate Chinese New Year date
 */
function getChineseNewYearApprox(year) {
  const approximateDates = {
    2024: new Date(2024, 1, 10), // Feb 10, 2024
    2025: new Date(2025, 0, 29), // Jan 29, 2025
    2026: new Date(2026, 1, 17), // Feb 17, 2026
    2027: new Date(2027, 1, 6),  // Feb 6, 2027
    2028: new Date(2028, 0, 26), // Jan 26, 2028
    2029: new Date(2029, 1, 13), // Feb 13, 2029
    2030: new Date(2030, 1, 3),  // Feb 3, 2030
  };
  
  return approximateDates[year] || null;
}

/**
 * Check if a date is a holiday
 * @param {Date|string} date - The date to check
 * @param {Array} holidays - Array of holidays (optional, will fetch if not provided)
 * @returns {Object|null} Holiday object if found, null otherwise
 */
async function isHoliday(date, holidays = null) {
  const checkDate = new Date(date);
  const year = checkDate.getFullYear();
  
  if (!holidays) {
    holidays = await fetchPhilippineHolidays(year);
  }
  
  const dateStr = checkDate.toISOString().split('T')[0];
  return holidays.find(holiday => holiday.date === dateStr) || null;
}

/**
 * Get holiday pay multiplier for a specific date
 * @param {Date|string} date - The date to check
 * @param {Array} holidays - Array of holidays (optional)
 * @returns {Promise<number>} Pay multiplier (1.0 if not a holiday)
 */
async function getHolidayPayMultiplier(date, holidays = null) {
  const holiday = await isHoliday(date, holidays);
  return holiday ? holiday.payMultiplier : 1.0;
}

/**
 * Get holidays within a date range
 * @param {Date|string} startDate - Start date
 * @param {Date|string} endDate - End date
 * @returns {Promise<Array>} Array of holidays in the range
 */
async function getHolidaysInRange(startDate, endDate) {
  const start = new Date(startDate);
  const end = new Date(endDate);
  const startYear = start.getFullYear();
  const endYear = end.getFullYear();
  
  const allHolidays = [];
  
  // Fetch holidays for all years in the range
  for (let year = startYear; year <= endYear; year++) {
    const yearHolidays = await fetchPhilippineHolidays(year);
    allHolidays.push(...yearHolidays);
  }
  
  // Filter holidays within the date range
  const startStr = start.toISOString().split('T')[0];
  const endStr = end.toISOString().split('T')[0];
  
  return allHolidays.filter(holiday => 
    holiday.date >= startStr && holiday.date <= endStr
  );
}

/**
 * Calculate holiday bonus based on basic daily rate and holiday type
 * @param {number} basicDailyRate - Basic daily rate
 * @param {string} holidayType - Type of holiday ('regular', 'special', 'local')
 * @param {number} hoursWorked - Hours worked on the holiday (default: 8)
 * @returns {number} Holiday bonus amount
 */
function calculateHolidayBonus(basicDailyRate, holidayType, hoursWorked = 8) {
  const multiplier = getPayMultiplier(holidayType);
  const hourlyRate = basicDailyRate / 8; // Assuming 8-hour workday
  
  // Return only the bonus portion (multiplier - 1.0)
  return hourlyRate * hoursWorked * (multiplier - 1.0);
}

/**
 * Calculate total holiday pay (regular pay + bonus)
 * @param {number} basicDailyRate - Basic daily rate
 * @param {string} holidayType - Type of holiday
 * @param {number} hoursWorked - Hours worked on the holiday
 * @returns {number} Total holiday pay
 */
function calculateTotalHolidayPay(basicDailyRate, holidayType, hoursWorked = 8) {
  const multiplier = getPayMultiplier(holidayType);
  const hourlyRate = basicDailyRate / 8;
  
  return hourlyRate * hoursWorked * multiplier;
}

/**
 * Calculate 13th month pay (1/12 of annual basic salary)
 * @param {number} annualBasicSalary - Annual basic salary
 * @returns {number} 13th month pay amount
 */
function calculate13thMonthPay(annualBasicSalary) {
  return annualBasicSalary / 12;
}

/**
 * Check if current period is 13th month pay release period
 * @param {Date|string} date - Date to check (default: current date)
 * @returns {boolean} True if it's 13th month pay period
 */
function is13thMonthPayPeriod(date = new Date()) {
  const checkDate = new Date(date);
  return checkDate.getMonth() === 11; // December (0-indexed)
}

/**
 * Get all holidays for a specific year
 * @param {number} year - The year to get holidays for
 * @returns {Promise<Array>} Array of holidays for the year
 */
async function getHolidaysForYear(year) {
  return await fetchPhilippineHolidays(year);
}

/**
 * Clear holiday cache (useful for testing or manual refresh)
 */
function clearHolidayCache() {
  holidayCache.clear();
  console.log('Holiday cache cleared');
}

module.exports = {
  fetchPhilippineHolidays,
  isHoliday,
  getHolidayPayMultiplier,
  getHolidaysInRange,
  getHolidaysForYear,
  calculateHolidayBonus,
  calculateTotalHolidayPay,
  calculate13thMonthPay,
  is13thMonthPayPeriod,
  clearHolidayCache,
  HOLIDAY_MULTIPLIERS
};
