const mongoose = require('mongoose');

const orderSchema = new mongoose.Schema({
  receiptNumber: { 
    type: String, 
    required: true, 
    unique: true 
  },
  items: [{
    name: { type: String, required: true },
    price: { type: Number, required: true },
    quantity: { type: Number, required: true },
    selectedSize: { type: String, required: true },
    availableSizes: [{ type: String }],
    pricing: { type: mongoose.Schema.Types.Mixed },
    modifiers: [{ type: String }],
    pwdSeniorDiscount: {
      applied: { type: Boolean, default: false },
      discountedQuantity: { type: Number, default: 0 },
      discountAmount: { type: Number, default: 0 },
      vatExempt: { type: Boolean, default: false },
      cardType: { type: String, enum: ['PWD', 'Senior Citizen'] },
      cardIdNumber: { type: String }
    }
  }],
  totals: {
    subtotal: { type: Number, required: true },
    discount: { type: Number, default: 0 },
    vatExemption: { type: Number, default: 0 },
    total: { type: Number, required: true },
    cashReceived: { type: Number, default: 0 },
    change: { type: Number, default: 0 }
  },
  // Customer information
  customerName: { type: String, default: '' },

  // Payment details for different payment methods
  paymentDetails: {
    // Cash payment details
    cashReceived: { type: Number, default: 0 },
    change: { type: Number, default: 0 },
    
    // E-wallet payment details
    eWalletProvider: { type: String, enum: ['gcash', 'paymaya'] },
    eWalletReferenceNumber: { type: String },
    eWalletName: { type: String }
  },

  // NEW: PayMongo Payment Gateway Integration
  paymentGateway: {
    provider: { 
      type: String, 
      enum: ['paymongo'], 
      default: null 
    },
    sessionId: { type: String }, // PayMongo checkout session ID
    checkoutUrl: { type: String }, // PayMongo checkout URL for customer
    transactionId: { type: String }, // PayMongo payment intent ID
    paymentMethod: { 
      type: String, 
      enum: ['gcash', 'paymaya'], 
      default: null 
    },
    status: { 
      type: String, 
      enum: ['pending', 'paid', 'failed', 'cancelled'], 
      default: 'pending' 
    },
    webhookReceived: { type: Boolean, default: false },
    paidAt: { type: Date },
    expiresAt: { type: Date }
  },

  paymentMethod: { 
    type: String, 
    enum: ['cash', 'e-wallet', 'paymongo', 'pending'],
    required: true 
  },
  orderType: {
    type: String,
    enum: ['self_checkout', 'chatbot', 'pos'],
    required: true,
    default: 'self_checkout'
  },
  // NEW: Fulfillment type - distinguishes dine-in from takeout/delivery
  fulfillmentType: {
    type: String,
    enum: ['dine_in', 'takeout', 'delivery'],
    default: 'dine_in'
  },
  // NEW: Proof of payment for e-wallet verification
  proofOfPayment: {
    // Payment proof can be image, text reference, or both
    imageUrl: { type: String }, // Path to uploaded screenshot
    transactionReference: { type: String }, // Manual reference number entry
    accountName: { type: String }, // Name on the e-wallet account
    
    // Verification tracking
    verificationStatus: {
      type: String,
      enum: ['pending', 'verified', 'rejected'],
      default: 'pending'
    },
    verifiedBy: { 
      type: mongoose.Schema.Types.ObjectId, 
      ref: 'User' 
    },
    verifiedAt: { type: Date },
    rejectionReason: { type: String },
    
    // Timeout management
    expiresAt: { type: Date }, // Auto-cancel if not verified by this time
    uploadedAt: { type: Date, default: Date.now }
  },
  status: { 
    type: String, 
    enum: ['pending', 'pending_payment', 'paymongo_verified', 'received', 'preparing', 'ready', 'completed', 'cancelled'],
    default: 'received'
  },
  createdAt: { type: Date, default: Date.now },
  completedAt: Date
});

// Database indexes for performance optimization
orderSchema.index({ status: 1, createdAt: -1 }); // Query orders by status and date
orderSchema.index({ 'proofOfPayment.verificationStatus': 1 }); // Query pending verifications
orderSchema.index({ 'proofOfPayment.expiresAt': 1 }); // Timeout cleanup queries
orderSchema.index({ orderType: 1, paymentMethod: 1 }); // Filter by order and payment type
orderSchema.index({ fulfillmentType: 1 }); // Filter by fulfillment type (dine-in/takeout/delivery)
orderSchema.index({ 'paymentGateway.sessionId': 1 }); // PayMongo session lookup
orderSchema.index({ 'paymentGateway.status': 1 }); // PayMongo payment status queries
orderSchema.index({ 'paymentGateway.expiresAt': 1 }); // PayMongo session cleanup

module.exports = mongoose.model('Order', orderSchema);