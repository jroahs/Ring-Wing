import { useState, useEffect, useCallback } from 'react';
import { API_URL } from '../App';

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
    image: item.image ? `${API_URL}${item.image}` : null,
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
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

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
      // Fetch menu items and categories in parallel (exact SelfCheckout logic)
      const [menuResponse, categoriesResponse] = await Promise.all([
        fetch(`${API_URL}/api/menu?limit=1000`),
        fetch(`${API_URL}/api/categories`).catch(() => null) // Don't fail if categories API is unavailable
      ]);
      
      // Process menu items
      const menuData = await menuResponse.json();
      const processedItems = processMenuItems(menuData);
      setMenuItems(processedItems);

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

  return {
    menuItems,
    categories,
    loading,
    error,
    refreshMenu,
    refreshAll
  };
};

export default useMenu;