import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import PropTypes from 'prop-types';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

const DataCoordinatorContext = createContext(null);

/**
 * Data Coordinator Provider
 * Manages critical system data at app initialization to ensure consistent UX
 * and prevent rate limit issues on Render free tier
 */
export const DataCoordinatorProvider = ({ children }) => {
  const [ready, setReady] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  
  // Critical data states
  const [userData, setUserData] = useState(null);
  const [menuItems, setMenuItems] = useState([]);
  const [categories, setCategories] = useState([]);
  const [paymentSettings, setPaymentSettings] = useState(null);
  const [systemConfig, setSystemConfig] = useState(null);
  
  // Cache metadata
  const [lastFetchTime, setLastFetchTime] = useState(null);
  const CACHE_VALIDITY = 5 * 60 * 1000; // 5 minutes

  /**
   * Delay utility for rate limiting
   */
  const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

  /**
   * Fetch user profile data
   */
  const fetchUserProfile = useCallback(async () => {
    const token = localStorage.getItem('authToken');
    if (!token) return null;

    const storedUserData = localStorage.getItem('userData');
    if (storedUserData) {
      try {
        const parsed = JSON.parse(storedUserData);
        setUserData(parsed);
        return parsed;
      } catch (err) {
        console.warn('Failed to parse stored user data:', err);
      }
    }

    try {
      const response = await fetch(`${API_URL}/api/auth/me`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        throw new Error('Failed to fetch user profile');
      }

      const data = await response.json();
      const userProfile = {
        id: data._id,
        username: data.username,
        email: data.email,
        role: data.role,
        position: data.position,
        reportsTo: data.reportsTo,
        name: data.name
      };

      setUserData(userProfile);
      localStorage.setItem('userData', JSON.stringify(userProfile));
      return userProfile;
    } catch (err) {
      console.error('[DataCoordinator] User profile fetch failed:', err);
      return null;
    }
  }, []);

  /**
   * Fetch menu items
   */
  const fetchMenuItems = useCallback(async () => {
    try {
      const response = await fetch(`${API_URL}/api/menu?limit=1000`);
      
      if (!response.ok) {
        throw new Error('Failed to fetch menu items');
      }

      const data = await response.json();
      const items = Array.isArray(data) ? data : data.items || [];
      
      const processedItems = items.map(item => ({
        ...item,
        image: item.image ? `${API_URL}${item.image}` : null,
        pricing: item.pricing || { base: 0 },
        modifiers: item.modifiers || [],
        isAvailable: item.isAvailable
      }));

      setMenuItems(processedItems);
      return processedItems;
    } catch (err) {
      console.error('[DataCoordinator] Menu items fetch failed:', err);
      // Return empty array to allow app to continue
      setMenuItems([]);
      return [];
    }
  }, []);

  /**
   * Fetch categories with fallback
   */
  const fetchCategories = useCallback(async () => {
    const FALLBACK_CATEGORIES = [
      { 
        category: 'Meals', 
        name: 'Meals',
        subCategories: ['Breakfast All Day', 'Combos', 'Wings & Sides', 'Snacks', 'Flavored Wings'],
        subcategories: ['Breakfast All Day', 'Combos', 'Wings & Sides', 'Snacks', 'Flavored Wings']
      },
      { 
        category: 'Beverages', 
        name: 'Beverages',
        subCategories: ['Coffee', 'Frappe', 'Fresh Lemonade', 'Fruit Soda', 'Fruit Tea', 'Milktea', 'Non-Coffee (Milk-Based)', 'Yogurt Smoothies'],
        subcategories: ['Coffee', 'Frappe', 'Fresh Lemonade', 'Fruit Soda', 'Fruit Tea', 'Milktea', 'Non-Coffee (Milk-Based)', 'Yogurt Smoothies']
      }
    ];

    try {
      const response = await fetch(`${API_URL}/api/categories`);
      
      if (!response.ok) {
        console.warn('[DataCoordinator] Categories API failed, using fallback');
        setCategories(FALLBACK_CATEGORIES);
        return FALLBACK_CATEGORIES;
      }

      const data = await response.json();
      
      if (!data || !Array.isArray(data) || data.length === 0) {
        console.warn('[DataCoordinator] Empty categories response, using fallback');
        setCategories(FALLBACK_CATEGORIES);
        return FALLBACK_CATEGORIES;
      }

      const processedCategories = data.map(cat => ({
        category: cat.name || cat.category,
        name: cat.name || cat.category,
        _id: cat._id,
        sortOrder: cat.sortOrder,
        subCategories: cat.subcategories || cat.subCategories || [],
        subcategories: cat.subcategories || cat.subCategories || []
      }));

      setCategories(processedCategories);
      return processedCategories;
    } catch (err) {
      console.error('[DataCoordinator] Categories fetch failed:', err);
      setCategories(FALLBACK_CATEGORIES);
      return FALLBACK_CATEGORIES;
    }
  }, []);

  /**
   * Fetch payment settings
   */
  const fetchPaymentSettings = useCallback(async () => {
    const token = localStorage.getItem('authToken');
    if (!token) return null;

    try {
      const [walletsResponse, verificationResponse] = await Promise.all([
        fetch(`${API_URL}/api/settings/merchant-wallets`, {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        }),
        fetch(`${API_URL}/api/settings/payment-verification`, {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        })
      ]);

      const walletsData = walletsResponse.ok ? await walletsResponse.json() : null;
      const verificationData = verificationResponse.ok ? await verificationResponse.json() : null;

      const settings = {
        merchantWallets: walletsData,
        verificationSettings: verificationData
      };

      setPaymentSettings(settings);
      return settings;
    } catch (err) {
      console.error('[DataCoordinator] Payment settings fetch failed:', err);
      return null;
    }
  }, []);

  /**
   * Fetch system configuration
   */
  const fetchSystemConfig = useCallback(async () => {
    try {
      const response = await fetch(`${API_URL}/api/health`);
      
      if (!response.ok) {
        throw new Error('Health check failed');
      }

      const data = await response.json();
      const config = {
        serverStatus: data.status,
        apiUrl: API_URL,
        timestamp: new Date().toISOString()
      };

      setSystemConfig(config);
      return config;
    } catch (err) {
      console.error('[DataCoordinator] System config fetch failed:', err);
      // Set minimal config to allow app to continue
      const fallbackConfig = {
        serverStatus: 'unknown',
        apiUrl: API_URL,
        timestamp: new Date().toISOString()
      };
      setSystemConfig(fallbackConfig);
      return fallbackConfig;
    }
  }, []);

  /**
   * Initialize all critical data in sequence with delays
   * This respects Render free-tier rate limits
   */
  const initializeCriticalData = useCallback(async () => {
    console.log('[DataCoordinator] Starting critical data initialization...');
    setLoading(true);
    setError(null);
    setReady(false);

    try {
      // Step 1: User profile (if authenticated)
      await fetchUserProfile();
      await delay(200);

      // Step 2: Menu items
      await fetchMenuItems();
      await delay(200);

      // Step 3: Categories
      await fetchCategories();
      await delay(200);

      // Step 4: Payment settings (if authenticated)
      const token = localStorage.getItem('authToken');
      if (token) {
        await fetchPaymentSettings();
        await delay(200);
      }

      // Step 5: System config
      await fetchSystemConfig();

      // Mark as ready
      setLastFetchTime(Date.now());
      setReady(true);
      console.log('[DataCoordinator] Critical data initialization complete');
    } catch (err) {
      console.error('[DataCoordinator] Critical data initialization failed:', err);
      setError(err.message);
      // Still mark as ready to prevent blocking the app
      setReady(true);
    } finally {
      setLoading(false);
    }
  }, [fetchUserProfile, fetchMenuItems, fetchCategories, fetchPaymentSettings, fetchSystemConfig]);

  /**
   * Refresh specific data types
   */
  const refreshUserProfile = useCallback(async () => {
    await fetchUserProfile();
  }, [fetchUserProfile]);

  const refreshMenuData = useCallback(async () => {
    await fetchMenuItems();
    await delay(200);
    await fetchCategories();
  }, [fetchMenuItems, fetchCategories]);

  const refreshPaymentSettings = useCallback(async () => {
    await fetchPaymentSettings();
  }, [fetchPaymentSettings]);

  const refreshAll = useCallback(async () => {
    await initializeCriticalData();
  }, [initializeCriticalData]);

  /**
   * Check if cache is still valid
   */
  const isCacheValid = useCallback(() => {
    if (!lastFetchTime) return false;
    return (Date.now() - lastFetchTime) < CACHE_VALIDITY;
  }, [lastFetchTime]);

  /**
   * Initialize on mount
   */
  useEffect(() => {
    initializeCriticalData();
  }, [initializeCriticalData]);

  const value = {
    // State
    ready,
    loading,
    error,
    
    // Data
    userData,
    menuItems,
    categories,
    paymentSettings,
    systemConfig,
    
    // Methods
    refreshUserProfile,
    refreshMenuData,
    refreshPaymentSettings,
    refreshAll,
    isCacheValid,
    
    // Metadata
    lastFetchTime
  };

  return (
    <DataCoordinatorContext.Provider value={value}>
      {children}
    </DataCoordinatorContext.Provider>
  );
};

DataCoordinatorProvider.propTypes = {
  children: PropTypes.node.isRequired
};

/**
 * Hook to use Data Coordinator
 */
export const useDataCoordinator = () => {
  const context = useContext(DataCoordinatorContext);
  
  if (!context) {
    throw new Error('useDataCoordinator must be used within a DataCoordinatorProvider');
  }
  
  return context;
};

export default DataCoordinatorContext;
