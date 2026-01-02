import React, { useState, useEffect, useRef, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import * as ReactDOM from 'react-dom/client';
import { useReactToPrint } from 'react-to-print';
import { MenuItemCard, OrderItem, PaymentPanel, PaymentProcessingModal, SearchBar, Modal } from './components/ui';
import { theme } from './theme';
import { Receipt } from './components/Receipt';
import TimeClockInterface from './components/TimeClockInterface';
import TimeClockModal from './components/TimeClockModal';
import CashFloatModal from './components/CashFloatModal';
import OrderProcessingModal from './components/OrderProcessingModal';
import PendingOrder from './components/PendingOrder';
import { CashAlert } from './components/ui/CashAlert';
import { useCashFloat } from './hooks/useCashFloat';
import { FiClock, FiPlus, FiSettings, FiCheckCircle, FiCoffee, FiPieChart, FiTrash2 } from 'react-icons/fi';
import { PesoIconSimple } from './components/ui/PesoIconSimple';
import EndOfShiftModal from './components/EndOfShiftModal';
import ItemCustomizationModal from './components/ItemCustomizationModal';
import io from 'socket.io-client';
import { API_URL } from './App';
import { useDataCoordinator } from './contexts/DataCoordinatorContext';
import { toast } from 'react-toastify';

const PointOfSale = () => {
  // Get preloaded data from coordinator
  const { menuItems: coordinatorMenuItems, categories: coordinatorCategories, ready: dataReady } = useDataCoordinator();
  
  const [menuItems, setMenuItems] = useState([]);
  const [addOns, setAddOns] = useState([]); // Add-ons for customization
  const [currentOrder, setCurrentOrder] = useState([]); // Keep this for compatibility
  const [readyOrderCart, setReadyOrderCart] = useState([]);
  const [pendingOrderCart, setPendingOrderCart] = useState([]);
  const [activeOrders, setActiveOrders] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  // Separate state for meals and beverages navigation
  const [selectedMealSubCategory, setSelectedMealSubCategory] = useState(null);
  const [selectedBeverageSubCategory, setSelectedBeverageSubCategory] = useState(null);
  const [activeCategory, setActiveCategory] = useState('Meals'); // For tracking which category is active
  const [categories, setCategories] = useState([]);
  // Dynamic subcategory selection state for all categories
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
  }); // Fallback - will be replaced by dynamic categories
  const [showReceipt, setShowReceipt] = useState(false);
  const [savedOrderData, setSavedOrderData] = useState(null);
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
  const [isManager, setIsManager] = useState(false);  const [paymentMethod, setPaymentMethod] = useState('cash');

  const [eWalletDetails, setEWalletDetails] = useState({ provider: 'gcash', referenceNumber: '', name: '' });
  const [customerName, setCustomerName] = useState('');
  const [discountCardDetails, setDiscountCardDetails] = useState({ cardType: 'PWD', cardIdNumber: '' });
  const [showTimeClock, setShowTimeClock] = useState(false);
  const [showTimeClockModal, setShowTimeClockModal] = useState(false);
  const [showOrderProcessingModal, setShowOrderProcessingModal] = useState(false);
  const [showPaymentProcessingModal, setShowPaymentProcessingModal] = useState(false);
  const [orderViewType, setOrderViewType] = useState('ready');
  const [editingPendingOrder, setEditingPendingOrder] = useState(null);
  const [isPendingOrderMode, setIsPendingOrderMode] = useState(false);
  const [pendingOrderItems, setPendingOrderItems] = useState([]);
  const [takeoutOrders, setTakeoutOrders] = useState([]); // NEW: For payment verification orders
  const [seenOrderIds, setSeenOrderIds] = useState(new Set()); // NEW: Track which orders have been seen
  const [processingPayMongoId, setProcessingPayMongoId] = useState(null); // Track which PayMongo order is processing
  const [socket, setSocket] = useState(null); // NEW: Socket.io connection
  const [selectedVerificationOrder, setSelectedVerificationOrder] = useState(null); // NEW: For verification modal
  const [showVerificationModal, setShowVerificationModal] = useState(false); // NEW: Modal state
  const [expandedImage, setExpandedImage] = useState(false); // NEW: Image expand state
  const [showSizeModal, setShowSizeModal] = useState(false); // Size selection modal
  const [selectedItemForSize, setSelectedItemForSize] = useState(null); // Item to show in size modal
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
        
        const response = await fetch(`${API_URL}/api/auth/me`, {
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

  // NEW: Socket.io setup for takeout order real-time updates
  useEffect(() => {
    if (!API_URL) return;

    // Get authentication token for socket connection
    const token = localStorage.getItem('token') || localStorage.getItem('authToken');
    
    if (!token) {
      console.warn('[POS] No auth token found, skipping socket connection');
      return;
    }

    console.log('[POS] Initializing socket connection...');
    const socketConnection = io(API_URL, {
      auth: {
        token: token // Add JWT token for authentication
      },
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionAttempts: 5,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
      timeout: 20000
    });

    socketConnection.on('connect', () => {
      console.log('[POS] Socket connected:', socketConnection.id);
      // Server automatically joins authenticated users to 'staff' room
    });
    
    socketConnection.on('disconnect', (reason) => {
      console.log('[POS] Socket disconnected:', reason);
    });

    socketConnection.on('connect_error', (error) => {
      console.warn('[POS] Socket connection error:', error.message);
    });

    socketConnection.on('newPaymentOrder', (data) => {
      console.log('[POS] New payment order received:', data);
      // Extract order from socket payload
      const order = data.order || data;
      console.log('[POS] Extracted order:', order);
      // Add to takeout orders if it's a takeout/delivery/dine_in order (note: underscore for dine_in)
      if (order.fulfillmentType === 'takeout' || order.fulfillmentType === 'delivery' || order.fulfillmentType === 'dine_in') {
        setTakeoutOrders(prev => {
          // Prevent duplicates
          const exists = prev.some(o => o._id === order._id);
          if (exists) {
            console.log('[POS] Order already exists, skipping duplicate');
            return prev;
          }
          console.log('[POS] Adding new order to takeout list');
          return [order, ...prev];
        });
      }
    });

    socketConnection.on('paymentVerified', ({ orderId }) => {
      console.log('Payment verified:', orderId);
      // Remove from takeout orders
      setTakeoutOrders(prev => prev.filter(order => order._id !== orderId));
      // Refresh ready orders to show the verified order
      fetchReadyOrders();
    });

    socketConnection.on('paymentRejected', ({ orderId }) => {
      console.log('Payment rejected:', orderId);
      // Remove from takeout orders
      setTakeoutOrders(prev => prev.filter(order => order._id !== orderId));
    });

    // Listen for user logout events (multi-tab logout synchronization)
    socketConnection.on('userLoggedOut', (data) => {
      console.log('[POS] User logged out event received:', data);
      // Clear all auth data
      localStorage.removeItem('token');
      localStorage.removeItem('authToken');
      localStorage.removeItem('userPosition');
      localStorage.removeItem('userRole');
      // Redirect to login page
      window.location.href = '/';
    });

    // Listen for menu availability changes (Sprint 22)
    socketConnection.on('menuAvailabilityChanged', (data) => {
      console.log('[POS] Menu availability changed:', data);
      if (data.menuItemId) {
        // Update menu items availability in real-time
        setMenuItems(prev => prev.map(item => 
          item._id === data.menuItemId 
            ? { ...item, isAvailable: data.isAvailable }
            : item
        ));
        
        // If item is now unavailable, show notification
        if (!data.isAvailable) {
          console.warn(`[POS] Item ${data.menuItemId} is now unavailable: ${data.reason}`);
        }
      }
    });

    setSocket(socketConnection);

    return () => {
      console.log('[POS] Cleaning up socket connection');
      if (socketConnection) {
        socketConnection.disconnect();
      }
    };
  }, []); // Remove API_URL dependency to prevent recreating socket

  useEffect(() => {
    const handleResize = () => {
      setWindowWidth(window.innerWidth);
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Fetch add-ons for item customization
  useEffect(() => {
    const fetchAddOns = async () => {
      try {
        const response = await fetch(`${API_URL}/api/add-ons`);
        if (response.ok) {
          const data = await response.json();
          setAddOns(data);
        }
      } catch (err) {
        console.warn('[POS] Failed to fetch add-ons:', err);
      }
    };
    fetchAddOns();
  }, []);

  // Load menu items from DataCoordinator
  useEffect(() => {
    if (dataReady && coordinatorMenuItems && coordinatorMenuItems.length > 0) {
      console.log('[POS] Using preloaded menu items from DataCoordinator:', coordinatorMenuItems.length);
      setMenuItems(coordinatorMenuItems);
      setLoading(false);
      setError(null);
    } else if (dataReady) {
      // Data is ready but empty, show error
      setError('No menu items available');
      setLoading(false);
    }
  }, [dataReady, coordinatorMenuItems]);

  // Load categories from DataCoordinator
  useEffect(() => {
    if (dataReady && coordinatorCategories && coordinatorCategories.length > 0) {
      console.log('[POS] Using preloaded categories from DataCoordinator:', coordinatorCategories.length);
      
      // Sort categories for consistency
      const sortedCategories = coordinatorCategories.sort((a, b) => {
        const aSortOrder = typeof a.sortOrder === 'number' ? a.sortOrder : 999;
        const bSortOrder = typeof b.sortOrder === 'number' ? b.sortOrder : 999;
        
        if (aSortOrder !== bSortOrder) {
          return aSortOrder - bSortOrder;
        }
        
        const aName = a.name || '';
        const bName = b.name || '';
        return aName.localeCompare(bName);
      });
      
      setCategories(sortedCategories);
      
      // Build menuConfig from dynamic categories (same as Tablet POS)
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
      console.log('[POS] menuConfig updated from database:', dynamicMenuConfig);
    }
  }, [dataReady, coordinatorCategories]);

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
      
      // Debug: Show total items that should render
      console.log('🔍 TOTAL ITEMS BY CATEGORY:', {
        Meals: menuItems.filter(i => i.category === 'Meals').length,
        Beverages: menuItems.filter(i => i.category === 'Beverages').length,
        Total: menuItems.length
      });
    }
  }, [menuItems]);
  
  const fetchActiveOrders = async () => {
    try {
      // Fetch all active orders (not just ready or pending)
      const response = await fetch(
        `${API_URL}/api/orders`,
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
  };

  // Delete/Cancel a pending order
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
        setPendingOrderItems([]);
      }

      toast.success('Pending order deleted successfully');
    } catch (error) {
      console.error('Error deleting pending order:', error);
      toast.error('Failed to delete pending order. Please try again.');
    }
  };

  // NEW: Fetch takeout/delivery orders awaiting payment verification
  const fetchTakeoutOrders = async () => {
    try {
      // Use 'token' to match other POS API calls
      const token = localStorage.getItem('token') || localStorage.getItem('authToken');
      
      console.log('Fetching takeout orders with token:', token ? 'exists' : 'missing');
      console.log('API_URL:', API_URL);
      
      const response = await fetch(
        `${API_URL}/api/orders/pending-verification?verificationStatus=pending`, // Only get pending orders
        {
          headers: {
            Authorization: `Bearer ${token}`
          }
        }
      );
      
      console.log('Takeout orders response status:', response.status);
      
      if (!response.ok) {
        const errorText = await response.text();
        console.error('Failed to fetch takeout orders:', errorText);
        throw new Error('Failed to fetch takeout orders');
      }
      
      const data = await response.json();
      console.log('Takeout orders response:', data);
      
      // Backend returns data in 'data' property, not 'orders'
      const ordersArray = data.data || [];
      console.log('Orders array:', ordersArray);
      console.log('Number of orders returned:', ordersArray.length);
      
      // Check if orders array exists and has data
      if (ordersArray.length === 0) {
        console.log('No orders in response');
        setTakeoutOrders([]);
        return;
      }
      
      // Log each order's fulfillmentType
      ordersArray.forEach(order => {
        console.log(`Order ${order.receiptNumber}: fulfillmentType="${order.fulfillmentType}", status="${order.status}", paymentMethod="${order.paymentMethod}"`);
      });
      
      // Filter for takeout/delivery/dine_in orders and exclude expired orders
      // Note: dine_in PayMongo orders should appear here for receipt generation
      const takeoutDeliveryOrders = ordersArray.filter(order => {
        const isTakeoutDeliveryOrDineIn = order.fulfillmentType === 'takeout' || order.fulfillmentType === 'delivery' || order.fulfillmentType === 'dine_in';
        
        // For manual payments, check if not expired
        if (order.paymentMethod === 'e-wallet' && order.proofOfPayment?.expiresAt) {
          const isExpired = new Date(order.proofOfPayment.expiresAt) < new Date();
          if (isExpired) {
            console.log(`Filtering out expired order: ${order.receiptNumber}`);
            return false;
          }
        }
        
        return isTakeoutDeliveryOrDineIn;
      });
      
      console.log('Filtered takeout/delivery orders (excluding expired):', takeoutDeliveryOrders.length);
      
      setTakeoutOrders(takeoutDeliveryOrders);
    } catch (error) {
      console.error('Error fetching takeout orders:', error);
    }
  };

  // Fetch takeout orders when component mounts or when switching to dineTakeout view
  useEffect(() => {
    if (orderViewType === 'dineTakeout') {
      fetchTakeoutOrders();
    }
  }, [orderViewType]);

  // Initial fetch of takeout orders when component mounts
  useEffect(() => {
    fetchTakeoutOrders();
  }, []);

  // Add toast animation styles
  useEffect(() => {
    const style = document.createElement('style');
    style.textContent = `
      @keyframes slideIn {
        from {
          transform: translateX(400px);
          opacity: 0;
        }
        to {
          transform: translateX(0);
          opacity: 1;
        }
      }
      @keyframes slideOut {
        from {
          transform: translateX(0);
          opacity: 1;
        }
        to {
          transform: translateX(400px);
          opacity: 0;
        }
      }
    `;
    document.head.appendChild(style);
    return () => document.head.removeChild(style);
  }, []);

  const processExistingOrderPayment = async (orderId, newStatus) => {    try {
      // Case 1: Payment processing flow from legacy payment component or ready orders
      if (typeof orderId === 'object' && orderId._id) {
        const order = orderId;
        const { method, cashAmount, eWalletDetails, totals } = newStatus;
        
        const totalDue = parseFloat(totals?.total || order.totals?.total || order.items.reduce((sum, item) => sum + (item.price * item.quantity), 0));        let paymentData = {
          totals: totals || {
            subtotal: totalDue,
            discount: 0,
            total: totalDue
          },
          customerName: customerName || '' // Add customer name to payment data
        };        if (method === 'cash') {
          // Use centralized cash float validation
          const changeValidation = validateChange(cashAmount, totalDue);
          if (!changeValidation.valid) {
            toast.error(changeValidation.message);
            return;
          }paymentData = {
            ...paymentData,
            cashReceived: cashAmount,
            change: change.toFixed(2)
          };        } else if (method === 'e-wallet' && eWalletDetails) {
          paymentData = {
            ...paymentData,
            eWalletProvider: eWalletDetails.provider,
            eWalletReferenceNumber: eWalletDetails.referenceNumber,
            eWalletName: eWalletDetails.name
          };
        }

        const response = await fetch(`${API_URL}/api/orders/${order._id}`, {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${localStorage.getItem('token')}`
          },          body: JSON.stringify({
            status: 'received',
            paymentMethod: method,
            customerName: customerName || '', // Add customer name to existing order payment
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
        await handlePrint();
        
        // Update order lists
        setActiveOrders(prev => prev.filter(o => o._id !== order._id));        // Reset state
        setCurrentOrder([]);
        setCashAmount(0);
        setCustomerName(''); // Reset customer name when payment is processed
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
        const response = await fetch(`${API_URL}/api/orders/${orderId}`, {
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

        toast.success(`Order status updated to ${newStatus}`);
      }
    } catch (error) {
      console.error('Order processing error:', error);
      toast.error('Error updating order');
    }
  };

  const generateReceiptNumber = () => {
    const timestamp = Date.now().toString().slice(-6);
    const random = Math.floor(100 + Math.random() * 900);
    return `${timestamp}${random}`;
  };  
  
  // Check if items are locked in current tab
  const isItemLocked = () => {
    return orderViewType === 'dineTakeout' || 
           (orderViewType === 'pending' && !isPendingOrderMode);
  };

  // Check if item needs customization (has multiple sizes, variants, or relevant add-ons)
  // Note: Modal now always shown to allow notes input
  const needsCustomization = (item) => {
    const sizes = Object.keys(item.pricing || {}).filter(key => key !== '_id');
    const hasMultipleSizes = sizes.length > 1 || (sizes.length === 1 && sizes[0] !== 'base');
    const hasVariants = (item.variants || []).length > 0;
    const relevantAddOns = (addOns || []).filter(addon => 
      addon.category === item.category || addon.category === 'All'
    );
    const hasAddOns = relevantAddOns.length > 0;
    
    return hasMultipleSizes || hasVariants || hasAddOns;
  };
  
  const addToOrder = item => {
    // Check if item is available
    if (item.isAvailable === false) {
      toast.warning(`${item.name} is currently unavailable due to insufficient ingredients.`);
      return;
    }
    
    // Always show customization modal for POS to allow notes input
    // Staff can add notes even if item has no other customization options
    setSelectedItemForSize(item);
    setShowSizeModal(true);
  };
  
  // New function to handle adding item with selected size
  const addToCartWithSize = (orderItem) => {
    // Ensure availableSizes is set if not provided
    if (!orderItem.availableSizes) {
      const sizes = Object.keys(orderItem.pricing || {}).filter(key => key !== '_id');
      orderItem.availableSizes = sizes.length > 0 ? sizes : ['base'];
    }
    
    // Ensure notes is set (default to empty string)
    if (orderItem.notes === undefined) {
      orderItem.notes = '';
    }
    
    // If in pending orders view, only allow adding items when editing a pending order
    if (orderViewType === 'pending') {
      if (!isPendingOrderMode) {
        toast.warning('Please select a pending order to add items to.');
        return;
      }

      // Update pending order items - match by id, size, variant, addOns, and notes
      const existing = pendingOrderItems.find(
        i => i._id === orderItem._id && 
             i.selectedSize === orderItem.selectedSize &&
             JSON.stringify(i.variant || null) === JSON.stringify(orderItem.selectedVariant || orderItem.variant || null) &&
             JSON.stringify((i.addOns || []).map(a => a._id).sort()) === JSON.stringify((orderItem.selectedAddOns || orderItem.addOns || []).map(a => a._id).sort()) &&
             (i.notes || '') === (orderItem.notes || '')
      );

      if (existing) {
        setPendingOrderItems(pendingOrderItems.map(i =>
          i._id === orderItem._id && 
          i.selectedSize === orderItem.selectedSize &&
          JSON.stringify(i.variant || null) === JSON.stringify(orderItem.selectedVariant || orderItem.variant || null) &&
          JSON.stringify((i.addOns || []).map(a => a._id).sort()) === JSON.stringify((orderItem.selectedAddOns || orderItem.addOns || []).map(a => a._id).sort()) &&
          (i.notes || '') === (orderItem.notes || '')
            ? { ...i, quantity: i.quantity + orderItem.quantity }
            : i
        ));
      } else {
        // Normalize the item structure before adding
        const normalizedItem = {
          ...orderItem,
          variant: orderItem.selectedVariant || orderItem.variant || null,
          addOns: orderItem.selectedAddOns || orderItem.addOns || [],
          notes: orderItem.notes || ''
        };
        setPendingOrderItems([...pendingOrderItems, normalizedItem]);
      }
      return;
    }

    // Regular order handling (only for non-pending orders)
    const [currentCart, setCart] = orderViewType === 'ready' ? 
      [readyOrderCart, setReadyOrderCart] : 
      [pendingOrderCart, setPendingOrderCart];

    // Match by id, size, variant, addOns, and notes
    const existing = currentCart.find(
      i => i._id === orderItem._id && 
           i.selectedSize === orderItem.selectedSize &&
           JSON.stringify(i.variant || null) === JSON.stringify(orderItem.selectedVariant || orderItem.variant || null) &&
           JSON.stringify((i.addOns || []).map(a => a._id).sort()) === JSON.stringify((orderItem.selectedAddOns || orderItem.addOns || []).map(a => a._id).sort()) &&
           (i.notes || '') === (orderItem.notes || '')
    );

    if (existing) {
      setCart(
        currentCart.map(i =>
          i._id === orderItem._id && 
          i.selectedSize === orderItem.selectedSize &&
          JSON.stringify(i.variant || null) === JSON.stringify(orderItem.selectedVariant || orderItem.variant || null) &&
          JSON.stringify((i.addOns || []).map(a => a._id).sort()) === JSON.stringify((orderItem.selectedAddOns || orderItem.addOns || []).map(a => a._id).sort()) &&
          (i.notes || '') === (orderItem.notes || '')
            ? { ...i, quantity: i.quantity + orderItem.quantity }
            : i
        )
      );
    } else {
      // Normalize the item structure before adding
      const normalizedItem = {
        ...orderItem,
        variant: orderItem.selectedVariant || orderItem.variant || null,
        addOns: orderItem.selectedAddOns || orderItem.addOns || [],
        notes: orderItem.notes || ''
      };
      setCart([...currentCart, normalizedItem]);
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
    );    // Keep currentOrder in sync
    setCurrentOrder(orderViewType === 'ready' ? readyOrderCart : pendingOrderCart);
  };

  // Function to handle PWD/Senior discount updates for pending order items
  const updatePendingOrderItemDiscount = (item, discountedQuantity) => {
    setPendingOrderItems(
      pendingOrderItems.map(i => {
        if (i._id === item._id && i.selectedSize === item.selectedSize) {
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

  // NEW: Quick verify payment from POS
  const handleQuickVerify = async (orderId, notes = '') => {
    try {
      const token = localStorage.getItem('token') || localStorage.getItem('authToken');
      
      // Step 1: Verify the payment
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

      // Step 2: Change status to "preparing" (move to next step in workflow: received -> preparing -> ready)
      const statusResponse = await fetch(
        `${API_URL}/api/orders/${orderId}/status`,
        {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`
          },
          body: JSON.stringify({ status: 'preparing' })
        }
      );

      if (!statusResponse.ok) {
        console.warn('Failed to update status to preparing, but payment verified');
      }

      // Step 3: Get the full order details for receipt generation
      const orderResponse = await fetch(`${API_URL}/api/orders/${orderId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });

      if (orderResponse.ok) {
        const orderData = await orderResponse.json();
        const fullOrder = orderData.data || orderData;

        // Set up order data for receipt
        setSavedOrderData(fullOrder);
        setCurrentOrder(fullOrder.items || []);

        // Step 4: Generate and print receipt
        setShowReceipt(true);
        await new Promise(resolve => setTimeout(resolve, 100));
        await handlePrint();
      }

      // Step 5: Remove from takeout orders list and refresh
      setTakeoutOrders(prev => prev.filter(order => order._id !== orderId));
      fetchActiveOrders();
      
      // Show toast notification
      toast.success('Payment verified! Order is now preparing.');
    } catch (error) {
      console.error('Error verifying payment:', error);
      toast.error(`Failed to verify payment: ${error.message}`);
    }
  };

  // NEW: Quick reject payment from POS
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

      // Remove from takeout orders list
      setTakeoutOrders(prev => prev.filter(order => order._id !== orderId));
      
      toast.warning('Payment rejected. Customer will be notified.');
    } catch (error) {
      console.error('Error rejecting payment:', error);
      toast.error(`Failed to reject payment: ${error.message}`);
    }
  };

  // Process PayMongo order (generate receipt and move to kitchen)
  const handleProcessPayMongoOrder = async (orderId) => {
    try {
      console.log('[MainPOS] Processing PayMongo order:', orderId);
      
      const token = localStorage.getItem('token') || localStorage.getItem('authToken');
      
      // Process the order first
      const processResponse = await fetch(`${API_URL}/api/orders/${orderId}/process-paymongo`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        }
      });

      if (!processResponse.ok) {
        const errorData = await processResponse.json();
        throw new Error(errorData.message || 'Failed to process order');
      }

      // Fetch full order details for receipt
      const orderResponse = await fetch(`${API_URL}/api/orders/${orderId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });

      if (!orderResponse.ok) {
        throw new Error('Failed to fetch order details');
      }

      const orderData = await orderResponse.json();
      const fullOrder = orderData.data || orderData;

      console.log('[MainPOS] Order processed, showing receipt:', fullOrder);

      // Set up order data for receipt preview
      setSavedOrderData(fullOrder);
      
      // Show receipt modal
      setShowReceipt(true);

    } catch (error) {
      console.error('[MainPOS] Error processing PayMongo order:', error);
      toast.error(`Failed to process order: ${error.message}`);
    }
  };

  const handlePrint = useReactToPrint({ content: () => receiptRef.current });  const processPayment = async (paymentDetails = null) => {
    const currentCart = orderViewType === 'ready' ? readyOrderCart : pendingOrderCart;
    const setCart = orderViewType === 'ready' ? setReadyOrderCart : setPendingOrderCart;
    
    const totals = calculateTotal();
    // Use payment details directly if provided, otherwise fall back to state
    const cashValue = paymentDetails?.cashAmount ? parseFloat(paymentDetails.cashAmount) : parseFloat(cashAmount);
    const totalDue = parseFloat(totals.total);
    const currentPaymentMethod = paymentDetails?.method || paymentMethod;

    if (currentPaymentMethod === 'cash') {
      // Use centralized cash float validation
      const changeValidation = validateChange(cashValue, totalDue);
      if (!changeValidation.valid) {
        toast.error(changeValidation.message);
        return;
      }
    }

    try {
      // Save order FIRST to get the real receipt number from backend
      const orderResponse = await saveOrderToDB();
      
      // Update currentOrder with the saved order data (including receiptNumber)
      if (orderResponse?.data) {
        setCurrentOrder(orderResponse.data.items || []);
        // Store the saved order for receipt display
        setSavedOrderData(orderResponse.data);
      }
      
      // NOW show and print receipt with real receipt number
      setShowReceipt(true);
      await new Promise(resolve => setTimeout(resolve, 100));
      await handlePrint();
      
      // NEW: Create inventory reservation for items with ingredient mappings
      if (orderResponse?.data?._id) {
        try {
          const userData = localStorage.getItem('userData');
          const user = userData ? JSON.parse(userData) : null;
          
          const reservationResponse = await fetch(`${API_URL}/api/inventory/reserve`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${localStorage.getItem('token')}`
            },
            body: JSON.stringify({
              orderId: orderResponse.data._id,
              items: currentCart.map(item => ({
                menuItemId: item._id,
                quantity: item.quantity,
                name: item.name
              })),
              reservedBy: user?.id || 'system'
            })
          });
          
          const reservationData = await reservationResponse.json();
          console.log('Reservation API Response:', reservationData);
          
          if (reservationResponse.ok && reservationData.success) {
            console.log('Inventory reservation created for order:', orderResponse.data._id);
          } else {
            console.warn('Inventory reservation failed:', reservationData);
          }
        } catch (invError) {
          console.error('Inventory reservation error:', invError);
          // Don't block order - ingredient tracking is optional
        }
      }
      
      if (currentPaymentMethod === 'cash') {
        // Use centralized cash float service to process the transaction
        console.log('Processing cash transaction:', { paymentMethod: currentPaymentMethod, cashValue, totalDue });
        await processTransaction(cashValue, totalDue, 'pos_order');
        console.log('Cash transaction processed successfully');
      }
        // Clear both the specific cart and currentOrder
      setCart([]);
      setCurrentOrder([]);      setCashAmount(0);
      setSearchTerm('');
      setSavedOrderData(null); // Clear saved order data
      // Reset payment details
      setEWalletDetails({ provider: 'gcash', referenceNumber: '', name: '' });
      setCustomerName(''); // Reset customer name

      toast.success('Order completed successfully!');
    } catch (error) {
      console.error('Payment processing error:', error);
      toast.error('Error processing payment. Please try again.');
    }
  };  const processPendingOrderPayment = async (paymentDetails = null) => {
    // Calculate totals for pending order items
    const pendingTotal = pendingOrderItems.reduce((sum, item) => sum + (item.price * item.quantity), 0);

    // Calculate PWD/Senior discounts for pending order (20% flat rate)
    const discountTotal = pendingOrderItems.reduce((sum, item) => {
      if (item.pwdSeniorDiscount?.applied) {
        return sum + (item.pwdSeniorDiscount.discountAmount || 0);
      }
      return sum;
    }, 0);

    const totalDue = pendingTotal - discountTotal;
    // Use payment details directly if provided, otherwise fall back to state
    const cashValue = paymentDetails?.cashAmount ? parseFloat(paymentDetails.cashAmount) : parseFloat(cashAmount);
    const currentPaymentMethod = paymentDetails?.method || paymentMethod;

    console.log('[processPendingOrderPayment] Payment details:', {
      paymentDetails,
      cashValue,
      cashAmount,
      currentPaymentMethod,
      totalDue
    });

    if (currentPaymentMethod === 'cash') {
      // Use centralized cash float validation
      const changeValidation = validateChange(cashValue, totalDue);
      if (!changeValidation.valid) {
        toast.error(changeValidation.message);
        return;
      }
    }

    try {
      // Update the existing pending order in the database
      const totals = {
        subtotal: pendingTotal,
        discount: discountTotal,
        total: totalDue
      };

      let paymentDetailsForOrder = {};
      if (currentPaymentMethod === 'cash') {
        paymentDetailsForOrder = {
          cashReceived: cashValue,
          change: cashValue - totalDue
        };
      } else if (currentPaymentMethod === 'e-wallet') {
        paymentDetailsForOrder = {
          eWalletProvider: eWalletDetails.provider,
          eWalletReferenceNumber: eWalletDetails.referenceNumber,
          eWalletName: eWalletDetails.name
        };
      }

      // Update the order with payment details
      const response = await fetch(`${API_URL}/api/orders/${editingPendingOrder._id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${localStorage.getItem('token')}`
        },        body: JSON.stringify({
          status: 'received',  // Pending orders that are paid start as received (first step in workflow)
          paymentMethod: currentPaymentMethod,
          customerName: customerName || '', // Add customer name to pending order
          discountCards: discountCardDetails?.discountCards || [],
          fulfillmentType: 'dine_in', // POS orders are dine-in by default
          totals: {
            ...totals,
            ...paymentDetailsForOrder
          },
          items: pendingOrderItems.map(item => ({
            name: item.name,
            price: item.price,
            quantity: item.quantity,
            selectedSize: item.selectedSize,
            modifiers: item.modifiers,
            // Add variant data (serializable only)
            variant: item.variant ? {
              name: item.variant.name,
              priceAdjustment: item.variant.priceAdjustment || 0
            } : null,
            // Add add-ons data (serializable only)
            addOns: (item.addOns || []).map(addon => ({
              _id: addon._id,
              name: addon.name,
              price: addon.price || 0
            })),
            // Add item notes
            notes: item.notes || '',
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
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to update order');
      }

      const orderData = await response.json();
      console.log('[DesktopPOS processPendingOrderPayment] Server response:', orderData.data);
      console.log('[DesktopPOS processPendingOrderPayment] Totals from server:', orderData.data?.totals);
      
      // NEW: Create inventory reservation for pending order items with ingredient mappings
      if (orderData?.data?._id) {
        try {
          const userData = localStorage.getItem('userData');
          const user = userData ? JSON.parse(userData) : null;
          
          const reservationResponse = await fetch(`${API_URL}/api/inventory/reserve`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${localStorage.getItem('token')}`
            },
            body: JSON.stringify({
              orderId: orderData.data._id,
              items: pendingOrderItems.map(item => ({
                menuItemId: item._id,
                quantity: item.quantity,
                name: item.name
              })),
              reservedBy: user?.id || 'system'
            })
          });
          
          const reservationData = await reservationResponse.json();
          console.log('Reservation API Response (pending order):', reservationData);
          
          if (reservationResponse.ok && reservationData.success) {
            console.log('Inventory reservation created for pending order:', orderData.data._id);
          } else {
            console.warn('Inventory reservation failed:', reservationData);
          }
        } catch (invError) {
          console.error('Inventory reservation error:', invError);
          // Don't block order - ingredient tracking is optional
        }
      }

      if (currentPaymentMethod === 'cash') {
        // Use centralized cash float service to process the transaction
        console.log('Processing pending order cash transaction:', { paymentMethod: currentPaymentMethod, cashValue, totalDue });
        await processTransaction(cashValue, totalDue, `pending_order_${editingPendingOrder._id}`);
        console.log('Pending order cash transaction processed successfully');
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

      toast.success('Payment processed successfully!');
    } catch (error) {
      console.error('Payment processing error:', error);
      toast.error('Error processing payment. Please try again.');
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
          availableSizes: item.availableSizes || ['base'],
          pricing: item.pricing || { base: item.price },
          modifiers: item.modifiers,
          // Add variant data (serializable only)
          variant: item.variant ? {
            name: item.variant.name,
            priceAdjustment: item.variant.priceAdjustment || 0
          } : null,
          // Add add-ons data (serializable only)
          addOns: (item.addOns || []).map(addon => ({
            _id: addon._id,
            name: addon.name,
            price: addon.price || 0
          })),
          // Add item notes
          notes: item.notes || '',
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
          total: parseFloat(totals.total),
          ...paymentDetails
        },
        paymentMethod,
        paymentDetails, // Additional field for payment details        
        customerName: customerName || '', // Add customer name to order data
        discountCards: discountCardDetails?.discountCards || [],
        status: 'received',  // POS orders start as received (first step in workflow)
        orderType: 'pos',  // Changed from 'self_checkout' to 'pos' for orders created in POS
        fulfillmentType: 'dine_in', // POS orders are dine-in by default
        processedBy: (() => {
          try {
            const userData = localStorage.getItem('userData');
            if (userData) {
              const user = JSON.parse(userData);
              return {
                userId: user._id || user.id,
                username: user.username || 'Staff',
                timestamp: new Date()
              };
            }
          } catch (error) {
            console.error('Error getting staff name:', error);
          }
          return { username: 'POS Staff', timestamp: new Date() };
        })()
      };

      const response = await fetch(`${API_URL}/api/orders`, {
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
    setCustomerName(''); // Reset customer name when canceling order
  };  // Filtered items is kept for compatibility with any existing code that might reference it
  // But filtering is now done directly in the render for each category section
  const filteredItems = useMemo(() => {
    const searchFiltered = menuItems
      // Remove isAvailable filter - show all items including unavailable ones
      .filter(item =>
        searchTerm === '' || 
        item.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
        item.code.toLowerCase().includes(searchTerm.toLowerCase())
      );
    
    // Apply dynamic category filters with backward compatibility
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
    } else if (activeCategory) {
      // Handle dynamic categories
      const selectedSubCategory = selectedSubCategories[activeCategory];
      return searchFiltered.filter(item => 
        item.category === activeCategory && 
        (!selectedSubCategory || item.subCategory === selectedSubCategory)
      );
    }
    
    return searchFiltered;
  }, [menuItems, searchTerm, activeCategory, selectedMealSubCategory, selectedBeverageSubCategory, selectedSubCategories]);

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
          toast.warning('No matching items found');
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
    setSelectedSubCategories({}); // Clear dynamic subcategory selections
    setSearchTerm('');
  };  // Category tabs component - no longer needed with the new integrated breadcrumb navigation
  const renderCategoryTabs = () => {
    return null;
  };  // Subcategory tabs component - now handles separate states for meals and beverages
  // Displays subcategories in a compact single row with separators
  const renderSubCategoryTabs = (categoryName) => {
    if (!menuConfig[categoryName]) return null;
    
    const subCategories = Object.keys(menuConfig[categoryName].subCategories || {});
    if (subCategories.length === 0) return null;
    
    // Use legacy states for Meals/Beverages for backward compatibility
    const isLegacyCategory = categoryName === 'Meals' || categoryName === 'Beverages';
    
    let selectedSubCategory, setSelectedSubCategory;
    
    if (isLegacyCategory) {
      // Use existing specific states for backward compatibility
      selectedSubCategory = categoryName === 'Meals' ? selectedMealSubCategory : selectedBeverageSubCategory;
      setSelectedSubCategory = categoryName === 'Meals' ? setSelectedMealSubCategory : setSelectedBeverageSubCategory;
    } else {
      // Use dynamic state for new categories
      selectedSubCategory = selectedSubCategories[categoryName] || null;
      setSelectedSubCategory = (subCat) => {
        setSelectedSubCategories(prev => ({
          ...prev,
          [categoryName]: subCat
        }));
      };
    }
    
    return (
      <div className="whitespace-nowrap py-1 mt-1 flex items-center flex-wrap gap-y-1">
        {subCategories.map((subCategory, index) => (
          <React.Fragment key={subCategory}>
            {index > 0 && <span className="text-gray-300 mx-0.5">•</span>}
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

  // Dynamic category section renderer
  const renderCategorySection = (category) => {
    // Add null checking and validation
    if (!category) {
      console.warn('renderCategorySection: No category provided');
      return null;
    }
    
    // Handle different data structures: {name: "Meals"} or {category: "Meals"}
    const categoryName = category.name || category.category || category;
    if (!categoryName) {
      console.warn('renderCategorySection: No category name found', category);
      return null;
    }
    
    // Use legacy states for Meals/Beverages for backward compatibility
    const isLegacyCategory = categoryName === 'Meals' || categoryName === 'Beverages';
    
    let selectedSubCategory, setSelectedSubCategory;
    
    if (isLegacyCategory) {
      // Use existing specific states for backward compatibility
      selectedSubCategory = categoryName === 'Meals' ? selectedMealSubCategory : selectedBeverageSubCategory;
      setSelectedSubCategory = categoryName === 'Meals' ? setSelectedMealSubCategory : setSelectedBeverageSubCategory;
    } else {
      // Use dynamic state for new categories
      selectedSubCategory = selectedSubCategories[categoryName] || null;
      setSelectedSubCategory = (subCat) => {
        setSelectedSubCategories(prev => ({
          ...prev,
          [categoryName]: subCat
        }));
      };
    }
    
    return (
      <div key={category._id || categoryName}>
        {/* Category Breadcrumb with integrated subcategory selector */}
        <div className="mb-2 bg-white rounded-lg py-1 px-3 shadow-sm">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1">
              <span className="font-medium mr-2 text-sm" style={{ color: theme.colors.primary }}>
                {categoryName}:
              </span>
              <button
                onClick={() => { 
                  setActiveCategory(categoryName);
                  setSelectedSubCategory(null);
                }}
                className={`text-sm transition-colors ${!selectedSubCategory ? 'font-medium' : ''}`}
                style={{ 
                  color: !selectedSubCategory ? theme.colors.accent : theme.colors.primary 
                }}
              >
                All {categoryName}
              </button>
              
              {selectedSubCategory && (
                <>
                  <span className="text-gray-400 mx-1">/</span>
                  <span 
                    className="text-sm font-medium"
                    style={{ color: theme.colors.accent }}
                  >
                    {selectedSubCategory}
                  </span>
                </>
              )}
            </div>
            
            {/* Clear selection button */}
            {selectedSubCategory && (
              <button
                onClick={() => setSelectedSubCategory(null)}
                className="text-xs px-2 py-1 rounded-md bg-gray-100 hover:bg-gray-200 transition-colors"
                style={{ color: theme.colors.primary }}
              >
                Clear
              </button>
            )}
          </div>
          
          {/* Subcategories in a single row */}
          {renderSubCategoryTabs(categoryName)}
        </div>
        
        {/* Display Category Items */}
        <div 
          className="overflow-x-scroll scrollbar-hide" 
          style={{ 
            maxWidth: '100%', 
            width: '836px',
            WebkitOverflowScrolling: 'touch',
            cursor: 'grab',
            userSelect: 'none'
          }}
          onMouseDown={(e) => {
            const slider = e.currentTarget;
            slider.style.cursor = 'grabbing';
            let isDown = true;
            let startX = e.pageX - slider.offsetLeft;
            let scrollLeft = slider.scrollLeft;
            
            const handleMouseMove = (e) => {
              if (!isDown) return;
              e.preventDefault();
              const x = e.pageX - slider.offsetLeft;
              const walk = (x - startX) * 2;
              slider.scrollLeft = scrollLeft - walk;
            };
            
            const handleMouseUp = () => {
              isDown = false;
              slider.style.cursor = 'grab';
              document.removeEventListener('mousemove', handleMouseMove);
              document.removeEventListener('mouseup', handleMouseUp);
            };
            
            document.addEventListener('mousemove', handleMouseMove);
            document.addEventListener('mouseup', handleMouseUp);
          }}
        >
          <div className="flex gap-3 pb-2" style={{ minWidth: 'max-content' }}>
            {(() => {
              const categoryItems = menuItems.filter(i => i.category === categoryName);
              const filtered = categoryItems.filter(item => 
                (!selectedSubCategory || item.subCategory === selectedSubCategory) &&
                (searchTerm === '' || 
                 item.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
                 item.code.toLowerCase().includes(searchTerm.toLowerCase()))
              );
              
              const renderedElements = filtered.map(item => (
                <div key={item._id} className="flex-shrink-0" style={{ width: '200px' }}>
                  <MenuItemCard
                    item={item}
                    onClick={() => item.isAvailable !== false ? addToOrder(item) : null}
                    isUnavailable={item.isAvailable === false}
                    isLocked={isItemLocked()}
                  />
                </div>
              ));
              
              console.log(`[POS] Rendering ${categoryName}:`, {
                totalMenuItems: menuItems.length,
                categoryItems: categoryItems.length,
                filtered: filtered.length,
                renderedElements: renderedElements.length,
                selectedSubCategory,
                searchTerm,
                filteredItems: filtered.map(i => ({ name: i.name, subCat: i.subCategory, available: i.isAvailable }))
              });
              
              return renderedElements;
            })()
            }
          </div>
        </div>
      </div>
    );
  };
  if (loading) {
    return (
      <div
        className="min-h-screen flex items-center justify-center"
        style={{
          backgroundColor: theme.colors.background
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
          backgroundColor: theme.colors.background
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
  return (    <motion.div 
      className="flex min-h-screen" 
      style={{ backgroundColor: theme.colors.background }}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.4 }}
    >
      <motion.div
        className="flex-1 transition-all duration-300 relative"
        style={{
          paddingTop: windowWidth < 768 ? '4rem' : '0'
        }}
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.1 }}
      >
        {showTimeClock ? (
          <TimeClockInterface onClose={() => setShowTimeClock(false)} />
        ) : (
          <div className="h-screen flex flex-col md:flex-row overflow-hidden">
            {/* Menu Section - Left Panel */}
            <div className="flex-1 m-0 md:m-4 order-2 md:order-1 flex flex-col" style={{ maxHeight: 'calc(100vh - 32px)' }}>
              {/* Menu Content Container - matches right panel structure */}
              <div className="flex flex-col flex-1 min-h-0 bg-white rounded-lg shadow-md overflow-hidden">
                {/* Header Bar - Fixed at top */}
                <div className="flex-shrink-0 p-4 border-b">
                  <div className="flex items-center gap-3">
                    {/* Left: Search Bar and Cash Float */}
                    <div className="flex items-center gap-3 flex-1">
                      {/* Search Bar with Show All chip */}
                      <div className="flex-1 max-w-md relative">
                        <SearchBar
                          value={searchTerm}
                          onChange={e => setSearchTerm(e.target.value)}
                          placeholder="Search menu..."
                          size="md"
                        />
                        {/* Show All chip - appears when filtering */}
                        {(activeCategory || selectedMealSubCategory || selectedBeverageSubCategory || searchTerm) && (
                          <button
                            onClick={showAllItems}
                            className="absolute right-2 top-1/2 -translate-y-1/2 px-2.5 py-1 rounded-md hover:opacity-80 transition-all text-xs font-medium"
                            style={{ 
                              backgroundColor: theme.colors.accent,
                              color: 'white'
                            }}
                          >
                            Show All
                          </button>
                        )}
                      </div>
                      
                      {/* Cash Float Display - Compact */}
                      {isManager && (
                        <div className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg whitespace-nowrap" style={{ backgroundColor: `${theme.colors.accent}20`, border: `1px solid ${theme.colors.accent}` }}>
                          <PesoIconSimple width={16} height={16} style={{ color: theme.colors.accent }} />
                          <span className="text-sm font-bold" style={{ color: theme.colors.accent }}>
                            ₱{formatCurrency(cashFloat)}
                          </span>
                        </div>
                      )}
                    </div>
                    
                    {/* Right: Action Buttons */}
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
                          <span className="text-sm font-medium hidden lg:inline">Cash Float</span>
                        </button>
                        <button
                          onClick={() => setShowEndOfShiftModal(true)}
                          className="flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-gray-100 transition-colors"
                          style={{ color: theme.colors.primary, border: `1px solid ${theme.colors.muted}` }}
                          title="End of Shift"
                        >
                          <FiPieChart size={20} />
                          <span className="text-sm font-medium hidden lg:inline">End Shift</span>
                        </button>
                      </>
                    )}
                    <button
                      onClick={() => setShowTimeClockModal(true)}
                      className="flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-gray-100 transition-colors"
                      style={{ color: theme.colors.primary, border: `1px solid ${theme.colors.muted}` }}
                      title="Time Clock"
                    >
                      <FiClock size={20} />
                      <span className="text-sm font-medium hidden lg:inline">Time Clock</span>
                    </button>
                    <button
                      onClick={() => setShowOrderProcessingModal(true)}
                      className="p-2 rounded-lg hover:bg-gray-100 relative"
                      style={{ color: theme.colors.primary }}
                      title="Ready Orders"
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
                </div>
                {/* End Header Bar */}
              
                {/* Menu Content Area - Scrollable content inside white container */}
                <div className="overflow-y-auto px-4 pt-4 pb-8 subtle-scrollbar" style={{ flex: '1 1 0', minHeight: 0 }}>
                  {/* Menu Navigation - stack categories vertically */}
                  <div className="space-y-6">
                {/* Dynamic Category Sections */}
                {categories.length > 0 ? (
                  categories.map(category => {
                    const categoryName = category.name || category.category;
                    if (!categoryName) {
                      return null;
                    }
                    return renderCategorySection(category);
                  }).filter(Boolean)
                ) : (
                  /* Fallback to hard-coded categories while loading */
                  <>
                    {/* Meals Section */}
                    <div>
                      {/* Meals Breadcrumb with integrated subcategory selector */}
                      <div className="mb-2 bg-white rounded-lg py-1 px-3 shadow-sm">
                        <div className="flex items-center justify-between">
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
                      </div>
                      
                      {/* Display Meal Items */}
                      <div 
                        className="overflow-x-scroll scrollbar-hide" 
                        style={{ 
                          maxWidth: '100%', 
                          width: '836px',
                          WebkitOverflowScrolling: 'touch',
                          cursor: 'grab',
                          userSelect: 'none'
                        }}
                        onMouseDown={(e) => {
                          const slider = e.currentTarget;
                          slider.style.cursor = 'grabbing';
                          let isDown = true;
                          let startX = e.pageX - slider.offsetLeft;
                          let scrollLeft = slider.scrollLeft;
                          
                          const handleMouseMove = (e) => {
                            if (!isDown) return;
                            e.preventDefault();
                            const x = e.pageX - slider.offsetLeft;
                            const walk = (x - startX) * 2;
                            slider.scrollLeft = scrollLeft - walk;
                          };
                          
                          const handleMouseUp = () => {
                            isDown = false;
                            slider.style.cursor = 'grab';
                            document.removeEventListener('mousemove', handleMouseMove);
                            document.removeEventListener('mouseup', handleMouseUp);
                          };
                          
                          document.addEventListener('mousemove', handleMouseMove);
                          document.addEventListener('mouseup', handleMouseUp);
                        }}
                      >
                        <div className="flex gap-3 pb-2" style={{ minWidth: 'max-content' }}>
                          {(() => {
                            const filtered = menuItems.filter(item => 
                              item.category === 'Meals' && 
                              (!selectedMealSubCategory || item.subCategory === selectedMealSubCategory) &&
                              (searchTerm === '' || 
                               item.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
                               item.code.toLowerCase().includes(searchTerm.toLowerCase()))
                            );
                            console.log('[POS] Fallback Meals:', {
                              totalMenuItems: menuItems.length,
                              categoryItems: menuItems.filter(i => i.category === 'Meals').length,
                              filtered: filtered.length,
                              selectedMealSubCategory,
                              searchTerm
                            });
                            return filtered;
                          })().map(item => (
                              <div key={item._id} className="flex-shrink-0" style={{ width: '200px' }}>
                                <MenuItemCard
                                  item={item}
                                  onClick={() => item.isAvailable !== false ? addToOrder(item) : null}
                                  isUnavailable={item.isAvailable === false}
                                  isLocked={isItemLocked()}
                                />
                              </div>
                            ))
                          }
                        </div>
                      </div>
                    </div>

                    {/* Beverages Section */}
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
                              </>
                            )}
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
                      </div>
                      
                      {/* Display Beverage Items */}
                      <div 
                        className="overflow-x-scroll scrollbar-hide" 
                        style={{ 
                          maxWidth: '100%', 
                          width: '836px',
                          WebkitOverflowScrolling: 'touch',
                          cursor: 'grab',
                          userSelect: 'none'
                        }}
                        onMouseDown={(e) => {
                          const slider = e.currentTarget;
                          slider.style.cursor = 'grabbing';
                          let isDown = true;
                          let startX = e.pageX - slider.offsetLeft;
                          let scrollLeft = slider.scrollLeft;
                          
                          const handleMouseMove = (e) => {
                            if (!isDown) return;
                            e.preventDefault();
                            const x = e.pageX - slider.offsetLeft;
                            const walk = (x - startX) * 2;
                            slider.scrollLeft = scrollLeft - walk;
                          };
                          
                          const handleMouseUp = () => {
                            isDown = false;
                            slider.style.cursor = 'grab';
                            document.removeEventListener('mousemove', handleMouseMove);
                            document.removeEventListener('mouseup', handleMouseUp);
                          };
                          
                          document.addEventListener('mousemove', handleMouseMove);
                          document.addEventListener('mouseup', handleMouseUp);
                        }}
                      >
                        <div className="flex gap-3 pb-2" style={{ minWidth: 'max-content' }}>
                          {(() => {
                            const filtered = menuItems.filter(item => 
                              item.category === 'Beverages' && 
                              (!selectedBeverageSubCategory || item.subCategory === selectedBeverageSubCategory) &&
                              (searchTerm === '' || 
                               item.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
                               item.code.toLowerCase().includes(searchTerm.toLowerCase()))
                            );
                            console.log('[POS] Fallback Beverages:', {
                              totalMenuItems: menuItems.length,
                              categoryItems: menuItems.filter(i => i.category === 'Beverages').length,
                              filtered: filtered.length,
                              selectedBeverageSubCategory,
                              searchTerm
                            });
                            return filtered;
                          })().map(item => (
                              <div key={item._id} className="flex-shrink-0" style={{ width: '200px' }}>
                                <MenuItemCard
                                  item={item}
                                  onClick={() => item.isAvailable !== false ? addToOrder(item) : null}
                                  isUnavailable={item.isAvailable === false}
                                  isLocked={isItemLocked()}
                                />
                              </div>
                            ))
                          }
                        </div>
                      </div>
                    </div>
                  </>
                )}
                  </div>
                </div>
                {/* End scrollable content area */}
              </div>
              {/* End white container */}
            </div>
            {/* End left panel wrapper */}

            {/* Order Panel */}
            <div
              className="w-full md:w-[45vw] lg:w-[35vw] xl:w-[30vw] max-w-3xl rounded-t-3xl md:rounded-3xl m-0 md:m-4 p-4 md:p-6 shadow-2xl order-1 md:order-2 flex flex-col overflow-visible"
              style={{ backgroundColor: theme.colors.background, maxHeight: 'calc(100vh - 32px)' }}
            >
              <div className="flex-1 min-h-0 flex flex-col">
                {/* Order View Toggle - three tabs now */}
                <div className="flex justify-center mb-2 gap-2 overflow-visible pt-2">
                  <button
                    className={`px-4 py-1 rounded-lg font-semibold text-sm transition-colors relative`}
                    style={{
                      backgroundColor: orderViewType === 'ready' ? theme.colors.accentLight : '#f3f4f6',
                      color: orderViewType === 'ready' ? theme.colors.accent : '#6b7280'
                    }}
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
                    className={`px-4 py-1 rounded-lg font-semibold text-sm transition-colors relative overflow-visible`}
                    style={{
                      backgroundColor: orderViewType === 'pending' ? theme.colors.accentLight : '#f3f4f6',
                      color: orderViewType === 'pending' ? theme.colors.accent : '#6b7280'
                    }}
                    onClick={() => {
                      setOrderViewType('pending');
                      if (!isPendingOrderMode) {
                        setEditingPendingOrder(null);
                      }
                      // Mark all pending orders as seen
                      const pendingIds = activeOrders
                        .filter(order => order.status === "pending" && order.paymentMethod === "pending")
                        .map(order => order._id);
                      setSeenOrderIds(prev => new Set([...prev, ...pendingIds]));
                    }}
                  >
                    Pending Orders
                    {/* New order indicator */}
                    {activeOrders.filter(order => 
                      order.status === "pending" && 
                      order.paymentMethod === "pending" && 
                      !seenOrderIds.has(order._id)
                    ).length > 0 && (
                      <span 
                        className="absolute -top-1 -right-1 w-5 h-5 rounded-full text-white text-xs flex items-center justify-center animate-pulse"
                        style={{ backgroundColor: theme.colors.accent }}
                      >
                        {activeOrders.filter(order => 
                          order.status === "pending" && 
                          order.paymentMethod === "pending" && 
                          !seenOrderIds.has(order._id)
                        ).length}
                      </span>
                    )}
                  </button>
                  <button
                    className={`px-4 py-1 rounded-lg font-semibold text-sm transition-colors relative overflow-visible`}
                    style={{
                      backgroundColor: orderViewType === 'dineTakeout' ? theme.colors.accentLight : '#f3f4f6',
                      color: orderViewType === 'dineTakeout' ? theme.colors.accent : '#6b7280'
                    }}
                    onClick={() => {
                      setOrderViewType('dineTakeout');
                      setIsPendingOrderMode(false);
                      setEditingPendingOrder(null);
                      setPendingOrderItems([]);
                      // Mark all takeout orders as seen
                      const takeoutIds = takeoutOrders.map(order => order._id);
                      setSeenOrderIds(prev => new Set([...prev, ...takeoutIds]));
                    }}
                  >
                    Dine/Take-outs
                    {/* New order indicator */}
                    {takeoutOrders.filter(order => !seenOrderIds.has(order._id)).length > 0 && (
                      <span 
                        className="absolute -top-1 -right-1 w-5 h-5 rounded-full text-white text-xs flex items-center justify-center animate-pulse"
                        style={{ backgroundColor: theme.colors.accent }}
                      >
                        {takeoutOrders.filter(order => !seenOrderIds.has(order._id)).length}
                      </span>
                    )}
                  </button>
                </div>

                {/* Cart (Current Order) - hidden for Dine/Take-outs tab since orders are locked */}
                {orderViewType !== 'dineTakeout' &&
                <div className="flex-1 overflow-y-auto space-y-1.5 mb-4">
                    {/* Editing Order Header: Only shown when editing a specific pending order on the pending tab */}
                    {orderViewType === 'pending' && isPendingOrderMode && editingPendingOrder && (
                      <div className="bg-orange-50 p-2 mb-2 rounded-lg">
                      <div className="flex justify-between items-center">
                        <span className="font-medium text-orange-700">
                          Editing Order #{editingPendingOrder.receiptNumber || editingPendingOrder._id?.substring(0, 6)}
                        </span>
                        <button
                          onClick={() => {                            setEditingPendingOrder(null);
                            setIsPendingOrderMode(false);
                            setPendingOrderItems([]);
                            // Reset payment method or other relevant states if needed
                            setPaymentMethod('cash'); // Example: reset to default
                            setCashAmount(0);
                            setCustomerName(''); // Reset customer name when canceling edit
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
                            <div className="space-y-3 overflow-visible">
                              {activeOrders.filter(order => order.status === "pending" && order.paymentMethod === "pending").length === 0 ? (
                                <div className="text-center text-gray-400 py-8">No pending orders.</div>
                              ) : (
                                activeOrders
                                  .filter(order => order.status === "pending" && order.paymentMethod === "pending")
                                  .map(order => {
                                    const isNewOrder = !seenOrderIds.has(order._id);
                                    return (
                                    <div
                                      key={order._id}
                                      className="p-3 rounded-lg hover:bg-gray-50 relative group overflow-visible"
                                      style={{ 
                                        backgroundColor: isNewOrder ? theme.colors.accentLight : undefined,
                                        border: isNewOrder ? `2px solid ${theme.colors.accent}` : undefined
                                      }}
                                    >
                                      {/* New order indicator */}
                                      {isNewOrder && (
                                        <div 
                                          className="absolute top-1 right-1 px-2 py-0.5 rounded-full text-white text-xs font-bold animate-pulse z-10"
                                          style={{ backgroundColor: theme.colors.accent }}
                                        >
                                          NEW
                                        </div>
                                      )}
                                      <div className="flex items-start gap-2">
                                        {/* Delete Button - Left side */}
                                        <button
                                          onClick={(e) => {
                                            e.stopPropagation();
                                            deletePendingOrder(order._id);
                                          }}
                                          className="flex-shrink-0 p-1.5 rounded-full opacity-0 group-hover:opacity-100 transition-opacity bg-red-100 hover:bg-red-200 text-red-600"
                                          title="Delete Order"
                                        >
                                          <FiTrash2 size={14} />
                                        </button>
                                        
                                        <div 
                                          className="flex-1 cursor-pointer"
                                          onClick={() => {
                                            // Mark as seen when clicked
                                            setSeenOrderIds(prev => new Set([...prev, order._id]));
                                            setEditingPendingOrder(order);
                                            setIsPendingOrderMode(true);
                                            setPendingOrderItems(order.items.map(item => ({
                                              ...item,
                                              _id: item._id || item.itemId,
                                              selectedSize: item.selectedSize || 'base',
                                              availableSizes: Object.keys(item.pricing || { base: item.price }),
                                              pricing: item.pricing || { base: item.price }
                                            })));                                        // Reset new order cart when an existing pending order is selected
                                            setPendingOrderCart([]); 
                                            // Reset payment method or other relevant states if needed
                                            setPaymentMethod('cash'); 
                                            setCashAmount(0);
                                            setCustomerName(''); // Reset customer name when starting to edit pending order
                                          }}
                                        >
                                          <div className="flex justify-between items-center">
                                            <div className="flex-1">
                                              <span className="font-medium" style={{ color: theme.colors.primary }}>
                                                Order #{order.receiptNumber || order._id?.substring(0, 6)}
                                              </span>
                                              {order.customerName && (
                                                <span className="text-xs text-gray-500 ml-2">
                                                  - {order.customerName}
                                                </span>
                                              )}
                                              <div className="text-xs text-gray-500 mt-1">
                                                {order.items?.length || 0} item(s) • ₱{order.totals?.total?.toFixed(2) || '0.00'}
                                              </div>
                                            </div>
                                            <button
                                              className="text-xs px-2 py-1 rounded-lg"
                                              style={{ backgroundColor: theme.colors.accent, color: theme.colors.background }}
                                            >
                                              Process
                                            </button>
                                          </div>
                                        </div>
                                      </div>
                                    </div>
                                  );})
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
                </div>} {/* End of flex-1 overflow-y-auto space-y-1.5 mb-4 and orderViewType !== 'dineTakeout' conditional */}
                
                {/* NEW: Dine/Take-outs Section (Payment Verification) */}
                {orderViewType === 'dineTakeout' && (
                  <div className="mt-4 pt-4 border-t-2">
                    <h3 className="text-lg font-semibold mb-3" style={{ color: theme.colors.primary }}>
                      Awaiting Payment Verification ({takeoutOrders.length})
                    </h3>
                    <div className="space-y-3 max-h-[70vh] overflow-y-auto pt-3">
                      {takeoutOrders.length > 0 ? (
                        takeoutOrders.map(order => {
                          const isExpiringSoon = order.proofOfPayment?.expiresAt && 
                            new Date(order.proofOfPayment.expiresAt) - new Date() < 5 * 60 * 1000;
                          const isExpired = order.proofOfPayment?.expiresAt && 
                            new Date(order.proofOfPayment.expiresAt) < new Date();
                          
                          // Detect PayMongo orders
                          const isPayMongoOrder = order.paymentMethod === 'paymongo' || order.status === 'paymongo_verified';
                          const isNewOrder = !seenOrderIds.has(order._id);
                          
                          return (
                            <div 
                              key={order._id}
                              className={`p-3 rounded-lg border transition-shadow relative ${
                                isExpired ? 'bg-red-50 border-red-300' : 
                                isExpiringSoon ? 'bg-yellow-50 border-yellow-300' : 
                                'border-gray-200'
                              }`}
                              style={{
                                backgroundColor: isPayMongoOrder && !isExpired && !isExpiringSoon 
                                  ? theme.colors.accentLight 
                                  : undefined
                              }}
                            >
                              {/* New order indicator */}
                              {isNewOrder && (
                                <div 
                                  className="absolute top-1 right-1 px-2 py-0.5 rounded-full text-white text-xs font-bold animate-pulse z-10"
                                  style={{ backgroundColor: theme.colors.accent }}
                                >
                                  NEW
                                </div>
                              )}
                              {/* Order Header */}
                              <div className="flex justify-between items-center mb-2">
                                <div className="flex-1">
                                  <div className="font-bold text-base" style={{ color: theme.colors.primary }}>
                                    #{order.receiptNumber}
                                  </div>
                                  <div className="text-xs text-gray-600">
                                    {order.fulfillmentType === 'delivery' ? 'Delivery' : order.fulfillmentType === 'dine_in' ? 'Dine-In' : 'Takeout'} • 
                                    {isPayMongoOrder ? 
                                      ` PayMongo ${order.paymentMethod?.includes('gcash') ? 'GCash' : 'PayMaya'}` :
                                      (order.paymentMethod === 'gcash' ? ' GCash' : order.paymentMethod === 'paymaya' ? ' PayMaya' : ' E-Wallet')
                                    } • 
                                    ₱{order.totals?.total}
                                  </div>
                                  {isPayMongoOrder ? (
                                    <div className="text-xs mt-1 font-semibold" style={{ color: theme.colors.accent }}>
                                      ✓ Payment Verified by PayMongo
                                    </div>
                                  ) : (
                                    <>
                                      {order.proofOfPayment?.transactionReference && (
                                        <div className="text-xs text-gray-500 mt-1">
                                          Ref: {order.proofOfPayment.transactionReference}
                                        </div>
                                      )}
                                      {order.proofOfPayment?.accountName && (
                                        <div className="text-xs text-gray-500">
                                          {order.proofOfPayment.accountName}
                                        </div>
                                      )}
                                    </>
                                  )}
                                </div>
                                <div className="text-right">
                                  {isPayMongoOrder ? (
                                    <span 
                                      className="text-xs px-3 py-1 rounded-full font-semibold text-white"
                                      style={{ backgroundColor: theme.colors.accent }}
                                    >
                                      PAID
                                    </span>
                                  ) : (
                                    <span className={`text-xs px-2 py-1 rounded-full ${
                                      isExpired ? 'bg-red-100 text-red-700' :
                                      isExpiringSoon ? 'bg-yellow-100 text-yellow-700' :
                                      'bg-blue-100 text-blue-700'
                                    }`}>
                                      {isExpired ? 'EXPIRED' : 'Pending'}
                                    </span>
                                  )}
                                  {!isPayMongoOrder && order.proofOfPayment?.expiresAt && !isExpired && (
                                    <div className="text-xs mt-1 text-gray-500">
                                      {new Date(order.proofOfPayment.expiresAt).toLocaleTimeString()}
                                    </div>
                                  )}
                                </div>
                              </div>

                              {/* Payment Proof Thumbnail - only for manual payments */}
                              {!isPayMongoOrder && order.proofOfPayment?.imageUrl && (
                                <div className="mb-2">
                                  <img 
                                    src={order.proofOfPayment.imageUrl.startsWith('http')
                                      ? order.proofOfPayment.imageUrl
                                      : `${API_URL}${order.proofOfPayment.imageUrl}`}
                                    alt="Payment Proof"
                                    className="w-full h-32 object-contain border rounded bg-gray-50"
                                    title="Click card to view details"
                                  />
                                </div>
                              )}

                              {/* Action Button */}
                              {isPayMongoOrder ? (
                                <div className="relative mt-2">
                                  {/* Loading overlay */}
                                  {processingPayMongoId === order._id && (
                                    <div className="absolute inset-0 bg-white/80 backdrop-blur-sm rounded-lg flex items-center justify-center z-20">
                                      <div className="animate-spin rounded-full h-6 w-6 border-2 border-gray-300" style={{ borderTopColor: theme.colors.accent }}></div>
                                    </div>
                                  )}
                                  
                                  <button
                                    disabled={processingPayMongoId === order._id}
                                    onClick={async () => {
                                      setProcessingPayMongoId(order._id);
                                      try {
                                        await handleProcessPayMongoOrder(order._id);
                                      } finally {
                                        setProcessingPayMongoId(null);
                                      }
                                    }}
                                    className={`w-full py-2.5 rounded-lg font-semibold transition-all shadow-md ${
                                      processingPayMongoId === order._id
                                        ? 'bg-gray-300 text-gray-600 cursor-not-allowed opacity-50'
                                        : 'text-white hover:shadow-lg'
                                    }`}
                                    style={{
                                      backgroundColor: processingPayMongoId === order._id ? undefined : theme.colors.accent
                                    }}
                                  >
                                    Generate Receipt & Process
                                  </button>
                                </div>
                              ) : (
                                <div 
                                  onClick={() => {
                                    setSelectedVerificationOrder(order);
                                    setShowVerificationModal(true);
                                  }}
                                  className="text-xs text-center text-gray-400 mt-2 cursor-pointer hover:text-gray-600"
                                >
                                  Click to view details and verify
                                </div>
                              )}
                            </div>
                          );
                        })
                      ) : (
                        <div className="text-center text-gray-400 py-8">
                          <FiCoffee className="mx-auto text-4xl mb-2" />
                          <p>No orders awaiting verification</p>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>

              {/* Payment Panel - hidden for Dine/Take-outs tab since orders are locked */}
              {orderViewType !== 'dineTakeout' && (
              <div className="mt-auto">                <PaymentPanel
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
                  onProcessPayment={() => setShowPaymentProcessingModal(true)}
                  onCancelOrder={() => {
                    if (isPendingOrderMode) {
                      setEditingPendingOrder(null);
                      setIsPendingOrderMode(false);
                      setPendingOrderItems([]);
                      setCustomerName(''); // Reset customer name when canceling pending order
                    } else {
                      cancelOrder();
                    }
                  }}
                  disabled={
                    (!isPendingOrderMode && (orderViewType === 'ready' ? readyOrderCart : pendingOrderCart).length === 0) ||
                    (isPendingOrderMode && pendingOrderItems.length === 0)
                  }
                />
              </div>
              )}
            </div>            {/* Receipt Modal */}            <Modal isOpen={showReceipt} onClose={() => setShowReceipt(false)} size="lg">
              <Receipt
                ref={receiptRef}
                order={{
                  items: savedOrderData?.items || (isPendingOrderMode ? pendingOrderItems : (orderViewType === 'ready' ? readyOrderCart : pendingOrderCart)),
                  receiptNumber: savedOrderData?.receiptNumber || (isPendingOrderMode && editingPendingOrder ? 
                    editingPendingOrder.receiptNumber : 
                    generateReceiptNumber()),
                  server: savedOrderData?.processedBy?.username || (() => {
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
                  discountCardDetails: savedOrderData?.discountCards || (parseFloat(isPendingOrderMode 
                    ? calculatePendingOrderTotal().discount
                    : calculateTotal().discount) > 0 ? discountCardDetails : null)
                }}                totals={{
                  subtotal: savedOrderData?.totals?.subtotal || (isPendingOrderMode 
                    ? calculatePendingOrderTotal().subtotal
                    : calculateTotal().subtotal),
                  discount: savedOrderData?.totals?.discount || (isPendingOrderMode 
                    ? calculatePendingOrderTotal().discount
                    : calculateTotal().discount),
                  total: savedOrderData?.totals?.total || (isPendingOrderMode
                    ? calculatePendingOrderTotal().total
                    : calculateTotal().total),
                  customerName: savedOrderData?.customerName || customerName || '',
                  cashReceived: savedOrderData?.totals?.cashReceived || (isPendingOrderMode && editingPendingOrder?.totals?.cashReceived 
                    ? editingPendingOrder.totals.cashReceived.toFixed(2)
                    : (paymentMethod === 'cash' ? parseFloat(cashAmount).toFixed(2) : "0.00")),
                  change: savedOrderData?.totals?.change !== undefined ? savedOrderData.totals.change : (isPendingOrderMode && editingPendingOrder?.totals?.change !== undefined
                    ? editingPendingOrder.totals.change.toFixed(2)
                    : (paymentMethod === 'cash' ? 
                        (parseFloat(cashAmount) - (isPendingOrderMode 
                          ? parseFloat(calculatePendingOrderTotal().total)
                          : parseFloat(calculateTotal().total)
                        )).toFixed(2) : "0.00")),
                  eWalletProvider: paymentMethod === 'e-wallet' ? eWalletDetails?.provider || '' : '',
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
                      
                      // If this was a PayMongo order, refresh the lists
                      if (savedOrderData?.paymentMethod === 'paymongo') {
                        setSavedOrderData(null);
                        fetchActiveOrders();
                        fetchTakeoutOrders();
                      }
                      
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
                        setCustomerName(''); // Reset customer name when closing receipt
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
                  toast.error('Error updating cash float settings: ' + error.message);
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

        {/* Payment Processing Modal */}
        {showPaymentProcessingModal && (
          <PaymentProcessingModal
            isOpen={showPaymentProcessingModal}
            onClose={() => setShowPaymentProcessingModal(false)}
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
            onProcessPayment={async (paymentDetails) => {
              try {
                // Update the state with payment details
                setPaymentMethod(paymentDetails.method);
                setCashAmount(paymentDetails.cashAmount);
                setEWalletDetails(paymentDetails.eWalletDetails || { provider: 'gcash', referenceNumber: '', name: '' });
                setCustomerName(paymentDetails.customerName);
                // Store discount cards for use in order saving
                if (paymentDetails.discountCards) {
                  setDiscountCardDetails({ discountCards: paymentDetails.discountCards });
                }

                // Process the payment with the payment details directly
                if (isPendingOrderMode) {
                  await processPendingOrderPayment(paymentDetails);
                } else {
                  await processPayment(paymentDetails);
                }
              } catch (error) {
                console.error('Payment processing error:', error);
                throw error; // Re-throw to let the modal handle it
              }
            }}
            eWalletDetails={eWalletDetails}
            onEWalletDetailsChange={setEWalletDetails}
            customerName={customerName}
            onCustomerNameChange={setCustomerName}
            orderItems={isPendingOrderMode ? pendingOrderItems : (orderViewType === 'ready' ? readyOrderCart : pendingOrderCart)}
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
            className="overflow-visible"
            footer={
              <div className="flex gap-3 w-full -mx-4 -my-14 px-4 py-3" style={{ width: 'calc(100% + 2rem)' }}>
                <button
                  onClick={() => {
                    handleQuickVerify(selectedVerificationOrder._id);
                    setShowVerificationModal(false);
                    setSelectedVerificationOrder(null);
                    setExpandedImage(false);
                  }}
                  className="flex-1 py-3 rounded bg-green-500 text-white hover:bg-green-600 font-semibold shadow-lg text-base"
                >
                  Verify Payment
                </button>
                <button
                  onClick={() => {
                    handleQuickReject(selectedVerificationOrder._id);
                    setShowVerificationModal(false);
                    setSelectedVerificationOrder(null);
                    setExpandedImage(false);
                  }}
                  className="flex-1 py-3 rounded bg-red-500 text-white hover:bg-red-600 font-semibold shadow-lg text-base"
                >
                  Reject Payment
                </button>
              </div>
            }
          >
            <div className="p-6 max-h-[calc(90vh-180px)] overflow-y-auto">
              {/* Header with Order # and Thumbnail */}
              <div className="flex justify-between items-start mb-6">
                <h2 className="text-2xl font-bold flex-1" style={{ color: theme.colors.primary }}>
                  Order #{selectedVerificationOrder.receiptNumber}
                </h2>
                
                {/* 1x1 Thumbnail - Top Right */}
                {selectedVerificationOrder.proofOfPayment?.imageUrl && (
                  <div className="ml-4">
                    <img 
                      src={selectedVerificationOrder.proofOfPayment.imageUrl.startsWith('http')
                        ? selectedVerificationOrder.proofOfPayment.imageUrl
                        : `${API_URL}${selectedVerificationOrder.proofOfPayment.imageUrl}`}
                      alt="Payment Proof"
                      className="w-20 h-20 object-cover cursor-pointer hover:ring-2 ring-blue-500 rounded border-2 border-gray-300 transition-all"
                      onClick={() => setExpandedImage(!expandedImage)}
                      title="Click to expand/collapse"
                    />
                    <p className="text-xs text-center text-gray-500 mt-1">Click to expand</p>
                  </div>
                )}
              </div>

              {/* Expanded Image Overlay (inside modal) */}
              {expandedImage && selectedVerificationOrder.proofOfPayment?.imageUrl && (
                <div 
                  className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-[200] p-4"
                  onClick={() => setExpandedImage(false)}
                >
                  <div className="relative max-w-4xl max-h-[90vh]">
                    <img 
                      src={selectedVerificationOrder.proofOfPayment.imageUrl.startsWith('http')
                        ? selectedVerificationOrder.proofOfPayment.imageUrl
                        : `${API_URL}${selectedVerificationOrder.proofOfPayment.imageUrl}`}
                      alt="Payment Proof Full Size"
                      className="max-w-full max-h-[90vh] object-contain"
                      onClick={(e) => e.stopPropagation()}
                    />
                    <button
                      onClick={() => setExpandedImage(false)}
                      className="absolute top-2 right-2 bg-white rounded-full p-2 hover:bg-gray-100"
                    >
                      ×
                    </button>
                  </div>
                </div>
              )}

              {/* Payment Details - Prominent Display */}
              <div className="mb-6">
                <h3 className="font-semibold text-lg mb-3">Payment Details</h3>
                {(selectedVerificationOrder.proofOfPayment?.accountName || selectedVerificationOrder.proofOfPayment?.transactionReference) && (
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                    {selectedVerificationOrder.proofOfPayment?.accountName && (
                      <div className="mb-2">
                        <span className="text-sm font-semibold">Account Name:</span>
                        <span className="ml-2 text-base font-medium">{selectedVerificationOrder.proofOfPayment.accountName}</span>
                      </div>
                    )}
                    {selectedVerificationOrder.proofOfPayment?.transactionReference && (
                      <div>
                        <span className="text-sm font-semibold">Reference #:</span>
                        <span className="ml-2 text-base font-medium">{selectedVerificationOrder.proofOfPayment.transactionReference}</span>
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Order Summary */}
              <div className="mb-6">
                <h3 className="font-semibold text-lg mb-3">Order Summary</h3>
                <div className="bg-gray-50 p-4 rounded">
                  <div className="grid grid-cols-2 gap-2 text-sm">
                    <div>
                      <span className="text-gray-600">Amount:</span>
                      <span className="font-semibold ml-2">₱{selectedVerificationOrder.totals?.total}</span>
                    </div>
                    <div>
                      <span className="text-gray-600">Payment:</span>
                      <span className="font-semibold ml-2">
                        {selectedVerificationOrder.paymentMethod === 'gcash' ? 'GCash' : 
                         selectedVerificationOrder.paymentMethod === 'paymaya' ? 'Maya' : 
                         selectedVerificationOrder.paymentDetails?.eWalletProvider === 'gcash' ? 'GCash' :
                         selectedVerificationOrder.paymentDetails?.eWalletProvider === 'paymaya' ? 'Maya' :
                         'E-Wallet'}
                      </span>
                    </div>
                    <div>
                      <span className="text-gray-600">Type:</span>
                      <span className="font-semibold ml-2">{selectedVerificationOrder.fulfillmentType}</span>
                    </div>
                    <div>
                      <span className="text-gray-600">Time:</span>
                      <span className="font-semibold ml-2">
                        {new Date(selectedVerificationOrder.createdAt).toLocaleString()}
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Customer Information */}
              {selectedVerificationOrder.customerId && (
                <div className="mb-6">
                  <h3 className="font-semibold text-lg mb-3">Customer Information</h3>
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                    <div className="grid grid-cols-2 gap-2 text-sm">
                      <div>
                        <span className="text-gray-600">Name:</span>
                        <span className="font-semibold ml-2">
                          {selectedVerificationOrder.customerId.firstName && selectedVerificationOrder.customerId.lastName
                            ? `${selectedVerificationOrder.customerId.firstName} ${selectedVerificationOrder.customerId.lastName}`
                            : selectedVerificationOrder.customerId.username || 'N/A'}
                        </span>
                      </div>
                      <div>
                        <span className="text-gray-600">Phone:</span>
                        <span className="font-semibold ml-2">{selectedVerificationOrder.customerId.phone || 'N/A'}</span>
                      </div>
                      <div className="col-span-2">
                        <span className="text-gray-600">Email:</span>
                        <span className="font-semibold ml-2">{selectedVerificationOrder.customerId.email || 'N/A'}</span>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Delivery Address */}
              {selectedVerificationOrder.fulfillmentType === 'delivery' && selectedVerificationOrder.deliveryAddressId && (
                <div className="mb-6">
                  <h3 className="font-semibold text-lg mb-3">Delivery Address</h3>
                  <div className="bg-orange-50 border border-orange-200 rounded-lg p-4">
                    <div className="text-sm space-y-1">
                      <p className="font-semibold text-gray-900">
                        {selectedVerificationOrder.deliveryAddressId.label || 'Delivery Address'}
                      </p>
                      <p className="text-gray-700">{selectedVerificationOrder.deliveryAddressId.street}</p>
                      <p className="text-gray-700">
                        {selectedVerificationOrder.deliveryAddressId.barangay}, {selectedVerificationOrder.deliveryAddressId.city}
                      </p>
                      {selectedVerificationOrder.deliveryAddressId.notes && (
                        <p className="text-gray-600 italic mt-2">
                          Note: {selectedVerificationOrder.deliveryAddressId.notes}
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {/* Items */}
              <div className="mb-6">
                <h3 className="font-semibold text-lg mb-3">Items</h3>
                <div className="space-y-2">
                  {selectedVerificationOrder.items?.map((item, idx) => (
                    <div key={idx} className="flex justify-between text-sm">
                      <span>
                        {item.quantity}x {item.name} {item.selectedSize && `(${item.selectedSize})`}
                      </span>
                      <span className="font-medium">₱{(item.price * item.quantity).toFixed(2)}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </Modal>
        )}

        {/* Item Customization Modal (Size, Variants, Add-ons) */}
        {showSizeModal && selectedItemForSize && (
          <ItemCustomizationModal
            item={selectedItemForSize}
            addOns={addOns || []}
            onClose={() => {
              setShowSizeModal(false);
              setSelectedItemForSize(null);
            }}
            onConfirm={(orderItem) => {
              addToCartWithSize(orderItem);
              setShowSizeModal(false);
              setSelectedItemForSize(null);
            }}
          />
        )}
      </motion.div>
    </motion.div>
  );
};

export default PointOfSale;

