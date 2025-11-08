const Settings = require('../models/Settings');

// Get all settings (or create default if none exist)
const getSettings = async (req, res) => {
  try {
    const settings = await Settings.getSettings();
    res.json({
      success: true,
      data: settings
    });
  } catch (error) {
    console.error('Error fetching settings:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch settings',
      error: error.message
    });
  }
};

// Get only cash float settings
const getCashFloatSettings = async (req, res) => {
  try {
    const settings = await Settings.getSettings();
    res.json({
      success: true,
      data: settings.cashFloat
    });
  } catch (error) {
    console.error('Error fetching cash float settings:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch cash float settings',
      error: error.message
    });
  }
};

// Update cash float settings
const updateCashFloatSettings = async (req, res) => {
  try {
    const { 
      currentAmount, 
      dailyResetSettings, 
      lastResetDate, 
      auditEntry 
    } = req.body;

    const settings = await Settings.getSettings();
    
    // Update cash float data
    if (currentAmount !== undefined) {
      settings.cashFloat.currentAmount = currentAmount;
    }
    
    if (dailyResetSettings) {
      settings.cashFloat.dailyResetSettings = {
        ...settings.cashFloat.dailyResetSettings,
        ...dailyResetSettings
      };
    }
    
    if (lastResetDate !== undefined) {
      settings.cashFloat.lastResetDate = lastResetDate;
    }
    
    // Add audit entry if provided
    if (auditEntry) {
      settings.cashFloat.auditTrail.push(auditEntry);
      
      // Keep only the last 100 audit entries to prevent unlimited growth
      if (settings.cashFloat.auditTrail.length > 100) {
        settings.cashFloat.auditTrail = settings.cashFloat.auditTrail.slice(-100);
      }
    }
    
    await settings.save();
    
    res.json({
      success: true,
      data: settings.cashFloat,
      message: 'Cash float settings updated successfully'
    });
  } catch (error) {
    console.error('Error updating cash float settings:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update cash float settings',
      error: error.message
    });
  }
};

// Set cash float amount (for manual adjustments)
const setCashFloat = async (req, res) => {
  try {
    const { amount, reason = 'manual_adjustment', metadata = {} } = req.body;
    
    if (amount === undefined || amount < 0) {
      return res.status(400).json({
        success: false,
        message: 'Valid amount is required and cannot be negative'
      });
    }
    
    const settings = await Settings.getSettings();
    const previousAmount = settings.cashFloat.currentAmount;
    
    // Create audit entry
    const auditEntry = {
      timestamp: new Date().toISOString(),
      action: 'set_float',
      previousAmount,
      newAmount: amount,
      change: amount - previousAmount,
      reason,
      metadata: {
        ...metadata,
        userAgent: req.headers['user-agent'] || 'unknown',
        ipAddress: req.ip || req.connection.remoteAddress || 'unknown'
      }
    };
    
    // Update settings
    settings.cashFloat.currentAmount = amount;
    settings.cashFloat.auditTrail.push(auditEntry);
    
    // Keep only the last 100 audit entries
    if (settings.cashFloat.auditTrail.length > 100) {
      settings.cashFloat.auditTrail = settings.cashFloat.auditTrail.slice(-100);
    }
    
    await settings.save();
    
    res.json({
      success: true,
      data: {
        currentAmount: amount,
        previousAmount,
        auditEntry
      },
      message: 'Cash float amount updated successfully'
    });
  } catch (error) {
    console.error('Error setting cash float:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to set cash float amount',
      error: error.message
    });
  }
};

// Process a cash transaction (reduce float for change)
const processCashTransaction = async (req, res) => {
  try {
    const { orderId, cashReceived, orderTotal, changeGiven, metadata = {} } = req.body;
    
    if (changeGiven === undefined || changeGiven < 0) {
      return res.status(400).json({
        success: false,
        message: 'Valid change amount is required'
      });
    }
    
    const settings = await Settings.getSettings();
    const previousAmount = settings.cashFloat.currentAmount;
    
    // Check if we have enough cash float for the change
    if (changeGiven > previousAmount) {
      return res.status(400).json({
        success: false,
        message: `Insufficient cash float. Cannot provide ₱${changeGiven.toFixed(2)} change. Cash float only has ₱${previousAmount.toFixed(2)}`,
        shortfall: changeGiven - previousAmount
      });
    }
    
    const newAmount = Math.max(0, previousAmount - changeGiven);
    
    // Create audit entry
    const auditEntry = {
      timestamp: new Date().toISOString(),
      action: 'transaction',
      previousAmount,
      newAmount,
      change: -changeGiven,
      reason: 'cash_transaction',
      metadata: {
        orderId,
        cashReceived,
        orderTotal,
        changeGiven,
        ...metadata,
        userAgent: req.headers['user-agent'] || 'unknown',
        ipAddress: req.ip || req.connection.remoteAddress || 'unknown'
      }
    };
    
    // Update settings
    settings.cashFloat.currentAmount = newAmount;
    settings.cashFloat.auditTrail.push(auditEntry);
    
    // Keep only the last 100 audit entries
    if (settings.cashFloat.auditTrail.length > 100) {
      settings.cashFloat.auditTrail = settings.cashFloat.auditTrail.slice(-100);
    }
    
    await settings.save();
    
    res.json({
      success: true,
      data: {
        previousAmount,
        newAmount,
        changeGiven,
        auditEntry
      },
      message: 'Cash transaction processed successfully'
    });
  } catch (error) {
    console.error('Error processing cash transaction:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to process cash transaction',
      error: error.message
    });
  }
};

// Configure daily reset settings
const configureDailyReset = async (req, res) => {
  try {
    const { enabled, amount } = req.body;
    
    if (enabled && (amount === undefined || amount <= 0)) {
      return res.status(400).json({
        success: false,
        message: 'Reset amount must be greater than zero when daily reset is enabled'
      });
    }
    
    const settings = await Settings.getSettings();
    
    settings.cashFloat.dailyResetSettings = {
      enabled: Boolean(enabled),
      amount: enabled && amount !== undefined ? amount : settings.cashFloat.dailyResetSettings.amount
    };
    
    await settings.save();
    
    res.json({
      success: true,
      data: settings.cashFloat.dailyResetSettings,
      message: 'Daily reset settings updated successfully'
    });
  } catch (error) {
    console.error('Error configuring daily reset:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to configure daily reset settings',
      error: error.message
    });
  }
};

// Perform daily reset
const performDailyReset = async (req, res) => {
  try {
    const settings = await Settings.getSettings();
    
    if (!settings.cashFloat.dailyResetSettings.enabled) {
      return res.status(400).json({
        success: false,
        message: 'Daily reset is not enabled'
      });
    }
    
    const previousAmount = settings.cashFloat.currentAmount;
    const resetAmount = settings.cashFloat.dailyResetSettings.amount;
    
    // Create audit entry
    const auditEntry = {
      timestamp: new Date().toISOString(),
      action: 'daily_reset',
      previousAmount,
      newAmount: resetAmount,
      change: resetAmount - previousAmount,
      reason: 'daily_reset',
      metadata: {
        resetDate: new Date().toDateString(),
        userAgent: req.headers['user-agent'] || 'unknown',
        ipAddress: req.ip || req.connection.remoteAddress || 'unknown'
      }
    };
    
    // Update settings
    settings.cashFloat.currentAmount = resetAmount;
    settings.cashFloat.lastResetDate = new Date().toDateString();
    settings.cashFloat.auditTrail.push(auditEntry);
    
    // Keep only the last 100 audit entries
    if (settings.cashFloat.auditTrail.length > 100) {
      settings.cashFloat.auditTrail = settings.cashFloat.auditTrail.slice(-100);
    }
    
    await settings.save();
    
    res.json({
      success: true,
      data: {
        previousAmount,
        newAmount: resetAmount,
        auditEntry
      },
      message: 'Daily reset performed successfully'
    });
  } catch (error) {
    console.error('Error performing daily reset:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to perform daily reset',
      error: error.message
    });
  }
};

// Get audit trail with optional filtering
const getAuditTrail = async (req, res) => {
  try {
    const { limit, dateFrom, dateTo, action } = req.query;
    
    const settings = await Settings.getSettings();
    let trail = [...settings.cashFloat.auditTrail];
    
    // Apply filters
    if (dateFrom) {
      const fromDate = new Date(dateFrom);
      trail = trail.filter(entry => new Date(entry.timestamp) >= fromDate);
    }
    
    if (dateTo) {
      const toDate = new Date(dateTo);
      trail = trail.filter(entry => new Date(entry.timestamp) <= toDate);
    }
    
    if (action) {
      trail = trail.filter(entry => entry.action === action);
    }
    
    // Apply limit
    if (limit) {
      const limitNum = parseInt(limit);
      trail = trail.slice(-limitNum);
    }
    
    res.json({
      success: true,
      data: trail,
      count: trail.length
    });
  } catch (error) {
    console.error('Error fetching audit trail:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch audit trail',
      error: error.message
    });
  }
};

// ========================================
// PAYMENT GATEWAY CONTROLLERS (PayMongo Integration)
// ========================================

// Get payment gateway settings (public endpoint for payment option display)
const getPaymentGateways = async (req, res) => {
  try {
    const settings = await Settings.getSettings();
    
    // Only return gateway availability (not sensitive config details)
    const publicGatewayData = {
      paymongo: {
        enabled: settings.paymentGateways?.paymongo?.enabled || false,
        gcashEnabled: settings.paymentGateways?.paymongo?.gcashEnabled || false,
        paymayaEnabled: settings.paymentGateways?.paymongo?.paymayaEnabled || false
      }
    };
    
    res.json({
      success: true,
      data: publicGatewayData
    });
  } catch (error) {
    console.error('Error fetching payment gateway settings:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch payment gateway settings',
      error: error.message
    });
  }
};

// Update payment gateway settings (admin only)
const updatePaymentGateways = async (req, res) => {
  try {
    const { paymongo } = req.body;
    
    // Validate PayMongo settings if provided
    if (paymongo) {
      if (typeof paymongo.enabled !== 'boolean') {
        return res.status(400).json({
          success: false,
          message: 'PayMongo enabled status must be a boolean'
        });
      }
    }
    
    const settings = await Settings.getSettings();
    
    // Update PayMongo gateway settings
    if (paymongo) {
      console.log('Updating PayMongo settings with:', paymongo);
      settings.paymentGateways = settings.paymentGateways || {};
      settings.paymentGateways.paymongo = {
        ...settings.paymentGateways.paymongo,
        ...paymongo
      };
      console.log('Updated PayMongo settings:', settings.paymentGateways.paymongo);
    }
    
    await settings.save();
    
    res.json({
      success: true,
      message: 'Payment gateway settings updated successfully',
      data: settings.paymentGateways
    });
  } catch (error) {
    console.error('Error updating payment gateway settings:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update payment gateway settings',
      error: error.message
    });
  }
};

module.exports = {
  getSettings,
  getCashFloatSettings,
  updateCashFloatSettings,
  setCashFloat,
  processCashTransaction,
  configureDailyReset,
  performDailyReset,
  getAuditTrail,
  getPaymentGateways,
  updatePaymentGateways
};
