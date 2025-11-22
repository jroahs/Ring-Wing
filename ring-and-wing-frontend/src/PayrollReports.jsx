import React, { useState, useEffect } from 'react';
import api from './services/apiService';
import { toast } from 'react-toastify';
import { PesoIconSimple } from './components/ui/PesoIconSimple';
import { 
  FiFileText, 
  FiDownload, 
  FiFilter, 
  FiCalendar,
  FiUsers,

  FiPieChart,
  FiBarChart2,
  FiArrowLeft
} from 'react-icons/fi';
import BrandedLoadingScreen from './components/ui/BrandedLoadingScreen';

const PayrollReports = ({ onBack, colors }) => {
  const [reportType, setReportType] = useState('summary');
  const [dateRange, setDateRange] = useState({
    startDate: new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0],
    endDate: new Date().toISOString().split('T')[0]
  });
  const [payrollData, setPayrollData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [staffList, setStaffList] = useState([]);
  const [selectedStaff, setSelectedStaff] = useState('all');

  useEffect(() => {
    fetchStaffList();
    fetchPayrollData();
  }, []);

  const fetchStaffList = async () => {
    try {
      const token = localStorage.getItem('authToken');
      const response = await api.get('/api/staff', {
        headers: { Authorization: `Bearer ${token}` }
      });
      setStaffList(response.data.data || []);
    } catch (error) {
      console.error('Error fetching staff:', error);
    }
  };

  const fetchPayrollData = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('authToken');
      const params = new URLSearchParams({
        startDate: dateRange.startDate,
        endDate: dateRange.endDate
      });

      const response = await api.get(`/api/payroll?${params}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      setPayrollData(response.data.data || []);
    } catch (error) {
      console.error('Error fetching payroll data:', error);
      toast.error('Failed to fetch payroll data');
    } finally {
      setLoading(false);
    }
  };

  const handleDateRangeChange = (field, value) => {
    setDateRange(prev => ({ ...prev, [field]: value }));
  };

  const applyFilters = () => {
    fetchPayrollData();
  };
  const getFilteredData = () => {
    let filtered = payrollData;
    
    if (selectedStaff !== 'all') {
      filtered = filtered.filter(record => record.staffId && record.staffId._id === selectedStaff);
    }
    
    return filtered;
  };
  const calculateSummaryStats = () => {
    const filtered = getFilteredData();
    
    const totalGrossPay = filtered.reduce((sum, record) => sum + (record.grossPay || record.netPay || 0), 0);
    const totalNetPay = filtered.reduce((sum, record) => sum + (record.netPay || 0), 0);
    const totalDeductions = filtered.reduce((sum, record) => 
      sum + (record.deductions?.late || 0) + (record.deductions?.absence || 0), 0
    );
    const totalEmployees = new Set(filtered.map(record => record.staffId && record.staffId._id).filter(id => id)).size;

    return {
      totalGrossPay,
      totalNetPay,
      totalDeductions,
      totalEmployees,
      totalRecords: filtered.length
    };
  };

  const generatePayrollSummaryReport = () => {
    const filtered = getFilteredData();
    const stats = calculateSummaryStats();
    
    return (
      <div className="space-y-6">
        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="p-4 rounded-lg" style={{ backgroundColor: colors.secondary + '10' }}>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm" style={{ color: colors.muted }}>Total Employees</p>
                <p className="text-2xl font-bold" style={{ color: colors.secondary }}>{stats.totalEmployees}</p>
              </div>
              <FiUsers className="text-2xl" style={{ color: colors.secondary }} />
            </div>
          </div>
          
          <div className="p-4 rounded-lg" style={{ backgroundColor: colors.accent + '10' }}>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm" style={{ color: colors.muted }}>Total Gross Pay</p>
                <p className="text-2xl font-bold" style={{ color: colors.accent }}>₱{stats.totalGrossPay.toFixed(2)}</p>
              </div>
              <PesoIconSimple width={24} height={24} style={{ color: colors.accent }} />
            </div>
          </div>
          
          <div className="p-4 rounded-lg" style={{ backgroundColor: colors.primary + '10' }}>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm" style={{ color: colors.muted }}>Total Net Pay</p>
                <p className="text-2xl font-bold" style={{ color: colors.primary }}>₱{stats.totalNetPay.toFixed(2)}</p>
              </div>
              <FiBarChart2 className="text-2xl" style={{ color: colors.primary }} />
            </div>
          </div>
          
          <div className="p-4 rounded-lg" style={{ backgroundColor: colors.muted + '10' }}>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm" style={{ color: colors.muted }}>Total Deductions</p>
                <p className="text-2xl font-bold" style={{ color: colors.muted }}>₱{stats.totalDeductions.toFixed(2)}</p>
              </div>
              <FiPieChart className="text-2xl" style={{ color: colors.muted }} />
            </div>
          </div>
        </div>

        {/* Detailed Table */}
        <div className="rounded-lg overflow-hidden" style={{ backgroundColor: colors.background }}>
          <div className="p-4 border-b" style={{ borderColor: colors.muted + '20' }}>
            <h3 className="text-lg font-semibold" style={{ color: colors.primary }}>
              Payroll Summary Report
            </h3>
            <p className="text-sm" style={{ color: colors.muted }}>
              {dateRange.startDate} to {dateRange.endDate}
            </p>
          </div>
          
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead style={{ backgroundColor: colors.muted + '10' }}>
                <tr>
                  <th className="text-left p-3 text-sm font-medium" style={{ color: colors.primary }}>Employee</th>
                  <th className="text-left p-3 text-sm font-medium" style={{ color: colors.primary }}>Position</th>
                  <th className="text-right p-3 text-sm font-medium" style={{ color: colors.primary }}>Basic Pay</th>
                  <th className="text-right p-3 text-sm font-medium" style={{ color: colors.primary }}>Overtime</th>
                  <th className="text-right p-3 text-sm font-medium" style={{ color: colors.primary }}>Bonuses</th>
                  <th className="text-right p-3 text-sm font-medium" style={{ color: colors.primary }}>Deductions</th>
                  <th className="text-right p-3 text-sm font-medium" style={{ color: colors.primary }}>Net Pay</th>
                  <th className="text-center p-3 text-sm font-medium" style={{ color: colors.primary }}>Period</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((record, index) => (
                  <tr key={record._id} className="border-b" style={{ borderColor: colors.muted + '20' }}>                    <td className="p-3">
                      <div>
                        <p className="font-medium" style={{ color: colors.primary }}>{record.staffId?.name || 'N/A'}</p>
                      </div>
                    </td>
                    <td className="p-3" style={{ color: colors.muted }}>{record.staffId?.position || 'N/A'}</td>
                    <td className="p-3 text-right" style={{ color: colors.primary }}>₱{record.basicPay?.toFixed(2) || '0.00'}</td>
                    <td className="p-3 text-right" style={{ color: colors.primary }}>₱{record.overtimePay?.toFixed(2) || '0.00'}</td>
                    <td className="p-3 text-right" style={{ color: colors.secondary }}>
                      ₱{((record.holidayPay || 0) + (record.thirteenthMonthPay || 0) + (record.bonuses?.performance || 0) + (record.bonuses?.other || 0)).toFixed(2)}
                    </td>
                    <td className="p-3 text-right" style={{ color: colors.accent }}>
                      ₱{((record.deductions?.late || 0) + (record.deductions?.absence || 0)).toFixed(2)}
                    </td>
                    <td className="p-3 text-right font-semibold" style={{ color: colors.primary }}>₱{record.netPay?.toFixed(2) || '0.00'}</td>
                    <td className="p-3 text-center text-sm" style={{ color: colors.muted }}>
                      {new Date(record.payrollPeriod).toLocaleDateString('en-PH', { month: 'short', year: 'numeric' })}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    );
  };

  const generateDetailedReport = () => {
    const filtered = getFilteredData();
    
    return (
      <div className="space-y-6">
        <div className="rounded-lg" style={{ backgroundColor: colors.background }}>
          <div className="p-4 border-b" style={{ borderColor: colors.muted + '20' }}>
            <h3 className="text-lg font-semibold" style={{ color: colors.primary }}>
              Detailed Payroll Report
            </h3>
          </div>
          
          <div className="p-4 space-y-4">
            {filtered.map((record) => (
              <div key={record._id} className="p-4 rounded-lg border" style={{ borderColor: colors.muted + '20' }}>
                <div className="flex justify-between items-start mb-4">                  <div>
                    <h4 className="font-semibold" style={{ color: colors.primary }}>{record.staffId?.name || 'N/A'}</h4>
                    <p className="text-sm" style={{ color: colors.muted }}>{record.staffId?.position || 'N/A'}</p>
                  </div>
                  <div className="text-right">
                    <p className="font-semibold" style={{ color: colors.secondary }}>₱{record.netPay?.toFixed(2)}</p>
                    <p className="text-sm" style={{ color: colors.muted }}>
                      {new Date(record.payrollPeriod).toLocaleDateString('en-PH')}
                    </p>
                  </div>
                </div>
                
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div>
                    <p className="text-xs" style={{ color: colors.muted }}>Basic Pay</p>
                    <p className="font-medium" style={{ color: colors.primary }}>₱{record.basicPay?.toFixed(2) || '0.00'}</p>
                  </div>
                  <div>
                    <p className="text-xs" style={{ color: colors.muted }}>Overtime</p>
                    <p className="font-medium" style={{ color: colors.primary }}>₱{record.overtimePay?.toFixed(2) || '0.00'}</p>
                  </div>
                  <div>
                    <p className="text-xs" style={{ color: colors.muted }}>Hours Worked</p>
                    <p className="font-medium" style={{ color: colors.primary }}>{record.totalHoursWorked?.toFixed(1) || '0.0'}h</p>
                  </div>
                  <div>
                    <p className="text-xs" style={{ color: colors.muted }}>OT Hours</p>
                    <p className="font-medium" style={{ color: colors.primary }}>{record.overtimeHours?.toFixed(1) || '0.0'}h</p>
                  </div>
                </div>
                
                {(record.holidayPay > 0 || record.thirteenthMonthPay > 0 || (record.bonuses && (record.bonuses.performance > 0 || record.bonuses.other > 0))) && (
                  <div className="mt-3 pt-3 border-t" style={{ borderColor: colors.muted + '20' }}>
                    <p className="text-xs font-medium mb-2" style={{ color: colors.secondary }}>Bonuses & Benefits</p>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                      {record.holidayPay > 0 && (
                        <div>
                          <p className="text-xs" style={{ color: colors.muted }}>Holiday Pay</p>
                          <p className="font-medium" style={{ color: colors.secondary }}>₱{record.holidayPay.toFixed(2)}</p>
                        </div>
                      )}
                      {record.thirteenthMonthPay > 0 && (
                        <div>
                          <p className="text-xs" style={{ color: colors.muted }}>13th Month</p>
                          <p className="font-medium" style={{ color: colors.secondary }}>₱{record.thirteenthMonthPay.toFixed(2)}</p>
                        </div>
                      )}
                      {record.bonuses?.performance > 0 && (
                        <div>
                          <p className="text-xs" style={{ color: colors.muted }}>Performance</p>
                          <p className="font-medium" style={{ color: colors.secondary }}>₱{record.bonuses.performance.toFixed(2)}</p>
                        </div>
                      )}
                      {record.bonuses?.other > 0 && (
                        <div>
                          <p className="text-xs" style={{ color: colors.muted }}>Other Bonus</p>
                          <p className="font-medium" style={{ color: colors.secondary }}>₱{record.bonuses.other.toFixed(2)}</p>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  };

  const exportToCSV = () => {
    const filtered = getFilteredData();
    
    const headers = [
      'Employee Name',
      'Position', 
      'Period',
      'Basic Pay',
      'Overtime Pay',
      'Holiday Pay',
      '13th Month Pay',
      'Performance Bonus',
      'Other Bonus',
      'Late Deductions',
      'Absence Deductions',
      'Net Pay'
    ];
      const csvData = filtered.map(record => [
      record.staffId?.name || 'N/A',
      record.staffId?.position || 'N/A',
      new Date(record.payrollPeriod).toLocaleDateString('en-PH'),
      record.basicPay || 0,
      record.overtimePay || 0,
      record.holidayPay || 0,
      record.thirteenthMonthPay || 0,
      record.bonuses?.performance || 0,
      record.bonuses?.other || 0,
      record.deductions?.late || 0,
      record.deductions?.absence || 0,
      record.netPay || 0
    ]);
    
    const csvContent = [headers, ...csvData]
      .map(row => row.map(field => `"${field}"`).join(','))
      .join('\n');
    
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `payroll-report-${dateRange.startDate}-to-${dateRange.endDate}.csv`;
    link.click();
    
    toast.success('Report exported successfully');
  };

  return (
    <div className="min-h-screen p-4" style={{ backgroundColor: colors.background }}>
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center">
            <button
              onClick={onBack}
              className="mr-4 p-2 rounded-lg hover:opacity-80 transition-opacity"
              style={{ backgroundColor: colors.muted + '20' }}
            >
              <FiArrowLeft className="text-xl" style={{ color: colors.primary }} />
            </button>
            <div>
              <h1 className="text-3xl font-bold" style={{ color: colors.primary }}>
                <FiFileText className="inline mr-3" />
                Payroll Reports
              </h1>
              <p className="text-sm mt-1" style={{ color: colors.muted }}>
                Generate and export payroll reports for your restaurant
              </p>
            </div>
          </div>
          
          <button
            onClick={exportToCSV}
            className="flex items-center px-4 py-2 rounded-lg hover:opacity-90 transition-opacity"
            style={{ backgroundColor: colors.secondary, color: colors.background }}
          >
            <FiDownload className="mr-2" />
            Export CSV
          </button>
        </div>

        {/* Filters */}
        <div className="p-4 rounded-lg mb-6" style={{ backgroundColor: colors.secondary + '10' }}>
          <div className="flex items-center mb-4">
            <FiFilter className="mr-2" style={{ color: colors.secondary }} />
            <h3 className="font-semibold" style={{ color: colors.secondary }}>Report Filters</h3>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <label className="block text-sm font-medium mb-2" style={{ color: colors.primary }}>
                Report Type
              </label>
              <select
                value={reportType}
                onChange={(e) => setReportType(e.target.value)}
                className="w-full p-2 rounded border focus:ring-2 focus:outline-none"
                style={{ borderColor: colors.muted + '60' }}
              >
                <option value="summary">Summary Report</option>
                <option value="detailed">Detailed Report</option>
              </select>
            </div>
            
            <div>
              <label className="block text-sm font-medium mb-2" style={{ color: colors.primary }}>
                Start Date
              </label>
              <input
                type="date"
                value={dateRange.startDate}
                onChange={(e) => handleDateRangeChange('startDate', e.target.value)}
                className="w-full p-2 rounded border focus:ring-2 focus:outline-none"
                style={{ borderColor: colors.muted + '60' }}
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium mb-2" style={{ color: colors.primary }}>
                End Date
              </label>
              <input
                type="date"
                value={dateRange.endDate}
                onChange={(e) => handleDateRangeChange('endDate', e.target.value)}
                className="w-full p-2 rounded border focus:ring-2 focus:outline-none"
                style={{ borderColor: colors.muted + '60' }}
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium mb-2" style={{ color: colors.primary }}>
                Employee
              </label>
              <select
                value={selectedStaff}
                onChange={(e) => setSelectedStaff(e.target.value)}
                className="w-full p-2 rounded border focus:ring-2 focus:outline-none"
                style={{ borderColor: colors.muted + '60' }}
              >
                <option value="all">All Employees</option>
                {staffList.map(staff => (
                  <option key={staff._id} value={staff._id}>{staff.name}</option>
                ))}
              </select>
            </div>
          </div>
          
          <div className="mt-4">
            <button
              onClick={applyFilters}
              className="px-4 py-2 rounded-lg hover:opacity-90 transition-opacity"
              style={{ backgroundColor: colors.accent, color: colors.background }}
              disabled={loading}
            >
              <FiCalendar className="inline mr-2" />
              {loading ? 'Loading...' : 'Apply Filters'}
            </button>
          </div>
        </div>

        {/* Report Content */}
        {loading ? (
          <BrandedLoadingScreen message="Loading payroll data..." />
        ) : (
          <div>
            {reportType === 'summary' ? generatePayrollSummaryReport() : generateDetailedReport()}
          </div>
        )}
      </div>
    </div>
  );
};

export default PayrollReports;
