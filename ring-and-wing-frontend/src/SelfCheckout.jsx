import React, { useState, useEffect, useMemo, useRef } from 'react';
import PropTypes from 'prop-types';
import theme from './theme';
import { API_URL } from './App';
import { AlternativesModal } from './components/ui/AlternativesModal';
import { useAlternatives } from './hooks/useAlternatives';
import SelfCheckoutAIAssistant from './components/ui/SelfCheckoutAIAssistant';
import { CartProvider, useCartContext } from './contexts/CartContext';
import { MenuProvider, useMenuContext } from './contexts/MenuContext';
import LayoutSelector from './components/layouts/LayoutSelector';
import OrderTypeSelector from './components/OrderTypeSelector';
import PaymentMethodSelector from './components/PaymentMethodSelector';
import ProofOfPaymentUpload from './components/ProofOfPaymentUpload';
import OrderTimeoutTimer from './components/OrderTimeoutTimer';
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
        <SelfCheckoutContent />
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
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState(null); // null, 'gcash', 'paymaya'
  const [uploadedProof, setUploadedProof] = useState(null);
  const [readyToUploadProof, setReadyToUploadProof] = useState(false); // User confirms they've made payment
  const [currentOrder, setCurrentOrder] = useState(null); // Stores order with timer info
  const [socket, setSocket] = useState(null);

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
          alert('Payment verified! Your order is being processed.');
        }
      });

      newSocket.on('paymentRejected', (data) => {
        if (data.orderId === currentOrder._id) {
          setCurrentOrder(prev => ({ ...prev, status: 'cancelled' }));
          alert(`Payment rejected: ${data.reason}`);
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

  const saveOrderToDB = async () => {
    const calculatedTotals = calculateTotal();
    
    // Base order data
    const orderData = {
      items: cartItems.map(item => ({
        name: item.name,
        price: item.price,
        quantity: item.quantity,
        selectedSize: item.selectedSize,
        availableSizes: item.availableSizes || ['base'],
        pricing: item.pricing || { base: item.price }
      })),
      totals: {
        subtotal: calculatedTotals.subtotal,
        total: calculatedTotals.total
      },
      orderType: 'self_checkout',
      fulfillmentType: fulfillmentType
    };

    // Add payment-specific fields based on fulfillment type
    if (fulfillmentType === 'dine_in') {
      // Traditional dine-in flow
      orderData.paymentMethod = 'pending';
      orderData.status = 'pending';
    } else {
      // Takeout/Delivery with e-wallet verification
      orderData.paymentMethod = 'e-wallet';
      orderData.status = 'pending_payment';
      orderData.paymentDetails = {
        eWalletProvider: selectedPaymentMethod
      };
    }
  
    try {
      // Step 1: Create the order
      const response = await fetch(`${API_URL}/api/orders`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(orderData)
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
      alert('Failed to submit order. Please try again.');
    }
  };

  const processOrder = async () => {
    if (cartItems.length === 0) {
      alert('Please add items to your order');
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
      alert('Please upload proof of payment before submitting');
      return;
    }

    await saveOrderToDB();
    clearCart();
  };

  const handleFulfillmentTypeSelect = (type) => {
    setFulfillmentType(type);
  };

  const handlePaymentMethodSelect = async (method) => {
    setSelectedPaymentMethod(method);
    
    // If it's PayMongo gateway method, initiate checkout immediately
    if (method === 'paymongo') {
      await handlePayMongoCheckout();
    }
  };

  const handlePayMongoCheckout = async () => {
    try {
      console.log('Initiating PayMongo checkout');
      
      // First create the order
      const totals = calculateTotal();
      const orderData = {
        items: cartItems.map(item => ({
          name: item.name,
          price: item.price,
          quantity: item.quantity,
          selectedSize: item.selectedSize,
          availableSizes: item.availableSizes || ['base'],
          pricing: item.pricing || { base: item.price },
          modifiers: item.modifiers || [],
          pwdSeniorDiscount: item.pwdSeniorDiscount || {
            applied: false,
            discountedQuantity: 0,
            discountAmount: 0,
            vatExempt: false
          }
        })),
        totals: {
          subtotal: totals.subtotal,
          discount: totals.discount || 0,
          vatExemption: 0,
          total: totals.total,
          cashReceived: 0,
          change: 0
        },
        customerName: '', // Optional for self-checkout
        orderType: 'self_checkout',
        fulfillmentType,
        paymentMethod: 'paymongo',
        status: 'pending_payment',
        paymentGateway: {
          provider: 'paymongo',
          status: 'pending'
        }
      };

      // Create order first
      const orderResponse = await fetch(`${API_URL}/api/orders`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(orderData)
      });

      if (!orderResponse.ok) {
        throw new Error('Failed to create order');
      }

      const orderResult = await orderResponse.json();
      const orderId = orderResult.data._id;
      const receiptNumber = orderResult.data.receiptNumber;
      
      console.log('Order created successfully:', { orderId, receiptNumber });
      
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
        
        // Redirect to PayMongo checkout page
        window.location.href = checkoutResult.data.checkout_url;
      } else {
        throw new Error(checkoutResult.message || 'Failed to create checkout session');
      }
      
    } catch (error) {
      console.error('PayMongo checkout error:', error);
      alert(`Payment setup failed: ${error.message}. Please try again or contact support.`);
      setSelectedPaymentMethod(null);
    }
  };

  const handleProofSubmit = async (proofData) => {
    setUploadedProof(proofData);
  };

  const handleTimeout = () => {
    alert('Your order has expired. Please create a new order.');
    resetFlow();
  };

  const resetFlow = () => {
    setShowPaymentFlow(false);
    setFulfillmentType(null);
    setSelectedPaymentMethod(null);
    setUploadedProof(null);
    setReadyToUploadProof(false);
    setCurrentOrder(null);
    setOrderSubmitted(false);
    setOrderNumber('');
  };

  // Determine current step based on state
  const getCurrentStep = () => {
    if (!showPaymentFlow) return 'menu'; // Still browsing menu
    if (orderSubmitted) return 'confirmation';
    if (!fulfillmentType) return 'selectType';
    if (fulfillmentType === 'dine_in') return 'readyToSubmit';
    if (!selectedPaymentMethod) return 'selectPayment';
    
    // For PayMongo gateway payments, skip manual payment steps
    if (selectedPaymentMethod && selectedPaymentMethod.startsWith('paymongo-')) {
      return 'paymongoCheckout'; // Special step for PayMongo processing
    }
    
    if (!readyToUploadProof) return 'viewPaymentDetails'; // NEW: Show QR code and details
    if (!uploadedProof) return 'uploadProof';
    return 'readyToSubmit';
  };

  const currentStep = getCurrentStep();

  // Render payment verification flow overlay
  const renderPaymentFlow = () => {
    // Don't show overlay if user hasn't clicked process order yet
    if (currentStep === 'menu') return null;

    if (currentStep === 'confirmation') {
      return (
        <div style={styles.overlay}>
          <div style={styles.flowContainer}>
            <h2 style={styles.flowTitle}>
              {fulfillmentType === 'dine_in' ? 'Order Submitted!' : 'Order Awaiting Verification'}
            </h2>
            <p style={styles.orderNumber}>Order Number: <strong>{orderNumber}</strong></p>
            
            {fulfillmentType === 'dine_in' ? (
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

    if (fulfillmentType !== 'dine_in') {
      if (currentStep === 'selectPayment') {
        return (
          <div style={styles.overlay}>
            <div style={styles.flowContainer}>
              <h2 style={styles.flowTitle}>Select Payment Method</h2>
              <PaymentMethodSelector
                selectedMethod={selectedPaymentMethod}
                onSelect={handlePaymentMethodSelect}
                orderTotal={calculateTotal().total}
              />
              <button onClick={() => setFulfillmentType(null)} style={styles.backButton}>
                ← Back to Order Type
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
                    setCurrentStep('selectPayment');
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
      return (
        <div style={styles.overlay}>
          <div style={styles.flowContainer}>
            <h2 style={styles.flowTitle}>Ready to Submit Order</h2>
            <div style={styles.readyMessage}>
              <p>Order Type: <strong>{fulfillmentType === 'dine_in' ? 'Dine-In' : fulfillmentType === 'takeout' ? 'Takeout' : 'Delivery'}</strong></p>
              {fulfillmentType !== 'dine_in' && (
                <>
                  <p>Payment Method: <strong>{selectedPaymentMethod === 'gcash' ? 'GCash' : 'PayMaya'}</strong></p>
                  <p>Proof Uploaded: <strong>Yes</strong></p>
                </>
              )}
              <p>Total: <strong>₱{calculateTotal().total}</strong></p>
            </div>
            <button onClick={processOrder} style={styles.submitButton}>
              Submit Order
            </button>
            <button 
              onClick={() => fulfillmentType === 'dine_in' ? setFulfillmentType(null) : setUploadedProof(null)} 
              style={styles.backButton}
            >
              ← Back
            </button>
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
  }
};

export default SelfCheckoutInternal;