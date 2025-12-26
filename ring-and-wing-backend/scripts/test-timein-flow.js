/**
 * Comprehensive Time In/Time Out Flow Testing Script
 * Tests the complete PIN authentication and clock in/out flow
 */

const mongoose = require('mongoose');
require('dotenv').config();

const Staff = require('../models/Staff');
const User = require('../models/User');
const TimeLog = require('../models/TimeLog');

const MONGO_URI = process.env.MONGO_URI;

async function testTimeInFlow() {
  console.log('='.repeat(80));
  console.log('TIME IN/TIME OUT FLOW COMPREHENSIVE TESTING');
  console.log('='.repeat(80));
  console.log('\n');

  try {
    // Connect to database
    await mongoose.connect(MONGO_URI);
    console.log('✅ Connected to MongoDB\n');

    // ========================================
    // TEST 1: Check All Staff Records
    // ========================================
    console.log('📋 TEST 1: Checking All Staff Records');
    console.log('-'.repeat(80));
    
    const allStaff = await Staff.find({}).populate('userId', 'username email role').lean();
    console.log(`Total staff records: ${allStaff.length}\n`);

    let issuesFound = [];

    for (const staff of allStaff) {
      const issues = [];
      
      // Check for missing userId
      if (!staff.userId) {
        issues.push('❌ CRITICAL: Missing userId field');
      }
      
      // Check if userId is populated (User exists)
      if (staff.userId && !staff.userId.username) {
        issues.push('❌ CRITICAL: userId exists but User record not found (orphaned reference)');
      }
      
      // Check for missing required fields
      if (!staff.name || staff.name.trim() === '') {
        issues.push('⚠️  Missing or empty name');
      }
      
      if (!staff.pinCode) {
        issues.push('⚠️  Missing PIN code');
      }
      
      if (!staff.position) {
        issues.push('⚠️  Missing position');
      }
      
      if (!staff.phone) {
        issues.push('⚠️  Missing phone');
      }
      
      if (staff.hourlyRate === undefined || staff.hourlyRate === null) {
        issues.push('⚠️  Missing hourlyRate');
      }

      if (issues.length > 0) {
        issuesFound.push({
          staffId: staff._id,
          name: staff.name || 'UNNAMED',
          status: staff.status,
          issues: issues
        });
        
        console.log(`\n⚠️  ISSUES FOUND FOR: ${staff.name || 'UNNAMED'} (${staff._id})`);
        console.log(`   Status: ${staff.status}`);
        console.log(`   PIN Code: ${staff.pinCode || 'NOT SET'}`);
        issues.forEach(issue => console.log(`   ${issue}`));
      }
    }

    if (issuesFound.length === 0) {
      console.log('✅ All staff records are valid - no issues found\n');
    } else {
      console.log(`\n⚠️  TOTAL STAFF WITH ISSUES: ${issuesFound.length}\n`);
    }

    // ========================================
    // TEST 2: Test PIN Authentication
    // ========================================
    console.log('\n📋 TEST 2: Testing PIN Authentication');
    console.log('-'.repeat(80));

    const activeStaff = allStaff.filter(s => 
      s.status === 'Active' && s.pinCode && s.userId
    );

    console.log(`Testing with ${activeStaff.length} active staff members\n`);

    for (const staff of activeStaff.slice(0, 3)) { // Test first 3 active staff
      console.log(`\nTesting: ${staff.name} (PIN: ${staff.pinCode})`);
      
      try {
        // Simulate PIN authentication
        const foundStaff = await Staff.findOne({ pinCode: staff.pinCode })
          .populate('userId', 'username email role');
        
        if (!foundStaff) {
          console.log(`   ❌ FAIL: Staff not found by PIN`);
          continue;
        }

        // Validate all required fields for clock in
        const validationErrors = [];
        
        if (!foundStaff.userId) {
          validationErrors.push('Missing userId');
        }
        
        if (!foundStaff.name) {
          validationErrors.push('Missing name');
        }
        
        if (!foundStaff._id) {
          validationErrors.push('Missing _id');
        }

        if (['Terminated', 'Resigned', 'Suspended'].includes(foundStaff.status)) {
          validationErrors.push(`Status is ${foundStaff.status} - access denied`);
        }

        if (validationErrors.length > 0) {
          console.log(`   ❌ FAIL: Validation errors:`);
          validationErrors.forEach(err => console.log(`      - ${err}`));
        } else {
          console.log(`   ✅ PASS: PIN authentication successful`);
          console.log(`      User ID: ${foundStaff.userId._id}`);
          console.log(`      Username: ${foundStaff.userId.username}`);
          console.log(`      Status: ${foundStaff.status}`);
        }
      } catch (error) {
        console.log(`   ❌ ERROR: ${error.message}`);
      }
    }

    // ========================================
    // TEST 3: Simulate Clock In Operation
    // ========================================
    console.log('\n\n📋 TEST 3: Simulating Clock In Operation');
    console.log('-'.repeat(80));

    if (activeStaff.length > 0) {
      const testStaff = activeStaff[0];
      console.log(`\nSimulating clock in for: ${testStaff.name}`);
      
      try {
        // Check if already clocked in
        const lastLog = await TimeLog.findOne({ staffId: testStaff._id })
          .sort({ timestamp: -1 });
        
        if (lastLog) {
          console.log(`   Last log: ${lastLog.type} at ${lastLog.timestamp}`);
          if (lastLog.type === 'clockIn') {
            console.log(`   ⚠️  WARNING: Staff is already clocked in`);
          }
        } else {
          console.log(`   No previous time logs found`);
        }

        // Validate staff object before creating time log
        console.log(`\n   Validating staff object:`);
        console.log(`   - Staff ID: ${testStaff._id} ✅`);
        console.log(`   - User ID: ${testStaff.userId?._id || testStaff.userId} ${testStaff.userId ? '✅' : '❌'}`);
        console.log(`   - Name: ${testStaff.name} ✅`);
        console.log(`   - PIN: ${testStaff.pinCode} ✅`);
        console.log(`   - Status: ${testStaff.status} ${testStaff.status === 'Active' ? '✅' : '⚠️'}`);

        // Test creating a time log entry (dry run - won't save)
        const testTimeLog = new TimeLog({
          staffId: testStaff._id,
          type: 'clockIn',
          timestamp: new Date()
        });

        // Validate without saving
        const validationError = testTimeLog.validateSync();
        if (validationError) {
          console.log(`\n   ❌ VALIDATION ERROR when creating TimeLog:`);
          console.log(`   ${validationError.message}`);
        } else {
          console.log(`\n   ✅ TimeLog validation passed (dry run)`);
        }

      } catch (error) {
        console.log(`\n   ❌ ERROR during clock in simulation:`);
        console.log(`   ${error.message}`);
        if (error.stack) {
          console.log(`\n   Stack trace:`);
          console.log(error.stack);
        }
      }
    }

    // ========================================
    // TEST 4: Check for Recent Time Log Errors
    // ========================================
    console.log('\n\n📋 TEST 4: Checking Recent Time Logs');
    console.log('-'.repeat(80));

    const recentLogs = await TimeLog.find({})
      .sort({ timestamp: -1 })
      .limit(10)
      .populate('staffId', 'name pinCode userId');

    console.log(`\nLast 10 time logs:`);
    for (const log of recentLogs) {
      const status = log.staffId ? '✅' : '❌ ORPHANED';
      const staffName = log.staffId?.name || 'UNKNOWN';
      const hasUserId = log.staffId?.userId ? '✅' : '❌';
      
      console.log(`\n   ${log.type.toUpperCase()} - ${new Date(log.timestamp).toLocaleString()}`);
      console.log(`   Staff: ${staffName} ${status}`);
      console.log(`   Has userId: ${hasUserId}`);
    }

    // ========================================
    // TEST 5: Test Staff Model Validation
    // ========================================
    console.log('\n\n📋 TEST 5: Testing Staff Model Validation Rules');
    console.log('-'.repeat(80));

    try {
      // Test 5a: Staff without userId
      console.log('\nTest 5a: Creating staff without userId...');
      const testStaffNoUserId = new Staff({
        name: 'Test Staff',
        position: 'Cashier',
        employmentType: 'Regular',
        phone: '09123456789',
        hourlyRate: 100,
        pinCode: '9999'
        // Missing userId - should fail
      });

      const validationError = testStaffNoUserId.validateSync();
      if (validationError) {
        console.log('   ❌ EXPECTED ERROR (this is good):');
        console.log(`   ${validationError.message}`);
        
        // Check the specific error for userId
        if (validationError.errors.userId) {
          console.log(`\n   📝 userId field error message:`);
          console.log(`   "${validationError.errors.userId.message}"`);
          console.log(`\n   ⚠️  THIS IS THE ERROR USERS MIGHT BE SEEING!`);
        }
      } else {
        console.log('   ⚠️  WARNING: Validation should have failed but didn\'t!');
      }

    } catch (error) {
      console.log(`   ❌ ERROR during validation test: ${error.message}`);
    }

    // ========================================
    // SUMMARY
    // ========================================
    console.log('\n\n' + '='.repeat(80));
    console.log('TESTING SUMMARY');
    console.log('='.repeat(80));

    console.log(`\n✅ Total Staff Records: ${allStaff.length}`);
    console.log(`⚠️  Staff with Issues: ${issuesFound.length}`);
    console.log(`✅ Active Staff: ${activeStaff.length}`);
    console.log(`📝 Recent Time Logs: ${recentLogs.length}`);

    if (issuesFound.length > 0) {
      console.log('\n⚠️  CRITICAL FINDINGS:');
      console.log('Staff members with data issues were found.');
      console.log('These could be causing the "Staff [name] required" error.');
      console.log('\nAffected staff:');
      issuesFound.forEach(s => {
        console.log(`   - ${s.name} (${s.staffId}): ${s.issues.length} issue(s)`);
      });
    } else {
      console.log('\n✅ No staff data issues found.');
      console.log('The error might be triggered by a different scenario.');
    }

    console.log('\n' + '='.repeat(80));

  } catch (error) {
    console.error('\n❌ CRITICAL ERROR during testing:');
    console.error(error);
    console.error('\nStack trace:');
    console.error(error.stack);
  } finally {
    await mongoose.disconnect();
    console.log('\n✅ Disconnected from MongoDB');
  }
}

// Run the test
testTimeInFlow().then(() => {
  console.log('\n✅ Testing complete');
  process.exit(0);
}).catch(err => {
  console.error('\n❌ Fatal error:', err);
  process.exit(1);
});
