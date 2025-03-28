// routes/menuRoutes.js
const express = require('express');
const router = express.Router();
const MenuItem = require('../models/MenuItem');
const multer = require('multer');
const fs = require('fs');
const path = require('path');

// Configure Multer
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, 'public/uploads/');
  },
  filename: (req, file, cb) => {
    cb(null, `${Date.now()}-${file.originalname}`);
  }
});

const upload = multer({ storage });

// GET all menu items (for chatbot)
router.get('/', async (req, res) => {
  try {
    const items = await MenuItem.find().sort({ createdAt: -1 });
    res.json(items);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// POST new menu item
router.post('/', upload.single('image'), async (req, res) => {
  try {
    const { body, file } = req;
    
    const newItem = new MenuItem({
      name: body.name,
      category: body.category,
      subCategory: body.subCategory,
      pricing: JSON.parse(body.pricing),
      description: body.description,
      modifiers: JSON.parse(body.modifiers || '[]'),
      image: file ? `/uploads/${file.filename}` : null
    });

    const savedItem = await newItem.save();
    res.status(201).json(savedItem);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

// PUT update menu item
router.put('/:id', upload.single('image'), async (req, res) => {
  try {
    const { id } = req.params;
    const { body, file } = req;
    
    // Get existing item to check for old image
    const oldItem = await MenuItem.findById(id);
    if (!oldItem) return res.status(404).json({ message: 'Item not found' });

    const updates = {
      name: body.name,
      category: body.category,
      subCategory: body.subCategory,
      pricing: JSON.parse(body.pricing),
      description: body.description,
      modifiers: JSON.parse(body.modifiers || '[]')
    };

    // Handle image update
    if (file) {
      updates.image = `/uploads/${file.filename}`;
      // Delete old image if it exists
      if (oldItem.image) {
        const oldImagePath = path.join(__dirname, '../public', oldItem.image);
        fs.unlinkSync(oldImagePath);
      }
    }

    const updatedItem = await MenuItem.findByIdAndUpdate(id, updates, { 
      new: true,
      runValidators: true
    });
    
    res.json(updatedItem);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

// DELETE menu item
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const deletedItem = await MenuItem.findByIdAndDelete(id);
    
    if (!deletedItem) {
      return res.status(404).json({ message: 'Item not found' });
    }
    
    // Delete associated image
    if (deletedItem.image) {
      const imagePath = path.join(__dirname, '../public', deletedItem.image);
      fs.unlinkSync(imagePath);
    }
    
    res.json({ message: 'Item deleted successfully' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;