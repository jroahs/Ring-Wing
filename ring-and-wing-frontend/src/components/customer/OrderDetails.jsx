import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useCustomerAuth } from '../../contexts/CustomerAuthContext';
import { useCustomerOrders } from '../../hooks/useCustomerOrders';
import { useCart } from '../../hooks/useCart';
import { API_URL } from '../../App';
import io from 'socket.io-client';
import { downloadReceipt, printReceipt } from '../../utils/receiptGenerator';
import './OrderDetails.css';
import theme from '../../theme';

const OrderDetails = () => {
  const { orderId } = useParams();
  const navigate = useNavigate();
  const { isAuthenticated, isLoading: authLoading, token } = useCustomerAuth();
  const { fetchOrderById, reorder, isLoading, error } = useCustomerOrders();
  const { addToCart } = useCart();
  const [order, setOrder] = useState(null);
  const [reorderStatus, setReorderStatus] = useState(null);
  const [isPdfGenerating, setIsPdfGenerating] = useState(false);

  // Redirect if not authenticated
  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      navigate('/customer/login');
    }
  }, [isAuthenticated, authLoading, navigate]);

  const loadOrderDetails = useCallback(async () => {
    const result = await fetchOrderById(orderId);
    if (result.success) {
      console.log('[OrderDetails] Order data:', result.order);
      console.log('[OrderDetails] Order totals:', result.order.totals);
      setOrder(result.order);
    }
  }, [orderId, fetchOrderById]);

  // Fetch order details
  useEffect(() => {
    if (isAuthenticated && orderId) {
      loadOrderDetails();
    }
  }, [isAuthenticated, orderId, loadOrderDetails]);

  // Subscribe to real-time order updates
  useEffect(() => {
    if (!isAuthenticated || !orderId || !token) return;

    const socket = io(API_URL, {
      auth: { token },
      transports: ['websocket', 'polling']
    });

    socket.on('connect', () => {
      console.log('[OrderDetails] Socket connected, subscribing to order:', orderId);
      socket.emit('subscribeToOrder', orderId);
    });

    socket.on('orderStatusChanged', (data) => {
      console.log('[OrderDetails] Order status changed:', data);
      if (data.orderId === orderId) {
        // Refresh order details when status changes
        loadOrderDetails();
      }
    });

    return () => {
      socket.emit('unsubscribeFromOrder', orderId);
      socket.disconnect();
    };
  }, [isAuthenticated, orderId, token, loadOrderDetails]);

  const getStatusColor = (status) => {
    const colors = {
      pending: '#f59e0b',
      pending_payment: '#f59e0b',
      paymongo_verified: '#3b82f6',
      received: '#3b82f6',
      preparing: '#3b82f6',
      ready: theme.colors.accent,
      completed: '#6b7280',
      cancelled: '#ef4444'
    };
    return colors[status] || '#6b7280';
  };

  const getStatusLabel = (status) => {
    const labels = {
      pending: 'Pending',
      pending_payment: 'Pending Payment',
      paymongo_verified: 'Payment Verified',
      received: 'Order Received',
      preparing: 'Preparing',
      ready: 'Ready for Pickup',
      completed: 'Completed',
      cancelled: 'Cancelled'
    };
    return labels[status] || status;
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { 
      month: 'long', 
      day: 'numeric', 
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const handleReorder = async () => {
    setReorderStatus('loading');
    const result = await reorder(orderId);
    
    if (result.success) {
      // Add items to cart
      result.cartItems.forEach(item => {
        addToCart({
          menuItemId: item.menuItemId,
          name: item.name,
          price: item.price,
          selectedSize: item.selectedSize,
          addOns: item.addOns || [],
          specialInstructions: item.specialInstructions
        }, item.quantity);
      });
      
      setReorderStatus('success');
      setTimeout(() => {
        navigate('/self-checkout');
      }, 1000);
    } else {
      setReorderStatus('error');
      setTimeout(() => setReorderStatus(null), 3000);
    }
  };

  // Generate and download PDF receipt using unified generator
  const handleDownloadReceipt = async () => {
    if (!order) return;
    
    setIsPdfGenerating(true);
    try {
      const receiptNum = order.receiptNumber || order.orderNumber || order._id?.slice(-6);
      const filename = `RingWing_Receipt_${receiptNum}.pdf`;
      downloadReceipt(order, filename);
    } catch (err) {
      console.error('Error generating PDF:', err);
      alert('Failed to generate PDF. Please try again.');
    } finally {
      setIsPdfGenerating(false);
    }
  };

  const handleBackToOrders = () => {
    navigate('/customer/orders');
  };

  if (authLoading || isLoading) {
    return (
      <div className="order-details-page loading">
        <div className="spinner"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="order-details-page">
        <div className="error-container">
          <h2>Error Loading Order</h2>
          <p>{error}</p>
          <button onClick={handleBackToOrders}>Back to Orders</button>
        </div>
      </div>
    );
  }

  if (!order) {
    return (
      <div className="order-details-page loading">
        <div className="spinner"></div>
      </div>
    );
  }

  return (
    <div className="order-details-page">
      <div className="details-container">
        <div className="details-header">
          <button className="back-btn" onClick={handleBackToOrders}>
            <svg width="20" height="20" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M9.707 16.707a1 1 0 01-1.414 0l-6-6a1 1 0 010-1.414l6-6a1 1 0 011.414 1.414L5.414 9H17a1 1 0 110 2H5.414l4.293 4.293a1 1 0 010 1.414z" clipRule="evenodd" />
            </svg>
            Back to Orders
          </button>
          <div className="header-actions">
            <h1>Order Details</h1>
            <button 
              className="download-receipt-btn"
              onClick={handleDownloadReceipt}
              disabled={isPdfGenerating}
              title="Download PDF Receipt"
            >
              {isPdfGenerating ? (
                <>
                  <svg className="animate-spin" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                    <circle cx="12" cy="12" r="10" strokeWidth="4" strokeDasharray="32" strokeDashoffset="12" />
                  </svg>
                  Generating...
                </>
              ) : (
                <>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4M7 10l5 5 5-5M12 15V3" />
                  </svg>
                  Download Receipt
                </>
              )}
            </button>
          </div>
        </div>

        <div className="order-info-card">
          <div className="order-info-header">
            <div>
              <h2>Order #{order.receiptNumber || order.orderNumber || order._id?.slice(-6)}</h2>
              <p className="order-date">{formatDate(order.createdAt)}</p>
            </div>
            <span 
              className="status-badge-large"
              style={{ backgroundColor: getStatusColor(order.status) }}
            >
              {getStatusLabel(order.status)}
            </span>
          </div>

          {/* Order Timeline */}
          {order.status !== 'cancelled' && (
            <div className="order-timeline">
              <div className={`timeline-step ${['pending_payment', 'paymongo_verified', 'received', 'preparing', 'ready', 'completed'].includes(order.status) ? 'completed' : ''}`}>
                <div className="step-circle">✓</div>
                <div className="step-label">Order Placed</div>
              </div>
              <div className={`timeline-step ${['paymongo_verified', 'received', 'preparing', 'ready', 'completed'].includes(order.status) ? 'completed' : order.status === 'pending_payment' ? 'current' : ''}`}>
                <div className="step-circle">{['paymongo_verified', 'received', 'preparing', 'ready', 'completed'].includes(order.status) ? '✓' : '2'}</div>
                <div className="step-label">Payment Verified</div>
              </div>
              <div className={`timeline-step ${['preparing', 'ready', 'completed'].includes(order.status) ? 'completed' : ['paymongo_verified', 'received'].includes(order.status) ? 'current' : ''}`}>
                <div className="step-circle">{['preparing', 'ready', 'completed'].includes(order.status) ? '✓' : '3'}</div>
                <div className="step-label">Preparing</div>
              </div>
              <div className={`timeline-step ${['ready', 'completed'].includes(order.status) ? 'completed' : order.status === 'preparing' ? 'current' : ''}`}>
                <div className="step-circle">{['ready', 'completed'].includes(order.status) ? '✓' : '4'}</div>
                <div className="step-label">Ready</div>
              </div>
              <div className={`timeline-step ${order.status === 'completed' ? 'completed' : order.status === 'ready' ? 'current' : ''}`}>
                <div className="step-circle">{order.status === 'completed' ? '✓' : '5'}</div>
                <div className="step-label">Completed</div>
              </div>
            </div>
          )}

          {/* Fulfillment Type */}
          <div className="fulfillment-info">
            <svg width="20" height="20" viewBox="0 0 20 20" fill="currentColor">
              {order.fulfillmentType === 'delivery' ? (
                <path d="M8 16.5a1.5 1.5 0 11-3 0 1.5 1.5 0 013 0zM15 16.5a1.5 1.5 0 11-3 0 1.5 1.5 0 013 0z M3 4a1 1 0 00-1 1v10a1 1 0 001 1h1.05a2.5 2.5 0 014.9 0H10a1 1 0 001-1V5a1 1 0 00-1-1H3zM14 7a1 1 0 00-1 1v6.05A2.5 2.5 0 0115.95 16H17a1 1 0 001-1v-5a1 1 0 00-.293-.707l-2-2A1 1 0 0015 7h-1z" />
              ) : order.fulfillmentType === 'takeout' ? (
                <path d="M3 1a1 1 0 000 2h1.22l.305 1.222a.997.997 0 00.01.042l1.358 5.43-.893.892C3.74 11.846 4.632 14 6.414 14H15a1 1 0 000-2H6.414l1-1H14a1 1 0 00.894-.553l3-6A1 1 0 0017 3H6.28l-.31-1.243A1 1 0 005 1H3z" />
              ) : (
                <path d="M10.707 2.293a1 1 0 00-1.414 0l-7 7a1 1 0 001.414 1.414L4 10.414V17a1 1 0 001 1h2a1 1 0 001-1v-2a1 1 0 011-1h2a1 1 0 011 1v2a1 1 0 001 1h2a1 1 0 001-1v-6.586l.293.293a1 1 0 001.414-1.414l-7-7z" />
              )}
            </svg>
            <strong>{order.fulfillmentType === 'delivery' ? 'Delivery' : order.fulfillmentType === 'takeout' ? 'Takeout' : 'Dine-in'}</strong>
          </div>

          {/* Delivery Address */}
          {order.fulfillmentType === 'delivery' && order.deliveryAddress && (
            <div className="delivery-address-section">
              <h3>Delivery Address</h3>
              <div className="address-details">
                <p><strong>{order.deliveryAddress.recipientName}</strong></p>
                <p>{order.deliveryAddress.recipientPhone}</p>
                <p>{order.deliveryAddress.street}</p>
                <p>{order.deliveryAddress.barangay}, {order.deliveryAddress.city}</p>
                <p>{order.deliveryAddress.province} {order.deliveryAddress.postalCode}</p>
                {order.deliveryAddress.landmark && <p>📍 {order.deliveryAddress.landmark}</p>}
                {order.deliveryAddress.deliveryNotes && <p className="notes">Note: {order.deliveryAddress.deliveryNotes}</p>}
              </div>
            </div>
          )}
        </div>

        {/* Order Items */}
        <div className="items-card">
          <h3>Order Items ({order.items?.length || 0})</h3>
          <div className="items-list">
            {order.items && order.items.map((item, idx) => (
              <div key={idx} className="item-row">
                <div className="item-info">
                  <div className="item-name">{item.name}</div>
                  {item.selectedSize && (
                    <div className="item-size">Size: {item.selectedSize.name}</div>
                  )}
                  {item.addOns && item.addOns.length > 0 && (
                    <div className="item-addons">
                      Add-ons: {item.addOns.map(a => a.name).join(', ')}
                    </div>
                  )}
                  {(item.notes || item.specialInstructions) && (
                    <div className="item-instructions">📝 {item.notes || item.specialInstructions}</div>
                  )}
                </div>
                <div className="item-quantity">x{item.quantity}</div>
                <div className="item-price">₱{item.price.toFixed(2)}</div>
              </div>
            ))}
          </div>

          {/* Order Summary */}
          <div className="order-summary">
            <div className="summary-row">
              <span>Subtotal</span>
              <span>₱{(order.totals?.subtotal || 0).toFixed(2)}</span>
            </div>
            {order.totals?.discount > 0 && (
              <div className="summary-row">
                <span>Discount</span>
                <span>-₱{order.totals.discount.toFixed(2)}</span>
              </div>
            )}
            {order.totals?.vatExemption > 0 && (
              <div className="summary-row">
                <span>VAT Exemption</span>
                <span>-₱{order.totals.vatExemption.toFixed(2)}</span>
              </div>
            )}
            {order.fulfillmentType === 'delivery' && order.totals?.deliveryFee > 0 && (
              <div className="summary-row">
                <span>Delivery Fee</span>
                <span>₱{order.totals.deliveryFee.toFixed(2)}</span>
              </div>
            )}
            <div className="summary-row total">
              <strong>Total</strong>
              <strong>₱{(order.totals?.total || 0).toFixed(2)}</strong>
            </div>
          </div>
        </div>

        {/* Reorder Button */}
        {order.status === 'completed' && (
          <div className="action-buttons">
            <button 
              className="reorder-btn"
              onClick={handleReorder}
              disabled={reorderStatus === 'loading'}
            >
              {reorderStatus === 'loading' ? 'Adding to Cart...' : 
               reorderStatus === 'success' ? '✓ Added to Cart!' :
               reorderStatus === 'error' ? 'Failed to Reorder' :
               'Reorder'}
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default OrderDetails;
