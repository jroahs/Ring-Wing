// routes/OrderRoutes.js
const express = require('express');
const router = express.Router();
const Order = require('../models/Order');
const { criticalCheck, standardCheck } = require('../middleware/dbConnectionMiddleware');
const InventoryBusinessLogicService = require('../services/inventoryBusinessLogicService');
const paymentVerificationController = require('../controllers/paymentVerificationController');
const { auth, isManager } = require('../middleware/authMiddleware');
const uploadMiddleware = require('../config/multer');
const SocketService = require('../services/socketService');

// Advanced validation middleware
const validateOrder = (req, res, next) => {
  const { items, paymentMethod } = req.body;
  
  if (!items || !Array.isArray(items) || items.length === 0) {
    return res.status(400).json({ success: false, message: 'Invalid order items' });
  }
  if (!['cash', 'e-wallet', 'pending', 'paymongo'].includes(paymentMethod)) {
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
    
    // Emit socket event for real-time updates (POS "Dine/Take-outs" tab)
    const io = req.app.get('io');
    if (io && (order.fulfillmentType === 'takeout' || order.fulfillmentType === 'delivery' || order.fulfillmentType === 'dine-in')) {
      SocketService.emitNewOrder(io, order.toObject());
      console.log(`[OrderRoutes] Emitted newPaymentOrder for ${order.fulfillmentType} order ${order._id}`);
    }
    
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
    const { status, paymentMethod, limit = 50, page = 1, startDate, endDate, dateFilter, search } = req.query;
    console.log('Search endpoint called with search term:', search);
    console.log('Full query params:', req.query);
    
    const query = {};
    
    if (status) query.status = status;
    if (paymentMethod) query.paymentMethod = paymentMethod;
    
    // Enhanced search functionality with fuzzy matching
    if (search && search.trim()) {
      const searchTerm = search.trim();
      
      // Split search term into words for better matching
      const searchWords = searchTerm.split(/\s+/).filter(word => word.length > 0);
      
      // Create multiple search patterns for flexibility
      const searchPatterns = [
        new RegExp(searchTerm, 'i'), // Exact phrase search
        ...searchWords.map(word => new RegExp(word, 'i')) // Individual word search
      ];
      
      // Search across multiple fields with OR logic
      const searchConditions = [];
      
      searchPatterns.forEach(pattern => {
        searchConditions.push(
          { receiptNumber: pattern },
          { 'customer.name': pattern },
          { 'customer.phone': pattern },
          { 'items.name': pattern }
        );
      });
      
      query.$or = searchConditions;
      console.log('Applied search query:', JSON.stringify(query, null, 2));
    }
    
    // Date filtering logic
    if (dateFilter || startDate || endDate) {
      const now = new Date();
      let start, end;
      
      if (dateFilter) {
        switch (dateFilter) {
          case 'today':
            start = new Date(now.getFullYear(), now.getMonth(), now.getDate());
            end = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);
            break;
          case 'yesterday':
            start = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1);
            end = new Date(now.getFullYear(), now.getMonth(), now.getDate());
            break;
          case 'last7days':
            start = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 7);
            end = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);
            break;
          case 'thisMonth':
            start = new Date(now.getFullYear(), now.getMonth(), 1);
            end = new Date(now.getFullYear(), now.getMonth() + 1, 1);
            break;
          case 'last2hours':
            start = new Date(now.getTime() - 2 * 60 * 60 * 1000);
            end = now;
            break;
          case 'morning':
            start = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 6, 0, 0);
            end = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 12, 0, 0);
            break;
          case 'afternoon':
            start = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 12, 0, 0);
            end = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 18, 0, 0);
            break;
          case 'evening':
            start = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 18, 0, 0);
            end = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1, 0, 0, 0);
            break;
        }
      } else {
        // Custom date range
        if (startDate) start = new Date(startDate);
        if (endDate) {
          end = new Date(endDate);
          end.setDate(end.getDate() + 1); // Include the entire end date
        }
      }
      
      if (start || end) {
        query.createdAt = {};
        if (start) query.createdAt.$gte = start;
        if (end) query.createdAt.$lt = end;
      }
    }
    
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
    const { 
      status, 
      paymentMethod, 
      totals, 
      items, 
      customerName, 
      discountCards, 
      fulfillmentType,
      paymentDetails 
    } = req.body;
    
    const validStatuses = ['received', 'preparing', 'ready', 'completed'];
    
    // Validate status
    if (status && !validStatuses.includes(status)) {
      return res.status(400).json({ 
        success: false, 
        message: 'Invalid status value' 
      });
    }

    // Validate payment method
    if (paymentMethod && !['cash', 'e-wallet'].includes(paymentMethod)) {
      return res.status(400).json({ 
        success: false, 
        message: 'Invalid payment method' 
      });
    }

    // Build update object with all provided fields
    const updateData = {};
    if (status) updateData.status = status;
    if (paymentMethod) updateData.paymentMethod = paymentMethod;
    if (totals) updateData.totals = totals;
    if (items) updateData.items = items;
    if (customerName !== undefined) updateData.customerName = customerName;
    if (discountCards) updateData.discountCards = discountCards;
    if (fulfillmentType) updateData.fulfillmentType = fulfillmentType;
    if (paymentDetails) updateData.paymentDetails = paymentDetails;
    
    console.log('[PATCH Order] Update data:', JSON.stringify(updateData, null, 2));
    console.log('[PATCH Order] Totals received:', totals);
    
    if (status === 'completed') updateData.completedAt = Date.now();

    const order = await Order.findByIdAndUpdate(
      req.params.id,
      { $set: updateData },
      { new: true, runValidators: true }
    );

    if (!order) {
      return res.status(404).json({ 
        success: false, 
        message: 'Order not found' 
      });
    }

    // NEW: Consume inventory reservations when order is completed
    if (status === 'completed') {
      try {
        // Get user ID from request (set by auth middleware) or from body
        const userId = req.user?.id || req.user?._id || req.body.userId || 'system';
        
        // 🔥 Get io instance for real-time socket emissions (Sprint 22)
        const io = req.app.get('io');
        
        console.log(`Order ${order._id} completed - attempting to consume inventory reservations`);
        
        const consumptionResult = await InventoryBusinessLogicService.completeOrderProcessing(
          order._id.toString(),
          userId,
          io  // 🔥 Pass io for real-time stock level updates on completion
        );
        
        if (consumptionResult.success && consumptionResult.hasInventoryIntegration) {
          console.log(`Inventory consumed for order ${order._id}:`, {
            itemsConsumed: consumptionResult.itemsConsumed,
            valueConsumed: consumptionResult.valueConsumed
          });
        } else {
          console.log(`Order ${order._id} completed without inventory tracking`);
        }
      } catch (invError) {
        console.error('Inventory consumption error:', invError);
        // Don't fail the order update - log error and continue
        // Ingredient tracking is optional and shouldn't block order completion
      }
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

// Delete order
router.delete('/:id', standardCheck, async (req, res, next) => {
  try {
    const order = await Order.findByIdAndDelete(req.params.id);
    
    if (!order) {
      return res.status(404).json({
        success: false,
        message: 'Order not found'
      });
    }

    res.json({
      success: true,
      message: 'Order deleted successfully'
    });
  } catch (err) {
    next(err);
  }
});

// ========================================
// PAYMENT VERIFICATION ROUTES
// ========================================

/**
 * Upload proof of payment
 * POST /api/orders/:id/upload-proof
 * Public endpoint - customer uploads proof after payment
 */
router.post('/:id/upload-proof', uploadMiddleware, criticalCheck, paymentVerificationController.uploadProof);

/**
 * Get verification status for an order
 * GET /api/orders/:id/verification-status
 * Public endpoint - customer can check their order status
 */
router.get('/:id/verification-status', standardCheck, paymentVerificationController.getVerificationStatus);

/**
 * Get all pending verification orders
 * GET /api/orders/pending-verification
 * Requires: admin or cashier role
 */
router.get('/pending-verification', auth, standardCheck, paymentVerificationController.getPendingVerification);

/**
 * Process PayMongo verified order (generate receipt and move to kitchen)
 * POST /api/orders/:id/process-paymongo
 * Requires: admin or cashier role
 */
router.post('/:id/process-paymongo', auth, standardCheck, paymentVerificationController.processPayMongoOrder);

/**
 * Verify payment and approve order
 * PUT /api/orders/:id/verify-payment
 * Requires: admin or cashier role
 */
router.put('/:id/verify-payment', auth, criticalCheck, paymentVerificationController.verifyPayment);

/**
 * Reject payment with reason
 * PUT /api/orders/:id/reject-payment
 * Requires: admin or cashier role
 */
router.put('/:id/reject-payment', auth, criticalCheck, paymentVerificationController.rejectPayment);

/**
 * Get single order by ID
 * GET /api/orders/:id
 * Note: This route MUST be at the end to avoid intercepting specific routes like /pending-verification
 */
router.get('/:id', standardCheck, async (req, res, next) => {
  try {
    const { id } = req.params;
    const order = await Order.findById(id);
    
    if (!order) {
      return res.status(404).json({
        success: false,
        message: 'Order not found'
      });
    }
    
    res.json({
      success: true,
      data: order
    });
  } catch (error) {
    console.error('Error fetching order:', error);
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

module.exports = router;
