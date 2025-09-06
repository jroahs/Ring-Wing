/**
 * Connection Stability Testing Utility
 * 
 * This utility helps test and monitor MongoDB connection stability
 * over extended periods to identify connection issues.
 */

const mongoose = require('mongoose');
const { logger } = require('../config/logger');

class ConnectionStabilityTester {
  constructor() {
    this.testResults = [];
    this.isRunning = false;
    this.testInterval = null;
    this.startTime = null;
    this.stats = {
      totalTests: 0,
      successfulTests: 0,
      failedTests: 0,
      averageResponseTime: 0,
      maxResponseTime: 0,
      minResponseTime: Infinity,
      consecutiveFailures: 0,
      maxConsecutiveFailures: 0
    };
  }

  /**
   * Start continuous connection stability testing
   * @param {number} intervalMs Test interval in milliseconds (default: 30 seconds)
   * @param {number} durationMs Total test duration in milliseconds (default: 1 hour)
   */
  startTesting(intervalMs = 30000, durationMs = 3600000) {
    if (this.isRunning) {
      logger.warn('Connection stability test is already running');
      return;
    }

    this.isRunning = true;
    this.startTime = new Date();
    this.testResults = [];
    this.resetStats();

    logger.info(`Starting connection stability test for ${durationMs / 1000}s with ${intervalMs / 1000}s intervals`);

    this.testInterval = setInterval(async () => {
      await this.performTest();
    }, intervalMs);

    // Stop testing after specified duration
    setTimeout(() => {
      this.stopTesting();
    }, durationMs);

    // Perform initial test
    this.performTest();
  }

  /**
   * Stop the stability testing
   */
  stopTesting() {
    if (!this.isRunning) {
      return;
    }

    this.isRunning = false;
    
    if (this.testInterval) {
      clearInterval(this.testInterval);
      this.testInterval = null;
    }

    const duration = new Date() - this.startTime;
    logger.info(`Connection stability test completed after ${duration / 1000}s`);
    this.logFinalResults();
  }

  /**
   * Perform a single connection test
   */
  async performTest() {
    const testStart = new Date();
    const testResult = {
      timestamp: testStart,
      success: false,
      responseTime: 0,
      error: null,
      connectionState: mongoose.connection.readyState
    };

    try {
      // Test connection state
      if (mongoose.connection.readyState !== 1) {
        throw new Error(`Connection not ready (state: ${mongoose.connection.readyState})`);
      }

      // Perform multiple operations to thoroughly test connection
      const operationStart = Date.now();
      
      await Promise.all([
        // Basic ping
        mongoose.connection.db.admin().ping(),
        
        // List collections (lightweight operation)
        mongoose.connection.db.admin().listCollections({}, { nameOnly: true }).toArray(),
        
        // Server status (more comprehensive)
        mongoose.connection.db.admin().serverStatus()
      ]);

      testResult.responseTime = Date.now() - operationStart;
      testResult.success = true;
      
      this.stats.consecutiveFailures = 0;
      
    } catch (error) {
      testResult.error = error.message;
      testResult.responseTime = Date.now() - Date.now();
      
      this.stats.consecutiveFailures++;
      this.stats.maxConsecutiveFailures = Math.max(
        this.stats.maxConsecutiveFailures, 
        this.stats.consecutiveFailures
      );
      
      logger.warn(`Connection test failed: ${error.message}`);
    }

    // Update statistics
    this.updateStats(testResult);
    this.testResults.push(testResult);

    // Log periodic results
    if (this.stats.totalTests % 10 === 0) {
      this.logProgressReport();
    }

    return testResult;
  }

  /**
   * Update test statistics
   */
  updateStats(testResult) {
    this.stats.totalTests++;
    
    if (testResult.success) {
      this.stats.successfulTests++;
      
      // Update response time stats
      this.stats.maxResponseTime = Math.max(this.stats.maxResponseTime, testResult.responseTime);
      this.stats.minResponseTime = Math.min(this.stats.minResponseTime, testResult.responseTime);
      
      // Calculate average response time
      const totalResponseTime = this.testResults
        .filter(r => r.success)
        .reduce((sum, r) => sum + r.responseTime, 0) + testResult.responseTime;
      this.stats.averageResponseTime = totalResponseTime / this.stats.successfulTests;
      
    } else {
      this.stats.failedTests++;
    }
  }

  /**
   * Reset statistics
   */
  resetStats() {
    this.stats = {
      totalTests: 0,
      successfulTests: 0,
      failedTests: 0,
      averageResponseTime: 0,
      maxResponseTime: 0,
      minResponseTime: Infinity,
      consecutiveFailures: 0,
      maxConsecutiveFailures: 0
    };
  }

  /**
   * Log progress report
   */
  logProgressReport() {
    const successRate = (this.stats.successfulTests / this.stats.totalTests * 100).toFixed(2);
    const avgTime = this.stats.averageResponseTime.toFixed(2);
    
    logger.info(`Connection stability - Tests: ${this.stats.totalTests}, Success: ${successRate}%, Avg: ${avgTime}ms, Max consecutive failures: ${this.stats.maxConsecutiveFailures}`);
  }

  /**
   * Log final test results
   */
  logFinalResults() {
    const successRate = (this.stats.successfulTests / this.stats.totalTests * 100).toFixed(2);
    const duration = (new Date() - this.startTime) / 1000;
    
    logger.info('=== CONNECTION STABILITY TEST RESULTS ===');
    logger.info(`Test Duration: ${duration}s`);
    logger.info(`Total Tests: ${this.stats.totalTests}`);
    logger.info(`Successful Tests: ${this.stats.successfulTests} (${successRate}%)`);
    logger.info(`Failed Tests: ${this.stats.failedTests}`);
    logger.info(`Average Response Time: ${this.stats.averageResponseTime.toFixed(2)}ms`);
    logger.info(`Min Response Time: ${this.stats.minResponseTime === Infinity ? 'N/A' : this.stats.minResponseTime + 'ms'}`);
    logger.info(`Max Response Time: ${this.stats.maxResponseTime}ms`);
    logger.info(`Max Consecutive Failures: ${this.stats.maxConsecutiveFailures}`);
    
    // Identify problem periods
    const failedTests = this.testResults.filter(r => !r.success);
    if (failedTests.length > 0) {
      logger.warn('Failed test timestamps:');
      failedTests.forEach(test => {
        logger.warn(`  ${test.timestamp.toISOString()}: ${test.error}`);
      });
    }
  }

  /**
   * Get current test statistics
   */
  getStats() {
    return { ...this.stats };
  }

  /**
   * Get test results
   */
  getResults() {
    return [...this.testResults];
  }
}

// Create singleton instance
const stabilityTester = new ConnectionStabilityTester();

module.exports = {
  ConnectionStabilityTester,
  stabilityTester,
  
  // Convenience functions
  startStabilityTest: (intervalMs, durationMs) => stabilityTester.startTesting(intervalMs, durationMs),
  stopStabilityTest: () => stabilityTester.stopTesting(),
  getStabilityStats: () => stabilityTester.getStats(),
  getStabilityResults: () => stabilityTester.getResults()
};
