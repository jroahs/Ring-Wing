const InventoryAvailabilityService = require('./inventoryAvailabilityService');
const InventoryReservationService = require('./inventoryReservationService');
const AuditTrailService = require('./auditTrailService');
const MenuItemIngredient = require('../models/MenuItemIngredient');
const { canOverrideInventory } = require('../utils/permissions');
const mongoose = require('mongoose');

// Safe logger function with fallback
function getSafeLogger() {
  try {
    const logger = require('../config/logger');
    if (logger && typeof logger.info === 'function' && typeof logger.error === 'function' && typeof logger.debug === 'function') {
      return logger;
    }
  } catch (error) {
    // Logger not available, use console fallback
  }
  
  return {
    info: (...args) => console.log('[INFO]', ...args),
    error: (...args) => console.error('[ERROR]', ...args),
    debug: (...args) => console.log('[DEBUG]', ...args),
    warn: (...args) => console.warn('[WARN]', ...args)
  };
}

// Cost analysis cache to prevent spam
const costAnalysisCache = new Map();
const COST_ANALYSIS_CACHE_TTL = 5000; // 5 seconds

// Connection throttling to prevent database overload
class ConnectionThrottle {
  constructor(maxConcurrent = 5, cooldownMs = 1000) {
    this.maxConcurrent = maxConcurrent;
    this.cooldownMs = cooldownMs;
    this.activeOperations = 0;
    this.lastOperationTime = 0;
    this.queue = [];
  }
  
  async execute(operation) {
    return new Promise((resolve, reject) => {
      this.queue.push({ operation, resolve, reject });
      this.processQueue();
    });
  }
  
  async processQueue() {
    if (this.activeOperations >= this.maxConcurrent || this.queue.length === 0) {
      return;
    }
    
    const timeSinceLastOp = Date.now() - this.lastOperationTime;
    if (timeSinceLastOp < this.cooldownMs) {
      setTimeout(() => this.processQueue(), this.cooldownMs - timeSinceLastOp);
      return;
    }
    
    const { operation, resolve, reject } = this.queue.shift();
    this.activeOperations++;
    this.lastOperationTime = Date.now();
    
    try {
      const result = await operation();
      resolve(result);
    } catch (error) {
      reject(error);
    } finally {
      this.activeOperations--;
      setTimeout(() => this.processQueue(), this.cooldownMs);
    }
  }
}

// Global throttle instance for database operations
const dbThrottle = new ConnectionThrottle(3, 500); // Max 3 concurrent ops, 500ms cooldown

/**
 * Core Inventory Business Logic Service
 * Implements availability checking, manager override, and transaction rollback mechanisms
 */
class InventoryBusinessLogicService {
  
  /**
   * Convert quantity from one unit to another
   * @param {number} quantity - The quantity to convert
   * @param {string} fromUnit - Source unit
   * @param {string} toUnit - Target unit
   * @returns {number} - Converted quantity
   */
  static convertUnits(quantity, fromUnit, toUnit) {
    if (!quantity || !fromUnit || !toUnit) return quantity;
    
    fromUnit = fromUnit.toLowerCase().trim();
    toUnit = toUnit.toLowerCase().trim();
    
    if (fromUnit === toUnit) return quantity;
    
    // Weight conversions (to grams)
    const weightConversions = {
      'grams': 1,
      'g': 1,
      'kg': 1000,
      'kilograms': 1000,
      'ounces': 28.35,
      'oz': 28.35,
      'pounds': 453.59,
      'lbs': 453.59
    };
    
    // Volume conversions (to ml)
    const volumeConversions = {
      'ml': 1,
      'milliliters': 1,
      'liters': 1000,
      'l': 1000,
      'cups': 237,
      'tablespoons': 15,
      'tbsp': 15,
      'teaspoons': 5,
      'tsp': 5
    };
    
    // Try weight conversion first
    if (weightConversions[fromUnit] && weightConversions[toUnit]) {
      const gramsAmount = quantity * weightConversions[fromUnit];
      return gramsAmount / weightConversions[toUnit];
    }
    
    // Try volume conversion
    if (volumeConversions[fromUnit] && volumeConversions[toUnit]) {
      const mlAmount = quantity * volumeConversions[fromUnit];
      return mlAmount / volumeConversions[toUnit];
    }
    
    // No conversion available, return original quantity
    return quantity;
  }
  
  /**
   * Process order with inventory integration
   * Main entry point for order processing with inventory checks
   * @param {object} orderData - Order data with items
   * @param {object} paymentData - Payment information
   * @param {object} user - User processing the order
   * @param {object} options - Processing options
   * @returns {Promise<object>} - Processing result
   */
  static async processOrderWithInventory(orderData, paymentData, user, options = {}) {
    try {
      const {
        skipInventoryCheck = false,
        managerOverride = false,
        overrideReason = null,
        allowPartial = false
      } = options;
      
      console.log(`🔄 Processing order ${orderData.orderNumber || orderData._id} with inventory integration`);
      
      // Step 1: Validate manager override permissions if needed
      if (managerOverride && !canOverrideInventory(user.position)) {
        return {
          success: false,
          error: 'insufficient_permissions',
          message: 'User does not have permission to override inventory warnings',
          requiredPermission: 'shift_manager or higher'
        };
      }
      
      // Step 2: Check if any items have ingredient mappings
      const mappedItemIds = await this.getOrderMappedItems(orderData.items);
      
      if (mappedItemIds.length === 0) {
        // No ingredient mappings - process normally without inventory integration
        console.log(`✅ Order ${orderData.orderNumber || orderData._id} has no ingredient mappings - processing normally`);
        return {
          success: true,
          order: orderData,
          reservation: null,
          message: 'Order processed successfully - no inventory tracking required',
          hasInventoryIntegration: false
        };
      }
      
      // Step 3: Check availability if not skipped
      if (!skipInventoryCheck) {
        const availabilityResult = await this.checkOrderInventoryAvailability(orderData.items);
        
        if (!availabilityResult.isAvailable && !managerOverride && !allowPartial) {
          return {
            success: false,
            error: 'insufficient_inventory',
            message: 'Insufficient ingredients to fulfill order',
            availabilityCheck: availabilityResult,
            insufficientItems: availabilityResult.insufficientIngredients,
            substitutionOptions: availabilityResult.substitutionOptions,
            canRetryWithOverride: true
          };
        }
      }
      
      // Step 4: Create inventory reservation
      const reservationResult = await InventoryReservationService.createOrderReservation(
        orderData._id,
        orderData.items,
        user.id,
        {
          managerOverride,
          overrideReason,
          allowPartial,
          notes: `Order processed by ${user.username} (${user.position})`
        }
      );
      
      if (!reservationResult.success && !managerOverride) {
        return {
          success: false,
          error: 'reservation_failed',
          message: reservationResult.message || 'Failed to reserve inventory',
          details: reservationResult,
          canRetryWithOverride: reservationResult.canRetryWithOverride || false
        };
      }
      
      return {
        success: true,
        order: orderData,
        reservation: reservationResult.reservation,
        message: reservationResult.message,
        hasInventoryIntegration: true,
        isManagerOverride: managerOverride,
        overrideReason: overrideReason
      };
      
    } catch (error) {
      console.error('Error processing order with inventory:', error);
      
      // Attempt cleanup if partial processing occurred
      try {
        if (orderData._id) {
          await this.cleanupFailedOrderProcessing(orderData._id, user.id);
        }
      } catch (cleanupError) {
        console.error('Error during cleanup:', cleanupError);
      }
      
      return {
        success: false,
        error: 'processing_failed',
        message: 'Order processing failed - no changes made',
        details: error.message
      };
    }
  }
  
  /**
   * Complete order processing (consume reservations)
   * Called when payment is successful and order is finalized
   * @param {string} orderId - Order ID
   * @param {string} userId - User completing the order
   * @returns {Promise<object>} - Completion result
   */
  static async completeOrderProcessing(orderId, userId) {
    try {
      console.log(`🏁 Completing order processing for ${orderId}`);
      
      // Find reservation for this order
      const InventoryReservation = require('../models/InventoryReservation');
      const reservation = await InventoryReservation.findOne({ orderId });
      
      if (!reservation) {
        // No reservation found - order had no inventory integration
        return {
          success: true,
          message: 'Order completed - no inventory integration required',
          hasInventoryIntegration: false
        };
      }
      
      // Consume the reservation
      const consumptionResult = await InventoryReservationService.consumeReservation(
        reservation._id,
        userId
      );
      
      if (!consumptionResult.success) {
        throw new Error(`Failed to consume reservation: ${consumptionResult.message}`);
      }
      
      return {
        success: true,
        message: 'Order completed successfully - inventory consumed',
        reservation: consumptionResult.reservation,
        itemsConsumed: consumptionResult.itemsConsumed,
        valueConsumed: consumptionResult.totalValueConsumed,
        hasInventoryIntegration: true
      };
      
    } catch (error) {
      console.error('Error completing order processing:', error);
      throw error;
    }
  }
  
  /**
   * Cancel order processing (release reservations)
   * Called when order is cancelled or payment fails
   * @param {string} orderId - Order ID
   * @param {string} userId - User cancelling the order
   * @param {string} reason - Cancellation reason
   * @returns {Promise<object>} - Cancellation result
   */
  static async cancelOrderProcessing(orderId, userId, reason = 'Order cancelled') {
    try {
      console.log(`❌ Cancelling order processing for ${orderId}: ${reason}`);
      
      // Find reservation for this order
      const { InventoryReservation } = require('../models/InventoryReservation');
      const reservation = await InventoryReservation.findOne({ orderId });
      
      if (!reservation) {
        return {
          success: true,
          message: 'Order cancelled - no inventory integration to release',
          hasInventoryIntegration: false
        };
      }
      
      // Release the reservation
      const releaseResult = await InventoryReservationService.releaseReservation(
        reservation._id,
        userId,
        reason
      );
      
      if (!releaseResult.success) {
        throw new Error(`Failed to release reservation: ${releaseResult.message}`);
      }
      
      return {
        success: true,
        message: 'Order cancelled successfully - inventory released',
        reservation: releaseResult.reservation,
        itemsReleased: releaseResult.itemsReleased,
        reason: releaseResult.reason,
        hasInventoryIntegration: true
      };
      
    } catch (error) {
      console.error('Error cancelling order processing:', error);
      throw error;
    }
  }
  
  /**
   * Check order inventory availability
   * @param {object[]} orderItems - Order items
   * @returns {Promise<object>} - Availability result
   */
  static async checkOrderInventoryAvailability(orderItems) {
    try {
      const availabilityResult = await InventoryAvailabilityService.checkOrderAvailability(orderItems);
      
      // Add business logic for handling insufficient stock
      if (!availabilityResult.isAvailable) {
        console.warn(`⚠️ Insufficient inventory for order:`, {
          insufficientItems: availabilityResult.insufficientIngredients.length,
          substitutionOptions: availabilityResult.substitutionOptions.length
        });
      }
      
      return availabilityResult;
      
    } catch (error) {
      console.error('Error checking order availability:', error);
      throw error;
    }
  }
  
  /**
   * Get menu items that have ingredient mappings
   * @param {object[]} orderItems - Order items
   * @returns {Promise<string[]>} - Array of menu item IDs with mappings
   */
  static async getOrderMappedItems(orderItems) {
    try {
      const menuItemIds = orderItems.map(item => item.menuItemId);
      
      const mappings = await MenuItemIngredient.find({
        menuItemId: { $in: menuItemIds },
        isActive: true
      }).distinct('menuItemId');
      
      return mappings.map(id => id.toString());
      
    } catch (error) {
      console.error('Error getting mapped items:', error);
      return [];
    }
  }
  
  /**
   * Generate inventory alerts for low stock
   * @returns {Promise<object>} - Alert information
   */
  static async generateInventoryAlerts() {
    try {
      let lowStockItems = [];
      let restockAlerts = [];
      
      try {
        lowStockItems = await InventoryAvailabilityService.getLowStockIngredients();
      } catch (error) {
        console.warn('Error getting low stock items:', error.message);
        lowStockItems = [];
      }
      
      try {
        restockAlerts = await InventoryAvailabilityService.getRestockAlerts();
      } catch (error) {
        console.warn('Error getting restock alerts:', error.message);
        restockAlerts = [];
      }
      
      // Combine and prioritize alerts
      const allAlerts = [
        ...lowStockItems.map(item => ({
          ...item,
          type: 'low_stock',
          priority: (item.availableStock || 0) <= 0 ? 'critical' : 'high'
        })),
        ...restockAlerts.map(item => ({
          ...item,
          type: 'restock_needed',
          priority: item.urgency || 'medium'
        }))
      ];
      
      // Sort by priority and impact
      allAlerts.sort((a, b) => {
        const priorityOrder = { 'critical': 4, 'high': 3, 'medium': 2, 'low': 1 };
        const aPriority = priorityOrder[a.priority] || 1;
        const bPriority = priorityOrder[b.priority] || 1;
        if (aPriority !== bPriority) {
          return bPriority - aPriority;
        }
        return (b.affectedMenuItems || 0) - (a.affectedMenuItems || 0);
      });
      
      return {
        success: true,
        alerts: allAlerts,
        summary: {
          total: allAlerts.length,
          critical: allAlerts.filter(a => a.priority === 'critical').length,
          high: allAlerts.filter(a => a.priority === 'high').length,
          medium: allAlerts.filter(a => a.priority === 'medium').length
        },
        lastUpdated: new Date()
      };
      
    } catch (error) {
      console.error('Error generating inventory alerts:', error);
      // Return empty alerts instead of throwing
      return {
        success: true,
        alerts: [],
        summary: {
          total: 0,
          critical: 0,
          high: 0,
          medium: 0
        },
        lastUpdated: new Date(),
        fallback: true
      };
    }
  }
  
  /**
   * Cleanup failed order processing
   * @private
   */
  static async cleanupFailedOrderProcessing(orderId, userId) {
    try {
      console.log(`🧹 Cleaning up failed processing for order ${orderId}`);
      
      // Release any reservations that might have been created
      await this.cancelOrderProcessing(orderId, userId, 'Cleanup after processing failure');
      
    } catch (error) {
      console.error('Error during cleanup:', error);
      // Don't throw - cleanup is best effort
    }
  }
  
  /**
   * Get inventory integration status for an order
   * @param {string} orderId - Order ID
   * @returns {Promise<object>} - Integration status
   */
  static async getOrderInventoryStatus(orderId) {
    try {
      const { InventoryReservation } = require('../models/InventoryReservation');
      const reservation = await InventoryReservation.findOne({ orderId })
        .populate('reservations.ingredientId', 'name unit currentStock');
      
      if (!reservation) {
        return {
          success: true,
          hasIntegration: false,
          message: 'Order has no inventory integration'
        };
      }
      
      const status = await InventoryReservationService.getReservationStatus(reservation._id);
      
      return {
        success: true,
        hasIntegration: true,
        reservation: status.reservation,
        isExpired: status.isExpired,
        remainingMinutes: status.remainingMinutes,
        itemsReserved: status.itemsReserved,
        activeItems: status.activeItems
      };
      
    } catch (error) {
      console.error('Error getting order inventory status:', error);
      throw error;
    }
  }
  
  /**
   * Handle manager override with validation
   * @param {string} userId - Manager user ID
   * @param {string} position - Manager position
   * @param {string} reason - Override reason
   * @param {object} orderData - Order data
   * @returns {Promise<object>} - Override validation result
   */
  static async validateManagerOverride(userId, position, reason, orderData) {
    try {
      if (!canOverrideInventory(position)) {
        return {
          success: false,
          error: 'insufficient_permissions',
          message: 'User does not have permission to override inventory warnings'
        };
      }
      
      if (!reason || reason.trim().length < 10) {
        return {
          success: false,
          error: 'invalid_reason',
          message: 'Override reason must be at least 10 characters'
        };
      }
      
      // Log the override attempt for audit
      console.log(`🔓 Manager override requested:`, {
        user: userId,
        position,
        order: orderData.orderNumber || orderData._id,
        reason: reason.substring(0, 100)
      });
      
      return {
        success: true,
        message: 'Manager override validated',
        overrideData: {
          userId,
          position,
          reason,
          timestamp: new Date()
        }
      };
      
    } catch (error) {
      console.error('Error validating manager override:', error);
      throw error;
    }
  }
  
  /**
   * Get system health status related to inventory integration
   * @returns {Promise<object>} - System health information
   */
  static async getSystemHealthStatus() {
    try {
      const now = new Date();
      const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000);
      
      // Check reservation system health
      const { InventoryReservation } = require('../models/InventoryReservation');
      const activeReservations = await InventoryReservation.countDocuments({ status: 'active' });
      const expiringReservations = await InventoryReservation.countDocuments({
        status: 'active',
        expiresAt: { $lte: new Date(now.getTime() + 5 * 60 * 1000) }
      });
      
      // Check audit trail health
      const recentAdjustments = await AuditTrailService.getAdjustmentSummary(oneHourAgo, now);
      
      // Check inventory alerts
      const alerts = await this.generateInventoryAlerts();
      
      return {
        success: true,
        timestamp: now,
        reservationSystem: {
          activeReservations,
          expiringReservations,
          status: expiringReservations > 10 ? 'warning' : 'healthy'
        },
        auditTrail: {
          recentAdjustments: recentAdjustments.totals.adjustments,
          status: 'healthy'
        },
        inventoryAlerts: {
          totalAlerts: alerts.summary.total,
          criticalAlerts: alerts.summary.critical,
          status: alerts.summary.critical > 0 ? 'critical' : 
                 alerts.summary.high > 5 ? 'warning' : 'healthy'
        },
        overallStatus: 
          alerts.summary.critical > 0 ? 'critical' :
          (expiringReservations > 10 || alerts.summary.high > 5) ? 'warning' : 'healthy'
      };
      
    } catch (error) {
      console.error('Error getting system health status:', error);
      return {
        success: false,
        error: error.message,
        timestamp: new Date(),
        overallStatus: 'error'
      };
    }
  }

  /**
   * Get menu item ingredients mapping
   * @param {string} menuItemId - Menu item ID
   * @returns {Promise<object>} Ingredient mapping data
   */
  static async getMenuItemIngredients(menuItemId) {
    try {
      const MenuItemIngredient = require('../models/MenuItemIngredient');
      const ingredients = await MenuItemIngredient.find({ menuItemId })
        .populate('ingredientId', 'name unit category currentStock unitCost cost price totalQuantity')
        .lean();
      
      return {
        menuItemId,
        ingredients: ingredients.map(ing => {
          // Handle case where populate didn't work (ingredientId is still ObjectId string)
          if (!ing.ingredientId || typeof ing.ingredientId === 'string') {
            return {
              ingredientId: ing.ingredientId,
              quantity: ing.quantity,
              unit: ing.unit,
              tolerance: ing.tolerance,
              name: 'Unknown Item (populate failed)',
              currentStock: 0,
              unitCost: 0
            };
          }
          
          // Normal case where populate worked
          return {
            inventoryItemId: ing.ingredientId._id,
            name: ing.ingredientId.name,
            quantity: ing.quantity,
            unit: ing.unit || ing.ingredientId.unit,
            tolerance: ing.tolerance,
            currentStock: ing.ingredientId.currentStock || ing.ingredientId.totalQuantity || 0,
            unitCost: ing.ingredientId.unitCost || ing.ingredientId.cost || ing.ingredientId.price || 0
          };
        }),
        totalIngredients: ingredients.length
      };
    } catch (error) {
      console.error('Error getting menu item ingredients:', error);
      throw error;
    }
  }

  /**
   * Update menu item ingredients mapping
   * @param {string} menuItemId - Menu item ID
   * @param {Array} ingredients - Array of ingredient mappings
   * @returns {Promise<object>} Update result
   */
  static async updateMenuItemIngredients(menuItemId, ingredients) {
    const startTime = Date.now();
    
    // Log operation start with connection state
    const logger = getSafeLogger();
    const initialConnectionState = mongoose.connection.readyState;
    
    const startMessage = `[INGREDIENT_MAPPING] ===== STARTING ingredient update for menu item ${menuItemId} ===== - ${new Date().toISOString()}`;
    
    logger.info(`[INGREDIENT_MAPPING] Starting ingredient update for menu item ${menuItemId}`, {
      menuItemId,
      ingredientCount: Array.isArray(ingredients) ? ingredients.length : 0,
      operation: 'updateMenuItemIngredients',
      initialConnectionState: ['disconnected', 'connected', 'connecting', 'disconnecting'][initialConnectionState],
      timestamp: new Date().toISOString()
    });

    // Also log to dedicated file for ingredient operations
    const fs = require('fs');
    const path = require('path');
    const logFile = path.join(__dirname, '../logs/ingredient-mapping-debug.log');
    
    try {
      fs.appendFileSync(logFile, startMessage + '\n');
      fs.appendFileSync(logFile, `Initial connection state: ${['disconnected', 'connected', 'connecting', 'disconnecting'][initialConnectionState]}\n`);
      fs.appendFileSync(logFile, `Ingredient count: ${Array.isArray(ingredients) ? ingredients.length : 0}\n`);
    } catch (err) {
      console.error('Failed to write start message to debug log file:', err);
    }

    // Add connection state monitoring during the operation
    const checkConnectionState = (step) => {
      const currentState = mongoose.connection.readyState;
      const stateNames = ['disconnected', 'connected', 'connecting', 'disconnecting'];
      
      const logMessage = `[CONNECTION_MONITOR] ${step}: ${stateNames[currentState]} - ${new Date().toISOString()}`;
      
      // Log to console
      logger.info(`[CONNECTION_MONITOR] ${step}: ${stateNames[currentState]}`, {
        step,
        readyState: currentState,
        stateName: stateNames[currentState],
        timestamp: new Date().toISOString()
      });
      
      // Also log to dedicated file for ingredient operations
      const fs = require('fs');
      const path = require('path');
      const logFile = path.join(__dirname, '../logs/ingredient-mapping-debug.log');
      
      try {
        fs.appendFileSync(logFile, logMessage + '\n');
      } catch (err) {
        console.error('Failed to write to debug log file:', err);
      }
      
      if (currentState !== 1) {
        const errorMessage = `[CONNECTION_DROP] Database connection lost at step: ${step} - readyState: ${currentState} - ${new Date().toISOString()}`;
        console.error(errorMessage, {
          readyState: currentState,
          stateName: stateNames[currentState]
        });
        
        try {
          fs.appendFileSync(logFile, errorMessage + '\n');
        } catch (err) {
          console.error('Failed to write error to debug log file:', err);
        }
      }
    };

    try {
      let session = null;
      let isTransactionSupported = false;
      
      try {
        const MenuItemIngredient = require('../models/MenuItemIngredient');
        const { ObjectId } = require('mongoose').Types;
        const mongoose = require('mongoose');
        
        console.log('Updating ingredients for menu item:', menuItemId);
        console.log('Ingredients data:', JSON.stringify(ingredients, null, 2));
        
        // Validate inputs
        if (!menuItemId) {
          throw new Error('Menu item ID is required');
        }
        
        // Validate ObjectId format
        if (!ObjectId.isValid(menuItemId)) {
          throw new Error('Invalid menu item ID format');
        }
        
        if (!Array.isArray(ingredients)) {
          throw new Error('Ingredients must be an array');
        }
        
        // Allow empty array for unmapping all ingredients
        if (ingredients.length === 0) {
          checkConnectionState('before-unmapping-validation');
          
          console.log('Removing all ingredient mappings for menu item:', menuItemId);
          logger.info(`[INGREDIENT_MAPPING] Removing all ingredients for menu item ${menuItemId}`, {
            menuItemId,
            operation: 'removeAllIngredients',
            timestamp: new Date().toISOString()
          });
          
          checkConnectionState('before-find-existing-mappings');
          
          // Use a safer approach - find first, then delete individually
          try {
            console.log('Finding existing mappings...');
            const existingMappings = await MenuItemIngredient.find({ 
              menuItemId: new ObjectId(menuItemId) 
            });
            
            checkConnectionState('after-find-existing-mappings');
            
            console.log(`Found ${existingMappings.length} existing mappings to delete`);
            
            if (existingMappings.length === 0) {
              checkConnectionState('no-mappings-found');
              return {
                success: true,
                message: `No ingredient mappings found for menu item ${menuItemId}`,
                deletedCount: 0,
                updatedCount: 0,
                ingredients: []
              };
            }
            
            checkConnectionState('before-individual-deletions');
            
            // Delete one by one to avoid connection issues
            let deletedCount = 0;
            for (const mapping of existingMappings) {
              try {
                checkConnectionState(`before-delete-${deletedCount + 1}`);
                
                await MenuItemIngredient.findByIdAndDelete(mapping._id);
                deletedCount++;
                console.log(`Deleted mapping ${deletedCount}/${existingMappings.length}`);
                
                checkConnectionState(`after-delete-${deletedCount}`);
                
                // Add small delay to prevent overwhelming the connection
                if (deletedCount < existingMappings.length) {
                  await new Promise(resolve => setTimeout(resolve, 10));
                }
              } catch (deleteError) {
                console.error(`Error deleting mapping ${mapping._id}:`, deleteError.message);
                checkConnectionState(`error-during-delete-${deletedCount + 1}`);
              }
            }
            
            checkConnectionState('after-all-deletions-complete');
            
            const duration = Date.now() - startTime;
            logger.info(`[INGREDIENT_MAPPING] Successfully removed all ingredients for menu item ${menuItemId}`, {
              menuItemId,
              deletedCount: deletedCount,
              duration,
              operation: 'removeAllIngredients',
              timestamp: new Date().toISOString()
            });
            
            checkConnectionState('operation-complete');
            
            return {
              success: true,
              message: `All ingredient mappings removed for menu item ${menuItemId}`,
              deletedCount: deletedCount,
              updatedCount: 0,
              ingredients: []
            };
          } catch (deleteError) {
            console.error('Error during safe delete operation:', deleteError);
            checkConnectionState('error-in-delete-operation');
            throw new Error(`Failed to remove ingredients: ${deleteError.message}`);
          }
        }
        
        // Limit the number of ingredients to prevent database overload
        if (ingredients.length > 20) {
          throw new Error('Too many ingredients. Maximum 20 ingredients allowed per menu item.');
        }
        
        checkConnectionState('before-connection-health-check');

        // Check database connection health before proceeding
        if (mongoose.connection.readyState !== 1) {
          const connectionState = ['disconnected', 'connected', 'connecting', 'disconnecting'][mongoose.connection.readyState];
          logger.error(`[INGREDIENT_MAPPING] Database connection not ready for menu item ${menuItemId}`, {
            readyState: mongoose.connection.readyState,
            connectionState,
            menuItemId,
            timestamp: new Date().toISOString()
          });
          throw new Error('Database connection not ready. Please try again in a moment.');
        }
        
        // Check if transactions are supported (replica set or sharded cluster)
        isTransactionSupported = mongoose.connection.db && 
          (mongoose.connection.db.serverConfig?.s?.description?.type === 'ReplicaSetWithPrimary' ||
           mongoose.connection.db.serverConfig?.s?.description?.type === 'Mongos');
        
        // Start a database session for transaction safety (if supported)
        if (isTransactionSupported) {
          session = await mongoose.startSession();
          session.startTransaction();
        }
        
        checkConnectionState('before-delete-existing-mappings');
        
        // Remove existing mappings with session (if supported)
        console.log('Removing existing mappings for menu item:', menuItemId);
        const deleteResult = await MenuItemIngredient.deleteMany(
          { menuItemId: new ObjectId(menuItemId) },
          session ? { session } : {}
        );
        console.log('Deleted existing mappings:', deleteResult.deletedCount);
        
        checkConnectionState('after-delete-existing-mappings');
        
        // Create default admin user ID
        const defaultUserId = new ObjectId('000000000000000000000001');
        
        checkConnectionState('before-ingredient-validation');
        
        // Validate and prepare new mappings
        const newIngredients = [];
        for (let i = 0; i < ingredients.length; i++) {
          const ing = ingredients[i];
          
          // Validate required fields
          if (!ing.inventoryItemId) {
            throw new Error(`Ingredient ${i + 1}: inventoryItemId is required`);
          }
          if (!ObjectId.isValid(ing.inventoryItemId)) {
            throw new Error(`Ingredient ${i + 1}: invalid inventoryItemId format`);
          }
          if (!ing.quantity || isNaN(ing.quantity) || ing.quantity <= 0) {
            throw new Error(`Ingredient ${i + 1}: quantity must be a positive number`);
          }
          if (ing.quantity > 10000) {
            throw new Error(`Ingredient ${i + 1}: quantity too large (max 10000)`);
          }
          if (!ing.unit || typeof ing.unit !== 'string') {
            throw new Error(`Ingredient ${i + 1}: unit is required and must be a string`);
          }
          
          // Validate unit against allowed values
          const allowedUnits = ['grams', 'kg', 'ml', 'liters', 'pieces', 'cups', 'tablespoons', 'teaspoons', 'ounces', 'pounds'];
          const unit = ing.unit.toLowerCase().trim();
          if (!allowedUnits.includes(unit)) {
            throw new Error(`Ingredient ${i + 1}: unit '${ing.unit}' is not valid. Allowed units: ${allowedUnits.join(', ')}`);
          }
          
          newIngredients.push({
            menuItemId: new ObjectId(menuItemId),
            ingredientId: new ObjectId(ing.inventoryItemId),
            quantity: Number(ing.quantity),
            unit: unit,
            tolerance: Math.min(Number(ing.tolerance || 0.1), 1.0), // Max 100% tolerance
            isRequired: ing.isRequired !== false,
            notes: (ing.notes || '').substring(0, 500), // Limit notes length
            createdBy: defaultUserId,
            lastModifiedBy: defaultUserId,
            isActive: true
          });
        }
        
        checkConnectionState('after-ingredient-validation');
        
        console.log('Creating new ingredients:', newIngredients.length);
        
        checkConnectionState('before-insertMany-operations');
        
        // Insert new mappings with session and batch size limit
        let created = [];
        const batchSize = 10; // Process in small batches
        for (let i = 0; i < newIngredients.length; i += batchSize) {
          const batch = newIngredients.slice(i, i + batchSize);
          
          checkConnectionState(`before-insertMany-batch-${Math.floor(i/batchSize) + 1}`);
          
          const batchResult = await MenuItemIngredient.insertMany(
            batch, 
            session ? { session } : {}
          );
          created = created.concat(batchResult);
          
          checkConnectionState(`after-insertMany-batch-${Math.floor(i/batchSize) + 1}`);
          
          // Small delay between batches to prevent overwhelming DB
          if (i + batchSize < newIngredients.length) {
            await new Promise(resolve => setTimeout(resolve, 100));
          }
        }
        
        checkConnectionState('after-all-insertMany-operations');
        
        // Commit the transaction (if supported)
        if (session && isTransactionSupported) {
          checkConnectionState('before-transaction-commit');
          await session.commitTransaction();
          checkConnectionState('after-transaction-commit');
        }
        console.log('Successfully created ingredient mappings:', created.length);
        
        checkConnectionState('operation-successful-complete');
        
        const duration = Date.now() - startTime;
        logger.info(`[INGREDIENT_MAPPING] Successfully updated ingredients for menu item ${menuItemId}`, {
          menuItemId,
          ingredientCount: created.length,
          duration,
          operation: 'updateMenuItemIngredients',
          success: true,
          timestamp: new Date().toISOString()
        });
        
        return {
          success: true,
          menuItemId,
          updated: true,
          ingredientsCount: created.length,
          ingredients: created.map(item => ({
            id: item._id,
            ingredientId: item.ingredientId,
            quantity: item.quantity,
            unit: item.unit,
            tolerance: item.tolerance,
            isRequired: item.isRequired
          }))
        };
      } catch (error) {
        const duration = Date.now() - startTime;
        console.error('Error updating menu item ingredients:', error.message);
        
        // Check if it's a connection-related error
        const isConnectionError = error.message.includes('connection') || 
                                  error.message.includes('disconnect') ||
                                  error.message.includes('timeout') ||
                                  error.name === 'MongoNetworkError' ||
                                  error.name === 'MongoTimeoutError';
        
        logger.error(`[INGREDIENT_MAPPING] Failed to update ingredients for menu item ${menuItemId}`, {
          menuItemId,
          error: error.message,
          errorName: error.name,
          isConnectionError,
          duration,
          connectionReadyState: mongoose.connection.readyState,
          operation: 'updateMenuItemIngredients',
          success: false,
          timestamp: new Date().toISOString(),
          stack: error.stack
        });
        
        // Rollback transaction if it exists and is supported
        if (session && isTransactionSupported) {
          try {
            await session.abortTransaction();
            console.log('Transaction rolled back due to error');
          } catch (rollbackError) {
            logger.error(`[INGREDIENT_MAPPING] Error rolling back transaction for menu item ${menuItemId}`, {
              menuItemId,
              rollbackError: rollbackError.message,
              originalError: error.message,
              timestamp: new Date().toISOString()
            });
          }
        }
        
        throw error;
      } finally {
        // Always end the session if it exists
        if (session) {
          try {
            await session.endSession();
          } catch (sessionError) {
            console.error('Error ending session:', sessionError.message);
          }
        }
      }
    } catch (error) {
      const duration = Date.now() - startTime;
      const isConnectionError = error.message.includes('connection') || 
                                error.message.includes('disconnect') ||
                                error.message.includes('timeout') ||
                                error.name === 'MongoNetworkError' ||
                                error.name === 'MongoTimeoutError';
      
      if (isConnectionError) {
        console.error(`[${new Date().toISOString()}] CONNECTION ISSUE during ingredient mapping:`, {
          menuItemId,
          error: error.message,
          duration,
          timestamp: new Date().toISOString()
        });
      }
      
      logger.error(`[INGREDIENT_MAPPING] Failed to update ingredients for menu item ${menuItemId}`, {
        menuItemId,
        error: error.message,
        errorName: error.name,
        isConnectionError,
        duration,
        operation: 'updateMenuItemIngredients',
        timestamp: new Date().toISOString(),
        stack: error.stack
      });
      
      // Try to cleanup any partially completed transaction
      if (session) {
        try {
          await session.abortTransaction();
        } catch (rollbackError) {
          console.error('Error aborting transaction:', rollbackError.message);
          logger.error(`[INGREDIENT_MAPPING] Error rolling back transaction for menu item ${menuItemId}`, {
            rollbackError: rollbackError.message,
            originalError: error.message,
            menuItemId,
            timestamp: new Date().toISOString()
          });
        } finally {
          try {
            await session.endSession();
          } catch (sessionError) {
            console.error('Error ending session:', sessionError.message);
          }
        }
      }
      
      throw error;
    }
  }

  /**
   * Calculate menu item cost analysis
   * @param {string} menuItemId - Menu item ID
   * @returns {Promise<object>} Cost analysis data
   */
  static async calculateMenuItemCost(menuItemId) {
    const startTime = Date.now();
    const logger = getSafeLogger();
    
    // Add connection monitoring for cost analysis
    const logCostAnalysisConnectionState = (step) => {
      const currentState = mongoose.connection.readyState;
      const stateNames = ['disconnected', 'connected', 'connecting', 'disconnecting'];
      
      const logMessage = `[COST_ANALYSIS_CONNECTION] ${step}: ${stateNames[currentState]} - ${new Date().toISOString()}`;
      
      // Log to console
      logger.info(`[COST_ANALYSIS_CONNECTION] ${step}: ${stateNames[currentState]}`, {
        step,
        menuItemId,
        readyState: currentState,
        stateName: stateNames[currentState],
        timestamp: new Date().toISOString()
      });
      
      // Also log to dedicated file
      const fs = require('fs');
      const path = require('path');
      const logFile = path.join(__dirname, '../logs/ingredient-mapping-debug.log');
      
      try {
        fs.appendFileSync(logFile, logMessage + '\n');
      } catch (err) {
        console.error('Failed to write cost analysis connection state to debug log file:', err);
      }
      
      if (currentState !== 1) {
        const errorMessage = `[COST_ANALYSIS_CONNECTION_DROP] Database connection lost during cost analysis at step: ${step} - readyState: ${currentState} - ${new Date().toISOString()}`;
        console.error(errorMessage, {
          readyState: currentState,
          stateName: stateNames[currentState],
          menuItemId
        });
        
        try {
          fs.appendFileSync(logFile, errorMessage + '\n');
        } catch (err) {
          console.error('Failed to write cost analysis error to debug log file:', err);
        }
      }
    };
    
    logCostAnalysisConnectionState('cost-analysis-start');
    
    // Check cache first to prevent spam requests
    const cacheKey = `cost-analysis-${menuItemId}`;
    const cached = costAnalysisCache.get(cacheKey);
    if (cached && (Date.now() - cached.timestamp < COST_ANALYSIS_CACHE_TTL)) {
      logger.debug(`[COST_ANALYSIS] Returning cached result for menu item ${menuItemId}`, {
        menuItemId,
        cacheAge: Date.now() - cached.timestamp,
        operation: 'calculateMenuItemCost-cached'
      });
      logCostAnalysisConnectionState('cost-analysis-cached-return');
      return cached.result;
    }
    
    logCostAnalysisConnectionState('after-cache-check');
    
    try {
      logger.debug(`[COST_ANALYSIS] Starting cost calculation for menu item ${menuItemId}`, {
        menuItemId,
        operation: 'calculateMenuItemCost',
        timestamp: new Date().toISOString()
      });
      
      logCostAnalysisConnectionState('before-connection-readiness-check');
      
      // Check database connection first
      if (mongoose.connection.readyState !== 1) {
        const connectionState = ['disconnected', 'connected', 'connecting', 'disconnecting'][mongoose.connection.readyState];
        logger.error(`[COST_ANALYSIS] Database connection not ready for menu item ${menuItemId}`, {
          readyState: mongoose.connection.readyState,
          connectionState,
          menuItemId,
          timestamp: new Date().toISOString()
        });
        logCostAnalysisConnectionState('connection-not-ready-error');
        throw new Error('Database connection not ready for cost analysis');
      }
      
      logCostAnalysisConnectionState('before-model-imports');
      
      const MenuItemIngredient = require('../models/MenuItemIngredient');
      const MenuItem = require('../models/MenuItem');
      
      logCostAnalysisConnectionState('before-find-ingredients-query');
      
      const ingredients = await MenuItemIngredient.find({ menuItemId })
        .populate('ingredientId', 'name unitCost cost price')
        .lean();
      
      logCostAnalysisConnectionState('after-find-ingredients-query');
      
      const menuItem = await MenuItem.findById(menuItemId);
      
      logCostAnalysisConnectionState('after-find-menu-item-query');
      
      let totalCost = 0;
      const ingredientCosts = ingredients.map(ing => {
        // Add null checks for populated ingredientId
        if (!ing.ingredientId) {
          console.warn(`Ingredient reference not found for mapping: ${ing._id}`);
          return {
            name: 'Unknown Ingredient',
            quantity: ing.quantity || 0,
            unitCost: 0,
            totalCost: 0,
            warning: 'Ingredient not found'
          };
        }
        
        const unitCost = ing.ingredientId.unitCost || ing.ingredientId.cost || ing.ingredientId.price || 0;
        const quantity = ing.quantity || 0;
        
        // Handle unit conversion for cost calculation
        let convertedQuantity = quantity;
        const inventoryUnit = ing.ingredientId.unit;
        const recipeUnit = ing.unit;
        
        if (inventoryUnit && recipeUnit && inventoryUnit !== recipeUnit) {
          // Convert recipe quantity to inventory unit for cost calculation
          convertedQuantity = this.convertUnits(quantity, recipeUnit, inventoryUnit);
          logger.debug(`[COST_ANALYSIS] Unit conversion applied:`, {
            name: ing.ingredientId.name,
            originalQuantity: quantity,
            originalUnit: recipeUnit,
            convertedQuantity: convertedQuantity,
            convertedUnit: inventoryUnit
          });
        }
        
        const cost = unitCost * convertedQuantity;
        totalCost += cost;
        
        // Debug logging for cost calculation
        logger.debug(`[COST_ANALYSIS] Ingredient cost breakdown:`, {
          name: ing.ingredientId.name,
          unitCost: unitCost,
          originalQuantity: quantity,
          convertedQuantity: convertedQuantity,
          recipeUnit: recipeUnit,
          inventoryUnit: inventoryUnit,
          calculatedCost: cost,
          totalCostSoFar: totalCost
        });
        
        return {
          name: ing.ingredientId.name || 'Unknown',
          quantity: quantity,
          unit: ing.unit || ing.ingredientId.unit,
          unitCost: unitCost,
          totalCost: cost
        };
      });
      
      const sellingPrice = menuItem ? parseFloat(menuItem.price) : 0;
      const profit = sellingPrice - totalCost;
      const profitMargin = sellingPrice > 0 ? (profit / sellingPrice) * 100 : 0;
      
      logCostAnalysisConnectionState('before-result-preparation');
      
      const duration = Date.now() - startTime;
      const result = {
        menuItemId,
        menuItemName: menuItem ? menuItem.name : 'Unknown',
        sellingPrice,
        totalCost: Math.round(totalCost * 100) / 100,
        profit: Math.round(profit * 100) / 100,
        profitMargin: Math.round(profitMargin * 100) / 100,
        ingredientBreakdown: ingredientCosts,
        hasIngredientMapping: ingredients.length > 0
      };
      
      logCostAnalysisConnectionState('before-cache-set');
      
      // Cache the result to prevent spam requests
      costAnalysisCache.set(cacheKey, {
        result,
        timestamp: Date.now()
      });
      
      logger.debug(`[COST_ANALYSIS] Successfully calculated cost for menu item ${menuItemId}`, {
        menuItemId,
        totalCost: result.totalCost,
        ingredientCount: ingredients.length,
        duration,
        operation: 'calculateMenuItemCost',
        timestamp: new Date().toISOString()
      });
      
      logCostAnalysisConnectionState('cost-analysis-success-return');
      
      return result;
    } catch (error) {
      const duration = Date.now() - startTime;
      
      logCostAnalysisConnectionState('cost-analysis-error-catch');
      
      // Check if it's a connection-related error
      const isConnectionError = error.message.includes('connection') || 
                                error.message.includes('disconnect') ||
                                error.message.includes('timeout') ||
                                error.name === 'MongoNetworkError' ||
                                error.name === 'MongoTimeoutError';
      
      logger.error(`[COST_ANALYSIS] Failed to calculate cost for menu item ${menuItemId}`, {
        menuItemId,
        error: error.message,
        errorName: error.name,
        isConnectionError,
        duration,
        connectionReadyState: mongoose.connection.readyState,
        operation: 'calculateMenuItemCost',
        timestamp: new Date().toISOString(),
        stack: error.stack
      });
      
      console.error('Error calculating menu item cost:', error);
      throw error;
    }
  }

  /**
   * Generate comprehensive inventory report
   * @param {object} options - Report options
   * @returns {Promise<object>} Report data
   */
  static async generateInventoryReport(options = {}) {
    try {
      const { startDate, endDate, type } = options;
      const Item = require('../models/Items');
      const InventoryAdjustment = require('../models/InventoryAdjustment');
      
      // Get inventory summary
      const items = await Item.find({}).lean();
      const totalItems = items.length;
      const lowStockItems = items.filter(item => item.currentStock < (item.minStockLevel || 10)).length;
      const totalValue = items.reduce((sum, item) => sum + (item.currentStock * (item.unitCost || 0)), 0);
      
      // Get adjustments in date range
      let adjustments = [];
      if (startDate && endDate) {
        adjustments = await InventoryAdjustment.find({
          createdAt: { $gte: new Date(startDate), $lte: new Date(endDate) }
        }).lean();
      }
      
      return {
        reportType: type || 'comprehensive',
        dateRange: {
          startDate: startDate || null,
          endDate: endDate || null
        },
        summary: {
          totalItems,
          lowStockItems,
          totalValue: Math.round(totalValue * 100) / 100,
          adjustmentsCount: adjustments.length
        },
        items: items.map(item => ({
          id: item._id,
          name: item.name,
          currentStock: item.currentStock,
          unitCost: item.unitCost || 0,
          value: Math.round((item.currentStock * (item.unitCost || 0)) * 100) / 100,
          stockLevel: item.currentStock < (item.minStockLevel || 10) ? 'low' : 'normal'
        })),
        adjustments: adjustments.slice(0, 50), // Limit to 50 most recent
        generatedAt: new Date()
      };
    } catch (error) {
      console.error('Error generating inventory report:', error);
      throw error;
    }
  }
}

module.exports = InventoryBusinessLogicService;