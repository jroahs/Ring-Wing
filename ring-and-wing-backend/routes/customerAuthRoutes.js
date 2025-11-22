const express = require('express');
const router = express.Router();
const { authenticateCustomer } = require('../middleware/customerAuthMiddleware');
const { criticalCheck } = require('../middleware/dbConnectionMiddleware');
const {
  signup,
  login,
  getMe,
  logout,
  getProfile,
  updateProfile,
  changePassword,
  deleteAccount
} = require('../controllers/customerAuthController');

// Public routes
router.post('/signup', criticalCheck, signup);
router.post('/login', criticalCheck, login);

// Protected routes (require authentication)
router.get('/me', authenticateCustomer, criticalCheck, getMe);
router.post('/logout', authenticateCustomer, criticalCheck, logout);
router.get('/profile', authenticateCustomer, criticalCheck, getProfile);
router.put('/profile', authenticateCustomer, criticalCheck, updateProfile);
router.put('/password', authenticateCustomer, criticalCheck, changePassword);
router.delete('/account', authenticateCustomer, criticalCheck, deleteAccount);

module.exports = router;
