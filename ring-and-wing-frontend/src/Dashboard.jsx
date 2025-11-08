// filepath: c:\Games\Ring-Wing\ring-and-wing-frontend\src\Dashboard.jsx
import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import DashboardMinimal from './components/DashboardMinimal';
import PaymentSettings from './components/PaymentSettings';
import PaymentVerificationDashboard from './components/PaymentVerificationDashboard';
import { colors, theme } from './theme'; // Import centralized colors
import { FiSettings, FiDollarSign } from 'react-icons/fi';
import { useMultiTabLogout } from './hooks/useMultiTabLogout';

function Dashboard() {
  const [activeTab, setActiveTab] = useState('overview'); // 'overview', 'verification', or 'settings'
  
  // Enable multi-tab logout synchronization
  useMultiTabLogout();

  const getPageTitle = () => {
    if (activeTab === 'overview') return 'Dashboard Overview';
    if (activeTab === 'verification') return 'Payment Verification';
    return 'Payment Settings';
  };

  return (
    <motion.div 
      className="min-h-screen p-4 sm:p-6 lg:p-8 pt-16 md:pt-4 transition-all duration-300" 
      style={{ backgroundColor: colors.background }}
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
    >
      <div className="max-w-7xl mx-auto">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-6">
          <motion.h1 
            className="text-2xl font-bold text-primary"
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.5, delay: 0.2 }}
          >
            {getPageTitle()}
          </motion.h1>
          
          <motion.div 
            className="flex mt-4 md:mt-0"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.5, delay: 0.3 }}
          >
            <motion.button
              onClick={() => setActiveTab('overview')}
              className={`px-6 py-2 rounded-tl-lg rounded-bl-lg font-medium ${
                activeTab === 'overview' 
                  ? `bg-${theme.colors.primary} text-white` 
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
              style={activeTab === 'overview' ? { backgroundColor: theme.colors.primary } : {}}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              transition={{ type: "spring", stiffness: 400, damping: 17 }}
            >
              Overview
            </motion.button>
            <motion.button
              onClick={() => setActiveTab('verification')}
              className={`px-6 py-2 font-medium flex items-center gap-2 ${
                activeTab === 'verification' 
                  ? `bg-${theme.colors.primary} text-white` 
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
              style={activeTab === 'verification' ? { backgroundColor: theme.colors.primary } : {}}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              transition={{ type: "spring", stiffness: 400, damping: 17 }}
            >
              <FiDollarSign />
              Verification
            </motion.button>
            <motion.button
              onClick={() => setActiveTab('settings')}
              className={`px-6 py-2 rounded-tr-lg rounded-br-lg font-medium flex items-center gap-2 ${
                activeTab === 'settings' 
                  ? `bg-${theme.colors.primary} text-white` 
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
              style={activeTab === 'settings' ? { backgroundColor: theme.colors.primary } : {}}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              transition={{ type: "spring", stiffness: 400, damping: 17 }}
            >
              <FiSettings />
              Settings
            </motion.button>
          </motion.div>
        </div>
        
        <motion.div 
          className="bg-white rounded-lg shadow"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.4 }}
        >
          <AnimatePresence mode="wait">
            {activeTab === 'overview' && (
              <motion.div
                key="overview"
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 20 }}
                transition={{ duration: 0.3 }}
                className="p-4"
                style={{ color: colors.primary }}
              >
                <DashboardMinimal />
              </motion.div>
            )}
            {activeTab === 'verification' && (
              <motion.div
                key="verification"
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 20 }}
                transition={{ duration: 0.3 }}
              >
                <PaymentVerificationDashboard />
              </motion.div>
            )}
            {activeTab === 'settings' && (
              <motion.div
                key="settings"
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 20 }}
                transition={{ duration: 0.3 }}
              >
                <PaymentSettings />
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>
      </div>
    </motion.div>
  );
}

export default Dashboard;
