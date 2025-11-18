/**
 * Inventory Availability Service
 * Handles real-time inventory checking and reservation for POS orders
 */

class InventoryAvailabilityService {
  constructor() {
    this.baseURL = `${import.meta.env.VITE_API_URL || 'http://localhost:5000'}/api`;
    this.token = localStorage.getItem('token');
  }

  /**
   * Check availability for a single menu item
   */
  async checkMenuItemAvailability(menuItemId, quantity = 1) {
    try {
      const response = await fetch(`${this.baseURL}/ingredients/availability/check`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          items: [{ menuItemId, quantity }]
        })
      });

      if (!response.ok) {
        throw new Error('Failed to check availability');
      }

      const data = await response.json();
      return data.data.results[0] || { available: true, warnings: [] };
    } catch (error) {
      console.error('Error checking menu item availability:', error);
      return { available: true, warnings: [], error: error.message };
    }
  }

  /**
   * Check availability for entire order
   */
  async checkOrderAvailability(orderItems) {
    try {
      const items = orderItems.map(item => ({
        menuItemId: item._id,
        quantity: item.quantity
      }));

      const response = await fetch(`${this.baseURL}/ingredients/availability/check`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ items })
      });

      if (!response.ok) {
        throw new Error('Failed to check order availability');
      }

      const data = await response.json();
      return {
        available: data.data.allAvailable,
        results: data.data.results,
        warnings: data.data.warnings || [],
        conflicts: data.data.conflicts || []
      };
    } catch (error) {
      console.error('Error checking order availability:', error);
      return { 
        available: true, 
        results: [], 
        warnings: [], 
        conflicts: [],
        error: error.message 
      };
    }
  }

  /**
   * Process order with inventory integration
   */
  async processOrderWithInventory(orderData) {
    try {
      const response = await fetch(`${this.baseURL}/ingredients/business-logic/process-order`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(orderData)
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to process order with inventory');
      }

      return await response.json();
    } catch (error) {
      console.error('Error processing order with inventory:', error);
      throw error;
    }
  }

  /**
   * Get ingredient requirements for menu items
   */
  async getIngredientRequirements(menuItemIds) {
    try {
      const response = await fetch(`${this.baseURL}/ingredients/mappings/requirements`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ menuItemIds })
      });

      if (!response.ok) {
        throw new Error('Failed to get ingredient requirements');
      }

      return await response.json();
    } catch (error) {
      console.error('Error getting ingredient requirements:', error);
      return { data: {} };
    }
  }

  /**
   * Format availability status for display
   */
  formatAvailabilityStatus(availability) {
    if (!availability) return { status: 'unknown', message: 'Status unknown', color: 'gray' };

    if (availability.available) {
      if (availability.warnings && availability.warnings.length > 0) {
        return {
          status: 'warning',
          message: availability.warnings[0],
          color: 'yellow',
          details: availability.warnings
        };
      }
      return { status: 'available', message: 'Available', color: 'green' };
    } else {
      return {
        status: 'unavailable',
        message: availability.reason || 'Not available',
        color: 'red',
        details: availability.missingIngredients || []
      };
    }
  }

  /**
   * Handle manager override for unavailable items
   */
  async requestManagerOverride(orderData, reason) {
    try {
      const response = await fetch(`${this.baseURL}/ingredients/business-logic/manager-override`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          ...orderData,
          overrideReason: reason,
          overrideBy: localStorage.getItem('userId')
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Override not authorized');
      }

      return await response.json();
    } catch (error) {
      console.error('Error requesting manager override:', error);
      throw error;
    }
  }
}

export default InventoryAvailabilityService;