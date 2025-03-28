// src/components/Sidebar.jsx
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
  FiBookOpen // Added Menu Management icon
} from 'react-icons/fi';

const Sidebar = ({ colors }) => {
  const location = useLocation();

  // Updated allowed routes to include menu management
  const allowedRoutes = ['/dashboard', '/orders', '/inventory', '/staff', '/chatbot', '/menu'];
  const shouldRender = allowedRoutes.some(route => location.pathname.startsWith(route));
  if (!shouldRender) return null;

  const [isOpen, setIsOpen] = useState(false);
  const [windowWidth, setWindowWidth] = useState(window.innerWidth);

  useEffect(() => {
    const handleResize = () => {
      setWindowWidth(window.innerWidth);
      if (window.innerWidth >= 768) {
        setIsOpen(true);
      }
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const isActive = (path) => location.pathname === path;

  // Close sidebar when clicking outside on mobile
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (windowWidth < 768 && isOpen) {
        const sidebar = document.querySelector('.sidebar-container');
        const menuButton = document.querySelector('.mobile-menu-button');
        
        if (sidebar && !sidebar.contains(event.target) && 
            menuButton && !menuButton.contains(event.target)) {
          setIsOpen(false);
        }
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen, windowWidth]);

  return (
    <>
      {/* Mobile Menu Button - Only shows on small screens */}
      <button
        className="mobile-menu-button md:hidden fixed top-4 left-4 z-50 p-2 rounded-lg shadow-lg"
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
        className={`sidebar-container fixed inset-y-0 left-0 w-64 border-r transform transition-transform duration-300 ease-in-out z-40
          ${isOpen ? 'translate-x-0' : '-translate-x-full'} md:translate-x-0`}
        style={{ 
          backgroundColor: colors.primary, 
          borderColor: colors.muted 
        }}
      >
        {/* Brand/Logo Section */}
        <div 
          className="flex items-center justify-center h-16 border-b" 
          style={{ borderColor: colors.muted }}
        >
          <h1 
            className="text-2xl font-semibold" 
            style={{ color: colors.background }}
          >
            Ring & Wing
          </h1>
        </div>
        
        {/* Navigation Links */}
        <nav className="mt-5 overflow-y-auto h-[calc(100vh-4rem)]">
          {[
            { path: '/dashboard', icon: <FiGrid size={20} />, label: 'Dashboard' },
            { path: '/orders', icon: <FiShoppingBag size={20} />, label: 'Orders' },
            { path: '/inventory', icon: <FiBox size={20} />, label: 'Inventory' },
            // Added Menu Management link
            { path: '/menu', icon: <FiBookOpen size={20} />, label: 'Menu Management' },
            { path: '/staff', icon: <FiUsers size={20} />, label: 'Staff' },
            { path: '/chatbot', icon: <FiMessageSquare size={20} />, label: 'AI Assistant' }
          ].map((item) => (
            <Link 
              key={item.path}
              to={item.path} 
              className="nav-link flex items-center px-4 py-3 transition-colors duration-200"
              style={{ 
                color: colors.background,
                backgroundColor: isActive(item.path) ? colors.activeBg : 'transparent',
                borderLeft: isActive(item.path) ? `3px solid ${colors.activeBorder}` : 'none'
              }}
              onClick={() => windowWidth < 768 && setIsOpen(false)}
            >
              {item.icon}
              <span className="ml-3">{item.label}</span>
            </Link>
          ))}
        </nav>
      </div>

      {/* Overlay for mobile - Only shows when sidebar is open on mobile */}
      {isOpen && windowWidth < 768 && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-50 z-30 md:hidden"
          onClick={() => setIsOpen(false)}
        />
      )}

      <style jsx>{`
        .nav-link {
          transition: all 0.2s ease;
          margin-left: 4px;
          border-radius: 4px 0 0 4px;
        }
        
        .nav-link:hover {
          background-color: ${colors.hoverBg} !important;
        }
        
        .nav-link[style*="background-color: rgba(241, 103, 15, 0.125)"] {
          background-color: ${colors.activeBg} !important;
          border-left-color: ${colors.activeBorder} !important;
        }
      `}</style>
    </>
  );
};

export default Sidebar;