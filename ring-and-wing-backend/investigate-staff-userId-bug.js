/**
 * Database Investigation Script for Time In/Time Out PIN Mode Bug
 * 
 * This script investigates the staff-user relationship integrity
 * to validate the hypothesis from BUG_ANALYSIS_TIMEIN_PIN_MODE.md
 * 
 * Date: December 26, 2025
 * Role: @planner investigation
 */

require('dotenv').config();
const mongoose = require('mongoose');
const Staff = require('./models/Staff');
const User = require('./models/User');

async function investigateStaffUserIntegrity() {
  console.log('='.repeat(80));
  console.log('DATABASE INVESTIGATION: Staff-User Relationship Integrity');
  console.log('='.repeat(80));
  console.log('\n');

  try {
    // Connect to database
    console.log('Connecting to database...');
    await mongoose.connect(process.env.MONGO_URI);
    console.log('✓ Connected to MongoDB\n');

    // ============================================================================
    // TEST 1: Check for Orphaned Staff Records (null or missing userId)
    // ============================================================================
    console.log('━'.repeat(80));
    console.log('TEST 1: Checking for staff records with NULL or MISSING userId');
    console.log('━'.repeat(80));

    const orphanedStaff = await Staff.find({
      $or: [
        { userId: null },
        { userId: { $exists: false } }
      ]
    }).select('name position status pinCode nfcCardId userId createdAt');

    console.log(`Found ${orphanedStaff.length} staff record(s) with missing userId\n`);

    if (orphanedStaff.length > 0) {
      console.log('CRITICAL: The following staff records have NO userId reference:\n');
      orphanedStaff.forEach((staff, index) => {
        console.log(`  ${index + 1}. Staff ID: ${staff._id}`);
        console.log(`     Name: ${staff.name}`);
        console.log(`     Position: ${staff.position}`);
        console.log(`     Status: ${staff.status}`);
        console.log(`     PIN Code: ${staff.pinCode || 'Not set'}`);
        console.log(`     NFC Card: ${staff.nfcCardId || 'Not set'}`);
        console.log(`     Created: ${staff.createdAt}`);
        console.log(`     userId: ${staff.userId || 'NULL/MISSING'}`);
        console.log('');
      });
    } else {
      console.log('✓ All staff records have userId field present\n');
    }

    // ============================================================================
    // TEST 2: Verify Staff-User Relationship Integrity
    // ============================================================================
    console.log('━'.repeat(80));
    console.log('TEST 2: Checking for staff records referencing NON-EXISTENT users');
    console.log('━'.repeat(80));

    const staffWithBrokenRefs = await Staff.aggregate([
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
          userAccount: { $size: 0 } 
        }
      },
      {
        $project: {
          name: 1,
          position: 1,
          status: 1,
          userId: 1,
          pinCode: 1,
          nfcCardId: 1,
          createdAt: 1
        }
      }
    ]);

    console.log(`Found ${staffWithBrokenRefs.length} staff record(s) with broken User references\n`);

    if (staffWithBrokenRefs.length > 0) {
      console.log('CRITICAL: The following staff records reference NON-EXISTENT users:\n');
      staffWithBrokenRefs.forEach((staff, index) => {
        console.log(`  ${index + 1}. Staff ID: ${staff._id}`);
        console.log(`     Name: ${staff.name}`);
        console.log(`     Position: ${staff.position}`);
        console.log(`     Status: ${staff.status}`);
        console.log(`     PIN Code: ${staff.pinCode || 'Not set'}`);
        console.log(`     NFC Card: ${staff.nfcCardId || 'Not set'}`);
        console.log(`     Created: ${staff.createdAt}`);
        console.log(`     Invalid userId: ${staff.userId}`);
        console.log('');
      });
    } else {
      console.log('✓ All staff records with userId reference valid User accounts\n');
    }

    // ============================================================================
    // TEST 3: Review Current Staff Records Distribution
    // ============================================================================
    console.log('━'.repeat(80));
    console.log('TEST 3: Analyzing staff record distribution');
    console.log('━'.repeat(80));

    const totalStaff = await Staff.countDocuments();
    const activeStaff = await Staff.countDocuments({ status: 'Active' });
    const staffWithPIN = await Staff.countDocuments({ 
      pinCode: { $ne: null, $ne: '0000', $exists: true } 
    });
    const staffWithNFC = await Staff.countDocuments({ 
      nfcCardId: { $ne: null, $ne: '', $exists: true } 
    });
    const staffWithValidUserId = await Staff.countDocuments({
      userId: { $ne: null, $exists: true }
    });

    console.log(`Total Staff Records: ${totalStaff}`);
    console.log(`Active Staff: ${activeStaff}`);
    console.log(`Staff with PIN codes set: ${staffWithPIN}`);
    console.log(`Staff with NFC cards: ${staffWithNFC}`);
    console.log(`Staff with valid userId: ${staffWithValidUserId}`);
    console.log(`Staff with INVALID userId: ${totalStaff - staffWithValidUserId}\n`);

    // ============================================================================
    // TEST 4: Check Recent vs. Older Staff Records
    // ============================================================================
    console.log('━'.repeat(80));
    console.log('TEST 4: Comparing recent vs. older staff records');
    console.log('━'.repeat(80));

    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const recentStaff = await Staff.find({
      createdAt: { $gte: thirtyDaysAgo }
    }).select('name userId createdAt').populate('userId', 'username email');

    const olderStaff = await Staff.find({
      createdAt: { $lt: thirtyDaysAgo }
    }).select('name userId createdAt').populate('userId', 'username email');

    console.log(`Recent Staff (last 30 days): ${recentStaff.length}`);
    console.log(`Older Staff (before 30 days): ${olderStaff.length}\n`);

    const recentWithoutUser = recentStaff.filter(s => !s.userId);
    const olderWithoutUser = olderStaff.filter(s => !s.userId);

    console.log(`Recent staff WITHOUT valid userId: ${recentWithoutUser.length}`);
    console.log(`Older staff WITHOUT valid userId: ${olderWithoutUser.length}\n`);

    if (recentWithoutUser.length > 0) {
      console.log('Recent staff with missing userId:');
      recentWithoutUser.forEach(s => {
        console.log(`  - ${s.name} (created: ${s.createdAt})`);
      });
      console.log('');
    }

    if (olderWithoutUser.length > 0) {
      console.log('Older staff with missing userId:');
      olderWithoutUser.forEach(s => {
        console.log(`  - ${s.name} (created: ${s.createdAt})`);
      });
      console.log('');
    }

    // ============================================================================
    // TEST 5: Sample Staff Records for Manual Review
    // ============================================================================
    console.log('━'.repeat(80));
    console.log('TEST 5: Sample staff records with userId populated');
    console.log('━'.repeat(80));

    const sampleStaff = await Staff.find()
      .limit(5)
      .select('name position status userId pinCode')
      .populate('userId', 'username email role');

    console.log('Sample of 5 staff records:\n');
    sampleStaff.forEach((staff, index) => {
      console.log(`${index + 1}. ${staff.name} (${staff.position})`);
      console.log(`   Status: ${staff.status}`);
      console.log(`   PIN: ${staff.pinCode}`);
      if (staff.userId) {
        console.log(`   ✓ User Account: ${staff.userId.username} (${staff.userId.email})`);
        console.log(`   ✓ User Role: ${staff.userId.role}`);
      } else {
        console.log(`   ✗ User Account: MISSING/NULL`);
      }
      console.log('');
    });

    // ============================================================================
    // SUMMARY AND RECOMMENDATIONS
    // ============================================================================
    console.log('='.repeat(80));
    console.log('INVESTIGATION SUMMARY');
    console.log('='.repeat(80));
    console.log('\n');

    const totalIssues = orphanedStaff.length + staffWithBrokenRefs.length;
    
    if (totalIssues === 0) {
      console.log('✓ NO ISSUES FOUND');
      console.log('  All staff records have valid userId references.');
      console.log('  The reported bug may be caused by a different issue.\n');
      console.log('RECOMMENDATION: Review the error logs and try to reproduce the issue');
      console.log('with specific test cases to identify the actual root cause.\n');
    } else {
      console.log('⚠ ISSUES DETECTED:');
      console.log(`  - ${orphanedStaff.length} staff record(s) with NULL/missing userId`);
      console.log(`  - ${staffWithBrokenRefs.length} staff record(s) with invalid userId references`);
      console.log(`  - Total affected: ${totalIssues} staff record(s)\n`);
      
      console.log('IMPACT:');
      console.log('  These staff members will encounter validation errors when trying to:');
      console.log('  - Clock in/out using PIN mode');
      console.log('  - Clock in/out using NFC mode');
      console.log('  - Have their records accessed by time tracking system\n');
      
      console.log('URGENT ACTION REQUIRED:');
      console.log('  1. Backup the database immediately');
      console.log('  2. Review the affected staff records listed above');
      console.log('  3. Determine if these are:');
      console.log('     a) Test records that can be deleted');
      console.log('     b) Real staff that need User accounts created');
      console.log('     c) Corrupted records that need manual repair\n');
      
      console.log('NEXT STEPS:');
      console.log('  See the detailed implementation plan for database cleanup procedures.');
    }

    console.log('='.repeat(80));
    console.log('Investigation complete');
    console.log('='.repeat(80));

  } catch (error) {
    console.error('\n❌ ERROR during investigation:', error);
    console.error('\nStack trace:', error.stack);
  } finally {
    await mongoose.disconnect();
    console.log('\n✓ Disconnected from database');
  }
}

// Run the investigation
investigateStaffUserIntegrity().catch(console.error);
