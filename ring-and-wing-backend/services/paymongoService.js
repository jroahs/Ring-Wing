const axios = require('axios');
const crypto = require('crypto');

class PayMongoService {
  constructor() {
    this.secretKey = process.env.PAYMONGO_SECRET_KEY;
    this.publicKey = process.env.PAYMONGO_PUBLIC_KEY;
    this.baseURL = 'https://api.paymongo.com/v1';
    this.webhookSecret = process.env.PAYMONGO_WEBHOOK_SECRET;
    
    // Validate required environment variables
    if (!this.secretKey) {
      throw new Error('PAYMONGO_SECRET_KEY is required');
    }
    if (!this.publicKey) {
      throw new Error('PAYMONGO_PUBLIC_KEY is required');
    }
    
    console.log('PayMongo Service initialized with TEST API keys for testing');
  }

  /**
   * Create a checkout session for GCash payment
   * @param {Object} orderData - Order information
   * @returns {Promise<Object>} Checkout session data
   */
  async createCheckoutSession(orderData) {
    try {
      console.log('Creating PayMongo checkout session (TEST MODE) for order:', orderData.orderReference);
      
      const response = await axios.post(`${this.baseURL}/checkout_sessions`, {
        data: {
          attributes: {
            line_items: orderData.items.map(item => ({
              name: item.name,
              amount: Math.round(item.price * item.quantity * 100), // Convert to centavos
              currency: 'PHP',
              quantity: 1, // PayMongo handles quantity in amount calculation
              description: `${item.quantity}x ${item.name}${item.selectedSize ? ` (${item.selectedSize})` : ''}`
            })),
            payment_method_types: ['gcash', 'paymaya'], // Support both GCash and PayMaya
            success_url: `${process.env.FRONTEND_URL}/self-checkout/success?session_id={CHECKOUT_SESSION_ID}`,
            cancel_url: `${process.env.FRONTEND_URL}/self-checkout/cancel`,
            description: `Ring & Wing Order - ${orderData.orderType}`,
            reference_number: orderData.orderReference,
            metadata: {
              order_id: orderData.orderId,
              order_type: orderData.orderType,
              total_amount: orderData.total.toString(),
              fulfillment_type: orderData.fulfillmentType || 'takeout',
              mode: 'live' // Always live mode
            }
          }
        }
      }, {
        headers: {
          'Authorization': `Basic ${Buffer.from(this.secretKey + ':').toString('base64')}`,
          'Content-Type': 'application/json'
        }
      });

      console.log('PayMongo checkout session created successfully:', response.data.data.id);
      
      // Return the structure expected by the route
      return {
        id: response.data.data.id,
        checkout_url: response.data.data.attributes.checkout_url,
        client_key: response.data.data.attributes.client_key,
        ...response.data.data.attributes
      };
    } catch (error) {
      console.error('PayMongo checkout session creation failed:', {
        message: error.message,
        response: error.response?.data,
        status: error.response?.status
      });
      throw new Error('Failed to create checkout session: ' + (error.response?.data?.errors?.[0]?.detail || error.message));
    }
  }

  /**
   * Verify webhook signature for security
   * @param {string} payload - Raw webhook payload
   * @param {string} signature - PayMongo signature header
   * @returns {boolean} True if signature is valid
   */
  verifyWebhookSignature(payload, signature) {
    try {
      if (!this.webhookSecret) {
        console.warn('PAYMONGO_WEBHOOK_SECRET not set, skipping signature verification');
        return true; // Allow for testing without webhook secret
      }

      const expectedSignature = crypto
        .createHmac('sha256', this.webhookSecret)
        .update(payload)
        .digest('hex');
      
      // PayMongo signature format: sha256=<signature>
      const receivedSignature = signature.replace('sha256=', '');
      
      return crypto.timingSafeEqual(
        Buffer.from(receivedSignature, 'hex'),
        Buffer.from(expectedSignature, 'hex')
      );
    } catch (error) {
      console.error('Webhook signature verification failed:', error.message);
      return false;
    }
  }

  /**
   * Retrieve checkout session details
   * @param {string} sessionId - Checkout session ID
   * @returns {Promise<Object>} Session details
   */
  async retrieveCheckoutSession(sessionId) {
    try {
      console.log('Retrieving PayMongo checkout session:', sessionId);
      
      const response = await axios.get(`${this.baseURL}/checkout_sessions/${sessionId}`, {
        headers: {
          'Authorization': `Basic ${Buffer.from(this.secretKey + ':').toString('base64')}`
        }
      });
      
      return response.data.data.attributes;
    } catch (error) {
      console.error('Failed to retrieve checkout session:', {
        sessionId,
        message: error.message,
        response: error.response?.data
      });
      throw new Error('Failed to retrieve checkout session: ' + (error.response?.data?.errors?.[0]?.detail || error.message));
    }
  }

  /**
   * Parse and validate webhook event
   * @param {Object} event - Webhook event data
   * @returns {Object|null} Parsed event data or null if invalid
   */
  parseWebhookEvent(event) {
    try {
      if (!event.data || !event.data.attributes) {
        console.error('Invalid webhook event structure');
        return null;
      }

      const eventType = event.data.attributes.type;
      const eventData = event.data.attributes.data;

      console.log('Processing PayMongo webhook event:', {
        type: eventType,
        id: event.data.id,
        created: event.data.attributes.created_at
      });

      return {
        type: eventType,
        data: eventData,
        eventId: event.data.id,
        createdAt: event.data.attributes.created_at
      };
    } catch (error) {
      console.error('Failed to parse webhook event:', error.message);
      return null;
    }
  }

  /**
   * Get payment method type from checkout session
   * @param {Object} sessionData - Checkout session data
   * @returns {string} Payment method type
   */
  getPaymentMethodType(sessionData) {
    // For any PayMongo payment, return unified type
    return 'paymongo';
  }
}

module.exports = new PayMongoService();