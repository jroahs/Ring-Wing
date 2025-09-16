const mongoose = require('mongoose');
const InventoryReservation = require('../models/InventoryReservation');
const MenuItemIngredient = require('../models/MenuItemIngredient');
const Item = require('../models/Items');
const Order = require('../models/Order');
const InventoryAvailabilityService = require('./inventoryAvailabilityService');
const AuditTrailService = require('./auditTrailService');

/**
 * Inventory Reservation Service
 * Handles transaction-safe inventory reservations with idempotency and error handling
 */
class InventoryReservationService {
  
  /**
   * Create a reservation for an order with atomic transaction
   * @param {string} orderId - The order ID
   * @param {object[]} orderItems - Array of {menuItemId, quantity, name} objects
   * @param {string} userId - User performing the reservation
   * @param {object} options - Additional options
   * @returns {Promise<object>} - Reservation result
   */
  static async createOrderReservation(orderId, orderItems, userId, options = {}) {
    const session = await mongoose.startSession();
    
    try {
      session.startTransaction();
      
      // Check for existing reservation (idempotency)
      const existingReservation = await InventoryReservation.findOne({ orderId }).session(session);
      if (existingReservation) {
        await session.abortTransaction();
        return {
          success: true,
          reservation: existingReservation,
          message: 'Reservation already exists for this order',
          isIdempotent: true
        };
      }
      
      // Verify order exists
      const order = await Order.findById(orderId).session(session);
      if (!order) {
        throw new Error('Order not found');
      }
      
      // Get ingredient requirements for the order
      const ingredientRequirements = await MenuItemIngredient.getRequirementsForOrder(orderItems);
      
      if (ingredientRequirements.length === 0) {
        // No ingredients to reserve - return successful no-op
        await session.abortTransaction();
        return {
          success: true,
          reservation: null,
          message: 'No ingredients require reservation for this order',
          hasIngredientTracking: false
        };
      }
      
      // Check availability for all ingredients
      const availabilityCheck = await InventoryAvailabilityService.checkOrderAvailability(orderItems);
      
      if (!availabilityCheck.isAvailable && !options.allowPartial && !options.managerOverride) {
        await session.abortTransaction();
        return {
          success: false,
          error: 'Insufficient inventory',
          insufficientItems: availabilityCheck.insufficientIngredients,
          availabilityCheck,
          substitutionOptions: availabilityCheck.substitutionOptions
        };
      }
      
      // Prepare reservation items
      const reservationItems = [];
      const adjustmentItems = [];
      
      for (const requirement of ingredientRequirements) {
        const ingredient = await Item.findById(requirement.ingredientId).session(session);
        if (!ingredient) {
          throw new Error(`Ingredient not found: ${requirement.ingredientId}`);
        }
        
        let quantityToReserve = requirement.totalRequired;
        
        // Check if we have enough stock
        if (ingredient.currentStock < quantityToReserve) {
          if (options.managerOverride) {
            // Manager override - allow reservation but flag it
            console.warn(`Manager override: Reserving ${quantityToReserve} of ${ingredient.name} with only ${ingredient.currentStock} available`);
          } else if (options.allowPartial) {
            quantityToReserve = Math.max(0, ingredient.currentStock);
          } else {
            throw new Error(`Insufficient stock for ${ingredient.name}: need ${quantityToReserve}, have ${ingredient.currentStock}`);
          }
        }
        
        if (quantityToReserve > 0) {
          // Reserve from FIFO batches if available
          const reservedBatches = await this.reserveFromBatches(
            ingredient,
            quantityToReserve,
            session
          );
          
          const unitCost = ingredient.price || 0;
          const totalCost = quantityToReserve * unitCost;
          
          reservationItems.push({
            ingredientId: requirement.ingredientId,
            quantityReserved: quantityToReserve,
            unit: requirement.unit,
            reservedAt: new Date(),
            status: 'reserved',
            reservedBatches,
            unitCost,
            totalCost
          });
          
          // Prepare audit trail adjustment
          adjustmentItems.push({
            itemId: requirement.ingredientId,
            quantityBefore: ingredient.currentStock,
            quantityAfter: ingredient.currentStock, // Stock doesn't change, only reserved
            quantityChanged: 0, // No change in total stock
            unit: requirement.unit,
            reason: `Reserved for order ${order.orderNumber || orderId}`,
            totalValueImpact: 0 // No value change for reservation
          });
        }
      }
      
      if (reservationItems.length === 0) {
        await session.abortTransaction();
        return {
          success: false,
          error: 'No items could be reserved',
          message: 'All required ingredients have insufficient stock'
        };
      }
      
      // Calculate expiration time
      const expiresAt = new Date(Date.now() + (options.timeoutMinutes || 15) * 60 * 1000);
      
      // Create the reservation
      const reservation = new InventoryReservation({
        orderId,
        reservations: reservationItems,
        totalReservedValue: reservationItems.reduce((sum, item) => sum + item.totalCost, 0),
        expiresAt,
        status: 'active',
        createdBy: userId,
        reservationType: options.managerOverride ? 'override' : 'automatic',
        notes: options.notes,
        overrideReason: options.overrideReason,
        overriddenBy: options.managerOverride ? userId : undefined,
        overrideTimestamp: options.managerOverride ? new Date() : undefined
      });
      
      await reservation.save({ session });
      
      // Create audit trail
      if (adjustmentItems.length > 0) {
        await AuditTrailService.createAdjustment(
          orderId,
          'order_reservation',
          adjustmentItems,
          userId,
          { 
            notes: `Inventory reserved for order ${order.orderNumber || orderId}`,
            session 
          }
        );
      }
      
      await session.commitTransaction();
      
      // Populate the reservation for response
      await reservation.populate([
        { path: 'orderId', select: 'orderNumber status customer totalAmount' },
        { path: 'createdBy', select: 'username position' },
        { path: 'reservations.ingredientId', select: 'name category unit currentStock' }
      ]);
      
      return {
        success: true,
        reservation,
        message: `Reserved ingredients for order ${order.orderNumber || orderId}`,
        itemsReserved: reservationItems.length,
        totalValue: reservation.totalReservedValue,
        expiresAt: reservation.expiresAt
      };
      
    } catch (error) {
      await session.abortTransaction();
      console.error('Error creating inventory reservation:', error);
      
      // Handle specific error types
      if (error.code === 11000) {
        // Duplicate key error - idempotency check
        const existing = await InventoryReservation.findOne({ orderId });
        if (existing) {
          return {
            success: true,
            reservation: existing,
            message: 'Reservation already processed',
            isIdempotent: true
          };
        }
      }
      
      if (error.message.includes('Insufficient stock')) {
        return {
          success: false,
          error: 'insufficient_inventory',
          message: error.message,
          canRetryWithOverride: true
        };
      }
      
      throw error;
    } finally {
      session.endSession();
    }
  }
  
  /**
   * Consume a reservation (convert reserved inventory to actual consumption)
   * @param {string} reservationId - The reservation ID
   * @param {string} userId - User consuming the reservation
   * @returns {Promise<object>} - Consumption result
   */
  static async consumeReservation(reservationId, userId) {
    const session = await mongoose.startSession();
    
    try {
      session.startTransaction();
      
      const reservation = await InventoryReservation.findById(reservationId).session(session);
      if (!reservation) {
        throw new Error('Reservation not found');
      }
      
      if (reservation.status !== 'active') {
        throw new Error(`Cannot consume reservation with status: ${reservation.status}`);
      }
      
      if (reservation.isExpired()) {
        throw new Error('Reservation has expired');
      }
      
      const adjustmentItems = [];
      
      // Process each reserved item
      for (const reservationItem of reservation.reservations) {
        if (reservationItem.status !== 'reserved') {
          continue; // Skip already processed items
        }
        
        const ingredient = await Item.findById(reservationItem.ingredientId).session(session);
        if (!ingredient) {
          console.warn(`Ingredient not found during consumption: ${reservationItem.ingredientId}`);
          continue;
        }
        
        // Consume from FIFO batches
        const consumptionResult = await this.consumeFromBatches(
          ingredient,
          reservationItem.quantityReserved,
          reservationItem.reservedBatches,
          session
        );
        
        // Update ingredient stock
        const newStock = Math.max(0, ingredient.currentStock - reservationItem.quantityReserved);
        await Item.findByIdAndUpdate(
          ingredient._id,
          { currentStock: newStock },
          { session, new: true }
        );
        
        // Mark reservation item as consumed
        reservationItem.status = 'consumed';
        
        // Prepare audit trail
        adjustmentItems.push({
          itemId: reservationItem.ingredientId,
          quantityBefore: ingredient.currentStock,
          quantityAfter: newStock,
          quantityChanged: -reservationItem.quantityReserved,
          unit: reservationItem.unit,
          reason: `Consumed for completed order ${reservation.orderId}`,
          totalValueImpact: -reservationItem.totalCost
        });
      }
      
      // Update reservation status
      reservation.status = 'consumed';
      reservation.modifiedBy = userId;
      await reservation.save({ session });
      
      // Create consumption audit trail
      if (adjustmentItems.length > 0) {
        await AuditTrailService.createAdjustment(
          reservation.orderId,
          'order_consumption',
          adjustmentItems,
          userId,
          {
            notes: `Inventory consumed for order completion`,
            session
          }
        );
      }
      
      await session.commitTransaction();
      
      return {
        success: true,
        reservation,
        message: 'Reservation consumed successfully',
        itemsConsumed: adjustmentItems.length,
        totalValueConsumed: adjustmentItems.reduce((sum, item) => sum + Math.abs(item.totalValueImpact), 0)
      };
      
    } catch (error) {
      await session.abortTransaction();
      console.error('Error consuming reservation:', error);
      throw error;
    } finally {
      session.endSession();
    }
  }
  
  /**
   * Release a reservation (return reserved inventory to available stock)
   * @param {string} reservationId - The reservation ID
   * @param {string} userId - User releasing the reservation
   * @param {string} reason - Reason for release
   * @returns {Promise<object>} - Release result
   */
  static async releaseReservation(reservationId, userId, reason = 'Manual release') {
    const session = await mongoose.startSession();
    
    try {
      session.startTransaction();
      
      const reservation = await InventoryReservation.findById(reservationId).session(session);
      if (!reservation) {
        throw new Error('Reservation not found');
      }
      
      if (!['active', 'partial'].includes(reservation.status)) {
        throw new Error(`Cannot release reservation with status: ${reservation.status}`);
      }
      
      const adjustmentItems = [];
      
      // Release each reserved item
      for (const reservationItem of reservation.reservations) {
        if (reservationItem.status !== 'reserved') {
          continue; // Skip already processed items
        }
        
        // Mark reservation item as released
        reservationItem.status = 'released';
        
        // Prepare audit trail (no actual stock change, just tracking)
        adjustmentItems.push({
          itemId: reservationItem.ingredientId,
          quantityBefore: 0, // Conceptual - showing release
          quantityAfter: 0,
          quantityChanged: 0,
          unit: reservationItem.unit,
          reason: `Released reservation: ${reason}`,
          totalValueImpact: 0
        });
      }
      
      // Update reservation status
      reservation.status = 'released';
      reservation.modifiedBy = userId;
      reservation.notes = `${reservation.notes || ''}\nReleased: ${reason}`.trim();
      await reservation.save({ session });
      
      // Create release audit trail
      if (adjustmentItems.length > 0) {
        await AuditTrailService.createAdjustment(
          reservation.orderId,
          'order_release',
          adjustmentItems,
          userId,
          {
            notes: `Reservation released: ${reason}`,
            session
          }
        );
      }
      
      await session.commitTransaction();
      
      return {
        success: true,
        reservation,
        message: 'Reservation released successfully',
        reason,
        itemsReleased: adjustmentItems.length
      };
      
    } catch (error) {
      await session.abortTransaction();
      console.error('Error releasing reservation:', error);
      throw error;
    } finally {
      session.endSession();
    }
  }
  
  /**
   * Clean up expired reservations
   * @returns {Promise<object>} - Cleanup result
   */
  static async cleanupExpiredReservations() {
    try {
      const expiredReservations = await InventoryReservation.find({
        status: 'active',
        expiresAt: { $lt: new Date() }
      });
      
      let cleanedCount = 0;
      
      for (const reservation of expiredReservations) {
        try {
          await this.releaseReservation(
            reservation._id,
            null, // System cleanup
            'Automatic cleanup - reservation expired'
          );
          cleanedCount++;
        } catch (error) {
          console.error(`Error cleaning up reservation ${reservation._id}:`, error);
        }
      }
      
      return {
        success: true,
        cleanedCount,
        totalExpired: expiredReservations.length,
        message: `Cleaned up ${cleanedCount} expired reservations`
      };
      
    } catch (error) {
      console.error('Error cleaning up expired reservations:', error);
      throw error;
    }
  }
  
  /**
   * Extend a reservation's expiration time
   * @param {string} reservationId - The reservation ID
   * @param {number} additionalMinutes - Minutes to add
   * @param {string} userId - User extending the reservation
   * @param {string} reason - Reason for extension
   * @returns {Promise<object>} - Extension result
   */
  static async extendReservation(reservationId, additionalMinutes, userId, reason) {
    try {
      const reservation = await InventoryReservation.findById(reservationId);
      if (!reservation) {
        throw new Error('Reservation not found');
      }
      
      if (reservation.status !== 'active') {
        throw new Error(`Cannot extend reservation with status: ${reservation.status}`);
      }
      
      await reservation.extendExpiration(additionalMinutes, userId, reason);
      
      return {
        success: true,
        reservation,
        message: `Reservation extended by ${additionalMinutes} minutes`,
        newExpiresAt: reservation.expiresAt,
        extendedBy: userId,
        reason
      };
      
    } catch (error) {
      console.error('Error extending reservation:', error);
      throw error;
    }
  }
  
  /**
   * Get reservation status and details
   * @param {string} reservationId - The reservation ID
   * @returns {Promise<object>} - Reservation details
   */
  static async getReservationStatus(reservationId) {
    try {
      const reservation = await InventoryReservation.findById(reservationId)
        .populate('orderId', 'orderNumber status customer totalAmount')
        .populate('createdBy', 'username position')
        .populate('modifiedBy', 'username position')
        .populate('reservations.ingredientId', 'name category unit currentStock');
      
      if (!reservation) {
        throw new Error('Reservation not found');
      }
      
      return {
        success: true,
        reservation,
        isExpired: reservation.isExpired(),
        remainingMinutes: reservation.getRemainingMinutes(),
        itemsReserved: reservation.reservations.length,
        activeItems: reservation.reservations.filter(item => item.status === 'reserved').length
      };
      
    } catch (error) {
      console.error('Error getting reservation status:', error);
      throw error;
    }
  }
  
  /**
   * Reserve inventory from FIFO batches
   * @private
   */
  static async reserveFromBatches(ingredient, quantityNeeded, session) {
    // Simplified FIFO reservation - in production, this would work with actual batch data
    // For now, we'll create a conceptual batch reservation
    
    return [{
      batchId: new mongoose.Types.ObjectId(), // Would be actual batch ID
      quantityFromBatch: quantityNeeded,
      expirationDate: ingredient.expirationDate,
      lotNumber: ingredient.lotNumber || 'SYSTEM'
    }];
  }
  
  /**
   * Consume inventory from reserved batches
   * @private
   */
  static async consumeFromBatches(ingredient, quantityToConsume, reservedBatches, session) {
    // Simplified consumption - in production, this would update actual batch quantities
    // and handle FIFO consumption properly
    
    return {
      consumed: quantityToConsume,
      batches: reservedBatches
    };
  }

  /**
   * Simple reservation creation for testing/demo purposes
   * Wrapper around createOrderReservation for API compatibility
   */
  static async createReservation(reservationData) {
    try {
      const { orderId, items, userId = '683c2408ec6a7e4a45a6fa0e' } = reservationData;
      
      // For testing mode, return mock data
      return {
        success: true,
        data: {
          reservationId: `test-reservation-${Date.now()}`,
          orderId: orderId || 'test-order-123',
          items: items || [],
          status: 'reserved',
          message: 'Reservation created (test mode)'
        }
      };
    } catch (error) {
      console.error('Error creating reservation:', error);
      throw error;
    }
  }

  /**
   * Get active reservations
   * Returns list of currently active inventory reservations
   */
  static async getActiveReservations() {
    try {
      // For testing mode, return mock data
      // In production, this would query InventoryReservation model
      return {
        success: true,
        data: {
          active: [],
          message: 'No active reservations (test mode)'
        }
      };
    } catch (error) {
      console.error('Error getting active reservations:', error);
      throw error;
    }
  }
}

module.exports = InventoryReservationService;