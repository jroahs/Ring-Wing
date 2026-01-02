import React, { useState, useEffect, useMemo, useRef } from 'react';
import PropTypes from 'prop-types';
import theme from './theme';
import { API_URL } from './App';
import { AlternativesModal } from './components/ui/AlternativesModal';
import { useAlternatives } from './hooks/useAlternatives';
import SelfCheckoutAIAssistant from './components/ui/SelfCheckoutAIAssistant';
import { CartProvider, useCartContext } from './contexts/CartContext';
import { MenuProvider, useMenuContext } from './contexts/MenuContext';
import { useCustomerAuth } from './contexts/CustomerAuthContext';
import { SelfCheckoutNotificationProvider, useSelfCheckoutNotifications, NOTIFICATION_TYPES } from './contexts/SelfCheckoutNotificationContext';
import LayoutSelector from './components/layouts/LayoutSelector';
import OrderTypeSelector from './components/OrderTypeSelector';
import PaymentMethodSelector from './components/PaymentMethodSelector';
import ProofOfPaymentUpload from './components/ProofOfPaymentUpload';
import OrderTimeoutTimer from './components/OrderTimeoutTimer';
import DeliveryAddressSelector from './components/DeliveryAddressSelector';
import AddressFormModal from './components/customer/AddressFormModal';
import { FaCreditCard, FaStore } from 'react-icons/fa';
import io from 'socket.io-client';

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

const SelfCheckoutInternal = () => {
  // Add spinner CSS animation
  useEffect(() => {
    const style = document.createElement('style');
    style.textContent = `
      @keyframes spin {
        0% { transform: rotate(0deg); }
        100% { transform: rotate(360deg); }
      }
    `;
    document.head.appendChild(style);
    return () => document.head.removeChild(style);
  }, []);
  return (
    <MenuProvider>
      <CartProvider>
        <SelfCheckoutNotificationProvider>
          <SelfCheckoutContent />
        </SelfCheckoutNotificationProvider>
      </CartProvider>
    </MenuProvider>
  );
};

const SelfCheckoutContent = () => {
  // Get cart functionality from context
  const { 
    cartItems, 
    clearCart, 
    getTotals
  } = useCartContext();

  // Notification system
  const { addNotification } = useSelfCheckoutNotifications();

  const [orderNumber, setOrderNumber] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [orderSubmitted, setOrderSubmitted] = useState(false);
  
  // Clear cart when returning from PayMongo redirect
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const paymongoSuccess = urlParams.get('paymongo_success');
    const paymongoStatus = urlParams.get('payment_status');
    
    if (paymongoSuccess === 'true' || paymongoStatus === 'paid') {
      console.log('[PayMongo] Returning from payment redirect - clearing cart');
      clearCart();
      // Clean URL
      window.history.replaceState({}, document.title, window.location.pathname);
    }
  }, [clearCart]);
  
  // Payment verification states
  const [showPaymentFlow, setShowPaymentFlow] = useState(false); // Controls when to show overlay
  const [fulfillmentType, setFulfillmentType] = useState(null); // null, 'dine_in', 'takeout', 'delivery'
  const [dineInPaymentChoice, setDineInPaymentChoice] = useState(null); // null, 'pay_now', 'pay_later' - for dine_in only
  const [selectedAddressId, setSelectedAddressId] = useState(null); // Selected delivery address
  const [showAddressForm, setShowAddressForm] = useState(false); // Show add/edit address modal
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState(null); // null, 'gcash', 'paymaya', 'paymongo'
  const [uploadedProof, setUploadedProof] = useState(null);
  const [readyToUploadProof, setReadyToUploadProof] = useState(false); // User confirms they've made payment
  const [currentOrder, setCurrentOrder] = useState(null); // Stores order with timer info
  const [socket, setSocket] = useState(null);
  const [isProcessingPayment, setIsProcessingPayment] = useState(false); // Prevent double-click on PayMongo
  const { customer } = useCustomerAuth();

  // Initialize Socket.io connection
  useEffect(() => {
    if (currentOrder && currentOrder._id) {
      // Get authentication token (optional for customers, but helpful for tracking)
      const token = localStorage.getItem('token') || localStorage.getItem('authToken');
      
      const newSocket = io(API_URL, {
        auth: {
          token: token // Add token if available (customers may not have one)
        }
      });
      setSocket(newSocket);

      // Join order-specific room
      newSocket.emit('subscribeToOrder', currentOrder._id);

      // Listen for payment verification events
      newSocket.on('paymentVerified', (data) => {
        if (data.orderId === currentOrder._id) {
          setCurrentOrder(prev => ({ ...prev, status: 'payment_verified' }));
          addNotification({
            type: NOTIFICATION_TYPES.PAYMENT_VERIFIED,
            title: 'Payment Verified',
            message: 'Your payment has been confirmed! Your order is now being prepared.',
            orderId: currentOrder._id
          });
        }
      });

      newSocket.on('paymentRejected', (data) => {
        if (data.orderId === currentOrder._id) {
          setCurrentOrder(prev => ({ ...prev, status: 'cancelled' }));
          addNotification({
            type: NOTIFICATION_TYPES.PAYMENT_REJECTED,
            title: 'Payment Rejected',
            message: data.reason || 'Your payment could not be verified. Please contact staff for assistance.',
            orderId: currentOrder._id
          });
        }
      });

      return () => {
        newSocket.close();
      };
    }
  }, [currentOrder]);

  const calculateTotal = () => {
    return getTotals();
  };

  const saveOrderToDB = async (overrideFulfillmentType = null) => {
    const calculatedTotals = calculateTotal();
    let effectiveFulfillmentType = overrideFulfillmentType || fulfillmentType;
    
    // Validate fulfillmentType is a proper string
    const validFulfillmentTypes = ['dine_in', 'takeout', 'delivery'];
    if (typeof effectiveFulfillmentType !== 'string' || !validFulfillmentTypes.includes(effectiveFulfillmentType)) {
      console.warn('[saveOrderToDB] Invalid fulfillmentType:', effectiveFulfillmentType);
      effectiveFulfillmentType = 'dine_in'; // Default fallback
    }
    
    // Sanitize cart items to avoid circular references
    const sanitizedItems = cartItems.map(item => {
      const sanitized = {
        name: String(item.name || ''),
        price: Number(item.price) || 0,
        quantity: Number(item.quantity) || 1,
        selectedSize: String(item.selectedSize || 'Regular'),
        availableSizes: Array.isArray(item.availableSizes) ? [...item.availableSizes] : ['base'],
        pricing: item.pricing ? { ...item.pricing } : { base: item.price },
        variant: null,
        addOns: [],
        notes: String(item.notes || '')
      };
      
      // Safely extract variant data
      if (item.variant && typeof item.variant === 'object') {
        sanitized.variant = {
          name: String(item.variant.name || ''),
          priceAdjustment: Number(item.variant.priceAdjustment) || 0
        };
      }
      
      // Safely extract add-ons data
      if (Array.isArray(item.addOns)) {
        sanitized.addOns = item.addOns.map(addon => ({
          _id: String(addon._id || ''),
          name: String(addon.name || ''),
          price: Number(addon.price) || 0
        }));
      }
      
      return sanitized;
    });
    
    // Base order data
    const orderData = {
      items: sanitizedItems,
      totals: {
        subtotal: calculatedTotals.subtotal,
        total: calculatedTotals.total
      },
      orderType: 'self_checkout',
      fulfillmentType: effectiveFulfillmentType
    };

    // Add customer ID and name if authenticated (for all fulfillment types)
    if (customer) {
      orderData.customerId = customer._id;
      orderData.customerName = customer.fullName || `${customer.firstName || ''} ${customer.lastName || ''}`.trim() || 'Customer';
      console.log('[SelfCheckout processOrder] Adding customer ID:', customer._id, 'Name:', orderData.customerName);
    } else {
      console.log('[SelfCheckout processOrder] No customer authenticated - creating guest order');
    }

    // Add payment-specific fields based on fulfillment type and payment choice
    if (effectiveFulfillmentType === 'dine_in' && dineInPaymentChoice !== 'pay_now') {
      // Traditional dine-in flow (Pay Later at Counter)
      orderData.paymentMethod = 'pending';
      orderData.status = 'pending';
    } else {
      // Pay First flow: Takeout/Delivery OR Dine-In with Pay Now choice
      // Note: PayMongo payments are handled separately in handlePayMongoCheckout
      orderData.paymentMethod = 'e-wallet';
      orderData.status = 'pending_payment';
      orderData.paymentDetails = {
        eWalletProvider: selectedPaymentMethod
      };
    }
  
    try {
      // Safe JSON stringify that handles circular references
      const safeStringify = (obj) => {
        const seen = new WeakSet();
        return JSON.stringify(obj, (key, value) => {
          if (typeof value === 'object' && value !== null) {
            if (seen.has(value)) {
              return '[Circular]';
            }
            seen.add(value);
          }
          if (value instanceof Element || key.startsWith('__react')) {
            return '[DOM/React Element]';
          }
          return value;
        });
      };
      
      // Clean orderData to remove any circular references
      const cleanOrderData = JSON.parse(safeStringify(orderData));
      
      // Step 1: Create the order
      const response = await fetch(`${API_URL}/api/orders`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(cleanOrderData)
      });
      
      if (!response.ok) {
        throw new Error('Failed to create order');
      }
      
      const data = await response.json();
      const orderId = data.data._id;
      
      setOrderNumber(data.data.receiptNumber);
      
      // Step 2: Upload proof of payment if provided (for takeout/delivery)
      if (fulfillmentType !== 'dine_in' && uploadedProof) {
        // uploadedProof is already a FormData object from ProofOfPaymentUpload
        const proofResponse = await fetch(`${API_URL}/api/orders/${orderId}/upload-proof`, {
          method: 'POST',
          body: uploadedProof // Send FormData directly
        });
        
        if (!proofResponse.ok) {
          console.error('Failed to upload proof, but order was created');
        } else {
          const proofData = await proofResponse.json();
          if (proofData.success) {
            // Update current order with proof data including expiresAt
            setCurrentOrder(proofData.data);
            setOrderSubmitted(true);
            return; // Exit early since we have the updated order
          }
        }
      }
      
      // If no proof or proof upload failed, still show order confirmation
      setCurrentOrder(data.data);
      setOrderSubmitted(true);
    } catch (error) {
      console.error('Order submission error:', error);
      addNotification({
        type: NOTIFICATION_TYPES.ORDER_ERROR,
        title: 'Order Failed',
        message: 'Failed to submit your order. Please try again or contact staff for assistance.'
      });
    }
  };

  const processOrder = async (orderTypeFromMobile = null) => {
    // Guard: If an event object is passed instead of a string, treat it as no argument
    const validOrderTypes = ['dine_in', 'takeout', 'delivery'];
    const isValidOrderType = typeof orderTypeFromMobile === 'string' && validOrderTypes.includes(orderTypeFromMobile);
    const effectiveOrderType = isValidOrderType ? orderTypeFromMobile : null;
    
    console.log('[SelfCheckout] processOrder called with:', {
      orderTypeFromMobile,
      effectiveOrderType,
      showPaymentFlow,
      fulfillmentType,
      selectedPaymentMethod,
      cartItemsCount: cartItems.length
    });
    
    if (cartItems.length === 0) {
      addNotification({
        type: NOTIFICATION_TYPES.ORDER_ERROR,
        title: 'Empty Cart',
        message: 'Please add items to your cart before placing an order.'
      });
      return;
    }

    // If order type is passed from mobile layout, use it
    if (effectiveOrderType) {
      setFulfillmentType(effectiveOrderType);
      
      // For dine-in, submit immediately with the type passed directly
      if (effectiveOrderType === 'dine_in') {
        setShowPaymentFlow(true);
        // Pass fulfillment type directly to avoid race condition with setState
        await saveOrderToDB(effectiveOrderType);
        clearCart();
        return;
      }
      
      // For takeout/delivery, show payment flow
      setShowPaymentFlow(true);
      return;
    }

    // Show payment flow when user clicks process order
    if (!showPaymentFlow) {
      setShowPaymentFlow(true);
      return;
    }

    // For dine-in, submit immediately
    if (fulfillmentType === 'dine_in') {
      await saveOrderToDB();
      clearCart();
      return;
    }

    // For takeout/delivery, proof must be uploaded first
    if (!uploadedProof) {
      addNotification({
        type: NOTIFICATION_TYPES.ORDER_ERROR,
        title: 'Proof Required',
        message: 'Please upload your proof of payment before submitting the order.'
      });
      return;
    }

    await saveOrderToDB();
    clearCart();
  };

  const handleFulfillmentTypeSelect = (type) => {
    // Ensure we're setting a string, not an event object
    if (typeof type === 'string' && ['dine_in', 'takeout', 'delivery'].includes(type)) {
      setFulfillmentType(type);
    } else {
      console.warn('[SelfCheckout] Invalid type passed to handleFulfillmentTypeSelect:', type);
    }
  };

  const handlePaymentMethodSelect = async (method) => {
    setSelectedPaymentMethod(method);
    
    // If it's PayMongo gateway method, initiate checkout immediately
    if (method === 'paymongo') {
      await handlePayMongoCheckout();
    }
  };

  const handlePayMongoCheckout = async () => {
    // Prevent double-click - if already processing, do nothing
    if (isProcessingPayment) {
      console.log('[PayMongo] Already processing payment, ignoring duplicate click');
      return;
    }
    
    try {
      setIsProcessingPayment(true); // Lock to prevent duplicate orders
      console.log('Initiating PayMongo checkout');
      console.log('[PayMongo Debug] Cart items:', cartItems.length);
      console.log('[PayMongo Debug] fulfillmentType:', fulfillmentType, 'type:', typeof fulfillmentType);
      
      // Validate fulfillmentType is a proper string
      const validFulfillmentTypes = ['dine_in', 'takeout', 'delivery'];
      let safeFulfillmentType = fulfillmentType;
      
      // If fulfillmentType is not a valid string, default to 'takeout'
      if (typeof fulfillmentType !== 'string' || !validFulfillmentTypes.includes(fulfillmentType)) {
        console.warn('[PayMongo] Invalid fulfillmentType detected:', fulfillmentType);
        safeFulfillmentType = 'takeout'; // Default fallback
      }
      
      // Validate address for delivery orders
      if (safeFulfillmentType === 'delivery' && !selectedAddressId) {
        addNotification({
          type: NOTIFICATION_TYPES.ORDER_ERROR,
          title: 'Address Required',
          message: 'Please select a delivery address before proceeding to payment.'
        });
        setIsProcessingPayment(false);
        return;
      }
      
      // First create the order - sanitize cart items to avoid circular references
      const totals = calculateTotal();
      const sanitizedItems = cartItems.map(item => {
        // Safely copy pricing - only include numeric values
        const safePricing = {};
        if (item.pricing && typeof item.pricing === 'object') {
          Object.keys(item.pricing).forEach(key => {
            if (key !== '_id' && typeof item.pricing[key] === 'number') {
              safePricing[key] = item.pricing[key];
            }
          });
        }
        if (Object.keys(safePricing).length === 0) {
          safePricing.base = Number(item.price) || 0;
        }
        
        // Extract only primitive/serializable data
        const sanitized = {
          name: String(item.name || ''),
          price: Number(item.price) || 0,
          quantity: Number(item.quantity) || 1,
          selectedSize: String(item.selectedSize || 'Regular'),
          availableSizes: Array.isArray(item.availableSizes) 
            ? item.availableSizes.map(s => String(s)) 
            : ['base'],
          pricing: safePricing,
          modifiers: [], // Don't include modifiers - they might have circular refs
          variant: null,
          addOns: [],
          pwdSeniorDiscount: {
            applied: false,
            discountedQuantity: 0,
            discountAmount: 0,
            vatExempt: false
          }
        };
        
        // Safely extract variant data
        if (item.variant && typeof item.variant === 'object') {
          sanitized.variant = {
            name: String(item.variant.name || ''),
            priceAdjustment: Number(item.variant.priceAdjustment) || 0
          };
        }
        
        // Safely extract add-ons data
        if (Array.isArray(item.addOns)) {
          sanitized.addOns = item.addOns.map(addon => ({
            _id: String(addon._id || ''),
            name: String(addon.name || ''),
            price: Number(addon.price) || 0
          }));
        }
        
        // Safely extract PWD/Senior discount
        if (item.pwdSeniorDiscount && typeof item.pwdSeniorDiscount === 'object') {
          sanitized.pwdSeniorDiscount = {
            applied: Boolean(item.pwdSeniorDiscount.applied),
            discountedQuantity: Number(item.pwdSeniorDiscount.discountedQuantity) || 0,
            discountAmount: Number(item.pwdSeniorDiscount.discountAmount) || 0,
            vatExempt: Boolean(item.pwdSeniorDiscount.vatExempt)
          };
        }
        
        return sanitized;
      });
      
      // Debug: Try to stringify each item to find problematic one
      console.log('[PayMongo Debug] Sanitized items count:', sanitizedItems.length);
      sanitizedItems.forEach((item, index) => {
        try {
          JSON.stringify(item);
          console.log(`[PayMongo Debug] Item ${index} OK:`, item.name);
        } catch (e) {
          console.error(`[PayMongo Debug] Item ${index} has circular ref:`, item.name, e);
        }
      });
      
      const orderData = {
        items: sanitizedItems,
        totals: {
          subtotal: totals.subtotal,
          discount: totals.discount || 0,
          vatExemption: 0,
          total: totals.total,
          cashReceived: 0,
          change: 0
        },
        customerName: customer ? (customer.fullName || `${customer.firstName || ''} ${customer.lastName || ''}`.trim() || 'Customer') : '',
        orderType: 'self_checkout',
        fulfillmentType: safeFulfillmentType,
        paymentMethod: 'paymongo',
        status: 'pending_payment',
        paymentGateway: {
          provider: 'paymongo',
          status: 'pending'
        }
      };

      // Add customer and address data if available
      if (customer) {
        orderData.customerId = customer._id;
        console.log('[PayMongo Checkout] Adding customer ID and name to order:', customer._id, orderData.customerName);
      } else {
        console.log('[PayMongo Checkout] No customer authenticated - creating guest order');
      }
      
      if (safeFulfillmentType === 'delivery' && selectedAddressId) {
        orderData.deliveryAddressId = selectedAddressId;
        console.log('[PayMongo Checkout] Adding delivery address ID:', selectedAddressId);
      }

      // Safe JSON stringify that handles circular references
      const safeStringify = (obj) => {
        const seen = new WeakSet();
        return JSON.stringify(obj, (key, value) => {
          if (typeof value === 'object' && value !== null) {
            if (seen.has(value)) {
              return '[Circular]';
            }
            seen.add(value);
          }
          // Skip DOM elements and React fiber nodes
          if (value instanceof Element || key.startsWith('__react')) {
            return '[DOM/React Element]';
          }
          return value;
        }, 2);
      };

      console.log('[PayMongo Checkout] Order data being sent:', safeStringify(orderData));

      // Use JSON.parse(JSON.stringify) to deep clone and remove any non-serializable data
      // This is the safest way to ensure no circular references exist
      let cleanOrderData;
      try {
        cleanOrderData = JSON.parse(safeStringify(orderData));
        console.log('[PayMongo Checkout] Clean order data:', cleanOrderData);
      } catch (e) {
        console.error('[PayMongo] Failed to clean orderData:', e);
        throw new Error('Failed to prepare order data');
      }

      // Create order first
      const orderResponse = await fetch(`${API_URL}/api/orders`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(cleanOrderData)
      });

      if (!orderResponse.ok) {
        const errorText = await orderResponse.text();
        console.error('[PayMongo Checkout] Order creation failed:', orderResponse.status, errorText);
        throw new Error(`Failed to create order: ${errorText}`);
      }

      const orderResult = await orderResponse.json();
      const orderId = orderResult.data._id;
      const receiptNumber = orderResult.data.receiptNumber;
      
      console.log('[PayMongo Checkout] Order created successfully:', { 
        orderId, 
        receiptNumber,
        customerId: orderResult.data.customerId,
        fullOrder: orderResult.data 
      });
      
      // Create PayMongo checkout session
      const checkoutResponse = await fetch(`${API_URL}/api/paymongo/create-checkout`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          orderId,
          amount: Math.round(calculateTotal().total * 100), // Convert to centavos
          description: `Ring & Wings Order #${receiptNumber}`
        })
      });

      console.log('PayMongo checkout response status:', checkoutResponse.status);

      if (!checkoutResponse.ok) {
        const errorData = await checkoutResponse.text();
        console.error('PayMongo checkout error details:', errorData);
        throw new Error(`Failed to create checkout session: ${errorData}`);
      }

      const checkoutResult = await checkoutResponse.json();
      
      console.log('PayMongo checkout result:', checkoutResult);
      
      if (checkoutResult.success && checkoutResult.data?.checkout_url) {
        // Store order info for tracking
        setCurrentOrder(orderResult);
        
        // Redirect to PayMongo checkout page (isProcessingPayment stays true during redirect)
        window.location.href = checkoutResult.data.checkout_url;
      } else {
        throw new Error(checkoutResult.message || 'Failed to create checkout session');
      }
      
    } catch (error) {
      console.error('PayMongo checkout error:', error);
      addNotification({
        type: NOTIFICATION_TYPES.PAYMENT_ERROR,
        title: 'Payment Setup Failed',
        message: `${error.message}. Please try again or contact staff for assistance.`
      });
      setSelectedPaymentMethod(null);
      setIsProcessingPayment(false); // Unlock on error to allow retry
    }
  };

  const handleProofSubmit = async (proofData) => {
    setUploadedProof(proofData);
  };

  const handleTimeout = () => {
    addNotification({
      type: NOTIFICATION_TYPES.ORDER_ERROR,
      title: 'Order Expired',
      message: 'Your order session has timed out. Please start a new order.'
    });
    resetFlow();
  };

  const resetFlow = () => {
    setShowPaymentFlow(false);
    setFulfillmentType(null);
    setDineInPaymentChoice(null);
    setSelectedAddressId(null);
    setSelectedPaymentMethod(null);
    setUploadedProof(null);
    setReadyToUploadProof(false);
    setCurrentOrder(null);
    setOrderSubmitted(false);
    setOrderNumber('');
    setIsProcessingPayment(false); // Reset payment processing lock
  };

  // Determine current step based on state
  const getCurrentStep = () => {
    console.log('[SelfCheckout] getCurrentStep called:', {
      showPaymentFlow,
      orderSubmitted,
      fulfillmentType,
      dineInPaymentChoice,
      selectedAddressId,
      selectedPaymentMethod
    });
    
    if (!showPaymentFlow) return 'menu'; // Still browsing menu
    if (orderSubmitted) return 'confirmation';
    if (!fulfillmentType) return 'selectType';
    if (fulfillmentType === 'delivery' && !selectedAddressId) return 'selectAddress'; // Address selection for delivery
    
    // For dine-in: Check if user has chosen payment method (Pay Now vs Pay Later)
    if (fulfillmentType === 'dine_in') {
      if (!dineInPaymentChoice) return 'selectDineInPayment'; // NEW: Choose Pay Now or Pay Later
      if (dineInPaymentChoice === 'pay_later') return 'readyToSubmit'; // Traditional flow
      // dineInPaymentChoice === 'pay_now' - continue to payment method selection
    }
    
    // Pay First flow: Takeout, Delivery, or Dine-In with Pay Now
    if (!selectedPaymentMethod) return 'selectPayment';
    
    // For PayMongo gateway payments, skip manual payment steps
    if (selectedPaymentMethod === 'paymongo') {
      return 'paymongoCheckout'; // Special step for PayMongo processing
    }
    
    if (!readyToUploadProof) return 'viewPaymentDetails'; // Show QR code and details
    if (!uploadedProof) return 'uploadProof';
    return 'readyToSubmit';
  };

  const currentStep = getCurrentStep();
  console.log('[SelfCheckout] currentStep:', currentStep, '| fulfillmentType:', fulfillmentType, '| dineInPaymentChoice:', dineInPaymentChoice, '| showPaymentFlow:', showPaymentFlow);

  // Render payment verification flow overlay
  const renderPaymentFlow = () => {
    console.log('[SelfCheckout] renderPaymentFlow called with currentStep:', currentStep);
    
    // Don't show overlay if user hasn't clicked process order yet
    if (currentStep === 'menu') return null;

    if (currentStep === 'confirmation') {
      // Determine if this is a Pay Later dine-in order
      const isPayLaterDineIn = fulfillmentType === 'dine_in' && dineInPaymentChoice !== 'pay_now';
      
      return (
        <div style={styles.overlay}>
          <div style={styles.flowContainer}>
            <h2 style={styles.flowTitle}>
              {isPayLaterDineIn ? 'Order Submitted!' : 'Order Awaiting Verification'}
            </h2>
            <p style={styles.orderNumber}>Order Number: <strong>{orderNumber}</strong></p>
            
            {isPayLaterDineIn ? (
              <div style={styles.successMessage}>
                <p>Please proceed to the counter for payment</p>
                <button onClick={resetFlow} style={styles.newOrderButton}>
                  Start New Order
                </button>
              </div>
            ) : (
              <div style={styles.verificationFlow}>
                {currentOrder && currentOrder.proofOfPayment?.expiresAt && (
                  <OrderTimeoutTimer
                    expiresAt={currentOrder.proofOfPayment.expiresAt}
                    onTimeout={handleTimeout}
                    orderStatus={currentOrder.status}
                  />
                )}
                <p style={styles.verificationNote}>
                  Your payment is being verified by our staff. You will be notified once verification is complete.
                </p>
                <button onClick={resetFlow} style={styles.newOrderButton}>
                  Start New Order
                </button>
              </div>
            )}
          </div>
        </div>
      );
    }

    if (currentStep === 'selectType') {
      return (
        <div style={styles.overlay}>
          <div style={styles.flowContainer}>
            <h2 style={styles.flowTitle}>Select Order Type</h2>
            <OrderTypeSelector onSelect={handleFulfillmentTypeSelect} />
          </div>
        </div>
      );
    }

    if (currentStep === 'selectAddress') {
      return (
        <div style={styles.overlay}>
          <div style={styles.flowContainer}>
            <h2 style={styles.flowTitle}>Select Delivery Address</h2>
            <DeliveryAddressSelector
              selectedAddressId={selectedAddressId}
              onSelect={setSelectedAddressId}
              onAddNew={() => setShowAddressForm(true)}
            />
            <button onClick={() => setFulfillmentType(null)} style={styles.backButton}>
              ← Back to Order Type
            </button>
          </div>
        </div>
      );
    }

    // NEW: Dine-In Payment Choice - Pay Now or Pay Later at Counter
    if (currentStep === 'selectDineInPayment') {
      return (
        <div style={styles.overlay}>
          <div style={styles.flowContainer}>
            <h2 style={styles.flowTitle}>How would you like to pay?</h2>
            <div style={styles.dineInPaymentOptions}>
              {/* Pay Now Option */}
              <button
                onClick={() => setDineInPaymentChoice('pay_now')}
                style={{
                  ...styles.paymentChoiceCard,
                  borderColor: colors.accent,
                  backgroundColor: '#fff'
                }}
              >
                <div style={{
                  ...styles.paymentChoiceIconContainer,
                  backgroundColor: colors.accent
                }}>
                  <FaCreditCard style={styles.paymentChoiceIconSvg} />
                </div>
                <div style={styles.paymentChoiceContent}>
                  <h3 style={styles.paymentChoiceTitle}>Pay Now</h3>
                  <p style={styles.paymentChoiceDesc}>
                    Pay via GCash, PayMaya, or PayMongo before your order is prepared
                  </p>
                </div>
              </button>

              {/* Pay Later Option */}
              <button
                onClick={() => setDineInPaymentChoice('pay_later')}
                style={{
                  ...styles.paymentChoiceCard,
                  borderColor: colors.primary,
                  backgroundColor: '#fff'
                }}
              >
                <div style={{
                  ...styles.paymentChoiceIconContainer,
                  backgroundColor: colors.primary
                }}>
                  <FaStore style={styles.paymentChoiceIconSvg} />
                </div>
                <div style={styles.paymentChoiceContent}>
                  <h3 style={styles.paymentChoiceTitle}>Pay at Counter</h3>
                  <p style={styles.paymentChoiceDesc}>
                    Traditional dine-in experience - pay when you pick up your order
                  </p>
                </div>
              </button>
            </div>
            <button onClick={() => setFulfillmentType(null)} style={styles.backButton}>
              ← Back to Order Type
            </button>
          </div>
        </div>
      );
    }

    // Show payment-related steps for: Takeout, Delivery, OR Dine-In with Pay Now
    const showPaymentSteps = fulfillmentType && (
      fulfillmentType !== 'dine_in' || dineInPaymentChoice === 'pay_now'
    );
    
    if (showPaymentSteps) {
      if (currentStep === 'selectPayment') {
        // Determine back button behavior based on order flow
        const handleBackFromPayment = () => {
          if (fulfillmentType === 'delivery') {
            setSelectedAddressId(null); // Go back to address selection
          } else if (fulfillmentType === 'dine_in') {
            setDineInPaymentChoice(null); // Go back to Pay Now/Pay Later choice
          } else {
            setFulfillmentType(null); // Go back to type selection (takeout)
          }
        };
        
        const backLabel = fulfillmentType === 'delivery' 
          ? 'Delivery Address' 
          : fulfillmentType === 'dine_in' 
            ? 'Payment Choice' 
            : 'Order Type';
        
        return (
          <div style={styles.overlay}>
            <div style={styles.flowContainer}>
              <h2 style={styles.flowTitle}>Select Payment Method</h2>
              <PaymentMethodSelector
                selectedMethod={selectedPaymentMethod}
                onSelect={handlePaymentMethodSelect}
                orderTotal={calculateTotal().total}
              />
              <button 
                onClick={handleBackFromPayment} 
                style={styles.backButton}
              >
                ← Back to {backLabel}
              </button>
            </div>
          </div>
        );
      }

      // PayMongo checkout processing step
      if (currentStep === 'paymongoCheckout') {
        return (
          <div style={styles.overlay}>
            <div style={styles.flowContainer}>
              <h2 style={styles.flowTitle}>Processing Payment</h2>
              <div style={{ textAlign: 'center', padding: '40px' }}>
                <div style={styles.spinner}></div>
                <p style={{ marginTop: '20px', color: '#666' }}>
                  Redirecting to secure payment page...
                </p>
                <p style={{ fontSize: '14px', color: '#999', marginTop: '10px' }}>
                  If you are not redirected automatically, please try again.
                </p>
                <button 
                  onClick={() => {
                    setSelectedPaymentMethod(null);
                    // currentStep is computed, not state - setting payment method to null will recalculate step
                  }} 
                  style={styles.backButton}
                >
                  ← Back to Payment Methods
                </button>
              </div>
            </div>
          </div>
        );
      }

      // NEW STEP: Show payment details and QR code with Continue button
      if (currentStep === 'viewPaymentDetails') {
        return (
          <div style={styles.overlay}>
            <div style={styles.flowContainer}>
              <h2 style={styles.flowTitle}>Make Your Payment</h2>
              <div style={{ marginBottom: '20px', padding: '15px', backgroundColor: '#fff3cd', borderRadius: '8px', border: '1px solid #ffc107' }}>
                <p style={{ margin: 0, color: '#856404', fontSize: '14px' }}>
                  Please complete your payment before proceeding. You will need to upload proof in the next step.
                </p>
              </div>
              <PaymentMethodSelector
                selectedMethod={selectedPaymentMethod}
                onSelect={handlePaymentMethodSelect}
                orderTotal={calculateTotal().total}
              />
              <div style={{ display: 'flex', gap: '12px', marginTop: '20px' }}>
                <button onClick={() => {
                  setSelectedPaymentMethod(null);
                  setReadyToUploadProof(false);
                }} style={{
                  ...styles.backButton,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '6px',
                  padding: '12px 24px',
                  fontSize: '14px',
                  fontWeight: '500',
                  flex: 1,
                  border: 'none',
                  borderRadius: '8px',
                  cursor: 'pointer',
                  backgroundColor: '#999',
                  color: 'white'
                }}>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M19 12H5M12 19l-7-7 7-7"/>
                  </svg>
                  Change Method
                </button>
                <button 
                  onClick={() => setReadyToUploadProof(true)}
                  style={{
                    flex: 1,
                    backgroundColor: theme.colors.primary,
                    color: 'white',
                    padding: '12px 24px',
                    fontSize: '14px',
                    fontWeight: '500',
                    border: 'none',
                    borderRadius: '8px',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '6px'
                  }}
                >
                  Proceed
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M5 12h14M12 5l7 7-7 7"/>
                  </svg>
                </button>
              </div>
            </div>
          </div>
        );
      }

      if (currentStep === 'uploadProof') {
        return (
          <div style={styles.overlay}>
            <div style={styles.flowContainer}>
              <h2 style={styles.flowTitle}>Upload Proof of Payment</h2>
              <ProofOfPaymentUpload
                paymentMethod={selectedPaymentMethod}
                orderTotal={calculateTotal().total}
                onProofSubmit={handleProofSubmit}
              />
              <button onClick={() => setReadyToUploadProof(false)} style={styles.backButton}>
                ← Back to Payment Details
              </button>
            </div>
          </div>
        );
      }
    }

    if (currentStep === 'readyToSubmit') {
      // Determine if this is a Pay First flow (has payment proof)
      const isPayFirstFlow = dineInPaymentChoice === 'pay_now' || fulfillmentType !== 'dine_in';
      const isPayLaterDineIn = fulfillmentType === 'dine_in' && dineInPaymentChoice === 'pay_later';
      
      // Handle back button based on flow
      const handleBackFromSubmit = () => {
        if (isPayLaterDineIn) {
          setDineInPaymentChoice(null); // Go back to Pay Now/Pay Later choice
        } else {
          setUploadedProof(null); // Go back to proof upload
        }
      };
      
      return (
        <div style={styles.overlay}>
          <div style={styles.flowContainer}>
            <h2 style={styles.flowTitle}>Ready to Submit Order</h2>
            <div style={styles.readyMessage}>
              <p>Order Type: <strong>{fulfillmentType === 'dine_in' ? 'Dine-In' : fulfillmentType === 'takeout' ? 'Takeout' : 'Delivery'}</strong></p>
              {isPayFirstFlow && uploadedProof && (
                <>
                  <p>Payment Method: <strong>{selectedPaymentMethod === 'gcash' ? 'GCash' : selectedPaymentMethod === 'paymaya' ? 'PayMaya' : 'PayMongo'}</strong></p>
                  <p>Proof Uploaded: <strong>Yes</strong></p>
                </>
              )}
              {isPayLaterDineIn && (
                <p>Payment: <strong>Pay at Counter</strong></p>
              )}
              <p>Total: <strong>₱{calculateTotal().total}</strong></p>
            </div>
            <button onClick={processOrder} style={styles.submitButton}>
              Submit Order
            </button>
            <button 
              onClick={handleBackFromSubmit} 
              style={styles.backButton}
            >
              ← Back
            </button>
          </div>
        </div>
      );
    }

    // Fallback: If we reach here but showPaymentFlow is true, show order type selector
    // This handles edge cases where state might be inconsistent
    if (showPaymentFlow && !orderSubmitted) {
      console.warn('[SelfCheckout] Unexpected state, falling back to selectType. CurrentStep:', currentStep, 'fulfillmentType:', fulfillmentType);
      return (
        <div style={styles.overlay}>
          <div style={styles.flowContainer}>
            <h2 style={styles.flowTitle}>Select Order Type</h2>
            <OrderTypeSelector onSelect={handleFulfillmentTypeSelect} />
          </div>
        </div>
      );
    }

    return null;
  };

  return (
    <>
      <LayoutSelector
        searchTerm={searchTerm}
        onSearchChange={setSearchTerm}
        orderNumber={orderNumber}
        orderSubmitted={orderSubmitted}
        onProcessOrder={processOrder}
      />
      {renderPaymentFlow()}
      
      {showAddressForm && (
        <AddressFormModal
          onClose={() => setShowAddressForm(false)}
          onSuccess={(newAddress) => {
            setShowAddressForm(false);
            setSelectedAddressId(newAddress._id); // Auto-select newly added address
          }}
        />
      )}
    </>
  );
};

const styles = {
  overlay: {
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(46, 3, 4, 0.95)',
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 9999,
    padding: '20px',
    overflowY: 'auto'
  },
  flowContainer: {
    backgroundColor: colors.background,
    borderRadius: '16px',
    padding: '32px',
    maxWidth: '800px',
    width: '100%',
    maxHeight: '90vh',
    overflowY: 'auto'
  },
  flowTitle: {
    fontSize: '28px',
    fontWeight: '700',
    color: colors.primary,
    marginBottom: '24px',
    textAlign: 'center'
  },
  orderNumber: {
    fontSize: '18px',
    color: colors.secondary,
    textAlign: 'center',
    marginBottom: '24px'
  },
  successMessage: {
    textAlign: 'center',
    padding: '24px',
    backgroundColor: '#E8F5E9',
    borderRadius: '12px',
    marginBottom: '24px'
  },
  verificationFlow: {
    textAlign: 'center'
  },
  verificationNote: {
    fontSize: '16px',
    color: colors.secondary,
    marginBottom: '24px',
    padding: '16px',
    backgroundColor: '#FFF3E0',
    borderRadius: '8px',
    border: `1px solid ${colors.accent}`
  },
  readyMessage: {
    padding: '24px',
    backgroundColor: '#E8F5E9',
    borderRadius: '12px',
    marginBottom: '24px'
  },
  submitButton: {
    width: '100%',
    padding: '16px',
    backgroundColor: colors.accent,
    color: '#fff',
    fontSize: '18px',
    fontWeight: '600',
    border: 'none',
    borderRadius: '12px',
    cursor: 'pointer',
    marginBottom: '12px',
    transition: 'all 0.3s ease'
  },
  backButton: {
    width: '100%',
    padding: '12px',
    backgroundColor: colors.muted,
    color: '#fff',
    fontSize: '16px',
    fontWeight: '500',
    border: 'none',
    borderRadius: '8px',
    cursor: 'pointer',
    transition: 'all 0.3s ease'
  },
  newOrderButton: {
    padding: '16px 32px',
    backgroundColor: colors.primary,
    color: '#fff',
    fontSize: '16px',
    fontWeight: '600',
    border: 'none',
    borderRadius: '12px',
    cursor: 'pointer',
    marginTop: '16px',
    transition: 'all 0.3s ease'
  },
  spinner: {
    width: '40px',
    height: '40px',
    margin: '0 auto',
    border: '4px solid #f3f3f3',
    borderTop: '4px solid #2e0304',
    borderRadius: '50%',
    animation: 'spin 1s linear infinite'
  },
  // Dine-In Payment Choice Styles
  dineInPaymentOptions: {
    display: 'flex',
    flexDirection: 'column',
    gap: '16px',
    marginBottom: '24px'
  },
  paymentChoiceCard: {
    display: 'flex',
    alignItems: 'center',
    gap: '20px',
    padding: '24px',
    border: '3px solid',
    borderRadius: '16px',
    cursor: 'pointer',
    transition: 'all 0.3s ease',
    textAlign: 'left'
  },
  paymentChoiceIconContainer: {
    width: '64px',
    height: '64px',
    borderRadius: '50%',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0
  },
  paymentChoiceIconSvg: {
    fontSize: '28px',
    color: '#fff'
  },
  paymentChoiceContent: {
    flex: 1
  },
  paymentChoiceTitle: {
    fontSize: '20px',
    fontWeight: '700',
    color: colors.primary,
    marginBottom: '8px',
    marginTop: 0
  },
  paymentChoiceDesc: {
    fontSize: '14px',
    color: colors.secondary,
    margin: 0,
    lineHeight: '1.4'
  }
};

export default SelfCheckoutInternal;