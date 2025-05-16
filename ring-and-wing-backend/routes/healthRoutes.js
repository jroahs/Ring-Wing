const express = require('express');
const router = express.Router();
const cors = require('cors');
const { logger, criticalErrors } = require('../config/logger');
const { getMemoryStats } = require('../utils/memoryMonitor');
const { runConnectionDiagnostics, checkConnectionStatus, checkAndRecoverConnection } = require('../utils/dbMonitor');
const os = require('os');
const { auth } = require('../middleware/authMiddleware');

// Configure CORS specifically for health routes
const healthCorsOptions = {
  origin: ['http://localhost:5173', 'http://localhost:3000', 'http://localhost:5174'],
  methods: ['GET', 'POST', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: true,
  preflightContinue: false,
  optionsSuccessStatus: 204
};

// Apply CORS to all health routes
router.use(cors(healthCorsOptions));

/**
 * @route   GET /api/health
 * @desc    Get server health status
 * @access  Public
 */
router.get('/', (req, res) => {
  try {
    // Basic health check
    const status = {
      status: 'ok',
      timestamp: new Date(),
      uptime: Math.floor(process.uptime()),
      hostname: os.hostname(),
      memory: getMemoryStats(),
      cpu: {
        cores: os.cpus().length,
        model: os.cpus()[0].model,
        loadAvg: os.loadavg(),
        usagePercent: Math.round((os.loadavg()[0] / os.cpus().length) * 100)
      },
      errorCounts: {
        uncaughtExceptions: criticalErrors.uncaughtExceptions.length,
        unhandledRejections: criticalErrors.unhandledRejections.length
      }
    };

    // Only include latest errors in development mode or on explicit request
    if (process.env.NODE_ENV !== 'production' || req.query.includeErrors === 'true') {
      status.latestErrors = {
        uncaughtExceptions: criticalErrors.uncaughtExceptions.slice(-5),
        unhandledRejections: criticalErrors.unhandledRejections.slice(-5)
      };
    }

    res.json(status);
  } catch (error) {
    logger.error(`Health check failed: ${error.message}`);
    res.status(500).json({ status: 'error', message: 'Health check failed', error: error.message });
  }
});

/**
 * @route   GET /api/health/errors
 * @desc    Get detailed error logs (protected in production)
 * @access  Restricted in production
 */
router.get('/errors', (req, res) => {
  // In production, require an admin key
  if (process.env.NODE_ENV === 'production') {
    const adminKey = req.query.key || req.headers['x-admin-key'];
    if (adminKey !== process.env.ADMIN_API_KEY) {
      return res.status(403).json({ status: 'error', message: 'Unauthorized access to error logs' });
    }
  }

  res.json({
    status: 'ok',
    errors: criticalErrors
  });
});

/**
 * @route   POST /api/health/gc
 * @desc    Force garbage collection if --expose-gc flag is enabled
 * @access  Restricted
 */
router.post('/gc', (req, res) => {
  // This should be protected in production
  if (process.env.NODE_ENV === 'production') {
    const adminKey = req.query.key || req.headers['x-admin-key'];
    if (adminKey !== process.env.ADMIN_API_KEY) {
      return res.status(403).json({ status: 'error', message: 'Unauthorized' });
    }
  }

  try {
    if (global.gc) {
      const beforeStats = getMemoryStats();
      global.gc();
      const afterStats = getMemoryStats();
      
      const freedMemory = beforeStats.heapUsed - afterStats.heapUsed;
      
      res.json({
        status: 'ok',
        message: `Garbage collection successful. Freed ${freedMemory}MB of memory.`,
        before: beforeStats,
        after: afterStats
      });
    } else {
      res.status(400).json({
        status: 'error', 
        message: 'Garbage collection not available. Start Node with --expose-gc flag.'
      });
    }
  } catch (error) {
    res.status(500).json({ status: 'error', message: error.message });
  }
});

/**
 * @route   GET /api/health/protected
 * @desc    Protected health check endpoint - requires authentication
 *          Used to validate auth tokens
 * @access  Private
 */
router.get('/protected', auth, (req, res) => {
  res.json({
    success: true,
    status: 'ok',
    timestamp: new Date().toISOString(),
    user: {
      id: req.user._id,
      username: req.user.username,
      role: req.user.role
    }
  });
});

/**
 * @route   GET /api/health/database
 * @desc    Get detailed database health status
 * @access  Private (admin)
 */
router.get('/database', auth, async (req, res) => {
  // Only allow admins to access this endpoint
  if (req.user && req.user.role !== 'admin') {
    return res.status(403).json({ 
      status: 'error',
      message: 'Only admins can access detailed database diagnostics'
    });
  }

  try {
    const status = await checkConnectionStatus();
    res.json({
      status: 'ok',
      database: status,
      timestamp: new Date()
    });
  } catch (error) {
    logger.error(`Database health check failed: ${error.message}`);
    res.status(500).json({ 
      status: 'error', 
      message: 'Database health check failed', 
      error: error.message 
    });
  }
});

/**
 * @route   POST /api/health/database/diagnose
 * @desc    Run comprehensive database diagnostics
 * @access  Private (admin)
 */
router.post('/database/diagnose', auth, async (req, res) => {
  // Only allow admins to run diagnostics
  if (req.user && req.user.role !== 'admin') {
    return res.status(403).json({ 
      status: 'error',
      message: 'Only admins can run database diagnostics'
    });
  }

  try {
    logger.info('Running comprehensive database diagnostics');
    const diagnostics = await runConnectionDiagnostics();
    res.json({
      status: 'ok',
      message: 'Database diagnostics completed',
      diagnostics
    });
  } catch (error) {
    logger.error(`Database diagnostics failed: ${error.message}`);
    res.status(500).json({ 
      status: 'error', 
      message: 'Database diagnostics failed', 
      error: error.message 
    });
  }
});

/**
 * @route   POST /api/health/database/recover
 * @desc    Attempt to recover dead database connections
 * @access  Private (admin)
 */
router.post('/database/recover', auth, async (req, res) => {
  // Only allow admins to force connection recovery
  if (req.user && req.user.role !== 'admin') {
    return res.status(403).json({ 
      status: 'error',
      message: 'Only admins can force database connection recovery'
    });
  }

  try {
    logger.info('Attempting to recover database connection');
    const result = await checkAndRecoverConnection();
    
    if (result.recovered) {
      res.json({
        status: 'ok',
        message: 'Database connection recovery successful',
        details: result
      });
    } else if (!result.needed) {
      res.json({
        status: 'ok',
        message: 'Database connection is already healthy, no recovery needed',
        details: result
      });
    } else {
      res.status(500).json({
        status: 'error',
        message: 'Database connection recovery failed',
        details: result
      });
    }
  } catch (error) {
    logger.error(`Database recovery attempt failed: ${error.message}`);
    res.status(500).json({ 
      status: 'error', 
      message: 'Database recovery attempt failed', 
      error: error.message 
    });
  }
});

// Make sure OPTIONS requests are handled properly for protected and database endpoints
router.options('/protected', cors(healthCorsOptions)); 
router.options('/database', cors(healthCorsOptions));
router.options('/database/diagnose', cors(healthCorsOptions));
router.options('/database/recover', cors(healthCorsOptions));

module.exports = router;