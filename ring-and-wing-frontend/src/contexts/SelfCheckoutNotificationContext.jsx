import React, { createContext, useContext, useState, useCallback, useEffect, useRef } from 'react';
import PropTypes from 'prop-types';
import { useCustomerAuth } from './CustomerAuthContext';
import { API_URL } from '../App';
import io from 'socket.io-client';

/**
 * Notification types for self-checkout flow
 */
export const NOTIFICATION_TYPES = {
  // Order lifecycle
  ORDER_CREATED: { id: 'order_created', label: 'Order Created', severity: 'info' },
  ORDER_RECEIVED: { id: 'order_received', label: 'Order Received', severity: 'success' },
  ORDER_PREPARING: { id: 'order_preparing', label: 'Preparing Your Order', severity: 'info' },
  ORDER_READY: { id: 'order_ready', label: 'Order Ready!', severity: 'success' },
  ORDER_COMPLETED: { id: 'order_completed', label: 'Order Completed', severity: 'success' },
  ORDER_CANCELLED: { id: 'order_cancelled', label: 'Order Cancelled', severity: 'error' },
  
  // Payment lifecycle
  PAYMENT_PENDING: { id: 'payment_pending', label: 'Payment Pending', severity: 'warning' },
  PAYMENT_VERIFIED: { id: 'payment_verified', label: 'Payment Verified!', severity: 'success' },
  PAYMENT_FAILED: { id: 'payment_failed', label: 'Payment Failed', severity: 'error' },
  PAYMENT_REJECTED: { id: 'payment_rejected', label: 'Payment Rejected', severity: 'error' },
  
  // System notices
  CONNECTION_RESTORED: { id: 'connection_restored', label: 'Connection Restored', severity: 'success' },
  CONNECTION_LOST: { id: 'connection_lost', label: 'Connection Lost', severity: 'warning' },
  SERVER_WAKING: { id: 'server_waking', label: 'Server Waking Up', severity: 'info' },
  
  // General
  SUCCESS: { id: 'success', label: 'Success', severity: 'success' },
  ERROR: { id: 'error', label: 'Error', severity: 'error' },
  WARNING: { id: 'warning', label: 'Warning', severity: 'warning' },
  INFO: { id: 'info', label: 'Info', severity: 'info' }
};

/**
 * Map backend order status to notification type
 */
const statusToNotificationType = {
  pending: NOTIFICATION_TYPES.ORDER_CREATED,
  pending_payment: NOTIFICATION_TYPES.PAYMENT_PENDING,
  paymongo_verified: NOTIFICATION_TYPES.PAYMENT_VERIFIED,
  payment_verified: NOTIFICATION_TYPES.PAYMENT_VERIFIED,
  received: NOTIFICATION_TYPES.ORDER_RECEIVED,
  preparing: NOTIFICATION_TYPES.ORDER_PREPARING,
  ready: NOTIFICATION_TYPES.ORDER_READY,
  completed: NOTIFICATION_TYPES.ORDER_COMPLETED,
  cancelled: NOTIFICATION_TYPES.ORDER_CANCELLED
};

const SelfCheckoutNotificationContext = createContext(null);

/**
 * Provider component for self-checkout notifications
 */
export const SelfCheckoutNotificationProvider = ({ children }) => {
  const { customer, token } = useCustomerAuth();
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const socketRef = useRef(null);
  const notificationIdRef = useRef(0);

  /**
   * Generate unique notification ID
   */
  const generateId = useCallback(() => {
    notificationIdRef.current += 1;
    return `notif_${Date.now()}_${notificationIdRef.current}`;
  }, []);

  /**
   * Add a new notification
   */
  const addNotification = useCallback((notification) => {
    const newNotification = {
      id: notification.id || generateId(),
      type: notification.type || NOTIFICATION_TYPES.INFO,
      title: notification.title || notification.type?.label || 'Notification',
      message: notification.message || '',
      orderId: notification.orderId || null,
      orderNumber: notification.orderNumber || null,
      navigateTo: notification.navigateTo || null,
      timestamp: notification.timestamp || new Date(),
      read: false,
      dismissed: false,
      autoHide: notification.autoHide !== false, // Default to true
      duration: notification.duration || 6000 // 6 seconds default
    };

    setNotifications(prev => {
      // Prevent duplicate notifications for same order status
      if (newNotification.orderId && newNotification.type) {
        const exists = prev.some(n => 
          n.orderId === newNotification.orderId && 
          n.type.id === newNotification.type.id &&
          !n.dismissed
        );
        if (exists) {
          return prev;
        }
      }
      
      // Keep only last 20 notifications
      const updated = [newNotification, ...prev].slice(0, 20);
      return updated;
    });

    setUnreadCount(prev => prev + 1);

    return newNotification.id;
  }, [generateId]);

  /**
   * Remove a notification
   */
  const removeNotification = useCallback((notificationId) => {
    setNotifications(prev => 
      prev.map(n => 
        n.id === notificationId ? { ...n, dismissed: true } : n
      )
    );
  }, []);

  /**
   * Mark notification as read
   */
  const markAsRead = useCallback((notificationId) => {
    setNotifications(prev => {
      const notification = prev.find(n => n.id === notificationId);
      if (notification && !notification.read) {
        setUnreadCount(count => Math.max(0, count - 1));
      }
      return prev.map(n => 
        n.id === notificationId ? { ...n, read: true } : n
      );
    });
  }, []);

  /**
   * Mark all notifications as read
   */
  const markAllAsRead = useCallback(() => {
    setNotifications(prev => prev.map(n => ({ ...n, read: true })));
    setUnreadCount(0);
  }, []);

  /**
   * Clear all notifications
   */
  const clearAll = useCallback(() => {
    setNotifications([]);
    setUnreadCount(0);
  }, []);

  /**
   * Toggle drawer open/closed
   */
  const toggleDrawer = useCallback(() => {
    setIsDrawerOpen(prev => !prev);
  }, []);

  /**
   * Open drawer
   */
  const openDrawer = useCallback(() => {
    setIsDrawerOpen(true);
  }, []);

  /**
   * Close drawer
   */
  const closeDrawer = useCallback(() => {
    setIsDrawerOpen(false);
  }, []);

  /**
   * Get visible (non-dismissed) notifications
   */
  const visibleNotifications = notifications.filter(n => !n.dismissed);

  /**
   * Get active toast notifications (not dismissed, auto-hide enabled)
   */
  const toastNotifications = visibleNotifications
    .filter(n => n.autoHide && !n.read)
    .slice(0, 3); // Show max 3 toasts

  // Socket.io connection for real-time updates
  useEffect(() => {
    if (!customer?._id || !token) {
      if (socketRef.current) {
        socketRef.current.disconnect();
        socketRef.current = null;
      }
      return;
    }

    const socket = io(API_URL, {
      auth: { token },
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionAttempts: 5,
      reconnectionDelay: 1000
    });

    socketRef.current = socket;

    socket.on('connect', () => {
      console.log('[SelfCheckoutNotifications] Socket connected');
      // Could add a subtle "connected" notification here if desired
    });

    socket.on('disconnect', (reason) => {
      console.log('[SelfCheckoutNotifications] Socket disconnected:', reason);
      if (reason !== 'io client disconnect') {
        addNotification({
          type: NOTIFICATION_TYPES.CONNECTION_LOST,
          title: 'Connection Lost',
          message: 'Attempting to reconnect...',
          autoHide: false
        });
      }
    });

    socket.on('connect_error', (error) => {
      console.warn('[SelfCheckoutNotifications] Socket error:', error.message);
    });

    socket.on('reconnect', () => {
      console.log('[SelfCheckoutNotifications] Socket reconnected');
      // Remove any connection lost notifications
      setNotifications(prev => 
        prev.filter(n => n.type.id !== 'connection_lost')
      );
      addNotification({
        type: NOTIFICATION_TYPES.CONNECTION_RESTORED,
        title: 'Connection Restored',
        message: 'You are back online',
        duration: 3000
      });
    });

    // Listen for order status changes
    socket.on('orderStatusChanged', (data) => {
      console.log('[SelfCheckoutNotifications] Order status changed:', data);
      
      const notificationType = statusToNotificationType[data.status] || NOTIFICATION_TYPES.INFO;
      
      addNotification({
        type: notificationType,
        title: notificationType.label,
        message: `Order #${data.orderNumber}`,
        orderId: data.orderId,
        orderNumber: data.orderNumber,
        navigateTo: `/customer/orders/${data.orderId}`
      });
    });

    // Listen for payment events
    socket.on('paymentVerified', (data) => {
      console.log('[SelfCheckoutNotifications] Payment verified:', data);
      addNotification({
        type: NOTIFICATION_TYPES.PAYMENT_VERIFIED,
        title: 'Payment Verified!',
        message: 'Your order is being processed',
        orderId: data.orderId,
        navigateTo: `/customer/orders/${data.orderId}`
      });
    });

    socket.on('paymentRejected', (data) => {
      console.log('[SelfCheckoutNotifications] Payment rejected:', data);
      addNotification({
        type: NOTIFICATION_TYPES.PAYMENT_REJECTED,
        title: 'Payment Rejected',
        message: data.reason || 'Please try again',
        orderId: data.orderId,
        autoHide: false
      });
    });

    return () => {
      socket.disconnect();
      socketRef.current = null;
    };
  }, [customer?._id, token, addNotification]);

  const value = {
    notifications: visibleNotifications,
    toastNotifications,
    unreadCount,
    isDrawerOpen,
    addNotification,
    removeNotification,
    markAsRead,
    markAllAsRead,
    clearAll,
    toggleDrawer,
    openDrawer,
    closeDrawer,
    NOTIFICATION_TYPES
  };

  return (
    <SelfCheckoutNotificationContext.Provider value={value}>
      {children}
    </SelfCheckoutNotificationContext.Provider>
  );
};

SelfCheckoutNotificationProvider.propTypes = {
  children: PropTypes.node.isRequired
};

/**
 * Hook to access self-checkout notifications
 */
export const useSelfCheckoutNotifications = () => {
  const context = useContext(SelfCheckoutNotificationContext);
  if (!context) {
    throw new Error('useSelfCheckoutNotifications must be used within a SelfCheckoutNotificationProvider');
  }
  return context;
};

export default SelfCheckoutNotificationContext;
