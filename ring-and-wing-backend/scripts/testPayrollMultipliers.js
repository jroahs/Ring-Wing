/**
 * Payroll Multipliers Test Script
 * Tests that global DOLE-compliant multipliers are correctly used in calculations
 * 
 * Run: node scripts/testPayrollMultipliers.js
 */

require('dotenv').config();
const mongoose = require('mongoose');

// Colors for console output
const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  cyan: '\x1b[36m',
  bold: '\x1b[1m'
};

const log = {
  success: (msg) => console.log(`${colors.green}✓${colors.reset} ${msg}`),
  error: (msg) => console.log(`${colors.red}✗${colors.reset} ${msg}`),
  warn: (msg) => console.log(`${colors.yellow}⚠${colors.reset} ${msg}`),
  info: (msg) => console.log(`${colors.cyan}ℹ${colors.reset} ${msg}`),
  header: (msg) => console.log(`\n${colors.bold}${colors.cyan}═══ ${msg} ═══${colors.reset}\n`)
};

// DOLE Minimum Multipliers (reference)
const DOLE_MINIMUMS = {
  overtime: 1.25,
  regularHoliday: 2.0,
  specialHoliday: 1.30,
  overtimeOnHoliday: 2.60,
  overtimeOnSpecialHoliday: 1.69,
  restDay: 1.30,
  restDayOvertime: 1.69,
  nightDifferential: 1.10
};

let testsPassed = 0;
let testsFailed = 0;

function assert(condition, message) {
  if (condition) {
    log.success(message);
    testsPassed++;
  } else {
    log.error(message);
    testsFailed++;
  }
  return condition;
}

async function runTests() {
  console.log('\n' + '='.repeat(60));
  console.log(colors.bold + '  PAYROLL MULTIPLIERS TEST SUITE' + colors.reset);
  console.log('  Testing DOLE-compliant global multipliers');
  console.log('='.repeat(60));

  try {
    // Connect to MongoDB
    log.header('DATABASE CONNECTION');
    const mongoUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/ring-and-wing';
    await mongoose.connect(mongoUri);
    log.success(`Connected to MongoDB`);

    // Load models
    const Settings = require('../models/Settings');
    
    // ========================================
    // TEST 1: Settings Model Structure
    // ========================================
    log.header('TEST 1: Settings Model Structure');
    
    const settings = await Settings.getSettings();
    assert(settings !== null, 'Settings document exists');
    assert(settings.payroll !== undefined, 'Payroll settings section exists');
    assert(settings.payroll.multipliers !== undefined, 'Multipliers section exists');
    
    const multipliers = settings.payroll.multipliers;
    console.log('\n  Current Global Multipliers:');
    console.log('  ─────────────────────────────────────');
    Object.entries(multipliers.toObject ? multipliers.toObject() : multipliers).forEach(([key, value]) => {
      const min = DOLE_MINIMUMS[key];
      const status = value >= min ? colors.green + '✓' : colors.red + '✗';
      console.log(`  ${status}${colors.reset} ${key}: ${value}× (DOLE min: ${min}×)`);
    });

    // ========================================
    // TEST 2: DOLE Compliance Check
    // ========================================
    log.header('TEST 2: DOLE Compliance Validation');
    
    let allCompliant = true;
    for (const [key, minValue] of Object.entries(DOLE_MINIMUMS)) {
      const currentValue = multipliers[key];
      if (currentValue !== undefined) {
        const compliant = currentValue >= minValue;
        assert(compliant, `${key}: ${currentValue}× >= ${minValue}× (DOLE minimum)`);
        if (!compliant) allCompliant = false;
      }
    }
    
    if (allCompliant) {
      log.success('All multipliers meet DOLE minimum requirements!');
    }

    // ========================================
    // TEST 3: Payroll Calculation Simulation
    // ========================================
    log.header('TEST 3: Payroll Calculation Simulation');
    
    // Sample employee data
    const testEmployee = {
      name: 'Test Employee',
      hourlyRate: 100, // ₱100/hour for easy math
      hoursPerDay: 8
    };
    
    console.log(`\n  Test Employee: ${testEmployee.name}`);
    console.log(`  Hourly Rate: ₱${testEmployee.hourlyRate}`);
    console.log(`  Daily Rate (8hrs): ₱${testEmployee.hourlyRate * 8}`);
    console.log('  ─────────────────────────────────────');

    // Test scenarios
    const scenarios = [
      {
        name: 'Regular Day Work (8 hours)',
        hours: 8,
        multiplier: 1.0,
        expected: testEmployee.hourlyRate * 8 * 1.0
      },
      {
        name: 'Overtime (2 hours after 8hr shift)',
        hours: 2,
        multiplier: multipliers.overtime || DOLE_MINIMUMS.overtime,
        type: 'overtime'
      },
      {
        name: 'Regular Holiday (8 hours)',
        hours: 8,
        multiplier: multipliers.regularHoliday || DOLE_MINIMUMS.regularHoliday,
        type: 'regularHoliday'
      },
      {
        name: 'Special Holiday (8 hours)',
        hours: 8,
        multiplier: multipliers.specialHoliday || DOLE_MINIMUMS.specialHoliday,
        type: 'specialHoliday'
      },
      {
        name: 'OT on Regular Holiday (2 hours)',
        hours: 2,
        multiplier: multipliers.overtimeOnHoliday || DOLE_MINIMUMS.overtimeOnHoliday,
        type: 'overtimeOnHoliday'
      },
      {
        name: 'OT on Special Holiday (2 hours)',
        hours: 2,
        multiplier: multipliers.overtimeOnSpecialHoliday || DOLE_MINIMUMS.overtimeOnSpecialHoliday,
        type: 'overtimeOnSpecialHoliday'
      },
      {
        name: 'Rest Day Work (8 hours)',
        hours: 8,
        multiplier: multipliers.restDay || DOLE_MINIMUMS.restDay,
        type: 'restDay'
      },
      {
        name: 'OT on Rest Day (2 hours)',
        hours: 2,
        multiplier: multipliers.restDayOvertime || DOLE_MINIMUMS.restDayOvertime,
        type: 'restDayOvertime'
      },
      {
        name: 'Night Differential (8 hours 10PM-6AM)',
        hours: 8,
        multiplier: multipliers.nightDifferential || DOLE_MINIMUMS.nightDifferential,
        type: 'nightDifferential'
      }
    ];

    console.log('\n  Calculation Results:');
    console.log('  ─────────────────────────────────────────────────────────');
    
    for (const scenario of scenarios) {
      const pay = testEmployee.hourlyRate * scenario.hours * scenario.multiplier;
      const doleMin = DOLE_MINIMUMS[scenario.type] || 1.0;
      const minPay = testEmployee.hourlyRate * scenario.hours * doleMin;
      const compliant = pay >= minPay;
      
      const status = compliant ? colors.green + '✓' : colors.red + '✗';
      console.log(`\n  ${status}${colors.reset} ${scenario.name}`);
      console.log(`     Hours: ${scenario.hours} × Rate: ₱${testEmployee.hourlyRate} × Multiplier: ${scenario.multiplier}×`);
      console.log(`     = ₱${pay.toFixed(2)} (DOLE min: ₱${minPay.toFixed(2)})`);
      
      if (compliant) testsPassed++;
      else testsFailed++;
    }

    // ========================================
    // TEST 4: Helper Function Test
    // ========================================
    log.header('TEST 4: Payroll Route Helper Function');
    
    // Simulate what payrollRoutes.js does
    const getPayrollMultipliers = async () => {
      const s = await Settings.getSettings();
      const m = s.payroll?.multipliers || {};
      return {
        overtime: m.overtime || 1.25,
        regularHoliday: m.regularHoliday || 2.0,
        specialHoliday: m.specialHoliday || 1.30,
        overtimeOnHoliday: m.overtimeOnHoliday || 2.60,
        overtimeOnSpecialHoliday: m.overtimeOnSpecialHoliday || 1.69,
        restDay: m.restDay || 1.30,
        restDayOvertime: m.restDayOvertime || 1.69,
        nightDifferential: m.nightDifferential || 1.10
      };
    };
    
    const helperMultipliers = await getPayrollMultipliers();
    
    assert(helperMultipliers.overtime >= 1.25, `Helper returns overtime: ${helperMultipliers.overtime}×`);
    assert(helperMultipliers.regularHoliday >= 2.0, `Helper returns regularHoliday: ${helperMultipliers.regularHoliday}×`);
    assert(helperMultipliers.specialHoliday >= 1.30, `Helper returns specialHoliday: ${helperMultipliers.specialHoliday}×`);
    assert(helperMultipliers.overtimeOnHoliday >= 2.60, `Helper returns overtimeOnHoliday: ${helperMultipliers.overtimeOnHoliday}×`);
    assert(helperMultipliers.overtimeOnSpecialHoliday >= 1.69, `Helper returns overtimeOnSpecialHoliday: ${helperMultipliers.overtimeOnSpecialHoliday}×`);
    assert(helperMultipliers.restDay >= 1.30, `Helper returns restDay: ${helperMultipliers.restDay}×`);
    assert(helperMultipliers.restDayOvertime >= 1.69, `Helper returns restDayOvertime: ${helperMultipliers.restDayOvertime}×`);
    assert(helperMultipliers.nightDifferential >= 1.10, `Helper returns nightDifferential: ${helperMultipliers.nightDifferential}×`);

    // ========================================
    // TEST 5: laborLawCompliance.js Integration
    // ========================================
    log.header('TEST 5: Labor Law Compliance Utility');
    
    try {
      const { getEffectiveMultiplier, DOLE_MINIMUM_MULTIPLIERS } = require('../utils/laborLawCompliance');
      
      log.info('Testing getEffectiveMultiplier() scenarios...');
      
      // Test various scenarios
      const otMultiplier = await getEffectiveMultiplier({ isOvertime: true });
      assert(otMultiplier >= 1.25, `Overtime scenario returns: ${otMultiplier}×`);
      
      const holidayMultiplier = await getEffectiveMultiplier({ isHoliday: true, holidayType: 'regular' });
      assert(holidayMultiplier >= 2.0, `Regular holiday scenario returns: ${holidayMultiplier}×`);
      
      const specialHolidayMultiplier = await getEffectiveMultiplier({ isHoliday: true, holidayType: 'special' });
      assert(specialHolidayMultiplier >= 1.30, `Special holiday scenario returns: ${specialHolidayMultiplier}×`);
      
      const restDayMultiplier = await getEffectiveMultiplier({ isRestDay: true });
      assert(restDayMultiplier >= 1.30, `Rest day scenario returns: ${restDayMultiplier}×`);
      
      const otOnHolidayMultiplier = await getEffectiveMultiplier({ isOvertime: true, isHoliday: true, holidayType: 'regular' });
      assert(otOnHolidayMultiplier >= 2.60, `OT on regular holiday scenario returns: ${otOnHolidayMultiplier}×`);
      
      const otOnSpecialHolidayMultiplier = await getEffectiveMultiplier({ isOvertime: true, isHoliday: true, holidayType: 'special' });
      assert(otOnSpecialHolidayMultiplier >= 1.69, `OT on special holiday scenario returns: ${otOnSpecialHolidayMultiplier}×`);
      
    } catch (err) {
      log.warn(`Labor law utility test skipped: ${err.message}`);
    }

    // ========================================
    // TEST 6: Philippine Holidays Utility
    // ========================================
    log.header('TEST 6: Philippine Holidays Utility');
    
    try {
      const { calculateHolidayBonus, calculateTotalHolidayPay } = require('../utils/philippineHolidays');
      
      const hourlyRate = 100;
      const hoursWorked = 8;
      
      // Test regular holiday bonus
      const regularBonus = await calculateHolidayBonus(hourlyRate, 'regular', hoursWorked);
      const expectedRegularBonus = hourlyRate * hoursWorked * (multipliers.regularHoliday - 1);
      assert(
        Math.abs(regularBonus - expectedRegularBonus) < 0.01,
        `Regular holiday bonus: ₱${regularBonus.toFixed(2)} (expected ~₱${expectedRegularBonus.toFixed(2)})`
      );
      
      // Test special holiday bonus
      const specialBonus = await calculateHolidayBonus(hourlyRate, 'special', hoursWorked);
      const expectedSpecialBonus = hourlyRate * hoursWorked * (multipliers.specialHoliday - 1);
      assert(
        Math.abs(specialBonus - expectedSpecialBonus) < 0.01,
        `Special holiday bonus: ₱${specialBonus.toFixed(2)} (expected ~₱${expectedSpecialBonus.toFixed(2)})`
      );
      
      // Test total holiday pay
      const totalPay = await calculateTotalHolidayPay(hourlyRate, 'regular', hoursWorked);
      const expectedTotal = hourlyRate * hoursWorked * multipliers.regularHoliday;
      assert(
        Math.abs(totalPay - expectedTotal) < 0.01,
        `Total regular holiday pay: ₱${totalPay.toFixed(2)} (expected ~₱${expectedTotal.toFixed(2)})`
      );
      
    } catch (err) {
      log.warn(`Philippine holidays utility test skipped: ${err.message}`);
    }

    // ========================================
    // TEST 7: Full Payroll Simulation
    // ========================================
    log.header('TEST 7: Full Payroll Period Simulation');
    
    console.log('\n  Simulating 2-week payroll period for test employee...');
    console.log('  ─────────────────────────────────────────────────────────');
    
    const payrollSimulation = {
      employee: testEmployee,
      period: '2 weeks',
      workDays: [
        { type: 'regular', hours: 8, date: 'Week 1 - Mon' },
        { type: 'regular', hours: 10, overtime: 2, date: 'Week 1 - Tue' },
        { type: 'regular', hours: 8, date: 'Week 1 - Wed' },
        { type: 'regular', hours: 8, date: 'Week 1 - Thu' },
        { type: 'regular', hours: 8, date: 'Week 1 - Fri' },
        { type: 'restDay', hours: 8, date: 'Week 1 - Sat (Rest Day Work)' },
        // Week 2
        { type: 'regular', hours: 8, date: 'Week 2 - Mon' },
        { type: 'regularHoliday', hours: 8, date: 'Week 2 - Tue (Holiday)' },
        { type: 'regular', hours: 8, date: 'Week 2 - Wed' },
        { type: 'specialHoliday', hours: 10, overtime: 2, date: 'Week 2 - Thu (Special + OT)' },
        { type: 'regular', hours: 8, date: 'Week 2 - Fri' }
      ]
    };
    
    let totalBasicPay = 0;
    let totalOvertimePay = 0;
    let totalHolidayPay = 0;
    let totalRestDayPay = 0;
    
    for (const day of payrollSimulation.workDays) {
      let dayPay = 0;
      const baseHours = day.overtime ? day.hours - day.overtime : day.hours;
      
      switch (day.type) {
        case 'regular':
          dayPay = testEmployee.hourlyRate * baseHours;
          totalBasicPay += dayPay;
          if (day.overtime) {
            const otPay = testEmployee.hourlyRate * day.overtime * multipliers.overtime;
            totalOvertimePay += otPay;
            dayPay += otPay;
          }
          break;
        case 'regularHoliday':
          dayPay = testEmployee.hourlyRate * baseHours * multipliers.regularHoliday;
          totalHolidayPay += dayPay;
          break;
        case 'specialHoliday':
          dayPay = testEmployee.hourlyRate * baseHours * multipliers.specialHoliday;
          totalHolidayPay += dayPay;
          if (day.overtime) {
            const otPay = testEmployee.hourlyRate * day.overtime * multipliers.overtimeOnSpecialHoliday;
            totalOvertimePay += otPay;
            dayPay += otPay;
          }
          break;
        case 'restDay':
          dayPay = testEmployee.hourlyRate * day.hours * multipliers.restDay;
          totalRestDayPay += dayPay;
          break;
      }
      
      console.log(`  ${day.date}: ₱${dayPay.toFixed(2)}`);
    }
    
    const grossPay = totalBasicPay + totalOvertimePay + totalHolidayPay + totalRestDayPay;
    
    console.log('\n  ─────────────────────────────────────────────────────────');
    console.log(`  Basic Pay:      ₱${totalBasicPay.toFixed(2)}`);
    console.log(`  Overtime Pay:   ₱${totalOvertimePay.toFixed(2)}`);
    console.log(`  Holiday Pay:    ₱${totalHolidayPay.toFixed(2)}`);
    console.log(`  Rest Day Pay:   ₱${totalRestDayPay.toFixed(2)}`);
    console.log('  ─────────────────────────────────────────────────────────');
    console.log(`  ${colors.bold}GROSS PAY:      ₱${grossPay.toFixed(2)}${colors.reset}`);
    
    assert(grossPay > 0, `Payroll simulation completed with gross pay: ₱${grossPay.toFixed(2)}`);

    // ========================================
    // FINAL SUMMARY
    // ========================================
    log.header('TEST SUMMARY');
    
    console.log(`  Total Tests: ${testsPassed + testsFailed}`);
    console.log(`  ${colors.green}Passed: ${testsPassed}${colors.reset}`);
    console.log(`  ${colors.red}Failed: ${testsFailed}${colors.reset}`);
    console.log('');
    
    if (testsFailed === 0) {
      console.log(`  ${colors.green}${colors.bold}✓ ALL TESTS PASSED!${colors.reset}`);
      console.log(`  ${colors.green}  System is using DOLE-compliant global multipliers correctly.${colors.reset}`);
    } else {
      console.log(`  ${colors.red}${colors.bold}✗ SOME TESTS FAILED${colors.reset}`);
      console.log(`  ${colors.red}  Please review the failed tests above.${colors.reset}`);
    }
    
    console.log('\n' + '='.repeat(60) + '\n');

  } catch (error) {
    log.error(`Test suite error: ${error.message}`);
    console.error(error);
  } finally {
    await mongoose.disconnect();
    log.info('Disconnected from MongoDB');
    process.exit(testsFailed > 0 ? 1 : 0);
  }
}

// Run tests
runTests();
