const express = require('express');
const router = express.Router();
const cors = require('cors');
const { logger, criticalErrors } = require('../config/logger');
const { getMemoryStats } = require('../utils/memoryMonitor');
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

// Make sure OPTIONS requests are handled properly for protected endpoint
router.options('/protected', cors(healthCorsOptions)); 

module.exports = router;