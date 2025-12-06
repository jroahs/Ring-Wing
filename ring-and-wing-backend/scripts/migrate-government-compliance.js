/**
 * Migration Script: Upgrade Government Deduction System to 2024 Compliance
 * 
 * This script migrates existing payroll and configuration data to support:
 * - Employer contributions (SSS, PhilHealth, Pag-IBIG)
 * - Employees' Compensation (EC)
 * - Contribution basis tracking (MSC, MBS, MFS)
 * 
 * Run: node scripts/migrate-government-compliance.js
 */

const mongoose = require('mongoose');
require('dotenv').config();

// Models
const Payroll = require('../models/Payroll');
const GovernmentDeductionConfig = require('../models/GovernmentDeductionConfig');
const { calculateAllGovernmentDeductions } = require('../utils/governmentDeductions');
const { getDefault2024Config } = require('../utils/governmentConfigValidation');

// Migration statistics
const stats = {
  payrollRecordsProcessed: 0,
  payrollRecordsUpdated: 0,
  payrollErrors: [],
  configsProcessed: 0,
  configsUpdated: 0,
  configErrors: []
};

/**
 * Connect to MongoDB
 */
async function connectDB() {
  try {
    const mongoUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/ringwing';
    await mongoose.connect(mongoUri);
    console.log('✅ Connected to MongoDB');
  } catch (error) {
    console.error('❌ MongoDB connection failed:', error);
    process.exit(1);
  }
}

/**
 * Migrate Government Configuration to include employer rates
 */
async function migrateGovernmentConfig() {
  console.log('\n📋 Migrating Government Deduction Configurations...');
  
  try {
    const configs = await GovernmentDeductionConfig.find({});
    console.log(`Found ${configs.length} configurations to check`);
    
    for (const config of configs) {
      stats.configsProcessed++;
      let needsUpdate = false;
      const updates = [];
      
      // Check and add SSS employer rate
      if (!config.sss.employerRate) {
        config.sss.employerRate = 0.10;
        updates.push('Added SSS employer rate (10%)');
        needsUpdate = true;
      }
      
      // Check and add EC configuration
      if (!config.sss.ec) {
        config.sss.ec = {
          threshold: 15000,
          lowRate: 10,
          highRate: 30
        };
        updates.push('Added EC configuration');
        needsUpdate = true;
      }
      
      // Check and add PhilHealth employer rate
      if (!config.philHealth.employerRate) {
        config.philHealth.employerRate = 0.025;
        updates.push('Added PhilHealth employer rate (2.5%)');
        needsUpdate = true;
      }
      
      // Check and add Pag-IBIG employer rate
      if (!config.pagIbig.employerRate) {
        config.pagIbig.employerRate = 0.02;
        updates.push('Added Pag-IBIG employer rate (2%)');
        needsUpdate = true;
      }
      
      // Check and add MFS cap
      if (!config.pagIbig.mfsCap) {
        config.pagIbig.mfsCap = 10000;
        updates.push('Added Pag-IBIG MFS cap (₱10,000)');
        needsUpdate = true;
      }
      
      // Add version tracking if missing
      if (!config.version) {
        config.version = 1;
        needsUpdate = true;
      }
      
      // Update MSC brackets with computed contributions if missing
      if (config.sss.mscBrackets && config.sss.mscBrackets.length > 0) {
        let bracketsUpdated = false;
        for (const bracket of config.sss.mscBrackets) {
          if (!bracket.employerContribution) {
            bracket.employeeContribution = Number((bracket.msc * config.sss.employeeRate).toFixed(2));
            bracket.employerContribution = Number((bracket.msc * config.sss.employerRate).toFixed(2));
            bracket.ecContribution = bracket.msc <= 15000 ? 10 : 30;
            bracketsUpdated = true;
          }
        }
        if (bracketsUpdated) {
          updates.push('Updated MSC brackets with computed contributions');
          needsUpdate = true;
        }
      }
      
      if (needsUpdate) {
        // Add to change history
        if (!config.changeHistory) config.changeHistory = [];
        config.changeHistory.push({
          changedAt: new Date(),
          changes: updates,
          notes: 'Migration to 2024 compliance'
        });
        
        config.version = (config.version || 1) + 1;
        await config.save();
        stats.configsUpdated++;
        console.log(`  ✅ Updated config ${config.year}: ${updates.join(', ')}`);
      } else {
        console.log(`  ⏭️  Config ${config.year} already compliant`);
      }
    }
    
    // Create default 2024 config if none exists
    const activeConfig = await GovernmentDeductionConfig.findOne({ isActive: true });
    if (!activeConfig) {
      console.log('\n  ⚠️ No active configuration found. Creating default 2024 config...');
      const defaultConfig = getDefault2024Config();
      const newConfig = new GovernmentDeductionConfig(defaultConfig);
      await newConfig.save();
      console.log('  ✅ Created default 2024 compliant configuration');
      stats.configsUpdated++;
    }
    
  } catch (error) {
    console.error('❌ Error migrating configurations:', error);
    stats.configErrors.push(error.message);
  }
}

/**
 * Migrate existing payroll records to include employer contributions
 */
async function migratePayrollRecords() {
  console.log('\n📋 Migrating Payroll Records...');
  
  try {
    // Find payroll records without employer contributions
    const payrolls = await Payroll.find({
      $or: [
        { employerContributions: { $exists: false } },
        { 'employerContributions.sss': { $exists: false } }
      ]
    }).populate('staffId');
    
    console.log(`Found ${payrolls.length} payroll records to migrate`);
    
    for (const payroll of payrolls) {
      stats.payrollRecordsProcessed++;
      
      try {
        if (!payroll.staffId) {
          console.log(`  ⚠️ Skipping payroll ${payroll._id} - no staff reference`);
          continue;
        }
        
        // Calculate what the employer contributions should have been
        const monthlySalary = payroll.basicPay || payroll.regularPay || 0;
        
        if (monthlySalary <= 0) {
          console.log(`  ⚠️ Skipping payroll ${payroll._id} - no salary data`);
          continue;
        }
        
        // Recalculate using current logic
        const govtDeductions = await calculateAllGovernmentDeductions(monthlySalary, payroll.staffId);
        
        // Add employer contributions
        payroll.employerContributions = {
          sss: govtDeductions.sss.employerAmount,
          sssEc: govtDeductions.sss.ecAmount,
          philHealth: govtDeductions.philHealth.employerAmount,
          pagIbig: govtDeductions.pagIbig.employerAmount
        };
        
        // Add contribution basis
        payroll.contributionBasis = govtDeductions.contributionBasis;
        
        await payroll.save();
        stats.payrollRecordsUpdated++;
        
        if (stats.payrollRecordsUpdated % 100 === 0) {
          console.log(`  ✅ Processed ${stats.payrollRecordsUpdated} payroll records...`);
        }
        
      } catch (error) {
        console.error(`  ❌ Error migrating payroll ${payroll._id}:`, error.message);
        stats.payrollErrors.push({ id: payroll._id, error: error.message });
      }
    }
    
    console.log(`  ✅ Migrated ${stats.payrollRecordsUpdated} payroll records`);
    
  } catch (error) {
    console.error('❌ Error migrating payroll records:', error);
    stats.payrollErrors.push({ general: error.message });
  }
}

/**
 * Verify migration results
 */
async function verifyMigration() {
  console.log('\n📋 Verifying Migration...');
  
  // Check configs
  const compliantConfigs = await GovernmentDeductionConfig.countDocuments({
    'sss.employerRate': { $exists: true },
    'sss.ec': { $exists: true },
    'philHealth.employerRate': { $exists: true },
    'pagIbig.employerRate': { $exists: true }
  });
  
  const totalConfigs = await GovernmentDeductionConfig.countDocuments({});
  console.log(`  Configurations: ${compliantConfigs}/${totalConfigs} compliant`);
  
  // Check payrolls
  const compliantPayrolls = await Payroll.countDocuments({
    'employerContributions.sss': { $exists: true }
  });
  
  const totalPayrolls = await Payroll.countDocuments({});
  console.log(`  Payroll Records: ${compliantPayrolls}/${totalPayrolls} have employer contributions`);
  
  // Sample verification
  console.log('\n📋 Sample Verification (Active Config):');
  const activeConfig = await GovernmentDeductionConfig.findOne({ isActive: true });
  if (activeConfig) {
    console.log(`  Year: ${activeConfig.year}`);
    console.log(`  SSS: EE ${activeConfig.sss.employeeRate * 100}% / ER ${activeConfig.sss.employerRate * 100}%`);
    console.log(`  EC: ₱${activeConfig.sss.ec?.lowRate} (≤₱${activeConfig.sss.ec?.threshold}) / ₱${activeConfig.sss.ec?.highRate} (>₱${activeConfig.sss.ec?.threshold})`);
    console.log(`  PhilHealth: EE ${activeConfig.philHealth.employeeRate * 100}% / ER ${activeConfig.philHealth.employerRate * 100}%`);
    console.log(`  Pag-IBIG: EE ${activeConfig.pagIbig.employeeRate * 100}% / ER ${activeConfig.pagIbig.employerRate * 100}%`);
    console.log(`  MFS Cap: ₱${activeConfig.pagIbig.mfsCap}`);
  }
}

/**
 * Print migration summary
 */
function printSummary() {
  console.log('\n' + '='.repeat(60));
  console.log('MIGRATION SUMMARY');
  console.log('='.repeat(60));
  console.log(`\nConfigurations:`);
  console.log(`  - Processed: ${stats.configsProcessed}`);
  console.log(`  - Updated: ${stats.configsUpdated}`);
  console.log(`  - Errors: ${stats.configErrors.length}`);
  
  console.log(`\nPayroll Records:`);
  console.log(`  - Processed: ${stats.payrollRecordsProcessed}`);
  console.log(`  - Updated: ${stats.payrollRecordsUpdated}`);
  console.log(`  - Errors: ${stats.payrollErrors.length}`);
  
  if (stats.configErrors.length > 0) {
    console.log('\nConfig Errors:');
    stats.configErrors.forEach(e => console.log(`  - ${e}`));
  }
  
  if (stats.payrollErrors.length > 0) {
    console.log('\nPayroll Errors (first 10):');
    stats.payrollErrors.slice(0, 10).forEach(e => console.log(`  - ${e.id}: ${e.error}`));
  }
  
  console.log('\n' + '='.repeat(60));
}

/**
 * Main migration function
 */
async function runMigration() {
  console.log('🚀 Starting Government Compliance Migration');
  console.log('='.repeat(60));
  
  await connectDB();
  
  // Run migrations
  await migrateGovernmentConfig();
  await migratePayrollRecords();
  await verifyMigration();
  
  printSummary();
  
  await mongoose.connection.close();
  console.log('\n✅ Migration complete. Database connection closed.');
}

// Run migration
runMigration().catch(error => {
  console.error('❌ Migration failed:', error);
  process.exit(1);
});
