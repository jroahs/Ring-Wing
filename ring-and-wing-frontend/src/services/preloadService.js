/**
 * Preload Service
 * Preloads critical data during app initialization to reduce loading times
 * when users navigate to Payment Verification and Settings pages
 */

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

// Cache storage
const preloadCache = {
  paymentVerification: null,
  paymentSettings: null,
  merchantWallets: null,
  verificationSettings: null,
  lastPreloadTime: null,
  cacheExpiry: 5 * 60 * 1000 // 5 minutes cache validity
};

/**
 * Check if cache is still valid
 */
const isCacheValid = () => {
  if (!preloadCache.lastPreloadTime) return false;
  return (Date.now() - preloadCache.lastPreloadTime) < preloadCache.cacheExpiry;
};

/**
 * Preload payment verification data
 */
export const preloadPaymentVerificationData = async () => {
  try {
    const token = localStorage.getItem('authToken');
    if (!token) return null;

    // Return cached data if valid
    if (isCacheValid() && preloadCache.paymentVerification) {
      return preloadCache.paymentVerification;
    }

    const response = await fetch(`${API_URL}/api/orders/pending-verification?verificationStatus=pending`, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });

    if (!response.ok) {
      console.warn('Failed to preload payment verification data');
      return null;
    }

    const data = await response.json();
    preloadCache.paymentVerification = data;
    preloadCache.lastPreloadTime = Date.now();

    return data;
  } catch (error) {
    console.warn('[preloadService] Payment verification preload error:', error);
    return null;
  }
};

/**
 * Preload payment settings data
 */
export const preloadPaymentSettingsData = async () => {
  try {
    const token = localStorage.getItem('authToken');
    if (!token) return null;

    // Return cached data if valid
    if (isCacheValid() && preloadCache.merchantWallets && preloadCache.verificationSettings) {
      return {
        merchantWallets: preloadCache.merchantWallets,
        verificationSettings: preloadCache.verificationSettings
      };
    }

    // Fetch merchant wallets
    const walletsResponse = await fetch(`${API_URL}/api/settings/merchant-wallets`, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });

    if (!walletsResponse.ok) {
      console.warn('Failed to preload merchant wallets');
      return null;
    }

    const walletsData = await walletsResponse.json();
    preloadCache.merchantWallets = walletsData;

    // Fetch payment verification settings
    const verificationResponse = await fetch(`${API_URL}/api/settings/payment-verification`, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });

    if (!verificationResponse.ok) {
      console.warn('Failed to preload payment verification settings');
      return null;
    }

    const verificationData = await verificationResponse.json();
    preloadCache.verificationSettings = verificationData;
    preloadCache.lastPreloadTime = Date.now();

    return {
      merchantWallets: walletsData,
      verificationSettings: verificationData
    };
  } catch (error) {
    console.warn('[preloadService] Payment settings preload error:', error);
    return null;
  }
};

/**
 * Preload all critical data in parallel
 */
export const preloadAllCriticalData = async () => {
  try {
    const results = await Promise.allSettled([
      preloadPaymentVerificationData(),
      preloadPaymentSettingsData()
    ]);

    console.log('[preloadService] Preload completed:', {
      paymentVerification: results[0].status,
      paymentSettings: results[1].status
    });

    return results;
  } catch (error) {
    console.warn('[preloadService] Parallel preload error:', error);
    return null;
  }
};

/**
 * Get cached payment verification data
 */
export const getCachedPaymentVerificationData = () => {
  return preloadCache.paymentVerification;
};

/**
 * Get cached payment settings data
 */
export const getCachedPaymentSettingsData = () => {
  return {
    merchantWallets: preloadCache.merchantWallets,
    verificationSettings: preloadCache.verificationSettings
  };
};

/**
 * Clear all cache
 */
export const clearPreloadCache = () => {
  preloadCache.paymentVerification = null;
  preloadCache.paymentSettings = null;
  preloadCache.merchantWallets = null;
  preloadCache.verificationSettings = null;
  preloadCache.lastPreloadTime = null;
};

/**
 * Invalidate cache (used after data changes)
 */
export const invalidatePreloadCache = () => {
  preloadCache.lastPreloadTime = null;
};
