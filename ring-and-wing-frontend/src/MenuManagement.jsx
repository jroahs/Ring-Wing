import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import MenuItemImage from './components/MenuItemImage';

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
    const res = await fetch('/api/chat', {
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
  category: 'Beverages',
  code: '',
  subCategory: 'Coffee',
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

  const { register, handleSubmit, reset, watch, setValue, getValues, formState: { errors } } = useForm({
    defaultValues: initialItem
  });

  const selectedCategory = watch('category');
  const selectedSubCategory = watch('subCategory');

  useEffect(() => {
    if (!selectedItem?._id) {
      const validSubs = Object.keys(menuConfig[selectedCategory]?.subCategories || {});
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
  }, [selectedCategory, reset, selectedItem, watch, menuConfig]);

  const createAddOn = async () => {
    try {
      const response = await fetch('http://localhost:5000/api/add-ons', {
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
      const response = await fetch(`http://localhost:5000/api/add-ons/${addOnId}`, {
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
      const [menuRes, addOnsRes, categoriesRes] = await Promise.all([
        fetch('http://localhost:5000/api/menu?limit=1000', {  // High limit to get all items
          signal: signal
        }),
        fetch('http://localhost:5000/api/add-ons', {
          signal: signal
        }),
        fetch('http://localhost:5000/api/categories', {
          signal: signal
        })
      ]);

      if (!menuRes.ok || !addOnsRes.ok) {
        throw new Error('Failed to fetch menu or add-ons data');
      }

      const [menuData, addOnsData] = await Promise.all([
        menuRes.json(),
        addOnsRes.json()
      ]);

      // Handle both array and object with items property response formats
      const validMenuItems = Array.isArray(menuData) ? menuData : (menuData.items || []);
      setMenuItems(validMenuItems);
      setAddOns(addOnsData);
      
      // Fetch categories (optional, fallback to static config)
      if (categoriesRes.ok) {
        const categoriesData = await categoriesRes.json();
        console.log('🎉 MenuManagement: Loaded dynamic categories', categoriesData);
        
        // Debug the raw category structure
        console.log('🔍 Raw categories data:', categoriesData.map(cat => ({
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
            console.log(`🏷️ ${cat.name} subcategories:`, cat.subcategories);
          }
          if (cat.subCategories && cat.subCategories.length > 0) {
            console.log(`🏷️ ${cat.name} subCategories:`, cat.subCategories);
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
        console.log('📊 MenuManagement: Categories FORCE updated with stable order');
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
                    // Extract sizes from subcategory, ensuring proper format
                    const sizes = subCat.sizes && subCat.sizes.length > 0 
                      ? subCat.sizes.map(size => size.displayName || size.name || size)
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
          
          console.log('🔧 MenuManagement: Generated pure database config', dynamicMenuConfig);
          setMenuConfig(dynamicMenuConfig);
          console.log('🎯 MenuManagement: Using database-driven config', dynamicMenuConfig);
        
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
    // Only fetch if we don't have data yet
    if (!menuItems.length && !categories.length) {
      fetchData(controller.signal);
    }
    
    return () => controller.abort();
  }, []); // Remove dependency to prevent re-fetching

  // Add refresh mechanisms for real-time updates - but less frequent
  useEffect(() => {
    const handleWindowFocus = () => {
      // Only refresh if window was focused after being away for a while
      if (document.hidden === false) {
        fetchData();
      }
    };

    // Reduce refresh frequency to prevent scrambling
    const intervalId = setInterval(() => {
      fetchData();
    }, 120000); // Refresh every 2 minutes instead of 30 seconds

    window.addEventListener('focus', handleWindowFocus);

    return () => {
      window.removeEventListener('focus', handleWindowFocus);
      clearInterval(intervalId);
    };
  }, []);

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

  const onSubmit = async (data) => {
    if (isSubmitting) return; // Prevent double submission
    
    setIsSubmitting(true);
    const controller = new AbortController();
    
    try {
      const categoryConfig = menuConfig[data.category];
      if (!categoryConfig) throw new Error(`Invalid category: ${data.category}`);
  
      // Final validation check before submission
      const validSubs = Object.keys(categoryConfig.subCategories || {});
      if (!validSubs.includes(data.subCategory)) {
        throw new Error(`Invalid subcategory: ${data.subCategory}`);
      }
  
      const subCategory = categoryConfig.subCategories[data.subCategory];
      if (!subCategory) throw new Error(`Invalid subcategory: ${data.subCategory}`);
  
      const processedPricing = {};
      if (subCategory.sizes?.length > 0) {
        subCategory.sizes.forEach(size => {
          const price = parseFloat(data.pricing[size]);
          if (isNaN(price)) throw new Error(`Invalid price for ${size}`);
          processedPricing[size] = price;
        });
      } else {
        const basePrice = parseFloat(data.pricing.base);
        if (isNaN(basePrice)) throw new Error('Invalid base price');
        processedPricing.base = basePrice;
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
      formData.append('ingredients', JSON.stringify(data.ingredients));
  
      if (imageFile) formData.append('image', imageFile);
  
      const method = selectedItem?._id ? 'PUT' : 'POST';
      const url = selectedItem?._id
        ? `http://localhost:5000/api/menu/${selectedItem._id}`
        : 'http://localhost:5000/api/menu';
  
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
  
      reset({ ...initialItem, category: data.category, subCategory: data.subCategory });
      setImagePreview(null);
      setImageFile(null);
      setSelectedItem(null);
    } catch (error) {
      if (error.name !== 'AbortError') {
        console.error('Error saving item:', error);
        alert(`Error saving item: ${error.message}`);
      }
    } finally {
      setIsSubmitting(false);
    }
  };
  

  const handleDelete = async () => {
    if (!selectedItem?._id || isDeleting) return;

    setIsDeleting(true);
    const controller = new AbortController();
    
    try {
      const response = await fetch(`http://localhost:5000/api/menu/${selectedItem._id}`, {
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
            : `http://localhost:5000${selectedItem.image}`
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
      const response = await fetch('http://localhost:5000/api/categories', {
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

      const response = await fetch(`http://localhost:5000/api/categories/${category._id}/subcategories`, {
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
      const response = await fetch(`http://localhost:5000/api/categories/${categoryId}`, {
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
    
    try {
      const response = await fetch(`http://localhost:5000/api/categories/${categoryId}/subcategories/${subCategoryId}`, {
        method: 'DELETE'
      });
      
      if (response.ok) {
        await fetchData(); // Refresh data
        alert('Subcategory deleted successfully!');
      } else {
        throw new Error('Failed to delete subcategory');
      }
    } catch (error) {
      console.error('Error deleting subcategory:', error);
      alert('Error deleting subcategory: ' + error.message);
    }
  };

  const filteredMenuItems = menuItems.filter(item => {
    const matchesSearch = item.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.code.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = categoryFilter === 'All' || item.category === categoryFilter;
    return matchesSearch && matchesCategory;
  });

  if (loading) {
    return <div className="p-8 text-center text-gray-500">Loading menu items...</div>;
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
              onClick={() => setSelectedItem(initialItem)}
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
                        {/* Handle both subcategories (lowercase) and subCategories (camelCase) */}
                        {((category.subcategories && category.subcategories.length > 0) || 
                          (category.subCategories && category.subCategories.length > 0)) ? (
                          <>
                            {/* Handle subcategories array (from database) */}
                            {category.subcategories && category.subcategories.map((subCat, index) => (
                              <div key={subCat._id || subCat.name || subCat || `${category._id}-sub-${index}`} className="flex justify-between items-center text-sm py-1">
                                <span style={{ color: colors.secondary }}>
                                  {subCat.displayName || subCat.name || subCat || `Subcategory ${index + 1}`}
                                  {subCat.sizes && subCat.sizes.length > 0 && (
                                    <span className="text-xs ml-2 px-1 py-0.5 rounded" style={{ backgroundColor: colors.activeBg, color: colors.accent }}>
                                      {subCat.sizes.length} sizes
                                    </span>
                                  )}
                                </span>
                                <button
                                  onClick={() => deleteSubCategory(category._id, subCat._id || subCat)}
                                  className="p-0.5 text-red-400 hover:text-red-600 hover:bg-red-50 rounded transition-colors"
                                  title="Delete subcategory"
                                >
                                  <TrashIcon className="w-3 h-3" />
                                </button>
                              </div>
                            ))}
                            {/* Handle subCategories array (legacy format) */}
                            {category.subCategories && category.subCategories.map((subCat, index) => (
                              <div key={subCat._id || subCat.name || subCat || `${category._id}-legacy-sub-${index}`} className="flex justify-between items-center text-sm py-1">
                                <span style={{ color: colors.secondary }}>
                                  {subCat.displayName || subCat.name || subCat || `Subcategory ${index + 1}`}
                                  {subCat.sizes && subCat.sizes.length > 0 && (
                                    <span className="text-xs ml-2 px-1 py-0.5 rounded" style={{ backgroundColor: colors.activeBg, color: colors.accent }}>
                                      {subCat.sizes.length} sizes
                                    </span>
                                  )}
                                </span>
                                <button
                                  onClick={() => deleteSubCategory(category._id, subCat._id || subCat)}
                                  className="p-0.5 text-red-400 hover:text-red-600 hover:bg-red-50 rounded transition-colors"
                                  title="Delete subcategory"
                                >
                                  <TrashIcon className="w-3 h-3" />
                                </button>
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
                <th className="p-4 text-left text-sm font-semibold" style={{ color: colors.primary }}>Price</th>
                <th className="p-4 text-left text-sm font-semibold" style={{ color: colors.primary }}>Actions</th>
              </tr>
            </thead>
            <tbody>              {filteredMenuItems.length === 0 ? (
                <tr>
                  <td colSpan="5" className="py-10">
                    <div className="flex flex-col items-center justify-center gap-3">
                      <div className="w-16 h-16 rounded-full flex items-center justify-center" style={{ backgroundColor: colors.activeBg }}>
                        <PlusIcon className="w-8 h-8" style={{ color: colors.accent }} />
                      </div>
                      <p className="text-gray-500 font-medium">No menu items found</p>
                      <button
                        onClick={() => setSelectedItem(initialItem)}
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
                                `http://localhost:5000${item.image}`)) : 
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
                +{Object.keys(item.pricing).length - 1} more
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
                          onClick={() => setSelectedItem(item)}
                        >
                          <EditIcon className="w-4 h-4" />
                          <span className="text-sm">Edit</span>
                        </button>
                        <button
                          style={{ backgroundColor: colors.secondary, color: colors.background }}
                          className="flex items-center gap-1 px-3 py-1.5 rounded-lg hover:opacity-90 transition-opacity"
                          onClick={() => {
                            setSelectedItem(item);
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
  <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center md:pl-20 z-50"><div 
      style={{ backgroundColor: colors.background }}
      className="p-6 rounded-lg w-full max-w-3xl max-h-[90vh] flex flex-col shadow-2xl"
    >
      <div className="flex justify-between items-center mb-6 pb-3 border-b" style={{ borderColor: colors.muted + '40' }}>
        <h2 className="text-2xl font-bold" style={{ color: colors.primary }}>
          {selectedItem._id ? 'Edit' : 'Add'} Menu Item
        </h2>
        <button 
          onClick={() => setSelectedItem(null)} 
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
              {Object.keys(menuConfig).map((cat) => (
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
              {Object.keys(menuConfig[selectedCategory]?.subCategories || {}).map((subKey) => (
                <option key={subKey} value={subKey}>{subKey}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Pricing Section */}
        <div className="mb-6">
          <h3 className="text-lg font-medium mb-4" style={{ color: colors.primary }}>
            Pricing
          </h3>
          {menuConfig[selectedCategory]?.subCategories[selectedSubCategory]?.sizes?.length > 0 ? (
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              {menuConfig[selectedCategory]?.subCategories[selectedSubCategory]?.sizes?.map((size) => (
                <div key={size} className="flex items-center gap-2">
                  <label className="w-20 font-medium">{size}</label>
                  <div className="flex-1 flex items-center">
                    <span className="mr-2">₱</span>
                    <input
                      type="number"
                      {...register(`pricing.${size}`, { required: true })}
                      className="w-full p-2 border rounded-lg"
                      style={{ borderColor: colors.muted }}
                      step="0.01"
                    />
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <label className="w-20 font-medium">Base Price</label>
              <div className="flex-1 flex items-center">
                <span className="mr-2">₱</span>
                <input
                  type="number"
                  {...register('pricing.base', { required: true })}
                  className="w-full p-2 border rounded-lg"
                  style={{ borderColor: colors.muted }}
                  step="0.01"
                />
              </div>
            </div>
          )}
        </div>        {/* Add-Ons Section */}        <div className="mb-8">
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
              onClick={() => setSelectedItem(null)}
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
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50"><div
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
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50"><div style={{ backgroundColor: colors.background }} className="p-6 rounded-lg shadow-2xl w-96">
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
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50"><div style={{ backgroundColor: colors.background }} className="p-6 rounded-lg shadow-2xl w-96">
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
      </div>
    </div>
  );
};

export default MenuPage;