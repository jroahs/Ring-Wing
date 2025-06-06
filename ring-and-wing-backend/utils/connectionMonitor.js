/**
 * Enhanced Database Connection Monitor
 * Provides comprehensive monitoring and diagnostics for MongoDB connections
 */

const mongoose = require('mongoose');
const { logger } = require('../config/logger');

class ConnectionMonitor {
  constructor() {
    this.isMonitoring = false;
    this.reconnectAttempts = 0;
    this.maxReconnectAttempts = 50;
    this.monitorInterval = null;
    this.diagnosticsInterval = null;
    this.connectionHistory = [];
    this.lastSuccessfulPing = null;
    this.consecutiveFailures = 0;
  }

  /**
   * Start comprehensive connection monitoring
   */
  startMonitoring() {
    if (this.isMonitoring) {
      logger.warn('Connection monitoring is already active');
      return;
    }
    
    this.isMonitoring = true;
    logger.info('🔍 Starting enhanced connection monitoring...');
    
    // Monitor connection every 30 seconds
    this.monitorInterval = setInterval(() => {
      this.performConnectionCheck();
    }, 30000);

    // Detailed diagnostics every 5 minutes
    this.diagnosticsInterval = setInterval(() => {
      this.logDetailedDiagnostics();
    }, 300000);

    // Initial check
    this.performConnectionCheck();
  }

  /**
   * Stop connection monitoring
   */
  stopMonitoring() {
    if (this.monitorInterval) {
      clearInterval(this.monitorInterval);
      this.monitorInterval = null;
    }
    
    if (this.diagnosticsInterval) {
      clearInterval(this.diagnosticsInterval);
      this.diagnosticsInterval = null;
    }
    
    this.isMonitoring = false;
    logger.info('⏹️ Connection monitoring stopped');
  }

  /**
   * Perform a comprehensive connection check
   */
  async performConnectionCheck() {
    const timestamp = new Date();
    const state = mongoose.connection.readyState;
    const states = {
      0: 'disconnected',
      1: 'connected', 
      2: 'connecting',
      3: 'disconnecting'
    };

    const connectionInfo = {
      timestamp,
      state: states[state],
      stateCode: state,
      isHealthy: false
    };

    try {
      if (state === 1) {
        // Perform ping test
        const pingStart = Date.now();
        await mongoose.connection.db.admin().ping();
        const pingTime = Date.now() - pingStart;
        
        connectionInfo.isHealthy = true;
        connectionInfo.pingTime = pingTime;
        this.lastSuccessfulPing = timestamp;
        this.consecutiveFailures = 0;
        
        if (pingTime > 1000) {
          logger.warn(`⚠️ Slow database ping: ${pingTime}ms`);
        }
      } else {
        this.consecutiveFailures++;
        connectionInfo.error = `Database not connected (state: ${states[state]})`;
        
        if (this.consecutiveFailures >= 3) {
          logger.error(`❌ Database unhealthy for ${this.consecutiveFailures} consecutive checks`);
        }
      }
    } catch (error) {
      this.consecutiveFailures++;
      connectionInfo.isHealthy = false;
      connectionInfo.error = error.message;
      logger.error(`💔 Database ping failed: ${error.message}`);
    }

    // Keep last 100 connection checks in history
    this.connectionHistory.push(connectionInfo);
    if (this.connectionHistory.length > 100) {
      this.connectionHistory.shift();
    }

    // Trigger alerts for prolonged issues
    if (this.consecutiveFailures >= 5) {
      this.handleProlongedDisconnection();
    }
  }

  /**
   * Handle prolonged disconnection scenarios
   */
  handleProlongedDisconnection() {
    logger.error(`🚨 ALERT: Database has been unhealthy for ${this.consecutiveFailures} consecutive checks`);
    logger.error('🔧 Attempting emergency reconnection...');
    
    // Log current connection pool status
    this.logConnectionPoolStatus();
    
    // Force close and reconnect (last resort)
    setTimeout(() => {
      this.forceReconnection();
    }, 5000);
  }

  /**
   * Force reconnection as last resort
   */
  async forceReconnection() {
    try {
      logger.warn('🔄 Forcing database reconnection...');
      
      if (mongoose.connection.readyState !== 0) {
        await mongoose.connection.close(true); // Force close
      }
      
      // Wait a moment before reconnecting
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      // Reconnect with our enhanced options
      await mongoose.connect(process.env.MONGO_URI);
      
      logger.info('✅ Force reconnection successful');
      this.consecutiveFailures = 0;
      
    } catch (error) {
      logger.error('❌ Force reconnection failed:', error.message);
    }
  }

  /**
   * Log detailed connection diagnostics
   */
  logDetailedDiagnostics() {
    const state = mongoose.connection.readyState;
    const states = { 0: 'disconnected', 1: 'connected', 2: 'connecting', 3: 'disconnecting' };
    
    const diagnostics = {
      connectionState: states[state],
      stateCode: state,
      host: mongoose.connection.host,
      port: mongoose.connection.port,
      database: mongoose.connection.name,
      lastSuccessfulPing: this.lastSuccessfulPing,
      consecutiveFailures: this.consecutiveFailures,
      uptime: process.uptime(),
      memoryUsage: process.memoryUsage(),
      connectionHistory: this.connectionHistory.slice(-10) // Last 10 checks
    };

    logger.info('📊 Database Connection Diagnostics:', JSON.stringify(diagnostics, null, 2));
    
    // Log connection pool information if available
    this.logConnectionPoolStatus();
  }

  /**
   * Log connection pool status
   */
  logConnectionPoolStatus() {
    try {
      const poolInfo = {
        readyState: mongoose.connection.readyState,
        // Note: Some pool information might not be directly accessible in newer Mongoose versions
        collections: Object.keys(mongoose.connection.collections),
        models: Object.keys(mongoose.models),
      };
      
      logger.debug('🏊 Connection Pool Status:', JSON.stringify(poolInfo, null, 2));
    } catch (error) {
      logger.debug('Could not retrieve pool status:', error.message);
    }
  }

  /**
   * Get current connection information
   */
  getConnectionInfo() {
    const state = mongoose.connection.readyState;
    const states = { 0: 'disconnected', 1: 'connected', 2: 'connecting', 3: 'disconnecting' };
    
    return {
      state: states[state],
      stateCode: state,
      isConnected: state === 1,
      host: mongoose.connection.host,
      port: mongoose.connection.port,
      database: mongoose.connection.name,
      lastSuccessfulPing: this.lastSuccessfulPing,
      consecutiveFailures: this.consecutiveFailures,
      uptime: process.uptime(),
      isMonitoring: this.isMonitoring
    };
  }

  /**
   * Get connection health summary
   */
  getHealthSummary() {
    const recentChecks = this.connectionHistory.slice(-10);
    const healthyChecks = recentChecks.filter(check => check.isHealthy).length;
    const avgPingTime = recentChecks
      .filter(check => check.pingTime)
      .reduce((sum, check, _, arr) => sum + check.pingTime / arr.length, 0);

    return {
      overallHealth: healthyChecks >= 7 ? 'good' : healthyChecks >= 4 ? 'warning' : 'critical',
      healthyChecks,
      totalChecks: recentChecks.length,
      averagePingTime: Math.round(avgPingTime),
      consecutiveFailures: this.consecutiveFailures,
      lastCheck: recentChecks[recentChecks.length - 1]
    };
  }
}

// Export singleton instance
module.exports = new ConnectionMonitor();
