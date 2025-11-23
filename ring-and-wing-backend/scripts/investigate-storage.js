require('dotenv').config();
const mongoose = require('mongoose');
const MenuItem = require('../models/MenuItem');
const supabase = require('../config/supabase');

async function investigateImageStorage() {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log('✅ Connected to MongoDB\n');

    // Get the most recently updated item
    const latestItem = await MenuItem.findOne({}).sort({ updatedAt: -1 }).lean();
    
    if (!latestItem) {
      console.log('❌ No menu items found');
      process.exit(0);
    }

    console.log('🔍 INVESTIGATING LATEST MENU ITEM:\n');
    console.log(`Name: ${latestItem.name}`);
    console.log(`Code: ${latestItem.code}`);
    console.log(`Updated: ${new Date(latestItem.updatedAt).toLocaleString()}`);
    console.log(`\nImage URL: ${latestItem.image || 'No image'}`);
    console.log(`\n📊 Image Analysis:`);
    
    if (!latestItem.image) {
      console.log('❌ No image stored');
    } else if (latestItem.image.includes('supabase.co')) {
      console.log('✅ Image is stored in SUPABASE');
      console.log(`   Full URL: ${latestItem.image}`);
      
      // Try to parse the URL
      const url = new URL(latestItem.image);
      const pathParts = url.pathname.split('/');
      const bucketIndex = pathParts.indexOf('object') + 2;
      const bucket = pathParts[bucketIndex];
      const filePath = pathParts.slice(bucketIndex + 1).join('/');
      
      console.log(`   Bucket: ${bucket}`);
      console.log(`   Path: ${filePath}`);
      
      // Check if file exists in Supabase
      console.log(`\n🔍 Verifying in Supabase...`);
      const folderPath = filePath.includes('/') ? filePath.substring(0, filePath.lastIndexOf('/')) : '';
      const fileName = filePath.includes('/') ? filePath.substring(filePath.lastIndexOf('/') + 1) : filePath;
      
      const { data: files, error } = await supabase.storage
        .from(bucket)
        .list(folderPath);
      
      if (error) {
        console.log(`❌ Error checking Supabase: ${error.message}`);
      } else {
        const fileExists = files.some(f => f.name === fileName);
        console.log(`   File exists in Supabase: ${fileExists ? '✅ YES' : '❌ NO'}`);
        if (fileExists) {
          const file = files.find(f => f.name === fileName);
          console.log(`   Size: ${(file.metadata?.size || 0) / 1024} KB`);
        }
      }
    } else if (latestItem.image.includes('/uploads/')) {
      console.log('⚠️  Image is stored in LOCAL FILESYSTEM (will be deleted on redeploy)');
      console.log(`   Path: ${latestItem.image}`);
    } else {
      console.log(`❓ Unknown storage location: ${latestItem.image}`);
    }

    // Check all buckets
    console.log(`\n\n📦 CHECKING ALL SUPABASE BUCKETS:\n`);
    
    const buckets = ['menu-items', 'staff-profiles', 'payment-proofs', 'merchant-qr-codes', 'timelogs'];
    
    for (const bucket of buckets) {
      try {
        const { data: rootFiles, error: rootError } = await supabase.storage
          .from(bucket)
          .list('', { limit: 100 });
        
        if (rootError) {
          console.log(`❌ ${bucket}: Error - ${rootError.message}`);
          continue;
        }
        
        let totalFiles = rootFiles.length;
        console.log(`📁 ${bucket}: ${totalFiles} items in root`);
        
        // Check subfolders
        for (const item of rootFiles) {
          if (item.id === null) { // It's a folder
            const { data: subFiles } = await supabase.storage
              .from(bucket)
              .list(item.name, { limit: 100 });
            if (subFiles) {
              totalFiles += subFiles.length;
              console.log(`   └─ ${item.name}/: ${subFiles.length} files`);
              subFiles.forEach(f => {
                if (f.name) {
                  console.log(`      └─ ${f.name} (${((f.metadata?.size || 0) / 1024).toFixed(2)} KB)`);
                }
              });
            }
          } else if (item.name) {
            console.log(`   └─ ${item.name} (${((item.metadata?.size || 0) / 1024).toFixed(2)} KB)`);
          }
        }
      } catch (err) {
        console.log(`❌ ${bucket}: ${err.message}`);
      }
    }

    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

investigateImageStorage();
