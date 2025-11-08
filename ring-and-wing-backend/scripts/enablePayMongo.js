/**
 * Script to Enable PayMongo for Testing
 * 
 * This script connects to the MongoDB database and enables PayMongo
 * GCash integration in the settings collection for testing purposes.
 */

const mongoose = require('mongoose');
const Settings = require('../models/Settings');

// Load environment variables
require('dotenv').config();

async function enablePayMongo() {
  try {
    // Connect to MongoDB
    console.log('Connecting to MongoDB...');
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/ring-and-wing');
    console.log('✅ Connected to MongoDB');

    // Get or create settings
    console.log('Getting settings document...');
    const settings = await Settings.getSettings();
    console.log('✅ Settings document retrieved');

    // Enable PayMongo GCash integration
    console.log('Enabling PayMongo integration...');
    
    if (!settings.paymentGateways) {
      settings.paymentGateways = {};
    }
    
    settings.paymentGateways.paymongo = {
      enabled: true,
      mode: 'test',
      gcashEnabled: true,
      paymayaEnabled: false  // Can be enabled later
    };

    // Save settings
    await settings.save();
    console.log('✅ PayMongo integration enabled successfully!');

    // Display current settings
    console.log('\n📊 Current PayMongo Settings:');
    console.log('- Enabled:', settings.paymentGateways.paymongo.enabled);
    console.log('- Mode:', settings.paymentGateways.paymongo.mode);
    console.log('- GCash Enabled:', settings.paymentGateways.paymongo.gcashEnabled);
    console.log('- PayMaya Enabled:', settings.paymentGateways.paymongo.paymayaEnabled);

    console.log('\n🎉 PayMongo is now ready for testing!');
    console.log('💡 You can now see PayMongo options in the Self Checkout payment selector.');

  } catch (error) {
    console.error('❌ Error enabling PayMongo:', error);
  } finally {
    // Close database connection
    await mongoose.connection.close();
    console.log('🔌 Database connection closed');
    process.exit(0);
  }
}

// Run the script
enablePayMongo();