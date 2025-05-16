import { useState } from 'react';
import RevenueReports from './components/RevenueReports';

const RevenueReportsPage = () => {
  const [pageTitle] = useState('Revenue Reports');

  return (
    <div className="min-h-screen p-4 sm:p-6 lg:p-8 ml-0 md:ml-20">
      <div className="max-w-7xl mx-auto">
        <h1 className="text-2xl font-bold mb-6 text-primary">
          {pageTitle}
        </h1>
        
        <div className="bg-white rounded-lg shadow">
          <RevenueReports />
        </div>
      </div>
    </div>
  );
};

export default RevenueReportsPage;
