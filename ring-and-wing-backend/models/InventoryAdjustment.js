const mongoose = require('mongoose');

const AdjustmentItemSchema = new mongoose.Schema({
  itemId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Item',
    required: [true, 'Item ID is required'],
    index: true
  },
  
  quantityBefore: {
    type: Number,
    required: [true, 'Quantity before adjustment is required'],
    min: 0,
    validate: {
      validator: function(value) {
        return Number.isFinite(value) && value >= 0;
      },
      message: 'Quantity before must be a valid non-negative number'
    }
  },
  
  quantityAfter: {
    type: Number,
    required: [true, 'Quantity after adjustment is required'],
    min: 0,
    validate: {
      validator: function(value) {
        return Number.isFinite(value) && value >= 0;
      },
      message: 'Quantity after must be a valid non-negative number'
    }
  },
  
  quantityChanged: {
    type: Number,
    required: [true, 'Quantity changed is required'],
    validate: {
      validator: function(value) {
        return Number.isFinite(value);
      },
      message: 'Quantity changed must be a valid number'
    }
  },
  
  unit: {
    type: String,
    required: [true, 'Unit is required'],
    enum: ['grams', 'kg', 'ml', 'liters', 'pieces', 'cups', 'tablespoons', 'teaspoons', 'ounces', 'pounds'],
    lowercase: true,
    trim: true
  },
  
  reason: {
    type: String,
    required: [true, 'Reason for adjustment is required'],
    maxlength: [500, 'Reason cannot exceed 500 characters'],
    trim: true
  },
  
  // For FIFO compatibility - track which specific batches were affected
  batchId: {
    type: mongoose.Schema.Types.ObjectId,
    required: false, // Not all adjustments are batch-specific
    index: true
  },
  
  lotNumber: {
    type: String,
    maxlength: [50, 'Lot number cannot exceed 50 characters'],
    trim: true
  },
  
  expirationDate: Date,
  
  // Cost tracking
  unitCostBefore: {
    type: Number,
    min: 0,
    default: 0
  },
  
  unitCostAfter: {
    type: Number,
    min: 0,
    default: 0
  },
  
  totalValueImpact: {
    type: Number,
    default: 0,
    validate: {
      validator: function(value) {
        return Number.isFinite(value);
      },
      message: 'Total value impact must be a valid number'
    }
  },
  
  // Additional context
  supplierInfo: {
    supplierId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Supplier'
    },
    supplierName: String,
    invoiceNumber: String
  }
}, { 
  _id: false // Embedded schema
});

const InventoryAdjustmentSchema = new mongoose.Schema({
  referenceId: {
    type: mongoose.Schema.Types.ObjectId,
    required: [true, 'Reference ID is required for traceability'],
    index: true
  },
  
  referenceType: {
    type: String,
    required: [true, 'Reference type is required'],
    enum: {
      values: [
        'order_reservation',      // Created when inventory is reserved for order
        'order_consumption',      // Created when order is completed and inventory consumed
        'order_release',          // Created when reservation is released/cancelled
        'manual_adjustment',      // Manual count adjustments
        'receiving',              // New inventory received
        'waste',                  // Expired or damaged inventory
        'theft_loss',             // Inventory shrinkage
        'recipe_test',            // Used for recipe testing
        'system_correction',      // System-initiated corrections
        'transfer_in',            // Transferred from another location
        'transfer_out',           // Transferred to another location
        'promotion_sample'        // Used for promotional samples
      ],
      message: 'Invalid reference type'
    },
    index: true
  },
  
  adjustments: [AdjustmentItemSchema],
  
  // Audit information
  performedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'User performing adjustment is required'],
    index: true
  },
  
  authorizedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: false // Some adjustments may be automatically authorized
  },
  
  timestamp: {
    type: Date,
    default: Date.now,
    required: true,
    index: true
  },
  
  // Additional context
  notes: {
    type: String,
    maxlength: [1000, 'Notes cannot exceed 1000 characters'],
    trim: true
  },
  
  // System metadata
  systemGenerated: {
    type: Boolean,
    default: false,
    required: true
  },
  
  applicationVersion: {
    type: String,
    default: process.env.APP_VERSION || '1.0.0',
    maxlength: 20
  },
  
  // Location/shift context
  location: {
    type: String,
    maxlength: [100, 'Location cannot exceed 100 characters'],
    trim: true
  },
  
  shift: {
    type: String,
    enum: ['morning', 'afternoon', 'evening', 'night'],
    required: false
  },
  
  // Total impact summary
  totalQuantityImpact: {
    type: Number,
    default: 0,
    validate: {
      validator: function(value) {
        return Number.isFinite(value);
      },
      message: 'Total quantity impact must be a valid number'
    }
  },
  
  totalValueImpact: {
    type: Number,
    default: 0,
    validate: {
      validator: function(value) {
        return Number.isFinite(value);
      },
      message: 'Total value impact must be a valid number'
    }
  },
  
  // Compliance tracking
  complianceFlags: [{
    type: {
      type: String,
      enum: ['food_safety', 'regulatory', 'audit_required', 'variance_threshold'],
      required: true
    },
    description: String,
    resolved: {
      type: Boolean,
      default: false
    },
    resolvedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    resolvedAt: Date
  }],
  
  // External references
  externalReferences: [{
    type: {
      type: String,
      enum: ['invoice', 'delivery_receipt', 'waste_report', 'count_sheet', 'pos_transaction'],
      required: true
    },
    referenceNumber: String,
    documentUrl: String
  }]
  
}, {
  timestamps: true, // Adds createdAt and updatedAt
  versionKey: false // Audit records should be immutable
});

// Indexes for efficient querying and reporting
InventoryAdjustmentSchema.index({ timestamp: -1 }); // Recent adjustments first
InventoryAdjustmentSchema.index({ performedBy: 1, timestamp: -1 }); // User activity reports
InventoryAdjustmentSchema.index({ referenceType: 1, timestamp: -1 }); // Adjustment type reports
InventoryAdjustmentSchema.index({ 'adjustments.itemId': 1, timestamp: -1 }); // Item history
InventoryAdjustmentSchema.index({ referenceId: 1, referenceType: 1 }); // Traceability queries
InventoryAdjustmentSchema.index({ totalValueImpact: -1 }); // High-impact adjustments
InventoryAdjustmentSchema.index({ systemGenerated: 1, timestamp: -1 }); // System vs manual adjustments
InventoryAdjustmentSchema.index({ 'complianceFlags.type': 1, 'complianceFlags.resolved': 1 }); // Compliance monitoring

// Pre-save middleware to calculate totals
InventoryAdjustmentSchema.pre('save', function(next) {
  // Calculate total quantity and value impacts
  this.totalQuantityImpact = this.adjustments.reduce((total, adj) => {
    return total + Math.abs(adj.quantityChanged);
  }, 0);
  
  this.totalValueImpact = this.adjustments.reduce((total, adj) => {
    return total + (adj.totalValueImpact || 0);
  }, 0);
  
  // Ensure quantityChanged is calculated correctly for each adjustment
  this.adjustments.forEach(adjustment => {
    if (adjustment.quantityBefore !== undefined && adjustment.quantityAfter !== undefined) {
      adjustment.quantityChanged = adjustment.quantityAfter - adjustment.quantityBefore;
      
      // Calculate total value impact if unit costs are available
      if (adjustment.unitCostAfter && adjustment.unitCostBefore) {
        const avgCost = (adjustment.unitCostAfter + adjustment.unitCostBefore) / 2;
        adjustment.totalValueImpact = adjustment.quantityChanged * avgCost;
      }
    }
  });
  
  next();
});

// Static method to get adjustment history for an item
InventoryAdjustmentSchema.statics.getItemHistory = function(itemId, options = {}) {
  const {
    limit = 50,
    startDate = null,
    endDate = null,
    referenceTypes = null
  } = options;
  
  const query = {
    'adjustments.itemId': itemId
  };
  
  if (startDate && endDate) {
    query.timestamp = {
      $gte: new Date(startDate),
      $lte: new Date(endDate)
    };
  }
  
  if (referenceTypes && Array.isArray(referenceTypes)) {
    query.referenceType = { $in: referenceTypes };
  }
  
  return this.find(query)
    .populate('performedBy', 'username position')
    .populate('authorizedBy', 'username position')
    .sort({ timestamp: -1 })
    .limit(limit);
};

// Static method to get adjustment summary by type
InventoryAdjustmentSchema.statics.getSummaryByType = async function(startDate, endDate) {
  const pipeline = [
    {
      $match: {
        timestamp: {
          $gte: new Date(startDate),
          $lte: new Date(endDate)
        }
      }
    },
    {
      $group: {
        _id: '$referenceType',
        count: { $sum: 1 },
        totalQuantityImpact: { $sum: '$totalQuantityImpact' },
        totalValueImpact: { $sum: '$totalValueImpact' },
        avgValueImpact: { $avg: '$totalValueImpact' }
      }
    },
    {
      $sort: { totalValueImpact: -1 }
    }
  ];
  
  return this.aggregate(pipeline);
};

// Static method to find large adjustments requiring review
InventoryAdjustmentSchema.statics.findLargeAdjustments = function(valueThreshold = 100, quantityThreshold = 50) {
  return this.find({
    $or: [
      { totalValueImpact: { $gte: valueThreshold } },
      { totalQuantityImpact: { $gte: quantityThreshold } }
    ],
    'complianceFlags.resolved': { $ne: true }
  }).populate('performedBy', 'username position')
    .populate('authorizedBy', 'username position')
    .sort({ timestamp: -1 });
};

// Static method to create adjustment for order reservation
InventoryAdjustmentSchema.statics.createOrderReservationAdjustment = function(orderId, adjustments, performedBy) {
  return this.create({
    referenceId: orderId,
    referenceType: 'order_reservation',
    adjustments: adjustments,
    performedBy: performedBy,
    systemGenerated: true,
    notes: 'Inventory reserved for order processing'
  });
};

// Static method to create adjustment for order consumption
InventoryAdjustmentSchema.statics.createOrderConsumptionAdjustment = function(orderId, adjustments, performedBy) {
  return this.create({
    referenceId: orderId,
    referenceType: 'order_consumption',
    adjustments: adjustments,
    performedBy: performedBy,
    systemGenerated: true,
    notes: 'Inventory consumed for completed order'
  });
};

// Instance method to add compliance flag
InventoryAdjustmentSchema.methods.addComplianceFlag = function(type, description) {
  this.complianceFlags.push({
    type: type,
    description: description,
    resolved: false
  });
  return this.save();
};

// Instance method to resolve compliance flag
InventoryAdjustmentSchema.methods.resolveComplianceFlag = function(flagIndex, resolvedBy) {
  if (this.complianceFlags[flagIndex]) {
    this.complianceFlags[flagIndex].resolved = true;
    this.complianceFlags[flagIndex].resolvedBy = resolvedBy;
    this.complianceFlags[flagIndex].resolvedAt = new Date();
  }
  return this.save();
};

// Virtual for calculated total items affected
InventoryAdjustmentSchema.virtual('itemsAffected').get(function() {
  return this.adjustments.length;
});

// Virtual for net quantity change (positive = increase, negative = decrease)
InventoryAdjustmentSchema.virtual('netQuantityChange').get(function() {
  return this.adjustments.reduce((total, adj) => {
    return total + adj.quantityChanged;
  }, 0);
});

// Ensure virtuals are included in JSON output
InventoryAdjustmentSchema.set('toJSON', { virtuals: true });
InventoryAdjustmentSchema.set('toObject', { virtuals: true });

module.exports = mongoose.model('InventoryAdjustment', InventoryAdjustmentSchema);