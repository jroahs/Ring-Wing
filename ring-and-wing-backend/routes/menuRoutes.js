const express = require('express');
const router = express.Router();
const MenuItem = require('../models/MenuItem');
const multer = require('multer');
const fs = require('fs');
const path = require('path');

// Configure storage with better filename handling
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadDir = 'public/uploads/';
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

// GET all menu items with pagination
router.get('/', async (req, res) => {
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
router.post('/', upload.single('image'), async (req, res) => {
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
      subCategory: req.body.subCategory,
      pricing: parseJSONField('pricing', req.body.pricing),
      modifiers: parseJSONField('modifiers', req.body.modifiers || '[]'),
      description: req.body.description?.trim() || '',
      image: req.file ? `/public/uploads/${req.file.filename}` : null
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
router.put('/:id', upload.single('image'), async (req, res) => {
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
    }

    // Handle image update
    if (req.file) {
      updates.image = `/public/uploads/${req.file.filename}`;
      // Remove old image async
      if (oldItem.image) {
        const oldImagePath = path.join(__dirname, '../public', oldItem.image);
        fs.unlink(oldImagePath, (err) => {
          if (err) console.error('Error deleting old image:', err);
        });
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
router.delete('/:id', async (req, res) => {
  try {
    const item = await MenuItem.findByIdAndDelete(req.params.id);
    
    if (!item) {
      return res.status(404).json({ message: 'Item not found' });
    }

    // Remove associated image
    if (item.image) {
      const imagePath = path.join(__dirname, '../public', item.image);
      fs.unlink(imagePath, (err) => {
        if (err) console.error('Error deleting image:', err);
      });
    }

    res.json({ message: 'Item deleted successfully' });
  } catch (err) {
    res.status(500).json({ 
      message: 'Server error during deletion',
      ...(process.env.NODE_ENV === 'development' && { error: err.message })
    });
  }
});

module.exports = router;