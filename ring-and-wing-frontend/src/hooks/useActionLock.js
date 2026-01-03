import { useState, useCallback, useRef } from 'react';

/**
 * useActionLock Hook
 * 
 * Provides action finality and state locking for the self-checkout system.
 * Prevents duplicate triggers of the same action and provides feedback states.
 * 
 * Key Principles:
 * - One user intent → one system action → one confirmation
 * - Clear "point of no return" for each action
 * - UI elements freeze during action processing
 * - Control returns to user after confirmation
 */

// Action states
export const ACTION_STATES = {
  IDLE: 'idle',
  PROCESSING: 'processing',
  SUCCESS: 'success',
  ERROR: 'error'
};

// Default timing configuration (in milliseconds)
const DEFAULT_CONFIG = {
  successDuration: 1500,  // How long to show success state
  errorDuration: 2000,    // How long to show error state
  debounceMs: 300        // Minimum time between same actions
};

/**
 * Hook for managing action locks on individual items
 * Use this for add-to-cart buttons, quantity updates, etc.
 */
export const useActionLock = (config = {}) => {
  const settings = { ...DEFAULT_CONFIG, ...config };
  
  // Track state per action key (e.g., item ID + size)
  const [actionStates, setActionStates] = useState({});
  const lastActionTimeRef = useRef({});
  const timeoutRefs = useRef({});

  /**
   * Generate a unique key for an action
   */
  const getActionKey = useCallback((itemId, actionType = 'add', size = '') => {
    return `${actionType}_${itemId}_${size}`;
  }, []);

  /**
   * Check if an action is currently locked (processing or in success/error state)
   */
  const isLocked = useCallback((itemId, actionType = 'add', size = '') => {
    const key = getActionKey(itemId, actionType, size);
    const state = actionStates[key];
    return state === ACTION_STATES.PROCESSING || state === ACTION_STATES.SUCCESS;
  }, [actionStates, getActionKey]);

  /**
   * Get the current state of an action
   */
  const getState = useCallback((itemId, actionType = 'add', size = '') => {
    const key = getActionKey(itemId, actionType, size);
    return actionStates[key] || ACTION_STATES.IDLE;
  }, [actionStates, getActionKey]);

  /**
   * Check if action should be debounced
   */
  const shouldDebounce = useCallback((itemId, actionType = 'add', size = '') => {
    const key = getActionKey(itemId, actionType, size);
    const lastTime = lastActionTimeRef.current[key] || 0;
    const now = Date.now();
    return (now - lastTime) < settings.debounceMs;
  }, [getActionKey, settings.debounceMs]);

  /**
   * Execute an action with locking
   * @param {string} itemId - Unique identifier for the item
   * @param {Function} action - Async function to execute
   * @param {Object} options - { actionType, size, onSuccess, onError, suppressNotification }
   * @returns {Promise<boolean>} - Whether the action was executed successfully
   */
  const executeAction = useCallback(async (itemId, action, options = {}) => {
    const { 
      actionType = 'add', 
      size = '', 
      onSuccess, 
      onError,
      suppressNotification = false 
    } = options;
    
    const key = getActionKey(itemId, actionType, size);

    // Check if already locked or should debounce
    if (isLocked(itemId, actionType, size)) {
      console.log(`[ActionLock] Action ${key} is locked, ignoring duplicate trigger`);
      return false;
    }

    if (shouldDebounce(itemId, actionType, size)) {
      console.log(`[ActionLock] Action ${key} debounced`);
      return false;
    }

    // Clear any existing timeout for this action
    if (timeoutRefs.current[key]) {
      clearTimeout(timeoutRefs.current[key]);
    }

    // Record action time
    lastActionTimeRef.current[key] = Date.now();

    // Set processing state
    setActionStates(prev => ({ ...prev, [key]: ACTION_STATES.PROCESSING }));

    try {
      // Execute the action
      const result = await action();

      // Set success state
      setActionStates(prev => ({ ...prev, [key]: ACTION_STATES.SUCCESS }));

      // Call success callback
      if (onSuccess) {
        onSuccess(result, { suppressNotification });
      }

      // Return to idle after success duration
      timeoutRefs.current[key] = setTimeout(() => {
        setActionStates(prev => ({ ...prev, [key]: ACTION_STATES.IDLE }));
      }, settings.successDuration);

      return true;

    } catch (error) {
      console.error(`[ActionLock] Action ${key} failed:`, error);

      // Set error state
      setActionStates(prev => ({ ...prev, [key]: ACTION_STATES.ERROR }));

      // Call error callback
      if (onError) {
        onError(error);
      }

      // Return to idle after error duration
      timeoutRefs.current[key] = setTimeout(() => {
        setActionStates(prev => ({ ...prev, [key]: ACTION_STATES.IDLE }));
      }, settings.errorDuration);

      return false;
    }
  }, [getActionKey, isLocked, shouldDebounce, settings]);

  /**
   * Manually reset an action state to idle
   */
  const resetAction = useCallback((itemId, actionType = 'add', size = '') => {
    const key = getActionKey(itemId, actionType, size);
    
    if (timeoutRefs.current[key]) {
      clearTimeout(timeoutRefs.current[key]);
    }
    
    setActionStates(prev => ({ ...prev, [key]: ACTION_STATES.IDLE }));
  }, [getActionKey]);

  /**
   * Reset all action states
   */
  const resetAll = useCallback(() => {
    Object.values(timeoutRefs.current).forEach(timeout => clearTimeout(timeout));
    timeoutRefs.current = {};
    lastActionTimeRef.current = {};
    setActionStates({});
  }, []);

  return {
    isLocked,
    getState,
    executeAction,
    resetAction,
    resetAll,
    ACTION_STATES
  };
};

/**
 * Hook for global action states (e.g., checkout, AI processing)
 */
export const useGlobalActionLock = () => {
  const [globalStates, setGlobalStates] = useState({
    isAIProcessing: false,
    isCheckoutProcessing: false,
    isCartMutating: false
  });

  const setAIProcessing = useCallback((isProcessing) => {
    setGlobalStates(prev => ({ ...prev, isAIProcessing: isProcessing }));
  }, []);

  const setCheckoutProcessing = useCallback((isProcessing) => {
    setGlobalStates(prev => ({ ...prev, isCheckoutProcessing: isProcessing }));
  }, []);

  const setCartMutating = useCallback((isMutating) => {
    setGlobalStates(prev => ({ ...prev, isCartMutating: isMutating }));
  }, []);

  return {
    ...globalStates,
    setAIProcessing,
    setCheckoutProcessing,
    setCartMutating
  };
};

export default useActionLock;
