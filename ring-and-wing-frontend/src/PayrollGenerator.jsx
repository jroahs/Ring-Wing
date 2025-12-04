import React, { useState, useEffect } from 'react';
import { 
  FiCalendar, 
  FiUsers, 
  FiFileText, 
  FiDownload, 
  FiRefreshCw,
  FiCheck,
  FiClock,
  FiDollarSign,
  FiArrowLeft,
  FiPrinter
} from 'react-icons/fi';
import { PesoIconSimple } from './components/ui/PesoIconSimple';
import api from './services/apiService';
import { toast } from 'react-toastify';
import BrandedLoadingScreen from './components/ui/BrandedLoadingScreen';
import { generatePayrollBatchPDF } from './utils/pdfGenerator';

const PayrollGenerator = ({ onBack, colors }) => {
  // Default colors if not provided
  const defaultColors = {
    primary: '#2e0304',
    background: '#fefdfd',
    accent: '#f1670f',
    secondary: '#853619',
    muted: '#ac9c9b'
  };
  const c = colors || defaultColors;

  // State
  const [loading, setLoading] = useState(false);
  const [payrollData, setPayrollData] = useState(null);
  const [dateRange, setDateRange] = useState({
    startDate: new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0],
    endDate: new Date(new Date().getFullYear(), new Date().getMonth() + 1, 0).toISOString().split('T')[0]
  });
  const [payFrequency, setPayFrequency] = useState('monthly');
  const [preparedBy, setPreparedBy] = useState('');
  const [approvedBy, setApprovedBy] = useState('');

  // Get current user from localStorage
  useEffect(() => {
    const userData = localStorage.getItem('user');
    if (userData) {
      try {
        const user = JSON.parse(userData);
        setPreparedBy(user.username || user.name || 'System');
      } catch (e) {
        setPreparedBy('System');
      }
    }
  }, []);

  // Format currency
  const formatCurrency = (value) => {
    return `₱${(value || 0).toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };

  // Format date
  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-PH', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  // Generate payroll batch
  const generatePayroll = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('authToken');
      const response = await api.post('/api/payroll/generate-batch', {
        startDate: dateRange.startDate,
        endDate: dateRange.endDate,
        payFrequency,
        preparedBy,
        approvedBy
      }, {
        headers: { Authorization: `Bearer ${token}` }
      });

      if (response.data.success) {
        setPayrollData(response.data.data);
        toast.success('Payroll batch generated successfully');
      } else {
        throw new Error(response.data.message || 'Failed to generate payroll');
      }
    } catch (error) {
      console.error('Error generating payroll:', error);
      toast.error(error.response?.data?.message || error.message || 'Failed to generate payroll batch');
    } finally {
      setLoading(false);
    }
  };

  // Export to PDF
  const handleExportPDF = () => {
    if (!payrollData) {
      toast.error('Please generate payroll first');
      return;
    }
    
    try {
      generatePayrollBatchPDF(payrollData);
      toast.success('Payroll PDF exported successfully');
    } catch (error) {
      console.error('Error exporting PDF:', error);
      toast.error('Failed to export PDF');
    }
  };

  // Render payroll batch header section
  const renderBatchHeader = () => {
    if (!payrollData?.batchHeader) return null;
    
    const { batchHeader } = payrollData;
    
    return (
      <div className="rounded-lg p-6 mb-6" style={{ backgroundColor: c.primary + '10', border: `2px solid ${c.primary}` }}>
        <div className="flex items-center mb-4">
          <FiFileText className="text-2xl mr-3" style={{ color: c.primary }} />
          <h2 className="text-xl font-bold" style={{ color: c.primary }}>
            Payroll Batch Details
          </h2>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          <div className="p-3 rounded" style={{ backgroundColor: c.background }}>
            <p className="text-sm font-medium" style={{ color: c.muted }}>Company</p>
            <p className="text-lg font-semibold" style={{ color: c.primary }}>{batchHeader.companyName}</p>
          </div>
          
          <div className="p-3 rounded" style={{ backgroundColor: c.background }}>
            <p className="text-sm font-medium" style={{ color: c.muted }}>Payroll Period</p>
            <p className="text-lg font-semibold" style={{ color: c.primary }}>
              {formatDate(batchHeader.payrollPeriod.startDate)} - {formatDate(batchHeader.payrollPeriod.endDate)}
            </p>
          </div>
          
          <div className="p-3 rounded" style={{ backgroundColor: c.background }}>
            <p className="text-sm font-medium" style={{ color: c.muted }}>Pay Frequency</p>
            <p className="text-lg font-semibold capitalize" style={{ color: c.primary }}>{batchHeader.payFrequency}</p>
          </div>
          
          <div className="p-3 rounded" style={{ backgroundColor: c.background }}>
            <p className="text-sm font-medium" style={{ color: c.muted }}>Date Generated</p>
            <p className="text-lg font-semibold" style={{ color: c.primary }}>
              {formatDate(batchHeader.dateGenerated)}
            </p>
          </div>
          
          <div className="p-3 rounded" style={{ backgroundColor: c.background }}>
            <p className="text-sm font-medium" style={{ color: c.muted }}>Prepared By</p>
            <p className="text-lg font-semibold" style={{ color: c.primary }}>{batchHeader.preparedBy}</p>
          </div>
          
          <div className="p-3 rounded" style={{ backgroundColor: c.background }}>
            <p className="text-sm font-medium" style={{ color: c.muted }}>Approved By</p>
            <p className="text-lg font-semibold" style={{ color: c.primary }}>
              {batchHeader.approvedBy || <span className="italic text-sm" style={{ color: c.muted }}>Pending</span>}
            </p>
          </div>
        </div>
      </div>
    );
  };

  // Render employee payroll roster table
  const renderPayrollRoster = () => {
    if (!payrollData?.employees || payrollData.employees.length === 0) {
      return (
        <div className="text-center py-8" style={{ color: c.muted }}>
          <FiUsers className="text-4xl mx-auto mb-2" />
          <p>No employee data available</p>
        </div>
      );
    }

    return (
      <div className="rounded-lg overflow-hidden mb-6" style={{ border: `1px solid ${c.muted}40` }}>
        <div className="p-4" style={{ backgroundColor: c.primary }}>
          <h3 className="text-lg font-bold" style={{ color: c.background }}>
            <FiUsers className="inline mr-2" />
            Employee Payroll Roster ({payrollData.employees.length} employees)
          </h3>
        </div>
        
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead style={{ backgroundColor: c.muted + '20' }}>
              <tr>
                <th className="text-left p-2 font-semibold whitespace-nowrap sticky left-0" style={{ color: c.primary, backgroundColor: c.muted + '20', minWidth: '120px' }}>Employee</th>
                <th className="text-left p-2 font-semibold whitespace-nowrap" style={{ color: c.primary, minWidth: '80px' }}>Position</th>
                <th className="text-right p-2 font-semibold whitespace-nowrap" style={{ color: c.primary }}>₱/Hr</th>
                <th className="text-right p-2 font-semibold whitespace-nowrap" style={{ color: c.primary }}>Hrs</th>
                <th className="text-right p-2 font-semibold whitespace-nowrap" style={{ color: c.primary }}>OT</th>
                <th className="text-right p-2 font-semibold whitespace-nowrap" style={{ color: c.primary }}>OT Pay</th>
                <th className="text-right p-2 font-semibold whitespace-nowrap" style={{ color: c.primary }}>Bonus</th>
                <th className="text-right p-2 font-semibold whitespace-nowrap" style={{ color: c.primary }}>Allow</th>
                <th className="text-right p-2 font-semibold whitespace-nowrap" style={{ color: c.primary }}>Late</th>
                <th className="text-right p-2 font-semibold whitespace-nowrap" style={{ color: c.primary }}>SSS</th>
                <th className="text-right p-2 font-semibold whitespace-nowrap" style={{ color: c.primary }}>PH</th>
                <th className="text-right p-2 font-semibold whitespace-nowrap" style={{ color: c.primary }}>HDMF</th>
                <th className="text-right p-2 font-semibold whitespace-nowrap" style={{ color: c.primary }}>CA</th>
                <th className="text-right p-2 font-semibold whitespace-nowrap" style={{ color: c.primary }}>Other</th>
                <th className="text-right p-2 font-semibold whitespace-nowrap" style={{ color: c.secondary }}>Gross</th>
                <th className="text-right p-2 font-semibold whitespace-nowrap" style={{ color: c.accent }}>Ded</th>
                <th className="text-right p-2 font-semibold whitespace-nowrap" style={{ color: c.primary, backgroundColor: c.secondary + '20' }}>Net Pay</th>
              </tr>
            </thead>
            <tbody>
              {payrollData.employees.map((employee, index) => (
                <tr 
                  key={employee.staffId || index} 
                  className="border-b hover:bg-gray-50"
                  style={{ borderColor: c.muted + '30' }}
                >
                  <td className="p-2 sticky left-0" style={{ backgroundColor: c.background }}>
                    <div className="font-medium truncate" style={{ color: c.primary, maxWidth: '120px' }}>{employee.staffName}</div>
                    <div className="text-xs truncate" style={{ color: c.muted, maxWidth: '120px' }}>{employee.employmentType}</div>
                  </td>
                  <td className="p-2 truncate" style={{ color: c.muted, maxWidth: '80px' }}>{employee.position}</td>
                  <td className="p-2 text-right whitespace-nowrap" style={{ color: c.primary }}>{formatCurrency(employee.hourlyRate)}</td>
                  <td className="p-2 text-right" style={{ color: c.primary }}>{employee.hoursWorked.toFixed(1)}</td>
                  <td className="p-2 text-right" style={{ color: c.accent }}>{employee.overtimeHours.toFixed(1)}</td>
                  <td className="p-2 text-right whitespace-nowrap" style={{ color: c.accent }}>{formatCurrency(employee.overtimePay)}</td>
                  <td className="p-2 text-right whitespace-nowrap" style={{ color: c.secondary }}>
                    {formatCurrency((employee.bonuses?.performance || 0) + (employee.bonuses?.other || 0))}
                  </td>
                  <td className="p-2 text-right whitespace-nowrap" style={{ color: c.primary }}>{formatCurrency(employee.allowances)}</td>
                  <td className="p-2 text-right whitespace-nowrap" style={{ color: c.accent }}>
                    {formatCurrency(employee.lateDeduction + employee.absenceDeduction)}
                  </td>
                  <td className="p-2 text-right whitespace-nowrap" style={{ color: c.muted }}>{formatCurrency(employee.sssDeduction)}</td>
                  <td className="p-2 text-right whitespace-nowrap" style={{ color: c.muted }}>{formatCurrency(employee.philHealthDeduction)}</td>
                  <td className="p-2 text-right whitespace-nowrap" style={{ color: c.muted }}>{formatCurrency(employee.pagIbigDeduction)}</td>
                  <td className="p-2 text-right whitespace-nowrap" style={{ color: c.muted }}>{formatCurrency(employee.cashAdvance)}</td>
                  <td className="p-2 text-right whitespace-nowrap" style={{ color: c.muted }}>{formatCurrency(employee.otherDeductions)}</td>
                  <td className="p-2 text-right font-medium whitespace-nowrap" style={{ color: c.secondary }}>{formatCurrency(employee.grossPay)}</td>
                  <td className="p-2 text-right font-medium whitespace-nowrap" style={{ color: c.accent }}>{formatCurrency(employee.totalDeductions)}</td>
                  <td className="p-2 text-right font-bold whitespace-nowrap" style={{ color: c.primary, backgroundColor: c.secondary + '10' }}>
                    {formatCurrency(employee.netPay)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    );
  };

  // Render summary footer
  const renderSummaryFooter = () => {
    if (!payrollData?.summary) return null;

    const { summary } = payrollData;

    return (
      <div className="rounded-lg p-6" style={{ backgroundColor: c.secondary + '10', border: `2px solid ${c.secondary}` }}>
        <h3 className="text-xl font-bold mb-4" style={{ color: c.primary }}>
          <FiDollarSign className="inline mr-2" />
          Payroll Summary
        </h3>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Employees & Hours */}
          <div className="p-4 rounded-lg" style={{ backgroundColor: c.background }}>
            <h4 className="font-semibold mb-3" style={{ color: c.secondary }}>Workforce</h4>
            <div className="space-y-2">
              <div className="flex justify-between">
                <span className="text-sm" style={{ color: c.muted }}>Total Employees:</span>
                <span className="font-medium" style={{ color: c.primary }}>{summary.totalEmployees}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm" style={{ color: c.muted }}>Total Hours Worked:</span>
                <span className="font-medium" style={{ color: c.primary }}>{summary.totalHoursWorked.toFixed(1)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm" style={{ color: c.muted }}>Total Overtime Hours:</span>
                <span className="font-medium" style={{ color: c.accent }}>{summary.totalOvertimeHours.toFixed(1)}</span>
              </div>
            </div>
          </div>

          {/* Earnings */}
          <div className="p-4 rounded-lg" style={{ backgroundColor: c.background }}>
            <h4 className="font-semibold mb-3" style={{ color: c.secondary }}>Earnings</h4>
            <div className="space-y-2">
              <div className="flex justify-between">
                <span className="text-sm" style={{ color: c.muted }}>Basic Pay:</span>
                <span className="font-medium" style={{ color: c.primary }}>{formatCurrency(summary.totalBasicPay)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm" style={{ color: c.muted }}>Overtime Pay:</span>
                <span className="font-medium" style={{ color: c.primary }}>{formatCurrency(summary.totalOvertimePay)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm" style={{ color: c.muted }}>Allowances:</span>
                <span className="font-medium" style={{ color: c.primary }}>{formatCurrency(summary.totalAllowances)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm" style={{ color: c.muted }}>Bonuses:</span>
                <span className="font-medium" style={{ color: c.secondary }}>{formatCurrency(summary.totalBonuses)}</span>
              </div>
              <div className="flex justify-between pt-2 border-t" style={{ borderColor: c.muted + '30' }}>
                <span className="text-sm font-semibold" style={{ color: c.secondary }}>Total Gross Pay:</span>
                <span className="font-bold" style={{ color: c.secondary }}>{formatCurrency(summary.totalGrossPay)}</span>
              </div>
            </div>
          </div>

          {/* Deductions */}
          <div className="p-4 rounded-lg" style={{ backgroundColor: c.background }}>
            <h4 className="font-semibold mb-3" style={{ color: c.accent }}>Deductions</h4>
            <div className="space-y-2">
              <div className="flex justify-between">
                <span className="text-sm" style={{ color: c.muted }}>Late/Undertime:</span>
                <span className="font-medium" style={{ color: c.accent }}>{formatCurrency(summary.totalLateDeductions)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm" style={{ color: c.muted }}>Absences:</span>
                <span className="font-medium" style={{ color: c.accent }}>{formatCurrency(summary.totalAbsenceDeductions)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm" style={{ color: c.muted }}>SSS:</span>
                <span className="font-medium" style={{ color: c.muted }}>{formatCurrency(summary.totalSSSDeductions)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm" style={{ color: c.muted }}>PhilHealth:</span>
                <span className="font-medium" style={{ color: c.muted }}>{formatCurrency(summary.totalPhilHealthDeductions)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm" style={{ color: c.muted }}>Pag-IBIG:</span>
                <span className="font-medium" style={{ color: c.muted }}>{formatCurrency(summary.totalPagIbigDeductions)}</span>
              </div>
              <div className="flex justify-between pt-2 border-t" style={{ borderColor: c.muted + '30' }}>
                <span className="text-sm font-semibold" style={{ color: c.accent }}>Total Deductions:</span>
                <span className="font-bold" style={{ color: c.accent }}>{formatCurrency(summary.totalDeductions)}</span>
              </div>
            </div>
          </div>

          {/* Net Pay */}
          <div className="p-4 rounded-lg" style={{ backgroundColor: c.primary }}>
            <h4 className="font-semibold mb-3" style={{ color: c.background }}>Net Payroll</h4>
            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <span className="text-sm" style={{ color: c.background + 'cc' }}>Gross Pay:</span>
                <span className="font-medium" style={{ color: c.background }}>{formatCurrency(summary.totalGrossPay)}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm" style={{ color: c.background + 'cc' }}>Deductions:</span>
                <span className="font-medium" style={{ color: c.accent }}>- {formatCurrency(summary.totalDeductions)}</span>
              </div>
              <div className="flex justify-between items-center pt-3 mt-3 border-t" style={{ borderColor: c.background + '30' }}>
                <span className="text-lg font-bold" style={{ color: c.background }}>TOTAL NET PAY:</span>
                <span className="text-2xl font-bold" style={{ color: c.accent }}>{formatCurrency(summary.totalNetPay)}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="min-h-screen p-4 md:p-6" style={{ backgroundColor: c.background }}>
      <div className="w-full">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between mb-6 gap-4">
          <div className="flex items-center">
            {onBack && (
              <button
                onClick={onBack}
                className="mr-4 p-2 rounded-lg hover:opacity-80 transition-opacity"
                style={{ backgroundColor: c.muted + '20' }}
              >
                <FiArrowLeft className="text-xl" style={{ color: c.primary }} />
              </button>
            )}
            <div>
              <h1 className="text-2xl md:text-3xl font-bold" style={{ color: c.primary }}>
                <FiPrinter className="inline mr-3" />
                Payroll Generator
              </h1>
              <p className="text-sm mt-1" style={{ color: c.muted }}>
                Generate and export professional payroll reports
              </p>
            </div>
          </div>

          {payrollData && (
            <button
              onClick={handleExportPDF}
              className="flex items-center px-4 py-2 rounded-lg hover:opacity-90 transition-opacity"
              style={{ backgroundColor: c.accent, color: c.background }}
            >
              <FiDownload className="mr-2" />
              Export to PDF
            </button>
          )}
        </div>

        {/* Payroll Configuration */}
        <div className="rounded-lg p-6 mb-6" style={{ backgroundColor: c.background, border: `1px solid ${c.muted}40` }}>
          <h2 className="text-lg font-semibold mb-4" style={{ color: c.primary }}>
            <FiCalendar className="inline mr-2" />
            Payroll Configuration
          </h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
            <div>
              <label className="block text-sm font-medium mb-2" style={{ color: c.primary }}>
                Start Date
              </label>
              <input
                type="date"
                value={dateRange.startDate}
                onChange={(e) => setDateRange(prev => ({ ...prev, startDate: e.target.value }))}
                className="w-full p-2 rounded border focus:ring-2 focus:outline-none"
                style={{ borderColor: c.muted + '60' }}
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium mb-2" style={{ color: c.primary }}>
                End Date
              </label>
              <input
                type="date"
                value={dateRange.endDate}
                onChange={(e) => setDateRange(prev => ({ ...prev, endDate: e.target.value }))}
                className="w-full p-2 rounded border focus:ring-2 focus:outline-none"
                style={{ borderColor: c.muted + '60' }}
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium mb-2" style={{ color: c.primary }}>
                Pay Frequency
              </label>
              <select
                value={payFrequency}
                onChange={(e) => setPayFrequency(e.target.value)}
                className="w-full p-2 rounded border focus:ring-2 focus:outline-none"
                style={{ borderColor: c.muted + '60' }}
              >
                <option value="weekly">Weekly</option>
                <option value="bi-weekly">Bi-Weekly</option>
                <option value="semi-monthly">Semi-Monthly</option>
                <option value="monthly">Monthly</option>
              </select>
            </div>
            
            <div>
              <label className="block text-sm font-medium mb-2" style={{ color: c.primary }}>
                Prepared By
              </label>
              <input
                type="text"
                value={preparedBy}
                onChange={(e) => setPreparedBy(e.target.value)}
                className="w-full p-2 rounded border focus:ring-2 focus:outline-none"
                style={{ borderColor: c.muted + '60' }}
                placeholder="Your name"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium mb-2" style={{ color: c.primary }}>
                Approved By (Optional)
              </label>
              <input
                type="text"
                value={approvedBy}
                onChange={(e) => setApprovedBy(e.target.value)}
                className="w-full p-2 rounded border focus:ring-2 focus:outline-none"
                style={{ borderColor: c.muted + '60' }}
                placeholder="Approver name"
              />
            </div>
          </div>

          <div className="mt-4 flex gap-3">
            <button
              onClick={generatePayroll}
              disabled={loading}
              className="flex items-center px-6 py-2 rounded-lg hover:opacity-90 transition-opacity disabled:opacity-50"
              style={{ backgroundColor: c.primary, color: c.background }}
            >
              {loading ? (
                <>
                  <FiRefreshCw className="mr-2 animate-spin" />
                  Generating...
                </>
              ) : (
                <>
                  <FiCheck className="mr-2" />
                  Generate Payroll
                </>
              )}
            </button>
          </div>
        </div>

        {/* Loading State */}
        {loading && (
          <BrandedLoadingScreen message="Generating payroll batch for all employees..." />
        )}

        {/* Payroll Results */}
        {!loading && payrollData && (
          <>
            {renderBatchHeader()}
            {renderPayrollRoster()}
            {renderSummaryFooter()}
          </>
        )}

        {/* Empty State */}
        {!loading && !payrollData && (
          <div className="text-center py-16 rounded-lg" style={{ backgroundColor: c.muted + '10' }}>
            <FiFileText className="text-6xl mx-auto mb-4" style={{ color: c.muted }} />
            <h3 className="text-xl font-semibold mb-2" style={{ color: c.primary }}>No Payroll Generated</h3>
            <p style={{ color: c.muted }}>
              Configure the payroll period above and click "Generate Payroll" to create a batch report.
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

export default PayrollGenerator;
