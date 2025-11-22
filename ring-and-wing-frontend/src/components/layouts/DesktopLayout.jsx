import React, { useState, useEffect, useRef } from 'react';
import { useCartContext } from '../../contexts/CartContext';
import { useMenuContext } from '../../contexts/MenuContext';
import { useAlternatives } from '../../hooks/useAlternatives';
import { AlternativesModal } from '../ui/AlternativesModal';
import AssistantPanel from '../ui/AssistantPanel';
import SelfCheckoutHeader from '../ui/SelfCheckoutHeader';

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
  const { cartItems, addItem, updateQuantity: updateCartQuantity, updateSize: updateCartSize, removeItem, getTotals, itemCount } = useCartContext();
  const { menuItems, categories, loading, error } = useMenuContext();

  // Desktop-specific state
  const [activeCategory, setActiveCategory] = useState('');
  const [activeSubCategory, setActiveSubCategory] = useState('All');
  const [expandedCategory, setExpandedCategory] = useState(null);
  const [hoveredItem, setHoveredItem] = useState(null);
  const [selectedItemIndex, setSelectedItemIndex] = useState(0);
  const [keyboardMode, setKeyboardMode] = useState(false);
  const [cartCollapsed, setCartCollapsed] = useState(false);
  const [isAssistantOpen, setIsAssistantOpen] = useState(false);
  
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
      // Ignore if user is typing in an input OR if assistant is open
      if (e.target.tagName === 'INPUT' || e.target.tagName === 'SELECT' || isAssistantOpen) {
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
  }, [activeCategory, menuItems, searchTerm, selectedItemIndex, cartCollapsed, categories, isAssistantOpen]);

  // Cart management functions
  const addToOrder = (item) => {
    const sizes = Object.keys(item.pricing);
    const selectedSize = sizes.includes('base') ? 'base' : sizes[0];
    addItem(item, { size: selectedSize });
  };

  const handleItemClick = (item) => {
    if (item.isAvailable === false) {
      showAlternatives(item);
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
    
    return (
      <div
        key={item._id}
        onClick={() => handleItemClick(item)}
        onMouseEnter={() => {
          setHoveredItem(item._id);
          if (!keyboardMode) setSelectedItemIndex(index);
        }}
        onMouseLeave={() => setHoveredItem(null)}
        className={`group p-4 rounded-xl cursor-pointer transition-all duration-200 border-2 ${
          item.isAvailable === false 
            ? 'bg-gray-50 border-gray-200' 
            : isSelected || isHovered
              ? 'bg-orange-50 border-orange-200 shadow-lg transform scale-[1.02]'
              : 'bg-white border-gray-100 hover:border-orange-200 hover:shadow-md'
        }`}
        style={{ minHeight: '200px' }} // Consistent card height
      >
        <div className="w-full h-32 rounded-lg overflow-hidden mb-3">
          <img 
            src={item.image || (item.category === 'Beverages' ? '/placeholders/drinks.png' : '/placeholders/meal.png')}
            alt={item.name}
            className={`w-full h-full object-cover transition-transform duration-200 ${
              (isHovered || isSelected) && item.isAvailable !== false ? 'scale-110' : ''
            }`}
          />
        </div>
        <h4 className={`font-semibold text-base mb-2 line-clamp-2 ${
          item.isAvailable === false ? 'text-gray-400' : 'text-gray-800'
        }`}>
          {item.name}
        </h4>
        <p className={`text-sm mb-2 ${
          item.isAvailable === false ? 'text-gray-400' : 'text-gray-500'
        }`}>
          {item.code}
        </p>
        <div className="flex items-center justify-between mt-auto">
          <p className={`font-bold text-lg ${
            item.isAvailable === false ? 'text-gray-400' : 'text-orange-600'
          }`}>
            ₱{Object.values(item.pricing)[0]?.toFixed(2) || '0.00'}
          </p>
          {item.isAvailable === false && (
            <span className="text-xs text-red-500 bg-red-50 px-2 py-1 rounded-full">
              See Alternatives
            </span>
          )}
          {(isHovered || isSelected) && item.isAvailable !== false && (
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
          <div className="flex items-center gap-6">
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

            {/* Customer Auth Section */}
            <SelfCheckoutHeader />

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
          </div>
        </div>

        <div className="flex-1 flex">
          {/* Category Sidebar with Dropdown */}
          <div className="w-64 bg-white shadow-sm border-r border-gray-100">
            <div className="p-4">
              <h3 className="font-bold text-lg text-gray-800 mb-4">Categories</h3>
              <nav className="space-y-1">
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
                      
                      {/* Subcategories Dropdown */}
                      {isExpanded && subCategories.length > 1 && (
                        <div className="ml-4 mt-1 space-y-1 animate-fadeIn">
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

      {/* Persistent Cart Sidebar */}
      <div className={`fixed right-0 top-0 h-screen bg-white shadow-2xl border-l border-gray-200 transition-all duration-300 z-20 ${
        cartCollapsed ? 'w-20' : 'w-96'
      }`}>
        {/* Cart Header */}
        <div className="p-4 border-b border-gray-100 flex items-center justify-between">
          <h2 className={`font-bold text-gray-800 transition-all duration-300 ${
            cartCollapsed ? 'text-sm' : 'text-xl'
          }`}>
            {cartCollapsed ? (
              <div className="flex flex-col items-center">
                <svg className="w-6 h-6 text-orange-600 mb-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 3h2l.4 2M7 13h10l4-8H5.4m0 0L7 13m0 0l-1.1 5H19M17 13v6a2 2 0 01-2 2H9a2 2 0 01-2-2v-6m8 0V9a2 2 0 00-2-2H9a2 2 0 00-2 2v4.01" />
                </svg>
                <span className="text-xs">{itemCount}</span>
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <svg className="w-6 h-6 text-orange-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 3h2l.4 2M7 13h10l4-8H5.4m0 0L7 13m0 0l-1.1 5H19M17 13v6a2 2 0 01-2 2H9a2 2 0 01-2-2v-6m8 0V9a2 2 0 00-2-2H9a2 2 0 00-2 2v4.01" />
                </svg>
                Cart ({itemCount})
              </div>
            )}
          </h2>
          <button
            onClick={() => setCartCollapsed(!cartCollapsed)}
            className="p-2 rounded-lg hover:bg-gray-100 transition-colors"
            title={cartCollapsed ? 'Expand cart' : 'Collapse cart'}
          >
            <svg className={`w-5 h-5 transition-transform duration-300 ${cartCollapsed ? 'rotate-180' : ''}`} 
              fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </button>
        </div>

        {!cartCollapsed && (
          <>
            {/* Cart Items */}
            <div className="flex-1 overflow-y-auto p-4">
              {cartItems.length === 0 ? (
                <div className="text-center py-16">
                  <svg className="w-16 h-16 text-gray-300 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 3h2l.4 2M7 13h10l4-8H5.4m0 0L7 13m0 0l-1.1 5H19M17 13v6a2 2 0 01-2 2H9a2 2 0 01-2-2v-6m8 0V9a2 2 0 00-2-2H9a2 2 0 00-2 2v4.01" />
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
                            <button
                              onClick={() => removeItem(item._id, item.selectedSize)}
                              className="text-red-500 hover:text-red-700 transition-colors p-1 ml-2"
                              title="Remove item"
                            >
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                              </svg>
                            </button>
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
                              ₱{(item.price * item.quantity).toFixed(2)}
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
              <div className="p-4 border-t border-gray-100 bg-white">
                <div className="flex items-center justify-between mb-4">
                  <span className="font-medium text-gray-700">{itemCount} items</span>
                  <span className="font-bold text-xl text-orange-600">₱{calculateTotal().total.toFixed(2)}</span>
                </div>
                <button 
                  className="w-full py-3 rounded-xl bg-gradient-to-r from-orange-500 to-orange-600 text-white font-bold transform transition-all duration-200 hover:scale-[1.02] active:scale-95 shadow-lg focus:ring-4 focus:ring-orange-200"
                  onClick={onProcessOrder}
                >
                  Submit Order
                </button>
              </div>
            )}
          </>
        )}
      </div>

      {/* Order Confirmation Modal */}
      {orderSubmitted && (
        <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-50">
          <div className="bg-white p-8 rounded-2xl text-center max-w-md mx-4">
            <h2 className="text-3xl font-bold mb-4">Order Submitted!</h2>
            <p className="text-xl mb-4">Your order number is:</p>
            <p className="text-4xl font-bold mb-6" style={{ color: colors.accent }}>
              {orderNumber}
            </p>
            <p className="text-lg" style={{ color: colors.primary }}>
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

      {/* AI Assistant */}
      <AssistantPanel
        menuItems={menuItems}
        currentOrder={cartItems}
        onAddToCart={addToOrder}
        onOrderSuggestion={(suggestion) => {
          console.log('AI Suggestion:', suggestion);
        }}
        onOpenChange={setIsAssistantOpen}
      />
    </div>
  );
};

export default DesktopLayout;