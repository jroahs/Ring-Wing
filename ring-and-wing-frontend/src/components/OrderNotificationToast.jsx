import React, { useEffect } from 'react';
import './OrderNotificationToast.css';
import theme from '../theme';

const statusLabels = {
  pending: 'Order Pending',
  pending_payment: 'Payment Pending',
  paymongo_verified: 'Payment Verified',
  received: 'Order Received',
  preparing: 'Preparing Your Order',
  ready: 'Order Ready',
  completed: 'Order Completed',
  cancelled: 'Order Cancelled'
};

const iconClass = 'toast-icon-svg';

const StatusIcon = ({ status }) => {
  switch (status) {
    case 'paymongo_verified':
    case 'received':
    case 'completed':
      return (
        <svg className={iconClass} fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.8}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      );
    case 'ready':
      return (
        <svg className={iconClass} fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.8}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M14.857 17.082a23.848 23.848 0 005.454-1.31A8.967 8.967 0 0118 9.75v-.7V9A6 6 0 006 9v.75a8.967 8.967 0 01-2.312 6.022c1.733.64 3.56 1.085 5.455 1.31m5.714 0a24.255 24.255 0 01-5.714 0m5.714 0a3 3 0 11-5.714 0" />
        </svg>
      );
    case 'cancelled':
      return (
        <svg className={iconClass} fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.8}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M9.75 9.75l4.5 4.5m0-4.5l-4.5 4.5M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      );
    case 'pending':
    case 'pending_payment':
    case 'preparing':
    default:
      return (
        <svg className={iconClass} fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.8}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      );
  }
};

const FulfillmentIcon = ({ fulfillmentType }) => {
  switch (fulfillmentType) {
    case 'delivery':
      return (
        <svg className={iconClass} fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.8}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M3 7.5h11.25V19.5H3V7.5z" />
          <path strokeLinecap="round" strokeLinejoin="round" d="M14.25 10.5H18l3 4.5v4.5h-6.75V10.5z" />
          <path strokeLinecap="round" strokeLinejoin="round" d="M7.5 19.5a1.5 1.5 0 100-3 1.5 1.5 0 000 3zM16.5 19.5a1.5 1.5 0 100-3 1.5 1.5 0 000 3z" />
        </svg>
      );
    case 'takeout':
      return (
        <svg className={iconClass} fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.8}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M6 7.5h12l-1 14H7L6 7.5z" />
          <path strokeLinecap="round" strokeLinejoin="round" d="M9 7.5V6a3 3 0 016 0v1.5" />
        </svg>
      );
    case 'dine_in':
    default:
      return (
        <svg className={iconClass} fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.8}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 3.75v6.75A2.25 2.25 0 006.75 12.75h.75v7.5" />
          <path strokeLinecap="round" strokeLinejoin="round" d="M7.5 3.75v6" />
          <path strokeLinecap="round" strokeLinejoin="round" d="M9.75 3.75v6.75A2.25 2.25 0 017.5 12.75" />
          <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 3.75v8.25a3 3 0 003 3h.75v5.25" />
          <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 3.75v8.25" />
        </svg>
      );
  }
};

StatusIcon.propTypes = {
  status: (props, propName) => {
    if (props[propName] == null) return null;
    if (typeof props[propName] !== 'string') return new Error('status must be a string');
    return null;
  }
};

FulfillmentIcon.propTypes = {
  fulfillmentType: (props, propName) => {
    if (props[propName] == null) return null;
    if (typeof props[propName] !== 'string') return new Error('fulfillmentType must be a string');
    return null;
  }
};

const OrderNotificationToast = ({ notification, onClose, onRead, onView }) => {

  // Auto-dismiss after 10 seconds
  useEffect(() => {
    const timer = setTimeout(() => {
      onClose(notification.id);
    }, 10000);

    return () => clearTimeout(timer);
  }, [notification.id, onClose]);

  const handleView = () => {
    onRead(notification.id);
    if (onView) {
      onView(notification.orderId);
    }
    onClose(notification.id);
  };

  const handleDismiss = () => {
    onRead(notification.id);
    onClose(notification.id);
  };

  return (
    <div className="order-notification-toast">
      <div className="toast-icon">
        <span style={{ color: theme.colors.accent }}>
          <StatusIcon status={notification.status} />
        </span>
      </div>
      
      <div className="toast-content">
        <div className="toast-title">
          Order #{notification.orderNumber}
        </div>
        <div className="toast-message">
          {statusLabels[notification.status] || notification.status}
        </div>
        <div className="toast-time">
          <span className="toast-fulfillment">
            <span className="toast-fulfillment-icon" style={{ color: theme.colors.accent }}>
              <FulfillmentIcon fulfillmentType={notification.fulfillmentType} />
            </span>
            <span>
              {notification.fulfillmentType === 'delivery' ? 'Delivery' :
               notification.fulfillmentType === 'takeout' ? 'Takeout' :
               'Dine-in'}
            </span>
          </span>
        </div>
      </div>

      <div className="toast-actions">
        <button onClick={handleView} className="toast-btn-view">
          View
        </button>
        <button onClick={handleDismiss} className="toast-btn-dismiss">
          ×
        </button>
      </div>
    </div>
  );
};

export default OrderNotificationToast;
