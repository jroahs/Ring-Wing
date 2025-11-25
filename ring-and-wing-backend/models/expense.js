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
  purpose: {
    type: String,
    default: null  // Additional details/reason for the expense
  },
  paymentMethod: {
    type: String,
    required: true,
    enum: ['Cash', 'Bank Transfer', 'Digital Wallet']
  },
  
  // Workflow Status
  status: {
    type: String,
    enum: ['for_approval', 'approved', 'rejected', 'paid', 'created'],
    default: 'created'  // Admin-created expenses start as 'created'
  },
  
  // Requester Information (for staff requests)
  requesterId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null
  },
  requesterName: {
    type: String,
    default: null
  },
  requesterPosition: {
    type: String,
    default: null
  },
  
  // Approval Information
  approvedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null
  },
  approverName: {
    type: String,
    default: null
  },
  approvedAt: {
    type: Date,
    default: null
  },
  rejectionReason: {
    type: String,
    default: null
  },
  
  // Creator tracking (for admin-created expenses)
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null
  },
  creatorName: {
    type: String,
    default: null
  },
  creatorRole: {
    type: String,
    enum: ['staff', 'manager', null],
    default: null
  },
  
  // Legacy fields (kept for backward compatibility)
  disbursed: {
    type: Boolean,
    default: false
  },
  disbursementDate: {
    type: Date,
    default: null
  },
  permanent: {
    type: Boolean,
    default: false
  }
}, {
  timestamps: true
});

// Indexes for common queries
expenseSchema.index({ date: 1 });
expenseSchema.index({ category: 1 });
expenseSchema.index({ status: 1 });
expenseSchema.index({ requesterId: 1 });
expenseSchema.index({ disbursed: 1 });
expenseSchema.index({ disbursementDate: 1 });
expenseSchema.index({ permanent: 1 });

const Expense = mongoose.model('Expense', expenseSchema);

module.exports = Expense;