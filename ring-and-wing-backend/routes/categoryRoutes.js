const express = require('express');
const router = express.Router();
const Menu = require('../models/MenuItem');
const Category = require('../models/Category');
const { logger } = require('../config/logger');

// GET /api/categories - Enhanced endpoint with backward compatibility
router.get('/', async (req, res) => {
  try {
    const { format = 'legacy', includeConfig = false } = req.query;
    console.log('🔧 API Request - format:', format, 'includeConfig:', includeConfig);
    
    // Check if we have categories in the new Category collection
    const categoryCount = await Category.countDocuments({ isActive: true });
    console.log('🔧 Active category count:', categoryCount);
    
    if (categoryCount > 0) {
      console.log('🔧 Using new Category model');
      // Use new Category model
      if (format === 'config' || includeConfig === 'true') {
        // Return full configuration for frontend components
        const categories = await Category.getCategoriesWithConfig();
        console.log('🔧 Returning config format:', categories.length, 'categories');
        return res.json({
          success: true,
          source: 'database',
          categories: categories
        });
      } else {
        // Return simple format for backward compatibility
        console.log('🔧 Getting simple categories...');
        const categories = await Category.getSimpleCategories();
        console.log('🔧 Simple categories result:', categories.map(c => ({ name: c.name, sortOrder: c.sortOrder })));
        return res.json(categories);
      }
    } else {
      // Fallback to legacy method (aggregating from MenuItem collection)
      logger.info('Using legacy category aggregation from MenuItem collection');
      const categories = await Menu.aggregate([
        {
          $group: {
            _id: '$category',
            subCategories: { $addToSet: '$subCategory' }
          }
        },
        {
          $project: {
            _id: 0,
            category: '$_id',
            subCategories: 1
          }
        }
      ]);

      res.json(categories);
    }
  } catch (error) {
    console.error('🔧 API Error in /api/categories:', error);
    logger.error('Error fetching categories:', error);
    res.status(500).json({ 
      success: false,
      message: 'Server error',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// GET /api/categories/config - Full configuration endpoint
router.get('/config', async (req, res) => {
  try {
    let categories;
    try {
      categories = await Category.getCategoriesWithConfig();
    } catch (populateError) {
      logger.warn('Could not populate addons in config endpoint, returning without population:', populateError.message);
      categories = await Category.find({ isActive: true })
        .sort({ sortOrder: 1, name: 1 })
        .exec();
    }
    
    res.json({
      success: true,
      categories: categories,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    logger.error('Error fetching category config:', error);
    res.status(500).json({ 
      success: false,
      message: 'Failed to fetch category configuration',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// GET /api/categories/simple - Simple format for backward compatibility
router.get('/simple', async (req, res) => {
  try {
    const categories = await Category.getSimpleCategories();
    res.json({
      success: true,
      categories: categories
    });
  } catch (error) {
    logger.error('Error fetching simple categories:', error);
    res.status(500).json({ 
      success: false,
      message: 'Failed to fetch categories',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// POST /api/categories - Create new category
router.post('/', async (req, res) => {
  try {
    const categoryData = req.body;
    
    // Validate required fields
    if (!categoryData.name || !categoryData.displayName) {
      return res.status(400).json({
        success: false,
        message: 'Name and displayName are required'
      });
    }

    // Check if category already exists
    const existingCategory = await Category.findOne({ 
      name: categoryData.name 
    });
    
    if (existingCategory) {
      return res.status(409).json({
        success: false,
        message: 'Category with this name already exists'
      });
    }

    const category = new Category(categoryData);
    await category.save();

    logger.info(`Created new category: ${category.name}`);
    res.status(201).json({
      success: true,
      message: 'Category created successfully',
      category: category
    });
  } catch (error) {
    logger.error('Error creating category:', error);
    res.status(500).json({ 
      success: false,
      message: 'Failed to create category',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// PUT /api/categories/:id - Update category
router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const updateData = req.body;

    const category = await Category.findByIdAndUpdate(
      id, 
      updateData, 
      { new: true, runValidators: true }
    );

    if (!category) {
      return res.status(404).json({
        success: false,
        message: 'Category not found'
      });
    }

    logger.info(`Updated category: ${category.name}`);
    res.json({
      success: true,
      message: 'Category updated successfully',
      category: category
    });
  } catch (error) {
    logger.error('Error updating category:', error);
    res.status(500).json({ 
      success: false,
      message: 'Failed to update category',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// DELETE /api/categories/:id - Soft delete category
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;

    const category = await Category.findByIdAndUpdate(
      id,
      { isActive: false },
      { new: true }
    );

    if (!category) {
      return res.status(404).json({
        success: false,
        message: 'Category not found'
      });
    }

    logger.info(`Soft deleted category: ${category.name}`);
    res.json({
      success: true,
      message: 'Category deactivated successfully',
      category: category
    });
  } catch (error) {
    logger.error('Error deleting category:', error);
    res.status(500).json({ 
      success: false,
      message: 'Failed to delete category',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// POST /api/categories/:id/subcategories - Add subcategory
router.post('/:id/subcategories', async (req, res) => {
  try {
    const { id } = req.params;
    const subCategoryData = req.body;

    const category = await Category.findById(id);
    if (!category) {
      return res.status(404).json({
        success: false,
        message: 'Category not found'
      });
    }

    // Validate required fields
    if (!subCategoryData.name || !subCategoryData.displayName) {
      return res.status(400).json({
        success: false,
        message: 'Name and displayName are required for subcategory'
      });
    }

    // Check if subcategory already exists in this category
    const existingSubCategory = category.subCategories.find(
      sub => sub.name === subCategoryData.name
    );
    
    if (existingSubCategory) {
      return res.status(409).json({
        success: false,
        message: 'Subcategory with this name already exists in this category'
      });
    }

    await category.addSubCategory(subCategoryData);

    logger.info(`Added subcategory ${subCategoryData.name} to category ${category.name}`);
    res.status(201).json({
      success: true,
      message: 'Subcategory added successfully',
      category: category
    });
  } catch (error) {
    logger.error('Error adding subcategory:', error);
    res.status(500).json({ 
      success: false,
      message: 'Failed to add subcategory',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// PUT /api/categories/:id/subcategories/:subId - Update subcategory
router.put('/:id/subcategories/:subId', async (req, res) => {
  try {
    const { id, subId } = req.params;
    const updateData = req.body;

    const category = await Category.findById(id);
    if (!category) {
      return res.status(404).json({
        success: false,
        message: 'Category not found'
      });
    }

    await category.updateSubCategory(subId, updateData);

    logger.info(`Updated subcategory ${subId} in category ${category.name}`);
    res.json({
      success: true,
      message: 'Subcategory updated successfully',
      category: category
    });
  } catch (error) {
    logger.error('Error updating subcategory:', error);
    res.status(500).json({ 
      success: false,
      message: error.message || 'Failed to update subcategory',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// DELETE /api/categories/:id/subcategories/:subId - Soft delete subcategory
router.delete('/:id/subcategories/:subId', async (req, res) => {
  try {
    const { id, subId } = req.params;

    const category = await Category.findById(id);
    if (!category) {
      return res.status(404).json({
        success: false,
        message: 'Category not found'
      });
    }

    await category.removeSubCategory(subId);

    logger.info(`Soft deleted subcategory ${subId} in category ${category.name}`);
    res.json({
      success: true,
      message: 'Subcategory deactivated successfully',
      category: category
    });
  } catch (error) {
    logger.error('Error deleting subcategory:', error);
    res.status(500).json({ 
      success: false,
      message: error.message || 'Failed to delete subcategory',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

module.exports = router;
