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
  ORDER_ERROR: { id: 'order_error', label: 'Order Error', severity: 'error' },
  
  // Cart actions (Feedback Timing: AI-driven vs UI-driven)
  CART_ITEM_ADDED: { id: 'cart_item_added', label: 'Item Added', severity: 'success' },
  CART_ITEM_REMOVED: { id: 'cart_item_removed', label: 'Item Removed', severity: 'info' },
  CART_CLEARED: { id: 'cart_cleared', label: 'Cart Cleared', severity: 'info' },
  
  // Payment lifecycle
  PAYMENT_PENDING: { id: 'payment_pending', label: 'Payment Pending', severity: 'warning' },
  PAYMENT_VERIFIED: { id: 'payment_verified', label: 'Payment Verified!', severity: 'success' },
  PAYMENT_FAILED: { id: 'payment_failed', label: 'Payment Failed', severity: 'error' },
  PAYMENT_REJECTED: { id: 'payment_rejected', label: 'Payment Rejected', severity: 'error' },
  PAYMENT_ERROR: { id: 'payment_error', label: 'Payment Error', severity: 'error' },
  
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

  // Use a stable key so async auth hydration (guest -> customer) can't wipe stored notifications.
  const storageKey = 'rw_selfcheckout_notifications_v1';

  const persistNotifications = useCallback((nextNotifications) => {
    if (typeof window === 'undefined') return;
    try {
      window.localStorage.setItem(storageKey, JSON.stringify({ notifications: nextNotifications }));
    } catch (e) {
      // Ignore storage quota / privacy mode errors
    }
  }, [storageKey]);

  // Restore persisted notifications
  useEffect(() => {
    if (typeof window === 'undefined') return;

    try {
      let raw = window.localStorage.getItem(storageKey);

      // Migration: older builds stored notifications under per-user keys.
      // If the new stable key is empty, try to migrate the best legacy payload.
      if (!raw) {
        let bestLegacyRaw = null;
        let bestCount = 0;

        for (let i = 0; i < window.localStorage.length; i += 1) {
          const key = window.localStorage.key(i);
          if (!key) continue;
          if (key === storageKey) continue;
          if (!key.startsWith('rw_selfcheckout_notifications_v1_')) continue;

          const candidateRaw = window.localStorage.getItem(key);
          if (!candidateRaw) continue;

          try {
            const candidateParsed = JSON.parse(candidateRaw);
            const candidateNotifications = Array.isArray(candidateParsed?.notifications)
              ? candidateParsed.notifications
              : [];
            if (candidateNotifications.length > bestCount) {
              bestCount = candidateNotifications.length;
              bestLegacyRaw = candidateRaw;
            }
          } catch {
            // ignore malformed legacy data
          }
        }

        if (bestLegacyRaw) {
          raw = bestLegacyRaw;
          try {
            window.localStorage.setItem(storageKey, bestLegacyRaw);
          } catch {
            // ignore
          }
        }
      }

      if (!raw) {
        setNotifications([]);
        setUnreadCount(0);
        return;
      }

      const parsed = JSON.parse(raw);
      const stored = Array.isArray(parsed?.notifications) ? parsed.notifications : [];

      setNotifications(stored);
      setUnreadCount(stored.filter(n => n && !n.read && !n.deleted).length);
    } catch (e) {
      // Ignore storage errors and start fresh
      setNotifications([]);
      setUnreadCount(0);
    }
  }, [storageKey]);



  /**
   * Generate unique notification ID
   */
  const generateId = useCallback(() => {
    notificationIdRef.current += 1;
    return `notif_${Date.now()}_${notificationIdRef.current}`;
  }, []);

  /**
   * Add a new notification with enhanced deduplication (Feedback Timing & Perception)
   */
  const addNotification = useCallback((notification) => {
    // Suppress cart notifications if flagged (AI handles these)
    if (notification.suppressNotification) {
      console.log('[Notification] Suppressed:', notification.title);
      return null;
    }

    const newNotification = {
      id: notification.id || generateId(),
      type: notification.type || NOTIFICATION_TYPES.INFO,
      title: notification.title || notification.type?.label || 'Notification',
      message: notification.message || '',
      orderId: notification.orderId || null,
      orderNumber: notification.orderNumber || null,
      itemId: notification.itemId || null, // For cart item deduplication
      navigateTo: notification.navigateTo || null,
      timestamp: notification.timestamp || new Date(),
      read: false,
      dismissed: false, // hides toast only
      deleted: false, // hides from dropdown/history
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
          console.log('[Notification] Duplicate order notification blocked');
          return prev;
        }
      }
      
      // Prevent duplicate cart item notifications within a short time window (2 seconds)
      if (newNotification.itemId && newNotification.type?.id === 'cart_item_added') {
        const twoSecondsAgo = Date.now() - 2000;
        const recentDuplicate = prev.some(n => 
          n.itemId === newNotification.itemId && 
          n.type?.id === 'cart_item_added' &&
          new Date(n.timestamp).getTime() > twoSecondsAgo
        );
        if (recentDuplicate) {
          console.log('[Notification] Duplicate cart add notification blocked');
          return prev;
        }
      }
      
      // Keep only last 20 notifications
      const updated = [newNotification, ...prev].slice(0, 20);
      persistNotifications(updated);
      return updated;
    });

    setUnreadCount(prev => prev + 1);

    return newNotification.id;
  }, [generateId, persistNotifications]);

  /**
   * Remove a notification
   */
  const removeNotification = useCallback((notificationId) => {
    setNotifications(prev => {
      const notification = prev.find(n => n.id === notificationId);
      if (notification && !notification.read && !notification.deleted) {
        setUnreadCount(count => Math.max(0, count - 1));
      }

      const updated = prev.map(n =>
        n.id === notificationId ? { ...n, deleted: true } : n
      );

      persistNotifications(updated);
      return updated;
    });
  }, [persistNotifications]);

  /**
   * Dismiss toast only (keep notification in dropdown/history)
   */
  const dismissToast = useCallback((notificationId) => {
    setNotifications(prev => {
      const updated = prev.map(n =>
        n.id === notificationId ? { ...n, dismissed: true } : n
      );
      persistNotifications(updated);
      return updated;
    });
  }, [persistNotifications]);

  /**
   * Mark notification as read
   */
  const markAsRead = useCallback((notificationId) => {
    setNotifications(prev => {
      const notification = prev.find(n => n.id === notificationId);
      if (notification && !notification.read) {
        setUnreadCount(count => Math.max(0, count - 1));
      }
      const updated = prev.map(n => 
        n.id === notificationId ? { ...n, read: true } : n
      );

      persistNotifications(updated);
      return updated;
    });
  }, [persistNotifications]);

  /**
   * Mark all notifications as read
   */
  const markAllAsRead = useCallback(() => {
    setNotifications(prev => {
      const updated = prev.map(n => ({ ...n, read: true }));
      persistNotifications(updated);
      return updated;
    });
    setUnreadCount(0);
  }, [persistNotifications]);

  /**
   * Clear all notifications
   */
  const clearAll = useCallback(() => {
    setNotifications([]);
    setUnreadCount(0);
    persistNotifications([]);
  }, [persistNotifications]);

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
  const visibleNotifications = notifications.filter(n => !n.deleted);

  /**
   * Get active toast notifications (not dismissed, auto-hide enabled)
   */
  const toastNotifications = visibleNotifications
    .filter(n => n.autoHide && !n.read && !n.dismissed)
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
      setNotifications(prev => {
        const updated = prev.filter(n => n.type.id !== 'connection_lost');
        persistNotifications(updated);
        return updated;
      });
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
    dismissToast,
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
