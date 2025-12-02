const express = require('express');
const router = express.Router();
const InventoryAuditLog = require('../models/InventoryAuditLog');

// GET all audit logs (with pagination)
router.get('/', async (req, res) => {
  try {
    const { page = 1, limit = 100, itemId, action, startDate, endDate } = req.query;
    
    const query = {};
    
    if (itemId) {
      query.itemId = itemId;
    }
    
    if (action) {
      query.action = action;
    }
    
    if (startDate || endDate) {
      query.timestamp = {};
      if (startDate) query.timestamp.$gte = new Date(startDate);
      if (endDate) query.timestamp.$lte = new Date(endDate);
    }
    
    const logs = await InventoryAuditLog.find(query)
      .sort({ timestamp: -1 })
      .limit(parseInt(limit))
      .skip((parseInt(page) - 1) * parseInt(limit))
      .lean();
    
    const total = await InventoryAuditLog.countDocuments(query);
    
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

// POST create a new audit log entry
router.post('/', async (req, res) => {
  try {
    const { action, description, itemId, itemName, batchId, user, userId, details } = req.body;
    
    if (!action || !description) {
      return res.status(400).json({ message: 'Action and description are required' });
    }
    
    const auditLog = new InventoryAuditLog({
      action,
      description,
      itemId,
      itemName,
      batchId,
      user: user || 'admin',
      userId,
      details,
      timestamp: new Date()
    });
    
    const savedLog = await auditLog.save();
    res.status(201).json(savedLog);
  } catch (err) {
    res.status(400).json({ message: 'Failed to create audit log: ' + err.message });
  }
});

// GET audit logs for a specific item
router.get('/item/:itemId', async (req, res) => {
  try {
    const logs = await InventoryAuditLog.find({ itemId: req.params.itemId })
      .sort({ timestamp: -1 })
      .limit(50)
      .lean();
    
    res.json(logs);
  } catch (err) {
    res.status(500).json({ message: 'Failed to fetch item audit logs: ' + err.message });
  }
});

// DELETE all audit logs (admin only - use with caution)
router.delete('/clear', async (req, res) => {
  try {
    await InventoryAuditLog.deleteMany({});
    res.json({ message: 'All audit logs cleared successfully' });
  } catch (err) {
    res.status(500).json({ message: 'Failed to clear audit logs: ' + err.message });
  }
});

module.exports = router;
