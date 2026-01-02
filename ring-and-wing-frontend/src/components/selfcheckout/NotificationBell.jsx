import React from 'react';
import PropTypes from 'prop-types';
import { motion, AnimatePresence } from 'framer-motion';
import { useSelfCheckoutNotifications } from '../../contexts/SelfCheckoutNotificationContext';

const colors = {
  primary: '#2e0304',
  accent: '#f1670f',
  secondary: '#853619',
  background: '#fefdfd',
  muted: '#ac9c9b'
};

/**
 * NotificationBell - Icon button with badge for notification center
 * Designed to be compact for mobile layouts
 */
const NotificationBell = ({ 
  size = 'md', 
  className = '',
  onClick = null 
}) => {
  const { unreadCount, toggleDrawer } = useSelfCheckoutNotifications();

  const handleClick = () => {
    if (onClick) {
      onClick();
    } else {
      toggleDrawer();
    }
  };

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

  return (
    <button
      onClick={handleClick}
      className={`relative flex items-center justify-center rounded-full transition-all duration-200 hover:bg-gray-100 active:scale-95 ${sizeClasses[size]} ${className}`}
      aria-label={`Notifications${hasUnread ? ` (${unreadCount} unread)` : ''}`}
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

      {/* Animated Badge */}
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

      {/* Pulse animation for new notifications */}
      <AnimatePresence>
        {hasUnread && (
          <motion.div
            initial={{ scale: 1, opacity: 0.6 }}
            animate={{ scale: 1.5, opacity: 0 }}
            transition={{ 
              duration: 1.5, 
              repeat: Infinity,
              repeatDelay: 2
            }}
            className={`absolute rounded-full ${badgeSizes[size]}`}
            style={{ backgroundColor: colors.accent }}
          />
        )}
      </AnimatePresence>
    </button>
  );
};

NotificationBell.propTypes = {
  size: PropTypes.oneOf(['sm', 'md', 'lg']),
  className: PropTypes.string,
  onClick: PropTypes.func
};

export default NotificationBell;
