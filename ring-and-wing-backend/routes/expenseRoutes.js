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
    const { startDate, endDate, category, search, disbursed } = req.query;
    const filter = {};

    if (startDate && endDate) {
      filter.date = { $gte: new Date(startDate), $lte: new Date(endDate) };
    }
    if (category && category !== 'All') filter.category = category;
    if (disbursed) filter.disbursed = disbursed === 'true';
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

// @desc    Reset disbursement status daily
// @route   POST /api/expenses/reset-disbursement
router.post('/reset-disbursement', async (req, res) => {
  try {
    // Calculate today's start and end date
    const today = new Date();
    const startOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate());
    const endOfDay = new Date(startOfDay);
    endOfDay.setDate(startOfDay.getDate() + 1);
    
    // Only reset expenses that are:
    // 1. Currently marked as disbursed
    // 2. Were created/modified within the current day
    const result = await Expense.updateMany(
      { 
        disbursed: true,
        date: { $gte: startOfDay, $lt: endOfDay }
      },
      { $set: { disbursed: false } }
    );

    res.json({
      success: true,
      message: 'Disbursement status reset successfully for today\'s expenses',
      count: result.modifiedCount
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