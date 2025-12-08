const mongoose = require('mongoose');

const payrollBatchSchema = new mongoose.Schema({
  batchNumber: {
    type: String,
    required: true,
    unique: true,
    index: true
  },
  
  // Period Information
  payrollPeriod: {
    startDate: {
      type: Date,
      required: true,
      index: true
    },
    endDate: {
      type: Date,
      required: true,
      index: true
    }
  },
  
  payFrequency: {
    type: String,
    enum: ['weekly', 'bi-weekly', 'semi-monthly', 'monthly'],
    default: 'monthly'
  },
  
  // Status Tracking
  status: {
    type: String,
    enum: ['draft', 'pending', 'approved', 'locked', 'cancelled'],
    default: 'draft',
    required: true,
    index: true
  },
  
  // Workflow Metadata
  preparedBy: {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Staff'
    },
    name: String,
    timestamp: {
      type: Date,
      default: Date.now
    }
  },
  
  submittedBy: {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Staff'
    },
    name: String,
    timestamp: Date
  },
  
  approvedBy: {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Staff'
    },
    name: String,
    timestamp: Date
  },
  
  lockedBy: {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Staff'
    },
    name: String,
    timestamp: Date
  },
  
  // Employee Payroll Records
  payrollRecords: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Payroll'
  }],
  
  // Summary Totals
  summary: {
    totalEmployees: {
      type: Number,
      default: 0
    },
    totalGrossPay: {
      type: Number,
      default: 0
    },
    totalDeductions: {
      type: Number,
      default: 0
    },
    totalNetPay: {
      type: Number,
      default: 0
    },
    totalEmployerContributions: {
      type: Number,
      default: 0
    },
    totalHoursWorked: {
      type: Number,
      default: 0
    },
    totalOvertimeHours: {
      type: Number,
      default: 0
    }
  },
  
  // Government Deductions Summary
  governmentSummary: {
    sss: {
      employeeTotal: Number,
      employerTotal: Number,
      ecTotal: Number
    },
    philHealth: {
      employeeTotal: Number,
      employerTotal: Number
    },
    pagIbig: {
      employeeTotal: Number,
      employerTotal: Number
    }
  },
  
  // Notes and Comments
  notes: {
    type: String,
    maxlength: 2000
  },
  
  approvalNotes: {
    type: String,
    maxlength: 2000
  },
  
  // Audit Trail
  auditLog: [{
    action: {
      type: String,
      enum: ['created', 'edited', 'submitted', 'approved', 'locked', 'unlocked', 'cancelled', 'exported']
    },
    performedBy: {
      userId: mongoose.Schema.Types.ObjectId,
      name: String
    },
    timestamp: {
      type: Date,
      default: Date.now
    },
    details: String
  }],
  
  // Export Tracking
  exports: [{
    format: {
      type: String,
      enum: ['pdf', 'excel', 'csv']
    },
    exportedBy: {
      userId: mongoose.Schema.Types.ObjectId,
      name: String
    },
    timestamp: {
      type: Date,
      default: Date.now
    }
  }]
  
}, {
  timestamps: true
});

// Indexes
payrollBatchSchema.index({ 'payrollPeriod.startDate': 1, 'payrollPeriod.endDate': 1 });
payrollBatchSchema.index({ status: 1, createdAt: -1 });
payrollBatchSchema.index({ batchNumber: 1 });

// Generate batch number
payrollBatchSchema.statics.generateBatchNumber = async function() {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  
  // Find the last batch for this month
  const prefix = `PB${year}${month}`;
  const lastBatch = await this.findOne({
    batchNumber: new RegExp(`^${prefix}`)
  }).sort({ batchNumber: -1 });
  
  let sequence = 1;
  if (lastBatch) {
    const lastSequence = parseInt(lastBatch.batchNumber.slice(-4));
    sequence = lastSequence + 1;
  }
  
  return `${prefix}${String(sequence).padStart(4, '0')}`;
};

// Check if batch can be edited
payrollBatchSchema.methods.canEdit = function() {
  return this.status === 'draft' || this.status === 'pending';
};

// Check if batch can be approved
payrollBatchSchema.methods.canApprove = function() {
  return this.status === 'pending';
};

// Check if batch can be locked
payrollBatchSchema.methods.canLock = function() {
  return this.status === 'approved';
};

// Add audit log entry
payrollBatchSchema.methods.addAuditLog = function(action, performedBy, details = '') {
  this.auditLog.push({
    action,
    performedBy,
    timestamp: new Date(),
    details
  });
};

module.exports = mongoose.model('PayrollBatch', payrollBatchSchema);
