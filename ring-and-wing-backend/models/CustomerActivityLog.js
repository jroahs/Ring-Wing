/**
 * Customer Activity Log Model
 * Tracks all customer account activities for audit purposes
 * 
 * Created: November 25, 2025
 */

const mongoose = require('mongoose');

const customerActivityLogSchema = new mongoose.Schema({
  customerId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Customer',
    required: true,
    index: true
  },
  action: {
    type: String,
    required: true,
    enum: [
      'login',
      'logout',
      'login_failed',
      'password_changed',
      'password_reset_by_admin',
      'profile_updated',
      'profile_updated_by_admin',
      'account_created',
      'account_created_by_admin',
      'account_activated',
      'account_deactivated',
      'account_banned',
      'account_unbanned',
      'account_deleted',
      'order_placed',
      'address_added',
      'address_updated',
      'address_deleted'
    ]
  },
  details: {
    type: mongoose.Schema.Types.Mixed,
    default: {}
  },
  ipAddress: {
    type: String
  },
  userAgent: {
    type: String
  },
  performedBy: {
    type: mongoose.Schema.Types.ObjectId,
    refPath: 'performedByType'
  },
  performedByType: {
    type: String,
    enum: ['Customer', 'User', 'admin', 'system'],
    default: 'Customer'
  },
  timestamp: {
    type: Date,
    default: Date.now,
    index: true
  }
}, {
  timestamps: false
});

// Compound index for efficient queries
customerActivityLogSchema.index({ customerId: 1, timestamp: -1 });
customerActivityLogSchema.index({ action: 1, timestamp: -1 });

// Auto-expire old logs after 1 year
customerActivityLogSchema.index({ timestamp: 1 }, { expireAfterSeconds: 365 * 24 * 60 * 60 });

module.exports = mongoose.model('CustomerActivityLog', customerActivityLogSchema);
