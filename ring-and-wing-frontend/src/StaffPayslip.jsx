import { useState, useEffect } from 'react';
import { FiDownload, FiEye, FiCalendar, FiDollarSign } from 'react-icons/fi';
import { toast } from 'react-toastify';
import api from './services/apiService';

const StaffPayslip = ({ colors }) => {
  const [payslips, setPayslips] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedPayslip, setSelectedPayslip] = useState(null);
  const [staffData, setStaffData] = useState(null);
  const [dateRange, setDateRange] = useState({
    startDate: '',
    endDate: ''
  });

  useEffect(() => {
    fetchStaffData();
  }, []);

  useEffect(() => {
    if (staffData) {
      fetchPayslips();
    }
  }, [staffData, dateRange]);

  const fetchStaffData = async () => {
    try {
      const token = localStorage.getItem('authToken');
      const userData = JSON.parse(localStorage.getItem('userData'));
      
      if (!userData || !userData.staffId) {
        toast.error('Staff information not found');
        return;
      }

      setStaffData(userData);
    } catch (error) {
      console.error('Error fetching staff data:', error);
      toast.error('Failed to load staff information');
    }
  };

  const fetchPayslips = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('authToken');
      const config = {
        headers: { Authorization: `Bearer ${token}` },
        params: {}
      };

      if (dateRange.startDate) config.params.startDate = dateRange.startDate;
      if (dateRange.endDate) config.params.endDate = dateRange.endDate;

      const response = await api.get(`/api/staff/${staffData.staffId}/payslips`, config);
      
      if (response.data.success) {
        setPayslips(response.data.data);
      }
    } catch (error) {
      console.error('Error fetching payslips:', error);
      toast.error(error.response?.data?.message || 'Failed to load payslips');
    } finally {
      setLoading(false);
    }
  };

  const fetchPayslipDetails = async (payslipId) => {
    try {
      const token = localStorage.getItem('authToken');
      const config = {
        headers: { Authorization: `Bearer ${token}` }
      };

      const response = await api.get(`/api/staff/payslip/${payslipId}`, config);
      
      if (response.data.success) {
        setSelectedPayslip(response.data.data);
      }
    } catch (error) {
      console.error('Error fetching payslip details:', error);
      toast.error(error.response?.data?.message || 'Failed to load payslip details');
    }
  };

  const handleDateRangeChange = (field, value) => {
    setDateRange(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const clearDateRange = () => {
    setDateRange({
      startDate: '',
      endDate: ''
    });
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  const formatCurrency = (amount) => {
    return `₱${amount?.toFixed(2) || '0.00'}`;
  };

  const calculateGrossPay = (payslip) => {
    const basic = payslip.basicPay || 0;
    const overtime = payslip.overtimePay || 0;
    const allowances = payslip.allowances || 0;
    const holiday = payslip.holidayPay || 0;
    const thirteenth = payslip.thirteenthMonthPay || 0;
    const bonuses = (payslip.bonuses?.performance || 0) + (payslip.bonuses?.other || 0);
    
    return basic + overtime + allowances + holiday + thirteenth + bonuses;
  };

  const calculateTotalDeductions = (payslip) => {
    const deductions = payslip.deductions || {};
    return (deductions.late || 0) + 
           (deductions.absence || 0) + 
           (deductions.sss || 0) + 
           (deductions.philHealth || 0) + 
           (deductions.pagIbig || 0) +
           (deductions.withholdingTax || 0);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 mx-auto mb-4" 
               style={{ borderColor: colors.accent }}></div>
          <p style={{ color: colors.secondary }}>Loading payslips...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen p-6" style={{ backgroundColor: colors.background }}>
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-3xl font-bold mb-2" style={{ color: colors.primary }}>
            My Payslips
          </h1>
          <p style={{ color: colors.secondary }}>
            View and download your payslip history
          </p>
        </div>

        {/* Date Range Filter */}
        <div className="bg-white rounded-lg shadow-md p-4 mb-6">
          <div className="flex flex-col md:flex-row gap-4 items-end">
            <div className="flex-1">
              <label className="block text-sm font-medium mb-2" style={{ color: colors.secondary }}>
                <FiCalendar className="inline mr-2" />
                Start Date
              </label>
              <input
                type="date"
                value={dateRange.startDate}
                onChange={(e) => handleDateRangeChange('startDate', e.target.value)}
                className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2"
                style={{ borderColor: colors.muted, focusRing: colors.accent }}
              />
            </div>
            <div className="flex-1">
              <label className="block text-sm font-medium mb-2" style={{ color: colors.secondary }}>
                <FiCalendar className="inline mr-2" />
                End Date
              </label>
              <input
                type="date"
                value={dateRange.endDate}
                onChange={(e) => handleDateRangeChange('endDate', e.target.value)}
                className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2"
                style={{ borderColor: colors.muted, focusRing: colors.accent }}
              />
            </div>
            <button
              onClick={clearDateRange}
              className="px-4 py-2 rounded-lg font-medium transition-opacity hover:opacity-90"
              style={{ backgroundColor: colors.muted, color: 'white' }}
            >
              Clear Filter
            </button>
          </div>
        </div>

        {/* Payslips List */}
        {!selectedPayslip ? (
          <div className="bg-white rounded-lg shadow-md overflow-hidden">
            <div className="p-4 border-b" style={{ borderColor: colors.muted }}>
              <h2 className="text-xl font-semibold" style={{ color: colors.primary }}>
                Payslip History ({payslips.length})
              </h2>
            </div>
            
            {payslips.length === 0 ? (
              <div className="p-8 text-center" style={{ color: colors.secondary }}>
                <p>No payslips found for the selected period.</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead style={{ backgroundColor: colors.primary }}>
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-white uppercase tracking-wider">
                        Period
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-white uppercase tracking-wider">
                        Gross Pay
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-white uppercase tracking-wider">
                        Deductions
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-white uppercase tracking-wider">
                        Net Pay
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-white uppercase tracking-wider">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y" style={{ divideColor: colors.muted }}>
                    {payslips.map((payslip) => (
                      <tr key={payslip._id} className="hover:bg-gray-50">
                        <td className="px-6 py-4 whitespace-nowrap" style={{ color: colors.secondary }}>
                          {formatDate(payslip.payrollPeriod)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap font-medium" style={{ color: colors.primary }}>
                          {formatCurrency(calculateGrossPay(payslip))}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap" style={{ color: colors.accent }}>
                          -{formatCurrency(calculateTotalDeductions(payslip))}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap font-semibold" style={{ color: colors.primary }}>
                          {formatCurrency(payslip.netPay)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <button
                            onClick={() => fetchPayslipDetails(payslip._id)}
                            className="inline-flex items-center px-3 py-1 rounded-lg text-sm font-medium transition-opacity hover:opacity-90"
                            style={{ backgroundColor: colors.accent, color: 'white' }}
                          >
                            <FiEye className="mr-1" />
                            View Details
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        ) : (
          /* Detailed Payslip View */
          <div className="bg-white rounded-lg shadow-md overflow-hidden">
            {/* Header */}
            <div className="p-6 border-b" style={{ backgroundColor: colors.primary }}>
              <button
                onClick={() => setSelectedPayslip(null)}
                className="mb-4 text-white hover:underline"
              >
                &larr; Back to List
              </button>
              <h2 className="text-2xl font-bold text-white">Payslip Details</h2>
              <p className="text-white opacity-90">
                Period: {formatDate(selectedPayslip.payrollPeriod)}
              </p>
            </div>

            {/* Staff Information */}
            <div className="p-6 border-b" style={{ borderColor: colors.muted }}>
              <h3 className="text-lg font-semibold mb-3" style={{ color: colors.primary }}>
                Employee Information
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <p className="text-sm" style={{ color: colors.secondary }}>Name</p>
                  <p className="font-medium" style={{ color: colors.primary }}>
                    {selectedPayslip.staffId?.name || 'N/A'}
                  </p>
                </div>
                <div>
                  <p className="text-sm" style={{ color: colors.secondary }}>Position</p>
                  <p className="font-medium" style={{ color: colors.primary }}>
                    {selectedPayslip.staffId?.position || 'N/A'}
                  </p>
                </div>
                <div>
                  <p className="text-sm" style={{ color: colors.secondary }}>SSS Number</p>
                  <p className="font-medium" style={{ color: colors.primary }}>
                    {selectedPayslip.staffId?.sssNumber || 'Not on file'}
                  </p>
                </div>
                <div>
                  <p className="text-sm" style={{ color: colors.secondary }}>PhilHealth Number</p>
                  <p className="font-medium" style={{ color: colors.primary }}>
                    {selectedPayslip.staffId?.philHealthNumber || 'Not on file'}
                  </p>
                </div>
                <div>
                  <p className="text-sm" style={{ color: colors.secondary }}>Pag-IBIG Number</p>
                  <p className="font-medium" style={{ color: colors.primary }}>
                    {selectedPayslip.staffId?.pagIbigNumber || 'Not on file'}
                  </p>
                </div>
                <div>
                  <p className="text-sm" style={{ color: colors.secondary }}>TIN</p>
                  <p className="font-medium" style={{ color: colors.primary }}>
                    {selectedPayslip.staffId?.tinNumber || 'Not on file'}
                  </p>
                </div>
              </div>
            </div>

            {/* Earnings Breakdown */}
            <div className="p-6 border-b" style={{ borderColor: colors.muted }}>
              <h3 className="text-lg font-semibold mb-3" style={{ color: colors.primary }}>
                <FiDollarSign className="inline mr-2" />
                Earnings
              </h3>
              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <span style={{ color: colors.secondary }}>Basic Pay</span>
                  <span className="font-medium" style={{ color: colors.primary }}>
                    {formatCurrency(selectedPayslip.basicPay)}
                  </span>
                </div>
                {selectedPayslip.overtimePay > 0 && (
                  <div className="flex justify-between items-center">
                    <span style={{ color: colors.secondary }}>Overtime Pay</span>
                    <span className="font-medium" style={{ color: colors.primary }}>
                      {formatCurrency(selectedPayslip.overtimePay)}
                    </span>
                  </div>
                )}
                {selectedPayslip.allowances > 0 && (
                  <div className="flex justify-between items-center">
                    <span style={{ color: colors.secondary }}>Allowances</span>
                    <span className="font-medium" style={{ color: colors.primary }}>
                      {formatCurrency(selectedPayslip.allowances)}
                    </span>
                  </div>
                )}
                {selectedPayslip.holidayPay > 0 && (
                  <div className="flex justify-between items-center">
                    <span style={{ color: colors.secondary }}>Holiday Pay</span>
                    <span className="font-medium" style={{ color: colors.primary }}>
                      {formatCurrency(selectedPayslip.holidayPay)}
                    </span>
                  </div>
                )}
                {selectedPayslip.thirteenthMonthPay > 0 && (
                  <div className="flex justify-between items-center">
                    <span style={{ color: colors.secondary }}>13th Month Pay</span>
                    <span className="font-medium" style={{ color: colors.primary }}>
                      {formatCurrency(selectedPayslip.thirteenthMonthPay)}
                    </span>
                  </div>
                )}
                {selectedPayslip.bonuses?.performance > 0 && (
                  <div className="flex justify-between items-center">
                    <span style={{ color: colors.secondary }}>Performance Bonus</span>
                    <span className="font-medium" style={{ color: colors.primary }}>
                      {formatCurrency(selectedPayslip.bonuses.performance)}
                    </span>
                  </div>
                )}
                {selectedPayslip.bonuses?.other > 0 && (
                  <div className="flex justify-between items-center">
                    <span style={{ color: colors.secondary }}>Other Bonus</span>
                    <span className="font-medium" style={{ color: colors.primary }}>
                      {formatCurrency(selectedPayslip.bonuses.other)}
                    </span>
                  </div>
                )}
                <div className="flex justify-between items-center pt-2 border-t font-semibold" 
                     style={{ borderColor: colors.muted, color: colors.primary }}>
                  <span>Total Earnings</span>
                  <span>{formatCurrency(calculateGrossPay(selectedPayslip))}</span>
                </div>
              </div>
            </div>

            {/* Deductions Breakdown */}
            <div className="p-6 border-b" style={{ borderColor: colors.muted }}>
              <h3 className="text-lg font-semibold mb-3" style={{ color: colors.primary }}>
                Deductions
              </h3>
              
              {/* Attendance Deductions */}
              {(selectedPayslip.deductions?.late > 0 || selectedPayslip.deductions?.absence > 0) && (
                <div className="mb-4">
                  <p className="text-sm font-medium mb-2" style={{ color: colors.secondary }}>
                    Attendance Deductions:
                  </p>
                  <div className="ml-4 space-y-1">
                    {selectedPayslip.deductions?.late > 0 && (
                      <div className="flex justify-between items-center text-sm">
                        <span style={{ color: colors.secondary }}>Late</span>
                        <span style={{ color: colors.accent }}>
                          -{formatCurrency(selectedPayslip.deductions.late)}
                        </span>
                      </div>
                    )}
                    {selectedPayslip.deductions?.absence > 0 && (
                      <div className="flex justify-between items-center text-sm">
                        <span style={{ color: colors.secondary }}>Absence</span>
                        <span style={{ color: colors.accent }}>
                          -{formatCurrency(selectedPayslip.deductions.absence)}
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Government Deductions */}
              {(selectedPayslip.deductions?.sss > 0 || 
                selectedPayslip.deductions?.philHealth > 0 || 
                selectedPayslip.deductions?.pagIbig > 0) && (
                <div className="mb-4">
                  <p className="text-sm font-medium mb-2" style={{ color: colors.secondary }}>
                    Government Deductions:
                  </p>
                  <div className="ml-4 space-y-1">
                    {selectedPayslip.deductions?.sss > 0 && selectedPayslip.staffId?.sssNumber && (
                      <div className="flex justify-between items-center text-sm">
                        <span style={{ color: colors.secondary }}>
                          SSS (5%) - {selectedPayslip.staffId.sssNumber}
                        </span>
                        <span style={{ color: colors.accent }}>
                          -{formatCurrency(selectedPayslip.deductions.sss)}
                        </span>
                      </div>
                    )}
                    {selectedPayslip.deductions?.philHealth > 0 && selectedPayslip.staffId?.philHealthNumber && (
                      <div className="flex justify-between items-center text-sm">
                        <span style={{ color: colors.secondary }}>
                          PhilHealth (2.5%) - {selectedPayslip.staffId.philHealthNumber}
                        </span>
                        <span style={{ color: colors.accent }}>
                          -{formatCurrency(selectedPayslip.deductions.philHealth)}
                        </span>
                      </div>
                    )}
                    {selectedPayslip.deductions?.pagIbig > 0 && selectedPayslip.staffId?.pagIbigNumber && (
                      <div className="flex justify-between items-center text-sm">
                        <span style={{ color: colors.secondary }}>
                          Pag-IBIG (2%) - {selectedPayslip.staffId.pagIbigNumber}
                        </span>
                        <span style={{ color: colors.accent }}>
                          -{formatCurrency(selectedPayslip.deductions.pagIbig)}
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Withholding Tax */}
              {selectedPayslip.deductions?.withholdingTax > 0 && (
                <div className="flex justify-between items-center text-sm mb-4">
                  <span style={{ color: colors.secondary }}>Withholding Tax</span>
                  <span style={{ color: colors.accent }}>
                    -{formatCurrency(selectedPayslip.deductions.withholdingTax)}
                  </span>
                </div>
              )}

              <div className="flex justify-between items-center pt-2 border-t font-semibold" 
                   style={{ borderColor: colors.muted, color: colors.accent }}>
                <span>Total Deductions</span>
                <span>-{formatCurrency(calculateTotalDeductions(selectedPayslip))}</span>
              </div>
            </div>

            {/* Net Pay */}
            <div className="p-6" style={{ backgroundColor: colors.primary }}>
              <div className="flex justify-between items-center">
                <span className="text-xl font-bold text-white">Net Pay</span>
                <span className="text-2xl font-bold text-white">
                  {formatCurrency(selectedPayslip.netPay)}
                </span>
              </div>
            </div>

            {/* Download Button */}
            <div className="p-6">
              <button
                className="w-full py-3 rounded-lg font-semibold transition-opacity hover:opacity-90 flex items-center justify-center"
                style={{ backgroundColor: colors.accent, color: 'white' }}
                onClick={() => toast.info('PDF download feature coming soon')}
              >
                <FiDownload className="mr-2" />
                Download PDF
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default StaffPayslip;
