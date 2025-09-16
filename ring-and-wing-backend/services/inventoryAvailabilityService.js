const Item = require('../models/Items');
const MenuItemIngredient = require('../models/MenuItemIngredient');
const InventoryReservation = require('../models/InventoryReservation');

/**
 * Inventory Availability Service
 * Handles real-time availability calculations with FIFO compatibility and substitution logic
 */
class InventoryAvailabilityService {
  
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
    
    // Check if both units are weight units
    if (weightConversions[fromUnit] && weightConversions[toUnit]) {
      const baseQuantity = quantity * weightConversions[fromUnit];
      return baseQuantity / weightConversions[toUnit];
    }
    
    // Check if both units are volume units
    if (volumeConversions[fromUnit] && volumeConversions[toUnit]) {
      const baseQuantity = quantity * volumeConversions[fromUnit];
      return baseQuantity / volumeConversions[toUnit];
    }
    
    // If units are not compatible, return original quantity
    console.warn(`Cannot convert between incompatible units: ${fromUnit} to ${toUnit}`);
    return quantity;
  }
  
  /**
   * Calculate available stock for an ingredient, considering reservations
   * @param {string} ingredientId - The ingredient ID to check
   * @returns {Promise<object>} - Availability information
   */
  static async getIngredientAvailability(ingredientId) {
    try {
      // Get ingredient details
      const ingredient = await Item.findById(ingredientId);
      if (!ingredient) {
        throw new Error('Ingredient not found');
      }
      
      // Get current reservations for this ingredient
      const reservationSummary = await InventoryReservation.getReservationSummary(ingredientId);
      
      // Calculate available stock (total - reserved)
      const totalStock = ingredient.totalQuantity || ingredient.currentStock || 0;
      const reservedQuantity = reservationSummary.totalReserved || 0;
      const availableStock = Math.max(0, totalStock - reservedQuantity);
      
      return {
        ingredientId,
        ingredientName: ingredient.name,
        unit: ingredient.unit,
        totalStock,
        reservedQuantity,
        availableStock,
        reservationCount: reservationSummary.reservationCount || 0,
        reservedValue: reservationSummary.totalValue || 0,
        isAvailable: availableStock > 0,
        lowStock: availableStock <= (ingredient.minStock || 0),
        lastUpdated: new Date()
      };
      
    } catch (error) {
      console.error('Error calculating ingredient availability:', error);
      throw error;
    }
  }
  
  /**
   * Calculate availability for multiple ingredients
   * @param {string[]} ingredientIds - Array of ingredient IDs
   * @returns {Promise<object[]>} - Array of availability information
   */
  static async getBulkIngredientAvailability(ingredientIds) {
    try {
      const availabilities = await Promise.all(
        ingredientIds.map(id => this.getIngredientAvailability(id))
      );
      
      return availabilities;
    } catch (error) {
      console.error('Error calculating bulk ingredient availability:', error);
      throw error;
    }
  }
  
  /**
   * Check if enough ingredients are available for a menu item
   * @param {string} menuItemId - The menu item ID to check
   * @param {number} quantity - Number of menu items needed
   * @returns {Promise<object>} - Availability result with details
   */
  static async checkMenuItemAvailability(menuItemId, quantity = 1) {
    try {
      console.log(`\n🔍 AVAILABILITY CHECK: menuItemId=${menuItemId}, quantity=${quantity}`);
      
      // Ensure menuItemId is a proper ObjectId
      const { ObjectId } = require('mongoose').Types;
      const objectId = ObjectId.isValid(menuItemId) ? new ObjectId(menuItemId) : menuItemId;
      console.log(`🔧 ObjectId conversion: ${menuItemId} -> ${objectId} (valid: ${ObjectId.isValid(menuItemId)})`);
      
      // First try to get ingredient mappings from the MenuItemIngredient collection
      let mappings = await MenuItemIngredient.findByMenuItem(objectId);
      console.log(`📋 Found ${mappings.length} ingredient mappings in MenuItemIngredient collection`);
      
      // If no mappings found in the collection, check the menu item's ingredients field
      if (mappings.length === 0) {
        console.log(`🔍 No mappings in collection, checking menu item's ingredients field...`);
        const MenuItem = require('../models/MenuItem');
        const menuItem = await MenuItem.findById(objectId);
        
        if (menuItem && menuItem.ingredients && menuItem.ingredients.length > 0) {
          console.log(`📋 Found ${menuItem.ingredients.length} ingredients in menu item document`);
          
          // Parse the ingredients from the menu item
          const parsedIngredients = [];
          for (const ingredientStr of menuItem.ingredients) {
            try {
              const ingredientData = JSON.parse(ingredientStr);
              if (Array.isArray(ingredientData)) {
                parsedIngredients.push(...ingredientData);
              } else {
                parsedIngredients.push(ingredientData);
              }
            } catch (parseError) {
              console.warn(`Failed to parse ingredient: ${ingredientStr}`);
            }
          }
          
          // Convert parsed ingredients to mapping format
          mappings = parsedIngredients.map(ing => ({
            ingredientId: ing.ingredientId || ing._id,
            quantity: ing.quantity || ing.quantityNeeded,
            unit: ing.unit,
            isRequired: ing.isRequired !== false,
            tolerance: ing.tolerance || 0.1
          }));
          
          console.log(`📋 Parsed ${mappings.length} ingredients from menu item:`, mappings);
        }
      }
      
      console.log(`📋 Final mappings count: ${mappings.length}`);
      
      if (mappings.length === 0) {
        console.log('No ingredient mappings found - item considered always available');
        // No ingredient mappings - item is always available (non-tracked)
        return {
          menuItemId,
          quantity,
          isAvailable: true,
          hasIngredientTracking: false,
          ingredientChecks: [],
          insufficientIngredients: [],
          substitutionOptions: []
        };
      }
      
      const ingredientChecks = [];
      const insufficientIngredients = [];
      const substitutionOptions = [];
      
      // Check each required ingredient
      for (const mapping of mappings) {
        const requiredQuantity = mapping.quantity * quantity;
        const availability = await this.getIngredientAvailability(mapping.ingredientId);
        
        // Convert available stock to recipe unit for proper comparison
        const availableInRecipeUnit = this.convertUnits(
          availability.availableStock,
          availability.unit,
          mapping.unit
        );
        
        console.log(`Availability check for ${availability.ingredientName}:`);
        console.log(`- Available: ${availability.availableStock} ${availability.unit}`);
        console.log(`- Required: ${requiredQuantity} ${mapping.unit}`);
        console.log(`- Available converted: ${availableInRecipeUnit} ${mapping.unit}`);
        console.log(`- Sufficient: ${availableInRecipeUnit >= requiredQuantity}`);
        
        const checkResult = {
          ingredientId: mapping.ingredientId,
          ingredientName: availability.ingredientName,
          required: requiredQuantity,
          available: availableInRecipeUnit, // Use converted amount
          unit: mapping.unit, // Use recipe unit for consistency
          sufficient: availableInRecipeUnit >= requiredQuantity,
          isRequired: mapping.isRequired,
          originalAvailable: availability.availableStock,
          originalUnit: availability.unit
        };
        
        ingredientChecks.push(checkResult);
        
        // If insufficient and required, add to insufficient list
        if (!checkResult.sufficient && mapping.isRequired) {
          insufficientIngredients.push({
            ...checkResult,
            shortage: requiredQuantity - availableInRecipeUnit
          });
          
          // Check substitutions if available
          if (mapping.substitutions && mapping.substitutions.length > 0) {
            const substitutions = await this.checkSubstitutions(
              mapping.substitutions,
              requiredQuantity
            );
            
            if (substitutions.length > 0) {
              substitutionOptions.push({
                originalIngredient: checkResult,
                substitutions
              });
            }
          }
        }
      }
      
      const isAvailable = insufficientIngredients.length === 0;
      const canUseSubstitutions = substitutionOptions.some(
        option => option.substitutions.some(sub => sub.sufficient)
      );
      
      return {
        menuItemId,
        quantity,
        isAvailable,
        canFulfillWithSubstitutions: !isAvailable && canUseSubstitutions,
        hasIngredientTracking: true,
        ingredientChecks,
        insufficientIngredients,
        substitutionOptions,
        totalIngredientsChecked: ingredientChecks.length,
        sufficientIngredients: ingredientChecks.filter(check => check.sufficient).length,
        lastUpdated: new Date()
      };
      
    } catch (error) {
      console.error('Error checking menu item availability:', error);
      throw error;
    }
  }
  
  /**
   * Check availability for multiple menu items (order-level)
   * @param {object[]} orderItems - Array of {menuItemId, quantity} objects
   * @returns {Promise<object>} - Order availability result
   */
  static async checkOrderAvailability(orderItems) {
    try {
      if (!Array.isArray(orderItems) || orderItems.length === 0) {
        throw new Error('Order items array is required');
      }
      
      // Aggregate all ingredient requirements across the order
      const ingredientRequirements = await MenuItemIngredient.getRequirementsForOrder(orderItems);
      
      if (ingredientRequirements.length === 0) {
        // No ingredients tracked in this order
        return {
          orderItems,
          isAvailable: true,
          hasIngredientTracking: false,
          itemAvailabilities: orderItems.map(item => ({
            menuItemId: item.menuItemId,
            quantity: item.quantity,
            isAvailable: true,
            hasIngredientTracking: false
          }))
        };
      }
      
      // Check availability for each aggregated requirement
      const ingredientChecks = [];
      const insufficientIngredients = [];
      const substitutionOptions = [];
      
      for (const requirement of ingredientRequirements) {
        const availability = await this.getIngredientAvailability(requirement.ingredientId);
        
        const checkResult = {
          ingredientId: requirement.ingredientId,
          ingredientName: availability.ingredientName,
          totalRequired: requirement.totalRequired,
          available: availability.availableStock,
          unit: requirement.unit,
          sufficient: availability.availableStock >= requirement.totalRequired,
          usedInItems: requirement.fromMenuItems,
          isRequired: requirement.isRequired
        };
        
        ingredientChecks.push(checkResult);
        
        if (!checkResult.sufficient && requirement.isRequired) {
          insufficientIngredients.push({
            ...checkResult,
            shortage: requirement.totalRequired - availability.availableStock
          });
          
          // Check substitutions
          if (requirement.substitutions && requirement.substitutions.length > 0) {
            const substitutions = await this.checkSubstitutions(
              requirement.substitutions,
              requirement.totalRequired
            );
            
            if (substitutions.length > 0) {
              substitutionOptions.push({
                originalIngredient: checkResult,
                substitutions
              });
            }
          }
        }
      }
      
      // Check individual menu item availability
      const itemAvailabilities = await Promise.all(
        orderItems.map(item => 
          this.checkMenuItemAvailability(item.menuItemId, item.quantity)
        )
      );
      
      const isAvailable = insufficientIngredients.length === 0;
      const canFulfillWithSubstitutions = substitutionOptions.some(
        option => option.substitutions.some(sub => sub.sufficient)
      );
      
      return {
        orderItems,
        isAvailable,
        canFulfillWithSubstitutions,
        hasIngredientTracking: true,
        ingredientChecks,
        insufficientIngredients,
        substitutionOptions,
        itemAvailabilities,
        summary: {
          totalIngredients: ingredientChecks.length,
          sufficientIngredients: ingredientChecks.filter(check => check.sufficient).length,
          insufficientCount: insufficientIngredients.length,
          substitutionOptionsAvailable: substitutionOptions.length
        },
        lastUpdated: new Date()
      };
      
    } catch (error) {
      console.error('Error checking order availability:', error);
      throw error;
    }
  }
  
  /**
   * Check substitution availability
   * @param {string[]} substitutionIds - Array of substitute ingredient IDs
   * @param {number} requiredQuantity - Quantity needed
   * @returns {Promise<object[]>} - Available substitutions
   */
  static async checkSubstitutions(substitutionIds, requiredQuantity) {
    try {
      const substitutions = [];
      
      for (const substitutionId of substitutionIds) {
        const availability = await this.getIngredientAvailability(substitutionId);
        
        substitutions.push({
          ingredientId: substitutionId,
          ingredientName: availability.ingredientName,
          available: availability.availableStock,
          required: requiredQuantity,
          sufficient: availability.availableStock >= requiredQuantity,
          unit: availability.unit
        });
      }
      
      // Sort by availability (sufficient first, then by available quantity)
      return substitutions.sort((a, b) => {
        if (a.sufficient && !b.sufficient) return -1;
        if (!a.sufficient && b.sufficient) return 1;
        return b.available - a.available;
      });
      
    } catch (error) {
      console.error('Error checking substitutions:', error);
      return [];
    }
  }
  
  /**
   * Get low stock ingredients that are used in menu items
   * @param {number} threshold - Optional threshold (uses minStock if not provided)
   * @returns {Promise<object[]>} - Low stock ingredients with menu item impact
   */
  static async getLowStockIngredients(threshold = null) {
    try {
      // Get all ingredients used in menu items
      const usedIngredients = await MenuItemIngredient.distinct('ingredientId', { isActive: true });
      
      const lowStockItems = [];
      
      for (const ingredientId of usedIngredients) {
        const availability = await this.getIngredientAvailability(ingredientId);
        const ingredient = await Item.findById(ingredientId);
        
        const stockThreshold = threshold || ingredient.minStock || 0;
        
        if (availability.availableStock <= stockThreshold) {
          // Find affected menu items
          const affectedMenuItems = await MenuItemIngredient.findByIngredient(ingredientId);
          
          lowStockItems.push({
            ...availability,
            threshold: stockThreshold,
            affectedMenuItems: affectedMenuItems.map(mapping => ({
              menuItemId: mapping.menuItemId._id,
              menuItemName: mapping.menuItemId.name,
              quantityNeeded: mapping.quantity,
              isRequired: mapping.isRequired,
              hasSubstitutions: mapping.substitutions.length > 0
            }))
          });
        }
      }
      
      // Sort by severity (availability vs threshold)
      return lowStockItems.sort((a, b) => {
        const ratioA = a.availableStock / a.threshold;
        const ratioB = b.availableStock / b.threshold;
        return ratioA - ratioB;
      });
      
    } catch (error) {
      console.error('Error getting low stock ingredients:', error);
      throw error;
    }
  }
  
  /**
   * Simulate reservation to check if order can be fulfilled
   * @param {object[]} orderItems - Array of {menuItemId, quantity} objects
   * @returns {Promise<object>} - Simulation result
   */
  static async simulateReservation(orderItems) {
    try {
      const availabilityCheck = await this.checkOrderAvailability(orderItems);
      
      if (!availabilityCheck.isAvailable) {
        return {
          canReserve: false,
          availabilityCheck,
          message: 'Insufficient ingredients for order'
        };
      }
      
      // Calculate what would be reserved
      const reservationSimulation = availabilityCheck.ingredientChecks.map(check => ({
        ingredientId: check.ingredientId,
        ingredientName: check.ingredientName,
        currentStock: check.available + (check.totalRequired || 0), // Add back what would be reserved
        willReserve: check.totalRequired || 0,
        remainingAfterReservation: check.available,
        unit: check.unit
      }));
      
      return {
        canReserve: true,
        availabilityCheck,
        reservationSimulation,
        message: 'Order can be fulfilled'
      };
      
    } catch (error) {
      console.error('Error simulating reservation:', error);
      throw error;
    }
  }
  
  /**
   * Get ingredients that are running low and need restocking soon
   * @param {number} daysAhead - Days to look ahead for demand
   * @returns {Promise<object[]>} - Ingredients needing attention
   */
  static async getRestockAlerts(daysAhead = 7) {
    try {
      // This is a simplified version - in production, you'd want to analyze
      // historical usage patterns and projected demand
      
      const usedIngredients = await MenuItemIngredient.distinct('ingredientId', { isActive: true });
      const alerts = [];
      
      for (const ingredientId of usedIngredients) {
        const availability = await this.getIngredientAvailability(ingredientId);
        const ingredient = await Item.findById(ingredientId);
        
        // Simple heuristic: if available stock is less than 3x minimum stock
        const restockThreshold = (ingredient.minStock || 0) * 3;
        
        if (availability.availableStock <= restockThreshold) {
          const affectedMenuItems = await MenuItemIngredient.findByIngredient(ingredientId);
          
          alerts.push({
            ...availability,
            restockThreshold,
            urgency: availability.availableStock <= ingredient.minStock ? 'high' : 'medium',
            daysSupplyRemaining: Math.floor(availability.availableStock / (ingredient.minStock || 1)),
            affectedMenuItems: affectedMenuItems.length,
            recommendation: availability.availableStock <= ingredient.minStock 
              ? 'Restock immediately' 
              : 'Schedule restock within 3 days'
          });
        }
      }
      
      // Sort by urgency and stock level
      return alerts.sort((a, b) => {
        if (a.urgency === 'high' && b.urgency !== 'high') return -1;
        if (b.urgency === 'high' && a.urgency !== 'high') return 1;
        return a.availableStock - b.availableStock;
      });
      
    } catch (error) {
      console.error('Error generating restock alerts:', error);
      throw error;
    }
  }
}

module.exports = InventoryAvailabilityService;