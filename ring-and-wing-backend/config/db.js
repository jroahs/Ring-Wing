const mongoose = require('mongoose');
require('dotenv').config();
const { logger } = require('./logger');

// Enhanced connection options for maximum connection stability (MongoDB 8.x compatible)
const mongooseOptions = {
  // Connection pooling - simplified and stable
  maxPoolSize: 10,      // Reduced to prevent overwhelming MongoDB
  minPoolSize: 1,       // Minimal connections
  
  // Simplified timeout settings
  socketTimeoutMS: 30000,   // 30 seconds socket timeout
  maxIdleTimeMS: 600000,    // 10 minutes idle timeout
  connectTimeoutMS: 30000,  // 30 seconds connect timeout
  serverSelectionTimeoutMS: 15000, // 15 seconds server selection
  heartbeatFrequencyMS: 10000,     // Normal heartbeat (every 10 seconds)
  
  // Retry settings
  retryWrites: true,
  retryReads: true,
  
  // Additional stability settings
  authSource: 'admin',  // Explicit auth source
};

// Track connection status and reconnect attempts
let isConnectedBefore = false;
let reconnectAttempts = 0;
const MAX_RECONNECT_ATTEMPTS = 50; // Allow more reconnection attempts
const INITIAL_RECONNECT_DELAY_MS = 1000;
let reconnectTimer = null;

// Keep-alive ping interval - more aggressive approach
let keepAliveInterval = null;
let connectionHealthInterval = null;

/**
 * Enhanced ping mechanism with connection health monitoring
 */
const pingDb = async () => {
  try {
    if (mongoose.connection.readyState === 1) { // 1 = connected
      const startTime = Date.now();
      // Execute simple ping operation
      await mongoose.connection.db.admin().ping();
      const pingTime = Date.now() - startTime;
      
      if (pingTime > 2000) {
        logger.warn(`Slow MongoDB ping detected: ${pingTime}ms - potential connection issues`);
      } else {
        logger.debug(`MongoDB keep-alive ping successful: ${pingTime}ms`);
      }
      
      return true;
    } else {
      logger.warn(`Cannot ping - connection state: ${mongoose.connection.readyState}`);
      return false;
    }
  } catch (err) {
    logger.error('MongoDB keep-alive ping failed:', err.message);
    return false;
  }
};

/**
 * Comprehensive connection health check
 */
const performHealthCheck = async () => {
  try {
    const state = mongoose.connection.readyState;
    if (state !== 1) {
      logger.warn(`Connection not ready (state: ${state}), attempting recovery...`);
      if (isConnectedBefore) {
        reconnectWithBackoff();
      }
      return false;
    }
    
    // Perform a simple health check
    const startTime = Date.now();
    await mongoose.connection.db.admin().ping();
    const healthTime = Date.now() - startTime;
    
    if (healthTime > 5000) {
      logger.warn(`MongoDB health check slow: ${healthTime}ms - monitoring for issues`);
    } else {
      logger.debug(`MongoDB health check passed: ${healthTime}ms`);
    }
    
    return true;
  } catch (err) {
    logger.error('MongoDB health check failed:', err.message);
    if (isConnectedBefore) {
      logger.info('Triggering reconnection due to failed health check');
      reconnectWithBackoff();
    }
    return false;
  }
};

/**
 * Set up enhanced connection event handlers
 */
const setupConnectionHandlers = () => {
  mongoose.connection.on('error', err => {
    logger.error('MongoDB connection error:', {
      message: err.message,
      code: err.code,
      name: err.name,
      stack: err.stack
    });
    
    // Clear intervals on error to prevent resource leaks
    if (keepAliveInterval) {
      clearInterval(keepAliveInterval);
      keepAliveInterval = null;
    }
    if (connectionHealthInterval) {
      clearInterval(connectionHealthInterval);
      connectionHealthInterval = null;
    }
  });
  
  mongoose.connection.on('disconnected', () => {
    logger.warn('MongoDB disconnected - connection lost');
    
    // Clear intervals when disconnected
    if (keepAliveInterval) {
      clearInterval(keepAliveInterval);
      keepAliveInterval = null;
    }
    if (connectionHealthInterval) {
      clearInterval(connectionHealthInterval);
      connectionHealthInterval = null;
    }
    
    // If we've connected at least once, try to reconnect immediately
    if (isConnectedBefore) {
      logger.info('Attempting immediate reconnection...');
      reconnectWithBackoff();
    }
  });
  
  mongoose.connection.on('reconnected', () => {
    logger.info('MongoDB reconnected successfully');
    reconnectAttempts = 0; // Reset the counter on successful reconnection
    startKeepAliveMonitoring(); // Restart monitoring
  });
  
  mongoose.connection.on('connected', () => {
    if (!isConnectedBefore) {
      logger.info('MongoDB connected successfully for the first time');
    } else {
      logger.info('MongoDB connection restored');
    }
    isConnectedBefore = true;
    reconnectAttempts = 0;
    startKeepAliveMonitoring(); // Start monitoring
  });
  
  // Handle connection timeouts
  mongoose.connection.on('timeout', () => {
    logger.error('MongoDB connection timeout detected');
    if (isConnectedBefore) {
      reconnectWithBackoff();
    }
  });
  
  // Handle connection close
  mongoose.connection.on('close', () => {
    logger.warn('MongoDB connection closed');
    if (keepAliveInterval) {
      clearInterval(keepAliveInterval);
      keepAliveInterval = null;
    }
    if (connectionHealthInterval) {
      clearInterval(connectionHealthInterval);
      connectionHealthInterval = null;
    }
  });
};

/**
 * Start aggressive keep-alive monitoring
 */
const startKeepAliveMonitoring = () => {
  // Clear any existing intervals
  if (keepAliveInterval) {
    clearInterval(keepAliveInterval);
  }
  if (connectionHealthInterval) {
    clearInterval(connectionHealthInterval);
  }
  
  // Ping every 2 minutes (less aggressive)
  keepAliveInterval = setInterval(async () => {
    await pingDb();
  }, 120000);
  
  // Comprehensive health check every 2 minutes
  connectionHealthInterval = setInterval(async () => {
    await performHealthCheck();
  }, 120000);
  
  logger.info('MongoDB aggressive keep-alive monitoring activated (30s ping, 2m health check)');
};

/**
 * Attempt to reconnect with exponential backoff and enhanced error handling
 */
const reconnectWithBackoff = async () => {
  // Clear any existing reconnect timer
  if (reconnectTimer) {
    clearTimeout(reconnectTimer);
  }
  
  if (reconnectAttempts < MAX_RECONNECT_ATTEMPTS) {
    reconnectAttempts++;
    
    // Calculate backoff delay: starts at 1s and increases exponentially
    // but caps at 15 seconds for faster recovery
    const delay = Math.min(
      INITIAL_RECONNECT_DELAY_MS * Math.pow(1.5, reconnectAttempts - 1), 
      15000  // Reduced from 30 seconds for faster recovery
    );
    
    logger.info(`MongoDB reconnection attempt ${reconnectAttempts}/${MAX_RECONNECT_ATTEMPTS} scheduled in ${delay}ms`);
    
    reconnectTimer = setTimeout(async () => {
      try {
        // Check if we're already connected (race condition protection)
        if (mongoose.connection.readyState === 1) {
          logger.info('Connection already restored, cancelling reconnection attempt');
          reconnectAttempts = 0;
          return;
        }
        
        logger.info(`Reconnection attempt ${reconnectAttempts} starting...`);
        
        // Close existing connection if it's in a bad state
        if (mongoose.connection.readyState !== 0) {
          try {
            await mongoose.connection.close();
            logger.info('Closed previous connection before reconnecting');
          } catch (closeErr) {
            logger.warn('Error closing previous connection:', closeErr.message);
          }
        }
        
        // Attempt reconnection with progressive fallback options
        await attemptConnectionWithFallback();
        logger.info(`Reconnection attempt ${reconnectAttempts} successful`);
        
      } catch (err) {
        logger.error(`Reconnection attempt ${reconnectAttempts} failed:`, err.message);
        // The next reconnection attempt will be scheduled by the 'disconnected' event
        // or by this function calling itself
        if (reconnectAttempts < MAX_RECONNECT_ATTEMPTS) {
          setTimeout(() => reconnectWithBackoff(), 2000); // Quick retry
        }
      }
    }, delay);
  } else {
    logger.error(`Maximum reconnection attempts (${MAX_RECONNECT_ATTEMPTS}) reached. Manual intervention required.`);
    // Send critical alert
    logger.error('CRITICAL: Database connection permanently lost - application may be unstable');
  }
};

/**
 * Attempt connection with progressive fallback options
 */
const attemptConnectionWithFallback = async () => {
  const fallbackOptions = [
    // First attempt: full options (compatible with MongoDB 8.x)
    mongooseOptions,
    
    // Second attempt: reduced options
    {
      maxPoolSize: 10,
      minPoolSize: 1,
      serverSelectionTimeoutMS: 15000,
      connectTimeoutMS: 30000,
      socketTimeoutMS: 0,
      maxIdleTimeMS: 300000,
      heartbeatFrequencyMS: 10000,
      retryWrites: true,
      authSource: 'admin'
    },
    
    // Third attempt: minimal options
    {
      serverSelectionTimeoutMS: 10000,
      connectTimeoutMS: 20000,
      socketTimeoutMS: 0,
      maxIdleTimeMS: 300000,
      authSource: 'admin'
    }
  ];
  
  for (let i = 0; i < fallbackOptions.length; i++) {
    try {
      logger.info(`Attempting connection with option set ${i + 1}/${fallbackOptions.length}`);
      await mongoose.connect(process.env.MONGO_URI, fallbackOptions[i]);
      logger.info(`Connection successful with option set ${i + 1}`);
      return;
    } catch (err) {
      logger.warn(`Connection attempt ${i + 1} failed: ${err.message}`);
      if (i === fallbackOptions.length - 1) {
        throw err; // Re-throw the last error
      }
      // Wait briefly before trying next option set
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
  }
};

/**
 * Connect to MongoDB with enhanced resilience and fallback mechanisms
 */
const connectDB = async () => {
  try {
    // Set up connection handlers before attempting to connect
    setupConnectionHandlers();
    
    // Attempt initial connection with fallback mechanism
    await attemptConnectionWithFallback();
    
    logger.info('✅ MongoDB initial connection successful');
    
    // Return enhanced database health check function
    return {
      checkConnection: async () => {
        if (mongoose.connection.readyState !== 1) {
          throw new Error('Database connection is not established');
        }
        
        // Perform comprehensive ping test with timeout
        try {
          const pingPromise = Promise.all([
            mongoose.connection.db.admin().ping(),
            mongoose.connection.db.admin().serverStatus()
          ]);
          
          const timeoutPromise = new Promise((_, reject) => 
            setTimeout(() => reject(new Error('Health check timeout')), 5000)
          );
          
          await Promise.race([pingPromise, timeoutPromise]);
          return true;
        } catch (error) {
          logger.error('Database health check failed:', error.message);
          throw new Error(`Database connection failed health check: ${error.message}`);
        }
      }
    };
    
  } catch (err) {
    logger.error('MongoDB initial connection error:', err.message);
    
    // Schedule a retry with initial delay
    setTimeout(() => {
      logger.info('Retrying MongoDB connection after initial failure...');
      connectDB();
    }, INITIAL_RECONNECT_DELAY_MS);
    
    // Return a dummy health check that always fails until connected
    return {
      checkConnection: async () => {
        throw new Error('Database connection not established yet');
      }
    };
  }
};

// Clean up connections when process exits
process.on('SIGINT', async () => {
  logger.info('Graceful shutdown initiated...');
  
  // Clear all intervals
  if (keepAliveInterval) {
    clearInterval(keepAliveInterval);
    keepAliveInterval = null;
  }
  if (connectionHealthInterval) {
    clearInterval(connectionHealthInterval);
    connectionHealthInterval = null;
  }
  if (reconnectTimer) {
    clearTimeout(reconnectTimer);
    reconnectTimer = null;
  }
  
  // Close MongoDB connection
  if (mongoose.connection && mongoose.connection.readyState !== 0) {
    logger.info('Closing MongoDB connection due to application termination');
    try {
      await mongoose.connection.close();
      logger.info('MongoDB connection closed cleanly through app termination');
    } catch (err) {
      logger.error('Error closing MongoDB connection:', err.message);
    }
  }
  
  process.exit(0);
});

// Handle uncaught exceptions
process.on('uncaughtException', (err) => {
  logger.error('Uncaught exception:', err);
  // Don't exit immediately, let the application handle it
});

// Handle unhandled promise rejections
process.on('unhandledRejection', (reason, promise) => {
  logger.error('Unhandled rejection at:', promise, 'reason:', reason);
  // Don't exit immediately, let the application handle it
});

module.exports = connectDB;