import React, { useState, useRef, useEffect, useCallback } from 'react';
import ReactDOM from 'react-dom';
import PropTypes from 'prop-types';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { useSelfCheckoutNotifications, NOTIFICATION_TYPES } from '../../contexts/SelfCheckoutNotificationContext';
import theme from '../../theme';

const colors = theme.colors;

/**
 * Get icon for notification type
 */
const getNotificationIcon = (type) => {
  const iconClass = "w-4 h-4 flex-shrink-0";
  
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
    case 'order_cancelled':
    case 'payment_failed':
    case 'payment_rejected':
    case 'order_error':
      return (
        <svg className={iconClass} fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M9.75 9.75l4.5 4.5m0-4.5l-4.5 4.5M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
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
    case 'success': return colors.accent;
    case 'error': return '#ef4444';
    case 'warning': return '#f59e0b';
    case 'info':
    default: return colors.accent;
  }
};

/**
 * Format relative time
 */
const formatRelativeTime = (timestamp) => {
  const now = new Date();
  const time = new Date(timestamp);
  const diffMs = now - time;
  const diffSec = Math.floor(diffMs / 1000);
  const diffMin = Math.floor(diffSec / 60);
  const diffHour = Math.floor(diffMin / 60);
  
  if (diffSec < 60) return 'Just now';
  if (diffMin < 60) return `${diffMin}m ago`;
  if (diffHour < 24) return `${diffHour}h ago`;
  return time.toLocaleDateString();
};

/**
 * NotificationDropdown - Bell icon with dropdown notification list
 */
const NotificationDropdown = ({ 
  size = 'md', 
  className = '',
  cartCollapsed = false
}) => {
  const navigate = useNavigate();
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef(null);
  const { 
    notifications, 
    unreadCount, 
    markAsRead, 
    markAllAsRead,
    removeNotification,
    clearAll 
  } = useSelfCheckoutNotifications();

  // Close on click outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen]);

  // Close on escape key
  useEffect(() => {
    const handleEscape = (e) => {
      if (e.key === 'Escape') setIsOpen(false);
    };
    
    if (isOpen) {
      document.addEventListener('keydown', handleEscape);
    }
    return () => document.removeEventListener('keydown', handleEscape);
  }, [isOpen]);

  // Size variants
  const sizeClasses = {
    sm: 'w-8 h-8',
    md: 'w-10 h-10',
    lg: 'w-12 h-12'
  };

  const iconSizes = {
    sm: 'w-4 h-4',
    md: 'w-5 h-5',
    lg: 'w-6 h-6'
  };

  const badgeSizes = {
    sm: 'w-4 h-4 text-[10px] -top-1 -right-1',
    md: 'w-5 h-5 text-xs -top-1 -right-1',
    lg: 'w-6 h-6 text-sm -top-1 -right-1'
  };

  const displayCount = unreadCount > 9 ? '9+' : unreadCount;
  const hasUnread = unreadCount > 0;

  const handleNotificationClick = useCallback((notification) => {
    markAsRead(notification.id);
    if (notification?.navigateTo) {
      setIsOpen(false);
      navigate(notification.navigateTo);
    }
  }, [markAsRead, navigate]);

  const anchorRect = dropdownRef.current?.getBoundingClientRect();
  const isMobileViewport = typeof window !== 'undefined' && window.innerWidth < 640;
  const portalTop = anchorRect ? anchorRect.bottom + 8 : 64;
  const portalRight = anchorRect ? window.innerWidth - anchorRect.right : 16;

  return (
    <div className={`relative ${className}`} ref={dropdownRef}>
      {/* Bell Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={`relative flex items-center justify-center rounded-full transition-all duration-200 hover:bg-gray-100 active:scale-95 ${sizeClasses[size]}`}
        aria-label={`Notifications${hasUnread ? ` (${unreadCount} unread)` : ''}`}
        aria-expanded={isOpen}
      >
        {/* Bell Icon */}
        <svg 
          className={`${iconSizes[size]} transition-colors`}
          fill="none" 
          stroke={hasUnread ? colors.accent : colors.primary}
          viewBox="0 0 24 24"
          strokeWidth={2}
        >
          <path 
            strokeLinecap="round" 
            strokeLinejoin="round" 
            d="M14.857 17.082a23.848 23.848 0 005.454-1.31A8.967 8.967 0 0118 9.75v-.7V9A6 6 0 006 9v.75a8.967 8.967 0 01-2.312 6.022c1.733.64 3.56 1.085 5.455 1.31m5.714 0a24.255 24.255 0 01-5.714 0m5.714 0a3 3 0 11-5.714 0" 
          />
        </svg>

        {/* Badge */}
        <AnimatePresence>
          {hasUnread && (
            <motion.div
              initial={{ scale: 0, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0, opacity: 0 }}
              transition={{ type: 'spring', stiffness: 500, damping: 25 }}
              className={`absolute flex items-center justify-center rounded-full font-bold text-white ${badgeSizes[size]}`}
              style={{ backgroundColor: colors.accent }}
            >
              {displayCount}
            </motion.div>
          )}
        </AnimatePresence>
      </button>

      {/* Dropdown */}
      <AnimatePresence>
        {isOpen && (
          <>
            {ReactDOM.createPortal(
              <div
                className="fixed"
                style={{
                  zIndex: 999999,
                  top: `${portalTop}px`,
                  left: isMobileViewport ? '50%' : 'auto',
                  right: isMobileViewport ? 'auto' : `${portalRight}px`,
                  transform: isMobileViewport ? 'translateX(-50%)' : undefined
                }}
              >
                <motion.div
                  initial={{ opacity: 0, y: -10, scale: 0.95 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: -10, scale: 0.95 }}
                  transition={{ duration: 0.15 }}
                  className="w-[calc(100vw-2rem)] sm:w-80 max-h-[70vh] sm:max-h-96 bg-white rounded-xl shadow-2xl border border-orange-200 overflow-hidden"
                >
            {/* Header */}
            <div 
              className="px-4 py-3 border-b flex items-center justify-between"
              style={{ backgroundColor: colors.accent }}
            >
              <h3 className="font-semibold text-white">Notifications</h3>
              {notifications.length > 0 && (
                <div className="flex items-center gap-2">
                  {hasUnread && (
                    <button
                      onClick={markAllAsRead}
                      className="text-xs text-white/80 hover:text-white transition-colors"
                    >
                      Mark all read
                    </button>
                  )}
                  <button
                    onClick={clearAll}
                    className="text-xs text-white/60 hover:text-white transition-colors"
                  >
                    Clear
                  </button>
                </div>
              )}
            </div>

            {/* Notification List */}
            <div className="overflow-y-auto overflow-x-hidden max-h-72">
              {notifications.length === 0 ? (
                <div className="p-8 text-center text-gray-400">
                  <svg className="w-12 h-12 mx-auto mb-3 opacity-50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M14.857 17.082a23.848 23.848 0 005.454-1.31A8.967 8.967 0 0118 9.75v-.7V9A6 6 0 006 9v.75a8.967 8.967 0 01-2.312 6.022c1.733.64 3.56 1.085 5.455 1.31m5.714 0a24.255 24.255 0 01-5.714 0m5.714 0a3 3 0 11-5.714 0" />
                  </svg>
                  <p className="text-sm">No notifications yet</p>
                </div>
              ) : (
                notifications.map((notification) => (
                  <motion.div
                    key={notification.id}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: 10 }}
                    className={`px-4 py-3 border-b border-gray-100 hover:bg-orange-50 cursor-pointer transition-colors ${
                      !notification.read ? 'bg-orange-50/80' : ''
                    }`}
                    onClick={() => handleNotificationClick(notification)}
                  >
                    <div className="flex gap-3">
                      {/* Icon */}
                      <div 
                        className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0"
                        style={{ 
                          backgroundColor: `${getSeverityColor(notification.type?.severity)}15`,
                          color: getSeverityColor(notification.type?.severity)
                        }}
                      >
                        {getNotificationIcon(notification.type)}
                      </div>
                      
                      {/* Content */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-2">
                          <p 
                            className="font-medium text-sm truncate"
                            style={{ color: colors.primary }}
                          >
                            {notification.title}
                          </p>
                          {!notification.read && (
                            <div 
                              className="w-2 h-2 rounded-full flex-shrink-0 mt-1.5"
                              style={{ backgroundColor: colors.accent }}
                            />
                          )}
                        </div>
                        <p className="text-xs text-gray-500 line-clamp-2 mt-0.5 break-words">
                          {notification.message}
                        </p>
                        <p className="text-xs text-gray-400 mt-1">
                          {formatRelativeTime(notification.timestamp)}
                        </p>
                      </div>
                      
                      {/* Delete button */}
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          removeNotification(notification.id);
                        }}
                        className="p-1 hover:bg-gray-200 rounded opacity-0 group-hover:opacity-100 transition-opacity self-start"
                        style={{ opacity: 0.5 }}
                        onMouseEnter={(e) => e.currentTarget.style.opacity = 1}
                        onMouseLeave={(e) => e.currentTarget.style.opacity = 0.5}
                      >
                        <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      </button>
                    </div>
                  </motion.div>
                ))
              )}
            </div>
                </motion.div>
              </div>,
          document.body
        )}
          </>
        )}
      </AnimatePresence>
    </div>
  );
};

NotificationDropdown.propTypes = {
  size: PropTypes.oneOf(['sm', 'md', 'lg']),
  className: PropTypes.string,
  cartCollapsed: PropTypes.bool
};

export default NotificationDropdown;
