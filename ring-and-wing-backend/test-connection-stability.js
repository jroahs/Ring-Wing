/**
 * Database Connection Stability Test
 * Tests the enhanced connection configuration for 15+ minute stability
 */

const mongoose = require('mongoose');
require('dotenv').config();

const testConnectionStability = async () => {
  console.log('🧪 Testing Enhanced Database Connection Stability...');
  console.log('===============================================');
  console.log('📋 Test Duration: 15 minutes');
  console.log('📋 Test Frequency: Every 30 seconds');
  console.log('📋 Expected Result: No disconnections\n');

  // Enhanced connection options (same as in production)
  const mongooseOptions = {
    maxPoolSize: 50,
    minPoolSize: 10,
    
    // CRITICAL: Settings to prevent 10-minute disconnections
    socketTimeoutMS: 0, // Disable socket timeout
    maxIdleTimeMS: 1800000, // 30 minutes
    connectTimeoutMS: 30000,
    serverSelectionTimeoutMS: 15000,
    heartbeatFrequencyMS: 10000,
    
    // Enhanced keepalive settings
    keepAlive: true,
    keepAliveInitialDelay: 300000, // 5 minutes
    
    // Retry settings
    retryWrites: true,
    retryReads: true,
    family: 4,
    
    // Buffer settings
    bufferMaxEntries: 0,
    bufferCommands: false
  };

  try {
    console.log('🔌 Connecting to database with enhanced options...');
    await mongoose.connect(process.env.MONGO_URI, mongooseOptions);
    console.log('✅ Initial connection successful\n');

    // Test variables
    let testMinute = 0;
    let consecutiveSuccesses = 0;
    let totalTests = 0;
    let failures = [];
    const startTime = Date.now();

    // Connection event listeners
    mongoose.connection.on('disconnected', () => {
      console.log('⚠️  CONNECTION LOST! This should not happen...');
    });

    mongoose.connection.on('reconnected', () => {
      console.log('🔄 Connection restored');
    });

    // Test function
    const performTest = async () => {
      totalTests++;
      const testStart = Date.now();
      
      try {
        // Check connection state
        const state = mongoose.connection.readyState;
        if (state !== 1) {
          throw new Error(`Connection state is ${state} (should be 1)`);
        }

        // Perform ping test
        await mongoose.connection.db.admin().ping();
        const pingTime = Date.now() - testStart;
        
        consecutiveSuccesses++;
        
        console.log(`✅ Test ${totalTests}: Connected (${pingTime}ms ping) - ${consecutiveSuccesses} consecutive successes`);
        
        // Log milestone every 5 minutes
        if (totalTests % 10 === 0) {
          const elapsed = Math.round((Date.now() - startTime) / 60000);
          console.log(`\n📊 ${elapsed}-minute milestone: ${consecutiveSuccesses}/${totalTests} successful tests\n`);
        }

      } catch (error) {
        consecutiveSuccesses = 0;
        failures.push({
          test: totalTests,
          time: new Date().toISOString(),
          error: error.message
        });
        
        console.error(`❌ Test ${totalTests} FAILED: ${error.message}`);
        
        // This is critical - we shouldn't have any failures with the enhanced config
        console.error('🚨 CRITICAL: Connection failure detected with enhanced configuration!');
      }
    };

    // Initial test
    await performTest();

    // Run test every 30 seconds for 15 minutes
    const testInterval = setInterval(async () => {
      await performTest();
      
      // Check if 15 minutes have passed
      const elapsed = (Date.now() - startTime) / 60000;
      if (elapsed >= 15) {
        clearInterval(testInterval);
        
        // Final results
        console.log('\n📊 FINAL TEST RESULTS');
        console.log('====================');
        console.log(`⏱️  Test Duration: ${Math.round(elapsed)} minutes`);
        console.log(`📈 Total Tests: ${totalTests}`);
        console.log(`✅ Successes: ${totalTests - failures.length}`);
        console.log(`❌ Failures: ${failures.length}`);
        console.log(`📊 Success Rate: ${Math.round(((totalTests - failures.length) / totalTests) * 100)}%`);
        
        if (failures.length === 0) {
          console.log('\n🎉 SUCCESS! Enhanced configuration prevents 10-minute disconnections!');
          console.log('✅ No connection issues detected during 15-minute test');
        } else {
          console.log('\n⚠️  ISSUES DETECTED:');
          failures.forEach(failure => {
            console.log(`  - Test ${failure.test} (${failure.time}): ${failure.error}`);
          });
        }
        
        // Log connection details
        console.log('\n📋 Connection Configuration Used:');
        console.log(`  - maxIdleTimeMS: ${mongooseOptions.maxIdleTimeMS / 60000} minutes`);
        console.log(`  - socketTimeoutMS: ${mongooseOptions.socketTimeoutMS || 'disabled'}`);
        console.log(`  - heartbeatFrequencyMS: ${mongooseOptions.heartbeatFrequencyMS / 1000} seconds`);
        console.log(`  - keepAlive: ${mongooseOptions.keepAlive}`);
        console.log(`  - keepAliveInitialDelay: ${mongooseOptions.keepAliveInitialDelay / 60000} minutes`);
        
        await mongoose.connection.close();
        console.log('\n✅ Test completed. Connection closed gracefully.');
        process.exit(failures.length === 0 ? 0 : 1);
      }
    }, 30000); // Test every 30 seconds

  } catch (error) {
    console.error('💥 Test initialization failed:', error.message);
    process.exit(1);
  }
};

// Handle process termination
process.on('SIGINT', async () => {
  console.log('\n⏹️  Test interrupted by user');
  if (mongoose.connection.readyState === 1) {
    await mongoose.connection.close();
    console.log('✅ Connection closed gracefully');
  }
  process.exit(0);
});

// Start the test
testConnectionStability();
