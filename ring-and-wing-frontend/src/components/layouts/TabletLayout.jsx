import React, { useState, useEffect } from 'react';
import { useCartContext } from '../../contexts/CartContext';
import { useMenuContext } from '../../contexts/MenuContext';
import { useCustomerAuth } from '../../contexts/CustomerAuthContext';
import { useAlternatives } from '../../hooks/useAlternatives';
import { AlternativesModal } from '../ui/AlternativesModal';
import AssistantPanel from '../ui/AssistantPanel';
import SelfCheckoutHeader from '../ui/SelfCheckoutHeader';
import ItemPreviewModal from '../ItemPreviewModal';

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

const TabletLayout = ({ 
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

  // Tablet-specific state
  const [activeCategory, setActiveCategory] = useState('');
  const [activeSubCategory, setActiveSubCategory] = useState('All');
  const [expandedCategory, setExpandedCategory] = useState(null);
  
  // Preview/Edit modal state
  const [previewItem, setPreviewItem] = useState(null);
  const [editingCartItem, setEditingCartItem] = useState(null);

  // Alternatives modal functionality
  const { modalState, showAlternatives, hideAlternatives } = useAlternatives();

  // Initialize active category
  useEffect(() => {
    if (categories.length > 0 && !activeCategory) {
      setActiveCategory(categories[0].category);
      setExpandedCategory(categories[0].category);
    }
  }, [categories, activeCategory]);

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

  // Get unique subcategories for the active category
  const getSubCategories = (categoryName) => {
    const items = menuItems.filter(item => item.category === categoryName);
    const subCats = [...new Set(items.map(item => item.subCategory).filter(Boolean))];
    return ['All', ...subCats];
  };

  // Helper function to render a category section for tablet
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
      <div key={categoryName} className={`p-6 ${!isLast ? 'border-b border-gray-100' : ''}`}>
        <h3 className="text-xl font-bold mb-4 text-orange-600">{categoryName}</h3>
        <div className="grid grid-cols-3 gap-4">
          {categoryItems.map(item => {
            const isUnavailable = item.isAvailable === false;
            return (
              <button
                key={item._id}
                onClick={() => handleItemClick(item)}
                className={`relative p-4 rounded-xl text-left transition-all duration-200 transform hover:scale-[1.02] overflow-hidden ${
                  isUnavailable 
                    ? 'bg-gray-100 border border-gray-200' 
                    : 'bg-white shadow-md hover:shadow-lg border border-gray-100'
                }`}
                style={{ minHeight: '180px' }} // Larger touch targets for tablet
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
                        height: '32px',
                        backgroundColor: colors.primary
                      }}
                    >
                      <span className="text-white font-bold text-sm tracking-wide">
                        UNAVAILABLE
                      </span>
                    </div>
                  </>
                )}
                
                <div className="w-full h-24 rounded-lg overflow-hidden mb-3">
                  <img 
                    src={item.image || (item.category === 'Beverages' ? '/placeholders/drinks.png' : '/placeholders/meal.png')}
                    alt={item.name}
                    className="w-full h-full object-cover"
                  />
                </div>
                <h4 className={`font-semibold text-base mb-1 ${
                  isUnavailable ? 'text-gray-400' : 'text-gray-800'
                }`}>
                  {item.name}
                </h4>
                <p className={`text-sm mb-2 ${
                  isUnavailable ? 'text-gray-400' : 'text-gray-500'
                }`}>
                  {item.code}
                </p>
                <div className="flex items-center justify-between">
                  <p className={`font-bold text-base ${
                    isUnavailable ? 'text-gray-400' : 'text-orange-600'
                  }`}>
                    ₱{Object.values(item.pricing)[0]?.toFixed(2) || '0.00'}
                  </p>
                  {isUnavailable && (
                    <span className="text-xs text-white bg-orange-500 px-2 py-1 rounded-full font-medium">
                      See Alternatives
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

  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-50 to-white">
      {/* Tablet Header with Search */}
      <div className="sticky top-0 bg-white/90 backdrop-blur-lg p-6 shadow-lg z-10 border-b border-gray-100">
        <div className="max-w-2xl mx-auto">
          <div className="flex items-center gap-4">
            <div className="flex-1 relative">
              <input
                type="text"
                className="w-full h-14 pl-14 pr-6 rounded-full border-2 text-lg transition-all duration-300 focus:ring-4 focus:ring-orange-100 focus:border-orange-500"
                style={{ borderColor: colors.muted }}
                placeholder="Search menu or scan item..."
                value={searchTerm}
                onChange={(e) => onSearchChange(e.target.value)}
              />
              <svg 
                xmlns="http://www.w3.org/2000/svg" 
                className="h-7 w-7 absolute left-5 top-3.5 transition-colors duration-300" 
                fill="none" 
                viewBox="0 0 24 24" 
                stroke={searchTerm ? colors.accent : colors.muted}
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
                  d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </div>
            <SelfCheckoutHeader />
          </div>
        </div>
      </div>

      {/* Tablet Side-by-Side Layout */}
      <div className="flex h-[calc(100vh-100px)]">
        {/* Menu Section - Left Side */}
        <div className="flex-1 overflow-y-auto">
          <div className="p-2">
            {/* Category Dropdown Navigation */}
            <div className="px-4 mb-4 space-y-2">
              {categories.map((categoryData) => {
                const isActive = activeCategory === categoryData.category;
                const isExpanded = expandedCategory === categoryData.category;
                const subCategories = getSubCategories(categoryData.category);
                
                return (
                  <div key={categoryData.category} className="bg-white rounded-xl shadow-sm">
                    <button
                      onClick={() => {
                        if (isActive && isExpanded) {
                          setExpandedCategory(null);
                        } else {
                          setActiveCategory(categoryData.category);
                          setActiveSubCategory('All');
                          setExpandedCategory(categoryData.category);
                        }
                      }}
                      className={`w-full text-left p-3 rounded-xl transition-all duration-200 flex items-center justify-between ${
                        isActive
                          ? 'bg-orange-100 text-orange-700 font-medium'
                          : 'hover:bg-gray-50 text-gray-600'
                      }`}
                    >
                      <span className="font-medium text-base">{categoryData.category}</span>
                      <svg 
                        className={`w-5 h-5 transition-transform duration-200 ${
                          isExpanded ? 'rotate-180' : ''
                        }`} 
                        fill="currentColor" 
                        viewBox="0 0 20 20"
                      >
                        <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
                      </svg>
                    </button>
                    
                    {/* Subcategories Dropdown */}
                    {isExpanded && subCategories.length > 1 && (
                      <div className="px-3 pb-3 space-y-1 animate-fadeIn">
                        {subCategories.map((subCat) => (
                          <button
                            key={subCat}
                            onClick={() => setActiveSubCategory(subCat)}
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
            </div>
            
            {/* Menu Items */}
            {activeCategory && renderCategorySection(
              categories.find(c => c.category === activeCategory), 
              true
            )}
            
            {categories.length === 0 && (
              <div className="p-12 text-center">
                <p className="text-gray-500 text-lg">Loading menu categories...</p>
              </div>
            )}
            
            {categories.length > 0 && menuItems.length === 0 && !loading && (
              <div className="p-12 text-center">
                <p className="text-gray-500 text-lg">No menu items available</p>
              </div>
            )}
          </div>
        </div>

        {/* Cart Section - Right Side */}
        <div className="w-96 bg-white shadow-xl border-l border-gray-200 flex flex-col">
          {/* Cart Header */}
          <div className="p-6 border-b border-gray-100">
            <h2 className="text-xl font-bold text-gray-800 flex items-center gap-2">
              <svg className="w-6 h-6 text-orange-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 3h2l.4 2M7 13h10l4-8H5.4m0 0L7 13m0 0l-1.1 5H19M17 13v6a2 2 0 01-2 2H9a2 2 0 01-2-2v-6m8 0V9a2 2 0 00-2-2H9a2 2 0 00-2 2v4.01" />
              </svg>
              Cart ({itemCount})
            </h2>
          </div>

          {/* Cart Items */}
          <div className="flex-1 overflow-y-auto p-4">
            {cartItems.length === 0 ? (
              <div className="text-center py-16">
                <svg className="w-16 h-16 text-gray-300 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 3h2l.4 2M7 13h10l4-8H5.4m0 0L7 13m0 0l-1.1 5H19M17 13v6a2 2 0 01-2 2H9a2 2 0 01-2-2v-6m8 0V9a2 2 0 00-2-2H9a2 2 0 00-2 2v4.01" />
                </svg>
                <p className="text-gray-500 text-lg">Your cart is empty</p>
                <p className="text-gray-400 text-sm mt-2">Add items from the menu</p>
              </div>
            ) : (
              <div className="space-y-4">
                {cartItems.map(item => (
                  <div key={`${item._id}-${item.selectedSize}`} 
                    className="p-4 rounded-xl bg-gray-50 border border-gray-100">
                    <div className="flex items-start gap-3">
                      <div className="w-16 h-16 rounded-lg overflow-hidden shadow-sm">
                        <img 
                          src={item.image || (item.category === 'Beverages' ? '/placeholders/drinks.png' : '/placeholders/meal.png')}
                          alt={item.name}
                          className="w-full h-full object-cover"
                        />
                      </div>
                      <div className="flex-1">
                        <div className="flex items-start justify-between mb-1">
                          <h4 className="font-semibold text-gray-800 text-sm">
                            {item.name}
                          </h4>
                          <div className="flex items-center gap-1">
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
                          className="mt-1 p-1 text-sm rounded bg-orange-50 text-orange-600 border-orange-200 focus:ring-1 focus:ring-orange-200"
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
                        <div className="flex items-center gap-2 mt-2">
                          <button 
                            onClick={() => updateQuantity(item, -1)}
                            className="w-7 h-7 rounded-full bg-orange-100 text-orange-600 flex items-center justify-center text-sm transition-all hover:bg-orange-200"
                          >
                            -
                          </button>
                          <span className="w-6 text-center font-medium text-sm">{item.quantity}</span>
                          <button
                            onClick={() => updateQuantity(item, 1)}
                            className="w-7 h-7 rounded-full bg-orange-100 text-orange-600 flex items-center justify-center text-sm transition-all hover:bg-orange-200"
                          >
                            +
                          </button>
                          <div className="ml-auto text-right">
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
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Cart Footer with Total and Checkout */}
          {cartItems.length > 0 && (
            <div className="p-6 border-t border-gray-100 bg-white">
              <div className="flex items-center justify-between mb-4">
                <span className="font-medium text-lg text-gray-700">{itemCount} items</span>
                <span className="font-bold text-2xl text-orange-600">₱{calculateTotal().total.toFixed(2)}</span>
              </div>
              <button 
                className="w-full py-4 rounded-xl bg-gradient-to-r from-orange-500 to-orange-600 text-white text-lg font-bold transform transition-all duration-300 hover:scale-[1.02] active:scale-95 shadow-lg"
                onClick={onProcessOrder}
              >
                Submit Order
              </button>
            </div>
          )}
        </div>
      </div>

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

      {/* AI Assistant */}
      <AssistantPanel
        menuItems={menuItems}
        currentOrder={cartItems}
        addOns={addOns || []}
        onAddToCart={(item, options) => {
          // If item needs customization and no options provided, open modal
          if (needsCustomization(item) && !options?.skipCustomization) {
            setPreviewItem(item);
            setEditingCartItem(null);
          } else {
            addItem(item, options);
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
        onOrderSuggestion={(suggestion) => {
          console.log('AI Suggestion:', suggestion);
        }}
        onSubmitOrder={isAuthenticated ? onProcessOrder : null}
        isAuthenticated={isAuthenticated}
        cartTotal={getTotals().total}
      />
    </div>
  );
};

export default TabletLayout;