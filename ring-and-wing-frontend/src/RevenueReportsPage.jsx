import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useSearchParams } from 'react-router-dom';
import RevenueReports from './components/RevenueReports';
import ReceiptHistory from './components/ReceiptHistory';
import YearlyRevenueReportTab from './components/YearlyRevenueReportTab';
import { theme } from './theme';
import { useMultiTabLogout } from './hooks/useMultiTabLogout';

const RevenueReportsPage = () => {
  // Enable multi-tab logout synchronization
  useMultiTabLogout();
  const [searchParams] = useSearchParams();
  
  const [activeTab, setActiveTab] = useState('revenue'); // 'revenue', 'receipts', or 'yearly'
  
  // Handle URL query params for direct navigation
  useEffect(() => {
    const tab = searchParams.get('tab');
    if (tab === 'yearly') {
      setActiveTab('yearly');
    } else if (tab === 'receipts') {
      setActiveTab('receipts');
    }
  }, [searchParams]);
  
  const getPageTitle = () => {
    if (activeTab === 'revenue') return 'Revenue Reports';
    if (activeTab === 'receipts') return 'Receipt History';
    if (activeTab === 'yearly') return 'Yearly Revenue Report';
    return 'Revenue Reports';
  };

  return (
    <motion.div 
      className="min-h-screen p-4 sm:p-6 lg:p-8 pt-16 md:pt-4 transition-all duration-300"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.4 }}
    >
      <motion.div 
        className="max-w-7xl mx-auto"
        initial={{ opacity: 0, y: 15 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.1 }}
      >
        <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-6">
          <motion.h1 
            className="text-2xl font-bold text-primary"
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.4, delay: 0.2 }}
          >
            {getPageTitle()}
          </motion.h1>
          
          <motion.div 
            className="flex mt-4 md:mt-0"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.4, delay: 0.3 }}
          >
            <motion.button
              onClick={() => setActiveTab('revenue')}
              className={`px-4 sm:px-6 py-2 font-medium border-b-2 transition-all ${
                activeTab === 'revenue' 
                  ? 'text-white border-transparent' 
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200 border-transparent'
              }`}
              style={activeTab === 'revenue' ? { backgroundColor: theme.colors.primary, borderRadius: '8px 0 0 8px' } : { borderRadius: '8px 0 0 8px' }}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
            >
              Revenue
            </motion.button>
            <motion.button
              onClick={() => setActiveTab('receipts')}
              className={`px-4 sm:px-6 py-2 font-medium border-b-2 transition-all ${
                activeTab === 'receipts' 
                  ? 'text-white border-transparent' 
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200 border-transparent'
              }`}
              style={activeTab === 'receipts' ? { backgroundColor: theme.colors.primary } : {}}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
            >
              Receipts
            </motion.button>
            <motion.button
              onClick={() => setActiveTab('yearly')}
              className={`px-4 sm:px-6 py-2 font-medium border-b-2 transition-all flex items-center gap-2 ${
                activeTab === 'yearly' 
                  ? 'text-white border-transparent' 
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200 border-transparent'
              }`}
              style={activeTab === 'yearly' ? { backgroundColor: theme.colors.primary, borderRadius: '0 8px 8px 0' } : { borderRadius: '0 8px 8px 0' }}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
              </svg>
              Yearly
            </motion.button>
          </motion.div>
        </div>
        
        <motion.div 
          className="bg-white rounded-lg shadow"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: 0.4 }}
        >
          <AnimatePresence mode="wait">
            {activeTab === 'revenue' && (
              <motion.div
                key="revenue"
                initial={{ opacity: 0, x: -15 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 15 }}
                transition={{ duration: 0.25 }}
              >
                <RevenueReports />
              </motion.div>
            )}
            {activeTab === 'receipts' && (
              <motion.div
                key="receipts"
                initial={{ opacity: 0, x: -15 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 15 }}
                transition={{ duration: 0.25 }}
              >
                <ReceiptHistory />
              </motion.div>
            )}
            {activeTab === 'yearly' && (
              <motion.div
                key="yearly"
                initial={{ opacity: 0, x: -15 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 15 }}
                transition={{ duration: 0.25 }}
              >
                <YearlyRevenueReportTab />
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>
      </motion.div>
    </motion.div>
  );
};

export default RevenueReportsPage;
