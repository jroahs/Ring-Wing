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
  getAuditTrail,
  getPaymentGateways,
  updatePaymentGateways,
  getAttendanceSettings,
  updateAttendanceSettings,
  getSchedulingSettings,
  updateSchedulingSettings,
  getPayrollSettings,
  updatePayrollSettings,
  getPosSettings,
  updatePosSettings
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

// ========================================
// PAYMENT GATEWAY ROUTES (PayMongo Integration)
// ========================================

/**
 * Get payment gateway settings (public - for payment option display)
 * GET /api/settings/payment-gateways
 */
router.get('/payment-gateways', getPaymentGateways);

/**
 * Update payment gateway settings
 * PUT /api/settings/payment-gateways
 * Requires: admin role
 */
router.put('/payment-gateways', auth, isManager, updatePaymentGateways);

// ========================================
// ATTENDANCE SETTINGS ROUTES
// ========================================

/**
 * Get attendance settings (mode: PIN or NFC)
 * GET /api/settings/attendance
 * Public - needed for time clock component
 */
router.get('/attendance', getAttendanceSettings);

/**
 * Update attendance settings
 * PUT /api/settings/attendance
 * Requires: admin role
 */
router.put('/attendance', auth, isManager, updateAttendanceSettings);

// ========================================
// SCHEDULING SETTINGS ROUTES
// ========================================

/**
 * Get scheduling settings (grace period, overtime rules, etc.)
 * GET /api/settings/scheduling
 * Requires: auth
 */
router.get('/scheduling', auth, getSchedulingSettings);

/**
 * Update scheduling settings
 * PUT /api/settings/scheduling
 * Requires: admin role
 */
router.put('/scheduling', auth, isManager, updateSchedulingSettings);

// ========================================
// PAYROLL SETTINGS ROUTES (DOLE-Compliant)
// ========================================

/**
 * Get payroll settings (DOLE-compliant multipliers, deductions)
 * GET /api/settings/payroll
 * Requires: auth
 */
router.get('/payroll', auth, getPayrollSettings);

/**
 * Update payroll settings
 * PUT /api/settings/payroll
 * Requires: admin role
 * Note: Multipliers below DOLE minimums will be rejected
 */
router.put('/payroll', auth, isManager, updatePayrollSettings);

// ========================================
// POS SETTINGS ROUTES
// ========================================

/**
 * Get POS settings (layout, receipt footer, tax rate)
 * GET /api/settings/pos
 * Public - needed for POS component to determine layout
 */
router.get('/pos', getPosSettings);

/**
 * Update POS settings
 * PUT /api/settings/pos
 * Requires: admin role
 */
router.put('/pos', auth, isManager, updatePosSettings);

module.exports = router;
