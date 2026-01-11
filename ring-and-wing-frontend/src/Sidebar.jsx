// Default colors
const defaultColors = {
  primary: '#2e0304',
  accent: '#f1670f',
  muted: '#ac9c9b',
  background: '#fefdfd',
  activeBg: '#f1670f20',
  iconBrown: '#853619' // Added brown color for dropdown icons
};

import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { 
  FiMenu, 
  FiX,
  FiGrid,
  FiShoppingBag,
  FiBox,
  FiUsers,
  FiMessageSquare,
  FiBookOpen,
  FiCreditCard,
  FiTrendingDown,
  FiShoppingCart,
  FiChevronDown,
  FiChevronUp,
  FiUser,
  FiTablet,
  FiClock,
  FiCalendar,
  FiLogOut,
  FiShield,
  FiSettings,
  FiDatabase,
  FiPieChart,
  FiSmartphone,
  FiCheckCircle,
  FiFileText,
  FiDollarSign,
  FiClipboard,
  FiBarChart2,
  FiUserCheck,
  FiBriefcase,
  FiPercent,
  FiLayers
} from 'react-icons/fi';
import { motion, AnimatePresence } from 'framer-motion';

const Sidebar = ({ colors = defaultColors, onTimeClockClick, onSidebarToggle }) => {
  const location = useLocation();
  const navigate = useNavigate();
  const [isOpen, setIsOpen] = useState(false);
  const [windowWidth, setWindowWidth] = useState(window.innerWidth);
  const [openDropdown, setOpenDropdown] = useState(null);
  const [userData, setUserData] = useState(null);
  const [dropdownPosition, setDropdownPosition] = useState({ top: 0, left: 0 });
  const [hoveredItem, setHoveredItem] = useState(null);
  const [tooltipPosition, setTooltipPosition] = useState({ top: 0, left: 0 });
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);
  const dropdownRefs = useRef({});
  useEffect(() => {
    const handleResize = () => {
      const newWidth = window.innerWidth;
      setWindowWidth(newWidth);
      if (newWidth >= 768) {
        setIsOpen(true);
      } else {
        setIsOpen(false);
      }
    };

    window.addEventListener('resize', handleResize);
    handleResize();
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Tablet detection: 768px - 1279px (covers iPad Mini, iPad, iPad Pro)
  const isTablet = windowWidth >= 768 && windowWidth < 1280;
  // Notify parent component when sidebar state changes
  useEffect(() => {
    if (onSidebarToggle) {
      onSidebarToggle(isOpen, windowWidth < 768);
    }
  }, [isOpen, windowWidth, onSidebarToggle]);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (openDropdown && !event.target.closest('[data-dropdown]') && !event.target.closest('.fixed')) {
        setOpenDropdown(null);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [openDropdown]);

  useEffect(() => {
    const storedData = localStorage.getItem('userData');
    if (storedData) {
      setUserData(JSON.parse(storedData));
    }
  }, []);

  useEffect(() => {
    if (openDropdown && !location.pathname.startsWith(openDropdown)) {
      setOpenDropdown(null);
    }
  }, [location.pathname]);

  const handleLogout = () => {
    setShowLogoutConfirm(true);
  };
  
  const confirmLogout = () => {
    localStorage.removeItem('authToken');
    localStorage.removeItem('userData');
    localStorage.removeItem('token');
    localStorage.removeItem('userPosition');
    localStorage.removeItem('userRole');
    setShowLogoutConfirm(false);
    navigate('/login');
  };
  
  const cancelLogout = () => {
    setShowLogoutConfirm(false);
  };

  const handleDropdownToggle = (itemPath, event) => {
    // Hide tooltip when dropdown is clicked
    setHoveredItem(null);
    
    if (openDropdown === itemPath) {
      setOpenDropdown(null);
    } else {
      const rect = event.currentTarget.getBoundingClientRect();
      setDropdownPosition({
        top: rect.top,
        left: isMobile ? rect.right : rect.right + 8
      });
      setOpenDropdown(itemPath);
    }
  };

  const handleTooltipShow = (itemLabel, event) => {
    // Only show tooltips on desktop (not mobile or tablet) since those have visible labels
    if (!isMobile && !isTablet) {
      const rect = event.currentTarget.getBoundingClientRect();
      setTooltipPosition({
        top: rect.top + (rect.height / 2),
        left: rect.right + 16
      });
      setHoveredItem(itemLabel);
    }
  };

  const handleTooltipHide = () => {
    setHoveredItem(null);
  };

  // More precise active matching to avoid highlighting multiple items
  const isActive = (path) => {
    const currentPath = location.pathname;
    
    // Exact match
    if (currentPath === path) return true;
    
    // For paths with sub-routes, only match if:
    // 1. Current path starts with the item path
    // 2. AND the character after the path is '/' or nothing
    // This prevents /payroll from matching /payroll-reports
    if (currentPath.startsWith(path)) {
      const nextChar = currentPath.charAt(path.length);
      return nextChar === '' || nextChar === '/';
    }
    
    return false;
  };
  
  // Check if any subitems are active (for dropdown parent highlighting)
  const isParentActive = (subItems) => 
    subItems.some(subItem => isActive(subItem.path));
    
  const isLargeScreen = windowWidth >= 1920;
  const isMobile = windowWidth < 768;
  
  // Tablet-specific dimensions for better touch targets and readability
  // Tablets get a wider sidebar with visible labels
  const sidebarWidth = isLargeScreen ? '9rem' : isTablet ? '14rem' : '6rem';
  const iconSize = isLargeScreen ? 28 : isTablet ? 24 : 22;
  const chevronSize = isLargeScreen ? 18 : isTablet ? 14 : 14;
  const logoSize = isLargeScreen ? '2rem' : isTablet ? '1.75rem' : '1.625rem';
  const tooltipTextSize = isLargeScreen ? '0.9375rem' : isTablet ? '0.875rem' : '0.8125rem';
  const dropdownWidth = isLargeScreen ? '15rem' : isTablet ? '14rem' : '13rem';
  
  // Show labels on tablet (similar to mobile behavior but in fixed sidebar)
  const showLabels = isMobile || isTablet;
  
  const userRole = userData?.role || 'staff';
  const userPosition = userData?.position || 'cashier';
  
  // Define navigation items with position-based access
  // GROUPED: Sales & Orders → Inventory → Staff & HR → Finance → Settings
  const navigationItems = [
    // ═══════════════════════════════════════════
    // GROUP 1: OVERVIEW
    // ═══════════════════════════════════════════
    { 
      path: '/dashboard', 
      icon: <FiGrid size={iconSize} className="text-white" />, 
      label: 'Dashboard',
      positions: ['shift_manager', 'general_manager', 'admin'],
      group: 'overview'
    },
    
    // ═══════════════════════════════════════════
    // GROUP 2: SALES & ORDERS
    // ═══════════════════════════════════════════
    { 
      path: '/pos', 
      icon: <FiShoppingCart size={iconSize} className="text-white" />, 
      label: 'POS',
      positions: ['cashier', 'shift_manager', 'general_manager', 'admin'],
      group: 'sales'
    },
    { 
      path: '/orders', 
      icon: <FiShoppingBag size={iconSize} className="text-white" />, 
      label: 'Orders',
      positions: ['cashier', 'shift_manager', 'general_manager', 'admin'],
      group: 'sales'
    },
    { 
      path: '/payment-verification', 
      icon: <FiCheckCircle size={iconSize} className="text-white" />, 
      label: 'Payment Verification',
      positions: ['cashier', 'shift_manager', 'general_manager', 'admin'],
      group: 'sales'
    },
    
    // ═══════════════════════════════════════════
    // GROUP 3: INVENTORY & MENU
    // ═══════════════════════════════════════════
    { 
      path: '/inventory-management',
      icon: <FiLayers size={iconSize} className="text-white" />,
      label: 'Inventory & Menu',
      positions: ['inventory', 'shift_manager', 'general_manager', 'admin'],
      group: 'inventory',
      subItems: [
        { 
          path: '/inventory', 
          icon: <FiBox size={iconSize} style={{ color: colors.iconBrown }} />, 
          label: 'Inventory',
          positions: ['inventory', 'shift_manager', 'general_manager', 'admin']
        },
        { 
          path: '/menu', 
          icon: <FiBookOpen size={iconSize} style={{ color: colors.iconBrown }} />, 
          label: 'Menu',
          positions: ['shift_manager', 'general_manager', 'admin']
        },
      ]
    },
    
    // ═══════════════════════════════════════════
    // GROUP 4: STAFF & HR
    // ═══════════════════════════════════════════
    {
      path: '/timeclock', 
      icon: <FiClock size={iconSize} className="text-white" />, 
      label: 'Time Clock',
      positions: ['cashier', 'inventory', 'shift_manager', 'general_manager', 'admin'],
      group: 'hr'
    },
    { 
      path: '/staff',
      icon: <FiUsers size={iconSize} className="text-white" />,
      label: 'Staff Management',
      positions: ['shift_manager', 'general_manager', 'admin'],
      group: 'hr',
      subItems: [
        { 
          path: '/employees', 
          icon: <FiUser size={iconSize} style={{ color: colors.iconBrown }} />, 
          label: 'Employees',
          positions: ['shift_manager', 'general_manager', 'admin']
        },
        { 
          path: '/staff-scheduler', 
          icon: <FiCalendar size={iconSize} style={{ color: colors.iconBrown }} />, 
          label: 'Scheduler',
          positions: ['shift_manager', 'general_manager', 'admin']
        },
        { 
          path: '/customer-management', 
          icon: <FiUserCheck size={iconSize} style={{ color: colors.iconBrown }} />, 
          label: 'Customers',
          positions: ['general_manager', 'admin']
        }
      ]
    },
    
    // ═══════════════════════════════════════════
    // GROUP 5: PAYROLL & FINANCE
    // ═══════════════════════════════════════════
    {
      path: '/my-payslips', 
      icon: <FiFileText size={iconSize} className="text-white" />, 
      label: 'My Payslips',
      positions: ['cashier', 'inventory', 'shift_manager', 'general_manager'],
      group: 'finance'
    },
    {
      path: '/my-expense-requests', 
      icon: <FiClipboard size={iconSize} className="text-white" />, 
      label: 'My Expenses',
      positions: ['cashier', 'inventory'],
      group: 'finance'
    },
    { 
      path: '/finance',
      icon: <FiCreditCard size={iconSize} className="text-white" />,
      label: 'Finance',
      positions: ['shift_manager', 'general_manager', 'admin'],
      group: 'finance',
      subItems: [
        { 
          path: '/payroll', 
          icon: <FiFileText size={iconSize} style={{ color: colors.iconBrown }} />, 
          label: 'Payroll',
          positions: ['shift_manager', 'general_manager', 'admin']
        },
        { 
          path: '/expenses', 
          icon: <FiTrendingDown size={iconSize} style={{ color: colors.iconBrown }} />, 
          label: 'Expenses',
          positions: ['shift_manager', 'general_manager', 'admin']
        },
        { 
          path: '/government-config', 
          icon: <FiPercent size={iconSize} style={{ color: colors.iconBrown }} />, 
          label: 'Government Config',
          positions: ['general_manager', 'admin']
        }
      ]
    },
    
    // ═══════════════════════════════════════════
    // GROUP 6: REPORTS
    // ═══════════════════════════════════════════
    { 
      path: '/reports',
      icon: <FiBarChart2 size={iconSize} className="text-white" />,
      label: 'Reports',
      positions: ['shift_manager', 'general_manager', 'admin'],
      group: 'reports',
      subItems: [
        { 
          path: '/revenue-reports', 
          icon: <FiPieChart size={iconSize} style={{ color: colors.iconBrown }} />, 
          label: 'Revenue Reports',
          positions: ['shift_manager', 'general_manager', 'admin']
        },
        { 
          path: '/payroll-reports', 
          icon: <FiBriefcase size={iconSize} style={{ color: colors.iconBrown }} />, 
          label: 'Payroll Reports',
          positions: ['shift_manager', 'general_manager', 'admin']
        }
      ]
    },
    
    // ═══════════════════════════════════════════
    // GROUP 7: MOBILE & OTHER
    // ═══════════════════════════════════════════
    { 
      path: '/self-checkout', 
      icon: <FiSmartphone size={iconSize} className="text-white" />, 
      label: 'Mobile Services',
      positions: ['cashier', 'inventory', 'shift_manager', 'general_manager', 'admin'],
      group: 'other'
    }
  ];

  // Filter navigation items based on user position
  const allowedNavigationItems = navigationItems.map(item => {
    if (!item.positions.includes(userPosition)) {
      return null;
    }

    if (item.subItems) {
      const filteredSubItems = item.subItems.filter(subItem => 
        !subItem.positions || subItem.positions.includes(userPosition)
      );
      
      if (filteredSubItems.length === 0) {
        return null;
      }
      
      return {...item, subItems: filteredSubItems};
    }
    
    return item;
  }).filter(Boolean); // Remove null items
  
  // Routes where sidebar should be displayed
  const allowedRoutes = [
    '/dashboard', 
    '/orders', 
    '/inventory', 
    '/payroll',
    '/payroll-reports',
    '/government-config',
    '/customer-management',
    '/chatbot', 
    '/menu', 
    '/expenses', 
    '/pos', 
    '/employees',
    '/self-checkout',
    '/timeclock',
    '/sales',
    '/inventory-management',
    '/staff',
    '/revenue-reports',
    '/mobile',
    '/payment-verification',  // Added - was missing!
    '/my-payslips',
    '/my-expense-requests',
    '/staff-scheduler',
    '/finance',
    '/reports'
  ];
  
  const shouldRender = allowedRoutes.some(route => location.pathname.startsWith(route));

  if (!shouldRender) return null;  // Animation variants
  const sidebarVariants = {
    open: {
      width: isMobile ? "16rem" : sidebarWidth,
      x: 0,
      transition: { 
        type: "spring", 
        stiffness: 300, 
        damping: 30 
      }
    },
    closed: {
      width: isMobile ? "0" : sidebarWidth,
      x: isMobile ? "-16rem" : 0,
      transition: {
        type: "spring",
        stiffness: 300,
        damping: 30,
        when: "afterChildren"
      }
    }
  };
  
  const itemVariants = {
    open: {
      opacity: 1,
      x: 0,
      transition: {
        type: "spring",
        stiffness: 300,
        damping: 24
      }
    },
    closed: { 
      opacity: 0,
      x: -20,
      transition: {
        duration: 0.2
      }
    }
  };
  
  const mobileNavVariants = {
    hidden: {
      opacity: 0,
      y: -20,
    },
    visible: {
      opacity: 1,
      y: 0,
      transition: {
        delay: 0.2,
        type: "spring",
        stiffness: 300,
        damping: 24
      }
    },
    exit: {
      opacity: 0,
      y: -20,
      transition: {
        duration: 0.2
      }
    }
  };

  const navItemVariants = {
    hidden: { opacity: 0, x: -20 },
    visible: i => ({
      opacity: 1,
      x: 0,
      transition: {
        delay: i * 0.03,
        type: "spring",
        stiffness: 300,
        damping: 24
      }
    }),
    hover: {
      scale: 1.05,
      x: 10,
      transition: { 
        type: "spring", 
        stiffness: 400, 
        damping: 10 
      }
    },
    tap: { 
      scale: 0.95 
    }
  };

  return (
    <>      {/* Mobile Menu Button */}
      <button
        className="md:hidden fixed top-4 left-4 z-[9999] p-2 rounded-lg shadow-lg"
        onClick={() => setIsOpen(!isOpen)}
        style={{ 
          backgroundColor: colors.accent, 
          color: colors.background 
        }}
        aria-label="Toggle menu"
      >
        {isOpen ? <FiX size={24} /> : <FiMenu size={24} />}
      </button>      {/* Sidebar Container */}
      <motion.div
        className={`fixed inset-y-0 left-0 z-[9998] flex flex-col
          ${isMobile ? '' : 'md:translate-x-0'}`}
        style={{ 
          backgroundColor: colors.primary,
          borderRight: `1px solid ${colors.muted}`
        }}
        animate={isOpen ? "open" : "closed"}
        variants={sidebarVariants}
        initial={isMobile ? "closed" : "open"}
      >
        {/* Brand/Logo Section */}
        <div 
          className="flex flex-col items-center justify-center py-6 border-b transition-all duration-300"
          style={{ borderColor: colors.muted }}
        >
          <motion.div 
            className="font-bold text-white mb-2 tracking-wider"
            style={{ fontSize: logoSize }}
            whileHover={{ scale: 1.05 }}
            transition={{ type: "spring", stiffness: 400, damping: 10 }}
          >
            RW
          </motion.div>
          {/* Role indicator with subtle badge style */}
          <div className="flex items-center px-2.5 py-1 rounded-full" style={{ backgroundColor: 'rgba(241, 103, 15, 0.15)' }}>
            <FiShield size={11} className="text-white opacity-90 mr-1.5" />
            <span className="text-xs text-white opacity-90 capitalize font-medium">{userRole}</span>
          </div>
        </div>
          {/* Navigation Links */}
        <nav
          className={`flex-1 overflow-x-hidden flex flex-col gap-y-1 py-3 px-2 ${
            isTablet ? 'overflow-y-hidden' : 'overflow-y-auto'
          }`}
        >
          {allowedNavigationItems.map((item, index) => (
            <motion.div 
              key={item.path} 
              className="relative"
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: index * 0.02, type: "spring", stiffness: 300, damping: 25 }}
            >              {item.subItems ? (
                <motion.div
                  className={`group flex ${showLabels ? 'flex-row items-center px-3' : 'flex-col items-center'} p-2.5 rounded-xl cursor-pointer transition-all duration-200 relative`}
                  style={{ 
                    backgroundColor: isParentActive(item.subItems) ? colors.activeBg : 'transparent',
                  }}
                  onClick={(e) => handleDropdownToggle(item.path, e)}
                  onMouseEnter={(e) => handleTooltipShow(item.label, e)}
                  onMouseLeave={handleTooltipHide}
                  data-dropdown={item.path}
                  whileHover={{ scale: 1.03, backgroundColor: isParentActive(item.subItems) ? colors.activeBg : 'rgba(255, 255, 255, 0.05)' }}
                  whileTap={{ scale: 0.97 }}
                >
                  {isParentActive(item.subItems) && (
                    <motion.div
                      className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-8 rounded-r-full"
                      style={{ backgroundColor: colors.accent }}
                      layoutId="activeIndicator"
                      transition={{ type: "spring", stiffness: 400, damping: 30 }}
                    />
                  )}
                  <div className="flex items-center min-w-0 flex-1">
                    <span className="flex-shrink-0">{item.icon}</span>
                    {showLabels && (
                      <span className="ml-2 text-white font-medium text-xs truncate">{item.label}</span>
                    )}
                  </div>
                    <FiChevronDown 
                    size={chevronSize} 
                    className={`flex-shrink-0 ${showLabels ? 'ml-1' : 'mt-1.5'} transition-all duration-300 text-white opacity-80 ${
                      openDropdown === item.path ? 'rotate-180' : ''
                    }`}
                  />
                </motion.div>
              ) : (
                <Link
                  to={item.path}
                  className="block"
                  onClick={() => isMobile && setIsOpen(false)}
                >
                  <motion.div
                    className={`group flex items-center ${showLabels ? 'px-3' : 'justify-center'} p-2.5 rounded-xl relative transition-all duration-200`}
                    style={{ 
                      backgroundColor: isActive(item.path) ? colors.activeBg : 'transparent',
                    }}
                    onMouseEnter={(e) => handleTooltipShow(item.label, e)}
                    onMouseLeave={handleTooltipHide}
                    whileHover={{ scale: 1.02, backgroundColor: isActive(item.path) ? colors.activeBg : 'rgba(255, 255, 255, 0.05)' }}
                    whileTap={{ scale: 0.97 }}
                  >
                    {isActive(item.path) && (
                      <motion.div
                        className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-6 rounded-r-full"
                        style={{ backgroundColor: colors.accent }}
                        layoutId="activeIndicator"
                        transition={{ type: "spring", stiffness: 400, damping: 30 }}
                      />
                    )}
                    <span className="flex-shrink-0">{item.icon}</span>
                    {showLabels && (
                      <span className="ml-2 text-white font-medium text-xs truncate">{item.label}</span>
                    )}
                  </motion.div>
                </Link>
              )}
            </motion.div>
          ))}
        </nav>

        {/* Bottom Section - Logout button */}
        <div className={`sticky bottom-0 bg-inherit flex ${showLabels ? 'flex-row px-3' : 'flex-col'} items-center gap-2 py-4 px-2 border-t mt-auto`} style={{ borderColor: colors.muted }}>
          <motion.button
            onClick={handleLogout}
            className={`rounded-xl flex items-center justify-center ${showLabels ? 'p-2.5 flex-1' : 'p-2.5'} transition-all duration-200`}
            style={{ backgroundColor: 'rgba(255, 255, 255, 0.1)' }}
            onMouseEnter={(e) => handleTooltipShow('Log Out', e)}
            onMouseLeave={handleTooltipHide}
            whileHover={{ scale: 1.02, backgroundColor: 'rgba(241, 103, 15, 0.2)' }}
            whileTap={{ scale: 0.97 }}
          >
            <FiLogOut size={iconSize} className="text-white flex-shrink-0" />
            {showLabels && (
              <span className="ml-2 text-white font-medium text-xs">Logout</span>
            )}
          </motion.button>
        </div>
      </motion.div>      {/* Mobile Overlay */}
      {isMobile && isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 0.5 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 modal-overlay z-[9990]"
          onClick={() => setIsOpen(false)}
        />
      )}

      {/* Tooltip Portal - Renders outside sidebar to avoid clipping (only on desktop, not tablet) */}
      {hoveredItem && !isMobile && !isTablet && createPortal(
        <motion.div 
          className="fixed bg-white rounded-lg shadow-2xl border border-gray-100 px-4 py-2.5 font-semibold text-gray-900 z-[10000] pointer-events-none whitespace-nowrap"
          style={{ 
            top: tooltipPosition.top - 12, // Center vertically
            left: tooltipPosition.left,
            fontSize: tooltipTextSize,
            transform: 'translateY(-50%)'
          }}
          initial={{ opacity: 0, x: -5 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -5 }}
          transition={{ duration: 0.15 }}
        >
          <div className="absolute right-full top-1/2 -translate-y-1/2 w-2.5 h-2.5 bg-white border-l border-t border-gray-100 rotate-45 transform" />
          {hoveredItem}
        </motion.div>,
        document.body
      )}

      {/* Dropdown Portal - Renders outside sidebar to avoid clipping */}
      {openDropdown && createPortal(
        <motion.div 
          className="fixed bg-white rounded-xl shadow-2xl py-2 border border-gray-100 z-[9999] overflow-hidden"
          style={{ 
            top: dropdownPosition.top,
            left: dropdownPosition.left,
            width: dropdownWidth,
            minWidth: dropdownWidth
          }}
          initial={{ opacity: 0, scale: 0.95, y: -10 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: -10 }}
          transition={{ duration: 0.15, ease: "easeOut" }}
        >
          {allowedNavigationItems
            .find(item => item.path === openDropdown)
            ?.subItems?.map((subItem, idx) => (
              <motion.div 
                key={subItem.path || subItem.label}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: idx * 0.03, duration: 0.15 }}
              >
                {subItem.onClick ? (
                  <button
                    onClick={subItem.onClick}
                    className="flex items-center px-4 py-3 hover:bg-gray-50 text-gray-900 w-full text-left transition-colors duration-150 group"
                  >
                    <span className="group-hover:scale-110 transition-transform duration-150">{subItem.icon}</span>
                    <span className="ml-3 text-sm font-medium">{subItem.label}</span>
                  </button>
                ) : (
                  <Link
                    to={subItem.path}
                    className="flex items-center px-4 py-3 hover:bg-gray-50 text-gray-900 transition-colors duration-150 group"
                    onClick={() => {
                      isMobile && setIsOpen(false);
                      setOpenDropdown(null);
                    }}
                  >
                    <span className="group-hover:scale-110 transition-transform duration-150">{subItem.icon}</span>
                    <span className="ml-3 text-sm font-medium">{subItem.label}</span>
                  </Link>
                )}
              </motion.div>
            ))}
        </motion.div>,
        document.body
      )}

      {/* Logout Confirmation Modal */}
      {showLogoutConfirm && createPortal(
        <motion.div 
          className="fixed inset-0 modal-overlay flex items-center justify-center z-[10000]"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
        >
          <motion.div 
            className="bg-white rounded-2xl shadow-2xl p-8 max-w-md w-full mx-4"
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.9, opacity: 0 }}
            transition={{ type: "spring", stiffness: 300, damping: 25 }}
          >
            <div className="mb-6">
              <div className="flex items-center mb-3">
                <div className="p-2.5 rounded-full mr-3" style={{ backgroundColor: 'rgba(241, 103, 15, 0.1)' }}>
                  <FiLogOut size={24} style={{ color: colors.accent }} />
                </div>
                <h3 className="text-2xl font-bold text-gray-900">Confirm Logout</h3>
              </div>
              <p className="text-gray-600 leading-relaxed">
                Are you sure you want to logout? This will close all your open tabs.
              </p>
            </div>
            
            <div className="flex gap-3 justify-end">
              <motion.button
                onClick={cancelLogout}
                className="px-6 py-2.5 bg-gray-100 text-gray-800 rounded-xl hover:bg-gray-200 transition-colors font-medium"
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
              >
                Cancel
              </motion.button>
              <motion.button
                onClick={confirmLogout}
                style={{ backgroundColor: colors.accent }}
                className="px-6 py-2.5 text-white rounded-xl hover:opacity-90 transition-opacity font-medium shadow-lg"
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
              >
                Logout
              </motion.button>
            </div>
          </motion.div>
        </motion.div>,
        document.body
      )}
    </>
  );
};

export default Sidebar;