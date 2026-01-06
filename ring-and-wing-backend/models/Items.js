const mongoose = require('mongoose');
const { formatBusinessDateKey, businessDateTimeUtc } = require('../utils/businessTime');

const inventoryBatchSchema = new mongoose.Schema({
  quantity: { 
    type: Number, 
    required: [true, 'Quantity is required'],
    min: [0, 'Quantity cannot be negative']
  },
  // Track the original purchased quantity for accurate unit price calculation
  purchasedQuantity: {
    type: Number,
    required: false, // Will be set from quantity on creation if not provided
    min: [0, 'Purchased quantity cannot be negative']
  },
  // Track the cost of this specific batch for accurate unit price calculation
  batchCost: {
    type: Number,
    required: false,
    min: [0, 'Batch cost cannot be negative']
  },
  expirationDate: {
    type: Date,
    required: false
  },
  addedAt: { 
    type: Date, 
    default: Date.now 
  },
  // Added for daily inventory tracking
  dailyStartQuantity: {
    type: Number,
    default: function() { return this.quantity; }
  },
  dailyEndQuantity: {
    type: Number
  },
  lastTallied: {
    type: Date
  }
});

// Pre-save hook for batch to set purchasedQuantity if not set
inventoryBatchSchema.pre('save', function(next) {
  if (!this.purchasedQuantity) {
    this.purchasedQuantity = this.quantity;
  }
  next();
});

const itemSchema = new mongoose.Schema({
  name: { 
    type: String, 
    required: [true, 'Item name is required'],
    trim: true
  },
  category: { 
    type: String,
    enum: ['Food', 'Beverages', 'Ingredients', 'Packaging'],
    required: [true, 'Category is required']
  },
  unit: {
    type: String,
    enum: ['pieces', 'grams', 'kilograms', 'milliliters', 'liters'],
    required: [true, 'Unit is required']
  },
  status: {
    type: String,
    enum: ['In Stock', 'Low Stock', 'Out of Stock'],
    default: 'In Stock'
  },
  inventory: [inventoryBatchSchema],
  cost: { 
    type: Number, 
    required: [true, 'Cost is required'],
    min: [0, 'Cost cannot be negative'],
    default: 0
  },
  // Store initial purchased quantity for the first batch (for calculating unitPrice)
  initialPurchasedQuantity: {
    type: Number,
    required: false,
    min: [0, 'Initial purchased quantity cannot be negative']
  },
  price: { 
    type: Number, 
    required: false, // No longer required - will be auto-calculated
    min: [0, 'Price cannot be negative'],
    default: 0
  },
  vendor: { 
    type: String, 
    required: [true, 'Vendor is required'],
    trim: true
  },
  // Some inventory items (e.g., utensils) do not need expiry tracking
  trackExpiration: {
    type: Boolean,
    default: true
  },
  // Minimum thresholds for different unit types
  minimumThreshold: {
    type: Number,
    default: 5 // Default 5 for pieces, can be overridden for weight/volume units
  },
  // Track if the item is count-based or weight-based
  isCountBased: {
    type: Boolean,
    default: function() {
      return this.unit === 'pieces';
    }
  }
}, { 
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Virtual fields
itemSchema.virtual('totalQuantity').get(function() {
  return this.inventory && Array.isArray(this.inventory) ? this.inventory.reduce((sum, batch) => sum + batch.quantity, 0) : 0;
});

// Total purchased quantity across all batches
itemSchema.virtual('totalPurchasedQuantity').get(function() {
  return this.inventory && Array.isArray(this.inventory) 
    ? this.inventory.reduce((sum, batch) => sum + (batch.purchasedQuantity || batch.quantity), 0) 
    : 0;
});

// Auto-calculated unit price based on cost and purchased quantity
// Formula: unitPrice = totalCost / totalPurchasedQuantity
itemSchema.virtual('unitPrice').get(function() {
  // First try to calculate from batches with their individual costs
  if (this.inventory && Array.isArray(this.inventory)) {
    const batchesWithCost = this.inventory.filter(b => b.batchCost && b.purchasedQuantity);
    if (batchesWithCost.length > 0) {
      const totalBatchCost = batchesWithCost.reduce((sum, b) => sum + b.batchCost, 0);
      const totalBatchQty = batchesWithCost.reduce((sum, b) => sum + b.purchasedQuantity, 0);
      if (totalBatchQty > 0) {
        return totalBatchCost / totalBatchQty;
      }
    }
  }
  
  // Fallback: use overall cost and initialPurchasedQuantity or totalPurchasedQuantity
  const purchasedQty = this.initialPurchasedQuantity || this.totalPurchasedQuantity;
  if (purchasedQty > 0 && this.cost > 0) {
    return this.cost / purchasedQty;
  }
  
  // Final fallback: use the stored price field if it exists
  return this.price || 0;
});

// Daily usage tracking
itemSchema.virtual('dailyUsage').get(function() {
  return this.inventory && Array.isArray(this.inventory) ? this.inventory.reduce((sum, batch) => {
    if (batch.dailyStartQuantity && batch.dailyEndQuantity !== undefined) {
      return sum + (batch.dailyStartQuantity - batch.dailyEndQuantity);
    }
    return sum;
  }, 0) : 0;
});

itemSchema.virtual('expirationAlerts').get(function() {
  if (!this.inventory || !Array.isArray(this.inventory)) return [];
  
  const now = new Date();
  const nowKey = formatBusinessDateKey(now);
  const nowNoonUtc = businessDateTimeUtc(nowKey, 12, 0, 0, 0);
  return this.inventory
  .filter(batch => batch && batch.expirationDate)
  .map(batch => {
    const expirationDate = new Date(batch.expirationDate);

    const expKey = formatBusinessDateKey(expirationDate);
    const expNoonUtc = businessDateTimeUtc(expKey, 12, 0, 0, 0);
    const timeDiff = expNoonUtc - nowNoonUtc;
    const daysLeft = Math.ceil(timeDiff / (1000 * 3600 * 24));

    return { 
      ...batch,
      daysLeft 
    };
  }).filter(batch => batch.daysLeft <= 7);
});

// Pre-save hook
itemSchema.pre('save', function(next) {
  // Dynamic threshold based on unit type
  const threshold = this.minimumThreshold || 
                    (this.unit === 'pieces' ? 5 :
                     this.unit === 'grams' ? 500 :
                     this.unit === 'kilograms' ? 0.5 :
                     this.unit === 'milliliters' ? 500 :
                     this.unit === 'liters' ? 0.5 : 5);
                     
  this.status = this.totalQuantity === 0 ? 'Out of Stock' :
                this.totalQuantity <= threshold ? 'Low Stock' : 'In Stock';
  next();
});

module.exports = mongoose.model('Item', itemSchema);