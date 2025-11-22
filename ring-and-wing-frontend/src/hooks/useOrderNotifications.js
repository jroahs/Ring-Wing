import { useState, useEffect, useCallback } from 'react';
import { useCustomerAuth } from '../contexts/CustomerAuthContext';
import { API_URL } from '../App';
import io from 'socket.io-client';

export const useOrderNotifications = () => {
  const { customer, token } = useCustomerAuth();
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [socket, setSocket] = useState(null);

  // Initialize Socket.io connection when customer is authenticated
  useEffect(() => {
    if (!customer || !token) {
      // Cleanup socket if customer logs out
      if (socket) {
        socket.disconnect();
        setSocket(null);
      }
      setNotifications([]);
      setUnreadCount(0);
      return;
    }

    // Create socket connection with customer token
    const newSocket = io(API_URL, {
      auth: {
        token: token
      }
    });

    newSocket.on('connect', () => {
      console.log('[Notifications] Socket connected:', newSocket.id);
    });

    newSocket.on('disconnect', () => {
      console.log('[Notifications] Socket disconnected');
    });

    // Listen for order status changes
    newSocket.on('orderStatusChanged', (data) => {
      console.log('[Notifications] Order status changed:', data);
      
      const notification = {
        id: `${data.orderId}_${Date.now()}`,
        type: 'order_status',
        orderId: data.orderId,
        orderNumber: data.orderNumber,
        status: data.status,
        fulfillmentType: data.fulfillmentType,
        timestamp: new Date(data.timestamp),
        read: false
      };

      setNotifications(prev => [notification, ...prev]);
      setUnreadCount(prev => prev + 1);
    });

    setSocket(newSocket);

    return () => {
      if (newSocket) {
        newSocket.disconnect();
      }
    };
  }, [customer, token]);

  // Mark notification as read
  const markAsRead = useCallback((notificationId) => {
    setNotifications(prev => 
      prev.map(notif => 
        notif.id === notificationId ? { ...notif, read: true } : notif
      )
    );
    setUnreadCount(prev => Math.max(0, prev - 1));
  }, []);

  // Mark all as read
  const markAllAsRead = useCallback(() => {
    setNotifications(prev => prev.map(notif => ({ ...notif, read: true })));
    setUnreadCount(0);
  }, []);

  // Remove notification
  const removeNotification = useCallback((notificationId) => {
    setNotifications(prev => {
      const notif = prev.find(n => n.id === notificationId);
      if (notif && !notif.read) {
        setUnreadCount(c => Math.max(0, c - 1));
      }
      return prev.filter(n => n.id !== notificationId);
    });
  }, []);

  // Clear all notifications
  const clearAll = useCallback(() => {
    setNotifications([]);
    setUnreadCount(0);
  }, []);

  return {
    notifications,
    unreadCount,
    markAsRead,
    markAllAsRead,
    removeNotification,
    clearAll
  };
};

export default useOrderNotifications;
