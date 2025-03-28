// models/AddOn.js
const mongoose = require('mongoose');

const addOnSchema = new mongoose.Schema({
  name: { type: String, required: true },
  price: { type: Number, required: true },
  category: { type: String, required: true }, // e.g., 'Milktea', 'Meals'
  isAvailable: { type: Boolean, default: true }
});

module.exports = mongoose.model('AddOn', addOnSchema);