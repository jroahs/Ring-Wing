# PayMongo GCash Integration Plan
**Project:** Ring & Wing Café POS System  
**Date:** November 7, 2025  
**Status:** Planning Phase  

## 🎯 Project Goal

Integrate PayMongo's GCash checkout flow seamlessly into our Self Checkout (POS) system, ensuring the feature is dynamic and doesn't require recoding whenever menu items are added, edited, or removed.

## 🏗️ System Architecture Overview

### Current System Components
- **MongoDB**: All order and transaction data
- **Manual Payment Verification**: Fully implemented with GCash/PayMaya
- **Socket.IO**: Real-time updates for payment verification
- **Self Checkout**: Complete flow with order type selection
- **POS Integration**: Tablet and desktop POS with verification dashboard
- **Settings Panel**: Merchant wallets configuration with toggles

### Integration Points
- **Existing Order Model**: Already has `proofOfPayment`, `status`, `fulfillmentType` fields
- **Settings Model**: Already has merchant wallets configuration
- **Payment Flow**: Will extend existing manual verification system
- **Real-time Updates**: Will use existing Socket.IO infrastructure

## 📊 System Flow Diagram

```mermaid
graph TD
    A[Customer Accesses Self Checkout] --> B{Order Type Selection}
    
    B --> C[Dine-In<br/>Manual Payment<br/>Traditional Flow]
    B --> D[Takeout/Delivery<br/>Payment Gateway Flow]
    
    D --> E{Gateway Settings Check<br/>MongoDB Settings Collection}
    E --> F[GCash PayMongo: Enabled]
    E --> G[GCash PayMongo: Disabled<br/>Fallback to Manual]
    
    F --> H[PayMongo Checkout Session API<br/>Dynamic Total from Cart]
    H --> I[PayMongo Hosted Page<br/>GCash Payment]
    
    I --> J{Payment Result}
    J --> K[Success]
    J --> L[Cancel/Failure]
    
    K --> M[PayMongo Webhook<br/>checkout_session.payment.paid]
    M --> N[Update Order Status<br/>MongoDB: pending_payment → received]
    N --> O[Socket.IO Broadcast<br/>to('staff').emit('paymentVerified')]
    O --> P[POS Real-time Update<br/>Order appears in Ready Queue]
    
    L --> Q[Return to Self Checkout<br/>Retry Payment Option]
    
    G --> R[Manual Verification Flow<br/>Current System Unchanged]
    
    style H fill:#f96,stroke:#333,stroke-width:2px
    style M fill:#9f6,stroke:#333,stroke-width:2px
    style N fill:#9f6,stroke:#333,stroke-width:2px
    style O fill:#6af,stroke:#333,stroke-width:2px
```

## 🔧 Technical Requirements

### Core Requirements
1. **MongoDB Integration**: Use existing order and transaction data structure
2. **PayMongo Checkout Sessions**: Generate payment link based on computed total from MongoDB
3. **GCash Only**: Focus on GCash payment method as requested
4. **Dynamic Totals**: Read totals from checkout/cart data (not static values)
5. **Webhook Integration**: Listen for `checkout_session.payment.paid` events
6. **Auto Status Update**: Update order status automatically upon payment
7. **Fallback System**: Keep manual verification intact as backup
8. **Real-time Updates**: Use existing Socket.IO for instant notifications

### Settings Panel Configuration
```
Merchant Wallet Configuration

Payment Gateway Integration
┌─────────────────────────────────────┐
│ Manual Verification      [ENABLED] │ (Always available as fallback)
└─────────────────────────────────────┘

┌─────────────────────────────────────┐
│ PayMongo Integration     [ENABLED] │
│ ├─ Mode: [Test ▼]                  │
│ ├─ GCash             [ENABLED]     │
│ └─ PayMaya           [DISABLED]    │
└─────────────────────────────────────┘

When PayMongo is enabled, it overrides manual mode
but keeps manual verification as fallback
```

## 📁 Implementation Plan

### Phase 1: Backend PayMongo Integration (2-3 hours)

#### 1.1 Install Dependencies
```bash
cd ring-and-wing-backend
npm install axios crypto
```

#### 1.2 Environment Configuration
**File**: `.env`
```env
# PayMongo Configuration
PAYMONGO_SECRET_KEY=sk_test_...
PAYMONGO_PUBLIC_KEY=pk_test_...
PAYMONGO_WEBHOOK_SECRET=whsk_...
```

#### 1.3 PayMongo Service
**Create**: `ring-and-wing-backend/services/paymongoService.js`
```javascript
const axios = require('axios');
const crypto = require('crypto');

class PayMongoService {
  constructor() {
    this.secretKey = process.env.PAYMONGO_SECRET_KEY;
    this.publicKey = process.env.PAYMONGO_PUBLIC_KEY;
    this.baseURL = 'https://api.paymongo.com/v1';
    this.webhookSecret = process.env.PAYMONGO_WEBHOOK_SECRET;
  }

  async createCheckoutSession(orderData) {
    try {
      const response = await axios.post(`${this.baseURL}/checkout_sessions`, {
        data: {
          attributes: {
            line_items: orderData.items.map(item => ({
              name: item.name,
              amount: Math.round(item.price * item.quantity * 100), // Convert to centavos
              currency: 'PHP',
              quantity: 1, // PayMongo handles quantity in amount
              description: `${item.quantity}x ${item.name}`
            })),
            payment_method_types: ['gcash'], // GCash only as requested
            success_url: `${process.env.FRONTEND_URL}/self-checkout/success?session_id={CHECKOUT_SESSION_ID}`,
            cancel_url: `${process.env.FRONTEND_URL}/self-checkout/cancel`,
            description: `Ring & Wing Order - ${orderData.orderType}`,
            reference_number: orderData.orderReference,
            metadata: {
              order_id: orderData.orderId,
              order_type: orderData.orderType,
              total_amount: orderData.total
            }
          }
        }
      }, {
        headers: {
          'Authorization': `Basic ${Buffer.from(this.secretKey + ':').toString('base64')}`,
          'Content-Type': 'application/json'
        }
      });

      return response.data.data.attributes;
    } catch (error) {
      console.error('PayMongo checkout session creation failed:', error.response?.data || error.message);
      throw new Error('Failed to create checkout session');
    }
  }

  verifyWebhookSignature(payload, signature) {
    const expectedSignature = crypto
      .createHmac('sha256', this.webhookSecret)
      .update(payload)
      .digest('hex');
    
    return crypto.timingSafeEqual(
      Buffer.from(signature.replace('sha256=', ''), 'hex'),
      Buffer.from(expectedSignature, 'hex')
    );
  }

  async retrieveCheckoutSession(sessionId) {
    try {
      const response = await axios.get(`${this.baseURL}/checkout_sessions/${sessionId}`, {
        headers: {
          'Authorization': `Basic ${Buffer.from(this.secretKey + ':').toString('base64')}`
        }
      });
      return response.data.data.attributes;
    } catch (error) {
      console.error('Failed to retrieve checkout session:', error.response?.data || error.message);
      throw new Error('Failed to retrieve checkout session');
    }
  }
}

module.exports = new PayMongoService();
```

#### 1.4 PayMongo Routes
**Create**: `ring-and-wing-backend/routes/paymongoRoutes.js`
```javascript
const express = require('express');
const router = express.Router();
const paymongoService = require('../services/paymongoService');
const Order = require('../models/Order');
const { auth } = require('../middleware/authMiddleware');

// Create checkout session
router.post('/create-checkout', async (req, res) => {
  try {
    const { orderId } = req.body;
    
    // Get order from database
    const order = await Order.findById(orderId);
    if (!order) {
      return res.status(404).json({ success: false, message: 'Order not found' });
    }

    // Prepare order data for PayMongo
    const orderData = {
      orderId: order._id,
      orderReference: order.receiptNumber,
      orderType: order.fulfillmentType,
      total: order.totals.total,
      items: order.items
    };

    // Create checkout session
    const session = await paymongoService.createCheckoutSession(orderData);

    // Update order with session information
    order.paymentGateway = {
      provider: 'paymongo',
      sessionId: session.id,
      checkoutUrl: session.checkout_url
    };
    await order.save();

    res.json({
      success: true,
      data: {
        checkout_url: session.checkout_url,
        session_id: session.id
      }
    });
  } catch (error) {
    console.error('Create checkout error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create checkout session',
      error: error.message
    });
  }
});

// Handle PayMongo webhooks
router.post('/webhook', express.raw({ type: 'application/json' }), async (req, res) => {
  try {
    const signature = req.headers['paymongo-signature'];
    const payload = req.body;

    // Verify webhook signature
    if (!paymongoService.verifyWebhookSignature(payload, signature)) {
      console.error('Invalid webhook signature');
      return res.status(400).json({ error: 'Invalid signature' });
    }

    const event = JSON.parse(payload);
    
    // Handle checkout session payment success
    if (event.data.attributes.type === 'checkout_session.payment.paid') {
      const sessionData = event.data.attributes.data;
      const orderId = sessionData.attributes.metadata.order_id;

      // Find and update order
      const order = await Order.findById(orderId);
      if (order) {
        order.status = 'received'; // Move to kitchen workflow
        order.paymentGateway.transactionId = sessionData.id;
        order.paymentGateway.paidAt = new Date();
        
        await order.save();

        // Emit Socket.IO event for real-time updates
        const io = req.app.get('io');
        if (io) {
          io.to('staff').emit('paymentVerified', {
            orderId: order._id,
            receiptNumber: order.receiptNumber,
            paymentMethod: 'paymongo_gcash',
            status: order.status
          });
        }

        console.log(`PayMongo payment verified for order: ${order.receiptNumber}`);
      }
    }

    res.json({ received: true });
  } catch (error) {
    console.error('Webhook processing error:', error);
    res.status(500).json({ error: 'Webhook processing failed' });
  }
});

// Verify payment session (for success page)
router.get('/verify-session/:sessionId', async (req, res) => {
  try {
    const { sessionId } = req.params;
    const session = await paymongoService.retrieveCheckoutSession(sessionId);
    
    res.json({
      success: true,
      data: {
        status: session.payment_status,
        orderId: session.metadata.order_id
      }
    });
  } catch (error) {
    console.error('Session verification error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to verify session'
    });
  }
});

module.exports = router;
```

#### 1.5 Update Server Routes
**Modify**: `ring-and-wing-backend/server.js`
```javascript
// Add after existing routes
app.use('/api/paymongo', require('./routes/paymongoRoutes'));
```

### Phase 2: Settings Model Extension (1 hour)

#### 2.1 Update Settings Model
**Modify**: `ring-and-wing-backend/models/Settings.js`
```javascript
// Add after existing merchantWallets section
paymentGateways: {
  paymongo: {
    enabled: { 
      type: Boolean, 
      default: false 
    },
    mode: { 
      type: String, 
      enum: ['test', 'live'], 
      default: 'test' 
    },
    gcashEnabled: { 
      type: Boolean, 
      default: false 
    },
    paymayaEnabled: { 
      type: Boolean, 
      default: false 
    }
  }
}
```

#### 2.2 Update Order Model
**Modify**: `ring-and-wing-backend/models/Order.js`
```javascript
// Add payment gateway tracking
paymentGateway: {
  provider: { 
    type: String, 
    enum: ['manual', 'paymongo'], 
    default: 'manual' 
  },
  sessionId: String,
  checkoutUrl: String,
  transactionId: String,
  paidAt: Date
}
```

#### 2.3 Settings Controller Extension
**Modify**: `ring-and-wing-backend/controllers/merchantWalletController.js`
```javascript
// Add PayMongo gateway management functions
exports.updatePaymentGateway = async (req, res) => {
  try {
    const { provider, enabled, mode, gcashEnabled, paymayaEnabled } = req.body;

    if (provider !== 'paymongo') {
      return res.status(400).json({
        success: false,
        message: 'Invalid provider. Only "paymongo" is supported.'
      });
    }

    const settings = await Settings.getSettings();

    // Initialize if doesn't exist
    if (!settings.paymentGateways) {
      settings.paymentGateways = {
        paymongo: { enabled: false, mode: 'test', gcashEnabled: false, paymayaEnabled: false }
      };
    }

    // Update PayMongo settings
    if (enabled !== undefined) {
      settings.paymentGateways.paymongo.enabled = enabled;
    }
    if (mode !== undefined) {
      settings.paymentGateways.paymongo.mode = mode;
    }
    if (gcashEnabled !== undefined) {
      settings.paymentGateways.paymongo.gcashEnabled = gcashEnabled;
    }
    if (paymayaEnabled !== undefined) {
      settings.paymentGateways.paymongo.paymayaEnabled = paymayaEnabled;
    }

    await settings.save();

    res.json({
      success: true,
      message: 'PayMongo settings updated successfully',
      data: settings.paymentGateways.paymongo
    });
  } catch (error) {
    console.error('Update payment gateway error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update payment gateway settings'
    });
  }
};
```

#### 2.4 Add Settings Routes
**Modify**: `ring-and-wing-backend/routes/settingsRoutes.js`
```javascript
// Add after existing routes
router.put('/payment-gateways', auth, isManager, updatePaymentGateway);
```

### Phase 3: Frontend Integration (3-4 hours)

#### 3.1 Update Payment Method Selector
**Modify**: `ring-and-wing-frontend/src/components/PaymentMethodSelector.jsx`
```javascript
// Add PayMongo options when enabled
const [paymentGateways, setPaymentGateways] = useState(null);

useEffect(() => {
  fetchPaymentGateways();
}, []);

const fetchPaymentGateways = async () => {
  try {
    const response = await fetch(`${import.meta.env.VITE_API_URL}/api/settings/payment-gateways`);
    const data = await response.json();
    if (data.success) {
      setPaymentGateways(data.data);
    }
  } catch (error) {
    console.error('Failed to fetch payment gateways:', error);
  }
};

const getPaymentMethods = () => {
  const methods = [];
  
  // PayMongo GCash (if enabled)
  if (paymentGateways?.paymongo?.enabled && paymentGateways?.paymongo?.gcashEnabled) {
    methods.push({
      id: 'paymongo_gcash',
      label: 'GCash (PayMongo)',
      logo: 'G',
      color: '#007DFF',
      type: 'gateway'
    });
  }
  
  // Manual GCash (always available as fallback)
  methods.push({
    id: 'manual_gcash',
    label: 'GCash (Manual Verification)',
    logo: 'G',
    color: '#007DFF',
    type: 'manual'
  });
  
  return methods;
};
```

#### 3.2 Update Self Checkout Flow
**Modify**: `ring-and-wing-frontend/src/SelfCheckout.jsx`
```javascript
// Add PayMongo checkout handling
const handlePayMongoCheckout = async () => {
  try {
    setLoading(true);
    
    // Save order first to get order ID
    const savedOrder = await saveOrderToDB();
    
    if (!savedOrder?.data?._id) {
      throw new Error('Failed to create order');
    }
    
    // Create PayMongo checkout session
    const response = await fetch(`${API_URL}/api/paymongo/create-checkout`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        orderId: savedOrder.data._id
      })
    });
    
    const result = await response.json();
    
    if (result.success) {
      // Redirect to PayMongo hosted checkout
      window.location.href = result.data.checkout_url;
    } else {
      throw new Error(result.message || 'Failed to create checkout session');
    }
  } catch (error) {
    console.error('PayMongo checkout error:', error);
    alert('Payment processing failed. Please try manual verification.');
    setLoading(false);
  }
};

// Update payment method selection handler
const handlePaymentMethodSelect = (method) => {
  setSelectedPaymentMethod(method);
  
  if (method === 'paymongo_gcash') {
    setCurrentStep('confirmPayment');
  } else {
    setCurrentStep('viewPaymentDetails'); // Manual flow
  }
};

// Add payment confirmation step
if (currentStep === 'confirmPayment') {
  return (
    <div style={styles.overlay}>
      <div style={styles.flowContainer}>
        <h2 style={styles.flowTitle}>Confirm Payment</h2>
        
        <div style={{ marginBottom: '20px' }}>
          <p><strong>Payment Method:</strong> GCash via PayMongo</p>
          <p><strong>Total Amount:</strong> ₱{calculateTotal().total.toFixed(2)}</p>
          <p><strong>Order Type:</strong> {fulfillmentType === 'takeout' ? 'Takeout' : 'Delivery'}</p>
        </div>
        
        <div style={{ marginBottom: '20px', padding: '15px', backgroundColor: '#e3f2fd', borderRadius: '8px' }}>
          <p><strong>Next Steps:</strong></p>
          <p>1. Click "Proceed to Payment" to go to PayMongo's secure payment page</p>
          <p>2. Complete your GCash payment</p>
          <p>3. Return here for order confirmation</p>
        </div>
        
        <button 
          onClick={handlePayMongoCheckout}
          disabled={loading}
          style={{
            ...styles.submitButton,
            opacity: loading ? 0.7 : 1
          }}
        >
          {loading ? 'Processing...' : 'Proceed to Payment'}
        </button>
        
        <button 
          onClick={() => setCurrentStep('selectPayment')} 
          style={styles.backButton}
        >
          ← Back to Payment Selection
        </button>
      </div>
    </div>
  );
}
```

#### 3.3 Add Success/Cancel Pages
**Create**: `ring-and-wing-frontend/src/components/PaymentSuccess.jsx`
**Create**: `ring-and-wing-frontend/src/components/PaymentCancel.jsx`

#### 3.4 Update Settings Panel
**Modify**: `ring-and-wing-frontend/src/components/PaymentSettings.jsx`
```javascript
// Add PayMongo Gateway Section
const PaymentGatewaySection = () => (
  <div className="bg-white rounded-lg shadow p-6 mt-6">
    <h2 className="text-xl font-bold mb-6" style={{ color: theme.colors.primary }}>
      Payment Gateway Integration
    </h2>
    
    <div className="space-y-6">
      {/* PayMongo Section */}
      <div className="border rounded-lg p-4" style={{ borderColor: theme.colors.muted }}>
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold" style={{ color: theme.colors.secondary }}>
            PayMongo Integration
          </h3>
          <label className="flex items-center cursor-pointer">
            <input
              type="checkbox"
              checked={settings.paymentGateways?.paymongo?.enabled || false}
              onChange={() => handlePayMongoToggle()}
              className="sr-only"
            />
            <div className={`w-14 h-8 rounded-full transition-colors ${
              settings.paymentGateways?.paymongo?.enabled 
                ? 'bg-green-500' 
                : 'bg-gray-300'
            }`}>
              <div className={`w-6 h-6 bg-white rounded-full shadow-md transform transition-transform ${
                settings.paymentGateways?.paymongo?.enabled 
                  ? 'translate-x-7 translate-y-1' 
                  : 'translate-x-1 translate-y-1'
              }`}></div>
            </div>
            <span className="ml-3 text-sm" style={{ color: theme.colors.primary }}>
              {settings.paymentGateways?.paymongo?.enabled ? 'Enabled' : 'Disabled'}
            </span>
          </label>
        </div>
        
        {settings.paymentGateways?.paymongo?.enabled && (
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-2">Mode</label>
              <select
                value={settings.paymentGateways?.paymongo?.mode || 'test'}
                onChange={(e) => handlePayMongoModeChange(e.target.value)}
                className="w-full px-3 py-2 border rounded-lg"
              >
                <option value="test">Test Mode</option>
                <option value="live">Live Mode</option>
              </select>
            </div>
            
            <div>
              <label className="block text-sm font-medium mb-2">Supported Payment Methods</label>
              <div className="space-y-2">
                <label className="flex items-center">
                  <input
                    type="checkbox"
                    checked={settings.paymentGateways?.paymongo?.gcashEnabled || false}
                    onChange={(e) => handlePayMongoMethodToggle('gcash', e.target.checked)}
                    className="mr-2"
                  />
                  GCash
                </label>
                <label className="flex items-center">
                  <input
                    type="checkbox"
                    checked={settings.paymentGateways?.paymongo?.paymayaEnabled || false}
                    onChange={(e) => handlePayMongoMethodToggle('paymaya', e.target.checked)}
                    className="mr-2"
                    disabled
                  />
                  PayMaya (Coming Soon)
                </label>
              </div>
            </div>
          </div>
        )}
      </div>
      
      {/* Info Box */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <h4 className="font-medium text-blue-900 mb-2">How It Works</h4>
        <ul className="text-sm text-blue-800 space-y-1">
          <li>• When enabled, customers can pay directly through PayMongo's secure payment page</li>
          <li>• Orders are automatically verified upon successful payment</li>
          <li>• Manual verification remains available as fallback</li>
          <li>• Real-time updates notify staff of completed payments</li>
        </ul>
      </div>
    </div>
  </div>
);
```

### Phase 4: Testing & Webhook Setup (2 hours)

#### 4.1 PayMongo Webhook Configuration
1. Create webhook endpoint in PayMongo Dashboard
2. Point to: `https://yourdomain.com/api/paymongo/webhook`
3. Subscribe to: `checkout_session.payment.paid`

#### 4.2 Test Environment Setup
1. Use PayMongo test keys
2. Test GCash payments with test account
3. Verify webhook delivery
4. Test order status updates
5. Verify POS real-time notifications

#### 4.3 Integration Testing Checklist
- [ ] Customer selects GCash (PayMongo) payment method
- [ ] Order creates PayMongo checkout session
- [ ] Customer redirected to PayMongo payment page
- [ ] Customer completes GCash payment
- [ ] Webhook received and processed
- [ ] Order status updated to 'received'
- [ ] Socket.IO notification sent to POS
- [ ] Order appears in POS ready queue
- [ ] Manual verification still works as fallback

## 🔒 Security Considerations

### Webhook Security
- Verify PayMongo webhook signatures
- Use HTTPS for all webhook endpoints
- Log all webhook events for debugging
- Implement idempotency for webhook processing

### API Security
- Use environment variables for sensitive keys
- Implement rate limiting on payment endpoints
- Validate all incoming data
- Use CORS properly

### Payment Security
- Never store payment credentials
- Use PayMongo's secure checkout pages
- Implement proper error handling
- Log security events

## 📈 Performance Considerations

### Database Optimization
- Index order lookup fields
- Optimize webhook processing
- Use database transactions where needed

### Real-time Updates
- Use existing Socket.IO infrastructure
- Batch notifications when possible
- Handle connection failures gracefully

## 🛠️ Maintenance & Monitoring

### Logging
- Log all PayMongo API calls
- Track webhook delivery status
- Monitor payment success rates
- Alert on webhook failures

### Error Handling
- Graceful fallback to manual verification
- Clear error messages for customers
- Staff notifications for payment issues

## 📋 Implementation Timeline

**Total Estimated Time: 8-10 hours**

### Day 1 (4-5 hours)
- [ ] Backend PayMongo service setup
- [ ] Webhook endpoint implementation
- [ ] Settings model updates
- [ ] Basic API testing

### Day 2 (4-5 hours)
- [ ] Frontend payment method selector updates
- [ ] Self checkout flow integration
- [ ] Settings panel PayMongo section
- [ ] Success/cancel page implementation

### Day 3 (2 hours)
- [ ] End-to-end testing
- [ ] Webhook configuration
- [ ] Production deployment
- [ ] Documentation updates

## 🚀 Go-Live Checklist

### Pre-Production
- [ ] Test environment fully functional
- [ ] All error scenarios handled
- [ ] Fallback to manual verification works
- [ ] Staff training completed
- [ ] Documentation updated

### Production Deployment
- [ ] PayMongo live keys configured
- [ ] Webhook endpoints verified
- [ ] SSL certificates valid
- [ ] Monitoring systems active
- [ ] Rollback plan ready

### Post-Production
- [ ] Monitor payment success rates
- [ ] Track webhook delivery
- [ ] Gather user feedback
- [ ] Performance optimization
- [ ] Feature refinements

## 📞 Support & Troubleshooting

### Common Issues
1. **Webhook not received**: Check PayMongo dashboard logs
2. **Payment not updating order**: Verify webhook signature validation
3. **Customer stuck on payment page**: Implement timeout handling
4. **Fallback not working**: Test manual verification independently

### Debug Checklist
- [ ] PayMongo webhook logs
- [ ] Server error logs
- [ ] Socket.IO connection status
- [ ] Database order status
- [ ] Frontend console errors

---

**Document Version**: 1.0  
**Last Updated**: November 7, 2025  
**Implementation Status**: Planning Phase