const mongoose = require('mongoose');

const menuItemSchema = new mongoose.Schema({
  code: {
    type: String,
    required: [true, 'Item code is required'],
    unique: true,
    uppercase: true,
    match: [/^[A-Z0-9]{3,5}$/, 'Code must be 3-5 alphanumeric characters'],
    index: true
  },
  name: { type: String, required: true },
  category: { type: String, required: true },
  subCategory: { type: String },
  pricing: { type: Map, of: Number, required: true },
  description: { type: String },
  image: { type: String },
  modifiers: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'AddOn'
  }],
  preparationTime: { type: Number, default: 15 },
  isAvailable: { type: Boolean, default: true },
  ingredients: [{ type: String }],
  // Alternative suggestions for unavailable items
  alternatives: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'MenuItem'
  }],
  recommendedAlternative: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'MenuItem'
  },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});

menuItemSchema.pre('save', function(next) {
  this.updatedAt = Date.now();
  next();
});

module.exports = mongoose.model('MenuItem', menuItemSchema);