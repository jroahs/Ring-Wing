const express = require('express');
const router = express.Router();
const paymongoService = require('../services/paymongoService');
const Order = require('../models/Order');
const { auth } = require('../middleware/authMiddleware');
const { logger } = require('../config/logger');

/**
 * Create PayMongo checkout session
 * POST /api/paymongo/create-checkout
 * Body: { orderId }
 */
router.post('/create-checkout', async (req, res) => {
  try {
    console.log('PayMongo create-checkout called with body:', req.body);
    
    const { orderId } = req.body;
    
    if (!orderId) {
      console.log('PayMongo error: No orderId provided');
      return res.status(400).json({ 
        success: false, 
        message: 'Order ID is required' 
      });
    }

    // Get order from database
    console.log('Looking for order with ID:', orderId);
    const order = await Order.findById(orderId);
    if (!order) {
      console.log('PayMongo error: Order not found for ID:', orderId);
      return res.status(404).json({ 
        success: false, 
        message: 'Order not found' 
      });
    }

    console.log('Order found:', {
      id: order._id,
      receiptNumber: order.receiptNumber,
      fulfillmentType: order.fulfillmentType,
      total: order.totals.total
    });

    // Validate order can use PayMongo
    if (order.fulfillmentType === 'dine_in') {
      return res.status(400).json({
        success: false,
        message: 'PayMongo payment not available for dine-in orders'
      });
    }

    // Prepare order data for PayMongo
    const orderData = {
      orderId: order._id.toString(),
      orderReference: order.receiptNumber,
      orderType: order.orderType || 'self_checkout',
      fulfillmentType: order.fulfillmentType,
      total: parseFloat(order.totals.total),
      items: order.items.map(item => ({
        name: item.name,
        price: parseFloat(item.price),
        quantity: parseInt(item.quantity),
        selectedSize: item.selectedSize
      }))
    };

    logger.info('Creating PayMongo checkout session for order:', {
      orderId: order._id,
      receiptNumber: order.receiptNumber,
      total: orderData.total,
      fulfillmentType: order.fulfillmentType
    });

    console.log('Using PayMongo TEST mode (test keys for development)');

    // Create checkout session with live keys
    const session = await paymongoService.createCheckoutSession(orderData);

    // Update order with PayMongo session information
    order.paymentGateway = {
      provider: 'paymongo',
      sessionId: session.id,
      checkoutUrl: session.checkout_url,
      createdAt: new Date()
    };
    
    // FOR TESTING: In test mode, immediately set order as verified since webhooks won't work locally
    if (process.env.PAYMONGO_SECRET_KEY && process.env.PAYMONGO_SECRET_KEY.includes('test')) {
      console.log('[TEST MODE] Automatically verifying PayMongo order for testing');
      order.status = 'paymongo_verified';
      order.paymentMethod = 'paymongo_gcash';
      order.paymentGateway.paymentStatus = 'paid';
      order.paymentGateway.verificationStatus = 'auto_verified';
      order.paymentGateway.paidAt = new Date();
    }
    
    await order.save();

    logger.info('PayMongo checkout session created successfully:', {
      orderId: order._id,
      sessionId: session.id,
      checkoutUrl: session.checkout_url
    });

    res.json({
      success: true,
      data: {
        checkout_url: session.checkout_url,
        session_id: session.id,
        order_id: order._id
      }
    });
  } catch (error) {
    logger.error('Create checkout error:', {
      error: error.message,
      stack: error.stack,
      orderId: req.body.orderId
    });
    
    res.status(500).json({
      success: false,
      message: 'Failed to create checkout session',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
});

/**
 * Handle PayMongo webhooks
 * POST /api/paymongo/webhook
 * Raw body with PayMongo signature verification
 */
router.post('/webhook', express.raw({ type: 'application/json' }), async (req, res) => {
  try {
    const signature = req.headers['paymongo-signature'];
    const payload = req.body;

    logger.info('PayMongo webhook received:', {
      signature: signature ? 'Present' : 'Missing',
      payloadSize: payload.length,
      headers: req.headers
    });

    // Verify webhook signature
    if (signature && !paymongoService.verifyWebhookSignature(payload.toString(), signature)) {
      logger.error('Invalid PayMongo webhook signature');
      return res.status(400).json({ error: 'Invalid signature' });
    }

    // Parse webhook event
    const event = JSON.parse(payload);
    const parsedEvent = paymongoService.parseWebhookEvent(event);
    
    if (!parsedEvent) {
      logger.error('Failed to parse PayMongo webhook event');
      return res.status(400).json({ error: 'Invalid event format' });
    }

    logger.info('Processing PayMongo webhook event:', {
      type: parsedEvent.type,
      eventId: parsedEvent.eventId
    });

    // Handle checkout session payment success
    if (parsedEvent.type === 'checkout_session.payment.paid') {
      const sessionData = parsedEvent.data;
      const orderId = sessionData.attributes.metadata?.order_id;

      if (!orderId) {
        logger.error('No order ID found in webhook metadata');
        return res.status(400).json({ error: 'Missing order ID in metadata' });
      }

      // Find and update order
      const order = await Order.findById(orderId);
      if (!order) {
        logger.error('Order not found for PayMongo webhook:', { orderId });
        return res.status(404).json({ error: 'Order not found' });
      }

      // Update order status and payment information
      // Set status to 'paymongo_verified' so it appears in POS for receipt generation
      order.status = 'paymongo_verified'; // Custom status for PayMongo orders awaiting receipt
      order.paymentMethod = 'paymongo_gcash';
      
      if (!order.paymentGateway) {
        order.paymentGateway = {};
      }
      
      order.paymentGateway.transactionId = sessionData.id;
      order.paymentGateway.paidAt = new Date();
      order.paymentGateway.paymentStatus = 'paid';
      order.paymentGateway.paymentMethodUsed = paymongoService.getPaymentMethodType(sessionData.attributes);
      order.paymentGateway.verificationStatus = 'auto_verified'; // Mark as auto-verified
      
      await order.save();

      logger.info('PayMongo payment verified and order updated:', {
        orderId: order._id,
        receiptNumber: order.receiptNumber,
        transactionId: sessionData.id,
        status: order.status
      });

      // Emit Socket.IO event for real-time updates
      const io = req.app.get('io');
      if (io) {
        const eventData = {
          orderId: order._id,
          receiptNumber: order.receiptNumber,
          paymentMethod: 'paymongo_gcash',
          status: order.status,
          transactionId: sessionData.id,
          verifiedAt: new Date()
        };

        // Notify staff (POS systems)
        io.to('staff').emit('paymentVerified', eventData);
        
        // Notify customer tracking this order
        io.to(`order-${order._id}`).emit('paymentVerified', eventData);

        logger.info('Socket.IO events emitted for PayMongo payment verification:', {
          orderId: order._id,
          receiptNumber: order.receiptNumber
        });
      }
    }

    // Handle other webhook events if needed in the future
    else if (parsedEvent.type === 'checkout_session.payment.failed') {
      const sessionData = parsedEvent.data;
      const orderId = sessionData.attributes.metadata?.order_id;
      
      if (orderId) {
        const order = await Order.findById(orderId);
        if (order && order.paymentGateway) {
          order.paymentGateway.paymentStatus = 'failed';
          order.paymentGateway.failedAt = new Date();
          await order.save();
          
          logger.warn('PayMongo payment failed for order:', {
            orderId: order._id,
            receiptNumber: order.receiptNumber
          });
        }
      }
    }

    res.json({ received: true });
  } catch (error) {
    logger.error('PayMongo webhook processing error:', {
      error: error.message,
      stack: error.stack
    });
    
    res.status(500).json({ error: 'Webhook processing failed' });
  }
});

/**
 * Verify payment session (for success page)
 * GET /api/paymongo/verify-session/:sessionId
 */
router.get('/verify-session/:sessionId', async (req, res) => {
  try {
    const { sessionId } = req.params;
    
    if (!sessionId) {
      return res.status(400).json({
        success: false,
        message: 'Session ID is required'
      });
    }

    logger.info('Verifying PayMongo session:', { sessionId });

    const session = await paymongoService.retrieveCheckoutSession(sessionId);
    
    res.json({
      success: true,
      data: {
        status: session.payment_status,
        orderId: session.metadata?.order_id,
        paymentMethod: session.payment_method_used?.type,
        amount: session.amount,
        currency: session.currency
      }
    });
  } catch (error) {
    logger.error('Session verification error:', {
      sessionId: req.params.sessionId,
      error: error.message
    });
    
    res.status(500).json({
      success: false,
      message: 'Failed to verify session'
    });
  }
});

/**
 * Get PayMongo configuration status
 * GET /api/paymongo/status
 */
router.get('/status', async (req, res) => {
  try {
    const hasSecretKey = !!process.env.PAYMONGO_SECRET_KEY;
    const hasPublicKey = !!process.env.PAYMONGO_PUBLIC_KEY;
    const isTestMode = process.env.PAYMONGO_SECRET_KEY?.startsWith('sk_test_');
    
    res.json({
      success: true,
      data: {
        configured: hasSecretKey && hasPublicKey,
        testMode: isTestMode,
        webhookConfigured: !!process.env.PAYMONGO_WEBHOOK_SECRET
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to get PayMongo status'
    });
  }
});

module.exports = router;