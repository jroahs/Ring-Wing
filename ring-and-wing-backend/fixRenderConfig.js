/**
 * Fix the existing config in whatever database Render is using
 * This will:
 * 1. Find the config with 45 brackets
 * 2. Fix the Infinity issue in the last bracket
 * 3. Set it to isActive: true
 * 4. Update year to 2025
 */

const mongoose = require('mongoose');
const GovernmentDeductionConfig = require('./models/GovernmentDeductionConfig');

const MONGO_URI = process.argv[2];

if (!MONGO_URI) {
  console.error('❌ MongoDB URI required');
  process.exit(1);
}

async function fixExistingConfig() {
  try {
    await mongoose.connect(MONGO_URI);
    console.log('✅ Connected to MongoDB\n');

    // Find all configs
    const configs = await GovernmentDeductionConfig.find({});
    console.log(`📋 Found ${configs.length} config(s)`);

    if (configs.length === 0) {
      console.log('❌ No configs found. Run the seed script first.');
      process.exit(1);
    }

    // Get the most recent one
    const config = configs[configs.length - 1];
    console.log(`\n🔍 Working with config:`);
    console.log(`   ID: ${config._id}`);
    console.log(`   Year: ${config.year}`);
    console.log(`   isActive: ${config.isActive}`);
    console.log(`   MSC Brackets: ${config.sss?.mscBrackets?.length || 0}`);

    // Fix the Infinity issue in brackets
    let fixedCount = 0;
    if (config.sss?.mscBrackets) {
      config.sss.mscBrackets.forEach((bracket, idx) => {
        if (bracket.max === Infinity || bracket.max === null || bracket.max > 999999999) {
          console.log(`   Fixing bracket ${idx}: max was ${bracket.max}, setting to 999999999`);
          bracket.max = 999999999;
          fixedCount++;
        }
      });
    }

    // Update config
    config.year = 2025;
    config.isActive = true;
    config.isDraft = false;
    config.approval = {
      status: 'approved',
      approvedBy: config.createdBy,
      approvedAt: new Date()
    };
    config.effectiveDate = new Date('2025-01-01');

    await config.save();

    console.log(`\n✅ Config updated successfully!`);
    console.log(`   Fixed ${fixedCount} bracket(s) with Infinity`);
    console.log(`   Year: ${config.year}`);
    console.log(`   isActive: ${config.isActive}`);
    console.log(`   MSC Brackets: ${config.sss.mscBrackets.length}`);

    mongoose.disconnect();
  } catch (error) {
    console.error('❌ Error:', error.message);
    mongoose.disconnect();
    process.exit(1);
  }
}

fixExistingConfig();
