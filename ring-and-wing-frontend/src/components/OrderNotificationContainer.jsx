import React from 'react';
import OrderNotificationToast from './OrderNotificationToast';
import './OrderNotificationContainer.css';

const OrderNotificationContainer = ({ notifications, onClose, onRead, onView }) => {
  if (!notifications || notifications.length === 0) return null;

  // Show only the 3 most recent notifications
  const visibleNotifications = notifications.slice(0, 3);

  return (
    <div className="order-notification-container">
      {visibleNotifications.map(notification => (
        <OrderNotificationToast
          key={notification.id}
          notification={notification}
          onClose={onClose}
          onRead={onRead}
          onView={onView}
        />
      ))}
    </div>
  );
};

export default OrderNotificationContainer;
