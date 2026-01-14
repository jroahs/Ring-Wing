const express = require('express');
const router = express.Router();
const paymongoService = require('../services/paymongoService');
const Order = require('../models/Order');
const { auth } = require('../middleware/authMiddleware');
const { logger } = require('../config/logger');
const SocketService = require('../services/socketService');

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

    // PayMongo is now available for all order types (dine_in, takeout, delivery)
    // This enables Pay First support for Dine-In orders

    // Prepare order data for PayMongo
    const orderData = {
      orderId: order._id.toString(),
      orderReference: order.receiptNumber,
      orderType: order.orderType || 'self_checkout',
      fulfillmentType: order.fulfillmentType,
      total: parseFloat(order.totals.total),
      items: order.items.map(item => {
        // Calculate item price including variant and add-ons
        let itemPrice = parseFloat(item.price) || 0;
        
        // Add variant price adjustment
        if (item.variant?.priceAdjustment) {
          itemPrice += parseFloat(item.variant.priceAdjustment);
        }
        
        // Add add-ons prices
        if (item.addOns?.length > 0) {
          const addOnsTotal = item.addOns.reduce((sum, addon) => sum + (parseFloat(addon.price) || 0), 0);
          itemPrice += addOnsTotal;
        }
        
        // Build description with variant and add-ons
        let description = item.selectedSize ? `Size: ${item.selectedSize}` : '';
        if (item.variant?.name) {
          description += (description ? ', ' : '') + `Flavor: ${item.variant.name}`;
        }
        if (item.addOns?.length > 0) {
          const addOnNames = item.addOns.map(a => a.name).join(', ');
          description += (description ? ', ' : '') + `Add-ons: ${addOnNames}`;
        }
        
        return {
          name: item.name,
          price: itemPrice,
          quantity: parseInt(item.quantity),
          selectedSize: item.selectedSize,
          description: description || undefined
        };
      })
    };

    logger.info('Creating PayMongo checkout session for order:', {
      orderId: order._id,
      receiptNumber: order.receiptNumber,
      total: orderData.total,
      fulfillmentType: order.fulfillmentType
    });

    // Create checkout session
    const session = await paymongoService.createCheckoutSession(orderData);

    // Update order with PayMongo session information
    order.paymentGateway = {
      provider: 'paymongo',
      sessionId: session.id,
      checkoutUrl: session.checkout_url,
      createdAt: new Date(),
      status: 'pending'
    };
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

    // Verify webhook signature (required)
    if (!process.env.PAYMONGO_WEBHOOK_SECRET) {
      logger.error('PAYMONGO_WEBHOOK_SECRET not configured - refusing webhook');
      return res.status(500).json({ error: 'Webhook not configured' });
    }

    if (!signature) {
      logger.error('Missing PayMongo webhook signature');
      return res.status(400).json({ error: 'Missing signature' });
    }

    if (!paymongoService.verifyWebhookSignature(payload.toString(), signature)) {
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
    // PayMongo docs list `checkout_session.payment.paid` as the Checkout webhook.
    // If webhooks are delayed/misconfigured, clients can call finalize-session after redirect.
    const isPaidEvent = parsedEvent.type === 'checkout_session.payment.paid';

    if (isPaidEvent) {
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
      order.status = 'paymongo_verified';
      order.paymentMethod = 'paymongo';
      
      if (!order.paymentGateway) {
        order.paymentGateway = {};
      }
      
      order.paymentGateway.transactionId = sessionData.id;
      order.paymentGateway.rawPaymentStatus = 'paid';
      order.paymentGateway.status = 'paid';
      order.paymentGateway.paidAt = new Date();
      order.paymentGateway.webhookReceived = true;
      
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
          paymentMethod: 'paymongo',
          status: order.status,
          transactionId: sessionData.id,
          verifiedAt: new Date()
        };

        // Notify staff (POS systems)
        io.to('staff').emit('paymentVerified', eventData);
        
        // Notify customer tracking this order
        io.to(`order-${order._id}`).emit('paymentVerified', eventData);

        // Staff-facing realtime update for POS order lists
        SocketService.emitOrderUpdated(io, order.toObject(), {
          changedFields: ['status', 'paymentMethod', 'paymentGateway'],
          reason: 'paymongoWebhookPaid'
        });

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
          order.paymentGateway.status = 'failed';
          order.paymentGateway.rawPaymentStatus = 'failed';
          order.paymentGateway.failedAt = new Date();
          order.paymentGateway.webhookReceived = true;
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
 * Finalize a checkout session by retrieving it from PayMongo and updating the matching order.
 * This is a safe fallback when webhooks are delayed/misconfigured.
 * POST /api/paymongo/finalize-session
 * Body: { sessionId }
 */
router.post('/finalize-session', async (req, res) => {
  try {
    const { sessionId } = req.body || {};

    if (!sessionId) {
      return res.status(400).json({
        success: false,
        message: 'Session ID is required'
      });
    }

    let session;
    try {
      session = await paymongoService.retrieveCheckoutSession(sessionId);
    } catch (retrieveError) {
      logger.error('Failed to retrieve PayMongo session:', {
        sessionId,
        error: retrieveError?.message,
        stack: retrieveError?.stack
      });

      const details = retrieveError?.message || 'Unknown error';
      return res.status(502).json({
        success: false,
        message: `Failed to retrieve session from PayMongo: ${details}`,
        error: details
      });
    }
    const paymentStatus = session.payment_status;
    const derivedPaymentStatus =
      session?.payment_status ||
      session?.status ||
      session?.payment_intent?.status ||
      session?.payment_intent?.attributes?.status ||
      session?.payments?.[0]?.status ||
      session?.payments?.[0]?.attributes?.status;

    const derivedMetadata =
      session?.metadata ||
      session?.payment_intent?.metadata ||
      session?.payment_intent?.attributes?.metadata ||
      session?.payments?.[0]?.metadata ||
      session?.payments?.[0]?.attributes?.metadata;

    const orderId = derivedMetadata?.order_id || derivedMetadata?.orderId;

    // Prefer metadata mapping, but fall back to sessionId lookup for resilience.
    const order = orderId
      ? await Order.findById(orderId)
      : await Order.findOne({ 'paymentGateway.sessionId': String(sessionId) });

    if (!order) {
      return res.status(404).json({
        success: false,
        message: orderId
          ? 'Order not found'
          : 'Order not found for this sessionId'
      });
    }

    // Ensure the session belongs to this order (prevents mismatched updates)
    if (order.paymentGateway?.sessionId && String(order.paymentGateway.sessionId) !== String(sessionId)) {
      return res.status(400).json({
        success: false,
        message: 'Session does not match order'
      });
    }

    if (derivedPaymentStatus !== 'paid') {
      return res.status(400).json({
        success: false,
        message: `Session not paid (status: ${derivedPaymentStatus || 'unknown'})`
      });
    }

    order.status = 'paymongo_verified';
    order.paymentMethod = 'paymongo';
    order.paymentGateway = {
      ...(order.paymentGateway || {}),
      provider: 'paymongo',
      sessionId: sessionId,
      status: 'paid',
      rawPaymentStatus: derivedPaymentStatus || null,
      paidAt: new Date(),
      authorizedAt: order.paymentGateway?.authorizedAt || undefined
    };

    await order.save();

    const io = req.app.get('io');
    if (io) {
      const eventData = {
        orderId: order._id,
        receiptNumber: order.receiptNumber,
        paymentMethod: 'paymongo',
        status: order.status,
        transactionId: order.paymentGateway?.transactionId,
        verifiedAt: new Date()
      };

      io.to('staff').emit('paymentVerified', eventData);
      io.to(`order-${order._id}`).emit('paymentVerified', eventData);

      SocketService.emitOrderUpdated(io, order.toObject(), {
        changedFields: ['status', 'paymentMethod', 'paymentGateway'],
        reason: 'paymongoFinalizeSession'
      });
    }

    return res.json({
      success: true,
      message: 'Session finalized and order verified',
      data: {
        orderId: order._id,
        receiptNumber: order.receiptNumber,
        status: order.status
      }
    });
  } catch (error) {
    logger.error('Finalize session error:', {
      error: error.message,
      stack: error.stack
    });

    return res.status(500).json({
      success: false,
      message: 'Failed to finalize session',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
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

    const derivedPaymentStatus =
      session?.payment_status ||
      session?.status ||
      session?.payment_intent?.status ||
      session?.payment_intent?.attributes?.status ||
      session?.payments?.[0]?.status ||
      session?.payments?.[0]?.attributes?.status;

    const derivedMetadata =
      session?.metadata ||
      session?.payment_intent?.metadata ||
      session?.payment_intent?.attributes?.metadata ||
      session?.payments?.[0]?.metadata ||
      session?.payments?.[0]?.attributes?.metadata;
    
    res.json({
      success: true,
      data: {
        status: derivedPaymentStatus || session.payment_status,
        orderId: derivedMetadata?.order_id || derivedMetadata?.orderId,
        paymentMethod: session.payment_method_used?.type || session.payment_method_used?.attributes?.type,
        amount: session.amount || session.amount_total || session.total_amount,
        currency: session.currency || session.currency_code
      }
    });
  } catch (error) {
    logger.error('Session verification error:', {
      sessionId: req.params.sessionId,
      error: error.message
    });
    
    res.status(502).json({
      success: false,
      message: `Failed to verify session: ${error.message}`
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

/**
 * TEST-ONLY: Force-mark a PayMongo order as verified/paid.
 *
 * Useful when you're using PayMongo test keys and you manually set a payment as "authorized"
 * in the PayMongo dashboard, but no `checkout_session.payment.paid` webhook is emitted.
 *
 * POST /api/paymongo/test/override-paid
 * Header: x-paymongo-test-override: true
 * Body: { orderId }
 */
module.exports = router;