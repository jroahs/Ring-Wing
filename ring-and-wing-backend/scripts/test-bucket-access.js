/**
 * Test script to verify Supabase bucket accessibility
 * Run with: node scripts/test-bucket-access.js
 */

require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SECRET_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Missing Supabase credentials in .env');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function testBucketAccess() {
  console.log('🔍 Testing Supabase bucket configuration...\n');

  const bucketsToTest = ['menu-items', 'merchant-qr-codes', 'staff-profiles', 'payment-proofs'];

  for (const bucketName of bucketsToTest) {
    console.log(`\n📦 Testing bucket: ${bucketName}`);
    
    try {
      // List files in bucket
      const { data: files, error: listError } = await supabase.storage
        .from(bucketName)
        .list('', { limit: 5 });

      if (listError) {
        console.error(`  ❌ Error listing files:`, listError.message);
        continue;
      }

      console.log(`  ✅ Listed ${files.length} files`);

      // Try to get public URL for first file
      if (files.length > 0) {
        const firstFile = files[0].name;
        const { data: publicUrlData } = supabase.storage
          .from(bucketName)
          .getPublicUrl(firstFile);

        console.log(`  🔗 Sample public URL: ${publicUrlData.publicUrl}`);

        // Test if URL is actually accessible (check if it returns 200 or 403/404)
        try {
          const response = await fetch(publicUrlData.publicUrl);
          if (response.ok) {
            console.log(`  ✅ Public URL is accessible (${response.status})`);
          } else {
            console.log(`  ⚠️  Public URL returned ${response.status} - Bucket may be private!`);
            console.log(`  💡 Go to Supabase Dashboard > Storage > ${bucketName} > Settings`);
            console.log(`  💡 Toggle "Public bucket" to ON`);
          }
        } catch (fetchError) {
          console.error(`  ❌ Failed to fetch public URL:`, fetchError.message);
        }
      } else {
        console.log(`  ℹ️  No files in bucket to test`);
      }
    } catch (error) {
      console.error(`  ❌ Error testing bucket:`, error.message);
    }
  }

  console.log('\n✅ Bucket access test complete!\n');
}

testBucketAccess();
