const express = require('express');
const router = express.Router();
const { auth, isManager } = require('../middleware/auth');
const { lightCheck, criticalCheck } = require('../middleware/dbConnectionMiddleware');
const {
  getStaff,
  getManagers,
  updateUserRole,
  assignManager
} = require('../controllers/userController');

// Get all managers
router.get('/managers', auth, lightCheck, getManagers);

// Get current manager's staff
router.get('/my-staff', auth, lightCheck, isManager, getStaff);

// Update user role (manager-only)
router.patch('/:id/role', auth, criticalCheck, isManager, updateUserRole);

// Assign/reassign manager (manager-only)
router.patch('/:id/manager', auth, criticalCheck, isManager, assignManager);

module.exports = router;