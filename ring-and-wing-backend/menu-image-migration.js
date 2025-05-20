require('dotenv').config();
const mongoose = require('mongoose');
const fs = require('fs').promises;
const path = require('path');
const MenuItem = require('./models/MenuItem');
const { connectDB } = require('./config/db');

/**
 * This script migrates menu images to the correct directory structure
 * and updates database records accordingly
 */
async function migrateMenuImages() {
  try {
    // Connect to database
    await connectDB();
    console.log('Connected to MongoDB');

    // Ensure uploads/menu directory exists
    const menuDir = path.join(__dirname, 'public/uploads/menu');
    try {
      await fs.mkdir(menuDir, { recursive: true });
      console.log(`Created directory: ${menuDir}`);
    } catch (err) {
      if (err.code !== 'EEXIST') {
        throw err;
      }
    }

    // Get all menu items
    const menuItems = await MenuItem.find({ image: { $ne: null } });
    console.log(`Found ${menuItems.length} menu items with images`);

    let migratedCount = 0;
    let skippedCount = 0;
    let errorCount = 0;

    // Process each menu item
    for (const item of menuItems) {
      try {
        // Skip items that already have correct path
        if (!item.image || 
            item.image.includes('/uploads/menu/') || 
            item.image.includes('placeholders') ||
            item.image.startsWith('data:')) {
          console.log(`Skipping ${item._id}: Already has correct path or is placeholder`);
          skippedCount++;
          continue;
        }

        console.log(`Processing: ${item._id}, Image: ${item.image}`);
        let sourcePath;
        let oldPath = item.image;
        
        // Handle different path patterns
        if (item.image.startsWith('/public/uploads/')) {
          // Fix double /public prefix
          sourcePath = path.join(__dirname, 'public', item.image.substring(7));
        } else if (item.image.startsWith('/uploads/')) {
          // Direct path
          sourcePath = path.join(__dirname, 'public', item.image);
        } else {
          // Assume relative path
          sourcePath = path.join(__dirname, 'public/uploads', path.basename(item.image));
        }
        
        // Check if source file exists
        try {
          await fs.access(sourcePath);
        } catch (err) {
          console.error(`Source file not found: ${sourcePath}`);
          errorCount++;
          continue;
        }
        
        // Generate new filename
        const filename = `migrated-${Date.now()}-${item._id}-menu${path.extname(sourcePath)}`;
        const destPath = path.join(menuDir, filename);
        const newImagePath = `/uploads/menu/${filename}`;
        
        // Copy file to new location
        await fs.copyFile(sourcePath, destPath);
        console.log(`Copied file from ${sourcePath} to ${destPath}`);
        
        // Update database record
        item.image = newImagePath;
        await item.save();
        console.log(`Updated database: ${oldPath} -> ${newImagePath}`);
        
        // Try to delete the old file if it's not in the menu folder
        try {
          if (!sourcePath.includes('/uploads/menu/')) {
            await fs.unlink(sourcePath);
            console.log(`Deleted old file: ${sourcePath}`);
          }
        } catch (unlinkErr) {
          console.warn(`Could not delete old file ${sourcePath}: ${unlinkErr.message}`);
        }
        
        migratedCount++;
      } catch (err) {
        console.error(`Error processing item ${item._id}:`, err);
        errorCount++;
      }
    }

    console.log('\nMigration Summary:');
    console.log(`Total items: ${menuItems.length}`);
    console.log(`Migrated: ${migratedCount}`);
    console.log(`Skipped: ${skippedCount}`);
    console.log(`Errors: ${errorCount}`);

  } catch (err) {
    console.error('Migration failed:', err);
  } finally {
    // Close the connection
    setTimeout(() => {
      mongoose.connection.close();
      console.log('Database connection closed');
    }, 1000);
  }
}

// Run the migration
migrateMenuImages();
