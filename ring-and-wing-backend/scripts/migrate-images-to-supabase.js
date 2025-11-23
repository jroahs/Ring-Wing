require('dotenv').config();
const mongoose = require('mongoose');
const MenuItem = require('../models/MenuItem');
const fs = require('fs');
const path = require('path');
const { uploadFile, getPublicUrl, generateUniqueFilename } = require('../utils/supabaseStorage');

async function migrateImagesToSupabase() {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log('✅ Connected to MongoDB\n');

    // Get all menu items with local images
    const items = await MenuItem.find({
      image: { $regex: '^/uploads/menu/', $options: 'i' }
    });

    console.log(`📋 Found ${items.length} menu items with local images\n`);

    let migrated = 0;
    let failed = 0;

    for (const item of items) {
      try {
        console.log(`\n🔄 Migrating: ${item.name} (${item.code})`);
        console.log(`   Old path: ${item.image}`);

        // Build local file path
        const localPath = path.join(__dirname, '../public', item.image);
        
        // Check if file exists
        if (!fs.existsSync(localPath)) {
          console.log(`   ❌ File not found locally: ${localPath}`);
          failed++;
          continue;
        }

        // Read file
        const fileBuffer = fs.readFileSync(localPath);
        const fileExt = path.extname(item.image);
        
        // Generate new filename
        const newFilename = generateUniqueFilename(`${item.code}${fileExt}`, item.code);
        const supabasePath = `images/${newFilename}`;

        // Determine content type
        const contentType = fileExt === '.png' ? 'image/png' : 
                           fileExt === '.jpg' || fileExt === '.jpeg' ? 'image/jpeg' :
                           fileExt === '.webp' ? 'image/webp' : 'image/png';

        // Upload to Supabase
        await uploadFile('menu-items', supabasePath, fileBuffer, {
          contentType: contentType
        });

        // Get public URL
        const newUrl = getPublicUrl('menu-items', supabasePath);

        // Update database
        item.image = newUrl;
        await item.save();

        console.log(`   ✅ Migrated to: ${newUrl}`);
        migrated++;

      } catch (error) {
        console.log(`   ❌ Migration failed: ${error.message}`);
        failed++;
      }
    }

    console.log(`\n\n📊 MIGRATION SUMMARY:`);
    console.log(`   ✅ Successfully migrated: ${migrated}`);
    console.log(`   ❌ Failed: ${failed}`);
    console.log(`   📊 Total: ${items.length}`);

    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

migrateImagesToSupabase();
