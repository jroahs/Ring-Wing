const express = require('express');
const router = express.Router();
const MenuItem = require('../models/MenuItem');
const multer = require('multer');
const fs = require('fs');
const path = require('path');
const { lightCheck, standardCheck, criticalCheck } = require('../middleware/dbConnectionMiddleware');
const { ingredientMappingMonitor, costAnalysisMonitor } = require('../middleware/connectionMonitoringMiddleware');

// Configure storage with better filename handling
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadDir = path.join(__dirname, '../public/uploads/menu');
    // Ensure directory exists
    fs.mkdirSync(uploadDir, { recursive: true });
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
    const ext = path.extname(file.originalname);
    cb(null, `${file.fieldname}-${uniqueSuffix}${ext}`);
  }
});

// File filter for image uploads
const fileFilter = (req, file, cb) => {
  if (file.mimetype.startsWith('image/')) {
    cb(null, true);
  } else {
    cb(new Error('Only image files are allowed!'), false);
  }
};

const upload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: 5 * 1024 * 1024 // 5MB limit
  }
});

// Helper function for safe JSON parsing
const parseJSONField = (fieldName, str) => {
  try {
    return JSON.parse(str);
  } catch (error) {
    throw new Error(`Invalid ${fieldName} format`);
  }
};

// GET alternatives for a specific menu item (must be before general GET route)
router.get('/:id/alternatives', lightCheck, async (req, res) => {
  const menuController = require('../controllers/menuController');
  await menuController.getItemAlternatives(req, res);
});

// GET all menu items with pagination
router.get('/', lightCheck, async (req, res) => {
  try {
    const { page = 1, limit = 50 } = req.query;
    const items = await MenuItem.find()
      .sort({ code: 1 })
      .limit(limit * 1)
      .skip((page - 1) * limit);

    const count = await MenuItem.countDocuments();
    
    res.json({
      items,
      totalPages: Math.ceil(count / limit),
      currentPage: page
    });
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
});

// POST new menu item with validation
router.post('/', criticalCheck, upload.single('image'), async (req, res) => {
  try {
    const requiredFields = ['code', 'name', 'category', 'subCategory', 'pricing'];
    const missingFields = requiredFields.filter(field => !req.body[field]);
    
    if (missingFields.length > 0) {
      return res.status(400).json({
        message: `Missing required fields: ${missingFields.join(', ')}`
      });
    }

    const parsedBody = {
      code: req.body.code.trim().toUpperCase(),
      name: req.body.name.trim(),
      category: req.body.category,
      subCategory: req.body.subCategory,      pricing: parseJSONField('pricing', req.body.pricing),
      modifiers: parseJSONField('modifiers', req.body.modifiers || '[]'),
      description: req.body.description?.trim() || '',
      image: req.file ? `/uploads/menu/${req.file.filename}` : null
    };

    // Validate code format
    if (!/^[A-Z0-9]{3,5}$/.test(parsedBody.code)) {
      return res.status(400).json({ message: 'Invalid item code format' });
    }

    // Check for existing code
    const existingItem = await MenuItem.findOne({ code: parsedBody.code });
    if (existingItem) {
      return res.status(409).json({ message: 'Item code already exists' });
    }

    const newItem = new MenuItem(parsedBody);
    const savedItem = await newItem.save();
    
    res.status(201).json(savedItem);
  } catch (err) {
    const statusCode = err.name === 'ValidationError' ? 400 : 500;
    res.status(statusCode).json({ 
      message: err.message,
      ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
    });
  }
});

// PUT update menu item with atomic operations
router.put('/:id', criticalCheck, upload.single('image'), async (req, res) => {
  try {
    const { id } = req.params;
    const updates = {
      ...req.body,
      code: req.body.code?.trim().toUpperCase(),
      name: req.body.name?.trim(),
      pricing: parseJSONField('pricing', req.body.pricing),
      modifiers: parseJSONField('modifiers', req.body.modifiers || '[]'),
      description: req.body.description?.trim() || ''
    };

    const oldItem = await MenuItem.findById(id);
    if (!oldItem) {
      return res.status(404).json({ message: 'Item not found' });
    }

    // Code change validation
    if (updates.code && updates.code !== oldItem.code) {
      const existingItem = await MenuItem.findOne({ code: updates.code });
      if (existingItem) {
        return res.status(409).json({ message: 'Item code already exists' });
      }
    }    // Handle image update
    if (req.file) {
      updates.image = `/uploads/menu/${req.file.filename}`;
      // Remove old image if it exists
      if (oldItem.image && !oldItem.image.includes('placeholders')) {
        try {
          const { deleteMenuImage } = require('../utils/imageUtils');
          deleteMenuImage(oldItem.image);
        } catch (err) {
          console.error('Error deleting old image:', err);
        }
      }
    }

    const updatedItem = await MenuItem.findByIdAndUpdate(
      id,
      { $set: updates },
      { new: true, runValidators: true }
    );

    res.json(updatedItem);
  } catch (err) {
    const statusCode = err.name === 'ValidationError' ? 400 : 500;
    res.status(statusCode).json({ 
      message: err.message,
      ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
    });
  }
});

// DELETE menu item with error handling
router.delete('/:id', criticalCheck, async (req, res) => {
  try {
    const item = await MenuItem.findByIdAndDelete(req.params.id);
    
    if (!item) {
      return res.status(404).json({ message: 'Item not found' });
    }    // Remove associated image
    if (item.image && !item.image.includes('placeholders')) {
      try {
        const { deleteMenuImage } = require('../utils/imageUtils');
        const deleted = deleteMenuImage(item.image);
        if (deleted) {
          console.log(`Successfully deleted menu image: ${item.image}`);
        } else {
          console.warn(`Failed to delete menu image: ${item.image} - Image may not exist`);
        }
      } catch (err) {
        console.error('Error deleting image:', err);
      }
    }

    res.json({ message: 'Item deleted successfully' });
  } catch (err) {
    res.status(500).json({ 
      message: 'Server error during deletion',
      ...(process.env.NODE_ENV === 'development' && { error: err.message })
    });
  }
});

// ==========================================
// INVENTORY INTEGRATION ENDPOINTS
// ==========================================

const InventoryAvailabilityService = require('../services/inventoryAvailabilityService');
const InventoryBusinessLogicService = require('../services/inventoryBusinessLogicService');

// Check menu item availability based on ingredient stock
router.post('/check-availability', lightCheck, async (req, res) => {
  try {
    const { menuItems } = req.body;
    
    if (!menuItems || !Array.isArray(menuItems)) {
      return res.status(400).json({
        success: false,
        message: 'menuItems array is required'
      });
    }

    // Use checkOrderAvailability which accepts an array of menu items
    const availabilityResults = await InventoryAvailabilityService.checkOrderAvailability(menuItems);
    
    res.json({
      success: true,
      data: availabilityResults
    });
  } catch (error) {
    console.error('Error checking menu availability:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to check menu availability',
      error: error.message
    });
  }
});

// Get menu item ingredients  
router.get('/ingredients/:menuItemId', lightCheck, async (req, res) => {
  try {
    const { menuItemId } = req.params;
    const ingredients = await InventoryBusinessLogicService.getMenuItemIngredients(menuItemId);
    
    res.json({
      success: true,
      data: ingredients
    });
  } catch (error) {
    const logger = require('../config/logger');
    if (logger && typeof logger.error === 'function') {
      logger.error('Error getting menu item ingredients:', {
        error: error.message,
        errorName: error.name,
        menuItemId: req.params.menuItemId,
        requestId: req.connectionRequestId,
        connectionReadyState: require('mongoose').connection.readyState,
        stack: error.stack,
        timestamp: new Date().toISOString()
      });
    } else {
      console.error('Error getting menu item ingredients:', error);
    }
    
    console.error('Error getting menu item ingredients:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get menu item ingredients',
      error: error.message,
      requestId: req.connectionRequestId
    });
  }
});

// Rate limiting storage
const requestCounts = new Map();
const RATE_LIMIT_WINDOW = 60000; // 1 minute
const MAX_REQUESTS = 50; // Increased to 50 requests per minute for development

// Rate limiting middleware for ingredient updates
const rateLimitMiddleware = (req, res, next) => {
  const clientIP = req.ip || req.connection.remoteAddress || 'unknown';
  const now = Date.now();
  
  // Clean old entries
  for (const [ip, data] of requestCounts.entries()) {
    if (now - data.windowStart > RATE_LIMIT_WINDOW) {
      requestCounts.delete(ip);
    }
  }
  
  // Check current IP
  const clientData = requestCounts.get(clientIP) || { count: 0, windowStart: now };
  
  if (now - clientData.windowStart > RATE_LIMIT_WINDOW) {
    // Reset window
    clientData.count = 1;
    clientData.windowStart = now;
  } else {
    clientData.count++;
  }
  
  requestCounts.set(clientIP, clientData);
  
  if (clientData.count > MAX_REQUESTS) {
    console.log(`[RATE_LIMIT] Blocking request from ${clientIP}: ${clientData.count}/${MAX_REQUESTS} requests in window`);
    return res.status(429).json({
      success: false,
      message: 'Too many requests. Please wait before trying again.',
      retryAfter: Math.ceil((RATE_LIMIT_WINDOW - (now - clientData.windowStart)) / 1000),
      debug: {
        count: clientData.count,
        maxRequests: MAX_REQUESTS,
        windowStart: new Date(clientData.windowStart).toISOString()
      }
    });
  }
  
  next();
};

// Update menu item ingredients
router.put('/ingredients/:menuItemId', rateLimitMiddleware, standardCheck, async (req, res) => {
  let startTime = Date.now();
  
  console.log(`[ROUTE_HIT] PUT /ingredients/${req.params.menuItemId} - Request received at ${new Date().toISOString()}`);
  console.log(`[ROUTE_HIT] Request body:`, JSON.stringify(req.body, null, 2));
  console.log(`[ROUTE_HIT] Request headers:`, JSON.stringify(req.headers, null, 2));
  
  try {
    const { menuItemId } = req.params;
    const { ingredients } = req.body;
    
    console.log(`[${new Date().toISOString()}] Ingredient mapping request for menu item: ${menuItemId}`);
    
    // Enhanced validation
    if (!menuItemId || menuItemId.length !== 24) {
      return res.status(400).json({
        success: false,
        message: 'Valid menu item ID is required (24 character hex string)'
      });
    }
    
    if (!ingredients || !Array.isArray(ingredients)) {
      return res.status(400).json({
        success: false,
        message: 'ingredients array is required'
      });
    }
    
    // Allow empty array for unmapping all ingredients
    if (ingredients.length === 0) {
      console.log('Received request to unmap all ingredients for menu item:', menuItemId);
    } else if (ingredients.length > 20) {
      return res.status(400).json({
        success: false,
        message: 'Too many ingredients. Maximum 20 ingredients allowed per menu item.'
      });
    }
    
    // Add timeout protection
    const timeoutPromise = new Promise((_, reject) => {
      setTimeout(() => reject(new Error('Operation timeout after 30 seconds')), 30000);
    });
    
    const operationPromise = InventoryBusinessLogicService.updateMenuItemIngredients(menuItemId, ingredients);
    
    const result = await Promise.race([operationPromise, timeoutPromise]);
    
    const duration = Date.now() - startTime;
    console.log(`[${new Date().toISOString()}] Ingredient mapping completed in ${duration}ms`);
    
    res.json({
      success: true,
      data: result,
      processingTime: duration
    });
  } catch (error) {
    const duration = Date.now() - startTime;
    console.error(`[${new Date().toISOString()}] Error updating menu item ingredients (${duration}ms):`, error.message);
    
    // Different error responses based on error type
    let statusCode = 500;
    let message = 'Failed to update menu item ingredients';
    
    if (error.message.includes('timeout')) {
      statusCode = 408;
      message = 'Request timeout. The operation took too long to complete.';
    } else if (error.message.includes('Too many ingredients')) {
      statusCode = 400;
      message = error.message;
    } else if (error.message.includes('required') || error.message.includes('Invalid')) {
      statusCode = 400;
      message = error.message;
    } else if (error.message.includes('connection') || error.message.includes('database')) {
      statusCode = 503;
      message = 'Database connection issue. Please try again in a moment.';
    }
    
    res.status(statusCode).json({
      success: false,
      message: message,
      error: process.env.NODE_ENV === 'development' ? error.message : undefined,
      processingTime: duration
    });
  }
});

// Get cost analysis for menu item
router.get('/cost-analysis/:menuItemId', lightCheck, async (req, res) => {
  try {
    const { menuItemId } = req.params;
    const costAnalysis = await InventoryBusinessLogicService.calculateMenuItemCost(menuItemId);
    
    res.json({
      success: true,
      data: costAnalysis
    });
  } catch (error) {
    const logger = require('../config/logger');
    if (logger && typeof logger.error === 'function') {
      logger.error('Error getting cost analysis:', {
        error: error.message,
        errorName: error.name,
        menuItemId: req.params.menuItemId,
        requestId: req.connectionRequestId,
        connectionReadyState: require('mongoose').connection.readyState,
        stack: error.stack,
        timestamp: new Date().toISOString()
      });
    } else {
      console.error('Error getting cost analysis:', error);
    }
    
    console.error('Error getting cost analysis:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get cost analysis',
      error: error.message,
      requestId: req.connectionRequestId
    });
  }
});

module.exports = router;