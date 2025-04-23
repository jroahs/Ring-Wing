const express = require('express');
const router = express.Router();
const { auth, isManager } = require('../middleware/auth');
const {
  getStaff,
  getManagers,
  updateUserRole,
  assignManager
} = require('../controllers/userController');

// Get all managers
router.get('/managers', auth, getManagers);

// Get current manager's staff
router.get('/my-staff', auth, isManager, getStaff);

// Update user role (manager-only)
router.patch('/:id/role', auth, isManager, updateUserRole);

// Assign/reassign manager (manager-only)
router.patch('/:id/manager', auth, isManager, assignManager);

module.exports = router;