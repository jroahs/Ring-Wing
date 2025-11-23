require('dotenv').config();
const mongoose = require('mongoose');
const MenuItem = require('../models/MenuItem');
const supabase = require('../config/supabase');

async function checkMenuImages() {
  try {
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGO_URI);
    console.log('✅ Connected to MongoDB\n');

    // Get latest menu items
    const items = await MenuItem.find({}).sort({ updatedAt: -1 }).limit(10).lean();
    
    console.log(`📋 Latest ${items.length} menu items:\n`);
    items.forEach((item, index) => {
      console.log(`${index + 1}. ${item.name} (${item.code})`);
      console.log(`   Image: ${item.image || 'No image'}`);
      console.log(`   Type: ${item.image?.includes('supabase.co') ? '☁️  Supabase' : item.image?.includes('/uploads/') ? '💾 Local' : '❌ None'}`);
      console.log(`   Updated: ${new Date(item.updatedAt).toLocaleString()}\n`);
    });

    // Check Supabase bucket
    console.log('\n📦 Checking Supabase menu-items bucket:\n');
    const { data: files, error } = await supabase.storage
      .from('menu-items')
      .list('images', { limit: 100 });

    if (error) {
      console.error('❌ Error listing files:', error.message);
    } else {
      console.log(`✅ Found ${files.length} files in menu-items/images/`);
      files.forEach(file => {
        const sizeKB = (file.metadata?.size || 0) / 1024;
        console.log(`   - ${file.name} (${sizeKB.toFixed(2)} KB)`);
      });
    }

    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

checkMenuImages();
