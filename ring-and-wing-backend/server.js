const mongoose = require('mongoose');
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const compression = require('compression');
const morgan = require('morgan');
const connectDB = require('./config/db');
const connectionMonitor = require('./utils/connectionMonitor');
const dotenv = require('dotenv');
const fs = require('fs');
const path = require('path');
const multer = require('multer');
const http = require('http');
const axios = require('axios');
const cron = require('node-cron');
const Expense = require('./models/expense');
const cookieParser = require('cookie-parser');
const { logger, criticalErrors } = require('./config/logger');
const { startMonitoring, checkMemory, releaseMemory } = require('./utils/memoryMonitor');
const { checkAndRecoverConnection, runConnectionDiagnostics } = require('./utils/dbMonitor');

// Optimize memory usage by setting a reasonable heap size limit
// This will reduce memory fragmentation and improve GC efficiency
if (global.gc) {
  logger.info('Garbage collection is enabled - memory optimization active');
} else {
  logger.warn('Garbage collection is not enabled - start server with --expose-gc flag for better memory management');
}

dotenv.config();

// Validate environment variables
const requiredEnvVars = ['MONGO_URI', 'JWT_SECRET'];
requiredEnvVars.forEach(varName => {
  if (!process.env[varName]) {
    throw new Error(`${varName} environment variable is required`);
  }
});

// Optional AI service keys - only validate if being used
if (process.env.USE_AI === 'true') {
  ['OPENROUTER_API_KEY', 'GEMINI_API_KEY'].forEach(varName => {
    if (!process.env[varName]) {
      console.warn(`${varName} not set - AI features will be disabled`);
    }
  });
}

const app = express();
const PORT = process.env.PORT || 5000;

// Import database error handler
const dbErrorHandler = require('./middleware/dbErrorHandler');

// Connect to MongoDB with enhanced connection handler
let dbConnection;
(async () => {
  try {
    dbConnection = await connectDB();
    logger.info('Database connection initialized with enhanced resilience');
    
    // Start enhanced connection monitoring after successful connection
    setTimeout(() => {
      connectionMonitor.startMonitoring();
      logger.info('Advanced connection monitoring activated');
    }, 5000); // Wait 5 seconds to ensure connection is stable
    
  } catch (error) {
    logger.error('Failed to initialize database connection:', error);
  }
})();

// Security middleware
app.use(
  helmet({
    contentSecurityPolicy: {
      directives: {
        ...helmet.contentSecurityPolicy.getDefaultDirectives(),
        'script-src': ["'self'", "'unsafe-inline'"],
        'style-src': ["'self'", "'unsafe-inline'"],
        'img-src': ["'self'", 'data:', 'blob:', 'https:'],
        'font-src': ["'self'", 'data:'],
        'connect-src': ["'self'", 'https:']
      }
    },
    crossOriginResourcePolicy: { policy: "cross-origin" }
  })
);
app.use(compression());

// Rate limiting - Increased for development with polling components
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 1000, // Increased from 200 to 1000 for development
  message: 'Too many requests from this IP, please try again later'
});
app.use('/api/', apiLimiter);

// Create necessary directories
const publicDir = path.join(__dirname, 'public');
const uploadsDir = path.join(publicDir, 'uploads');

[publicDir, uploadsDir].forEach(dir => {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
    logger.info(`Created directory: ${dir}`);
  }
});

// CORS configuration
app.use(cors({
  origin: function(origin, callback) {
    // Allow requests without origin (same-domain, mobile apps, curl)
    if (!origin) {
      return callback(null, true);
    }
    
    const allowedOrigins = [
      'http://localhost:3000',
      'http://localhost:5173',
      'http://localhost:5174'
    ];
    
    // In production, allow the current origin (Railway domain)
    if (process.env.NODE_ENV === 'production') {
      const requestOrigin = new URL(origin).origin;
      const appOrigin = new URL(process.env.FRONTEND_URL || `http://localhost:${process.env.PORT || 5000}`).origin;
      if (requestOrigin === appOrigin) {
        return callback(null, true);
      }
    }
    
    // Log all CORS requests for debugging
    logger.debug(`CORS request from origin: ${origin || 'no origin'}`);
    
    if (allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      logger.warn(`CORS blocked request from origin: ${origin}`);
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
  exposedHeaders: ['Authorization'],
  preflightContinue: false,
  optionsSuccessStatus: 204
}));

// Make sure OPTIONS requests are handled properly
app.options('*', cors());

// Enable CORS debugging for development
if (process.env.NODE_ENV !== 'production') {
  app.use((req, res, next) => {
    logger.debug(`[CORS Debug] ${req.method} ${req.path} - Origin: ${req.headers.origin || 'none'}`);
    next();
  });
}

// Request logging
app.use((req, res, next) => {
  logger.debug(`${new Date().toISOString()} - ${req.method} ${req.path}`);
  next();
});

// Body parsing middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
app.use(cookieParser());

// Debug middleware to catch all ingredient mapping requests
app.use((req, res, next) => {
  if (req.method === 'PUT' && req.path.includes('/ingredients/')) {
    console.log(`[SERVER_DEBUG] PUT /ingredients request intercepted:`, {
      method: req.method,
      path: req.path,
      params: req.params,
      body: req.body,
      timestamp: new Date().toISOString()
    });
  }
  next();
});

// HTTP logging
app.use(morgan('combined'));

// Static files
app.use(express.static(path.join(__dirname, 'public'), {
  setHeaders: (res, filePath) => {
    const ext = path.extname(filePath).toLowerCase();
    const mimeTypes = {
      '.js': 'application/javascript',
      '.css': 'text/css',
      '.json': 'application/json',
      '.html': 'text/html',
      '.png': 'image/png',
      '.jpg': 'image/jpeg',
      '.jpeg': 'image/jpeg',
      '.gif': 'image/gif',
      '.webp': 'image/webp',
      '.svg': 'image/svg+xml',
      '.woff': 'font/woff',
      '.woff2': 'font/woff2',
      '.ttf': 'font/ttf',
      '.eot': 'application/vnd.ms-fontobject'
    };

    if (mimeTypes[ext]) {
      res.set('Content-Type', mimeTypes[ext]);
      // Cache static assets for 1 year (except HTML)
      if (ext !== '.html') {
        res.set('Cache-Control', 'public, max-age=31536000, immutable');
      } else {
        res.set('Cache-Control', 'public, max-age=3600, must-revalidate');
      }
    }

    res.setHeader('Access-Control-Allow-Origin', 
      process.env.NODE_ENV === 'production' 
        ? process.env.FRONTEND_URL 
        : 'http://localhost:5173'
    );
  }
}));

// Keep the /public path for backward compatibility
app.use('/public', express.static(path.join(__dirname, 'public')));

// Route debug middleware - update to show more details
app.use((req, res, next) => {
  logger.debug(`[Route Debug] ${req.method} ${req.originalUrl}`);
  next();
});

// Enhanced database connection check middleware
app.use(async (req, res, next) => {
  // Skip check for non-API routes and health endpoints to avoid circular issues
  if (!req.originalUrl.startsWith('/api/') || 
      req.originalUrl.startsWith('/api/health') ||
      req.originalUrl.startsWith('/api/database-status')) {
    return next();
  }
  
  // Check connection state first (fast check)
  if (mongoose.connection.readyState !== 1) {
    logger.error('Database connection lost - middleware check');
    return res.status(503).json({
      success: false,
      message: 'Database connection unavailable',
      code: 'DB_CONN_ERROR'
    });
  }
  
  // For write operations, perform an additional ping check
  if (['POST', 'PUT', 'DELETE', 'PATCH'].includes(req.method)) {
    try {
      await mongoose.connection.db.admin().ping();
    } catch (err) {
      logger.error(`Database ping check failed: ${err.message}`);
      return res.status(503).json({
        success: false,
        message: 'Database connection unstable',
        code: 'DB_PING_ERROR'
      });
    }
  }
  
  next();
});

// Enhanced database health check route
app.get('/api/database-status', async (req, res) => {
  try {
    if (!dbConnection) {
      return res.status(500).json({
        success: false,
        message: 'Database connection handler not initialized',
        diagnostics: { initializationError: true }
      });
    }

    // Standard connection check
    await dbConnection.checkConnection();
    
    // Additional diagnostics
    const serverStatus = await mongoose.connection.db.admin().serverStatus();
    const connectionStats = mongoose.connection.db.serverConfig.s.options;
    
    // Calculate connection uptime
    const currentTimestamp = Math.floor(Date.now() / 1000);
    const serverUptime = serverStatus.uptime || 0;
    const serverStartTime = new Date(currentTimestamp - serverUptime).toISOString();
    
    return res.json({
      success: true,
      message: 'Database connection is healthy',
      status: 'connected',
      readyState: mongoose.connection.readyState,
      diagnostics: {
        connections: {
          current: serverStatus.connections?.current || 0,
          available: serverStatus.connections?.available || 0,
          totalCreated: serverStatus.connections?.totalCreated || 0
        },
        connectionOptions: {
          maxPoolSize: connectionStats.maxPoolSize,
          minPoolSize: connectionStats.minPoolSize,
          socketTimeoutMS: connectionStats.socketTimeoutMS,
          serverSelectionTimeoutMS: connectionStats.serverSelectionTimeoutMS
        },
        server: {
          version: serverStatus.version,
          uptime: serverUptime,
          startTime: serverStartTime
        }
      }
    });
  } catch (error) {
    logger.error('Database health check failed:', error);
    return res.status(500).json({
      success: false,
      message: error.message,
      status: 'disconnected',
      readyState: mongoose.connection.readyState
    });
  }
});

// Route imports
const timeLogRoutes = require('./routes/timeLogRoutes');
const payrollRoutes = require('./routes/payrollRoutes');
const payrollScheduleRoutes = require('./routes/payrollScheduleRoutes');
const staffRoutes = require('./routes/staffRoutes');
const revenueRoutes = require('./routes/revenueRoutes');
const healthRoutes = require('./routes/healthRoutes');

// API Routes
logger.info('[Setup] Registering time-log routes...');
app.use('/api/time-logs', timeLogRoutes);
logger.info('[Setup] Time-log routes registered');

app.use('/api/payroll', payrollRoutes);
app.use('/api/payroll-schedules', payrollScheduleRoutes);
app.use('/api/staff', staffRoutes);
app.use('/api/expenses', require('./routes/expenseRoutes'));
app.use('/api/auth', require('./routes/authRoutes'));
app.use('/api/menu', require('./routes/menuRoutes'));
app.use('/api/add-ons', require('./routes/addOnsRoutes'));
app.use('/api/categories', require('./routes/categoryRoutes'));
app.use('/api/orders', require('./routes/orderRoutes'));
app.use('/api/items', require('./routes/itemRoutes'));
app.use('/api/vendors', require('./routes/vendorRoutes'));
app.use('/api/revenue', revenueRoutes);
app.use('/api/settings', require('./routes/settingsRoutes'));
app.use('/api/inventory', require('./routes/inventoryRoutes'));
app.use('/api/paymongo', require('./routes/paymongoRoutes'));

// Health routes for server monitoring
app.use('/api/health', healthRoutes);

// Enhanced database status endpoints using connection monitor
app.get('/api/db-status', (req, res) => {
  try {
    const connectionInfo = connectionMonitor.getConnectionInfo();
    const healthSummary = connectionMonitor.getHealthSummary();
    
    res.json({
      success: true,
      timestamp: new Date().toISOString(),
      connection: connectionInfo,
      health: healthSummary,
      uptime: process.uptime()
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

// Detailed connection diagnostics endpoint
app.get('/api/db-diagnostics', (req, res) => {
  try {
    const connectionInfo = connectionMonitor.getConnectionInfo();
    const healthSummary = connectionMonitor.getHealthSummary();
    
    res.json({
      success: true,
      timestamp: new Date().toISOString(),
      connectionDetails: connectionInfo,
      healthAnalysis: healthSummary,
      isMonitoring: connectionMonitor.isMonitoring,
      serverUptime: process.uptime(),
      memoryUsage: process.memoryUsage()
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

// Database status route for frontend
app.use('/api/db-status', require('./routes/dbStatusRoutes'));

// Chat proxy route - Final fix for menu context
app.post('/api/chat', async (req, res) => {
  try {
    logger.info('=== CHAT REQUEST DEBUG ===');
    logger.info('Request body:');
    console.log(JSON.stringify(req.body, null, 2));
    
    // Extract what we need from the incoming request
    const { messages, temperature = 0.7, max_tokens = 800 } = req.body;
    
    // For Gemini 2.5, we need much higher token limits due to adaptive thinking
    const adjustedMaxTokens = Math.max(max_tokens, 1000);
    
    logger.info(`Requested tokens: ${max_tokens}, Adjusted tokens: ${adjustedMaxTokens}`);
    
    // Find the system message (contains menu data) and the last user message
    const systemMessage = messages.find(msg => msg.role === 'system');
    const lastUserMessage = [...messages].reverse().find(msg => msg.role === 'user');
    
    if (!lastUserMessage) {
      throw new Error("No user message found in the request");
    }
    
    // Create a combined prompt that includes system info and user query
    const combinedPrompt = systemMessage 
      ? `${systemMessage.content}\n\nUser question: ${lastUserMessage.content}`
      : lastUserMessage.content;
    
    // Construct proper Gemini API request format
    const geminiPayload = {
      contents: [
        {
          parts: [
            { text: combinedPrompt }
          ]
        }
      ],
      generationConfig: {
        temperature: temperature,
        maxOutputTokens: adjustedMaxTokens
      }
    };
    
    // Use environment variable for API key security
    const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
    
    if (!GEMINI_API_KEY) {
      throw new Error('GEMINI_API_KEY environment variable is required');
    }
    
    logger.info('Sending request to Gemini API with menu context');
    
    try {
      const response = await axios.post(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${GEMINI_API_KEY}`,
        geminiPayload,
        {
          headers: {
            'Content-Type': 'application/json'
          },
          timeout: 10000 // 10 second timeout
        }
      );
      
      // Log successful response for debugging
      logger.debug('Gemini API response status:', response.status);
      logger.debug('Full Gemini API response:', JSON.stringify(response.data, null, 2));
      
      // Check if the response is valid
      if (!response.data || !response.data.candidates || !response.data.candidates[0]) {
        logger.error('Invalid Gemini API response structure:', response.data);
        throw new Error('Invalid response structure from Gemini API');
      }
      
      // Extract content based on the new Gemini 2.5 response format
      let content = '';
      const candidate = response.data.candidates[0];
      
      logger.info('=== GEMINI RESPONSE PROCESSING ===');
      logger.info('Full Gemini response:');
      console.log(JSON.stringify(response.data, null, 2));
      logger.info('Processing candidate:');
      console.log(JSON.stringify(candidate, null, 2));
      
      // Check if content has parts array (older format)
      if (candidate.content && candidate.content.parts && candidate.content.parts[0]) {
        content = candidate.content.parts[0].text;
        logger.info('Extracted content from parts array:', content);
      }
      // Check if content has text directly (newer format)
      else if (candidate.content && candidate.content.text) {
        content = candidate.content.text;
        logger.info('Extracted content from content.text:', content);
      }
      // Check if there's a text field directly on the candidate
      else if (candidate.text) {
        content = candidate.text;
        logger.debug('Extracted content from candidate.text');
      }
      else {
        logger.error('Could not extract content from Gemini response');
        logger.error('Candidate structure:');
        console.log(JSON.stringify(candidate, null, 2));
        logger.error('Full response data:');
        console.log(JSON.stringify(response.data, null, 2));
        throw new Error('Could not extract content from Gemini API response');
      }
      
      // Transform Gemini response to match OpenAI/DeepSeek format expected by frontend
      const transformedResponse = {
        choices: [{
          message: {
            content: content,
            role: 'assistant'
          }
        }]
      };
      
      logger.debug('Transformed response:', transformedResponse);
      res.json(transformedResponse);
    } catch (apiError) {
      logger.error('Gemini API error:', apiError.message);
      
      // Specific error handling for API request failures
      if (apiError.response) {
        logger.error('Gemini API error response:', {
          status: apiError.response.status,
          data: apiError.response.data
        });
      }
      
      res.status(500).json({ 
        success: false,
        message: 'Chat service temporarily unavailable',
        error: apiError.message,
        details: apiError.response?.data || 'API request failed'
      });
    }
  } catch (error) {
    logger.error('Chat proxy general error:', error.message);
    
    res.status(500).json({ 
      success: false,
      message: 'Chat service encountered an error',
      error: error.message
    });
  }
});

// Route check endpoint
app.get('/api/route-check', (req, res) => {
  const routes = [
    '/api/time-logs/clock-in',
    '/api/time-logs/clock-out'
  ];
  res.json({ registeredRoutes: routes });
});

// Database-specific error handling (must come before general error handling)
app.use(dbErrorHandler);

// General error handling middleware
app.use((err, req, res, next) => {
  logger.error(`[${new Date().toISOString()}] Error:`, {
    message: err.message,
    path: req.path,
    method: req.method,
    stack: process.env.NODE_ENV === 'production' ? '[REDACTED]' : err.stack
  });

  if (err instanceof multer.MulterError) {
    return res.status(413).json({
      success: false,
      message: 'File upload error: ' + err.message
    });
  }

  const statusCode = err.statusCode || 500;
  const response = {
    success: false,
    message: err.message || 'Internal Server Error'
  };

  if (process.env.NODE_ENV === 'development') {
    response.stack = err.stack;
  }

  res.status(statusCode).json(response);
});

// SPA fallback - serve React index.html for all non-API routes
app.get('*', (req, res) => {
  // Check if this is an API request that wasn't matched
  if (req.originalUrl.startsWith('/api/')) {
    return res.status(404).json({
      success: false,
      message: `Route not found: ${req.originalUrl}`
    });
  }
  
  // Serve React app for SPA routes (index.html)
  // Static assets should have been caught by express.static middleware above
  const indexPath = path.join(__dirname, 'public', 'dist', 'index.html');
  
  if (fs.existsSync(indexPath)) {
    res.setHeader('Content-Type', 'text/html');
    res.sendFile(indexPath);
  } else {
    res.status(404).json({
      success: false,
      message: 'Frontend build not found. Please ensure frontend is built and deployed.'
    });
  }
});

// Scheduled tasks
cron.schedule('0 0 * * *', async () => {
  try {
    const result = await Expense.updateMany(
      { disbursed: true, permanent: { $ne: true } },
      { $set: { disbursed: false } }
    );
    logger.info(`Daily expense reset completed. Reset ${result.modifiedCount} non-permanent expenses.`);
  } catch (error) {
    logger.error('Daily expense reset failed:', error);
  }
}, {
  scheduled: true,
  timezone: "Asia/Manila"
});

// Schedule memory checks and controlled restarts if memory usage is high
// This helps prevent unexpected shutdowns due to memory issues
let serverRuntime = Date.now();
cron.schedule('*/30 * * * *', async () => {
  try {
    // Check if server has been running for at least 6 hours (reduce for testing)
    const uptime = (Date.now() - serverRuntime) / (1000 * 60 * 60); // hours
    logger.info(`Server uptime: ${Math.round(uptime * 10) / 10} hours`);
    
    // Check current memory usage
    const memoryStats = checkMemory();
    
    // If memory usage is above 80% and server has been running for a while,
    // initiate a controlled restart
    if (memoryStats.percentUsed > 80 && uptime > 6) {
      logger.warn(`Scheduled memory check: High memory usage (${memoryStats.percentUsed}%) detected after ${Math.round(uptime)} hours uptime. Initiating controlled restart.`);
      
      // Add a 30-second delay to let current requests complete
      setTimeout(() => {
        logger.info('Performing controlled server restart due to high memory usage');
        process.exit(0); // Clean exit for process manager to restart
      }, 30000);
    }
  } catch (error) {
    logger.error('Error in scheduled memory check:', error);
  }
}, {
  scheduled: true,
  timezone: "Asia/Manila"
});

// Schedule database health checks to prevent disconnections
cron.schedule('*/5 * * * *', async () => {
  try {
    logger.debug('Running scheduled database health check');
    
    if (!dbConnection) {
      logger.warn('Database connection handler not initialized, skipping health check');
      return;
    }
    
    // Check connection and attempt reconnect if needed
    try {
      await dbConnection.checkConnection();
      logger.debug('Database health check passed');
    } catch (error) {
      logger.error('Database health check failed:', error.message);
      
      // The reconnect logic in db.js will handle reconnection
      // This is just an extra safety measure
      if (mongoose.connection.readyState !== 1) {
        logger.info('Triggering database reconnection from health check');
        try {
          await mongoose.connect(process.env.MONGO_URI);
          logger.info('Database reconnected successfully from health check');
        } catch (reconnectError) {
          logger.error('Failed to reconnect database from health check:', reconnectError.message);
        }
      }
    }
  } catch (error) {
    logger.error('Error in database health check schedule:', error);
  }
}, {
  scheduled: true,
  timezone: "Asia/Manila"
});

// Database health monitoring setup
// Setup periodic database health checks (every 30 minutes)
const DB_HEALTH_CHECK_INTERVAL = 30 * 60 * 1000; // 30 minutes
const DB_DIAGNOSTICS_INTERVAL = 12 * 60 * 60 * 1000; // 12 hours

// Schedule database health monitoring
let dbHealthCheckTimer = setInterval(async () => {
  try {
    logger.info('Running scheduled database health check');
    const result = await checkAndRecoverConnection();
    if (result.recovered) {
      logger.info('Automatic database connection recovery successful');
    }
  } catch (error) {
    logger.error('Scheduled database health check failed:', error);
  }
}, DB_HEALTH_CHECK_INTERVAL);

// Schedule periodic comprehensive diagnostics
let dbDiagnosticsTimer = setInterval(async () => {
  try {
    logger.info('Running scheduled comprehensive database diagnostics');
    await runConnectionDiagnostics();
  } catch (error) {
    logger.error('Scheduled database diagnostics failed:', error);
  }
}, DB_DIAGNOSTICS_INTERVAL);

// Clean up health check timers on server shutdown
process.on('SIGINT', () => {
  if (dbHealthCheckTimer) {
    clearInterval(dbHealthCheckTimer);
  }
  if (dbDiagnosticsTimer) {
    clearInterval(dbDiagnosticsTimer);
  }
  // Stop connection monitoring
  connectionMonitor.stopMonitoring();
  // Other cleanup code follows...
});

// Server setup
const server = http.createServer(app);

// ========================================
// SOCKET.IO SETUP FOR REAL-TIME UPDATES
// ========================================
const socketIo = require('socket.io');
const jwt = require('jsonwebtoken');

const io = socketIo(server, {
  cors: {
    origin: function(origin, callback) {
      const allowedOrigins = [
        'http://localhost:5173',
        'http://localhost:5174',
        'http://localhost:3000',
        process.env.FRONTEND_URL
      ].filter(Boolean);
      
      if (!origin || allowedOrigins.includes(origin)) {
        callback(null, true);
      } else {
        callback(new Error('Not allowed by CORS'));
      }
    },
    credentials: true,
    methods: ['GET', 'POST']
  },
  transports: ['websocket', 'polling']
});

// Socket.io authentication middleware
io.use((socket, next) => {
  const token = socket.handshake.auth.token;
  
  if (!token) {
    // Allow unauthenticated connections for customer order status updates
    socket.isAuthenticated = false;
    return next();
  }
  
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    socket.userId = decoded._id;
    socket.userRole = decoded.role;
    socket.userPosition = decoded.position; // Add position for more granular control
    socket.isAuthenticated = true;
    next();
  } catch (error) {
    logger.warn('Socket.io authentication failed:', error.message);
    socket.isAuthenticated = false;
    next(); // Still allow connection but mark as unauthenticated
  }
});

// Socket.io connection handling
io.on('connection', (socket) => {
  logger.info(`Socket connected: ${socket.id} (Auth: ${socket.isAuthenticated}, Role: ${socket.userRole}, Position: ${socket.userPosition})`);
  
  // Join room for authenticated users (for role-based updates)
  if (socket.isAuthenticated) {
    socket.join(`user-${socket.userId}`);
    // Include managers, admins, and cashiers in staff room for payment verification notifications
    if (socket.userRole === 'manager' || socket.userRole === 'admin' || socket.userPosition === 'cashier') {
      socket.join('staff');
      logger.info(`Socket ${socket.id} joined 'staff' room (Role: ${socket.userRole}, Position: ${socket.userPosition})`);
    }
  }
  
  // Handle order status subscription (for customers tracking their orders)
  socket.on('subscribeToOrder', (orderId) => {
    socket.join(`order-${orderId}`);
    logger.info(`Socket ${socket.id} subscribed to order ${orderId}`);
  });
  
  socket.on('unsubscribeFromOrder', (orderId) => {
    socket.leave(`order-${orderId}`);
    logger.info(`Socket ${socket.id} unsubscribed from order ${orderId}`);
  });
  
  socket.on('disconnect', () => {
    logger.info(`Socket disconnected: ${socket.id}`);
  });
});

// Make io available to routes
app.set('io', io);

logger.info('Socket.io initialized successfully');

// Connection handling configuration
server.keepAliveTimeout = 65 * 1000; // 65 seconds
server.headersTimeout = 66 * 1000; // Slightly longer than keepAliveTimeout
server.maxConnections = 100; // Adjust based on your server capacity
server.timeout = 120000; // Request timeout: 2 minutes

// Track active connections for proper shutdown
let connections = [];
server.on('connection', connection => {
  connections.push(connection);
  connection.on('close', () => {
    connections = connections.filter(curr => curr !== connection);
  });
});

// Implement graceful shutdown
const gracefulShutdown = (signal) => {
  logger.info(`${signal} received. Shutting down gracefully.`);
  
  // Set a longer overall shutdown timeout
  const forcedShutdownTimeout = setTimeout(() => {
    logger.error('Could not close connections in time, forcefully shutting down');
    process.exit(1);
  }, 60000); // Increased from 30s to 60s to give more time for connections to close
    // First, terminate any scheduled tasks
  logger.info('Stopping scheduled tasks...');
  try {
    // Get all scheduled tasks and stop them
    const scheduledTasks = cron.getTasks();
    for (const [key, task] of Object.entries(scheduledTasks)) {
      task.stop();
    }
    logger.info('All scheduled tasks stopped');
  } catch (err) {
    logger.error('Error stopping scheduled tasks:', err);
  }
  
  // Stop connection monitoring
  logger.info('Stopping connection monitoring...');
  connectionMonitor.stopMonitoring();
  
  // Then stop memory monitoring
  if (typeof stopMemoryMonitoring === 'function') {
    logger.info('Stopping memory monitoring...');
    stopMemoryMonitoring();
  }

  // Next, stop accepting new connections
  logger.info('Closing HTTP server...');
  server.close(async () => {
    logger.info('HTTP server closed.');
    
    try {
      // Forcefully end any remaining connections
      if (connections.length > 0) {
        logger.info(`Destroying ${connections.length} remaining connections...`);
        connections.forEach(connection => connection.destroy());
        logger.info('All connections destroyed.');
      }
      
      // Close MongoDB connection with a timeout
      logger.info('Closing database connection...');
      try {
        // Use promise-based approach instead of callback
        await mongoose.connection.close();
        logger.info('MongoDB connection closed successfully.');
      } catch (err) {
        logger.error('Error closing MongoDB connection:', err);
      }
      
      // Clear the forced shutdown timeout as we're exiting cleanly
      clearTimeout(forcedShutdownTimeout);
      
      logger.info('All connections closed, exiting cleanly.');
      process.exit(0);
    } catch (err) {
      logger.error('Error during clean shutdown:', err);
      process.exit(1);
    }
  });
  
  // Handle server.close timeout case
  setTimeout(() => {
    if (connections.length > 0) {
      logger.info(`Server close timed out. Forcefully destroying ${connections.length} connections...`);
      connections.forEach(connection => connection.destroy());
    }
  }, 15000);
};

// Listen for shutdown signals
['SIGTERM', 'SIGINT'].forEach(signal => {
  process.on(signal, () => gracefulShutdown(signal));
});

// Start memory monitoring
const stopMemoryMonitoring = startMonitoring();

// Add an "uncaughtException" handler with restart capability
process.on('uncaughtException', (err) => {
  logger.error(`[CRITICAL] Uncaught Exception: ${err.message}`);
  logger.error(err.stack);

  // Only attempt restart in production mode
  if (process.env.NODE_ENV === 'production' && process.env.AUTO_RESTART === 'true') {
    logger.info('Attempting to restart server after uncaught exception...');
    
    // Clean up resources
    stopMemoryMonitoring();
    
    // Give time to log the error before restart
    setTimeout(() => {
      logger.info('Restarting server...');
      process.exit(1); // Exit with error code to let process manager restart
    }, 1000);
  }
  // Note: In non-production mode, we keep the server running
});

// Memory optimization middleware - periodically check memory usage on heavy routes
const memoryOptimizedRoutes = [
  '/api/menu',
  '/api/orders',
  '/api/chat',
  '/api/revenue'
];

app.use((req, res, next) => {
  const isHeavyRoute = memoryOptimizedRoutes.some(route => req.path.startsWith(route));
  
  if (isHeavyRoute) {
    // Check memory on 5% of requests to these routes
    if (Math.random() < 0.05) {
      const memoryStats = checkMemory();
      
      // If memory usage is high, try to release some
      if (memoryStats.percentUsed > 75) {
        logger.debug(`High memory detected during ${req.path} request (${memoryStats.percentUsed}%) - releasing memory`);
        releaseMemory();
      }
    }
  }
  next();
});

// Optimize Mongoose for better memory management
mongoose.set('bufferCommands', false); // Don't buffer commands when disconnected
mongoose.set('autoIndex', process.env.NODE_ENV !== 'production'); // Disable autoIndex in prod

// Optimize connections for better memory management
let connectionCount = 0;
server.on('connection', connection => {
  connections.push(connection);
  connectionCount++;
  
  // Every 100 connections, check memory usage
  if (connectionCount % 100 === 0) {
    const memoryStats = checkMemory();
    logger.info(`${connectionCount} connections received. Current memory usage: ${memoryStats.percentUsed}%`);
    
    // If high memory, release some
    if (memoryStats.percentUsed > 80) {
      releaseMemory();
    }
  }
  
  connection.on('close', () => {
    connections = connections.filter(curr => curr !== connection);
  });
});

// Schedule more frequent memory checks for high load periods
// This helps catch memory issues before they become critical
cron.schedule('*/10 * * * *', async () => {
  // Check memory more frequently during business hours (9am-9pm)
  const hour = new Date().getHours();
  const isDuringBusinessHours = hour >= 9 && hour <= 21;
  
  if (isDuringBusinessHours) {
    const memoryStats = checkMemory();
    
    // If memory usage is above 75% during business hours, be proactive
    if (memoryStats.percentUsed > 75) {
      logger.info(`Business hours memory check: ${memoryStats.percentUsed}% memory usage detected`);
      releaseMemory();
    }
  }
}, {
  scheduled: true,
  timezone: "Asia/Manila"
});

// Import cleanup utilities
const { 
  cleanupTimeLogPhotos, 
  cleanupOrphanedImages 
} = require('./utils/cleanupUtils');

// Schedule time log photo cleanup to run every day at 2 AM
// This job will respect payroll-related photos and only delete photos
// that are older than the retention period and not part of a payroll cycle
cron.schedule('0 2 * * *', async () => {
  try {
    logger.info('Running daily time log photo cleanup job');
    
    // Keep photos from last 60 days by default
    // And protect any photos from the last 3 payroll cycles
    await cleanupTimeLogPhotos({
      daysToKeep: 60,
      payrollBackupMonths: 3,
      dryRun: false
    });
    
    logger.info('Time log photo cleanup complete');
  } catch (error) {
    logger.error('Error running time log photo cleanup:', error);
  }
}, {
  scheduled: true,
  timezone: "Asia/Manila"
});

// Schedule orphaned image cleanup to run weekly on Sunday at 3 AM
// This cleans up staff profile pictures and menu images that are no longer
// referenced in the database
cron.schedule('0 3 * * 0', async () => {
  try {
    logger.info('Running weekly orphaned image cleanup job');
    
    await cleanupOrphanedImages({
      dryRun: false
    });
    
    logger.info('Orphaned image cleanup complete');
  } catch (error) {
    logger.error('Error running orphaned image cleanup:', error);
  }
}, {
  scheduled: true,
  timezone: "Asia/Manila"
});

server.listen(PORT, () => {
  logger.info(`
  Server running in ${process.env.NODE_ENV || 'development'} mode
  Listening on port ${PORT}
  Database: ${process.env.MONGO_URI}
  Keep-alive timeout: ${server.keepAliveTimeout}ms
  `);
});

module.exports = server;