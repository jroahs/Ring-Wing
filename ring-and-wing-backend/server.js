const mongoose = require('mongoose');
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const compression = require('compression');
const morgan = require('morgan');
const connectDB = require('./config/db');
const dotenv = require('dotenv');
const fs = require('fs');
const path = require('path');
const multer = require('multer');
const http = require('http');
const axios = require('axios');
const cron = require('node-cron');
const Expense = require('./models/expense');
const cookieParser = require('cookie-parser');

dotenv.config();

// Validate environment variables
const requiredEnvVars = ['MONGO_URI', 'JWT_SECRET', 'OPENROUTER_API_KEY'];
requiredEnvVars.forEach(varName => {
  if (!process.env[varName]) {
    throw new Error(`${varName} environment variable is required`);
  }
});

const app = express();
const PORT = process.env.PORT || 5000;

// Connect to MongoDB
connectDB();

// Security middleware
app.use(
  helmet({
    contentSecurityPolicy: {
      directives: {
        ...helmet.contentSecurityPolicy.getDefaultDirectives(),
        'img-src': ["'self'", 'data:', 'blob:', 'http://localhost:5000']
      }
    },
    crossOriginResourcePolicy: { policy: "cross-origin" }
  })
);
app.use(compression());

// Rate limiting
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 200,
  message: 'Too many requests from this IP, please try again later'
});
app.use('/api/', apiLimiter);

// Create necessary directories
const publicDir = path.join(__dirname, 'public');
const uploadsDir = path.join(publicDir, 'uploads');

[publicDir, uploadsDir].forEach(dir => {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
    console.log(`Created directory: ${dir}`);
  }
});

// CORS configuration
app.use(cors({
  origin: function(origin, callback) {
    const allowedOrigins = [
      'http://localhost:3000',
      'http://localhost:5173',
      'http://localhost:5174',
      undefined // Allow requests with no origin (like mobile apps or curl requests)
    ];
    if (!origin || allowedOrigins.indexOf(origin) !== -1) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  exposedHeaders: ['Authorization']
}));
app.options('*', cors());

// Request logging
app.use((req, res, next) => {
  console.log(`${new Date().toISOString()} - ${req.method} ${req.path}`);
  next();
});

// Body parsing middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
app.use(cookieParser());

// HTTP logging
app.use(morgan('combined'));

// Static files
app.use('/public', express.static(path.join(__dirname, 'public'), {
  setHeaders: (res, filePath) => {
    const ext = path.extname(filePath).toLowerCase();
    const mimeTypes = {
      '.png': 'image/png',
      '.jpg': 'image/jpeg',
      '.jpeg': 'image/jpeg',
      '.gif': 'image/gif',
      '.webp': 'image/webp',
      '.svg': 'image/svg+xml'
    };

    if (mimeTypes[ext]) {
      res.set('Content-Type', mimeTypes[ext]);
      res.set('Cache-Control', 'public, max-age=31536000, must-revalidate');
    }

    res.setHeader('Access-Control-Allow-Origin', 
      process.env.NODE_ENV === 'production' 
        ? process.env.FRONTEND_URL 
        : 'http://localhost:5173'
    );
  }
}));

// Route debug middleware - update to show more details
app.use((req, res, next) => {
  console.log(`[Route Debug] ${req.method} ${req.originalUrl}`);
  console.log('[Route Debug] Headers:', req.headers);
  next();
});

// Database connection check middleware
app.use((req, res, next) => {
  if (mongoose.connection.readyState !== 1) {
    return res.status(500).json({
      success: false,
      message: 'Database connection not established'
    });
  }
  next();
});

// Route imports
const timeLogRoutes = require('./routes/timeLogRoutes');
const payrollRoutes = require('./routes/payrollRoutes');
const staffRoutes = require('./routes/staffRoutes');
const revenueRoutes = require('./routes/revenueRoutes');

// API Routes - add debug logs
console.log('[Setup] Registering time-log routes...');
app.use('/api/time-logs', timeLogRoutes);
console.log('[Setup] Time-log routes registered');

app.use('/api/payroll', payrollRoutes);
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

// Chat proxy route
app.post('/api/chat', async (req, res) => {
  try {
    const response = await axios.post(
      'https://openrouter.ai/api/v1/chat/completions',
      req.body,
      {
        headers: {
          'Authorization': `Bearer ${process.env.OPENROUTER_API_KEY}`,
          'Content-Type': 'application/json',
          'HTTP-Referer': 'https://ring-wing-cafe.com',
          'X-Title': 'Ring & Wing Café Assistant'
        }
      }
    );
    res.json(response.data);
  } catch (error) {
    console.error('Chat proxy error:', error);
    res.status(500).json({ 
      success: false,
      message: 'Chat service temporarily unavailable' 
    });
  }
});

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.status(200).json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development',
    uptime: process.uptime()
  });
});

// Route check endpoint
app.get('/api/route-check', (req, res) => {
  const routes = [
    '/api/time-logs/clock-in',
    '/api/time-logs/clock-out'
  ];
  res.json({ registeredRoutes: routes });
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(`[${new Date().toISOString()}] Error:`, {
    message: err.message,
    path: req.path,
    method: req.method,
    stack: process.env.NODE_ENV === 'production' ? '🔒' : err.stack
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

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({
    success: false,
    message: `Route not found: ${req.originalUrl}`
  });
});

// Scheduled tasks
cron.schedule('0 0 * * *', async () => {
  try {
    const result = await Expense.updateMany(
      { disbursed: true },
      { $set: { disbursed: false } }
    );
    console.log(`Daily expense reset completed. Reset ${result.modifiedCount} expenses.`);
  } catch (error) {
    console.error('Daily expense reset failed:', error);
  }
}, {
  scheduled: true,
  timezone: "Asia/Manila"
});

// Server setup
const server = http.createServer(app);

server.listen(PORT, () => {
  console.log(`
  Server running in ${process.env.NODE_ENV || 'development'} mode
  Listening on port ${PORT}
  Database: ${process.env.MONGO_URI}
  `);
});

process.on('unhandledRejection', (err) => {
  console.error(`Unhandled Rejection: ${err.message}`);
  server.close(() => process.exit(1));
});

module.exports = server;