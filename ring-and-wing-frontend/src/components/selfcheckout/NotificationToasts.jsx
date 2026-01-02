import React, { useEffect, useCallback } from 'react';
import PropTypes from 'prop-types';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { useSelfCheckoutNotifications } from '../../contexts/SelfCheckoutNotificationContext';

const colors = {
  primary: '#2e0304',
  accent: '#f1670f',
  secondary: '#853619',
  background: '#fefdfd',
  muted: '#ac9c9b'
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
 * Get icon for severity
 */
const getSeverityIcon = (severity) => {
  const iconClass = "w-5 h-5";
  
  switch (severity) {
    case 'success':
      return (
        <svg className={iconClass} fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      );
    case 'error':
      return (
        <svg className={iconClass} fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M9.75 9.75l4.5 4.5m0-4.5l-4.5 4.5M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      );
    case 'warning':
      return (
        <svg className={iconClass} fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
        </svg>
      );
    case 'info':
    default:
      return (
        <svg className={iconClass} fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M11.25 11.25l.041-.02a.75.75 0 011.063.852l-.708 2.836a.75.75 0 001.063.853l.041-.021M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-9-3.75h.008v.008H12V8.25z" />
        </svg>
      );
  }
};

/**
 * Single Toast Item
 */
const ToastItem = ({ notification, onDismiss, onView }) => {
  const navigate = useNavigate();
  const severity = notification.type?.severity || 'info';
  const severityColor = getSeverityColor(severity);

  // Auto-dismiss timer
  useEffect(() => {
    if (notification.autoHide) {
      const timer = setTimeout(() => {
        onDismiss(notification.id);
      }, notification.duration || 6000);

      return () => clearTimeout(timer);
    }
  }, [notification, onDismiss]);

  const handleClick = () => {
    onView(notification.id);
    if (notification.navigateTo) {
      navigate(notification.navigateTo);
    }
  };

  const handleDismiss = (e) => {
    e.stopPropagation();
    onDismiss(notification.id);
  };

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: -20, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, x: 100, scale: 0.95 }}
      transition={{ type: 'spring', damping: 25, stiffness: 300 }}
      onClick={handleClick}
      className="bg-white rounded-xl shadow-lg border border-gray-100 p-3 flex items-start gap-3 cursor-pointer hover:shadow-xl transition-shadow max-w-sm"
      style={{ borderLeft: `4px solid ${severityColor}` }}
    >
      {/* Icon */}
      <div 
        className="flex-shrink-0 p-1"
        style={{ color: severityColor }}
      >
        {getSeverityIcon(severity)}
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <p 
          className="font-medium text-sm"
          style={{ color: colors.primary }}
        >
          {notification.title}
        </p>
        {notification.message && (
          <p 
            className="text-xs truncate mt-0.5"
            style={{ color: colors.secondary }}
          >
            {notification.message}
          </p>
        )}
      </div>

      {/* Actions */}
      <div className="flex-shrink-0 flex items-center gap-1">
        {notification.navigateTo && (
          <span 
            className="text-xs font-medium px-2 py-1 rounded hover:bg-gray-100 transition-colors"
            style={{ color: colors.accent }}
          >
            View
          </span>
        )}
        <button
          onClick={handleDismiss}
          className="p-1 rounded-full hover:bg-gray-100 transition-colors"
          aria-label="Dismiss"
        >
          <svg className="w-4 h-4" fill="none" stroke={colors.muted} viewBox="0 0 24 24" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>
    </motion.div>
  );
};

ToastItem.propTypes = {
  notification: PropTypes.object.isRequired,
  onDismiss: PropTypes.func.isRequired,
  onView: PropTypes.func.isRequired
};

/**
 * NotificationToasts - Container for toast notifications
 */
const NotificationToasts = () => {
  const { toastNotifications, removeNotification, markAsRead } = useSelfCheckoutNotifications();

  const handleDismiss = useCallback((id) => {
    removeNotification(id);
  }, [removeNotification]);

  const handleView = useCallback((id) => {
    markAsRead(id);
  }, [markAsRead]);

  return (
    <div className="fixed top-4 right-4 z-[95] flex flex-col gap-2 pointer-events-none">
      <AnimatePresence mode="popLayout">
        {toastNotifications.map((notification) => (
          <div key={notification.id} className="pointer-events-auto">
            <ToastItem
              notification={notification}
              onDismiss={handleDismiss}
              onView={handleView}
            />
          </div>
        ))}
      </AnimatePresence>
    </div>
  );
};

export default NotificationToasts;
