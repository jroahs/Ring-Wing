/**
 * Customer Management Routes (Admin)
 * Routes for admin to manage customer accounts
 * 
 * Created: November 25, 2025
 */

const express = require('express');
const router = express.Router();
const { authenticate } = require('../middleware/authMiddleware');
const { criticalCheck } = require('../middleware/dbConnectionMiddleware');
const {
  getAllCustomers,
  getCustomerById,
  createCustomer,
  updateCustomer,
  resetCustomerPassword,
  toggleCustomerStatus,
  banCustomer,
  unbanCustomer,
  getCustomerActivityLogs,
  getCustomerStats
} = require('../controllers/customerManagementController');

// Admin authorization middleware
const adminOnly = (req, res, next) => {
  const allowedPositions = ['admin', 'general_manager'];
  if (!req.user || !allowedPositions.includes(req.user.position)) {
    return res.status(403).json({
      success: false,
      message: 'Access denied. Admin privileges required.'
    });
  }
  next();
};

// All routes require authentication and admin privileges
router.use(authenticate);
router.use(adminOnly);
router.use(criticalCheck);

// Customer statistics
router.get('/stats', getCustomerStats);

// Customer CRUD operations
router.get('/', getAllCustomers);
router.get('/:id', getCustomerById);
router.post('/', createCustomer);
router.put('/:id', updateCustomer);

// Password management
router.put('/:id/reset-password', resetCustomerPassword);

// Account status management
router.put('/:id/status', toggleCustomerStatus);
router.put('/:id/ban', banCustomer);
router.put('/:id/unban', unbanCustomer);

// Activity logs
router.get('/:id/activity', getCustomerActivityLogs);

module.exports = router;
