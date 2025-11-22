const express = require('express');
const router = express.Router();
const { authenticateCustomer } = require('../middleware/customerAuthMiddleware');
const { criticalCheck } = require('../middleware/dbConnectionMiddleware');
const {
  getCustomerOrders,
  getOrderById,
  reorderById
} = require('../controllers/customerOrderController');

// All routes require authentication
router.use(authenticateCustomer);

// Order routes
router.get('/', criticalCheck, getCustomerOrders);
router.get('/:id', criticalCheck, getOrderById);
router.post('/:id/reorder', criticalCheck, reorderById);

module.exports = router;
