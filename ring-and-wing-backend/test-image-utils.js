// Test script for imageUtils.js
const { 
  saveStaffProfileImage, 
  deleteImage, 
  deleteStaffProfileImage, 
  deleteMenuImage 
} = require('./utils/imageUtils');
const fs = require('fs');
const path = require('path');

// Create test directories if they don't exist
const testDirs = [
  path.join(__dirname, 'public/uploads/test'),
  path.join(__dirname, 'public/uploads/staff'),
  path.join(__dirname, 'public/uploads/menu')
];

testDirs.forEach(dir => {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
});

// Create a test file
const testFilePath = path.join(__dirname, 'public/uploads/test/test_image.jpg');
fs.writeFileSync(testFilePath, 'Test image data');
console.log('Created test file:', testFilePath);

// Test deleteImage function
console.log('\nTesting deleteImage function:');
const relativeTestPath = '/uploads/test/test_image.jpg';
const deleteResult = deleteImage(relativeTestPath);
console.log(`Delete result: ${deleteResult}`);
console.log(`File still exists: ${fs.existsSync(testFilePath)}`);

// Test with non-existent file
console.log('\nTesting with non-existent file:');
const nonExistentPath = '/uploads/test/non_existent.jpg';
const deleteNonExistentResult = deleteImage(nonExistentPath);
console.log(`Delete non-existent result: ${deleteNonExistentResult}`);

// Test with placeholder
console.log('\nTesting with placeholder image:');
const placeholderPath = '/placeholders/menu.png';
const deletePlaceholderResult = deleteImage(placeholderPath);
console.log(`Delete placeholder result: ${deletePlaceholderResult}`);

// Test with base64 string
console.log('\nTesting with base64 string:');
const base64String = 'data:image/jpeg;base64,/9j/4AAQSkZJRgABAQEAYABgAAD/2wBDAAM';
const deleteBase64Result = deleteImage(base64String);
console.log(`Delete base64 result: ${deleteBase64Result}`);

console.log('\nAll tests completed!');
