const mongoose = require('mongoose');

const orderSchema = new mongoose.Schema({
  receiptNumber: { 
    type: String, 
    required: true, 
    unique: true 
  },  items: [{
    name: { type: String, required: true },
    price: { type: Number, required: true },
    quantity: { type: Number, required: true },
    selectedSize: { type: String, required: true }, // Keep selectedSize
    modifiers: [{ type: String }],
    pwdSeniorDiscount: {
      applied: { type: Boolean, default: false },
      discountedQuantity: { type: Number, default: 0 },
      discountAmount: { type: Number, default: 0 },
      vatExempt: { type: Boolean, default: false },
      cardType: { type: String, enum: ['PWD', 'Senior Citizen'] },
      cardIdNumber: { type: String }
    }
  }],  totals: {
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
  },paymentMethod: { 
    type: String, 
    enum: ['cash', 'e-wallet', 'pending'],
    required: true 
  },
  orderType: {
    type: String,
    enum: ['self_checkout', 'chatbot', 'pos'],
    required: true,
    default: 'self_checkout'
  },
  status: { 
    type: String, 
    enum: ['received', 'preparing', 'ready', 'completed', 'pending'],
    default: 'received'
  },
  createdAt: { type: Date, default: Date.now },
  completedAt: Date
});

module.exports = mongoose.model('Order', orderSchema);