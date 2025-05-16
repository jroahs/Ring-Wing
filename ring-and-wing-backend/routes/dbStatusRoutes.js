/**
 * Database Connection Status API
 * 
 * This API provides real-time information about the database connection status
 * for client applications like the frontend.
 */

const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');
const { logger } = require('../config/logger');
const { checkConnectionStatus } = require('../utils/dbMonitor');

/**
 * @route   GET /api/db-status
 * @desc    Get current database connection status
 * @access  Public (rate-limited)
 */
router.get('/', async (req, res) => {
  try {
    // Get the current database connection status
    const connectionStatus = await checkConnectionStatus();
    
    // For security, don't expose implementation details in the public endpoint
    const publicStatus = {
      connected: connectionStatus.readyState === 1 && connectionStatus.pingSuccess === true,
      status: connectionStatus.stateDescription,
      updatedAt: new Date().toISOString()
    };
    
    res.json({
      success: true,
      ...publicStatus
    });
  } catch (error) {
    logger.error(`Error checking database status: ${error.message}`);
    res.status(500).json({
      success: false,
      connected: false,
      status: 'error',
      message: 'Unable to determine database status',
      updatedAt: new Date().toISOString()
    });
  }
});

module.exports = router;
