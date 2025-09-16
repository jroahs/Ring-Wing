/**
 * Backend permission utilities for user role management
 * This mirrors the frontend permissions but is used for API authorization
 */

/**
 * Check if a user position has inventory access
 * @param {string} position - User position ('cashier', 'inventory', 'shift_manager', 'general_manager', 'admin')
 * @returns {boolean} - Whether the position has inventory access
 */
const hasInventoryAccess = (position) => {
  return ['inventory', 'shift_manager', 'general_manager', 'admin'].includes(position);
};

/**
 * Check if user can manage ingredient mappings
 * @param {string} position - User position
 * @returns {boolean} - Whether the position can manage ingredient mappings
 */
const canManageIngredients = (position) => {
  return ['inventory', 'shift_manager', 'general_manager', 'admin'].includes(position);
};

/**
 * Check if user can override inventory warnings during orders
 * @param {string} position - User position
 * @returns {boolean} - Whether the position can override inventory warnings
 */
const canOverrideInventory = (position) => {
  return ['shift_manager', 'general_manager', 'admin'].includes(position);
};

/**
 * Check if user can view reservation monitoring
 * @param {string} position - User position
 * @returns {boolean} - Whether the position can view reservations
 */
const canViewReservations = (position) => {
  return ['inventory', 'shift_manager', 'general_manager', 'admin'].includes(position);
};

/**
 * Check if user can access ingredient analytics
 * @param {string} position - User position
 * @returns {boolean} - Whether the position can access analytics
 */
const canAccessIngredientAnalytics = (position) => {
  return ['inventory', 'shift_manager', 'general_manager', 'admin'].includes(position);
};

/**
 * Check if user can export audit trails
 * @param {string} position - User position
 * @returns {boolean} - Whether the position can export audit data
 */
const canExportAuditTrail = (position) => {
  return ['inventory', 'shift_manager', 'general_manager', 'admin'].includes(position);
};

/**
 * Check if user can manage full menu (pricing, structure)
 * @param {string} position - User position
 * @returns {boolean} - Whether the position can manage full menu
 */
const canManageFullMenu = (position) => {
  return ['shift_manager', 'general_manager', 'admin'].includes(position);
};

/**
 * Check if user can perform permanent deletions
 * @param {string} position - User position
 * @returns {boolean} - Whether the position can permanently delete records
 */
const canPermanentDelete = (position) => {
  return ['shift_manager', 'general_manager', 'admin'].includes(position);
};

/**
 * Check if user can modify system settings
 * @param {string} position - User position
 * @returns {boolean} - Whether the position can modify system settings
 */
const canModifySystemSettings = (position) => {
  return ['admin'].includes(position);
};

/**
 * Check if user can authorize high-value adjustments
 * @param {string} position - User position
 * @returns {boolean} - Whether the position can authorize significant inventory adjustments
 */
const canAuthorizeAdjustments = (position) => {
  return ['general_manager', 'admin'].includes(position);
};

/**
 * Get permission level for position (numeric for comparison)
 * @param {string} position - User position
 * @returns {number} - Permission level (higher = more permissions)
 */
const getPermissionLevel = (position) => {
  const levels = {
    'cashier': 1,
    'inventory': 2,
    'shift_manager': 3,
    'general_manager': 4,
    'admin': 5
  };
  
  return levels[position] || 0;
};

/**
 * Check if user has at least the required permission level
 * @param {string} userPosition - User's position
 * @param {string} requiredPosition - Required minimum position
 * @returns {boolean} - Whether user meets minimum requirement
 */
const hasMinimumPermission = (userPosition, requiredPosition) => {
  return getPermissionLevel(userPosition) >= getPermissionLevel(requiredPosition);
};

/**
 * Get all permissions for a position
 * @param {string} position - User position
 * @returns {object} - Object with all permission flags
 */
const getAllPermissions = (position) => {
  return {
    // Basic access
    hasInventoryAccess: hasInventoryAccess(position),
    
    // Ingredient management
    canManageIngredients: canManageIngredients(position),
    canViewReservations: canViewReservations(position),
    canAccessIngredientAnalytics: canAccessIngredientAnalytics(position),
    canExportAuditTrail: canExportAuditTrail(position),
    
    // Operational permissions
    canOverrideInventory: canOverrideInventory(position),
    canManageFullMenu: canManageFullMenu(position),
    canPermanentDelete: canPermanentDelete(position),
    
    // Administrative permissions
    canModifySystemSettings: canModifySystemSettings(position),
    canAuthorizeAdjustments: canAuthorizeAdjustments(position),
    
    // Permission level
    permissionLevel: getPermissionLevel(position)
  };
};

/**
 * Validate that user has required permissions for specific actions
 * @param {string} position - User position
 * @param {string[]} requiredPermissions - Array of required permission names
 * @returns {object} - Validation result with success flag and missing permissions
 */
const validatePermissions = (position, requiredPermissions) => {
  const userPermissions = getAllPermissions(position);
  const missing = [];
  
  for (const permission of requiredPermissions) {
    if (!userPermissions[permission]) {
      missing.push(permission);
    }
  }
  
  return {
    success: missing.length === 0,
    missing,
    userPermissions: userPermissions.permissionLevel
  };
};

module.exports = {
  // Basic access checks
  hasInventoryAccess,
  
  // Specific permission checks
  canManageIngredients,
  canOverrideInventory,
  canViewReservations,
  canAccessIngredientAnalytics,
  canExportAuditTrail,
  canManageFullMenu,
  canPermanentDelete,
  canModifySystemSettings,
  canAuthorizeAdjustments,
  
  // Utility functions
  getPermissionLevel,
  hasMinimumPermission,
  getAllPermissions,
  validatePermissions
};