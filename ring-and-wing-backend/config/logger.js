const { createLogger, format, transports } = require('winston');
const { combine, timestamp, printf, colorize, errors } = format;
const DailyRotateFile = require('winston-daily-rotate-file');
const path = require('path');
const fs = require('fs');

// Create logs directory with error handling
const logsDir = path.join(process.cwd(), 'logs');
try {
  if (!fs.existsSync(logsDir)) {
    fs.mkdirSync(logsDir, { recursive: true });
    console.log(`Created logs directory at: ${logsDir}`);
  }
} catch (err) {
  console.error('Failed to create logs directory:', err);
  // Don't exit process, just log the error
  console.error('Will attempt to continue without file logging');
}

// Custom format for console output
const consoleFormat = combine(
  colorize({ all: true }),
  timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
  errors({ stack: true }),
  printf(({ timestamp, level, message, stack }) => {
    return `${timestamp} [${level}]: ${stack || message}`;
  })
);

// Custom format for file output
const fileFormat = combine(
  timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
  errors({ stack: true }),
  printf(({ timestamp, level, message, stack }) => {
    return JSON.stringify({
      timestamp,
      level,
      message: stack || message,
    });
  })
);

// Base logger configuration
const logger = createLogger({
  level: process.env.NODE_ENV === 'production' ? 'info' : 'debug',
  format: combine(
    timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
    errors({ stack: true })
  ),
  transports: [
    // Always enable console transport for initial startup errors
    new transports.Console({
      format: consoleFormat,
      handleExceptions: true,
      handleRejections: true
    })
  ],
  exceptionHandlers: [
    new transports.File({
      filename: path.join(logsDir, 'exceptions.log'),
      format: fileFormat
    })
  ],
  rejectionHandlers: [
    new transports.File({
      filename: path.join(logsDir, 'rejections.log'),
      format: fileFormat
    })
  ],
  // Prevent Winston from exiting on uncaught exceptions
  exitOnError: false
});

// Add file transports only if not in test environment
if (process.env.NODE_ENV !== 'test') {
  try {
    logger.add(new DailyRotateFile({
      filename: path.join(logsDir, 'error-%DATE%.log'),
      datePattern: 'YYYY-MM-DD',
      level: 'error',
      format: fileFormat,
      maxSize: '20m',
      maxFiles: '30d'
    }));
    
    logger.add(new DailyRotateFile({
      filename: path.join(logsDir, 'combined-%DATE%.log'),
      datePattern: 'YYYY-MM-DD',
      format: fileFormat,
      maxSize: '20m',
      maxFiles: '30d'
    }));
  } catch (err) {
    console.error('Failed to set up log file rotation:', err);
  }
}

// Handle logger errors
logger.on('error', (error) => {
  console.error('Logger error:', error);
});

// Store critical errors to track app health
const criticalErrors = {
  uncaughtExceptions: [],
  unhandledRejections: []
};

// Keep only last 100 errors in memory
const MAX_TRACKED_ERRORS = 100;

// Handle uncaught exceptions without crashing
process.on('uncaughtException', (error) => {
  console.error('Uncaught Exception:', error);
  logger.error(`Uncaught Exception: ${error.stack}`);
  
  // Store error details for health check API
  criticalErrors.uncaughtExceptions.push({
    timestamp: new Date().toISOString(),
    message: error.message,
    stack: error.stack
  });
  
  // Trim array if it gets too large
  if (criticalErrors.uncaughtExceptions.length > MAX_TRACKED_ERRORS) {
    criticalErrors.uncaughtExceptions.shift();
  }
  
  // DO NOT exit the process - this is key to preventing server shutdown
});

// Handle unhandled promise rejections without crashing
process.on('unhandledRejection', (reason, promise) => {
  const reasonString = reason instanceof Error ? reason.stack : String(reason);
  console.error('Unhandled Rejection at:', promise, 'reason:', reasonString);
  logger.error(`Unhandled Rejection: ${reasonString}`);
  
  // Store error details for health check API
  criticalErrors.unhandledRejections.push({
    timestamp: new Date().toISOString(),
    reason: reasonString
  });
  
  // Trim array if it gets too large
  if (criticalErrors.unhandledRejections.length > MAX_TRACKED_ERRORS) {
    criticalErrors.unhandledRejections.shift();
  }
  
  // DO NOT exit the process - this is key to preventing server shutdown
});

// Export both logger and critical errors tracking
module.exports = { 
  logger, 
  criticalErrors 
};