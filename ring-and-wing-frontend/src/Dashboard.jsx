import { LineChart, Line, XAxis, YAxis, Tooltip, Legend, BarChart, Bar, CartesianGrid } from 'recharts';
import { Link, useLocation } from 'react-router-dom';
import { useState } from 'react';
import Sidebar from './Sidebar';

function Dashboard() {
  // Sample restaurant data
  const dailyOrdersData = [
    { day: 'Mon', orders: 45 },
    { day: 'Tue', orders: 52 },
    { day: 'Wed', orders: 48 },
    { day: 'Thu', orders: 60 },
    { day: 'Fri', orders: 75 },
    { day: 'Sat', orders: 85 },
    { day: 'Sun', orders: 65 },
  ];

  const inventoryData = [
    { item: 'Coffee Beans', stock: 45 },
    { item: 'Chicken Wings', stock: 32 },
    { item: 'Beverages', stock: 68 },
    { item: 'Paper Goods', stock: 24 },
  ];

  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const location = useLocation();

  // Enhanced color palette with active state variations
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

  // No longer needed: internal sidebar has been moved to Sidebar.jsx

  return (
    <div className="flex min-h-screen" style={{ backgroundColor: colors.background }}>
      {/* External Sidebar */}
      <Sidebar colors={colors} />

      {/* Main Content */}
      <div className="flex-1 flex flex-col sm:ml-64">
        {/* Navbar */}
        <header className="flex items-center justify-between h-16 px-6 border-b" style={{ backgroundColor: colors.background, borderColor: colors.muted }}>
          <div className="flex items-center">
            <input
              type="text"
              placeholder="Search orders, inventory..."
              className="search-input px-4 py-2 rounded-md outline-none"
              style={{
                backgroundColor: colors.background,
                border: `1px solid ${colors.muted}`,
                color: colors.primary,
                width: '300px'
              }}
            />
          </div>

          {/* Profile Dropdown */}
          <div className="flex items-center ms-3 relative">
            <div>
              <button
                type="button"
                onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                className="flex text-sm rounded-full"
                style={{ backgroundColor: colors.primary }}
              >
                <span className="sr-only">Open staff menu</span>
                <img
                  className="w-8 h-8 rounded-full"
                  src="/staff-avatar.png"
                  alt="staff photo"
                />
              </button>
            </div>

            {isDropdownOpen && (
              <div
                className="dropdown-menu z-50 absolute top-full right-0 mt-2 w-48 text-base list-none rounded-lg shadow-sm"
                style={{ backgroundColor: colors.background, border: `1px solid ${colors.muted}` }}
              >
                <div className="px-4 py-3">
                  <p className="text-sm" style={{ color: colors.primary }}>Staff Account</p>
                  <p className="text-sm font-medium truncate" style={{ color: colors.secondary }}>
                    staff@ringwing.com
                  </p>
                </div>
                <ul className="py-1">
                  <li>
                    <Link
                      to="/profile"
                      className="dropdown-item block px-4 py-2 text-sm"
                      style={{ color: colors.primary }}
                    >
                      Shift Details
                    </Link>
                  </li>
                  <li>
                    <Link
                      to="/settings"
                      className="dropdown-item block px-4 py-2 text-sm"
                      style={{ color: colors.primary }}
                    >
                      Settings
                    </Link>
                  </li>
                  <li>
                    <Link
                      to="/logout"
                      className="dropdown-item block px-4 py-2 text-sm"
                      style={{ color: colors.primary }}
                    >
                      Log Out
                    </Link>
                  </li>
                </ul>
              </div>
            )}
          </div>
        </header>

        {/* Main Area */}
        <main className="flex-1 p-6" style={{ color: colors.primary }}>
          <h2 className="text-2xl font-bold mb-6">Operations Dashboard</h2>

          {/* Key Metrics Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            <div className="dashboard-card p-6 rounded-lg shadow-sm" style={{ backgroundColor: colors.background, border: `1px solid ${colors.muted}` }}>
              <h3 className="text-lg font-semibold mb-2">Today's Orders</h3>
              <p className="text-2xl font-bold" style={{ color: colors.accent }}>45</p>
            </div>
            <div className="dashboard-card p-6 rounded-lg shadow-sm" style={{ backgroundColor: colors.background, border: `1px solid ${colors.muted}` }}>
              <h3 className="text-lg font-semibold mb-2">Monthly Revenue</h3>
              <p className="text-2xl font-bold" style={{ color: colors.secondary }}>₱85,234</p>
            </div>
            <div className="dashboard-card p-6 rounded-lg shadow-sm" style={{ backgroundColor: colors.background, border: `1px solid ${colors.muted}` }}>
              <h3 className="text-lg font-semibold mb-2">Low Stock Items</h3>
              <p className="text-2xl font-bold" style={{ color: colors.primary }}>3</p>
            </div>
            <div className="dashboard-card p-6 rounded-lg shadow-sm" style={{ backgroundColor: colors.background, border: `1px solid ${colors.muted}` }}>
              <h3 className="text-lg font-semibold mb-2">Staff On Duty</h3>
              <p className="text-2xl font-bold" style={{ color: colors.accent }}>5</p>
            </div>
          </div>

          {/* Charts Section */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
            <div className="dashboard-card p-6 rounded-lg shadow-sm" style={{ backgroundColor: colors.background, border: `1px solid ${colors.muted}` }}>
              <h3 className="text-lg font-semibold mb-4">Daily Orders Trend</h3>
              <LineChart width={500} height={300} data={dailyOrdersData}>
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
            </div>

            <div className="dashboard-card p-6 rounded-lg shadow-sm" style={{ backgroundColor: colors.background, border: `1px solid ${colors.muted}` }}>
              <h3 className="text-lg font-semibold mb-4">Inventory Levels</h3>
              <BarChart width={500} height={300} data={inventoryData}>
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
            </div>
          </div>

          {/* Quick Actions Section */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="dashboard-card p-6 rounded-lg shadow-sm" style={{ backgroundColor: colors.background, border: `1px solid ${colors.muted}` }}>
              <h3 className="text-lg font-semibold mb-4">Quick Actions</h3>
              <div className="flex flex-wrap gap-4">
                <Link 
                  to="/new-order"
                  className="quick-action-btn px-4 py-2 rounded-md font-medium"
                  style={{ backgroundColor: colors.accent, color: colors.background }}
                >
                  Create New Order
                </Link>
                <Link 
                  to="/inventory"
                  className="quick-action-btn px-4 py-2 rounded-md font-medium"
                  style={{ backgroundColor: colors.secondary, color: colors.background }}
                >
                  Manage Inventory
                </Link>
                <Link 
                  to="/reports"
                  className="quick-action-btn px-4 py-2 rounded-md font-medium"
                  style={{ backgroundColor: colors.primary, color: colors.background }}
                >
                  Generate Report
                </Link>
              </div>
            </div>

            {/* Recent Activity */}
            <div className="dashboard-card p-6 rounded-lg shadow-sm" style={{ backgroundColor: colors.background, border: `1px solid ${colors.muted}` }}>
              <h3 className="text-lg font-semibold mb-4">Recent Activity</h3>
              <ul className="space-y-3">
                <li className="text-sm" style={{ color: colors.primary }}>
                  New order #2045 received (₱1,250)
                </li>
                <li className="text-sm" style={{ color: colors.primary }}>
                  Low stock alert: Coffee Beans (25kg left)
                </li>
                <li className="text-sm" style={{ color: colors.primary }}>
                  Inventory updated: Chicken Wings (+50kg)
                </li>
              </ul>
            </div>
          </div>
        </main>
      </div>

      {/* Enhanced CSS Styles */}
      <style jsx>{`
        /* Sidebar navigation styles */
        .nav-link {
          transition: all 0.2s ease;
          margin-left: 4px;
          border-radius: 4px 0 0 4px;
        }
        
        /* Active state - orange border + subtle background */
        .nav-link[style*="background-color: rgba(241, 103, 15, 0.125)"] {
          background-color: ${colors.activeBg} !important;
          border-left-color: ${colors.activeBorder} !important;
        }
        
        /* Hover state - lighter background only */
        .nav-link:hover:not([style*="background-color: rgba(241, 103, 15, 0.125)"]) {
          background-color: ${colors.hoverBg} !important;
        }
        
        /* Search input */
        .search-input {
          transition: all 0.2s ease;
        }
        .search-input:focus {
          border-color: ${colors.accent} !important;
          box-shadow: 0 0 0 1px ${colors.accent} !important;
        }
        
        /* Dropdown items */
        .dropdown-item {
          transition: background-color 0.2s ease;
        }
        .dropdown-item:hover {
          background-color: ${colors.primary}10 !important;
        }
        
        /* Quick action buttons */
        .quick-action-btn {
          transition: all 0.2s ease;
        }
        .quick-action-btn:hover {
          opacity: 0.9 !important;
          transform: translateY(-1px);
        }
        
        /* Dashboard cards */
        .dashboard-card {
          transition: box-shadow 0.2s ease;
        }
        .dashboard-card:hover {
          box-shadow: 0 4px 6px ${colors.muted}40 !important;
        }
      `}</style>
    </div>
  );
}

export default Dashboard;
