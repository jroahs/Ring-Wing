const mongoose = require('mongoose');

const expenseSchema = new mongoose.Schema({
  date: {
    type: Date,
    required: true,
    default: Date.now
  },
  amount: {
    type: Number,
    required: true,
    min: 0
  },
  category: {
    type: String,
    required: true
  },
  description: {
    type: String,
    required: true
  },
  paymentMethod: {
    type: String,
    required: true,
    enum: ['Cash', 'Bank Transfer', 'Digital Wallet']
  },
  disbursed: {
    type: Boolean,
    default: false
  }
}, {
  timestamps: true
});

// Indexes for common queries
expenseSchema.index({ date: 1 });
expenseSchema.index({ category: 1 });
expenseSchema.index({ disbursed: 1 });

const Expense = mongoose.model('Expense', expenseSchema);

module.exports = Expense;