// filepath: c:\Games\Ring-Wing\ring-and-wing-frontend\src\Dashboard.jsx
import { useState } from 'react';
import DashboardMinimal from './components/DashboardMinimal';
import PaymentSettings from './components/PaymentSettings';
import PaymentVerificationDashboard from './components/PaymentVerificationDashboard';
import { colors, theme } from './theme'; // Import centralized colors
import { FiSettings, FiDollarSign } from 'react-icons/fi';

function Dashboard() {
  const [activeTab, setActiveTab] = useState('overview'); // 'overview', 'verification', or 'settings'

  const getPageTitle = () => {
    if (activeTab === 'overview') return 'Dashboard Overview';
    if (activeTab === 'verification') return 'Payment Verification';
    return 'Payment Settings';
  };

  return (
    <div className="min-h-screen p-4 sm:p-6 lg:p-8 ml-0 md:ml-20 pt-16 md:pt-4 transition-all duration-300" style={{ backgroundColor: colors.background }}>
      <div className="max-w-7xl mx-auto">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-6">
          <h1 className="text-2xl font-bold text-primary">
            {getPageTitle()}
          </h1>
          
          <div className="flex mt-4 md:mt-0">
            <button
              onClick={() => setActiveTab('overview')}
              className={`px-6 py-2 rounded-tl-lg rounded-bl-lg font-medium ${
                activeTab === 'overview' 
                  ? `bg-${theme.colors.primary} text-white` 
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
              style={activeTab === 'overview' ? { backgroundColor: theme.colors.primary } : {}}
            >
              Overview
            </button>
            <button
              onClick={() => setActiveTab('verification')}
              className={`px-6 py-2 font-medium flex items-center gap-2 ${
                activeTab === 'verification' 
                  ? `bg-${theme.colors.primary} text-white` 
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
              style={activeTab === 'verification' ? { backgroundColor: theme.colors.primary } : {}}
            >
              <FiDollarSign />
              Verification
            </button>
            <button
              onClick={() => setActiveTab('settings')}
              className={`px-6 py-2 rounded-tr-lg rounded-br-lg font-medium flex items-center gap-2 ${
                activeTab === 'settings' 
                  ? `bg-${theme.colors.primary} text-white` 
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
              style={activeTab === 'settings' ? { backgroundColor: theme.colors.primary } : {}}
            >
              <FiSettings />
              Settings
            </button>
          </div>
        </div>
        
        <div className="bg-white rounded-lg shadow">
          {activeTab === 'overview' ? (
            <div className="p-4" style={{ color: colors.primary }}>
              <DashboardMinimal />
            </div>
          ) : activeTab === 'verification' ? (
            <PaymentVerificationDashboard />
          ) : (
            <PaymentSettings />
          )}
        </div>
      </div>
    </div>
  );
}

export default Dashboard;
