/**
 * Clean up production configs and verify
 */

const mongoose = require('mongoose');
const GovernmentDeductionConfig = require('./models/GovernmentDeductionConfig');

const MONGO_URI = process.argv[2];

if (!MONGO_URI) {
  console.error('❌ MongoDB URI required');
  process.exit(1);
}

async function cleanConfigs() {
  try {
    await mongoose.connect(MONGO_URI);
    console.log('✅ Connected to Production MongoDB\n');

    // List all configs
    const configs = await GovernmentDeductionConfig.find({}).lean();
    console.log('📋 Current configs in database:', configs.length);
    configs.forEach((c, i) => {
      console.log(`\n${i + 1}. Config ID: ${c._id}`);
      console.log(`   Year: ${c.year}`);
      console.log(`   isActive: ${c.isActive}`);
      console.log(`   Version: ${c.version || 'N/A'}`);
      console.log(`   MSC Brackets: ${c.sss?.mscBrackets?.length || 0}`);
      console.log(`   Created: ${c.createdAt}`);
    });

    // Delete old 2024 configs
    console.log('\n🗑️  Deleting all 2024 configs...');
    const deleteResult = await GovernmentDeductionConfig.deleteMany({ year: 2024 });
    console.log(`✅ Deleted ${deleteResult.deletedCount} old configs`);

    // Show what's left
    const remaining = await GovernmentDeductionConfig.find({}).lean();
    console.log('\n📋 Remaining configs:', remaining.length);
    remaining.forEach((c, i) => {
      console.log(`\n${i + 1}. Year ${c.year} - ${c.sss?.mscBrackets?.length || 0} brackets - Active: ${c.isActive}`);
    });

    mongoose.disconnect();
  } catch (error) {
    console.error('❌ Error:', error.message);
    mongoose.disconnect();
    process.exit(1);
  }
}

cleanConfigs();
