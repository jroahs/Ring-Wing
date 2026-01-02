import { useState, useEffect, useCallback, useRef } from 'react';
import { API_URL } from '../App';

/**
 * Server health states
 * @typedef {'unknown' | 'checking' | 'healthy' | 'cold-starting' | 'error'} ServerStatus
 */

/**
 * Hook to monitor server health and detect cold starts
 * Useful for Render free tier which spins down after 15 minutes of inactivity
 * 
 * @param {Object} options - Configuration options
 * @param {boolean} options.autoCheck - Whether to check on mount (default: true)
 * @param {number} options.coldStartTimeout - Timeout before considering server cold (default: 5000ms)
 * @param {number} options.maxRetries - Max retry attempts during cold start (default: 5)
 * @param {number} options.retryDelay - Base delay between retries in ms (default: 3000)
 * @param {number} options.minOverlayDisplayTime - Minimum time to show cold start overlay (default: 2000ms)
 * @returns {Object} Server health state and control functions
 */
export const useServerHealth = (options = {}) => {
  const {
    autoCheck = true,
    coldStartTimeout = 5000,
    maxRetries = 5,
    retryDelay = 3000,
    minOverlayDisplayTime = 2000 // Minimum time to show overlay to prevent flashing
  } = options;

  const [serverStatus, setServerStatus] = useState('unknown');
  const [lastCheckTime, setLastCheckTime] = useState(null);
  const [retryCount, setRetryCount] = useState(0);
  const [estimatedWaitTime, setEstimatedWaitTime] = useState(null);
  const [stableIsColdStarting, setStableIsColdStarting] = useState(false); // Debounced cold start state
  const abortControllerRef = useRef(null);
  const retryTimeoutRef = useRef(null);
  const coldStartDisplayTimeoutRef = useRef(null);
  const coldStartStartTimeRef = useRef(null);

  /**
   * Clean up any pending requests or timeouts
   */
  const cleanup = useCallback(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }
    if (retryTimeoutRef.current) {
      clearTimeout(retryTimeoutRef.current);
      retryTimeoutRef.current = null;
    }
    if (coldStartDisplayTimeoutRef.current) {
      clearTimeout(coldStartDisplayTimeoutRef.current);
      coldStartDisplayTimeoutRef.current = null;
    }
  }, []);

  // Debounce cold start state to prevent flashing
  useEffect(() => {
    const isColdStartingNow = serverStatus === 'cold-starting';
    
    if (isColdStartingNow && !stableIsColdStarting) {
      // Entering cold start - show immediately
      setStableIsColdStarting(true);
      coldStartStartTimeRef.current = Date.now();
    } else if (!isColdStartingNow && stableIsColdStarting) {
      // Exiting cold start - ensure minimum display time
      const elapsed = Date.now() - (coldStartStartTimeRef.current || 0);
      const remainingTime = Math.max(0, minOverlayDisplayTime - elapsed);
      
      if (remainingTime > 0) {
        // Wait for minimum display time before hiding
        coldStartDisplayTimeoutRef.current = setTimeout(() => {
          setStableIsColdStarting(false);
        }, remainingTime);
      } else {
        setStableIsColdStarting(false);
      }
    }
    
    return () => {
      if (coldStartDisplayTimeoutRef.current) {
        clearTimeout(coldStartDisplayTimeoutRef.current);
      }
    };
  }, [serverStatus, stableIsColdStarting, minOverlayDisplayTime]);

  /**
   * Perform a health check against the server
   */
  const checkHealth = useCallback(async (isRetry = false) => {
    cleanup();

    if (!isRetry) {
      setRetryCount(0);
      setEstimatedWaitTime(null);
    }

    setServerStatus('checking');
    abortControllerRef.current = new AbortController();

    try {
      const startTime = Date.now();
      
      // Use simple fetch without custom headers to avoid CORS preflight issues
      const response = await fetch(`${API_URL}/api/health`, {
        method: 'GET',
        signal: abortControllerRef.current.signal
      });

      const latency = Date.now() - startTime;
      setLastCheckTime(new Date());

      if (response.ok) {
        // Server responded - check if it was slow (just waking up)
        if (latency > coldStartTimeout) {
          console.log(`[ServerHealth] Server responded but was slow (${latency}ms) - likely just woke up`);
        } else {
          console.log(`[ServerHealth] Server healthy (${latency}ms)`);
        }
        setServerStatus('healthy');
        setRetryCount(0);
        setEstimatedWaitTime(null);
        return true;
      } else {
        console.warn(`[ServerHealth] Server responded with error: ${response.status}`);
        setServerStatus('error');
        return false;
      }
    } catch (error) {
      if (error.name === 'AbortError') {
        console.log('[ServerHealth] Health check aborted');
        return false;
      }

      console.warn('[ServerHealth] Health check failed:', error.message);

      // Determine if this is likely a cold start
      const isTimeoutOrNetwork = 
        error.message.includes('timeout') ||
        error.message.includes('Failed to fetch') ||
        error.message.includes('NetworkError') ||
        error.message.includes('network');

      if (isTimeoutOrNetwork && retryCount < maxRetries) {
        setServerStatus('cold-starting');
        const newRetryCount = retryCount + 1;
        setRetryCount(newRetryCount);
        
        // Estimate remaining wait time (rough calculation)
        const remainingRetries = maxRetries - newRetryCount;
        const estimatedSeconds = Math.ceil((remainingRetries * retryDelay) / 1000);
        setEstimatedWaitTime(estimatedSeconds > 0 ? estimatedSeconds : null);

        console.log(`[ServerHealth] Cold start detected, retry ${newRetryCount}/${maxRetries} in ${retryDelay}ms`);

        // Schedule retry with exponential backoff
        const backoffDelay = retryDelay * Math.pow(1.2, newRetryCount - 1);
        retryTimeoutRef.current = setTimeout(() => {
          checkHealth(true);
        }, backoffDelay);

        return false;
      } else {
        setServerStatus('error');
        setEstimatedWaitTime(null);
        return false;
      }
    }
  }, [cleanup, coldStartTimeout, maxRetries, retryCount, retryDelay]);

  /**
   * Force a health check
   */
  const refresh = useCallback(() => {
    return checkHealth(false);
  }, [checkHealth]);

  /**
   * Reset state and stop any pending checks
   */
  const reset = useCallback(() => {
    cleanup();
    setServerStatus('unknown');
    setRetryCount(0);
    setEstimatedWaitTime(null);
  }, [cleanup]);

  // Auto-check on mount if enabled
  useEffect(() => {
    if (autoCheck) {
      // Small delay to allow app to initialize
      const initTimeout = setTimeout(() => {
        checkHealth(false);
      }, 100);

      return () => {
        clearTimeout(initTimeout);
        cleanup();
      };
    }
    return cleanup;
  }, [autoCheck, checkHealth, cleanup]);

  // Cleanup on unmount
  useEffect(() => {
    return cleanup;
  }, [cleanup]);

  return {
    /** Current server status */
    serverStatus,
    /** Whether server is currently healthy */
    isHealthy: serverStatus === 'healthy',
    /** Whether server is in cold start recovery (stabilized to prevent flashing) */
    isColdStarting: stableIsColdStarting,
    /** Whether there's an error reaching the server */
    isError: serverStatus === 'error',
    /** Whether a check is in progress */
    isChecking: serverStatus === 'checking',
    /** Last successful check time */
    lastCheckTime,
    /** Current retry count during cold start */
    retryCount,
    /** Max retry attempts */
    maxRetries,
    /** Estimated wait time in seconds (during cold start) */
    estimatedWaitTime,
    /** Force a health check */
    refresh,
    /** Reset state and cancel pending checks */
    reset
  };
};

export default useServerHealth;
