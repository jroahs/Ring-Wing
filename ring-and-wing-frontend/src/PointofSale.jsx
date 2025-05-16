import React, { useState, useEffect, useRef, useMemo } from 'react';
import * as ReactDOM from 'react-dom/client';
import { useReactToPrint } from 'react-to-print';
import { MenuItemCard, OrderItem, PaymentPanel, SearchBar, Modal } from './components/ui';
import { theme } from './theme';
import { Receipt } from './components/Receipt';
import Sidebar from './Sidebar';
import TimeClockInterface from './components/TimeClockInterface';
import TimeClockModal from './components/TimeClockModal';
import CashFloatModal from './components/CashFloatModal';
import OrderProcessingModal from './components/OrderProcessingModal';
import PendingOrder from './components/PendingOrder';
import { FiClock, FiPlus, FiSettings, FiDollarSign, FiCheckCircle, FiCoffee } from 'react-icons/fi';

const PointOfSale = () => {  const [menuItems, setMenuItems] = useState([]);
  const [currentOrder, setCurrentOrder] = useState([]);
  const [activeOrders, setActiveOrders] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [showReceipt, setShowReceipt] = useState(false);
  const [cashAmount, setCashAmount] = useState(0);
  const [isDiscountApplied, setIsDiscountApplied] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [windowWidth, setWindowWidth] = useState(window.innerWidth);
  
  // Cash float state management
  const [cashFloat, setCashFloat] = useState(() => {
    const savedFloat = localStorage.getItem('cashFloat');
    return savedFloat ? parseFloat(savedFloat) : 1000;
  });
  const [showCashFloatModal, setShowCashFloatModal] = useState(false);
  const [cashFloatSettings, setCashFloatSettings] = useState(() => {
    const savedSettings = localStorage.getItem('cashFloatSettings');
    return savedSettings ? JSON.parse(savedSettings) : {
      resetDaily: false,
      resetAmount: 1000,
      lastReset: null
    };
  });
    const [isUserAdmin, setIsUserAdmin] = useState(false);
  // State for managing user role
  const [isManager, setIsManager] = useState(false);
    const [paymentMethod, setPaymentMethod] = useState('cash');
  const [cardDetails, setCardDetails] = useState({ last4: '', name: '' });
  const [eWalletDetails, setEWalletDetails] = useState({ number: '', name: '' });
  const [isSidebarOpen, setIsSidebarOpen] = useState(window.innerWidth >= 768);const [showTimeClock, setShowTimeClock] = useState(false);
  const [showTimeClockModal, setShowTimeClockModal] = useState(false);
  const [showOrderProcessingModal, setShowOrderProcessingModal] = useState(false);
  const receiptRef = useRef();

  // Check if user is manager
  useEffect(() => {
    const checkUserRole = async () => {
      try {
        // First check if we have user info in localStorage
        const userData = localStorage.getItem('userData');
        const user = userData ? JSON.parse(userData) : null;
        
        if (user && user.role === 'manager') {
          console.log("Found manager in localStorage:", user.role);
          setIsManager(true);
          return;
        }
        
        // If not found in localStorage, try to fetch from backend
        const token = localStorage.getItem('token');
        if (!token) return;
        
        const response = await fetch('http://localhost:5000/api/auth/me', {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });
        
        if (response.ok) {
          const data = await response.json();
          console.log("User role from API:", data.role);
          // Set isManager to true if user has manager role
          setIsManager(data.role === 'manager');
        }
      } catch (err) {
        console.error('Error checking user role:', err);
      }
    };
    
    checkUserRole();
  }, []);

  // Check for daily reset
  useEffect(() => {
    const checkDailyReset = () => {
      // Safely check if resetDaily is true and resetAmount exists
      if (!cashFloatSettings?.resetDaily || !cashFloatSettings?.resetAmount) return;
      
      const today = new Date().toDateString();
      const lastReset = cashFloatSettings.lastReset || null;
      
      if (lastReset !== today) {
        // Ensure resetAmount is a number
        const resetAmount = Number(cashFloatSettings.resetAmount) || 1000;
        setCashFloat(resetAmount);
        
        // Update settings with today's date
        const updatedSettings = {
          ...cashFloatSettings,
          lastReset: today
        };
        
        setCashFloatSettings(updatedSettings);
        
        // Save to localStorage with proper string conversion
        localStorage.setItem('cashFloat', resetAmount.toString());
        localStorage.setItem('cashFloatSettings', JSON.stringify(updatedSettings));
      }
    };
    
    checkDailyReset();
  }, [cashFloatSettings]);

  // Save cash float to localStorage whenever it changes
  useEffect(() => {
    localStorage.setItem('cashFloat', cashFloat.toString());
  }, [cashFloat]);
  
  // Handle updating cash float settings
  const updateCashFloatSettings = (newSettings) => {
    setCashFloatSettings(newSettings);
    localStorage.setItem('cashFloatSettings', JSON.stringify(newSettings));
    
    // If manual adjustment is being made, update the cash float immediately
    if (newSettings.manualAdjustment !== undefined) {
      setCashFloat(parseFloat(newSettings.manualAdjustment));
      // Remove the manualAdjustment from the settings object before saving
      const { manualAdjustment, ...settingsToSave } = newSettings;
      localStorage.setItem('cashFloatSettings', JSON.stringify(settingsToSave));
    }
    
    // Don't close the modal automatically - we'll use a separate save button
  };

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
    fetchActiveOrders();
    const interval = setInterval(fetchActiveOrders, 5000);
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
  }, []);  const fetchActiveOrders = async () => {
    try {
      // Fetch all active orders (not just ready or pending)
      const response = await fetch(
        'http://localhost:5000/api/orders',
        {
          headers: {
            Authorization: `Bearer ${localStorage.getItem('token')}`
          }
        }
      );
      
      const data = await response.json();
      
      // Use all orders that aren't completed
      const activeOrders = data.data.filter(order => order.status !== 'completed');
      
      setActiveOrders(activeOrders);
    } catch (error) {
      console.error('Error fetching orders:', error);
    }
  };  const processExistingOrderPayment = async (orderId, newStatus) => {
    try {
      // Case 1: Payment processing flow from legacy payment component
      if (typeof orderId === 'object' && orderId._id) {
        const order = orderId;
        const { method, cashAmount, cardDetails, eWalletDetails } = newStatus;
        
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
        } else if (method === 'card' && cardDetails) {
          paymentData = {
            cardLastFour: cardDetails.last4,
            cardholderName: cardDetails.name
          };
        } else if (method === 'e-wallet' && eWalletDetails) {
          paymentData = {
            eWalletNumber: eWalletDetails.number,
            eWalletName: eWalletDetails.name
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

          if (!response.ok) throw new Error('Failed to update order');          // Store current state to restore later
          const prevCurrentOrder = [...currentOrder];
          const prevPaymentMethod = paymentMethod;
          const prevCashAmount = cashAmount;
          const prevCardDetails = {...cardDetails};
          const prevEWalletDetails = {...eWalletDetails};          // Instead of using ReactDOM, we'll use the existing state and refs for the receipt
          // First, ensure each order item has all the necessary properties for OrderItem component
          const processedItems = order.items.map(item => ({
            ...item,
            // Ensure each item has availableSizes and pricing to prevent the TypeError in OrderItem
            availableSizes: item.availableSizes || [item.selectedSize || 'base'],
            pricing: item.pricing || { [item.selectedSize || 'base']: item.price }
          }));          // Set up temporary state for receipt printing with the processed items
          setCurrentOrder(processedItems);
          setPaymentMethod(method);
          
          if (method === 'cash') {
            setCashAmount(cashAmount);
          } else if (method === 'card' && cardDetails) {
            setCardDetails(cardDetails);
          } else if (method === 'e-wallet' && eWalletDetails) {
            setEWalletDetails(eWalletDetails);
          }
          
          // Show the receipt and print
          setShowReceipt(true);
          await new Promise(resolve => setTimeout(resolve, 100));
          await handlePrint();          // No need for cleanup of DOM elements since we're not creating any// Update active orders (remove the one we just processed)
          setActiveOrders(prev => prev.filter(o => o._id !== order._id));
          
          // Reset state for next use
          setCashAmount(0);
          setCardDetails({ last4: '', name: '' });
          setEWalletDetails({ number: '', name: '' });
          setCurrentOrder([]);
          setShowReceipt(false);

          if (method === 'cash') {
            setCashFloat(prev => prev + cashAmount - (cashAmount - totalDue));
          }

          alert('Payment processed successfully!');
        } catch (error) {
          console.error('Payment processing error:', error);
          alert('Error processing payment');
        }
      } 
      // Case 2: Order status update from OrderProcessingModal
      else {
        const response = await fetch(`http://localhost:5000/api/orders/${orderId}`, {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${localStorage.getItem('token')}`
          },
          body: JSON.stringify({ status: newStatus })
        });

        if (!response.ok) throw new Error('Failed to update order status');

        // Update the local state with the new status
        setActiveOrders(prev => {
          return prev.map(order => {
            if (order._id === orderId) {
              return { ...order, status: newStatus };
            }
            return order;
          });
        });

        // If order is completed, remove it from the list
        if (newStatus === 'completed') {
          setActiveOrders(prev => prev.filter(o => o._id !== orderId));
        }

        alert(`Order status updated to ${newStatus}`);
      }
    } catch (error) {
      console.error('Order processing error:', error);
      alert('Error updating order');
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
      }      setCurrentOrder([]);
      setCashAmount(0);
      setIsDiscountApplied(false);
      setSearchTerm('');
      setShowReceipt(false);
      // Reset payment details
      setCardDetails({ last4: '', name: '' });
      setEWalletDetails({ number: '', name: '' });

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

      // Prepare payment details based on the payment method
      let paymentDetails = {};
      
      if (paymentMethod === 'cash') {
        paymentDetails = {
          cashReceived: cashValue,
          change: cashValue - parseFloat(totals.total)
        };
      } else if (paymentMethod === 'card') {
        paymentDetails = {
          cardLastFour: cardDetails.last4,
          cardholderName: cardDetails.name
        };
      } else if (paymentMethod === 'e-wallet') {
        paymentDetails = {
          eWalletNumber: eWalletDetails.number,
          eWalletName: eWalletDetails.name
        };
      }

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
          ...paymentDetails
        },
        paymentMethod,
        paymentDetails, // Additional field for payment details
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
    // Reset payment details
    setCardDetails({ last4: '', name: '' });
    setEWalletDetails({ number: '', name: '' });
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

                  {/* Cash Float Settings Button (Manager Only) */}
                  {isManager && (
                    <button
                      onClick={() => setShowCashFloatModal(true)}
                      className="h-12 px-4 flex items-center justify-center rounded-lg hover:opacity-90 transition"
                      style={{ backgroundColor: theme.colors.primary, color: theme.colors.background }}
                      title="Cash Float Settings"
                    >
                      <FiDollarSign className="mr-2" />
                      <span className="hidden md:inline">Cash Float</span>
                    </button>                  )}                  <button
                    onClick={() => setShowOrderProcessingModal(true)}
                    className="h-12 px-4 flex items-center justify-center rounded-lg hover:opacity-90 transition"
                    style={{ backgroundColor: theme.colors.secondary, color: theme.colors.background }}
                    title="Ready Orders"
                  >
                    <FiCoffee className="mr-2" />                    <span className="hidden md:inline">Ready Orders</span>
                    {activeOrders.filter(o => o.status === 'ready').length > 0 && (
                      <span className="ml-2 bg-green-500 text-white text-xs font-bold rounded-full h-5 w-5 flex items-center justify-center">
                        {activeOrders.filter(o => o.status === 'ready').length}
                      </span>
                    )}
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
                  ))}                  {/* Pending Orders Section */}
                  {activeOrders.filter(order => order.paymentMethod === "pending").length > 0 && (
                    <div className="mt-4 pt-4 border-t-2">
                      <h3
                        className="text-base font-bold mb-3"
                        style={{ color: theme.colors.primary }}
                      >
                        Pending Orders ({activeOrders.filter(order => order.paymentMethod === "pending").length})
                      </h3>
                      <div className="space-y-3 max-h-[60vh] overflow-y-auto">
                        {activeOrders
                          .filter(order => order.paymentMethod === "pending")
                          .map(order => (
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
                    {/* Ready Orders Section */}
                  {activeOrders.filter(order => order.status === "ready").length > 0 && (
                    <div className="mt-4 pt-4 border-t-2">
                      <h3
                        className="text-base font-bold mb-3"
                        style={{ color: theme.colors.primary }}
                      >
                        Ready Orders ({activeOrders.filter(order => order.status === "ready").length})
                      </h3>
                      <div className="space-y-3 max-h-[60vh] overflow-y-auto">
                        {activeOrders
                          .filter(order => order.status === "ready")
                          .map(order => (
                            <div 
                              key={order._id}
                              className="p-3 rounded-lg flex justify-between"
                              style={{ backgroundColor: "#e6f7e6" }}
                            >
                              <div>
                                <span className="font-medium" style={{ color: theme.colors.primary }}>
                                  Order #{order.receiptNumber || order._id?.substring(0, 6)}
                                </span>
                                <span className="ml-2 text-xs px-2 py-1 rounded-full bg-green-100 text-green-700">
                                  Ready
                                </span>
                              </div>
                              <button
                                onClick={() => setShowOrderProcessingModal(true)}
                                className="text-xs px-2 py-1 rounded bg-green-500 text-white hover:bg-green-600"
                              >
                                Complete
                              </button>
                            </div>
                          ))}
                      </div>
                    </div>
                  )}
                </div>                <PaymentPanel
                  total={calculateTotal().total}
                  subtotal={calculateTotal().subtotal}
                  discount={calculateTotal().discount}
                  cashFloat={cashFloat}
                  paymentMethod={paymentMethod}
                  cashAmount={cashAmount}
                  isDiscountApplied={isDiscountApplied}
                  onPaymentMethodChange={(method) => {
                    setPaymentMethod(method);
                    // Reset other payment details when changing methods
                    if (method !== 'card') setCardDetails({ last4: '', name: '' });
                    if (method !== 'e-wallet') setEWalletDetails({ number: '', name: '' });
                    if (method !== 'cash') setCashAmount(0);
                  }}
                  onCashAmountChange={setCashAmount}
                  onDiscountToggle={() => setIsDiscountApplied(!isDiscountApplied)}
                  onProcessPayment={processPayment}
                  onCancelOrder={cancelOrder}
                  cardDetails={cardDetails}
                  onCardDetailsChange={setCardDetails}
                  eWalletDetails={eWalletDetails}
                  onEWalletDetailsChange={setEWalletDetails}disabled={
                    currentOrder.length === 0 ||
                    (paymentMethod === 'cash' && cashAmount < parseFloat(calculateTotal().total)) ||
                    (paymentMethod === 'card' && (!cardDetails?.last4 || !cardDetails?.name)) ||
                    (paymentMethod === 'e-wallet' && (!eWalletDetails?.number || !eWalletDetails?.name))
                  }
                />
              </div>
            </div>

            {/* Receipt Modal */}
            <Modal isOpen={showReceipt} onClose={() => setShowReceipt(false)} size="lg">              <Receipt
                ref={receiptRef}
                order={{
                  items: currentOrder,
                  receiptNumber: generateReceiptNumber()
                }}
                totals={{
                  ...calculateTotal(),
                  cashReceived: paymentMethod === 'cash' ? cashAmount.toFixed(2) : 0,
                  change: paymentMethod === 'cash' ? (cashAmount - parseFloat(calculateTotal().total)).toFixed(2) : 0,
                  cardLastFour: paymentMethod === 'card' ? cardDetails.last4 : '',
                  cardholderName: paymentMethod === 'card' ? cardDetails.name : '',
                  eWalletNumber: paymentMethod === 'e-wallet' ? eWalletDetails.number : '',
                  eWalletName: paymentMethod === 'e-wallet' ? eWalletDetails.name : ''
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

            {/* Cash Float Settings Modal - Manager Only */}
            <CashFloatModal 
              isOpen={showCashFloatModal} 
              onClose={() => setShowCashFloatModal(false)} 
              initialCashFloat={cashFloat}
              theme={theme}
              onSave={(settings) => {
                // Update cash float settings
                if (settings.resetDaily !== undefined) {
                  setCashFloatSettings({
                    resetDaily: settings.resetDaily,
                    resetAmount: settings.resetAmount,
                    lastReset: cashFloatSettings.lastReset
                  });
                  
                  localStorage.setItem('cashFloatSettings', JSON.stringify({
                    resetDaily: settings.resetDaily,
                    resetAmount: settings.resetAmount,
                    lastReset: cashFloatSettings.lastReset
                  }));
                }
                
                // Update manual cash float amount
                if (settings.manualAmount) {
                  setCashFloat(settings.manualAmount);
                  localStorage.setItem('cashFloat', settings.manualAmount.toString());
                }              }}
            />
          </div>
        )}        {/* Order Processing Modal */}        {showOrderProcessingModal && (
          <div>
            <OrderProcessingModal
              isOpen={showOrderProcessingModal} 
              onClose={() => setShowOrderProcessingModal(false)}
              orders={activeOrders}
              updateOrderStatus={processExistingOrderPayment}
              theme={theme}
            />
          </div>
        )}
      </div>
    </div>
  );
};

export default PointOfSale;