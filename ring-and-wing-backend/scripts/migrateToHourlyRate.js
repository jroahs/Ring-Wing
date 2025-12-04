/**
 * Migration Script: Daily Rate to Hourly Rate
 * 
 * This script migrates existing staff records from dailyRate to hourlyRate.
 * 
 * Formula: hourlyRate = dailyRate / standardHoursPerDay (default: 8)
 * 
 * IMPORTANT:
 * - This script only affects Staff records, NOT historical Payroll records
 * - Historical payroll entries are preserved and computed with their original rates
 * - Run this script ONCE after deploying the hourlyRate schema changes
 * 
 * Usage:
 *   node scripts/migrateToHourlyRate.js [--dry-run]
 * 
 *   --dry-run: Preview changes without modifying the database
 */

require('dotenv').config();
const mongoose = require('mongoose');
const Staff = require('../models/Staff');

// Configuration
const STANDARD_HOURS_PER_DAY = 8;
const DRY_RUN = process.argv.includes('--dry-run');

async function migrateToHourlyRate() {
  console.log('='.repeat(60));
  console.log('MIGRATION: Daily Rate → Hourly Rate');
  console.log('='.repeat(60));
  console.log(`Mode: ${DRY_RUN ? 'DRY RUN (no changes will be made)' : 'LIVE MIGRATION'}`);
  console.log(`Standard Hours Per Day: ${STANDARD_HOURS_PER_DAY}`);
  console.log('');

  try {
    // Connect to MongoDB
    const mongoUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/ring-and-wing';
    console.log(`Connecting to MongoDB: ${mongoUri.replace(/\/\/[^:]+:[^@]+@/, '//***:***@')}`);
    
    await mongoose.connect(mongoUri, {
      useNewUrlParser: true,
      useUnifiedTopology: true
    });
    console.log('✓ Connected to MongoDB\n');

    // Find all staff without hourlyRate set
    const staffToMigrate = await Staff.find({
      $or: [
        { hourlyRate: { $exists: false } },
        { hourlyRate: null },
        { hourlyRate: 0 }
      ]
    });

    console.log(`Found ${staffToMigrate.length} staff members to migrate\n`);

    if (staffToMigrate.length === 0) {
      console.log('✓ No migration needed - all staff already have hourlyRate set');
      return;
    }

    // Display migration preview
    console.log('Migration Preview:');
    console.log('-'.repeat(80));
    console.log('Name'.padEnd(25) + 'Daily Rate'.padStart(15) + 'Hourly Rate'.padStart(15) + 'Status'.padStart(15));
    console.log('-'.repeat(80));

    const migratedStaff = [];
    const errors = [];

    for (const staff of staffToMigrate) {
      const dailyRate = staff.dailyRate || 0;
      const hourlyRate = dailyRate / STANDARD_HOURS_PER_DAY;
      
      console.log(
        staff.name.substring(0, 24).padEnd(25) +
        `₱${dailyRate.toFixed(2)}`.padStart(15) +
        `₱${hourlyRate.toFixed(2)}`.padStart(15) +
        staff.status.padStart(15)
      );

      if (!DRY_RUN) {
        try {
          // Update directly to avoid triggering pre-save hooks that might cause issues
          await Staff.updateOne(
            { _id: staff._id },
            {
              $set: {
                hourlyRate: hourlyRate,
                standardHoursPerDay: STANDARD_HOURS_PER_DAY
              }
            }
          );
          migratedStaff.push(staff.name);
        } catch (err) {
          errors.push({ name: staff.name, error: err.message });
          console.error(`  ✗ Error migrating ${staff.name}: ${err.message}`);
        }
      }
    }

    console.log('-'.repeat(80));

    // Summary
    console.log('\nMigration Summary:');
    console.log('='.repeat(40));
    
    if (DRY_RUN) {
      console.log(`Would migrate: ${staffToMigrate.length} staff members`);
      console.log('\nTo perform the actual migration, run without --dry-run flag');
    } else {
      console.log(`✓ Successfully migrated: ${migratedStaff.length} staff members`);
      
      if (errors.length > 0) {
        console.log(`✗ Errors: ${errors.length}`);
        errors.forEach(e => console.log(`  - ${e.name}: ${e.error}`));
      }
    }

    // Verify migration
    if (!DRY_RUN) {
      console.log('\nVerification:');
      const verified = await Staff.find({
        hourlyRate: { $exists: true, $gt: 0 }
      }).countDocuments();
      console.log(`✓ Staff with hourlyRate set: ${verified}`);
      
      const remaining = await Staff.find({
        $or: [
          { hourlyRate: { $exists: false } },
          { hourlyRate: null },
          { hourlyRate: 0 }
        ]
      }).countDocuments();
      
      if (remaining > 0) {
        console.log(`⚠ Staff still needing migration: ${remaining}`);
      } else {
        console.log('✓ All staff successfully migrated');
      }
    }

  } catch (error) {
    console.error('Migration failed:', error);
    process.exit(1);
  } finally {
    await mongoose.disconnect();
    console.log('\n✓ Disconnected from MongoDB');
  }
}

// Run migration
migrateToHourlyRate()
  .then(() => {
    console.log('\n✓ Migration complete');
    process.exit(0);
  })
  .catch(err => {
    console.error('\n✗ Migration failed:', err);
    process.exit(1);
  });
