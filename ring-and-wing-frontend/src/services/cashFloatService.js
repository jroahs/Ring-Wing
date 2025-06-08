/**
 * Centralized Cash Float Management Service
 * 
 * This service handles all cash float operations to ensure consistency,
 * proper validation, and synchronization across the application.
 */

class CashFloatService {
  constructor() {
    this.listeners = new Set();
    this.currentFloat = 0;
    this.dailyResetSettings = {
      enabled: false,
      amount: 1000
    };
    this.auditTrail = [];
    this.lastResetDate = null;
    
    // Initialize from localStorage
    this.loadFromStorage();
    
    // Check for daily reset on service initialization
    this.checkDailyReset();
    
    // Notify listeners that the service has been initialized
    this.notifyListeners('service_initialized', {
      currentFloat: this.currentFloat,
      settings: this.dailyResetSettings
    });
  }

  /**
   * Enhanced currency formatting and validation utilities
   */
  formatCurrency(amount) {
    if (amount === null || amount === undefined || isNaN(amount)) return '0.00';
    return Number(amount).toFixed(2);
  }

  parseCurrency(value) {
    if (!value || value === '') return 0;
    const parsed = parseFloat(value.toString().replace(/[^\d.-]/g, ''));
    return isNaN(parsed) ? 0 : Math.max(0, parsed);
  }

  /**
   * Validation functions
   */
  validateAmount(amount, context = 'general') {
    const numAmount = this.parseCurrency(amount);
    
    if (numAmount < 0) {
      return 'Amount cannot be negative';
    }
    
    if (context === 'reset' && numAmount <= 0) {
      return 'Reset amount must be greater than zero';
    }
    
    if (context === 'reset' && numAmount > 50000) {
      return 'Reset amount seems unusually high (max: ₱50,000)';
    }
    
    if (context === 'reset' && numAmount < 100) {
      return 'Reset amount might be too low for daily operations (min: ₱100)';
    }
    
    if (context === 'manual' && numAmount > 100000) {
      return 'Cash float amount seems unusually high (max: ₱100,000)';
    }
    
    return '';
  }

  validateChange(cashAmount, total) {
    const numCashAmount = this.parseCurrency(cashAmount);
    const numTotal = this.parseCurrency(total);
    const change = numCashAmount - numTotal;
    
    if (change > this.currentFloat) {
      return {
        valid: false,
        message: `Cannot provide ₱${this.formatCurrency(change)} change. Cash float only has ₱${this.formatCurrency(this.currentFloat)}`,
        shortfall: change - this.currentFloat
      };
    }
    
    return { valid: true, change };
  }

  /**
   * Get current cash float
   */
  getCurrentFloat() {
    return this.currentFloat;
  }

  /**
   * Set cash float with validation and audit trail
   */
  async setFloat(amount, reason = 'manual_adjustment', metadata = {}) {
    const validationError = this.validateAmount(amount, 'manual');
    if (validationError) {
      throw new Error(validationError);
    }

    const numAmount = this.parseCurrency(amount);
    const previousAmount = this.currentFloat;
    
    // Create audit entry
    const auditEntry = {
      timestamp: new Date().toISOString(),
      action: 'set_float',
      previousAmount,
      newAmount: numAmount,
      change: numAmount - previousAmount,
      reason,
      metadata: {
        ...metadata,
        userAgent: navigator.userAgent,
        sessionId: this.getSessionId()
      }
    };

    // Update float
    this.currentFloat = numAmount;
    this.auditTrail.push(auditEntry);
    
    // Persist to storage
    await this.saveToStorage();
    
    // Notify listeners
    this.notifyListeners({
      type: 'float_updated',
      previousAmount,
      newAmount: numAmount,
      reason,
      auditEntry
    });

    return auditEntry;
  }

  /**
   * Process a cash transaction (reduce float for change)
   */  async processTransaction(cashAmount, orderTotal, orderId = null) {
    const numCashAmount = this.parseCurrency(cashAmount);
    const numTotal = this.parseCurrency(orderTotal);
    
    if (numCashAmount < numTotal) {
      throw new Error(`Insufficient cash amount. Need ₱${this.formatCurrency(numTotal - numCashAmount)} more`);
    }

    const change = numCashAmount - numTotal;
    
    // Validate if we can provide change
    const changeValidation = this.validateChange(cashAmount, orderTotal);
    if (!changeValidation.valid) {
      throw new Error(changeValidation.message);
    }    // Process the transaction
    const previousFloat = this.currentFloat;
    const newFloat = Math.max(0, this.currentFloat - change);
    
    const auditEntry = {
      timestamp: new Date().toISOString(),
      action: 'transaction',
      previousAmount: previousFloat,
      newAmount: newFloat,
      change: -change,
      reason: 'cash_transaction',
      metadata: {
        orderId,
        cashReceived: numCashAmount,
        orderTotal: numTotal,
        changeGiven: change,
        sessionId: this.getSessionId()
      }
    };

    this.currentFloat = newFloat;
    this.auditTrail.push(auditEntry);
    
    await this.saveToStorage();
    
    this.notifyListeners({
      type: 'transaction_processed',
      previousFloat,
      newFloat,
      changeGiven: change,
      auditEntry
    });

    return {
      success: true,
      changeGiven: change,
      newFloat,
      auditEntry
    };
  }

  /**
   * Configure daily reset settings
   */
  async configureDailyReset(enabled, amount = null) {
    if (enabled && amount !== null) {
      const validationError = this.validateAmount(amount, 'reset');
      if (validationError) {
        throw new Error(validationError);
      }
    }

    this.dailyResetSettings = {
      enabled,
      amount: enabled && amount !== null ? this.parseCurrency(amount) : this.dailyResetSettings.amount
    };

    await this.saveToStorage();
    
    this.notifyListeners({
      type: 'reset_settings_updated',
      settings: this.dailyResetSettings
    });

    return this.dailyResetSettings;
  }

  /**
   * Check and perform daily reset if needed
   */
  async checkDailyReset() {
    if (!this.dailyResetSettings.enabled) return false;

    const today = new Date().toDateString();
    
    if (this.lastResetDate !== today) {
      await this.performDailyReset();
      return true;
    }
    
    return false;
  }

  /**
   * Perform daily reset
   */
  async performDailyReset() {
    const previousAmount = this.currentFloat;
    const resetAmount = this.dailyResetSettings.amount;
    
    const auditEntry = {
      timestamp: new Date().toISOString(),
      action: 'daily_reset',
      previousAmount,
      newAmount: resetAmount,
      change: resetAmount - previousAmount,
      reason: 'daily_reset',
      metadata: {
        resetDate: new Date().toDateString(),
        sessionId: this.getSessionId()
      }
    };

    this.currentFloat = resetAmount;
    this.lastResetDate = new Date().toDateString();
    this.auditTrail.push(auditEntry);
    
    await this.saveToStorage();
    
    this.notifyListeners({
      type: 'daily_reset_performed',
      previousAmount,
      newAmount: resetAmount,
      auditEntry
    });

    return auditEntry;
  }

  /**
   * Get audit trail with optional filtering
   */
  getAuditTrail(options = {}) {
    let trail = [...this.auditTrail];
    
    if (options.limit) {
      trail = trail.slice(-options.limit);
    }
    
    if (options.dateFrom) {
      const fromDate = new Date(options.dateFrom);
      trail = trail.filter(entry => new Date(entry.timestamp) >= fromDate);
    }
    
    if (options.dateTo) {
      const toDate = new Date(options.dateTo);
      trail = trail.filter(entry => new Date(entry.timestamp) <= toDate);
    }
    
    if (options.action) {
      trail = trail.filter(entry => entry.action === options.action);
    }
    
    return trail;
  }

  /**
   * Get daily summary statistics
   */
  getDailySummary(date = new Date()) {
    const dateString = date.toDateString();
    const dayEntries = this.auditTrail.filter(entry => 
      new Date(entry.timestamp).toDateString() === dateString
    );

    const transactions = dayEntries.filter(entry => entry.action === 'transaction');
    const adjustments = dayEntries.filter(entry => 
      entry.action === 'set_float' || entry.action === 'daily_reset'
    );

    const totalChangeGiven = transactions.reduce((sum, entry) => 
      sum + Math.abs(entry.change), 0
    );

    const totalTransactions = transactions.length;

    return {
      date: dateString,
      totalTransactions,
      totalChangeGiven,
      adjustments: adjustments.length,
      startingFloat: adjustments.length > 0 ? adjustments[0].newAmount : null,
      endingFloat: this.currentFloat,
      entries: dayEntries
    };
  }

  /**
   * Event listener management
   */
  subscribe(listener) {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  notifyListeners(event) {
    this.listeners.forEach(listener => {
      try {
        listener(event);
      } catch (error) {
        console.error('Error in cash float listener:', error);
      }
    });
  }

  /**
   * Persistence methods
   */
  async saveToStorage() {
    try {
      const data = {
        currentFloat: this.currentFloat,
        dailyResetSettings: this.dailyResetSettings,
        auditTrail: this.auditTrail.slice(-100), // Keep last 100 entries
        lastResetDate: this.lastResetDate,
        lastSaved: new Date().toISOString()
      };
      
      localStorage.setItem('cashFloatData', JSON.stringify(data));
    } catch (error) {
      console.error('Error saving cash float data:', error);
    }
  }  loadFromStorage() {
    try {
      const stored = localStorage.getItem('cashFloatData');
      if (stored) {
        const data = JSON.parse(stored);
        this.currentFloat = data.currentFloat || 0;
        this.dailyResetSettings = data.dailyResetSettings || {
          enabled: false,
          amount: 1000
        };
        this.auditTrail = data.auditTrail || [];
        this.lastResetDate = data.lastResetDate || null;
      } else {
        // Initialize with a reasonable default cash float amount
        this.currentFloat = 1000; // Default ₱1000 cash float
        this.dailyResetSettings = {
          enabled: false,
          amount: 1000
        };
        this.auditTrail = [{
          id: 'init-' + Date.now(),
          timestamp: new Date().toISOString(),
          action: 'initialize',
          reason: 'first_time_setup',
          amount: 1000,
          previousAmount: 0,
          metadata: {
            source: 'service_initialization',
            note: 'Default cash float set for first-time use'
          }
        }];
        this.lastResetDate = null;
        
        // Save the initial setup to localStorage
        this.saveToStorage();
      }
    } catch (error) {
      console.error('Error loading cash float data:', error);
      // Reset to defaults on error
      this.currentFloat = 1000; // Even on error, start with a reasonable default
      this.dailyResetSettings = { enabled: false, amount: 1000 };
      this.auditTrail = [];
      this.lastResetDate = null;
      this.saveToStorage();
    }
  }

  /**
   * Utility methods
   */
  getSessionId() {
    if (!window.cashFloatSessionId) {
      window.cashFloatSessionId = 'cf_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
    }
    return window.cashFloatSessionId;
  }

  /**
   * Export data for backup/reporting
   */
  exportData() {
    return {
      currentFloat: this.currentFloat,
      dailyResetSettings: this.dailyResetSettings,
      auditTrail: this.auditTrail,
      lastResetDate: this.lastResetDate,
      exportTimestamp: new Date().toISOString(),
      version: '1.0.0'
    };
  }

  /**
   * Import data (for restoration)
   */
  async importData(data, options = { merge: false }) {
    try {
      if (options.merge) {
        // Merge audit trails
        const existingTimestamps = new Set(this.auditTrail.map(e => e.timestamp));
        const newEntries = data.auditTrail.filter(e => !existingTimestamps.has(e.timestamp));
        this.auditTrail = [...this.auditTrail, ...newEntries].sort((a, b) => 
          new Date(a.timestamp) - new Date(b.timestamp)
        );
      } else {
        // Replace everything
        this.auditTrail = data.auditTrail || [];
      }

      this.currentFloat = data.currentFloat || 0;
      this.dailyResetSettings = data.dailyResetSettings || { enabled: false, amount: 1000 };
      this.lastResetDate = data.lastResetDate || null;

      await this.saveToStorage();
      
      this.notifyListeners({
        type: 'data_imported',
        merge: options.merge,
        entriesCount: data.auditTrail?.length || 0
      });

      return true;
    } catch (error) {
      console.error('Error importing cash float data:', error);
      throw error;
    }
  }
}

// Create singleton instance
const cashFloatService = new CashFloatService();

export default cashFloatService;
