const express = require('express');
const router = express.Router();
const { authenticateCustomer } = require('../middleware/customerAuthMiddleware');
const { criticalCheck } = require('../middleware/dbConnectionMiddleware');
const {
  getAddresses,
  createAddress,
  updateAddress,
  deleteAddress,
  setDefaultAddress
} = require('../controllers/customerAddressController');

// All routes require authentication
router.use(authenticateCustomer);

// Address CRUD
router.get('/', criticalCheck, getAddresses);
router.post('/', criticalCheck, createAddress);
router.put('/:id', criticalCheck, updateAddress);
router.delete('/:id', criticalCheck, deleteAddress);

// Set default address
router.put('/:id/set-default', criticalCheck, setDefaultAddress);

module.exports = router;
