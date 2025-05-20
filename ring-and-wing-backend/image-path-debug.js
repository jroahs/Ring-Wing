// Image path debug script
const fs = require('fs');
const path = require('path');
const axios = require('axios');

// Configuration
const API_URL = 'http://localhost:5000';
const STAFF_TOKEN = 'YOUR_AUTH_TOKEN'; // Replace with a valid token

// Test both image path formats
async function testImagePaths() {
  console.log('===== TESTING IMAGE PATHS =====');
  
  // Check if public directory exists and is accessible
  const publicPath = path.join(__dirname, 'public');
  if (fs.existsSync(publicPath)) {
    console.log('✅ Public directory exists');
    
    // List files in public directory
    console.log('\nFiles in public directory:');
    const publicFiles = fs.readdirSync(publicPath);
    console.log(publicFiles);
    
    // List files in uploads directory if it exists
    const uploadsPath = path.join(publicPath, 'uploads');
    if (fs.existsSync(uploadsPath)) {
      console.log('\nFiles in uploads directory:');
      const uploadFiles = fs.readdirSync(uploadsPath);
      console.log(uploadFiles);
      
      // List files in staff directory if it exists
      const staffUploadsPath = path.join(uploadsPath, 'staff');
      if (fs.existsSync(staffUploadsPath)) {
        console.log('\nFiles in staff uploads directory:');
        const staffFiles = fs.readdirSync(staffUploadsPath);
        console.log(staffFiles);
      } else {
        console.log('\n⚠️ Staff uploads directory does not exist');
      }
    } else {
      console.log('\n⚠️ Uploads directory does not exist');
    }
  } else {
    console.log('⚠️ Public directory does not exist');
  }
  
  // Test API server static file access
  console.log('\n===== TESTING API SERVER STATIC FILE ACCESS =====');
  
  try {
    // Test directly from root path (new approach)
    const rootResponse = await axios.head(`${API_URL}/uploads/test-file.txt`);
    console.log('✅ Root path access successful:', rootResponse.status);
  } catch (error) {
    console.log('❌ Root path access failed:', error.message);
  }
  
  try {
    // Test from /public path (old approach)
    const publicResponse = await axios.head(`${API_URL}/public/uploads/test-file.txt`);
    console.log('✅ Public path access successful:', publicResponse.status);
  } catch (error) {
    console.log('❌ Public path access failed:', error.message);
  }
  
  // Test staff image access
  console.log('\n===== TESTING STAFF DATA =====');
  
  try {
    const headers = { Authorization: `Bearer ${STAFF_TOKEN}` };
    const staffResponse = await axios.get(`${API_URL}/api/staff`, { headers });
    
    if (staffResponse.data && staffResponse.data.length > 0) {
      console.log(`✅ Found ${staffResponse.data.length} staff records`);
      
      // Log profile picture URLs
      console.log('\nStaff profile picture URLs:');
      staffResponse.data.forEach((staff, index) => {
        console.log(`Staff ${index + 1} (${staff.name}): ${staff.profilePicture || 'No image'}`);
        
        // Try to access the image
        if (staff.profilePicture) {
          console.log(`Image URL would be: ${API_URL}${staff.profilePicture}`);
        }
      });
    } else {
      console.log('⚠️ No staff records found');
    }
  } catch (error) {
    console.log('❌ Staff data access failed:', error.message);
  }
}

// Run the tests
testImagePaths();
