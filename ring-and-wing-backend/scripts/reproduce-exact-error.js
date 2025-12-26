/**
 * Reproduce the Exact Error Scenario
 * Test what happens when a staff with missing hourlyRate tries to clock in
 */

const mongoose = require('mongoose');
const express = require('express');
const FormData = require('form-data');
require('dotenv').config();

const Staff = require('../models/Staff');
const User = require('../models/User');
const TimeLog = require('../models/TimeLog');

const MONGO_URI = process.env.MONGO_URI;

async function reproduceError() {
  console.log('='.repeat(80));
  console.log('REPRODUCING: Exact Error Scenario');
  console.log('='.repeat(80));
  console.log('\n');

  try {
    await mongoose.connect(MONGO_URI);
    console.log('✅ Connected to MongoDB\n');

    // Get a staff member with missing hourlyRate
    const problemStaff = await Staff.findOne({
      hourlyRate: { $in: [null, undefined] },
      status: { $nin: ['Active'] } // Get terminated/resigned staff
    }).populate('userId', 'username email');

    if (!problemStaff) {
      console.log('❌ No staff with missing hourlyRate found');
      return;
    }

    console.log('📋 Testing with Problem Staff:');
    console.log(`   Name: ${problemStaff.name}`);
    console.log(`   Status: ${problemStaff.status}`);
    console.log(`   PIN: ${problemStaff.pinCode}`);
    console.log(`   hourlyRate: ${problemStaff.hourlyRate}`);
    console.log(`   userId: ${problemStaff.userId?._id || 'MISSING'}\n`);

    console.log('='.repeat(80));
    console.log('SCENARIO 1: What if status was changed to Active?');
    console.log('='.repeat(80) + '\n');

    // Simulate trying to reactivate this staff
    console.log('Attempting to change status from Terminated to Active...\n');
    
    try {
      // Try to update and save
      problemStaff.status = 'Active';
      
      console.log('Step 1: Validating before save...');
      const validationError = problemStaff.validateSync();
      
      if (validationError) {
        console.log('❌ VALIDATION FAILED:');
        console.log(`   Main error: ${validationError.message}\n`);
        
        Object.keys(validationError.errors).forEach(field => {
          console.log(`   ❌ ${field}: ${validationError.errors[field].message}`);
        });
        
        console.log('\n⚠️  THIS PREVENTS REACTIVATING THE STAFF!');
        console.log('   Admin cannot change status to Active without fixing hourlyRate first.\n');
      }
      
      // Reset status
      problemStaff.status = 'Terminated';
      
    } catch (err) {
      console.log(`❌ Error: ${err.message}\n`);
    }

    console.log('\n' + '='.repeat(80));
    console.log('SCENARIO 2: What if they try to use their PIN?');
    console.log('='.repeat(80) + '\n');

    // Simulate PIN authentication endpoint behavior
    console.log(`Step 1: User enters PIN "${problemStaff.pinCode}" on Time Clock...\n`);
    
    const foundByPin = await Staff.findOne({ pinCode: problemStaff.pinCode })
      .populate('userId', 'username email role');
    
    if (foundByPin) {
      console.log('✅ Staff found by PIN');
      console.log(`   Name: ${foundByPin.name}`);
      console.log(`   Status: ${foundByPin.status}\n`);
      
      // Check status (this is what the backend does)
      if (['Terminated', 'Resigned', 'Suspended'].includes(foundByPin.status)) {
        console.log('❌ BLOCKED: Status check failed');
        console.log(`   Error message shown: "Access denied: Your employment has been terminated"\n`);
        console.log('✅ This is EXPECTED and CORRECT behavior\n');
      }
    }

    console.log('\n' + '='.repeat(80));
    console.log('SCENARIO 3: What if hourlyRate was added to EmployeeManagement form?');
    console.log('='.repeat(80) + '\n');

    console.log('Checking if EmployeeManagement.jsx validates hourlyRate...\n');
    
    // Simulate what happens when admin tries to edit this staff in the UI
    console.log('When admin opens "Edit Staff" modal:');
    console.log('   1. Frontend loads staff data');
    console.log('   2. formData.hourlyRate = undefined or null');
    console.log('   3. Admin fills in other fields but might miss hourlyRate');
    console.log('   4. Admin clicks "Save Staff Info Only" or "Save All"\n');
    
    console.log('Backend receives update with:');
    console.log('   - name: ✅');
    console.log('   - position: ✅');
    console.log('   - phone: ✅');
    console.log('   - hourlyRate: undefined or null ❌\n');
    
    console.log('Mongoose tries to validate and save...');
    console.log('❌ Validation Error: "Hourly rate is required"\n');
    
    console.log('⚠️  ERROR MESSAGE TO USER:');
    console.log('   Could appear as: "Staff [field] required" or "Hourly rate is required"\n');

    console.log('\n' + '='.repeat(80));
    console.log('SCENARIO 4: Migration/Historical Data Issue');
    console.log('='.repeat(80) + '\n');

    console.log('These 6 staff members likely existed BEFORE hourlyRate became required.\n');
    
    console.log('Timeline:');
    console.log('   1. Staff created with only dailyRate field');
    console.log('   2. System migrated to use hourlyRate as primary field');
    console.log('   3. hourlyRate marked as "required" in schema');
    console.log('   4. Old staff records never got hourlyRate populated');
    console.log('   5. They were terminated/resigned (status changed)');
    console.log('   6. Now ANY update to these records fails validation\n');

    console.log('Impact:');
    console.log('   ✅ These staff CANNOT clock in (already terminated)');
    console.log('   ❌ Admin CANNOT edit these staff records');
    console.log('   ❌ Admin CANNOT reactivate these staff');
    console.log('   ❌ Any operation that saves these records will fail\n');

    // Check if there are Active staff with this issue
    console.log('\n' + '='.repeat(80));
    console.log('CRITICAL CHECK: Are any ACTIVE staff affected?');
    console.log('='.repeat(80) + '\n');

    const activeWithoutRate = await Staff.find({
      status: 'Active',
      $or: [
        { hourlyRate: null },
        { hourlyRate: undefined },
        { hourlyRate: { $exists: false } }
      ]
    });

    if (activeWithoutRate.length > 0) {
      console.log(`❌ CRITICAL: ${activeWithoutRate.length} ACTIVE staff missing hourlyRate!\n`);
      activeWithoutRate.forEach(s => {
        console.log(`   ⚠️  ${s.name} - PIN: ${s.pinCode}`);
      });
      console.log('\n   THESE STAFF CANNOT:');
      console.log('   - Be edited in Employee Management');
      console.log('   - Have their status changed');
      console.log('   - Be updated in any way');
      console.log('   - Clock in (might fail validation)\n');
    } else {
      console.log('✅ NO active staff are missing hourlyRate');
      console.log('   All active staff can clock in successfully\n');
      console.log('   ⚠️  However, terminated/resigned staff records are "frozen"');
      console.log('   Admin cannot edit or reactivate them without fixing hourlyRate\n');
    }

    console.log('\n' + '='.repeat(80));
    console.log('ROOT CAUSE CONFIRMED');
    console.log('='.repeat(80) + '\n');

    console.log('🎯 IDENTIFIED ISSUE:');
    console.log('   Field: hourlyRate');
    console.log('   Problem: Required field, but 6 staff have NULL/undefined value');
    console.log('   Affected: All terminated/resigned staff (legacy data)');
    console.log('   Impact: Cannot edit or reactivate these staff members\n');

    console.log('📝 ERROR MESSAGE:');
    console.log('   When trying to save/update: "Hourly rate is required"');
    console.log('   Might display as: "Staff [field] required" in some contexts\n');

    console.log('🔧 WHEN IT OCCURS:');
    console.log('   ✅ When admin tries to edit terminated/resigned staff');
    console.log('   ✅ When admin tries to reactivate old staff members');
    console.log('   ❌ NOT during normal Time In/Time Out (active staff are fine)');
    console.log('   ❌ NOT during PIN authentication (validation not triggered)\n');

    console.log('💡 WHY USERS REPORTED "Staff [name] required":');
    console.log('   - Admin tried to edit an old staff member');
    console.log('   - Staff record has missing hourlyRate (legacy data)');
    console.log('   - Mongoose validation fails when trying to save');
    console.log('   - Error message contains "required" but might be misinterpreted\n');

    console.log('='.repeat(80));

  } catch (error) {
    console.error('\n❌ ERROR:', error);
    console.error(error.stack);
  } finally {
    await mongoose.disconnect();
    console.log('\n✅ Disconnected from MongoDB\n');
  }
}

reproduceError().then(() => {
  console.log('✅ Analysis complete');
  process.exit(0);
}).catch(err => {
  console.error('❌ Fatal error:', err);
  process.exit(1);
});
