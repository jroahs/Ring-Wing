require('dotenv').config();
const mongoose = require('mongoose');
const GovernmentDeductionConfig = require('./models/GovernmentDeductionConfig');

async function debug() {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log('Connected to MongoDB');
    
    // Get all configs
    const configs = await GovernmentDeductionConfig.find({}).lean();
    console.log('\n=== All Configs ===');
    console.log('Total configs:', configs.length);
    
    configs.forEach((c, i) => {
      console.log(`\nConfig ${i + 1}:`);
      console.log('  _id:', c._id);
      console.log('  year:', c.year);
      console.log('  isActive:', c.isActive);
      console.log('  brackets count:', c.sss?.mscBrackets?.length || 0);
      if (c.sss?.mscBrackets?.length > 0) {
        console.log('  first bracket:', c.sss.mscBrackets[0]);
        console.log('  last bracket:', c.sss.mscBrackets[c.sss.mscBrackets.length - 1]);
      }
    });
    
    // Test getActiveConfig
    console.log('\n=== Testing getActiveConfig() ===');
    const active = await GovernmentDeductionConfig.getActiveConfig();
    if (active) {
      console.log('Active config found:');
      console.log('  _id:', active._id);
      console.log('  year:', active.year);
      console.log('  isActive:', active.isActive);
      console.log('  brackets count:', active.sss?.mscBrackets?.length || 0);
    } else {
      console.log('No active config found!');
    }
    
    mongoose.disconnect();
  } catch (err) {
    console.error('Error:', err);
    mongoose.disconnect();
  }
}

debug();
