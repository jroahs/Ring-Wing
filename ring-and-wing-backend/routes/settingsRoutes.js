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
const {
  getMerchantWallets,
  updateMerchantWallets,
  uploadQRCode,
  deleteQRCode,
  getPaymentVerificationSettings,
  updatePaymentVerificationSettings
} = require('../controllers/merchantWalletController');
const { auth, isManager } = require('../middleware/authMiddleware');
const uploadMiddleware = require('../config/multer');

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

// ========================================
// MERCHANT WALLET ROUTES (Payment Verification)
// ========================================

/**
 * Get merchant wallet settings (public - for customer payment info)
 * GET /api/settings/merchant-wallets
 */
router.get('/merchant-wallets', getMerchantWallets);

/**
 * Update merchant wallet settings
 * PUT /api/settings/merchant-wallets
 * Requires: admin role
 */
router.put('/merchant-wallets', auth, isManager, updateMerchantWallets);

/**
 * Upload QR code for payment provider
 * POST /api/settings/merchant-wallets/qr
 * Requires: admin role, file upload
 */
router.post('/merchant-wallets/qr', auth, isManager, uploadMiddleware, uploadQRCode);

/**
 * Delete QR code for payment provider
 * DELETE /api/settings/merchant-wallets/qr/:provider
 * Requires: admin role
 */
router.delete('/merchant-wallets/qr/:provider', auth, isManager, deleteQRCode);

/**
 * Get payment verification settings
 * GET /api/settings/payment-verification
 * Requires: auth (admin or cashier)
 */
router.get('/payment-verification', auth, getPaymentVerificationSettings);

/**
 * Update payment verification settings
 * PUT /api/settings/payment-verification
 * Requires: admin role
 */
router.put('/payment-verification', auth, isManager, updatePaymentVerificationSettings);

module.exports = router;
