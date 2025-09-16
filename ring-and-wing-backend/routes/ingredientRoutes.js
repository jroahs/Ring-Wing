const express = require('express');
const router = express.Router();
const MenuItemIngredient = require('../models/MenuItemIngredient');
const MenuItem = require('../models/MenuItem');
const Item = require('../models/Items');
const authMiddleware = require('../middleware/auth');
const { canManageIngredients } = require('../utils/permissions');

// Middleware to check ingredient management permissions
const checkIngredientPermissions = (req, res, next) => {
  if (!canManageIngredients(req.user.position)) {
    return res.status(403).json({ 
      message: 'Insufficient permissions to manage ingredient mappings',
      required: 'inventory, shift_manager, general_manager, or admin position'
    });
  }
  next();
};

// GET /api/ingredients/mappings - Get all ingredient mappings
router.get('/mappings', authMiddleware, async (req, res) => {
  try {
    const { 
      page = 1, 
      limit = 50, 
      menuItemId, 
      ingredientId, 
      isActive = 'true',
      search 
    } = req.query;
    
    const query = {};
    
    // Filter by menu item if provided
    if (menuItemId) {
      query.menuItemId = menuItemId;
    }
    
    // Filter by ingredient if provided
    if (ingredientId) {
      query.ingredientId = ingredientId;
    }
    
    // Filter by active status
    if (isActive !== 'all') {
      query.isActive = isActive === 'true';
    }
    
    // Build search query if provided
    let searchQuery = query;
    if (search) {
      const menuItems = await MenuItem.find({
        name: { $regex: search, $options: 'i' }
      }).select('_id');
      
      const ingredients = await Item.find({
        name: { $regex: search, $options: 'i' }
      }).select('_id');
      
      searchQuery = {
        ...query,
        $or: [
          { menuItemId: { $in: menuItems.map(item => item._id) } },
          { ingredientId: { $in: ingredients.map(item => item._id) } }
        ]
      };
    }
    
    const skip = (parseInt(page) - 1) * parseInt(limit);
    
    const [mappings, total] = await Promise.all([
      MenuItemIngredient.find(searchQuery)
        .populate('menuItemId', 'name price category availability imageUrl')
        .populate('ingredientId', 'name category unit currentStock price minStock maxStock')
        .populate('substitutions', 'name category unit currentStock price')
        .populate('createdBy', 'username position')
        .populate('lastModifiedBy', 'username position')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(parseInt(limit)),
      MenuItemIngredient.countDocuments(searchQuery)
    ]);
    
    res.json({
      success: true,
      data: {
        mappings,
        pagination: {
          current: parseInt(page),
          pages: Math.ceil(total / parseInt(limit)),
          total,
          limit: parseInt(limit)
        }
      }
    });
    
  } catch (error) {
    console.error('Error fetching ingredient mappings:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Failed to fetch ingredient mappings',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// GET /api/ingredients/mappings/:id - Get specific mapping
router.get('/mappings/:id', authMiddleware, async (req, res) => {
  try {
    const mapping = await MenuItemIngredient.findById(req.params.id)
      .populate('menuItemId', 'name price category availability imageUrl')
      .populate('ingredientId', 'name category unit currentStock price minStock maxStock')
      .populate('substitutions', 'name category unit currentStock price')
      .populate('createdBy', 'username position')
      .populate('lastModifiedBy', 'username position');
    
    if (!mapping) {
      return res.status(404).json({ 
        success: false, 
        message: 'Ingredient mapping not found' 
      });
    }
    
    // Calculate ingredient cost
    const ingredientCost = await mapping.calculateIngredientCost();
    
    res.json({
      success: true,
      data: {
        ...mapping.toObject(),
        ingredientCost
      }
    });
    
  } catch (error) {
    console.error('Error fetching ingredient mapping:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Failed to fetch ingredient mapping',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// GET /api/ingredients/mappings/menu-item/:menuItemId - Get mappings for specific menu item
router.get('/mappings/menu-item/:menuItemId', authMiddleware, async (req, res) => {
  try {
    const mappings = await MenuItemIngredient.findByMenuItem(req.params.menuItemId);
    
    // Calculate total ingredient cost for the menu item
    let totalIngredientCost = 0;
    for (const mapping of mappings) {
      totalIngredientCost += await mapping.calculateIngredientCost();
    }
    
    res.json({
      success: true,
      data: {
        mappings,
        totalIngredientCost,
        ingredientCount: mappings.length
      }
    });
    
  } catch (error) {
    console.error('Error fetching menu item mappings:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Failed to fetch menu item mappings',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// GET /api/ingredients/mappings/ingredient/:ingredientId - Get mappings using specific ingredient
router.get('/mappings/ingredient/:ingredientId', authMiddleware, async (req, res) => {
  try {
    const mappings = await MenuItemIngredient.findByIngredient(req.params.ingredientId);
    
    res.json({
      success: true,
      data: {
        mappings,
        menuItemCount: mappings.length,
        affectedMenuItems: mappings.map(mapping => ({
          id: mapping.menuItemId._id,
          name: mapping.menuItemId.name,
          quantity: mapping.quantity,
          unit: mapping.unit,
          isRequired: mapping.isRequired
        }))
      }
    });
    
  } catch (error) {
    console.error('Error fetching ingredient mappings:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Failed to fetch ingredient mappings',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// POST /api/ingredients/mappings - Create new ingredient mapping
router.post('/mappings', authMiddleware, checkIngredientPermissions, async (req, res) => {
  try {
    const {
      menuItemId,
      ingredientId,
      quantity,
      unit,
      isRequired = true,
      substitutions = [],
      notes
    } = req.body;
    
    // Validate required fields
    if (!menuItemId || !ingredientId || !quantity || !unit) {
      return res.status(400).json({
        success: false,
        message: 'Missing required fields',
        required: ['menuItemId', 'ingredientId', 'quantity', 'unit']
      });
    }
    
    // Verify menu item exists
    const menuItem = await MenuItem.findById(menuItemId);
    if (!menuItem) {
      return res.status(404).json({
        success: false,
        message: 'Menu item not found'
      });
    }
    
    // Verify ingredient exists
    const ingredient = await Item.findById(ingredientId);
    if (!ingredient) {
      return res.status(404).json({
        success: false,
        message: 'Ingredient not found'
      });
    }
    
    // Verify substitutions exist if provided
    if (substitutions && substitutions.length > 0) {
      const substitutionCount = await Item.countDocuments({
        _id: { $in: substitutions }
      });
      
      if (substitutionCount !== substitutions.length) {
        return res.status(400).json({
          success: false,
          message: 'One or more substitution ingredients do not exist'
        });
      }
    }
    
    // Create the mapping
    const mapping = new MenuItemIngredient({
      menuItemId,
      ingredientId,
      quantity: parseFloat(quantity),
      unit: unit.toLowerCase(),
      isRequired,
      substitutions,
      notes,
      createdBy: req.user.id,
      lastModifiedBy: req.user.id
    });
    
    await mapping.save();
    
    // Populate the created mapping for response
    await mapping.populate([
      { path: 'menuItemId', select: 'name price category' },
      { path: 'ingredientId', select: 'name category unit currentStock price' },
      { path: 'substitutions', select: 'name category unit currentStock price' },
      { path: 'createdBy', select: 'username position' }
    ]);
    
    res.status(201).json({
      success: true,
      message: 'Ingredient mapping created successfully',
      data: mapping
    });
    
  } catch (error) {
    if (error.code === 11000) {
      // Duplicate key error
      return res.status(409).json({
        success: false,
        message: 'This ingredient is already mapped to this menu item'
      });
    }
    
    console.error('Error creating ingredient mapping:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create ingredient mapping',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// PUT /api/ingredients/mappings/:id - Update ingredient mapping
router.put('/mappings/:id', authMiddleware, checkIngredientPermissions, async (req, res) => {
  try {
    const {
      quantity,
      unit,
      isRequired,
      substitutions,
      notes,
      isActive
    } = req.body;
    
    const mapping = await MenuItemIngredient.findById(req.params.id);
    if (!mapping) {
      return res.status(404).json({
        success: false,
        message: 'Ingredient mapping not found'
      });
    }
    
    // Verify substitutions exist if provided
    if (substitutions && substitutions.length > 0) {
      const substitutionCount = await Item.countDocuments({
        _id: { $in: substitutions }
      });
      
      if (substitutionCount !== substitutions.length) {
        return res.status(400).json({
          success: false,
          message: 'One or more substitution ingredients do not exist'
        });
      }
    }
    
    // Update fields
    if (quantity !== undefined) mapping.quantity = parseFloat(quantity);
    if (unit !== undefined) mapping.unit = unit.toLowerCase();
    if (isRequired !== undefined) mapping.isRequired = isRequired;
    if (substitutions !== undefined) mapping.substitutions = substitutions;
    if (notes !== undefined) mapping.notes = notes;
    if (isActive !== undefined) mapping.isActive = isActive;
    
    mapping.lastModifiedBy = req.user.id;
    
    await mapping.save();
    
    // Populate the updated mapping for response
    await mapping.populate([
      { path: 'menuItemId', select: 'name price category' },
      { path: 'ingredientId', select: 'name category unit currentStock price' },
      { path: 'substitutions', select: 'name category unit currentStock price' },
      { path: 'lastModifiedBy', select: 'username position' }
    ]);
    
    res.json({
      success: true,
      message: 'Ingredient mapping updated successfully',
      data: mapping
    });
    
  } catch (error) {
    console.error('Error updating ingredient mapping:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update ingredient mapping',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// DELETE /api/ingredients/mappings/:id - Delete ingredient mapping (soft delete)
router.delete('/mappings/:id', authMiddleware, checkIngredientPermissions, async (req, res) => {
  try {
    const { permanent = false } = req.query;
    
    const mapping = await MenuItemIngredient.findById(req.params.id);
    if (!mapping) {
      return res.status(404).json({
        success: false,
        message: 'Ingredient mapping not found'
      });
    }
    
    // Check if user can perform permanent delete (only shift_manager+)
    if (permanent === 'true') {
      const canDelete = ['shift_manager', 'general_manager', 'admin'].includes(req.user.position);
      if (!canDelete) {
        return res.status(403).json({
          success: false,
          message: 'Insufficient permissions for permanent deletion',
          required: 'shift_manager, general_manager, or admin position'
        });
      }
      
      await mapping.deleteOne();
      
      res.json({
        success: true,
        message: 'Ingredient mapping permanently deleted'
      });
    } else {
      // Soft delete - just mark as inactive
      mapping.isActive = false;
      mapping.lastModifiedBy = req.user.id;
      await mapping.save();
      
      res.json({
        success: true,
        message: 'Ingredient mapping deactivated',
        data: { id: mapping._id, isActive: false }
      });
    }
    
  } catch (error) {
    console.error('Error deleting ingredient mapping:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete ingredient mapping',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// POST /api/ingredients/mappings/bulk - Create multiple mappings at once
router.post('/mappings/bulk', authMiddleware, checkIngredientPermissions, async (req, res) => {
  try {
    const { mappings } = req.body;
    
    if (!Array.isArray(mappings) || mappings.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Mappings array is required and must not be empty'
      });
    }
    
    // Validate each mapping
    const validMappings = [];
    const errors = [];
    
    for (let i = 0; i < mappings.length; i++) {
      const mapping = mappings[i];
      
      if (!mapping.menuItemId || !mapping.ingredientId || !mapping.quantity || !mapping.unit) {
        errors.push({
          index: i,
          message: 'Missing required fields',
          mapping: mapping
        });
        continue;
      }
      
      validMappings.push({
        ...mapping,
        quantity: parseFloat(mapping.quantity),
        unit: mapping.unit.toLowerCase(),
        isRequired: mapping.isRequired !== false,
        substitutions: mapping.substitutions || [],
        createdBy: req.user.id,
        lastModifiedBy: req.user.id
      });
    }
    
    if (errors.length > 0) {
      return res.status(400).json({
        success: false,
        message: 'Some mappings have validation errors',
        errors
      });
    }
    
    // Instead of insertMany with ordered: false, use individual inserts with better error handling
    const results = {
      created: [],
      errors: []
    };
    
    for (let i = 0; i < validMappings.length; i++) {
      try {
        const mapping = new MenuItemIngredient(validMappings[i]);
        const savedMapping = await mapping.save();
        results.created.push(savedMapping);
      } catch (error) {
        if (error.code === 11000) {
          // Duplicate - skip silently
          results.errors.push({
            index: i,
            type: 'duplicate',
            message: 'Ingredient already mapped to this menu item'
          });
        } else {
          // Other error
          results.errors.push({
            index: i,
            type: 'validation',
            message: error.message
          });
        }
      }
    }
    
    res.status(201).json({
      success: true,
      message: `${results.created.length} ingredient mappings created successfully`,
      data: {
        created: results.created.length,
        requested: mappings.length,
        skipped: results.errors.length,
        errors: results.errors
      }
    });
    
  } catch (error) {
    console.error('Error creating bulk ingredient mappings:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create ingredient mappings',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// GET /api/ingredients/order-requirements - Calculate ingredient requirements for order items
router.post('/order-requirements', authMiddleware, async (req, res) => {
  try {
    const { orderItems } = req.body;
    
    if (!Array.isArray(orderItems) || orderItems.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Order items array is required'
      });
    }
    
    // Validate order items format
    for (const item of orderItems) {
      if (!item.menuItemId || !item.quantity) {
        return res.status(400).json({
          success: false,
          message: 'Each order item must have menuItemId and quantity'
        });
      }
    }
    
    const requirements = await MenuItemIngredient.getRequirementsForOrder(orderItems);
    
    // Populate ingredient details
    const populatedRequirements = await Promise.all(
      requirements.map(async (req) => {
        const ingredient = await Item.findById(req.ingredientId);
        return {
          ...req,
          ingredient: ingredient,
          availableStock: ingredient ? ingredient.currentStock : 0,
          hasSufficientStock: ingredient ? ingredient.currentStock >= req.totalRequired : false
        };
      })
    );
    
    const summary = {
      totalIngredients: requirements.length,
      sufficientStock: populatedRequirements.filter(req => req.hasSufficientStock).length,
      insufficientStock: populatedRequirements.filter(req => !req.hasSufficientStock).length,
      requiresSubstitutions: populatedRequirements.filter(req => !req.hasSufficientStock && req.substitutions.length > 0).length
    };
    
    res.json({
      success: true,
      data: {
        requirements: populatedRequirements,
        summary
      }
    });
    
  } catch (error) {
    console.error('Error calculating order requirements:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to calculate order requirements',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

module.exports = router;