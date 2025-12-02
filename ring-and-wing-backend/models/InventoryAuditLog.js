const mongoose = require('mongoose');

const inventoryAuditLogSchema = new mongoose.Schema({
  action: {
    type: String,
    required: [true, 'Action is required'],
    enum: [
      'add_item',
      'edit_item', 
      'delete_item',
      'restock',
      'consumption',
      'dispose',
      'end_day_count',
      'batch_update',
      'other'
    ]
  },
  description: {
    type: String,
    required: [true, 'Description is required']
  },
  itemId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Item',
    required: false
  },
  itemName: {
    type: String,
    required: false
  },
  batchId: {
    type: mongoose.Schema.Types.ObjectId,
    required: false
  },
  user: {
    type: String,
    default: 'admin'
  },
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: false
  },
  details: {
    // Flexible field for storing additional context
    quantity: Number,
    cost: Number,
    unitPrice: Number,
    previousValue: mongoose.Schema.Types.Mixed,
    newValue: mongoose.Schema.Types.Mixed
  },
  timestamp: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true
});

// Index for efficient querying
inventoryAuditLogSchema.index({ timestamp: -1 });
inventoryAuditLogSchema.index({ itemId: 1, timestamp: -1 });
inventoryAuditLogSchema.index({ action: 1, timestamp: -1 });

module.exports = mongoose.model('InventoryAuditLog', inventoryAuditLogSchema);
