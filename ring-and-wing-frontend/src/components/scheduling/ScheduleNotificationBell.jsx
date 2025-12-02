import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Bell,
  Calendar,
  Moon,
  Check,
  CheckCheck,
  Trash2,
  Loader2,
  Clock
} from 'lucide-react';
import api from '../../services/api';

const ScheduleNotificationBell = ({ colors = {} }) => {
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const dropdownRef = useRef(null);

  // Theme
  const defaultColors = {
    text: '#1a1a1a',
    muted: '#6b7280',
    border: '#e5e0df',
    background: '#f9fafb',
    primary: '#f1670f',
    accent: '#f1670f',
    danger: '#ef4444',
    warning: '#f59e0b',
    success: '#10b981'
  };
  const c = { ...defaultColors, ...colors };

  // Fetch notifications
  const fetchNotifications = async () => {
    try {
      setLoading(true);
      const response = await api.get('/api/schedule-notifications/my-notifications', {
        params: { limit: 20 }
      });
      
      const data = response.data?.data || response.data;
      setNotifications(data.notifications || []);
      setUnreadCount(data.unreadCount || 0);
    } catch (err) {
      console.error('Error fetching notifications:', err);
    } finally {
      setLoading(false);
    }
  };

  // Fetch unread count periodically
  const fetchUnreadCount = async () => {
    try {
      const response = await api.get('/api/schedule-notifications/unread-count');
      const data = response.data?.data || response.data;
      setUnreadCount(data.count || 0);
    } catch (err) {
      console.error('Error fetching unread count:', err);
    }
  };

  useEffect(() => {
    fetchUnreadCount();
    
    // Poll for new notifications every 30 seconds
    const interval = setInterval(fetchUnreadCount, 30000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (isOpen) {
      fetchNotifications();
    }
  }, [isOpen]);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Mark as read
  const handleMarkAsRead = async (notificationId) => {
    try {
      await api.put(`/api/schedule-notifications/${notificationId}/read`);
      setNotifications(notifications.map(n =>
        n._id === notificationId ? { ...n, isRead: true } : n
      ));
      setUnreadCount(Math.max(0, unreadCount - 1));
    } catch (err) {
      console.error('Error marking as read:', err);
    }
  };

  // Mark all as read
  const handleMarkAllAsRead = async () => {
    try {
      await api.put('/api/schedule-notifications/mark-all-read');
      setNotifications(notifications.map(n => ({ ...n, isRead: true })));
      setUnreadCount(0);
    } catch (err) {
      console.error('Error marking all as read:', err);
    }
  };

  // Delete notification
  const handleDelete = async (notificationId) => {
    try {
      await api.delete(`/api/schedule-notifications/${notificationId}`);
      const notification = notifications.find(n => n._id === notificationId);
      setNotifications(notifications.filter(n => n._id !== notificationId));
      if (!notification?.isRead) {
        setUnreadCount(Math.max(0, unreadCount - 1));
      }
    } catch (err) {
      console.error('Error deleting notification:', err);
    }
  };

  // Get icon for notification type
  const getNotificationIcon = (type) => {
    switch (type) {
      case 'schedule_created':
        return <Calendar className="w-4 h-4" style={{ color: c.success }} />;
      case 'schedule_updated':
        return <Calendar className="w-4 h-4" style={{ color: c.primary }} />;
      case 'schedule_deleted':
        return <Calendar className="w-4 h-4" style={{ color: c.danger }} />;
      case 'rest_day_changed':
        return <Moon className="w-4 h-4" style={{ color: c.warning }} />;
      case 'schedule_published':
        return <Calendar className="w-4 h-4" style={{ color: '#8b5cf6' }} />;
      default:
        return <Bell className="w-4 h-4" style={{ color: c.muted }} />;
    }
  };

  // Format relative time
  const formatRelativeTime = (date) => {
    const now = new Date();
    const diff = now - new Date(date);
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);

    if (minutes < 1) return 'Just now';
    if (minutes < 60) return `${minutes}m ago`;
    if (hours < 24) return `${hours}h ago`;
    if (days < 7) return `${days}d ago`;
    return new Date(date).toLocaleDateString();
  };

  // Format affected dates
  const formatAffectedDates = (dates) => {
    if (!dates || dates.length === 0) return '';
    if (dates.length === 1) {
      return new Date(dates[0]).toLocaleDateString();
    }
    return `${new Date(dates[0]).toLocaleDateString()} - ${new Date(dates[dates.length - 1]).toLocaleDateString()}`;
  };

  return (
    <div className="relative" ref={dropdownRef}>
      {/* Bell button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="relative p-2 rounded-lg transition-colors"
        style={{ color: c.muted }}
        onMouseEnter={(e) => {
          e.currentTarget.style.color = c.text;
          e.currentTarget.style.backgroundColor = `${c.muted}10`;
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.color = c.muted;
          e.currentTarget.style.backgroundColor = 'transparent';
        }}
      >
        <Bell className="w-5 h-5" />
        
        {/* Unread badge */}
        <AnimatePresence>
          {unreadCount > 0 && (
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              exit={{ scale: 0 }}
              className="absolute -top-1 -right-1 w-5 h-5 text-white text-xs font-bold rounded-full flex items-center justify-center"
              style={{ backgroundColor: c.danger }}
            >
              {unreadCount > 9 ? '9+' : unreadCount}
            </motion.div>
          )}
        </AnimatePresence>
      </button>

      {/* Dropdown */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: -10, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -10, scale: 0.95 }}
            transition={{ duration: 0.15 }}
            className="absolute right-0 mt-2 w-80 rounded-xl shadow-xl overflow-hidden z-50"
            style={{ backgroundColor: '#fff', border: `1px solid ${c.border}` }}
          >
            {/* Header */}
            <div 
              className="px-4 py-3 flex items-center justify-between"
              style={{ backgroundColor: `${c.muted}05`, borderBottom: `1px solid ${c.border}` }}
            >
              <h3 className="font-medium flex items-center gap-2" style={{ color: c.text }}>
                <Calendar className="w-4 h-4" style={{ color: c.primary }} />
                Schedule Updates
              </h3>
              {unreadCount > 0 && (
                <button
                  onClick={handleMarkAllAsRead}
                  className="text-xs flex items-center gap-1"
                  style={{ color: c.primary }}
                >
                  <CheckCheck className="w-3 h-3" />
                  Mark all read
                </button>
              )}
            </div>

            {/* Notifications list */}
            <div className="max-h-96 overflow-y-auto">
              {loading ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="w-6 h-6 animate-spin" style={{ color: c.primary }} />
                </div>
              ) : notifications.length === 0 ? (
                <div className="text-center py-8" style={{ color: c.muted }}>
                  <Bell className="w-8 h-8 mx-auto mb-2 opacity-50" />
                  <p className="text-sm">No notifications</p>
                </div>
              ) : (
                notifications.map((notification) => (
                  <motion.div
                    key={notification._id}
                    layout
                    className="px-4 py-3"
                    style={{ 
                      borderBottom: `1px solid ${c.border}40`,
                      backgroundColor: !notification.isRead ? `${c.primary}05` : 'transparent'
                    }}
                  >
                    <div className="flex gap-3">
                      {/* Icon */}
                      <div className="flex-shrink-0 mt-0.5">
                        {getNotificationIcon(notification.type)}
                      </div>

                      {/* Content */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-2">
                          <p className="text-sm font-medium" style={{ color: c.text }}>
                            {notification.title}
                          </p>
                          {!notification.isRead && (
                            <div 
                              className="w-2 h-2 rounded-full flex-shrink-0 mt-1.5"
                              style={{ backgroundColor: c.primary }}
                            />
                          )}
                        </div>
                        
                        <p className="text-xs mt-0.5 line-clamp-2" style={{ color: c.muted }}>
                          {notification.message}
                        </p>

                        {/* Affected dates */}
                        {notification.affectedDates?.length > 0 && (
                          <div className="flex items-center gap-1 text-xs mt-1" style={{ color: c.muted }}>
                            <Clock className="w-3 h-3" />
                            {formatAffectedDates(notification.affectedDates)}
                          </div>
                        )}

                        {/* Time and actions */}
                        <div className="flex items-center justify-between mt-2">
                          <span className="text-xs" style={{ color: c.muted }}>
                            {formatRelativeTime(notification.createdAt)}
                          </span>
                          
                          <div className="flex items-center gap-1">
                            {!notification.isRead && (
                              <button
                                onClick={() => handleMarkAsRead(notification._id)}
                                className="p-1 rounded transition-colors"
                                style={{ color: c.muted }}
                                onMouseEnter={(e) => {
                                  e.currentTarget.style.color = c.success;
                                  e.currentTarget.style.backgroundColor = `${c.success}10`;
                                }}
                                onMouseLeave={(e) => {
                                  e.currentTarget.style.color = c.muted;
                                  e.currentTarget.style.backgroundColor = 'transparent';
                                }}
                                title="Mark as read"
                              >
                                <Check className="w-3 h-3" />
                              </button>
                            )}
                            <button
                              onClick={() => handleDelete(notification._id)}
                              className="p-1 rounded transition-colors"
                              style={{ color: c.muted }}
                              onMouseEnter={(e) => {
                                e.currentTarget.style.color = c.danger;
                                e.currentTarget.style.backgroundColor = `${c.danger}10`;
                              }}
                              onMouseLeave={(e) => {
                                e.currentTarget.style.color = c.muted;
                                e.currentTarget.style.backgroundColor = 'transparent';
                              }}
                              title="Delete"
                            >
                              <Trash2 className="w-3 h-3" />
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  </motion.div>
                ))
              )}
            </div>

            {/* Footer */}
            {notifications.length > 0 && (
              <div 
                className="px-4 py-2"
                style={{ backgroundColor: `${c.muted}05`, borderTop: `1px solid ${c.border}` }}
              >
                <button
                  onClick={() => {
                    setIsOpen(false);
                  }}
                  className="text-xs"
                  style={{ color: c.primary }}
                >
                  View all notifications
                </button>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default ScheduleNotificationBell;
