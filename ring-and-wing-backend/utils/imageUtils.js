// Utility function for handling base64 image uploads for staff

const fs = require('fs');
const path = require('path');

/**
 * Save a base64 encoded image to the filesystem
 * @param {string} base64Data - The base64 encoded image data
 * @param {string} staffId - The ID of the staff member
 * @returns {string|null} - The relative path to the saved image or null if failed
 */
const saveStaffProfileImage = (base64Data, staffId) => {
  try {
    if (!base64Data || typeof base64Data !== 'string' || !base64Data.startsWith('data:image')) {
      console.log('[Staff Debug] Invalid base64 image data');
      return null;
    }

    // Create the directory if it doesn't exist
    const dir = path.join(__dirname, '../public/uploads/staff');
    if (!fs.existsSync(dir)){
      fs.mkdirSync(dir, { recursive: true });
    }

    // Extract the image data and determine file extension
    const matches = base64Data.match(/^data:image\/([A-Za-z-+\/]+);base64,(.+)$/);
    if (!matches || matches.length !== 3) {
      console.log('[Staff Debug] Invalid base64 image format');
      return null;
    }

    const imageType = matches[1];
    const imageData = matches[2];
    const buffer = Buffer.from(imageData, 'base64');

    // Generate filename
    const timestamp = Date.now();
    const filename = `${timestamp}-${staffId}-profile.${imageType === 'jpeg' ? 'jpg' : imageType}`;
    const filepath = path.join(dir, filename);
      // Save the file
    fs.writeFileSync(filepath, buffer);
    console.log('[Staff Debug] Saved base64 profile image to:', filepath);
    
    // Return the relative path for database storage (without /public prefix)
    return `/uploads/staff/${filename}`;
  } catch (error) {
    console.error('[Staff Debug] Error saving base64 profile image:', error);
    return null;
  }
};

/**
 * Delete an image file from the filesystem
 * @param {string} imagePath - The relative path to the image, e.g. /uploads/staff/123.jpg
 * @returns {boolean} - Whether the deletion was successful
 */
const deleteImage = (imagePath) => {
  try {
    if (!imagePath || typeof imagePath !== 'string') {
      console.log('[Image Debug] Invalid image path for deletion');
      return false;
    }

    // Skip if it's a base64 string or placeholder
    if (imagePath.startsWith('data:') || imagePath.includes('placeholders')) {
      console.log('[Image Debug] Skipping deletion of base64 or placeholder image');
      return false;
    }

    // Convert relative path to absolute path
    const absolutePath = path.join(__dirname, '../public', imagePath);
    
    // Check if file exists before attempting to delete
    if (!fs.existsSync(absolutePath)) {
      console.log('[Image Debug] Image not found for deletion:', absolutePath);
      return false;
    }
    
    // Delete the file
    fs.unlinkSync(absolutePath);
    console.log('[Image Debug] Successfully deleted image:', absolutePath);
    return true;
  } catch (error) {
    console.error('[Image Debug] Error deleting image:', error);
    return false;
  }
};

/**
 * Delete a menu image
 * @param {string} imagePath - The relative path to the image
 * @returns {boolean} - Whether the deletion was successful
 */
const deleteMenuImage = (imagePath) => {
  try {
    if (!imagePath || typeof imagePath !== 'string') {
      console.log('[Menu Debug] Invalid image path for deletion');
      return false;
    }

    // Skip if it's a base64 string or placeholder
    if (imagePath.startsWith('data:') || imagePath.includes('placeholders')) {
      console.log('[Menu Debug] Skipping deletion of base64 or placeholder image');
      return false;
    }

    // Convert relative path to absolute path
    let absolutePath = path.join(__dirname, '../public', imagePath);
    
    // Handle old paths that might not have /menu in them
    if (!imagePath.includes('/menu/') && imagePath.includes('/uploads/')) {
      console.log('[Menu Debug] Converting old path format to new menu-specific format');
      const filename = path.basename(imagePath);
      const menuPath = `/uploads/menu/${filename}`;
      const possibleMenuPath = path.join(__dirname, '../public', menuPath);
      
      // Check if file exists in menu directory
      if (fs.existsSync(possibleMenuPath)) {
        absolutePath = possibleMenuPath;
      }
    }
    
    // Check if file exists before attempting to delete
    if (!fs.existsSync(absolutePath)) {
      console.log('[Menu Debug] Image not found for deletion:', absolutePath);
      return false;
    }
    
    // Delete the file
    fs.unlinkSync(absolutePath);
    console.log('[Menu Debug] Successfully deleted menu image:', absolutePath);
    return true;
  } catch (error) {
    console.error('[Menu Debug] Error deleting menu image:', error);
    return false;
  }
};

/**
 * Delete a staff profile image
 * @param {string} imagePath - The relative path to the image
 * @returns {boolean} - Whether the deletion was successful
 */
const deleteStaffProfileImage = (imagePath) => {
  return deleteImage(imagePath);
};

/**
 * Save a base64 encoded menu image to the filesystem
 * @param {string} base64Data - The base64 encoded image data
 * @param {string} itemId - The ID of the menu item
 * @returns {string|null} - The relative path to the saved image or null if failed
 */
const saveMenuImage = (base64Data, itemId) => {
  try {
    if (!base64Data || typeof base64Data !== 'string' || !base64Data.startsWith('data:image')) {
      console.log('[Menu Debug] Invalid base64 image data');
      return null;
    }

    // Create the directory if it doesn't exist
    const dir = path.join(__dirname, '../public/uploads/menu');
    if (!fs.existsSync(dir)){
      fs.mkdirSync(dir, { recursive: true });
    }

    // Extract the image data and determine file extension
    const matches = base64Data.match(/^data:image\/([A-Za-z-+\/]+);base64,(.+)$/);
    if (!matches || matches.length !== 3) {
      console.log('[Menu Debug] Invalid base64 image format');
      return null;
    }

    const imageType = matches[1];
    const imageData = matches[2];
    const buffer = Buffer.from(imageData, 'base64');

    // Generate filename
    const timestamp = Date.now();
    const filename = `${timestamp}-${itemId}-menu.${imageType === 'jpeg' ? 'jpg' : imageType}`;
    const filepath = path.join(dir, filename);
      // Save the file
    fs.writeFileSync(filepath, buffer);
    console.log('[Menu Debug] Saved base64 menu image to:', filepath);
    
    // Return the relative path for database storage (without /public prefix)
    return `/uploads/menu/${filename}`;
  } catch (error) {
    console.error('[Menu Debug] Error saving base64 menu image:', error);
    return null;
  }
};

module.exports = {
  saveStaffProfileImage,
  saveMenuImage,
  deleteImage,
  deleteMenuImage,
  deleteStaffProfileImage
};
