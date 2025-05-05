import React, { useState, useEffect, useMemo } from 'react';
import PropTypes from 'prop-types';

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
      {parseFloat(totals.discount) > 0 && (
        <div className="flex justify-between text-sm" style={{ color: colors.secondary }}>
          <span>Discount (10%):</span>
          <span>-₱{totals.discount}</span>
        </div>
      )}
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
  const [isDiscountApplied, setIsDiscountApplied] = useState(false);
  const [orderNumber, setOrderNumber] = useState('');
  const [menuItems, setMenuItems] = useState([]);
  const [currentOrder, setCurrentOrder] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [activeTab, setActiveTab] = useState('menu');
  const [orderSubmitted, setOrderSubmitted] = useState(false);

  const filteredItems = useMemo(() => 
    menuItems.filter(item =>
      item.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (item.code && item.code.toLowerCase().includes(searchTerm.toLowerCase()))
    )
  , [menuItems, searchTerm]);
  

  useEffect(() => {
    const fetchMenuItems = async () => {
      try {
        const response = await fetch('http://localhost:5000/api/menu');
        const data = await response.json();
        const items = Array.isArray(data) ? data : data.items || [];
        setMenuItems(items.map(item => ({
          ...item,
          image: item.image ? `http://localhost:5000${item.image}` : null,
          pricing: item.pricing || { base: 0 },
          modifiers: item.modifiers || []
        })));
      } catch (err) {
        setError('Failed to load menu');
      } finally {
        setLoading(false);
      }
    };
    fetchMenuItems();
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
    const discount = isDiscountApplied ? subtotal * 0.1 : 0;
    return {
      subtotal: subtotal,
      discount: discount,
      total: subtotal - discount
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
        discount: calculatedTotals.discount,
        total: calculatedTotals.total
      },
      paymentMethod: 'pending',
      orderType: 'self_checkout',
      status: 'pending' // Explicitly mark as pending for POS to handle payment
    };
  
    try {
      const response = await fetch('http://localhost:5000/api/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(orderData)
      });
      const data = await response.json();
      setOrderNumber(data.data.receiptNumber); // Match backend response structure
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
    <div className="min-h-screen" style={{ backgroundColor: colors.background }}>
      {/* Search Bar */}
      <div className="sticky top-0 bg-white p-4 shadow-sm z-10">
        <div className="relative">
          <input
            type="text"
            className="w-full h-12 pl-12 pr-4 rounded-2xl border-2"
            style={{ borderColor: colors.muted }}
            placeholder="Search or scan item..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
          <svg 
            xmlns="http://www.w3.org/2000/svg" 
            className="h-6 w-6 absolute left-4 top-3" 
            fill="none" 
            viewBox="0 0 24 24" 
            stroke={colors.accent}
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
              d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
        </div>
      </div>
  
      {/* Tabs */}
      <div className="flex justify-around p-2 bg-white shadow-sm sticky top-14 z-10">
        <button
          onClick={() => setActiveTab('menu')}
          className={`px-4 py-2 rounded-full ${activeTab === 'menu' ? 'bg-orange-100' : ''}`}
        >
          Menu
        </button>
        <button
          onClick={() => setActiveTab('cart')}
          className={`px-4 py-2 rounded-full ${activeTab === 'cart' ? 'bg-orange-100' : ''}`}
        >
          Cart ({currentOrder.length})
        </button>
      </div>
  
      {/* Discount Toggle */}
      {currentOrder.length > 0 && (
        <div className="sticky top-28 z-10 p-2 bg-white shadow-sm">
          <button
            onClick={() => setIsDiscountApplied(!isDiscountApplied)}
            className={`w-full py-3 rounded-xl font-medium ${
              isDiscountApplied 
                ? 'bg-orange-500 text-white'
                : 'bg-gray-200 text-gray-700'
            }`}
          >
            {isDiscountApplied ? '✓ Discount Applied (10%)' : 'Apply PWD/Senior Discount'}
          </button>
        </div>
      )}
  
      {/* Menu Grid */}
      {activeTab === 'menu' && (
        <div className="p-4 grid grid-cols-2 gap-3">
          {filteredItems.map(item => (
            <button
              key={item._id}
              className="text-left p-3 rounded-xl shadow-sm"
              style={{ backgroundColor: colors.background }}
              onClick={() => addToOrder(item)}
            >
              {item.image && (
                <img 
                  src={item.image} 
                  alt={item.name} 
                  className="w-full h-32 object-cover rounded-lg mb-2"
                />
              )}
              <h3 className="font-semibold truncate" style={{ color: colors.primary }}>
                {item.name}
              </h3>
              <p className="text-sm" style={{ color: colors.accent }}>
                ₱{Math.min(...Object.values(item.pricing)).toFixed(2)}
              </p>
            </button>
          ))}
        </div>
      )}
  
      {/* Cart Items */}
      {activeTab === 'cart' && (
        <div className="p-4 space-y-3">
          {currentOrder.map(item => (
            <div key={`${item._id}-${item.selectedSize}`} 
              className="p-3 rounded-lg bg-gray-50">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="font-semibold" style={{ color: colors.primary }}>
                    {item.name}
                  </h4>
                  <select
                    value={item.selectedSize}
                    onChange={(e) => updateSize(item, e.target.value)}
                    className="text-sm mt-1 p-1 rounded"
                    style={{ borderColor: colors.muted }}
                  >
                    {item.availableSizes.map(size => (
                      <option key={size} value={size}>
                        {size} (₱{item.pricing[size].toFixed(2)})
                      </option>
                    ))}
                  </select>
                </div>
                <div className="flex items-center gap-2">
                  <button 
                    onClick={() => updateQuantity(item, -1)}
                    className="px-3 py-1 rounded-lg bg-orange-500 text-white"
                  >
                    -
                  </button>
                  <span className="w-8 text-center">{item.quantity}</span>
                  <button
                    onClick={() => updateQuantity(item, 1)}
                    className="px-3 py-1 rounded-lg bg-orange-500 text-white"
                  >
                    +
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
  
      {/* Order Summary */}
      {currentOrder.length > 0 && (
        <div className="fixed bottom-4 left-4 right-4 p-4 rounded-2xl shadow-lg flex justify-between items-center"
          style={{ backgroundColor: colors.primary, color: colors.background }}>
          <span>{currentOrder.length} items</span>
          <span>₱{calculateTotal().total.toFixed(2)}</span>
          <button 
            className="px-4 py-2 rounded-xl bg-white text-orange-600"
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
    </div>
  );
};

export default SelfCheckout;