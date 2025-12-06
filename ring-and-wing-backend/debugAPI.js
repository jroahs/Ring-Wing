/**
 * Debug script to see exactly what the API returns
 */

const mongoose = require('mongoose');
const GovernmentDeductionConfig = require('./models/GovernmentDeductionConfig');

const MONGO_URI = process.argv[2];

if (!MONGO_URI) {
  console.error('❌ MongoDB URI required');
  process.exit(1);
}

async function debugAPI() {
  try {
    await mongoose.connect(MONGO_URI);
    console.log('✅ Connected to MongoDB\n');

    // Simulate what the API does
    const config = await GovernmentDeductionConfig.findOne({ isActive: true })
      .sort({ year: -1, createdAt: -1 })
      .lean();
    
    if (!config) {
      console.log('❌ No active config found!');
      process.exit(1);
    }

    console.log('📋 Active Config Found:');
    console.log('   ID:', config._id);
    console.log('   Year:', config.year);
    console.log('   isActive:', config.isActive);
    console.log('   SSS mscBrackets length:', config.sss?.mscBrackets?.length || 0);
    
    if (config.sss?.mscBrackets?.length > 0) {
      console.log('\n✅ MSC Brackets exist in database!');
      console.log('   First bracket:', JSON.stringify(config.sss.mscBrackets[0], null, 2));
      console.log('   Last bracket:', JSON.stringify(config.sss.mscBrackets[config.sss.mscBrackets.length - 1], null, 2));
    } else {
      console.log('\n❌ MSC Brackets are EMPTY in database!');
    }

    // Check if the issue is with the query
    console.log('\n🔍 Checking raw document...');
    const rawConfig = await GovernmentDeductionConfig.findOne({ isActive: true });
    console.log('   Raw SSS mscBrackets length:', rawConfig.sss?.mscBrackets?.length || 0);

    mongoose.disconnect();
  } catch (error) {
    console.error('❌ Error:', error.message);
    mongoose.disconnect();
    process.exit(1);
  }
}

debugAPI();
