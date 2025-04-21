import { Link, useLocation } from 'react-router-dom';
import { useState, useEffect } from 'react';
import { 
  FiMenu, 
  FiX,
  FiGrid,
  FiShoppingBag,
  FiBox,
  FiUsers,
  FiMessageSquare,
  FiBookOpen,
  FiDollarSign,
  FiShoppingCart,
  FiChevronDown,
  FiChevronUp,
  FiUser,
  FiTablet
} from 'react-icons/fi';

const Sidebar = ({ colors }) => {
  const location = useLocation();
  const [isOpen, setIsOpen] = useState(false);
  const [windowWidth, setWindowWidth] = useState(window.innerWidth);
  const [openDropdown, setOpenDropdown] = useState(null);

  // Dynamic sizing based on window width
  const isLargeScreen = windowWidth >= 1920;
  const sidebarWidth = isLargeScreen ? '8rem' : '5rem';
  const iconSize = isLargeScreen ? 32 : 24;
  const chevronSize = isLargeScreen ? 20 : 16;
  const logoSize = isLargeScreen ? '1.875rem' : '1.5rem';
  const tooltipTextSize = isLargeScreen ? '1rem' : '0.875rem';
  const dropdownWidth = isLargeScreen ? '14rem' : '12rem';

  const allowedRoutes = [
    '/dashboard', 
    '/orders', 
    '/inventory', 
    '/payroll', 
    '/chatbot', 
    '/menu', 
    '/expenses', 
    '/pos', 
    '/employees',
    '/self-checkout'
  ];
  
  const shouldRender = allowedRoutes.some(route => location.pathname.startsWith(route));

  useEffect(() => {
    const handleResize = () => {
      const newWidth = window.innerWidth;
      setWindowWidth(newWidth);
      if (newWidth >= 768) setIsOpen(true);
    };

    window.addEventListener('resize', handleResize);
    handleResize();
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  useEffect(() => {
    if (openDropdown && !location.pathname.startsWith(openDropdown)) {
      setOpenDropdown(null);
    }
  }, [location.pathname]);

  const isActive = (path) => location.pathname.startsWith(path);
  const isParentActive = (subItems) => 
    subItems.some(subItem => isActive(subItem.path));

  if (!shouldRender) return null;

  const staffSubItems = [
    { path: '/employees', icon: <FiUser size={iconSize} className="text-white" />, label: 'Employee Management' },
    { path: '/payroll', icon: <FiDollarSign size={iconSize} className="text-white" />, label: 'Payroll System' }
  ];

  return (
    <>
      {/* Mobile Menu Button */}
      <button
        className="md:hidden fixed top-4 left-4 z-50 p-2 rounded-lg shadow-lg"
        onClick={() => setIsOpen(!isOpen)}
        style={{ 
          backgroundColor: colors.accent, 
          color: colors.background 
        }}
        aria-label="Toggle menu"
      >
        {isOpen ? <FiX size={24} /> : <FiMenu size={24} />}
      </button>

      {/* Sidebar Container */}
      <div
        className={`fixed inset-y-0 left-0 transform transition-all duration-300 ease-in-out z-40
          ${isOpen ? 'translate-x-0' : '-translate-x-full'} 
          md:translate-x-0`}
        style={{ 
          backgroundColor: colors.primary,
          width: sidebarWidth,
          borderRight: `1px solid ${colors.muted}`
        }}
      >
        {/* Brand/Logo Section */}
        <div 
          className="flex items-center justify-center h-16 border-b"
          style={{ borderColor: colors.muted }}
        >
          <div className="font-bold text-white" style={{ fontSize: logoSize }}>RW</div>
        </div>
        
        {/* Navigation Links */}
        <nav className="flex flex-1 flex-col gap-y-4 pt-10 px-2">
          {[
            { path: '/dashboard', icon: <FiGrid size={iconSize} className="text-white" />, label: 'Dashboard' },
            { path: '/orders', icon: <FiShoppingBag size={iconSize} className="text-white" />, label: 'Orders' },
            { path: '/inventory', icon: <FiBox size={iconSize} className="text-white" />, label: 'Inventory' },
            { path: '/menu', icon: <FiBookOpen size={iconSize} className="text-white" />, label: 'Menu' },
            { 
              path: '/staff',
              icon: <FiUsers size={iconSize} className="text-white" />,
              label: 'Staff',
              subItems: staffSubItems
            },
            { path: '/pos', icon: <FiShoppingCart size={iconSize} className="text-white" />, label: 'POS' },
            { 
              path: '/self-checkout', 
              icon: <FiTablet size={iconSize} className="text-white" />, 
              label: 'Self Checkout' 
            },
            { path: '/expenses', icon: <FiDollarSign size={iconSize} className="text-white" />, label: 'Expenses' },
            { path: '/chatbot', icon: <FiMessageSquare size={iconSize} className="text-white" />, label: 'AI Assistant' }
          ].map((item) => (
            <div key={item.path} className="relative">
              {item.subItems ? (
                <div
                  className="group flex flex-col items-center p-2 rounded-xl cursor-pointer"
                  style={{ 
                    backgroundColor: isParentActive(item.subItems) ? colors.activeBg : 'transparent',
                  }}
                  onClick={() => setOpenDropdown(openDropdown === item.path ? null : item.path)}
                >
                  <div className="flex items-center">
                    {item.icon}
                    <div className="absolute left-full ml-4 hidden group-hover:flex items-center">
                      <div 
                        className="relative whitespace-nowrap rounded-md bg-white px-4 py-2 font-semibold text-gray-900 drop-shadow-lg border border-gray-200"
                        style={{ fontSize: tooltipTextSize }}
                      >
                        <div className="absolute right-full top-1/2 -translate-y-1/2 w-2 h-2 bg-white border-l border-t border-gray-200 rotate-45" />
                        {item.label}
                      </div>
                    </div>
                  </div>
                  
                  <FiChevronDown 
                    size={chevronSize} 
                    className={`mt-1 transition-transform text-white ${
                      openDropdown === item.path ? 'rotate-180' : ''
                    }`}
                  />

                  {openDropdown === item.path && (
                    <div 
                      className="absolute left-full top-0 ml-2 bg-white rounded-lg shadow-lg py-2 border border-gray-200"
                      style={{ width: dropdownWidth }}
                    >
                      {item.subItems.map(subItem => (
                        <Link
                          key={subItem.path}
                          to={subItem.path}
                          className="flex items-center px-4 py-2 hover:bg-gray-100 text-gray-900"
                          onClick={() => windowWidth < 768 && setIsOpen(false)}
                        >
                          {subItem.icon}
                          <span className="ml-2 text-sm">{subItem.label}</span>
                        </Link>
                      ))}
                    </div>
                  )}
                </div>
              ) : (
                <Link
                  to={item.path}
                  className="group flex items-center justify-center p-2 rounded-xl relative"
                  style={{ 
                    backgroundColor: isActive(item.path) ? colors.activeBg : 'transparent',
                  }}
                  onClick={() => windowWidth < 768 && setIsOpen(false)}
                >
                  {item.icon}
                  <div className="absolute left-full ml-4 hidden group-hover:flex items-center">
                    <div 
                      className="relative whitespace-nowrap rounded-md bg-white px-4 py-2 font-semibold text-gray-900 drop-shadow-lg border border-gray-200"
                      style={{ fontSize: tooltipTextSize }}
                    >
                      <div className="absolute right-full top-1/2 -translate-y-1/2 w-2 h-2 bg-white border-l border-t border-gray-200 rotate-45" />
                      {item.label}
                    </div>
                  </div>
                </Link>
              )}
            </div>
          ))}
        </nav>

        {/* Bottom Section */}
        <div className="flex flex-col items-center gap-y-4 py-10 px-2">
          <div className="w-full border-t" style={{ borderColor: colors.muted }} />
          <button className="rounded-full bg-gray-100">
          </button>
        </div>
      </div>

      {/* Mobile Overlay */}
      {isOpen && windowWidth < 768 && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-50 z-30 md:hidden"
          onClick={() => setIsOpen(false)}
        />
      )}
    </>
  );
};

// Correct placement of defaultProps outside the component
Sidebar.defaultProps = {
  colors: {
    primary: '#2e0304',
    accent: '#f1670f',
    muted: '#ac9c9b30',
    background: '#fefdfd',
    activeBg: '#f1670f20'
  }
};

export default Sidebar;