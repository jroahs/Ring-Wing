const express = require('express');
const router = express.Router();
const { authenticateCustomer } = require('../middleware/customerAuthMiddleware');
const { criticalCheck } = require('../middleware/dbConnectionMiddleware');
const {
  signup,
  login,
  getMe,
  logout
} = require('../controllers/customerAuthController');

// Public routes
router.post('/signup', criticalCheck, signup);
router.post('/login', criticalCheck, login);

// Protected routes (require authentication)
router.get('/me', authenticateCustomer, criticalCheck, getMe);
router.post('/logout', authenticateCustomer, criticalCheck, logout);

module.exports = router;
