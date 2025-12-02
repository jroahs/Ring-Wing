import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useCartContext } from '../../contexts/CartContext';
import { useMenuContext } from '../../contexts/MenuContext';
import { useCustomerAuth } from '../../contexts/CustomerAuthContext';
import { useAlternatives } from '../../hooks/useAlternatives';
import { AlternativesModal } from '../ui/AlternativesModal';
import AssistantPanel from '../ui/AssistantPanel';
import ItemCustomizationModal from '../ItemCustomizationModal';
import { FaStore, FaShoppingBag, FaTruck } from 'react-icons/fa';

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

const MobileLayout = ({ 
  searchTerm, 
  onSearchChange, 
  orderNumber,
  orderSubmitted,
  onProcessOrder 
}) => {
  const navigate = useNavigate();
  
  // Mobile-specific state
  const [activeTab, setActiveTab] = useState('menu');
  const [activeCategory, setActiveCategory] = useState('');
  const [activeSubCategory, setActiveSubCategory] = useState('All');
  const [expandedCategory, setExpandedCategory] = useState(null);
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [showAccountModal, setShowAccountModal] = useState(false);
  const [showLoginPrompt, setShowLoginPrompt] = useState(false);
  const [showOrderTypeModal, setShowOrderTypeModal] = useState(false);
  const [selectedOrderType, setSelectedOrderType] = useState(null);
  const [customizationItem, setCustomizationItem] = useState(null);
  
  // Ref for submit button visibility detection
  const submitButtonRef = useRef(null);
  const [isSubmitVisible, setIsSubmitVisible] = useState(false);
  
  // Get contexts
  const { cartItems, addItem, updateQuantity: updateCartQuantity, updateSize: updateCartSize, removeItem, getTotals, itemCount } = useCartContext();
  const { menuItems, categories, addOns, loading, error } = useMenuContext();
  const { isAuthenticated, isLoading: authLoading, customer, logout } = useCustomerAuth();

  // Alternatives modal functionality
  const { modalState, showAlternatives, hideAlternatives } = useAlternatives();

  // Initialize active category
  useEffect(() => {
    if (categories.length > 0 && !activeCategory) {
      setActiveCategory(categories[0].category);
      setExpandedCategory(categories[0].category);
    }
  }, [categories, activeCategory]);

  // Intersection Observer for submit button visibility
  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        setIsSubmitVisible(entry.isIntersecting);
      },
      { threshold: 0.1 }
    );

    if (submitButtonRef.current) {
      observer.observe(submitButtonRef.current);
    }

    return () => observer.disconnect();
  }, [cartItems.length]);

  // Check if item needs customization
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

  // Cart management functions (preserve exact SelfCheckout behavior)
  const addToOrder = (item) => {
    const sizes = Object.keys(item.pricing);
    const selectedSize = sizes.includes('base') ? 'base' : sizes[0];
    addItem(item, { size: selectedSize });
  };

  // Handle customization modal confirm
  const handleCustomizationConfirm = (customizedItem) => {
    addItem(customizedItem, { 
      size: customizedItem.selectedSize,
      variant: customizedItem.selectedVariant,
      addOns: customizedItem.selectedAddOns,
      quantity: customizedItem.quantity
    });
    setCustomizationItem(null);
  };

  // Handle menu item click - check availability first
  const handleItemClick = (item) => {
    if (item.isAvailable === false) {
      showAlternatives(item);
    } else if (needsCustomization(item)) {
      setCustomizationItem(item);
    } else {
      addToOrder(item);
    }
  };

  const updateQuantity = (item, delta) => {
    updateCartQuantity(item._id, item.selectedSize, delta);
  };

  const updateSize = (item, newSize) => {
    updateCartSize(item._id, item.selectedSize, newSize);
  };

  const calculateTotal = () => {
    return getTotals();
  };

  // Handle order submission with login check
  const handleSubmitOrder = () => {
    if (!isAuthenticated) {
      setShowLoginPrompt(true);
      return;
    }
    // Show order type selection modal
    setShowOrderTypeModal(true);
  };

  // Handle order type selection and proceed
  const handleOrderTypeSelect = (type) => {
    setSelectedOrderType(type);
  };

  const handleConfirmOrder = () => {
    setShowOrderTypeModal(false);
    onProcessOrder(selectedOrderType);
  };

  const handleLogout = async () => {
    setShowAccountModal(false);
    await logout();
  };

  // Get unique subcategories for the active category
  const getSubCategories = (categoryName) => {
    const items = menuItems.filter(item => item.category === categoryName);
    const subCats = [...new Set(items.map(item => item.subCategory).filter(Boolean))];
    return ['All', ...subCats];
  };

  // Helper function to render a category section
  const renderCategorySection = (categoryData, isLast = false) => {
    const categoryName = categoryData.category;
    const categoryItems = menuItems
      .filter(item => item.category === categoryName)
      .filter(item => activeSubCategory === 'All' || item.subCategory === activeSubCategory)
      .filter(item => 
        searchTerm === '' || 
        item.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (item.code && item.code.toLowerCase().includes(searchTerm.toLowerCase()))
      );

    if (categoryItems.length === 0) return null;

    return (
      <div key={categoryName} className={`p-4 ${!isLast ? 'border-b border-gray-100' : ''}`}>
        <h3 className="text-lg font-bold mb-3 text-orange-600">{categoryName}</h3>
        <div className="grid grid-cols-2 gap-3">
          {categoryItems.map(item => {
            const isUnavailable = item.isAvailable === false;
            return (
              <button
                key={item._id}
                onClick={() => handleItemClick(item)}
                className={`relative p-3 rounded-xl text-left transition-all duration-200 transform hover:scale-[1.02] overflow-hidden ${
                  isUnavailable 
                    ? 'bg-gray-100 border border-gray-200' 
                    : 'bg-white shadow-md hover:shadow-lg border border-gray-100'
                }`}
              >
                {/* Unavailable overlay and banner */}
                {isUnavailable && (
                  <>
                    {/* Gray overlay */}
                    <div className="absolute inset-0 bg-gray-500/30 z-[1] rounded-xl"></div>
                    
                    {/* Orange banner with UNAVAILABLE text */}
                    <div 
                      className="absolute inset-x-0 z-[2] flex items-center justify-center"
                      style={{ 
                        top: '50%', 
                        transform: 'translateY(-50%)',
                        height: '28px',
                        backgroundColor: colors.primary
                      }}
                    >
                      <span className="text-white font-bold text-xs tracking-wide">
                        UNAVAILABLE
                      </span>
                    </div>
                  </>
                )}
                
                <div className="w-full h-20 rounded-lg overflow-hidden mb-2">
                  <img 
                    src={item.image || (item.category === 'Beverages' ? '/placeholders/drinks.png' : '/placeholders/meal.png')}
                    alt={item.name}
                    className="w-full h-full object-cover"
                  />
                </div>
                <h4 className={`font-semibold text-sm mb-1 ${
                  isUnavailable ? 'text-gray-400' : 'text-gray-800'
                }`}>
                  {item.name}
                </h4>
                <p className={`text-xs mb-2 ${
                  isUnavailable ? 'text-gray-400' : 'text-gray-500'
                }`}>
                  {item.code}
                </p>
                <div className="flex items-center justify-between">
                  <p className={`font-bold text-sm ${
                    isUnavailable ? 'text-gray-400' : 'text-orange-600'
                  }`}>
                    ₱{Object.values(item.pricing)[0]?.toFixed(2) || '0.00'}
                  </p>
                  {isUnavailable && (
                    <span className="text-xs text-white bg-orange-500 px-1.5 py-0.5 rounded-full font-medium">
                      Tap
                    </span>
                  )}
                </div>
              </button>
            );
          })}
        </div>
      </div>
    );
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-orange-50 to-white">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2" 
          style={{ borderColor: colors.accent }}></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-4 bg-gradient-to-br from-orange-50 to-white">
        <div className="p-4 rounded-lg max-w-md text-center" 
          style={{ backgroundColor: colors.activeBg }}>
          <h2 className="text-xl font-bold mb-2" style={{ color: colors.primary }}>
            Error Loading Menu
          </h2>
          <p className="mb-4" style={{ color: colors.secondary }}>{error}</p>
          <button
            onClick={() => window.location.reload()}
            className="mt-4 px-4 py-2 rounded hover:opacity-90"
            style={{ backgroundColor: colors.accent, color: colors.background }}
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-50 to-white">
      {/* Mobile Search Bar */}
      <div className="sticky top-0 bg-white/80 backdrop-blur-lg p-4 shadow-lg z-10">
        <div className="flex items-center gap-3 max-w-md mx-auto">
          <div className="flex-1 relative">
            <input
              type="text"
              className="w-full h-10 pl-10 pr-4 rounded-full border-2 transition-all duration-300 focus:ring-4 focus:ring-orange-100 focus:border-orange-500 text-sm"
              style={{ borderColor: colors.muted }}
              placeholder="Search menu..."
              value={searchTerm}
              onChange={(e) => onSearchChange(e.target.value)}
            />
            <svg 
              xmlns="http://www.w3.org/2000/svg" 
              className="h-5 w-5 absolute left-3 top-2.5 transition-colors duration-300" 
              fill="none" 
              viewBox="0 0 24 24" 
              stroke={searchTerm ? colors.accent : colors.muted}
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
                d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          </div>
          
          {/* Single Auth Button */}
          {!authLoading && (
            !isAuthenticated ? (
              <button
                onClick={() => setShowAuthModal(true)}
                className="flex items-center gap-2 px-4 py-2 rounded-full bg-orange-500 text-white font-medium text-sm shadow-md hover:bg-orange-600 transition-colors"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                </svg>
                <span>Account</span>
              </button>
            ) : (
              <button
                onClick={() => setShowAccountModal(true)}
                className="flex items-center gap-2 px-3 py-2 rounded-full bg-orange-100 text-orange-600 font-medium text-sm"
              >
                <div className="w-6 h-6 rounded-full bg-orange-500 text-white flex items-center justify-center text-xs font-bold">
                  {customer?.firstName?.charAt(0) || 'U'}
                </div>
                <span className="max-w-[60px] truncate">{customer?.firstName || 'User'}</span>
              </button>
            )
          )}
        </div>
      </div>

      {/* Mobile Tabs - Minimalist text style */}
      <div className="flex justify-center gap-16 p-4 bg-white/80 backdrop-blur-lg shadow-sm sticky top-[72px] z-10">
        <button
          onClick={() => setActiveTab('menu')}
          className={`px-4 py-2 transition-all duration-300 text-lg ${
            activeTab === 'menu' 
              ? 'text-orange-500 font-bold' 
              : 'text-gray-400 font-medium hover:text-gray-500'
          }`}
        >
          Menu
        </button>
        <button
          onClick={() => setActiveTab('cart')}
          className={`px-4 py-2 transition-all duration-300 text-lg relative ${
            activeTab === 'cart'
              ? 'text-orange-500 font-bold'
              : 'text-gray-400 font-medium hover:text-gray-500'
          }`}
        >
          Cart
          {itemCount > 0 && (
            <span className="absolute -top-1 -right-3 w-5 h-5 bg-orange-500 text-white text-xs rounded-full flex items-center justify-center font-bold">
              {itemCount}
            </span>
          )}
        </button>
      </div>

      {/* Mobile Menu Grid */}
      {activeTab === 'menu' && (
        <div className="pt-2 pb-24">
          {/* Unified Category and Subcategory Container */}
          <div className="px-4 mb-3">
            <div className="bg-white rounded-lg p-3 shadow-sm">
              {/* Main Category Chips */}
              <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
                {categories.map((categoryData) => {
                  const isActive = activeCategory === categoryData.category;
                  
                  return (
                    <button
                      key={categoryData.category}
                      onClick={() => {
                        setActiveCategory(categoryData.category);
                        setActiveSubCategory('All');
                      }}
                      className={`px-4 py-2 rounded-lg font-medium whitespace-nowrap transition-all duration-200 flex-shrink-0 ${
                        isActive
                          ? 'bg-orange-500 text-white shadow-md'
                          : 'bg-gray-50 text-gray-600 hover:bg-gray-100'
                      }`}
                    >
                      {categoryData.category}
                    </button>
                  );
                })}
              </div>
              
              {/* Subcategory Filter Chips - Only show if subcategories exist */}
              {activeCategory && getSubCategories(activeCategory).length > 1 && (
                <>
                  <div className="border-t border-gray-100 my-2"></div>
                  <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
                    {getSubCategories(activeCategory).map((subCat) => (
                      <button
                        key={subCat}
                        onClick={() => setActiveSubCategory(subCat)}
                        className={`px-3 py-1.5 rounded-md text-sm font-medium whitespace-nowrap transition-all duration-200 flex-shrink-0 ${
                          activeSubCategory === subCat
                            ? 'bg-orange-500 text-white shadow-sm'
                            : 'bg-gray-50 text-gray-600 hover:bg-gray-100'
                        }`}
                      >
                        {subCat}
                      </button>
                    ))}
                  </div>
                </>
              )}
            </div>
          </div>
          
          {/* Menu Items */}
          {activeCategory && renderCategorySection(
            categories.find(c => c.category === activeCategory), 
            true
          )}
          
          {categories.length === 0 && (
            <div className="p-8 text-center">
              <p className="text-gray-500">Loading menu categories...</p>
            </div>
          )}
          
          {categories.length > 0 && menuItems.length === 0 && !loading && (
            <div className="p-8 text-center">
              <p className="text-gray-500">No menu items available</p>
            </div>
          )}
        </div>
      )}

      {/* Mobile Cart Items */}
      {activeTab === 'cart' && (
        <div className="p-4 space-y-3 pb-48">
          {cartItems.map(item => (
            <div key={`${item._id}-${item.selectedSize}`} 
              className="p-4 rounded-2xl bg-white shadow-lg transition-all duration-300">
              <div className="flex items-center gap-4">
                <div className="w-20 h-20 rounded-xl overflow-hidden shadow-inner flex-shrink-0">
                  <img 
                    src={item.image || (item.category === 'Beverages' ? '/placeholders/drinks.png' : '/placeholders/meal.png')}
                    alt={item.name}
                    className="w-full h-full object-cover"
                  />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between mb-1">
                    <h4 className="font-bold text-gray-800 flex-1 truncate pr-2">
                      {item.name}
                    </h4>
                    <button
                      onClick={() => removeItem(item._id, item.selectedSize)}
                      className="text-red-500 hover:text-red-700 transition-colors p-1 flex-shrink-0"
                      title="Remove item"
                    >
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                    </button>
                  </div>
                  <select
                    value={item.selectedSize}
                    onChange={(e) => updateSize(item, e.target.value)}
                    className="mt-1 p-2 rounded-lg bg-orange-50 text-orange-600 border-orange-200 focus:ring-2 focus:ring-orange-200 focus:border-orange-400 w-full text-sm"
                  >
                    {item.availableSizes.map(size => (
                      <option key={size} value={size}>
                        {size} (₱{item.pricing[size].toFixed(2)})
                      </option>
                    ))}
                  </select>
                  {/* Variant/Flavor indicator */}
                  {item.variant && (
                    <div className="mt-1 text-xs px-2 py-1 rounded bg-purple-50 text-purple-600">
                      <span className="font-medium">Flavor:</span> {item.variant.name}
                      {item.variant.priceAdjustment > 0 && (
                        <span className="ml-1">(+₱{item.variant.priceAdjustment.toFixed(2)})</span>
                      )}
                    </div>
                  )}
                  {/* Add-ons indicator */}
                  {item.addOns && item.addOns.length > 0 && (
                    <div className="mt-1 text-xs px-2 py-1 rounded bg-blue-50 text-blue-600">
                      <span className="font-medium">Add-ons:</span>
                      {item.addOns.map((addon, idx) => (
                        <span key={addon._id || idx} className="ml-1">
                          {addon.name} (+₱{(addon.price || 0).toFixed(2)})
                          {idx < item.addOns.length - 1 && ','}
                        </span>
                      ))}
                    </div>
                  )}
                  <div className="flex items-center justify-between mt-2">
                    <div className="flex items-center gap-2">
                      <button 
                        onClick={() => updateQuantity(item, -1)}
                        className="w-8 h-8 rounded-full bg-orange-100 text-orange-600 flex items-center justify-center transition-all hover:bg-orange-200"
                      >
                        -
                      </button>
                      <span className="w-8 text-center font-medium">{item.quantity}</span>
                      <button
                        onClick={() => updateQuantity(item, 1)}
                        className="w-8 h-8 rounded-full bg-orange-100 text-orange-600 flex items-center justify-center transition-all hover:bg-orange-200"
                      >
                        +
                      </button>
                    </div>
                    <p className="font-bold text-orange-600">
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
          {cartItems.length === 0 && (
            <div className="text-center py-12">
              <svg className="w-16 h-16 text-gray-300 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
              </svg>
              <p className="text-gray-500">Your cart is empty</p>
              <button
                onClick={() => setActiveTab('menu')}
                className="mt-4 px-6 py-2 bg-orange-100 text-orange-600 rounded-full hover:bg-orange-200 transition-colors"
              >
                Browse Menu
              </button>
            </div>
          )}
        </div>
      )}

      {/* Mobile Bottom Order Summary */}
      {cartItems.length > 0 && (
        <div 
          ref={submitButtonRef}
          className="fixed bottom-4 left-4 right-4 p-4 rounded-2xl shadow-xl bg-gradient-to-r from-orange-600 to-orange-500 text-white backdrop-blur-lg z-30"
        >
          <div className="flex items-center justify-between mb-2">
            <span className="font-medium">{itemCount} items</span>
            <span className="font-bold text-xl">₱{calculateTotal().total.toFixed(2)}</span>
          </div>
          {isAuthenticated ? (
            <button 
              className="w-full py-3 rounded-xl bg-white text-orange-600 font-bold transform transition-all duration-300 hover:scale-[1.02] active:scale-95"
              onClick={handleSubmitOrder}
            >
              Submit Order
            </button>
          ) : (
            <button 
              className="w-full py-3 rounded-xl bg-white/90 text-orange-600 font-bold"
              onClick={() => setShowLoginPrompt(true)}
            >
              Login to Order
            </button>
          )}
        </div>
      )}

      {/* Auth Modal (Login/Signup Landing) */}
      {showAuthModal && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl w-full max-w-sm overflow-hidden">
            <div className="p-6 text-center">
              <div className="w-16 h-16 bg-orange-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg className="w-8 h-8 text-orange-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                </svg>
              </div>
              <h2 className="text-xl font-bold text-gray-800 mb-2">Welcome!</h2>
              <p className="text-gray-600 mb-6">Sign in to your account or create a new one</p>
              
              <div className="space-y-3">
                <button
                  onClick={() => {
                    setShowAuthModal(false);
                    navigate('/customer/login');
                  }}
                  className="w-full py-3 rounded-xl bg-gradient-to-r from-orange-500 to-orange-600 text-white font-bold transition-all hover:scale-[1.02]"
                >
                  Login
                </button>
                <button
                  onClick={() => {
                    setShowAuthModal(false);
                    navigate('/customer/signup');
                  }}
                  className="w-full py-3 rounded-xl border-2 border-orange-500 text-orange-600 font-bold transition-all hover:bg-orange-50"
                >
                  Create Account
                </button>
              </div>
            </div>
            <button
              onClick={() => setShowAuthModal(false)}
              className="w-full py-3 border-t border-gray-100 text-gray-500 hover:bg-gray-50 transition-colors"
            >
              Continue Browsing
            </button>
          </div>
        </div>
      )}

      {/* Account Modal (for logged-in users) */}
      {showAccountModal && customer && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl w-full max-w-sm overflow-hidden">
            {/* Header */}
            <div className="p-6 bg-gradient-to-r from-orange-500 to-orange-600 text-white text-center">
              <div className="w-16 h-16 bg-white/20 rounded-full flex items-center justify-center mx-auto mb-3">
                <span className="text-2xl font-bold">{customer.firstName?.charAt(0)}</span>
              </div>
              <h2 className="text-lg font-bold">{customer.fullName || `${customer.firstName} ${customer.lastName}`}</h2>
              <p className="text-white/80 text-sm">@{customer.username}</p>
            </div>
            
            {/* Menu Items */}
            <div className="p-2">
              <button
                onClick={() => {
                  setShowAccountModal(false);
                  navigate('/customer/orders');
                }}
                className="w-full flex items-center gap-3 p-4 rounded-xl hover:bg-gray-50 transition-colors text-left"
              >
                <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                </svg>
                <span className="font-medium text-gray-800">My Orders</span>
              </button>
              
              <button
                onClick={() => {
                  setShowAccountModal(false);
                  navigate('/customer/addresses');
                }}
                className="w-full flex items-center gap-3 p-4 rounded-xl hover:bg-gray-50 transition-colors text-left"
              >
                <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
                <span className="font-medium text-gray-800">Delivery Addresses</span>
              </button>
              
              <button
                onClick={() => {
                  setShowAccountModal(false);
                  navigate('/customer/settings');
                }}
                className="w-full flex items-center gap-3 p-4 rounded-xl hover:bg-gray-50 transition-colors text-left"
              >
                <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
                <span className="font-medium text-gray-800">Settings</span>
              </button>
              
              <div className="border-t border-gray-100 my-2"></div>
              
              <button
                onClick={handleLogout}
                className="w-full flex items-center gap-3 p-4 rounded-xl hover:bg-red-50 transition-colors text-left text-red-600"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                </svg>
                <span className="font-medium">Logout</span>
              </button>
            </div>
            
            <button
              onClick={() => setShowAccountModal(false)}
              className="w-full py-3 border-t border-gray-100 text-gray-500 hover:bg-gray-50 transition-colors"
            >
              Close
            </button>
          </div>
        </div>
      )}

      {/* Login Prompt Modal */}
      {showLoginPrompt && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl w-full max-w-sm p-6 text-center">
            <div className="w-16 h-16 bg-orange-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-orange-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
              </svg>
            </div>
            <h2 className="text-xl font-bold text-gray-800 mb-2">Login Required</h2>
            <p className="text-gray-600 mb-6">Please login or create an account to place your order. Your cart will be saved!</p>
            
            <div className="flex gap-3">
              <button
                onClick={() => {
                  setShowLoginPrompt(false);
                  navigate('/customer/login');
                }}
                className="flex-1 py-3 rounded-xl bg-gradient-to-r from-orange-500 to-orange-600 text-white font-bold"
              >
                Login
              </button>
              <button
                onClick={() => {
                  setShowLoginPrompt(false);
                  navigate('/customer/signup');
                }}
                className="flex-1 py-3 rounded-xl border-2 border-orange-500 text-orange-600 font-bold"
              >
                Sign Up
              </button>
            </div>
            <button
              onClick={() => setShowLoginPrompt(false)}
              className="mt-4 text-gray-500 text-sm"
            >
              Continue Browsing
            </button>
          </div>
        </div>
      )}

      {/* Order Type Selection Modal */}
      {showOrderTypeModal && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl w-full max-w-sm overflow-hidden">
            <div className="p-6">
              <h2 className="text-xl font-bold text-gray-800 mb-2 text-center">Select Order Type</h2>
              <p className="text-gray-500 text-sm text-center mb-6">How would you like to receive your order?</p>
              
              <div className="space-y-3">
                {/* Dine-In */}
                <button
                  onClick={() => handleOrderTypeSelect('dine_in')}
                  className={`w-full p-4 rounded-xl border-2 transition-all flex items-center gap-4 ${
                    selectedOrderType === 'dine_in'
                      ? 'border-orange-500 bg-orange-50'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <div className={`w-12 h-12 rounded-full flex items-center justify-center ${
                    selectedOrderType === 'dine_in' ? 'bg-orange-500 text-white' : 'bg-gray-100 text-gray-600'
                  }`}>
                    <FaStore className="w-5 h-5" />
                  </div>
                  <div className="flex-1 text-left">
                    <h3 className={`font-bold ${selectedOrderType === 'dine_in' ? 'text-orange-600' : 'text-gray-800'}`}>
                      Dine-In
                    </h3>
                    <p className="text-sm text-gray-500">Eat here at the restaurant</p>
                  </div>
                  {selectedOrderType === 'dine_in' && (
                    <div className="w-6 h-6 rounded-full bg-orange-500 text-white flex items-center justify-center">
                      <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                      </svg>
                    </div>
                  )}
                </button>

                {/* Take-Out */}
                <button
                  onClick={() => handleOrderTypeSelect('takeout')}
                  className={`w-full p-4 rounded-xl border-2 transition-all flex items-center gap-4 ${
                    selectedOrderType === 'takeout'
                      ? 'border-green-500 bg-green-50'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <div className={`w-12 h-12 rounded-full flex items-center justify-center ${
                    selectedOrderType === 'takeout' ? 'bg-green-500 text-white' : 'bg-gray-100 text-gray-600'
                  }`}>
                    <FaShoppingBag className="w-5 h-5" />
                  </div>
                  <div className="flex-1 text-left">
                    <h3 className={`font-bold ${selectedOrderType === 'takeout' ? 'text-green-600' : 'text-gray-800'}`}>
                      Take-Out
                    </h3>
                    <p className="text-sm text-gray-500">Pick up your order</p>
                  </div>
                  {selectedOrderType === 'takeout' && (
                    <div className="w-6 h-6 rounded-full bg-green-500 text-white flex items-center justify-center">
                      <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                      </svg>
                    </div>
                  )}
                </button>

                {/* Delivery */}
                <button
                  onClick={() => handleOrderTypeSelect('delivery')}
                  className={`w-full p-4 rounded-xl border-2 transition-all flex items-center gap-4 ${
                    selectedOrderType === 'delivery'
                      ? 'border-blue-500 bg-blue-50'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <div className={`w-12 h-12 rounded-full flex items-center justify-center ${
                    selectedOrderType === 'delivery' ? 'bg-blue-500 text-white' : 'bg-gray-100 text-gray-600'
                  }`}>
                    <FaTruck className="w-5 h-5" />
                  </div>
                  <div className="flex-1 text-left">
                    <h3 className={`font-bold ${selectedOrderType === 'delivery' ? 'text-blue-600' : 'text-gray-800'}`}>
                      Delivery
                    </h3>
                    <p className="text-sm text-gray-500">We deliver to you</p>
                  </div>
                  {selectedOrderType === 'delivery' && (
                    <div className="w-6 h-6 rounded-full bg-blue-500 text-white flex items-center justify-center">
                      <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                      </svg>
                    </div>
                  )}
                </button>
              </div>

              {/* Payment Info */}
              {selectedOrderType && (
                <div className="mt-4 p-3 rounded-lg bg-gray-50 text-sm">
                  {selectedOrderType === 'dine_in' ? (
                    <p className="text-gray-600 flex items-center gap-2">
                      <span>ℹ️</span>
                      Pay at the counter when you pick up your order
                    </p>
                  ) : (
                    <p className="text-gray-600 flex items-center gap-2">
                      <span>💳</span>
                      Payment via GCash or PayMaya required
                    </p>
                  )}
                </div>
              )}
            </div>

            {/* Actions */}
            <div className="p-4 border-t border-gray-100 flex gap-3">
              <button
                onClick={() => {
                  setShowOrderTypeModal(false);
                  setSelectedOrderType(null);
                }}
                className="flex-1 py-3 rounded-xl border-2 border-gray-200 text-gray-600 font-bold"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmOrder}
                disabled={!selectedOrderType}
                className={`flex-1 py-3 rounded-xl font-bold transition-all ${
                  selectedOrderType
                    ? 'bg-gradient-to-r from-orange-500 to-orange-600 text-white'
                    : 'bg-gray-200 text-gray-400 cursor-not-allowed'
                }`}
              >
                Continue
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Order Confirmation Modal */}
      {orderSubmitted && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
          <div className="bg-white p-6 rounded-2xl text-center max-w-sm w-full">
            <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <h2 className="text-2xl font-bold mb-2">Order Submitted!</h2>
            <p className="text-gray-600 mb-4">Your order number is:</p>
            <p className="text-3xl font-bold mb-4" style={{ color: colors.accent }}>
              {orderNumber}
            </p>
            <p className="text-gray-600">
              Please proceed to the counter for payment
            </p>
          </div>
        </div>
      )}

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
      {customizationItem && (
        <ItemCustomizationModal
          item={customizationItem}
          addOns={addOns || []}
          onClose={() => setCustomizationItem(null)}
          onConfirm={handleCustomizationConfirm}
          colors={colors}
        />
      )}

      {/* AI Assistant - Dynamic positioning based on submit button bar visibility */}
      <AssistantPanel
        menuItems={menuItems}
        currentOrder={cartItems}
        onAddToCart={addToOrder}
        onOrderSuggestion={(suggestion) => {
          console.log('AI Suggestion:', suggestion);
        }}
        onSubmitOrder={isAuthenticated ? handleSubmitOrder : () => setShowLoginPrompt(true)}
        isAuthenticated={isAuthenticated}
        cartTotal={calculateTotal().total}
        bottomClass={cartItems.length > 0 ? 'bottom-36' : 'bottom-6'}
      />
    </div>
  );
};

export default MobileLayout;