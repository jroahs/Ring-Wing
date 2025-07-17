const express = require('express');
const router = express.Router();
const {
  getSettings,
  getCashFloatSettings,
  updateCashFloatSettings,
  setCashFloat,
  processCashTransaction,
  configureDailyReset,
  performDailyReset,
  getAuditTrail
} = require('../controllers/settingsController');

// General settings routes
router.get('/', getSettings);

// Cash float specific routes
router.get('/cash-float', getCashFloatSettings);
router.put('/cash-float', updateCashFloatSettings);
router.post('/cash-float/set', setCashFloat);
router.post('/cash-float/transaction', processCashTransaction);
router.put('/cash-float/daily-reset', configureDailyReset);
router.post('/cash-float/daily-reset/perform', performDailyReset);
router.get('/cash-float/audit', getAuditTrail);

module.exports = router;
