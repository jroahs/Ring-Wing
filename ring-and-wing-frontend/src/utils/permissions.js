// Position-based permission utilities

/**
 * Check if a user position has inventory access
 * @param {string} position - User position ('cashier', 'inventory', 'shift_manager', 'general_manager', 'admin')
 * @returns {boolean} - Whether the position has inventory access
 */
export const hasInventoryAccess = (position) => {
  return ['inventory', 'shift_manager', 'general_manager', 'admin'].includes(position);
};

/**
 * Get user data from localStorage
 * @returns {object|null} - User data object or null if not found
 */
export const getCurrentUser = () => {
  try {
    const userData = localStorage.getItem('userData');
    return userData ? JSON.parse(userData) : null;
  } catch (error) {
    console.error('Error parsing user data:', error);
    return null;
  }
};

/**
 * Check if current user has inventory access
 * @returns {boolean} - Whether current user can access inventory
 */
export const currentUserHasInventoryAccess = () => {
  const user = getCurrentUser();
  return user ? hasInventoryAccess(user.position) : false;
};

/**
 * Get navigation items based on user position
 * @param {string} position - User position
 * @returns {Array} - Array of navigation items
 */
export const getNavigationItems = (position) => {  const baseItems = [
    { 
      path: '/dashboard', 
      label: 'Dashboard',
      icon: 'grid',
      positions: ['shift_manager', 'general_manager', 'admin']
    }
  ];

  // POS access for cashiers and managers
  if (['cashier', 'shift_manager', 'general_manager', 'admin'].includes(position)) {
    baseItems.push({
      path: '/orders',
      label: 'Orders',
      icon: 'shopping-bag',
      positions: ['cashier', 'shift_manager', 'general_manager', 'admin']
    });
  }

  // Inventory access only for inventory staff and managers
  if (hasInventoryAccess(position)) {
    baseItems.push({
      path: '/inventory',
      label: 'Inventory',
      icon: 'box',
      positions: ['inventory', 'shift_manager', 'general_manager', 'admin'],
      primary: position === 'inventory' // Mark as primary for inventory staff
    });
  }
  // Menu management for managers and admin
  if (['shift_manager', 'general_manager', 'admin'].includes(position)) {
    baseItems.push({
      path: '/menu',
      label: 'Menu Management',
      icon: 'book-open',
      positions: ['shift_manager', 'general_manager', 'admin']
    });
  }

  // Staff management for managers and admin
  if (['shift_manager', 'general_manager', 'admin'].includes(position)) {
    baseItems.push({
      path: '/staff',
      label: 'Staff Management',
      icon: 'users',
      positions: ['shift_manager', 'general_manager', 'admin']
    });
  }

  // AI Assistant for all positions
  baseItems.push({
    path: '/ai-assistant',
    label: 'AI Assistant',
    icon: 'message-circle',
    positions: ['cashier', 'inventory', 'shift_manager', 'general_manager', 'admin']
  });

  // Filter items based on current position
  return baseItems.filter(item => 
    item.positions.includes(position)
  );
};

/**
 * Position-based permission definitions
 */
export const POSITION_PERMISSIONS = {
  cashier: {
    inventory: { view: false, add: false, edit: false, delete: false, reports: false },
    pos: { access: true, refunds: false, discounts: false, void_transactions: false },
    menu: { view: true, edit: false, pricing: false },
    staff: { view: false, manage: false },
    reports: { own_performance: true, all_data: false }
  },
  
  inventory: {
    inventory: { view: true, add: true, edit: true, delete: false, reports: true },
    pos: { access: false, refunds: false, discounts: false, void_transactions: false },
    menu: { view: true, edit: true, pricing: false },
    staff: { view: false, manage: false },
    reports: { own_performance: true, inventory_reports: true, all_data: false }
  },
  
  shift_manager: {
    inventory: { view: true, add: true, edit: true, delete: true, reports: true },
    pos: { access: true, refunds: true, discounts: true, void_transactions: false },
    menu: { view: true, edit: true, pricing: false },
    staff: { view: true, manage: false },
    reports: { own_performance: true, inventory_reports: true, staff_reports: true, all_data: false }
  },
  
  general_manager: {
    inventory: { view: true, add: true, edit: true, delete: true, reports: true },
    pos: { access: true, refunds: true, discounts: true, void_transactions: true },
    menu: { view: true, edit: true, pricing: true },
    staff: { view: true, manage: true },
    reports: { own_performance: true, inventory_reports: true, staff_reports: true, all_data: true }
  },
    admin: {
    inventory: { view: true, add: true, edit: true, delete: true, reports: true },
    pos: { access: true, refunds: true, discounts: true, void_transactions: true },
    menu: { view: true, edit: true, pricing: true },
    staff: { view: true, manage: true },
    reports: { own_performance: true, inventory_reports: true, staff_reports: true, all_data: true },
    system: { settings: true, backups: true, logs: true, maintenance: true }
  }
};

/**
 * Check if user has specific permission
 * @param {string} position - User position
 * @param {string} module - Module name (inventory, pos, menu, staff)
 * @param {string} action - Action name (view, add, edit, delete, etc.)
 * @returns {boolean} - Whether user has the permission
 */
export const hasPermission = (position, module, action) => {
  const permissions = POSITION_PERMISSIONS[position];
  return permissions?.[module]?.[action] || false;
};

/**
 * Get user's default landing page based on position
 * @param {string} position - User position
 * @returns {string} - Route path
 */
export const getDefaultRoute = (position) => {
  switch (position) {
    case 'inventory':
      return '/inventory';
    case 'shift_manager':
    case 'general_manager':
    case 'admin':
      return '/dashboard';
    case 'cashier':
    default:
      return '/orders';
  }
};
