/**
 * Government Compliance Report Generator
 * 
 * Generates reports for government remittances:
 * - SSS Monthly Contributions Report
 * - PhilHealth Remittance Report  
 * - Pag-IBIG Remittance Report
 * - Consolidated Government Remittance Summary
 * 
 * These reports can be used for filing with government agencies.
 */

const Payroll = require('../models/Payroll');
const Staff = require('../models/Staff');
const GovernmentDeductionConfig = require('../models/GovernmentDeductionConfig');

/**
 * Generate SSS Contributions Report for a period
 */
async function generateSSSReport(startDate, endDate) {
  const payrolls = await Payroll.find({
    payrollDate: { $gte: startDate, $lte: endDate },
    status: { $in: ['approved', 'paid'] },
    sssDeduction: { $gt: 0 }
  }).populate('staffId', 'name sssNumber position employmentType');
  
  const contributions = payrolls.map(p => ({
    employeeId: p.staffId?._id,
    employeeName: p.staffId?.name || 'Unknown',
    sssNumber: p.staffId?.sssNumber || 'N/A',
    position: p.staffId?.position || 'N/A',
    employmentType: p.staffId?.employmentType || 'Regular',
    payrollDate: p.payrollDate,
    monthlySalary: p.basicPay || 0,
    msc: p.contributionBasis?.sss?.msc || 0,
    employeeShare: p.sssDeduction || 0,
    employerShare: p.employerContributions?.sss || 0,
    ecContribution: p.employerContributions?.sssEc || 0,
    totalContribution: (p.sssDeduction || 0) + (p.employerContributions?.sss || 0) + (p.employerContributions?.sssEc || 0)
  }));
  
  const summary = {
    reportPeriod: { startDate, endDate },
    totalEmployees: new Set(contributions.map(c => c.employeeId?.toString())).size,
    totalRecords: contributions.length,
    totals: {
      employeeShare: contributions.reduce((sum, c) => sum + c.employeeShare, 0),
      employerShare: contributions.reduce((sum, c) => sum + c.employerShare, 0),
      ecContribution: contributions.reduce((sum, c) => sum + c.ecContribution, 0),
      totalRemittance: contributions.reduce((sum, c) => sum + c.totalContribution, 0)
    },
    generatedAt: new Date()
  };
  
  return {
    type: 'SSS',
    summary,
    contributions: contributions.sort((a, b) => a.employeeName.localeCompare(b.employeeName))
  };
}

/**
 * Generate PhilHealth Contributions Report for a period
 */
async function generatePhilHealthReport(startDate, endDate) {
  const payrolls = await Payroll.find({
    payrollDate: { $gte: startDate, $lte: endDate },
    status: { $in: ['approved', 'paid'] },
    philHealthDeduction: { $gt: 0 }
  }).populate('staffId', 'name philHealthNumber position employmentType');
  
  const contributions = payrolls.map(p => ({
    employeeId: p.staffId?._id,
    employeeName: p.staffId?.name || 'Unknown',
    philHealthNumber: p.staffId?.philHealthNumber || 'N/A',
    position: p.staffId?.position || 'N/A',
    payrollDate: p.payrollDate,
    monthlySalary: p.basicPay || 0,
    mbs: p.contributionBasis?.philHealth?.mbs || 0,
    employeeShare: p.philHealthDeduction || 0,
    employerShare: p.employerContributions?.philHealth || 0,
    totalContribution: (p.philHealthDeduction || 0) + (p.employerContributions?.philHealth || 0)
  }));
  
  const summary = {
    reportPeriod: { startDate, endDate },
    totalEmployees: new Set(contributions.map(c => c.employeeId?.toString())).size,
    totalRecords: contributions.length,
    totals: {
      employeeShare: contributions.reduce((sum, c) => sum + c.employeeShare, 0),
      employerShare: contributions.reduce((sum, c) => sum + c.employerShare, 0),
      totalRemittance: contributions.reduce((sum, c) => sum + c.totalContribution, 0)
    },
    generatedAt: new Date()
  };
  
  return {
    type: 'PhilHealth',
    summary,
    contributions: contributions.sort((a, b) => a.employeeName.localeCompare(b.employeeName))
  };
}

/**
 * Generate Pag-IBIG Contributions Report for a period
 */
async function generatePagIbigReport(startDate, endDate) {
  const payrolls = await Payroll.find({
    payrollDate: { $gte: startDate, $lte: endDate },
    status: { $in: ['approved', 'paid'] },
    pagIbigDeduction: { $gt: 0 }
  }).populate('staffId', 'name pagIbigNumber position employmentType');
  
  const contributions = payrolls.map(p => ({
    employeeId: p.staffId?._id,
    employeeName: p.staffId?.name || 'Unknown',
    pagIbigNumber: p.staffId?.pagIbigNumber || 'N/A',
    position: p.staffId?.position || 'N/A',
    payrollDate: p.payrollDate,
    monthlySalary: p.basicPay || 0,
    mfs: p.contributionBasis?.pagIbig?.mfs || 0,
    employeeShare: p.pagIbigDeduction || 0,
    employerShare: p.employerContributions?.pagIbig || 0,
    totalContribution: (p.pagIbigDeduction || 0) + (p.employerContributions?.pagIbig || 0)
  }));
  
  const summary = {
    reportPeriod: { startDate, endDate },
    totalEmployees: new Set(contributions.map(c => c.employeeId?.toString())).size,
    totalRecords: contributions.length,
    totals: {
      employeeShare: contributions.reduce((sum, c) => sum + c.employeeShare, 0),
      employerShare: contributions.reduce((sum, c) => sum + c.employerShare, 0),
      totalRemittance: contributions.reduce((sum, c) => sum + c.totalContribution, 0)
    },
    generatedAt: new Date()
  };
  
  return {
    type: 'Pag-IBIG',
    summary,
    contributions: contributions.sort((a, b) => a.employeeName.localeCompare(b.employeeName))
  };
}

/**
 * Generate consolidated government remittance summary
 */
async function generateConsolidatedReport(startDate, endDate) {
  const [sss, philHealth, pagIbig] = await Promise.all([
    generateSSSReport(startDate, endDate),
    generatePhilHealthReport(startDate, endDate),
    generatePagIbigReport(startDate, endDate)
  ]);
  
  // Get active config for reference
  const config = await GovernmentDeductionConfig.getActiveConfig();
  
  return {
    type: 'Consolidated Government Remittance Report',
    reportPeriod: { startDate, endDate },
    generatedAt: new Date(),
    configReference: config ? {
      year: config.year,
      effectiveDate: config.effectiveDate,
      rates: {
        sss: {
          employee: `${config.sss.employeeRate * 100}%`,
          employer: `${config.sss.employerRate * 100}%`,
          ec: `₱${config.sss.ec?.lowRate}/₱${config.sss.ec?.highRate}`
        },
        philHealth: {
          employee: `${config.philHealth.employeeRate * 100}%`,
          employer: `${config.philHealth.employerRate * 100}%`
        },
        pagIbig: {
          employee: `${config.pagIbig.employeeRate * 100}%`,
          employer: `${config.pagIbig.employerRate * 100}%`
        }
      }
    } : null,
    sss: sss.summary,
    philHealth: philHealth.summary,
    pagIbig: pagIbig.summary,
    grandTotals: {
      employeeDeductions: sss.summary.totals.employeeShare + 
                          philHealth.summary.totals.employeeShare + 
                          pagIbig.summary.totals.employeeShare,
      employerContributions: sss.summary.totals.employerShare + 
                             sss.summary.totals.ecContribution +
                             philHealth.summary.totals.employerShare + 
                             pagIbig.summary.totals.employerShare,
      totalGovernmentRemittance: sss.summary.totals.totalRemittance + 
                                  philHealth.summary.totals.totalRemittance + 
                                  pagIbig.summary.totals.totalRemittance
    },
    breakdown: {
      byAgency: [
        { agency: 'SSS', amount: sss.summary.totals.totalRemittance },
        { agency: 'PhilHealth', amount: philHealth.summary.totals.totalRemittance },
        { agency: 'Pag-IBIG', amount: pagIbig.summary.totals.totalRemittance }
      ],
      byType: [
        { type: 'Employee Deductions', amount: sss.summary.totals.employeeShare + philHealth.summary.totals.employeeShare + pagIbig.summary.totals.employeeShare },
        { type: 'Employer Share', amount: sss.summary.totals.employerShare + philHealth.summary.totals.employerShare + pagIbig.summary.totals.employerShare },
        { type: 'EC Contribution', amount: sss.summary.totals.ecContribution }
      ]
    }
  };
}

/**
 * Generate per-employee contribution summary
 */
async function generateEmployeeContributionSummary(employeeId, year) {
  const startDate = new Date(year, 0, 1);
  const endDate = new Date(year, 11, 31);
  
  const employee = await Staff.findById(employeeId);
  if (!employee) {
    throw new Error('Employee not found');
  }
  
  const payrolls = await Payroll.find({
    staffId: employeeId,
    payrollDate: { $gte: startDate, $lte: endDate },
    status: { $in: ['approved', 'paid'] }
  }).sort({ payrollDate: 1 });
  
  const monthlyContributions = payrolls.map(p => ({
    month: p.payrollDate.toLocaleString('default', { month: 'long', year: 'numeric' }),
    payrollDate: p.payrollDate,
    basicPay: p.basicPay || 0,
    sss: {
      employee: p.sssDeduction || 0,
      employer: p.employerContributions?.sss || 0,
      ec: p.employerContributions?.sssEc || 0,
      total: (p.sssDeduction || 0) + (p.employerContributions?.sss || 0) + (p.employerContributions?.sssEc || 0)
    },
    philHealth: {
      employee: p.philHealthDeduction || 0,
      employer: p.employerContributions?.philHealth || 0,
      total: (p.philHealthDeduction || 0) + (p.employerContributions?.philHealth || 0)
    },
    pagIbig: {
      employee: p.pagIbigDeduction || 0,
      employer: p.employerContributions?.pagIbig || 0,
      total: (p.pagIbigDeduction || 0) + (p.employerContributions?.pagIbig || 0)
    }
  }));
  
  const yearlyTotals = {
    sss: {
      employee: monthlyContributions.reduce((sum, c) => sum + c.sss.employee, 0),
      employer: monthlyContributions.reduce((sum, c) => sum + c.sss.employer, 0),
      ec: monthlyContributions.reduce((sum, c) => sum + c.sss.ec, 0),
      total: monthlyContributions.reduce((sum, c) => sum + c.sss.total, 0)
    },
    philHealth: {
      employee: monthlyContributions.reduce((sum, c) => sum + c.philHealth.employee, 0),
      employer: monthlyContributions.reduce((sum, c) => sum + c.philHealth.employer, 0),
      total: monthlyContributions.reduce((sum, c) => sum + c.philHealth.total, 0)
    },
    pagIbig: {
      employee: monthlyContributions.reduce((sum, c) => sum + c.pagIbig.employee, 0),
      employer: monthlyContributions.reduce((sum, c) => sum + c.pagIbig.employer, 0),
      total: monthlyContributions.reduce((sum, c) => sum + c.pagIbig.total, 0)
    }
  };
  
  return {
    employee: {
      id: employee._id,
      name: employee.name,
      position: employee.position,
      sssNumber: employee.sssNumber,
      philHealthNumber: employee.philHealthNumber,
      pagIbigNumber: employee.pagIbigNumber,
      tinNumber: employee.tinNumber
    },
    year,
    monthlyContributions,
    yearlyTotals,
    grandTotal: {
      employeeDeductions: yearlyTotals.sss.employee + yearlyTotals.philHealth.employee + yearlyTotals.pagIbig.employee,
      employerContributions: yearlyTotals.sss.employer + yearlyTotals.sss.ec + yearlyTotals.philHealth.employer + yearlyTotals.pagIbig.employer,
      totalContributions: yearlyTotals.sss.total + yearlyTotals.philHealth.total + yearlyTotals.pagIbig.total
    },
    generatedAt: new Date()
  };
}

/**
 * Format report for CSV export
 */
function formatReportAsCSV(report, type) {
  let csv = '';
  
  if (type === 'SSS') {
    csv = 'Employee Name,SSS Number,Position,Monthly Salary,MSC,Employee Share,Employer Share,EC,Total\n';
    report.contributions.forEach(c => {
      csv += `"${c.employeeName}","${c.sssNumber}","${c.position}",${c.monthlySalary.toFixed(2)},${c.msc},${c.employeeShare.toFixed(2)},${c.employerShare.toFixed(2)},${c.ecContribution.toFixed(2)},${c.totalContribution.toFixed(2)}\n`;
    });
    csv += `\nTOTAL,,,,,${report.summary.totals.employeeShare.toFixed(2)},${report.summary.totals.employerShare.toFixed(2)},${report.summary.totals.ecContribution.toFixed(2)},${report.summary.totals.totalRemittance.toFixed(2)}\n`;
  } else if (type === 'PhilHealth') {
    csv = 'Employee Name,PhilHealth Number,Position,Monthly Salary,MBS,Employee Share,Employer Share,Total\n';
    report.contributions.forEach(c => {
      csv += `"${c.employeeName}","${c.philHealthNumber}","${c.position}",${c.monthlySalary.toFixed(2)},${c.mbs},${c.employeeShare.toFixed(2)},${c.employerShare.toFixed(2)},${c.totalContribution.toFixed(2)}\n`;
    });
    csv += `\nTOTAL,,,,${report.summary.totals.employeeShare.toFixed(2)},${report.summary.totals.employerShare.toFixed(2)},${report.summary.totals.totalRemittance.toFixed(2)}\n`;
  } else if (type === 'Pag-IBIG') {
    csv = 'Employee Name,Pag-IBIG Number,Position,Monthly Salary,MFS,Employee Share,Employer Share,Total\n';
    report.contributions.forEach(c => {
      csv += `"${c.employeeName}","${c.pagIbigNumber}","${c.position}",${c.monthlySalary.toFixed(2)},${c.mfs},${c.employeeShare.toFixed(2)},${c.employerShare.toFixed(2)},${c.totalContribution.toFixed(2)}\n`;
    });
    csv += `\nTOTAL,,,,${report.summary.totals.employeeShare.toFixed(2)},${report.summary.totals.employerShare.toFixed(2)},${report.summary.totals.totalRemittance.toFixed(2)}\n`;
  }
  
  return csv;
}

module.exports = {
  generateSSSReport,
  generatePhilHealthReport,
  generatePagIbigReport,
  generateConsolidatedReport,
  generateEmployeeContributionSummary,
  formatReportAsCSV
};
