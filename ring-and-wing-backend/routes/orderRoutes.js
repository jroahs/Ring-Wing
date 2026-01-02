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
const { generateReceiptNumber } = require('../utils/receiptNumberGenerator');
const {
  getBusinessDayRangeUtc,
  businessDateTimeUtc,
  isDateOnlyString
} = require('../utils/businessTime');

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
    console.log('[orderRoutes POST] Creating order with body:', {
      hasCustomerId: !!req.body.customerId,
      customerId: req.body.customerId,
      fulfillmentType: req.body.fulfillmentType,
      hasProcessedBy: !!req.body.processedBy
    });
    
    // Generate unified receipt number (YYYYMMDD-###)
    const receiptNumber = await generateReceiptNumber();
    
    const orderData = {
      ...req.body,
      receiptNumber: receiptNumber,
    };

    // If processedBy provided from POS, use it. Otherwise leave null until staff processes the order
    if (!orderData.processedBy && req.user && orderData.orderType === 'pos') {
      orderData.processedBy = {
        userId: req.user._id || req.user.id,
        username: req.user.username || 'Staff',
        timestamp: new Date()
      };
      console.log('[orderRoutes POST] Added processedBy from authenticated POS user:', orderData.processedBy);
    }
    // For self-checkout/customer orders, processedBy remains null until staff processes it

    // Convert numeric values to proper numbers
    orderData.totals = {
      subtotal: parseFloat(req.body.totals.subtotal),
      discount: parseFloat(req.body.totals.discount || 0),
      total: parseFloat(req.body.totals.total),
      cashReceived: 0,
      change: 0
    };

    console.log('[orderRoutes POST] Order data after processing:', {
      hasCustomerId: !!orderData.customerId,
      customerId: orderData.customerId
    });

    const order = new Order(orderData);
    await order.save();
    
    console.log('[orderRoutes POST] Order saved:', {
      orderId: order._id,
      customerId: order.customerId,
      receiptNumber: order.receiptNumber
    });
    
    // Emit socket event for real-time updates (POS "Dine/Take-outs" tab)
    // Note: Only emit for orders that need verification (not PayMongo - they're auto-verified in create-checkout)
    const io = req.app.get('io');
    const isPayMongoOrder = order.paymentMethod === 'paymongo';
    const shouldEmitSocket = (order.fulfillmentType === 'takeout' || order.fulfillmentType === 'delivery' || order.fulfillmentType === 'dine_in');
    
    if (io && shouldEmitSocket && !isPayMongoOrder) {
      SocketService.emitNewOrder(io, order.toObject());
      console.log(`[OrderRoutes] Emitted newPaymentOrder for ${order.fulfillmentType} order ${order._id}`);
    } else if (isPayMongoOrder) {
      console.log(`[OrderRoutes] Skipping socket emission for PayMongo order ${order._id} - will emit after payment verification`);
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

      const DAY_MS = 24 * 60 * 60 * 1000;
      const todayRange = getBusinessDayRangeUtc(now);
      
      if (dateFilter) {
        switch (dateFilter) {
          case 'today':
            start = todayRange.startOfDayUtc;
            end = todayRange.startOfNextDayUtc;
            break;
          case 'yesterday':
            start = new Date(todayRange.startOfDayUtc.getTime() - DAY_MS);
            end = todayRange.startOfDayUtc;
            break;
          case 'last7days':
            start = new Date(todayRange.startOfDayUtc.getTime() - 7 * DAY_MS);
            end = todayRange.startOfNextDayUtc;
            break;
          case 'thisMonth':
            {
              const [y, m] = todayRange.dateKey.split('-');
              const startKey = `${y}-${m}-01`;
              const yearNum = parseInt(y, 10);
              const monthNum = parseInt(m, 10);
              const nextYear = monthNum === 12 ? yearNum + 1 : yearNum;
              const nextMonth = String(monthNum === 12 ? 1 : monthNum + 1).padStart(2, '0');
              const endKey = `${String(nextYear).padStart(4, '0')}-${nextMonth}-01`;
              start = businessDateTimeUtc(startKey, 0, 0, 0, 0);
              end = businessDateTimeUtc(endKey, 0, 0, 0, 0);
            }
            break;
          case 'last2hours':
            start = new Date(now.getTime() - 2 * 60 * 60 * 1000);
            end = now;
            break;
          case 'morning':
            start = businessDateTimeUtc(todayRange.dateKey, 6, 0, 0, 0);
            end = businessDateTimeUtc(todayRange.dateKey, 12, 0, 0, 0);
            break;
          case 'afternoon':
            start = businessDateTimeUtc(todayRange.dateKey, 12, 0, 0, 0);
            end = businessDateTimeUtc(todayRange.dateKey, 18, 0, 0, 0);
            break;
          case 'evening':
            start = businessDateTimeUtc(todayRange.dateKey, 18, 0, 0, 0);
            end = todayRange.startOfNextDayUtc;
            break;
        }
      } else {
        // Custom date range
        if (startDate) {
          if (isDateOnlyString(startDate)) {
            start = businessDateTimeUtc(startDate, 0, 0, 0, 0);
          } else {
            start = new Date(startDate);
          }
        }
        if (endDate) {
          if (isDateOnlyString(endDate)) {
            end = new Date(businessDateTimeUtc(endDate, 0, 0, 0, 0).getTime() + DAY_MS);
          } else {
            end = new Date(endDate);
          }
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

    // 🔥 NEW: Emit Socket.io event for order status change (Phase 8: Customer Notifications)
    if (status && order.customerId) {
      const io = req.app.get('io');
      if (io) {
        console.log(`[Socket] Emitting orderStatusChanged for order ${order._id} to customer ${order.customerId}`);
        
        // Emit to customer-specific room
        io.to(`customer:${order.customerId}`).emit('orderStatusChanged', {
          orderId: order._id,
          orderNumber: order.receiptNumber,
          status: order.status,
          fulfillmentType: order.fulfillmentType,
          timestamp: new Date()
        });
        
        // Also emit to order-specific room for order details page
        io.to(`order:${order._id}`).emit('orderStatusChanged', {
          orderId: order._id,
          orderNumber: order.receiptNumber,
          status: order.status,
          fulfillmentType: order.fulfillmentType,
          timestamp: new Date()
        });
      }
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
