import React, { useEffect, useCallback } from 'react';
import PropTypes from 'prop-types';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { useSelfCheckoutNotifications, NOTIFICATION_TYPES } from '../../contexts/SelfCheckoutNotificationContext';

const colors = {
  primary: '#2e0304',
  accent: '#f1670f',
  secondary: '#853619',
  background: '#fefdfd',
  muted: '#ac9c9b'
};

/**
 * Get icon for notification type
 */
const getNotificationIcon = (type) => {
  const iconClass = "w-5 h-5";
  
  switch (type?.id) {
    case 'order_created':
      return (
        <svg className={iconClass} fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h3.75M9 15h3.75M9 18h3.75m3 .75H18a2.25 2.25 0 002.25-2.25V6.108c0-1.135-.845-2.098-1.976-2.192a48.424 48.424 0 00-1.123-.08m-5.801 0c-.065.21-.1.433-.1.664 0 .414.336.75.75.75h4.5a.75.75 0 00.75-.75 2.25 2.25 0 00-.1-.664m-5.8 0A2.251 2.251 0 0113.5 2.25H15c1.012 0 1.867.668 2.15 1.586m-5.8 0c-.376.023-.75.05-1.124.08C9.095 4.01 8.25 4.973 8.25 6.108V8.25m0 0H4.875c-.621 0-1.125.504-1.125 1.125v11.25c0 .621.504 1.125 1.125 1.125h9.75c.621 0 1.125-.504 1.125-1.125V9.375c0-.621-.504-1.125-1.125-1.125H8.25zM6.75 12h.008v.008H6.75V12zm0 3h.008v.008H6.75V15zm0 3h.008v.008H6.75V18z" />
        </svg>
      );
    case 'order_received':
    case 'payment_verified':
      return (
        <svg className={iconClass} fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      );
    case 'order_preparing':
      return (
        <svg className={iconClass} fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      );
    case 'order_ready':
      return (
        <svg className={iconClass} fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M14.857 17.082a23.848 23.848 0 005.454-1.31A8.967 8.967 0 0118 9.75v-.7V9A6 6 0 006 9v.75a8.967 8.967 0 01-2.312 6.022c1.733.64 3.56 1.085 5.455 1.31m5.714 0a24.255 24.255 0 01-5.714 0m5.714 0a3 3 0 11-5.714 0" />
        </svg>
      );
    case 'order_completed':
      return (
        <svg className={iconClass} fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M11.48 3.499a.562.562 0 011.04 0l2.125 5.111a.563.563 0 00.475.345l5.518.442c.499.04.701.663.321.988l-4.204 3.602a.563.563 0 00-.182.557l1.285 5.385a.562.562 0 01-.84.61l-4.725-2.885a.563.563 0 00-.586 0L6.982 20.54a.562.562 0 01-.84-.61l1.285-5.386a.562.562 0 00-.182-.557l-4.204-3.602a.563.563 0 01.321-.988l5.518-.442a.563.563 0 00.475-.345L11.48 3.5z" />
        </svg>
      );
    case 'order_cancelled':
    case 'payment_failed':
    case 'payment_rejected':
      return (
        <svg className={iconClass} fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M9.75 9.75l4.5 4.5m0-4.5l-4.5 4.5M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      );
    case 'payment_pending':
      return (
        <svg className={iconClass} fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      );
    case 'connection_restored':
      return (
        <svg className={iconClass} fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M8.288 15.038a5.25 5.25 0 017.424 0M5.106 11.856c3.807-3.808 9.98-3.808 13.788 0M1.924 8.674c5.565-5.565 14.587-5.565 20.152 0M12.53 18.22l-.53.53-.53-.53a.75.75 0 011.06 0z" />
        </svg>
      );
    case 'connection_lost':
      return (
        <svg className={iconClass} fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M3 3l8.735 8.735m0 0a.374.374 0 11.53.53m-.53-.53l.53.53m0 0L21 21M14.652 9.348a3.75 3.75 0 010 5.304m2.121-7.425a6.75 6.75 0 010 9.546m2.121-11.667c3.808 3.807 3.808 9.98 0 13.788m-9.546-4.242a3.733 3.733 0 01-1.06-2.122m-1.061 4.243a6.75 6.75 0 01-1.625-6.929m-.496 9.05c-3.068-3.067-3.664-7.67-1.79-11.334M12 12h.008v.008H12V12z" />
        </svg>
      );
    default:
      return (
        <svg className={iconClass} fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M11.25 11.25l.041-.02a.75.75 0 011.063.852l-.708 2.836a.75.75 0 001.063.853l.041-.021M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-9-3.75h.008v.008H12V8.25z" />
        </svg>
      );
  }
};

/**
 * Get severity color
 */
const getSeverityColor = (severity) => {
  switch (severity) {
    case 'success':
      return '#10b981';
    case 'error':
      return '#ef4444';
    case 'warning':
      return '#f59e0b';
    case 'info':
    default:
      return colors.accent;
  }
};

/**
 * Format relative time
 */
const formatRelativeTime = (timestamp) => {
  const now = new Date();
  const time = new Date(timestamp);
  const diffMs = now - time;
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  
  if (diffMins < 1) return 'Just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  return time.toLocaleDateString();
};

/**
 * NotificationDrawer - Slide-up drawer for mobile, dropdown for desktop
 */
const NotificationDrawer = ({ variant = 'mobile' }) => {
  const navigate = useNavigate();
  const { 
    notifications, 
    isDrawerOpen, 
    closeDrawer, 
    markAsRead, 
    markAllAsRead,
    removeNotification,
    clearAll 
  } = useSelfCheckoutNotifications();

  // Close on escape key
  useEffect(() => {
    const handleEscape = (e) => {
      if (e.key === 'Escape' && isDrawerOpen) {
        closeDrawer();
      }
    };
    
    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [isDrawerOpen, closeDrawer]);

  // Prevent body scroll when drawer is open (mobile)
  useEffect(() => {
    if (variant === 'mobile' && isDrawerOpen) {
      document.body.style.overflow = 'hidden';
      return () => {
        document.body.style.overflow = '';
      };
    }
  }, [isDrawerOpen, variant]);

  const handleNotificationClick = useCallback((notification) => {
    markAsRead(notification.id);
    if (notification.navigateTo) {
      closeDrawer();
      navigate(notification.navigateTo);
    }
  }, [markAsRead, closeDrawer, navigate]);

  const handleDismiss = useCallback((e, notificationId) => {
    e.stopPropagation();
    removeNotification(notificationId);
  }, [removeNotification]);

  // Animation variants based on variant prop
  const containerVariants = {
    mobile: {
      hidden: { y: '100%' },
      visible: { y: 0 },
      exit: { y: '100%' }
    },
    desktop: {
      hidden: { opacity: 0, y: -10 },
      visible: { opacity: 1, y: 0 },
      exit: { opacity: 0, y: -10 }
    }
  };

  const backdropVariants = {
    hidden: { opacity: 0 },
    visible: { opacity: 1 },
    exit: { opacity: 0 }
  };

  const isMobile = variant === 'mobile';

  return (
    <AnimatePresence>
      {isDrawerOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            variants={backdropVariants}
            initial="hidden"
            animate="visible"
            exit="exit"
            transition={{ duration: 0.2 }}
            className="fixed inset-0 modal-overlay z-[100]"
            onClick={closeDrawer}
          />

          {/* Drawer Container */}
          <motion.div
            variants={containerVariants[variant]}
            initial="hidden"
            animate="visible"
            exit="exit"
            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
            className={`fixed z-[101] bg-white shadow-2xl ${
              isMobile 
                ? 'bottom-0 left-0 right-0 rounded-t-2xl max-h-[70vh]' 
                : 'top-16 right-4 w-80 rounded-xl max-h-[60vh]'
            }`}
          >
            {/* Header */}
            <div className="flex items-center justify-between p-4 border-b border-gray-100">
              <h2 
                className="font-bold text-lg"
                style={{ color: colors.primary }}
              >
                Notifications
              </h2>
              <div className="flex items-center gap-2">
                {notifications.length > 0 && (
                  <button
                    onClick={markAllAsRead}
                    className="text-sm px-2 py-1 rounded hover:bg-gray-100 transition-colors"
                    style={{ color: colors.accent }}
                  >
                    Mark all read
                  </button>
                )}
                <button
                  onClick={closeDrawer}
                  className="p-1 rounded-full hover:bg-gray-100 transition-colors"
                  aria-label="Close notifications"
                >
                  <svg className="w-5 h-5" fill="none" stroke={colors.muted} viewBox="0 0 24 24" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>

            {/* Notification List */}
            <div className="overflow-y-auto" style={{ maxHeight: isMobile ? 'calc(70vh - 120px)' : 'calc(60vh - 120px)' }}>
              {notifications.length === 0 ? (
                <div className="p-8 text-center">
                  <svg 
                    className="w-12 h-12 mx-auto mb-3" 
                    fill="none" 
                    stroke={colors.muted} 
                    viewBox="0 0 24 24" 
                    strokeWidth={1}
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" d="M14.857 17.082a23.848 23.848 0 005.454-1.31A8.967 8.967 0 0118 9.75v-.7V9A6 6 0 006 9v.75a8.967 8.967 0 01-2.312 6.022c1.733.64 3.56 1.085 5.455 1.31m5.714 0a24.255 24.255 0 01-5.714 0m5.714 0a3 3 0 11-5.714 0" />
                  </svg>
                  <p style={{ color: colors.muted }}>No notifications yet</p>
                </div>
              ) : (
                <div className="divide-y divide-gray-50">
                  {notifications.map((notification) => (
                    <motion.div
                      key={notification.id}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: 20 }}
                      onClick={() => handleNotificationClick(notification)}
                      className={`p-4 flex items-start gap-3 cursor-pointer hover:bg-gray-50 transition-colors ${
                        !notification.read ? 'bg-orange-50/50' : ''
                      }`}
                    >
                      {/* Icon */}
                      <div 
                        className="flex-shrink-0 p-2 rounded-full"
                        style={{ 
                          backgroundColor: `${getSeverityColor(notification.type?.severity)}15`,
                          color: getSeverityColor(notification.type?.severity)
                        }}
                      >
                        {getNotificationIcon(notification.type)}
                      </div>

                      {/* Content */}
                      <div className="flex-1 min-w-0">
                        <p 
                          className={`font-medium text-sm ${!notification.read ? 'font-semibold' : ''}`}
                          style={{ color: colors.primary }}
                        >
                          {notification.title}
                        </p>
                        {notification.message && (
                          <p 
                            className="text-sm truncate"
                            style={{ color: colors.secondary }}
                          >
                            {notification.message}
                          </p>
                        )}
                        <p 
                          className="text-xs mt-1"
                          style={{ color: colors.muted }}
                        >
                          {formatRelativeTime(notification.timestamp)}
                        </p>
                      </div>

                      {/* Actions */}
                      <div className="flex-shrink-0 flex items-center gap-2">
                        {notification.navigateTo && (
                          <svg 
                            className="w-4 h-4" 
                            fill="none" 
                            stroke={colors.muted} 
                            viewBox="0 0 24 24" 
                            strokeWidth={2}
                          >
                            <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
                          </svg>
                        )}
                        <button
                          onClick={(e) => handleDismiss(e, notification.id)}
                          className="p-1 rounded-full hover:bg-gray-200 transition-colors"
                          aria-label="Dismiss notification"
                        >
                          <svg className="w-4 h-4" fill="none" stroke={colors.muted} viewBox="0 0 24 24" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                          </svg>
                        </button>
                      </div>

                      {/* Unread indicator */}
                      {!notification.read && (
                        <div 
                          className="absolute left-2 top-1/2 -translate-y-1/2 w-2 h-2 rounded-full"
                          style={{ backgroundColor: colors.accent }}
                        />
                      )}
                    </motion.div>
                  ))}
                </div>
              )}
            </div>

            {/* Footer (if has notifications) */}
            {notifications.length > 0 && (
              <div className="p-3 border-t border-gray-100">
                <button
                  onClick={clearAll}
                  className="w-full py-2 text-sm rounded-lg hover:bg-gray-100 transition-colors"
                  style={{ color: colors.muted }}
                >
                  Clear all notifications
                </button>
              </div>
            )}

            {/* Mobile Handle */}
            {isMobile && (
              <div className="absolute top-2 left-1/2 -translate-x-1/2 w-10 h-1 bg-gray-300 rounded-full" />
            )}
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
};

NotificationDrawer.propTypes = {
  variant: PropTypes.oneOf(['mobile', 'desktop'])
};

export default NotificationDrawer;
