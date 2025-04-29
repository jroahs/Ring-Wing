const mongoose = require('mongoose');

const inventoryBatchSchema = new mongoose.Schema({
  quantity: { 
    type: Number, 
    required: [true, 'Quantity is required'],
    min: [0, 'Quantity cannot be negative']
  },
  expirationDate: { 
    type: Date, 
    required: [true, 'Expiration date is required'] 
  },
  addedAt: { 
    type: Date, 
    default: Date.now 
  }
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
    enum: ['pieces', 'grams', 'liters'],
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
    min: [0, 'Cost cannot be negative']
  },
  price: { 
    type: Number, 
    required: [true, 'Price is required'],
    min: [0, 'Price cannot be negative']
  },
  vendor: { 
    type: String, 
    required: [true, 'Vendor is required'],
    trim: true
  }
}, { 
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Virtual fields
itemSchema.virtual('totalQuantity').get(function() {
  return this.inventory.reduce((sum, batch) => sum + batch.quantity, 0);
});

itemSchema.virtual('expirationAlerts').get(function() {
  const now = new Date();
  return this.inventory.map(batch => {
    const expirationDate = new Date(batch.expirationDate);

    // Convert to PH Time (UTC+8)
    const phNow = new Date(now.getTime() + 8 * 60 * 60 * 1000);
    const phExpiration = new Date(expirationDate.getTime() + 8 * 60 * 60 * 1000);

    // Set to midnight in PH time
    phNow.setHours(0, 0, 0, 0);
    phExpiration.setHours(0, 0, 0, 0);

    const timeDiff = phExpiration - phNow;
    const daysLeft = Math.ceil(timeDiff / (1000 * 3600 * 24));

    return { 
      ...batch,  // Changed from batch.toObject()
      daysLeft 
    };
  }).filter(batch => batch.daysLeft <= 7);
});
// Pre-save hook
itemSchema.pre('save', function(next) {
  this.status = this.totalQuantity === 0 ? 'Out of Stock' :
                this.totalQuantity <= 5 ? 'Low Stock' : 'In Stock';
  next();
});

module.exports = mongoose.model('Item', itemSchema);