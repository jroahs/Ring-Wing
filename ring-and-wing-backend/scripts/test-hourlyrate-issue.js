/**
 * Test HourlyRate Validation Issue
 * 6 staff members are missing hourlyRate - could this be causing the error?
 */

const mongoose = require('mongoose');
require('dotenv').config();

const Staff = require('../models/Staff');
const User = require('../models/User');
const TimeLog = require('../models/TimeLog');

const MONGO_URI = process.env.MONGO_URI;

async function testHourlyRateIssue() {
  console.log('='.repeat(80));
  console.log('TESTING: HOURLY RATE VALIDATION ISSUE');
  console.log('='.repeat(80));
  console.log('\n');

  try {
    await mongoose.connect(MONGO_URI);
    console.log('✅ Connected to MongoDB\n');

    // Find staff with missing hourlyRate
    const staffMissingRate = await Staff.find({
      $or: [
        { hourlyRate: null },
        { hourlyRate: undefined },
        { hourlyRate: { $exists: false } }
      ]
    }).populate('userId', 'username email');

    console.log(`📋 Found ${staffMissingRate.length} staff members missing hourlyRate:\n`);

    for (const staff of staffMissingRate) {
      console.log(`   - ${staff.name}`);
      console.log(`     Status: ${staff.status}`);
      console.log(`     PIN: ${staff.pinCode}`);
      console.log(`     hourlyRate: ${staff.hourlyRate}`);
      console.log(`     Has userId: ${staff.userId ? '✅' : '❌'}`);
      console.log('');
    }

    // Test: Can these staff clock in?
    console.log('\n' + '='.repeat(80));
    console.log('TEST: Simulating Clock In for Staff Missing HourlyRate');
    console.log('='.repeat(80) + '\n');

    if (staffMissingRate.length > 0) {
      const testStaff = staffMissingRate[0];
      console.log(`Testing with: ${testStaff.name} (Status: ${testStaff.status})\n`);

      // Try to validate the staff record
      console.log('Step 1: Validating staff record...');
      try {
        const validationError = testStaff.validateSync();
        if (validationError) {
          console.log('❌ VALIDATION ERROR FOUND:');
          console.log(`   ${validationError.message}\n`);
          
          // Check specific field errors
          if (validationError.errors) {
            Object.keys(validationError.errors).forEach(field => {
              console.log(`   Field: ${field}`);
              console.log(`   Error: ${validationError.errors[field].message}`);
              console.log('');
            });
          }
        } else {
          console.log('✅ Staff record validation passed\n');
        }
      } catch (err) {
        console.log(`❌ Error during validation: ${err.message}\n`);
      }

      // Try to create a TimeLog for this staff
      console.log('Step 2: Attempting to create TimeLog...');
      try {
        const testLog = new TimeLog({
          staffId: testStaff._id,
          type: 'clockIn',
          timestamp: new Date()
        });

        const logValidation = testLog.validateSync();
        if (logValidation) {
          console.log('❌ TimeLog validation failed:');
          console.log(`   ${logValidation.message}\n`);
        } else {
          console.log('✅ TimeLog validation passed (would succeed)\n');
        }
      } catch (err) {
        console.log(`❌ Error creating TimeLog: ${err.message}\n`);
      }
    }

    // Check Staff model schema for hourlyRate field
    console.log('\n' + '='.repeat(80));
    console.log('ANALYZING: Staff Model Schema for hourlyRate');
    console.log('='.repeat(80) + '\n');

    const staffSchema = Staff.schema.obj;
    const hourlyRateField = staffSchema.hourlyRate;

    console.log('hourlyRate field configuration:');
    console.log(`   Type: ${hourlyRateField.type.name}`);
    console.log(`   Required: ${hourlyRateField.required}`);
    console.log(`   Min: ${hourlyRateField.min}`);
    console.log('');

    if (hourlyRateField.required) {
      console.log('⚠️  CRITICAL: hourlyRate is a REQUIRED field!');
      console.log('   Staff members without hourlyRate will fail validation.\n');
      
      if (Array.isArray(hourlyRateField.required)) {
        console.log(`   Custom error message: "${hourlyRateField.required[1]}"\n`);
      } else {
        console.log('   Using default Mongoose error message\n');
      }
    }

    // Test: Try to save a staff without hourlyRate
    console.log('='.repeat(80));
    console.log('TEST: Creating New Staff Without HourlyRate');
    console.log('='.repeat(80) + '\n');

    // Create a test user first (needed for userId)
    const testUser = {
      _id: new mongoose.Types.ObjectId(),
      username: 'testuser',
      email: 'test@test.com'
    };

    const testNewStaff = new Staff({
      name: 'Test Staff Without Rate',
      position: 'Cashier',
      employmentType: 'Regular',
      phone: '09123456789',
      userId: testUser._id,
      pinCode: '9998',
      status: 'Active'
      // Missing hourlyRate
    });

    try {
      const validation = testNewStaff.validateSync();
      if (validation) {
        console.log('❌ VALIDATION ERROR (Expected):');
        console.log(`   ${validation.message}\n`);
        
        if (validation.errors.hourlyRate) {
          console.log('📝 Exact error for hourlyRate field:');
          console.log(`   "${validation.errors.hourlyRate.message}"\n`);
        }
      } else {
        console.log('✅ No validation error (unexpected!)\n');
      }
    } catch (err) {
      console.log(`❌ Error: ${err.message}\n`);
    }

    // Summary
    console.log('\n' + '='.repeat(80));
    console.log('FINDINGS SUMMARY');
    console.log('='.repeat(80) + '\n');

    console.log(`1. Staff missing hourlyRate: ${staffMissingRate.length}`);
    console.log(`2. hourlyRate field is REQUIRED: ${hourlyRateField.required ? 'YES' : 'NO'}`);
    
    if (staffMissingRate.length > 0 && hourlyRateField.required) {
      console.log('\n⚠️  POTENTIAL ROOT CAUSE IDENTIFIED:');
      console.log('   - hourlyRate is a required field in the Staff model');
      console.log('   - 6 staff members have NULL or missing hourlyRate');
      console.log('   - These staff cannot be saved or updated due to validation');
      console.log('   - This could trigger "Staff [field] required" errors\n');
      
      console.log('🔧 AFFECTED STAFF:');
      staffMissingRate.forEach(s => {
        console.log(`   - ${s.name} (${s.status})`);
      });
    }

    console.log('\n' + '='.repeat(80));

  } catch (error) {
    console.error('\n❌ ERROR:', error);
  } finally {
    await mongoose.disconnect();
    console.log('\n✅ Disconnected from MongoDB\n');
  }
}

testHourlyRateIssue().then(() => {
  console.log('✅ Test complete');
  process.exit(0);
}).catch(err => {
  console.error('❌ Fatal error:', err);
  process.exit(1);
});
