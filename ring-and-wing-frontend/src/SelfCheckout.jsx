import React, { useState, useEffect, useMemo } from 'react';
import PropTypes from 'prop-types';
import { API_URL } from './App';
import { AlternativesModal } from './components/ui/AlternativesModal';
import { useAlternatives } from './hooks/useAlternatives';
import SelfCheckoutAIAssistant from './components/ui/SelfCheckoutAIAssistant';

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

const Receipt = React.forwardRef(({ order, totals }, ref) => {
  return (
    <div ref={ref} className="text-xs p-6" style={{ backgroundColor: colors.background }}>
      <div className="text-center">
        <h2 className="text-xl font-semibold" style={{ color: colors.primary }}>Ring & Wings</h2>
        <p style={{ color: colors.secondary }}>Thank You</p>
      </div>
      <div className="flex mt-4" style={{ color: colors.primary }}>
        <div className="flex-grow">No: {order.receiptNumber}</div>
        <div>{new Date().toLocaleString()}</div>
      </div>
      <hr className="my-2" style={{ borderColor: colors.muted }}/>
      <table className="w-full">
        <thead>
          <tr style={{ backgroundColor: colors.primary }}>
            <th className="py-1 w-1/12 text-center text-white">#</th>
            <th className="py-1 text-left text-white">Item</th>
            <th className="py-1 w-2/12 text-center text-white">Qty</th>
            <th className="py-1 w-3/12 text-right text-white">Subtotal</th>
          </tr>
        </thead>
        <tbody>
          {order.items.map((item, index) => (
            <tr key={`${item._id}-${item.selectedSize}`} style={{ borderColor: colors.muted }}>
              <td className="py-2 text-center" style={{ color: colors.primary }}>{index + 1}</td>
              <td className="py-2 text-left" style={{ color: colors.primary }}>
                {item.name} ({item.selectedSize})<br/>
                <small style={{ color: colors.secondary }}>₱{item.price.toFixed(2)}</small>
              </td>
              <td className="py-2 text-center" style={{ color: colors.primary }}>{item.quantity}</td>
              <td className="py-2 text-right" style={{ color: colors.primary }}>₱{(item.quantity * item.price).toFixed(2)}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <hr className="my-2" style={{ borderColor: colors.muted }}/>
      <div className="flex justify-between font-semibold text-sm" style={{ color: colors.primary }}>
        <span>Subtotal:</span>
        <span>₱{totals.subtotal}</span>
      </div>
      <div className="flex justify-between font-bold mt-1" style={{ color: colors.primary }}>
        <span>TOTAL</span>
        <span>₱{totals.total}</span>
      </div>
    </div>
  );
});

Receipt.propTypes = {
  order: PropTypes.shape({
    items: PropTypes.array.isRequired,
    receiptNumber: PropTypes.string.isRequired
  }).isRequired,
  totals: PropTypes.object.isRequired
};

const SelfCheckout = () => {
  const [orderNumber, setOrderNumber] = useState('');
  const [menuItems, setMenuItems] = useState([]);
  const [currentOrder, setCurrentOrder] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [activeTab, setActiveTab] = useState('menu');
  const [orderSubmitted, setOrderSubmitted] = useState(false);

  // Alternatives modal functionality
  const { modalState, showAlternatives, hideAlternatives } = useAlternatives();

  // Prevent body scroll when modal is open
  useEffect(() => {
    if (modalState.isOpen) {
      document.body.style.overflow = 'hidden';
      document.body.style.position = 'fixed';
      document.body.style.width = '100%';
    } else {
      document.body.style.overflow = '';
      document.body.style.position = '';
      document.body.style.width = '';
    }

    // Cleanup on unmount
    return () => {
      document.body.style.overflow = '';
      document.body.style.position = '';
      document.body.style.width = '';
    };
  }, [modalState.isOpen]);

  const filteredItems = useMemo(() => 
    menuItems
      // Show ALL items, including unavailable ones for alternatives
      .filter(item =>
        item.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (item.code && item.code.toLowerCase().includes(searchTerm.toLowerCase()))
      )
  , [menuItems, searchTerm]);

  useEffect(() => {
    const fetchMenuItems = async () => {
      try {
        const response = await fetch(`${API_URL}/api/menu?limit=1000`);
        const data = await response.json();
        const items = Array.isArray(data) ? data : data.items || [];
        setMenuItems(items.map(item => ({
          ...item,
          image: item.image ? `${API_URL}${item.image}` : null,
          pricing: item.pricing || { base: 0 },
          modifiers: item.modifiers || [],
          isAvailable: item.isAvailable // Include availability status
        })));
      } catch (err) {
        setError('Failed to load menu');
      } finally {
        setLoading(false);
      }
    };
    fetchMenuItems();
  }, []);

  // Add refresh functionality for menu updates
  useEffect(() => {
    const refreshMenuData = async () => {
      try {
        const response = await fetch(`${API_URL}/api/menu?limit=1000`);
        const data = await response.json();
        const items = Array.isArray(data) ? data : data.items || [];
        setMenuItems(items.map(item => ({
          ...item,
          image: item.image ? `${API_URL}${item.image}` : null,
          pricing: item.pricing || { base: 0 },
          modifiers: item.modifiers || [],
          isAvailable: item.isAvailable
        })));
      } catch (err) {
        console.warn('Menu refresh failed:', err);
      }
    };

    // Refresh on window focus
    const handleFocus = () => refreshMenuData();
    window.addEventListener('focus', handleFocus);

    // Periodic refresh every 30 seconds
    const intervalId = setInterval(refreshMenuData, 30000);

    return () => {
      window.removeEventListener('focus', handleFocus);
      clearInterval(intervalId);
    };
  }, []);

  const generateReceiptNumber = () => {
    const timestamp = Date.now().toString().slice(-6);
    const random = Math.floor(100 + Math.random() * 900);
    return `SC-${timestamp}${random}`;
  };

  const addToOrder = (item) => {
    const sizes = Object.keys(item.pricing);
    const selectedSize = sizes.includes('base') ? 'base' : sizes[0];
    const existing = currentOrder.find(i =>
      i._id === item._id && i.selectedSize === selectedSize
    );

    setCurrentOrder(existing ?
      currentOrder.map(i =>
        i._id === item._id && i.selectedSize === selectedSize ? 
        { ...i, quantity: i.quantity + 1 } : i
      ) :
      [...currentOrder, {
        ...item,
        price: item.pricing[selectedSize],
        selectedSize,
        availableSizes: sizes,
        quantity: 1
      }]
    );
  };

  // Handle menu item click - check availability first
  const handleItemClick = (item) => {
    if (item.isAvailable === false) {
      // Show alternatives modal for unavailable items
      showAlternatives(item);
    } else {
      // Add available items directly to cart
      addToOrder(item);
    }
  };

  const updateQuantity = (item, delta) => {
    setCurrentOrder(currentOrder.map(i =>
      i._id === item._id && i.selectedSize === item.selectedSize ?
      { ...i, quantity: Math.max(1, i.quantity + delta) } :
      i
    ));
  };

  const updateSize = (item, newSize) => {
    setCurrentOrder(currentOrder.map(i =>
      i._id === item._id && i.selectedSize === item.selectedSize ?
      { ...i, selectedSize: newSize, price: i.pricing[newSize] } :
      i
    ));
  };

  const calculateTotal = () => {
    const subtotal = currentOrder.reduce((sum, item) => sum + (item.price * item.quantity), 0);
    return {
      subtotal: subtotal,
      discount: 0,
      total: subtotal
    };
  };

  const saveOrderToDB = async () => {
    const calculatedTotals = calculateTotal();
    
    const orderData = {
      items: currentOrder.map(item => ({
        name: item.name,
        price: item.price,
        quantity: item.quantity,
        selectedSize: item.selectedSize
      })),
      totals: {
        subtotal: calculatedTotals.subtotal,
        total: calculatedTotals.total
      },
      paymentMethod: 'pending',
      orderType: 'self_checkout',
      status: 'pending'
    };
  
    try {
      const response = await fetch(`${API_URL}/api/orders`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(orderData)
      });
      const data = await response.json();
      setOrderNumber(data.data.receiptNumber);
      setOrderSubmitted(true);
    } catch (error) {
      alert('Failed to submit order. Please try again.');
    }
  };

  const processOrder = async () => {
    if (currentOrder.length === 0) {
      alert('Please add items to your order');
      return;
    }
    await saveOrderToDB();
    setCurrentOrder([]);
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2" 
          style={{ borderColor: colors.accent }}></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-4">
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
      {/* Search Bar with enhanced styling */}
      <div className="sticky top-0 bg-white/80 backdrop-blur-lg p-4 shadow-lg z-10">
        <div className="relative max-w-md mx-auto">
          <input
            type="text"
            className="w-full h-12 pl-12 pr-4 rounded-full border-2 transition-all duration-300 focus:ring-4 focus:ring-orange-100 focus:border-orange-500"
            style={{ borderColor: colors.muted }}
            placeholder="Search menu or scan item..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
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
      </div>      {/* Enhanced Tabs */}
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
          Cart ({currentOrder.length})
        </button>
      </div>
  
      {/* Enhanced Menu Grid */}
      {activeTab === 'menu' && (
        <div className="pt-4"> {/* Added padding-top */}
          {/* Meals Section */}
          <div className="mb-6">
            <div className="mb-2 bg-white rounded-lg py-1 px-3 shadow-sm mx-4">
              <div className="flex items-center">
                <span className="font-medium text-sm" style={{ color: colors.primary }}>
                  Meals
                </span>
              </div>
            </div>
            <div className="p-4 grid grid-cols-2 gap-4">
              {menuItems
                .filter(item => item.category === 'Meals')
                // Show ALL items including unavailable ones
                .filter(item => 
                  searchTerm === '' || 
                  item.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                  (item.code && item.code.toLowerCase().includes(searchTerm.toLowerCase()))
                )
                .map(item => (
                  <button
                    key={item._id}
                    className={`text-left p-3 rounded-2xl shadow-lg transition-all duration-300 transform hover:scale-[1.02] active:scale-95 bg-white ${
                      item.isAvailable === false ? 'opacity-70' : ''
                    }`}
                    onClick={() => handleItemClick(item)}
                  >
                    <div className="relative">
                      <img 
                        src={item.image || '/placeholders/meal.png'} 
                        alt={item.name} 
                        className="w-full h-36 object-cover rounded-xl mb-2 shadow-inner"
                        onError={(e) => { e.target.src = '/placeholders/meal.png'; }}
                      />
                      <div className="absolute top-2 right-2 bg-white/90 backdrop-blur-sm px-2 py-1 rounded-full shadow-lg">
                        <span className="text-sm font-bold text-orange-600">
                          ₱{Math.min(...Object.values(item.pricing)).toFixed(2)}
                        </span>
                      </div>
                      {/* Unavailable indicator */}
                      {item.isAvailable === false && (
                        <div className="absolute inset-0 rounded-xl bg-black/30 flex items-center justify-center">
                          <div className="bg-red-500 text-white px-2 py-1 rounded-full text-xs font-bold">
                            UNAVAILABLE
                          </div>
                        </div>
                      )}
                    </div>
                    <h3 className="font-bold text-gray-800 truncate">
                      {item.name}
                    </h3>
                    <p className="text-sm text-gray-500 truncate">
                      {item.description || "No description available"}
                    </p>
                  </button>
                ))}
            </div>
          </div>

          {/* Beverages Section */}
          <div>
            <div className="mb-2 bg-white rounded-lg py-1 px-3 shadow-sm mx-4">
              <div className="flex items-center">
                <span className="font-medium text-sm" style={{ color: colors.primary }}>
                  Beverages
                </span>
              </div>
            </div>
            <div className="p-4 grid grid-cols-2 gap-4">
              {menuItems
                .filter(item => item.category === 'Beverages')
                // Show ALL items including unavailable ones
                .filter(item => 
                  searchTerm === '' || 
                  item.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                  (item.code && item.code.toLowerCase().includes(searchTerm.toLowerCase()))
                )
                .map(item => (
                  <button
                    key={item._id}
                    className={`text-left p-3 rounded-2xl shadow-lg transition-all duration-300 transform hover:scale-[1.02] active:scale-95 bg-white ${
                      item.isAvailable === false ? 'opacity-70' : ''
                    }`}
                    onClick={() => handleItemClick(item)}
                  >
                    <div className="relative">
                      <img 
                        src={item.image || '/placeholders/drinks.png'} 
                        alt={item.name} 
                        className="w-full h-36 object-cover rounded-xl mb-2 shadow-inner"
                        onError={(e) => { e.target.src = '/placeholders/drinks.png'; }}
                      />
                      <div className="absolute top-2 right-2 bg-white/90 backdrop-blur-sm px-2 py-1 rounded-full shadow-lg">
                        <span className="text-sm font-bold text-orange-600">
                          ₱{Math.min(...Object.values(item.pricing)).toFixed(2)}
                        </span>
                      </div>
                      {/* Unavailable indicator */}
                      {item.isAvailable === false && (
                        <div className="absolute inset-0 rounded-xl bg-black/30 flex items-center justify-center">
                          <div className="bg-red-500 text-white px-2 py-1 rounded-full text-xs font-bold">
                            UNAVAILABLE
                          </div>
                        </div>
                      )}
                    </div>
                    <h3 className="font-bold text-gray-800 truncate">
                      {item.name}
                    </h3>
                    <p className="text-sm text-gray-500 truncate">
                      {item.description || "No description available"}
                    </p>
                  </button>
                ))}
            </div>
          </div>
        </div>
      )}
  
      {/* Enhanced Cart Items */}
      {activeTab === 'cart' && (
        <div className="p-4 space-y-3 mb-24">
          {currentOrder.map(item => (
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
          {currentOrder.length === 0 && (
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
  
      {/* Enhanced Order Summary */}
      {currentOrder.length > 0 && (
        <div className="fixed bottom-4 left-4 right-4 p-4 rounded-2xl shadow-xl bg-gradient-to-r from-orange-600 to-orange-500 text-white backdrop-blur-lg">
          <div className="flex items-center justify-between mb-2">
            <span className="font-medium">{currentOrder.length} items</span>
            <span className="font-bold text-xl">₱{calculateTotal().total.toFixed(2)}</span>
          </div>
          <button 
            className="w-full py-3 rounded-xl bg-white text-orange-600 font-bold transform transition-all duration-300 hover:scale-[1.02] active:scale-95"
            onClick={processOrder}
          >
            Submit Order
          </button>
        </div>
      )}
  
      {/* Order Confirmation Modal */}
      {orderSubmitted && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center">
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
      <SelfCheckoutAIAssistant
        menuItems={menuItems}
        currentOrder={currentOrder}
        onAddToCart={addToOrder}
        onOrderSuggestion={(suggestion) => {
          // Handle AI order suggestions
          console.log('AI Suggestion:', suggestion);
        }}
      />
    </div>
  );
};

export default SelfCheckout;