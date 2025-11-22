/**
 * Socket Service - Centralized socket.io event emission utility
 * Provides throttling, logging, and consistent event emission patterns
 * 
 * Created: October 15, 2025 (Sprint 22 - Real-Time Inventory System)
 */

const { logger } = require('../config/logger');

/**
 * Event throttle cache to prevent event flooding
 * Structure: Map<string, timestamp>
 */
const eventThrottle = new Map();

/**
 * Cleanup old throttle entries every 5 minutes
 */
setInterval(() => {
  const now = Date.now();
  const EXPIRE_TIME = 5 * 60 * 1000; // 5 minutes
  
  for (const [key, timestamp] of eventThrottle.entries()) {
    if (now - timestamp > EXPIRE_TIME) {
      eventThrottle.delete(key);
    }
  }
}, 5 * 60 * 1000);

/**
 * Socket Service Class
 * Handles all socket.io event emissions with throttling and logging
 */
class SocketService {
  
  /**
   * Emit a socket event with optional throttling
   * 
   * @param {object} io - Socket.io instance
   * @param {string} eventName - Name of the event to emit
   * @param {object} payload - Data to send with the event
   * @param {object} options - Emission options
   * @param {boolean} options.throttle - Whether to throttle this event (default: true)
   * @param {number} options.throttleMs - Throttle duration in milliseconds (default: 1000)
   * @param {string} options.room - Specific room to emit to (default: broadcast to all)
   * @param {boolean} options.log - Whether to log this emission (default: true)
   * @returns {boolean} - Whether the event was emitted
   */
  static emit(io, eventName, payload, options = {}) {
    // Validate io object
    if (!io || typeof io.emit !== 'function') {
      console.warn('[SocketService] Invalid io object provided, skipping emit');
      return false;
    }
    
    const {
      throttle = true,
      throttleMs = 1000,
      room = null,
      log = true
    } = options;
    
    // Apply throttling if enabled
    if (throttle) {
      const canEmit = this.checkThrottle(eventName, payload, throttleMs);
      if (!canEmit) {
        if (log) {
          console.log(`[SocketService] Throttled: ${eventName} for ${this.getThrottleKey(eventName, payload)}`);
        }
        return false;
      }
    }
    
    // Emit to specific room or broadcast
    try {
      if (room) {
        io.to(room).emit(eventName, payload);
      } else {
        io.emit(eventName, payload);
      }
      
      // Log emission
      if (log) {
        logger.info(`[SocketService] Emitted: ${eventName}`, {
          event: eventName,
          room: room || 'broadcast',
          payloadKeys: Object.keys(payload),
          timestamp: new Date().toISOString()
        });
      }
      
      return true;
    } catch (error) {
      logger.error(`[SocketService] Error emitting ${eventName}:`, {
        error: error.message,
        event: eventName,
        payload,
        timestamp: new Date().toISOString()
      });
      return false;
    }
  }
  
  /**
   * Check if event should be throttled
   * 
   * @param {string} eventName - Event name
   * @param {object} payload - Event payload
   * @param {number} throttleMs - Throttle duration
   * @returns {boolean} - Whether event can be emitted
   */
  static checkThrottle(eventName, payload, throttleMs) {
    const key = this.getThrottleKey(eventName, payload);
    const now = Date.now();
    
    if (eventThrottle.has(key)) {
      const lastEmit = eventThrottle.get(key);
      if (now - lastEmit < throttleMs) {
        return false; // Still within throttle window
      }
    }
    
    // Update throttle timestamp
    eventThrottle.set(key, now);
    return true;
  }
  
  /**
   * Generate throttle key based on event and payload
   * 
   * @param {string} eventName - Event name
   * @param {object} payload - Event payload
   * @returns {string} - Throttle cache key
   */
  static getThrottleKey(eventName, payload) {
    // Use event name + relevant ID from payload for throttle key
    const id = payload.menuItemId || payload.itemId || payload.reservationId || payload.orderId || 'global';
    return `${eventName}:${id}`;
  }
  
  /**
   * Emit inventory-related events
   * Convenience methods for common event patterns
   */
  
  /**
   * Emit ingredient mapping changed event
   * 
   * @param {object} io - Socket.io instance
   * @param {string} menuItemId - Menu item ID
   * @param {number} ingredientCount - Number of ingredients
   * @param {boolean} hasTracking - Whether item has ingredient tracking
   */
  static emitIngredientMappingChanged(io, menuItemId, ingredientCount, hasTracking) {
    return this.emit(io, 'ingredientMappingChanged', {
      menuItemId,
      ingredientCount,
      hasTracking,
      timestamp: Date.now()
    }, {
      throttle: true,
      throttleMs: 500 // More aggressive throttle for mapping changes
    });
  }
  
  /**
   * Emit menu availability changed event
   * 
   * @param {object} io - Socket.io instance
   * @param {string} menuItemId - Menu item ID
   * @param {boolean} isAvailable - Whether item is available
   * @param {string} reason - Reason for availability change
   * @param {array} insufficientIngredients - List of insufficient ingredients
   */
  static emitMenuAvailabilityChanged(io, menuItemId, isAvailable, reason, insufficientIngredients = []) {
    return this.emit(io, 'menuAvailabilityChanged', {
      menuItemId,
      isAvailable,
      reason: reason || (isAvailable ? 'All ingredients available' : 'Insufficient ingredients'),
      insufficientIngredients,
      timestamp: Date.now()
    }, {
      throttle: true,
      throttleMs: 1000
    });
  }
  
  /**
   * Emit stock level changed event
   * 
   * @param {object} io - Socket.io instance
   * @param {string} itemId - Inventory item ID
   * @param {string} itemName - Item name
   * @param {number} newStock - New stock level
   * @param {number} previousStock - Previous stock level
   * @param {string} unit - Stock unit
   */
  static emitStockLevelChanged(io, itemId, itemName, newStock, previousStock, unit) {
    return this.emit(io, 'stockLevelChanged', {
      itemId,
      itemName,
      newStock,
      previousStock,
      change: newStock - previousStock,
      unit,
      timestamp: Date.now()
    }, {
      throttle: false, // 🔥 CHANGED: No throttling - we need every stock update
      log: true
    });
  }
  
  /**
   * Emit reservation created event
   * 
   * @param {object} io - Socket.io instance
   * @param {object} reservation - Full reservation object
   */
  static emitReservationCreated(io, reservation) {
    return this.emit(io, 'reservationCreated', {
      reservation, // Send full reservation object to match frontend expectations
      timestamp: Date.now()
    }, {
      throttle: false, // Don't throttle reservation events
      log: true
    });
  }
  
  /**
   * Emit reservation completed event
   * 
   * @param {object} io - Socket.io instance
   * @param {string} reservationId - Reservation ID
   * @param {string} orderId - Order ID
   */
  static emitReservationCompleted(io, reservationId, orderId) {
    return this.emit(io, 'reservationCompleted', {
      reservationId,
      orderId,
      timestamp: Date.now()
    }, {
      throttle: false,
      log: true
    });
  }
  
  /**
   * Emit reservation released event
   * 
   * @param {object} io - Socket.io instance
   * @param {string} reservationId - Reservation ID
   * @param {string} orderId - Order ID
   * @param {string} reason - Release reason
   */
  static emitReservationReleased(io, reservationId, orderId, reason) {
    return this.emit(io, 'reservationReleased', {
      reservationId,
      orderId,
      reason,
      timestamp: Date.now()
    }, {
      throttle: false,
      log: true
    });
  }
  
  /**
   * Emit alert triggered event
   * 
   * @param {object} io - Socket.io instance
   * @param {string} alertType - Type of alert
   * @param {string} title - Alert title
   * @param {string} message - Alert message
   * @param {string} severity - Alert severity (low/medium/high)
   * @param {object} details - Additional alert details
   */
  static emitAlertTriggered(io, alertType, title, message, severity, details = {}) {
    return this.emit(io, 'alertTriggered', {
      id: `${alertType}_${details.itemId || details.menuItemId || Date.now()}`,
      type: alertType,
      title,
      message,
      severity,
      details,
      timestamp: Date.now()
    }, {
      throttle: true,
      throttleMs: 5000, // Throttle alerts more aggressively (5 seconds)
      room: 'staff' // Only send alerts to staff room
    });
  }
  
  /**
   * Emit new order created event (for self-checkout orders)
   * 
   * @param {object} io - Socket.io instance
   * @param {object} order - Full order object
   */
  static emitNewOrder(io, order) {
    return this.emit(io, 'newPaymentOrder', {
      order,
      timestamp: Date.now()
    }, {
      throttle: false, // Don't throttle new order notifications
      room: 'staff', // Only send to staff room
      log: true
    });
  }
  
  /**
   * Emit user logout event (for multi-tab logout synchronization)
   * 
   * @param {object} io - Socket.io instance
   * @param {string} userId - User ID who logged out
   * @param {string} reason - Logout reason (optional)
   */
  static emitUserLogout(io, userId, reason = 'manual') {
    return this.emit(io, 'userLoggedOut', {
      userId,
      reason,
      timestamp: Date.now()
    }, {
      throttle: false, // Never throttle logout events
      room: `user-${userId}`, // Send only to specific user's tabs
      log: true
    });
  }
  
  /**
   * Clear throttle cache (useful for testing)
   */
  static clearThrottleCache() {
    eventThrottle.clear();
  }
  
  /**
   * Get current throttle cache size (for monitoring)
   */
  static getThrottleCacheSize() {
    return eventThrottle.size;
  }
}

module.exports = SocketService;
