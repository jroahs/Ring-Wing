// This script should be run ON THE RENDER SERVER to migrate existing images
// Run via Render Shell: node scripts/render-migrate-images.js

require('dotenv').config();
const mongoose = require('mongoose');
const MenuItem = require('../models/MenuItem');
const fs = require('fs');
const path = require('path');
const { uploadFile, getPublicUrl, generateUniqueFilename } = require('../utils/supabaseStorage');

async function migrateRenderImages() {
  try {
    console.log('🚀 Starting Render → Supabase migration...\n');
    
    await mongoose.connect(process.env.MONGO_URI);
    console.log('✅ Connected to MongoDB\n');

    // Get all menu items with local images
    const items = await MenuItem.find({
      image: { $regex: '^/uploads/menu/', $options: 'i' }
    });

    console.log(`📋 Found ${items.length} menu items with local images\n`);

    if (items.length === 0) {
      console.log('✨ No images to migrate!');
      process.exit(0);
    }

    let migrated = 0;
    let failed = 0;
    let notFound = 0;

    for (const item of items) {
      try {
        console.log(`\n🔄 Processing: ${item.name} (${item.code})`);
        console.log(`   Current path: ${item.image}`);

        // Build local file path (Render structure)
        const localPath = path.join(__dirname, '../public', item.image);
        
        // Check if file exists
        if (!fs.existsSync(localPath)) {
          console.log(`   ⚠️  File not found at: ${localPath}`);
          notFound++;
          continue;
        }

        // Read file
        const fileBuffer = fs.readFileSync(localPath);
        const fileStats = fs.statSync(localPath);
        const fileSizeKB = (fileStats.size / 1024).toFixed(2);
        console.log(`   📦 File size: ${fileSizeKB} KB`);
        
        const fileExt = path.extname(item.image);
        
        // Generate new filename
        const newFilename = generateUniqueFilename(`${item.code}${fileExt}`, item.code);
        const supabasePath = `images/${newFilename}`;

        // Determine content type
        const contentType = fileExt === '.png' ? 'image/png' : 
                           fileExt === '.jpg' || fileExt === '.jpeg' ? 'image/jpeg' :
                           fileExt === '.webp' ? 'image/webp' : 
                           fileExt === '.gif' ? 'image/gif' : 'image/png';

        console.log(`   ☁️  Uploading to Supabase: menu-items/${supabasePath}`);
        
        // Upload to Supabase
        await uploadFile('menu-items', supabasePath, fileBuffer, {
          contentType: contentType
        });

        // Get public URL
        const newUrl = getPublicUrl('menu-items', supabasePath);

        // Update database
        const oldImage = item.image;
        item.image = newUrl;
        await item.save();

        console.log(`   ✅ Migrated successfully!`);
        console.log(`   🔗 New URL: ${newUrl}`);
        migrated++;

      } catch (error) {
        console.log(`   ❌ Migration failed: ${error.message}`);
        failed++;
      }
    }

    console.log(`\n\n═══════════════════════════════════════`);
    console.log(`📊 MIGRATION SUMMARY`);
    console.log(`═══════════════════════════════════════`);
    console.log(`✅ Successfully migrated: ${migrated}`);
    console.log(`❌ Failed: ${failed}`);
    console.log(`⚠️  Not found: ${notFound}`);
    console.log(`📊 Total processed: ${items.length}`);
    console.log(`═══════════════════════════════════════\n`);

    if (migrated > 0) {
      console.log('🎉 Migration complete! Your images are now safely stored in Supabase.');
      console.log('💡 They will persist across deployments and restarts.');
    }

    process.exit(0);
  } catch (error) {
    console.error('❌ Fatal error:', error);
    process.exit(1);
  }
}

migrateRenderImages();
