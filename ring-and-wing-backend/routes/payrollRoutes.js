const express = require('express');
const router = express.Router();
const Payroll = require('../models/Payroll');
const Staff = require('../models/Staff');
const TimeLog = require('../models/TimeLog');
const Settings = require('../models/Settings');
const { auth } = require('../middleware/authMiddleware');
const { 
  getHolidaysForYear, 
  getHolidaysInRange, 
  isHoliday, 
  calculateHolidayBonus,
  calculate13thMonthPay,
  is13thMonthPayPeriod 
} = require('../utils/philippineHolidays');
const { calculateAllGovernmentDeductions } = require('../utils/governmentDeductions');

// Helper: Get global payroll settings (multipliers) from Settings model
const getPayrollMultipliers = async () => {
  try {
    const settings = await Settings.findOne();
    if (!settings) {
      console.warn('No settings found, using DOLE defaults');
      return getDOLEDefaults();
    }
    
    // Multipliers are nested under payroll.multipliers
    const multipliers = settings.payroll?.multipliers || {};
    return {
      overtime: multipliers.overtime || 1.25,
      regularHoliday: multipliers.regularHoliday || 2.0,
      specialHoliday: multipliers.specialHoliday || 1.30,
      overtimeOnHoliday: multipliers.overtimeOnHoliday || 2.60,
      overtimeOnSpecialHoliday: multipliers.overtimeOnSpecialHoliday || 1.69,
      restDay: multipliers.restDay || 1.30,
      restDayOvertime: multipliers.restDayOvertime || 1.69,
      nightDifferential: multipliers.nightDifferential || 1.10
    };
  } catch (error) {
    console.error('Error fetching payroll multipliers, using DOLE defaults:', error);
    return getDOLEDefaults();
  }
};

const getDOLEDefaults = () => ({
  overtime: 1.25,
  regularHoliday: 2.0,
  specialHoliday: 1.30,
  overtimeOnHoliday: 2.60,
  overtimeOnSpecialHoliday: 1.69,
  restDay: 1.30,
  restDayOvertime: 1.69,
  nightDifferential: 1.10
});

// Create payroll record
router.post('/', auth, async (req, res) => {
  try {
    const { staffId, payrollPeriod, basicPay, overtimePay, allowances, deductions, timeLogs } = req.body;
    
    // Verify staff exists
    const staff = await Staff.findById(staffId);
    if (!staff) {
      return res.status(404).json({ 
        success: false,
        message: 'Staff member not found' 
      });
    }

    // Calculate total hours and overtime from time logs
    const timeLogRecords = await TimeLog.find({
      _id: { $in: timeLogs },
      staffId: staffId
    });

    const totalHours = timeLogRecords.reduce((sum, log) => sum + (log.totalHours || 0), 0);
    const overtimeHours = timeLogRecords.reduce((sum, log) => 
      sum + (log.isOvertime ? Math.max((log.totalHours || 0) - 8, 0) : 0), 0);

    // Create payroll record
    const payroll = new Payroll({
      staffId,
      payrollPeriod: new Date(payrollPeriod),
      timeLogs: timeLogRecords.map(log => log._id),
      basicPay,
      overtimePay,
      allowances: allowances || staff.allowances || 0,
      deductions,
      totalHoursWorked: totalHours,
      overtimeHours,
      netPay: (basicPay + overtimePay + (allowances || staff.allowances || 0)) - 
        (deductions?.late || 0) - (deductions?.absence || 0)
    });

    await payroll.save();

    // Populate staff details for response
    const populatedPayroll = await Payroll.findById(payroll._id)
      .populate('staffId', 'name position')
      .populate('timeLogs');

    res.status(201).json({
      success: true,
      data: populatedPayroll
    });
  } catch (error) {
    console.error('Payroll creation error:', error);
    res.status(400).json({ 
      success: false,
      message: error.message 
    });
  }
});

// Get payroll records for a staff member
router.get('/staff/:staffId', auth, async (req, res) => {
  try {
    const { startDate, endDate } = req.query;
    let query = { staffId: req.params.staffId };

    if (startDate || endDate) {
      query.payrollPeriod = {};
      if (startDate) query.payrollPeriod.$gte = new Date(startDate);
      if (endDate) query.payrollPeriod.$lte = new Date(endDate);
    }

    const payrolls = await Payroll.find(query)
      .populate('staffId', 'name position')
      .populate('timeLogs')
      .sort('-payrollPeriod');

    res.json({
      success: true,
      data: payrolls
    });
  } catch (error) {
    console.error('Error fetching payroll records:', error);
    res.status(500).json({ 
      success: false,
      message: error.message 
    });
  }
});

// Get all payroll records with optional filters
router.get('/', auth, async (req, res) => {
  try {
    const { startDate, endDate, status } = req.query;
    let query = {};

    if (startDate || endDate) {
      query.payrollPeriod = {};
      if (startDate) query.payrollPeriod.$gte = new Date(startDate);
      if (endDate) query.payrollPeriod.$lte = new Date(endDate);
    }

    const payrolls = await Payroll.find(query)
      .populate('staffId', 'name position status')
      .populate('timeLogs')
      .sort('-payrollPeriod');

    // Filter by staff status if requested
    const filteredPayrolls = status 
      ? payrolls.filter(p => p.staffId?.status === status)
      : payrolls;

    res.json({
      success: true,
      data: filteredPayrolls
    });
  } catch (error) {
    console.error('Error fetching payroll records:', error);
    res.status(500).json({ 
      success: false,
      message: error.message 
    });
  }
});

// Get Philippine holidays for a specific year
router.get('/holidays/:year', auth, async (req, res) => {
  try {
    const year = parseInt(req.params.year);
    
    if (isNaN(year) || year < 2020 || year > 2030) {
      return res.status(400).json({
        success: false,
        message: 'Invalid year. Please provide a year between 2020 and 2030.'
      });
    }

    const holidays = getHolidaysForYear(year);
    
    res.json({
      success: true,
      data: {
        year,
        holidays: holidays.map(holiday => ({
          name: holiday.name,
          date: holiday.date.toISOString().split('T')[0],
          type: holiday.type,
          payMultiplier: holiday.payMultiplier,
          isApproximate: holiday.isApproximate || false
        }))
      }
    });
  } catch (error) {
    console.error('Error fetching holidays:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

// Calculate holiday pay and bonuses for a payroll period
router.post('/calculate-holiday-pay', auth, async (req, res) => {
  try {
    const { staffId, startDate, endDate } = req.body;
    
    // Verify staff exists
    const staff = await Staff.findById(staffId);
    if (!staff) {
      return res.status(404).json({
        success: false,
        message: 'Staff member not found'
      });
    }

    const start = new Date(startDate);
    const end = new Date(endDate);
    
    // Get holidays in the period
    const holidays = getHolidaysInRange(start, end);
    
    // Get time logs for the period
    const timeLogs = await TimeLog.find({
      staffId: staffId,
      clockIn: { $gte: start, $lte: end }
    });

    // Get global multipliers from system settings
    const globalMultipliers = await getPayrollMultipliers();
    const customMultipliers = {
      regularHolidayMultiplier: globalMultipliers.regularHoliday,
      specialHolidayMultiplier: globalMultipliers.specialHoliday,
      overtimeOnHolidayMultiplier: globalMultipliers.overtimeOnHoliday,
      overtimeOnSpecialHolidayMultiplier: globalMultipliers.overtimeOnSpecialHoliday
    };

    // Calculate holiday pay for each holiday worked
    const holidaysWorked = [];
    let totalHolidayBonus = 0;

    holidays.forEach(holiday => {
      const holidayDate = holiday.date;
      
      // Find time logs for this specific holiday
      const holidayTimeLogs = timeLogs.filter(log => {
        const logDate = new Date(log.clockIn);
        return logDate.toDateString() === holidayDate.toDateString();
      });

      if (holidayTimeLogs.length > 0) {
        const totalHoursWorked = holidayTimeLogs.reduce((sum, log) => sum + (log.totalHours || 0), 0);
        // Use hourlyRate directly; fall back to dailyRate/8 for legacy records
        const hourlyRate = staff.hourlyRate || (staff.dailyRate || 0) / 8;
        // Pass custom multipliers from schedule settings
        const bonusAmount = calculateHolidayBonus(hourlyRate, holiday.type, totalHoursWorked, null, customMultipliers);
        
        // Determine effective multiplier for display
        const effectiveMultiplier = customMultipliers 
          ? (holiday.type === 'regular' ? customMultipliers.regularHolidayMultiplier : customMultipliers.specialHolidayMultiplier)
          : holiday.payMultiplier;
        
        holidaysWorked.push({
          date: holidayDate,
          holidayName: holiday.name,
          holidayType: holiday.type,
          hoursWorked: totalHoursWorked,
          payMultiplier: effectiveMultiplier,
          bonusAmount: bonusAmount
        });

        totalHolidayBonus += bonusAmount;
      }
    });

    res.json({
      success: true,
      data: {
        staff: {
          id: staff._id,
          name: staff.name,
          hourlyRate: staff.hourlyRate || (staff.dailyRate || 0) / 8,
          dailyRate: staff.dailyRate // Keep for backward compatibility
        },
        period: {
          startDate: start.toISOString().split('T')[0],
          endDate: end.toISOString().split('T')[0]
        },
        holidaysInPeriod: holidays.map(h => ({
          name: h.name,
          date: h.date.toISOString().split('T')[0],
          type: h.type,
          payMultiplier: h.payMultiplier
        })),
        holidaysWorked,
        totalHolidayBonus,
        summary: {
          totalHolidaysInPeriod: holidays.length,
          totalHolidaysWorked: holidaysWorked.length,
          totalBonusAmount: totalHolidayBonus
        }
      }
    });
  } catch (error) {
    console.error('Error calculating holiday pay:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

// Calculate 13th month pay for a staff member
router.post('/calculate-13th-month', auth, async (req, res) => {
  try {
    const { staffId, year } = req.body;
    
    // Verify staff exists
    const staff = await Staff.findById(staffId);
    if (!staff) {
      return res.status(404).json({
        success: false,
        message: 'Staff member not found'
      });
    }

    // Get all payroll records for the year
    const startOfYear = new Date(year, 0, 1);
    const endOfYear = new Date(year, 11, 31);
    
    const payrolls = await Payroll.find({
      staffId: staffId,
      payrollPeriod: { $gte: startOfYear, $lte: endOfYear }
    });

    // Calculate total basic pay for the year
    const totalBasicPay = payrolls.reduce((sum, payroll) => sum + (payroll.basicPay || 0), 0);
    
    // Calculate 13th month pay (1/12 of annual basic salary)
    const thirteenthMonthPay = calculate13thMonthPay(totalBasicPay);
    
    // Check if it's December (13th month pay period)
    const currentDate = new Date();
    const isPayoutPeriod = is13thMonthPayPeriod(currentDate) && currentDate.getFullYear() === year;

    res.json({
      success: true,
      data: {
        staff: {
          id: staff._id,
          name: staff.name,
          position: staff.position
        },
        year,
        calculation: {
          totalBasicPayForYear: totalBasicPay,
          thirteenthMonthPay: thirteenthMonthPay,
          monthsWorked: payrolls.length,
          isPayoutPeriod
        },
        payrollRecords: payrolls.map(p => ({
          period: p.payrollPeriod,
          basicPay: p.basicPay
        }))
      }
    });
  } catch (error) {
    console.error('Error calculating 13th month pay:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

// Create payroll with holiday and bonus calculations
router.post('/create-with-bonuses', auth, async (req, res) => {
  try {
    const { 
      staffId, 
      payrollPeriod, 
      basicPay, 
      overtimePay, 
      allowances, 
      deductions, 
      timeLogs,
      totalHoursWorked,
      overtimeHours,
      includeHolidayCalculation = true,
      include13thMonth = false,
      manualBonuses = {}
    } = req.body;
    
    // Verify staff exists
    const staff = await Staff.findById(staffId);
    if (!staff) {
      return res.status(404).json({
        success: false,
        message: 'Staff member not found'
      });
    }

    const period = new Date(payrollPeriod);
    const startOfMonth = new Date(period.getFullYear(), period.getMonth(), 1);
    const endOfMonth = new Date(period.getFullYear(), period.getMonth() + 1, 0);

    // Get global multipliers from system settings
    const globalMultipliers = await getPayrollMultipliers();
    const customMultipliers = {
      regularHolidayMultiplier: globalMultipliers.regularHoliday,
      specialHolidayMultiplier: globalMultipliers.specialHoliday,
      overtimeOnHolidayMultiplier: globalMultipliers.overtimeOnHoliday,
      overtimeOnSpecialHolidayMultiplier: globalMultipliers.overtimeOnSpecialHoliday
    };

    // Calculate holiday pay if requested
    let holidaysWorked = [];
    let totalHolidayBonus = 0;
    
    if (includeHolidayCalculation) {
      const holidaysRaw = await getHolidaysInRange(startOfMonth, endOfMonth);
      const holidays = Array.isArray(holidaysRaw) ? holidaysRaw : [];
      const timeLogRecords = await TimeLog.find({
        staffId: staffId,
        clockIn: { $gte: startOfMonth, $lte: endOfMonth }
      });

      holidays.forEach(holiday => {
        const holidayDate = holiday.date;
        const holidayTimeLogs = timeLogRecords.filter(log => {
          const logDate = new Date(log.clockIn);
          return logDate.toDateString() === holidayDate.toDateString();
        });

        if (holidayTimeLogs.length > 0) {
          const totalHoursWorked = holidayTimeLogs.reduce((sum, log) => sum + (log.totalHours || 0), 0);
          // Use hourlyRate directly; fall back to dailyRate/8 for legacy records
          const hourlyRate = staff.hourlyRate || (staff.dailyRate || 0) / 8;
          // Pass global multipliers from system settings
          const bonusAmount = calculateHolidayBonus(hourlyRate, holiday.type, totalHoursWorked, null, customMultipliers);
          
          // Determine effective multiplier for display
          const effectiveMultiplier = holiday.type === 'regular' 
            ? customMultipliers.regularHolidayMultiplier 
            : customMultipliers.specialHolidayMultiplier;
          
          holidaysWorked.push({
            date: holidayDate,
            holidayName: holiday.name,
            holidayType: holiday.type,
            hoursWorked: totalHoursWorked,
            payMultiplier: effectiveMultiplier,
            bonusAmount: bonusAmount
          });

          totalHolidayBonus += bonusAmount;
        }
      });
    }

    // Calculate 13th month pay if requested and it's December
    let thirteenthMonthPay = 0;
    if (include13thMonth && is13thMonthPayPeriod(period)) {
      const yearPayrolls = await Payroll.find({
        staffId: staffId,
        payrollPeriod: { 
          $gte: new Date(period.getFullYear(), 0, 1),
          $lt: new Date(period.getFullYear(), 11, 1) // Exclude current December
        }
      });
      
      const totalBasicPay = yearPayrolls.reduce((sum, p) => sum + (p.basicPay || 0), 0) + basicPay;
      thirteenthMonthPay = calculate13thMonthPay(totalBasicPay);
    }

    // Calculate government deductions based on MONTHLY SALARY (not period gross)
    // For hourly employees: Monthly Salary = hourlyRate × 208 hours (8 hrs/day × 26 days)
    // This is the standard Philippine payroll formula for SSS/PhilHealth/Pag-IBIG
    const hourlyRate = staff.hourlyRate || (staff.dailyRate || 0) / 8;
    const monthlySalary = hourlyRate * 208;
    const govtDeductions = await calculateAllGovernmentDeductions(monthlySalary, staff);
    
    console.log('Government deductions calculated:', {
      staffName: staff.name,
      monthlySalary,
      employee: {
        sss: govtDeductions.sss.employeeAmount,
        philHealth: govtDeductions.philHealth.employeeAmount,
        pagIbig: govtDeductions.pagIbig.employeeAmount,
        total: govtDeductions.totals.employeeTotal
      },
      employer: {
        sss: govtDeductions.sss.employerAmount,
        sssEc: govtDeductions.sss.ecAmount,
        philHealth: govtDeductions.philHealth.employerAmount,
        pagIbig: govtDeductions.pagIbig.employerAmount,
        total: govtDeductions.totals.employerTotal
      }
    });

    // Calculate net pay (only employee deductions affect net pay)
    const grossPay =
      basicPay +
      (overtimePay || 0) +
      (allowances || staff.allowances || 0) +
      totalHolidayBonus +
      (manualBonuses.performance || 0) +
      (manualBonuses.other || 0) +
      (thirteenthMonthPay || 0);
    
    const totalDeductions =
      (deductions?.late || 0) +
      (deductions?.absence || 0) +
      govtDeductions.sss.employeeAmount +
      govtDeductions.philHealth.employeeAmount +
      govtDeductions.pagIbig.employeeAmount;
      
    const netPay = grossPay - totalDeductions;

    // Use frontend-provided hours (which include proper holiday compliance and business logic)
    // If not provided, fall back to backend calculation as a safety measure
    let finalTotalHours = totalHoursWorked || 0;
    let finalOvertimeHours = overtimeHours || 0;
    
    // Fallback calculation only if frontend didn't provide values
    if (!totalHoursWorked && !overtimeHours) {
      const timeLogController = require('../controllers/timeLogController');
      try {
        const actualHours = await timeLogController.calculateTotalHours(staffId, startOfMonth, endOfMonth);
        finalTotalHours = actualHours.totalHours;
        finalOvertimeHours = actualHours.overtimeHours;
      } catch (error) {
        console.error('Error calculating hours from time logs:', error);
        // Continue with 0 values if calculation fails
      }
    }

    // Create payroll record with BOTH employee and employer contributions
    const payroll = new Payroll({
      staffId,
      payrollPeriod: period,
      timeLogs: timeLogs || [],
      basicPay,
      overtimePay,
      allowances: allowances || staff.allowances || 0,
      holidayPay: totalHolidayBonus,
      thirteenthMonthPay,
      bonuses: {
        holiday: totalHolidayBonus,
        performance: manualBonuses.performance || 0,
        other: manualBonuses.other || 0
      },
      holidaysWorked,
      // Employee deductions (from net pay)
      deductions: {
        late: deductions?.late || 0,
        absence: deductions?.absence || 0,
        sss: govtDeductions.sss.employeeAmount,
        philHealth: govtDeductions.philHealth.employeeAmount,
        pagIbig: govtDeductions.pagIbig.employeeAmount,
        withholdingTax: 0 // Placeholder for future implementation
      },
      // NEW: Employer contributions (for reporting/remittance)
      employerContributions: {
        sss: govtDeductions.sss.employerAmount,
        sssEc: govtDeductions.sss.ecAmount,
        philHealth: govtDeductions.philHealth.employerAmount,
        pagIbig: govtDeductions.pagIbig.employerAmount
      },
      // NEW: Contribution basis for audit trail
      contributionBasis: govtDeductions.contributionBasis,
      // NEW: Reference to government config used
      governmentConfigId: govtDeductions.configId,
      governmentConfigVersion: govtDeductions.configVersion,
      totalHoursWorked: finalTotalHours,
      overtimeHours: finalOvertimeHours,
      grossPay,
      netPay
    });

    await payroll.save();

    // Populate staff details for response
    const populatedPayroll = await Payroll.findById(payroll._id)
      .populate('staffId', 'name position email');

    res.status(201).json({
      success: true,
      data: populatedPayroll,
      calculations: {
        holidaysWorked,
        totalHolidayBonus,
        thirteenthMonthPay,
        governmentDeductions: {
          sss: govtDeductions.sss,
          philHealth: govtDeductions.philHealth,
          pagIbig: govtDeductions.pagIbig,
          totals: govtDeductions.totals,
          employerBreakdown: govtDeductions.employerBreakdown,
          contributionBasis: govtDeductions.contributionBasis
        },
        grossPay: populatedPayroll.grossPay,
        netPay: populatedPayroll.netPay
      }
    });
  } catch (error) {
    console.error('Error creating payroll with bonuses:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

// POST /api/payroll/generate-batch - Generate batch payroll for all employees
// This endpoint fetches ALL active employees and computes payroll for the selected period
// Employees with no activity will have zero values instead of being excluded
router.post('/generate-batch', auth, async (req, res) => {
  try {
    const { 
      startDate, 
      endDate, 
      payFrequency = 'monthly',
      preparedBy,
      approvedBy 
    } = req.body;

    if (!startDate || !endDate) {
      return res.status(400).json({
        success: false,
        message: 'Start date and end date are required'
      });
    }

    const start = new Date(startDate);
    start.setHours(0, 0, 0, 0);
    const end = new Date(endDate);
    end.setHours(23, 59, 59, 999);

    // Get global payroll multipliers from system settings
    const globalMultipliers = await getPayrollMultipliers();

    // Fetch ALL active employees (exclude Terminated, Resigned, Suspended)
    const allStaff = await Staff.find({
      status: { $nin: ['Terminated', 'Resigned', 'Suspended'] }
    }).populate('payrollScheduleId').lean();

    // Get existing payroll records for the period
    const existingPayrolls = await Payroll.find({
      payrollPeriod: { $gte: start, $lte: end }
    }).populate('staffId', 'name position').lean();

    // Create a map of existing payroll by staffId for quick lookup
    const existingPayrollMap = new Map();
    existingPayrolls.forEach(p => {
      if (p.staffId && p.staffId._id) {
        existingPayrollMap.set(p.staffId._id.toString(), p);
      }
    });

    // Get EmployeeSchedule model for schedule-based attendance
    const EmployeeSchedule = require('../models/EmployeeSchedule');

    // Process each employee
    const payrollData = await Promise.all(allStaff.map(async (staff) => {
      const staffIdStr = staff._id.toString();
      
      // Check if payroll already exists for this period
      const existingPayroll = existingPayrollMap.get(staffIdStr);
      
      if (existingPayroll) {
        // Return existing payroll data
        // Use hourlyRate directly; fall back to dailyRate/8 for legacy records
        const hourlyRate = staff.hourlyRate || (staff.dailyRate || 0) / 8;
        return {
          staffId: staff._id,
          staffName: staff.name,
          position: staff.position,
          employmentType: staff.employmentType || 'Regular',
          hourlyRate: hourlyRate,
          dailyRate: staff.dailyRate || (hourlyRate * 8), // Keep for backward compatibility
          
          // Hours
          hoursWorked: existingPayroll.totalHoursWorked || 0,
          overtimeHours: existingPayroll.overtimeHours || 0,
          
          // Earnings
          basicPay: existingPayroll.basicPay || 0,
          overtimePay: existingPayroll.overtimePay || 0,
          holidayPay: existingPayroll.holidayPay || 0,
          thirteenthMonthPay: existingPayroll.thirteenthMonthPay || 0,
          allowances: existingPayroll.allowances || 0,
          bonuses: {
            performance: existingPayroll.bonuses?.performance || 0,
            other: existingPayroll.bonuses?.other || 0
          },
          
          // Deductions
          lateDeduction: existingPayroll.deductions?.late || 0,
          absenceDeduction: existingPayroll.deductions?.absence || 0,
          sssDeduction: existingPayroll.deductions?.sss || 0,
          philHealthDeduction: existingPayroll.deductions?.philHealth || 0,
          pagIbigDeduction: existingPayroll.deductions?.pagIbig || 0,
          withholdingTax: existingPayroll.deductions?.withholdingTax || 0,
          cashAdvance: 0, // Placeholder for future implementation
          otherDeductions: 0, // Placeholder for future implementation
          
          // Attendance summary
          scheduleSummary: existingPayroll.scheduleSummary || {},
          
          // Totals
          grossPay: existingPayroll.grossPay || 
            ((existingPayroll.basicPay || 0) + 
             (existingPayroll.overtimePay || 0) + 
             (existingPayroll.holidayPay || 0) + 
             (existingPayroll.thirteenthMonthPay || 0) + 
             (existingPayroll.allowances || 0) + 
             (existingPayroll.bonuses?.performance || 0) + 
             (existingPayroll.bonuses?.other || 0)),
          totalDeductions: 
            (existingPayroll.deductions?.late || 0) + 
            (existingPayroll.deductions?.absence || 0) + 
            (existingPayroll.deductions?.sss || 0) + 
            (existingPayroll.deductions?.philHealth || 0) + 
            (existingPayroll.deductions?.pagIbig || 0) + 
            (existingPayroll.deductions?.withholdingTax || 0),
          netPay: existingPayroll.netPay || 0,
          
          hasExistingPayroll: true,
          payrollId: existingPayroll._id
        };
      }

      // Compute payroll for employees without existing records
      // Get time logs for the period
      const timeLogs = await TimeLog.find({
        staffId: staff._id,
        timestamp: { $gte: start, $lte: end }
      }).sort('timestamp');

      // Calculate hours from time logs
      let totalHours = 0;
      let overtimeHours = 0;
      // Use global settings for regular hours, fallback to staff schedule or default
      const settings = await Settings.getSettings();
      const regularHoursPerDay = settings.payroll?.regularHoursPerDay || staff.payrollScheduleId?.regularHoursPerDay || 8;
      // Use global overtime multiplier from system settings
      const overtimeMultiplier = globalMultipliers.overtime;

      // Pair clock-in/out entries
      const clockIns = timeLogs.filter(l => l.type === 'clockIn');
      const clockOuts = timeLogs.filter(l => l.type === 'clockOut');

      clockOuts.forEach(clockOut => {
        if (clockOut.totalHours) {
          totalHours += clockOut.totalHours;
          if (clockOut.isOvertime && clockOut.totalHours > regularHoursPerDay) {
            overtimeHours += clockOut.totalHours - regularHoursPerDay;
          }
        }
      });

      // Get schedule attendance data (late minutes, absences)
      let lateMinutes = 0;
      let absentDays = 0;
      let undertimeMinutes = 0;

      try {
        const schedules = await EmployeeSchedule.find({
          staffId: staff._id,
          date: { $gte: start, $lte: end }
        });

        schedules.forEach(schedule => {
          if (schedule.status === 'absent' && !schedule.isRestDay && !schedule.isLeave) {
            absentDays++;
          }
          lateMinutes += schedule.variance?.lateMinutes || 0;
          undertimeMinutes += schedule.variance?.undertimeMinutes || 0;
        });
      } catch (error) {
        console.log(`[Batch Payroll] Schedule data not available for ${staff.name}`);
      }

      // Calculate pay using hourlyRate directly
      // Use hourlyRate directly; fall back to dailyRate/regularHoursPerDay for legacy records
      const hourlyRate = staff.hourlyRate || (staff.dailyRate || 0) / regularHoursPerDay;
      const regularHours = Math.max(0, totalHours - overtimeHours);
      const basicPay = regularHours * hourlyRate;
      const overtimePay = overtimeHours * hourlyRate * overtimeMultiplier;

      // Calculate deductions using system settings
      const lateDeductionPerMinute = settings.payroll?.deductions?.lateDeductionPerMinute;
      const absentDeductionType = settings.payroll?.deductions?.absentDeductionType || 'daily_rate';
      const standardHoursPerDay = staff.standardHoursPerDay || 8;
      
      // Late deduction: use configured rate if set, otherwise use hourly rate method
      let lateDeduction = 0;
      if (lateDeductionPerMinute !== undefined && lateDeductionPerMinute > 0) {
        lateDeduction = lateMinutes * lateDeductionPerMinute;
      } else {
        lateDeduction = (lateMinutes / 60) * hourlyRate; // Fallback to hourly rate method
      }
      
      // Absence deduction: use configured type
      let absenceDeduction = 0;
      if (absentDeductionType === 'daily_rate') {
        absenceDeduction = absentDays * hourlyRate * standardHoursPerDay;
      } else if (absentDeductionType === 'hourly') {
        absenceDeduction = absentDays * hourlyRate * standardHoursPerDay; // Same as daily_rate
      } else if (absentDeductionType === 'none') {
        absenceDeduction = 0;
      }

      // Calculate government deductions based on MONTHLY SALARY (not period gross)
      // For hourly employees: Monthly Salary = hourlyRate × 208 hours (8 hrs/day × 26 days)
      // This is the standard Philippine payroll formula for SSS/PhilHealth/Pag-IBIG
      const monthlySalary = hourlyRate * 208;
      const govtDeductions = await calculateAllGovernmentDeductions(monthlySalary, staff);

      // Calculate gross and net pay (only employee share is deducted from pay)
      const grossPay = basicPay + overtimePay + (staff.allowances || 0);
      const totalDeductions = lateDeduction + absenceDeduction + govtDeductions.totals.employeeTotal;
      const netPay = Math.max(0, grossPay - totalDeductions);

      return {
        staffId: staff._id,
        staffName: staff.name,
        position: staff.position,
        employmentType: staff.employmentType || 'Regular',
        hourlyRate: hourlyRate,
        dailyRate: staff.dailyRate || (hourlyRate * standardHoursPerDay), // Keep for backward compatibility
        
        // Hours
        hoursWorked: Number(totalHours.toFixed(2)),
        overtimeHours: Number(overtimeHours.toFixed(2)),
        
        // Earnings
        basicPay: Number(basicPay.toFixed(2)),
        overtimePay: Number(overtimePay.toFixed(2)),
        holidayPay: 0,
        thirteenthMonthPay: 0,
        allowances: staff.allowances || 0,
        bonuses: {
          performance: 0,
          other: 0
        },
        
        // Employee Deductions (deducted from employee pay)
        lateDeduction: Number(lateDeduction.toFixed(2)),
        absenceDeduction: Number(absenceDeduction.toFixed(2)),
        lateMinutes: lateMinutes,
        absentDays: absentDays,
        sssDeduction: govtDeductions.sss.employeeAmount,
        philHealthDeduction: govtDeductions.philHealth.employeeAmount,
        pagIbigDeduction: govtDeductions.pagIbig.employeeAmount,
        withholdingTax: 0,
        cashAdvance: 0,
        otherDeductions: 0,
        
        // Employer Contributions (company expense, not deducted from employee)
        employerContributions: {
          sss: govtDeductions.sss.employerAmount,
          sssEc: govtDeductions.sss.ecAmount,
          philHealth: govtDeductions.philHealth.employerAmount,
          pagIbig: govtDeductions.pagIbig.employerAmount,
          total: govtDeductions.totals.employerTotal
        },
        
        // Contribution Basis for compliance reporting
        contributionBasis: govtDeductions.contributionBasis,
        
        // Attendance summary
        scheduleSummary: {
          scheduledDays: 0,
          workedDays: clockOuts.length,
          absentDays: absentDays,
          totalLateMinutes: lateMinutes,
          totalUndertimeMinutes: undertimeMinutes
        },
        
        // Totals
        grossPay: Number(grossPay.toFixed(2)),
        totalDeductions: Number(totalDeductions.toFixed(2)),
        netPay: Number(netPay.toFixed(2)),
        
        hasExistingPayroll: false,
        payrollId: null
      };
    }));

    // Calculate summary totals
    const summary = {
      totalEmployees: payrollData.length,
      totalHoursWorked: payrollData.reduce((sum, p) => sum + p.hoursWorked, 0),
      totalOvertimeHours: payrollData.reduce((sum, p) => sum + p.overtimeHours, 0),
      
      totalBasicPay: payrollData.reduce((sum, p) => sum + p.basicPay, 0),
      totalOvertimePay: payrollData.reduce((sum, p) => sum + p.overtimePay, 0),
      totalHolidayPay: payrollData.reduce((sum, p) => sum + p.holidayPay, 0),
      totalAllowances: payrollData.reduce((sum, p) => sum + p.allowances, 0),
      totalBonuses: payrollData.reduce((sum, p) => sum + (p.bonuses?.performance || 0) + (p.bonuses?.other || 0), 0),
      totalGrossPay: payrollData.reduce((sum, p) => sum + p.grossPay, 0),
      
      // Employee Deductions Summary
      totalLateDeductions: payrollData.reduce((sum, p) => sum + p.lateDeduction, 0),
      totalAbsenceDeductions: payrollData.reduce((sum, p) => sum + p.absenceDeduction, 0),
      totalSSSDeductions: payrollData.reduce((sum, p) => sum + p.sssDeduction, 0),
      totalPhilHealthDeductions: payrollData.reduce((sum, p) => sum + p.philHealthDeduction, 0),
      totalPagIbigDeductions: payrollData.reduce((sum, p) => sum + p.pagIbigDeduction, 0),
      totalGovernmentDeductions: payrollData.reduce((sum, p) => 
        sum + p.sssDeduction + p.philHealthDeduction + p.pagIbigDeduction, 0),
      totalDeductions: payrollData.reduce((sum, p) => sum + p.totalDeductions, 0),
      
      // Employer Contributions Summary (company expense for compliance reporting)
      totalEmployerSSS: payrollData.reduce((sum, p) => sum + (p.employerContributions?.sss || 0), 0),
      totalEmployerSSSEc: payrollData.reduce((sum, p) => sum + (p.employerContributions?.sssEc || 0), 0),
      totalEmployerPhilHealth: payrollData.reduce((sum, p) => sum + (p.employerContributions?.philHealth || 0), 0),
      totalEmployerPagIbig: payrollData.reduce((sum, p) => sum + (p.employerContributions?.pagIbig || 0), 0),
      totalEmployerContributions: payrollData.reduce((sum, p) => sum + (p.employerContributions?.total || 0), 0),
      
      // Grand total for government remittance (employee + employer)
      totalSSSRemittance: 0, // Will be calculated below
      totalPhilHealthRemittance: 0,
      totalPagIbigRemittance: 0,
      totalGovernmentRemittance: 0,
      
      totalNetPay: payrollData.reduce((sum, p) => sum + p.netPay, 0)
    };
    
    // Calculate remittance totals (employee + employer shares)
    summary.totalSSSRemittance = summary.totalSSSDeductions + summary.totalEmployerSSS + summary.totalEmployerSSSEc;
    summary.totalPhilHealthRemittance = summary.totalPhilHealthDeductions + summary.totalEmployerPhilHealth;
    summary.totalPagIbigRemittance = summary.totalPagIbigDeductions + summary.totalEmployerPagIbig;
    summary.totalGovernmentRemittance = summary.totalSSSRemittance + summary.totalPhilHealthRemittance + summary.totalPagIbigRemittance;

    // Round summary values
    Object.keys(summary).forEach(key => {
      if (typeof summary[key] === 'number') {
        summary[key] = Number(summary[key].toFixed(2));
      }
    });

    res.json({
      success: true,
      data: {
        batchHeader: {
          payrollPeriod: {
            startDate: start.toISOString(),
            endDate: end.toISOString()
          },
          payFrequency: payFrequency,
          dateGenerated: new Date().toISOString(),
          preparedBy: preparedBy || req.user?.username || 'System',
          approvedBy: approvedBy || null,
          companyName: 'Ring & Wing Restaurant'
        },
        employees: payrollData,
        summary: summary
      }
    });

  } catch (error) {
    console.error('Error generating batch payroll:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Error generating batch payroll'
    });
  }
});

// GET /api/payroll/summary - Monthly payroll summary report
router.get('/summary', auth, async (req, res) => {
  try {
    const { month, year, startDate, endDate } = req.query;

    // Build date filter
    let dateFilter = {};
    if (month && year) {
      // Specific month/year
      const start = new Date(year, month - 1, 1);
      const end = new Date(year, month, 0, 23, 59, 59, 999);
      dateFilter = {
        payrollPeriod: { $gte: start, $lte: end }
      };
    } else if (startDate && endDate) {
      // Custom date range
      dateFilter = {
        payrollPeriod: {
          $gte: new Date(startDate),
          $lte: new Date(endDate)
        }
      };
    } else {
      // Default to current month
      const now = new Date();
      const start = new Date(now.getFullYear(), now.getMonth(), 1);
      const end = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);
      dateFilter = {
        payrollPeriod: { $gte: start, $lte: end }
      };
    }

    // Aggregate payroll data
    const summary = await Payroll.aggregate([
      { $match: dateFilter },
      {
        $group: {
          _id: null,
          totalGrossPay: { $sum: '$grossPay' },
          totalNetPay: { $sum: '$netPay' },
          totalBasicPay: { $sum: '$basicPay' },
          totalOvertimePay: { $sum: '$overtimePay' },
          totalAllowances: { $sum: '$allowances' },
          totalHolidayPay: { $sum: '$holidayPay' },
          totalThirteenthMonthPay: { $sum: '$thirteenthMonthPay' },
          totalHolidayBonus: { $sum: '$bonuses.holiday' },
          totalPerformanceBonus: { $sum: '$bonuses.performance' },
          totalSSS: { $sum: '$deductions.sss' },
          totalPhilHealth: { $sum: '$deductions.philHealth' },
          totalPagIbig: { $sum: '$deductions.pagIbig' },
          totalLateDeduction: { $sum: '$deductions.lateDeduction' },
          totalAbsentDeduction: { $sum: '$deductions.absentDeduction' },
          totalOtherDeductions: { $sum: '$deductions.other' },
          totalTotalDeductions: { $sum: '$deductions.total' },
          employeeCount: { $addToSet: '$staffId' },
          payrollCount: { $sum: 1 }
        }
      },
      {
        $project: {
          _id: 0,
          totalGrossPay: 1,
          totalNetPay: 1,
          earnings: {
            basicPay: '$totalBasicPay',
            overtimePay: '$totalOvertimePay',
            allowances: '$totalAllowances',
            holidayPay: '$totalHolidayPay',
            thirteenthMonthPay: '$totalThirteenthMonthPay',
            bonuses: {
              holiday: '$totalHolidayBonus',
              performance: '$totalPerformanceBonus'
            }
          },
          deductions: {
            government: {
              sss: '$totalSSS',
              philHealth: '$totalPhilHealth',
              pagIbig: '$totalPagIbig',
              total: { $add: ['$totalSSS', '$totalPhilHealth', '$totalPagIbig'] }
            },
            attendance: {
              late: '$totalLateDeduction',
              absent: '$totalAbsentDeduction',
              total: { $add: ['$totalLateDeduction', '$totalAbsentDeduction'] }
            },
            other: '$totalOtherDeductions',
            total: '$totalTotalDeductions'
          },
          employeeCount: { $size: '$employeeCount' },
          payrollCount: 1
        }
      }
    ]);

    // If no data, return zeros
    if (!summary || summary.length === 0) {
      return res.json({
        success: true,
        data: {
          totalGrossPay: 0,
          totalNetPay: 0,
          earnings: {
            basicPay: 0,
            overtimePay: 0,
            allowances: 0,
            holidayPay: 0,
            thirteenthMonthPay: 0,
            bonuses: { holiday: 0, performance: 0 }
          },
          deductions: {
            government: { sss: 0, philHealth: 0, pagIbig: 0, total: 0 },
            attendance: { late: 0, absent: 0, total: 0 },
            other: 0,
            total: 0
          },
          employeeCount: 0,
          payrollCount: 0
        },
        period: dateFilter.payrollPeriod
      });
    }

    res.json({
      success: true,
      data: summary[0],
      period: dateFilter.payrollPeriod
    });
  } catch (error) {
    console.error('Error fetching payroll summary:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching payroll summary',
      error: error.message
    });
  }
});

module.exports = router;