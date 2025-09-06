/**
 * Extended Connection Stability Test
 * 
 * This script runs for an extended period to identify connection issues
 * that may occur during idle periods or under specific conditions.
 */

require('dotenv').config();
const mongoose = require('mongoose');
const { logger } = require('./config/logger');
const { stabilityTester } = require('./utils/connectionStabilityTest');

// Enhanced connection options for stability testing
const stabilityOptions = {
  maxPoolSize: 20,
  minPoolSize: 2,
  socketTimeoutMS: 0,
  maxIdleTimeMS: 300000, // 5 minutes - shorter than before
  connectTimeoutMS: 60000,
  serverSelectionTimeoutMS: 30000,
  heartbeatFrequencyMS: 5000, // More frequent heartbeat
  bufferMaxEntries: 0,
  bufferCommands: false,
  retryWrites: true,
  retryReads: true,
  authSource: 'admin',
  compressors: ['zlib'],
  zlibCompressionLevel: 6,
  keepAlive: true,
  keepAliveInitialDelay: 30000,
};

class ExtendedStabilityTest {
  constructor() {
    this.isRunning = false;
    this.startTime = null;
    this.endTime = null;
    this.testResults = [];
    this.connectionEvents = [];
    this.intervals = [];
  }

  /**
   * Start extended stability testing
   */
  async startTest(durationHours = 2) {
    if (this.isRunning) {
      console.log('Test is already running');
      return;
    }

    this.isRunning = true;
    this.startTime = new Date();
    
    console.log(`\n🚀 Starting Extended Connection Stability Test`);
    console.log(`Duration: ${durationHours} hours`);
    console.log(`Start time: ${this.startTime.toISOString()}`);
    console.log('=' .repeat(60));

    try {
      // Set up connection event monitoring
      this.setupEventMonitoring();
      
      // Connect to database
      await this.connectWithMonitoring();
      
      // Start various test scenarios
      await this.runTestScenarios(durationHours);
      
    } catch (error) {
      console.error('❌ Test failed to start:', error.message);
      this.stopTest();
    }
  }

  /**
   * Set up connection event monitoring
   */
  setupEventMonitoring() {
    console.log('📡 Setting up connection event monitoring...');
    
    const events = ['connected', 'disconnected', 'reconnected', 'error', 'timeout', 'close'];
    
    events.forEach(event => {
      mongoose.connection.on(event, (data) => {
        const eventInfo = {
          timestamp: new Date(),
          event: event,
          data: data && data.message ? data.message : data
        };
        
        this.connectionEvents.push(eventInfo);
        console.log(`🔔 Event: ${event} at ${eventInfo.timestamp.toISOString()}`);
        
        if (data && data.message) {
          console.log(`   Details: ${data.message}`);
        }
      });
    });
  }

  /**
   * Connect with enhanced monitoring
   */
  async connectWithMonitoring() {
    console.log('🔌 Connecting to MongoDB with stability options...');
    
    try {
      await mongoose.connect(process.env.MONGO_URI, stabilityOptions);
      console.log('✅ Connected successfully');
      
      // Log connection details
      console.log(`   Database: ${mongoose.connection.db.databaseName}`);
      console.log(`   Host: ${mongoose.connection.host}:${mongoose.connection.port}`);
      
    } catch (error) {
      console.error('❌ Connection failed:', error.message);
      throw error;
    }
  }

  /**
   * Run various test scenarios
   */
  async runTestScenarios(durationHours) {
    const durationMs = durationHours * 60 * 60 * 1000;
    const endTime = new Date(Date.now() + durationMs);
    
    console.log(`\n📊 Starting test scenarios until ${endTime.toISOString()}`);
    
    // Scenario 1: Continuous ping monitoring (every 30 seconds)
    this.intervals.push(setInterval(async () => {
      await this.performPingTest();
    }, 30000));
    
    // Scenario 2: Periodic heavy operations (every 5 minutes)
    this.intervals.push(setInterval(async () => {
      await this.performHeavyOperations();
    }, 300000));
    
    // Scenario 3: Idle simulation (every 10 minutes, simulate 2 minutes of no activity)
    this.intervals.push(setInterval(async () => {
      await this.simulateIdlePeriod();
    }, 600000));
    
    // Scenario 4: Connection stress test (every 15 minutes)
    this.intervals.push(setInterval(async () => {
      await this.performStressTest();
    }, 900000));
    
    // Progress reporting (every minute)
    this.intervals.push(setInterval(() => {
      this.reportProgress(endTime);
    }, 60000));
    
    // Initial tests
    await this.performPingTest();
    await this.performHeavyOperations();
    
    // Wait for the test duration
    await new Promise(resolve => setTimeout(resolve, durationMs));
    
    this.stopTest();
  }

  /**
   * Perform basic ping test
   */
  async performPingTest() {
    const testResult = {
      timestamp: new Date(),
      type: 'ping',
      success: false,
      duration: 0,
      error: null
    };

    try {
      if (mongoose.connection.readyState !== 1) {
        throw new Error(`Connection not ready (state: ${mongoose.connection.readyState})`);
      }

      const startTime = Date.now();
      await mongoose.connection.db.admin().ping();
      testResult.duration = Date.now() - startTime;
      testResult.success = true;
      
      if (testResult.duration > 1000) {
        console.log(`⚠️ Slow ping detected: ${testResult.duration}ms`);
      }
      
    } catch (error) {
      testResult.error = error.message;
      console.log(`❌ Ping failed: ${error.message}`);
    }

    this.testResults.push(testResult);
  }

  /**
   * Perform heavy database operations
   */
  async performHeavyOperations() {
    const testResult = {
      timestamp: new Date(),
      type: 'heavy_operations',
      success: false,
      duration: 0,
      error: null
    };

    try {
      if (mongoose.connection.readyState !== 1) {
        throw new Error(`Connection not ready (state: ${mongoose.connection.readyState})`);
      }

      const startTime = Date.now();
      
      // Perform multiple operations simultaneously
      await Promise.all([
        mongoose.connection.db.admin().ping(),
        mongoose.connection.db.admin().listCollections().toArray(),
        mongoose.connection.db.admin().serverStatus(),
        mongoose.connection.db.stats()
      ]);
      
      testResult.duration = Date.now() - startTime;
      testResult.success = true;
      
      console.log(`🔧 Heavy operations completed in ${testResult.duration}ms`);
      
    } catch (error) {
      testResult.error = error.message;
      console.log(`❌ Heavy operations failed: ${error.message}`);
    }

    this.testResults.push(testResult);
  }

  /**
   * Simulate idle period
   */
  async simulateIdlePeriod() {
    console.log('😴 Simulating 2-minute idle period...');
    
    const startTime = new Date();
    
    // No database operations for 2 minutes
    await new Promise(resolve => setTimeout(resolve, 120000));
    
    // Test connection after idle period
    await this.performPingTest();
    
    console.log(`🏃 Resumed after idle period of 2 minutes`);
  }

  /**
   * Perform connection stress test
   */
  async performStressTest() {
    console.log('💪 Performing connection stress test...');
    
    const stressResult = {
      timestamp: new Date(),
      type: 'stress_test',
      success: false,
      operationsCompleted: 0,
      totalOperations: 20,
      duration: 0,
      error: null
    };

    try {
      const startTime = Date.now();
      
      // Perform 20 rapid operations
      for (let i = 0; i < 20; i++) {
        if (mongoose.connection.readyState === 1) {
          await mongoose.connection.db.admin().ping();
          stressResult.operationsCompleted++;
        } else {
          throw new Error(`Connection lost during stress test (operation ${i + 1})`);
        }
        
        // Small delay between operations
        await new Promise(resolve => setTimeout(resolve, 100));
      }
      
      stressResult.duration = Date.now() - startTime;
      stressResult.success = true;
      
      console.log(`✅ Stress test completed: ${stressResult.operationsCompleted}/${stressResult.totalOperations} operations in ${stressResult.duration}ms`);
      
    } catch (error) {
      stressResult.error = error.message;
      console.log(`❌ Stress test failed: ${error.message} (completed ${stressResult.operationsCompleted}/${stressResult.totalOperations})`);
    }

    this.testResults.push(stressResult);
  }

  /**
   * Report progress
   */
  reportProgress(endTime) {
    const now = new Date();
    const elapsed = now - this.startTime;
    const remaining = endTime - now;
    
    const elapsedMinutes = Math.floor(elapsed / 60000);
    const remainingMinutes = Math.floor(remaining / 60000);
    
    // Calculate success rates
    const pingTests = this.testResults.filter(r => r.type === 'ping');
    const successfulPings = pingTests.filter(r => r.success).length;
    const pingSuccessRate = pingTests.length > 0 ? (successfulPings / pingTests.length * 100).toFixed(1) : 0;
    
    console.log(`\n📈 Progress Report (${elapsedMinutes}m elapsed, ${remainingMinutes}m remaining)`);
    console.log(`   Connection state: ${this.getConnectionState()}`);
    console.log(`   Total tests: ${this.testResults.length}`);
    console.log(`   Ping success rate: ${pingSuccessRate}%`);
    console.log(`   Connection events: ${this.connectionEvents.length}`);
    
    // Log recent events
    const recentEvents = this.connectionEvents.filter(e => now - e.timestamp < 300000); // Last 5 minutes
    if (recentEvents.length > 0) {
      console.log(`   Recent events (5m): ${recentEvents.map(e => e.event).join(', ')}`);
    }
  }

  /**
   * Get current connection state
   */
  getConnectionState() {
    const states = {
      0: 'disconnected',
      1: 'connected', 
      2: 'connecting',
      3: 'disconnecting'
    };
    return states[mongoose.connection.readyState] || 'unknown';
  }

  /**
   * Stop the test and generate report
   */
  stopTest() {
    if (!this.isRunning) {
      return;
    }

    this.isRunning = false;
    this.endTime = new Date();
    
    // Clear all intervals
    this.intervals.forEach(interval => clearInterval(interval));
    this.intervals = [];
    
    console.log('\n🏁 Test completed');
    this.generateReport();
    
    // Close database connection
    mongoose.connection.close().catch(err => {
      console.error('Error closing connection:', err.message);
    });
  }

  /**
   * Generate comprehensive test report
   */
  generateReport() {
    const duration = this.endTime - this.startTime;
    const durationMinutes = Math.floor(duration / 60000);
    
    console.log('\n📊 EXTENDED STABILITY TEST REPORT');
    console.log('=' .repeat(60));
    console.log(`Test Duration: ${durationMinutes} minutes`);
    console.log(`Start: ${this.startTime.toISOString()}`);
    console.log(`End: ${this.endTime.toISOString()}`);
    
    // Test results summary
    const totalTests = this.testResults.length;
    const successfulTests = this.testResults.filter(r => r.success).length;
    const successRate = totalTests > 0 ? (successfulTests / totalTests * 100).toFixed(2) : 0;
    
    console.log(`\nTest Results:`);
    console.log(`  Total tests: ${totalTests}`);
    console.log(`  Successful: ${successfulTests} (${successRate}%)`);
    console.log(`  Failed: ${totalTests - successfulTests}`);
    
    // Break down by test type
    const testTypes = ['ping', 'heavy_operations', 'stress_test'];
    testTypes.forEach(type => {
      const typeTests = this.testResults.filter(r => r.type === type);
      const typeSuccessful = typeTests.filter(r => r.success).length;
      const typeRate = typeTests.length > 0 ? (typeSuccessful / typeTests.length * 100).toFixed(1) : 0;
      
      if (typeTests.length > 0) {
        console.log(`  ${type}: ${typeSuccessful}/${typeTests.length} (${typeRate}%)`);
      }
    });
    
    // Connection events
    console.log(`\nConnection Events: ${this.connectionEvents.length}`);
    const eventCounts = {};
    this.connectionEvents.forEach(event => {
      eventCounts[event.event] = (eventCounts[event.event] || 0) + 1;
    });
    
    Object.entries(eventCounts).forEach(([event, count]) => {
      console.log(`  ${event}: ${count}`);
    });
    
    // Performance statistics
    const pingTests = this.testResults.filter(r => r.type === 'ping' && r.success);
    if (pingTests.length > 0) {
      const pingTimes = pingTests.map(r => r.duration);
      const avgPing = pingTimes.reduce((a, b) => a + b, 0) / pingTimes.length;
      const maxPing = Math.max(...pingTimes);
      const minPing = Math.min(...pingTimes);
      
      console.log(`\nPing Performance:`);
      console.log(`  Average: ${avgPing.toFixed(2)}ms`);
      console.log(`  Min: ${minPing}ms`);
      console.log(`  Max: ${maxPing}ms`);
    }
    
    // Identify problem periods
    const failedTests = this.testResults.filter(r => !r.success);
    if (failedTests.length > 0) {
      console.log(`\nProblem Periods:`);
      failedTests.forEach(test => {
        console.log(`  ${test.timestamp.toISOString()}: ${test.type} - ${test.error}`);
      });
    }
    
    // Final assessment
    console.log(`\n🎯 Assessment:`);
    if (successRate >= 95) {
      console.log('✅ Excellent connection stability');
    } else if (successRate >= 90) {
      console.log('🟡 Good connection stability with minor issues');
    } else if (successRate >= 80) {
      console.log('🟠 Moderate connection issues detected');
    } else {
      console.log('🔴 Significant connection problems - immediate attention required');
    }
    
    // Recommendations
    console.log(`\n💡 Recommendations:`);
    if (successRate < 95) {
      console.log('  - Review MongoDB server logs');
      console.log('  - Check network stability');
      console.log('  - Consider adjusting connection pool settings');
      console.log('  - Monitor server resource usage');
    }
    
    if (this.connectionEvents.some(e => e.event === 'disconnected')) {
      console.log('  - Investigate disconnection causes');
      console.log('  - Consider implementing more aggressive keep-alive');
    }
    
    const slowPings = pingTests.filter(r => r.duration > 1000);
    if (slowPings.length > 0) {
      console.log('  - Database response times are occasionally slow');
      console.log('  - Monitor database server performance');
    }
  }
}

// Run test if this script is executed directly
if (require.main === module) {
  const test = new ExtendedStabilityTest();
  
  // Parse command line arguments
  const args = process.argv.slice(2);
  const durationHours = args.length > 0 ? parseFloat(args[0]) : 1; // Default 1 hour
  
  console.log(`Starting ${durationHours} hour connection stability test...`);
  
  test.startTest(durationHours)
    .catch(error => {
      console.error('Test failed:', error);
      process.exit(1);
    });
  
  // Handle graceful shutdown
  process.on('SIGINT', () => {
    console.log('\n⏹️ Received shutdown signal, stopping test...');
    test.stopTest();
    process.exit(0);
  });
}

module.exports = ExtendedStabilityTest;
