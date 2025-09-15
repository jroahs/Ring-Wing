import React, { useState } from 'react';
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

const MobileLayout = ({ 
  searchTerm, 
  onSearchChange, 
  orderNumber,
  orderSubmitted,
  onProcessOrder 
}) => {
  // Mobile-specific state
  const [activeTab, setActiveTab] = useState('menu');
  
  // Get contexts
  const { cartItems, addItem, updateQuantity: updateCartQuantity, updateSize: updateCartSize, getTotals, itemCount } = useCartContext();
  const { menuItems, categories, loading, error } = useMenuContext();

  // Alternatives modal functionality
  const { modalState, showAlternatives, hideAlternatives } = useAlternatives();

  // Cart management functions (preserve exact SelfCheckout behavior)
  const addToOrder = (item) => {
    const sizes = Object.keys(item.pricing);
    const selectedSize = sizes.includes('base') ? 'base' : sizes[0];
    addItem(item, { size: selectedSize });
  };

  // Handle menu item click - check availability first
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

  // Helper function to render a category section
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
      <div key={categoryName} className={`p-4 ${!isLast ? 'border-b border-gray-100' : ''}`}>
        <h3 className="text-lg font-bold mb-3 text-orange-600">{categoryName}</h3>
        <div className="grid grid-cols-2 gap-3">
          {categoryItems.map(item => (
            <button
              key={item._id}
              onClick={() => handleItemClick(item)}
              className={`p-3 rounded-xl text-left transition-all duration-200 transform hover:scale-[1.02] ${
                item.isAvailable === false 
                  ? 'bg-gray-100 border border-gray-200' 
                  : 'bg-white shadow-md hover:shadow-lg border border-gray-100'
              }`}
            >
              <div className="w-full h-20 rounded-lg overflow-hidden mb-2">
                <img 
                  src={item.image || (item.category === 'Beverages' ? '/placeholders/drinks.png' : '/placeholders/meal.png')}
                  alt={item.name}
                  className="w-full h-full object-cover"
                />
              </div>
              <h4 className={`font-semibold text-sm mb-1 ${
                item.isAvailable === false ? 'text-gray-400' : 'text-gray-800'
              }`}>
                {item.name}
              </h4>
              <p className={`text-xs mb-2 ${
                item.isAvailable === false ? 'text-gray-400' : 'text-gray-500'
              }`}>
                {item.code}
              </p>
              <p className={`font-bold text-sm ${
                item.isAvailable === false ? 'text-gray-400' : 'text-orange-600'
              }`}>
                ₱{Object.values(item.pricing)[0]?.toFixed(2) || '0.00'}
                {item.isAvailable === false && (
                  <span className="block text-xs text-red-500 mt-1">See Alternatives</span>
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
        <div className="relative max-w-md mx-auto">
          <input
            type="text"
            className="w-full h-12 pl-12 pr-4 rounded-full border-2 transition-all duration-300 focus:ring-4 focus:ring-orange-100 focus:border-orange-500"
            style={{ borderColor: colors.muted }}
            placeholder="Search menu or scan item..."
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
      </div>

      {/* Mobile Tabs */}
      <div className="flex justify-around p-2 bg-white/80 backdrop-blur-lg shadow-sm sticky top-[68px] z-10 -mt-2">
        <button
          onClick={() => setActiveTab('menu')}
          className={`px-6 py-2 rounded-full font-medium transition-all duration-300 ${
            activeTab === 'menu' 
              ? 'bg-gradient-to-r from-orange-500 to-orange-600 text-white shadow-lg scale-105' 
              : 'bg-white text-gray-600 hover:bg-orange-50'
          }`}
        >
          Menu
        </button>
        <button
          onClick={() => setActiveTab('cart')}
          className={`px-6 py-2 rounded-full font-medium transition-all duration-300 ${
            activeTab === 'cart'
              ? 'bg-gradient-to-r from-orange-500 to-orange-600 text-white shadow-lg scale-105'
              : 'bg-white text-gray-600 hover:bg-orange-50'
          }`}
        >
          Cart ({itemCount})
        </button>
      </div>

      {/* Mobile Menu Grid */}
      {activeTab === 'menu' && (
        <div className="pt-4">
          {categories.map((categoryData, index) => 
            renderCategorySection(categoryData, index === categories.length - 1)
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
        <div className="p-4 space-y-3 mb-24">
          {cartItems.map(item => (
            <div key={`${item._id}-${item.selectedSize}`} 
              className="p-4 rounded-2xl bg-white shadow-lg transition-all duration-300">
              <div className="flex items-center gap-4">
                <div className="w-20 h-20 rounded-xl overflow-hidden shadow-inner">
                  <img 
                    src={item.image || (item.category === 'Beverages' ? '/placeholders/drinks.png' : '/placeholders/meal.png')}
                    alt={item.name}
                    className="w-full h-full object-cover"
                  />
                </div>
                <div className="flex-1">
                  <h4 className="font-bold text-gray-800">
                    {item.name}
                  </h4>
                  <select
                    value={item.selectedSize}
                    onChange={(e) => updateSize(item, e.target.value)}
                    className="mt-1 p-2 rounded-lg bg-orange-50 text-orange-600 border-orange-200 focus:ring-2 focus:ring-orange-200 focus:border-orange-400"
                  >
                    {item.availableSizes.map(size => (
                      <option key={size} value={size}>
                        {size} (₱{item.pricing[size].toFixed(2)})
                      </option>
                    ))}
                  </select>
                  <div className="flex items-center gap-3 mt-2">
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
                </div>
                <div className="text-right">
                  <p className="font-bold text-orange-600">
                    ₱{(item.price * item.quantity).toFixed(2)}
                  </p>
                </div>
              </div>
            </div>
          ))}
          {cartItems.length === 0 && (
            <div className="text-center py-12">
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
        <div className="fixed bottom-4 left-4 right-4 p-4 rounded-2xl shadow-xl bg-gradient-to-r from-orange-600 to-orange-500 text-white backdrop-blur-lg">
          <div className="flex items-center justify-between mb-2">
            <span className="font-medium">{itemCount} items</span>
            <span className="font-bold text-xl">₱{calculateTotal().total.toFixed(2)}</span>
          </div>
          <button 
            className="w-full py-3 rounded-xl bg-white text-orange-600 font-bold transform transition-all duration-300 hover:scale-[1.02] active:scale-95"
            onClick={onProcessOrder}
          >
            Submit Order
          </button>
        </div>
      )}

      {/* Order Confirmation Modal */}
      {orderSubmitted && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white p-6 rounded-2xl text-center">
            <h2 className="text-2xl font-bold mb-4">Order Submitted!</h2>
            <p className="text-lg mb-4">Your order number is:</p>
            <p className="text-3xl font-bold mb-4" style={{ color: colors.accent }}>
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

export default MobileLayout;