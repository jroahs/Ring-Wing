import React, { useState, useEffect, useRef } from 'react';
import { useReactToPrint } from 'react-to-print';
import { MenuItemCard, OrderItem, PaymentPanel, PaymentProcessingModal, SearchBar, Modal } from './components/ui';
import { theme } from './theme';
import { Receipt } from './components/Receipt';
import TimeClockInterface from './components/TimeClockInterface';
import OrderProcessingModal from './components/OrderProcessingModal';
import CashFloatModal from './components/CashFloatModal';
import EndOfShiftModal from './components/EndOfShiftModal';
import SizeSelectionModal from './components/SizeSelectionModal';
import { useCashFloat } from './hooks/useCashFloat';
import { FiClock, FiCoffee, FiPieChart, FiSearch } from 'react-icons/fi';
import { PesoIconSimple } from './components/ui/PesoIconSimple';
import io from 'socket.io-client';
import { API_URL } from './App';

// Global socket instance
let globalSocket = null;
let socketInitialized = false;

const PointOfSaleTablet = () => {
  // === MENU & CATEGORIES ===
  const [menuItems, setMenuItems] = useState([]);
  const [categories, setCategories] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  
  // Category & Subcategory Navigation
  const [selectedMealSubCategory, setSelectedMealSubCategory] = useState(null);
  const [selectedBeverageSubCategory, setSelectedBeverageSubCategory] = useState(null);
  const [activeCategory, setActiveCategory] = useState('Meals');
  const [selectedSubCategories, setSelectedSubCategories] = useState({});
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

  // === ORDER MANAGEMENT ===
  const [currentOrder, setCurrentOrder] = useState([]); // Compatibility
  const [readyOrderCart, setReadyOrderCart] = useState([]);
  const [pendingOrderCart, setPendingOrderCart] = useState([]);
  const [activeOrders, setActiveOrders] = useState([]);
  const [orderViewType, setOrderViewType] = useState('ready'); // 'ready', 'pending', 'dineTakeout'
  const [editingPendingOrder, setEditingPendingOrder] = useState(null);
  const [isPendingOrderMode, setIsPendingOrderMode] = useState(false);
  const [pendingOrderItems, setPendingOrderItems] = useState([]);
  const [takeoutOrders, setTakeoutOrders] = useState([]); // Payment verification orders

  // === PAYMENT & CHECKOUT ===
  const [paymentMethod, setPaymentMethod] = useState('cash');
  const [showReceipt, setShowReceipt] = useState(false);
  const [savedOrderData, setSavedOrderData] = useState(null);
  const [cashAmount, setCashAmount] = useState(0);
  const [eWalletDetails, setEWalletDetails] = useState({ 
    provider: 'gcash', 
    referenceNumber: '', 
    name: '' 
  });
  const [customerName, setCustomerName] = useState('');
  const [discountCardDetails, setDiscountCardDetails] = useState({ 
    cardType: 'PWD', 
    cardIdNumber: '' 
  });

  // === MODALS & UI ===
  const [showTimeClock, setShowTimeClock] = useState(false);
  const [showTimeClockModal, setShowTimeClockModal] = useState(false);
  const [showOrderProcessingModal, setShowOrderProcessingModal] = useState(false);
  const [showPaymentProcessingModal, setShowPaymentProcessingModal] = useState(false);
  const [showCashFloatModal, setShowCashFloatModal] = useState(false);
  const [showEndOfShiftModal, setShowEndOfShiftModal] = useState(false);
  const [showVerificationModal, setShowVerificationModal] = useState(false);
  const [showSizeModal, setShowSizeModal] = useState(false);
  const [selectedItemForSize, setSelectedItemForSize] = useState(null);
  const [selectedVerificationOrder, setSelectedVerificationOrder] = useState(null);
  const [expandedImage, setExpandedImage] = useState(false);
  
  // Phase 8: Confirmation dialogs
  const [showRemoveConfirm, setShowRemoveConfirm] = useState(false);
  const [itemToRemove, setItemToRemove] = useState(null);
  const [showClearCartConfirm, setShowClearCartConfirm] = useState(false);

  // === SYSTEM STATE ===
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [windowWidth, setWindowWidth] = useState(window.innerWidth);
  const [isUserAdmin, setIsUserAdmin] = useState(false);
  const [isManager, setIsManager] = useState(false);
  const [socket, setSocket] = useState(null);

  // === REFS & HOOKS ===
  const receiptRef = useRef();
  const socketRef = useRef(null);
  const isConnectingRef = useRef(false);
  
  // Cash float management
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

  // Print handler
  const handlePrint = useReactToPrint({
    content: () => receiptRef.current,
    documentTitle: `Receipt-${savedOrderData?.orderNumber || 'Order'}`,
  });

  // === UTILITY FUNCTIONS ===
  
  // Get active cart based on order view type
  const getActiveCart = () => {
    switch(orderViewType) {
      case 'pending':
        return isPendingOrderMode ? pendingOrderCart : [];
      case 'dineTakeout':
        return [];
      case 'ready':
      default:
        return readyOrderCart;
    }
  };

  // Set active cart based on order view type
  const setActiveCart = (items) => {
    switch(orderViewType) {
      case 'pending':
        if (isPendingOrderMode) {
          setPendingOrderCart(items);
        }
        break;
      case 'ready':
      default:
        setReadyOrderCart(items);
        break;
    }
  };

  // Check if items are locked in current tab
  const isItemLocked = () => {
    return orderViewType === 'dineTakeout' || 
           (orderViewType === 'pending' && !isPendingOrderMode);
  };

  // Check user roles
  useEffect(() => {
    const userData = localStorage.getItem('userData');
    if (userData) {
      try {
        const user = JSON.parse(userData);
        setIsUserAdmin(user.position === 'admin');
        setIsManager(['shift_manager', 'general_manager', 'admin'].includes(user.position));
      } catch (error) {
        console.error('Error parsing user data:', error);
      }
    }
  }, []);

  // Window resize handler
  useEffect(() => {
    const handleResize = () => setWindowWidth(window.innerWidth);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // === INITIALIZATION ===
  useEffect(() => {
    const initializeApp = async () => {
      setLoading(true);
      
      // Fetch data (errors are handled in each function)
      const [menuResult, categoriesResult] = await Promise.all([
        fetchMenuItems(),
        fetchCategories(),
        fetchActiveOrders(),
      ]);
      
      // Initialize socket
      initializeSocket();
      
      // Note: Backend connectivity check removed as it was checking stale state
      // The individual fetch functions already handle and log errors appropriately
      
      setLoading(false);
    };

    initializeApp();
  }, []);

  const initializeSocket = () => {
    // Prevent duplicate connections
    if (globalSocket?.connected) {
      setSocket(globalSocket);
      return;
    }

    if (isConnectingRef.current) return;
    isConnectingRef.current = true;

    globalSocket = io(API_URL, {
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionAttempts: 5,
      reconnectionDelay: 1000,
      forceNew: false,
      multiplex: true,
    });

    // Real-time event listeners
    globalSocket.on('connect', () => {
      console.log('[Socket] Connected to server');
      isConnectingRef.current = false;
    });

    globalSocket.on('disconnect', () => {
      console.log('[Socket] Disconnected from server');
    });

    globalSocket.on('menuItemUpdated', (data) => {
      console.log('[Socket] Menu item updated:', data);
      fetchMenuItems();
    });

    globalSocket.on('menuAvailabilityChanged', (data) => {
      console.log('[Socket] Menu availability changed:', data);
      // Update the specific menu item's availability in state
      setMenuItems(prevItems => 
        prevItems.map(item => 
          item._id === data.menuItemId 
            ? { ...item, isAvailable: data.isAvailable }
            : item
        )
      );
    });

    globalSocket.on('orderCreated', (data) => {
      console.log('[Socket] Order created:', data);
      fetchActiveOrders();
    });

    globalSocket.on('orderUpdated', (data) => {
      console.log('[Socket] Order updated:', data);
      fetchActiveOrders();
    });

    globalSocket.on('orderDeleted', (data) => {
      console.log('[Socket] Order deleted:', data);
      setActiveOrders(prev => prev.filter(o => o._id !== data.orderId));
      setTakeoutOrders(prev => prev.filter(o => o._id !== data.orderId));
    });

    globalSocket.on('paymentVerified', (data) => {
      console.log('[Socket] Payment verified:', data);
      fetchActiveOrders();
      // Also refresh takeout orders to remove verified orders from pending list
      if (orderViewType === 'dineTakeout') {
        fetchTakeoutOrders();
      }
    });

    socketRef.current = globalSocket;
    setSocket(globalSocket);
  };

  const fetchMenuItems = async () => {
    try {
      const response = await fetch(`${API_URL}/api/menu?limit=1000`);
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
        subCategory: item.subCategory || '',
        pricing: item.pricing,
        description: item.description,
        image: item.image ? `${API_URL}${item.image}` : 
               (item.category === 'Beverages' ? '/placeholders/drinks.png' : '/placeholders/meal.png'),
        modifiers: item.modifiers || [],
        isAvailable: item.isAvailable
      }));

      if (validatedItems.length === 0) {
        throw new Error('No valid menu items found in response');
      }

      setMenuItems(transformedItems);
    } catch (error) {
      console.error('Error fetching menu items:', error);
      setMenuItems([]);
    }
  };

  const fetchCategories = async () => {
    try {
      const response = await fetch(`${API_URL}/api/categories`);
      if (!response.ok) {
        throw new Error('Failed to fetch categories');
      }
      const data = await response.json();
      
      console.log('TabletPOS: Loaded dynamic categories', data);
      
      // Transform and sort categories
      const transformedCategories = data.map(cat => ({
        ...cat,
        name: cat.name || cat.category,
        _id: cat._id || cat.category
      }));
      
      const sortedCategories = transformedCategories.sort((a, b) => {
        const aSortOrder = typeof a.sortOrder === 'number' ? a.sortOrder : 999;
        const bSortOrder = typeof b.sortOrder === 'number' ? b.sortOrder : 999;
        if (aSortOrder !== bSortOrder) return aSortOrder - bSortOrder;
        return (a.name || '').localeCompare(b.name || '');
      });
      
      setCategories(sortedCategories);
      if (sortedCategories.length > 0) {
        setActiveCategory(sortedCategories[0].name);
      }
      
      // Build menuConfig from dynamic categories
      const dynamicMenuConfig = {};
      sortedCategories.forEach(category => {
        const categoryName = category.name || category.category;
        if (categoryName) {
          dynamicMenuConfig[categoryName] = {
            subCategories: {}
          };
          
          const subcats = category.subcategories || category.subCategories || [];
          if (subcats.length > 0) {
            subcats
              .filter(subCat => subCat.isActive !== false)
              .forEach(subCat => {
                const subCatName = subCat.name || subCat.displayName || subCat;
                if (subCatName) {
                  dynamicMenuConfig[categoryName].subCategories[subCatName] = {
                    sizes: subCat.sizes || []
                  };
                }
              });
          }
        }
      });
      
      setMenuConfig(dynamicMenuConfig);
      console.log('TabletPOS: menuConfig updated:', dynamicMenuConfig);
      
    } catch (error) {
      console.error('Error fetching categories:', error);
      setCategories([]);
    }
  };

  const fetchActiveOrders = async () => {
    try {
      const token = localStorage.getItem('token') || localStorage.getItem('authToken');
      const response = await fetch(`${API_URL}/api/orders`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      const data = await response.json();
      const ordersArray = data.data || [];
      setActiveOrders(ordersArray);
    } catch (error) {
      console.error('Error fetching orders:', error);
      setActiveOrders([]);
    }
  };

  const fetchTakeoutOrders = async () => {
    try {
      const token = localStorage.getItem('token') || localStorage.getItem('authToken');
      
      console.log('[TabletPOS] Fetching takeout orders...');
      
      const response = await fetch(
        `${API_URL}/api/orders/pending-verification?verificationStatus=pending`, // Only get pending orders
        {
          headers: {
            Authorization: `Bearer ${token}`
          }
        }
      );
      
      console.log('[TabletPOS] Takeout orders response status:', response.status);
      
      if (!response.ok) {
        const errorText = await response.text();
        console.error('[TabletPOS] Failed to fetch takeout orders:', errorText);
        throw new Error('Failed to fetch takeout orders');
      }
      
      const data = await response.json();
      const ordersArray = data.data || [];
      
      console.log('[TabletPOS] Takeout orders fetched:', ordersArray.length);
      
      // Filter for takeout/delivery orders only
      const takeoutDeliveryOrders = ordersArray.filter(order => {
        return order.fulfillmentType === 'takeout' || order.fulfillmentType === 'delivery';
      });
      
      console.log('[TabletPOS] Filtered takeout/delivery orders:', takeoutDeliveryOrders.length);
      
      setTakeoutOrders(takeoutDeliveryOrders);
    } catch (error) {
      console.error('[TabletPOS] Error fetching takeout orders:', error);
      setTakeoutOrders([]);
    }
  };

  // Fetch takeout orders when switching to dineTakeout view
  useEffect(() => {
    if (orderViewType === 'dineTakeout') {
      console.log('[TabletPOS] Switched to dineTakeout tab, fetching takeout orders...');
      fetchTakeoutOrders();
    }
  }, [orderViewType]);

  // === CART MANAGEMENT ===
  
  const addToCart = (item) => {
    // Check if item is available
    if (item.isAvailable === false) {
      alert(`${item.name} is currently unavailable due to insufficient ingredients.`);
      return;
    }
    
    // Check if items are locked
    if (isItemLocked()) {
      alert('Cannot add items in this tab. Please switch to Ready Orders or select a pending order to edit.');
      return;
    }

    // Check if item has multiple sizes
    const sizes = Object.keys(item.pricing || {}).filter(key => key !== '_id');
    const hasMultipleSizes = sizes.length > 1;
    
    if (hasMultipleSizes) {
      // Show size selection modal
      setSelectedItemForSize(item);
      setShowSizeModal(true);
      return;
    }
    
    // If only one size, add directly
    const singleSize = sizes.length === 1 ? sizes[0] : 'base';
    const singlePrice = item.pricing[singleSize] || item.pricing.base || Object.values(item.pricing)[0] || 0;

    const currentCart = getActiveCart();
    const existingItem = currentCart.find(i => i._id === item._id && i.selectedSize === singleSize);
    
    if (existingItem) {
      setActiveCart(currentCart.map(i => 
        i._id === item._id && i.selectedSize === singleSize
          ? { ...i, quantity: i.quantity + 1 }
          : i
      ));
    } else {
      setActiveCart([...currentCart, { 
        ...item, 
        quantity: 1, 
        selectedSize: singleSize,
        price: singlePrice,
        availableSizes: sizes.length > 0 ? sizes : ['base'],
        pricing: item.pricing || { [singleSize]: singlePrice }
      }]);
    }
  };

  const addToCartWithSize = (orderItem) => {
    // Ensure availableSizes is set if not provided
    if (!orderItem.availableSizes) {
      const sizes = Object.keys(orderItem.pricing || {}).filter(key => key !== '_id');
      orderItem.availableSizes = sizes.length > 0 ? sizes : ['base'];
    }

    if (isItemLocked()) {
      alert('Cannot add items in this tab. Please switch to Ready Orders or select a pending order to edit.');
      return;
    }

    // If in pending orders view, only allow adding items when editing a pending order
    if (orderViewType === 'pending') {
      if (!isPendingOrderMode) {
        alert('Cannot add items without selecting an order.\n\nPlease click on a pending order to edit it, or switch to the "Ready Orders" tab to create a new order.');
        return;
      }

      // Update pending order items
      const existing = pendingOrderCart.find(
        i => i._id === orderItem._id && i.selectedSize === orderItem.selectedSize
      );

      if (existing) {
        setPendingOrderCart(pendingOrderCart.map(i =>
          i._id === orderItem._id && i.selectedSize === orderItem.selectedSize
            ? { ...i, quantity: i.quantity + orderItem.quantity }
            : i
        ));
      } else {
        setPendingOrderCart([...pendingOrderCart, orderItem]);
      }
      return;
    }

    // Regular order handling (for ready orders)
    const currentCart = getActiveCart();
    const existing = currentCart.find(
      i => i._id === orderItem._id && i.selectedSize === orderItem.selectedSize
    );

    if (existing) {
      setActiveCart(currentCart.map(i =>
        i._id === orderItem._id && i.selectedSize === orderItem.selectedSize
          ? { ...i, quantity: i.quantity + orderItem.quantity }
          : i
      ));
    } else {
      setActiveCart([...currentCart, orderItem]);
    }
    
    setShowSizeModal(false);
    setSelectedItemForSize(null);
  };

  const removeFromCart = (itemId) => {
    const currentCart = getActiveCart();
    setActiveCart(currentCart.filter(item => item._id !== itemId));
  };

  const updateQuantity = (itemId, newQuantity) => {
    if (newQuantity <= 0) {
      removeFromCart(itemId);
    } else {
      const currentCart = getActiveCart();
      setActiveCart(currentCart.map(item =>
        item._id === itemId ? { ...item, quantity: newQuantity } : item
      ));
    }
  };

  // Phase 8: Size update function
  const updateItemSize = (item, newSize) => {
    const currentCart = getActiveCart();
    setActiveCart(
      currentCart.map(i =>
        i._id === item._id && i.selectedSize === item.selectedSize
          ? { ...i, selectedSize: newSize, price: item.pricing?.[newSize] || i.price }
          : i
      )
    );
  };

  // Phase 8: Quantity update function (used by OrderItem component)
  const updateItemQuantity = (item, delta) => {
    const currentCart = getActiveCart();
    setActiveCart(
      currentCart.map(i => {
        if (i._id === item._id && i.size === item.size) {
          const newQuantity = Math.max(1, i.quantity + delta);
          
          // If PWD/Senior discount applied, ensure discounted quantity doesn't exceed total
          if (i.pwdSeniorDiscount?.applied && i.pwdSeniorDiscount.discountedQuantity > newQuantity) {
            return {
              ...i,
              quantity: newQuantity,
              pwdSeniorDiscount: {
                ...i.pwdSeniorDiscount,
                discountedQuantity: newQuantity,
                discountAmount: (i.price * 0.20) * newQuantity
              }
            };
          }
          
          return { ...i, quantity: newQuantity };
        }
        return i;
      })
    );
  };

  // Phase 8: PWD/Senior discount function
  const updateItemDiscount = (item, discountedQuantity) => {
    const currentCart = getActiveCart();
    setActiveCart(
      currentCart.map(i => {
        if (i._id === item._id && i.size === item.size) {
          const discountPerItem = i.price * 0.20; // 20% discount
          
          return {
            ...i,
            pwdSeniorDiscount: {
              applied: discountedQuantity > 0,
              discountedQuantity: discountedQuantity,
              discountAmount: discountPerItem * discountedQuantity
            }
          };
        }
        return i;
      })
    );
  };

  // Phase 8: Item removal with confirmation
  const removeFromCartWithConfirm = (item) => {
    setItemToRemove(item);
    setShowRemoveConfirm(true);
  };

  const confirmRemoveItem = () => {
    if (!itemToRemove) return;
    
    const currentCart = getActiveCart();
    setActiveCart(currentCart.filter(i => 
      !(i._id === itemToRemove._id && i.size === itemToRemove.size)
    ));
    
    setItemToRemove(null);
    setShowRemoveConfirm(false);
  };

  const clearCart = () => {
    if (getActiveCart().length === 0) return;
    setShowClearCartConfirm(true);
  };

  const confirmClearCart = () => {
    setActiveCart([]);
    setShowClearCartConfirm(false);
  };

  const calculateTotal = () => {
    const currentCart = getActiveCart();
    const subtotal = currentCart.reduce((sum, item) => sum + item.price * item.quantity, 0);
    
    // Calculate eligible items subtotal for PWD/Senior discount (20% flat rate)
    const eligibleItemsSubtotal = currentCart.reduce((sum, item) => {
      if (item.pwdSeniorDiscount?.applied) {
        return sum + (item.price * item.quantity);
      }
      return sum;
    }, 0);

    // Apply 20% discount only to eligible items
    const discount = eligibleItemsSubtotal * 0.20;

    // Final total = subtotal - discount
    const total = subtotal - discount;

    return {
      subtotal: subtotal.toFixed(2),
      discount: discount.toFixed(2),
      total: total.toFixed(2)
    };
  };

  // === CHECKOUT & PAYMENT ===
  
  const updatePendingOrderWithPayment = async (paymentDetails) => {
    try {
      const totals = calculateTotal();
      const totalAmount = parseFloat(totals.total);
      
      const currentPaymentMethod = paymentDetails?.method || paymentMethod;
      const cashValue = paymentDetails?.cashAmount || parseFloat(cashAmount) || 0;
      const eWalletInfo = paymentDetails?.eWalletDetails || eWalletDetails;
      const customer = paymentDetails?.customerName || customerName;
      const discountCardsData = paymentDetails?.discountCards || [];
      
      console.log('[TabletPOS updatePendingOrderWithPayment] Payment details:', {
        paymentDetails,
        cashValue,
        totalAmount,
        editingPendingOrder: editingPendingOrder?._id
      });
      
      // Build payment details object
      let paymentDetailsObj = {};
      if (currentPaymentMethod === 'cash') {
        paymentDetailsObj = {
          cashReceived: cashValue,
          change: cashValue - totalAmount
        };
      } else if (currentPaymentMethod === 'e-wallet') {
        paymentDetailsObj = {
          eWalletProvider: eWalletInfo.provider,
          eWalletReferenceNumber: eWalletInfo.referenceNumber,
          eWalletName: eWalletInfo.name
        };
      }
      
      // Update the existing pending order
      const response = await fetch(
        `${API_URL}/api/orders/${editingPendingOrder._id}`,
        {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${localStorage.getItem('token')}`
          },
          body: JSON.stringify({
            status: 'received',
            paymentMethod: currentPaymentMethod,
            customerName: customer || '',
            discountCards: discountCardsData,
            fulfillmentType: 'dine_in',
            totals: {
              subtotal: parseFloat(totals.subtotal),
              discount: parseFloat(totals.discount),
              total: totalAmount,
              ...paymentDetailsObj
            },
            items: pendingOrderCart.map(item => ({
              name: item.name,
              price: item.price,
              quantity: item.quantity,
              selectedSize: item.selectedSize || 'Regular',
              availableSizes: item.availableSizes || ['base'],
              pricing: item.pricing || { base: item.price },
              modifiers: item.modifiers || [],
              pwdSeniorDiscount: item.pwdSeniorDiscount || {
                applied: false,
                discountedQuantity: 0,
                discountAmount: 0,
                vatExempt: false,
                cardType: null,
                cardIdNumber: null
              }
            }))
          })
        }
      );

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to update order');
      }

      const result = await response.json();
      console.log('[TabletPOS updatePendingOrderWithPayment] Server response:', result.data);
      console.log('[TabletPOS updatePendingOrderWithPayment] Totals from server:', result.data?.totals);
      setSavedOrderData(result.data);
      
      // Process cash float transaction if payment method is cash
      if (currentPaymentMethod === 'cash') {
        try {
          await processTransaction(cashValue, totalAmount, `pending_order_${editingPendingOrder._id}`);
          console.log('Pending order cash transaction processed successfully');
        } catch (cashError) {
          console.error('Cash float processing error:', cashError);
        }
      }
      
      // Show receipt and print
      setShowReceipt(true);
      await new Promise(resolve => setTimeout(resolve, 100));
      await handlePrint();
      
      // Remove from active orders list
      setActiveOrders(prev => prev.filter(order => order._id !== editingPendingOrder._id));
      
      // Clear pending order state
      setEditingPendingOrder(null);
      setIsPendingOrderMode(false);
      setPendingOrderCart([]);
      
      // Switch back to ready orders tab
      setOrderViewType('ready');
      
    } catch (error) {
      console.error('[TabletPOS] Error updating pending order:', error);
      alert('Failed to process payment. Please try again.');
    }
  };
  
  const handleCheckout = async (paymentDetails) => {
    try {
      const currentCart = getActiveCart();
      
      if (currentCart.length === 0) {
        alert('Cart is empty');
        return;
      }

      // Check if we're editing a pending order - if so, update it instead of creating new
      if (isPendingOrderMode && editingPendingOrder) {
        await updatePendingOrderWithPayment(paymentDetails);
        return;
      }

      const token = localStorage.getItem('token') || localStorage.getItem('authToken');
      const userData = JSON.parse(localStorage.getItem('userData') || '{}');
      const totals = calculateTotal();
      const totalAmount = parseFloat(totals.total);
      
      // Use payment details from modal
      const currentPaymentMethod = paymentDetails?.method || paymentMethod;
      const cashValue = paymentDetails?.cashAmount || parseFloat(cashAmount) || 0;
      const eWalletInfo = paymentDetails?.eWalletDetails || eWalletDetails;
      const customer = paymentDetails?.customerName || customerName;
      const discountCardsData = paymentDetails?.discountCards || [];
      
      console.log('[TabletPOS handleCheckout] Payment details:', {
        paymentDetails,
        cashValue,
        cashAmount,
        currentPaymentMethod,
        totalAmount,
        isPendingOrderMode,
        editingPendingOrder: editingPendingOrder?._id
      });
      
      // Build payment details object
      let paymentDetailsObj = {};
      if (currentPaymentMethod === 'cash') {
        paymentDetailsObj = {
          cashReceived: cashValue,
          change: cashValue - totalAmount
        };
      } else if (currentPaymentMethod === 'e-wallet') {
        paymentDetailsObj = {
          eWalletProvider: eWalletInfo.provider,
          eWalletReferenceNumber: eWalletInfo.referenceNumber,
          eWalletName: eWalletInfo.name
        };
      }
      
      const orderData = {
        items: currentCart.map(item => ({
          name: item.name,
          price: item.price,
          quantity: item.quantity,
          selectedSize: item.selectedSize || 'Regular',
          availableSizes: item.availableSizes || ['base'],
          pricing: item.pricing || { base: item.price },
          modifiers: item.modifiers || [],
          pwdSeniorDiscount: item.pwdSeniorDiscount || {
            applied: false,
            discountedQuantity: 0,
            discountAmount: 0,
            vatExempt: false,
            cardType: null,
            cardIdNumber: null
          }
        })),
        totals: {
          subtotal: parseFloat(totals.subtotal),
          discount: parseFloat(totals.discount),
          total: totalAmount,
          ...paymentDetailsObj
        },
        paymentMethod: currentPaymentMethod,
        paymentDetails: paymentDetailsObj,
        customerName: customer || '',
        discountCards: discountCardsData,
        status: 'received',
        orderType: 'pos',
        fulfillmentType: 'dine_in',
        server: userData.username || ''
      };

      const response = await fetch(`${API_URL}/api/orders`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify(orderData)
      });

      const result = await response.json();

      if (response.ok && result.success) {
        console.log('[TabletPOS handleCheckout] Server response:', result.data);
        console.log('[TabletPOS handleCheckout] Totals from server:', result.data?.totals);
        // Save order data for receipt
        setSavedOrderData(result.data);
        
        // Process cash float transaction if payment method is cash
        if (currentPaymentMethod === 'cash') {
          try {
            await processTransaction(cashValue, totalAmount, 'pos_order');
            console.log('Cash transaction processed successfully');
          } catch (cashError) {
            console.error('Cash float processing error:', cashError);
            // Don't block order - cash float is optional
          }
        }
        
        // Show receipt and print
        setShowReceipt(true);
        await new Promise(resolve => setTimeout(resolve, 100));
        await handlePrint();
        
        // Create inventory reservation for items with ingredient mappings
        if (result.data?._id) {
          try {
            const userData = localStorage.getItem('userData');
            const user = userData ? JSON.parse(userData) : null;
            
            const reservationResponse = await fetch(`${API_URL}/api/inventory/reserve`, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
              },
              body: JSON.stringify({
                orderId: result.data._id,
                items: currentCart.map(item => ({
                  menuItemId: item._id,
                  quantity: item.quantity,
                  name: item.name
                })),
                reservedBy: user?.id || 'system'
              })
            });
            
            const reservationData = await reservationResponse.json();
            console.log('[TabletPOS] Reservation API Response:', reservationData);
            
            if (reservationResponse.ok && reservationData.success) {
              console.log('[TabletPOS] Inventory reservation created for order:', result.data._id);
            } else {
              console.warn('[TabletPOS] Inventory reservation failed:', reservationData);
            }
          } catch (invError) {
            console.error('[TabletPOS] Inventory reservation error:', invError);
            // Don't block order - ingredient tracking is optional
          }
        }
        
        // Clear cart
        setActiveCart([]);
        
        // Reset payment details
        setCustomerName('');
        setEWalletDetails({ provider: 'gcash', referenceNumber: '', name: '' });
        setDiscountCardDetails({ cardType: 'PWD', cardIdNumber: '' });
        setPaymentMethod('cash');
        setCashAmount(0);
        
        // Refresh orders
        fetchActiveOrders();
        
        // Close receipt
        setShowReceipt(false);
        
        // Close payment modal
        setShowPaymentProcessingModal(false);
        
        alert('Order placed successfully!');
      } else {
        throw new Error(result.message || 'Failed to create order');
      }
    } catch (error) {
      console.error('Error placing order:', error);
      alert(`Failed to place order: ${error.message}`);
    }
  };

  // === PAYMENT VERIFICATION FUNCTIONS ===
  
  const handleQuickVerify = async (orderId, notes = '') => {
    try {
      const token = localStorage.getItem('token') || localStorage.getItem('authToken');
      
      console.log('[TabletPOS] Verifying payment for order:', orderId);
      
      // Step 1: Verify the payment (this also changes status to 'received')
      const verifyResponse = await fetch(
        `${API_URL}/api/orders/${orderId}/verify-payment`,
        {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`
          },
          body: JSON.stringify({ notes })
        }
      );

      if (!verifyResponse.ok) {
        const errorData = await verifyResponse.json();
        throw new Error(errorData.message || 'Failed to verify payment');
      }

      const verifiedOrder = await verifyResponse.json();
      console.log('[TabletPOS] Payment verified successfully:', verifiedOrder);

      // Step 2: Get the full order details for receipt generation
      const orderResponse = await fetch(`${API_URL}/api/orders/${orderId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });

      if (orderResponse.ok) {
        const orderData = await orderResponse.json();
        const fullOrder = orderData.data || orderData;

        console.log('[TabletPOS] Fetched order for receipt:', fullOrder);

        // Set up order data for receipt
        setSavedOrderData(fullOrder);

        // Step 3: Generate and print receipt
        setShowReceipt(true);
        await new Promise(resolve => setTimeout(resolve, 100));
        await handlePrint();
        
        // Close receipt after printing
        setShowReceipt(false);
      } else {
        console.warn('[TabletPOS] Failed to fetch order details for receipt');
      }

      // Step 4: Refresh orders and remove from takeout list
      fetchActiveOrders();
      fetchTakeoutOrders(); // Refresh dine/takeout tab
      
      alert('Payment verified! Order has been added to the queue. Receipt printed.');
    } catch (error) {
      console.error('[TabletPOS] Error verifying payment:', error);
      alert(`Failed to verify payment: ${error.message}`);
    }
  };

  // Process PayMongo order (generate receipt and move to kitchen)
  const handleProcessPayMongoOrder = async (orderId) => {
    try {
      console.log('[TabletPOS] Processing PayMongo order:', orderId);
      
      const token = localStorage.getItem('token') || localStorage.getItem('authToken');
      
      const response = await fetch(`${API_URL}/api/orders/${orderId}/process-paymongo`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        }
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to process PayMongo order');
      }

      const result = await response.json();
      console.log('[TabletPOS] PayMongo order processed successfully:', result);

      // Refresh orders
      fetchActiveOrders();
      fetchTakeoutOrders();
      
      alert('PayMongo order processed! Receipt can be generated and order moved to kitchen.');
    } catch (error) {
      console.error('[TabletPOS] Error processing PayMongo order:', error);
      alert(`Failed to process PayMongo order: ${error.message}`);
    }
  };

  const handleQuickReject = async (orderId, reason = '') => {
    if (!reason) {
      reason = prompt('Enter reason for rejection (optional):') || 'Invalid payment proof';
    }
    
    try {
      const token = localStorage.getItem('token') || localStorage.getItem('authToken');
      
      const response = await fetch(
        `${API_URL}/api/orders/${orderId}/reject-payment`,
        {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`
          },
          body: JSON.stringify({ reason })
        }
      );

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to reject payment');
      }

      // Refresh orders list
      fetchActiveOrders();
      
      alert('Payment rejected. Customer will be notified.');
    } catch (error) {
      console.error('Error rejecting payment:', error);
      alert(`Failed to reject payment: ${error.message}`);
    }
  };

  // === ORDER MANAGEMENT FUNCTIONS ===
  
  const loadPendingOrderForEdit = (order) => {
    setEditingPendingOrder(order);
    setIsPendingOrderMode(true);
    setPendingOrderCart(order.items.map(item => {
      // Handle both populated and non-populated menuItem references
      const menuItemId = typeof item.menuItem === 'object' && item.menuItem?._id 
        ? item.menuItem._id 
        : item.menuItem;
      
      return {
        ...item,
        _id: menuItemId || item._id,
        name: item.name,
        price: item.price,
        quantity: item.quantity,
        selectedSize: item.selectedSize || item.size || 'base',
        availableSizes: Object.keys(item.pricing || { base: item.price }),
        pricing: item.pricing || { base: item.price }
      };
    }));
    setOrderViewType('pending');
  };

  const deletePendingOrder = async (orderId) => {
    if (!confirm('Are you sure you want to delete this pending order? This action cannot be undone.')) {
      return;
    }

    try {
      const response = await fetch(
        `${API_URL}/api/orders/${orderId}`,
        {
          method: 'DELETE',
          headers: {
            Authorization: `Bearer ${localStorage.getItem('token')}`,
            'Content-Type': 'application/json'
          }
        }
      );

      if (!response.ok) {
        throw new Error('Failed to delete order');
      }

      // Remove from activeOrders state
      setActiveOrders(prev => prev.filter(order => order._id !== orderId));
      
      // If this was the order being edited, clear the edit state
      if (editingPendingOrder?._id === orderId) {
        setEditingPendingOrder(null);
        setIsPendingOrderMode(false);
        setPendingOrderCart([]);
      }

      alert('Pending order deleted successfully');
    } catch (error) {
      console.error('Error deleting order:', error);
      alert('Failed to delete order');
    }
  };

  const updatePendingOrder = async () => {
    if (!editingPendingOrder) return;

    try {
      const token = localStorage.getItem('token') || localStorage.getItem('authToken');
      const response = await fetch(`${API_URL}/api/orders/${editingPendingOrder._id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          items: pendingOrderCart.map(item => ({
            menuItem: item._id,
            name: item.name,
            quantity: item.quantity,
            price: item.price,
            size: item.size || 'Regular',
            pwdSeniorDiscount: item.pwdSeniorDiscount || {
              applied: false,
              discountedQuantity: 0,
              discountAmount: 0
            }
          })),
          total: parseFloat(calculateTotal().total)
        })
      });

      if (response.ok) {
        alert('Order updated successfully');
        setEditingPendingOrder(null);
        setIsPendingOrderMode(false);
        setPendingOrderCart([]);
        setOrderViewType('ready');
        fetchActiveOrders();
      } else {
        throw new Error('Failed to update order');
      }
    } catch (error) {
      console.error('Error updating order:', error);
      alert('Failed to update order');
    }
  };

  const cancelPendingOrderEdit = () => {
    if (confirm('Cancel editing? Changes will be lost.')) {
      setEditingPendingOrder(null);
      setIsPendingOrderMode(false);
      setPendingOrderCart([]);
      setOrderViewType('ready');
    }
  };

  // Filter menu items (show all items including unavailable - matching original POS)
  const filteredItems = menuItems.filter(item => {
    const matchesCategory = !activeCategory || item.category === activeCategory;
    const matchesSearch = !searchTerm || 
      item.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.code.toLowerCase().includes(searchTerm.toLowerCase());
    
    // Handle subcategory filtering
    let matchesSubCategory = true;
    if (activeCategory === 'Meals' && selectedMealSubCategory) {
      matchesSubCategory = item.subCategory === selectedMealSubCategory;
    } else if (activeCategory === 'Beverages' && selectedBeverageSubCategory) {
      matchesSubCategory = item.subCategory === selectedBeverageSubCategory;
    }
    
    return matchesCategory && matchesSearch && matchesSubCategory;
  });

  // === RENDER ===
  
  // Loading screen
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: theme.colors.background }}>
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-4 mx-auto mb-4" 
               style={{ borderColor: theme.colors.primary }} />
          <p className="text-lg font-semibold" style={{ color: theme.colors.primary }}>
            Loading POS...
          </p>
        </div>
      </div>
    );
  }

  // Error screen
  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: theme.colors.background }}>
        <div className="text-center max-w-md p-8">
          <div className="text-6xl mb-4">⚠️</div>
          <h2 className="text-2xl font-bold mb-2" style={{ color: theme.colors.primary }}>
            Error Loading POS
          </h2>
          <p className="text-gray-600 mb-6">{error}</p>
          <button
            onClick={() => window.location.reload()}
            className="px-6 py-3 rounded-lg font-semibold text-white"
            style={{ backgroundColor: theme.colors.primary }}
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {showTimeClock ? (
        <TimeClockInterface onClose={() => setShowTimeClock(false)} />
      ) : (
        <div className="flex flex-col h-screen">
          {/* Header with Order Tabs */}
          <div className="bg-white shadow-md">
            <div className="p-4 flex items-center justify-between border-b">
              <div className="flex items-center gap-4">
                <h1 className="text-2xl font-bold" style={{ color: theme.colors.primary }}>
                  Ring & Wing POS - Tablet
                </h1>
                {/* Cash Float Display */}
                {isManager && (
                  <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg" style={{ backgroundColor: `${theme.colors.accent}20`, border: `1px solid ${theme.colors.accent}` }}>
                    <PesoIconSimple width={18} height={18} style={{ color: theme.colors.accent }} />
                    <div className="flex flex-col">
                      <span className="text-xs font-medium" style={{ color: theme.colors.muted }}>Cash Float</span>
                      <span className="text-base font-bold" style={{ color: theme.colors.accent }}>
                        ₱{formatCurrency(cashFloat)}
                      </span>
                    </div>
                  </div>
                )}
              </div>
              <div className="flex gap-2">
                {isManager && (
                  <>
                    <button
                      onClick={() => setShowCashFloatModal(true)}
                      className="flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-gray-100 transition-colors"
                      style={{ color: theme.colors.primary, border: `1px solid ${theme.colors.muted}` }}
                      title="Manage Cash Float"
                    >
                      <PesoIconSimple width={20} height={20} />
                      <span className="text-sm font-medium hidden md:inline">Cash Float</span>
                    </button>
                    <button
                      onClick={() => setShowEndOfShiftModal(true)}
                      className="flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-gray-100 transition-colors"
                      style={{ color: theme.colors.primary, border: `1px solid ${theme.colors.muted}` }}
                      title="End of Shift"
                    >
                      <FiPieChart size={20} />
                      <span className="text-sm font-medium hidden md:inline">End Shift</span>
                    </button>
                  </>
                )}
                <button
                  onClick={() => setShowTimeClock(true)}
                  className="flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-gray-100 transition-colors"
                  style={{ color: theme.colors.primary, border: `1px solid ${theme.colors.muted}` }}
                  title="Time Clock"
                >
                  <FiClock size={20} />
                  <span className="text-sm font-medium hidden md:inline">Time Clock</span>
                </button>
                <button
                  onClick={() => setShowOrderProcessingModal(true)}
                  className="p-2 rounded-lg hover:bg-gray-100 relative"
                  style={{ color: theme.colors.primary }}
                  title="Kitchen Orders"
                >
                  <FiCoffee size={24} />
                  {activeOrders.filter(o => ['received', 'preparing', 'ready'].includes(o.status)).length > 0 && (
                    <span className="absolute -top-1 -right-1 bg-orange-500 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center">
                      {activeOrders.filter(o => ['received', 'preparing', 'ready'].includes(o.status)).length}
                    </span>
                  )}
                </button>
              </div>
            </div>
            
            {/* Search Bar and Order View Tabs */}
            <div className="flex justify-between items-center gap-4 px-4 py-3 bg-gray-50">
              {/* Left: Search Bar */}
              <div className="flex-1 max-w-md">
                <SearchBar
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="Search menu..."
                />
              </div>

              {/* Right: Three Order Tabs */}
              <div className="flex gap-2">
                <button
                  className={`px-6 py-2 rounded-lg font-semibold text-sm transition-all ${
                    orderViewType === 'ready' 
                      ? 'text-white shadow-md' 
                      : 'bg-white text-gray-600 hover:bg-gray-100'
                  }`}
                  style={{
                    backgroundColor: orderViewType === 'ready' ? theme.colors.primary : undefined
                  }}
                  onClick={() => {
                    setOrderViewType('ready');
                    setIsPendingOrderMode(false);
                    setEditingPendingOrder(null);
                    setPendingOrderCart([]);
                  }}
                >
                  Ready Orders
                </button>
              <button
                className={`px-6 py-2 rounded-lg font-semibold text-sm transition-all ${
                  orderViewType === 'pending' 
                    ? 'text-white shadow-md' 
                    : 'bg-white text-gray-600 hover:bg-gray-100'
                }`}
                style={{
                  backgroundColor: orderViewType === 'pending' ? theme.colors.primary : undefined
                }}
                onClick={() => {
                  setOrderViewType('pending');
                  if (!isPendingOrderMode) {
                    setEditingPendingOrder(null);
                    setPendingOrderCart([]);
                  }
                }}
              >
                Pending Orders
                {activeOrders.filter(o => o.status === 'pending').length > 0 && (
                  <span className="ml-2 bg-orange-500 text-white text-xs font-bold rounded-full px-2 py-0.5">
                    {activeOrders.filter(o => o.status === 'pending').length}
                  </span>
                )}
              </button>
              <button
                className={`px-6 py-2 rounded-lg font-semibold text-sm transition-all ${
                  orderViewType === 'dineTakeout' 
                    ? 'text-white shadow-md' 
                    : 'bg-white text-gray-600 hover:bg-gray-100'
                }`}
                style={{
                  backgroundColor: orderViewType === 'dineTakeout' ? theme.colors.primary : undefined
                }}
                onClick={() => {
                  setOrderViewType('dineTakeout');
                  setIsPendingOrderMode(false);
                  setEditingPendingOrder(null);
                  setPendingOrderCart([]);
                }}
              >
                Dine/Take-out
                {activeOrders.filter(o => o.status === 'awaiting_payment').length > 0 && (
                  <span className="ml-2 bg-blue-500 text-white text-xs font-bold rounded-full px-2 py-0.5">
                    {activeOrders.filter(o => o.status === 'awaiting_payment').length}
                  </span>
                )}
              </button>
              </div>
            </div>
          </div>

          {/* Main Content - Horizontal Split */}
          <div className="flex-1 flex overflow-hidden">
            {/* Menu Section - Left 60% */}
            <div className="flex-[6] flex flex-col overflow-hidden">
              
              {/* Navigation: Two-Row Category/Subcategory Selector */}
              <div className="flex-shrink-0 bg-gradient-to-r from-orange-50 to-red-50 border-b-2 border-orange-200">
                
                {/* ROW 1: Main Category Selector */}
                <div className="px-4 pt-3 pb-2">
                  <div className="flex items-center gap-2 overflow-x-auto scrollbar-thin scrollbar-thumb-orange-300 scrollbar-track-transparent pb-2">
                    {categories.map(category => (
                      <button
                        key={category._id}
                        onClick={() => {
                          setActiveCategory(category.name);
                          // Reset subcategory when changing main category
                          if (category.name === 'Meals') {
                            setSelectedMealSubCategory(null);
                          } else if (category.name === 'Beverages') {
                            setSelectedBeverageSubCategory(null);
                          }
                        }}
                        className="flex-shrink-0 px-6 py-2.5 rounded-lg font-bold text-sm shadow-md transition-all transform hover:scale-105"
                        style={{
                          backgroundColor: activeCategory === category.name 
                            ? theme.colors.primary 
                            : 'white',
                          color: activeCategory === category.name 
                            ? 'white' 
                            : theme.colors.primary,
                          border: activeCategory === category.name 
                            ? `2px solid ${theme.colors.primary}`
                            : '2px solid #e5e7eb'
                        }}
                      >
                        {category.name}
                      </button>
                    ))}
                  </div>
                </div>

                {/* ROW 2: Subcategory Selector - Dynamic from menuConfig */}
                {activeCategory && menuConfig[activeCategory] && Object.keys(menuConfig[activeCategory].subCategories).length > 0 && (
                  <div className="px-4 pb-3">
                    <div className="bg-white rounded-lg shadow-sm border border-orange-200 px-3 py-2">
                      <div className="flex items-center gap-2 overflow-x-auto scrollbar-thin scrollbar-thumb-orange-300 scrollbar-track-transparent">
                        {/* Label */}
                        <span className="flex-shrink-0 text-xs font-semibold text-gray-500 uppercase tracking-wide mr-1">
                          Filter:
                        </span>
                        
                        {/* "All" Button */}
                        <button
                          onClick={() => {
                            if (activeCategory === 'Meals') {
                              setSelectedMealSubCategory(null);
                            } else if (activeCategory === 'Beverages') {
                              setSelectedBeverageSubCategory(null);
                            }
                          }}
                          className={`flex-shrink-0 text-xs px-4 py-1.5 rounded-full font-semibold transition-all ${
                            (activeCategory === 'Meals' && !selectedMealSubCategory) || 
                            (activeCategory === 'Beverages' && !selectedBeverageSubCategory)
                              ? 'bg-orange-500 text-white shadow-md scale-105' 
                              : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                          }`}
                        >
                          All {activeCategory}
                        </button>
                        
                        {/* Subcategory Buttons */}
                        {Object.keys(menuConfig[activeCategory].subCategories).map(subCat => {
                          const isSelected = activeCategory === 'Meals' 
                            ? selectedMealSubCategory === subCat 
                            : selectedBeverageSubCategory === subCat;
                          
                          return (
                            <button
                              key={subCat}
                              onClick={() => {
                                if (activeCategory === 'Meals') {
                                  setSelectedMealSubCategory(subCat);
                                } else if (activeCategory === 'Beverages') {
                                  setSelectedBeverageSubCategory(subCat);
                                }
                              }}
                              className={`flex-shrink-0 text-xs px-4 py-1.5 rounded-full font-semibold transition-all ${
                                isSelected
                                  ? 'bg-orange-500 text-white shadow-md scale-105' 
                                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                              }`}
                            >
                              {subCat}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Menu Items Grid - 3 columns for tablets */}
              <div className="flex-1 overflow-auto p-4">
                <div className="grid grid-cols-3 gap-3">
                  {filteredItems.map(item => {
                    // Determine if item is locked due to tab restrictions
                    const isLockedDueToTab = 
                      orderViewType === 'dineTakeout' || 
                      (orderViewType === 'pending' && !isPendingOrderMode);
                    
                    const isItemUnavailable = item.isAvailable === false;
                    const isDisabled = isItemUnavailable || isLockedDueToTab;
                    
                    return (
                      <MenuItemCard
                        key={item._id}
                        item={item}
                        onClick={() => !isDisabled ? addToCart(item) : null}
                        isUnavailable={isItemUnavailable}
                        isLocked={isLockedDueToTab}
                      />
                    );
                  })}
                </div>
              </div>
            </div>

            {/* Order Panel - Right 40% */}
            <div className="flex-[4] bg-white shadow-lg p-4 flex flex-col border-l">
              {/* Order Tab Header */}
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-bold" style={{ color: theme.colors.primary }}>
                  {orderViewType === 'pending' && isPendingOrderMode ? 'Editing Order' : 
                   orderViewType === 'dineTakeout' ? 'Awaiting Payment' : 
                   orderViewType === 'pending' ? 'Pending Orders' : 'Current Order'}
                </h2>
                {editingPendingOrder && (
                  <button
                    onClick={cancelPendingOrderEdit}
                    className="text-sm px-3 py-1 rounded-lg bg-gray-200 hover:bg-gray-300"
                  >
                    Cancel Edit
                  </button>
                )}
              </div>

              {/* PENDING ORDERS TAB - Show list of pending orders */}
              {orderViewType === 'pending' && !isPendingOrderMode ? (
                <div className="flex-1 overflow-auto">
                  {activeOrders.filter(o => o.status === 'pending').length === 0 ? (
                    <div className="text-center text-gray-400 mt-8">
                      <p>No pending orders</p>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {activeOrders
                        .filter(o => o.status === 'pending')
                        .map(order => (
                          <div key={order._id} className="bg-gray-50 p-4 rounded-lg border-2 border-gray-200 hover:border-orange-300 transition-colors">
                            <div className="flex justify-between items-start mb-2">
                              <div>
                                <p className="font-bold text-lg">Order #{order.receiptNumber || order._id?.substring(0, 6)}</p>
                                <p className="text-sm text-gray-600">
                                  {order.items?.length || 0} items • ₱{order.totals?.total?.toFixed(2) || '0.00'}
                                </p>
                                <p className="text-xs text-gray-500 mt-1">
                                  {new Date(order.createdAt).toLocaleString()}
                                </p>
                              </div>
                              <span className="text-xs px-2 py-1 bg-yellow-100 text-yellow-800 rounded-full font-semibold">
                                PENDING
                              </span>
                            </div>
                            <div className="flex gap-2 mt-3">
                              <button
                                onClick={() => loadPendingOrderForEdit(order)}
                                className="flex-1 py-2 rounded-lg font-semibold text-white"
                                style={{ backgroundColor: theme.colors.primary }}
                              >
                                Edit Order
                              </button>
                              <button
                                onClick={() => deletePendingOrder(order._id)}
                                className="px-4 py-2 rounded-lg font-semibold bg-red-500 text-white hover:bg-red-600"
                              >
                                Delete
                              </button>
                            </div>
                          </div>
                        ))}
                    </div>
                  )}
                </div>
              
              ) : orderViewType === 'dineTakeout' ? (
                /* DINE/TAKE-OUT TAB - Show orders awaiting payment verification */
                <div className="flex-1 overflow-auto p-4">
                  {takeoutOrders.length === 0 ? (
                    <div className="text-center text-gray-400 mt-8">
                      <p className="text-lg font-semibold mb-2">No orders awaiting payment</p>
                      <p className="text-sm">Takeout and delivery orders will appear here for verification (manual payments) or receipt generation (PayMongo payments)</p>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {takeoutOrders.map(order => {
                        const isExpiringSoon = order.proofOfPayment?.expiresAt && 
                          new Date(order.proofOfPayment.expiresAt) - new Date() < 5 * 60 * 1000;
                        const isExpired = order.proofOfPayment?.expiresAt && 
                          new Date(order.proofOfPayment.expiresAt) < new Date();
                        
                        return (
                          <div 
                            key={order._id} 
                            className={`p-4 rounded-lg border-2 shadow-sm ${
                              isExpired ? 'bg-red-50 border-red-300' : 
                              isExpiringSoon ? 'bg-yellow-50 border-yellow-300' : 
                              'bg-blue-50 border-blue-200'
                            }`}
                          >
                            <div className="flex justify-between items-start mb-3">
                              <div className="flex-1">
                                <p className="font-bold text-lg" style={{ color: theme.colors.primary }}>
                                  #{order.receiptNumber}
                                </p>
                                <p className="text-sm text-gray-600 mt-1">
                                  {order.fulfillmentType === 'delivery' ? 'Delivery' : 'Takeout'} • 
                                  {order.isPayMongoOrder ? 
                                    ' PayMongo' :
                                    (order.paymentMethod === 'gcash' ? ' GCash' : order.paymentMethod === 'paymaya' ? ' PayMaya' : ' E-Wallet')
                                  } • 
                                  ₱{order.totals?.total?.toFixed(2) || '0.00'}
                                </p>
                                {order.isPayMongoOrder ? (
                                  <p className="text-xs text-green-600 mt-1 font-semibold">
                                    ✓ Payment Verified by PayMongo
                                  </p>
                                ) : (
                                  <>
                                    {order.proofOfPayment?.transactionReference && (
                                      <p className="text-xs text-gray-500 mt-1">
                                        Ref: {order.proofOfPayment.transactionReference}
                                      </p>
                                    )}
                                    {order.proofOfPayment?.accountName && (
                                      <p className="text-xs text-gray-500">
                                        {order.proofOfPayment.accountName}
                                      </p>
                                    )}
                                  </>
                                )}
                              </div>
                              <div className="text-right">
                                {order.isPayMongoOrder ? (
                                  <span className="text-xs px-3 py-1 rounded-full font-semibold bg-green-100 text-green-700">
                                    PAID
                                  </span>
                                ) : (
                                  <>
                                    <span className={`text-xs px-3 py-1 rounded-full font-semibold ${
                                      isExpired ? 'bg-red-100 text-red-700' :
                                      isExpiringSoon ? 'bg-yellow-100 text-yellow-700' :
                                      'bg-blue-100 text-blue-700'
                                    }`}>
                                      {isExpired ? 'EXPIRED' : 'Pending'}
                                    </span>
                                    {order.proofOfPayment?.expiresAt && !isExpired && (
                                      <p className="text-xs mt-1 text-gray-500">
                                        Expires: {new Date(order.proofOfPayment.expiresAt).toLocaleTimeString()}
                                      </p>
                                    )}
                                  </>
                                )}
                              </div>
                            </div>
                            {order.isPayMongoOrder ? (
                              <button
                                onClick={() => handleProcessPayMongoOrder(order._id)}
                                className="w-full py-2.5 rounded-lg font-semibold transition-colors shadow-md"
                                style={{
                                  backgroundColor: theme.colors.success || '#10b981',
                                  color: 'white'
                                }}
                              >
                                Generate Receipt & Process
                              </button>
                            ) : (
                              <button
                                onClick={() => {
                                  setSelectedVerificationOrder(order);
                                  setShowVerificationModal(true);
                                }}
                                className="w-full py-2.5 rounded-lg font-semibold transition-colors shadow-md"
                                style={{
                                  backgroundColor: theme.colors.primary,
                                  color: 'white'
                                }}
                              >
                                Verify Payment
                              </button>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              
              ) : (
                /* READY ORDERS TAB or EDITING MODE - Show cart */
                <>
                  <div className="flex-1 overflow-auto mb-4">
                    {getActiveCart().length === 0 ? (
                      <div className="text-center text-gray-400 mt-8">
                        <p>No items in cart</p>
                      </div>
                    ) : (
                      <div className="space-y-2">
                        {getActiveCart().map((item, index) => (
                          <OrderItem
                            key={`${item._id}-${item.size}-${index}`}
                            item={item}
                            onVoid={removeFromCartWithConfirm}
                            onUpdateSize={updateItemSize}
                            onUpdateQuantity={updateItemQuantity}
                            onDiscountUpdate={updateItemDiscount}
                          />
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Payment Panel */}
                  <PaymentPanel
                    total={calculateTotal().total}
                    subtotal={calculateTotal().subtotal}
                    discount={calculateTotal().discount}
                    cashFloat={cashFloat}
                    onProcessPayment={() => setShowPaymentProcessingModal(true)}
                    onCancelOrder={() => {
                      if (isPendingOrderMode) {
                        cancelPendingOrderEdit();
                      } else {
                        clearCart();
                      }
                    }}
                    disabled={getActiveCart().length === 0}
                  />
                </>
              )}
            </div>
          </div>
        </div>
      )}

      {/* === MODALS === */}
      
      {/* Order Processing Modal */}
      {showOrderProcessingModal && (
        <OrderProcessingModal
          onClose={() => setShowOrderProcessingModal(false)}
          orders={activeOrders}
          onUpdateOrder={fetchActiveOrders}
          theme={theme}
        />
      )}

      {/* Cash Float Modal */}
      {showCashFloatModal && isManager && (
        <CashFloatModal
          isOpen={showCashFloatModal}
          onClose={() => setShowCashFloatModal(false)}
          initialCashFloat={cashFloat}
          onSave={async (floatData) => {
            try {
              if (floatData.manualAmount) {
                await setFloat(parseFloat(floatData.manualAmount), 'manual_adjustment');
              }
              if (floatData.resetDaily) {
                await configureDailyReset(floatData.resetDaily, parseFloat(floatData.resetAmount));
              }
              setShowCashFloatModal(false);
            } catch (error) {
              console.error('[TabletPOS] Error saving cash float:', error);
              alert('Failed to save cash float settings');
            }
          }}
          theme={theme}
        />
      )}

      {/* End of Shift Modal */}
      {showEndOfShiftModal && isManager && (
        <EndOfShiftModal
          isOpen={showEndOfShiftModal}
          cashFloat={cashFloat}
          onClose={() => setShowEndOfShiftModal(false)}
          theme={theme}
        />
      )}

      {/* Size Selection Modal */}
      {showSizeModal && selectedItemForSize && (
        <SizeSelectionModal
          item={selectedItemForSize}
          onClose={() => {
            setShowSizeModal(false);
            setSelectedItemForSize(null);
          }}
          onSelectSize={(orderItem) => {
            addToCartWithSize(orderItem);
            setShowSizeModal(false);
            setSelectedItemForSize(null);
          }}
        />
      )}

      {/* Payment Processing Modal */}
      {showPaymentProcessingModal && (
        <PaymentProcessingModal
          isOpen={showPaymentProcessingModal}
          onClose={() => setShowPaymentProcessingModal(false)}
          total={calculateTotal().total}
          subtotal={calculateTotal().subtotal}
          discount={calculateTotal().discount}
          cashFloat={cashFloat}
          onProcessPayment={async (paymentDetails) => {
            try {
              // Update the state with payment details
              setPaymentMethod(paymentDetails.method);
              setCashAmount(paymentDetails.cashAmount);
              setEWalletDetails(paymentDetails.eWalletDetails || { provider: 'gcash', referenceNumber: '', name: '' });
              setCustomerName(paymentDetails.customerName);
              // Store discount cards
              if (paymentDetails.discountCards) {
                setDiscountCardDetails({ discountCards: paymentDetails.discountCards });
              }

              // Process the payment with payment details
              await handleCheckout(paymentDetails);
            } catch (error) {
              console.error('Payment processing error:', error);
              throw error;
            }
          }}
          eWalletDetails={eWalletDetails}
          onEWalletDetailsChange={setEWalletDetails}
          customerName={customerName}
          onCustomerNameChange={setCustomerName}
          orderItems={getActiveCart()}
        />
      )}

      {/* Payment Verification Modal */}
      {showVerificationModal && selectedVerificationOrder && (
        <Modal 
          isOpen={showVerificationModal} 
          onClose={() => {
            setShowVerificationModal(false);
            setSelectedVerificationOrder(null);
            setExpandedImage(false);
          }}
          size="lg"
          footer={
            <div className="flex gap-3">
              <button 
                onClick={() => {
                  handleQuickVerify(selectedVerificationOrder._id);
                  setShowVerificationModal(false);
                }}
                className="flex-1 px-6 py-3 bg-green-600 text-white rounded-lg font-medium hover:bg-green-700 transition-colors"
              >
                Verify Payment
              </button>
              <button 
                onClick={() => {
                  handleQuickReject(selectedVerificationOrder._id);
                  setShowVerificationModal(false);
                }}
                className="flex-1 px-6 py-3 bg-red-600 text-white rounded-lg font-medium hover:bg-red-700 transition-colors"
              >
                Reject Payment
              </button>
            </div>
          }
        >
          <div className="space-y-4">
            {/* Order Header with Receipt Number */}
            <div className="flex items-center justify-between">
              <h2 className="text-2xl font-bold text-gray-900">
                Order #{selectedVerificationOrder.receiptNumber}
              </h2>
              
              {/* 1x1 Thumbnail Image - Top Right */}
              {selectedVerificationOrder.proofOfPayment?.imageUrl && (
                <img 
                  src={`${API_URL}${selectedVerificationOrder.proofOfPayment.imageUrl}`}
                  alt="Payment Proof"
                  className="w-20 h-20 object-cover rounded border-2 border-gray-300 cursor-pointer hover:border-blue-500 transition-colors"
                  onClick={() => setExpandedImage(!expandedImage)}
                  title="Click to expand"
                />
              )}
            </div>
            
            {/* Expanded Image Overlay */}
            {expandedImage && selectedVerificationOrder.proofOfPayment?.imageUrl && (
              <div 
                className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-[200] cursor-pointer"
                onClick={() => setExpandedImage(false)}
              >
                <div className="relative max-w-4xl max-h-[90vh] p-4">
                  <img 
                    src={`${API_URL}${selectedVerificationOrder.proofOfPayment.imageUrl}`}
                    alt="Payment Proof - Full Size"
                    className="max-w-full max-h-[90vh] object-contain rounded-lg shadow-2xl"
                  />
                  <button 
                    className="absolute top-2 right-2 bg-white text-gray-800 px-4 py-2 rounded-full font-medium hover:bg-gray-100 transition-colors"
                    onClick={(e) => {
                      e.stopPropagation();
                      setExpandedImage(false);
                    }}
                  >
                    Close
                  </button>
                </div>
              </div>
            )}
            
            {/* Payment Details Section */}
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 space-y-2">
              <h3 className="font-semibold text-blue-900 mb-2">Payment Details</h3>
              <div className="grid grid-cols-2 gap-2 text-sm">
                <div className="text-gray-600">Account Name:</div>
                <div className="font-medium text-gray-900">
                  {selectedVerificationOrder.proofOfPayment?.accountName || 'N/A'}
                </div>
                <div className="text-gray-600">Reference #:</div>
                <div className="font-medium text-gray-900">
                  {selectedVerificationOrder.proofOfPayment?.transactionReference || 'N/A'}
                </div>
              </div>
            </div>
            
            {/* Order Summary */}
            <div className="bg-gray-50 p-4 rounded-lg">
              <h3 className="font-semibold text-gray-900 mb-3">Order Summary</h3>
              <div className="grid grid-cols-2 gap-2 text-sm">
                <div className="text-gray-600">Amount:</div>
                <div className="font-bold text-gray-900">
                  ₱{selectedVerificationOrder.totals?.total?.toFixed(2) || '0.00'}
                </div>
                <div className="text-gray-600">Payment Method:</div>
                <div className="font-medium text-gray-900 capitalize">
                  {selectedVerificationOrder.paymentMethod || 'N/A'}
                </div>
                <div className="text-gray-600">Order Type:</div>
                <div className="font-medium text-gray-900 capitalize">
                  {selectedVerificationOrder.fulfillmentType?.replace('_', ' ') || 'N/A'}
                </div>
                <div className="text-gray-600">Time:</div>
                <div className="font-medium text-gray-900">
                  {new Date(selectedVerificationOrder.createdAt).toLocaleString()}
                </div>
              </div>
            </div>
            
            {/* Items List */}
            <div>
              <h3 className="font-semibold text-gray-900 mb-3">Items</h3>
              <div className="space-y-2">
                {selectedVerificationOrder.items?.map((item, idx) => (
                  <div key={idx} className="flex justify-between items-center py-2 border-b border-gray-200 last:border-0">
                    <div className="flex-1">
                      <span className="font-medium text-gray-900">
                        {item.quantity}x {item.name}
                      </span>
                      <span className="text-gray-500 ml-2">
                        ({item.selectedSize || 'Regular'})
                      </span>
                    </div>
                    <div className="font-semibold text-gray-900">
                      ₱{(item.price * item.quantity).toFixed(2)}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </Modal>
      )}

      {/* Receipt Modal - Shows receipt preview before printing */}
      <Modal isOpen={showReceipt} onClose={() => setShowReceipt(false)} size="lg">
        <Receipt
          ref={receiptRef}
          order={{
            items: savedOrderData?.items || [],
            receiptNumber: savedOrderData?.receiptNumber || 'N/A',
            server: savedOrderData?.server || (() => {
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
            })(),
            discountCardDetails: savedOrderData?.discountCards || null
          }}
          totals={{
            subtotal: savedOrderData?.totals?.subtotal || 0,
            discount: savedOrderData?.totals?.discount || 0,
            total: savedOrderData?.totals?.total || 0,
            customerName: savedOrderData?.customerName || '',
            cashReceived: savedOrderData?.totals?.cashReceived || savedOrderData?.paymentDetails?.cashReceived || 0,
            change: savedOrderData?.totals?.change || savedOrderData?.paymentDetails?.change || 0,
            eWalletProvider: savedOrderData?.paymentDetails?.eWalletProvider || '',
            eWalletReferenceNumber: savedOrderData?.paymentDetails?.eWalletReferenceNumber || '',
            eWalletName: savedOrderData?.paymentDetails?.eWalletName || ''
          }}
          paymentMethod={savedOrderData?.paymentMethod || 'cash'}
        />
        <div className="mt-4">
          <button
            className="w-full py-3 md:py-4 text-base md:text-lg rounded-2xl mt-4 font-semibold"
            style={{
              backgroundColor: theme.colors.primary,
              color: theme.colors.background
            }}
            onClick={async () => {
              try {
                await handlePrint();
              } finally {
                setShowReceipt(false);
                // Reset states after receipt
                if (isPendingOrderMode) {
                  setEditingPendingOrder(null);
                  setIsPendingOrderMode(false);
                  setPendingOrderCart([]);
                }
                setCustomerName('');
                setEWalletDetails({ provider: 'gcash', referenceNumber: '', name: '' });
              }
            }}
          >
            Print Receipt
          </button>
        </div>
      </Modal>

      {/* Hidden Receipt Component for Printing */}
      <div style={{ display: 'none' }}>
        <Receipt
          ref={receiptRef}
          order={{
            items: savedOrderData?.items || [],
            receiptNumber: savedOrderData?.receiptNumber || 'N/A',
            server: savedOrderData?.server || '',
            discountCardDetails: savedOrderData?.discountCards || null
          }}
          totals={{
            subtotal: savedOrderData?.totals?.subtotal || 0,
            discount: savedOrderData?.totals?.discount || 0,
            total: savedOrderData?.totals?.total || 0,
            customerName: savedOrderData?.customerName || '',
            cashReceived: savedOrderData?.totals?.cashReceived || savedOrderData?.paymentDetails?.cashReceived || 0,
            change: savedOrderData?.totals?.change || savedOrderData?.paymentDetails?.change || 0,
            eWalletProvider: savedOrderData?.paymentDetails?.eWalletProvider || '',
            eWalletReferenceNumber: savedOrderData?.paymentDetails?.eWalletReferenceNumber || '',
            eWalletName: savedOrderData?.paymentDetails?.eWalletName || ''
          }}
          paymentMethod={savedOrderData?.paymentMethod || 'cash'}
        />
      </div>

      {/* Phase 8: Item Removal Confirmation */}
      {showRemoveConfirm && itemToRemove && (
        <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-sm w-full mx-4">
            <h3 className="text-lg font-bold mb-4" style={{ color: theme.colors.primary }}>
              Remove Item?
            </h3>
            <p className="text-sm mb-4" style={{ color: theme.colors.secondary }}>
              Are you sure you want to remove "{itemToRemove?.name}" from the order?
            </p>
            <div className="flex gap-2">
              <button
                onClick={() => {
                  setShowRemoveConfirm(false);
                  setItemToRemove(null);
                }}
                className="flex-1 py-2 px-4 rounded-lg border"
                style={{ borderColor: theme.colors.muted }}
              >
                Cancel
              </button>
              <button
                onClick={confirmRemoveItem}
                className="flex-1 py-2 px-4 rounded-lg text-white"
                style={{ backgroundColor: theme.colors.error }}
              >
                Remove
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Phase 8: Clear Cart Confirmation */}
      {showClearCartConfirm && (
        <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-sm w-full mx-4">
            <h3 className="text-lg font-bold mb-4" style={{ color: theme.colors.primary }}>
              Clear Entire Order?
            </h3>
            <p className="text-sm mb-4" style={{ color: theme.colors.secondary }}>
              This will remove all {getActiveCart().length} items from your current order. This action cannot be undone.
            </p>
            <div className="flex gap-2">
              <button
                onClick={() => setShowClearCartConfirm(false)}
                className="flex-1 py-2 px-4 rounded-lg border"
                style={{ borderColor: theme.colors.muted }}
              >
                Cancel
              </button>
              <button
                onClick={confirmClearCart}
                className="flex-1 py-2 px-4 rounded-lg text-white"
                style={{ backgroundColor: theme.colors.error }}
              >
                Clear All
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default PointOfSaleTablet;
