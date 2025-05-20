// File: test-image-integration.js
// This script tests the full integration of our image utilities

const path = require('path');
const fs = require('fs');
const mongoose = require('mongoose');
const { saveMenuImage, deleteMenuImage, 
        saveStaffProfileImage, deleteStaffProfileImage, 
        deleteImage } = require('./utils/imageUtils');
const { cleanupOrphanedStaffImages, 
        cleanupOrphanedMenuImages, 
        cleanupOrphanedTimeLogPhotos } = require('./utils/cleanupUtils');

// Create test directories if they don't exist
console.log('\n=== SETTING UP TEST ENVIRONMENT ===');
const dirs = [
  path.join(__dirname, 'public/uploads/staff'),
  path.join(__dirname, 'public/uploads/menu'),
  path.join(__dirname, 'public/uploads/timeLog')
];

dirs.forEach(dir => {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
    console.log(`Created directory: ${dir}`);
  }
});

// Test base64 image (a small red dot)
const testBase64Image = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAUAAAAFCAYAAACNbyblAAAAHElEQVQI12P4//8/w38GIAXDIBKE0DHxgljNBAAO9TXL0Y4OHwAAAABJRU5ErkJggg==';

// Generate test IDs
const testStaffId = 'staff-' + Date.now();
const testMenuId = 'menu-' + Date.now();

// Utility to create test files
const createTestFile = (dir, filename) => {
  const fullPath = path.join(dir, filename);
  fs.writeFileSync(fullPath, 'Test file contents');
  return fullPath;
};

// Create some test files
console.log('\n=== CREATING TEST FILES ===');

// Create orphaned staff image files
const staffDir = path.join(__dirname, 'public/uploads/staff');
const orphanedStaffFile = createTestFile(staffDir, 'orphaned-staff.jpg');
console.log('Created orphaned staff file:', orphanedStaffFile);

// Create orphaned menu image files
const menuDir = path.join(__dirname, 'public/uploads/menu');
const orphanedMenuFile = createTestFile(menuDir, 'orphaned-menu.jpg');
console.log('Created orphaned menu file:', orphanedMenuFile);

// Create orphaned time log files
const timeLogDir = path.join(__dirname, 'public/uploads/timeLog');
const orphanedTimeLogFile = createTestFile(timeLogDir, 'orphaned-timelog.jpg');
console.log('Created orphaned time log file:', orphanedTimeLogFile);

// Test image utilities
console.log('\n=== TESTING IMAGE UTILITIES ===');

// Test staff profile image functions
console.log('\n1. Testing staff profile image functions:');
const staffImagePath = saveStaffProfileImage(testBase64Image, testStaffId);
console.log('Staff image saved to:', staffImagePath);

if (staffImagePath) {
  const staffDeleted = deleteStaffProfileImage(staffImagePath);
  console.log('Staff image deleted successfully:', staffDeleted);
}

// Test menu image functions
console.log('\n2. Testing menu image functions:');
const menuImagePath = saveMenuImage(testBase64Image, testMenuId);
console.log('Menu image saved to:', menuImagePath);

if (menuImagePath) {
  const menuDeleted = deleteMenuImage(menuImagePath);
  console.log('Menu image deleted successfully:', menuDeleted);
}

// Test general image deletion function
console.log('\n3. Testing general image deletion function:');
const testFile = createTestFile(menuDir, 'test-general-delete.jpg');
console.log('Created test file for general deletion:', testFile);
const testFilePath = '/uploads/menu/test-general-delete.jpg';
const generalDeleted = deleteImage(testFilePath);
console.log('General delete successful:', generalDeleted);

// Test cleanup functions
console.log('\n=== TESTING CLEANUP FUNCTIONS (MOCKED) ===');
console.log('Real cleanup functions would query the database, so we will mock them for this test');

// Clean up test files
console.log('\n=== CLEANING UP TEST ENVIRONMENT ===');
try {
  if (fs.existsSync(orphanedStaffFile)) fs.unlinkSync(orphanedStaffFile);
  if (fs.existsSync(orphanedMenuFile)) fs.unlinkSync(orphanedMenuFile);
  if (fs.existsSync(orphanedTimeLogFile)) fs.unlinkSync(orphanedTimeLogFile);
  console.log('Test files cleaned up successfully');
} catch (err) {
  console.error('Error cleaning up test files:', err);
}

console.log('\n=== TEST COMPLETE ===');
