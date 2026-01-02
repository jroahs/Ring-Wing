import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useCartContext } from '../../contexts/CartContext';
import { useMenuContext } from '../../contexts/MenuContext';
import { useCustomerAuth } from '../../contexts/CustomerAuthContext';
import { useAlternatives } from '../../hooks/useAlternatives';
import { AlternativesModal } from '../ui/AlternativesModal';
import EmbeddedAssistant from '../ui/EmbeddedAssistant';
import SelfCheckoutHeader from '../ui/SelfCheckoutHeader';
import ItemPreviewModal from '../ItemPreviewModal';
import { NotificationDropdown } from '../selfcheckout';

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

const DesktopLayout = ({ 
  searchTerm, 
  onSearchChange, 
  orderNumber,
  orderSubmitted,
  onProcessOrder 
}) => {
  // Get contexts
  const { cartItems, addItem, updateQuantity: updateCartQuantity, updateSize: updateCartSize, removeItem, replaceItem, clearCart, getTotals, itemCount } = useCartContext();
  const { menuItems, categories, addOns, loading, error } = useMenuContext();
  const { isAuthenticated } = useCustomerAuth();
  const navigate = useNavigate();

  // Desktop-specific state
  const [activeCategory, setActiveCategory] = useState('');
  const [activeSubCategory, setActiveSubCategory] = useState('All');
  const [expandedCategory, setExpandedCategory] = useState(null);
  const [hoveredItem, setHoveredItem] = useState(null);
  const [selectedItemIndex, setSelectedItemIndex] = useState(0);
  const [keyboardMode, setKeyboardMode] = useState(false);
  const [cartCollapsed, setCartCollapsed] = useState(false);
  const [sidebarView, setSidebarView] = useState('cart'); // 'cart' or 'assistant'
  const [showLoginPrompt, setShowLoginPrompt] = useState(false);
  
  // Preview/Edit modal state
  const [previewItem, setPreviewItem] = useState(null);
  const [editingCartItem, setEditingCartItem] = useState(null);
  
  // Refs for keyboard navigation
  const searchInputRef = useRef(null);
  const menuContainerRef = useRef(null);

  // Alternatives modal functionality
  const { modalState, showAlternatives, hideAlternatives } = useAlternatives();

  // Initialize active category
  useEffect(() => {
    if (categories.length > 0 && !activeCategory) {
      setActiveCategory(categories[0].category);
    }
  }, [categories, activeCategory]);

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e) => {
      // Ignore if user is typing in an input, textarea, OR if assistant sidebar is open
      if (e.target.tagName === 'INPUT' || e.target.tagName === 'SELECT' || e.target.tagName === 'TEXTAREA' || sidebarView === 'assistant') {
        return;
      }

      setKeyboardMode(true);
      
      const currentCategoryItems = menuItems
        .filter(item => item.category === activeCategory)
        .filter(item => 
          searchTerm === '' || 
          item.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
          (item.code && item.code.toLowerCase().includes(searchTerm.toLowerCase()))
        );

      switch (e.key) {
        case '/':
          e.preventDefault();
          searchInputRef.current?.focus();
          break;
        case 'ArrowUp':
          e.preventDefault();
          setSelectedItemIndex(prev => 
            prev > 0 ? prev - 1 : currentCategoryItems.length - 1
          );
          break;
        case 'ArrowDown':
          e.preventDefault();
          setSelectedItemIndex(prev => 
            prev < currentCategoryItems.length - 1 ? prev + 1 : 0
          );
          break;
        case 'Enter':
        case ' ':
          e.preventDefault();
          if (currentCategoryItems[selectedItemIndex]) {
            handleItemClick(currentCategoryItems[selectedItemIndex]);
          }
          break;
        case 'Escape':
          setKeyboardMode(false);
          setSelectedItemIndex(0);
          break;
        case 'c':
          setCartCollapsed(!cartCollapsed);
          break;
        default:
          // Category navigation with number keys
          if (e.key >= '1' && e.key <= '9') {
            const categoryIndex = parseInt(e.key) - 1;
            if (categoryIndex < categories.length) {
              setActiveCategory(categories[categoryIndex].category);
              setSelectedItemIndex(0);
            }
          }
          break;
      }
    };

    const handleMouseMove = () => {
      setKeyboardMode(false);
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('mousemove', handleMouseMove);
    
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('mousemove', handleMouseMove);
    };
  }, [activeCategory, menuItems, searchTerm, selectedItemIndex, cartCollapsed, categories, sidebarView]);

  // Check if item needs customization (has multiple sizes, variants, or relevant add-ons)
  const needsCustomization = (item) => {
    const sizes = Object.keys(item.pricing || {}).filter(key => key !== '_id');
    const hasMultipleSizes = sizes.length > 1;
    const hasVariants = (item.variants || []).length > 0;
    const relevantAddOns = (addOns || []).filter(addon => 
      addon.category === item.category || addon.category === 'All'
    );
    const hasAddOns = relevantAddOns.length > 0;
    
    return hasMultipleSizes || hasVariants || hasAddOns;
  };

  // Cart management functions
  const addToOrder = (item, options = {}) => {
    const sizes = Object.keys(item.pricing);
    const selectedSize = options.size || (sizes.includes('base') ? 'base' : sizes[0]);
    addItem(item, { size: selectedSize, ...options });
  };

  // Handle customization modal confirm
  const handleCustomizationConfirm = (customizedItem) => {
    if (customizedItem.isEditing && editingCartItem) {
      // Editing existing cart item - replace it
      replaceItem(
        editingCartItem._id,
        editingCartItem.selectedSize,
        customizedItem,
        {
          size: customizedItem.selectedSize,
          variant: customizedItem.selectedVariant,
          addOns: customizedItem.selectedAddOns,
          notes: customizedItem.notes || '',
          quantity: customizedItem.quantity
        }
      );
      setEditingCartItem(null);
    } else {
      // Adding new item
      addItem(customizedItem, { 
        size: customizedItem.selectedSize,
        variant: customizedItem.selectedVariant,
        addOns: customizedItem.selectedAddOns,
        notes: customizedItem.notes || '',
        quantity: customizedItem.quantity
      });
    }
    setPreviewItem(null);
  };

  // Handle menu item click - ALWAYS show preview modal for customers in Self Checkout
  const handleItemClick = (item) => {
    if (item.isAvailable === false) {
      showAlternatives(item);
    } else {
      // Always show preview modal for self-checkout customers
      setPreviewItem(item);
      setEditingCartItem(null);
    }
  };

  // Handle edit cart item - open preview modal in edit mode
  const handleEditCartItem = (cartItem) => {
    // Find the full menu item data
    const fullMenuItem = menuItems.find(mi => mi._id === cartItem._id);
    if (fullMenuItem) {
      setPreviewItem(fullMenuItem);
      setEditingCartItem(cartItem);
    }
  };

  // Expose handleItemPreview for recommendations
  useEffect(() => {
    window.handleItemPreview = (item) => {
      setPreviewItem(item);
      setEditingCartItem(null);
    };
    return () => {
      delete window.handleItemPreview;
    };
  }, []);

  const updateQuantity = (item, delta) => {
    updateCartQuantity(item._id, item.selectedSize, delta);
  };

  const updateSize = (item, newSize) => {
    updateCartSize(item._id, item.selectedSize, newSize);
  };

  const calculateTotal = () => {
    return getTotals();
  };

  // Get current category items for keyboard navigation
  const getCurrentCategoryItems = () => {
    return menuItems
      .filter(item => item.category === activeCategory)
      .filter(item => activeSubCategory === 'All' || item.subCategory === activeSubCategory)
      .filter(item => 
        searchTerm === '' || 
        item.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (item.code && item.code.toLowerCase().includes(searchTerm.toLowerCase()))
      );
  };

  // Get unique subcategories for the active category
  const getSubCategories = (categoryName) => {
    const items = menuItems.filter(item => item.category === categoryName);
    const subCats = [...new Set(items.map(item => item.subCategory).filter(Boolean))];
    return ['All', ...subCats];
  };

  // Helper function to render a single menu item
  const renderMenuItem = (item, index) => {
    const isSelected = keyboardMode && selectedItemIndex === index;
    const isHovered = hoveredItem === item._id;
    const isUnavailable = item.isAvailable === false;
    
    return (
      <div
        key={item._id}
        onClick={() => handleItemClick(item)}
        onMouseEnter={() => {
          setHoveredItem(item._id);
          if (!keyboardMode) setSelectedItemIndex(index);
        }}
        onMouseLeave={() => setHoveredItem(null)}
        className={`group relative p-4 rounded-xl cursor-pointer transition-all duration-200 border-2 overflow-hidden ${
          isUnavailable 
            ? 'bg-gray-50 border-gray-200' 
            : isSelected || isHovered
              ? 'bg-orange-50 border-orange-200 shadow-lg transform scale-[1.02]'
              : 'bg-white border-gray-100 hover:border-orange-200 hover:shadow-md'
        }`}
        style={{ minHeight: '200px' }} // Consistent card height
      >
        {/* Unavailable overlay and badge - Desktop optimized styling */}
        {isUnavailable && (
          <>
            {/* Subtle gradient overlay - less heavy than banner */}
            <div className="absolute inset-0 bg-gradient-to-b from-gray-400/20 via-gray-400/30 to-gray-400/40 z-[1] rounded-xl"></div>
            
            {/* Corner badge - cleaner for desktop cards */}
            <div 
              className="absolute top-0 right-0 z-[2]"
              style={{ 
                backgroundColor: colors.primary,
                borderBottomLeftRadius: '12px',
                borderTopRightRadius: '10px',
                padding: '6px 12px'
              }}
            >
              <span className="text-white font-semibold text-xs tracking-wide">
                UNAVAILABLE
              </span>
            </div>
          </>
        )}
        
        <div className="w-full h-32 rounded-lg overflow-hidden mb-3">
          <img 
            src={item.image || (item.category === 'Beverages' ? '/placeholders/drinks.png' : '/placeholders/meal.png')}
            alt={item.name}
            className={`w-full h-full object-cover transition-transform duration-200 ${
              (isHovered || isSelected) && !isUnavailable ? 'scale-110' : ''
            }`}
          />
        </div>
        <h4 className={`font-semibold text-base mb-2 line-clamp-2 ${
          isUnavailable ? 'text-gray-400' : 'text-gray-800'
        }`}>
          {item.name}
        </h4>
        <p className={`text-sm mb-2 ${
          isUnavailable ? 'text-gray-400' : 'text-gray-500'
        }`}>
          {item.code}
        </p>
        <div className="flex items-center justify-between mt-auto">
          <p className={`font-bold text-lg ${
            isUnavailable ? 'text-gray-400' : 'text-orange-600'
          }`}>
            ₱{Object.values(item.pricing)[0]?.toFixed(2) || '0.00'}
          </p>
          {isUnavailable && (
            <span className="text-xs text-white bg-orange-500 px-2 py-1 rounded-full font-medium">
              See Alternatives
            </span>
          )}
          {(isHovered || isSelected) && !isUnavailable && (
            <div className="text-orange-600 transform transition-transform group-hover:translate-x-1">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
              </svg>
            </div>
          )}
        </div>
      </div>
    );
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-orange-50 to-white">
        <div className="animate-spin rounded-full h-16 w-16 border-b-2" 
          style={{ borderColor: colors.accent }}></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-6 bg-gradient-to-br from-orange-50 to-white">
        <div className="p-6 rounded-lg max-w-lg text-center" 
          style={{ backgroundColor: colors.activeBg }}>
          <h2 className="text-2xl font-bold mb-3" style={{ color: colors.primary }}>
            Error Loading Menu
          </h2>
          <p className="mb-4 text-lg" style={{ color: colors.secondary }}>{error}</p>
          <button
            onClick={() => window.location.reload()}
            className="mt-4 px-6 py-3 rounded text-lg hover:opacity-90"
            style={{ backgroundColor: colors.accent, color: colors.background }}
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  const currentCategoryItems = getCurrentCategoryItems();

  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-50 to-white flex">
      {/* Main Content Area */}
      <div className={`flex-1 flex flex-col transition-all duration-300 ${cartCollapsed ? 'mr-20' : 'mr-96'}`}>
        {/* Desktop Header with Search and Shortcuts */}
        <div className="sticky top-0 bg-white/95 backdrop-blur-sm p-6 shadow-sm z-10 border-b border-gray-100">
          <div className="flex items-center gap-6 relative">
            {/* Search Bar */}
            <div className="flex-1 max-w-2xl relative">
              <input
                ref={searchInputRef}
                type="text"
                className="w-full h-12 pl-12 pr-6 rounded-xl border-2 text-base transition-all duration-300 focus:ring-4 focus:ring-orange-100 focus:border-orange-500"
                style={{ borderColor: colors.muted }}
                placeholder="Search menu or press '/' to focus..."
                value={searchTerm}
                onChange={(e) => onSearchChange(e.target.value)}
              />
              <svg 
                xmlns="http://www.w3.org/2000/svg" 
                className="h-6 w-6 absolute left-4 top-3 transition-colors duration-300" 
                fill="none" 
                viewBox="0 0 24 24" 
                stroke={searchTerm ? colors.accent : colors.muted}
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
                  d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </div>

            {/* Keyboard Shortcuts */}
            <div className="text-sm text-gray-500 flex items-center gap-4">
              <span className="hidden lg:flex items-center gap-1">
                <kbd className="px-2 py-1 bg-gray-100 rounded text-xs">↑↓</kbd>
                Navigate
              </span>
              <span className="hidden lg:flex items-center gap-1">
                <kbd className="px-2 py-1 bg-gray-100 rounded text-xs">Enter</kbd>
                Select
              </span>
              <span className="hidden lg:flex items-center gap-1">
                <kbd className="px-2 py-1 bg-gray-100 rounded text-xs">C</kbd>
                Toggle Cart
              </span>
            </div>
            
            {/* Notification Bell - Right side of header */}
            {isAuthenticated && (
              <div
                className="absolute"
                style={{ right: '16px', top: '50%', transform: 'translateY(-50%)' }}
              >
                <NotificationDropdown size="md" cartCollapsed={cartCollapsed} />
              </div>
            )}
          </div>
        </div>

        <div className="flex-1 flex">
          {/* Category Sidebar - Fixed/Sticky with scrollable subcategories */}
          <div className="w-64 bg-white shadow-sm border-r border-gray-100 flex flex-col sticky top-[88px] h-[calc(100vh-88px)]">
            {/* Customer Auth Section at top */}
            <div className="p-4 border-b border-gray-100 flex-shrink-0">
              <SelfCheckoutHeader />
            </div>
            
            <div className="p-4 flex-1 flex flex-col min-h-0">
              <h3 className="font-bold text-lg text-gray-800 mb-4 flex-shrink-0">Categories</h3>
              <nav className="space-y-1 flex-1 overflow-y-auto">
                {categories.map((categoryData, index) => {
                  const isActive = activeCategory === categoryData.category;
                  const isExpanded = expandedCategory === categoryData.category;
                  const subCategories = getSubCategories(categoryData.category);
                  
                  return (
                    <div key={categoryData.category}>
                      <button
                        onClick={() => {
                          if (isActive && isExpanded) {
                            setExpandedCategory(null);
                          } else {
                            setActiveCategory(categoryData.category);
                            setActiveSubCategory('All');
                            setExpandedCategory(categoryData.category);
                            setSelectedItemIndex(0);
                          }
                        }}
                        className={`w-full text-left p-3 rounded-lg transition-all duration-200 flex items-center justify-between group ${
                          isActive
                            ? 'bg-orange-100 text-orange-700 font-medium'
                            : 'hover:bg-gray-50 text-gray-600'
                        }`}
                      >
                        <span>{categoryData.category}</span>
                        <div className="flex items-center gap-2">
                          <kbd className="px-1.5 py-0.5 bg-gray-100 rounded text-xs opacity-50 group-hover:opacity-100">
                            {index + 1}
                          </kbd>
                          <svg 
                            className={`w-4 h-4 transition-transform duration-200 ${
                              isExpanded ? 'rotate-180' : ''
                            }`} 
                            fill="currentColor" 
                            viewBox="0 0 20 20"
                          >
                            <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
                          </svg>
                        </div>
                      </button>
                      
                      {/* Subcategories - Scrollable if too many */}
                      {isExpanded && subCategories.length > 1 && (
                        <div className="ml-4 mt-1 space-y-1 animate-fadeIn max-h-72 overflow-y-auto">
                          {subCategories.map((subCat) => (
                            <button
                              key={subCat}
                              onClick={() => {
                                setActiveSubCategory(subCat);
                                setSelectedItemIndex(0);
                              }}
                              className={`w-full text-left px-3 py-2 rounded-lg text-sm transition-all duration-200 ${
                                activeSubCategory === subCat
                                  ? 'bg-orange-50 text-orange-600 font-medium'
                                  : 'text-gray-600 hover:bg-gray-50'
                              }`}
                            >
                              {subCat}
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  );
                })}
              </nav>
            </div>
          </div>

          {/* Menu Items Grid */}
          <div className="flex-1 overflow-y-auto" ref={menuContainerRef}>
            <div className="p-6">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-2xl font-bold text-gray-800">{activeCategory}</h2>
                <p className="text-gray-500">{currentCategoryItems.length} items</p>
              </div>
              
              {currentCategoryItems.length === 0 ? (
                <div className="text-center py-16">
                  <p className="text-gray-500 text-lg">
                    {searchTerm ? 'No items match your search.' : 'No items in this category.'}
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4 gap-6">
                  {currentCategoryItems.map((item, index) => renderMenuItem(item, index))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Persistent Cart/Assistant Sidebar */}
      <div className={`fixed right-0 top-0 h-screen bg-white shadow-2xl border-l border-gray-200 transition-all duration-300 z-20 flex flex-col ${
        cartCollapsed ? 'w-20' : 'w-96'
      }`}>
        {/* Sidebar Header with Toggle */}
        <div className="p-4 border-b border-gray-100 flex items-center justify-between flex-shrink-0">
          {cartCollapsed ? (
            <div className="flex flex-col items-center w-full">
              {/* Shopping Bag Icon when collapsed */}
              <svg className="w-7 h-7 text-orange-600 mb-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
              </svg>
              <span className="text-xs font-medium text-gray-600">{itemCount}</span>
            </div>
          ) : (
            <>
              {/* View Toggle Buttons */}
              <div className="flex bg-gray-100 rounded-lg p-1 flex-1 mr-3">
                <button
                  onClick={() => setSidebarView('cart')}
                  className={`flex-1 flex items-center justify-center gap-2 px-3 py-2 rounded-md text-sm font-medium transition-all duration-200 ${
                    sidebarView === 'cart'
                      ? 'bg-white text-orange-600 shadow-sm'
                      : 'text-gray-600 hover:text-gray-800'
                  }`}
                >
                  {/* Shopping Bag Icon */}
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
                  </svg>
                  <span>Cart</span>
                  {itemCount > 0 && (
                    <span className="bg-orange-500 text-white text-xs px-1.5 py-0.5 rounded-full min-w-[20px] text-center">
                      {itemCount}
                    </span>
                  )}
                </button>
                <button
                  onClick={() => setSidebarView('assistant')}
                  className={`flex-1 flex items-center justify-center gap-2 px-3 py-2 rounded-md text-sm font-medium transition-all duration-200 ${
                    sidebarView === 'assistant'
                      ? 'bg-white text-orange-600 shadow-sm'
                      : 'text-gray-600 hover:text-gray-800'
                  }`}
                >
                  {/* AI Assistant Icon */}
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                  </svg>
                  <span>AI Help</span>
                </button>
              </div>
              <button
                onClick={() => setCartCollapsed(!cartCollapsed)}
                className="p-2 rounded-lg hover:bg-gray-100 transition-colors flex-shrink-0"
                title="Collapse sidebar"
              >
                <svg className="w-5 h-5 transition-transform duration-300" 
                  fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
              </button>
            </>
          )}
          {cartCollapsed && (
            <button
              onClick={() => setCartCollapsed(false)}
              className="absolute left-1/2 transform -translate-x-1/2 bottom-4 p-2 rounded-lg hover:bg-gray-100 transition-colors"
              title="Expand sidebar"
            >
              <svg className="w-5 h-5 rotate-180" 
                fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </button>
          )}
        </div>

        {!cartCollapsed && (
          <div className="flex-1 flex flex-col min-h-0">
            {/* Cart View */}
            {sidebarView === 'cart' && (
              <>
                {/* Cart Items */}
                <div className="flex-1 overflow-y-auto p-4">
                  {cartItems.length === 0 ? (
                    <div className="text-center py-16">
                      <svg className="w-16 h-16 text-gray-300 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
                      </svg>
                      <p className="text-gray-500">Your cart is empty</p>
                      <p className="text-gray-400 text-sm mt-1">Add items from the menu</p>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {cartItems.map(item => (
                        <div key={`${item._id}-${item.selectedSize}`} 
                          className="p-3 rounded-lg bg-gray-50 border border-gray-100 hover:shadow-sm transition-all">
                          <div className="flex items-start gap-3">
                            <div className="w-12 h-12 rounded-lg overflow-hidden shadow-sm">
                              <img 
                                src={item.image || (item.category === 'Beverages' ? '/placeholders/drinks.png' : '/placeholders/meal.png')}
                                alt={item.name}
                                className="w-full h-full object-cover"
                              />
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-start justify-between mb-1">
                                <h4 className="font-medium text-gray-800 text-sm truncate">
                                  {item.name}
                                </h4>
                                <div className="flex items-center ml-2">
                                  {/* Edit button */}
                                  <button
                                    onClick={() => handleEditCartItem(item)}
                                    className="text-orange-500 hover:text-orange-700 transition-colors p-1"
                                    title="Edit item"
                                  >
                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                                    </svg>
                                  </button>
                                  <button
                                    onClick={() => removeItem(item._id, item.selectedSize)}
                                    className="text-red-500 hover:text-red-700 transition-colors p-1"
                                    title="Remove item"
                                  >
                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                    </svg>
                                  </button>
                                </div>
                              </div>
                              <select
                                value={item.selectedSize}
                                onChange={(e) => updateSize(item, e.target.value)}
                                className="mt-1 p-1 text-xs rounded bg-orange-50 text-orange-600 border-orange-200 focus:ring-1 focus:ring-orange-200 w-full"
                              >
                                {item.availableSizes.map(size => (
                                  <option key={size} value={size}>
                                    {size} (₱{item.pricing[size].toFixed(2)})
                                  </option>
                                ))}
                              </select>
                              {/* Variant/Flavor indicator */}
                              {item.variant && (
                                <div className="mt-1 text-xs px-2 py-0.5 rounded bg-purple-50 text-purple-600">
                                  <span className="font-medium">Flavor:</span> {item.variant.name}
                                  {item.variant.priceAdjustment > 0 && (
                                    <span className="ml-1">(+₱{item.variant.priceAdjustment.toFixed(2)})</span>
                                  )}
                                </div>
                              )}
                              {/* Add-ons indicator */}
                              {item.addOns && item.addOns.length > 0 && (
                                <div className="mt-1 text-xs px-2 py-0.5 rounded bg-blue-50 text-blue-600">
                                  <span className="font-medium">Add-ons:</span>
                                  {item.addOns.map((addon, idx) => (
                                    <span key={addon._id || idx} className="ml-1">
                                      {addon.name} (+₱{(addon.price || 0).toFixed(2)})
                                      {idx < item.addOns.length - 1 && ','}
                                    </span>
                                  ))}
                                </div>
                              )}
                              {/* Item Notes */}
                              {item.notes && (
                                <div className="mt-1 text-xs px-2 py-0.5 rounded bg-yellow-50 text-yellow-700">
                                  <span className="font-medium">Notes:</span> {item.notes}
                                </div>
                              )}
                              <div className="flex items-center justify-between mt-2">
                                <div className="flex items-center gap-1">
                                  <button 
                                    onClick={() => updateQuantity(item, -1)}
                                    className="w-6 h-6 rounded-full bg-orange-100 text-orange-600 flex items-center justify-center text-xs transition-all hover:bg-orange-200"
                                  >
                                    -
                                  </button>
                                  <span className="w-8 text-center font-medium text-sm">{item.quantity}</span>
                                  <button
                                    onClick={() => updateQuantity(item, 1)}
                                    className="w-6 h-6 rounded-full bg-orange-100 text-orange-600 flex items-center justify-center text-xs transition-all hover:bg-orange-200"
                                  >
                                    +
                                  </button>
                                </div>
                                <p className="font-bold text-orange-600 text-sm">
                                  ₱{(() => {
                                    let itemTotal = item.price * item.quantity;
                                    if (item.variant?.priceAdjustment) {
                                      itemTotal += item.variant.priceAdjustment * item.quantity;
                                    }
                                    if (item.addOns?.length > 0) {
                                      const addOnsTotal = item.addOns.reduce((sum, addon) => sum + (addon.price || 0), 0);
                                      itemTotal += addOnsTotal * item.quantity;
                                    }
                                    return itemTotal.toFixed(2);
                                  })()}
                                </p>
                              </div>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Cart Footer */}
                {cartItems.length > 0 && (
                  <div className="p-4 border-t border-gray-100 bg-white flex-shrink-0">
                    <div className="flex items-center justify-between mb-4">
                      <span className="font-medium text-gray-700">{itemCount} items</span>
                      <span className="font-bold text-xl text-orange-600">₱{calculateTotal().total.toFixed(2)}</span>
                    </div>
                    {isAuthenticated ? (
                      <button 
                        className="w-full py-3 rounded-xl bg-gradient-to-r from-orange-500 to-orange-600 text-white font-bold transform transition-all duration-200 hover:scale-[1.02] active:scale-95 shadow-lg focus:ring-4 focus:ring-orange-200"
                        onClick={onProcessOrder}
                      >
                        Submit Order
                      </button>
                    ) : (
                      <div className="space-y-2">
                        <button 
                          className="w-full py-3 rounded-xl bg-gray-300 text-gray-600 font-bold cursor-not-allowed"
                          onClick={() => setShowLoginPrompt(true)}
                        >
                          Login to Order
                        </button>
                        <p className="text-xs text-center text-gray-500">
                          Please login or sign up to place your order
                        </p>
                      </div>
                    )}
                  </div>
                )}
              </>
            )}

            {/* AI Assistant View - Always mounted, visibility controlled */}
            <div className={sidebarView === 'assistant' ? 'flex-1 flex flex-col overflow-hidden' : 'hidden'}>
              <EmbeddedAssistant
                menuItems={menuItems}
                currentOrder={cartItems}
                addOns={addOns || []}
                onAddToCart={(item, options) => {
                  // If item needs customization and no options provided, open modal
                  if (needsCustomization(item) && !options?.skipCustomization) {
                    setPreviewItem(item);
                    setEditingCartItem(null);
                  } else {
                    addToOrder(item, options);
                  }
                }}
                onRequestCustomization={(item) => {
                  setPreviewItem(item);
                  setEditingCartItem(null);
                }}
                onRemoveFromCart={(itemId, selectedSize) => removeItem(itemId, selectedSize)}
                onUpdateQuantity={(itemId, selectedSize, delta) => updateCartQuantity(itemId, selectedSize, delta)}
                onUpdateSize={(itemId, oldSize, newSize) => updateCartSize(itemId, oldSize, newSize)}
                onClearCart={clearCart}
                onSubmitOrder={isAuthenticated ? onProcessOrder : () => setShowLoginPrompt(true)}
                isAuthenticated={isAuthenticated}
                cartTotal={calculateTotal().total}
              />
            </div>
          </div>
        )}
      </div>

      {/* Login Prompt Modal */}
      {showLoginPrompt && (
        <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-50">
          <div className="bg-white p-8 rounded-2xl text-center max-w-md mx-4">
            <div className="w-16 h-16 bg-orange-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-orange-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
              </svg>
            </div>
            <h2 className="text-2xl font-bold mb-2" style={{ color: colors.primary }}>Login Required</h2>
            <p className="text-gray-600 mb-6">
              Please login or create an account to place your order. Your cart will be saved!
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => {
                  setShowLoginPrompt(false);
                  navigate('/customer/login');
                }}
                className="flex-1 py-3 rounded-xl bg-gradient-to-r from-orange-500 to-orange-600 text-white font-bold transition-all duration-200 hover:scale-[1.02]"
              >
                Login
              </button>
              <button
                onClick={() => {
                  setShowLoginPrompt(false);
                  navigate('/customer/signup');
                }}
                className="flex-1 py-3 rounded-xl border-2 border-orange-500 text-orange-600 font-bold transition-all duration-200 hover:bg-orange-50"
              >
                Sign Up
              </button>
            </div>
            <button
              onClick={() => setShowLoginPrompt(false)}
              className="mt-4 text-gray-500 hover:text-gray-700 text-sm"
            >
              Continue Browsing
            </button>
          </div>
        </div>
      )}

      {/* Order confirmation is handled by SelfCheckout overlay with z-9999 */}

      {/* Alternatives Modal */}
      <AlternativesModal
        isOpen={modalState.isOpen}
        onClose={hideAlternatives}
        originalItem={modalState.originalItem}
        alternatives={modalState.alternatives}
        recommendedAlternative={modalState.recommendedAlternative}
        onAddToCart={(item) => {
          addToOrder(item);
          hideAlternatives();
        }}
        loading={modalState.loading}
      />

      {/* Item Customization Modal */}
      {previewItem && (
        <ItemPreviewModal
          item={previewItem}
          addOns={addOns || []}
          onClose={() => {
            setPreviewItem(null);
            setEditingCartItem(null);
          }}
          onConfirm={handleCustomizationConfirm}
          isEditing={!!editingCartItem}
          cartItem={editingCartItem}
          menuItems={menuItems}
          colors={colors}
        />
      )}
    </div>
  );
};

export default DesktopLayout;