const express = require('express');
const router = express.Router();
const PayrollSchedule = require('../models/PayrollSchedule');
const Staff = require('../models/Staff');
const { auth, isManager } = require('../middleware/authMiddleware');

// Get all payroll schedules
router.get('/', auth, async (req, res) => {
  try {
    const schedules = await PayrollSchedule.find()
      .sort({ isActive: -1, name: 1 });

    res.json({
      success: true,
      data: schedules
    });
  } catch (error) {
    console.error('Error fetching payroll schedules:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

// Create new payroll schedule
router.post('/', auth, isManager, async (req, res) => {
  try {
    const {
      name,
      type,
      payoutDays,
      cutoffDays,
      description,
      overtimeMultiplier,
      regularHoursPerDay,
      workDaysPerWeek
    } = req.body;

    const schedule = new PayrollSchedule({
      name,
      type,
      payoutDays,
      cutoffDays,
      description,
      overtimeMultiplier,
      regularHoursPerDay,
      workDaysPerWeek
    });

    await schedule.save();

    res.status(201).json({
      success: true,
      data: schedule
    });
  } catch (error) {
    console.error('Error creating payroll schedule:', error);
    res.status(400).json({
      success: false,
      message: error.message
    });
  }
});

// Update payroll schedule
router.put('/:id', auth, isManager, async (req, res) => {
  try {
    const { id } = req.params;
    const update = req.body;

    const schedule = await PayrollSchedule.findByIdAndUpdate(
      id,
      update,
      { new: true, runValidators: true }
    );

    if (!schedule) {
      return res.status(404).json({
        success: false,
        message: 'Payroll schedule not found'
      });
    }

    res.json({
      success: true,
      data: schedule
    });
  } catch (error) {
    console.error('Error updating payroll schedule:', error);
    res.status(400).json({
      success: false,
      message: error.message
    });
  }
});

// Get next payout date and cutoff period for a schedule
router.get('/:id/next-payout', auth, async (req, res) => {
  try {
    const schedule = await PayrollSchedule.findById(req.params.id);
    if (!schedule) {
      return res.status(404).json({
        success: false,
        message: 'Payroll schedule not found'
      });
    }

    const nextPayoutDate = schedule.getNextPayoutDate();
    const cutoffPeriod = schedule.getCutoffPeriod();

    res.json({
      success: true,
      data: {
        nextPayoutDate,
        cutoffPeriod
      }
    });
  } catch (error) {
    console.error('Error calculating next payout:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

// Get staff members assigned to a schedule
router.get('/:id/staff', auth, async (req, res) => {
  try {
    const staff = await Staff.find({ payrollScheduleId: req.params.id })
      .select('name position status');

    res.json({
      success: true,
      data: staff
    });
  } catch (error) {
    console.error('Error fetching staff for schedule:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

// Delete payroll schedule
router.delete('/:id', auth, isManager, async (req, res) => {
  try {
    const { id } = req.params;

    // Check if any staff members are using this schedule
    const staffCount = await Staff.countDocuments({ payrollScheduleId: id });
    if (staffCount > 0) {
      return res.status(400).json({
        success: false,
        message: 'Cannot delete schedule while staff members are assigned to it'
      });
    }

    const schedule = await PayrollSchedule.findByIdAndDelete(id);
    if (!schedule) {
      return res.status(404).json({
        success: false,
        message: 'Payroll schedule not found'
      });
    }

    res.json({
      success: true,
      message: 'Payroll schedule deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting payroll schedule:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

module.exports = router;