// controllers/merchantWalletController.js
const Settings = require('../models/Settings');
const path = require('path');
const fs = require('fs').promises;

/**
 * Get merchant wallet settings
 * GET /api/settings/merchant-wallets
 * Public endpoint - customers need to see wallet details for payment
 */
exports.getMerchantWallets = async (req, res) => {
  try {
    const settings = await Settings.getSettings();

    // Return only necessary public information
    const wallets = {
      gcash: {
        enabled: settings.merchantWallets?.gcash?.enabled || false,
        accountNumber: settings.merchantWallets?.gcash?.accountNumber || '',
        accountName: settings.merchantWallets?.gcash?.accountName || '',
        qrCodeUrl: settings.merchantWallets?.gcash?.qrCodeUrl || ''
      },
      paymaya: {
        enabled: settings.merchantWallets?.paymaya?.enabled || false,
        accountNumber: settings.merchantWallets?.paymaya?.accountNumber || '',
        accountName: settings.merchantWallets?.paymaya?.accountName || '',
        qrCodeUrl: settings.merchantWallets?.paymaya?.qrCodeUrl || ''
      }
    };

    res.json({
      success: true,
      data: wallets
    });
  } catch (error) {
    console.error('Get merchant wallets error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch merchant wallet settings',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

/**
 * Update merchant wallet settings
 * PUT /api/settings/merchant-wallets
 * Requires: admin role
 */
exports.updateMerchantWallets = async (req, res) => {
  try {
    const { provider, enabled, accountNumber, accountName } = req.body;

    // Validate provider
    if (!['gcash', 'paymaya'].includes(provider)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid provider. Must be "gcash" or "paymaya"'
      });
    }

    const settings = await Settings.getSettings();

    // Initialize merchantWallets if it doesn't exist
    if (!settings.merchantWallets) {
      settings.merchantWallets = {
        gcash: { enabled: false, accountNumber: '', accountName: '', qrCodeUrl: '' },
        paymaya: { enabled: false, accountNumber: '', accountName: '', qrCodeUrl: '' }
      };
    }

    // Update the specific provider
    if (enabled !== undefined) {
      settings.merchantWallets[provider].enabled = enabled;
    }
    if (accountNumber !== undefined) {
      settings.merchantWallets[provider].accountNumber = accountNumber;
    }
    if (accountName !== undefined) {
      settings.merchantWallets[provider].accountName = accountName;
    }

    await settings.save();

    res.json({
      success: true,
      message: `${provider.toUpperCase()} settings updated successfully`,
      data: settings.merchantWallets[provider]
    });
  } catch (error) {
    console.error('Update merchant wallets error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update merchant wallet settings',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

/**
 * Upload QR code for a payment provider
 * POST /api/settings/merchant-wallets/qr
 * Requires: admin role, file upload
 */
exports.uploadQRCode = async (req, res) => {
  try {
    const { provider } = req.body;

    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: 'QR code image file is required'
      });
    }

    // Validate provider
    if (!['gcash', 'paymaya'].includes(provider)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid provider. Must be "gcash" or "paymaya"'
      });
    }

    const settings = await Settings.getSettings();

    // Initialize merchantWallets if it doesn't exist
    if (!settings.merchantWallets) {
      settings.merchantWallets = {
        gcash: { enabled: false, accountNumber: '', accountName: '', qrCodeUrl: '' },
        paymaya: { enabled: false, accountNumber: '', accountName: '', qrCodeUrl: '' }
      };
    }

    // Delete old QR code if exists
    const oldQRPath = settings.merchantWallets[provider].qrCodeUrl;
    if (oldQRPath) {
      try {
        const fullPath = path.join(__dirname, '..', 'public', oldQRPath);
        await fs.unlink(fullPath);
      } catch (err) {
        console.log('Old QR code not found or already deleted:', err.message);
      }
    }

    // Save new QR code path
    settings.merchantWallets[provider].qrCodeUrl = `/uploads/qr-codes/${req.file.filename}`;
    await settings.save();

    res.json({
      success: true,
      message: `${provider.toUpperCase()} QR code uploaded successfully`,
      data: {
        provider,
        qrCodeUrl: settings.merchantWallets[provider].qrCodeUrl
      }
    });
  } catch (error) {
    console.error('Upload QR code error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to upload QR code',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

/**
 * Delete QR code for a payment provider
 * DELETE /api/settings/merchant-wallets/qr/:provider
 * Requires: admin role
 */
exports.deleteQRCode = async (req, res) => {
  try {
    const { provider } = req.params;

    // Validate provider
    if (!['gcash', 'paymaya'].includes(provider)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid provider. Must be "gcash" or "paymaya"'
      });
    }

    const settings = await Settings.getSettings();

    if (!settings.merchantWallets || !settings.merchantWallets[provider].qrCodeUrl) {
      return res.status(404).json({
        success: false,
        message: 'No QR code found for this provider'
      });
    }

    // Delete the file
    const qrPath = settings.merchantWallets[provider].qrCodeUrl;
    try {
      const fullPath = path.join(__dirname, '..', 'public', qrPath);
      await fs.unlink(fullPath);
    } catch (err) {
      console.log('QR code file not found:', err.message);
    }

    // Clear the QR code URL in database
    settings.merchantWallets[provider].qrCodeUrl = '';
    await settings.save();

    res.json({
      success: true,
      message: `${provider.toUpperCase()} QR code deleted successfully`
    });
  } catch (error) {
    console.error('Delete QR code error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete QR code',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

/**
 * Get payment verification settings
 * GET /api/settings/payment-verification
 * Requires: admin or cashier role
 */
exports.getPaymentVerificationSettings = async (req, res) => {
  try {
    const settings = await Settings.getSettings();

    const verificationSettings = {
      timeoutMinutes: settings.paymentVerification?.timeoutMinutes || 120,
      autoCancel: settings.paymentVerification?.autoCancel !== false,
      warningThresholds: settings.paymentVerification?.warningThresholds || {
        green: 60,
        yellow: 30,
        orange: 15,
        red: 0
      }
    };

    res.json({
      success: true,
      data: verificationSettings
    });
  } catch (error) {
    console.error('Get payment verification settings error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch payment verification settings',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

/**
 * Update payment verification settings
 * PUT /api/settings/payment-verification
 * Requires: admin role
 */
exports.updatePaymentVerificationSettings = async (req, res) => {
  try {
    const { timeoutMinutes, autoCancel, warningThresholds } = req.body;

    const settings = await Settings.getSettings();

    // Initialize if doesn't exist
    if (!settings.paymentVerification) {
      settings.paymentVerification = {
        timeoutMinutes: 120,
        autoCancel: true,
        warningThresholds: { green: 60, yellow: 30, orange: 15, red: 0 }
      };
    }

    // Update fields
    if (timeoutMinutes !== undefined) {
      if (timeoutMinutes < 30 || timeoutMinutes > 1440) {
        return res.status(400).json({
          success: false,
          message: 'Timeout must be between 30 and 1440 minutes'
        });
      }
      settings.paymentVerification.timeoutMinutes = timeoutMinutes;
    }

    if (autoCancel !== undefined) {
      settings.paymentVerification.autoCancel = autoCancel;
    }

    if (warningThresholds) {
      settings.paymentVerification.warningThresholds = {
        ...settings.paymentVerification.warningThresholds,
        ...warningThresholds
      };
    }

    await settings.save();

    res.json({
      success: true,
      message: 'Payment verification settings updated successfully',
      data: settings.paymentVerification
    });
  } catch (error) {
    console.error('Update payment verification settings error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update payment verification settings',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};
