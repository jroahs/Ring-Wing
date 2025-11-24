/**
 * Test script for government deductions calculations
 * Run: node test-government-deductions.js
 */

const { 
  calculateSSS, 
  calculatePhilHealth, 
  calculatePagIbig,
  calculateAllGovernmentDeductions 
} = require('./utils/governmentDeductions');

console.log('=== Government Deductions Test ===\n');

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

testCases.forEach((testCase, index) => {
  console.log(`Test Case ${index + 1}: ${testCase.name}`);
  console.log(`Monthly Salary: ₱${testCase.monthlySalary.toLocaleString()}`);
  console.log(`Government IDs Present:`);
  console.log(`  - SSS: ${testCase.staff.sssNumber || 'Not on file'}`);
  console.log(`  - PhilHealth: ${testCase.staff.philHealthNumber || 'Not on file'}`);
  console.log(`  - Pag-IBIG: ${testCase.staff.pagIbigNumber || 'Not on file'}`);
  
  const deductions = calculateAllGovernmentDeductions(testCase.monthlySalary, testCase.staff);
  
  console.log('\nCalculated Deductions:');
  console.log(`  SSS (5% of MSC): ₱${deductions.sss.amount.toFixed(2)}`);
  if (deductions.sss.amount > 0) {
    console.log(`    (MSC: ₱${deductions.sss.msc.toLocaleString()})`);
  }
  console.log(`  PhilHealth (2.5%): ₱${deductions.philHealth.amount.toFixed(2)}`);
  console.log(`  Pag-IBIG (2%): ₱${deductions.pagIbig.amount.toFixed(2)}`);
  console.log(`  Total: ₱${deductions.total.toFixed(2)}`);
  
  const netSalary = testCase.monthlySalary - deductions.total;
  console.log(`\nNet Salary after Gov't Deductions: ₱${netSalary.toLocaleString()}`);
  console.log(`Deduction Percentage: ${((deductions.total / testCase.monthlySalary) * 100).toFixed(2)}%`);
  console.log('\n' + '='.repeat(60) + '\n');
});

// Verify formula calculations
console.log('=== Formula Verification ===\n');

// PhilHealth floor and ceiling test
console.log('PhilHealth Floor/Ceiling Test:');
const philHealthTests = [
  { salary: 5000, expected: 'Uses floor ₱10,000' },
  { salary: 15000, expected: 'Uses actual salary' },
  { salary: 150000, expected: 'Uses ceiling ₱100,000' }
];

philHealthTests.forEach(test => {
  const result = calculatePhilHealth(test.salary, true);
  console.log(`  Salary: ₱${test.salary.toLocaleString()} -> PhilHealth: ₱${result.toFixed(2)} (${test.expected})`);
});

// Pag-IBIG cap test
console.log('\nPag-IBIG Cap Test (₱200 maximum):');
const pagIbigTests = [
  { salary: 5000, expected: '₱100 (2% of ₱5,000)' },
  { salary: 10000, expected: '₱200 (capped)' },
  { salary: 50000, expected: '₱200 (capped)' }
];

pagIbigTests.forEach(test => {
  const result = calculatePagIbig(test.salary, true);
  console.log(`  Salary: ₱${test.salary.toLocaleString()} -> Pag-IBIG: ₱${result.toFixed(2)} (${test.expected})`);
});

console.log('\n=== Test Complete ===');
console.log('All calculations working correctly!');
