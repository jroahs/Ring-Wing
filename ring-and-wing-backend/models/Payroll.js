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
  // Employee Deductions (from net pay)
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
    },
    // Government Deductions - Employee Share
    sss: {
      type: Number,
      default: 0,
      min: 0
    },
    philHealth: {
      type: Number,
      default: 0,
      min: 0
    },
    pagIbig: {
      type: Number,
      default: 0,
      min: 0
    },
    withholdingTax: {
      type: Number,
      default: 0,
      min: 0
    }
  },
  
  // ============================================
  // Employer Contributions (for reporting/remittance)
  // These do NOT affect employee net pay
  // ============================================
  employerContributions: {
    sss: {
      type: Number,
      default: 0,
      min: 0
    },
    sssEc: {
      type: Number,
      default: 0,
      min: 0  // Employees' Compensation - employer only
    },
    philHealth: {
      type: Number,
      default: 0,
      min: 0
    },
    pagIbig: {
      type: Number,
      default: 0,
      min: 0
    }
  },
  
  // ============================================
  // Contribution Basis Details (for audit)
  // ============================================
  contributionBasis: {
    sss: {
      msc: {
        type: Number  // Monthly Salary Credit used
      },
      grossSalary: {
        type: Number  // Original salary
      }
    },
    philHealth: {
      mbs: {
        type: Number  // Monthly Basic Salary (clamped)
      },
      grossSalary: {
        type: Number
      }
    },
    pagIbig: {
      mfs: {
        type: Number  // Monthly Fund Salary (capped at ₱10,000)
      },
      grossSalary: {
        type: Number
      }
    }
  },
  
  // Reference to the government config version used
  governmentConfigId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'GovernmentDeductionConfig'
  },
  governmentConfigVersion: {
    type: Number
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
  },
  // Finalization status - locks associated schedules
  isFinalized: {
    type: Boolean,
    default: false,
    index: true
  },
  finalizedAt: {
    type: Date
  },
  finalizedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  // Schedule-based attendance summary
  scheduleSummary: {
    scheduledDays: {
      type: Number,
      default: 0
    },
    workedDays: {
      type: Number,
      default: 0
    },
    absentDays: {
      type: Number,
      default: 0
    },
    restDays: {
      type: Number,
      default: 0
    },
    holidayDays: {
      type: Number,
      default: 0
    },
    totalLateMinutes: {
      type: Number,
      default: 0
    },
    totalUndertimeMinutes: {
      type: Number,
      default: 0
    }
  }
}, { 
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Add compound index for efficient period-based queries
payrollSchema.index({ staffId: 1, payrollPeriod: 1 }, { unique: true });
payrollSchema.index({ governmentConfigId: 1 });

// Virtual for calculating total employee deductions (from net pay)
payrollSchema.virtual('totalDeductions').get(function() {
  return (this.deductions.late || 0) + 
         (this.deductions.absence || 0) + 
         (this.deductions.sss || 0) + 
         (this.deductions.philHealth || 0) + 
         (this.deductions.pagIbig || 0) + 
         (this.deductions.withholdingTax || 0);
});

// Virtual for calculating total employer contributions (for reporting)
payrollSchema.virtual('totalEmployerContributions').get(function() {
  return (this.employerContributions?.sss || 0) + 
         (this.employerContributions?.sssEc || 0) + 
         (this.employerContributions?.philHealth || 0) + 
         (this.employerContributions?.pagIbig || 0);
});

// Virtual for total government contributions (employee + employer)
payrollSchema.virtual('totalGovernmentContributions').get(function() {
  const employeeShare = (this.deductions.sss || 0) + 
                        (this.deductions.philHealth || 0) + 
                        (this.deductions.pagIbig || 0);
  const employerShare = this.totalEmployerContributions;
  return employeeShare + employerShare;
});

// Virtual for SSS total (employee + employer + EC)
payrollSchema.virtual('sssTotalContribution').get(function() {
  return (this.deductions.sss || 0) + 
         (this.employerContributions?.sss || 0) + 
         (this.employerContributions?.sssEc || 0);
});

// Virtual for PhilHealth total (employee + employer)
payrollSchema.virtual('philHealthTotalContribution').get(function() {
  return (this.deductions.philHealth || 0) + 
         (this.employerContributions?.philHealth || 0);
});

// Virtual for Pag-IBIG total (employee + employer)
payrollSchema.virtual('pagIbigTotalContribution').get(function() {
  return (this.deductions.pagIbig || 0) + 
         (this.employerContributions?.pagIbig || 0);
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
    
    const totalDeductions = (this.deductions.late || 0) + 
                           (this.deductions.absence || 0) + 
                           (this.deductions.sss || 0) + 
                           (this.deductions.philHealth || 0) + 
                           (this.deductions.pagIbig || 0) + 
                           (this.deductions.withholdingTax || 0);
    
    this.netPay = (
      this.basicPay + 
      this.overtimePay + 
      this.allowances + 
      (this.holidayPay || 0) + 
      (this.thirteenthMonthPay || 0) + 
      totalBonuses - 
      totalDeductions
    );
  }
  next();
});

// Post-save middleware to lock associated schedules when finalized
payrollSchema.post('save', async function(doc) {
  if (doc.isFinalized && doc.finalizedAt) {
    try {
      const EmployeeSchedule = mongoose.model('EmployeeSchedule');
      
      // Determine the payroll period dates
      const periodStart = new Date(doc.payrollPeriod);
      periodStart.setDate(1); // First day of month
      const periodEnd = new Date(periodStart);
      periodEnd.setMonth(periodEnd.getMonth() + 1);
      periodEnd.setDate(0); // Last day of month
      
      // Lock all schedules in this period
      await EmployeeSchedule.lockForPayroll(
        doc.staffId,
        periodStart,
        periodEnd,
        doc._id,
        doc.finalizedBy
      );
      
      console.log(`[Payroll] Locked schedules for staff ${doc.staffId} from ${periodStart.toISOString()} to ${periodEnd.toISOString()}`);
    } catch (error) {
      console.error('[Payroll] Error locking schedules:', error);
    }
  }
});

// Method to finalize payroll
payrollSchema.methods.finalize = async function(userId) {
  this.isFinalized = true;
  this.finalizedAt = new Date();
  this.finalizedBy = userId;
  return this.save();
};

// Static method to check if a period is finalized for a staff
payrollSchema.statics.isPeriodFinalized = async function(staffId, date) {
  const periodStart = new Date(date);
  periodStart.setDate(1);
  const periodEnd = new Date(periodStart);
  periodEnd.setMonth(periodEnd.getMonth() + 1);
  periodEnd.setDate(0);
  
  const payroll = await this.findOne({
    staffId,
    payrollPeriod: { $gte: periodStart, $lte: periodEnd },
    isFinalized: true
  });
  
  return !!payroll;
};

module.exports = mongoose.model('Payroll', payrollSchema);