const mongoose = require('mongoose');

const MenuItemIngredientSchema = new mongoose.Schema({
  menuItemId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'MenuItem',
    required: [true, 'Menu item ID is required'],
    index: true // Index for fast lookups by menu item
  },
  
  ingredientId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Item', // References the existing inventory Item model
    required: [true, 'Ingredient ID is required'],
    index: true // Index for fast lookups by ingredient
  },
  
  quantity: {
    type: Number,
    required: [true, 'Quantity is required'],
    min: [0.001, 'Quantity must be greater than 0'],
    validate: {
      validator: function(value) {
        return Number.isFinite(value) && value > 0;
      },
      message: 'Quantity must be a positive number'
    }
  },
  
  unit: {
    type: String,
    required: [true, 'Unit is required'],
    enum: {
      values: ['grams', 'kg', 'ml', 'liters', 'pieces', 'cups', 'tablespoons', 'teaspoons', 'ounces', 'pounds'],
      message: 'Unit must be one of: grams, kg, ml, liters, pieces, cups, tablespoons, teaspoons, ounces, pounds'
    },
    lowercase: true,
    trim: true
  },
  
  isRequired: {
    type: Boolean,
    default: true,
    required: true
  },
  
  substitutions: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Item',
    validate: {
      validator: function(substitutionId) {
        // Ensure substitution is not the same as the main ingredient
        return !this.ingredientId || !substitutionId.equals(this.ingredientId);
      },
      message: 'Substitution cannot be the same as the main ingredient'
    }
  }],
  
  notes: {
    type: String,
    maxlength: [500, 'Notes cannot exceed 500 characters'],
    trim: true
  },
  
  // Metadata
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'Created by user ID is required']
  },
  
  lastModifiedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'Last modified by user ID is required']
  },
  
  isActive: {
    type: Boolean,
    default: true,
    required: true
  }
  
}, {
  timestamps: true, // Adds createdAt and updatedAt automatically
  
  // Add version key for optimistic concurrency control
  versionKey: 'version'
});

// Compound indexes for efficient queries
MenuItemIngredientSchema.index({ menuItemId: 1, ingredientId: 1 }, { unique: true }); // Prevent duplicate mappings
MenuItemIngredientSchema.index({ ingredientId: 1, isActive: 1 }); // Find all menu items using an ingredient
MenuItemIngredientSchema.index({ menuItemId: 1, isActive: 1 }); // Find all ingredients for a menu item
MenuItemIngredientSchema.index({ createdBy: 1, createdAt: -1 }); // Audit queries by user

// Virtual for ingredient details (populated)
MenuItemIngredientSchema.virtual('ingredient', {
  ref: 'Item',
  localField: 'ingredientId',
  foreignField: '_id',
  justOne: true
});

// Virtual for menu item details (populated)
MenuItemIngredientSchema.virtual('menuItem', {
  ref: 'MenuItem',
  localField: 'menuItemId',
  foreignField: '_id',
  justOne: true
});

// Pre-save middleware for validation
MenuItemIngredientSchema.pre('save', async function(next) {
  try {
    // Verify that the referenced menuItem and ingredient exist
    if (this.isNew || this.isModified('menuItemId')) {
      const MenuItem = mongoose.model('MenuItem');
      const menuItem = await MenuItem.findById(this.menuItemId);
      if (!menuItem) {
        throw new Error('Referenced menu item does not exist');
      }
    }
    
    if (this.isNew || this.isModified('ingredientId')) {
      const Item = mongoose.model('Item');
      const ingredient = await Item.findById(this.ingredientId);
      if (!ingredient) {
        throw new Error('Referenced ingredient does not exist');
      }
    }
    
    // Validate substitutions exist
    if (this.substitutions && this.substitutions.length > 0) {
      const Item = mongoose.model('Item');
      const substitutionCount = await Item.countDocuments({
        _id: { $in: this.substitutions }
      });
      
      if (substitutionCount !== this.substitutions.length) {
        throw new Error('One or more substitution ingredients do not exist');
      }
    }
    
    next();
  } catch (error) {
    next(error);
  }
});

// Static method to find ingredients for a menu item
MenuItemIngredientSchema.statics.findByMenuItem = function(menuItemId, includeInactive = false) {
  console.log(`MenuItemIngredient.findByMenuItem called with: ${menuItemId} (type: ${typeof menuItemId})`);
  
  const { ObjectId } = require('mongoose').Types;
  
  // Try both string and ObjectId versions of the menuItemId
  const query = {
    $or: [
      { menuItemId: menuItemId },
      { menuItemId: ObjectId.isValid(menuItemId) ? new ObjectId(menuItemId) : null }
    ].filter(Boolean) // Remove null values
  };
  
  if (!includeInactive) {
    query.isActive = true;
  }
  
  console.log(`Query being executed:`, JSON.stringify(query, null, 2));
  
  return this.find(query)
    .populate('ingredientId', 'name category unit currentStock price')
    .populate('substitutions', 'name category unit currentStock price')
    .sort({ createdAt: 1 });
};

// Static method to find menu items using an ingredient
MenuItemIngredientSchema.statics.findByIngredient = function(ingredientId, includeInactive = false) {
  const query = { 
    $or: [
      { ingredientId: ingredientId },
      { substitutions: ingredientId }
    ]
  };
  
  if (!includeInactive) {
    query.isActive = true;
  }
  
  return this.find(query)
    .populate('menuItemId', 'name price category availability')
    .populate('ingredientId', 'name category unit currentStock')
    .sort({ createdAt: 1 });
};

// Static method to get ingredient requirements for multiple menu items
MenuItemIngredientSchema.statics.getRequirementsForOrder = async function(orderItems) {
  const requirements = new Map();
  
  for (const orderItem of orderItems) {
    const ingredients = await this.findByMenuItem(orderItem.menuItemId);
    
    for (const ingredient of ingredients) {
      // Add null check for ingredientId
      if (!ingredient.ingredientId) {
        console.warn(`Ingredient mapping has null ingredientId for menu item ${orderItem.menuItemId}`);
        continue; // Skip this ingredient
      }
      
      const key = ingredient.ingredientId.toString();
      const requiredQuantity = ingredient.quantity * orderItem.quantity;
      
      if (requirements.has(key)) {
        requirements.set(key, {
          ...requirements.get(key),
          totalRequired: requirements.get(key).totalRequired + requiredQuantity
        });
      } else {
        requirements.set(key, {
          ingredientId: ingredient.ingredientId,
          ingredient: ingredient.ingredientId, // Will be populated
          totalRequired: requiredQuantity,
          unit: ingredient.unit,
          isRequired: ingredient.isRequired,
          substitutions: ingredient.substitutions,
          fromMenuItems: []
        });
      }
      
      // Track which menu items require this ingredient
      requirements.get(key).fromMenuItems.push({
        menuItemId: orderItem.menuItemId,
        menuItemName: orderItem.name,
        quantity: orderItem.quantity,
        requiredAmount: requiredQuantity
      });
    }
  }
  
  return Array.from(requirements.values());
};

// Instance method to calculate total cost
MenuItemIngredientSchema.methods.calculateIngredientCost = async function() {
  await this.populate('ingredientId');
  if (!this.ingredientId || !this.ingredientId.price) {
    return 0;
  }
  
  return this.quantity * this.ingredientId.price;
};

// Ensure virtual fields are included in JSON output
MenuItemIngredientSchema.set('toJSON', { virtuals: true });
MenuItemIngredientSchema.set('toObject', { virtuals: true });

module.exports = mongoose.model('MenuItemIngredient', MenuItemIngredientSchema);