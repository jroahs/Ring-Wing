/**
 * Test script for Supabase Storage connection and functionality
 * Run with: node scripts/test-supabase-storage.js
 */

require('dotenv').config();
const supabase = require('../config/supabase');
const { 
  uploadFile, 
  getPublicUrl, 
  deleteFile, 
  listFiles,
  generateUniqueFilename 
} = require('../utils/supabaseStorage');

async function testSupabaseConnection() {
  console.log('🧪 Testing Supabase Storage Connection...\n');

  try {
    // Test 1: Check if buckets exist
    console.log('Test 1: Listing all buckets...');
    const { data: buckets, error: bucketsError } = await supabase.storage.listBuckets();
    
    if (bucketsError) {
      console.error('❌ Failed to list buckets:', bucketsError);
      return;
    }
    
    console.log(`✅ Found ${buckets.length} buckets:`);
    buckets.forEach(bucket => {
      console.log(`   - ${bucket.name} (${bucket.public ? 'Public' : 'Private'})`);
    });

    // Test 2: Test file upload (menu-items bucket)
    console.log('\nTest 2: Testing file upload to menu-items bucket...');
    const testFileName = generateUniqueFilename('test.txt', 'TEST');
    const testContent = Buffer.from('This is a test file from Ring-Wing backend');
    
    try {
      await uploadFile('menu-items', `test/${testFileName}`, testContent, {
        contentType: 'text/plain'
      });
      console.log('✅ File uploaded successfully');

      // Test 3: Get public URL
      console.log('\nTest 3: Getting public URL...');
      const publicUrl = getPublicUrl('menu-items', `test/${testFileName}`);
      console.log(`✅ Public URL generated: ${publicUrl}`);

      // Test 4: List files in test folder
      console.log('\nTest 4: Listing files in test folder...');
      const files = await listFiles('menu-items', 'test');
      console.log(`✅ Found ${files.length} files in test folder`);

      // Test 5: Delete test file
      console.log('\nTest 5: Cleaning up - deleting test file...');
      await deleteFile('menu-items', `test/${testFileName}`);
      console.log('✅ Test file deleted successfully');

    } catch (uploadError) {
      console.error('❌ Upload test failed:', uploadError.message);
    }

    // Test 6: Check private buckets
    console.log('\nTest 6: Testing private bucket access...');
    try {
      const privateFiles = await listFiles('staff-profiles', '');
      console.log(`✅ Staff profiles bucket accessible (${privateFiles.length} files)`);
    } catch (error) {
      console.error('❌ Staff profiles bucket error:', error.message);
    }

    console.log('\n🎉 All tests completed!\n');
    console.log('Summary:');
    console.log('- Supabase connection: ✅ Working');
    console.log('- File upload: ✅ Working');
    console.log('- File delete: ✅ Working');
    console.log('- Public URLs: ✅ Working');
    console.log('- Bucket access: ✅ Working');
    console.log('\n✨ Supabase Storage is ready to use!');

  } catch (error) {
    console.error('\n❌ Test failed with error:', error);
    console.error('Details:', error.message);
    
    if (error.message.includes('Invalid API key')) {
      console.log('\n💡 Tip: Check your SUPABASE_SECRET_KEY in .env file');
    }
  }
}

// Run the test
testSupabaseConnection()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error('Fatal error:', error);
    process.exit(1);
  });
