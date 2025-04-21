const mongoose = require('mongoose');

const itemSchema = new mongoose.Schema({
  name: { type: String, required: true },
  category: { 
    type: String,
    enum: ['Food', 'Beverages', 'Ingredients', 'Packaging'],
    required: true
  },
  status: {
    type: String,
    enum: ['In Stock', 'Low Stock', 'Out of Stock'],
    default: 'In Stock'
  },
  quantity: { type: Number, required: true, min: 0 },
  location: { type: String, required: true },
  cost: { type: Number, required: true, min: 0 },
  price: { type: Number, required: true, min: 0 },
  vendor: { type: String, required: true },
  createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Item', itemSchema);