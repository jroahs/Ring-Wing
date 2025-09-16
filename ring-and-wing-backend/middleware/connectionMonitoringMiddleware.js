const mongoose = require('mongoose');

/**
 * Get logger safely - fallback to console if logger isn't available
 */
const getLogger = () => {
  try {
    const logger = require('../config/logger');
    // Test if logger.info is available
    if (logger && typeof logger.info === 'function') {
      return logger;
    }
  } catch (error) {
    // Logger not available, fall back to console
  }
  
  // Fallback logger using console
  return {
    info: (message, meta) => console.log(`[INFO] ${message}`, meta || ''),
    error: (message, meta) => console.error(`[ERROR] ${message}`, meta || ''),
    warn: (message, meta) => console.warn(`[WARN] ${message}`, meta || ''),
    debug: (message, meta) => console.log(`[DEBUG] ${message}`, meta || '')
  };
};

/**
 * Middleware for enhanced connection monitoring specifically for ingredient mapping operations
 */
const connectionMonitoringMiddleware = (operationType = 'general') => {
  return (req, res, next) => {
    const startTime = Date.now();
    const requestId = `${operationType}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    const logger = getLogger(); // Get logger safely
    
    // Add request ID to request object for tracking
    req.connectionRequestId = requestId;
    
    // Log the start of the request
    logger.info(`[CONNECTION_MONITOR] ${operationType.toUpperCase()} request started`, {
      requestId,
      operationType,
      path: req.path,
      method: req.method,
      connectionReadyState: mongoose.connection.readyState,
      userAgent: req.get('User-Agent'),
      timestamp: new Date().toISOString()
    });
    
    // Check connection health before processing
    const connectionState = ['disconnected', 'connected', 'connecting', 'disconnecting'][mongoose.connection.readyState];
    
    if (mongoose.connection.readyState !== 1) {
      logger.error(`[CONNECTION_MONITOR] ${operationType.toUpperCase()} request blocked - database not connected`, {
        requestId,
        operationType,
        path: req.path,
        connectionReadyState: mongoose.connection.readyState,
        connectionState,
        timestamp: new Date().toISOString()
      });
      
      return res.status(503).json({
        success: false,
        message: 'Database connection unavailable. Please try again in a moment.',
        error: `Connection state: ${connectionState}`,
        requestId
      });
    }
    
    // Override res.json to capture response data
    const originalJson = res.json;
    res.json = function(body) {
      const duration = Date.now() - startTime;
      const success = !body || body.success !== false;
      const logger = getLogger(); // Get logger safely for response
      
      logger.info(`[CONNECTION_MONITOR] ${operationType.toUpperCase()} request completed`, {
        requestId,
        operationType,
        path: req.path,
        success,
        duration,
        statusCode: res.statusCode,
        connectionReadyState: mongoose.connection.readyState,
        timestamp: new Date().toISOString()
      });
      
      // If there was an error, log additional connection details
      if (!success && body.error) {
        const isConnectionError = body.error.includes('connection') || 
                                  body.error.includes('disconnect') ||
                                  body.error.includes('timeout');
        
        if (isConnectionError) {
          const logger = getLogger(); // Get logger safely for error logging
          logger.error(`[CONNECTION_MONITOR] Connection-related error detected in ${operationType}`, {
            requestId,
            operationType,
            path: req.path,
            error: body.error,
            connectionReadyState: mongoose.connection.readyState,
            timestamp: new Date().toISOString()
          });
        }
      }
      
      return originalJson.call(this, body);
    };
    
    // Handle connection drops during request processing
    const connectionErrorHandler = (error) => {
      logger.error(`[CONNECTION_MONITOR] Connection error during ${operationType} request`, {
        requestId,
        operationType,
        path: req.path,
        error: error.message,
        errorName: error.name,
        connectionReadyState: mongoose.connection.readyState,
        timestamp: new Date().toISOString()
      });
    };
    
    // Add temporary error handler
    mongoose.connection.once('error', connectionErrorHandler);
    mongoose.connection.once('disconnected', () => {
      logger.warn(`[CONNECTION_MONITOR] Database disconnected during ${operationType} request`, {
        requestId,
        operationType,
        path: req.path,
        timestamp: new Date().toISOString()
      });
    });
    
    // Clean up event listeners when request completes
    req.on('end', () => {
      mongoose.connection.removeListener('error', connectionErrorHandler);
    });
    
    next();
  };
};

/**
 * Specific middleware for ingredient mapping operations
 */
const ingredientMappingMonitor = connectionMonitoringMiddleware('ingredient-mapping');

/**
 * Specific middleware for cost analysis operations
 */
const costAnalysisMonitor = connectionMonitoringMiddleware('cost-analysis');

/**
 * General database operation monitor
 */
const databaseOperationMonitor = connectionMonitoringMiddleware('database-operation');

module.exports = {
  connectionMonitoringMiddleware,
  ingredientMappingMonitor,
  costAnalysisMonitor,
  databaseOperationMonitor
};