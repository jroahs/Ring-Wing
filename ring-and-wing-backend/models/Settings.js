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
