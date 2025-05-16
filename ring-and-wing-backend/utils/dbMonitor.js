/**
 * Database Connection Monitor
 * 
 * This script is designed to be run as a scheduled job to monitor
 * the MongoDB connection health and perform diagnostics.
 * It can be triggered by a cron job or through the API.
 */

const mongoose = require('mongoose');
const fs = require('fs');
const path = require('path');
const { logger } = require('../config/logger');

// Directory for storing connection diagnostics
const DIAGNOSTICS_DIR = path.join(process.cwd(), 'logs', 'db-diagnostics');

// Ensure diagnostics directory exists
try {
  if (!fs.existsSync(DIAGNOSTICS_DIR)) {
    fs.mkdirSync(DIAGNOSTICS_DIR, { recursive: true });
  }
} catch (err) {
  logger.error(`Failed to create DB diagnostics directory: ${err.message}`);
}

/**
 * Run comprehensive connection diagnostics
 */
const runConnectionDiagnostics = async () => {
  const timestamp = new Date();
  const diagnostics = {
    timestamp: timestamp.toISOString(),
    connectionState: {
      readyState: mongoose.connection.readyState,
      stateDescription: getReadyStateDescription(mongoose.connection.readyState)
    }
  };

  // Skip further checks if not connected
  if (mongoose.connection.readyState !== 1) {
    logger.warn(`Database not connected (readyState: ${mongoose.connection.readyState})`);
    await saveConnectionDiagnostics(diagnostics);
    return diagnostics;
  }

  try {
    // Test connection with ping
    const pingStart = Date.now();
    await mongoose.connection.db.admin().ping();
    const pingTime = Date.now() - pingStart;
    diagnostics.pingTest = {
      successful: true,
      responseTimeMs: pingTime
    };
    
    // Get server stats
    const serverStatus = await mongoose.connection.db.admin().serverStatus();
    diagnostics.serverStatus = {
      version: serverStatus.version,
      uptime: serverStatus.uptime,
      connections: serverStatus.connections,
      opcounters: serverStatus.opcounters
    };
    
    // Get connection pool stats
    const connectionStats = mongoose.connection.db.serverConfig.s.options;
    diagnostics.connectionPool = {
      maxPoolSize: connectionStats.maxPoolSize,
      minPoolSize: connectionStats.minPoolSize,
      socketTimeoutMS: connectionStats.socketTimeoutMS,
      serverSelectionTimeoutMS: connectionStats.serverSelectionTimeoutMS
    };
    
    // Database stats
    const dbStats = await mongoose.connection.db.stats();
    diagnostics.databaseStats = {
      collections: dbStats.collections,
      views: dbStats.views,
      objects: dbStats.objects,
      avgObjSize: dbStats.avgObjSize,
      dataSize: dbStats.dataSize,
      storageSize: dbStats.storageSize,
      indexes: dbStats.indexes,
      indexSize: dbStats.indexSize
    };

    logger.info(`Database connection diagnostics completed successfully. Ping time: ${pingTime}ms`);
  } catch (err) {
    logger.error(`Database diagnostics error:`, err);
    diagnostics.error = {
      message: err.message,
      stack: err.stack,
      code: err.code
    };
  }

  await saveConnectionDiagnostics(diagnostics);
  return diagnostics;
};

/**
 * Map mongoose connection readyState to descriptive string
 */
const getReadyStateDescription = (readyState) => {
  const states = {
    0: 'disconnected',
    1: 'connected',
    2: 'connecting',
    3: 'disconnecting',
    99: 'uninitialized'
  };
  return states[readyState] || 'unknown';
};

/**
 * Save connection diagnostics to file
 */
const saveConnectionDiagnostics = async (diagnostics) => {
  try {
    // Keep only the last 10 diagnostics files
    const files = fs.readdirSync(DIAGNOSTICS_DIR)
      .filter(file => file.startsWith('db-diagnostics-'))
      .map(file => ({ 
        name: file, 
        path: path.join(DIAGNOSTICS_DIR, file),
        time: fs.statSync(path.join(DIAGNOSTICS_DIR, file)).mtime.getTime()
      }))
      .sort((a, b) => b.time - a.time);
    
    // Delete older files beyond 10
    if (files.length >= 10) {
      files.slice(10).forEach(file => {
        fs.unlinkSync(file.path);
      });
    }

    // Save new diagnostics file
    const filename = `db-diagnostics-${Date.now()}.json`;
    const filepath = path.join(DIAGNOSTICS_DIR, filename);
    fs.writeFileSync(filepath, JSON.stringify(diagnostics, null, 2));
    
    logger.info(`Saved database diagnostics to ${filename}`);
  } catch (err) {
    logger.error(`Failed to save database diagnostics: ${err.message}`);
  }
};

/**
 * Quick check of MongoDB connection status
 */
const checkConnectionStatus = async () => {
  const status = {
    readyState: mongoose.connection.readyState,
    stateDescription: getReadyStateDescription(mongoose.connection.readyState),
    timestamp: new Date().toISOString()
  };
  
  if (mongoose.connection.readyState === 1) {
    try {
      await mongoose.connection.db.admin().ping();
      status.pingSuccess = true;
    } catch (err) {
      status.pingSuccess = false;
      status.pingError = err.message;
    }
  }
  
  return status;
};

/**
 * Check for dead connections and force reconnect if needed
 */
const checkAndRecoverConnection = async () => {
  // Only attempt recovery if we're not currently connecting
  if (mongoose.connection.readyState !== 2) {
    const status = await checkConnectionStatus();
    
    // If we're supposed to be connected but ping fails, force reconnect
    if (mongoose.connection.readyState === 1 && !status.pingSuccess) {
      logger.warn('Database connection appears to be dead. Force reconnecting...');
      
      try {
        // Close the existing connection
        await mongoose.connection.close();
        
        // Re-establish connection
        await mongoose.connect(process.env.MONGO_URI, {
          maxPoolSize: 50,
          minPoolSize: 10, 
          socketTimeoutMS: 120000,
          connectTimeoutMS: 30000,
          serverSelectionTimeoutMS: 15000
        });
        
        logger.info('Database connection successfully re-established');
        return { recovered: true, message: 'Connection recovered' };
      } catch (err) {
        logger.error('Failed to recover database connection:', err);
        return { recovered: false, error: err.message };
      }
    }
  }
  
  return { recovered: false, needed: false };
};

module.exports = {
  runConnectionDiagnostics,
  checkConnectionStatus,
  checkAndRecoverConnection
};
