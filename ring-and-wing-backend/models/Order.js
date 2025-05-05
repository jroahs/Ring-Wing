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
    selectedSize: { type: String, required: true }, // Keep selectedSize
    modifiers: [{ type: String }]
  }],
  totals: {
    subtotal: { type: Number, required: true },
    discount: { type: Number, default: 0 },
    total: { type: Number, required: true },
    cashReceived: { type: Number, default: 0 },
    change: { type: Number, default: 0 }
  },
  paymentMethod: { 
    type: String, 
    enum: ['cash', 'card', 'e-wallet', 'pending'],
    required: true 
  },
  orderType: {
    type: String,
    enum: ['self_checkout', 'counter', 'chatbot'],
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