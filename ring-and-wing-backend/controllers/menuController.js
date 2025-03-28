const MenuItem = require('../models/MenuItem');
const fs = require('fs');
const path = require('path');

// Helper to handle file uploads
const handleImageUpload = (file) => {
  if (!file) return null;
  return `/uploads/${file.filename}`;
};

// Get all menu items
exports.getAllMenuItems = async (req, res) => {
  try {
    const items = await MenuItem.find().sort({ createdAt: -1 });
    res.json(items);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// Create new menu item
exports.createMenuItem = async (req, res) => {
  try {
    const { body, file } = req;
    
    const newItem = new MenuItem({
      ...body,
      pricing: JSON.parse(body.pricing),
      modifiers: JSON.parse(body.modifiers),
      image: handleImageUpload(file)
    });

    const savedItem = await newItem.save();
    res.status(201).json(savedItem);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
};

// Update menu item
exports.updateMenuItem = async (req, res) => {
  try {
    const { id } = req.params;
    const { body, file } = req;
    
    const updates = {
      ...body,
      pricing: JSON.parse(body.pricing),
      modifiers: JSON.parse(body.modifiers)
    };

    if (file) {
      updates.image = handleImageUpload(file);
      // Delete old image if exists
      const oldItem = await MenuItem.findById(id);
      if (oldItem.image) {
        fs.unlinkSync(path.join(__dirname, '../public', oldItem.image));
      }
    }

    const updatedItem = await MenuItem.findByIdAndUpdate(id, updates, { new: true });
    res.json(updatedItem);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
};

// Delete menu item
exports.deleteMenuItem = async (req, res) => {
  try {
    const { id } = req.params;
    const deletedItem = await MenuItem.findByIdAndDelete(id);
    
    if (deletedItem.image) {
      fs.unlinkSync(path.join(__dirname, '../public', deletedItem.image));
    }
    
    res.json({ message: 'Item deleted successfully' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};