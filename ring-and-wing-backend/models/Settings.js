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
