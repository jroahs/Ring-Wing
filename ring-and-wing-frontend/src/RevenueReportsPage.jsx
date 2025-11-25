import { useState } from 'react';
import RevenueReports from './components/RevenueReports';
import ReceiptHistory from './components/ReceiptHistory';
import YearlyRevenueReport from './components/YearlyRevenueReport';
import { theme } from './theme';
import { useMultiTabLogout } from './hooks/useMultiTabLogout';

const RevenueReportsPage = () => {
  // Enable multi-tab logout synchronization
  useMultiTabLogout();
  
  const [activeTab, setActiveTab] = useState('revenue'); // 'revenue', 'receipts', or 'yearly'
  const [showYearlyModal, setShowYearlyModal] = useState(false);
  
  const getPageTitle = () => {
    if (activeTab === 'revenue') return 'Revenue Reports';
    if (activeTab === 'receipts') return 'Receipt History';
    return 'Revenue Reports';
  };  return (
    <div className="min-h-screen p-4 sm:p-6 lg:p-8 ml-0 md:ml-20 pt-16 md:pt-4 transition-all duration-300">
      <div className="max-w-7xl mx-auto">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-6">
          <h1 className="text-2xl font-bold text-primary">
            {getPageTitle()}
          </h1>
          
          <div className="flex mt-4 md:mt-0 gap-2">
            <div className="flex">
              <button
                onClick={() => setActiveTab('revenue')}
                className={`px-6 py-2 rounded-tl-lg rounded-bl-lg font-medium ${
                  activeTab === 'revenue' 
                    ? `bg-${theme.colors.primary} text-white` 
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
                style={activeTab === 'revenue' ? { backgroundColor: theme.colors.primary } : {}}
              >
                Revenue
              </button>
              <button
                onClick={() => setActiveTab('receipts')}
                className={`px-6 py-2 rounded-tr-lg rounded-br-lg font-medium ${
                  activeTab === 'receipts' 
                    ? `bg-${theme.colors.primary} text-white` 
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
                style={activeTab === 'receipts' ? { backgroundColor: theme.colors.primary } : {}}
              >
                Receipts
              </button>
            </div>
            
            {/* Yearly Revenue Report Button */}
            <button
              onClick={() => setShowYearlyModal(true)}
              className="px-6 py-2 rounded-lg font-medium text-white transition-all duration-200 hover:shadow-md flex items-center gap-2"
              style={{ backgroundColor: theme.colors.accent }}
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
              </svg>
              Yearly Revenue Report
            </button>
          </div>
        </div>
        
        <div className="bg-white rounded-lg shadow">
          {activeTab === 'revenue' ? (
            <RevenueReports />
          ) : (
            <ReceiptHistory />
          )}
        </div>
      </div>
      
      {/* Yearly Revenue Report Modal */}
      <YearlyRevenueReport 
        isOpen={showYearlyModal} 
        onClose={() => setShowYearlyModal(false)} 
      />
    </div>
  );
};

export default RevenueReportsPage;
