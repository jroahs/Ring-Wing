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
    this.aggressiveMonitorInterval = null;
    this.connectionHistory = [];
    this.lastSuccessfulPing = null;
    this.consecutiveFailures = 0;
    this.maxHistorySize = 100; // Keep last 100 connection checks
    this.alertThresholds = {
      consecutiveFailures: 3,
      slowResponseTime: 2000, // 2 seconds
      criticalResponseTime: 5000 // 5 seconds
    };
  }

  /**
   * Start comprehensive connection monitoring with multiple tiers
   */
  startMonitoring() {
    if (this.isMonitoring) {
      logger.warn('Connection monitoring is already active');
      return;
    }
    
    this.isMonitoring = true;
    logger.info('🔍 Starting enhanced connection monitoring...');
    
    // Tier 1: Basic connection check every 15 seconds (very frequent)
    this.monitorInterval = setInterval(() => {
      this.performBasicConnectionCheck();
    }, 15000);

    // Tier 2: Aggressive monitoring every 30 seconds when issues detected
    this.aggressiveMonitorInterval = setInterval(() => {
      if (this.consecutiveFailures > 0) {
        this.performAggressiveCheck();
      }
    }, 30000);

    // Tier 3: Detailed diagnostics every 3 minutes
    this.diagnosticsInterval = setInterval(() => {
      this.logDetailedDiagnostics();
    }, 180000);

    // Initial check
    this.performBasicConnectionCheck();
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
    
    if (this.aggressiveMonitorInterval) {
      clearInterval(this.aggressiveMonitorInterval);
      this.aggressiveMonitorInterval = null;
    }
    
    this.isMonitoring = false;
    logger.info('⏹️ Connection monitoring stopped');
  }

  /**
   * Perform a basic connection check (lightweight)
   */
  async performBasicConnectionCheck() {
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
      isHealthy: false,
      checkType: 'basic'
    };

    try {
      if (state === 1) {
        // Quick ping test
        const pingStart = Date.now();
        await mongoose.connection.db.admin().ping();
        const pingTime = Date.now() - pingStart;
        
        connectionInfo.isHealthy = true;
        connectionInfo.pingTime = pingTime;
        this.lastSuccessfulPing = timestamp;
        this.consecutiveFailures = 0;
        
        // Alert on slow responses
        if (pingTime > this.alertThresholds.slowResponseTime) {
          logger.warn(`⚠️ Slow database response detected: ${pingTime}ms`);
          if (pingTime > this.alertThresholds.criticalResponseTime) {
            logger.error(`🚨 CRITICAL: Very slow database response: ${pingTime}ms`);
          }
        }
      } else {
        this.consecutiveFailures++;
        connectionInfo.error = `Database not connected (state: ${states[state]})`;
        logger.warn(`Database not connected (state: ${states[state]})`);
      }
    } catch (err) {
      this.consecutiveFailures++;
      connectionInfo.error = err.message;
      logger.error(`Basic connection check failed: ${err.message}`);
    }

    this.addToHistory(connectionInfo);
    
    // Trigger alerts if needed
    if (this.consecutiveFailures >= this.alertThresholds.consecutiveFailures) {
      this.handleConnectionAlert();
    }
  }

  /**
   * Perform more aggressive connection checking when issues are detected
   */
  async performAggressiveCheck() {
    logger.info('🔍 Performing aggressive connection check due to detected issues...');
    
    try {
      if (mongoose.connection.readyState === 1) {
        // More comprehensive operations
        const checkStart = Date.now();
        await Promise.all([
          mongoose.connection.db.admin().ping(),
          mongoose.connection.db.admin().listCollections({}, { nameOnly: true }).toArray(),
          mongoose.connection.db.admin().serverStatus()
        ]);
        const checkTime = Date.now() - checkStart;
        
        logger.info(`✅ Aggressive check passed in ${checkTime}ms`);
        
        if (checkTime > 3000) {
          logger.warn(`Aggressive check was slow: ${checkTime}ms - potential connection instability`);
        }
      } else {
        logger.error(`Aggressive check failed - connection state: ${mongoose.connection.readyState}`);
        this.triggerReconnectionAttempt();
      }
    } catch (err) {
      logger.error(`Aggressive connection check failed: ${err.message}`);
      this.triggerReconnectionAttempt();
    }
  }

  /**
   * Handle connection alerts and take corrective action
   */
  handleConnectionAlert() {
    logger.error(`🚨 CONNECTION ALERT: ${this.consecutiveFailures} consecutive failures detected`);
    
    // Log recent connection history for debugging
    const recentHistory = this.connectionHistory.slice(-10);
    logger.error('Recent connection history:', recentHistory.map(h => ({
      time: h.timestamp.toISOString(),
      state: h.state,
      healthy: h.isHealthy,
      error: h.error
    })));
    
    // Attempt immediate recovery if failures exceed threshold
    if (this.consecutiveFailures >= 5) {
      logger.error('Multiple consecutive failures - attempting immediate reconnection');
      this.triggerReconnectionAttempt();
    }
  }

  /**
   * Trigger a reconnection attempt
   */
  triggerReconnectionAttempt() {
    logger.info('Triggering manual reconnection attempt...');
    try {
      // Use the reconnection logic from db.js if available
      // This is a placeholder - you might need to expose the reconnection function
      if (global.reconnectWithBackoff) {
        global.reconnectWithBackoff();
      } else {
        logger.warn('Reconnection function not available globally');
      }
    } catch (err) {
      logger.error('Failed to trigger reconnection:', err.message);
    }
  }

  /**
   * Add connection info to history with size management
   */
  addToHistory(connectionInfo) {
    this.connectionHistory.push(connectionInfo);
    
    // Keep history size manageable
    if (this.connectionHistory.length > this.maxHistorySize) {
      this.connectionHistory = this.connectionHistory.slice(-this.maxHistorySize);
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
      readyState: state,
      consecutiveFailures: this.consecutiveFailures,
      lastSuccessfulPing: this.lastSuccessfulPing,
      historyLength: this.connectionHistory.length,
      isMonitoring: this.isMonitoring
    };

    if (state === 1) {
      try {
        const db = mongoose.connection.db;
        if (db) {
          diagnostics.databaseName = db.databaseName;
          diagnostics.serverConfig = {
            host: mongoose.connection.host,
            port: mongoose.connection.port,
            name: mongoose.connection.name
          };
        }
      } catch (err) {
        diagnostics.error = err.message;
      }
    }

    logger.info('📊 Connection diagnostics:', diagnostics);
    
    // Log connection health summary
    const healthySamples = this.connectionHistory.filter(h => h.isHealthy).length;
    const healthPercentage = this.connectionHistory.length > 0 
      ? ((healthySamples / this.connectionHistory.length) * 100).toFixed(2)
      : 0;
      
    logger.info(`📈 Connection health: ${healthPercentage}% healthy over last ${this.connectionHistory.length} checks`);
  }

  /**
   * Log connection pool status
   */
  logConnectionPoolStatus() {
    try {
      if (mongoose.connection && mongoose.connection.db) {
        const poolStats = {
          readyState: mongoose.connection.readyState,
          host: mongoose.connection.host,
          port: mongoose.connection.port,
          name: mongoose.connection.name
        };
        
        logger.info('🏊 Connection pool status:', poolStats);
      } else {
        logger.warn('Cannot access connection pool - connection not established');
      }
    } catch (err) {
      logger.error('Error getting connection pool status:', err.message);
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
      readyState: state,
      consecutiveFailures: this.consecutiveFailures,
      lastSuccessfulPing: this.lastSuccessfulPing,
      isMonitoring: this.isMonitoring,
      historyLength: this.connectionHistory.length,
      healthPercentage: this.getHealthPercentage()
    };
  }

  /**
   * Get connection health percentage
   */
  getHealthPercentage() {
    if (this.connectionHistory.length === 0) return 0;
    
    const healthySamples = this.connectionHistory.filter(h => h.isHealthy).length;
    return ((healthySamples / this.connectionHistory.length) * 100).toFixed(2);
  }

  /**
   * Get health summary for API responses
   */
  getHealthSummary() {
    const recentChecks = this.connectionHistory.slice(-10);
    const recentHealthy = recentChecks.filter(h => h.isHealthy).length;
    
    return {
      overall: this.getHealthPercentage(),
      recent: recentChecks.length > 0 ? ((recentHealthy / recentChecks.length) * 100).toFixed(2) : 0,
      consecutiveFailures: this.consecutiveFailures,
      lastCheck: this.connectionHistory.length > 0 
        ? this.connectionHistory[this.connectionHistory.length - 1].timestamp 
        : null,
      isStable: this.consecutiveFailures < this.alertThresholds.consecutiveFailures
    };
  }
}

// Create singleton instance
const connectionMonitor = new ConnectionMonitor();

module.exports = connectionMonitor;
