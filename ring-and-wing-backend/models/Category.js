const mongoose = require('mongoose');

const sizeSchema = new mongoose.Schema({
  name: { 
    type: String, 
    required: true 
  },
  displayName: { 
    type: String, 
    required: true 
  },
  isDefault: { 
    type: Boolean, 
    default: false 
  },
  sortOrder: { 
    type: Number, 
    default: 0 
  }
}, { _id: false });

const subCategorySchema = new mongoose.Schema({
  name: { 
    type: String, 
    required: true 
  },
  displayName: { 
    type: String, 
    required: true 
  },
  description: { 
    type: String 
  },
  sortOrder: { 
    type: Number, 
    default: 0 
  },
  isActive: { 
    type: Boolean, 
    default: true 
  },
  // Sizing configuration for this subcategory
  sizes: [sizeSchema],
  // Available addons for this subcategory (references to AddOn collection)
  availableAddons: [{ 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'AddOn' 
  }],
  // Business rules and validation
  rules: {
    requiresSize: { 
      type: Boolean, 
      default: true 
    },
    allowMultipleSizes: { 
      type: Boolean, 
      default: false 
    },
    defaultPreparationTime: { 
      type: Number, 
      default: 15 
    },
    hasAddons: {
      type: Boolean,
      default: false
    }
  }
});

const categorySchema = new mongoose.Schema({
  name: { 
    type: String, 
    required: true, 
    unique: true,
    index: true,
    trim: true
  },
  displayName: { 
    type: String, 
    required: true,
    trim: true
  },
  description: { 
    type: String,
    trim: true
  },
  sortOrder: { 
    type: Number, 
    default: 0 
  },
  isActive: { 
    type: Boolean, 
    default: true 
  },
  // Icon or image for the category (optional)
  icon: {
    type: String
  },
  // Color theme for UI (optional)
  colorTheme: {
    type: String,
    default: '#f1670f'
  },
  // Subcategories array
  subCategories: [subCategorySchema],
  // Category-level business rules
  categoryRules: {
    allowDirectItems: {
      type: Boolean,
      default: true,
      description: 'Whether items can be assigned directly to category without subcategory'
    },
    requireSubcategory: {
      type: Boolean,
      default: false,
      description: 'Whether all items in this category must have a subcategory'
    }
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Virtual for active subcategories count
categorySchema.virtual('activeSubCategoriesCount').get(function() {
  return this.subCategories.filter(sub => sub.isActive).length;
});

// Index for better query performance
categorySchema.index({ isActive: 1, sortOrder: 1 });
categorySchema.index({ 'subCategories.name': 1 });

// Pre-save middleware to update timestamps
categorySchema.pre('save', function(next) {
  this.updatedAt = Date.now();
  next();
});

// Static method to get categories with their configuration
categorySchema.statics.getCategoriesWithConfig = async function() {
  try {
    const categories = await this.find({ isActive: true })
      .sort({ sortOrder: 1, name: 1 })
      .populate('subCategories.availableAddons')
      .exec();
    
    // Sort subcategories within each category for consistent ordering
    return categories.map(category => {
      if (category.subcategories && category.subcategories.length > 0) {
        category.subcategories.sort((a, b) => {
          if ((a.sortOrder || 0) !== (b.sortOrder || 0)) {
            return (a.sortOrder || 0) - (b.sortOrder || 0);
          }
          return (a.name || '').localeCompare(b.name || '');
        });
      }
      return category;
    });
  } catch (populateError) {
    // Fallback without populate if AddOn model is not available
    console.warn('Could not populate addons, returning without population:', populateError.message);
    const categories = await this.find({ isActive: true })
      .sort({ sortOrder: 1, name: 1 })
      .exec();
    
    // Sort subcategories within each category for consistent ordering
    return categories.map(category => {
      if (category.subcategories && category.subcategories.length > 0) {
        category.subcategories.sort((a, b) => {
          if ((a.sortOrder || 0) !== (b.sortOrder || 0)) {
            return (a.sortOrder || 0) - (b.sortOrder || 0);
          }
          return (a.name || '').localeCompare(b.name || '');
        });
      }
      return category;
    });
  }
};

// Static method to get simple category list (for backward compatibility)
categorySchema.statics.getSimpleCategories = async function() {
  const categories = await this.find({ isActive: true })
    .sort({ sortOrder: 1, name: 1 })
    .exec();
    
  // Sort subcategories within each category for consistent ordering
  return categories.map(category => {
    if (category.subcategories && category.subcategories.length > 0) {
      category.subcategories.sort((a, b) => {
        if ((a.sortOrder || 0) !== (b.sortOrder || 0)) {
          return (a.sortOrder || 0) - (b.sortOrder || 0);
        }
        return (a.name || '').localeCompare(b.name || '');
      });
    }
    return category;
  });
  
  return categories.map(cat => ({
    category: cat.name,
    displayName: cat.displayName,
    subCategories: cat.subCategories
      .filter(sub => sub.isActive)
      .map(sub => sub.name)
  }));
};

// Instance method to add subcategory
categorySchema.methods.addSubCategory = function(subCategoryData) {
  this.subCategories.push(subCategoryData);
  return this.save();
};

// Instance method to update subcategory
categorySchema.methods.updateSubCategory = function(subCategoryId, updateData) {
  const subCategory = this.subCategories.id(subCategoryId);
  if (!subCategory) {
    throw new Error('Subcategory not found');
  }
  
  Object.assign(subCategory, updateData);
  return this.save();
};

// Instance method to remove subcategory (soft delete)
categorySchema.methods.removeSubCategory = function(subCategoryId) {
  const subCategory = this.subCategories.id(subCategoryId);
  if (!subCategory) {
    throw new Error('Subcategory not found');
  }
  
  subCategory.isActive = false;
  return this.save();
};

module.exports = mongoose.model('Category', categorySchema);
