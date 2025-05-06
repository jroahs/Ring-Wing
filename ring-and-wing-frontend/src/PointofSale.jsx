import React, { useState, useEffect, useRef, useMemo } from 'react';
import { useReactToPrint } from 'react-to-print';
import { MenuItemCard, OrderItem, PaymentPanel, SearchBar, Modal } from './components/ui';
import { theme } from './theme';
import { Receipt } from './components/Receipt';
import PendingOrder from './components/PendingOrder';
import Sidebar from './Sidebar';
import TimeClockInterface from './components/TimeClockInterface';
import TimeClockModal from './components/TimeClockModal';
import { FiClock, FiPlus } from 'react-icons/fi';

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
  const [isSidebarOpen, setIsSidebarOpen] = useState(window.innerWidth >= 768);
  const [showTimeClock, setShowTimeClock] = useState(false);
  const [showTimeClockModal, setShowTimeClockModal] = useState(false);
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
    const handleResize = () => {
      setWindowWidth(window.innerWidth);
      setIsSidebarOpen(window.innerWidth >= 768);
    };
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
      // Modified to fetch both self_checkout and chatbot pending orders
      const response = await fetch(
        'http://localhost:5000/api/orders?paymentMethod=pending',
        {
          headers: {
            Authorization: `Bearer ${localStorage.getItem('token')}`
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
          Authorization: `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({
          status: 'received',
          paymentMethod: method,
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

  const addToOrder = item => {
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

    const existing = currentOrder.find(
      i => i._id === item._id && i.selectedSize === selectedSize
    );

    if (existing) {
      setCurrentOrder(
        currentOrder.map(i =>
          i._id === item._id && i.selectedSize === selectedSize
            ? { ...i, quantity: i.quantity + 1 }
            : i
        )
      );
    } else {
      setCurrentOrder([...currentOrder, orderItem]);
    }
  };

  const updateQuantity = (item, delta) => {
    setCurrentOrder(
      currentOrder.map(menuItem => {
        if (menuItem._id === item._id && menuItem.selectedSize === item.selectedSize) {
          const newQuantity = menuItem.quantity + delta;
          return { ...menuItem, quantity: Math.max(1, newQuantity) };
        }
        return menuItem;
      })
    );
  };

  const updateSize = (item, newSize) => {
    setCurrentOrder(
      currentOrder.map(menuItem => {
        if (menuItem._id === item._id && menuItem.selectedSize === item.selectedSize) {
          return {
            ...menuItem,
            selectedSize: newSize,
            price: menuItem.pricing[newSize]
          };
        }
        return menuItem;
      })
    );
  };

  const calculateTotal = () => {
    const subtotal = currentOrder.reduce((sum, item) => sum + item.price * item.quantity, 0);
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
          change: paymentMethod === 'cash' ? cashValue - parseFloat(totals.total) : 0
        },
        paymentMethod,
        status: 'received',
        orderType: 'pos'  // Changed from 'self_checkout' to 'pos' for orders created in POS
      };

      const response = await fetch('http://localhost:5000/api/orders', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify(orderData)
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

  const voidItem = itemToRemove => {
    setCurrentOrder(
      currentOrder.filter(
        item =>
          !(
            item._id === itemToRemove._id &&
            item.selectedSize === itemToRemove.selectedSize
          )
      )
    );
  };

  const cancelOrder = () => {
    setCurrentOrder([]);
    setCashAmount(0);
    setIsDiscountApplied(false);
  };

  const filteredItems = useMemo(
    () =>
      menuItems.filter(
        item =>
          item.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
          item.code.toLowerCase().includes(searchTerm.toLowerCase())
      ),
    [menuItems, searchTerm]
  );

  useEffect(() => {
    const handleKeyPress = e => {
      if (e.key === 'Enter' && searchTerm) {
        const matchedItem = menuItems.find(
          item => item.code.toLowerCase() === searchTerm.toLowerCase()
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
      <div
        className="min-h-screen flex items-center justify-center"
        style={{
          backgroundColor: theme.colors.background,
          marginLeft: pageMargin,
          transition: 'margin 0.3s ease-in-out'
        }}
      >
        <div
          className="animate-spin rounded-full h-12 w-12 border-b-2"
          style={{ borderColor: theme.colors.accent }}
        ></div>
      </div>
    );
  }

  if (error) {
    return (
      <div
        className="min-h-screen flex flex-col items-center justify-center p-4"
        style={{
          backgroundColor: theme.colors.background,
          marginLeft: pageMargin,
          transition: 'margin 0.3s ease-in-out'
        }}
      >
        <div
          className="p-4 rounded-lg max-w-md text-center"
          style={{
            backgroundColor: theme.colors.activeBg,
            border: `1px solid ${theme.colors.activeBorder}`
          }}
        >
          <h2
            className="text-xl font-bold mb-2"
            style={{ color: theme.colors.primary }}
          >
            Error Loading Menu
          </h2>
          <p className="mb-4" style={{ color: theme.colors.secondary }}>
            {error}
          </p>
          <button
            onClick={() => window.location.reload()}
            className="mt-4 px-4 py-2 rounded hover:opacity-90"
            style={{
              backgroundColor: theme.colors.accent,
              color: theme.colors.background
            }}
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen" style={{ backgroundColor: theme.colors.background }}>
      <Sidebar 
        isOpen={isSidebarOpen} 
        setIsOpen={setIsSidebarOpen}
        onTimeClockClick={() => setShowTimeClock(true)}
        colors={theme.colors}
      />

      <div
        className="flex-1 transition-all duration-300 relative"
        style={{
          marginLeft: pageMargin,
          paddingTop: windowWidth < 768 ? '4rem' : '0'
        }}
      >
        {showTimeClock ? (
          <TimeClockInterface onClose={() => setShowTimeClock(false)} />
        ) : (
          <div className="min-h-screen flex flex-col md:flex-row">
            {/* Menu Section */}
            <div className="flex-1 p-4 md:p-6 order-2 md:order-1">
              <div className="relative mb-6 max-w-7xl mx-auto flex">
                <div className="relative flex-1 mr-2">
                  <SearchBar
                    value={searchTerm}
                    onChange={e => setSearchTerm(e.target.value)}
                    placeholder="Search menu..."
                    size="lg"
                  />
                </div>

                {/* Time Clock and Placeholder Buttons */}
                <div className="flex items-center space-x-2">
                  <button
                    onClick={() => setShowTimeClockModal(true)}
                    className="h-12 px-4 flex items-center justify-center rounded-lg hover:opacity-90 transition"
                    style={{ backgroundColor: theme.colors.accent, color: theme.colors.background }}
                    title="Quick Time Clock"
                  >
                    <FiClock className="mr-2" />
                    <span className="hidden md:inline">Time Clock</span>
                  </button>

                  <button
                    onClick={() => {}}
                    className="h-12 px-4 flex items-center justify-center rounded-lg hover:opacity-90 transition"
                    style={{ backgroundColor: theme.colors.secondary, color: theme.colors.background }}
                    title="Additional Function"
                  >
                    <FiPlus className="mr-2" />
                    <span className="hidden md:inline">Function</span>
                  </button>
                </div>
              </div>

              <div className={`grid ${gridColumns} gap-2 md:gap-3 mx-auto`}>
                {filteredItems.map(item => (
                  <MenuItemCard
                    key={item._id}
                    item={item}
                    onClick={() => addToOrder(item)}
                  />
                ))}
              </div>
            </div>

            {/* Order Panel */}
            <div
              className="w-full md:w-[45vw] lg:w-[35vw] xl:w-[30vw] max-w-3xl rounded-t-3xl md:rounded-3xl m-0 md:m-4 p-4 md:p-6 shadow-2xl order-1 md:order-2"
              style={{ backgroundColor: theme.colors.background }}
            >
              <div className="h-[75vh] md:h-[85vh] flex flex-col">
                <div className="flex-1 overflow-y-auto space-y-2 md:space-y-3 pb-2">
                  {currentOrder.map(item => (
                    <OrderItem
                      key={`${item._id}-${item.selectedSize}`}
                      item={item}
                      onVoid={voidItem}
                      onUpdateSize={updateSize}
                      onUpdateQuantity={updateQuantity}
                    />
                  ))}

                  {/* Pending Orders Section */}
                  {pendingOrders.length > 0 && (
                    <div className="mt-4 pt-4 border-t-2">
                      <h3
                        className="text-base font-bold mb-3"
                        style={{ color: theme.colors.primary }}
                      >
                        Pending Orders ({pendingOrders.length})
                      </h3>
                      <div className="space-y-3 max-h-[60vh] overflow-y-auto">
                        {pendingOrders.map(order => (
                          <PendingOrder
                            key={order._id}
                            order={order}
                            processPayment={processExistingOrderPayment}
                            colors={theme.colors}
                          />
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                <PaymentPanel
                  total={calculateTotal().total}
                  subtotal={calculateTotal().subtotal}
                  discount={calculateTotal().discount}
                  cashFloat={cashFloat}
                  paymentMethod={paymentMethod}
                  cashAmount={cashAmount}
                  isDiscountApplied={isDiscountApplied}
                  onPaymentMethodChange={setPaymentMethod}
                  onCashAmountChange={setCashAmount}
                  onDiscountToggle={() => setIsDiscountApplied(!isDiscountApplied)}
                  onProcessPayment={processPayment}
                  onCancelOrder={cancelOrder}
                  disabled={
                    currentOrder.length === 0 ||
                    (paymentMethod === 'cash' &&
                      cashAmount < parseFloat(calculateTotal().total))
                  }
                />
              </div>
            </div>

            {/* Receipt Modal */}
            <Modal isOpen={showReceipt} onClose={() => setShowReceipt(false)} size="lg">
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
              <div className="mt-4">
                <button
                  className="w-full py-3 md:py-4 text-base md:text-lg rounded-2xl mt-4 font-semibold"
                  style={{
                    backgroundColor: theme.colors.primary,
                    color: theme.colors.background
                  }}
                  onClick={() => setShowReceipt(false)}
                >
                  CLOSE
                </button>
              </div>
            </Modal>

            {/* Time Clock Modal */}
            {showTimeClockModal && (
              <TimeClockModal onClose={() => setShowTimeClockModal(false)} />
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default PointOfSale;