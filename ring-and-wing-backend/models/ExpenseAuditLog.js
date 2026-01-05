const mongoose = require('mongoose');

const expenseAuditLogSchema = new mongoose.Schema({
  action: {
    type: String,
    required: true,
    enum: [
      'create',
      'update',
      'delete',
      'approve',
      'reject',
      'mark_paid',
      'system_create'
    ],
    index: true
  },
  description: {
    type: String,
    required: true
  },
  expenseId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Expense',
    required: true,
    index: true
  },
  user: {
    type: String,
    default: 'system'
  },
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: false
  },
  details: {
    previousValue: mongoose.Schema.Types.Mixed,
    newValue: mongoose.Schema.Types.Mixed,
    paymentMethod: String,
    amount: Number,
    category: String
  },
  timestamp: {
    type: Date,
    default: Date.now,
    index: true
  }
}, {
  timestamps: true
});

expenseAuditLogSchema.index({ expenseId: 1, timestamp: -1 });
expenseAuditLogSchema.index({ action: 1, timestamp: -1 });

module.exports = mongoose.model('ExpenseAuditLog', expenseAuditLogSchema);
