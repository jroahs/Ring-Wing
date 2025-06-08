import { useState, useEffect, useCallback } from 'react';
import cashFloatService from '../services/cashFloatService';

/**
 * React hook for managing cash float operations
 * 
 * This hook provides a React-friendly interface to the cash float service
 * with automatic state updates and error handling.
 */
export const useCashFloat = () => {
  const [cashFloat, setCashFloat] = useState(cashFloatService.getCurrentFloat());
  const [dailyResetSettings, setDailyResetSettings] = useState(cashFloatService.dailyResetSettings);
  const [auditTrail, setAuditTrail] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  // Subscribe to cash float service events
  useEffect(() => {
    const unsubscribe = cashFloatService.subscribe((event) => {
      switch (event.type) {
        case 'service_initialized':
        case 'float_updated':
        case 'transaction_processed':
        case 'daily_reset_performed':
          setCashFloat(cashFloatService.getCurrentFloat());
          setAuditTrail(cashFloatService.getAuditTrail({ limit: 50 }));
          break;
        case 'reset_settings_updated':
          setDailyResetSettings(event.settings);
          break;
        default:
          break;
      }
    });

    // Initial data load
    setCashFloat(cashFloatService.getCurrentFloat());
    setAuditTrail(cashFloatService.getAuditTrail({ limit: 50 }));
    setDailyResetSettings(cashFloatService.dailyResetSettings);

    return unsubscribe;
  }, []);

  // Set cash float with error handling
  const setFloat = useCallback(async (amount, reason = 'manual_adjustment', metadata = {}) => {
    setIsLoading(true);
    setError(null);
    
    try {
      const auditEntry = await cashFloatService.setFloat(amount, reason, metadata);
      return auditEntry;
    } catch (err) {
      setError(err.message);
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Process a transaction
  const processTransaction = useCallback(async (cashAmount, orderTotal, orderId = null) => {
    setIsLoading(true);
    setError(null);
    
    try {
      const result = await cashFloatService.processTransaction(cashAmount, orderTotal, orderId);
      return result;
    } catch (err) {
      setError(err.message);
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Configure daily reset
  const configureDailyReset = useCallback(async (enabled, amount = null) => {
    setIsLoading(true);
    setError(null);
    
    try {
      const settings = await cashFloatService.configureDailyReset(enabled, amount);
      return settings;
    } catch (err) {
      setError(err.message);
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Validate change can be given
  const validateChange = useCallback((cashAmount, orderTotal) => {
    return cashFloatService.validateChange(cashAmount, orderTotal);
  }, []);

  // Validate amount
  const validateAmount = useCallback((amount, context = 'general') => {
    return cashFloatService.validateAmount(amount, context);
  }, []);

  // Check for daily reset
  const checkDailyReset = useCallback(async () => {
    setIsLoading(true);
    try {
      const resetPerformed = await cashFloatService.checkDailyReset();
      return resetPerformed;
    } catch (err) {
      setError(err.message);
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, []);
  // Get daily summary
  const getDailySummary = useCallback((date = new Date()) => {
    return cashFloatService.getDailySummary(date);
  }, []);

  // Get today's starting float
  const getTodaysStartingFloat = useCallback((date = new Date()) => {
    return cashFloatService.getTodaysStartingFloat(date);
  }, []);

  // Format currency
  const formatCurrency = useCallback((amount) => {
    return cashFloatService.formatCurrency(amount);
  }, []);

  // Parse currency
  const parseCurrency = useCallback((value) => {
    return cashFloatService.parseCurrency(value);
  }, []);

  // Export data
  const exportData = useCallback(() => {
    return cashFloatService.exportData();
  }, []);

  // Import data
  const importData = useCallback(async (data, options = { merge: false }) => {
    setIsLoading(true);
    setError(null);
    
    try {
      const result = await cashFloatService.importData(data, options);
      return result;
    } catch (err) {
      setError(err.message);
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Clear error
  const clearError = useCallback(() => {
    setError(null);
  }, []);
  return {
    // State
    cashFloat,
    dailyResetSettings,
    auditTrail,
    isLoading,
    error,
    
    // Actions
    setFloat,
    processTransaction,
    configureDailyReset,
    checkDailyReset,
    
    // Validation
    validateChange,
    validateAmount,
    
    // Utilities
    formatCurrency,
    parseCurrency,
    getDailySummary,
    getTodaysStartingFloat,
    exportData,
    importData,
    clearError
  };
};

/**
 * Hook for real-time cash float monitoring (lighter weight)
 */
export const useCashFloatMonitor = () => {
  const [cashFloat, setCashFloat] = useState(cashFloatService.getCurrentFloat());
  
  useEffect(() => {
    const unsubscribe = cashFloatService.subscribe((event) => {
      if (['float_updated', 'transaction_processed', 'daily_reset_performed'].includes(event.type)) {
        setCashFloat(cashFloatService.getCurrentFloat());
      }
    });

    return unsubscribe;
  }, []);

  const validateChange = useCallback((cashAmount, orderTotal) => {
    return cashFloatService.validateChange(cashAmount, orderTotal);
  }, []);

  const formatCurrency = useCallback((amount) => {
    return cashFloatService.formatCurrency(amount);
  }, []);

  return {
    cashFloat,
    validateChange,
    formatCurrency
  };
};
