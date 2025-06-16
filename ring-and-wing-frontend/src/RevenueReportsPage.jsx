import { useState } from 'react';
import RevenueReports from './components/RevenueReports';
import ReceiptHistory from './components/ReceiptHistory';
import { theme } from './theme';

const RevenueReportsPage = () => {
  const [activeTab, setActiveTab] = useState('revenue'); // 'revenue' or 'receipts'
  const getPageTitle = () => {
    return activeTab === 'revenue' ? 'Revenue Reports' : 'Receipt History';
  };  return (
    <div className="min-h-screen p-4 sm:p-6 lg:p-8 ml-0 md:ml-20 pt-16 md:pt-4 transition-all duration-300">
      <div className="max-w-7xl mx-auto">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-6">
          <h1 className="text-2xl font-bold text-primary">
            {getPageTitle()}
          </h1>
          
          <div className="flex mt-4 md:mt-0">
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
        </div>
        
        <div className="bg-white rounded-lg shadow">
          {activeTab === 'revenue' ? (
            <RevenueReports />
          ) : (
            <ReceiptHistory />
          )}
        </div>
      </div>
    </div>
  );
};

export default RevenueReportsPage;
