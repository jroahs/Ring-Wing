/**
 * Database Connection Diagnostic Tool
 * Diagnose and provide solutions for database connection issues
 */

const mongoose = require('mongoose');
require('dotenv').config();

const logger = {
  info: (...args) => console.log(`🔍 [INFO]`, ...args),
  warn: (...args) => console.log(`⚠️  [WARN]`, ...args),
  error: (...args) => console.log(`❌ [ERROR]`, ...args),
  success: (...args) => console.log(`✅ [SUCCESS]`, ...args)
};

class DatabaseDiagnostic {
  constructor() {
    this.results = {};
  }

  async runDiagnostics() {
    console.log('🩺 Database Connection Diagnostic Tool');
    console.log('=====================================\n');

    const tests = [
      { name: 'Environment Variables', test: () => this.checkEnvironment() },
      { name: 'MongoDB Connection', test: () => this.testConnection() },
      { name: 'Connection Stability', test: () => this.testStability() },
      { name: 'Network Latency', test: () => this.testLatency() },
      { name: 'Database Operations', test: () => this.testOperations() },
      { name: 'Connection Pool', test: () => this.testConnectionPool() }
    ];

    for (const { name, test } of tests) {
      console.log(`\n🔄 Running: ${name}...`);
      try {
        const result = await test();
        this.results[name] = { success: true, ...result };
        logger.success(`${name} - PASSED`);
      } catch (error) {
        this.results[name] = { success: false, error: error.message };
        logger.error(`${name} - FAILED: ${error.message}`);
      }
    }

    await this.generateReport();
    await this.cleanup();
  }

  checkEnvironment() {
    const required = ['MONGO_URI', 'JWT_SECRET'];
    const missing = required.filter(env => !process.env[env]);
    
    if (missing.length > 0) {
      throw new Error(`Missing environment variables: ${missing.join(', ')}`);
    }

    const mongoUri = process.env.MONGO_URI;
    const isLocal = mongoUri.includes('localhost') || mongoUri.includes('127.0.0.1');
    const hasAuth = mongoUri.includes('@');
    
    return {
      mongoUri: mongoUri.replace(/\/\/.*@/, '//***:***@'), // Hide credentials
      isLocal,
      hasAuth,
      details: 'Environment variables are properly configured'
    };
  }

  async testConnection() {
    const options = {
      maxPoolSize: 5,
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

    const startTime = Date.now();
    await mongoose.connect(process.env.MONGO_URI, options);
    const connectionTime = Date.now() - startTime;

    return {
      connectionTime: `${connectionTime}ms`,
      readyState: mongoose.connection.readyState,
      host: mongoose.connection.host,
      port: mongoose.connection.port,
      name: mongoose.connection.name
    };
  }

  async testStability() {
    const tests = 5;
    const results = [];

    for (let i = 0; i < tests; i++) {
      const startTime = Date.now();
      try {
        await mongoose.connection.db.admin().ping();
        const responseTime = Date.now() - startTime;
        results.push({ success: true, responseTime });
      } catch (error) {
        results.push({ success: false, error: error.message });
      }
      
      if (i < tests - 1) {
        await new Promise(resolve => setTimeout(resolve, 1000)); // Wait 1 second
      }
    }

    const successful = results.filter(r => r.success).length;
    const avgResponseTime = results
      .filter(r => r.success)
      .reduce((sum, r) => sum + r.responseTime, 0) / successful;

    if (successful < tests) {
      throw new Error(`${tests - successful} out of ${tests} ping tests failed`);
    }

    return {
      successfulTests: successful,
      totalTests: tests,
      averageResponseTime: `${avgResponseTime.toFixed(2)}ms`,
      details: 'All stability tests passed'
    };
  }

  async testLatency() {
    const tests = 10;
    const latencies = [];

    for (let i = 0; i < tests; i++) {
      const startTime = Date.now();
      await mongoose.connection.db.admin().ping();
      latencies.push(Date.now() - startTime);
      
      if (i < tests - 1) {
        await new Promise(resolve => setTimeout(resolve, 100));
      }
    }

    const avgLatency = latencies.reduce((a, b) => a + b, 0) / latencies.length;
    const minLatency = Math.min(...latencies);
    const maxLatency = Math.max(...latencies);

    return {
      averageLatency: `${avgLatency.toFixed(2)}ms`,
      minLatency: `${minLatency}ms`,
      maxLatency: `${maxLatency}ms`,
      samples: tests,
      details: avgLatency < 100 ? 'Excellent latency' : avgLatency < 500 ? 'Good latency' : 'High latency detected'
    };
  }

  async testOperations() {
    const operations = [
      { name: 'ping', operation: () => mongoose.connection.db.admin().ping() },
      { name: 'serverStatus', operation: () => mongoose.connection.db.admin().serverStatus() },
      { name: 'dbStats', operation: () => mongoose.connection.db.stats() }
    ];

    const results = {};
    for (const { name, operation } of operations) {
      const startTime = Date.now();
      await operation();
      const responseTime = Date.now() - startTime;
      results[name] = `${responseTime}ms`;
    }

    return {
      ...results,
      details: 'All database operations completed successfully'
    };
  }

  async testConnectionPool() {
    // Test concurrent operations to stress the connection pool
    const concurrentOperations = 10;
    const operations = Array(concurrentOperations).fill().map(async () => {
      const startTime = Date.now();
      await mongoose.connection.db.admin().ping();
      return Date.now() - startTime;
    });

    const results = await Promise.all(operations);
    const avgTime = results.reduce((a, b) => a + b, 0) / results.length;
    const maxTime = Math.max(...results);

    return {
      concurrentOperations,
      averageTime: `${avgTime.toFixed(2)}ms`,
      maxTime: `${maxTime}ms`,
      poolSize: mongoose.connection.db.serverConfig?.s?.pool?.totalConnectionCount || 'Unknown',
      details: 'Connection pool handled concurrent operations successfully'
    };
  }

  async generateReport() {
    console.log('\n📋 DIAGNOSTIC REPORT');
    console.log('===================\n');

    const successful = Object.values(this.results).filter(r => r.success).length;
    const total = Object.keys(this.results).length;
    const successRate = ((successful / total) * 100).toFixed(1);

    console.log(`📊 Overall Score: ${successful}/${total} tests passed (${successRate}%)\n`);

    // Recommendations based on results
    const recommendations = this.generateRecommendations();
    
    if (recommendations.length > 0) {
      console.log('💡 RECOMMENDATIONS:');
      recommendations.forEach((rec, index) => {
        console.log(`   ${index + 1}. ${rec}`);
      });
      console.log('');
    }

    // Detailed results
    console.log('📝 DETAILED RESULTS:');
    Object.entries(this.results).forEach(([test, result]) => {
      const status = result.success ? '✅ PASS' : '❌ FAIL';
      console.log(`   ${test}: ${status}`);
      
      if (result.success && result.details) {
        console.log(`      ${result.details}`);
      }
      
      if (!result.success) {
        console.log(`      Error: ${result.error}`);
      }
    });
  }

  generateRecommendations() {
    const recommendations = [];

    // Check connection time
    const connectionTest = this.results['MongoDB Connection'];
    if (connectionTest?.success && parseInt(connectionTest.connectionTime) > 5000) {
      recommendations.push('Connection time is slow (>5s). Consider using a closer MongoDB server or checking network.');
    }

    // Check stability
    const stabilityTest = this.results['Connection Stability'];
    if (!stabilityTest?.success) {
      recommendations.push('Connection stability issues detected. Review connection options and network stability.');
    }

    // Check latency
    const latencyTest = this.results['Network Latency'];
    if (latencyTest?.success && parseFloat(latencyTest.averageLatency) > 500) {
      recommendations.push('High network latency detected (>500ms). Consider using a local MongoDB instance or improving network.');
    }

    // General recommendations for your specific case
    if (Object.values(this.results).every(r => r.success)) {
      recommendations.push('All tests passed! Your connection configuration appears stable.');
      recommendations.push('Monitor the connection over extended periods to ensure long-term stability.');
    }

    return recommendations;
  }

  async cleanup() {
    if (mongoose.connection.readyState === 1) {
      await mongoose.connection.close();
      console.log('\n🔌 Diagnostic tool disconnected from database');
    }
  }
}

// Run diagnostics
const diagnostic = new DatabaseDiagnostic();
diagnostic.runDiagnostics().catch(error => {
  console.error('❌ Diagnostic failed:', error.message);
  process.exit(1);
});
