const express = require('express');
const router = express.Router();
const Payroll = require('../models/Payroll');
const Staff = require('../models/Staff');
const TimeLog = require('../models/TimeLog');
const { auth } = require('../middleware/authMiddleware');

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

module.exports = router;