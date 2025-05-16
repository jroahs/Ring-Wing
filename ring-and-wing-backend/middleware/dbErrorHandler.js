/**
 * Database Error Handling Middleware
 * 
 * This middleware provides better error handling for database operations,
 * with specific handling for common MongoDB error types.
 */

const mongoose = require('mongoose');
const { logger } = require('../config/logger');

/**
 * Middleware to handle database errors in a structured way
 */
const dbErrorHandler = (err, req, res, next) => {
  // Skip if it's not a MongoDB/Mongoose error
  if (!(err instanceof mongoose.Error) && 
      !(err.name && err.name.includes('Mongo')) &&
      !(err.message && err.message.includes('mongo'))) {
    return next(err);
  }
  
  logger.error(`Database error: ${err.message}`, {
    path: req.path,
    method: req.method,
    errorName: err.name,
    errorCode: err.code,
    stack: err.stack
  });
  
  // Handle specific MongoDB error types
  switch (err.name) {
    case 'MongoServerError':
      if (err.code === 11000) {
        // Duplicate key error
        return res.status(409).json({
          success: false,
          error: 'Duplicate key error',
          message: 'This record already exists or conflicts with an existing entry',
          code: 'DB_DUPLICATE_KEY'
        });
      }
      break;
    
    case 'DocumentNotFoundError':
      return res.status(404).json({
        success: false,
        error: 'Document not found',
        message: 'The requested document could not be found',
        code: 'DB_DOCUMENT_NOT_FOUND'
      });
    
    case 'CastError':
      return res.status(400).json({
        success: false,
        error: 'Invalid ID format',
        message: 'The provided ID is not in the correct format',
        code: 'DB_INVALID_ID'
      });
    
    case 'ValidationError':
      const errors = Object.values(err.errors).map(e => e.message);
      return res.status(400).json({
        success: false,
        error: 'Validation error',
        message: 'The data provided did not pass validation',
        details: errors,
        code: 'DB_VALIDATION_ERROR'
      });
      
    case 'MongooseServerSelectionError':
      // Connection establishment failed
      return res.status(503).json({
        success: false,
        error: 'Database unavailable',
        message: 'Unable to connect to the database server',
        code: 'DB_UNAVAILABLE'
      });

    case 'MongooseError':
      if (err.message.includes('buffering timed out')) {
        // Operation timeout
        return res.status(503).json({
          success: false,
          error: 'Database operation timeout',
          message: 'The database operation timed out, please try again',
          code: 'DB_OPERATION_TIMEOUT'
        });
      }
      break;
  }
  
  // Default database error handling
  return res.status(500).json({
    success: false,
    error: 'Database error',
    message: 'An unexpected database error occurred',
    code: 'DB_ERROR',
    // Only include detailed error in development
    ...(process.env.NODE_ENV !== 'production' && {
      details: err.message,
    })
  });
};

module.exports = dbErrorHandler;
