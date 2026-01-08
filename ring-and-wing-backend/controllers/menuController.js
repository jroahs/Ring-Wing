const MenuItem = require('../models/MenuItem');
const fs = require('fs');
const path = require('path');
const mongoose = require('mongoose');
const { deleteMenuImage, saveMenuImage } = require('../utils/imageUtils');
const { uploadFile, getPublicUrl, deleteFileByUrl, generateUniqueFilename } = require('../utils/supabaseStorage');

const normalizeBoolean = (value, defaultValue) => {
  if (typeof value === 'boolean') return value;
  if (typeof value === 'string') {
    const lowered = value.trim().toLowerCase();
    if (lowered === 'true') return true;
    if (lowered === 'false') return false;
  }
  if (typeof value === 'undefined') return defaultValue;
  return Boolean(value);
};

// Helper to handle file uploads - now using Supabase Storage
const handleImageUpload = async (file, base64Image, itemCode) => {
  console.log('🔍 [handleImageUpload] Called with:', {
    hasFile: !!file,
    hasBase64: !!base64Image,
    itemCode,
    fileDetails: file ? {
      fieldname: file.fieldname,
      originalname: file.originalname,
      mimetype: file.mimetype,
      size: file.size,
      bufferLength: file.buffer?.length
    } : null
  });
  
  try {
    // Handle file upload through multer
    if (file) {
      console.log('📤 [handleImageUpload] Processing multer file upload...');
      const filename = generateUniqueFilename(file.originalname, itemCode);
      const filePath = `images/${filename}`;
      
      console.log('☁️  [handleImageUpload] Uploading to Supabase:', { bucket: 'menu-items', filePath, contentType: file.mimetype });
      
      await uploadFile('menu-items', filePath, file.buffer, {
        contentType: file.mimetype
      });
      
      const publicUrl = getPublicUrl('menu-items', filePath);
      console.log('✅ [handleImageUpload] Upload complete! URL:', publicUrl);
      return publicUrl;
    }
    
    // Handle base64 image upload
    if (base64Image && base64Image.startsWith('data:image')) {
      console.log('📤 [handleImageUpload] Processing base64 image upload...');
      const matches = base64Image.match(/^data:image\/([A-Za-z-+\/]+);base64,(.+)$/);
      if (!matches || matches.length !== 3) {
        throw new Error('Invalid base64 image format');
      }
      
      const imageType = matches[1];
      const imageData = matches[2];
      const buffer = Buffer.from(imageData, 'base64');
      
      const filename = generateUniqueFilename(`image.${imageType}`, itemCode);
      const filePath = `images/${filename}`;
      
      console.log('☁️  [handleImageUpload] Uploading base64 to Supabase:', { bucket: 'menu-items', filePath, contentType: `image/${imageType}` });
      
      await uploadFile('menu-items', filePath, buffer, {
        contentType: `image/${imageType}`
      });
      
      const publicUrl = getPublicUrl('menu-items', filePath);
      console.log('✅ [handleImageUpload] Upload complete! URL:', publicUrl);
      return publicUrl;
    }
    
    // No image provided
    console.log('⚠️  [handleImageUpload] No image provided');
    return null;
  } catch (error) {
    console.error('❌ [Menu Controller] Image upload error:', error);
    throw error;
  }
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
    const variants = body.variants ? JSON.parse(body.variants) : [];
    
    // Handle image upload - now async with Supabase
    const itemCode = body.code || 'ITEM';
    const image = await handleImageUpload(file, body.image, itemCode);

    const isAvailable = normalizeBoolean(body.isAvailable, true);
    const ignoreSizes = normalizeBoolean(body.ignoreSizes, false);
    const isDeliveryAvailable = normalizeBoolean(body.isDeliveryAvailable, true);
    
    const newItem = new MenuItem({
      ...body,
      pricing,
      modifiers,
      variants,
      image,
      isAvailable,
      ignoreSizes,
      isDeliveryAvailable
    });

    const savedItem = await newItem.save();
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
    const variants = body.variants ? JSON.parse(body.variants) : [];
    
    // First get the old item
    const oldItem = await MenuItem.findById(id);
    if (!oldItem) {
      return res.status(404).json({ message: 'Menu item not found' });
    }

    const isAvailable = normalizeBoolean(body.isAvailable, oldItem.isAvailable);
    const ignoreSizes = normalizeBoolean(body.ignoreSizes, oldItem.ignoreSizes);
    const isDeliveryAvailable = normalizeBoolean(
      body.isDeliveryAvailable,
      (typeof oldItem.isDeliveryAvailable === 'boolean' ? oldItem.isDeliveryAvailable : true)
    );
    
    const updates = {
      ...body,
      pricing,
      modifiers,
      variants,
      isAvailable,
      ignoreSizes,
      isDeliveryAvailable
    };

    // Handle image deletion (revert to placeholder)
    if (body.deleteImage === 'true') {
      console.log('[Menu Update] User requested image deletion for item:', id);
      
      // Delete the old image if it exists
      if (oldItem.image && !oldItem.image.includes('placeholders')) {
        try {
          if (oldItem.image.includes('supabase.co')) {
            await deleteFileByUrl(oldItem.image);
            console.log(`Successfully deleted Supabase image: ${oldItem.image}`);
          } else {
            const deleted = deleteMenuImage(oldItem.image);
            if (deleted) {
              console.log(`Successfully deleted local image: ${oldItem.image}`);
            }
          }
        } catch (fileError) {
          console.error('Error deleting menu image:', fileError);
        }
      }
      
      // Set image to empty string to use placeholder
      updates.image = '';
    }
    // Handle image upload/update
    else if (file || (body.image && body.image.startsWith('data:image'))) {
      // Get new image path - now async with Supabase
      const itemCode = oldItem.code || 'ITEM';
      const imagePath = await handleImageUpload(file, body.image, itemCode);
      updates.image = imagePath;
      
      // Delete old image if exists and is different from the new one
      if (oldItem.image && 
          oldItem.image !== imagePath && 
          !oldItem.image.includes('placeholders')) {
        try {
          // Check if it's a Supabase URL
          if (oldItem.image.includes('supabase.co')) {
            await deleteFileByUrl(oldItem.image);
            console.log(`Successfully deleted old Supabase image: ${oldItem.image}`);
          } else {
            // Fallback to local file deletion for legacy images
            const deleted = deleteMenuImage(oldItem.image);
            if (deleted) {
              console.log(`Successfully deleted old local image: ${oldItem.image}`);
            }
          }
        } catch (fileError) {
          console.error('Error deleting old menu image during update:', fileError);
          // Continue with update even if old file removal fails
        }
      }
    }

    const updatedItem = await MenuItem.findByIdAndUpdate(id, updates, { new: true });

    // Emit real-time socket update if delivery eligibility changed
    try {
      const io = req.app.get('io');
      const oldDeliveryAvailability = (typeof oldItem.isDeliveryAvailable === 'boolean') ? oldItem.isDeliveryAvailable : true;
      if (io && oldDeliveryAvailability !== updatedItem.isDeliveryAvailable) {
        const SocketService = require('../services/socketService');
        SocketService.emitMenuDeliveryAvailabilityChanged(io, id, updatedItem.isDeliveryAvailable);
      }
    } catch (socketErr) {
      console.warn('[Menu Controller] Failed to emit menuDeliveryAvailabilityChanged:', socketErr.message);
    }

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
        // Check if it's a Supabase URL
        if (item.image.includes('supabase.co')) {
          await deleteFileByUrl(item.image);
          console.log(`Successfully deleted Supabase image: ${item.image}`);
        } else {
          // Fallback to local file deletion for legacy images
          const deleted = deleteMenuImage(item.image);
          if (deleted) {
            console.log(`Successfully deleted local image: ${item.image}`);
          } else {
            console.warn(`Failed to delete image: ${item.image}`);
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

// Get alternatives for an unavailable menu item
exports.getItemAlternatives = async (req, res) => {
  try {
    const { id } = req.params;
    
    // Find the original item with populated alternatives
    const originalItem = await MenuItem.findById(id)
      .populate('alternatives', 'code name category subCategory pricing image isAvailable')
      .populate('recommendedAlternative', 'code name category subCategory pricing image isAvailable');
    
    if (!originalItem) {
      return res.status(404).json({ message: 'Menu item not found' });
    }
    
    // Filter out any unavailable alternatives
    const availableAlternatives = originalItem.alternatives.filter(alt => alt.isAvailable !== false);
    
    // Smart fallback: if no specific alternatives are mapped, suggest items from same subcategory
    let fallbackAlternatives = [];
    if (availableAlternatives.length === 0) {
      fallbackAlternatives = await MenuItem.find({
        _id: { $ne: id }, // Exclude the original item
        category: originalItem.category,
        subCategory: originalItem.subCategory,
        isAvailable: { $ne: false }
      })
      .limit(4)
      .select('code name category subCategory pricing image isAvailable');
      
      // If still no alternatives, try same category
      if (fallbackAlternatives.length === 0) {
        fallbackAlternatives = await MenuItem.find({
          _id: { $ne: id },
          category: originalItem.category,
          isAvailable: { $ne: false }
        })
        .limit(4)
        .select('code name category subCategory pricing image isAvailable');
      }
    }
    
    const alternatives = availableAlternatives.length > 0 ? availableAlternatives : fallbackAlternatives;
    
    // Check if recommended alternative is still available
    let recommendedAlternative = null;
    if (originalItem.recommendedAlternative && originalItem.recommendedAlternative.isAvailable !== false) {
      recommendedAlternative = originalItem.recommendedAlternative;
    } else if (alternatives.length > 0) {
      // Default to first alternative as recommended
      recommendedAlternative = alternatives[0];
    }
    
    res.json({
      originalItem: {
        _id: originalItem._id,
        code: originalItem.code,
        name: originalItem.name,
        category: originalItem.category,
        subCategory: originalItem.subCategory,
        pricing: originalItem.pricing,
        image: originalItem.image
      },
      alternatives: alternatives,
      recommendedAlternative: recommendedAlternative,
      fallbackUsed: availableAlternatives.length === 0 && fallbackAlternatives.length > 0
    });
    
  } catch (err) {
    console.error('Error fetching item alternatives:', err);
    res.status(500).json({ 
      message: 'Server error fetching alternatives',
      ...(process.env.NODE_ENV === 'development' && { error: err.message })
    });
  }
};