import { useState, useEffect, useCallback } from 'react';
import { useForm } from 'react-hook-form';
import MenuItemImage from './components/MenuItemImage';
import ConnectionMonitor from './components/ConnectionMonitor';
import { LoadingSpinner } from './components/ui';
import BrandedLoadingScreen from './components/ui/BrandedLoadingScreen';
import { io } from 'socket.io-client'; // NEW: Real-time socket events (Sprint 22)
import { API_URL } from './App';
import { useDataCoordinator } from './contexts/DataCoordinatorContext';

// Debounce utility function to prevent rapid-fire requests
const debounce = (func, wait) => {
  let timeout;
  return function executedFunction(...args) {
    const later = () => {
      clearTimeout(timeout);
      func(...args);
    };
    clearTimeout(timeout);
    timeout = setTimeout(later, wait);
  };
};

// Function to generate AI descriptions for menu items
const generateMenuItemDescription = async (itemName, basicDescription) => {
  const systemMessage = {
    role: "system",
    content: `You are a professional food writer who creates appetizing, appealing food descriptions for cafe menus.
- Keep descriptions between 20-40 words
- Highlight flavors, textures, and key ingredients
- Use vivid, sensory language that makes the dish sound delicious
- Focus on what makes this item special
- Be authentic and accurate to the actual food described
- Never use markdown or special formatting`
  };
  
  const userPrompt = `Create a short, appealing menu description for "${itemName}" based on this basic description: "${basicDescription}"`;
  
  const payload = {
    model: "gemini-2.5-flash",
    messages: [
      systemMessage,
      { role: "user", content: userPrompt }
    ],
    temperature: 0.7,
    max_tokens: 200
  };
  
  try {
    const res = await fetch(`${API_URL}/api/chat`, {
      method: 'POST',
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify(payload)
    });
    
    if (!res.ok) {
      throw new Error(`API error: ${res.status}`);
    }
    
    const data = await res.json();
    
    if (data.error || !data.choices || !data.choices[0] || !data.choices[0].message) {
      console.error("Error generating menu description:", data.error || "Invalid response format");
      return basicDescription;
    }
    
    const description = data.choices[0].message.content.trim();
    console.log('Generated menu description:', description);
    
    return description;
  } catch (error) {
    console.error("Error generating menu description:", error);
    return basicDescription;
  }
};



const colors = {
  primary: '#2e0304',
  background: '#fefdfd',
  accent: '#f1670f',
  secondary: '#853619',
  muted: '#ac9c9b',
  activeBg: '#f1670f20',
  activeBorder: '#f1670f',
  hoverBg: '#f1670f10'
};

// Pure database-driven menu management - no hard-coded fallbacks

// Pure database-driven menu management - no hard-coded fallbacks

const initialItem = {
  name: '',
  category: 'Meals',
  code: '',
  subCategory: 'Rice Meals', // Default to first Meals subcategory
  pricing: {},
  description: '',
  image: '',
  modifiers: [],
  preparationTime: 15,
  isAvailable: true,
  ingredients: []
};


const PlusIcon = ({ className }) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    className={className}
    fill="none"
    viewBox="0 0 24 24"
    stroke="currentColor"
  >
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={2}
      d="M12 4v16m8-8H4"
    />
  </svg>
);

const TrashIcon = ({ className }) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    className={className}
    fill="none"
    viewBox="0 0 24 24"
    stroke="currentColor"
  >
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={2}
      d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
    />
  </svg>
);

const EditIcon = ({ className }) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    className={className}
    fill="none"
    viewBox="0 0 24 24"
    stroke="currentColor"
  >
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={2}
      d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
    />
  </svg>
);

const ViewIcon = ({ className }) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    className={className}
    fill="none"
    viewBox="0 0 24 24"
    stroke="currentColor"
  >
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={2}
      d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
    />
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={2}
      d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"
    />
  </svg>
);

const ChevronIcon = ({ className, isExpanded }) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    className={`${className} transition-transform duration-200 ${isExpanded ? 'transform rotate-180' : ''}`}
    fill="none"
    viewBox="0 0 24 24"
    stroke="currentColor"
  >
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={2}
      d="M19 9l-7 7-7-7"
    />
  </svg>
);


const MenuPage = () => {
  // Get preloaded data from coordinator
  const { 
    menuItems: coordinatorMenuItems, 
    categories: coordinatorCategories, 
    ready: dataReady,
    refreshMenuData 
  } = useDataCoordinator();
  
  const [expandedItemId, setExpandedItemId] = useState(null);
  const [menuItems, setMenuItems] = useState([]);
  const [addOns, setAddOns] = useState([]);
  const [selectedItem, setSelectedItem] = useState(null);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [showAddOnModal, setShowAddOnModal] = useState(false);
  const [addOnToDelete, setAddOnToDelete] = useState(null);
  const [imagePreview, setImagePreview] = useState(null);
  const [imageFile, setImageFile] = useState(null);  
  const [loading, setLoading] = useState(true);
  const [isDeleting, setIsDeleting] = useState(false); // Add loading state for delete
  const [isSubmitting, setIsSubmitting] = useState(false); // Add loading state for form submission
  const [error, setError] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('All');
  const [newAddOn, setNewAddOn] = useState({
    name: '',
    price: 0,
    category: 'Beverages'
  });
  const [isAddOnsExpanded, setIsAddOnsExpanded] = useState(false);
  
  // Dynamic categories state
  const [categories, setCategories] = useState([]);
  const [menuConfig, setMenuConfig] = useState({}); // Fallback to static config
  
  // Category management states
  const [showCategoryManager, setShowCategoryManager] = useState(false);
  const [editingCategory, setEditingCategory] = useState(null);
  const [newCategoryName, setNewCategoryName] = useState('');
  const [newSubCategoryName, setNewSubCategoryName] = useState('');
  const [selectedCategoryForSubCat, setSelectedCategoryForSubCat] = useState('');
  
  // Size management states
  const [showSizeModal, setShowSizeModal] = useState(false);
  const [editingSubcategory, setEditingSubcategory] = useState(null);
  const [editingCategoryId, setEditingCategoryId] = useState(null);
  const [subcategorySizes, setSubcategorySizes] = useState([]);
  const [newSizeName, setNewSizeName] = useState('');
  const [newSizeDisplayName, setNewSizeDisplayName] = useState('');
  const [commonSizes, setCommonSizes] = useState([]); // Previously used sizes across all subcategories
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [filteredSizes, setFilteredSizes] = useState([]);

  // Inventory integration state
  const [inventoryItems, setInventoryItems] = useState([]);
  const [selectedIngredients, setSelectedIngredients] = useState([]);
  const [currentFormItem, setCurrentFormItem] = useState(null); // Track item being edited in form
  const [showIngredientModal, setShowIngredientModal] = useState(false);
  const [itemCostAnalysis, setItemCostAnalysis] = useState({});
  const [itemAvailability, setItemAvailability] = useState({});
  
  // Admin override state
  const [showAdminOverrideModal, setShowAdminOverrideModal] = useState(false);
  const [adminPassword, setAdminPassword] = useState('');
  const [pendingAvailabilityChange, setPendingAvailabilityChange] = useState(null);
  
  // NEW: Socket.io state for real-time updates (Sprint 22)
  const [socket, setSocket] = useState(null);

  const { register, handleSubmit, reset, watch, setValue, getValues, formState: { errors } } = useForm({
    defaultValues: initialItem
  });

  const selectedCategory = watch('category');
  const selectedSubCategory = watch('subCategory');

  // Handle selectedItem changes - populate form with existing data
  useEffect(() => {
    if (selectedItem?._id) {
      // Normalize pricing data for editing
      const normalizedPricing = { ...selectedItem.pricing };
      
      console.log('Raw pricing from database:', normalizedPricing);
      
      // Detect if this is a single-price item (no size-based pricing)
      const hasSizePricing = Object.keys(normalizedPricing).some(key => 
        key !== 'base' && key !== 'single' && key !== '_id'
      );
      
      // Convert 'base' pricing to 'single' for items without size variations
      if (!hasSizePricing && normalizedPricing.base !== undefined) {
        normalizedPricing.single = normalizedPricing.base;
        console.log('Converted base price to single:', normalizedPricing.base);
        delete normalizedPricing.base; // Remove base to avoid confusion
      }
      
      // If there's no pricing at all, initialize single as empty
      if (Object.keys(normalizedPricing).filter(k => k !== '_id').length === 0) {
        normalizedPricing.single = '';
        console.log('No pricing found, initializing single price as empty');
      }
      
      // Ensure all pricing values are properly initialized as numbers or empty strings
      // This fixes form field initialization issues when editing items
      Object.keys(normalizedPricing).forEach(key => {
        if (key === '_id') return; // Skip MongoDB _id field
        
        const value = normalizedPricing[key];
        if (value === null || value === undefined) {
          normalizedPricing[key] = '';
        } else if (typeof value === 'number') {
          // Keep numbers as-is
          normalizedPricing[key] = value;
        } else {
          // Convert to number if possible, otherwise empty string
          const parsed = parseFloat(value);
          normalizedPricing[key] = isNaN(parsed) ? '' : parsed;
        }
      });
      
      console.log('Initializing edit form with pricing:', normalizedPricing);
      
      // Determine if subcategory has sizes to set ignoreSizes flag
      const backendCategory = categories.find(c => (c.name || c.category) === selectedItem.category);
      let subcatHasSizes = false;
      
      if (backendCategory) {
        const subcat = (backendCategory.subCategories || backendCategory.subcategories || [])
          .find(sub => (sub.name || sub.displayName) === selectedItem.subCategory);
        subcatHasSizes = subcat?.sizes && subcat.sizes.length > 0;
        console.log(`Subcategory "${selectedItem.subCategory}" has sizes:`, subcatHasSizes, subcat?.sizes);
      }
      
      // Set ignoreSizes flag if subcategory has sizes but item uses single pricing
      const shouldIgnoreSizes = subcatHasSizes && !hasSizePricing;
      
      const formData = {
        ...selectedItem,
        pricing: normalizedPricing,
        ignoreSizes: shouldIgnoreSizes
      };
      
      console.log('Resetting form with data:', formData);
      console.log('Edit form initialized with ignoreSizes:', shouldIgnoreSizes);
      
      // Reset form with normalized data
      reset(formData);
      
      // Double-check that pricing.single is set (workaround for form hook issues)
      if (normalizedPricing.single !== undefined && normalizedPricing.single !== null) {
        setTimeout(() => {
          const currentValue = getValues('pricing.single');
          if (currentValue !== normalizedPricing.single) {
            console.warn('Form pricing.single mismatch detected, forcing setValue');
            setValue('pricing.single', normalizedPricing.single);
          }
        }, 100);
      }
    }
  }, [selectedItem, reset, categories, setValue, getValues]);

  useEffect(() => {
    // Prefer backend-driven `categories` (set in fetchData). Fallback to menuConfig / MENU_CONFIG.
    if (!selectedItem?._id) {
      const categoryName = watch('category');

      // derive list of valid subcategory names from dynamic `categories`
      const backendCategory = categories.find(c => (c.name || c.category) === categoryName);
      let validSubs = [];

      if (backendCategory) {
        const subs = backendCategory.subCategories || backendCategory.subcategories || [];
        validSubs = subs.map(s => (s && (s.name || s.displayName)) || '').filter(Boolean);
      }

      // fallback to dynamic menuConfig structure if backend category not found
      if (validSubs.length === 0) {
        validSubs = Object.keys(menuConfig[categoryName]?.subCategories || {});
      }

      // final fallback to initial config constants (MENU_CONFIG) if still empty
      if (!validSubs || validSubs.length === 0) {
        const fallback = (typeof MENU_CONFIG !== 'undefined' && MENU_CONFIG[categoryName])
          ? (MENU_CONFIG[categoryName].subCategories || [])
          : [];
        validSubs = fallback;
      }

      const currentSub = watch('subCategory');
      if (!validSubs.includes(currentSub)) {
        const defaultSub = validSubs[0] || '';
        // Preserve existing form values while updating subcategory
        reset({
          ...watch(),
          subCategory: defaultSub
        });
      }
    }
  }, [selectedCategory, reset, selectedItem, watch, menuConfig, categories]);

  // Set default subcategory when categories first load (for initial form)
  useEffect(() => {
    if (categories.length > 0 && !selectedItem?._id) {
      const currentCategory = watch('category');
      const currentSubCategory = watch('subCategory');
      
      // Find the backend category
      const backendCategory = categories.find(c => (c.name || c.category) === currentCategory);
      
      if (backendCategory) {
        const subs = backendCategory.subCategories || backendCategory.subcategories || [];
        const validSubs = subs
          .filter(s => s.isActive !== false)
          .map(s => (s && (s.name || s.displayName)) || '')
          .filter(Boolean);
        
        // If current subcategory is not in the list, set to first valid one
        if (validSubs.length > 0 && !validSubs.includes(currentSubCategory)) {
          setValue('subCategory', validSubs[0]);
        }
      }
    }
  }, [categories, selectedItem, watch, setValue]);

  // Clear pricing when subcategory changes (for new items only, not editing)
  useEffect(() => {
    if (!selectedItem?._id && selectedSubCategory) {
      // Get the sizes for the new subcategory
      const backendCategory = categories.find(c => (c.name || c.category) === selectedCategory);
      let newSizes = [];
      
      if (backendCategory) {
        const subcategory = (backendCategory.subCategories || backendCategory.subcategories || [])
          .find(sub => (sub.name || sub.displayName) === selectedSubCategory);
        
        if (subcategory && subcategory.sizes && subcategory.sizes.length > 0) {
          newSizes = subcategory.sizes;
        }
      }
      
      // Fallback to menuConfig
      if (newSizes.length === 0 && menuConfig[selectedCategory]?.subCategories[selectedSubCategory]?.sizes) {
        newSizes = menuConfig[selectedCategory].subCategories[selectedSubCategory].sizes;
      }
      
      // Clear all pricing fields to prevent stale data
      const currentPricing = watch('pricing') || {};
      const clearedPricing = {};
      
      // Only initialize fields that match the new sizes
      if (newSizes.length > 0) {
        newSizes.forEach(size => {
          const sizeName = size.name || size;
          clearedPricing[sizeName] = ''; // Initialize as empty
        });
        console.log('Subcategory changed - cleared pricing for new sizes:', Object.keys(clearedPricing));
      } else {
        // No sizes, so we need single pricing
        clearedPricing.single = '';
        console.log('Subcategory changed - cleared pricing for single price mode');
      }
      
      setValue('pricing', clearedPricing);
      setValue('ignoreSizes', false); // Reset ignore sizes checkbox
    }
  }, [selectedSubCategory, selectedItem, categories, selectedCategory, menuConfig, watch, setValue]);

  const createAddOn = async () => {
    try {
      const response = await fetch(`${API_URL}/api/add-ons`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newAddOn)
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to create add-on');
      }

      const result = await response.json();
      setAddOns(prev => [...prev, result]);
      setShowAddOnModal(false);
      setNewAddOn({ name: '', price: 0, category: 'Beverages' });
    } catch (error) {
      console.error('Error creating add-on:', error);
      alert(`Error: ${error.message}`);
    }
  };

  const deleteAddOn = async (addOnId) => {
    try {
      const response = await fetch(`${API_URL}/api/add-ons/${addOnId}`, {
        method: 'DELETE'
      });

      if (!response.ok) throw new Error('Failed to delete add-on');
      setAddOns(prev => prev.filter(addOn => addOn._id !== addOnId));
      setAddOnToDelete(null);
    } catch (error) {
      console.error('Error deleting add-on:', error);
      alert(`Error: ${error.message}`);
    }
  };

  // Extract fetchData function to reuse for refresh
  const fetchData = async (signal = null) => {
    try {
      // Stagger API calls with 200ms delays to prevent connection pool exhaustion
      const menuRes = await fetch(`${API_URL}/api/menu?limit=1000`, {  // High limit to get all items
        signal: signal
      });
      
      await new Promise(resolve => setTimeout(resolve, 200));
      const addOnsRes = await fetch(`${API_URL}/api/add-ons`, {
        signal: signal
      });
      
      await new Promise(resolve => setTimeout(resolve, 200));
      const categoriesRes = await fetch(`${API_URL}/api/categories`, {
        signal: signal
      });
      
      await new Promise(resolve => setTimeout(resolve, 200));
      const inventoryRes = await fetch(`${API_URL}/api/items`, {  // Use the existing items endpoint
        signal: signal
      });

      if (!menuRes.ok || !addOnsRes.ok) {
        throw new Error('Failed to fetch menu or add-ons data');
      }

      // Parse responses sequentially
      const menuData = await menuRes.json();
      const addOnsData = await addOnsRes.json();

      // Handle both array and object with items property response formats
      const validMenuItems = Array.isArray(menuData) ? menuData : (menuData.items || []);
      setMenuItems(validMenuItems);
      setAddOns(addOnsData);

      // Fetch inventory items for ingredient mapping
      if (inventoryRes.ok) {
        const inventoryData = await inventoryRes.json();
        // Handle the existing items API structure
        const items = Array.isArray(inventoryData) ? inventoryData : [];
        setInventoryItems(items);
      }

      // SPRINT 22 FIX: Batch availability check on initial load
      // CHECK ALL ITEMS AT ONCE using the batch API (no more 3-per-tick polling)
      const menuItemIds = validMenuItems.map(item => item._id).filter(Boolean);
      
      if (menuItemIds.length > 0) {
        console.log(`[MenuManagement] Batch checking availability for ${menuItemIds.length} items...`);
        
        try {
          // Call batch API ONCE for all items
          const response = await fetch('${API_URL}/api/menu/check-availability', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              menuItems: menuItemIds.map(id => ({ menuItemId: id, quantity: 1 }))
            })
          });
          
          if (response.ok) {
            const result = await response.json();
            console.log('[MenuManagement] Batch API response:', result);
            
            // Extract itemAvailabilities array from response
            const itemAvailabilities = result.data?.itemAvailabilities || result.itemAvailabilities || [];
            
            if (itemAvailabilities.length > 0) {
              // Build availability map from itemAvailabilities array
              const availabilityMap = {};
              itemAvailabilities.forEach(item => {
                availabilityMap[item.menuItemId] = {
                  isAvailable: item.isAvailable,
                  hasIngredientTracking: item.hasIngredientTracking || false,
                  insufficientIngredients: item.insufficientIngredients || [],
                  timestamp: Date.now()
                };
              });
              setItemAvailability(availabilityMap);
              console.log(`[MenuManagement] Loaded availability for ${Object.keys(availabilityMap).length} items`);
              
              // Fetch cost analysis for items with ingredient tracking (batched, 5 at a time)
              const trackedItems = itemAvailabilities.filter(item => item.hasIngredientTracking);
              console.log(`[MenuManagement] Fetching cost analysis for ${trackedItems.length} tracked items...`);
              
              const batchSize = 5;
              for (let i = 0; i < trackedItems.length; i += batchSize) {
                const batch = trackedItems.slice(i, i + batchSize);
                setTimeout(() => {
                  batch.forEach(item => {
                    fetchCostAnalysis(item.menuItemId);
                  });
                }, (i / batchSize) * 500); // 500ms delay between batches
              }
            } else {
              console.warn('[MenuManagement] No itemAvailabilities in response');
            }
          }
        } catch (error) {
          console.warn('[MenuManagement] Batch availability check failed:', error.message);
        }
      }
      
      // Fetch categories (optional, fallback to static config)
      if (categoriesRes.ok) {
        const categoriesData = await categoriesRes.json();
        console.log('MenuManagement: Loaded dynamic categories', categoriesData);
        
        // Debug the raw category structure
        console.log('Raw categories data:', categoriesData.map(cat => ({
          id: cat._id,
          name: cat.name,
          category: cat.category,
          subCategories: cat.subCategories?.map(sub => ({
            id: sub._id,
            name: sub.name,
            displayName: sub.displayName,
            raw: sub, // Show complete subcategory object
            sizes: sub.sizes
          })),
          subcategories: cat.subcategories?.map(sub => ({
            id: sub._id,
            name: sub.name,
            displayName: sub.displayName,
            raw: sub, // Show complete subcategory object
            sizes: sub.sizes
          }))
        })));
        
        // Also log subcategories as strings if they exist
        categoriesData.forEach(cat => {
          if (cat.subcategories && cat.subcategories.length > 0) {
            console.log(`${cat.name} subcategories:`, cat.subcategories);
          }
          if (cat.subCategories && cat.subCategories.length > 0) {
            console.log(`${cat.name} subCategories:`, cat.subCategories);
          }
        });
        
        // Transform categories to menuConfig format for compatibility
        const transformedCategories = categoriesData.map(cat => ({
          ...cat,
          name: cat.name || cat.category,
          _id: cat._id || cat.category
        }));
        
          // Ensure stable ordering - sort by sortOrder, then by name, then by _id for consistency
        const sortedCategories = transformedCategories.sort((a, b) => {
          // First sort by sortOrder
          if ((a.sortOrder || 0) !== (b.sortOrder || 0)) {
            return (a.sortOrder || 0) - (b.sortOrder || 0);
          }
          // Then by name
          if (a.name !== b.name) {
            return (a.name || '').localeCompare(b.name || '');
          }
          // Finally by _id for ultimate consistency
          return (a._id || '').toString().localeCompare((b._id || '').toString());
        }).map(category => {
          // Also sort subcategories within each category for consistency
          if (category.subcategories && Array.isArray(category.subcategories)) {
            category.subcategories = category.subcategories.sort((a, b) => {
              // Sort subcategories by sortOrder first, then by name
              if ((a.sortOrder || 0) !== (b.sortOrder || 0)) {
                return (a.sortOrder || 0) - (b.sortOrder || 0);
              }
              const aName = a.displayName || a.name || a.toString();
              const bName = b.displayName || b.name || b.toString();
              return aName.localeCompare(bName);
            });
          }
          if (category.subCategories && Array.isArray(category.subCategories)) {
            category.subCategories = category.subCategories.sort((a, b) => {
              // Sort subcategories by sortOrder first, then by name
              if ((a.sortOrder || 0) !== (b.sortOrder || 0)) {
                return (a.sortOrder || 0) - (b.sortOrder || 0);
              }
              const aName = a.displayName || a.name || a.toString();
              const bName = b.displayName || b.name || b.toString();
              return aName.localeCompare(bName);
            });
          }
          return category;
        });
        
        // Temporarily disable caching to force fresh data fetch  
        setCategories(sortedCategories);
        console.log('MenuManagement: Categories FORCE updated with stable order');
        console.log('Actual sort order:', sortedCategories.map(c => ({ name: c.name, sortOrder: c.sortOrder })));
        
        // Create dynamic menuConfig for existing functionality - always update
        const dynamicMenuConfig = {};
        sortedCategories.forEach(category => {
            const categoryName = category.name || category.category;
            if (categoryName) {
              dynamicMenuConfig[categoryName] = {
                subCategories: {}
              };
              
              // Handle both subcategories array and subCategories array
              const subcats = category.subcategories || category.subCategories || [];
              if (subcats.length > 0) {
                subcats.forEach(subCat => {
                  const subCatName = subCat.name || subCat;
                  if (subCatName) {
                    // Extract sizes from subcategory, preserving full size objects
                    const sizes = subCat.sizes && subCat.sizes.length > 0 
                      ? subCat.sizes.map(size => {
                          // Ensure we always have an object with name and displayName
                          if (typeof size === 'object' && size.name) {
                            return {
                              name: size.name,
                              displayName: size.displayName || size.name
                            };
                          }
                          // Fallback for string sizes
                          return {
                            name: size,
                            displayName: size
                          };
                        })
                      : [];
                    
                    // Extract addons from subcategory
                    const addons = subCat.availableAddons || subCat.addons || [];
                    
                    dynamicMenuConfig[categoryName].subCategories[subCatName] = {
                      sizes: sizes,
                      addons: addons
                    };
                  }
                });
              }
            }
          });
          
          console.log('MenuManagement: Generated pure database config', dynamicMenuConfig);
          setMenuConfig(dynamicMenuConfig);
          console.log('MenuManagement: Using database-driven config', dynamicMenuConfig);
        
      } else {
        console.warn('MenuManagement: Failed to fetch categories, using empty config');
        setMenuConfig({});
      }
      
      setError(null);
    } catch (error) {
      // Don't log AbortError - it's expected when component unmounts
      if (error.name !== 'AbortError') {
        console.error('Error fetching data:', error);
        setError(error.message);
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const controller = new AbortController();
    
    // Load menu items from DataCoordinator first
    if (dataReady && coordinatorMenuItems && coordinatorMenuItems.length > 0) {
      console.log('[MenuManagement] Using preloaded menu items from DataCoordinator:', coordinatorMenuItems.length);
      setMenuItems(coordinatorMenuItems);
      setLoading(false);
    }
    
    // Load categories from DataCoordinator
    if (dataReady && coordinatorCategories && coordinatorCategories.length > 0) {
      console.log('[MenuManagement] Using preloaded categories from DataCoordinator:', coordinatorCategories.length);
      setCategories(coordinatorCategories);
      
      // Transform categories into menuConfig format
      const dynamicMenuConfig = {};
      coordinatorCategories.forEach(category => {
        const categoryName = category.name || category.category;
        if (categoryName) {
          dynamicMenuConfig[categoryName] = {
            subCategories: {}
          };
          
          const subcats = category.subcategories || category.subCategories || [];
          if (subcats.length > 0) {
            subcats
              .filter(subCat => subCat.isActive !== false)
              .forEach(subCat => {
                const subCatName = subCat.name || subCat.displayName || subCat;
                if (subCatName) {
                  dynamicMenuConfig[categoryName].subCategories[subCatName] = {
                    sizes: subCat.sizes || []
                  };
                }
              });
          }
        }
      });
      setMenuConfig(dynamicMenuConfig);
    }
    
    // Still need to fetch add-ons and inventory items (not in coordinator)
    const fetchSupplementalData = async () => {
      try {
        const addOnsRes = await fetch(`${API_URL}/api/add-ons`, {
          signal: controller.signal
        });
        
        await new Promise(resolve => setTimeout(resolve, 200));
        const inventoryRes = await fetch(`${API_URL}/api/items`, {
          signal: controller.signal
        });

        if (addOnsRes.ok) {
          const addOnsData = await addOnsRes.json();
          setAddOns(addOnsData);
        }

        if (inventoryRes.ok) {
          const inventoryData = await inventoryRes.json();
          const items = Array.isArray(inventoryData) ? inventoryData : [];
          setInventoryItems(items);
        }

        // Batch availability check for menu items
        if (coordinatorMenuItems && coordinatorMenuItems.length > 0) {
          const menuItemIds = coordinatorMenuItems.map(item => item._id).filter(Boolean);
          
          if (menuItemIds.length > 0) {
            console.log(`[MenuManagement] Batch checking availability for ${menuItemIds.length} items...`);
            
            try {
              const response = await fetch(`${API_URL}/api/menu/check-availability`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  menuItems: menuItemIds.map(id => ({ menuItemId: id, quantity: 1 }))
                })
              });
              
              if (response.ok) {
                const result = await response.json();
                const itemAvailabilities = result.data?.itemAvailabilities || result.itemAvailabilities || [];
                
                if (itemAvailabilities.length > 0) {
                  const availabilityMap = {};
                  itemAvailabilities.forEach(item => {
                    availabilityMap[item.menuItemId] = {
                      isAvailable: item.isAvailable,
                      hasIngredientTracking: item.hasIngredientTracking || false,
                      insufficientIngredients: item.insufficientIngredients || [],
                      timestamp: Date.now()
                    };
                  });
                  setItemAvailability(availabilityMap);
                  console.log(`[MenuManagement] Loaded availability for ${Object.keys(availabilityMap).length} items`);
                  
                  // Fetch cost analysis for tracked items
                  const trackedItems = itemAvailabilities.filter(item => item.hasIngredientTracking);
                  console.log(`[MenuManagement] Fetching cost analysis for ${trackedItems.length} tracked items...`);
                  
                  const batchSize = 5;
                  for (let i = 0; i < trackedItems.length; i += batchSize) {
                    const batch = trackedItems.slice(i, i + batchSize);
                    setTimeout(() => {
                      batch.forEach(item => {
                        fetchCostAnalysis(item.menuItemId);
                      });
                    }, i * 100);
                  }
                }
              }
            } catch (err) {
              console.warn('[MenuManagement] Batch availability check failed:', err);
            }
          }
        }

        setError(null);
      } catch (error) {
        if (error.name !== 'AbortError') {
          console.error('Error fetching supplemental data:', error);
        }
      }
    };

    if (dataReady) {
      fetchSupplementalData();
    }
    
    return () => controller.abort();
  }, [dataReady, coordinatorMenuItems, coordinatorCategories]);

  // NEW: Socket.io connection for real-time updates (Sprint 22)
  useEffect(() => {
    const token = localStorage.getItem('token') || localStorage.getItem('authToken');
    
    // Initialize socket connection with JWT authentication
    const socketConnection = io(API_URL, {
      auth: { token: token },
      transports: ['websocket', 'polling']
    });
    
    socketConnection.on('connect', () => {
      console.log('[MenuManagement] Socket connected - Authenticated:', socketConnection.auth.token ? 'Yes' : 'No');
    });
    
    socketConnection.on('disconnect', () => {
      console.log('[MenuManagement] Socket disconnected');
    });
    
    setSocket(socketConnection);
    
    // Cleanup on unmount
    return () => {
      console.log('[MenuManagement] Cleaning up socket connection');
      socketConnection.disconnect();
    };
  }, []);
  
  // NEW: Socket event listeners for real-time inventory updates (Sprint 22)
  useEffect(() => {
    if (!socket) return;
    
    // Listen for ingredient mapping changes
    const handleIngredientMappingChanged = (data) => {
      console.log('[MenuManagement] Ingredient mapping changed:', data);
      if (data.menuItemId) {
        // SOCKET FIX: Don't refetch - socket event contains fresh data
        // Just trigger a fetch ONLY for cost analysis since that's not in the event
        console.log(`[MenuManagement] Updating cost analysis for ${data.menuItemId} (NO availability refetch)`);
        fetchCostAnalysis(data.menuItemId);
        // Availability will be updated by menuAvailabilityChanged event
      }
    };
    
    // Listen for menu availability changes
    const handleMenuAvailabilityChanged = (data) => {
      console.log('[MenuManagement] Menu availability changed:', data);
      if (data.menuItemId) {
        // Update availability state immediately from socket data (NO API CALL)
        setItemAvailability(prev => ({
          ...prev,
          [data.menuItemId]: {
            isAvailable: data.isAvailable,
            reason: data.reason,
            insufficientIngredients: data.insufficientIngredients || [],
            hasIngredientTracking: (data.insufficientIngredients && data.insufficientIngredients.length > 0) || false,
            timestamp: Date.now()
          }
        }));
        console.log(`[MenuManagement] Availability updated from socket for ${data.menuItemId}:`, data.isAvailable);
        
        // Update menuItems list
        setMenuItems(prev => prev.map(item => 
          item._id === data.menuItemId ? { ...item, isAvailable: data.isAvailable } : item
        ));
        
        // If this item is currently being edited in the form, update the form
        if (selectedItem?._id === data.menuItemId) {
          console.log(`[MenuManagement] Updating form for currently edited item ${selectedItem.name}`);
          console.log(`[MenuManagement] Setting isAvailable toggle to: ${data.isAvailable}`);
          setValue('isAvailable', data.isAvailable, { shouldDirty: true, shouldTouch: true });
          setSelectedItem(prev => {
            const updated = { ...prev, isAvailable: data.isAvailable };
            console.log('[MenuManagement] Updated selectedItem:', updated);
            return updated;
          });
          
          // Force form to re-render by triggering validation
          setTimeout(() => {
            const currentValue = getValues('isAvailable');
            console.log(`[MenuManagement] Current toggle value after update: ${currentValue}`);
          }, 100);
        }
      }
    };
    
    // Handle user logout events (multi-tab logout synchronization)
    const handleUserLogout = (data) => {
      console.log('[MenuManagement] User logged out event received:', data);
      localStorage.removeItem('token');
      localStorage.removeItem('authToken');
      localStorage.removeItem('userPosition');
      localStorage.removeItem('userRole');
      window.location.href = '/';
    };
    
    // Register socket event listeners
    socket.on('ingredientMappingChanged', handleIngredientMappingChanged);
    socket.on('menuAvailabilityChanged', handleMenuAvailabilityChanged);
    socket.on('userLoggedOut', handleUserLogout);
    
    console.log('[MenuManagement] Socket event listeners registered');
    
    // Cleanup listeners on unmount
    return () => {
      socket.off('ingredientMappingChanged', handleIngredientMappingChanged);
      socket.off('menuAvailabilityChanged', handleMenuAvailabilityChanged);
      socket.off('userLoggedOut', handleUserLogout);
      console.log('[MenuManagement] Socket event listeners removed');
    };
  }, [socket]);

  // REMOVED: 5-minute polling + window focus refresh
  // Menu management is not time-critical - staff can manually refresh if needed
  // This removes 60+ requests/hour when menu management is open
  // Data is still fetched on mount and after any edit operations
  // Manual refresh button available in UI for explicit updates

  // Load existing ingredients when editing an item
  // SOCKET FIX: Only fetch data on initial item selection (by ID change),
  // not on every state change. Socket events handle real-time updates.
  useEffect(() => {
    const currentItemId = currentFormItem?._id;
    const selectedItemId = selectedItem?._id;
    
    if (currentItemId) {
      // Load existing ingredients for the menu item being edited
      fetchMenuItemIngredients(currentItemId);
      // Initial cost analysis and availability (socket will handle updates)
      fetchCostAnalysis(currentItemId);
      checkMenuItemAvailability(currentItemId);
    } else if (selectedItemId && !currentFormItem) {
      // Load existing ingredients for the menu item being viewed (not in form)
      fetchMenuItemIngredients(selectedItemId);
      // Initial cost analysis and availability (socket will handle updates)
      fetchCostAnalysis(selectedItemId);
      checkMenuItemAvailability(selectedItemId);
    } else {
      // Clear ingredients when creating new item or no item selected
      setSelectedIngredients([]);
    }
  }, [currentFormItem?._id, selectedItem?._id]); // SOCKET FIX: Narrow dependency to only ID changes

  const fetchMenuItemIngredients = async (menuItemId) => {
    try {
      console.log('Fetching ingredients for menu item:', menuItemId);
      const response = await fetch(`${API_URL}/api/menu/ingredients/${menuItemId}`);
      if (response.ok) {
        const data = await response.json();
        console.log('Fetched ingredients data:', data);
        
        if (data.success && data.data && data.data.ingredients) {
          // Transform backend data to frontend format
          const transformedIngredients = data.data.ingredients.map(ing => {
            // Handle both cases: populate worked (inventoryItemId) or failed (ingredientId)
            const itemId = ing.inventoryItemId || ing.ingredientId;
            
            return {
              ingredientId: itemId,
              _id: itemId,
              name: ing.name || 'Unknown Item',
              quantityNeeded: ing.quantity,
              quantity: ing.quantity,
              unit: ing.unit,
              tolerance: ing.tolerance || 0.1,
              isRequired: ing.isRequired !== false,
              notes: ing.notes || '',
              currentStock: ing.currentStock || 0,
              unitCost: ing.unitCost || 0
            };
          });
          
          console.log('Transformed ingredients:', transformedIngredients);
          setSelectedIngredients(transformedIngredients);
        } else {
          console.log('No ingredients found or invalid data structure');
          setSelectedIngredients([]);
        }
      } else {
        console.error('Failed to fetch ingredients, status:', response.status);
        setSelectedIngredients([]);
      }
    } catch (error) {
      console.error('Error fetching menu item ingredients:', error);
      setSelectedIngredients([]);
    }
  };

  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      alert('Please upload an image file (JPEG, PNG, GIF, WEBP)');
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      alert('File size must be less than 5MB');
      return;
    }

    const reader = new FileReader();
    reader.onloadend = () => setImagePreview(reader.result);
    reader.readAsDataURL(file);
    setImageFile(file);
  };

  // Inventory integration functions
  const fetchCostAnalysis = async (menuItemId) => {
    try {
      const response = await fetch(`${API_URL}/api/menu/cost-analysis/${menuItemId}`);
      if (response.ok) {
        const data = await response.json();
        setItemCostAnalysis(prev => ({
          ...prev,
          [menuItemId]: data.success ? data.data : data
        }));
      } else {
        console.warn(`Cost analysis not available for item ${menuItemId} (Status: ${response.status})`);
        // Set fallback cost analysis
        const menuItem = menuItems.find(m => m._id === menuItemId);
        setItemCostAnalysis(prev => ({
          ...prev,
          [menuItemId]: {
            menuItemId,
            menuItemName: menuItem?.name || 'Unknown',
            sellingPrice: parseFloat(menuItem?.price || 0),
            totalCost: 0,
            profit: parseFloat(menuItem?.price || 0),
            profitMargin: 100,
            ingredientBreakdown: [],
            hasIngredientMapping: selectedIngredients.length > 0,
            fallback: true
          }
        }));
      }
    } catch (error) {
      const isConnectionError = error.message.includes('Failed to fetch') || 
                                error.message.includes('NetworkError') ||
                                error.message.includes('timeout');
      
      if (isConnectionError) {
        console.error('CONNECTION ISSUE DETECTED during cost analysis:', {
          error: error.message,
          menuItemId,
          timestamp: new Date().toISOString()
        });
      }
      
      console.warn('Cost analysis service unavailable:', error.message);
      // Set fallback cost analysis
      const menuItem = menuItems.find(m => m._id === menuItemId);
      setItemCostAnalysis(prev => ({
        ...prev,
        [menuItemId]: {
          menuItemId,
          menuItemName: menuItem?.name || 'Unknown',
          sellingPrice: parseFloat(menuItem?.price || 0),
          totalCost: 0,
          profit: parseFloat(menuItem?.price || 0),
          profitMargin: 100,
          ingredientBreakdown: [],
          hasIngredientMapping: selectedIngredients.length > 0,
          fallback: true
        }
      }));
    }
  };

  const checkMenuItemAvailability = async (menuItemId) => {
    try {
      const response = await fetch(`${API_URL}/api/menu/check-availability`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          menuItems: [{ menuItemId, quantity: 1 }]
        })
      });
      if (response.ok) {
        const data = await response.json();
        setItemAvailability(prev => ({
          ...prev,
          [menuItemId]: {
            ...(data.success ? data.data : data),
            timestamp: Date.now() // Add timestamp for caching
          }
        }));
      } else {
        console.warn(`Availability check failed for item ${menuItemId}`);
        // Set default availability when service is unavailable
        setItemAvailability(prev => ({
          ...prev,
          [menuItemId]: { 
            isAvailable: true, 
            hasIngredientTracking: false,
            timestamp: Date.now()
          }
        }));
      }
    } catch (error) {
      console.warn('Availability check service unavailable:', error.message);
      // Set default availability when service is unavailable
      setItemAvailability(prev => ({
        ...prev,
        [menuItemId]: { 
          isAvailable: true, 
          hasIngredientTracking: false,
          timestamp: Date.now()
        }
      }));
    }
  };

  // Manual refresh function for availability checking when needed
  const refreshAvailabilityForItems = (itemIds) => {
    if (!Array.isArray(itemIds)) itemIds = [itemIds];
    
    console.log(`Manual availability refresh for ${itemIds.length} items`);
    
    itemIds.forEach((itemId, index) => {
      setTimeout(() => {
        checkMenuItemAvailability(itemId);
        fetchCostAnalysis(itemId);
      }, index * 500); // Stagger requests by 500ms each
    });
  };

  const addIngredientToMenu = (ingredient, quantity = 1, unit = 'pieces') => {
    const newIngredient = {
      ingredientId: ingredient._id,
      name: ingredient.name,
      quantityNeeded: quantity,
      unit: unit
    };
    
    setSelectedIngredients(prev => {
      const existing = prev.find(ing => ing.ingredientId === ingredient._id);
      if (existing) {
        return prev.map(ing => 
          ing.ingredientId === ingredient._id 
            ? { ...ing, quantityNeeded: quantity, unit }
            : ing
        );
      }
      return [...prev, newIngredient];
    });
  };

  const removeIngredientFromMenu = (ingredientId) => {
    setSelectedIngredients(prev => prev.filter(ing => ing.ingredientId !== ingredientId));
  };

  const updateMenuItemIngredients = async (menuItemId, ingredients) => {
    // Prevent concurrent requests
    if (updateMenuItemIngredients.isRunning) {
      console.warn('Ingredient update already in progress');
      return false;
    }
    
    updateMenuItemIngredients.isRunning = true;
    
    try {
      console.log('Updating ingredients for menu item:', menuItemId, ingredients);
      
      // Validate inputs before sending
      if (!menuItemId || !Array.isArray(ingredients)) {
        throw new Error('Invalid input: menuItemId and ingredients array required');
      }
      
      if (ingredients.length === 0) {
        console.log('Removing all ingredient mappings for menu item:', menuItemId);
      } else {
        if (ingredients.length > 20) {
          throw new Error('Too many ingredients. Maximum 20 ingredients allowed.');
        }
        
        // Validate each ingredient
        for (let i = 0; i < ingredients.length; i++) {
          const ing = ingredients[i];
          if (!ing.inventoryItemId || !ing.quantity || !ing.unit) {
            throw new Error(`Ingredient ${i + 1}: Missing required fields (inventoryItemId, quantity, unit)`);
          }
          if (isNaN(ing.quantity) || ing.quantity <= 0) {
            throw new Error(`Ingredient ${i + 1}: Quantity must be a positive number`);
          }
        }
      }
      
      // Create abort controller for timeout
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 30000); // 30 second timeout
      
      const response = await fetch(`${API_URL}/api/menu/ingredients/${menuItemId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ingredients }),
        signal: controller.signal
      });
      
      clearTimeout(timeoutId);
      
      const data = await response.json();
      console.log('Update response:', data);
      
      if (response.ok && data.success !== false) {
        // Refresh cost analysis and availability after updating ingredients (with delay)
        setTimeout(() => {
          try {
            fetchCostAnalysis(menuItemId);
            checkMenuItemAvailability(menuItemId);
          } catch (refreshError) {
            console.warn('Error refreshing data after ingredient update:', refreshError);
          }
        }, 1000); // Increased delay to 1 second
        return true;
      } else {
        let errorMessage = data.message || 'Unknown error';
        if (response.status === 429) {
          errorMessage = 'Too many requests. Please wait a moment before trying again.';
        } else if (response.status === 408) {
          errorMessage = 'Request timed out. Please try again.';
        } else if (response.status === 503) {
          errorMessage = 'Database temporarily unavailable. Please try again in a moment.';
        }
        console.error('Failed to update ingredients:', errorMessage);
        alert('Error: ' + errorMessage);
        return false;
      }
    } catch (error) {
      console.error('Error updating menu item ingredients:', error);
      
      // Log connection-related errors with more detail
      const isConnectionError = error.message.includes('Failed to fetch') || 
                                error.message.includes('NetworkError') ||
                                error.message.includes('timeout') ||
                                error.name === 'AbortError';
      
      if (isConnectionError) {
        console.error('CONNECTION ISSUE DETECTED during ingredient mapping:', {
          error: error.message,
          errorName: error.name,
          menuItemId,
          ingredientCount: ingredients.length,
          timestamp: new Date().toISOString(),
          stack: error.stack
        });
      }
      
      let errorMessage = error.message;
      if (error.name === 'AbortError') {
        errorMessage = 'Request timed out. Please check your connection and try again.';
      } else if (error.message.includes('Failed to fetch')) {
        errorMessage = 'Connection lost. Please check your network connection and try again.';
      }
      
      alert('Error updating ingredients: ' + errorMessage);
      return false;
    } finally {
      updateMenuItemIngredients.isRunning = false;
    }
  };

  const onSubmit = async (data) => {
    if (isSubmitting) return; // Prevent double submission
    
    setIsSubmitting(true);
    const controller = new AbortController();
    
    try {
      // Use database categories instead of menuConfig for validation
      const backendCategory = categories.find(c => (c.name || c.category) === data.category);
      if (!backendCategory) {
        // Fallback to menuConfig if database categories not loaded
        const categoryConfig = menuConfig[data.category];
        if (!categoryConfig) throw new Error(`Invalid category: ${data.category}`);
      }
  
      // Get subcategory from database categories (more reliable)
      const subcats = backendCategory 
        ? (backendCategory.subCategories || backendCategory.subcategories || [])
        : [];
      
      const subCategory = subcats.find(sub => (sub.name || sub.displayName) === data.subCategory);
      
      // Fallback to menuConfig for subcategory if not found in database
      if (!subCategory && backendCategory) {
        throw new Error(`Invalid subcategory: ${data.subCategory}`);
      }
      
      const subCategoryConfig = subCategory || (menuConfig[data.category]?.subCategories?.[data.subCategory]);
      if (!subCategoryConfig) throw new Error(`Invalid subcategory: ${data.subCategory}`);
  
      const processedPricing = {};
      
      // Get sizes from subcategory (database takes priority)
      const sizes = subCategory?.sizes || subCategoryConfig.sizes || [];
      
      // Check if user wants to ignore sizes OR subcategory has no sizes (both use single price)
      if (data.ignoreSizes || sizes.length === 0) {
        // Single price for items without size variations
        const singlePrice = parseFloat(data.pricing?.single);
        if (isNaN(singlePrice)) throw new Error('Invalid price: Please enter a valid single price');
        processedPricing.base = singlePrice;
      } else {
        // Subcategory has sizes configured - validate all required sizes have prices
        const missingPrices = [];
        sizes.forEach(size => {
          const sizeName = size.name || size;
          const priceValue = data.pricing?.[sizeName];
          const price = parseFloat(priceValue);
          
          if (priceValue === undefined || priceValue === null || priceValue === '') {
            missingPrices.push(size.displayName || sizeName);
          } else if (isNaN(price)) {
            throw new Error(`Invalid price for ${size.displayName || sizeName}: "${priceValue}" is not a valid number`);
          } else {
            processedPricing[sizeName] = price;
          }
        });
        
        if (missingPrices.length > 0) {
          throw new Error(`Missing prices for: ${missingPrices.join(', ')}. Please fill in all size prices.`);
        }
      }
  
      const formData = new FormData();
      formData.append('code', data.code.toUpperCase().trim());
      formData.append('name', data.name.trim());
      formData.append('category', data.category);
      formData.append('subCategory', data.subCategory);
      formData.append('description', data.description.trim());
      formData.append('pricing', JSON.stringify(processedPricing));
      formData.append('modifiers', JSON.stringify(data.modifiers || []));
      formData.append('preparationTime', data.preparationTime.toString());
      formData.append('isAvailable', data.isAvailable.toString());
      formData.append('ignoreSizes', data.ignoreSizes ? 'true' : 'false');
      formData.append('ingredients', JSON.stringify(selectedIngredients));
  
      if (imageFile) formData.append('image', imageFile);
  
      const method = selectedItem?._id ? 'PUT' : 'POST';
      const url = selectedItem?._id
        ? `${API_URL}/api/menu/${selectedItem._id}`
        : `${API_URL}/api/menu`;
  
      const response = await fetch(url, { 
        method, 
        body: formData,
        signal: controller.signal
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to save item');
      }
  
      const responseData = await response.json();
      setMenuItems(prev => {
        const newItems = Array.isArray(prev) ? prev : [];
        return selectedItem?._id
          ? newItems.map(item => item._id === responseData._id ? responseData : item)
          : [...newItems, responseData];
      });

      // For new items, keep the form open and set currentFormItem so ingredients can be mapped
      if (!selectedItem?._id) {
        // New item created - set it as currentFormItem for ingredient mapping
        setCurrentFormItem(responseData);
        setSelectedItem(responseData); // Keep form open for ingredient mapping
        
        // Reset form but keep it open for ingredient mapping
        reset({
          ...responseData,
          pricing: responseData.pricing || {},
          modifiers: responseData.modifiers || []
        });
        setImagePreview(responseData.image ? `${API_URL}${responseData.image}` : null);
        setImageFile(null);
        
        // Auto-save ingredients if they were added during creation
        if (selectedIngredients.length > 0) {
          console.log('Auto-saving ingredients for newly created item:', responseData._id);
          setTimeout(async () => {
            try {
              const ingredientsData = selectedIngredients.map(ing => ({
                inventoryItemId: ing.ingredientId || ing._id,
                quantity: Number(ing.quantityNeeded || ing.quantity || 1),
                unit: (ing.unit || 'pieces').toLowerCase().trim(),
                tolerance: Number(ing.tolerance || 0.1),
                isRequired: ing.isRequired !== false,
                notes: (ing.notes || '').substring(0, 500)
              }));
              
              const success = await updateMenuItemIngredients(responseData._id, ingredientsData);
              if (success) {
                alert(`Menu item "${responseData.name}" created successfully with ${selectedIngredients.length} ingredients mapped!`);
              } else {
                alert(`Menu item "${responseData.name}" created successfully!\nHowever, there was an issue saving ingredients. You can try adding them again.`);
              }
            } catch (error) {
              console.error('Error auto-saving ingredients:', error);
              alert(`Menu item "${responseData.name}" created successfully!\nHowever, there was an issue saving ingredients. You can try adding them again.`);
            }
          }, 1000);
        } else {
          alert(`Menu item "${responseData.name}" created successfully!\n\nYou can now add ingredients to this item using the "Add Ingredients" button below.`);
        }
      } else {
        // Existing item updated - close form
        reset({ ...initialItem, category: data.category, subCategory: data.subCategory });
        setImagePreview(null);
        setImageFile(null);
        setSelectedItem(null);
        setCurrentFormItem(null);
        alert(`Menu item "${responseData.name}" updated successfully!`);
      }
    } catch (error) {
      if (error.name !== 'AbortError') {
        console.error('Error saving item:', error);
        alert(`Error saving item: ${error.message}`);
      }
    } finally {
      setIsSubmitting(false);
    }
  };
  

  // Debounced toggle availability function to prevent database connection flooding
  const toggleAvailabilityDebounced = useCallback(
    debounce(async (itemId, newAvailability) => {
      try {
        console.log(`Toggling availability for item ${itemId} to ${newAvailability}`);
        console.log('[MenuManagement] itemAvailability state:', itemAvailability);
        console.log('[MenuManagement] itemAvailability[itemId]:', itemAvailability[itemId]);
        
        // If trying to enable an item that has insufficient ingredients, require admin password
        if (newAvailability && itemAvailability[itemId] && !itemAvailability[itemId].isAvailable) {
          console.log('[MenuManagement] Item has insufficient ingredients, requiring admin override');
          console.log('[MenuManagement] Setting showAdminOverrideModal to true');
          // Store the pending change and show admin modal
          setPendingAvailabilityChange({ itemId, newAvailability });
          setShowAdminOverrideModal(true);
          // Revert the toggle temporarily
          setValue('isAvailable', false);
          return;
        }
        
        console.log('[MenuManagement] Proceeding with normal availability update');
        
        const response = await fetch(`${API_URL}/api/menu/${itemId}/availability`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ isAvailable: newAvailability })
        });

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.message || 'Failed to update availability');
        }

        const result = await response.json();
        console.log('Availability updated successfully:', result);
        
        // Update local state
        setMenuItems(prev => 
          prev.map(item => 
            item._id === itemId ? { ...item, isAvailable: newAvailability } : item
          )
        );
        
        // Update selected item if it's the one being edited
        if (selectedItem?._id === itemId) {
          setSelectedItem(prev => ({ ...prev, isAvailable: newAvailability }));
        }
      } catch (error) {
        console.error('Error toggling availability:', error);
        alert(`Failed to update availability: ${error.message}`);
        // Revert the checkbox state on error
        if (selectedItem?._id === itemId) {
          reset({ ...selectedItem, isAvailable: !newAvailability });
        }
      }
    }, 500), // 500ms debounce
    [selectedItem, setMenuItems, reset, itemAvailability, setValue, setPendingAvailabilityChange, setShowAdminOverrideModal]
  );

  // Handle admin override for availability
  const handleAdminOverride = async () => {
    if (!pendingAvailabilityChange || !adminPassword) {
      alert('Please enter admin password');
      return;
    }

    try {
      console.log('[AdminOverride] Verifying password...');
      
      // Get token from localStorage
      const token = localStorage.getItem('token') || localStorage.getItem('authToken');
      
      // Verify admin password
      const authResponse = await fetch('${API_URL}/api/auth/verify-admin', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          ...(token && { 'Authorization': `Bearer ${token}` })
        },
        body: JSON.stringify({ password: adminPassword })
      });

      console.log('[AdminOverride] Auth response status:', authResponse.status);
      
      if (!authResponse.ok) {
        const errorData = await authResponse.json().catch(() => ({}));
        console.error('[AdminOverride] Auth failed:', errorData);
        throw new Error(errorData.message || 'Invalid password');
      }
      
      const authData = await authResponse.json();
      console.log('[AdminOverride] Password verified successfully for user:', authData.username);

      // Password verified, proceed with availability change
      const { itemId, newAvailability } = pendingAvailabilityChange;
      
      const response = await fetch(`${API_URL}/api/menu/${itemId}/availability`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          isAvailable: newAvailability,
          adminOverride: true,
          reason: 'Admin override despite insufficient ingredients'
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to update availability');
      }

      const result = await response.json();
      console.log('Availability updated with admin override:', result);
      
      // Update local state
      setMenuItems(prev => 
        prev.map(item => 
          item._id === itemId ? { ...item, isAvailable: newAvailability } : item
        )
      );
      
      // Update selected item and form
      if (selectedItem?._id === itemId) {
        setSelectedItem(prev => ({ ...prev, isAvailable: newAvailability }));
        setValue('isAvailable', newAvailability);
      }
      
      // Close modal and reset
      setShowAdminOverrideModal(false);
      setAdminPassword('');
      setPendingAvailabilityChange(null);
      
      alert('Availability updated successfully with admin override');
    } catch (error) {
      console.error('Error with admin override:', error);
      alert(`Failed: ${error.message}`);
    }
  };

  const handleDelete = async () => {
    if (!selectedItem?._id || isDeleting) return;

    setIsDeleting(true);
    const controller = new AbortController();
    
    try {
      const response = await fetch(`${API_URL}/api/menu/${selectedItem._id}`, {
        method: 'DELETE',
        signal: controller.signal
      });

      if (!response.ok) throw new Error('Failed to delete item');
      
      setMenuItems(prev => {
        const currentItems = Array.isArray(prev) ? prev : [];
        return currentItems.filter(item => item._id !== selectedItem._id);
      });
      setShowDeleteModal(false);
      setSelectedItem(null);
    } catch (error) {
      if (error.name !== 'AbortError') {
        console.error('Delete error:', error);
        alert(`Delete failed: ${error.message}`);
      }
    } finally {
      setIsDeleting(false);
    }
  };

  useEffect(() => {
    if (selectedItem) {
      const categoryConfig = menuConfig[selectedItem.category]?.subCategories;
      const defaultSubCategory = categoryConfig ? Object.keys(categoryConfig)[0] : '';
      
      reset({
        ...selectedItem,
        code: selectedItem.code || '',
        subCategory: selectedItem.subCategory || defaultSubCategory
      });      if (selectedItem.image) {
        setImagePreview(
          selectedItem.image.startsWith('http') 
            ? selectedItem.image
            : `${API_URL}${selectedItem.image}`
        );
      } else {
        // Set imagePreview to null so the placeholder will be used
        setImagePreview(null);
      }
    }
  }, [selectedItem, reset]);

  // Category Management Functions
  const createCategory = async () => {
    if (!newCategoryName.trim()) return;
    
    try {
      const response = await fetch(`${API_URL}/api/categories`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: newCategoryName.trim(),
          displayName: newCategoryName.trim(),
          subCategories: []
        })
      });
      
      if (response.ok) {
        await fetchData(); // Refresh data
        setNewCategoryName('');
        alert('Category created successfully!');
      } else {
        throw new Error('Failed to create category');
      }
    } catch (error) {
      console.error('Error creating category:', error);
      alert('Error creating category: ' + error.message);
    }
  };

  const createSubCategory = async () => {
    if (!newSubCategoryName.trim() || !selectedCategoryForSubCat) return;
    
    try {
      const category = categories.find(cat => 
        (cat.name || cat.category) === selectedCategoryForSubCat
      );
      
      if (!category) {
        throw new Error('Category not found');
      }

      const response = await fetch(`${API_URL}/api/categories/${category._id}/subcategories`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: newSubCategoryName.trim(),
          displayName: newSubCategoryName.trim()
        })
      });
      
      if (response.ok) {
        await fetchData(); // Refresh data
        setNewSubCategoryName('');
        setSelectedCategoryForSubCat('');
        alert('Subcategory created successfully!');
      } else {
        throw new Error('Failed to create subcategory');
      }
    } catch (error) {
      console.error('Error creating subcategory:', error);
      alert('Error creating subcategory: ' + error.message);
    }
  };

  const deleteCategory = async (categoryId) => {
    if (!confirm('Are you sure you want to delete this category? This action cannot be undone.')) {
      return;
    }
    
    try {
      const response = await fetch(`${API_URL}/api/categories/${categoryId}`, {
        method: 'DELETE'
      });
      
      if (response.ok) {
        await fetchData(); // Refresh data
        alert('Category deleted successfully!');
      } else {
        throw new Error('Failed to delete category');
      }
    } catch (error) {
      console.error('Error deleting category:', error);
      alert('Error deleting category: ' + error.message);
    }
  };

  const deleteSubCategory = async (categoryId, subCategoryId) => {
    if (!confirm('Are you sure you want to delete this subcategory? This action cannot be undone.')) {
      return;
    }
    
    if (!categoryId || !subCategoryId) {
      alert('Error: Missing category ID or subcategory ID');
      console.error('Delete failed - categoryId:', categoryId, 'subCategoryId:', subCategoryId);
      return;
    }
    
    try {
      console.log('Deleting subcategory:', { categoryId, subCategoryId });
      
      const response = await fetch(`${API_URL}/api/categories/${categoryId}/subcategories/${subCategoryId}`, {
        method: 'DELETE'
      });
      
      const data = await response.json();
      console.log('Delete response:', data);
      
      if (response.ok && data.success) {
        await fetchData(); // Refresh data
        alert('Subcategory deleted successfully!');
      } else {
        throw new Error(data.message || 'Failed to delete subcategory');
      }
    } catch (error) {
      console.error('Error deleting subcategory:', error);
      alert('Error deleting subcategory: ' + error.message);
    }
  };

  // Size Management Functions
  const openSizeModal = (categoryId, subcategory) => {
    setEditingCategoryId(categoryId);
    setEditingSubcategory(subcategory);
    setSubcategorySizes(subcategory.sizes || []);
    
    // Extract all unique sizes from all subcategories for the dropdown
    const allSizes = new Map(); // Use Map to avoid duplicates
    categories.forEach(cat => {
      const subs = cat.subCategories || cat.subcategories || [];
      subs.forEach(sub => {
        if (sub.sizes && sub.sizes.length > 0) {
          sub.sizes.forEach(size => {
            const key = size.name || size;
            if (!allSizes.has(key)) {
              allSizes.set(key, {
                name: size.name || size,
                displayName: size.displayName || size.name || size
              });
            }
          });
        }
      });
    });
    
    setCommonSizes(Array.from(allSizes.values()));
    setFilteredSizes(Array.from(allSizes.values()));
    setShowSizeModal(true);
  };

  const handleSizeNameChange = (value) => {
    setNewSizeName(value);
    
    // Filter suggestions based on input
    if (value.trim()) {
      const filtered = commonSizes.filter(size => 
        size.name.toLowerCase().includes(value.toLowerCase()) ||
        size.displayName.toLowerCase().includes(value.toLowerCase())
      );
      setFilteredSizes(filtered);
      setShowSuggestions(filtered.length > 0);
    } else {
      setFilteredSizes(commonSizes);
      setShowSuggestions(false);
    }
  };

  const selectSuggestion = (size) => {
    setNewSizeName(size.name);
    setNewSizeDisplayName(size.displayName); // Always overwrite
    setShowSuggestions(false);
  };

  const addSize = () => {
    if (!newSizeName.trim()) {
      alert('Please enter a size name');
      return;
    }

    const newSize = {
      name: newSizeName.trim(),
      displayName: newSizeDisplayName.trim() || newSizeName.trim(),
      sortOrder: subcategorySizes.length,
      isDefault: subcategorySizes.length === 0 // First size is default
    };

    setSubcategorySizes([...subcategorySizes, newSize]);
    setNewSizeName('');
    setNewSizeDisplayName('');
  };

  const removeSize = (index) => {
    setSubcategorySizes(subcategorySizes.filter((_, i) => i !== index));
  };

  const saveSizes = async () => {
    try {
      const response = await fetch(
        `${API_URL}/api/categories/${editingCategoryId}/subcategories/${editingSubcategory._id}`,
        {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            sizes: subcategorySizes
          })
        }
      );

      const data = await response.json();

      if (response.ok && data.success) {
        await fetchData(); // Refresh categories
        setShowSizeModal(false);
        alert('Sizes saved successfully!');
      } else {
        throw new Error(data.message || 'Failed to save sizes');
      }
    } catch (error) {
      console.error('Error saving sizes:', error);
      alert('Error saving sizes: ' + error.message);
    }
  };

  const filteredMenuItems = menuItems.filter(item => {
    const matchesSearch = item.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.code.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = categoryFilter === 'All' || item.category === categoryFilter;
    return matchesSearch && matchesCategory;
  });

  if (loading) {
    return (
      <BrandedLoadingScreen 
        message="Loading menu items..." 
      />
    );
  }

  if (error) {
    return (
      <div className="p-8 text-center text-red-500">
        Error loading data: {error}. Please try refreshing the page.
      </div>
    );
  }

  return (
    <div style={{ backgroundColor: colors.background }} className="min-h-screen p-8 ml-0 md:ml-20">
      <div className="max-w-6xl mx-auto">        <div className="mb-8 flex justify-between items-center">
          <h1 style={{ color: colors.primary }} className="text-3xl font-bold">
            Menu Management
          </h1>
          <div className="flex gap-3">
            <button
              className="px-4 py-2 rounded-lg flex items-center gap-2 hover:opacity-90 transition-opacity shadow-sm"
              style={{ backgroundColor: colors.secondary, color: colors.background }}
              onClick={() => setShowCategoryManager(!showCategoryManager)}
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
              </svg>
              {showCategoryManager ? 'Hide Categories' : 'Manage Categories'}
            </button>
            <button
              style={{ backgroundColor: colors.accent, color: colors.background }}
              className="px-4 py-2 rounded-lg hover:opacity-90 flex items-center gap-2 shadow-md transition-all"
              onClick={() => {
                setSelectedItem(initialItem);
                setCurrentFormItem(null); // Clear form item for new item creation
              }}
            >
              <PlusIcon className="w-5 h-5" />
              <span>Add New Item</span>
            </button>
          </div>
        </div>

        {/* Category Management Section */}
        {showCategoryManager && (
          <div className="mb-8 bg-white rounded-lg shadow-sm border p-6" style={{ borderColor: colors.muted + '40' }}>
            <h2 className="text-xl font-semibold mb-6" style={{ color: colors.primary }}>
              Category Management
            </h2>
            
            {/* Create New Category */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
              <div>
                <h3 className="text-lg font-medium mb-3" style={{ color: colors.secondary }}>
                  Create New Category
                </h3>
                <div className="flex gap-2">
                  <input
                    type="text"
                    placeholder="Category name (e.g., Desserts)"
                    value={newCategoryName}
                    onChange={(e) => setNewCategoryName(e.target.value)}
                    className="flex-1 px-3 py-2 border rounded-lg focus:outline-none focus:ring-2"
                    style={{ borderColor: colors.muted, focusRingColor: colors.accent + '40' }}
                  />
                  <button
                    onClick={createCategory}
                    disabled={!newCategoryName.trim()}
                    className="px-4 py-2 rounded-lg font-medium flex items-center gap-2 transition-opacity disabled:opacity-50"
                    style={{ backgroundColor: colors.accent, color: colors.background }}
                  >
                    <PlusIcon className="w-4 h-4" />
                    Add
                  </button>
                </div>
              </div>
              
              <div>
                <h3 className="text-lg font-medium mb-3" style={{ color: colors.secondary }}>
                  Add Subcategory
                </h3>
                <div className="space-y-2">
                  <select
                    value={selectedCategoryForSubCat}
                    onChange={(e) => setSelectedCategoryForSubCat(e.target.value)}
                    className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2"
                    style={{ borderColor: colors.muted, focusRingColor: colors.accent + '40' }}
                  >
                    <option value="">Select a category</option>
                    {categories.map((cat, index) => {
                      const categoryName = cat.name || cat.category;
                      return (
                        <option key={cat._id || `cat-option-${index}`} value={categoryName}>
                          {categoryName}
                        </option>
                      );
                    })}
                  </select>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      placeholder="Subcategory name"
                      value={newSubCategoryName}
                      onChange={(e) => setNewSubCategoryName(e.target.value)}
                      className="flex-1 px-3 py-2 border rounded-lg focus:outline-none focus:ring-2"
                      style={{ borderColor: colors.muted, focusRingColor: colors.accent + '40' }}
                    />
                    <button
                      onClick={createSubCategory}
                      disabled={!newSubCategoryName.trim() || !selectedCategoryForSubCat}
                      className="px-4 py-2 rounded-lg font-medium flex items-center gap-2 transition-opacity disabled:opacity-50"
                      style={{ backgroundColor: colors.accent, color: colors.background }}
                    >
                      <PlusIcon className="w-4 h-4" />
                      Add
                    </button>
                  </div>
                </div>
              </div>
            </div>
            
            {/* Categories List */}
            <div>
              <h3 className="text-lg font-medium mb-4" style={{ color: colors.secondary }}>
                Current Categories
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {categories.map((category, index) => {
                  const categoryName = category.name || category.category;
                  return (
                    <div key={category._id || `category-${index}`} className="border rounded-lg p-4" style={{ borderColor: colors.muted + '40' }}>
                      <div className="flex justify-between items-start mb-3">
                        <h4 className="font-semibold" style={{ color: colors.primary }}>
                          {categoryName}
                        </h4>
                        <button
                          onClick={() => deleteCategory(category._id)}
                          className="p-1 text-red-500 hover:text-red-700 hover:bg-red-50 rounded transition-colors"
                          title="Delete category"
                        >
                          <TrashIcon className="w-4 h-4" />
                        </button>
                      </div>
                      
                      {/* Subcategories */}
                      <div className="space-y-1">
                        {/* Use subCategories (camelCase) - the correct field from database */}
                        {(category.subCategories && category.subCategories.length > 0) ? (
                          <>
                            {category.subCategories
                              .filter(subCat => subCat.isActive !== false) // Only show active subcategories
                              .map((subCat, index) => (
                              <div key={subCat._id || `${category._id}-sub-${index}`} className="flex justify-between items-center text-sm py-2 border-b last:border-b-0" style={{ borderColor: colors.muted + '20' }}>
                                <div className="flex-1">
                                  <div className="flex items-center gap-2">
                                    <span style={{ color: colors.secondary }} className="font-medium">
                                      {subCat.displayName || subCat.name || `Subcategory ${index + 1}`}
                                    </span>
                                    {subCat.sizes && subCat.sizes.length > 0 && (
                                      <span className="text-xs px-2 py-0.5 rounded" style={{ backgroundColor: colors.activeBg, color: colors.accent }}>
                                        {subCat.sizes.length} sizes
                                      </span>
                                    )}
                                  </div>
                                  {subCat.sizes && subCat.sizes.length > 0 && (
                                    <div className="text-xs text-gray-500 mt-1">
                                      {subCat.sizes.map(s => s.displayName || s.name).join(', ')}
                                    </div>
                                  )}
                                </div>
                                <div className="flex gap-1">
                                  <button
                                    onClick={() => openSizeModal(category._id, subCat)}
                                    className="px-2 py-1 text-xs rounded transition-colors"
                                    style={{ backgroundColor: colors.activeBg, color: colors.accent }}
                                    title="Manage sizes"
                                  >
                                    Sizes
                                  </button>
                                  <button
                                    onClick={() => deleteSubCategory(category._id, subCat._id)}
                                    className="p-1 text-red-400 hover:text-red-600 hover:bg-red-50 rounded transition-colors"
                                    title="Delete subcategory"
                                  >
                                    <TrashIcon className="w-3 h-3" />
                                  </button>
                                </div>
                              </div>
                            ))}
                          </>
                        ) : (
                          <p className="text-sm text-gray-500">No subcategories</p>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
              
              {categories.length === 0 && (
                <p className="text-gray-500 text-center py-8">
                  No categories found. Categories will be loaded from the database or you can create new ones above.
                </p>
              )}
            </div>
          </div>
        )}

        {/* Search and Filter Bar */}
        <div className="mb-6 mx-6">
          <div className="flex gap-4 items-center">
            {/* Search Bar */}
            <div className="relative flex-1 max-w-md">
              <input
                type="text"
                placeholder="Search by item name or code..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-3 border rounded-lg text-sm focus:outline-none focus:ring-2 transition-all"
                style={{ 
                  borderColor: colors.muted,
                  focusRingColor: colors.accent + '40'
                }}
              />
              <svg 
                xmlns="http://www.w3.org/2000/svg" 
                className="h-5 w-5 absolute left-3 top-3.5" 
                fill="none" 
                viewBox="0 0 24 24" 
                stroke={searchTerm ? colors.accent : colors.muted}
                strokeWidth={2}
              >
                <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </div>
            
            {/* Category Filter */}
            <div className="flex items-center gap-2">
              <label className="text-sm font-medium whitespace-nowrap" style={{ color: colors.primary }}>
                Filter by:
              </label>
              <select
                value={categoryFilter}
                onChange={(e) => setCategoryFilter(e.target.value)}
                className="px-3 py-3 border rounded-lg text-sm focus:outline-none focus:ring-2 transition-all min-w-[120px]"
                style={{ 
                  borderColor: colors.muted,
                  focusRingColor: colors.accent + '40'
                }}
              >
                <option value="All">All Categories</option>
                <option value="Beverages">Beverages</option>
                <option value="Meals">Meals</option>
              </select>
            </div>
          </div>
        </div>{/* Menu List Table */}
        <div className="overflow-y-auto rounded-xl shadow-lg mx-6" style={{ border: `1px solid ${colors.muted}20`, maxHeight: '520px' }}>
          <table className="w-full">            <thead style={{ backgroundColor: colors.background, borderBottom: `2px solid ${colors.activeBg}`, position: 'sticky', top: 0, zIndex: 10 }}>
              <tr style={{ backgroundColor: colors.activeBg }}>
                <th className="p-4 text-left text-sm font-semibold" style={{ color: colors.primary }}>Code</th>
                <th className="p-4 text-left text-sm font-semibold" style={{ color: colors.primary }}>Item</th>
                <th className="p-4 text-left text-sm font-semibold" style={{ color: colors.primary }}>Category</th>
                <th className="p-4 text-left text-sm font-semibold" style={{ color: colors.primary }}>Availability</th>
                <th className="p-4 text-left text-sm font-semibold" style={{ color: colors.primary }}>Price</th>
                <th className="p-4 text-left text-sm font-semibold" style={{ color: colors.primary }}>Actions</th>
              </tr>
            </thead>
            <tbody>              {filteredMenuItems.length === 0 ? (
                <tr>
                  <td colSpan="6" className="py-10">
                    <div className="flex flex-col items-center justify-center gap-3">
                      <div className="w-16 h-16 rounded-full flex items-center justify-center" style={{ backgroundColor: colors.activeBg }}>
                        <PlusIcon className="w-8 h-8" style={{ color: colors.accent }} />
                      </div>
                      <p className="text-gray-500 font-medium">No menu items found</p>
                      <button
                        onClick={() => {
                          setSelectedItem(initialItem);
                          setCurrentFormItem(null); // Clear form item for new item creation
                        }}
                        className="mt-2 px-4 py-2 rounded-lg flex items-center gap-2"
                        style={{ backgroundColor: colors.accent, color: colors.background }}
                      >
                        <PlusIcon className="w-4 h-4" />
                        <span>Add New Item</span>
                      </button>
                    </div>
                  </td>
                </tr>
              ) : (
                filteredMenuItems.map(item => (                  <tr
                    key={item._id}
                    style={{ borderColor: colors.muted + '20' }}
                    className="border-t hover:bg-gray-50"
                  >                    <td className="p-4 font-mono" style={{ color: colors.accent }}>
                      <span className="px-2 py-1 rounded-md text-sm" style={{ backgroundColor: colors.activeBg }}>
                        {item.code || '--'}
                      </span>
                    </td>
                    <td className="p-4">
                      <div className="flex items-center gap-3">                        <div 
                          className="w-10 h-10 bg-cover bg-center border rounded-sm overflow-hidden"                          style={{ 
                            backgroundImage: `url(${item.image ? 
                              (item.image.startsWith('http') ? item.image : 
                               (item.image.startsWith('data:') ? item.image : 
                                `${API_URL}${item.image}`)) : 
                              (item.category === 'Beverages' ? '/placeholders/drinks.png' : '/placeholders/meal.png')})`,
                            borderColor: colors.muted
                          }}
                        />
                        <span className="font-medium">{item.name}</span>
                      </div>
                    </td>
                    <td className="p-4">
                      <span className="px-2.5 py-1 rounded-lg text-xs" 
                            style={{ 
                              backgroundColor: item.category === 'Beverages' ? '#E7F5FE' : '#FDF1E7', 
                              color: item.category === 'Beverages' ? '#0284C7' : '#EA580C'
                            }}>
                        {item.category}
                      </span>
                    </td>
                    <td className="p-4">
                      <div className="flex flex-col gap-1">
                        {/* Real-time availability status */}
                        <div className="flex items-center gap-2">
                          {itemAvailability[item._id] ? (
                            <>
                              <div className={`w-2 h-2 rounded-full ${
                                itemAvailability[item._id].isAvailable ? 'bg-green-500' : 'bg-red-500'
                              }`} />
                              <span className={`text-xs font-medium ${
                                itemAvailability[item._id].isAvailable ? 'text-green-700' : 'text-red-700'
                              }`}>
                                {itemAvailability[item._id].isAvailable ? 'Available' : 'Out of Stock'}
                              </span>
                            </>
                          ) : (
                            <>
                              <div className="w-2 h-2 rounded-full bg-gray-400" />
                              <span className="text-xs text-gray-500">Checking...</span>
                            </>
                          )}
                        </div>
                        
                        {/* Ingredient tracking indicator */}
                        {itemAvailability[item._id]?.hasIngredientTracking && (
                          <div className="flex items-center gap-1">
                            <svg className="w-3 h-3 text-blue-500" fill="currentColor" viewBox="0 0 20 20">
                              <path fillRule="evenodd" d="M6.267 3.455a3.066 3.066 0 001.745-.723 3.066 3.066 0 013.976 0 3.066 3.066 0 001.745.723 3.066 3.066 0 012.812 2.812c.051.643.304 1.254.723 1.745a3.066 3.066 0 010 3.976 3.066 3.066 0 00-.723 1.745 3.066 3.066 0 01-2.812 2.812 3.066 3.066 0 00-1.745.723 3.066 3.066 0 01-3.976 0 3.066 3.066 0 00-1.745-.723 3.066 3.066 0 01-2.812-2.812 3.066 3.066 0 00-.723-1.745 3.066 3.066 0 010-3.976 3.066 3.066 0 00.723-1.745 3.066 3.066 0 012.812-2.812zm7.44 5.252a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                            </svg>
                            <span className="text-xs text-blue-600">Tracked</span>
                          </div>
                        )}
                        
                        {/* Cost analysis preview */}
                        {itemCostAnalysis[item._id] && (
                          <div className="text-xs text-gray-500">
                            Cost: ₱{itemCostAnalysis[item._id].totalCost || 0}
                          </div>
                        )}
                      </div>
                    </td><td className="p-3 relative">
  <div className="flex flex-col">
    <button 
      className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-left border hover:bg-gray-50 transition-all"
      style={{ borderColor: colors.muted }}
      onClick={() => setExpandedItemId(prev => prev === item._id ? null : item._id)}
    >
      {Object.entries(item.pricing).map(([size, price], index) => (
        index === 0 && (
          <span key={size} className="flex items-center">
            <span className="font-medium">₱{price.toFixed(2)}</span>
            {Object.keys(item.pricing).length > 1 && (
              <span 
                className="ml-1.5 px-1.5 py-0.5 rounded text-xs"
                style={{ backgroundColor: colors.activeBg, color: colors.accent }}
              >
                +{Object.keys(item.pricing).length - 1}
              </span>
            )}
            <ViewIcon className="w-4 h-4 ml-1.5" style={{ color: colors.accent }} />
          </span>
        )
      ))}
    </button>
      {expandedItemId === item._id && (
      <div 
        className="absolute top-full left-0 z-20 p-3 border rounded-lg shadow-lg mt-1"
        style={{
          backgroundColor: colors.background,
          borderColor: colors.muted
        }}
      >
        <div className="font-medium mb-1.5 pb-1.5 border-b" style={{ borderColor: colors.muted + '40' }}>Price Details</div>
        {Object.entries(item.pricing).map(([size, price]) => (
          <div 
            key={size} 
            className="whitespace-nowrap text-sm py-1 flex justify-between gap-4"
          >
            <span>{size}:</span> <span className="font-medium">₱{price.toFixed(2)}</span>
          </div>
        ))}
      </div>
    )}
  </div>
</td><td className="p-3">
                      <div className="flex gap-2 items-center">
                        <button
                          style={{ backgroundColor: colors.accent, color: colors.background }}
                          className="flex items-center gap-1 px-3 py-1.5 rounded-lg hover:opacity-90 transition-opacity"
                          onClick={() => {
                            setSelectedItem(item);
                            setCurrentFormItem(item); // Set form item for ingredient mapping
                          }}
                        >
                          <EditIcon className="w-4 h-4" />
                          <span className="text-sm">Edit</span>
                        </button>
                        <button
                          style={{ backgroundColor: colors.secondary, color: colors.background }}
                          className="flex items-center gap-1 px-3 py-1.5 rounded-lg hover:opacity-90 transition-opacity"
                          onClick={() => {
                            setSelectedItem(item);
                            setCurrentFormItem(item); // Set form item for ingredient mapping
                            setShowDeleteModal(true);
                          }}
                        >
                          <TrashIcon className="w-4 h-4" />
                          <span className="text-sm">Delete</span>
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>        {/* Add/Edit Form Modal */}
        {selectedItem && (
  <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center md:pl-20 z-50"><div 
      style={{ backgroundColor: colors.background }}
      className="p-6 rounded-lg w-full max-w-3xl max-h-[90vh] flex flex-col shadow-2xl"
    >
      <div className="flex justify-between items-center mb-6 pb-3 border-b" style={{ borderColor: colors.muted + '40' }}>
        <h2 className="text-2xl font-bold" style={{ color: colors.primary }}>
          {selectedItem._id ? 'Edit' : 'Add'} Menu Item
        </h2>
        <button 
          onClick={() => {
            setSelectedItem(null);
            setCurrentFormItem(null); // Clear form item when closing
          }} 
          className="p-1.5 rounded-full hover:bg-gray-100 transition-colors"
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>
      
      <form onSubmit={handleSubmit(onSubmit)} className="flex-1 overflow-y-auto pr-2">
        {/* Image Section */}
        <div className="mb-6">
          <label className="block text-lg font-medium mb-2">Item Image</label>
          <div className="flex items-center gap-6">
            <div className="relative">
              <label className="cursor-pointer">
                <div 
                  className="w-32 h-32 border-2 border-dashed rounded-lg flex items-center justify-center"
                  style={{ borderColor: colors.muted }}                >
                  {imagePreview ? (
                    <MenuItemImage
                      image={imagePreview}
                      category={selectedCategory}
                      alt="Preview"
                      size="100%"
                      className="w-full h-full rounded-lg"
                    />
                  ) : (
                    <MenuItemImage
                      image=""
                      category={selectedCategory}
                      alt="Default Item Image"
                      size="100%"
                      className="w-full h-full rounded-lg opacity-50" 
                    />
                  )}
                </div>
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleImageChange}
                  className="hidden"
                />
              </label>
              {imagePreview && (
                <button
                  type="button"
                  onClick={() => {
                    setImagePreview(null);
                    setImageFile(null);
                  }}
                  className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1 text-xs shadow-md"
                >
                  ×
                </button>
              )}
            </div>
            <div className="flex-1">
              <p className="text-sm text-gray-600">
                Recommended size: 500x500px
                <br />
                Max file size: 5MB
                <br />
                Formats: JPEG, PNG, WEBP
              </p>
            </div>
          </div>
        </div>

        {/* Basic Info Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
          <div>
            <label className="block text-sm font-medium mb-2">Item Code</label>
            <input
              {...register('code', { 
                required: 'Required',
                pattern: {
                  value: /^[A-Z0-9]{3,5}$/i,
                  message: '3-5 alphanumeric characters'
                }
              })}
              className="w-full p-2 text-sm border rounded-lg"
              style={{ borderColor: colors.muted }}
              placeholder="WG1, RCM2, etc"
            />
            {errors.code && (
              <span className="text-red-500 text-xs">{errors.code.message}</span>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">Item Name</label>
            <input
              {...register('name', { required: 'Required' })}
              className="w-full p-2 text-sm border rounded-lg"
              style={{ borderColor: colors.muted }}
            />
            {errors.name && (
              <span className="text-red-500 text-xs">{errors.name.message}</span>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">Category</label>
            <select
              {...register('category')}
              className="w-full p-2 text-sm border rounded-lg"
              style={{ borderColor: colors.muted }}
            >
              {/* Prefer backend-driven categories */}
              {(categories && categories.length > 0 ? categories.map(c => c.name || c.category) : Object.keys(menuConfig)).map((cat) => (
                <option key={cat} value={cat}>{cat}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">Subcategory</label>
            <select
              {...register('subCategory')}
              className="w-full p-2 text-sm border rounded-lg"
              style={{ borderColor: colors.muted }}
            >
              {(() => {
                // derive subcategory names from backend categories first
                const backendCategory = categories.find(c => (c.name || c.category) === selectedCategory);
                let subs = [];
                if (backendCategory) {
                  subs = (backendCategory.subCategories || backendCategory.subcategories || []).map(s => s.displayName || s.name || s);
                }
                // fallback to menuConfig transformed dynamic mapping
                if (!subs || subs.length === 0) {
                  subs = Object.keys(menuConfig[selectedCategory]?.subCategories || {});
                }
                // final fallback to MENU_CONFIG constant if present
                if ((!subs || subs.length === 0) && typeof MENU_CONFIG !== 'undefined') {
                  subs = MENU_CONFIG[selectedCategory]?.subCategories || [];
                }

                return subs.map((subKey) => (
                  <option key={subKey} value={subKey}>{subKey}</option>
                ));
              })()}
            </select>
          </div>
        </div>

        {/* Pricing Section */}
        <div className="mb-6">
          <h3 className="text-lg font-medium mb-4" style={{ color: colors.primary }}>
            Pricing
          </h3>
          
          {(() => {
            // First, determine if subcategory has sizes configured
            const backendCategory = categories.find(c => (c.name || c.category) === selectedCategory);
            let sizes = [];
            
            if (backendCategory) {
              const subcategory = (backendCategory.subCategories || backendCategory.subcategories || [])
                .find(sub => (sub.name || sub.displayName) === selectedSubCategory);
              
              if (subcategory && subcategory.sizes && subcategory.sizes.length > 0) {
                sizes = subcategory.sizes;
              }
            }
            
            // Fallback to menuConfig if no backend sizes found
            if (sizes.length === 0 && menuConfig[selectedCategory]?.subCategories[selectedSubCategory]?.sizes) {
              sizes = menuConfig[selectedCategory].subCategories[selectedSubCategory].sizes;
              // Ensure sizes from menuConfig are in proper object format
              if (sizes.length > 0 && typeof sizes[0] === 'string') {
                sizes = sizes.map(s => ({
                  name: s,
                  displayName: s
                }));
              }
            }

            const hasSizes = sizes.length > 0;
            
            // Debug logging for pricing section
            if (hasSizes) {
              console.log('Pricing section - sizes detected:', sizes.map(s => ({
                name: s.name || s,
                displayName: s.displayName || s.name || s
              })));
            }
            const ignoreSizes = watch('ignoreSizes');

            return (
              <>
                {/* Only show ignore sizes checkbox if subcategory has sizes configured */}
                {hasSizes && (
                  <div className="mb-4 flex items-center gap-2">
                    <input
                      type="checkbox"
                      id="ignoreSizes"
                      {...register('ignoreSizes')}
                      className="w-4 h-4 cursor-pointer"
                    />
                    <label htmlFor="ignoreSizes" className="text-sm cursor-pointer">
                      Single price only (ignore size options)
                    </label>
                    <span className="text-xs text-gray-500 ml-2">
                      Use for items like "Lemon Yakult" that don't have size variations
                    </span>
                  </div>
                )}

                {ignoreSizes && hasSizes ? (
                  <div>
                    <p className="text-sm text-gray-600 mb-2">
                      Single price for this item
                    </p>
                    <div className="flex items-center gap-2 p-2 border rounded-lg max-w-md" style={{ borderColor: colors.muted + '40' }}>
                      <label className="w-24 font-medium text-sm">Price</label>
                      <div className="flex-1 flex items-center">
                        <span className="mr-2">₱</span>
                        <input
                          type="number"
                          {...register('pricing.single', { required: true, min: 0 })}
                          className="w-full p-2 border rounded-lg text-sm"
                          style={{ borderColor: colors.muted }}
                          step="0.01"
                          placeholder="0.00"
                        />
                      </div>
                    </div>
                  </div>
                ) : hasSizes ? (
                  <div className="space-y-3">
                    <p className="text-sm text-gray-600 mb-2">
                      Set prices for each size option
                    </p>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      {sizes.map((size) => {
                        const sizeName = size.name || size;
                        const displayName = size.displayName || size.name || size;
                        return (
                          <div key={sizeName} className="flex items-center gap-2 p-2 border rounded-lg" style={{ borderColor: colors.muted + '40' }}>
                            <label className="w-32 font-medium text-sm">{displayName}</label>
                            <div className="flex-1 flex items-center">
                              <span className="mr-2">₱</span>
                              <input
                                type="number"
                                {...register(`pricing.${sizeName}`, { required: true, min: 0 })}
                                className="w-full p-2 border rounded-lg text-sm"
                                style={{ borderColor: colors.muted }}
                                step="0.01"
                                placeholder="0.00"
                              />
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ) : (
                  <div>
                    <p className="text-sm text-gray-600 mb-2">
                      No sizes configured for this subcategory
                    </p>
                    <div className="flex items-center gap-2 p-2 border rounded-lg max-w-md" style={{ borderColor: colors.muted + '40' }}>
                      <label className="w-24 font-medium text-sm">Price</label>
                      <div className="flex-1 flex items-center">
                        <span className="mr-2">₱</span>
                        <input
                          type="number"
                          {...register('pricing.single', { required: true, min: 0 })}
                          className="w-full p-2 border rounded-lg text-sm"
                          style={{ borderColor: colors.muted }}
                          step="0.01"
                          placeholder="0.00"
                        />
                      </div>
                    </div>
                  </div>
                )}
              </>
            );
          })()}
        </div>

        {/* Add-Ons Section */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-medium" style={{ color: colors.primary }}>
              Add-Ons
            </h3>
            <button
              type="button"
              onClick={() => setIsAddOnsExpanded(!isAddOnsExpanded)}
              className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm hover:bg-gray-100 transition-colors"
              style={{ color: colors.primary }}
            >
              {isAddOnsExpanded ? 'Collapse' : 'Expand'}
              <ChevronIcon className="w-4 h-4" isExpanded={isAddOnsExpanded} />
            </button>
          </div>
          
          {isAddOnsExpanded && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {addOns
              .filter(a => {
                const currentSubCategory = menuConfig[selectedCategory]?.subCategories[selectedSubCategory];
                return currentSubCategory?.addons?.includes(a.name) ||
                       a.category === selectedCategory;
              })
              .map((addOn) => (
                <div 
                  key={addOn._id} 
                  className="flex items-center justify-between p-3.5 rounded-lg border hover:border-opacity-100 transition-all hover:shadow-sm"
                  style={{ borderColor: colors.muted + '80', backgroundColor: colors.background }}
                >
                  <label className="flex items-center gap-3 cursor-pointer flex-1">
                    <div className="flex items-center justify-center">
                      <input
                        type="checkbox"
                        value={addOn._id}
                        {...register('modifiers')}
                        className="form-checkbox h-5 w-5 rounded border-2 focus:ring-2 focus:ring-offset-2 transition-all"
                        style={{ color: colors.accent, borderColor: colors.muted }}
                      />
                    </div>
                    <div className="flex-1">
                      <p className="font-medium">{addOn.name}</p>
                      <div className="flex items-center mt-0.5">
                        <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium" 
                              style={{ backgroundColor: colors.activeBg, color: colors.accent }}>
                          +₱{addOn.price.toFixed(2)}
                        </span>
                        <span className="ml-2 text-xs text-gray-500">{addOn.category}</span>
                      </div>
                    </div>
                  </label>
                  <button
                    type="button"
                    onClick={() => setAddOnToDelete(addOn._id)}
                    className="p-1.5 rounded-full hover:bg-red-100 text-red-500 hover:text-red-700 transition-colors"
                  >
                    <TrashIcon className="w-4 h-4" />
                  </button>
                </div>
              ))}
              
            {addOns.filter(a => {
              const currentSubCategory = menuConfig[selectedCategory]?.subCategories[selectedSubCategory];
              return currentSubCategory?.addons?.includes(a.name) ||
                     a.category === selectedCategory;
            }).length === 0 && (
              <div className="col-span-2 p-6 border border-dashed rounded-lg flex flex-col items-center justify-center"
                   style={{ borderColor: colors.muted + '60' }}>
                <p className="text-gray-500 mb-3">No relevant add-ons found for this item type</p>                <button
                  type="button"
                  className="px-3 py-1.5 rounded-lg flex items-center gap-1.5 shadow-sm hover:opacity-90 transition-opacity"
                  style={{ backgroundColor: colors.accent, color: colors.background }}
                  onClick={() => setShowAddOnModal(true)}
                >
                  <PlusIcon className="w-4 h-4" />
                  Create Add-On
                </button>
              </div>
            )}
          </div>
          )}
        </div>        {/* Description */}
        <div className="mb-8">
          <div className="flex justify-between items-center mb-2">
            <label className="block text-lg font-medium" style={{ color: colors.primary }}>
              Description
            </label>
            <div className="relative">
              <button
                type="button"
                className="px-3 py-1.5 rounded-lg flex items-center gap-1.5 hover:opacity-90 transition-opacity text-sm"
                style={{ backgroundColor: colors.accent, color: colors.background }}
                onClick={async () => {
                  // Get current values from the form
                  const itemName = getValues('name');
                  const basicDesc = getValues('description') || 'A delicious menu item';
                  
                  if (!itemName) {
                    alert('Please enter an item name first');
                    return;
                  }
                  
                  // Show loading state
                  const descField = document.querySelector('textarea[name="description"]');
                  const originalDesc = descField.value;
                  descField.value = 'Generating AI description...';
                  descField.disabled = true;
                  
                  try {
                    // Call the AI description generator
                    const aiDescription = await generateMenuItemDescription(itemName, basicDesc);
                    
                    // Update the form with the AI-generated description
                    setValue('description', aiDescription);
                  } catch (error) {
                    console.error('Error generating AI description:', error);
                    // Restore original on error
                    descField.value = originalDesc;
                    alert('Failed to generate AI description. Please try again.');
                  } finally {
                    // Re-enable the field
                    descField.disabled = false;
                  }
                }}
              >
                <svg 
                  xmlns="http://www.w3.org/2000/svg" 
                  width="16" 
                  height="16" 
                  viewBox="0 0 24 24" 
                  fill="none" 
                  stroke="currentColor" 
                  strokeWidth="2" 
                  strokeLinecap="round" 
                  strokeLinejoin="round"
                >
                  <path d="M12 2a4 4 0 0 1 4 4v4a4 4 0 1 1-8 0V6a4 4 0 0 1 4-4Z"/>
                  <path d="M18 8h2a2 2 0 0 1 2 2v2a8 8 0 0 1-16 0v-2a2 2 0 0 1 2-2h2"/>
                  <path d="M10 18v.27a2 2 0 0 0 4 0V18"/>
                </svg>
                Generate AI Description
              </button>
            </div>
          </div>
          <textarea
            {...register('description')}
            className="w-full p-3 text-sm border rounded-lg"
            style={{ borderColor: colors.muted }}
            rows="3"
            placeholder="Add a delicious description for this item or use the AI button to generate one..."
          />
          <div className="mt-1 text-xs text-gray-500">
            Tip: If you're not sure what to write, enter a simple description or ingredients, then click "Generate AI Description"
          </div>
        </div>

        {/* Ingredient Mapping Section */}
        <div className="mb-8">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-lg font-medium" style={{ color: colors.primary }}>
              Ingredient Mapping
            </h3>
            <div className="flex gap-2">
              {selectedIngredients.length > 0 && (currentFormItem || (selectedItem && selectedItem._id)) && (
                <button
                  type="button"
                  onClick={async () => {
                    if (confirm('Are you sure you want to remove all ingredient mappings? This will unmap all ingredients from this menu item.')) {
                      const itemId = currentFormItem?._id || selectedItem?._id;
                      if (itemId) {
                        const success = await updateMenuItemIngredients(itemId, []);
                        if (success) {
                          setSelectedIngredients([]);
                          alert('All ingredient mappings removed successfully!');
                        }
                      }
                    }
                  }}
                  className="px-3 py-1.5 rounded-lg flex items-center gap-1.5 hover:opacity-90 transition-opacity text-sm text-white"
                  style={{ backgroundColor: '#dc2626' }}
                >
                  <TrashIcon className="w-4 h-4" />
                  Unmap All
                </button>
              )}
              <button
                type="button"
                onClick={() => setShowIngredientModal(true)}
                className="px-3 py-1.5 rounded-lg flex items-center gap-1.5 hover:opacity-90 transition-opacity text-sm"
                style={{ backgroundColor: colors.accent, color: colors.background }}
              >
                <PlusIcon className="w-4 h-4" />
                Add Ingredients
              </button>
            </div>
          </div>
          
          <div className="p-4 rounded-lg border" style={{ borderColor: colors.muted, backgroundColor: colors.background }}>
            {selectedIngredients.length > 0 ? (
              <div className="space-y-2">
                {selectedIngredients.map((ingredient, index) => (
                  <div key={ingredient.ingredientId} className="flex items-center justify-between p-2 border rounded" style={{ borderColor: colors.muted }}>
                    <div className="flex-1">
                      <span className="font-medium">{ingredient.name}</span>
                      <span className="text-sm text-gray-500 ml-2">
                        Qty: {ingredient.quantityNeeded} {ingredient.unit}
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={() => removeIngredientFromMenu(ingredient.ingredientId)}
                      className="text-red-600 hover:text-red-800 p-1"
                    >
                      <TrashIcon className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-gray-500">
                <p>No ingredients mapped yet</p>
                <p className="text-sm">
                  {currentFormItem || (selectedItem && selectedItem._id) 
                    ? 'Click "Add Ingredients" to map inventory items to this menu item'
                    : 'You can add ingredients now and they will be saved when you create the menu item'
                  }
                </p>
              </div>
            )}
            
            {selectedIngredients.length > 0 && (
              <div className="mt-4 p-3 bg-blue-50 rounded-lg border border-blue-200">
                <h4 className="font-medium text-blue-900 mb-2">
                  {currentFormItem || (selectedItem && selectedItem._id) 
                    ? 'Cost Analysis Preview' 
                    : 'Ingredients Ready for Mapping'
                  }
                </h4>
                <div className="text-sm text-blue-700">
                  <p>Mapped Ingredients: {selectedIngredients.length}</p>
                  <p className="text-xs mt-1">
                    {currentFormItem || (selectedItem && selectedItem._id)
                      ? 'Cost analysis will be calculated after saving the ingredients'
                      : 'These ingredients will be automatically mapped when you save the menu item'
                    }
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Availability Toggle Section */}
        <div className="mb-8">
          <h3 className="text-lg font-medium mb-4" style={{ color: colors.primary }}>
            Availability
          </h3>
          <div className="flex items-center justify-between p-4 rounded-lg border" 
               style={{ borderColor: colors.muted, backgroundColor: colors.background }}>
            <div>
              <label className="text-sm font-medium" style={{ color: colors.primary }}>
                Item Available for Ordering
              </label>
              <p className="text-xs text-gray-500 mt-1">
                When disabled, customers cannot order this item in the Point of Sale system
              </p>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                {...register('isAvailable')}
                className="sr-only peer"
                onChange={(e) => {
                  // Only toggle if editing an existing item
                  if (selectedItem?._id) {
                    toggleAvailabilityDebounced(selectedItem._id, e.target.checked);
                  }
                }}
              />
              <div className="relative w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-orange-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-orange-500"></div>
            </label>
          </div>
        </div>

        {/* Actions */}
        <div className="sticky bottom-0 bg-white pt-4 pb-2 border-t shadow-md"
          style={{ borderColor: colors.muted + '40', backgroundColor: colors.background }}>
          <div className="flex justify-end gap-3">
            <button
              type="button"
              className="px-6 py-2.5 border rounded-lg font-medium flex items-center justify-center gap-2 hover:bg-gray-50 transition-colors"
              style={{ borderColor: colors.muted }}
              onClick={() => {
                setSelectedItem(null);
                setCurrentFormItem(null); // Clear form item when canceling
              }}
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className={`px-6 py-2.5 rounded-lg font-medium flex items-center justify-center gap-2 transition-opacity ${
                isSubmitting ? 'opacity-50 cursor-not-allowed' : 'hover:opacity-90'
              }`}
              style={{ backgroundColor: colors.primary, color: colors.background }}
            >
              {isSubmitting ? (
                <>
                  <svg className="animate-spin h-5 w-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Saving...
                </>
              ) : selectedItem._id ? (
                <>
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  Update Item
                </>
              ) : (
                <>
                  <PlusIcon className="h-5 w-5" />
                  Create Item
                </>
              )}
            </button>
          </div>
        </div>
      </form>
    </div>
  </div>
)}        {/* Add-On Creation Modal */}
        {showAddOnModal && (
          <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-50"><div
              style={{ backgroundColor: colors.background }}
              className="p-6 rounded-lg w-96 shadow-2xl"
            >
              <div className="flex justify-between items-center mb-6 pb-3 border-b" style={{ borderColor: colors.muted + '40' }}>
                <h3 className="text-xl font-bold" style={{ color: colors.primary }}>Create New Add-On</h3>
                <button 
                  onClick={() => setShowAddOnModal(false)} 
                  className="p-1 rounded-full hover:bg-gray-100 transition-colors"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
              <div className="space-y-4">
                <div>
                  <label className="block mb-1">Name</label>
                  <input
                    type="text"
                    value={newAddOn.name}
                    onChange={(e) =>
                      setNewAddOn({ ...newAddOn, name: e.target.value })
                    }
                    className="w-full p-2 border rounded"
                    style={{ borderColor: colors.muted }}
                  />
                </div>
                <div>
                  <label className="block mb-1">Price</label>
                  <input
                    type="number"
                    value={newAddOn.price}
                    onChange={(e) =>
                      setNewAddOn({ ...newAddOn, price: Number(e.target.value) })
                    }
                    className="w-full p-2 border rounded"
                    style={{ borderColor: colors.muted }}
                  />
                </div>
                <div>
                  <label className="block mb-1">Category</label>
                  <select
                    value={newAddOn.category}
                    onChange={(e) =>
                      setNewAddOn({ ...newAddOn, category: e.target.value })
                    }
                    className="w-full p-2 border rounded"
                    style={{ borderColor: colors.muted }}
                  >
                    {Object.keys(menuConfig).map((cat) => (
                      <option key={cat} value={cat}>
                        {cat}
                      </option>
                    ))}
                  </select>
                </div>                <div className="flex justify-end gap-3 mt-6">
                  <button
                    type="button"
                    className="px-4 py-2.5 border rounded-lg font-medium flex items-center justify-center gap-2 hover:bg-gray-50 transition-colors"
                    style={{ borderColor: colors.muted }}
                    onClick={() => setShowAddOnModal(false)}
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                    Cancel
                  </button>
                  <button
                    type="button"
                    style={{ backgroundColor: colors.primary, color: colors.background }}
                    className="px-4 py-2.5 rounded-lg font-medium flex items-center justify-center gap-2 hover:opacity-90 transition-opacity shadow-sm"
                    onClick={createAddOn}
                  >
                    <PlusIcon className="h-4 w-4" />
                    Create Add-On
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}        {/* Delete Add-On Confirmation Modal */}
        {addOnToDelete && (
          <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-50"><div style={{ backgroundColor: colors.background }} className="p-6 rounded-lg shadow-2xl w-96">
              <div className="flex justify-between items-center mb-4 pb-3 border-b" style={{ borderColor: colors.muted + '40' }}>
                <h3 className="text-lg font-bold" style={{ color: colors.primary }}>Confirm Delete Add-On</h3>
                <button 
                  onClick={() => setAddOnToDelete(null)} 
                  className="p-1 rounded-full hover:bg-gray-100 transition-colors"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
              
              <div className="bg-red-50 border-l-4 border-red-400 p-4 mb-6 rounded">
                <div className="flex">
                  <div className="flex-shrink-0">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                    </svg>
                  </div>
                  <div className="ml-3">
                    <p className="text-sm text-red-700">
                      Are you sure you want to delete this add-on? This action cannot be undone.
                    </p>
                  </div>
                </div>
              </div><div className="flex justify-end gap-3 mt-6">
                <button
                  className="px-4 py-2.5 border rounded-lg font-medium flex items-center justify-center gap-2 hover:bg-gray-50 transition-colors"
                  style={{ borderColor: colors.muted }}
                  onClick={() => setAddOnToDelete(null)}
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                  Cancel
                </button>
                <button
                  style={{ backgroundColor: colors.secondary, color: colors.background }}
                  className="px-4 py-2.5 rounded-lg font-medium flex items-center justify-center gap-2 hover:opacity-90 transition-opacity shadow-sm"
                  onClick={() => deleteAddOn(addOnToDelete)}
                >
                  <TrashIcon className="h-4 w-4" />
                  Confirm Delete
                </button>
              </div>
            </div>
          </div>
        )}        {/* Delete Menu Item Confirmation Modal */}
        {showDeleteModal && (
          <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-50"><div style={{ backgroundColor: colors.background }} className="p-6 rounded-lg shadow-2xl w-96">
              <div className="flex justify-between items-center mb-4 pb-3 border-b" style={{ borderColor: colors.muted + '40' }}>
                <h3 className="text-lg font-bold" style={{ color: colors.primary }}>Confirm Delete</h3>
                <button 
                  onClick={() => setShowDeleteModal(false)} 
                  className="p-1 rounded-full hover:bg-gray-100 transition-colors"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
              
              <div className="bg-red-50 border-l-4 border-red-400 p-4 mb-6 rounded">
                <div className="flex">
                  <div className="flex-shrink-0">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                    </svg>
                  </div>
                  <div className="ml-3">
                    <p className="text-sm text-red-700">
                      Are you sure you want to delete <strong>{selectedItem?.name || 'this item'}</strong>? This action cannot be undone.
                    </p>
                  </div>
                </div>
              </div><div className="flex justify-end gap-3 mt-6">
                <button
                  className="px-4 py-2.5 border rounded-lg font-medium flex items-center justify-center gap-2 hover:bg-gray-50 transition-colors"
                  style={{ borderColor: colors.muted }}
                  onClick={() => setShowDeleteModal(false)}
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                  Cancel
                </button>
                <button
                  style={{ backgroundColor: colors.secondary, color: colors.background }}
                  className="px-4 py-2.5 rounded-lg font-medium flex items-center justify-center gap-2 hover:opacity-90 transition-opacity shadow-sm disabled:opacity-50"
                  onClick={handleDelete}
                  disabled={isDeleting}
                >
                  {isDeleting ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent"></div>
                      Deleting...
                    </>
                  ) : (
                    <>
                      <TrashIcon className="h-4 w-4" />
                      Confirm Delete
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Ingredient Selection Modal */}
        {showIngredientModal && (
          <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center p-4 z-50">
            <div className="bg-white p-6 rounded-lg w-full max-w-3xl max-h-[90vh] flex flex-col">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl font-bold">Select Ingredients for Menu Item</h2>
                <button onClick={() => setShowIngredientModal(false)} className="text-gray-500 hover:text-gray-700">×</button>
              </div>
              
              <div className="flex-1 overflow-y-auto">
                <div className="mb-4">
                  <input
                    type="text"
                    placeholder="Search ingredients..."
                    className="w-full p-2 border rounded"
                    style={{ borderColor: colors.muted }}
                  />
                </div>
                
                {inventoryItems.length > 0 ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {inventoryItems.map((item) => {
                      const isSelected = selectedIngredients.some(ing => ing.ingredientId === item._id);
                      return (
                        <div key={item._id} className={`p-3 border rounded-lg cursor-pointer transition-colors ${
                          isSelected ? 'bg-blue-50 border-blue-300' : 'hover:bg-gray-50'
                        }`} style={{ borderColor: isSelected ? '#3b82f6' : colors.muted }}>
                          <div className="flex justify-between items-start">
                            <div className="flex-1">
                              <h4 className="font-medium">{item.name}</h4>
                              <p className="text-sm text-gray-500">
                                Stock: {item.totalQuantity || 0} {item.unit || 'units'}
                              </p>
                              <p className="text-sm text-gray-500">
                                Cost: ₱{item.cost || 0} per {item.unit || 'unit'}
                              </p>
                              {item.category && (
                                <p className="text-xs text-gray-400">Category: {item.category}</p>
                              )}
                              {item.status && (
                                <span className={`text-xs px-2 py-1 rounded ${
                                  item.status === 'In Stock' ? 'bg-green-100 text-green-800' :
                                  item.status === 'Low Stock' ? 'bg-yellow-100 text-yellow-800' :
                                  'bg-red-100 text-red-800'
                                }`}>
                                  {item.status}
                                </span>
                              )}
                            </div>
                            <div className="flex flex-col gap-2">
                              {!isSelected ? (
                                <button
                                  onClick={() => addIngredientToMenu(item)}
                                  className="px-3 py-1 rounded text-sm"
                                  style={{ backgroundColor: colors.accent, color: colors.background }}
                                >
                                  Add
                                </button>
                              ) : (
                                <div className="flex items-center gap-2">
                                  <input
                                    type="number"
                                    placeholder="Qty"
                                    className="w-16 p-1 border rounded text-sm"
                                    defaultValue={selectedIngredients.find(ing => ing.ingredientId === item._id)?.quantityNeeded || 1}
                                    onChange={(e) => {
                                      const quantity = parseFloat(e.target.value) || 1;
                                      const currentIngredient = selectedIngredients.find(ing => ing.ingredientId === item._id);
                                      const unit = currentIngredient?.unit || item.unit || 'pieces';
                                      addIngredientToMenu(item, quantity, unit);
                                    }}
                                  />
                                  <select
                                    className="text-xs p-1 border rounded"
                                    value={selectedIngredients.find(ing => ing.ingredientId === item._id)?.unit || item.unit || 'pieces'}
                                    onChange={(e) => {
                                      const currentIngredient = selectedIngredients.find(ing => ing.ingredientId === item._id);
                                      const quantity = currentIngredient?.quantityNeeded || 1;
                                      addIngredientToMenu(item, quantity, e.target.value);
                                    }}
                                  >
                                    <option value="grams">g</option>
                                    <option value="kg">kg</option>
                                    <option value="ml">ml</option>
                                    <option value="liters">L</option>
                                    <option value="pieces">pcs</option>
                                    <option value="cups">cups</option>
                                    <option value="tablespoons">tbsp</option>
                                    <option value="teaspoons">tsp</option>
                                    <option value="ounces">oz</option>
                                    <option value="pounds">lbs</option>
                                  </select>
                                  <button
                                    onClick={() => removeIngredientFromMenu(item._id)}
                                    className="text-red-600 hover:text-red-800 text-sm"
                                  >
                                    Remove
                                  </button>
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div className="text-center py-8 text-gray-500">
                    <p>No inventory items available</p>
                    <p className="text-sm">Add inventory items first to map them to menu items</p>
                  </div>
                )}
              </div>
              
              <div className="mt-4 flex justify-between">
                <div className="text-sm text-gray-600">
                  Selected: {selectedIngredients.length} ingredients
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => setShowIngredientModal(false)}
                    className="px-4 py-2 border rounded-lg"
                    style={{ borderColor: colors.muted }}
                  >
                    Cancel
                  </button>
                  <button
                    onClick={async () => {
                      if (updateMenuItemIngredients.isRunning) {
                        return; // Prevent multiple clicks
                      }
                      
                      // Determine which item ID to use - prioritize currentFormItem for editing, then selectedItem for viewing
                      const itemToSave = currentFormItem || selectedItem;
                      
                      if (selectedIngredients.length > 0) {
                        // If we have a menu item ID, save ingredients immediately
                        if (itemToSave && itemToSave._id) {
                          // Validate ingredients before saving
                          try {
                            for (let i = 0; i < selectedIngredients.length; i++) {
                              const ing = selectedIngredients[i];
                              if (!ing.ingredientId && !ing._id) {
                                throw new Error(`Ingredient ${i + 1}: Missing ID`);
                              }
                              if (!ing.quantityNeeded && !ing.quantity) {
                                throw new Error(`Ingredient ${i + 1}: Missing quantity`);
                              }
                              if (!ing.unit || ing.unit.trim() === '') {
                                throw new Error(`Ingredient ${i + 1}: Missing unit`);
                              }
                            }
                            
                            // Prepare ingredients data for saving
                            const ingredientsData = selectedIngredients.map(ing => ({
                              inventoryItemId: ing.ingredientId || ing._id,
                              quantity: Number(ing.quantityNeeded || ing.quantity || 1),
                              unit: (ing.unit || 'pieces').toLowerCase().trim(),
                              tolerance: Number(ing.tolerance || 0.1),
                              isRequired: ing.isRequired !== false,
                              notes: (ing.notes || '').substring(0, 500) // Limit notes length
                            }));
                            
                            console.log('Saving ingredients for item:', itemToSave._id, ingredientsData);
                            const success = await updateMenuItemIngredients(itemToSave._id, ingredientsData);
                            
                            if (success) {
                              alert('Ingredients saved successfully!');
                              setShowIngredientModal(false);
                              // Refresh the ingredients display
                              setTimeout(() => {
                                fetchMenuItemIngredients(itemToSave._id);
                              }, 500);
                              
                              // Re-fetch the menu item to get updated availability
                              setTimeout(async () => {
                                try {
                                  const response = await fetch(`${API_URL}/api/menu/${itemToSave._id}`);
                                  if (response.ok) {
                                    const updatedItem = await response.json();
                                    console.log('[MenuManagement] Re-fetched menu item after ingredient save:', updatedItem);
                                    
                                    // Update the selectedItem and form with latest data
                                    setSelectedItem(prev => ({
                                      ...prev,
                                      isAvailable: updatedItem.isAvailable
                                    }));
                                    setValue('isAvailable', updatedItem.isAvailable, { shouldDirty: true });
                                    
                                    // Also update the menuItems list
                                    setMenuItems(prev => prev.map(item => 
                                      item._id === updatedItem._id ? { ...item, isAvailable: updatedItem.isAvailable } : item
                                    ));
                                    
                                    console.log(`[MenuManagement] Updated toggle to: ${updatedItem.isAvailable}`);
                                  }
                                } catch (error) {
                                  console.error('[MenuManagement] Error re-fetching menu item:', error);
                                }
                              }, 1000);
                            } else {
                              // Error already handled in updateMenuItemIngredients
                            }
                          } catch (validationError) {
                            console.error('Validation error:', validationError);
                            alert('Validation error: ' + validationError.message);
                          }
                        } else {
                          // No menu item ID yet - just close modal and ingredients will be saved after menu item creation
                          alert(`${selectedIngredients.length} ingredients prepared! They will be automatically saved when you save the menu item.`);
                          setShowIngredientModal(false);
                        }
                      } else {
                        alert('Please add at least one ingredient before saving.');
                      }
                    }}
                    disabled={updateMenuItemIngredients.isRunning || selectedIngredients.length === 0}
                    className={`px-4 py-2 rounded-lg text-white ${
                      updateMenuItemIngredients.isRunning || selectedIngredients.length === 0 
                        ? 'opacity-50 cursor-not-allowed' 
                        : 'hover:opacity-90'
                    }`}
                    style={{ backgroundColor: colors.accent }}
                  >
                    {updateMenuItemIngredients.isRunning 
                      ? 'Saving...' 
                      : (currentFormItem || (selectedItem && selectedItem._id))
                        ? 'Save Ingredients'
                        : 'Prepare Ingredients'
                    }
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Size Management Modal */}
        {showSizeModal && (
          <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
              <div className="p-6">
                <div className="flex justify-between items-center mb-4">
                  <h2 className="text-2xl font-bold" style={{ color: colors.primary }}>
                    Manage Sizes - {editingSubcategory?.displayName || editingSubcategory?.name}
                  </h2>
                  <button
                    onClick={() => setShowSizeModal(false)}
                    className="text-gray-400 hover:text-gray-600"
                  >
                    X
                  </button>
                </div>

                <div className="mb-4 p-4 bg-blue-50 rounded-lg">
                  <p className="text-sm text-blue-800">
                    Configure size options for this subcategory. These sizes will appear as pricing options when adding menu items.
                  </p>
                </div>

                {/* Add New Size */}
                <div className="mb-6 p-4 border rounded-lg" style={{ borderColor: colors.muted }}>
                  <h3 className="font-medium mb-3" style={{ color: colors.secondary }}>Add New Size</h3>
                  <div className="grid grid-cols-2 gap-3 mb-3">
                    <div className="relative">
                      <label className="block text-sm mb-1">Size Name (internal)</label>
                      <input
                        type="text"
                        placeholder="e.g., M, Large, Hot"
                        value={newSizeName}
                        onChange={(e) => handleSizeNameChange(e.target.value)}
                        onFocus={() => {
                          if (filteredSizes.length > 0 && newSizeName.trim()) {
                            setShowSuggestions(true);
                          }
                        }}
                        onBlur={() => {
                          // Delay to allow click on suggestion
                          setTimeout(() => setShowSuggestions(false), 200);
                        }}
                        className="w-full px-3 py-2 border rounded-lg"
                        style={{ borderColor: colors.muted }}
                        onKeyPress={(e) => e.key === 'Enter' && addSize()}
                      />
                      
                      {/* Custom Suggestions Dropdown */}
                      {showSuggestions && filteredSizes.length > 0 && (
                        <div 
                          className="absolute z-10 w-full mt-1 bg-white border rounded-lg shadow-lg max-h-48 overflow-y-auto"
                          style={{ borderColor: colors.muted }}
                        >
                          {filteredSizes.map((size, idx) => (
                            <div
                              key={idx}
                              onClick={() => selectSuggestion(size)}
                              className="px-3 py-2 cursor-pointer hover:bg-gray-100 transition-colors"
                              style={{
                                borderBottom: idx < filteredSizes.length - 1 ? `1px solid ${colors.muted}` : 'none'
                              }}
                            >
                              <div className="font-medium">{size.name}</div>
                              <div className="text-xs text-gray-500">{size.displayName}</div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                    <div>
                      <label className="block text-sm mb-1">Display Name (shown to users)</label>
                      <input
                        type="text"
                        placeholder="e.g., Medium, Large, Hot (S)"
                        value={newSizeDisplayName}
                        onChange={(e) => setNewSizeDisplayName(e.target.value)}
                        className="w-full px-3 py-2 border rounded-lg"
                        style={{ borderColor: colors.muted }}
                        onKeyPress={(e) => e.key === 'Enter' && addSize()}
                      />
                    </div>
                  </div>
                  <button
                    onClick={addSize}
                    className="px-4 py-2 rounded-lg text-sm"
                    style={{ backgroundColor: colors.accent, color: colors.background }}
                  >
                    <PlusIcon className="w-4 h-4 inline mr-1" />
                    Add Size
                  </button>
                </div>

                {/* Current Sizes List */}
                <div className="mb-6">
                  <h3 className="font-medium mb-3" style={{ color: colors.secondary }}>
                    Current Sizes ({subcategorySizes.length})
                  </h3>
                  {subcategorySizes.length > 0 ? (
                    <div className="space-y-2">
                      {subcategorySizes.map((size, index) => (
                        <div
                          key={index}
                          className="flex items-center justify-between p-3 border rounded-lg"
                          style={{ borderColor: colors.muted + '40', backgroundColor: size.isDefault ? colors.activeBg : 'transparent' }}
                        >
                          <div className="flex-1">
                            <div className="font-medium">{size.displayName || size.name}</div>
                            <div className="text-xs text-gray-500">
                              Internal: {size.name}
                              {size.isDefault && <span className="ml-2 px-2 py-0.5 rounded bg-blue-100 text-blue-700">Default</span>}
                            </div>
                          </div>
                          <button
                            onClick={() => removeSize(index)}
                            className="p-2 text-red-400 hover:text-red-600 hover:bg-red-50 rounded transition-colors"
                          >
                            <TrashIcon className="w-4 h-4" />
                          </button>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-gray-500 text-center py-4">
                      No sizes configured. Add sizes above to enable multi-size pricing.
                    </p>
                  )}
                </div>

                {/* Action Buttons */}
                <div className="flex justify-end gap-3 pt-4 border-t" style={{ borderColor: colors.muted }}>
                  <button
                    onClick={() => setShowSizeModal(false)}
                    className="px-4 py-2 border rounded-lg"
                    style={{ borderColor: colors.muted }}
                  >
                    Cancel
                  </button>
                  <button
                    onClick={saveSizes}
                    className="px-4 py-2 rounded-lg"
                    style={{ backgroundColor: colors.accent, color: colors.background }}
                  >
                    Save Sizes
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
      {/* <ConnectionMonitor /> */}
      
      {/* Admin Override Modal */}
      {showAdminOverrideModal && (
        <div 
          className="modal-overlay" 
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.7)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 9999
          }}
          onClick={() => {
            setShowAdminOverrideModal(false);
            setAdminPassword('');
            setPendingAvailabilityChange(null);
          }}
        >
          <div 
            className="modal-content admin-override-modal" 
            style={{
              backgroundColor: 'white',
              borderRadius: '12px',
              padding: '2rem',
              maxWidth: '500px',
              width: '90%',
              maxHeight: '80vh',
              overflowY: 'auto',
              boxShadow: '0 10px 40px rgba(0, 0, 0, 0.3)',
              position: 'relative'
            }}
            onClick={e => e.stopPropagation()}
          >
            <div className="modal-header" style={{ marginBottom: '1.5rem' }}>
              <h3 style={{ margin: 0, fontSize: '1.5rem', color: '#333' }}>⚠️ Admin Override Required</h3>
              <button 
                className="close-button" 
                style={{
                  position: 'absolute',
                  top: '1rem',
                  right: '1rem',
                  background: 'none',
                  border: 'none',
                  fontSize: '2rem',
                  cursor: 'pointer',
                  color: '#999',
                  lineHeight: 1
                }}
                onClick={() => {
                  setShowAdminOverrideModal(false);
                  setAdminPassword('');
                  setPendingAvailabilityChange(null);
                }}
              >
                ×
              </button>
            </div>
            
            <div className="modal-body">
              <div className="warning-message" style={{
                textAlign: 'center',
                padding: '1rem',
                backgroundColor: '#fff3e0',
                borderRadius: '8px',
                marginBottom: '1rem'
              }}>
                <p style={{ marginTop: '0', fontSize: '1rem', color: '#333', lineHeight: '1.5' }}>
                  <strong>⚠️ Warning:</strong> This item has insufficient ingredients and is currently unavailable.
                </p>
                <p style={{ marginTop: '0.5rem', marginBottom: '0', color: '#666', fontSize: '0.9rem' }}>
                  Enabling it will allow customers to order despite low stock.
                </p>
              </div>
              
              {itemAvailability[pendingAvailabilityChange?.itemId] && itemAvailability[pendingAvailabilityChange.itemId].insufficientIngredients?.length > 0 && (
                <div className="insufficient-ingredients" style={{ 
                  marginTop: '1rem', 
                  padding: '1rem', 
                  background: '#ffebee', 
                  borderRadius: '8px',
                  border: '1px solid #ef5350'
                }}>
                  <strong style={{ color: '#d32f2f' }}>Insufficient Ingredients:</strong>
                  <ul style={{ marginTop: '0.5rem', marginBottom: '0', paddingLeft: '1.5rem' }}>
                    {itemAvailability[pendingAvailabilityChange.itemId].insufficientIngredients.map((ing, idx) => (
                      <li key={idx} style={{ color: '#d32f2f', marginTop: '0.25rem' }}>
                        {ing.name}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
              
              <div style={{ marginTop: '1.5rem' }}>
                <label htmlFor="admin-password" style={{ 
                  display: 'block', 
                  marginBottom: '0.5rem',
                  fontWeight: 'bold',
                  color: '#333'
                }}>
                  Enter Admin Password to Continue:
                </label>
                <input
                  type="password"
                  id="admin-password"
                  value={adminPassword}
                  onChange={(e) => setAdminPassword(e.target.value)}
                  onKeyPress={(e) => {
                    if (e.key === 'Enter') {
                      handleAdminOverride();
                    }
                  }}
                  placeholder="Admin password"
                  autoFocus
                  style={{
                    width: '100%',
                    padding: '0.75rem',
                    fontSize: '1rem',
                    border: '2px solid #ddd',
                    borderRadius: '4px',
                    outline: 'none'
                  }}
                />
              </div>
            </div>
            
            <div className="modal-footer" style={{ 
              display: 'flex', 
              gap: '1rem', 
              marginTop: '1.5rem',
              justifyContent: 'flex-end'
            }}>
              <button
                onClick={() => {
                  setShowAdminOverrideModal(false);
                  setAdminPassword('');
                  setPendingAvailabilityChange(null);
                }}
                style={{
                  padding: '0.75rem 1.5rem',
                  fontSize: '1rem',
                  border: '1px solid #ddd',
                  borderRadius: '4px',
                  background: 'white',
                  cursor: 'pointer'
                }}
              >
                Cancel
              </button>
              <button
                onClick={handleAdminOverride}
                disabled={!adminPassword}
                style={{
                  padding: '0.75rem 1.5rem',
                  fontSize: '1rem',
                  border: 'none',
                  borderRadius: '4px',
                  background: adminPassword ? '#ff9800' : '#ccc',
                  color: 'white',
                  cursor: adminPassword ? 'pointer' : 'not-allowed',
                  fontWeight: 'bold'
                }}
              >
                Confirm Override
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default MenuPage;
