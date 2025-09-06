/**
 * Database Connection Diagnostic Tool
 * 
 * This script helps diagnose and test database connection issues.
 * Run this to test various connection scenarios and identify problems.
 */

require('dotenv').config();
const mongoose = require('mongoose');
const { logger } = require('./config/logger');

// Test different connection configurations
const testConfigurations = [
  {
    name: 'Production Configuration (Enhanced)',
    options: {
      maxPoolSize: 20,
      minPoolSize: 2,
      socketTimeoutMS: 0,
      maxIdleTimeMS: 300000, // 5 minutes
      connectTimeoutMS: 60000,
      serverSelectionTimeoutMS: 30000,
      heartbeatFrequencyMS: 5000,
      bufferMaxEntries: 0,
      bufferCommands: false,
      retryWrites: true,
      retryReads: true,
      authSource: 'admin',
      compressors: ['zlib'],
      zlibCompressionLevel: 6,
      keepAlive: true,
      keepAliveInitialDelay: 30000,
    }
  },
  {
    name: 'Conservative Configuration',
    options: {
      maxPoolSize: 10,
      minPoolSize: 1,
      socketTimeoutMS: 0,
      maxIdleTimeMS: 600000, // 10 minutes
      connectTimeoutMS: 30000,
      serverSelectionTimeoutMS: 15000,
      heartbeatFrequencyMS: 10000,
      retryWrites: true,
      authSource: 'admin'
    }
  },
  {
    name: 'Minimal Configuration',
    options: {
      serverSelectionTimeoutMS: 10000,
      connectTimeoutMS: 20000,
      socketTimeoutMS: 0,
      authSource: 'admin'
    }
  }
];

class ConnectionDiagnostics {
  constructor() {
    this.results = [];
  }

  /**
   * Run comprehensive connection diagnostics
   */
  async runDiagnostics() {
    console.log('\n🔍 Starting MongoDB Connection Diagnostics...\n');
    
    // Test 1: Environment check
    await this.testEnvironment();
    
    // Test 2: Basic connectivity
    await this.testBasicConnectivity();
    
    // Test 3: Test different configurations
    for (const config of testConfigurations) {
      await this.testConfiguration(config);
    }
    
    // Test 4: Connection stability under load
    await this.testConnectionStability();
    
    // Test 5: Connection recovery
    await this.testConnectionRecovery();
    
    this.printSummary();
  }

  /**
   * Test environment setup
   */
  async testEnvironment() {
    console.log('📋 Testing Environment Setup...');
    
    const envTest = {
      test: 'Environment',
      success: true,
      issues: []
    };

    // Check required environment variables
    if (!process.env.MONGO_URI) {
      envTest.success = false;
      envTest.issues.push('MONGO_URI not set');
    } else {
      console.log(`✅ MONGO_URI configured: ${process.env.MONGO_URI.replace(/\/\/.*:.*@/, '//***:***@')}`);
    }

    // Check Node.js version
    const nodeVersion = process.version;
    console.log(`📋 Node.js version: ${nodeVersion}`);
    
    // Check Mongoose version
    console.log(`📋 Mongoose version: ${mongoose.version}`);
    
    this.results.push(envTest);
    console.log();
  }

  /**
   * Test basic connectivity
   */
  async testBasicConnectivity() {
    console.log('🔌 Testing Basic Connectivity...');
    
    const connectTest = {
      test: 'Basic Connectivity',
      success: false,
      duration: 0,
      error: null
    };

    try {
      const startTime = Date.now();
      
      // Try minimal connection
      await mongoose.connect(process.env.MONGO_URI, {
        serverSelectionTimeoutMS: 10000,
        connectTimeoutMS: 10000
      });
      
      connectTest.duration = Date.now() - startTime;
      connectTest.success = true;
      
      console.log(`✅ Basic connection successful in ${connectTest.duration}ms`);
      
      // Test basic operations
      await mongoose.connection.db.admin().ping();
      console.log('✅ Database ping successful');
      
      await mongoose.connection.close();
      
    } catch (error) {
      connectTest.error = error.message;
      console.log(`❌ Basic connection failed: ${error.message}`);
    }
    
    this.results.push(connectTest);
    console.log();
  }

  /**
   * Test specific configuration
   */
  async testConfiguration(config) {
    console.log(`⚙️ Testing ${config.name}...`);
    
    const configTest = {
      test: config.name,
      success: false,
      duration: 0,
      error: null,
      pingTime: 0
    };

    try {
      const startTime = Date.now();
      
      await mongoose.connect(process.env.MONGO_URI, config.options);
      
      configTest.duration = Date.now() - startTime;
      
      // Test ping
      const pingStart = Date.now();
      await mongoose.connection.db.admin().ping();
      configTest.pingTime = Date.now() - pingStart;
      
      configTest.success = true;
      
      console.log(`✅ ${config.name} successful`);
      console.log(`   Connection time: ${configTest.duration}ms`);
      console.log(`   Ping time: ${configTest.pingTime}ms`);
      
      await mongoose.connection.close();
      
    } catch (error) {
      configTest.error = error.message;
      console.log(`❌ ${config.name} failed: ${error.message}`);
      
      // Try to close connection if it exists
      try {
        if (mongoose.connection.readyState !== 0) {
          await mongoose.connection.close();
        }
      } catch (closeError) {
        // Ignore close errors
      }
    }
    
    this.results.push(configTest);
    console.log();
  }

  /**
   * Test connection stability
   */
  async testConnectionStability() {
    console.log('🏃 Testing Connection Stability...');
    
    const stabilityTest = {
      test: 'Connection Stability',
      success: false,
      totalTests: 0,
      successfulTests: 0,
      averagePing: 0,
      maxPing: 0,
      errors: []
    };

    try {
      // Connect with our production configuration
      await mongoose.connect(process.env.MONGO_URI, testConfigurations[0].options);
      
      console.log('   Running 20 ping tests over 1 minute...');
      
      const pingTimes = [];
      
      for (let i = 0; i < 20; i++) {
        try {
          const pingStart = Date.now();
          await mongoose.connection.db.admin().ping();
          const pingTime = Date.now() - pingStart;
          
          pingTimes.push(pingTime);
          stabilityTest.successfulTests++;
          
          // Wait 3 seconds between tests
          await new Promise(resolve => setTimeout(resolve, 3000));
          
        } catch (error) {
          stabilityTest.errors.push(error.message);
        }
        
        stabilityTest.totalTests++;
        process.stdout.write(`   Progress: ${i + 1}/20\r`);
      }
      
      if (pingTimes.length > 0) {
        stabilityTest.averagePing = pingTimes.reduce((a, b) => a + b, 0) / pingTimes.length;
        stabilityTest.maxPing = Math.max(...pingTimes);
        stabilityTest.success = true;
        
        console.log(`\n✅ Stability test completed`);
        console.log(`   Success rate: ${(stabilityTest.successfulTests / stabilityTest.totalTests * 100).toFixed(2)}%`);
        console.log(`   Average ping: ${stabilityTest.averagePing.toFixed(2)}ms`);
        console.log(`   Max ping: ${stabilityTest.maxPing}ms`);
      } else {
        console.log('\n❌ All stability tests failed');
      }
      
      await mongoose.connection.close();
      
    } catch (error) {
      stabilityTest.errors.push(error.message);
      console.log(`❌ Stability test failed: ${error.message}`);
    }
    
    this.results.push(stabilityTest);
    console.log();
  }

  /**
   * Test connection recovery
   */
  async testConnectionRecovery() {
    console.log('🔄 Testing Connection Recovery...');
    
    const recoveryTest = {
      test: 'Connection Recovery',
      success: false,
      recoveryTime: 0,
      error: null
    };

    try {
      // Connect
      await mongoose.connect(process.env.MONGO_URI, testConfigurations[0].options);
      console.log('   Connected to database');
      
      // Force close connection
      console.log('   Forcing connection close...');
      await mongoose.connection.close(true);
      
      // Wait a moment
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      // Try to reconnect
      console.log('   Attempting reconnection...');
      const recoveryStart = Date.now();
      
      await mongoose.connect(process.env.MONGO_URI, testConfigurations[0].options);
      
      recoveryTest.recoveryTime = Date.now() - recoveryStart;
      recoveryTest.success = true;
      
      console.log(`✅ Recovery successful in ${recoveryTest.recoveryTime}ms`);
      
      await mongoose.connection.close();
      
    } catch (error) {
      recoveryTest.error = error.message;
      console.log(`❌ Recovery test failed: ${error.message}`);
    }
    
    this.results.push(recoveryTest);
    console.log();
  }

  /**
   * Print diagnostic summary
   */
  printSummary() {
    console.log('📊 DIAGNOSTIC SUMMARY');
    console.log('='.repeat(50));
    
    let successfulTests = 0;
    
    this.results.forEach(result => {
      const status = result.success ? '✅' : '❌';
      console.log(`${status} ${result.test}`);
      
      if (result.success) {
        successfulTests++;
        if (result.duration) {
          console.log(`   Duration: ${result.duration}ms`);
        }
        if (result.pingTime) {
          console.log(`   Ping time: ${result.pingTime}ms`);
        }
        if (result.averagePing) {
          console.log(`   Average ping: ${result.averagePing.toFixed(2)}ms`);
        }
      } else {
        if (result.error) {
          console.log(`   Error: ${result.error}`);
        }
        if (result.issues && result.issues.length > 0) {
          result.issues.forEach(issue => {
            console.log(`   Issue: ${issue}`);
          });
        }
      }
      console.log();
    });
    
    console.log(`Overall: ${successfulTests}/${this.results.length} tests passed`);
    
    // Recommendations
    console.log('\n💡 RECOMMENDATIONS');
    console.log('='.repeat(50));
    
    if (successfulTests === this.results.length) {
      console.log('✅ All tests passed! Your connection configuration looks good.');
      console.log('   Consider using the Production Configuration for best stability.');
    } else {
      console.log('⚠️ Some tests failed. Consider the following:');
      console.log('   1. Check your MongoDB server status');
      console.log('   2. Verify network connectivity');
      console.log('   3. Check MongoDB logs for errors');
      console.log('   4. Try the Conservative Configuration if issues persist');
    }
  }
}

// Run diagnostics if this script is executed directly
if (require.main === module) {
  const diagnostics = new ConnectionDiagnostics();
  diagnostics.runDiagnostics()
    .then(() => {
      console.log('\n🏁 Diagnostics completed');
      process.exit(0);
    })
    .catch((error) => {
      console.error('❌ Diagnostics failed:', error);
      process.exit(1);
    });
}

module.exports = ConnectionDiagnostics;
