const express = require('express');
const router = express.Router();
const { auth } = require('../middleware/authMiddleware');
const backupController = require('../controllers/backupController');

// Simple admin guard based on position
const requireAdmin = (req, res, next) => {
  if (req.user?.position !== 'admin') {
    return res.status(403).json({ success: false, message: 'Admin privileges required to manage backups' });
  }
  next();
};

// Backup routes
router.post('/run', auth, requireAdmin, backupController.run);
router.get('/status', auth, requireAdmin, backupController.status);
router.get('/list', auth, requireAdmin, backupController.list);

// Restore routes
router.get('/restore-points', auth, requireAdmin, backupController.listRestorePoints);
router.post('/restore', auth, requireAdmin, backupController.restore);

// Delete all data (emergency cleanup)
router.delete('/delete-all', auth, requireAdmin, backupController.deleteAll);

module.exports = router;
