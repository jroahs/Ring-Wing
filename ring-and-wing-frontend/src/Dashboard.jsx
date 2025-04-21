import { LineChart, Line, XAxis, YAxis, Tooltip, Legend, BarChart, Bar, CartesianGrid } from 'recharts';
import { Link, useLocation } from 'react-router-dom';
import { useState, useEffect } from 'react';
import { ResponsiveContainer } from 'recharts';

function Dashboard() {
  const [windowWidth, setWindowWidth] = useState(window.innerWidth);
  const location = useLocation();
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);

  // Responsive layout calculations
  const isLargeScreen = windowWidth >= 1920;
  const isMediumScreen = windowWidth >= 768;
  const pageMargin = isLargeScreen ? '8rem' : isMediumScreen ? '5rem' : '0';

  useEffect(() => {
    const handleResize = () => setWindowWidth(window.innerWidth);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Sample data
  const dailyOrdersData = [
    { day: 'Mon', orders: 45 }, { day: 'Tue', orders: 52 }, { day: 'Wed', orders: 48 },
    { day: 'Thu', orders: 60 }, { day: 'Fri', orders: 75 }, { day: 'Sat', orders: 85 },
    { day: 'Sun', orders: 65 },
  ];

  const inventoryData = [
    { item: 'Coffee Beans', stock: 45 }, { item: 'Chicken Wings', stock: 32 },
    { item: 'Beverages', stock: 68 }, { item: 'Paper Goods', stock: 24 },
  ];

  // Color scheme
  const colors = {
    primary: '#2e0304',
    background: '#fefdfd',
    accent: '#f1670f',
    secondary: '#853619',
    muted: '#ac9c9b',
    activeBg: '#f1670f20',
    activeBorder: '#f1670f',
    hoverBg: '#f1670f10'
  };

  return (
    <div className="flex min-h-screen" style={{ backgroundColor: colors.background }}>
      {/* Main Content */}
      <div 
        className="flex-1 flex flex-col"
        style={{ 
          marginLeft: pageMargin,
          transition: 'margin 0.3s ease-in-out'
        }}
      >
        {/* Navbar */}
        <header className="flex items-center justify-between h-16 px-4 sm:px-6 border-b" 
                style={{ backgroundColor: colors.background, borderColor: colors.muted }}>
          <div className="flex items-center">
            <input
              type="text"
              placeholder="Search orders, inventory..."
              className="search-input px-4 py-2 rounded-md outline-none transition-all"
              style={{
                backgroundColor: colors.background,
                border: `1px solid ${colors.muted}`,
                color: colors.primary,
                width: isLargeScreen ? '400px' : '300px',
                fontSize: isLargeScreen ? '1rem' : '0.875rem'
              }}
            />
          </div>

          {/* Profile Dropdown */}
          <div className="flex items-center ms-3 relative">
            <button
              onClick={() => setIsDropdownOpen(!isDropdownOpen)}
              className="flex text-sm rounded-full"
              style={{ backgroundColor: colors.primary }}
            >
              <img
                className="w-8 h-8 rounded-full"
                src="/staff-avatar.png"
                alt="staff photo"
              />
            </button>

            {isDropdownOpen && (
              <div className="absolute top-full right-0 mt-2 w-48 rounded-lg shadow-lg z-50"
                   style={{ 
                     backgroundColor: colors.background,
                     border: `1px solid ${colors.muted}`
                   }}>
                <div className="px-4 py-3 border-b" style={{ borderColor: colors.muted }}>
                  <p className="text-sm" style={{ color: colors.primary }}>Staff Account</p>
                  <p className="text-sm font-medium truncate" style={{ color: colors.secondary }}>
                    staff@ringwing.com
                  </p>
                </div>
                <ul className="py-2">
                  {['Shift Details', 'Settings', 'Log Out'].map((item, index) => (
                    <li key={index}>
                      <Link
                        to={`/${item.toLowerCase().replace(' ', '-')}`}
                        className="block px-4 py-2 text-sm hover:bg-gray-100"
                        style={{ color: colors.primary }}
                      >
                        {item}
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        </header>

        {/* Main Content Area */}
        <main className="flex-1 p-4 sm:p-6" style={{ color: colors.primary }}>
          <h2 className="text-2xl lg:text-3xl font-bold mb-6">Operations Dashboard</h2>

          {/* Key Metrics Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6 mb-8">
            {[
              { title: "Today's Orders", value: 45, color: colors.accent },
              { title: "Monthly Revenue", value: '₱85,234', color: colors.secondary },
              { title: "Low Stock Items", value: 3, color: colors.primary },
              { title: "Staff On Duty", value: 5, color: colors.accent }
            ].map((metric, index) => (
              <div 
                key={index}
                className="p-4 sm:p-6 rounded-lg shadow-sm transition-shadow"
                style={{ 
                  backgroundColor: colors.background,
                  border: `1px solid ${colors.muted}`,
                  minHeight: isLargeScreen ? '120px' : '100px'
                }}
              >
                <h3 className="text-base sm:text-lg font-semibold mb-2">{metric.title}</h3>
                <p 
                  className="text-2xl sm:text-3xl font-bold" 
                  style={{ color: metric.color }}
                >
                  {metric.value}
                </p>
              </div>
            ))}
          </div>

          {/* Charts Section */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6 mb-8">
            <div className="p-4 sm:p-6 rounded-lg shadow-sm" 
                 style={{ 
                   backgroundColor: colors.background, 
                   border: `1px solid ${colors.muted}`,
                   minHeight: isLargeScreen ? '400px' : '300px'
                 }}>
              <h3 className="text-lg sm:text-xl font-semibold mb-4">Daily Orders Trend</h3>
              <ResponsiveContainer width="100%" height="90%">
                <LineChart data={dailyOrdersData}>
                  <XAxis dataKey="day" stroke={colors.primary} />
                  <YAxis stroke={colors.primary} />
                  <Tooltip />
                  <Line 
                    type="monotone" 
                    dataKey="orders" 
                    stroke={colors.accent} 
                    strokeWidth={2}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>

            <div className="p-4 sm:p-6 rounded-lg shadow-sm" 
                 style={{ 
                   backgroundColor: colors.background, 
                   border: `1px solid ${colors.muted}`,
                   minHeight: isLargeScreen ? '400px' : '300px'
                 }}>
              <h3 className="text-lg sm:text-xl font-semibold mb-4">Inventory Levels</h3>
              <ResponsiveContainer width="100%" height="90%">
                <BarChart data={inventoryData}>
                  <CartesianGrid strokeDasharray="3 3" stroke={colors.muted} />
                  <XAxis dataKey="item" stroke={colors.primary} />
                  <YAxis stroke={colors.primary} />
                  <Tooltip />
                  <Bar 
                    dataKey="stock" 
                    fill={colors.secondary}
                    radius={[4, 4, 0, 0]}
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Quick Actions Section */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
            <div className="p-4 sm:p-6 rounded-lg shadow-sm" 
                 style={{ 
                   backgroundColor: colors.background, 
                   border: `1px solid ${colors.muted}`
                 }}>
              <h3 className="text-lg sm:text-xl font-semibold mb-4">Quick Actions</h3>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                {[
                  { label: 'New Order', color: colors.accent, path: '/new-order' },
                  { label: 'Inventory', color: colors.secondary, path: '/inventory' },
                  { label: 'Reports', color: colors.primary, path: '/reports' }
                ].map((action, index) => (
                  <Link
                    key={index}
                    to={action.path}
                    className="flex items-center justify-center p-3 sm:p-4 text-center rounded-md font-medium transition-all hover:opacity-90"
                    style={{ 
                      backgroundColor: action.color,
                      color: colors.background,
                      fontSize: isLargeScreen ? '1rem' : '0.875rem'
                    }}
                  >
                    {action.label}
                  </Link>
                ))}
              </div>
            </div>

            {/* Recent Activity */}
            <div className="p-4 sm:p-6 rounded-lg shadow-sm" 
                 style={{ 
                   backgroundColor: colors.background, 
                   border: `1px solid ${colors.muted}`
                 }}>
              <h3 className="text-lg sm:text-xl font-semibold mb-4">Recent Activity</h3>
              <ul className="space-y-3">
                {[
                  'New order #2045 (₱1,250)',
                  'Low stock: Coffee Beans (25kg)',
                  'Inventory update: Chicken Wings (+50kg)',
                  'Staff shift change: 2pm rotation',
                  'New menu item added: Spicy Wings'
                ].slice(0, isLargeScreen ? 5 : 3).map((activity, index) => (
                  <li 
                    key={index}
                    className="text-sm sm:text-base flex items-center"
                    style={{ color: colors.primary }}
                  >
                    <span 
                      className="w-2 h-2 rounded-full mr-3" 
                      style={{ backgroundColor: colors.accent }}
                    ></span>
                    {activity}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}

export default Dashboard;