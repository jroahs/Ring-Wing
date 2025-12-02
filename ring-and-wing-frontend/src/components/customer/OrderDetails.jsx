import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useCustomerAuth } from '../../contexts/CustomerAuthContext';
import { useCustomerOrders } from '../../hooks/useCustomerOrders';
import { useCart } from '../../hooks/useCart';
import { API_URL } from '../../App';
import io from 'socket.io-client';
import jsPDF from 'jspdf';
import './OrderDetails.css';

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
      ready: '#10b981',
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

  // Generate and download PDF receipt - proper receipt format
  const handleDownloadReceipt = async () => {
    if (!order) return;
    
    setIsPdfGenerating(true);
    try {
      // Create PDF with receipt dimensions (80mm thermal paper width)
      const pdf = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: [80, 200] // Receipt paper size
      });
      
      const pageWidth = 80;
      const margin = 5;
      const contentWidth = pageWidth - (margin * 2);
      let yPos = 10;
      const lineHeight = 4;
      const sectionGap = 6;
      
      // Helper function to center text
      const centerText = (text, y, fontSize = 10) => {
        pdf.setFontSize(fontSize);
        const textWidth = pdf.getTextWidth(text);
        pdf.text(text, (pageWidth - textWidth) / 2, y);
      };
      
      // Helper function for left-right text
      const leftRightText = (left, right, y, fontSize = 8) => {
        pdf.setFontSize(fontSize);
        pdf.text(left, margin, y);
        const rightWidth = pdf.getTextWidth(right);
        pdf.text(right, pageWidth - margin - rightWidth, y);
      };
      
      // Helper for separator line
      const drawSeparator = (y, style = 'solid') => {
        pdf.setLineWidth(0.2);
        if (style === 'dashed') {
          pdf.setLineDashPattern([1, 1], 0);
        } else {
          pdf.setLineDashPattern([], 0);
        }
        pdf.line(margin, y, pageWidth - margin, y);
      };
      
      // === HEADER - Business Info ===
      pdf.setFont('helvetica', 'bold');
      centerText('RING & WING', yPos, 14);
      yPos += 5;
      
      pdf.setFont('helvetica', 'normal');
      centerText('Fast Food Restaurant', yPos, 8);
      yPos += lineHeight;
      centerText('123 Main Street, City', yPos, 8);
      yPos += lineHeight;
      centerText('Contact: (02) 123-4567', yPos, 8);
      yPos += lineHeight;
      centerText('VAT Reg TIN: 123-456-789-000', yPos, 7);
      yPos += sectionGap;
      
      drawSeparator(yPos, 'dashed');
      yPos += sectionGap;
      
      // === ORDER INFO ===
      pdf.setFont('helvetica', 'bold');
      centerText('OFFICIAL RECEIPT', yPos, 10);
      yPos += sectionGap;
      
      pdf.setFont('helvetica', 'normal');
      const orderNum = order.receiptNumber || order.orderNumber || order._id?.slice(-6);
      leftRightText('Receipt #:', orderNum, yPos);
      yPos += lineHeight;
      
      const orderDate = new Date(order.createdAt);
      const dateStr = orderDate.toLocaleDateString('en-PH', { 
        year: 'numeric', month: 'short', day: 'numeric' 
      });
      const timeStr = orderDate.toLocaleTimeString('en-PH', { 
        hour: '2-digit', minute: '2-digit' 
      });
      leftRightText('Date:', dateStr, yPos);
      yPos += lineHeight;
      leftRightText('Time:', timeStr, yPos);
      yPos += lineHeight;
      
      // Fulfillment type
      const fulfillmentLabel = order.fulfillmentType === 'delivery' ? 'Delivery' : 
                               order.fulfillmentType === 'takeout' ? 'Take-out' : 'Dine-in';
      leftRightText('Type:', fulfillmentLabel, yPos);
      yPos += lineHeight;
      
      // Customer info if available
      if (order.customerName) {
        leftRightText('Customer:', order.customerName, yPos);
        yPos += lineHeight;
      }
      
      // Staff info if available
      if (order.cashierName || order.processedBy) {
        leftRightText('Cashier:', order.cashierName || order.processedBy || 'Self-Checkout', yPos);
        yPos += lineHeight;
      }
      
      yPos += 2;
      drawSeparator(yPos);
      yPos += sectionGap;
      
      // === ORDER ITEMS ===
      pdf.setFont('helvetica', 'bold');
      pdf.setFontSize(8);
      pdf.text('ITEM', margin, yPos);
      pdf.text('QTY', margin + 40, yPos);
      const priceHeader = 'AMOUNT';
      pdf.text(priceHeader, pageWidth - margin - pdf.getTextWidth(priceHeader), yPos);
      yPos += lineHeight;
      
      drawSeparator(yPos, 'dashed');
      yPos += 3;
      
      pdf.setFont('helvetica', 'normal');
      
      if (order.items && order.items.length > 0) {
        order.items.forEach((item) => {
          // Item name (may need to wrap)
          const itemName = item.name || 'Unknown Item';
          const displayName = itemName.length > 20 ? itemName.substring(0, 18) + '...' : itemName;
          
          pdf.setFontSize(8);
          pdf.text(displayName, margin, yPos);
          pdf.text(`x${item.quantity}`, margin + 42, yPos);
          
          const itemTotal = (item.price * item.quantity).toFixed(2);
          const totalText = `₱${itemTotal}`;
          pdf.text(totalText, pageWidth - margin - pdf.getTextWidth(totalText), yPos);
          yPos += lineHeight;
          
          // Size if available
          if (item.selectedSize && item.selectedSize.name) {
            pdf.setFontSize(7);
            pdf.text(`  Size: ${item.selectedSize.name}`, margin, yPos);
            yPos += 3;
          }
          
          // Variant/Flavor if available
          if (item.variant && item.variant.name) {
            pdf.setFontSize(7);
            pdf.text(`  Flavor: ${item.variant.name}`, margin, yPos);
            yPos += 3;
          }
          
          // Add-ons if available
          if (item.addOns && item.addOns.length > 0) {
            item.addOns.forEach(addon => {
              pdf.setFontSize(7);
              const addonText = `  + ${addon.name}`;
              pdf.text(addonText, margin, yPos);
              if (addon.price) {
                const addonPrice = `₱${addon.price.toFixed(2)}`;
                pdf.text(addonPrice, pageWidth - margin - pdf.getTextWidth(addonPrice), yPos);
              }
              yPos += 3;
            });
          }
          
          yPos += 1;
        });
      }
      
      yPos += 2;
      drawSeparator(yPos);
      yPos += sectionGap;
      
      // === TOTALS ===
      pdf.setFontSize(8);
      
      // Subtotal
      leftRightText('Subtotal:', `₱${(order.totals?.subtotal || 0).toFixed(2)}`, yPos);
      yPos += lineHeight;
      
      // Discount if any
      if (order.totals?.discount > 0) {
        leftRightText('Discount:', `-₱${order.totals.discount.toFixed(2)}`, yPos);
        yPos += lineHeight;
      }
      
      // VAT Exemption if any
      if (order.totals?.vatExemption > 0) {
        leftRightText('VAT Exemption:', `-₱${order.totals.vatExemption.toFixed(2)}`, yPos);
        yPos += lineHeight;
      }
      
      // Delivery fee if applicable
      if (order.fulfillmentType === 'delivery' && order.totals?.deliveryFee > 0) {
        leftRightText('Delivery Fee:', `₱${order.totals.deliveryFee.toFixed(2)}`, yPos);
        yPos += lineHeight;
      }
      
      // VAT breakdown
      const vatAmount = ((order.totals?.subtotal || 0) * 0.12).toFixed(2);
      const vatableSales = ((order.totals?.subtotal || 0) / 1.12).toFixed(2);
      leftRightText('VATable Sales:', `₱${vatableSales}`, yPos);
      yPos += lineHeight;
      leftRightText('VAT (12%):', `₱${vatAmount}`, yPos);
      yPos += lineHeight + 2;
      
      drawSeparator(yPos);
      yPos += 3;
      
      // Total
      pdf.setFont('helvetica', 'bold');
      pdf.setFontSize(10);
      leftRightText('TOTAL:', `₱${(order.totals?.total || 0).toFixed(2)}`, yPos, 10);
      yPos += sectionGap;
      
      // Payment info
      pdf.setFont('helvetica', 'normal');
      pdf.setFontSize(8);
      const paymentMethod = order.paymentMethod === 'gcash' ? 'GCash' :
                           order.paymentMethod === 'paymongo' ? 'Online Payment' :
                           order.paymentMethod === 'cash' ? 'Cash' : 'Pending';
      leftRightText('Payment:', paymentMethod, yPos);
      yPos += sectionGap;
      
      drawSeparator(yPos, 'dashed');
      yPos += sectionGap;
      
      // === FOOTER ===
      pdf.setFontSize(7);
      centerText('Thank you for your order!', yPos);
      yPos += lineHeight;
      centerText('Please come again', yPos);
      yPos += lineHeight + 2;
      
      centerText('This serves as your OFFICIAL RECEIPT', yPos);
      yPos += lineHeight;
      centerText(`Generated: ${new Date().toLocaleString('en-PH')}`, yPos);
      
      // Generate filename
      const filename = `RingWing_Receipt_${orderNum}_${new Date().toISOString().split('T')[0]}.pdf`;
      
      // Download PDF
      pdf.save(filename);
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
                  {item.specialInstructions && (
                    <div className="item-instructions">Note: {item.specialInstructions}</div>
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
