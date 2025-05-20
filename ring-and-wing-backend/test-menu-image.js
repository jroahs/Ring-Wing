// File: test-menu-image.js
// Test script for menu image utils

const path = require('path');
const fs = require('fs');
const { saveMenuImage, deleteMenuImage } = require('./utils/imageUtils');

// Simple mock for mongoose
const mongoose = {
  Types: {
    ObjectId: function() {
      return 'test-' + Date.now();
    }
  }
};

// Mock menu item ID
const testItemId = mongoose.Types.ObjectId();

// Test base64 image (a small red dot)
const testBase64Image = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAUAAAAFCAYAAACNbyblAAAAHElEQVQI12P4//8/w38GIAXDIBKE0DHxgljNBAAO9TXL0Y4OHwAAAABJRU5ErkJggg==';

console.log('=== TESTING MENU IMAGE UTILITIES ===');

// Test saveMenuImage
console.log('\n1. Testing saveMenuImage function with base64 data:');
const savedPath = saveMenuImage(testBase64Image, testItemId);
console.log('Image saved to path:', savedPath);

if (savedPath) {
  const fullPath = path.join(__dirname, 'public', savedPath);
  const fileExists = fs.existsSync(fullPath);
  console.log('File exists at expected location:', fileExists);
  
  // Test deleteMenuImage
  console.log('\n2. Testing deleteMenuImage function:');
  const deleted = deleteMenuImage(savedPath);
  console.log('Image deleted successfully:', deleted);
  console.log('File exists after deletion:', fs.existsSync(fullPath));
} else {
  console.error('Failed to save menu image!');
}

// Test with invalid base64 data
console.log('\n3. Testing saveMenuImage with invalid data:');
const invalidPath = saveMenuImage('not-a-base64-image', testItemId);
console.log('Result with invalid data:', invalidPath);

// Test deleting non-existent image
console.log('\n4. Testing deleteMenuImage with non-existent path:');
const deleteNonExistent = deleteMenuImage('/uploads/menu/non-existent-image.jpg');
console.log('Result of deleting non-existent image:', deleteNonExistent);

// Test deleting placeholder image
console.log('\n5. Testing deleteMenuImage with placeholder image:');
const deletePlaceholder = deleteMenuImage('/placeholders/menu/default.jpg');
console.log('Result of deleting placeholder image:', deletePlaceholder);

console.log('\n=== MENU IMAGE UTILITIES TEST COMPLETE ===');
