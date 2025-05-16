const mongoose = require('mongoose');
require('dotenv').config();
const { logger } = require('./logger');

// Enhanced connection options compatible with Mongoose 8.x
const mongooseOptions = {
  // Connection pooling
  maxPoolSize: 50,
  minPoolSize: 10, 
  socketTimeoutMS: 120000,
  connectTimeoutMS: 30000,
  serverSelectionTimeoutMS: 15000,
  heartbeatFrequencyMS: 10000,
  retryWrites: true,
  retryReads: true,
  family: 4
  // NOTE: keepAlive is enabled by default in newer MongoDB drivers
};

// Track connection status and reconnect attempts
let isConnectedBefore = false;
let reconnectAttempts = 0;
const MAX_RECONNECT_ATTEMPTS = 50; // Allow more reconnection attempts
const INITIAL_RECONNECT_DELAY_MS = 1000;
let reconnectTimer = null;

// Keep-alive ping interval - we'll use our own ping mechanism instead
let keepAliveInterval = null;

/**
 * Send a ping to MongoDB to keep the connection alive
 */
const pingDb = async () => {
  try {
    if (mongoose.connection.readyState === 1) { // 1 = connected
      // Execute a harmless command to keep the connection alive
      await mongoose.connection.db.admin().ping();
      logger.debug('MongoDB keep-alive ping sent successfully');
    }
  } catch (err) {
    logger.error('MongoDB keep-alive ping failed:', err.message);
  }
};

/**
 * Set up connection event handlers
 */
const setupConnectionHandlers = () => {
  mongoose.connection.on('error', err => {
    logger.error('MongoDB connection error:', err);
  });
  
  mongoose.connection.on('disconnected', () => {
    logger.warn('MongoDB disconnected');
    
    // If we've connected at least once, try to reconnect
    if (isConnectedBefore) {
      reconnectWithBackoff();
    }
  });
  
  mongoose.connection.on('reconnected', () => {
    logger.info('MongoDB reconnected successfully');
    reconnectAttempts = 0; // Reset the counter on successful reconnection
  });
  
  mongoose.connection.on('connected', () => {
    if (!isConnectedBefore) {
      logger.info('MongoDB connected successfully');
    } else {
      logger.info('MongoDB connection restored');
    }
    isConnectedBefore = true;
    reconnectAttempts = 0;
    
    // Start the keep-alive mechanism if not already started
    if (!keepAliveInterval) {
      keepAliveInterval = setInterval(pingDb, 300000); // Every 5 minutes
      logger.info('MongoDB keep-alive mechanism activated');
    }
  });
};

/**
 * Attempt to reconnect with exponential backoff
 */
const reconnectWithBackoff = () => {
  // Clear any existing reconnect timer
  if (reconnectTimer) {
    clearTimeout(reconnectTimer);
  }
  
  if (reconnectAttempts < MAX_RECONNECT_ATTEMPTS) {
    reconnectAttempts++;
    
    // Calculate backoff delay: starts at 1s and increases exponentially
    // but caps at 30 seconds to avoid extremely long delays
    const delay = Math.min(
      INITIAL_RECONNECT_DELAY_MS * Math.pow(1.5, reconnectAttempts - 1), 
      30000
    );
    
    logger.info(`MongoDB reconnection attempt ${reconnectAttempts} scheduled in ${delay}ms`);
    
    reconnectTimer = setTimeout(async () => {
      try {
        if (mongoose.connection.readyState !== 1) { // Not connected
          logger.info(`Reconnection attempt ${reconnectAttempts}...`);
          await mongoose.connect(process.env.MONGO_URI, mongooseOptions);
        }
      } catch (err) {
        logger.error(`Reconnection attempt ${reconnectAttempts} failed:`, err.message);
        // The next reconnection attempt will be scheduled by the 'disconnected' event
      }
    }, delay);
  } else {
    logger.error(`Maximum reconnection attempts (${MAX_RECONNECT_ATTEMPTS}) reached. Manual intervention required.`);
    // Here you could send an alert or notification to administrators
  }
};

/**
 * Connect to MongoDB with enhanced resilience
 */
const connectDB = async () => {
  try {
    // Set up connection handlers before attempting to connect
    setupConnectionHandlers();
    
    // Attempt initial connection
    await mongoose.connect(process.env.MONGO_URI, mongooseOptions);
    
    // Return a database health check function that can be used by the server
    return {
      checkConnection: async () => {
        if (mongoose.connection.readyState !== 1) {
          throw new Error('Database connection is not established');
        }
        // Optional: perform a ping to verify connection is responsive
        try {
          await mongoose.connection.db.admin().ping();
          return true;
        } catch (error) {
          logger.error('Database health check failed:', error);
          throw new Error('Database connection failed health check');
        }
      }
    };
    
  } catch (err) {
    logger.error('MongoDB initial connection error:', err.message);
    // Schedule a retry with initial delay
    setTimeout(() => {
      logger.info('Retrying MongoDB connection...');
      connectDB();
    }, INITIAL_RECONNECT_DELAY_MS);
    
    // Return a dummy health check that always fails
    return {
      checkConnection: async () => {
        throw new Error('Database connection not established yet');
      }
    };
  }
};

// Clean up connections when process exits
process.on('SIGINT', async () => {
  if (keepAliveInterval) {
    clearInterval(keepAliveInterval);
  }
  if (reconnectTimer) {
    clearTimeout(reconnectTimer);
  }
  if (mongoose.connection) {
    logger.info('Closing MongoDB connection due to application termination');
    try {
      await mongoose.connection.close();
      logger.info('MongoDB connection closed cleanly through app termination');
    } catch (err) {
      logger.error('Error closing MongoDB connection:', err);
    }
  }
});

module.exports = connectDB;