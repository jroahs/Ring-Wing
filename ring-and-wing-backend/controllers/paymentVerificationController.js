// controllers/paymentVerificationController.js
const Order = require('../models/Order');
const Settings = require('../models/Settings');
const path = require('path');

/**
 * Upload proof of payment for an order
 * POST /api/orders/:id/upload-proof
 * Requires: image file OR text reference data
 */
exports.uploadProof = async (req, res) => {
  try {
    const { id } = req.params;
    const { transactionReference, accountName } = req.body;
    const order = await Order.findById(id);

    if (!order) {
      return res.status(404).json({
        success: false,
        message: 'Order not found'
      });
    }

    // Validate order can accept proof upload
    if (order.paymentMethod !== 'e-wallet') {
      return res.status(400).json({
        success: false,
        message: 'Payment proof only applies to e-wallet orders'
      });
    }

    if (!['dine_in', 'takeout', 'delivery'].includes(order.fulfillmentType) || 
        order.fulfillmentType === 'dine_in') {
      return res.status(400).json({
        success: false,
        message: 'Payment proof only required for takeout/delivery orders'
      });
    }

    // Initialize proofOfPayment if not exists
    if (!order.proofOfPayment) {
      order.proofOfPayment = {};
    }

    // Handle image upload
    if (req.file) {
      // Store relative path for serving via static middleware
      order.proofOfPayment.imageUrl = `/uploads/payment-proofs/${req.file.filename}`;
    }

    // Handle text reference
    if (transactionReference) {
      order.proofOfPayment.transactionReference = transactionReference;
    }

    if (accountName) {
      order.proofOfPayment.accountName = accountName;
    }

    // Validate at least one proof method is provided
    if (!order.proofOfPayment.imageUrl && !order.proofOfPayment.transactionReference) {
      return res.status(400).json({
        success: false,
        message: 'Please provide either an image or transaction reference'
      });
    }

    // Set verification status and expiration
    order.proofOfPayment.verificationStatus = 'pending';
    order.proofOfPayment.uploadedAt = new Date();
    
    // Get timeout from settings
    let timeoutMinutes = 120; // Default 2 hours
    try {
      const settings = await Settings.findOne();
      if (settings?.paymentVerification?.timeoutMinutes) {
        timeoutMinutes = settings.paymentVerification.timeoutMinutes;
      }
    } catch (err) {
      console.error('Failed to fetch timeout settings:', err);
      // Continue with default timeout
    }
    
    order.proofOfPayment.expiresAt = new Date(Date.now() + timeoutMinutes * 60 * 1000);

    // Update order status
    order.status = 'pending_payment';

    await order.save();

    // Emit Socket.io event to notify staff of new payment verification request
    const io = req.app.get('io');
    if (io) {
      io.to('staff').emit('newPaymentOrder', {
        orderId: order._id,
        receiptNumber: order.receiptNumber,
        customerName: order.customerName,
        total: order.totals.total,
        expiresAt: order.proofOfPayment.expiresAt,
        paymentMethod: order.paymentDetails?.eWalletProvider || 'e-wallet'
      });
    }

    res.json({
      success: true,
      message: 'Payment proof uploaded successfully',
      data: {
        orderId: order._id,
        receiptNumber: order.receiptNumber,
        proofOfPayment: order.proofOfPayment,
        expiresAt: order.proofOfPayment.expiresAt
      }
    });
  } catch (error) {
    console.error('Upload proof error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to upload payment proof',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

/**
 * Verify payment and approve order
 * PUT /api/orders/:id/verify-payment
 * Requires: admin or cashier role
 */
exports.verifyPayment = async (req, res) => {
  try {
    console.log('[DEBUG] verifyPayment called with ID:', req.params.id);
    const { id } = req.params;
    const { notes } = req.body;
    const verifiedBy = req.user._id; // From auth middleware

    const order = await Order.findById(id);
    console.log('[DEBUG] Order found:', order ? order.receiptNumber : 'NOT FOUND');
    console.log('[DEBUG] Order status:', order?.status);
    console.log('[DEBUG] Order proofOfPayment:', order?.proofOfPayment?.verificationStatus);

    if (!order) {
      return res.status(404).json({
        success: false,
        message: 'Order not found'
      });
    }

    // Allow verification of orders even if expired or in different status
    // Just ensure there's proof of payment data
    if (!order.proofOfPayment) {
      return res.status(400).json({
        success: false,
        message: 'No proof of payment found'
      });
    }

    // Verify the payment
    order.proofOfPayment.verificationStatus = 'verified';
    order.proofOfPayment.verifiedBy = verifiedBy;
    order.proofOfPayment.verifiedAt = new Date();
    
    if (notes) {
      order.proofOfPayment.verificationNotes = notes;
    }

    // Update order status to "received" to enter the normal workflow
    // proofOfPayment.verificationStatus tracks payment verification separately
    order.status = 'received';

    await order.save();

    // Emit Socket.io event for real-time updates
    const io = req.app.get('io');
    if (io) {
      // Notify customer tracking this order
      io.to(`order-${order._id}`).emit('paymentVerified', {
        orderId: order._id,
        receiptNumber: order.receiptNumber,
        status: order.status,
        verifiedAt: order.proofOfPayment.verifiedAt
      });
      
      // Notify all staff/cashiers
      io.to('staff').emit('orderVerified', {
        orderId: order._id,
        receiptNumber: order.receiptNumber,
        status: order.status
      });
    }

    res.json({
      success: true,
      message: 'Payment verified successfully',
      data: {
        orderId: order._id,
        receiptNumber: order.receiptNumber,
        status: order.status,
        verifiedAt: order.proofOfPayment.verifiedAt
      }
    });
  } catch (error) {
    console.error('Verify payment error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to verify payment',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

/**
 * Reject payment with reason
 * PUT /api/orders/:id/reject-payment
 * Requires: admin or cashier role
 */
exports.rejectPayment = async (req, res) => {
  try {
    console.log('[DEBUG] rejectPayment called with ID:', req.params.id);
    const { id } = req.params;
    const { reason } = req.body;
    const verifiedBy = req.user._id;

    console.log('[DEBUG] Rejection reason:', reason);

    if (!reason) {
      return res.status(400).json({
        success: false,
        message: 'Rejection reason is required'
      });
    }

    const order = await Order.findById(id);
    console.log('[DEBUG] Order found for rejection:', order ? order.receiptNumber : 'NOT FOUND');
    console.log('[DEBUG] Order status for rejection:', order?.status);

    if (!order) {
      return res.status(404).json({
        success: false,
        message: 'Order not found'
      });
    }

    // Allow rejection of orders even if expired or in different status
    // Just ensure there's proof of payment data
    if (!order.proofOfPayment) {
      return res.status(400).json({
        success: false,
        message: 'No proof of payment found'
      });
    }

    // Reject the payment
    order.proofOfPayment.verificationStatus = 'rejected';
    order.proofOfPayment.rejectionReason = reason;
    order.proofOfPayment.verifiedBy = verifiedBy;
    order.proofOfPayment.verifiedAt = new Date();
    order.status = 'cancelled';

    await order.save();

    // Emit Socket.io event for real-time updates
    const io = req.app.get('io');
    if (io) {
      // Notify customer tracking this order
      io.to(`order-${order._id}`).emit('paymentRejected', {
        orderId: order._id,
        receiptNumber: order.receiptNumber,
        status: order.status,
        reason: reason
      });
      
      // Notify all staff/cashiers
      io.to('staff').emit('orderRejected', {
        orderId: order._id,
        receiptNumber: order.receiptNumber,
        reason: reason
      });
    }

    res.json({
      success: true,
      message: 'Payment rejected',
      data: {
        orderId: order._id,
        receiptNumber: order.receiptNumber,
        status: order.status,
        rejectionReason: reason
      }
    });
  } catch (error) {
    console.error('Reject payment error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to reject payment',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

/**
 * Get all orders pending payment verification
 * GET /api/orders/pending-verification
 * Requires: admin or cashier role
 */
exports.getPendingVerification = async (req, res) => {
  try {
    const { paymentMethod, startDate, endDate, verificationStatus } = req.query;

    // Build query - support filtering by verification status
    const query = {
      $or: [
        // E-wallet manual payment orders
        {
          paymentMethod: 'e-wallet', // Only e-wallet orders
          $or: [
            { status: 'pending_payment' },
            { 'proofOfPayment.verificationStatus': 'verified' },
            { status: 'cancelled', 'proofOfPayment.verificationStatus': 'rejected' }
          ]
        },
        // PayMongo orders that are verified but need receipt generation
        {
          paymentMethod: { $regex: /^paymongo_/ }, // PayMongo orders (paymongo_gcash, paymongo_paymaya, etc.)
          status: 'paymongo_verified' // Custom status for PayMongo orders awaiting receipt
        }
      ]
    };

    // Filter by verification status if provided
    if (verificationStatus && ['pending', 'verified', 'rejected'].includes(verificationStatus)) {
      if (verificationStatus === 'pending') {
        // Only show pending manual payment orders
        query.$or = [
          {
            paymentMethod: 'e-wallet',
            status: 'pending_payment',
            'proofOfPayment.verificationStatus': 'pending'
          }
        ];
      } else if (verificationStatus === 'verified') {
        // Show both verified manual payments and PayMongo orders
        query.$or = [
          {
            paymentMethod: 'e-wallet',
            'proofOfPayment.verificationStatus': 'verified'
          },
          {
            paymentMethod: { $regex: /^paymongo_/ },
            status: 'paymongo_verified'
          }
        ];
      } else if (verificationStatus === 'rejected') {
        // Only show rejected manual payment orders
        query.$or = [
          {
            paymentMethod: 'e-wallet',
            status: 'cancelled',
            'proofOfPayment.verificationStatus': 'rejected'
          }
        ];
      }
    }

    // Filter by payment method if provided
    if (paymentMethod && ['gcash', 'paymaya'].includes(paymentMethod.toLowerCase())) {
      query['paymentDetails.eWalletProvider'] = paymentMethod.toLowerCase();
    }

    // Filter by date range if provided
    if (startDate || endDate) {
      query.createdAt = {};
      if (startDate) query.createdAt.$gte = new Date(startDate);
      if (endDate) query.createdAt.$lte = new Date(endDate);
    }

    const orders = await Order.find(query)
      .sort({ 'proofOfPayment.expiresAt': 1 }) // Sort by urgency (expiring soon first)
      .select('-__v')
      .lean();

    // Calculate time remaining for each order
    const now = new Date();
    const ordersWithTimeRemaining = orders.map(order => {
      // PayMongo orders don't have expiration times since they're already paid
      if (order.paymentMethod && order.paymentMethod.startsWith('paymongo_')) {
        return {
          ...order,
          timeRemaining: null, // No time limit for PayMongo orders
          isUrgent: false, // Not urgent since payment is already completed
          isPayMongoOrder: true // Flag to identify PayMongo orders in frontend
        };
      }
      
      // Manual payment orders with expiration times
      return {
        ...order,
        timeRemaining: Math.max(0, Math.floor((new Date(order.proofOfPayment.expiresAt) - now) / 60000)), // minutes
        isUrgent: (new Date(order.proofOfPayment.expiresAt) - now) < 15 * 60 * 1000, // < 15 minutes
        isPayMongoOrder: false
      };
    });

    res.json({
      success: true,
      count: ordersWithTimeRemaining.length,
      data: ordersWithTimeRemaining
    });
  } catch (error) {
    console.error('Get pending verification error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch pending orders',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

/**
 * Get verification status for a specific order
 * GET /api/orders/:id/verification-status
 * Public endpoint (customer can check their order)
 */
exports.getVerificationStatus = async (req, res) => {
  try {
    const { id } = req.params;

    const order = await Order.findById(id)
      .select('receiptNumber status proofOfPayment createdAt')
      .lean();

    if (!order) {
      return res.status(404).json({
        success: false,
        message: 'Order not found'
      });
    }

    // Calculate time remaining
    let timeRemaining = null;
    if (order.proofOfPayment && order.proofOfPayment.expiresAt) {
      const now = new Date();
      timeRemaining = Math.max(0, Math.floor((new Date(order.proofOfPayment.expiresAt) - now) / 60000));
    }

    res.json({
      success: true,
      data: {
        orderId: order._id,
        receiptNumber: order.receiptNumber,
        status: order.status,
        verificationStatus: order.proofOfPayment?.verificationStatus || 'not_submitted',
        timeRemaining,
        verifiedAt: order.proofOfPayment?.verifiedAt,
        rejectionReason: order.proofOfPayment?.rejectionReason
      }
    });
  } catch (error) {
    console.error('Get verification status error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch order status',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

/**
 * Process PayMongo verified order (generate receipt and move to kitchen)
 * POST /api/orders/:id/process-paymongo
 * Requires: admin or cashier role
 */
exports.processPayMongoOrder = async (req, res) => {
  try {
    const { id } = req.params;

    const order = await Order.findById(id);
    if (!order) {
      return res.status(404).json({
        success: false,
        message: 'Order not found'
      });
    }

    // Verify this is a PayMongo order in the correct status
    if (!order.paymentMethod.startsWith('paymongo_') || order.status !== 'paymongo_verified') {
      return res.status(400).json({
        success: false,
        message: 'Order is not a verified PayMongo order'
      });
    }

    // Move order to kitchen workflow
    order.status = 'received';
    order.processedAt = new Date();
    order.processedBy = req.user.id;
    
    await order.save();

    // Emit Socket.IO event for real-time updates
    const io = req.app.get('io');
    if (io) {
      const eventData = {
        orderId: order._id,
        receiptNumber: order.receiptNumber,
        status: order.status,
        paymentMethod: order.paymentMethod,
        processedAt: order.processedAt
      };
      
      io.emit('orderProcessed', eventData);
    }

    res.json({
      success: true,
      message: 'PayMongo order processed successfully',
      data: {
        orderId: order._id,
        receiptNumber: order.receiptNumber,
        status: order.status,
        processedAt: order.processedAt
      }
    });
  } catch (error) {
    console.error('Process PayMongo order error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to process PayMongo order',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};
