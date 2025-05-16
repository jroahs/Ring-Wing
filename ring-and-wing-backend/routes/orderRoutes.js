// routes/OrderRoutes.js
const express = require('express');
const router = express.Router();
const Order = require('../models/Order');
const { criticalCheck, standardCheck } = require('../middleware/dbConnectionMiddleware');

// Advanced validation middleware
const validateOrder = (req, res, next) => {
  const { items, paymentMethod } = req.body;
  
  if (!items || !Array.isArray(items) || items.length === 0) {
    return res.status(400).json({ success: false, message: 'Invalid order items' });
  }
  
  if (!['cash', 'card', 'e-wallet', 'pending'].includes(paymentMethod)) {
    return res.status(400).json({ success: false, message: 'Invalid payment method' });
  }
  
  next();
};

// Create new order with advanced features
router.post('/', validateOrder, criticalCheck, async (req, res, next) => {
  try {
    const orderData = {
      ...req.body,
      receiptNumber: `RNG-${Date.now().toString().slice(-6)}-${Math.floor(100 + Math.random() * 900)}`,
    };

    // Convert numeric values to proper numbers
    orderData.totals = {
      subtotal: parseFloat(req.body.totals.subtotal),
      discount: parseFloat(req.body.totals.discount || 0),
      total: parseFloat(req.body.totals.total),
      cashReceived: 0,
      change: 0
    };

    const order = new Order(orderData);
    await order.save();
    
    res.status(201).json({
      success: true,
      data: order,
      message: 'Order created successfully'
    });
  } catch (err) {
    next(err);
  }
});

// Get orders with filtering and pagination
// routes/OrderRoutes.js
router.get('/', standardCheck, async (req, res, next) => {
  try {
    const { status, paymentMethod, limit = 50, page = 1 } = req.query;
    const query = {};
    
    if (status) query.status = status;
    if (paymentMethod) query.paymentMethod = paymentMethod;
    
    const orders = await Order.find(query)
      .sort({ createdAt: -1 })
      .limit(Number(limit))
      .skip((Number(page) - 1) * Number(limit));

    const totalOrders = await Order.countDocuments(query);

    res.json({
      success: true,
      data: orders,
      pagination: {
        total: totalOrders,
        page: Number(page),
        pages: Math.ceil(totalOrders / Number(limit)),
        limit: Number(limit)
      }
    });
  } catch (err) {
    next(err);
  }
});

// Update order status with validation
router.patch('/:id', async (req, res, next) => {
  try {
    const { status, paymentMethod } = req.body;
    const validStatuses = ['received', 'preparing', 'ready', 'completed'];
    
    // Validate status
    if (status && !validStatuses.includes(status)) {
      return res.status(400).json({ 
        success: false, 
        message: 'Invalid status value' 
      });
    }

    // Validate payment method
    if (paymentMethod && !['cash', 'card', 'e-wallet'].includes(paymentMethod)) {
      return res.status(400).json({ 
        success: false, 
        message: 'Invalid payment method' 
      });
    }

    const updateData = {};
    if (status) updateData.status = status;
    if (paymentMethod) updateData.paymentMethod = paymentMethod;
    
    if (status === 'completed') updateData.completedAt = Date.now();

    const order = await Order.findByIdAndUpdate(
      req.params.id,
      updateData,
      { new: true, runValidators: true }
    );

    if (!order) {
      return res.status(404).json({ 
        success: false, 
        message: 'Order not found' 
      });
    }

    res.json({
      success: true,
      data: order,
      message: 'Order updated successfully'
    });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
