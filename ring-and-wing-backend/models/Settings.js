const mongoose = require('mongoose');

const settingsSchema = new mongoose.Schema({
  // Cash Float Settings
  cashFloat: {
    currentAmount: { 
      type: Number, 
      default: 1000,
      min: 0 
    },
    dailyResetSettings: {
      enabled: { 
        type: Boolean, 
        default: false 
      },
      amount: { 
        type: Number, 
        default: 1000,
        min: 0 
      }
    },
    lastResetDate: { 
      type: String, 
      default: null 
    },
    auditTrail: [{
      timestamp: { 
        type: String, 
        required: true 
      },
      action: { 
        type: String, 
        required: true,
        enum: ['initialize', 'set_float', 'transaction', 'daily_reset']
      },
      previousAmount: { 
        type: Number, 
        required: true 
      },
      newAmount: { 
        type: Number, 
        required: true 
      },
      change: { 
        type: Number, 
        required: true 
      },
      reason: { 
        type: String, 
        required: true 
      },
      metadata: {
        type: Map,
        of: mongoose.Schema.Types.Mixed,
        default: {}
      }
    }]
  },
  
  // System Settings (for future expansion)
  system: {
    businessName: { 
      type: String, 
      default: 'Ring & Wing Café' 
    },
    timezone: { 
      type: String, 
      default: 'Asia/Manila' 
    },
    currency: { 
      type: String, 
      default: 'PHP' 
    }
  },
  
  // POS Settings (for future expansion)
  pos: {
    receiptFooter: { 
      type: String, 
      default: 'Thank you for your business!' 
    },
    taxRate: { 
      type: Number, 
      default: 0.12 
    },
    layout: {
      type: String,
      enum: ['desktop', 'tablet', 'auto'],
      default: 'auto' // 'auto' = detect based on screen size, 'desktop' = always desktop, 'tablet' = always tablet
    }
  },
  
  // NEW: Merchant Wallet Configuration (GCash/PayMaya)
  merchantWallets: {
    gcash: {
      enabled: { 
        type: Boolean, 
        default: false 
      },
      accountNumber: { 
        type: String, 
        default: '' 
      },
      accountName: { 
        type: String, 
        default: '' 
      },
      qrCodeUrl: { 
        type: String, 
        default: '' 
      } // Path to uploaded QR code image
    },
    paymaya: {
      enabled: { 
        type: Boolean, 
        default: false 
      },
      accountNumber: { 
        type: String, 
        default: '' 
      },
      accountName: { 
        type: String, 
        default: '' 
      },
      qrCodeUrl: { 
        type: String, 
        default: '' 
      } // Path to uploaded QR code image
    }
  },
  
  // NEW: Payment Verification Settings
  paymentVerification: {
    timeoutMinutes: {
      type: Number,
      default: 120, // 2 hours default timeout
      min: 30,
      max: 1440 // Max 24 hours
    },
    autoCancel: {
      type: Boolean,
      default: true // Auto-cancel orders after timeout
    },
    warningThresholds: {
      green: { type: Number, default: 60 }, // > 60 minutes = green
      yellow: { type: Number, default: 30 }, // > 30 minutes = yellow
      orange: { type: Number, default: 15 }, // > 15 minutes = orange
      red: { type: Number, default: 0 } // < 15 minutes = red (urgent)
    }
  },

  // NEW: Payment Gateway Configuration (PayMongo)
  paymentGateways: {
    paymongo: {
      enabled: { 
        type: Boolean, 
        default: false 
      },
      gcashEnabled: { 
        type: Boolean, 
        default: false 
      },
      paymayaEnabled: { 
        type: Boolean, 
        default: false 
      }
    }
  },

  // NEW: Attendance Settings Configuration
  attendance: {
    mode: {
      type: String,
      enum: ['PIN', 'NFC'],
      default: 'PIN'
    },
    nfcSettings: {
      requirePhoto: {
        type: Boolean,
        default: false // NFC mode doesn't require photo by default
      },
      testMode: {
        type: Boolean,
        default: true // Enable test mode while hardware is not available
      },
      tapAndGo: {
        type: Boolean,
        default: false // false = tap and confirm (modal), true = tap and go (instant)
      }
    },
    pinSettings: {
      requirePhoto: {
        type: Boolean,
        default: true // PIN mode requires photo by default
      }
    }
  },

  // NEW: Staff Scheduling Configuration
  scheduling: {
    enabled: {
      type: Boolean,
      default: true
    },
    gracePeriodMinutes: {
      type: Number,
      default: 15,
      min: 0,
      max: 60
    },
    roundingRule: {
      type: String,
      enum: ['none', '5min', '15min', '30min'],
      default: 'none'
    },
    maxOvertimeHoursDaily: {
      type: Number,
      default: 4,
      min: 0,
      max: 8
    },
    requireScheduleForPayroll: {
      type: Boolean,
      default: false // When true, payroll requires schedule data
    },
    allowSplitShifts: {
      type: Boolean,
      default: true
    },
    defaultRestDays: {
      type: [Number],
      default: [0] // Sunday by default
    },
    autoGenerateSchedule: {
      type: Boolean,
      default: false // When true, generate schedules from staff defaults
    },
    notifyOnScheduleChange: {
      type: Boolean,
      default: true
    },
    allowStaffViewSchedule: {
      type: Boolean,
      default: true
    },
    schedulePublishDaysBefore: {
      type: Number,
      default: 7, // Publish schedule 7 days before
      min: 1,
      max: 30
    }
  },

  // NEW: Payroll Settings (DOLE-Compliant Multipliers)
  payroll: {
    // Standard work hours
    regularHoursPerDay: {
      type: Number,
      default: 8,
      min: 1,
      max: 12
    },
    workDaysPerWeek: {
      type: Number,
      default: 6,
      min: 1,
      max: 7
    },
    // DOLE-Compliant Pay Multipliers (minimum values enforced)
    multipliers: {
      overtime: {
        type: Number,
        default: 1.25,
        min: 1.25 // DOLE minimum
      },
      regularHoliday: {
        type: Number,
        default: 2.0,
        min: 2.0 // DOLE minimum
      },
      specialHoliday: {
        type: Number,
        default: 1.30,
        min: 1.30 // DOLE minimum
      },
      overtimeOnHoliday: {
        type: Number,
        default: 2.60,
        min: 2.60 // DOLE minimum: 200% + 30% of 200%
      },
      overtimeOnSpecialHoliday: {
        type: Number,
        default: 1.69,
        min: 1.69 // DOLE minimum: 130% + 30% of 130%
      },
      restDay: {
        type: Number,
        default: 1.30,
        min: 1.30 // DOLE minimum
      },
      restDayOvertime: {
        type: Number,
        default: 1.69,
        min: 1.69 // DOLE minimum
      },
      nightDifferential: {
        type: Number,
        default: 1.10,
        min: 1.10 // DOLE minimum: 10% additional
      }
    },
    // Deduction settings
    deductions: {
      sssEnabled: {
        type: Boolean,
        default: true
      },
      philhealthEnabled: {
        type: Boolean,
        default: true
      },
      pagibigEnabled: {
        type: Boolean,
        default: true
      },
      taxEnabled: {
        type: Boolean,
        default: true
      },
      lateDeductionPerMinute: {
        type: Number,
        default: 0, // 0 = no late deduction
        min: 0
      },
      absentDeductionType: {
        type: String,
        enum: ['daily_rate', 'hourly', 'none'],
        default: 'daily_rate'
      }
    },
    // Default payout schedule
    defaultPayoutType: {
      type: String,
      enum: ['monthly', 'semi-monthly', 'weekly', 'bi-weekly'],
      default: 'semi-monthly'
    },
    defaultPayoutDays: {
      type: [Number],
      default: [15, 30]
    },
    defaultCutoffDays: {
      type: [Number],
      default: [14, 29]
    }
  },
  
  // Metadata
  createdAt: { 
    type: Date, 
    default: Date.now 
  },
  updatedAt: { 
    type: Date, 
    default: Date.now 
  }
});

// Pre-save hook to update the updatedAt field
settingsSchema.pre('save', function(next) {
  this.updatedAt = Date.now();
  next();
});

// Static method to get or create default settings
settingsSchema.statics.getSettings = async function() {
  let settings = await this.findOne();
  if (!settings) {
    // Create default settings if none exist
    settings = new this({
      cashFloat: {
        currentAmount: 1000,
        dailyResetSettings: {
          enabled: false,
          amount: 1000
        },
        lastResetDate: null,
        auditTrail: [{
          timestamp: new Date().toISOString(),
          action: 'initialize',
          previousAmount: 0,
          newAmount: 1000,
          change: 1000,
          reason: 'first_time_setup',
          metadata: {
            source: 'backend_initialization',
            note: 'Default cash float set for first-time use'
          }
        }]
      }
    });
    await settings.save();
  }
  return settings;
};

module.exports = mongoose.model('Settings', settingsSchema);
