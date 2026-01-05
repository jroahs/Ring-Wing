const express = require('express');
const router = express.Router();
const ExpenseAuditLog = require('../models/ExpenseAuditLog');
const { auth } = require('../middleware/authMiddleware');

// GET all expense audit logs (with pagination)
router.get('/', auth, async (req, res) => {
  try {
    const { page = 1, limit = 100, expenseId, action, startDate, endDate } = req.query;

    const query = {};

    if (expenseId) query.expenseId = expenseId;
    if (action) query.action = action;

    if (startDate || endDate) {
      query.timestamp = {};
      if (startDate) query.timestamp.$gte = new Date(startDate);
      if (endDate) query.timestamp.$lte = new Date(endDate);
    }

    const logs = await ExpenseAuditLog.find(query)
      .sort({ timestamp: -1 })
      .limit(parseInt(limit))
      .skip((parseInt(page) - 1) * parseInt(limit))
      .lean();

    const total = await ExpenseAuditLog.countDocuments(query);

    res.json({
      logs,
      pagination: {
        currentPage: parseInt(page),
        totalPages: Math.ceil(total / parseInt(limit)),
        totalRecords: total,
        hasMore: parseInt(page) * parseInt(limit) < total
      }
    });
  } catch (err) {
    res.status(500).json({ message: 'Failed to fetch audit logs: ' + err.message });
  }
});

// GET audit logs for a specific expense
router.get('/expense/:expenseId', auth, async (req, res) => {
  try {
    const logs = await ExpenseAuditLog.find({ expenseId: req.params.expenseId })
      .sort({ timestamp: -1 })
      .limit(100)
      .lean();

    res.json(logs);
  } catch (err) {
    res.status(500).json({ message: 'Failed to fetch expense audit logs: ' + err.message });
  }
});

module.exports = router;
