/**
 * Database Connection Middleware
 * 
 * This middleware provides advanced database connection checking
 * for critical routes that need robust database operations.
 * It performs different levels of checks based on request type
 * and handles connection issues gracefully.
 */

const mongoose = require('mongoose');
const { logger } = require('../config/logger');

/**
 * Database connection check with configurable options
 * @param {Object} options Configuration options
 * @param {boolean} options.performPing Whether to perform a ping test (true) or just a readyState check (false)
 * @param {boolean} options.criticalOperation Whether this is a critical write operation that needs stricter checks
 * @param {number} options.timeoutMS Timeout in milliseconds for the ping test
 */
const dbConnectionCheck = (options = {}) => {
  const {
    performPing = false,
    criticalOperation = false,
    timeoutMS = 3000
  } = options;
  
  return async (req, res, next) => {
    // First perform basic readyState check (fast)
    if (mongoose.connection.readyState !== 1) {
      logger.error(`Database connection unavailable (readyState: ${mongoose.connection.readyState})`);
      return res.status(503).json({
        success: false,
        message: 'Database service unavailable',
        retryAfter: 30,
        code: 'DB_UNAVAILABLE'
      });
    }
    
    // For write operations or when explicitly requested, perform a ping test
    if (performPing || criticalOperation || ['POST', 'PUT', 'DELETE', 'PATCH'].includes(req.method)) {
      try {
        // Use Promise.race to apply a timeout to the ping
        const pingPromise = mongoose.connection.db.admin().ping();
        const timeoutPromise = new Promise((_, reject) => 
          setTimeout(() => reject(new Error('Database ping timeout')), timeoutMS)
        );
        
        await Promise.race([pingPromise, timeoutPromise]);
      } catch (err) {
        logger.error(`Database ping check failed: ${err.message}`);
        
        // For critical operations, fail immediately
        if (criticalOperation) {
          return res.status(503).json({
            success: false,
            message: 'Database connection unstable, cannot process critical operation',
            retryAfter: 60,
            code: 'DB_UNSTABLE'
          });
        }
        
        // For non-critical operations, log but proceed (at your own risk)
        logger.warn('Proceeding with potentially unstable database connection');
      }
    }
    
    next();
  };
};

/**
 * Lightweight check - only verifies connection state
 */
const lightCheck = dbConnectionCheck({ performPing: false });

/**
 * Standard check - verifies connection state and pings for write operations
 */
const standardCheck = dbConnectionCheck({ performPing: true });

/**
 * Critical check - strict checking for important operations
 */
const criticalCheck = dbConnectionCheck({ 
  performPing: true,
  criticalOperation: true,
  timeoutMS: 5000
});

module.exports = {
  dbConnectionCheck,
  lightCheck,
  standardCheck,
  criticalCheck
};
