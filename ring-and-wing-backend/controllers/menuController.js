const MenuItem = require('../models/MenuItem');
const fs = require('fs');
const path = require('path');
const mongoose = require('mongoose');
const { deleteMenuImage, saveMenuImage } = require('../utils/imageUtils');

// Helper to handle file uploads
const handleImageUpload = (file, base64Image, itemId) => {
  // First check if a file was uploaded through multer
  if (file) {
    // Ensure we're using the menu-specific path
    return `/uploads/menu/${file.filename}`;
  }
  
  // If no file but base64 image is provided, use our utility
  if (base64Image && base64Image.startsWith('data:image')) {
    return saveMenuImage(base64Image, itemId);
  }
  
  // No image provided
  return null;
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
    
    // Parse JSON fields
    const pricing = body.pricing ? JSON.parse(body.pricing) : [];
    const modifiers = body.modifiers ? JSON.parse(body.modifiers) : [];
    
    // Create a temporary ID for the image name (will be replaced after save)
    const tempId = new mongoose.Types.ObjectId();
    
    // Handle image upload - could be file or base64 string
    const image = handleImageUpload(file, body.image, tempId);
    
    const newItem = new MenuItem({
      ...body,
      pricing,
      modifiers,
      image
    });

    const savedItem = await newItem.save();
    
    // If we used a base64 image with tempId, rename the file to use the real ID
    if (image && body.image && body.image.startsWith('data:image')) {
      const updatedImagePath = image.replace(tempId.toString(), savedItem._id.toString());
      
      // Check if the file exists before renaming
      const oldPath = path.join(__dirname, '../public', image);
      const newPath = path.join(__dirname, '../public', updatedImagePath);
      
      if (fs.existsSync(oldPath)) {
        fs.renameSync(oldPath, newPath);
        
        // Update the item with the correct path
        savedItem.image = updatedImagePath;
        await savedItem.save();
      }
    }
    
    res.status(201).json(savedItem);
  } catch (err) {
    console.error('Error creating menu item:', err);
    res.status(400).json({ message: err.message });
  }
};

// Update menu item
exports.updateMenuItem = async (req, res) => {
  try {
    const { id } = req.params;
    const { body, file } = req;
    
    // Parse JSON fields with fallbacks
    const pricing = body.pricing ? JSON.parse(body.pricing) : [];
    const modifiers = body.modifiers ? JSON.parse(body.modifiers) : [];
    
    // First get the old item
    const oldItem = await MenuItem.findById(id);
    if (!oldItem) {
      return res.status(404).json({ message: 'Menu item not found' });
    }
    
    const updates = {
      ...body,
      pricing,
      modifiers
    };

    // Handle image upload/update
    if (file || (body.image && body.image.startsWith('data:image'))) {
      // Get new image path
      const imagePath = handleImageUpload(file, body.image, id);
      updates.image = imagePath;
      
      // Delete old image if exists and is different from the new one
      if (oldItem.image && 
          oldItem.image !== imagePath && 
          !oldItem.image.includes('placeholders')) {
        try {
          const deleted = deleteMenuImage(oldItem.image);
          if (deleted) {
            console.log(`Successfully deleted old menu image during update: ${oldItem.image}`);
          }
        } catch (fileError) {
          console.error('Error deleting old menu image during update:', fileError);
          // Continue with update even if old file removal fails
        }
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
    
    // First find the item to get the image path
    const item = await MenuItem.findById(id);
    
    if (!item) {
      return res.status(404).json({ message: 'Menu item not found' });
    }
    
    // Delete the image before deleting the menu item
    if (item.image && !item.image.includes('placeholders')) {
      try {
        const deleted = deleteMenuImage(item.image);
        if (deleted) {
          console.log(`Successfully deleted menu image: ${item.image}`);
        } else {
          console.warn(`Failed to delete menu image: ${item.image} - Image may not exist or could be a placeholder`);
          
          // Additional fallback check for different path formats
          if (item.image.startsWith('/uploads/') && !item.image.includes('/menu/')) {
            // Try checking if the image exists in the general uploads folder
            const generalPath = path.join(__dirname, '../public', item.image);
            if (fs.existsSync(generalPath)) {
              fs.unlinkSync(generalPath);
              console.log(`Successfully deleted menu image from general uploads: ${item.image}`);
            }
          }
        }
      } catch (fileError) {
        console.error('Error deleting menu image:', fileError);
        // Continue with deletion even if file removal fails
      }
    } else {
      console.log(`No image to delete for menu item ${id} or image is a placeholder`);
    }
    
    // Now delete the menu item
    await MenuItem.findByIdAndDelete(id);
    
    res.json({ message: 'Item deleted successfully' });
  } catch (err) {
    console.error('Error deleting menu item:', err);
    res.status(500).json({ 
      message: 'Server error during deletion',
      ...(process.env.NODE_ENV === 'development' && { error: err.message })
    });
  }
};