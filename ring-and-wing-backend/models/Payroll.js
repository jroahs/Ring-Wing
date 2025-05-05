const mongoose = require('mongoose');

const payrollSchema = new mongoose.Schema({
  staffId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Staff',
    required: true,
    index: true
  },
  payrollPeriod: {
    type: Date,
    required: true,
    index: true
  },
  timeLogs: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'TimeLog'
  }],
  basicPay: {
    type: Number,
    required: true,
    min: 0
  },
  overtimePay: {
    type: Number,
    default: 0,
    min: 0
  },
  allowances: {
    type: Number,
    default: 0,
    min: 0
  },
  deductions: {
    late: {
      type: Number,
      default: 0,
      min: 0
    },
    absence: {
      type: Number,
      default: 0,
      min: 0
    }
  },
  totalHoursWorked: {
    type: Number,
    required: true,
    min: 0
  },
  overtimeHours: {
    type: Number,
    default: 0,
    min: 0
  },
  netPay: {
    type: Number,
    required: true,
    min: 0
  }
}, { 
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Add compound index for efficient period-based queries
payrollSchema.index({ staffId: 1, payrollPeriod: 1 }, { unique: true });

// Virtual for calculating total deductions
payrollSchema.virtual('totalDeductions').get(function() {
  return this.deductions.late + this.deductions.absence;
});

// Virtual for calculating gross pay
payrollSchema.virtual('grossPay').get(function() {
  return this.basicPay + this.overtimePay + this.allowances;
});

// Pre-save middleware to calculate netPay
payrollSchema.pre('save', function(next) {
  // Calculate net pay if not set
  if (!this.netPay) {
    this.netPay = (
      this.basicPay + 
      this.overtimePay + 
      this.allowances - 
      (this.deductions.late || 0) - 
      (this.deductions.absence || 0)
    );
  }
  next();
});

module.exports = mongoose.model('Payroll', payrollSchema);