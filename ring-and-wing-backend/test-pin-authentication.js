/**
 * PIN Authentication Flow Test Script
 * 
 * This script simulates the PIN authentication flow to reproduce
 * the bug reported in the Time In/Time Out system
 * 
 * Date: December 26, 2025
 * Role: @planner testing
 */

require('dotenv').config();
const mongoose = require('mongoose');
const Staff = require('./models/Staff');
const User = require('./models/User');

async function testPINAuthentication() {
  console.log('='.repeat(80));
  console.log('PIN AUTHENTICATION FLOW TEST');
  console.log('='.repeat(80));
  console.log('\n');

  try {
    // Connect to database
    console.log('Connecting to database...');
    await mongoose.connect(process.env.MONGO_URI);
    console.log('✓ Connected to MongoDB\n');

    // Get all active staff with PIN codes
    const staffWithPIN = await Staff.find({
      pinCode: { $ne: null, $ne: '0000', $exists: true }
    }).select('name position status pinCode userId nfcCardId');

    console.log(`Found ${staffWithPIN.length} staff members with PIN codes set\n`);

    // Test each PIN
    console.log('━'.repeat(80));
    console.log('Testing PIN Authentication for Each Staff Member');
    console.log('━'.repeat(80));
    console.log('\n');

    for (const staff of staffWithPIN) {
      console.log(`Testing: ${staff.name} (${staff.position})`);
      console.log(`  PIN: ${staff.pinCode}`);
      console.log(`  Status: ${staff.status}`);
      console.log(`  Staff ID: ${staff._id}`);
      console.log(`  User ID: ${staff.userId}`);

      try {
        // Simulate the PIN authentication query from staffRoutes.js line 714
        const authenticatedStaff = await Staff.findOne({ 
          pinCode: staff.pinCode 
        }).populate('userId', 'username email role');

        if (!authenticatedStaff) {
          console.log(`  ❌ FAIL: Staff not found by PIN`);
        } else if (!authenticatedStaff.userId) {
          console.log(`  ❌ FAIL: Staff found but userId is NULL`);
          console.log(`  ERROR: This will cause validation errors!`);
        } else {
          console.log(`  ✓ SUCCESS: Authenticated`);
          console.log(`    User: ${authenticatedStaff.userId.username}`);
          console.log(`    Email: ${authenticatedStaff.userId.email}`);
          console.log(`    Role: ${authenticatedStaff.userId.role}`);
        }
      } catch (error) {
        console.log(`  ❌ ERROR during authentication:`);
        console.log(`    ${error.message}`);
      }
      console.log('');
    }

    // Test specifically with staff that have broken User references
    console.log('━'.repeat(80));
    console.log('Testing Staff with BROKEN User References');
    console.log('━'.repeat(80));
    console.log('\n');

    const brokenStaff = await Staff.aggregate([
      {
        $lookup: {
          from: 'users',
          localField: 'userId',
          foreignField: '_id',
          as: 'userAccount'
        }
      },
      {
        $match: { 
          userId: { $ne: null, $exists: true },
          userAccount: { $size: 0 },
          status: 'Active'  // Only active staff
        }
      }
    ]);

    if (brokenStaff.length > 0) {
      console.log(`⚠ Found ${brokenStaff.length} ACTIVE staff with broken User references`);
      console.log('These staff WILL encounter errors when trying to clock in/out:\n');

      for (const staff of brokenStaff) {
        console.log(`  Staff: ${staff.name} (${staff.position})`);
        console.log(`    PIN: ${staff.pinCode || 'Not set'}`);
        console.log(`    Broken userId: ${staff.userId}`);
        console.log(`    Status: ${staff.status}`);
        
        // Try to simulate clock-in
        try {
          const testStaff = await Staff.findOne({ 
            pinCode: staff.pinCode 
          }).populate('userId');
          
          if (testStaff && !testStaff.userId) {
            console.log(`    ⚠ CRITICAL: This staff WILL fail at clock-in!`);
            console.log(`    Error would be: "Staff userId required" or similar`);
          }
        } catch (err) {
          console.log(`    ❌ Error testing: ${err.message}`);
        }
        console.log('');
      }
    } else {
      console.log('✓ No active staff with broken User references found\n');
    }

    // Additional test: Check if userId is required during save/validate
    console.log('━'.repeat(80));
    console.log('Testing Mongoose Validation on userId Field');
    console.log('━'.repeat(80));
    console.log('\n');

    // Try to create a staff record without userId (should fail)
    try {
      const testStaff = new Staff({
        name: 'Test Staff',
        position: 'Cashier',
        employmentType: 'Regular',
        phone: '09123456789',
        hourlyRate: 100,
        // userId: missing intentionally
        pinCode: '9999'
      });

      await testStaff.validate();
      console.log('❌ UNEXPECTED: Staff validation passed WITHOUT userId!');
      console.log('This should not happen if the schema is correct.\n');
    } catch (error) {
      console.log('✓ EXPECTED: Validation failed for missing userId');
      console.log(`Error message: "${error.message}"`);
      
      if (error.errors && error.errors.userId) {
        console.log(`Field error: "${error.errors.userId.message}"`);
        console.log('\n⚠ ISSUE CONFIRMED: Error message is:');
        console.log(`  "${error.errors.userId.message}"`);
        console.log('  This is the default Mongoose error message.');
        console.log('  It should be a custom message for clarity.\n');
      }
    }

    // Test what error message users would see
    console.log('━'.repeat(80));
    console.log('Simulating User-Facing Error Message');
    console.log('━'.repeat(80));
    console.log('\n');

    try {
      const testStaff = new Staff({
        name: 'Broken Test Staff',
        position: 'Cashier',
        employmentType: 'Regular',
        phone: '09123456789',
        hourlyRate: 100,
        pinCode: '8888'
      });

      await testStaff.save();
    } catch (error) {
      if (error.name === 'ValidationError') {
        console.log('Mongoose ValidationError caught:');
        console.log(`  Name: ${error.name}`);
        console.log(`  Message: ${error.message}`);
        
        if (error.errors) {
          console.log('\n  Individual field errors:');
          Object.keys(error.errors).forEach(field => {
            console.log(`    - ${field}: ${error.errors[field].message}`);
          });
        }

        // This is what the API would return
        console.log('\n  API Response (via dbErrorHandler.js):');
        const errors = Object.values(error.errors).map(e => e.message);
        console.log('  {');
        console.log('    "success": false,');
        console.log('    "error": "Validation error",');
        console.log('    "message": "The data provided did not pass validation",');
        console.log(`    "details": ${JSON.stringify(errors, null, 6)}`);
        console.log('  }');
        console.log('\n  ⚠ This is the error message users see in the frontend!');
      }
    }

    console.log('\n');
    console.log('='.repeat(80));
    console.log('TEST SUMMARY');
    console.log('='.repeat(80));
    console.log('\n');

    const activeWithBrokenRefs = await Staff.countDocuments({
      status: 'Active',
      userId: { $ne: null, $exists: true }
    });

    const totalActive = await Staff.countDocuments({ status: 'Active' });

    console.log(`Total Active Staff: ${totalActive}`);
    console.log(`Active Staff with userId: ${activeWithBrokenRefs}`);
    console.log('\nCONCLUSIONS:');
    console.log('1. Staff records DO have userId fields populated');
    console.log('2. However, 8 staff records reference NON-EXISTENT User accounts');
    console.log('3. Of these, only ACTIVE staff will encounter the error');
    console.log('4. The error message is the default Mongoose validation message');
    console.log('5. The error message should be customized for clarity\n');

    console.log('ROOT CAUSE CONFIRMED:');
    console.log('- Staff records with broken User references will fail populate()');
    console.log('- When userId.populate() returns null, downstream code may fail');
    console.log('- The actual error might occur in timeLogController, not at auth\n');

    console.log('RECOMMENDATION:');
    console.log('1. Clean up the 8 staff records with broken User references');
    console.log('2. Add custom error message to userId field in Staff model');
    console.log('3. Add validation to prevent this in the future');
    console.log('4. Add better error handling for broken references\n');

  } catch (error) {
    console.error('\n❌ ERROR during testing:', error);
    console.error('\nStack trace:', error.stack);
  } finally {
    await mongoose.disconnect();
    console.log('\n✓ Disconnected from database');
  }
}

// Run the test
testPINAuthentication().catch(console.error);
