import { useState, useEffect } from 'react';
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
    <div className="min-h-screen p-4 sm:p-6 lg:p-8 ml-0 md:ml-20 pt-16 md:pt-4 transition-all duration-300">
      <div className="max-w-7xl mx-auto">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-6">
          <h1 className="text-2xl font-bold text-primary">
            {getPageTitle()}
          </h1>
          
          <div className="flex mt-4 md:mt-0">
            <button
              onClick={() => setActiveTab('revenue')}
              className={`px-4 sm:px-6 py-2 font-medium border-b-2 transition-all ${
                activeTab === 'revenue' 
                  ? 'text-white border-transparent' 
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200 border-transparent'
              }`}
              style={activeTab === 'revenue' ? { backgroundColor: theme.colors.primary, borderRadius: '8px 0 0 8px' } : { borderRadius: '8px 0 0 8px' }}
            >
              Revenue
            </button>
            <button
              onClick={() => setActiveTab('receipts')}
              className={`px-4 sm:px-6 py-2 font-medium border-b-2 transition-all ${
                activeTab === 'receipts' 
                  ? 'text-white border-transparent' 
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200 border-transparent'
              }`}
              style={activeTab === 'receipts' ? { backgroundColor: theme.colors.primary } : {}}
            >
              Receipts
            </button>
            <button
              onClick={() => setActiveTab('yearly')}
              className={`px-4 sm:px-6 py-2 font-medium border-b-2 transition-all flex items-center gap-2 ${
                activeTab === 'yearly' 
                  ? 'text-white border-transparent' 
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200 border-transparent'
              }`}
              style={activeTab === 'yearly' ? { backgroundColor: theme.colors.primary, borderRadius: '0 8px 8px 0' } : { borderRadius: '0 8px 8px 0' }}
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
              </svg>
              Yearly
            </button>
          </div>
        </div>
        
        <div className="bg-white rounded-lg shadow">
          {activeTab === 'revenue' && <RevenueReports />}
          {activeTab === 'receipts' && <ReceiptHistory />}
          {activeTab === 'yearly' && <YearlyRevenueReportTab />}
        </div>
      </div>
    </div>
  );
};

export default RevenueReportsPage;
