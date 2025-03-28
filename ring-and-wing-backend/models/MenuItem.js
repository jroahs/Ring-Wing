const mongoose = require('mongoose');

const menuItemSchema = new mongoose.Schema({
  name: { type: String, required: true },
  category: { type: String, required: true },
  subCategory: { type: String },
  pricing: { type: Map, of: Number, required: true },
  description: { type: String },
  image: { type: String },
  modifiers: [{
    name: { type: String },
    price: { type: Number },
    type: { type: String },
    options: [{ type: String }]
  }],
  preparationTime: { type: Number, default: 15 },
  isAvailable: { type: Boolean, default: true },
  ingredients: [{ type: String }],
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});

// Pre-save hook to update the updatedAt field
menuItemSchema.pre('save', function(next) {
  this.updatedAt = Date.now();
  next();
});

module.exports = mongoose.model('MenuItem', menuItemSchema);
