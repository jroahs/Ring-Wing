import React, { useState, useEffect, useRef, useMemo } from 'react';
import { useReactToPrint } from 'react-to-print';
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

const Receipt = React.forwardRef(({ order, totals, paymentMethod }, ref) => {
  const formattedDate = new Date().toLocaleTimeString([], { 
    hour: '2-digit', 
    minute: '2-digit',
    hour12: true
  });

  return (
    <div ref={ref} className="text-sm p-6" style={{ backgroundColor: colors.background }}>
      <div className="text-center">
        <h2 className="text-lg md:text-xl font-semibold" style={{ color: colors.primary }}>Ring & Wings</h2>
        <p className="text-sm md:text-base" style={{ color: colors.secondary }}>Thank You</p>
      </div>
      <div className="flex flex-col md:flex-row mt-2 md:mt-4" style={{ color: colors.primary }}>
        <div className="flex-grow">No: {order.receiptNumber}</div>
        <div className="mt-1 md:mt-0">{formattedDate}</div>
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
              <td className="py-1 md:py-2 text-center" style={{ color: colors.primary }}>{index + 1}</td>
              <td className="py-1 md:py-2 text-left" style={{ color: colors.primary }}>
                {item.name} ({item.selectedSize})<br/>
                <small style={{ color: colors.secondary }}>₱{item.price.toFixed(2)}</small>
              </td>
              <td className="py-1 md:py-2 text-center" style={{ color: colors.primary }}>{item.quantity}</td>
              <td className="py-1 md:py-2 text-right" style={{ color: colors.primary }}>₱{(item.quantity * item.price).toFixed(2)}</td>
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
      <div className="flex justify-between text-sm" style={{ color: colors.primary }}>
        <span>Payment Method:</span>
        <span>{paymentMethod.toUpperCase()}</span>
      </div>
      {paymentMethod === 'cash' && (
        <>
          <div className="flex justify-between text-sm" style={{ color: colors.primary }}>
            <span>Cash Received:</span>
            <span>₱{totals.cashReceived}</span>
          </div>
          <div className="flex justify-between text-sm" style={{ color: colors.primary }}>
            <span>Change:</span>
            <span>₱{totals.change}</span>
          </div>
        </>
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
  totals: PropTypes.shape({
    subtotal: PropTypes.string,
    discount: PropTypes.string,
    total: PropTypes.string,
    cashReceived: PropTypes.string,
    change: PropTypes.string
  }).isRequired,
  paymentMethod: PropTypes.string.isRequired
};

const PendingOrder = ({ order, processPayment, colors }) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const [localPaymentMethod, setLocalPaymentMethod] = useState('cash');
  const [localCashAmount, setLocalCashAmount] = useState('');
  const orderTotal = order.items.reduce((sum, item) => sum + (item.price * item.quantity), 0);
  const isCashPayment = localPaymentMethod === 'cash';

  return (
    <div className="p-3 rounded-lg" style={{ backgroundColor: colors.activeBg }}>
      <div 
        className="flex justify-between mb-2 cursor-pointer"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <div>
          <span className="font-medium block" style={{ color: colors.primary }}>
            Order #{order.receiptNumber}
          </span>
          <span className="text-xs" style={{ color: colors.secondary }}>
            Status: {order.status.toUpperCase()} | Payment: {order.paymentMethod.toUpperCase()}
          </span>
        </div>
        <div className="text-right">
          <span className="block text-sm" style={{ color: colors.primary }}>
            ₱{orderTotal.toFixed(2)}
          </span>
          <span className="text-xs" style={{ color: colors.secondary }}>
            {new Date(order.createdAt).toLocaleTimeString()}
          </span>
        </div>
      </div>

      <div className={`overflow-hidden transition-all duration-300 ${isExpanded ? 'max-h-40' : 'max-h-0'}`}>
        {order.items.map(item => (
          <div key={item._id} className="flex justify-between text-xs mb-1">
            <span style={{ color: colors.primary }}>
              {item.name} ({item.selectedSize}) x{item.quantity}
            </span>
            <span style={{ color: colors.primary }}>
              ₱{(item.price * item.quantity).toFixed(2)}
            </span>
          </div>
        ))}
      </div>

      <div className={`transition-all duration-300 ${isExpanded ? 'max-h-[500px] opacity-100' : 'max-h-0 opacity-0'}`}>
        <div className="pt-2 space-y-2">
          <div className="flex gap-2">
            <select
              value={localPaymentMethod}
              onChange={(e) => {
                setLocalPaymentMethod(e.target.value);
                if (e.target.value !== 'cash') setLocalCashAmount('');
              }}
              className="flex-1 p-2 rounded border text-sm focus:outline-none focus:ring-2 focus:ring-orange-500"
              style={{
                backgroundColor: colors.background,
                border: `2px solid ${colors.muted}`,
                color: colors.primary
              }}
            >
              <option value="cash">Cash</option>
              <option value="card">Card</option>
              <option value="e-wallet">E-Wallet</option>
            </select>
          </div>

          {isCashPayment && (
            <input
              type="number"
              value={localCashAmount}
              onChange={(e) => {
                const value = e.target.value;
                setLocalCashAmount(value === '' ? '' : Math.max(0, parseFloat(value) || 0));
              }}
              placeholder="Enter cash amount"
              className="w-full p-2 rounded border text-sm focus:outline-none focus:ring-2 focus:ring-orange-500"
              style={{
                backgroundColor: colors.background,
                border: `2px solid ${colors.muted}`,
                color: colors.primary
              }}
              min="0"
              step="1"
            />
          )}

          <button 
            onClick={() => {
              if (isCashPayment && (!localCashAmount || parseFloat(localCashAmount) < orderTotal)) {
                alert(`Cash amount must be at least ₱${orderTotal.toFixed(2)}`);
                return;
              }
              processPayment(order, {
                method: localPaymentMethod,
                cashAmount: parseFloat(localCashAmount) || 0
              });
            }}
            className="w-full py-2 rounded-lg text-sm font-medium hover:opacity-90 transition-opacity"
            style={{
              backgroundColor: colors.accent,
              color: colors.background,
              opacity: isCashPayment && !localCashAmount ? 0.7 : 1
            }}
            disabled={isCashPayment && !localCashAmount}
          >
            {isCashPayment ? 'Process Payment' : 'Confirm Payment'}
          </button>
        </div>
      </div>
    </div>
  );
};

const PointOfSale = () => {
  const [menuItems, setMenuItems] = useState([]);
  const [currentOrder, setCurrentOrder] = useState([]);
  const [pendingOrders, setPendingOrders] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [showReceipt, setShowReceipt] = useState(false);
  const [cashAmount, setCashAmount] = useState(0);
  const [isDiscountApplied, setIsDiscountApplied] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [windowWidth, setWindowWidth] = useState(window.innerWidth);
  const [cashFloat, setCashFloat] = useState(1000);
  const [paymentMethod, setPaymentMethod] = useState('cash');
  const receiptRef = useRef();

  const isLargeScreen = windowWidth >= 1920;
  const isMediumScreen = windowWidth >= 768;
  const pageMargin = useMemo(() => {
    if (isLargeScreen) return '8rem';
    if (isMediumScreen) return '5rem';
    return '0';
  }, [isLargeScreen, isMediumScreen]);

  const gridColumns = useMemo(() => {
    if (windowWidth >= 1920) return 'grid-cols-6';
    if (windowWidth >= 1536) return 'grid-cols-5';
    if (windowWidth >= 1280) return 'grid-cols-4';
    if (windowWidth >= 1024) return 'grid-cols-3';
    return 'grid-cols-2';
  }, [windowWidth]);

  useEffect(() => {
    fetchPendingOrders();
    const interval = setInterval(fetchPendingOrders, 5000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    const handleResize = () => setWindowWidth(window.innerWidth);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  useEffect(() => {
    const abortController = new AbortController();
    
    const fetchMenuItems = async () => {
      try {
        const response = await fetch('http://localhost:5000/api/menu', {
          signal: abortController.signal
        });
        if (!response.ok) throw new Error('Failed to fetch menu');
        const responseData = await response.json();
        
        const rawData = Array.isArray(responseData) 
          ? responseData 
          : responseData.items || [];

        const validatedItems = rawData.filter(item => 
          item && typeof item === 'object' && 'pricing' in item && 'name' in item
        );

        const transformedItems = validatedItems.map(item => ({
          _id: item._id,
          code: item.code || 'N/A',
          name: item.name,
          category: item.category,
          pricing: item.pricing,
          description: item.description,
          image: item.image ? `http://localhost:5000${item.image}` : null,
          modifiers: item.modifiers || []
        }));
        
        if (validatedItems.length === 0) {
          throw new Error('No valid menu items found in response');
        }
        
        setMenuItems(transformedItems);
        setError(null);
      } catch (err) {
        if (err.name !== 'AbortError') {
          setError(err.message || 'Failed to load menu data');
          setMenuItems([]);
        }
      } finally {
        setLoading(false);
      }
    };

    fetchMenuItems();
    return () => abortController.abort();
  }, []);

  const fetchPendingOrders = async () => {
    try {
      const response = await fetch(
        'http://localhost:5000/api/orders?paymentMethod=pending&orderType=self_checkout', 
        {
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('token')}`
          }
        }
      );
      const data = await response.json();
      setPendingOrders(data.data || []);
    } catch (error) {
      console.error('Error fetching pending orders:', error);
    }
  };
  
  const processExistingOrderPayment = async (order, { method, cashAmount }) => {
    const totalDue = parseFloat(order.totals.total);
    let paymentData = {};
  
    if (method === 'cash') {
      if (cashAmount < totalDue) {
        alert('Insufficient cash amount');
        return;
      }
      
      const change = cashAmount - totalDue;
      if (change > cashFloat) {
        alert(`Insufficient cash float (₱${cashFloat.toFixed(2)}) to give ₱${change.toFixed(2)} change`);
        return;
      }
      
      paymentData = {
        cashReceived: cashAmount,
        change: change.toFixed(2)
      };
    }
  
    try {
      const response = await fetch(`http://localhost:5000/api/orders/${order._id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({
          status: 'received',
          paymentMethod: method, // Changes from 'pending' to actual method
          ...paymentData
        })
      });
  
      if (!response.ok) throw new Error('Failed to update order');
  
      setShowReceipt(true);
      await new Promise(resolve => setTimeout(resolve, 100));
      await handlePrint();
      
      setPendingOrders(prev => prev.filter(o => o._id !== order._id));
      setCashAmount(0);
      setShowReceipt(false);
  
      if (method === 'cash') {
        setCashFloat(prev => prev + cashAmount - (cashAmount - totalDue));
      }
  
      alert('Payment processed successfully!');
    } catch (error) {
      console.error('Payment processing error:', error);
      alert('Error processing payment');
    }
  };

  const generateReceiptNumber = () => {
    const timestamp = Date.now().toString().slice(-6);
    const random = Math.floor(100 + Math.random() * 900);
    return `${timestamp}${random}`;
  };

  const addToOrder = (item) => {
    const sizes = Object.keys(item.pricing);
    const basePrice = item.pricing.base || item.pricing[sizes[0]];
    const selectedSize = sizes.includes('base') ? 'base' : sizes[0];
    
    const orderItem = {
      ...item,
      price: basePrice,
      selectedSize,
      availableSizes: sizes,
      quantity: 1
    };

    const existing = currentOrder.find(i => 
      i._id === item._id && i.selectedSize === selectedSize
    );

    if (existing) {
      setCurrentOrder(currentOrder.map(i => 
        i._id === item._id && i.selectedSize === selectedSize 
          ? { ...i, quantity: i.quantity + 1 } 
          : i
      ));
    } else {
      setCurrentOrder([...currentOrder, orderItem]);
    }
  };

  const updateQuantity = (item, delta) => {
    setCurrentOrder(currentOrder.map(menuItem => {
      if (menuItem._id === item._id && menuItem.selectedSize === item.selectedSize) {
        const newQuantity = menuItem.quantity + delta;
        return { ...menuItem, quantity: Math.max(1, newQuantity) };
      }
      return menuItem;
    }));
  };

  const updateSize = (item, newSize) => {
    setCurrentOrder(currentOrder.map(menuItem => {
      if (menuItem._id === item._id && menuItem.selectedSize === item.selectedSize) {
        return { 
          ...menuItem, 
          selectedSize: newSize,
          price: menuItem.pricing[newSize]
        };
      }
      return menuItem;
    }));
  };

  const calculateTotal = () => {
    const subtotal = currentOrder.reduce((sum, item) => sum + (item.price * item.quantity), 0);
    const discount = isDiscountApplied ? subtotal * 0.1 : 0;
    const total = subtotal - discount;
    
    return {
      subtotal: subtotal.toFixed(2),
      discount: discount.toFixed(2),
      total: total.toFixed(2)
    };
  };

  const handlePrint = useReactToPrint({ content: () => receiptRef.current });

  const processPayment = async () => {
    const totals = calculateTotal();
    const cashValue = parseFloat(cashAmount);
    const totalDue = parseFloat(totals.total);
  
    if (paymentMethod === 'cash') {
      if (cashValue < totalDue) {
        alert('Insufficient cash amount');
        return;
      }
  
      const change = cashValue - totalDue;
      if (change > cashFloat) {
        alert(`Insufficient cash float (₱${cashFloat.toFixed(2)}) to give ₱${change.toFixed(2)} change`);
        return;
      }
    }
  
    setShowReceipt(true);
    
    try {
      await new Promise(resolve => setTimeout(resolve, 100));
      await handlePrint();
      await saveOrderToDB();
  
      if (paymentMethod === 'cash') {
        const change = cashValue - totalDue;
        setCashFloat(prev => prev + cashValue - change);
      }
  
      setCurrentOrder([]);
      setCashAmount(0);
      setIsDiscountApplied(false);
      setSearchTerm('');
      setShowReceipt(false);
      
      alert('Order completed successfully!');
    } catch (error) {
      console.error('Payment processing error:', error);
      alert('Error processing payment. Please try again.');
    }
  };
  
  const saveOrderToDB = async () => {
    try {
      const totals = calculateTotal();
      const cashValue = parseFloat(cashAmount);
      
      const orderData = {
        items: currentOrder.map(item => ({
          name: item.name,
          price: item.price,
          quantity: item.quantity,
          selectedSize: item.selectedSize,
          modifiers: item.modifiers
        })),
        totals: {
          subtotal: parseFloat(totals.subtotal),
          discount: parseFloat(totals.discount),
          total: parseFloat(totals.total),
          cashReceived: paymentMethod === 'cash' ? cashValue : 0,
          change: paymentMethod === 'cash' ? (cashValue - parseFloat(totals.total)) : 0
        },
        paymentMethod,
        status: 'received',
        orderType: 'self_checkout' // Add this line
      };
  
      const response = await fetch('http://localhost:5000/api/orders', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify(orderData),
      });
  
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to save order');
      }
  
      return await response.json();
    } catch (error) {
      console.error('Order save error:', error);
      throw error;
    }
  };

  const voidItem = (itemToRemove) => {
    setCurrentOrder(currentOrder.filter(item => 
      !(item._id === itemToRemove._id && 
        item.selectedSize === itemToRemove.selectedSize)
    ));
  };

  const cancelOrder = () => {
    setCurrentOrder([]);
    setCashAmount(0);
    setIsDiscountApplied(false);
  };

  const filteredItems = useMemo(() => 
    menuItems.filter(item =>
      item.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.code.toLowerCase().includes(searchTerm.toLowerCase())
    ),
    [menuItems, searchTerm]
  );

  useEffect(() => {
    const handleKeyPress = (e) => {
      if (e.key === 'Enter' && searchTerm) {
        const matchedItem = menuItems.find(item => 
          item.code.toLowerCase() === searchTerm.toLowerCase()
        );
        if (matchedItem) {
          addToOrder(matchedItem);
          setSearchTerm('');
        } else if (!filteredItems.length) {
          alert('No matching items found');
        }
      }
    };

    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);
  }, [searchTerm, menuItems, filteredItems]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ 
        backgroundColor: colors.background,
        marginLeft: pageMargin,
        transition: 'margin 0.3s ease-in-out'
      }}>
        <div 
          className="animate-spin rounded-full h-12 w-12 border-b-2" 
          style={{ borderColor: colors.accent }}
        ></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-4" style={{ 
        backgroundColor: colors.background,
        marginLeft: pageMargin,
        transition: 'margin 0.3s ease-in-out'
      }}>
        <div 
          className="p-4 rounded-lg max-w-md text-center" 
          style={{ backgroundColor: colors.activeBg, border: `1px solid ${colors.activeBorder}` }}
        >
          <h2 className="text-xl font-bold mb-2" style={{ color: colors.primary }}>Error Loading Menu</h2>
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
    <div className="min-h-screen flex flex-col md:flex-row" style={{ 
      backgroundColor: colors.background,
      marginLeft: pageMargin,
      transition: 'margin 0.3s ease-in-out'
    }}>
      {/* Menu Section */}
      <div className="flex-1 p-4 md:p-6 order-2 md:order-1">
        <div className="relative mb-6 max-w-7xl mx-auto">
          <input
            type="text"
            className="w-full h-12 md:h-16 text-lg md:text-xl pl-14 md:pl-16 pr-6 rounded-2xl md:rounded-3xl shadow-lg focus:outline-none"
            style={{
              backgroundColor: colors.background,
              border: `3px solid ${colors.muted}`,
            }}
            placeholder="Search menu..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
          <div className="absolute left-6 top-4 md:top-5" style={{ color: colors.accent }}>
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 md:h-7 md:w-7" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          </div>
        </div>

        <div className={`grid ${gridColumns} gap-2 md:gap-3 mx-auto`}>
          {filteredItems.map(item => {
            const basePrice = item.pricing.base || Object.values(item.pricing)[0];
            
            return (
              <div
                key={item._id}
                className="relative rounded-lg overflow-hidden cursor-pointer aspect-square shadow-md hover:shadow-lg transition-shadow"
                onClick={() => addToOrder(item)}
              >
                <div className="relative w-full h-full">
                  {item.image && (
                    <img 
                      src={item.image} 
                      alt={item.name} 
                      className="w-full h-full object-cover"
                      onError={(e) => {
                        e.target.src = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=';
                        e.target.alt = 'Image not available';
                      }}
                    />
                  )}

                  <div className="absolute bottom-0 left-0 right-0 px-2 py-1.5" style={{ 
                    backgroundColor: colors.accent,
                    zIndex: 1
                  }}>
                    <div className="grid grid-cols-[1fr_auto] items-baseline gap-1">
                      <h3 
                        className="text-white font-bold leading-tight break-words"
                        style={{
                          fontSize: '0.8125rem',
                          lineHeight: '1.2',
                          display: '-webkit-box',
                          WebkitLineClamp: 2,
                          WebkitBoxOrient: 'vertical',
                          overflow: 'hidden'
                        }}
                      >
                        {item.name}
                      </h3>
                      
                      <span 
                        className="text-white font-bold whitespace-nowrap"
                        style={{
                          fontSize: '0.8125rem',
                          lineHeight: '1.2',
                        }}
                      >
                        ₱{typeof basePrice === 'number' ? basePrice.toFixed(0) : basePrice}
                      </span>
                    </div>
                  </div>
                </div>

                <div 
                  className="absolute top-1.5 left-1.5 rounded-md px-3 py-2 font-bold text-base"
                  style={{ 
                    backgroundColor: colors.accent,
                    color: colors.background,
                    boxShadow: '0 3px 10px rgba(0,0,0,0.18)'
                  }}
                >
                  {item.code}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Order Panel */}
      <div className="w-full md:w-[45vw] lg:w-[35vw] xl:w-[30vw] max-w-3xl rounded-t-3xl md:rounded-3xl m-0 md:m-4 p-4 md:p-6 shadow-2xl order-1 md:order-2" 
          style={{ backgroundColor: colors.background }}>
        <div className="h-[75vh] md:h-[85vh] flex flex-col">
          <div className="flex-1 overflow-y-auto space-y-2 md:space-y-3 pb-2">
            {currentOrder.map(item => (
              <div 
                key={`${item._id}-${item.selectedSize}`} 
                className="rounded-lg p-3 relative flex items-start gap-3"
                style={{ backgroundColor: colors.hoverBg }}
              >
                <div className="flex items-center gap-3 flex-1 min-w-0">
                  <button
                    onClick={() => voidItem(item)}
                    className="p-1 hover:bg-red-100 self-start mt-1"
                    style={{ color: colors.secondary }}
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z" clipRule="evenodd" />
                    </svg>
                  </button>

                  {item.image && (
                    <img 
                      src={item.image} 
                      alt={item.name} 
                      className="w-12 h-12 rounded-lg object-cover flex-shrink-0"
                    />
                  )}
                  <div className="flex-1 min-w-0">
                    <h4 className="font-bold text-sm md:text-base truncate" style={{ color: colors.primary }}>
                      {item.name}
                    </h4>
                    <select
                      value={item.selectedSize}
                      onChange={(e) => updateSize(item, e.target.value)}
                      className="w-full mt-1 text-sm rounded-lg px-2 py-1"
                      style={{ 
                        border: `2px solid ${colors.muted}`,
                        backgroundColor: colors.background
                      }}
                    >
                      {item.availableSizes.map(size => (
                        <option key={size} value={size} style={{ color: colors.primary }}>
                          {size} (₱{item.pricing[size].toFixed(2)})
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="flex items-center gap-2">
                    <button 
                      onClick={() => updateQuantity(item, -1)}
                      className="px-3 py-1 rounded-lg text-lg"
                      style={{ 
                        backgroundColor: colors.accent,
                        color: colors.background,
                        minWidth: '36px'
                      }}
                    >-</button>
                    <span className="w-8 text-center text-lg" style={{ color: colors.primary }}>
                      {item.quantity}
                    </span>
                    <button
                      onClick={() => updateQuantity(item, 1)}
                      className="px-3 py-1 rounded-lg text-lg"
                      style={{ 
                        backgroundColor: colors.accent,
                        color: colors.background,
                        minWidth: '36px'
                      }}
                    >+</button>
                  </div>
                </div>
              </div>
            ))}

            {/* Pending Orders Section */}
            {pendingOrders.length > 0 && (
              <div className="mt-4 pt-4 border-t-2">
                <h3 className="text-base font-bold mb-3" style={{ color: colors.primary }}>
                  Pending Orders ({pendingOrders.length})
                </h3>
                <div className="space-y-3 max-h-[60vh] overflow-y-auto">
  {pendingOrders.map(order => (
    <PendingOrder key={order._id} order={order} processPayment={processExistingOrderPayment} colors={colors} />
  ))}
</div>
              </div>
            )}
          </div>

{/* Payment Controls */}
<div className="pt-4 border-t-2" style={{ borderColor: colors.muted }}>
  <div className="flex gap-2 mb-3 flex-wrap">
    {['cash', 'card', 'e-wallet'].map(method => (
      <button
        key={method}
        onClick={() => setPaymentMethod(method)}
        className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
          paymentMethod === method 
            ? 'text-white' 
            : 'text-gray-700 hover:bg-gray-100'
        }`}
        style={{
          backgroundColor: paymentMethod === method ? colors.accent : colors.background,
          border: `2px solid ${paymentMethod === method ? colors.accent : colors.muted}`
        }}
      >
        {method.toUpperCase()}
      </button>
    ))}
  </div>

  <div className="flex justify-between text-sm mb-3" style={{ color: colors.primary }}>
    <span>Cash Float:</span>
    <span>₱{cashFloat.toFixed(2)}</span>
  </div>

  <button
    onClick={() => setIsDiscountApplied(!isDiscountApplied)}
    className={`w-full py-3 rounded-xl font-medium text-sm mb-3 ${
      isDiscountApplied ? 'text-white' : 'text-gray-700'
    }`}
    style={{
      backgroundColor: isDiscountApplied ? colors.accent : colors.muted,
    }}
  >
    PWD/Senior Discount (10%)
  </button>

  <div className="flex justify-between text-lg font-bold mb-4" style={{ color: colors.primary }}>
    <span>TOTAL:</span>
    <span>₱{calculateTotal().total}</span>
  </div>
  
{paymentMethod === 'cash' && (
  <input
    type="number"
    value={cashAmount === 0 ? '' : cashAmount}
    onChange={(e) => {
      const value = e.target.value;
      setCashAmount(value === '' ? 0 : Math.max(0, parseFloat(value) || 0));
    }}
    className="w-full p-3 text-sm rounded-lg border-2 mb-3 focus:outline-none"
    style={{
      border: `2px solid ${colors.muted}`,
    }}
    placeholder="Cash amount"
  />
)}


  <div className="grid gap-2">
    <button
      onClick={cancelOrder}
      className="w-full py-2 text-red-600 rounded-lg border border-red-300 hover:bg-red-50 text-sm"
    >
      Cancel Order
    </button>
    
    <button
      onClick={processPayment}
      disabled={currentOrder.length === 0 || (paymentMethod === 'cash' && cashAmount < parseFloat(calculateTotal().total))}
      className={`w-full py-3 text-base rounded-lg font-bold ${
        (currentOrder.length > 0 && (paymentMethod !== 'cash' || cashAmount >= parseFloat(calculateTotal().total)))
          ? 'hover:opacity-90'
          : 'cursor-not-allowed'
      }`}
      style={{
        backgroundColor: (currentOrder.length > 0 && (paymentMethod !== 'cash' || cashAmount >= parseFloat(calculateTotal().total))) 
          ? colors.primary 
          : colors.muted,
        color: colors.background
      }}
    >
      PROCESS PAYMENT
    </button>
  </div>
</div>
        </div>
      </div>

      {/* Receipt Modal */}
      {showReceipt && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="rounded-2xl p-6 w-full max-w-md lg:max-w-xl xl:max-w-2xl" style={{ backgroundColor: colors.background }}>
            <Receipt
              ref={receiptRef}
              order={{
                items: currentOrder,
                receiptNumber: generateReceiptNumber()
              }}
              totals={{
                ...calculateTotal(),
                cashReceived: cashAmount.toFixed(2),
                change: (cashAmount - parseFloat(calculateTotal().total)).toFixed(2)
              }}
              paymentMethod={paymentMethod}
            />
            <button
              onClick={() => setShowReceipt(false)}
              className="w-full py-3 md:py-4 text-base md:text-lg rounded-2xl mt-4 font-semibold"
              style={{ 
                backgroundColor: colors.primary,
                color: colors.background,
              }}
            >
              CLOSE
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default PointOfSale;