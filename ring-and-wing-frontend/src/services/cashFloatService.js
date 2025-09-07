/**
 * Centralized Cash Float Management Service
 * 
 * This service handles all cash float operations to ensure consistency,
 * proper validation, and synchronization across the application.
 * Now with backend persistence support.
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
    this.isInitialized = false;
    this.backendAvailable = false;
    
    // Initialize from backend first, fallback to localStorage
    this.initialize();
  }

  /**
   * Initialize the service by loading data from backend
   */
  async initialize() {
    if (this.isInitialized) return;
    
    try {
      // Try to load from backend first
      await this.loadFromBackend();
      this.backendAvailable = true;
    } catch (error) {
      console.warn('Backend not available, falling back to localStorage:', error);
      // Fallback to localStorage if backend is unavailable
      this.loadFromStorage();
      this.backendAvailable = false;
    }
    
    // Check for daily reset on service initialization
    await this.checkDailyReset();
    
    this.isInitialized = true;
    
    // Notify listeners that the service has been initialized
    this.notifyListeners('service_initialized', {
      currentFloat: this.currentFloat,
      settings: this.dailyResetSettings,
      backendAvailable: this.backendAvailable
    });
  }

  /**
   * Load cash float data from backend
   */
  async loadFromBackend() {
    const response = await fetch('http://localhost:5000/api/settings/cash-float');
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }
    
    const result = await response.json();
    if (!result.success) {
      throw new Error(result.message || 'Failed to load cash float settings');
    }
    
    const data = result.data;
    this.currentFloat = data.currentAmount || 0;
    this.dailyResetSettings = data.dailyResetSettings || {
      enabled: false,
      amount: 1000
    };
    this.auditTrail = data.auditTrail || [];
    this.lastResetDate = data.lastResetDate || null;
    
    // Also save to localStorage as backup
    this.saveToStorage();
  }

  /**
   * Save cash float data to backend
   */
  async saveToBackend(auditEntry = null) {
    if (!this.backendAvailable) {
      console.warn('Backend not available, saving to localStorage only');
      this.saveToStorage();
      return;
    }
    
    try {
      const payload = {
        currentAmount: this.currentFloat,
        dailyResetSettings: this.dailyResetSettings,
        lastResetDate: this.lastResetDate
      };
      
      if (auditEntry) {
        payload.auditEntry = auditEntry;
      }
      
      const response = await fetch('http://localhost:5000/api/settings/cash-float', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload)
      });
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }
      
      const result = await response.json();
      if (!result.success) {
        throw new Error(result.message || 'Failed to save cash float settings');
      }
      
      // Update local data with backend response
      const data = result.data;
      this.currentFloat = data.currentAmount;
      this.dailyResetSettings = data.dailyResetSettings;
      this.auditTrail = data.auditTrail;
      this.lastResetDate = data.lastResetDate;
      
      // Also save to localStorage as backup
      this.saveToStorage();
      
    } catch (error) {
      console.error('Failed to save to backend, falling back to localStorage:', error);
      this.backendAvailable = false;
      this.saveToStorage();
      throw error;
    }
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

    // Update float locally first
    this.currentFloat = numAmount;
    this.auditTrail.push(auditEntry);
    
    // Try to persist to backend
    try {
      await this.saveToBackend(auditEntry);
    } catch (error) {
      console.error('Backend save failed, keeping local changes:', error);
      // Keep local changes even if backend fails
      this.saveToStorage();
    }
    
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
   */
  async processTransaction(cashAmount, orderTotal, orderId = null) {
    console.log('🔍 CashFloatService.processTransaction - Input values:', {
      cashAmount,
      orderTotal,
      cashAmountType: typeof cashAmount,
      orderTotalType: typeof orderTotal,
      orderId
    });
    
    const numCashAmount = this.parseCurrency(cashAmount);
    const numTotal = this.parseCurrency(orderTotal);
    
    console.log('🔍 CashFloatService.processTransaction - Parsed values:', {
      numCashAmount,
      numTotal,
      difference: numCashAmount - numTotal
    });
    
    if (numCashAmount < numTotal) {
      const shortfall = numTotal - numCashAmount;
      console.error('🚫 Insufficient cash amount:', {
        cashAmount: numCashAmount,
        orderTotal: numTotal,
        shortfall
      });
      throw new Error(`Insufficient cash amount. Need ₱${this.formatCurrency(shortfall)} more`);
    }

    const change = numCashAmount - numTotal;
    
    // Validate if we can provide change
    const changeValidation = this.validateChange(cashAmount, orderTotal);
    if (!changeValidation.valid) {
      throw new Error(changeValidation.message);
    }

    // Process the transaction locally first
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
    
    // Try to persist to backend
    try {
      if (this.backendAvailable) {
        // Use backend API for transaction processing
        const response = await fetch('http://localhost:5000/api/settings/cash-float/transaction', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            orderId,
            cashReceived: numCashAmount,
            orderTotal: numTotal,
            changeGiven: change
          })
        });
        
        if (response.ok) {
          const result = await response.json();
          if (result.success) {
            // Update with backend response
            this.currentFloat = result.data.newAmount;
          }
        } else {
          throw new Error(`HTTP ${response.status}`);
        }
      } else {
        await this.saveToStorage();
      }
    } catch (error) {
      console.error('Backend transaction processing failed, keeping local changes:', error);
      this.saveToStorage();
    }
    
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

    const newSettings = {
      enabled,
      amount: enabled && amount !== null ? this.parseCurrency(amount) : this.dailyResetSettings.amount
    };

    // Update locally first
    this.dailyResetSettings = newSettings;

    // Try to persist to backend
    try {
      if (this.backendAvailable) {
        const response = await fetch('http://localhost:5000/api/settings/cash-float/daily-reset', {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(newSettings)
        });
        
        if (response.ok) {
          const result = await response.json();
          if (result.success) {
            this.dailyResetSettings = result.data;
          }
        } else {
          throw new Error(`HTTP ${response.status}`);
        }
      }
      
      await this.saveToStorage();
    } catch (error) {
      console.error('Backend save failed for daily reset settings:', error);
      this.saveToStorage();
    }
    
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

    // Update locally first
    this.currentFloat = resetAmount;
    this.lastResetDate = new Date().toDateString();
    this.auditTrail.push(auditEntry);
    
    // Try to persist to backend
    try {
      if (this.backendAvailable) {
        const response = await fetch('http://localhost:5000/api/settings/cash-float/daily-reset/perform', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          }
        });
        
        if (response.ok) {
          const result = await response.json();
          if (result.success) {
            // Update with backend response
            this.currentFloat = result.data.newAmount;
          }
        } else {
          throw new Error(`HTTP ${response.status}`);
        }
      }
      
      await this.saveToStorage();
    } catch (error) {
      console.error('Backend daily reset failed, keeping local changes:', error);
      this.saveToStorage();
    }
    
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
   * Get today's starting cash float amount
   * This is the amount the float started with at the beginning of the day,
   * before any transactions reduced it by giving change.
   */
  getTodaysStartingFloat(date = new Date()) {
    const dateString = date.toDateString();
    
    // Get all entries sorted by timestamp
    const sortedEntries = [...this.auditTrail].sort((a, b) => 
      new Date(a.timestamp) - new Date(b.timestamp)
    );
    
    // Find today's entries
    const todayEntries = sortedEntries.filter(entry => 
      new Date(entry.timestamp).toDateString() === dateString
    );
    
    if (todayEntries.length === 0) {
      // No entries for today, check if there was a daily reset or use the current float + all transactions
      const allTransactions = sortedEntries.filter(entry => entry.action === 'transaction');
      const todayTransactions = allTransactions.filter(entry => 
        new Date(entry.timestamp).toDateString() === dateString
      );
      
      // Calculate starting float by adding back all the change given today
      const totalChangeGivenToday = todayTransactions.reduce((sum, entry) => 
        sum + Math.abs(entry.change), 0
      );
      
      return this.currentFloat + totalChangeGivenToday;
    }
    
    // Look for the first entry of the day that sets the float amount
    const firstAdjustment = todayEntries.find(entry => 
      entry.action === 'set_float' || entry.action === 'daily_reset' || entry.action === 'initialize'
    );
    
    if (firstAdjustment) {
      // Found an adjustment entry - this is our starting amount
      return firstAdjustment.newAmount;
    }
    
    // No adjustment found for today, calculate by adding back transactions
    const todayTransactions = todayEntries.filter(entry => entry.action === 'transaction');
    const totalChangeGivenToday = todayTransactions.reduce((sum, entry) => 
      sum + Math.abs(entry.change), 0
    );
    
    // Get the last known float amount from yesterday or before
    const preTodayEntries = sortedEntries.filter(entry => 
      new Date(entry.timestamp).toDateString() !== dateString
    );
    
    if (preTodayEntries.length === 0) {
      // No previous entries, use current + today's transactions
      return this.currentFloat + totalChangeGivenToday;
    }
    
    // Find the last float-setting entry before today
    const lastPreTodayAdjustment = [...preTodayEntries]
      .reverse()
      .find(entry => entry.action === 'set_float' || entry.action === 'daily_reset' || entry.action === 'initialize');
    
    if (lastPreTodayAdjustment) {
      // Calculate what the float would have been after yesterday's transactions
      const yesterdayTransactions = preTodayEntries.filter(entry => 
        entry.action === 'transaction' && 
        new Date(entry.timestamp) > new Date(lastPreTodayAdjustment.timestamp)
      );
      
      const yesterdayChangeGiven = yesterdayTransactions.reduce((sum, entry) => 
        sum + Math.abs(entry.change), 0
      );
      
      return lastPreTodayAdjustment.newAmount - yesterdayChangeGiven + totalChangeGivenToday;
    }
    
    // Fallback: current float + today's transactions
    return this.currentFloat + totalChangeGivenToday;
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
    const startingFloat = this.getTodaysStartingFloat(date);

    return {
      date: dateString,
      totalTransactions,
      totalChangeGiven,
      adjustments: adjustments.length,
      startingFloat,
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
