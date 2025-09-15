import React from 'react';
import { useCartContext } from '../../contexts/CartContext';
import { useMenuContext } from '../../contexts/MenuContext';
import { useAlternatives } from '../../hooks/useAlternatives';
import { AlternativesModal } from '../ui/AlternativesModal';
import AssistantPanel from '../ui/AssistantPanel';

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
  const { cartItems, addItem, updateQuantity: updateCartQuantity, updateSize: updateCartSize, getTotals, itemCount } = useCartContext();
  const { menuItems, categories, loading, error } = useMenuContext();

  // Alternatives modal functionality
  const { modalState, showAlternatives, hideAlternatives } = useAlternatives();

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

  // Helper function to render a category section for tablet
  const renderCategorySection = (categoryData, isLast = false) => {
    const categoryName = categoryData.category;
    const categoryItems = menuItems
      .filter(item => item.category === categoryName)
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
          {categoryItems.map(item => (
            <button
              key={item._id}
              onClick={() => handleItemClick(item)}
              className={`p-4 rounded-xl text-left transition-all duration-200 transform hover:scale-[1.02] ${
                item.isAvailable === false 
                  ? 'bg-gray-100 border border-gray-200' 
                  : 'bg-white shadow-md hover:shadow-lg border border-gray-100'
              }`}
              style={{ minHeight: '180px' }} // Larger touch targets for tablet
            >
              <div className="w-full h-24 rounded-lg overflow-hidden mb-3">
                <img 
                  src={item.image || (item.category === 'Beverages' ? '/placeholders/drinks.png' : '/placeholders/meal.png')}
                  alt={item.name}
                  className="w-full h-full object-cover"
                />
              </div>
              <h4 className={`font-semibold text-base mb-1 ${
                item.isAvailable === false ? 'text-gray-400' : 'text-gray-800'
              }`}>
                {item.name}
              </h4>
              <p className={`text-sm mb-2 ${
                item.isAvailable === false ? 'text-gray-400' : 'text-gray-500'
              }`}>
                {item.code}
              </p>
              <p className={`font-bold text-base ${
                item.isAvailable === false ? 'text-gray-400' : 'text-orange-600'
              }`}>
                ₱{Object.values(item.pricing)[0]?.toFixed(2) || '0.00'}
                {item.isAvailable === false && (
                  <span className="block text-sm text-red-500 mt-1">See Alternatives</span>
                )}
              </p>
            </button>
          ))}
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
          <div className="relative">
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
        </div>
      </div>

      {/* Tablet Side-by-Side Layout */}
      <div className="flex h-[calc(100vh-100px)]">
        {/* Menu Section - Left Side */}
        <div className="flex-1 overflow-y-auto">
          <div className="p-2">
            {categories.map((categoryData, index) => 
              renderCategorySection(categoryData, index === categories.length - 1)
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
                        <h4 className="font-semibold text-gray-800 text-sm">
                          {item.name}
                        </h4>
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
                              ₱{(item.price * item.quantity).toFixed(2)}
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

      {/* Order Confirmation Modal */}
      {orderSubmitted && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white p-8 rounded-2xl text-center max-w-md">
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
      />
    </div>
  );
};

export default TabletLayout;