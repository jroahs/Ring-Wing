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
  const [dateRange, setDateRange] = useState({
    startDate: new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0],
    endDate: new Date(new Date().getFullYear(), new Date().getMonth() + 1, 0).toISOString().split('T')[0]
  });
  const [payFrequency, setPayFrequency] = useState('monthly');
  const [preparedBy, setPreparedBy] = useState('');
  const [notes, setNotes] = useState('');

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

  // Generate payroll batch as DRAFT
  const generatePayroll = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('authToken');
      const response = await api.post('/api/payroll/batch/create', {
        startDate: dateRange.startDate,
        endDate: dateRange.endDate,
        payFrequency,
        notes: notes || `Prepared by ${preparedBy}`
      }, {
        headers: { Authorization: `Bearer ${token}` }
      });

      if (response.data.success) {
        toast.success('Draft payroll batch created successfully');
        // Redirect to history to view/approve the draft
        toast.info('View the draft in Payroll History to submit for approval', { autoClose: 5000 });
        setTimeout(() => {
          onBack(); // Go back after 2 seconds
        }, 2000);
      } else {
        throw new Error(response.data.message || 'Failed to create payroll batch');
      }
    } catch (error) {
      console.error('Error creating payroll batch:', error);
      toast.error(error.response?.data?.message || error.message || 'Failed to create payroll batch');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen p-4 md:p-6" style={{ backgroundColor: c.background }}>
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="flex items-center mb-6">
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
              <FiFileText className="inline mr-3" />
              Create Payroll Draft
            </h1>
            <p className="text-sm mt-1" style={{ color: c.muted }}>
              Generate a draft payroll batch for review and approval
            </p>
          </div>
        </div>

        {/* Payroll Configuration Form */}
        <div className="rounded-lg p-6 bg-white shadow-md">
          <h2 className="text-lg font-semibold mb-4" style={{ color: c.primary }}>
            <FiCalendar className="inline mr-2" />
            Payroll Configuration
          </h2>
          
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-2" style={{ color: c.primary }}>
                  Start Date <span style={{ color: c.accent }}>*</span>
                </label>
                <input
                  type="date"
                  value={dateRange.startDate}
                  onChange={(e) => setDateRange(prev => ({ ...prev, startDate: e.target.value }))}
                  className="w-full p-2 rounded border focus:ring-2 focus:outline-none"
                  style={{ borderColor: c.muted + '60', color: c.primary, backgroundColor: c.background }}
                  required
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium mb-2" style={{ color: c.primary }}>
                  End Date <span style={{ color: c.accent }}>*</span>
                </label>
                <input
                  type="date"
                  value={dateRange.endDate}
                  onChange={(e) => setDateRange(prev => ({ ...prev, endDate: e.target.value }))}
                  className="w-full p-2 rounded border focus:ring-2 focus:outline-none"
                  style={{ borderColor: c.muted + '60', color: c.primary, backgroundColor: c.background }}
                  required
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-2" style={{ color: c.primary }}>
                  Pay Frequency <span style={{ color: c.accent }}>*</span>
                </label>
                <select
                  value={payFrequency}
                  onChange={(e) => setPayFrequency(e.target.value)}
                  className="w-full p-2 rounded border focus:ring-2 focus:outline-none"
                  style={{ borderColor: c.muted + '60', color: c.primary, backgroundColor: c.background }}
                >
                  <option value="weekly">Weekly</option>
                  <option value="bi-weekly">Bi-Weekly</option>
                  <option value="semi-monthly">Semi-Monthly</option>
                  <option value="monthly">Monthly</option>
                </select>
              </div>
              
              <div>
                <label className="block text-sm font-medium mb-2" style={{ color: c.primary }}>
                  Prepared By <span style={{ color: c.accent }}>*</span>
                </label>
                <input
                  type="text"
                  value={preparedBy}
                  onChange={(e) => setPreparedBy(e.target.value)}
                  className="w-full p-2 rounded border focus:ring-2 focus:outline-none"
                  style={{ borderColor: c.muted + '60', color: c.primary, backgroundColor: c.background }}
                  placeholder="Your name"
                  required
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium mb-2" style={{ color: c.primary }}>
                Notes (Optional)
              </label>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                className="w-full p-2 rounded border focus:ring-2 focus:outline-none"
                style={{ borderColor: c.muted + '60', color: c.primary, backgroundColor: c.background }}
                placeholder="Add any notes about this payroll batch..."
                rows={3}
              />
            </div>
          </div>

          <div className="mt-6 flex gap-3">
            <button
              onClick={generatePayroll}
              disabled={loading || !dateRange.startDate || !dateRange.endDate || !preparedBy}
              className="flex items-center px-6 py-3 rounded-lg hover:opacity-90 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed"
              style={{ backgroundColor: c.primary, color: c.background }}
            >
              {loading ? (
                <>
                  <FiRefreshCw className="mr-2 animate-spin" />
                  Creating Draft...
                </>
              ) : (
                <>
                  <FiFileText className="mr-2" />
                  Create Draft Batch
                </>
              )}
            </button>

            {onBack && !loading && (
              <button
                onClick={onBack}
                className="flex items-center px-6 py-3 rounded-lg hover:opacity-90 transition-opacity"
                style={{ backgroundColor: c.muted + '20', color: c.primary }}
              >
                Cancel
              </button>
            )}
          </div>
        </div>

        {/* Success State Indicator */}
        {loading && (
          <div className="mt-6 rounded-lg p-6 bg-white shadow-md text-center">
            <BrandedLoadingScreen message="Creating draft payroll batch..." />
            <p className="text-sm mt-4" style={{ color: c.muted }}>
              Calculating hours, overtime, deductions, and net pay for all active employees...
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

export default PayrollGenerator;
