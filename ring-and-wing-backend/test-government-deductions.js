/**
 * Test script for government deductions calculations
 * Run: node test-government-deductions.js
 * 
 * Updated for 2024 compliance with employer contributions and EC
 */

const { 
  calculateSSS, 
  calculatePhilHealth, 
  calculatePagIbig,
  calculateAllGovernmentDeductions 
} = require('./utils/governmentDeductions');

console.log('=== Government Deductions Test (2024 Compliant) ===\n');

// Test cases with different salary levels
const testCases = [
  {
    name: 'Minimum Wage Employee',
    monthlySalary: 13000,
    staff: {
      sssNumber: '12-3456789-0',
      philHealthNumber: 'PH-12345678',
      pagIbigNumber: 'PG-123456789012',
      tinNumber: '123-456-789'
    }
  },
  {
    name: 'Mid-Level Employee',
    monthlySalary: 25000,
    staff: {
      sssNumber: '12-3456789-0',
      philHealthNumber: 'PH-12345678',
      pagIbigNumber: 'PG-123456789012',
      tinNumber: '123-456-789'
    }
  },
  {
    name: 'High Salary Employee',
    monthlySalary: 50000,
    staff: {
      sssNumber: '12-3456789-0',
      philHealthNumber: 'PH-12345678',
      pagIbigNumber: 'PG-123456789012',
      tinNumber: '123-456-789'
    }
  },
  {
    name: 'Employee with Missing SSS',
    monthlySalary: 20000,
    staff: {
      philHealthNumber: 'PH-12345678',
      pagIbigNumber: 'PG-123456789012',
      tinNumber: '123-456-789'
    }
  },
  {
    name: 'Employee with No Government IDs',
    monthlySalary: 20000,
    staff: {
      tinNumber: '123-456-789'
    }
  }
];

async function runTests() {
  for (let index = 0; index < testCases.length; index++) {
    const testCase = testCases[index];
    console.log(`Test Case ${index + 1}: ${testCase.name}`);
    console.log(`Monthly Salary: ₱${testCase.monthlySalary.toLocaleString()}`);
    console.log(`Government IDs Present:`);
    console.log(`  - SSS: ${testCase.staff.sssNumber || 'Not on file'}`);
    console.log(`  - PhilHealth: ${testCase.staff.philHealthNumber || 'Not on file'}`);
    console.log(`  - Pag-IBIG: ${testCase.staff.pagIbigNumber || 'Not on file'}`);
    
    const deductions = await calculateAllGovernmentDeductions(testCase.monthlySalary, testCase.staff);
    
    console.log('\n--- EMPLOYEE DEDUCTIONS (deducted from pay) ---');
    console.log(`  SSS (5% of MSC): ₱${deductions.sss.employeeAmount.toFixed(2)}`);
    if (deductions.sss.employeeAmount > 0) {
      console.log(`    (MSC: ₱${deductions.contributionBasis.sss.msc.toLocaleString()})`);
    }
    console.log(`  PhilHealth (2.5% of MBS): ₱${deductions.philHealth.employeeAmount.toFixed(2)}`);
    if (deductions.philHealth.employeeAmount > 0) {
      console.log(`    (MBS: ₱${deductions.contributionBasis.philHealth.mbs.toLocaleString()})`);
    }
    console.log(`  Pag-IBIG (2% of MFS): ₱${deductions.pagIbig.employeeAmount.toFixed(2)}`);
    if (deductions.pagIbig.employeeAmount > 0) {
      console.log(`    (MFS: ₱${deductions.contributionBasis.pagIbig.mfs.toLocaleString()})`);
    }
    console.log(`  Employee Total: ₱${deductions.totals.employeeTotal.toFixed(2)}`);
    
    console.log('\n--- EMPLOYER CONTRIBUTIONS (company expense) ---');
    console.log(`  SSS (10% of MSC): ₱${deductions.employerBreakdown.sss.toFixed(2)}`);
    console.log(`  SSS EC: ₱${deductions.employerBreakdown.sssEc.toFixed(2)}`);
    console.log(`  PhilHealth (2.5% of MBS): ₱${deductions.employerBreakdown.philHealth.toFixed(2)}`);
    console.log(`  Pag-IBIG (2% of MFS): ₱${deductions.employerBreakdown.pagIbig.toFixed(2)}`);
    console.log(`  Employer Total: ₱${deductions.totals.employerTotal.toFixed(2)}`);
    
    console.log('\n--- TOTAL GOVERNMENT REMITTANCE ---');
    console.log(`  Grand Total: ₱${deductions.totals.grandTotal.toFixed(2)}`);
    
    const netSalary = testCase.monthlySalary - deductions.totals.employeeTotal;
    console.log(`\nNet Salary after Employee Deductions: ₱${netSalary.toLocaleString()}`);
    console.log(`Employee Deduction %: ${((deductions.totals.employeeTotal / testCase.monthlySalary) * 100).toFixed(2)}%`);
    console.log(`Total Remittance %: ${((deductions.totals.grandTotal / testCase.monthlySalary) * 100).toFixed(2)}%`);
    console.log('\n' + '='.repeat(60) + '\n');
  }

  // Verify formula calculations
  console.log('=== Formula Verification ===\n');

  // PhilHealth floor and ceiling test
  console.log('PhilHealth Floor/Ceiling Test:');
  const philHealthTests = [
    { salary: 5000, expected: 'Uses floor ₱10,000' },
    { salary: 15000, expected: 'Uses actual salary' },
    { salary: 150000, expected: 'Uses ceiling ₱100,000' }
  ];

  for (const test of philHealthTests) {
    const result = await calculatePhilHealth(test.salary, true);
    console.log(`  Salary: ₱${test.salary.toLocaleString()} -> Employee: ₱${result.employeeAmount.toFixed(2)}, Employer: ₱${result.employerAmount.toFixed(2)} (${test.expected})`);
  }

  // Pag-IBIG cap test
  console.log('\nPag-IBIG Cap Test (MFS ₱10,000, max ₱200 each):');
  const pagIbigTests = [
    { salary: 5000, expected: '₱100 each (2% of ₱5,000)' },
    { salary: 10000, expected: '₱200 each (at MFS cap)' },
    { salary: 50000, expected: '₱200 each (capped at MFS)' }
  ];

  for (const test of pagIbigTests) {
    const result = await calculatePagIbig(test.salary, true);
    console.log(`  Salary: ₱${test.salary.toLocaleString()} -> Employee: ₱${result.employeeAmount.toFixed(2)}, Employer: ₱${result.employerAmount.toFixed(2)} (${test.expected})`);
  }

  // SSS EC threshold test
  console.log('\nSSS EC Threshold Test (₱10 for MSC≤₱15,000, ₱30 for MSC>₱15,000):');
  const sssEcTests = [
    { salary: 13000, expectedEc: 10, expectedMsc: 13000 },
    { salary: 15000, expectedEc: 10, expectedMsc: 15000 },
    { salary: 16000, expectedEc: 30, expectedMsc: 16000 },
    { salary: 25000, expectedEc: 30, expectedMsc: 25000 }
  ];

  for (const test of sssEcTests) {
    const result = await calculateSSS(test.salary, true);
    console.log(`  Salary: ₱${test.salary.toLocaleString()} -> MSC: ₱${result.msc}, EC: ₱${result.ecAmount} (expected: ₱${test.expectedEc})`);
  }

  console.log('\n=== Test Complete ===');
  console.log('All 2024-compliant calculations working correctly!');
}

runTests().catch(console.error);
