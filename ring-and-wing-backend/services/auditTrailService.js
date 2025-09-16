const InventoryAdjustment = require('../models/InventoryAdjustment');
const Item = require('../models/Items');

/**
 * Audit Trail Service
 * Handles comprehensive logging of all inventory adjustments with full context and traceability
 */
class AuditTrailService {
  
  /**
   * Create a new inventory adjustment record
   * @param {string} referenceId - The reference ID (order ID, etc.)
   * @param {string} referenceType - Type of reference (order_reservation, etc.)
   * @param {object[]} adjustments - Array of adjustment objects
   * @param {string} performedBy - User ID who performed the adjustment
   * @param {object} options - Additional options
   * @returns {Promise<object>} - Created adjustment record
   */
  static async createAdjustment(referenceId, referenceType, adjustments, performedBy, options = {}) {
    try {
      const {
        authorizedBy = null,
        notes = '',
        systemGenerated = false,
        location = null,
        shift = null,
        externalReferences = [],
        session = null
      } = options;
      
      // Validate adjustment items and populate with current data
      const validatedAdjustments = await this.validateAndEnrichAdjustments(adjustments, session);
      
      // Create the adjustment record
      const adjustmentRecord = new InventoryAdjustment({
        referenceId,
        referenceType,
        adjustments: validatedAdjustments,
        performedBy,
        authorizedBy,
        notes,
        systemGenerated,
        location,
        shift,
        externalReferences
      });
      
      // Save with session if provided (for transactions)
      const savedRecord = session 
        ? await adjustmentRecord.save({ session })
        : await adjustmentRecord.save();
      
      // Check for compliance flags
      await this.checkComplianceFlags(savedRecord);
      
      console.log(`✅ Audit trail created: ${referenceType} for reference ${referenceId} (${adjustments.length} items)`);
      
      return {
        success: true,
        adjustment: savedRecord,
        message: 'Audit trail record created successfully'
      };
      
    } catch (error) {
      console.error('Error creating audit trail:', error);
      throw error;
    }
  }
  
  /**
   * Create adjustment for order reservation
   * @param {string} orderId - Order ID
   * @param {object[]} adjustments - Adjustment items
   * @param {string} performedBy - User ID
   * @param {object} options - Additional options
   * @returns {Promise<object>} - Created adjustment
   */
  static async createOrderReservationAdjustment(orderId, adjustments, performedBy, options = {}) {
    return this.createAdjustment(
      orderId,
      'order_reservation',
      adjustments,
      performedBy,
      {
        ...options,
        notes: options.notes || 'Inventory reserved for order processing',
        systemGenerated: true
      }
    );
  }
  
  /**
   * Create adjustment for order consumption
   * @param {string} orderId - Order ID
   * @param {object[]} adjustments - Adjustment items
   * @param {string} performedBy - User ID
   * @param {object} options - Additional options
   * @returns {Promise<object>} - Created adjustment
   */
  static async createOrderConsumptionAdjustment(orderId, adjustments, performedBy, options = {}) {
    return this.createAdjustment(
      orderId,
      'order_consumption',
      adjustments,
      performedBy,
      {
        ...options,
        notes: options.notes || 'Inventory consumed for completed order',
        systemGenerated: true
      }
    );
  }
  
  /**
   * Create adjustment for order release
   * @param {string} orderId - Order ID
   * @param {object[]} adjustments - Adjustment items
   * @param {string} performedBy - User ID
   * @param {object} options - Additional options
   * @returns {Promise<object>} - Created adjustment
   */
  static async createOrderReleaseAdjustment(orderId, adjustments, performedBy, options = {}) {
    return this.createAdjustment(
      orderId,
      'order_release',
      adjustments,
      performedBy,
      {
        ...options,
        notes: options.notes || 'Reserved inventory released',
        systemGenerated: true
      }
    );
  }
  
  /**
   * Create adjustment for manual inventory changes
   * @param {string} referenceId - Reference ID
   * @param {object[]} adjustments - Adjustment items
   * @param {string} performedBy - User ID
   * @param {string} authorizedBy - Authorizing user ID
   * @param {object} options - Additional options
   * @returns {Promise<object>} - Created adjustment
   */
  static async createManualAdjustment(referenceId, adjustments, performedBy, authorizedBy, options = {}) {
    return this.createAdjustment(
      referenceId,
      'manual_adjustment',
      adjustments,
      performedBy,
      {
        ...options,
        authorizedBy,
        systemGenerated: false
      }
    );
  }
  
  /**
   * Create adjustment for receiving new inventory
   * @param {string} referenceId - Reference ID (invoice, delivery receipt)
   * @param {object[]} adjustments - Adjustment items
   * @param {string} performedBy - User ID
   * @param {object} options - Additional options
   * @returns {Promise<object>} - Created adjustment
   */
  static async createReceivingAdjustment(referenceId, adjustments, performedBy, options = {}) {
    return this.createAdjustment(
      referenceId,
      'receiving',
      adjustments,
      performedBy,
      {
        ...options,
        notes: options.notes || 'New inventory received',
        systemGenerated: false
      }
    );
  }
  
  /**
   * Create adjustment for waste/expired inventory
   * @param {string} referenceId - Reference ID
   * @param {object[]} adjustments - Adjustment items
   * @param {string} performedBy - User ID
   * @param {object} options - Additional options
   * @returns {Promise<object>} - Created adjustment
   */
  static async createWasteAdjustment(referenceId, adjustments, performedBy, options = {}) {
    return this.createAdjustment(
      referenceId,
      'waste',
      adjustments,
      performedBy,
      {
        ...options,
        notes: options.notes || 'Inventory marked as waste/expired',
        systemGenerated: false
      }
    );
  }
  
  /**
   * Get adjustment history for an item
   * @param {string} itemId - Item ID
   * @param {object} options - Query options
   * @returns {Promise<object[]>} - Adjustment history
   */
  static async getItemHistory(itemId, options = {}) {
    try {
      const history = await InventoryAdjustment.getItemHistory(itemId, options);
      
      return {
        success: true,
        itemId,
        history,
        totalRecords: history.length
      };
      
    } catch (error) {
      console.error('Error fetching item history:', error);
      throw error;
    }
  }
  
  /**
   * Get adjustment summary by type for a date range
   * @param {Date} startDate - Start date
   * @param {Date} endDate - End date
   * @returns {Promise<object>} - Adjustment summary
   */
  static async getAdjustmentSummary(startDate, endDate) {
    try {
      const summary = await InventoryAdjustment.getSummaryByType(startDate, endDate);
      
      const totalAdjustments = summary.reduce((sum, item) => sum + item.count, 0);
      const totalValueImpact = summary.reduce((sum, item) => sum + item.totalValueImpact, 0);
      
      return {
        success: true,
        period: { startDate, endDate },
        summary,
        totals: {
          adjustments: totalAdjustments,
          valueImpact: totalValueImpact
        }
      };
      
    } catch (error) {
      console.error('Error generating adjustment summary:', error);
      throw error;
    }
  }
  
  /**
   * Find adjustments requiring review
   * @param {object} criteria - Review criteria
   * @returns {Promise<object[]>} - Adjustments needing review
   */
  static async findAdjustmentsForReview(criteria = {}) {
    try {
      const {
        valueThreshold = 100,
        quantityThreshold = 50,
        includeResolved = false
      } = criteria;
      
      let adjustments = await InventoryAdjustment.findLargeAdjustments(valueThreshold, quantityThreshold);
      
      if (!includeResolved) {
        adjustments = adjustments.filter(adj => 
          !adj.complianceFlags.every(flag => flag.resolved)
        );
      }
      
      return {
        success: true,
        adjustments,
        criteria: { valueThreshold, quantityThreshold },
        totalFound: adjustments.length
      };
      
    } catch (error) {
      console.error('Error finding adjustments for review:', error);
      throw error;
    }
  }
  
  /**
   * Export audit trail for compliance
   * @param {object} filters - Export filters
   * @returns {Promise<object>} - Export data
   */
  static async exportAuditTrail(filters = {}) {
    try {
      const {
        startDate = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000), // 30 days ago
        endDate = new Date(),
        referenceTypes = null,
        performedBy = null,
        includeDetails = true
      } = filters;
      
      const query = {
        timestamp: { $gte: startDate, $lte: endDate }
      };
      
      if (referenceTypes && referenceTypes.length > 0) {
        query.referenceType = { $in: referenceTypes };
      }
      
      if (performedBy) {
        query.performedBy = performedBy;
      }
      
      const adjustments = await InventoryAdjustment.find(query)
        .populate('performedBy', 'username position')
        .populate('authorizedBy', 'username position')
        .sort({ timestamp: -1 });
      
      // Calculate summary statistics
      const stats = {
        totalRecords: adjustments.length,
        dateRange: { startDate, endDate },
        typeBreakdown: {},
        totalValueImpact: 0,
        totalQuantityImpact: 0
      };
      
      adjustments.forEach(adj => {
        stats.typeBreakdown[adj.referenceType] = (stats.typeBreakdown[adj.referenceType] || 0) + 1;
        stats.totalValueImpact += adj.totalValueImpact || 0;
        stats.totalQuantityImpact += adj.totalQuantityImpact || 0;
      });
      
      return {
        success: true,
        exportDate: new Date(),
        filters,
        statistics: stats,
        records: includeDetails ? adjustments : adjustments.map(adj => ({
          id: adj._id,
          timestamp: adj.timestamp,
          referenceType: adj.referenceType,
          referenceId: adj.referenceId,
          performedBy: adj.performedBy?.username,
          totalValueImpact: adj.totalValueImpact,
          itemsAffected: adj.adjustments.length
        }))
      };
      
    } catch (error) {
      console.error('Error exporting audit trail:', error);
      throw error;
    }
  }
  
  /**
   * Validate and enrich adjustment items with current inventory data
   * @private
   */
  static async validateAndEnrichAdjustments(adjustments, session = null) {
    const enriched = [];
    
    for (const adjustment of adjustments) {
      if (!adjustment.itemId || adjustment.quantityChanged === undefined) {
        throw new Error('Adjustment items must have itemId and quantityChanged');
      }
      
      // Get current item data
      const item = session
        ? await Item.findById(adjustment.itemId).session(session)
        : await Item.findById(adjustment.itemId);
      
      if (!item) {
        throw new Error(`Item not found: ${adjustment.itemId}`);
      }
      
      enriched.push({
        itemId: adjustment.itemId,
        quantityBefore: adjustment.quantityBefore ?? item.currentStock,
        quantityAfter: adjustment.quantityAfter ?? (item.currentStock + adjustment.quantityChanged),
        quantityChanged: adjustment.quantityChanged,
        unit: adjustment.unit || item.unit || 'pieces',
        reason: adjustment.reason || 'System adjustment',
        batchId: adjustment.batchId || null,
        lotNumber: adjustment.lotNumber || item.lotNumber || null,
        expirationDate: adjustment.expirationDate || item.expirationDate || null,
        unitCostBefore: adjustment.unitCostBefore ?? item.price ?? 0,
        unitCostAfter: adjustment.unitCostAfter ?? item.price ?? 0,
        totalValueImpact: adjustment.totalValueImpact ?? 
          (adjustment.quantityChanged * (item.price || 0))
      });
    }
    
    return enriched;
  }
  
  /**
   * Check for compliance flags and add them if needed
   * @private
   */
  static async checkComplianceFlags(adjustmentRecord) {
    const flags = [];
    
    // Check for high-value adjustments
    if (Math.abs(adjustmentRecord.totalValueImpact) > 500) {
      flags.push({
        type: 'variance_threshold',
        description: `High-value adjustment: $${Math.abs(adjustmentRecord.totalValueImpact).toFixed(2)}`
      });
    }
    
    // Check for large quantity changes
    if (adjustmentRecord.totalQuantityImpact > 100) {
      flags.push({
        type: 'variance_threshold',
        description: `Large quantity adjustment: ${adjustmentRecord.totalQuantityImpact} units`
      });
    }
    
    // Check for waste adjustments (potential food safety concern)
    if (adjustmentRecord.referenceType === 'waste') {
      flags.push({
        type: 'food_safety',
        description: 'Waste adjustment - review for food safety compliance'
      });
    }
    
    // Check for manual adjustments without authorization
    if (adjustmentRecord.referenceType === 'manual_adjustment' && !adjustmentRecord.authorizedBy) {
      flags.push({
        type: 'audit_required',
        description: 'Manual adjustment without authorization - requires review'
      });
    }
    
    // Add flags to the record
    if (flags.length > 0) {
      adjustmentRecord.complianceFlags.push(...flags);
      await adjustmentRecord.save();
    }
  }
}

module.exports = AuditTrailService;