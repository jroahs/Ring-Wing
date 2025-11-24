const express = require('express');
const router = express.Router();
const Payroll = require('../models/Payroll');
const Staff = require('../models/Staff');
const TimeLog = require('../models/TimeLog');
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
        const bonusAmount = calculateHolidayBonus(staff.dailyRate, holiday.type, totalHoursWorked);
        
        holidaysWorked.push({
          date: holidayDate,
          holidayName: holiday.name,
          holidayType: holiday.type,
          hoursWorked: totalHoursWorked,
          payMultiplier: holiday.payMultiplier,
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
          dailyRate: staff.dailyRate
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
          const bonusAmount = calculateHolidayBonus(staff.dailyRate, holiday.type, totalHoursWorked);
          
          holidaysWorked.push({
            date: holidayDate,
            holidayName: holiday.name,
            holidayType: holiday.type,
            hoursWorked: totalHoursWorked,
            payMultiplier: holiday.payMultiplier,
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

    // Calculate government deductions based on monthly salary
    const monthlySalary = basicPay; // Basic pay represents monthly salary for payroll period
    const govtDeductions = calculateAllGovernmentDeductions(monthlySalary, staff);
    
    console.log('Government deductions calculated:', {
      staffName: staff.name,
      monthlySalary,
      sss: govtDeductions.sss.amount,
      philHealth: govtDeductions.philHealth.amount,
      pagIbig: govtDeductions.pagIbig.amount,
      total: govtDeductions.total
    });

    // Calculate net pay
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
      govtDeductions.sss.amount +
      govtDeductions.philHealth.amount +
      govtDeductions.pagIbig.amount;
      
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

    // Create payroll record
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
      deductions: {
        late: deductions?.late || 0,
        absence: deductions?.absence || 0,
        sss: govtDeductions.sss.amount,
        philHealth: govtDeductions.philHealth.amount,
        pagIbig: govtDeductions.pagIbig.amount,
        withholdingTax: 0 // Placeholder for future implementation
      },
      totalHoursWorked: finalTotalHours, // Use frontend-provided values with fallback
      overtimeHours: finalOvertimeHours, // Use frontend-provided values with fallback
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
          total: govtDeductions.total
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