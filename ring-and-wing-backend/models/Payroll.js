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
  },  allowances: {
    type: Number,
    default: 0,
    min: 0
  },
  holidayPay: {
    type: Number,
    default: 0,
    min: 0
  },
  thirteenthMonthPay: {
    type: Number,
    default: 0,
    min: 0
  },
  bonuses: {
    holiday: {
      type: Number,
      default: 0,
      min: 0
    },
    performance: {
      type: Number,
      default: 0,
      min: 0
    },
    other: {
      type: Number,
      default: 0,
      min: 0
    }
  },
  holidaysWorked: [{
    date: {
      type: Date,
      required: true
    },
    holidayName: {
      type: String,
      required: true
    },
    holidayType: {
      type: String,
      enum: ['regular', 'special', 'local'],
      required: true
    },
    hoursWorked: {
      type: Number,
      required: true,
      min: 0
    },
    payMultiplier: {
      type: Number,
      required: true,
      min: 1.0
    },
    bonusAmount: {
      type: Number,
      required: true,
      min: 0
    }
  }],
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

// Virtual for calculating total bonuses
payrollSchema.virtual('totalBonuses').get(function() {
  return (this.bonuses?.holiday || 0) + 
         (this.bonuses?.performance || 0) + 
         (this.bonuses?.other || 0);
});

// Virtual for calculating gross pay
payrollSchema.virtual('grossPay').get(function() {
  return this.basicPay + 
         this.overtimePay + 
         this.allowances + 
         (this.holidayPay || 0) + 
         (this.thirteenthMonthPay || 0) + 
         this.totalBonuses;
});

// Pre-save middleware to calculate netPay
payrollSchema.pre('save', function(next) {
  // Calculate net pay if not set
  if (!this.netPay) {
    const totalBonuses = (this.bonuses?.holiday || 0) + 
                        (this.bonuses?.performance || 0) + 
                        (this.bonuses?.other || 0);
    
    this.netPay = (
      this.basicPay + 
      this.overtimePay + 
      this.allowances + 
      (this.holidayPay || 0) + 
      (this.thirteenthMonthPay || 0) + 
      totalBonuses - 
      (this.deductions.late || 0) - 
      (this.deductions.absence || 0)
    );
  }
  next();
});

module.exports = mongoose.model('Payroll', payrollSchema);