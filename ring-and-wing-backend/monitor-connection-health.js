/**
 * Real-time Connection Health Monitor
 * Monitor database connection health while server is running
 */

const mongoose = require('mongoose');
require('dotenv').config();

class ConnectionHealthMonitor {
  constructor() {
    this.testCount = 0;
    this.successCount = 0;
    this.failureCount = 0;
    this.consecutiveFailures = 0;
    this.maxConsecutiveFailures = 0;
    this.responseTimes = [];
    this.startTime = new Date();
    this.isRunning = false;
  }

  async start(durationMinutes = 30) {
    console.log('🔍 Starting Real-time Database Connection Monitor');
    console.log('================================================');
    console.log(`📊 Monitoring for ${durationMinutes} minutes`);
    console.log(`⏱️  Test frequency: Every 30 seconds`);
    console.log(`🎯 Goal: Zero disconnections\n`);

    this.isRunning = true;

    // Connect to MongoDB using the same configuration as your server
    try {
      await this.connectToDatabase();
      console.log('✅ Monitor connected to database\n');
    } catch (error) {
      console.log('❌ Failed to connect to database:', error.message);
      return;
    }

    // Start monitoring
    const monitorInterval = setInterval(async () => {
      await this.performHealthCheck();
      
      // Stop after specified duration
      if ((new Date() - this.startTime) / 1000 / 60 >= durationMinutes) {
        clearInterval(monitorInterval);
        this.stop();
      }
    }, 30000); // Every 30 seconds

    // Initial check
    await this.performHealthCheck();

    // Setup graceful shutdown
    process.on('SIGINT', () => {
      console.log('\n⏹️  Monitoring stopped by user');
      clearInterval(monitorInterval);
      this.stop();
    });
  }

  async connectToDatabase() {
    const options = {
      maxPoolSize: 5, // Small pool for monitoring
      minPoolSize: 1,
      socketTimeoutMS: 0,
      maxIdleTimeMS: 300000,
      connectTimeoutMS: 30000,
      serverSelectionTimeoutMS: 15000,
      heartbeatFrequencyMS: 5000,
      retryWrites: true,
      retryReads: true,
      authSource: 'admin'
    };

    await mongoose.connect(process.env.MONGO_URI, options);
  }

  async performHealthCheck() {
    this.testCount++;
    const testStartTime = Date.now();
    
    try {
      // Test multiple operations (simplified for compatibility)
      await Promise.all([
        mongoose.connection.db.admin().ping(),
        mongoose.connection.db.admin().serverStatus()
      ]);

      const responseTime = Date.now() - testStartTime;
      this.responseTimes.push(responseTime);
      this.successCount++;
      this.consecutiveFailures = 0;

      // Log result
      const elapsed = ((new Date() - this.startTime) / 1000 / 60).toFixed(1);
      const successRate = ((this.successCount / this.testCount) * 100).toFixed(1);
      
      if (responseTime > 1000) {
        console.log(`⚠️  Test ${this.testCount}: SLOW response (${responseTime}ms) - ${elapsed}min elapsed - ${successRate}% success`);
      } else {
        console.log(`✅ Test ${this.testCount}: OK (${responseTime}ms) - ${elapsed}min elapsed - ${successRate}% success`);
      }

      // Log statistics every 10 tests
      if (this.testCount % 10 === 0) {
        this.logStatistics();
      }

    } catch (error) {
      this.failureCount++;
      this.consecutiveFailures++;
      this.maxConsecutiveFailures = Math.max(this.maxConsecutiveFailures, this.consecutiveFailures);

      const elapsed = ((new Date() - this.startTime) / 1000 / 60).toFixed(1);
      console.log(`❌ Test ${this.testCount}: FAILED (${error.message}) - ${elapsed}min elapsed`);
      
      if (this.consecutiveFailures >= 3) {
        console.log(`🚨 ALERT: ${this.consecutiveFailures} consecutive failures detected!`);
      }
    }
  }

  logStatistics() {
    const avgResponseTime = this.responseTimes.length > 0 
      ? (this.responseTimes.reduce((a, b) => a + b, 0) / this.responseTimes.length).toFixed(2)
      : 0;
    
    const maxResponseTime = this.responseTimes.length > 0 
      ? Math.max(...this.responseTimes)
      : 0;

    const elapsed = ((new Date() - this.startTime) / 1000 / 60).toFixed(1);
    const successRate = ((this.successCount / this.testCount) * 100).toFixed(1);

    console.log('\n📊 Statistics:');
    console.log(`   ⏱️  Elapsed: ${elapsed} minutes`);
    console.log(`   📈 Success Rate: ${successRate}% (${this.successCount}/${this.testCount})`);
    console.log(`   ⚡ Avg Response: ${avgResponseTime}ms`);
    console.log(`   🐌 Max Response: ${maxResponseTime}ms`);
    console.log(`   ❌ Max Consecutive Failures: ${this.maxConsecutiveFailures}`);
    console.log('');
  }

  async stop() {
    this.isRunning = false;
    const finalElapsed = ((new Date() - this.startTime) / 1000 / 60).toFixed(1);
    
    console.log('\n🏁 Final Report:');
    console.log('================');
    console.log(`⏱️  Total Duration: ${finalElapsed} minutes`);
    console.log(`📊 Total Tests: ${this.testCount}`);
    console.log(`✅ Successful: ${this.successCount}`);
    console.log(`❌ Failed: ${this.failureCount}`);
    console.log(`📈 Success Rate: ${((this.successCount / this.testCount) * 100).toFixed(1)}%`);
    
    if (this.responseTimes.length > 0) {
      const avgResponseTime = (this.responseTimes.reduce((a, b) => a + b, 0) / this.responseTimes.length).toFixed(2);
      const maxResponseTime = Math.max(...this.responseTimes);
      const minResponseTime = Math.min(...this.responseTimes);
      
      console.log(`⚡ Response Times:`);
      console.log(`   Average: ${avgResponseTime}ms`);
      console.log(`   Min: ${minResponseTime}ms`);
      console.log(`   Max: ${maxResponseTime}ms`);
    }
    
    console.log(`🔥 Max Consecutive Failures: ${this.maxConsecutiveFailures}`);
    
    if (this.failureCount === 0) {
      console.log('\n🎉 EXCELLENT! Zero connection failures detected!');
      console.log('   Your connection stability improvements are working!');
    } else if (this.maxConsecutiveFailures <= 2) {
      console.log('\n👍 GOOD! Minor issues detected but generally stable.');
    } else {
      console.log('\n⚠️  WARNING! Connection instability detected.');
      console.log('   Consider further optimizations.');
    }

    if (mongoose.connection.readyState === 1) {
      await mongoose.connection.close();
      console.log('\n🔌 Monitor disconnected from database');
    }
    
    process.exit(0);
  }
}

// Start monitoring
const monitor = new ConnectionHealthMonitor();
const durationMinutes = process.argv[2] ? parseInt(process.argv[2]) : 30;
monitor.start(durationMinutes);
