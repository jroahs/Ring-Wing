const mongoose = require('mongoose');

const staffSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Name is required'],
    trim: true
  },
  position: {
    type: String,
    required: [true, 'Position is required'],
    enum: ['Barista', 'Cashier', 'Chef', 'Manager', 'Server', 'Cook']
  },
  profilePicture: {
    type: String,
    default: ''
  },
  email: {
    type: String,
    required: [true, 'Email is required'],
    unique: true,
    lowercase: true,
    match: [/^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/, 'Please fill a valid email address']
  },
  phone: {
    type: String,
    required: [true, 'Phone number is required'],
    match: [/^0\d{10}$/, 'Please use a valid Philippine phone number (e.g., 09123456789)']
  },
  dailyRate: {
    type: Number,
    required: [true, 'Daily rate is required'],
    min: [0, 'Daily rate cannot be negative']
  },
  status: {
    type: String,
    enum: ['Active', 'On Leave', 'Inactive'],
    default: 'Active'
  },
  sssNumber: String,
  tinNumber: String,
  philHealthNumber: String,
}, { timestamps: true });

module.exports = mongoose.model('Staff', staffSchema);