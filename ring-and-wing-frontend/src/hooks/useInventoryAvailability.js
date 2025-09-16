import { useState, useEffect, useCallback, useMemo } from 'react';
import InventoryAvailabilityService from '../services/InventoryAvailabilityService';

/**
 * Custom hook for managing inventory availability in POS
 */
export const useInventoryAvailability = (menuItems = []) => {
  const [availabilityCache, setAvailabilityCache] = useState({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [orderAvailability, setOrderAvailability] = useState(null);
  
  const inventoryService = useMemo(() => new InventoryAvailabilityService(), []);

  // Cache timeout (5 minutes)
  const CACHE_TIMEOUT = 5 * 60 * 1000;

  /**
   * Check if cached availability is still valid
   */
  const isCacheValid = useCallback((itemId) => {
    const cached = availabilityCache[itemId];
    if (!cached) return false;
    return (Date.now() - cached.timestamp) < CACHE_TIMEOUT;
  }, [availabilityCache]);

  /**
   * Update menu items with availability status
   */
  const getMenuItemsWithAvailability = useMemo(() => {
    return menuItems.map(item => {
      const cached = availabilityCache[item._id];
      const availability = cached && isCacheValid(item._id) ? cached.data : null;
      
      return {
        ...item,
        availability,
        isAvailable: availability ? availability.available : true, // Default to available if no data
        hasWarnings: availability ? (availability.warnings && availability.warnings.length > 0) : false
      };
    });
  }, [menuItems, availabilityCache, isCacheValid]);

  /**
   * Check availability for a single menu item
   */
  const checkItemAvailability = useCallback(async (itemId, quantity = 1, forceRefresh = false) => {
    // Return cached result if valid and not forcing refresh
    if (!forceRefresh && isCacheValid(itemId)) {
      return availabilityCache[itemId].data;
    }

    try {
      setLoading(true);
      setError(null);

      const availability = await inventoryService.checkMenuItemAvailability(itemId, quantity);
      
      // Update cache
      setAvailabilityCache(prev => ({
        ...prev,
        [itemId]: {
          data: availability,
          timestamp: Date.now()
        }
      }));

      return availability;
    } catch (err) {
      setError(err.message);
      console.error('Error checking item availability:', err);
      return { available: true, warnings: [], error: err.message };
    } finally {
      setLoading(false);
    }
  }, [inventoryService, isCacheValid, availabilityCache]);

  /**
   * Check availability for entire order
   */
  const checkOrderAvailability = useCallback(async (orderItems, forceRefresh = false) => {
    if (!orderItems || orderItems.length === 0) {
      setOrderAvailability(null);
      return null;
    }

    try {
      setLoading(true);
      setError(null);

      const availability = await inventoryService.checkOrderAvailability(orderItems);
      setOrderAvailability(availability);

      // Update individual item cache with results
      availability.results?.forEach((result, index) => {
        const orderItem = orderItems[index];
        if (orderItem && result) {
          setAvailabilityCache(prev => ({
            ...prev,
            [orderItem._id]: {
              data: {
                available: result.available,
                warnings: result.warnings || [],
                reason: result.reason,
                missingIngredients: result.missingIngredients
              },
              timestamp: Date.now()
            }
          }));
        }
      });

      return availability;
    } catch (err) {
      setError(err.message);
      console.error('Error checking order availability:', err);
      setOrderAvailability({ 
        available: true, 
        results: [], 
        warnings: [], 
        conflicts: [],
        error: err.message 
      });
      return null;
    } finally {
      setLoading(false);
    }
  }, [inventoryService]);

  /**
   * Process order with inventory integration
   */
  const processOrderWithInventory = useCallback(async (orderData) => {
    try {
      setLoading(true);
      setError(null);

      const result = await inventoryService.processOrderWithInventory(orderData);
      
      // Clear order availability after successful processing
      setOrderAvailability(null);
      
      // Clear cache for processed items to force refresh
      orderData.items?.forEach(item => {
        setAvailabilityCache(prev => {
          const newCache = { ...prev };
          delete newCache[item.menuItemId];
          return newCache;
        });
      });

      return result;
    } catch (err) {
      setError(err.message);
      console.error('Error processing order with inventory:', err);
      throw err;
    } finally {
      setLoading(false);
    }
  }, [inventoryService]);

  /**
   * Handle manager override for unavailable items
   */
  const requestManagerOverride = useCallback(async (orderData, reason) => {
    try {
      setLoading(true);
      setError(null);

      const result = await inventoryService.requestManagerOverride(orderData, reason);
      
      // Clear order availability after override
      setOrderAvailability(null);
      
      return result;
    } catch (err) {
      setError(err.message);
      console.error('Error requesting manager override:', err);
      throw err;
    } finally {
      setLoading(false);
    }
  }, [inventoryService]);

  /**
   * Refresh availability for all cached items
   */
  const refreshAllAvailability = useCallback(async () => {
    const cachedItemIds = Object.keys(availabilityCache);
    if (cachedItemIds.length === 0) return;

    try {
      setLoading(true);
      setError(null);

      // Check availability for all cached items
      const promises = cachedItemIds.map(itemId => 
        inventoryService.checkMenuItemAvailability(itemId, 1)
      );

      const results = await Promise.all(promises);
      
      // Update cache with fresh data
      const newCache = {};
      cachedItemIds.forEach((itemId, index) => {
        newCache[itemId] = {
          data: results[index],
          timestamp: Date.now()
        };
      });

      setAvailabilityCache(newCache);
    } catch (err) {
      setError(err.message);
      console.error('Error refreshing availability:', err);
    } finally {
      setLoading(false);
    }
  }, [availabilityCache, inventoryService]);

  /**
   * Clear availability cache
   */
  const clearCache = useCallback(() => {
    setAvailabilityCache({});
    setOrderAvailability(null);
    setError(null);
  }, []);

  /**
   * Get availability summary for display
   */
  const getAvailabilitySummary = useMemo(() => {
    const items = getMenuItemsWithAvailability;
    const total = items.length;
    const available = items.filter(item => item.isAvailable).length;
    const withWarnings = items.filter(item => item.hasWarnings).length;
    const unavailable = total - available;

    return {
      total,
      available,
      unavailable,
      withWarnings,
      percentage: total > 0 ? Math.round((available / total) * 100) : 100
    };
  }, [getMenuItemsWithAvailability]);

  // Auto-refresh cache on interval (every 2 minutes)
  useEffect(() => {
    const interval = setInterval(() => {
      if (Object.keys(availabilityCache).length > 0) {
        refreshAllAvailability();
      }
    }, 5 * 60 * 1000); // Increased from 2 minutes to 5 minutes to reduce server load

    return () => clearInterval(interval);
  }, [availabilityCache, refreshAllAvailability]);

  return {
    // Data
    menuItemsWithAvailability: getMenuItemsWithAvailability,
    orderAvailability,
    availabilitySummary: getAvailabilitySummary,
    
    // State
    loading,
    error,
    
    // Actions
    checkItemAvailability,
    checkOrderAvailability,
    processOrderWithInventory,
    requestManagerOverride,
    refreshAllAvailability,
    clearCache,
    
    // Utilities
    isCacheValid
  };
};