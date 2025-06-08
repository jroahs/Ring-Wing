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
import { CashAlert } from './components/ui/CashAlert';
import { useCashFloat } from './hooks/useCashFloat';
import { FiClock, FiPlus, FiSettings, FiDollarSign, FiCheckCircle, FiCoffee, FiPieChart } from 'react-icons/fi';
import EndOfShiftModal from './components/EndOfShiftModal';

const PointOfSale = () => {  
  const [menuItems, setMenuItems] = useState([]);
  const [currentOrder, setCurrentOrder] = useState([]); // Keep this for compatibility
  const [readyOrderCart, setReadyOrderCart] = useState([]);
  const [pendingOrderCart, setPendingOrderCart] = useState([]);
  const [activeOrders, setActiveOrders] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  // Separate state for meals and beverages navigation
  const [selectedMealSubCategory, setSelectedMealSubCategory] = useState(null);
  const [selectedBeverageSubCategory, setSelectedBeverageSubCategory] = useState(null);
  const [activeCategory, setActiveCategory] = useState('Meals'); // For tracking which category is active
  const [menuConfig, setMenuConfig] = useState({
    Beverages: {
      subCategories: {
        'Coffee': {}, 'Non-Coffee (Milk-Based)': {}, 'Fruit Tea': {}, 
        'Milktea': {}, 'Yogurt Smoothies': {}, 'Fresh Lemonade': {}, 
        'Frappe': {}, 'Fruit Soda': {}
      }
    },
    Meals: {
      subCategories: {
        'Breakfast All Day': {}, 'Wings & Sides': {}, 
        'Flavored Wings': {}, 'Combos': {}, 'Snacks': {}
      }
    }
  });
  const [showReceipt, setShowReceipt] = useState(false);
  const [cashAmount, setCashAmount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [windowWidth, setWindowWidth] = useState(window.innerWidth);
  
  // Cash float management using centralized service
  const {
    cashFloat,
    setFloat,
    processTransaction,
    configureDailyReset,
    validateChange,
    validateAmount,
    formatCurrency,
    isLoading: cashFloatLoading,
    error: cashFloatError
  } = useCashFloat();
    const [showCashFloatModal, setShowCashFloatModal] = useState(false);
  const [showEndOfShiftModal, setShowEndOfShiftModal] = useState(false);
  const [isUserAdmin, setIsUserAdmin] = useState(false);
  // State for managing user role
  const [isManager, setIsManager] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState('cash');

  const [eWalletDetails, setEWalletDetails] = useState({ provider: 'gcash', referenceNumber: '', name: '' });
  const [isSidebarOpen, setIsSidebarOpen] = useState(window.innerWidth >= 768);const [showTimeClock, setShowTimeClock] = useState(false);
  const [showTimeClockModal, setShowTimeClockModal] = useState(false);
  const [showOrderProcessingModal, setShowOrderProcessingModal] = useState(false);
  const [orderViewType, setOrderViewType] = useState('ready');
  const [editingPendingOrder, setEditingPendingOrder] = useState(null);
  const [isPendingOrderMode, setIsPendingOrderMode] = useState(false);
  const [pendingOrderItems, setPendingOrderItems] = useState([]);
  const receiptRef = useRef();
  // Check if user is manager based on position hierarchy
  useEffect(() => {
    const checkUserRole = async () => {
      try {
        // First check if we have user info in localStorage
        const userData = localStorage.getItem('userData');
        const user = userData ? JSON.parse(userData) : null;
        
        if (user && user.position) {
          const managerPositions = ['shift_manager', 'general_manager', 'admin'];
          const isManagerPosition = managerPositions.includes(user.position);
          console.log("Found user position in localStorage:", user.position, "IsManager:", isManagerPosition);
          setIsManager(isManagerPosition);
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
          console.log("User position from API:", data.position);
          // Set isManager to true if user has manager position
          const managerPositions = ['shift_manager', 'general_manager', 'admin'];
          setIsManager(managerPositions.includes(data.position));
        }
      } catch (err) {
        console.error('Error checking user role:', err);
      }
    };
      checkUserRole();
  }, []);

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
        );        const transformedItems = validatedItems.map(item => ({
          _id: item._id,
          code: item.code || 'N/A',
          name: item.name,
          category: item.category,
          subCategory: item.subCategory || '',  // Ensure subCategory is included
          pricing: item.pricing,
          description: item.description,
          image: item.image ? `http://localhost:5000${item.image}` : 
                 (item.category === 'Beverages' ? '/placeholders/drinks.png' : '/placeholders/meal.png'),
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

  // Debug function to check subcategories
  useEffect(() => {
    if (menuItems.length > 0) {
      console.log('Menu Items with SubCategories:', menuItems.map(item => ({
        name: item.name,
        category: item.category,
        subCategory: item.subCategory
      })));
      
      // Count items per subcategory
      const mealSubcats = menuItems
        .filter(item => item.category === 'Meals')
        .reduce((acc, item) => {
          const subcat = item.subCategory || 'None';
          acc[subcat] = (acc[subcat] || 0) + 1;
          return acc;
        }, {});
        
      const bevSubcats = menuItems
        .filter(item => item.category === 'Beverages')
        .reduce((acc, item) => {
          const subcat = item.subCategory || 'None';
          acc[subcat] = (acc[subcat] || 0) + 1;
          return acc;
        }, {});
      
      console.log('Meal Subcategories Count:', mealSubcats);
      console.log('Beverage Subcategories Count:', bevSubcats);
    }
  }, [menuItems]);
  
  const fetchActiveOrders = async () => {
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
  };  const processExistingOrderPayment = async (orderId, newStatus) => {    try {
      // Case 1: Payment processing flow from legacy payment component or ready orders
      if (typeof orderId === 'object' && orderId._id) {
        const order = orderId;
        const { method, cashAmount, eWalletDetails, totals } = newStatus;
        
        const totalDue = parseFloat(totals?.total || order.totals?.total || order.items.reduce((sum, item) => sum + (item.price * item.quantity), 0));
        let paymentData = {
          totals: totals || {
            subtotal: totalDue,
            discount: 0,
            total: totalDue
          }
        };        if (method === 'cash') {
          // Use centralized cash float validation
          const changeValidation = validateChange(cashAmount, totalDue);
          if (!changeValidation.valid) {
            alert(changeValidation.message);
            return;
          }paymentData = {
            ...paymentData,
            cashReceived: cashAmount,
            change: change.toFixed(2)
          };        } else if (method === 'e-wallet' && eWalletDetails) {
          paymentData = {
            eWalletProvider: eWalletDetails.provider,
            eWalletReferenceNumber: eWalletDetails.referenceNumber,
            eWalletName: eWalletDetails.name
          };
        }

        const response = await fetch(`http://localhost:5000/api/orders/${order._id}`, {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${localStorage.getItem('token')}`
          },          body: JSON.stringify({
            status: 'received',
            paymentMethod: method,
            ...paymentData
          })
        });

        if (!response.ok) throw new Error('Failed to update order');

        // Set up receipt data
        const processedItems = order.items.map(item => ({
          ...item,
          availableSizes: item.availableSizes || [item.selectedSize || 'base'],
          pricing: item.pricing || { [item.selectedSize || 'base']: item.price }
        }));
        
        setCurrentOrder(processedItems);
        setPaymentMethod(method);
        
        // Add staff name
        const userData = localStorage.getItem('userData');
        const user = userData ? JSON.parse(userData) : null;
        order.server = user?.username || '';
          if (method === 'cash') {
          setCashAmount(cashAmount);
        } else if (method === 'e-wallet' && eWalletDetails) {
          setEWalletDetails(eWalletDetails);
        }// Show receipt
        setShowReceipt(true);
        await new Promise(resolve => setTimeout(resolve, 100));
        try {
          await handlePrint();
        } finally {
          setShowReceipt(false);
        }
        
        // Update order lists
        setActiveOrders(prev => prev.filter(o => o._id !== order._id));        // Reset state
        setCurrentOrder([]);
        setCashAmount(0);
        setEWalletDetails({ provider: 'gcash', referenceNumber: '', name: '' });if (method === 'cash') {
          // Use centralized cash float service to process the transaction
          await processTransaction(cashAmount, totalDue, `existing_order_${order._id}`);
        }

        // No separate alert here, it's handled by the caller (PaymentPanel's onProcessPayment)
        // if the API call was successful.
        return; // Return after successful processing to avoid falling into the 'else' block
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
  };  const addToOrder = item => {
    // If in pending orders view, only allow adding items when editing a pending order
    if (orderViewType === 'pending') {
      if (!isPendingOrderMode) {
        alert('Please select a pending order to add items to.');
        return;
      }
      
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

      // Update pending order items
      const existing = pendingOrderItems.find(
        i => i._id === item._id && i.selectedSize === selectedSize
      );

      if (existing) {
        setPendingOrderItems(pendingOrderItems.map(i =>
          i._id === item._id && i.selectedSize === selectedSize
            ? { ...i, quantity: i.quantity + 1 }
            : i
        ));
      } else {
        setPendingOrderItems([...pendingOrderItems, orderItem]);
      }
      return;
    }

    // Regular order handling (only for non-pending orders)
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

    const [currentCart, setCart] = orderViewType === 'ready' ? 
      [readyOrderCart, setReadyOrderCart] : 
      [pendingOrderCart, setPendingOrderCart];

    const existing = currentCart.find(
      i => i._id === item._id && i.selectedSize === selectedSize
    );

    if (existing) {
      setCart(
        currentCart.map(i =>
          i._id === item._id && i.selectedSize === selectedSize
            ? { ...i, quantity: i.quantity + 1 }
            : i
        )
      );
    } else {
      setCart([...currentCart, orderItem]);
    }

    // Keep currentOrder in sync for backward compatibility
    setCurrentOrder(orderViewType === 'ready' ? readyOrderCart : pendingOrderCart);
  };

  const updateQuantity = (item, delta) => {
    // Determine which cart to update based on orderViewType
    const [currentCart, setCart] = orderViewType === 'ready' ? 
      [readyOrderCart, setReadyOrderCart] : 
      [pendingOrderCart, setPendingOrderCart];

    setCart(
      currentCart.map(i =>
        i._id === item._id && i.selectedSize === item.selectedSize
          ? { ...i, quantity: Math.max(1, i.quantity + delta) }
          : i
      )
    );

    // Keep currentOrder in sync for backward compatibility
    setCurrentOrder(orderViewType === 'ready' ? readyOrderCart : pendingOrderCart);
  };
  const updateSize = (item, newSize) => {
    // Determine which cart to update based on orderViewType
    const [currentCart, setCart] = orderViewType === 'ready' ? 
      [readyOrderCart, setReadyOrderCart] : 
      [pendingOrderCart, setPendingOrderCart];

    setCart(
      currentCart.map(i =>
        i._id === item._id && i.selectedSize === item.selectedSize
          ? { ...i, selectedSize: newSize, price: i.pricing[newSize] }
          : i
      )
    );

    // Keep currentOrder in sync for backward compatibility
    setCurrentOrder(orderViewType === 'ready' ? readyOrderCart : pendingOrderCart);
  };

  // New function to handle PWD/Senior discount updates
  const updateItemDiscount = (item, discountedQuantity) => {
    const [currentCart, setCart] = orderViewType === 'ready' ? 
      [readyOrderCart, setReadyOrderCart] : 
      [pendingOrderCart, setPendingOrderCart];

    setCart(
      currentCart.map(i => {
        if (i._id === item._id && i.selectedSize === item.selectedSize) {
          const discountPerItem = i.price * 0.20; // 20% discount
          const vatRate = 0.12; // 12% VAT rate
          const priceWithoutVat = i.price / (1 + vatRate);
          const vatExemptionPerItem = priceWithoutVat * vatRate;
          
          return {
            ...i,
            pwdSeniorDiscount: {
              applied: discountedQuantity > 0,
              discountedQuantity: discountedQuantity,
              discountAmount: discountPerItem * discountedQuantity,
              vatExempt: discountedQuantity > 0,
              vatExemptionAmount: vatExemptionPerItem * discountedQuantity
            }
          };
        }
        return i;
      })
    );    // Keep currentOrder in sync
    setCurrentOrder(orderViewType === 'ready' ? readyOrderCart : pendingOrderCart);
  };

  // Function to handle PWD/Senior discount updates for pending order items
  const updatePendingOrderItemDiscount = (item, discountedQuantity) => {
    setPendingOrderItems(
      pendingOrderItems.map(i => {
        if (i._id === item._id && i.selectedSize === item.selectedSize) {
          const discountPerItem = i.price * 0.20; // 20% discount
          const vatRate = 0.12; // 12% VAT rate
          const priceWithoutVat = i.price / (1 + vatRate);
          const vatExemptionPerItem = priceWithoutVat * vatRate;
          
          return {
            ...i,
            pwdSeniorDiscount: {
              applied: discountedQuantity > 0,
              discountedQuantity: discountedQuantity,
              discountAmount: discountPerItem * discountedQuantity,
              vatExempt: discountedQuantity > 0,
              vatExemptionAmount: vatExemptionPerItem * discountedQuantity
            }
          };
        }
        return i;
      })
    );
  };

  // Helper function to calculate pending order totals
  const calculatePendingOrderTotal = () => {
    const subtotal = pendingOrderItems.reduce((sum, item) => sum + item.price * item.quantity, 0);
    
    // Calculate PWD/Senior discounts
    const discountTotal = pendingOrderItems.reduce((sum, item) => {
      if (item.pwdSeniorDiscount?.applied) {
        return sum + (item.pwdSeniorDiscount.discountAmount || 0);
      }
      return sum;
    }, 0);

    const total = subtotal - discountTotal;

    return {
      subtotal: subtotal.toFixed(2),
      discount: discountTotal.toFixed(2),
      total: total.toFixed(2)
    };
  };

  const calculateTotal = () => {
    const currentCart = orderViewType === 'ready' ? readyOrderCart : pendingOrderCart;
    const subtotal = currentCart.reduce((sum, item) => sum + item.price * item.quantity, 0);
    
    // Calculate PWD/Senior discounts and VAT exemptions
    const discountTotal = currentCart.reduce((sum, item) => {
      if (item.pwdSeniorDiscount?.applied) {
        return sum + (item.pwdSeniorDiscount.discountAmount || 0);
      }
      return sum;
    }, 0);

    const vatExemptionTotal = currentCart.reduce((sum, item) => {
      if (item.pwdSeniorDiscount?.applied && item.pwdSeniorDiscount?.vatExemptionAmount) {
        return sum + item.pwdSeniorDiscount.vatExemptionAmount;
      }
      return sum;
    }, 0);

    const total = subtotal - discountTotal - vatExemptionTotal;

    return {
      subtotal: subtotal.toFixed(2),
      discount: discountTotal.toFixed(2),
      vatExemption: vatExemptionTotal.toFixed(2),
      total: total.toFixed(2)
    };
  };

  const handlePrint = useReactToPrint({ content: () => receiptRef.current });  const processPayment = async () => {
    const currentCart = orderViewType === 'ready' ? readyOrderCart : pendingOrderCart;
    const setCart = orderViewType === 'ready' ? setReadyOrderCart : setPendingOrderCart;
    
    const totals = calculateTotal();
    const cashValue = parseFloat(cashAmount);
    const totalDue = parseFloat(totals.total);

    if (paymentMethod === 'cash') {
      // Use centralized cash float validation
      const changeValidation = validateChange(cashValue, totalDue);
      if (!changeValidation.valid) {
        alert(changeValidation.message);
        return;
      }
    }

    setShowReceipt(true);

    try {
      await new Promise(resolve => setTimeout(resolve, 100));
      await handlePrint();
      await saveOrderToDB();      if (paymentMethod === 'cash') {
        // Use centralized cash float service to process the transaction
        console.log('💳 Processing cash transaction:', { paymentMethod, cashValue, totalDue });
        await processTransaction(cashValue, totalDue, 'pos_order');
        console.log('💳 Cash transaction processed successfully');
      }
        // Clear both the specific cart and currentOrder
      setCart([]);
      setCurrentOrder([]);      setCashAmount(0);
      setSearchTerm('');
      setShowReceipt(false);
      // Reset payment details
      setEWalletDetails({ provider: 'gcash', referenceNumber: '', name: '' });

      alert('Order completed successfully!');
    } catch (error) {
      console.error('Payment processing error:', error);
      alert('Error processing payment. Please try again.');
    }
  };  const processPendingOrderPayment = async () => {
    // Calculate totals for pending order items
    const pendingTotal = pendingOrderItems.reduce((sum, item) => sum + (item.price * item.quantity), 0);

    // Calculate PWD/Senior discounts and VAT exemptions for pending order
    const discountTotal = pendingOrderItems.reduce((sum, item) => {
      if (item.pwdSeniorDiscount?.applied) {
        return sum + (item.pwdSeniorDiscount.discountAmount || 0);
      }
      return sum;
    }, 0);

    const vatExemptionTotal = pendingOrderItems.reduce((sum, item) => {
      if (item.pwdSeniorDiscount?.applied && item.pwdSeniorDiscount?.vatExemptionAmount) {
        return sum + item.pwdSeniorDiscount.vatExemptionAmount;
      }
      return sum;
    }, 0);

    const totalDue = pendingTotal - discountTotal - vatExemptionTotal;
    const cashValue = parseFloat(cashAmount);

    if (paymentMethod === 'cash') {
      // Use centralized cash float validation
      const changeValidation = validateChange(cashValue, totalDue);
      if (!changeValidation.valid) {
        alert(changeValidation.message);
        return;
      }
    }

    try {
      // Update the existing pending order in the database
      const totals = {
        subtotal: pendingTotal,
        discount: discountTotal,
        vatExemption: vatExemptionTotal,
        total: totalDue
      };

      let paymentDetails = {};
      if (paymentMethod === 'cash') {
        paymentDetails = {
          cashReceived: cashValue,
          change: cashValue - totalDue
        };
      } else if (paymentMethod === 'e-wallet') {
        paymentDetails = {
          eWalletProvider: eWalletDetails.provider,
          eWalletReferenceNumber: eWalletDetails.referenceNumber,
          eWalletName: eWalletDetails.name
        };
      }

      // Update the order with payment details
      const response = await fetch(`http://localhost:5000/api/orders/${editingPendingOrder._id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({
          status: 'received',
          paymentMethod: paymentMethod,
          totals: {
            ...totals,
            ...paymentDetails
          },
          items: pendingOrderItems.map(item => ({
            name: item.name,
            price: item.price,
            quantity: item.quantity,
            selectedSize: item.selectedSize,
            modifiers: item.modifiers
          })),
          ...paymentDetails
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to update order');
      }      const orderData = await response.json();

      if (paymentMethod === 'cash') {
        // Use centralized cash float service to process the transaction
        await processTransaction(cashValue, totalDue, `pending_order_${editingPendingOrder._id}`);
      }

      // Set up receipt data using the actual order details
      const processedItems = pendingOrderItems.map(item => ({
        ...item,
        availableSizes: item.availableSizes || [item.selectedSize || 'base'],
        pricing: item.pricing || { [item.selectedSize || 'base']: item.price }
      }));
      
      setCurrentOrder(processedItems);
      setPaymentMethod(paymentMethod);
      
      // Update payment details for receipt
      if (paymentMethod === 'cash') {
        setCashAmount(cashAmount);
      } else if (paymentMethod === 'e-wallet') {
        setEWalletDetails(eWalletDetails);
      }      // Update the editingPendingOrder with the response data so the receipt shows the correct info
      setEditingPendingOrder(orderData.data);

      // Show receipt for user review (no automatic print or close)
      setShowReceipt(true);

      // Refresh orders list
      await fetchActiveOrders();

      alert('Payment processed successfully!');
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
        };      } else if (paymentMethod === 'e-wallet') {
        paymentDetails = {
          eWalletProvider: eWalletDetails.provider,
          eWalletReferenceNumber: eWalletDetails.referenceNumber,
          eWalletName: eWalletDetails.name
        };
      }const currentCart = orderViewType === 'ready' ? readyOrderCart : pendingOrderCart;
      const orderData = {
        items: currentCart.map(item => ({
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
        paymentDetails, // Additional field for payment details        status: 'received',
        orderType: 'pos',  // Changed from 'self_checkout' to 'pos' for orders created in POS
        server: (() => {
          try {
            const userData = localStorage.getItem('userData');
            if (userData) {
              const user = JSON.parse(userData);
              return user.username || '';
            }
          } catch (error) {
            console.error('Error getting staff name:', error);
          }
          return '';
        })()
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
    // Determine which cart to update based on orderViewType
    const setCart = orderViewType === 'ready' ? setReadyOrderCart : setPendingOrderCart;
    
    setCart(prevCart =>
      prevCart.filter(
        item =>
          !(
            item._id === itemToRemove._id &&
            item.selectedSize === itemToRemove.selectedSize
          )
      )
    );

    // Keep currentOrder in sync for backward compatibility
    setCurrentOrder(orderViewType === 'ready' ? readyOrderCart : pendingOrderCart);
  };  const cancelOrder = () => {
    // Clear the appropriate cart based on order view type
    if (orderViewType === 'ready') {
      setReadyOrderCart([]);
    } else {
      setPendingOrderCart([]);
    }    // Keep currentOrder in sync
    setCurrentOrder([]);
    setCashAmount(0);
    // Reset payment details
    setEWalletDetails({ provider: 'gcash', referenceNumber: '', name: '' });
  };// Filtered items is kept for compatibility with any existing code that might reference it
  // But filtering is now done directly in the render for each category section
  const filteredItems = useMemo(() => {
    const searchFiltered = menuItems.filter(item =>
      searchTerm === '' || 
      item.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
      item.code.toLowerCase().includes(searchTerm.toLowerCase())
    );
    
    // Now apply separate category filters
    if (activeCategory === 'Meals') {
      return searchFiltered.filter(item => 
        item.category === 'Meals' && 
        (!selectedMealSubCategory || item.subCategory === selectedMealSubCategory)
      );
    } else if (activeCategory === 'Beverages') {
      return searchFiltered.filter(item => 
        item.category === 'Beverages' && 
        (!selectedBeverageSubCategory || item.subCategory === selectedBeverageSubCategory)
      );
    }
    
    return searchFiltered;
  }, [menuItems, searchTerm, activeCategory, selectedMealSubCategory, selectedBeverageSubCategory]);

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
  }, [searchTerm, menuItems, filteredItems]);  // Helper function to reset all filters
  const showAllItems = () => {
    setActiveCategory(null);
    setSelectedMealSubCategory(null);
    setSelectedBeverageSubCategory(null);
    setSearchTerm('');
  };  // Category tabs component - no longer needed with the new integrated breadcrumb navigation
  const renderCategoryTabs = () => {
    return null;
  };  // Subcategory tabs component - now handles separate states for meals and beverages
  // Displays subcategories in a compact single row with separators
  const renderSubCategoryTabs = (category) => {
    if (!menuConfig[category]) return null;
    
    const subCategories = Object.keys(menuConfig[category].subCategories || {});
    if (subCategories.length === 0) return null;
    
    const selectedSubCategory = category === 'Meals' ? selectedMealSubCategory : selectedBeverageSubCategory;
    const setSelectedSubCategory = category === 'Meals' ? setSelectedMealSubCategory : setSelectedBeverageSubCategory;
    
    return (
      <div className="overflow-x-auto whitespace-nowrap py-1 mt-1 flex items-center">
        {subCategories.map((subCategory, index) => (
          <React.Fragment key={subCategory}>
            {index > 0 && <span className="text-gray-300 mx-1">•</span>}
            <button
              onClick={() => setSelectedSubCategory(subCategory)}
              className={`text-xs transition-colors ${
                selectedSubCategory === subCategory ? 'font-medium underline' : ''
              }`}
              style={{
                color: selectedSubCategory === subCategory ? theme.colors.accent : theme.colors.primary
              }}
            >
              {subCategory}
            </button>
          </React.Fragment>
        ))}
      </div>
    );
  };

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
            <div className="flex-1 p-4 md:p-6 order-2 md:order-1">              <div className="relative mb-6 max-w-7xl mx-auto flex">
                <div className="relative flex-1 mr-2">
                  <SearchBar
                    value={searchTerm}
                    onChange={e => setSearchTerm(e.target.value)}
                    placeholder="Search menu..."
                    size="lg"
                  />                  {/* Show All Items button */}
                  {(activeCategory || selectedMealSubCategory || selectedBeverageSubCategory || searchTerm) && (
                    <button
                      onClick={showAllItems}
                      className="absolute right-2 top-2 text-xs py-1 px-2 rounded-md bg-gray-100 hover:bg-gray-200 transition-colors"
                      style={{ color: theme.colors.primary }}
                    >
                      Show All
                    </button>
                  )}
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
                  </button>                  {/* Cash Float Settings Button (Manager Only) */}
                  {isManager && (
                    <button
                      onClick={() => setShowCashFloatModal(true)}
                      className="h-12 px-4 flex items-center justify-center rounded-lg hover:opacity-90 transition"
                      style={{ backgroundColor: theme.colors.primary, color: theme.colors.background }}
                      title="Cash Float Settings"
                    >
                      <FiDollarSign className="mr-2" />
                      <span className="hidden md:inline">Cash Float</span>
                    </button>                  )}                  {/* End of Shift Button (Manager Only) */}
                  {isManager && (
                    <button
                      onClick={() => setShowEndOfShiftModal(true)}
                      className="h-12 px-4 flex items-center justify-center rounded-lg hover:opacity-90 transition"
                      style={{ backgroundColor: theme.colors.accent, color: theme.colors.background }}
                      title="End of Shift Report"
                    >
                      <FiPieChart className="mr-2" />
                      <span className="hidden md:inline">End of Shift</span>
                    </button>
                  )}<button
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
              </div>              {/* Menu Navigation */}
              <div className="mb-4">{/* Meals Section */}
                <div className="mb-6">
                  {/* Meals Breadcrumb with integrated subcategory selector */}
                  <div className="mb-2 bg-white rounded-lg py-1 px-3 shadow-sm">
                    <div className="flex items-center justify-between">                    <div>
                      <div className="flex items-center gap-1">
                        <span className="font-medium mr-2 text-sm" style={{ color: theme.colors.primary }}>
                          Meals:
                        </span>
                        <button
                          onClick={() => { 
                            setActiveCategory('Meals');
                            setSelectedMealSubCategory(null);
                          }}
                          className={`text-sm transition-colors ${!selectedMealSubCategory ? 'font-medium' : ''}`}
                          style={{ 
                            color: !selectedMealSubCategory ? theme.colors.accent : theme.colors.primary 
                          }}
                        >
                          All Meals
                        </button>
                        
                        {selectedMealSubCategory && (
                          <>
                            <span className="text-gray-400 mx-1">/</span>
                            <span 
                              className="text-sm font-medium"
                              style={{ color: theme.colors.accent }}
                            >
                              {selectedMealSubCategory}
                            </span>
                          </>
                        )}
                      </div>
                      </div>
                      
                      {/* Clear selection button */}
                      {selectedMealSubCategory && (
                        <button
                          onClick={() => setSelectedMealSubCategory(null)}
                          className="text-xs px-2 py-1 rounded-md bg-gray-100 hover:bg-gray-200 transition-colors"
                          style={{ color: theme.colors.primary }}
                        >
                          Clear
                        </button>
                      )}
                    </div>
                    
                    {/* Subcategories in a single row */}
                    {renderSubCategoryTabs('Meals')}
                  </div>                  {/* Display Meal Items */}
                  <div className="overflow-x-auto scrollbar-hide" style={{ width: '836px', maxWidth: '100%' }}>
                    <div className="flex gap-3 pb-2" style={{ width: 'max-content' }}>
                      {menuItems
                        .filter(item => 
                          item.category === 'Meals' && 
                          (!selectedMealSubCategory || item.subCategory === selectedMealSubCategory) &&
                          (searchTerm === '' || 
                           item.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
                           item.code.toLowerCase().includes(searchTerm.toLowerCase()))
                        )
                        .map(item => (
                          <div key={item._id} className="flex-shrink-0" style={{ width: '200px' }}>
                            <MenuItemCard
                              item={item}
                              onClick={() => addToOrder(item)}
                            />
                          </div>
                        ))
                      }
                    </div>
                  </div>
                </div>                {/* Beverages Section */}
                <div>
                  {/* Beverages Breadcrumb with integrated subcategory selector */}
                  <div className="mb-2 bg-white rounded-lg py-1 px-3 shadow-sm">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-1">
                        <span className="font-medium mr-2 text-sm" style={{ color: theme.colors.primary }}>
                          Beverages:
                        </span>
                        <button
                          onClick={() => { 
                            setActiveCategory('Beverages');
                            setSelectedBeverageSubCategory(null);
                          }}
                          className={`text-sm transition-colors ${!selectedBeverageSubCategory ? 'font-medium' : ''}`}
                          style={{ 
                            color: !selectedBeverageSubCategory ? theme.colors.accent : theme.colors.primary 
                          }}
                        >
                          All Beverages
                        </button>
                        
                        {selectedBeverageSubCategory && (
                          <>
                            <span className="text-gray-400 mx-1">/</span>
                            <span 
                              className="text-sm font-medium"
                              style={{ color: theme.colors.accent }}
                            >
                              {selectedBeverageSubCategory}
                            </span>
                          </>                        )}
                      </div>
                      
                      {/* Clear selection button */}
                      {selectedBeverageSubCategory && (
                        <button
                          onClick={() => setSelectedBeverageSubCategory(null)}
                          className="text-xs px-2 py-1 rounded-md bg-gray-100 hover:bg-gray-200 transition-colors"
                          style={{ color: theme.colors.primary }}
                        >
                          Clear
                        </button>
                      )}
                    </div>
                    
                    {/* Subcategories in a single row */}
                    {renderSubCategoryTabs('Beverages')}
                  </div>                  {/* Display Beverage Items */}
                  <div className="overflow-x-auto scrollbar-hide" style={{ width: '836px', maxWidth: '100%' }}>
                    <div className="flex gap-3 pb-2" style={{ width: 'max-content' }}>
                      {menuItems
                        .filter(item => 
                          item.category === 'Beverages' && 
                          (!selectedBeverageSubCategory || item.subCategory === selectedBeverageSubCategory) &&
                          (searchTerm === '' || 
                           item.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
                           item.code.toLowerCase().includes(searchTerm.toLowerCase()))
                        )
                        .map(item => (
                          <div key={item._id} className="flex-shrink-0" style={{ width: '200px' }}>
                            <MenuItemCard
                              item={item}
                              onClick={() => addToOrder(item)}
                            />
                          </div>
                        ))
                      }
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Order Panel */}
            <div
              className="w-full md:w-[45vw] lg:w-[35vw] xl:w-[30vw] max-w-3xl rounded-t-3xl md:rounded-3xl m-0 md:m-4 p-4 md:p-6 shadow-2xl order-1 md:order-2 flex flex-col"
              style={{ backgroundColor: theme.colors.background, maxHeight: 'calc(100vh - 48px)' }}
            >
              <div className="flex-1 min-h-0 flex flex-col overflow-y-auto">
                {/* Order View Toggle - move above cart */}
                <div className="flex justify-center mb-2 gap-2">
                  <button
                    className={`px-4 py-1 rounded-lg font-semibold text-sm transition-colors ${orderViewType === 'ready' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}
                    onClick={() => {
                      setOrderViewType('ready');
                      setIsPendingOrderMode(false);
                      setEditingPendingOrder(null);
                      setPendingOrderItems([]);
                    }}
                  >
                    Ready Orders
                  </button>
                  <button
                    className={`px-4 py-1 rounded-lg font-semibold text-sm transition-colors ${orderViewType === 'pending' ? 'bg-orange-100 text-orange-700' : 'bg-gray-100 text-gray-500'}`}
                    onClick={() => {
                      setOrderViewType('pending');
                      // When switching to pending view, if not already editing, ensure isPendingOrderMode is false.
                      // If the user then selects a pending order, isPendingOrderMode will be set to true.
                      if (!isPendingOrderMode) {
                        setEditingPendingOrder(null);
                        // pendingOrderItems should only be cleared if not actively editing.
                        // If isPendingOrderMode was true, it means we were editing, and switching to 'pending' tab
                        // shouldn't clear the items of the order being edited.
                        // However, if we switch TO 'pending' FROM 'ready', and we were NOT in pendingOrderMode,
                        // it's safe to ensure pendingOrderItems is clear.
                        // The main concern is clearing pendingOrderItems when switching TO 'ready'.
                      }
                    }}
                  >
                    Pending Orders
                  </button>
                </div>                {/* Cart (Current Order) - always visible below toggle */}
                <div className="flex-1 overflow-y-auto space-y-1.5 mb-4">
                  {/* Editing Order Header: Only shown when editing a specific pending order on the pending tab */}
                  {orderViewType === 'pending' && isPendingOrderMode && editingPendingOrder && (
                    <div className="bg-orange-50 p-2 mb-2 rounded-lg">
                      <div className="flex justify-between items-center">
                        <span className="font-medium text-orange-700">
                          Editing Order #{editingPendingOrder.receiptNumber || editingPendingOrder._id?.substring(0, 6)}
                        </span>
                        <button
                          onClick={() => {
                            setEditingPendingOrder(null);
                            setIsPendingOrderMode(false);
                            setPendingOrderItems([]);
                            // Reset payment method or other relevant states if needed
                            setPaymentMethod('cash'); // Example: reset to default
                            setCashAmount(0);
                          }}
                          className="text-xs px-2 py-1 rounded bg-orange-200 text-orange-700 hover:bg-orange-300"
                        >
                          Cancel Edit
                        </button>
                      </div>
                    </div>
                  )}

                  {/* Conditional rendering for PENDING tab */}
                  {orderViewType === 'pending' ? (
                    <>
                      {isPendingOrderMode && editingPendingOrder ? (
                        // Editing a specific pending order: Show its items (pendingOrderItems)
                        <>
                          {pendingOrderItems.length > 0 ? (
                            pendingOrderItems.map(item => (                              <OrderItem
                                key={`${item._id}-${item.selectedSize}`}
                                item={item}
                                onVoid={(item) => setPendingOrderItems(pendingOrderItems.filter(i => 
                                  !(i._id === item._id && i.selectedSize === item.selectedSize)
                                ))}
                                onUpdateSize={(item, newSize) => setPendingOrderItems(pendingOrderItems.map(i => 
                                  i._id === item._id && i.selectedSize === item.selectedSize
                                    ? { ...i, selectedSize: newSize, price: i.pricing[newSize] }
                                    : i
                                ))}
                                onUpdateQuantity={(item, delta) => setPendingOrderItems(pendingOrderItems.map(i => 
                                  i._id === item._id && i.selectedSize === item.selectedSize
                                    ? { ...i, quantity: Math.max(1, i.quantity + delta) }
                                    : i
                                ))}
                                onDiscountUpdate={updatePendingOrderItemDiscount}
                              />
                            ))
                          ) : (
                            <div className="text-center text-gray-400 py-4">No items in this pending order.</div>
                          )}
                        </>
                      ) : (
                        /* Not editing a specific pending order: Show Pending List first, then New Order Cart (if any) */
                        <>
                          {/* Pending Orders List (MOVED HERE) */}
                          <div className="mt-2 pt-2 border-t">
                            <h3
                              className="text-base font-bold mb-3"
                              style={{ color: theme.colors.primary }}
                            >
                              Pending Orders ({activeOrders.filter(order => order.status === "pending" && order.paymentMethod === "pending").length})
                            </h3>
                            <div className="space-y-3">
                              {activeOrders.filter(order => order.status === "pending" && order.paymentMethod === "pending").length === 0 ? (
                                <div className="text-center text-gray-400 py-8">No pending orders.</div>
                              ) : (
                                activeOrders
                                  .filter(order => order.status === "pending" && order.paymentMethod === "pending")
                                  .map(order => (
                                    <div
                                      key={order._id}
                                      className="p-3 rounded-lg hover:bg-gray-50 cursor-pointer"
                                      onClick={() => {
                                        setEditingPendingOrder(order);
                                        setIsPendingOrderMode(true);
                                        setPendingOrderItems(order.items.map(item => ({
                                          ...item,
                                          _id: item._id || item.itemId,
                                          selectedSize: item.selectedSize || 'base',
                                          availableSizes: Object.keys(item.pricing || { base: item.price }),
                                          pricing: item.pricing || { base: item.price }
                                        })));
                                        // Reset new order cart when an existing pending order is selected
                                        setPendingOrderCart([]); 
                                        // Reset payment method or other relevant states if needed
                                        setPaymentMethod('cash'); 
                                        setCashAmount(0);
                                      }}
                                    >
                                      <div className="flex justify-between items-center">
                                        <span className="font-medium" style={{ color: theme.colors.primary }}>
                                          Order #{order.receiptNumber || order._id?.substring(0, 6)}
                                        </span>
                                        <button
                                          className="text-xs px-2 py-1 rounded-lg"
                                          style={{ backgroundColor: theme.colors.accent, color: theme.colors.background }}
                                        >
                                          Process
                                        </button>
                                      </div>
                                    </div>
                                ))
                              )}
                            </div>
                          </div>

                          {/* New Order Cart (pendingOrderCart), only if items exist */}
                          {pendingOrderCart.length > 0 && (
                            pendingOrderCart.map(item => (                              <OrderItem
                                key={`${item._id}-${item.selectedSize}`}
                                item={item}
                                onVoid={voidItem} // Use general voidItem for new orders
                                onUpdateSize={updateSize} // Use general updateSize for new orders
                                onUpdateQuantity={updateQuantity} // Use general updateQuantity for new orders
                                onDiscountUpdate={updateItemDiscount}
                              />
                            ))
                          )}
                        </>
                      )}
                    </>
                  ) : (
                    // === READY Tab === (logic remains as original for readyOrderCart)
                    <>
                      {readyOrderCart.length > 0 ? (
                        readyOrderCart.map(item => (                          <OrderItem
                            key={`${item._id}-${item.selectedSize}`}
                            item={item}
                            onVoid={voidItem}
                            onUpdateSize={updateSize}
                            onUpdateQuantity={updateQuantity}
                            onDiscountUpdate={updateItemDiscount}
                          />
                        ))
                      ) : (
                        <div className="text-center text-gray-400 py-4">No items in cart.</div>
                      )}
                    </>
                  )}
                </div> {/* End of flex-1 overflow-y-auto space-y-1.5 mb-4 */}
                
                {/* Ready Orders Section (only render if there are ready orders and tab is selected) */}
                {orderViewType === 'ready' && activeOrders.filter(order => order.status === "ready").length > 0 && (
                  <div className="mt-4 pt-4 border-t-2">
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
              </div>              <div className="mt-auto">                <PaymentPanel
                  total={isPendingOrderMode ? 
                    calculatePendingOrderTotal().total :
                    calculateTotal().total}
                  subtotal={isPendingOrderMode ? 
                    calculatePendingOrderTotal().subtotal :
                    calculateTotal().subtotal}
                  discount={isPendingOrderMode ? 
                    calculatePendingOrderTotal().discount :
                    calculateTotal().discount}
                  cashFloat={cashFloat}
                  paymentMethod={paymentMethod}
                  cashAmount={cashAmount}                  onPaymentMethodChange={(method) => {
                    setPaymentMethod(method);
                    // Reset other payment details when changing methods
                    if (method !== 'e-wallet') setEWalletDetails({ provider: 'gcash', referenceNumber: '', name: '' });
                    if (method !== 'cash') setCashAmount(0);
                  }}
                  onCashAmountChange={setCashAmount}
                  onProcessPayment={isPendingOrderMode ? 
                    () => processPendingOrderPayment() : 
                    processPayment}                  onCancelOrder={() => {
                    if (isPendingOrderMode) {
                      setEditingPendingOrder(null);
                      setIsPendingOrderMode(false);
                      setPendingOrderItems([]);
                    } else {
                      cancelOrder();
                    }
                  }}
                  eWalletDetails={eWalletDetails}
                  onEWalletDetailsChange={setEWalletDetails}disabled={
                    (!isPendingOrderMode && (orderViewType === 'ready' ? readyOrderCart : pendingOrderCart).length === 0) ||
                    (isPendingOrderMode && pendingOrderItems.length === 0) ||
                    (paymentMethod === 'cash' && cashAmount < parseFloat(isPendingOrderMode ? 
                      calculatePendingOrderTotal().total :
                      calculateTotal().total)) ||
                    (paymentMethod === 'e-wallet' && (!eWalletDetails?.referenceNumber || !eWalletDetails?.name))
                  }
                />
              </div>
            </div>            {/* Receipt Modal */}            <Modal isOpen={showReceipt} onClose={() => setShowReceipt(false)} size="lg">
              <Receipt
                ref={receiptRef}
                order={{
                  items: isPendingOrderMode ? pendingOrderItems : (orderViewType === 'ready' ? readyOrderCart : pendingOrderCart),
                  receiptNumber: isPendingOrderMode && editingPendingOrder ? 
                    editingPendingOrder.receiptNumber : 
                    generateReceiptNumber(),
                  server: (() => {
                    try {
                      const userData = localStorage.getItem('userData');
                      if (userData) {
                        const user = JSON.parse(userData);
                        return user.username || '';
                      }
                    } catch (error) {
                      console.error('Error getting staff name:', error);
                    }
                    return '';
                  })()
                }}totals={{
                  subtotal: isPendingOrderMode 
                    ? calculatePendingOrderTotal().subtotal
                    : calculateTotal().subtotal,
                  discount: isPendingOrderMode 
                    ? calculatePendingOrderTotal().discount
                    : calculateTotal().discount,
                  total: isPendingOrderMode
                    ? calculatePendingOrderTotal().total
                    : calculateTotal().total,                  cashReceived: paymentMethod === 'cash' ? parseFloat(cashAmount).toFixed(2) : "0.00",
                  change: paymentMethod === 'cash' ? 
                    (parseFloat(cashAmount) - (isPendingOrderMode 
                      ? parseFloat(calculatePendingOrderTotal().total)
                      : parseFloat(calculateTotal().total)
                    )).toFixed(2) : "0.00",                  eWalletProvider: paymentMethod === 'e-wallet' ? eWalletDetails?.provider || '' : '',
                  eWalletReferenceNumber: paymentMethod === 'e-wallet' ? eWalletDetails?.referenceNumber || '' : '',
                  eWalletName: paymentMethod === 'e-wallet' ? eWalletDetails?.name || '' : ''
                }}
                paymentMethod={paymentMethod}
              />
              <div className="mt-4">
                <button
                  className="w-full py-3 md:py-4 text-base md:text-lg rounded-2xl mt-4 font-semibold"
                  style={{
                    backgroundColor: theme.colors.primary,
                    color: theme.colors.background
                  }}                  onClick={async () => {
                    try {
                      await handlePrint();
                    } finally {
                      setShowReceipt(false);
                      
                      // Reset pending order states when closing receipt
                      if (isPendingOrderMode) {
                        setEditingPendingOrder(null);
                        setIsPendingOrderMode(false);
                        setPendingOrderItems([]);
                        setCurrentOrder([]);
                        setCashAmount(0);
                        setSearchTerm('');
                        // Reset payment details
                        setEWalletDetails({ provider: 'gcash', referenceNumber: '', name: '' });
                      }
                    }
                  }}
                >
                  CLOSE
                </button>
              </div>
            </Modal>

            {/* Time Clock Modal */}
            {showTimeClockModal && (
              <TimeClockModal onClose={() => setShowTimeClockModal(false)} />
            )}            {/* Cash Float Settings Modal - Manager Only */}
            <CashFloatModal 
              isOpen={showCashFloatModal} 
              onClose={() => setShowCashFloatModal(false)} 
              initialCashFloat={cashFloat}
              theme={theme}              onSave={async (settings) => {
                try {
                  // Update daily reset settings using centralized service
                  if (settings.resetDaily !== undefined) {
                    await configureDailyReset(settings.resetDaily, settings.resetAmount);
                  }
                  
                  // Update manual cash float amount using centralized service
                  if (settings.manualAmount !== undefined && settings.manualAmount !== '') {
                    await setFloat(settings.manualAmount, 'manual_adjustment', {
                      previousAmount: cashFloat,
                      source: 'cash_float_modal'
                    });
                  }
                } catch (error) {
                  console.error('Error updating cash float settings:', error);
                  alert('Error updating cash float settings: ' + error.message);
                }
              }}
            />            {/* End of Shift Modal - Manager Only */}
            {isManager && (
              <EndOfShiftModal 
                isOpen={showEndOfShiftModal} 
                onClose={() => setShowEndOfShiftModal(false)} 
                theme={theme}
                cashFloat={cashFloat}
              />
            )}
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