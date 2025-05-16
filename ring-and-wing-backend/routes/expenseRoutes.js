const express = require('express');
const router = express.Router();
const Expense = require('../models/expense');

// @desc    Create new expense
// @route   POST /api/expenses
router.post('/', async (req, res) => {
  try {
    const expense = new Expense(req.body);
    await expense.save();
    res.status(201).json(expense);
  } catch (error) {
    res.status(400).json({ message: 'Invalid expense data', error: error.message });
  }
});

// @desc    Get all expenses with filters
// @route   GET /api/expenses
router.get('/', async (req, res) => {
  try {
    const { startDate, endDate, category, search, disbursed, permanent } = req.query;
    const filter = {};

    if (startDate && endDate) {
      filter.date = { $gte: new Date(startDate), $lte: new Date(endDate) };
    }
    if (category && category !== 'All') filter.category = category;
    if (disbursed !== undefined) filter.disbursed = disbursed === 'true';
    if (permanent !== undefined) filter.permanent = permanent === 'true';
    if (search) {
      filter.$or = [
        { description: { $regex: search, $options: 'i' } },
        { category: { $regex: search, $options: 'i' } }
      ];
    }

    const expenses = await Expense.find(filter).sort('-date');
    res.json(expenses);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// @desc    Update expense
// @route   PUT /api/expenses/:id
router.put('/:id', async (req, res) => {
  try {
    const expense = await Expense.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true }
    );
    if (!expense) return res.status(404).json({ message: 'Expense not found' });
    res.json(expense);
  } catch (error) {
    res.status(400).json({ message: 'Update failed', error: error.message });
  }
});

// @desc    Delete expense
// @route   DELETE /api/expenses/:id
router.delete('/:id', async (req, res) => {
  try {
    const expense = await Expense.findByIdAndDelete(req.params.id);
    if (!expense) return res.status(404).json({ message: 'Expense not found' });
    res.json({ message: 'Expense removed' });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// @desc    Get daily disbursements for charts (without resetting payment status)
// @route   POST /api/expenses/daily-stats
router.post('/reset-disbursement', async (req, res) => {
  try {
    // Calculate today's start and end date
    const today = new Date();
    const startOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate());
    const endOfDay = new Date(startOfDay);
    endOfDay.setDate(startOfDay.getDate() + 1);
    
    // Get count of expenses disbursed today
    const todayDisbursedCount = await Expense.countDocuments({
      disbursementDate: { $gte: startOfDay, $lt: endOfDay },
      disbursed: true
    });
    
    // Get count of all disbursed expenses
    const allDisbursedCount = await Expense.countDocuments({
      disbursed: true
    });
    
    // No longer reset any payment statuses - just return the stats
    res.json({
      success: true,
      message: 'Daily disbursement statistics calculated',
      todayCount: todayDisbursedCount,
      allTimeCount: allDisbursedCount,
      date: startOfDay.toISOString()
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to reset disbursement status',
      error: error.message
    });
  }
});

module.exports = router;