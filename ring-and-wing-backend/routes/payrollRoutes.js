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
      (deductions?.absence || 0);
    const netPay = grossPay - totalDeductions;

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
      deductions,
      totalHoursWorked: 0, // Will be calculated from time logs
      overtimeHours: 0,    // Will be calculated from time logs
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

module.exports = router;