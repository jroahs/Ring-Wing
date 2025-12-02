import { useState, useEffect, useCallback, useRef } from 'react';
import { API_URL } from '../App';
import io from 'socket.io-client';

// Fallback categories (matches SelfCheckout exact logic)
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

// Pure function to process menu items
const processMenuItems = (rawData) => {
  const items = Array.isArray(rawData) ? rawData : rawData.items || [];
  return items.map(item => ({
    ...item,
    image: item.image ? (item.image.startsWith('http') ? item.image : `${API_URL}${item.image}`) : null,
    pricing: item.pricing || { base: 0 },
    modifiers: item.modifiers || [],
    isAvailable: item.isAvailable // Include availability status
  }));
};

// Pure function to process categories
const processCategories = (rawCategoriesData) => {
  if (!rawCategoriesData || !Array.isArray(rawCategoriesData)) {
    return [];
  }
  
  return rawCategoriesData.map(cat => ({
    category: cat.name || cat.category,
    name: cat.name || cat.category,
    _id: cat._id,
    sortOrder: cat.sortOrder,
    subCategories: cat.subcategories || cat.subCategories || [],
    subcategories: cat.subcategories || cat.subCategories || []
  }));
};

// Main useMenu hook
export const useMenu = () => {
  const [menuItems, setMenuItems] = useState([]);
  const [categories, setCategories] = useState([]);
  const [addOns, setAddOns] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const socketRef = useRef(null);
  const socketInitializedRef = useRef(false);

  // Update menu item availability (for socket events)
  const updateItemAvailability = useCallback((menuItemId, isAvailable) => {
    setMenuItems(prev => prev.map(item =>
      item._id === menuItemId ? { ...item, isAvailable } : item
    ));
  }, []);

  // Fetch menu items only (for refreshes)
  const fetchMenuItems = useCallback(async () => {
    try {
      const response = await fetch(`${API_URL}/api/menu?limit=1000`);
      const data = await response.json();
      const processedItems = processMenuItems(data);
      setMenuItems(processedItems);
      return processedItems;
    } catch (err) {
      console.warn('Menu fetch failed:', err);
      throw err;
    }
  }, []);

  // Fetch add-ons
  const fetchAddOns = useCallback(async () => {
    try {
      const response = await fetch(`${API_URL}/api/add-ons`);
      if (response.ok) {
        const data = await response.json();
        setAddOns(data);
        return data;
      }
      return [];
    } catch (err) {
      console.warn('Add-ons fetch failed:', err);
      return [];
    }
  }, []);

  // Fetch categories with fallback logic (exact SelfCheckout behavior)
  const fetchCategories = useCallback(async () => {
    let categoriesData = [];
    
    try {
      const categoriesResponse = await fetch(`${API_URL}/api/categories`);
      
      if (categoriesResponse && categoriesResponse.ok) {
        try {
          const rawCategoriesData = await categoriesResponse.json();
          console.log('🔍 useMenu RAW categories API response:', rawCategoriesData);
          
          categoriesData = processCategories(rawCategoriesData);
          
          console.log('🎉 useMenu: Using dynamic categories from API', categoriesData);
          console.log('🔍 Categories with subcategories:', categoriesData.map(c => ({ 
            name: c.category, 
            subCount: (c.subCategories || []).length 
          })));
        } catch (e) {
          console.error('Failed to parse categories:', e);
          console.warn('Failed to parse categories, using fallback');
        }
      } else {
        console.warn('Categories API failed or not available');
      }
    } catch (err) {
      console.warn('Categories fetch failed:', err);
    }
    
    // Fallback to default categories if API fails or returns empty
    if (!categoriesData || categoriesData.length === 0) {
      console.warn('useMenu: Using fallback categories - API returned empty/invalid data');
      categoriesData = [...FALLBACK_CATEGORIES];
      console.log('useMenu: Fallback categories with subcategories loaded');
    }
    
    setCategories(categoriesData);
    return categoriesData;
  }, []);

  // Initial fetch of both menu and categories
  const fetchAll = useCallback(async () => {
    setError(null);
    setLoading(true);
    
    try {
      // Fetch menu items, categories, and add-ons in parallel
      const [menuResponse, categoriesResponse, addOnsResponse] = await Promise.all([
        fetch(`${API_URL}/api/menu?limit=1000`),
        fetch(`${API_URL}/api/categories`).catch(() => null), // Don't fail if categories API is unavailable
        fetch(`${API_URL}/api/add-ons`).catch(() => null) // Don't fail if add-ons API is unavailable
      ]);
      
      // Process menu items
      const menuData = await menuResponse.json();
      const processedItems = processMenuItems(menuData);
      setMenuItems(processedItems);

      // Process add-ons
      if (addOnsResponse && addOnsResponse.ok) {
        try {
          const addOnsData = await addOnsResponse.json();
          setAddOns(addOnsData);
        } catch (e) {
          console.warn('Failed to parse add-ons:', e);
          setAddOns([]);
        }
      }

      // Process categories (with fallback)
      let categoriesData = [];
      if (categoriesResponse && categoriesResponse.ok) {
        try {
          const rawCategoriesData = await categoriesResponse.json();
          console.log('🔍 useMenu RAW categories API response:', rawCategoriesData);
          
          categoriesData = processCategories(rawCategoriesData);
          
          console.log('🎉 useMenu: Using dynamic categories from API', categoriesData);
          console.log('🔍 Categories with subcategories:', categoriesData.map(c => ({ 
            name: c.category, 
            subCount: (c.subCategories || []).length 
          })));
        } catch (e) {
          console.error('Failed to parse categories:', e);
          console.warn('Failed to parse categories, using fallback');
        }
      } else {
        console.warn('Categories API failed or not available');
      }
      
      // Fallback to default categories if API fails or returns empty
      if (!categoriesData || categoriesData.length === 0) {
        console.warn('useMenu: Using fallback categories - API returned empty/invalid data');
        categoriesData = [...FALLBACK_CATEGORIES];
        console.log('useMenu: Fallback categories with subcategories loaded');
      }
      
      setCategories(categoriesData);
      
    } catch (err) {
      console.error('Error fetching menu data:', err);
      setError('Failed to load menu');
      
      // Set fallback categories even on error (exact SelfCheckout behavior)
      console.log('useMenu: Using error fallback categories');
      setCategories([...FALLBACK_CATEGORIES]);
    } finally {
      setLoading(false);
    }
  }, []);

  // Refresh menu items only (for periodic/focus refreshes)
  const refreshMenu = useCallback(async () => {
    try {
      await fetchMenuItems();
    } catch (err) {
      console.warn('Menu refresh failed:', err);
    }
  }, [fetchMenuItems]);

  // Refresh both menu and categories
  const refreshAll = useCallback(async () => {
    await fetchAll();
  }, [fetchAll]);

  // Initial load on mount
  useEffect(() => {
    fetchAll();
  }, [fetchAll]);

  // Auto-refresh functionality (exact SelfCheckout behavior)
  useEffect(() => {
    // Refresh on window focus
    const handleFocus = () => refreshMenu();
    window.addEventListener('focus', handleFocus);

    // Periodic refresh every 30 seconds
    const intervalId = setInterval(refreshMenu, 30000);

    return () => {
      window.removeEventListener('focus', handleFocus);
      clearInterval(intervalId);
    };
  }, [refreshMenu]);

  // Socket.io connection for real-time menu availability updates
  useEffect(() => {
    // Prevent duplicate initialization in Strict Mode
    if (socketInitializedRef.current) {
      return;
    }
    
    console.log('[useMenu] Initializing socket connection for menu updates...');
    socketInitializedRef.current = true;
    
    const socket = io(API_URL, {
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionAttempts: 5,
      reconnectionDelay: 1000
    });
    
    socketRef.current = socket;
    
    socket.on('connect', () => {
      console.log('[useMenu] Socket connected:', socket.id);
    });
    
    socket.on('disconnect', (reason) => {
      console.log('[useMenu] Socket disconnected:', reason);
    });
    
    // Listen for menu availability changes
    socket.on('menuAvailabilityChanged', (data) => {
      console.log('[useMenu] Menu availability changed:', data);
      if (data.menuItemId) {
        updateItemAvailability(data.menuItemId, data.isAvailable);
      }
    });
    
    // Listen for stock level changes that might affect availability
    socket.on('stockLevelChanged', (data) => {
      console.log('[useMenu] Stock level changed:', data);
      // Could trigger a refresh if needed
    });
    
    return () => {
      console.log('[useMenu] Cleaning up socket connection');
      if (socketRef.current) {
        socketRef.current.disconnect();
        socketRef.current = null;
      }
      socketInitializedRef.current = false;
    };
  }, [updateItemAvailability]);

  return {
    menuItems,
    categories,
    addOns,
    loading,
    error,
    refreshMenu,
    refreshAll,
    updateItemAvailability
  };
};

export default useMenu;