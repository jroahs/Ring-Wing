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
   * Check if MongoDB supports transactions (replica set required)
   * @returns {Promise<boolean>}
   */
  static async supportsTransactions() {
    try {
      const admin = mongoose.connection.db.admin();
      const result = await admin.serverInfo();
      // Check if it's a replica set or sharded cluster
      const isMaster = await admin.command({ isMaster: 1 });
      return isMaster.setName !== undefined || isMaster.msg === 'isdbgrid';
    } catch (error) {
      console.warn('Could not determine transaction support, assuming no support:', error.message);
      return false;
    }
  }
  
  /**
   * Create a reservation for an order with atomic transaction
   * @param {string} orderId - The order ID
   * @param {object[]} orderItems - Array of {menuItemId, quantity, name} objects
   * @param {string} userId - User performing the reservation
   * @param {object} options - Additional options
   * @param {object} io - Socket.io instance for real-time events (optional)
   * @returns {Promise<object>} - Reservation result
   */
  static async createOrderReservation(orderId, orderItems, userId, options = {}, io = null) {
    // Check transaction support
    const useTransactions = await this.supportsTransactions();
    console.log(`MongoDB transaction support: ${useTransactions ? 'enabled' : 'disabled (standalone mode)'}`);
    
    let session = null;
    
    try {
      // Start session only if transactions are supported
      if (useTransactions) {
        session = await mongoose.startSession();
        session.startTransaction();
      }
      
      // Check for existing reservation (idempotency)
      const existingReservation = await InventoryReservation.findOne({ orderId });
      if (existingReservation) {
        if (session) await session.abortTransaction();
        return {
          success: true,
          reservation: existingReservation,
          message: 'Reservation already exists for this order',
          isIdempotent: true
        };
      }
      
      // Verify order exists
      const order = await Order.findById(orderId);
      if (!order) {
        throw new Error('Order not found');
      }
      
      // Get ingredient requirements for the order
      const ingredientRequirements = await MenuItemIngredient.getRequirementsForOrder(orderItems);
      
      if (ingredientRequirements.length === 0) {
        // No ingredients to reserve - return successful no-op
        if (session) await session.abortTransaction();
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
        if (session) await session.abortTransaction();
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
        const ingredient = await Item.findById(requirement.ingredientId);
        if (!ingredient) {
          throw new Error(`Ingredient not found: ${requirement.ingredientId}`);
        }
        
        let quantityToReserve = requirement.totalRequired;
        
        // Calculate total stock from inventory batches
        const totalStock = ingredient.inventory?.reduce((sum, batch) => sum + batch.quantity, 0) || 0;
        
        // Check if we have enough stock
        if (totalStock < quantityToReserve) {
          if (options.managerOverride) {
            // Manager override - allow reservation but flag it
            console.warn(`Manager override: Reserving ${quantityToReserve} of ${ingredient.name} with only ${totalStock} available`);
          } else if (options.allowPartial) {
            quantityToReserve = Math.max(0, totalStock);
          } else {
            throw new Error(`Insufficient stock for ${ingredient.name}: need ${quantityToReserve}, have ${totalStock}`);
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
          const currentStock = ingredient.inventory?.reduce((sum, batch) => sum + batch.quantity, 0) || 0;
          adjustmentItems.push({
            itemId: requirement.ingredientId,
            quantityBefore: currentStock,
            quantityAfter: currentStock, // Stock doesn't change, only reserved
            quantityChanged: 0, // No change in total stock
            unit: requirement.unit,
            reason: `Reserved for order ${order.orderNumber || orderId}`,
            totalValueImpact: 0 // No value change for reservation
          });
        }
      }
      
      if (reservationItems.length === 0) {
        if (session) await session.abortTransaction();
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
      
      await reservation.save(session ? { session } : {});
      
      // Create audit trail (skip session if not supported, and don't fail if audit trail fails)
      if (adjustmentItems.length > 0) {
        try {
          await AuditTrailService.createAdjustment(
            orderId,
            'order_reservation',
            adjustmentItems,
            userId,
            { 
              notes: `Inventory reserved for order ${order.orderNumber || orderId}`,
              ...(session ? { session } : {})
            }
          );
          console.log(`Audit trail created for reservation`);
        } catch (auditError) {
          console.warn('Could not create audit trail (non-critical):', auditError.message);
          // Don't fail the reservation if audit trail fails
        }
      }
      
      if (session) await session.commitTransaction();
      
      // Populate the reservation for response
      await reservation.populate([
        { path: 'orderId', select: 'orderNumber status customer totalAmount' },
        { path: 'createdBy', select: 'username position' },
        { path: 'reservations.ingredientId', select: 'name category unit quantity' }
      ]);
      
      // 🔥 NEW: Emit socket events for real-time updates (Sprint 22)
      if (io) {
        const SocketService = require('./socketService');
        SocketService.emitReservationCreated(
          io,
          reservation.toObject() // Pass full reservation object for frontend
        );
      }
      
      return {
        success: true,
        reservation,
        message: `Reserved ingredients for order ${order.orderNumber || orderId}`,
        itemsReserved: reservationItems.length,
        totalValue: reservation.totalReservedValue,
        expiresAt: reservation.expiresAt
      };
      
    } catch (error) {
      if (session) await session.abortTransaction();
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
      if (session) session.endSession();
    }
  }
  
  /**
   * Consume a reservation (convert reserved inventory to actual consumption)
   * @param {string} reservationId - The reservation ID
   * @param {string} userId - User consuming the reservation
   * @param {object} io - Socket.io instance for real-time events (optional)
   * @returns {Promise<object>} - Consumption result
   */
  static async consumeReservation(reservationId, userId, io = null) {
    const supportsTransactions = await this.supportsTransactions();
    console.log(`Consuming reservation - transaction support: ${supportsTransactions}`);
    let session = null;
    
    if (supportsTransactions) {
      session = await mongoose.startSession();
      session.startTransaction();
    }
    
    try {
      console.log(`Finding reservation ${reservationId} with session: ${session ? 'YES' : 'NO'}`);
      const reservation = supportsTransactions 
        ? await InventoryReservation.findById(reservationId).session(session)
        : await InventoryReservation.findById(reservationId);
        
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
        
        const ingredient = supportsTransactions
          ? await Item.findById(reservationItem.ingredientId).session(session)
          : await Item.findById(reservationItem.ingredientId);
          
        if (!ingredient) {
          console.warn(`Ingredient not found during consumption: ${reservationItem.ingredientId}`);
          continue;
        }
        
        console.log(`Consuming ${reservationItem.quantityReserved} ${reservationItem.unit} of ${ingredient.name}`);
        const stockBefore = ingredient.inventory.reduce((sum, b) => sum + b.quantity, 0);
        
        // Consume from FIFO batches (this handles the actual inventory update and save)
        const consumptionResult = await this.consumeFromBatches(
          ingredient,
          reservationItem.quantityReserved,
          reservationItem.reservedBatches,
          session
        );
        
        // Refetch to get updated totalQuantity virtual
        const updatedIngredient = await Item.findById(ingredient._id);
        const stockAfter = updatedIngredient.inventory.reduce((sum, b) => sum + b.quantity, 0);
        
        console.log(`Stock updated: ${stockBefore} → ${stockAfter} (consumed: ${consumptionResult.consumed})`);
        
        // Mark reservation item as consumed
        reservationItem.status = 'consumed';
        
        // Prepare audit trail
        adjustmentItems.push({
          itemId: reservationItem.ingredientId,
          quantityBefore: stockBefore,
          quantityAfter: stockAfter,
          quantityChanged: -consumptionResult.consumed,
          unit: reservationItem.unit,
          reason: `Consumed for completed order ${reservation.orderId}`,
          totalValueImpact: -reservationItem.totalCost
        });
      }
      
      // Update reservation status
      reservation.status = 'consumed';
      // Only set modifiedBy if userId is a valid ObjectId
      if (userId && mongoose.Types.ObjectId.isValid(userId)) {
        reservation.modifiedBy = userId;
      }
      
      if (supportsTransactions) {
        await reservation.save({ session });
      } else {
        await reservation.save();
      }
      
      // Create consumption audit trail (non-critical)
      if (adjustmentItems.length > 0) {
        try {
          await AuditTrailService.createAdjustment(
            reservation.orderId,
            'order_consumption',
            adjustmentItems,
            userId,
            {
              notes: `Inventory consumed for order completion`,
              ...(supportsTransactions && { session })
            }
          );
        } catch (auditError) {
          console.warn('Could not create consumption audit trail (non-critical):', auditError.message);
        }
      }
      
      if (supportsTransactions) {
        await session.commitTransaction();
      }
      
      // 🔥 NEW: Emit socket events for real-time updates (Sprint 22)
      if (io) {
        const SocketService = require('./socketService');
        
        // Emit reservation completed event
        SocketService.emitReservationCompleted(io, reservationId, reservation.orderId);
        
        // Emit stock level changes for consumed items
        for (const item of adjustmentItems) {
          try {
            const ingredient = await Item.findById(item.itemId);
            if (ingredient) {
              SocketService.emitStockLevelChanged(
                io,
                item.itemId,
                ingredient.name,
                item.quantityAfter,
                item.quantityBefore,
                item.unit
              );
            }
          } catch (stockEmitError) {
            console.warn('Failed to emit stock level change:', stockEmitError.message);
          }
        }
      }
      
      return {
        success: true,
        reservation,
        message: 'Reservation consumed successfully',
        itemsConsumed: adjustmentItems.length,
        totalValueConsumed: adjustmentItems.reduce((sum, item) => sum + Math.abs(item.totalValueImpact), 0)
      };
      
    } catch (error) {
      if (supportsTransactions && session) {
        await session.abortTransaction();
      }
      console.error('Error consuming reservation:', error);
      throw error;
    } finally {
      if (session) {
        session.endSession();
      }
    }
  }
  
  /**
   * Release a reservation (return reserved inventory to available stock)
   * @param {string} reservationId - The reservation ID
   * @param {string} userId - User releasing the reservation
   * @param {string} reason - Reason for release
   * @param {object} io - Socket.io instance for real-time events (optional)
   * @returns {Promise<object>} - Release result
   */
  static async releaseReservation(reservationId, userId, reason = 'Manual release', io = null) {
    const supportsTransactions = await this.supportsTransactions();
    let session = null;
    
    if (supportsTransactions) {
      session = await mongoose.startSession();
      session.startTransaction();
    }
    
    try {
      const reservation = supportsTransactions
        ? await InventoryReservation.findById(reservationId).session(session)
        : await InventoryReservation.findById(reservationId);
        
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
      // Only set modifiedBy if userId is a valid ObjectId
      if (userId && mongoose.Types.ObjectId.isValid(userId)) {
        reservation.modifiedBy = userId;
      }
      reservation.notes = `${reservation.notes || ''}\nReleased: ${reason}`.trim();
      
      if (supportsTransactions) {
        await reservation.save({ session });
      } else {
        await reservation.save();
      }
      
      // Create release audit trail (non-critical)
      if (adjustmentItems.length > 0) {
        try {
          await AuditTrailService.createAdjustment(
            reservation.orderId,
            'order_release',
            adjustmentItems,
            userId,
            {
              notes: `Reservation released: ${reason}`,
              ...(supportsTransactions && { session })
            }
          );
        } catch (auditError) {
          console.warn('Could not create release audit trail (non-critical):', auditError.message);
        }
      }
      
      if (supportsTransactions) {
        await session.commitTransaction();
      }
      
      // 🔥 NEW: Emit socket events for real-time updates (Sprint 22)
      if (io) {
        const SocketService = require('./socketService');
        SocketService.emitReservationReleased(io, reservationId, reservation.orderId, reason);
      }
      
      return {
        success: true,
        reservation,
        message: 'Reservation released successfully',
        reason,
        itemsReleased: adjustmentItems.length
      };
      
    } catch (error) {
      if (supportsTransactions && session) {
        await session.abortTransaction();
      }
      console.error('Error releasing reservation:', error);
      throw error;
    } finally {
      if (session) {
        session.endSession();
      }
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
        .populate('reservations.ingredientId', 'name category unit quantity');
      
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
    // FIFO consumption from inventory batches
    let remainingToConsume = quantityToConsume;
    const consumedBatches = [];
    
    console.log(`Starting batch consumption for ${ingredient.name}: ${quantityToConsume} ${ingredient.unit}`);
    console.log(`Available batches:`, ingredient.inventory.map(b => ({ 
      id: b._id, 
      quantity: b.quantity, 
      exp: b.expirationDate 
    })));
    
    // Sort batches by expiration date (FIFO - oldest first)
    const sortedBatches = [...ingredient.inventory].sort((a, b) => 
      new Date(a.expirationDate) - new Date(b.expirationDate)
    );
    
    for (const batch of sortedBatches) {
      if (remainingToConsume <= 0) break;
      
      const consumeFromThisBatch = Math.min(batch.quantity, remainingToConsume);
      
      if (consumeFromThisBatch > 0) {
        batch.quantity -= consumeFromThisBatch;
        remainingToConsume -= consumeFromThisBatch;
        
        consumedBatches.push({
          batchId: batch._id,
          consumed: consumeFromThisBatch,
          remaining: batch.quantity
        });
        
        console.log(`  Consumed ${consumeFromThisBatch} from batch ${batch._id}, remaining: ${batch.quantity}`);
      }
    }
    
    // Remove batches with 0 quantity
    ingredient.inventory = ingredient.inventory.filter(b => b.quantity > 0);
    
    // Save the updated ingredient
    const supportsTransactions = await this.supportsTransactions();
    if (supportsTransactions && session) {
      await ingredient.save({ session });
    } else {
      await ingredient.save();
    }
    
    console.log(`Batch consumption complete. Remaining to consume: ${remainingToConsume}`);
    
    return {
      consumed: quantityToConsume - remainingToConsume,
      batches: consumedBatches
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
      console.log('Fetching active inventory reservations...');
      
      // Query database for all reservations, sorted by most recent
      const reservations = await InventoryReservation.find()
        .populate('orderId', 'receiptNumber orderNumber status totalAmount customer')
        .populate('reservations.ingredientId', 'name unit category')
        .sort({ createdAt: -1 })
        .limit(100) // Limit to most recent 100
        .lean();
      
      console.log(`Found ${reservations.length} reservations`);
      
      // Categorize by status
      const categorized = {
        active: reservations.filter(r => r.status === 'reserved'),
        consumed: reservations.filter(r => r.status === 'consumed'),
        released: reservations.filter(r => r.status === 'released'),
        expired: reservations.filter(r => r.status === 'expired'),
        all: reservations
      };
      
      // Format for frontend display
      const formattedReservations = reservations.map(reservation => ({
        reservationId: reservation._id,
        orderId: reservation.orderId?._id || reservation.orderId,
        orderNumber: reservation.orderId?.receiptNumber || reservation.orderId?.orderNumber || 'N/A',
        status: reservation.status,
        items: reservation.reservations?.map(item => ({
          ingredientId: item.ingredientId?._id || item.ingredientId,
          ingredientName: item.ingredientId?.name || 'Unknown',
          quantity: item.quantityReserved,
          unit: item.unit,
          status: item.status
        })) || [],
        totalCost: reservation.totalReservationCost || 0,
        createdAt: reservation.createdAt,
        expiresAt: reservation.expiresAt,
        notes: reservation.notes
      }));
      
      return {
        success: true,
        data: formattedReservations,
        summary: {
          total: reservations.length,
          active: categorized.active.length,
          consumed: categorized.consumed.length,
          released: categorized.released.length,
          expired: categorized.expired.length
        }
      };
    } catch (error) {
      console.error('Error getting active reservations:', error);
      // Return empty array instead of throwing to prevent UI breaking
      return {
        success: false,
        data: [],
        error: error.message
      };
    }
  }
}

module.exports = InventoryReservationService;