import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import './OrderNotificationToast.css';

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

const statusIcons = {
  pending: '⏳',
  pending_payment: '⏳',
  paymongo_verified: '✅',
  received: '✅',
  preparing: '👨‍🍳',
  ready: '🔔',
  completed: '✨',
  cancelled: '❌'
};

const OrderNotificationToast = ({ notification, onClose, onRead }) => {
  const navigate = useNavigate();

  // Auto-dismiss after 10 seconds
  useEffect(() => {
    const timer = setTimeout(() => {
      onClose(notification.id);
    }, 10000);

    return () => clearTimeout(timer);
  }, [notification.id, onClose]);

  const handleView = () => {
    onRead(notification.id);
    navigate(`/customer/orders/${notification.orderId}`);
    onClose(notification.id);
  };

  const handleDismiss = () => {
    onRead(notification.id);
    onClose(notification.id);
  };

  return (
    <div className="order-notification-toast">
      <div className="toast-icon">
        {statusIcons[notification.status] || '📦'}
      </div>
      
      <div className="toast-content">
        <div className="toast-title">
          Order #{notification.orderNumber}
        </div>
        <div className="toast-message">
          {statusLabels[notification.status] || notification.status}
        </div>
        <div className="toast-time">
          {notification.fulfillmentType === 'delivery' ? '🚚 Delivery' : 
           notification.fulfillmentType === 'takeout' ? '🥡 Takeout' : 
           '🍽️ Dine-in'}
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
