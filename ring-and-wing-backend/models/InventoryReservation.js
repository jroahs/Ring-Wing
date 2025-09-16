const mongoose = require('mongoose');

const ReservationItemSchema = new mongoose.Schema({
  ingredientId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Item',
    required: [true, 'Ingredient ID is required'],
    index: true
  },
  
  quantityReserved: {
    type: Number,
    required: [true, 'Quantity reserved is required'],
    min: [0, 'Quantity reserved cannot be negative'],
    validate: {
      validator: function(value) {
        return Number.isFinite(value) && value >= 0;
      },
      message: 'Quantity reserved must be a valid non-negative number'
    }
  },
  
  unit: {
    type: String,
    required: [true, 'Unit is required'],
    enum: ['grams', 'kg', 'ml', 'liters', 'pieces', 'cups', 'tablespoons', 'teaspoons', 'ounces', 'pounds'],
    lowercase: true,
    trim: true
  },
  
  reservedAt: {
    type: Date,
    default: Date.now,
    required: true
  },
  
  status: {
    type: String,
    enum: {
      values: ['reserved', 'consumed', 'released', 'expired'],
      message: 'Status must be one of: reserved, consumed, released, expired'
    },
    default: 'reserved',
    required: true,
    index: true
  },
  
  // For FIFO compatibility - track which batches were reserved
  reservedBatches: [{
    batchId: {
      type: mongoose.Schema.Types.ObjectId,
      required: true
    },
    quantityFromBatch: {
      type: Number,
      required: true,
      min: 0
    },
    expirationDate: Date,
    lotNumber: String
  }],
  
  // Cost tracking
  unitCost: {
    type: Number,
    min: 0,
    default: 0
  },
  
  totalCost: {
    type: Number,
    min: 0,
    default: 0
  }
}, { 
  _id: false // Embedded schema, no separate _id needed
});

const InventoryReservationSchema = new mongoose.Schema({
  orderId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Order',
    required: [true, 'Order ID is required'],
    unique: true, // CRITICAL: Prevents duplicate reservations for same order
    index: true
  },
  
  reservations: [ReservationItemSchema],
  
  totalReservedValue: {
    type: Number,
    default: 0,
    min: 0,
    validate: {
      validator: function(value) {
        return Number.isFinite(value) && value >= 0;
      },
      message: 'Total reserved value must be a valid non-negative number'
    }
  },
  
  expiresAt: {
    type: Date,
    required: [true, 'Expiration time is required'],
    index: { expireAfterSeconds: 0 }, // TTL INDEX - MongoDB auto-cleanup
    default: function() {
      // Default to 15 minutes from now
      return new Date(Date.now() + 15 * 60 * 1000);
    }
  },
  
  status: {
    type: String,
    enum: {
      values: ['active', 'consumed', 'expired', 'released', 'partial'],
      message: 'Status must be one of: active, consumed, expired, released, partial'
    },
    default: 'active',
    required: true,
    index: true
  },
  
  // Audit trail
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: false // System-created reservations may not have a user
  },
  
  modifiedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: false
  },
  
  // Tracking information
  reservationType: {
    type: String,
    enum: ['automatic', 'manual', 'override'],
    default: 'automatic',
    required: true
  },
  
  notes: {
    type: String,
    maxlength: [1000, 'Notes cannot exceed 1000 characters'],
    trim: true
  },
  
  // Manager override tracking
  overrideReason: {
    type: String,
    maxlength: [500, 'Override reason cannot exceed 500 characters'],
    trim: true
  },
  
  overriddenBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: false
  },
  
  overrideTimestamp: Date,
  
  // Extension tracking (for manually extended reservations)
  originalExpiresAt: Date,
  extendedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  
  extendedAt: Date,
  extensionReason: {
    type: String,
    maxlength: [500, 'Extension reason cannot exceed 500 characters'],
    trim: true
  }
  
}, {
  timestamps: true, // Adds createdAt and updatedAt
  versionKey: 'version' // Optimistic concurrency control
});

// Additional indexes for performance
InventoryReservationSchema.index({ status: 1, createdAt: -1 }); // Status queries with recency
InventoryReservationSchema.index({ createdBy: 1, createdAt: -1 }); // User audit queries
InventoryReservationSchema.index({ 'reservations.ingredientId': 1, status: 1 }); // Ingredient-specific queries
InventoryReservationSchema.index({ totalReservedValue: -1 }); // High-value reservation queries
InventoryReservationSchema.index({ expiresAt: 1, status: 1 }); // Expiration monitoring

// Virtual for order details
InventoryReservationSchema.virtual('order', {
  ref: 'Order',
  localField: 'orderId',
  foreignField: '_id',
  justOne: true
});

// Pre-save middleware
InventoryReservationSchema.pre('save', function(next) {
  // Calculate total reserved value if not set
  if (this.isModified('reservations') || !this.totalReservedValue) {
    this.totalReservedValue = this.reservations.reduce((total, reservation) => {
      return total + (reservation.totalCost || 0);
    }, 0);
  }
  
  // Set originalExpiresAt on first save
  if (this.isNew && !this.originalExpiresAt) {
    this.originalExpiresAt = this.expiresAt;
  }
  
  next();
});

// Pre-validate middleware to ensure expiration is in future
InventoryReservationSchema.pre('validate', function(next) {
  if (this.expiresAt && this.expiresAt <= new Date()) {
    this.status = 'expired';
  }
  next();
});

// Static method to find active reservations for ingredient
InventoryReservationSchema.statics.findActiveByIngredient = function(ingredientId) {
  return this.find({
    'reservations.ingredientId': ingredientId,
    status: { $in: ['active', 'partial'] },
    expiresAt: { $gt: new Date() }
  }).populate('orderId', 'orderNumber status customer');
};

// Static method to find reservations nearing expiration
InventoryReservationSchema.statics.findExpiringReservations = function(minutesFromNow = 5) {
  const expirationTime = new Date(Date.now() + minutesFromNow * 60 * 1000);
  return this.find({
    status: 'active',
    expiresAt: { $lte: expirationTime, $gt: new Date() }
  }).populate('orderId', 'orderNumber customer')
    .populate('createdBy', 'username position');
};

// Static method to get reservation summary for ingredient
InventoryReservationSchema.statics.getReservationSummary = async function(ingredientId) {
  const pipeline = [
    {
      $match: {
        'reservations.ingredientId': new mongoose.Types.ObjectId(ingredientId),
        status: { $in: ['active', 'partial'] },
        expiresAt: { $gt: new Date() }
      }
    },
    {
      $unwind: '$reservations'
    },
    {
      $match: {
        'reservations.ingredientId': new mongoose.Types.ObjectId(ingredientId),
        'reservations.status': 'reserved'
      }
    },
    {
      $group: {
        _id: '$reservations.ingredientId',
        totalReserved: { $sum: '$reservations.quantityReserved' },
        reservationCount: { $sum: 1 },
        totalValue: { $sum: '$reservations.totalCost' },
        unit: { $first: '$reservations.unit' }
      }
    }
  ];
  
  const result = await this.aggregate(pipeline);
  return result[0] || {
    totalReserved: 0,
    reservationCount: 0,
    totalValue: 0,
    unit: null
  };
};

// Instance method to extend expiration
InventoryReservationSchema.methods.extendExpiration = function(additionalMinutes, userId, reason) {
  if (!this.originalExpiresAt) {
    this.originalExpiresAt = this.expiresAt;
  }
  
  this.expiresAt = new Date(this.expiresAt.getTime() + additionalMinutes * 60 * 1000);
  this.extendedBy = userId;
  this.extendedAt = new Date();
  this.extensionReason = reason;
  
  return this.save();
};

// Instance method to release reservation
InventoryReservationSchema.methods.release = function(userId, reason) {
  this.status = 'released';
  this.modifiedBy = userId;
  this.notes = reason ? `Released: ${reason}` : 'Released manually';
  
  // Mark all reservation items as released
  this.reservations.forEach(reservation => {
    if (reservation.status === 'reserved') {
      reservation.status = 'released';
    }
  });
  
  return this.save();
};

// Instance method to consume reservation (convert to actual inventory usage)
InventoryReservationSchema.methods.consume = function(userId) {
  this.status = 'consumed';
  this.modifiedBy = userId;
  
  // Mark all reservation items as consumed
  this.reservations.forEach(reservation => {
    if (reservation.status === 'reserved') {
      reservation.status = 'consumed';
    }
  });
  
  return this.save();
};

// Instance method to check if reservation is expired
InventoryReservationSchema.methods.isExpired = function() {
  return this.expiresAt <= new Date();
};

// Instance method to get remaining time in minutes
InventoryReservationSchema.methods.getRemainingMinutes = function() {
  const now = new Date();
  if (this.expiresAt <= now) return 0;
  return Math.floor((this.expiresAt.getTime() - now.getTime()) / (1000 * 60));
};

// Ensure virtual fields are included in JSON output
InventoryReservationSchema.set('toJSON', { virtuals: true });
InventoryReservationSchema.set('toObject', { virtuals: true });

module.exports = mongoose.model('InventoryReservation', InventoryReservationSchema);