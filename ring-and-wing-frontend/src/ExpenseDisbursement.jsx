import { useState, useEffect, useMemo } from 'react';
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip } from 'recharts';
import { motion, AnimatePresence } from 'framer-motion';
import { FiFilter, FiX, FiTrendingUp, FiCheck, FiXCircle, FiClock } from 'react-icons/fi';
import { useNavigate } from 'react-router-dom';
import ExpenseCard from './components/ui/ExpenseCard.jsx';
import ExpenseFilters from './components/ui/ExpenseFilters.jsx';
import ExpenseSummary from './components/ui/ExpenseSummary.jsx';
import ExpenseFilterPanel from './components/ui/ExpenseFilterPanel.jsx';
import { useMultiTabLogout } from './hooks/useMultiTabLogout';
import { businessDateKey } from './utils/businessDate';
import { generateExpenseReportPDF } from './utils/pdfGenerator';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

// Helper to get auth token
const getAuthHeaders = () => {
  const token = localStorage.getItem('authToken');
  return {
    'Content-Type': 'application/json',
    'Authorization': token ? `Bearer ${token}` : ''
  };
};

// Helper to check if user is admin/manager
const isAdminOrManager = (user) => {
  if (!user) return false;
  return user.role === 'manager' || 
         ['shift_manager', 'general_manager', 'admin'].includes(user.position);
};

const colors = {
  primary: '#2e0304',
  background: '#fefdfd',
  accent: '#f1670f',
  secondary: '#853619',
  muted: '#ac9c9b',
  activeBg: '#f1670f20',
  activeBorder: '#f1670f',
  hoverBg: '#f1670f10'
};

const ExpenseTracker = ({ colors }) => {
  // Enable multi-tab logout synchronization
  useMultiTabLogout();
  const navigate = useNavigate();
  
  // Get current user info
  const [currentUser, setCurrentUser] = useState(null);
  const [isAdmin, setIsAdmin] = useState(false);
  
  const [expenses, setExpenses] = useState([]);
  const [pendingApprovals, setPendingApprovals] = useState([]);
  const [activeTab, setActiveTab] = useState('all'); // 'all', 'pending'
  const [formData, setFormData] = useState({
    date: businessDateKey(new Date()),
    amount: '',
    category: '',
    description: '',
    paymentMethod: 'Cash'
  });
  const [showModal, setShowModal] = useState(false);
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [selectedExpense, setSelectedExpense] = useState(null);
  const [expenseToReject, setExpenseToReject] = useState(null);
  const [rejectionReason, setRejectionReason] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [dateRange, setDateRange] = useState(() => {
    const todayKey = businessDateKey(new Date());
    return {
      start: `${todayKey.slice(0, 7)}-01`,
      end: todayKey
    };
  });
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [paymentStatus, setPaymentStatus] = useState('All');
  const [windowWidth, setWindowWidth] = useState(window.innerWidth);
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);
  const [lastResetCheck, setLastResetCheck] = useState(localStorage.getItem('lastExpenseResetCheck') || '');
  const [resetMessage, setResetMessage] = useState('');
  const [showFilterPanel, setShowFilterPanel] = useState(false);
  const [expandedChart, setExpandedChart] = useState(null); // 'daily' or 'monthly'

  const [showMarkPaidModal, setShowMarkPaidModal] = useState(false);
  const [expenseToMarkPaid, setExpenseToMarkPaid] = useState(null);
  const [markPaidPaymentMethod, setMarkPaidPaymentMethod] = useState('Cash');

  const [showAuditLog, setShowAuditLog] = useState(false);
  const [auditLog, setAuditLog] = useState([]);
  const [auditLogLoading, setAuditLogLoading] = useState(false);
  const [auditLogError, setAuditLogError] = useState('');

  const [showExportPdfModal, setShowExportPdfModal] = useState(false);
  const [exportPdfLoading, setExportPdfLoading] = useState(false);
  const [exportScope, setExportScope] = useState('current'); // current | month | custom
  const [exportMonth, setExportMonth] = useState(() => businessDateKey(new Date()).slice(0, 7));
  const [exportCustomRange, setExportCustomRange] = useState(() => {
    const todayKey = businessDateKey(new Date());
    return {
      start: `${todayKey.slice(0, 7)}-01`,
      end: todayKey
    };
  });
  const [exportCategory, setExportCategory] = useState('All');
  const [exportPaymentStatus, setExportPaymentStatus] = useState('All');
  const [exportSearch, setExportSearch] = useState('');

  // Responsive margin calculations
  const isLargeScreen = windowWidth >= 1920;
  const isMediumScreen = windowWidth >= 768;
  const pageMargin = isLargeScreen ? '8rem' : isMediumScreen ? '5rem' : '0';

  const categories = [
    'Food Supplies',
    'Utilities',
    'Salaries',
    'Equipment',
    'Maintenance',
    'Marketing',
    'Other'
  ];

  useEffect(() => {
    const handleResize = () => {
      const width = window.innerWidth;
      setWindowWidth(width);
      setIsMobile(width < 768);
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Get current user on mount
  useEffect(() => {
    const userData = localStorage.getItem('userData');
    if (userData) {
      try {
        const user = JSON.parse(userData);
        setCurrentUser(user);
        setIsAdmin(isAdminOrManager(user));
      } catch (error) {
        console.error('Error parsing user data:', error);
      }
    }
  }, []);

  // Fetch pending approvals for admin
  useEffect(() => {
    const fetchPendingApprovals = async () => {
      if (!isAdmin) return;
      try {
        const response = await fetch(`${API_URL}/api/expenses/pending-approvals`, {
          headers: getAuthHeaders()
        });
        if (response.ok) {
          const result = await response.json();
          // Handle both { success, data } and direct array format
          const data = result.data || result;
          setPendingApprovals(Array.isArray(data) ? data : []);
        }
      } catch (error) {
        console.error('Error fetching pending approvals:', error);
      }
    };
    fetchPendingApprovals();
  }, [isAdmin]);

  useEffect(() => {
    const fetchExpenses = async () => {
      try {
        const params = new URLSearchParams();
        if (searchTerm) params.append('search', searchTerm);
        if (dateRange.start) params.append('startDate', dateRange.start);
        if (dateRange.end) params.append('endDate', dateRange.end);
        if (selectedCategory !== 'All') params.append('category', selectedCategory);
        
        // Add payment status filters
        if (paymentStatus === 'Paid') {
          params.append('disbursed', 'true');
        } else if (paymentStatus === 'Pending') {
          params.append('disbursed', 'false');
        }

        const response = await fetch(`${API_URL}/api/expenses?${params}`, {
          headers: getAuthHeaders()
        });
        
        if (!response.ok) {
          console.error('Failed to fetch expenses:', response.status);
          setExpenses([]);
          return;
        }
        
        const result = await response.json();
        // Handle both { success, data } and direct array format
        const data = result.data || result;
        setExpenses(Array.isArray(data) ? data : []);
      } catch (error) {
        console.error('Error fetching expenses:', error);
        setExpenses([]);
      }
    };
    fetchExpenses();
  }, [searchTerm, dateRange, selectedCategory, paymentStatus]);

  useEffect(() => {
    const fetchAuditLogs = async () => {
      if (!showAuditLog) return;
      setAuditLogLoading(true);
      setAuditLogError('');
      try {
        const response = await fetch(`${API_URL}/api/expense-audit-logs?limit=200`, {
          headers: getAuthHeaders()
        });
        if (!response.ok) {
          throw new Error(`Failed to fetch audit logs (${response.status})`);
        }
        const result = await response.json();
        const logs = result.logs || result.data || result;
        setAuditLog(Array.isArray(logs) ? logs : []);
      } catch (error) {
        console.error('Error fetching expense audit logs:', error);
        setAuditLog([]);
        setAuditLogError(error.message || 'Failed to fetch audit logs');
      } finally {
        setAuditLogLoading(false);
      }
    };
    fetchAuditLogs();
  }, [showAuditLog]);
  const checkAndGetDailyStats = async () => {
    const now = new Date();

    const getBusinessDateKey = (date = new Date()) => {
      return new Intl.DateTimeFormat('en-CA', {
        timeZone: 'Asia/Manila',
        year: 'numeric',
        month: '2-digit',
        day: '2-digit'
      }).format(date);
    };

    const todayKey = getBusinessDateKey(now);
    const lastResetKey = (() => {
      if (!lastResetCheck) return null;
      if (/^\d{4}-\d{2}-\d{2}$/.test(lastResetCheck)) return lastResetCheck;
      const parsed = new Date(lastResetCheck);
      return isNaN(parsed.getTime()) ? null : getBusinessDateKey(parsed);
    })();

    // If last check was before today, get updated stats
    if (lastResetKey !== todayKey) {
      try {
        const response = await fetch(`${API_URL}/api/expenses/reset-disbursement`, {
          method: 'POST',
          headers: getAuthHeaders()
        });
        
        if (response.ok) {
          // Update last check time
          setLastResetCheck(todayKey);
          localStorage.setItem('lastExpenseResetCheck', todayKey);
          
          // Get stats data from response
          const statsData = await response.json();
          
          // Show daily stats message
          setResetMessage(`Today's expenses: ${statsData.todayCount}, Total paid expenses: ${statsData.allTimeCount}`);
          
          // Clear message after 10 seconds
          setTimeout(() => {
            setResetMessage('');
          }, 10000);
        }
      } catch (error) {
        console.error('Failed to get disbursement statistics:', error);
      }
    }
  };
  useEffect(() => {
    checkAndGetDailyStats();
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      // Validate fields before submitting
      if (!formData.date || !formData.amount || !formData.category || !formData.description) {
        alert('Please fill all required fields');
        return;
      }

      const payload = {
        date: new Date(formData.date).toISOString(),
        amount: parseFloat(formData.amount),
        category: formData.category,
        description: formData.description,
        paymentMethod: formData.paymentMethod || 'Cash',
        disbursed: false
      };

      if (isNaN(payload.amount) || payload.amount <= 0) {
        alert('Please enter a valid amount');
        return;
      }

      const response = await fetch(`${API_URL}/api/expenses`, {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify(payload)
      });

      const responseData = await response.json();
      
      if (!response.ok) {
        throw new Error(responseData.message || 'Failed to create expense');
      }

      // Handle { success, data } response format
      const newExpense = responseData.data || responseData;
      setExpenses(prev => [newExpense, ...prev]);
      setShowModal(false);
      setFormData({
        date: businessDateKey(new Date()),
        amount: '',
        category: '',
        description: '',
        paymentMethod: 'Cash'
      });
      
    } catch (error) {
      console.error('Error creating expense:', error);
      alert(error.message);
    }
  };  const markAsDisbursed = async (id) => {
    try {
      const response = await fetch(`${API_URL}/api/expenses/${id}`, {
        method: 'PUT',
        headers: getAuthHeaders(),
        body: JSON.stringify({ 
          disbursed: true,
          disbursementDate: new Date().toISOString()
        })
      });

      if (!response.ok) throw new Error('Update failed');
      
      const updatedExpense = await response.json();
      setExpenses(prev =>
        prev.map(exp => exp._id === updatedExpense._id ? updatedExpense : exp)
      );
    } catch (error) {
      console.error('Error updating expense:', error);
    }
  };

  const makePermanent = async (id) => {
    try {
      const response = await fetch(`${API_URL}/api/expenses/${id}`, {
        method: 'PUT',
        headers: getAuthHeaders(),
        body: JSON.stringify({ 
          disbursed: true,
          permanent: true,
          disbursementDate: new Date().toISOString()
        })
      });

      if (!response.ok) throw new Error('Update failed');
      
      const updatedExpense = await response.json();
      setExpenses(prev =>
        prev.map(exp => exp._id === updatedExpense._id ? updatedExpense : exp)
      );
    } catch (error) {
      console.error('Error updating expense:', error);
    }
  };
  
  // New function that handles both paid and permanent status in one call
  const markAsPaidAndPermanent = async (id, paymentMethod = null) => {
    try {
      const response = await fetch(`${API_URL}/api/expenses/${id}/mark-paid`, {
        method: 'POST',
        headers: getAuthHeaders(),
        ...(paymentMethod ? { body: JSON.stringify({ paymentMethod }) } : {})
      });

      if (!response.ok) throw new Error('Update failed');
      
      const result = await response.json();
      const updatedExpense = result.data || result;
      setExpenses(prev =>
        prev.map(exp => exp._id === updatedExpense._id ? updatedExpense : exp)
      );
      // Also remove from pending if it was there
      setPendingApprovals(prev => prev.filter(exp => exp._id !== id));
    } catch (error) {
      console.error('Error updating expense:', error);
    }
  };

  const handleMarkPaidClick = (expense) => {
    if (!expense) return;
    if (!expense.paymentMethod) {
      setExpenseToMarkPaid(expense);
      setMarkPaidPaymentMethod('Cash');
      setShowMarkPaidModal(true);
      return;
    }
    markAsPaidAndPermanent(expense._id);
  };

  // Approve expense request
  const approveExpense = async (id) => {
    try {
      const response = await fetch(`${API_URL}/api/expenses/${id}/approve`, {
        method: 'POST',
        headers: getAuthHeaders()
      });

      if (!response.ok) throw new Error('Approval failed');
      
      const result = await response.json();
      const updatedExpense = result.data || result;
      // Remove from pending approvals
      setPendingApprovals(prev => prev.filter(exp => exp._id !== id));
      // Add to expenses list
      setExpenses(prev => [updatedExpense, ...prev]);
    } catch (error) {
      console.error('Error approving expense:', error);
      alert('Failed to approve expense');
    }
  };

  // Reject expense request
  const rejectExpense = async () => {
    if (!expenseToReject || !rejectionReason.trim()) {
      alert('Please provide a rejection reason');
      return;
    }
    try {
      const response = await fetch(`${API_URL}/api/expenses/${expenseToReject._id}/reject`, {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({ reason: rejectionReason })
      });

      if (!response.ok) throw new Error('Rejection failed');
      
      // Remove from pending approvals
      setPendingApprovals(prev => prev.filter(exp => exp._id !== expenseToReject._id));
      setShowRejectModal(false);
      setExpenseToReject(null);
      setRejectionReason('');
    } catch (error) {
      console.error('Error rejecting expense:', error);
      alert('Failed to reject expense');
    }
  };

  const getLastDayOfMonth = (year, monthIndexZeroBased) => new Date(year, monthIndexZeroBased + 1, 0);

  const getMonthRange = (yyyyMm) => {
    if (!yyyyMm || !/^\d{4}-\d{2}$/.test(yyyyMm)) return { start: '', end: '' };
    const [yearStr, monthStr] = yyyyMm.split('-');
    const year = Number(yearStr);
    const monthIndex = Number(monthStr) - 1;
    const start = `${yearStr}-${monthStr}-01`;
    const endDate = getLastDayOfMonth(year, monthIndex);
    const end = businessDateKey(endDate);
    return { start, end };
  };

  const fetchExpensesForExport = async ({ start, end, category, paymentStatus, search }) => {
    const params = new URLSearchParams();
    if (search) params.append('search', search);
    if (start) params.append('startDate', start);
    if (end) params.append('endDate', end);
    if (category && category !== 'All') params.append('category', category);

    if (paymentStatus === 'Paid') params.append('disbursed', 'true');
    if (paymentStatus === 'Pending') params.append('disbursed', 'false');

    const response = await fetch(`${API_URL}/api/expenses?${params.toString()}`, {
      headers: getAuthHeaders()
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch expenses (${response.status})`);
    }

    const result = await response.json();
    const data = result.data || result;
    return Array.isArray(data) ? data : [];
  };

  const handleExportPdf = async () => {
    try {
      setExportPdfLoading(true);

      let range;
      if (exportScope === 'month') {
        range = getMonthRange(exportMonth);
      } else if (exportScope === 'custom') {
        range = { start: exportCustomRange.start || '', end: exportCustomRange.end || '' };
      } else {
        // current
        range = { start: dateRange.start || '', end: dateRange.end || '' };
      }

      const categoryToUse = exportScope === 'current' ? selectedCategory : exportCategory;
      const paymentStatusToUse = exportScope === 'current' ? paymentStatus : exportPaymentStatus;
      const searchToUse = exportScope === 'current' ? searchTerm : exportSearch;

      const exportExpenses = await fetchExpensesForExport({
        start: range.start,
        end: range.end,
        category: categoryToUse,
        paymentStatus: paymentStatusToUse,
        search: searchToUse
      });

      const periodLabel = (() => {
        if (exportScope === 'month' && exportMonth) {
          const [y, m] = exportMonth.split('-');
          return new Date(Number(y), Number(m) - 1).toLocaleDateString('en-PH', { month: 'long', year: 'numeric' });
        }
        if (range.start || range.end) {
          return `Period: ${range.start || 'Start'} to ${range.end || 'End'}`;
        }
        return 'All Records';
      })();

      generateExpenseReportPDF({
        expenses: exportExpenses,
        filters: {
          category: categoryToUse,
          paymentStatus: paymentStatusToUse,
          search: searchToUse
        },
        periodLabel,
        generatedBy: currentUser?.username || currentUser?.name || ''
      });

      setShowExportPdfModal(false);
    } catch (error) {
      console.error('Export PDF failed:', error);
      alert(error.message || 'Failed to export PDF');
    } finally {
      setExportPdfLoading(false);
    }
  };
  // Helper function to count active filters
  const getActiveFiltersCount = () => {
    let count = 0;
    if (searchTerm) count++;
    if (dateRange.start || dateRange.end) count++;
    if (selectedCategory !== 'All') count++;
    if (paymentStatus !== 'All') count++;
    return count;
  };

  const disbursedExpenses = useMemo(() => 
    Array.isArray(expenses) ? expenses.filter(exp => exp.disbursed) : [], 
    [expenses]
  );
  const dailyDisbursements = useMemo(() => {
    const daily = disbursedExpenses.reduce((acc, exp) => {
      // Use disbursementDate instead of date for the chart
      const date = exp.disbursementDate
        ? businessDateKey(new Date(exp.disbursementDate))
        : businessDateKey(new Date());
      
      acc[date] = (acc[date] || 0) + exp.amount;
      return acc;
    }, {});
    
    return Object.entries(daily).map(([date, amount]) => ({
      date,
      amount,
      formattedDate: new Date(`${date}T00:00:00+08:00`).toLocaleDateString('en-PH', {
        day: 'numeric',
        month: 'short'
      })
    })).sort((a, b) => new Date(`${a.date}T00:00:00+08:00`) - new Date(`${b.date}T00:00:00+08:00`));
  }, [disbursedExpenses]);

  const monthlyDisbursements = useMemo(() => {
    const monthly = disbursedExpenses.reduce((acc, exp) => {
      const dateKey = businessDateKey(new Date(exp.date));
      const monthYear = dateKey.slice(0, 7);
      acc[monthYear] = (acc[monthYear] || 0) + exp.amount;
      return acc;
    }, {});

    return Object.entries(monthly).map(([monthYear, amount]) => ({
      monthYear,
      amount,
      formattedMonth: new Date(monthYear + '-01').toLocaleDateString('en-PH', {
        month: 'long', 
        year: 'numeric'
      })
    })).sort((a, b) => new Date(a.monthYear) - new Date(b.monthYear));
  }, [disbursedExpenses]);

  return (
    <div 
      className="flex min-h-screen" 
      style={{ 
        backgroundColor: colors.background, 
        overflowX: 'hidden',
        marginLeft: pageMargin,
        transition: 'margin 0.3s ease-in-out'
      }}
    >
      <div className={`flex-1 transition-all duration-300`}>
        <div className="p-6 md:p-8 pt-24 md:pt-8">
          <div className="mb-8">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-3xl font-bold" style={{ color: colors.primary }}>Expense Management</h1>
                <p className="mt-2 text-sm" style={{ color: colors.muted }}>
                  Track and manage daily business expenses. Mark expenses as paid when they are processed.
                </p>
              </div>
              
              {/* Filter Button */}
              <button
                onClick={() => setShowFilterPanel(!showFilterPanel)}
                className={`
                  flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-lg border transition-all duration-200
                  ${getActiveFiltersCount() > 0 
                    ? 'bg-orange-50 text-orange-700 border-orange-200 hover:bg-orange-100' 
                    : 'bg-white text-gray-600 border-gray-300 hover:bg-gray-50'
                  }
                `}
              >
                <FiFilter className="w-4 h-4" />
                Filter Expenses
                {getActiveFiltersCount() > 0 && (
                  <span className="bg-orange-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">
                    {getActiveFiltersCount()}
                  </span>
                )}
              </button>
            </div>
          </div>

          {resetMessage && (
            <div className="mb-4 p-3 rounded-lg bg-green-50 border border-green-200 flex items-center justify-between">
              <span className="text-green-800 flex items-center">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                </svg>
                {resetMessage}
              </span>
              <button 
                onClick={() => setResetMessage('')}
                className="text-green-700 hover:text-green-900"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                </svg>
              </button>
            </div>
          )}          {/* Slide-out Filter Panel */}
          <ExpenseFilterPanel 
            colors={colors}
            searchTerm={searchTerm}
            setSearchTerm={setSearchTerm}
            dateRange={dateRange}
            setDateRange={setDateRange}
            selectedCategory={selectedCategory}
            setSelectedCategory={setSelectedCategory}
            paymentStatus={paymentStatus}
            setPaymentStatus={setPaymentStatus}
            categories={categories}
            totalExpenses={expenses.length}
            activeFiltersCount={getActiveFiltersCount()}
            isOpen={showFilterPanel}
            onClose={() => setShowFilterPanel(false)}
          />

          {/* Tabs for All Expenses vs Pending Approvals */}
          {isAdmin && (
            <div className="flex gap-2 mb-6 mx-6">
              <button
                onClick={() => setActiveTab('all')}
                className={`px-4 py-2 rounded-lg font-medium transition-all ${
                  activeTab === 'all' 
                    ? 'text-white' 
                    : 'text-gray-600 bg-gray-100 hover:bg-gray-200'
                }`}
                style={activeTab === 'all' ? { backgroundColor: colors.accent } : {}}
              >
                All Expenses
              </button>
              <button
                onClick={() => setActiveTab('pending')}
                className={`px-4 py-2 rounded-lg font-medium transition-all flex items-center gap-2 ${
                  activeTab === 'pending' 
                    ? 'text-white' 
                    : 'text-gray-600 bg-gray-100 hover:bg-gray-200'
                }`}
                style={activeTab === 'pending' ? { backgroundColor: colors.accent } : {}}
              >
                <FiClock className="w-4 h-4" />
                Pending Approvals
                {pendingApprovals.length > 0 && (
                  <span className="text-white text-xs rounded-lg w-5 h-5 flex items-center justify-center" style={{ backgroundColor: colors.secondary }}>
                    {pendingApprovals.length}
                  </span>
                )}
              </button>
            </div>
          )}

          {/* Pending Approvals Section */}
          {isAdmin && activeTab === 'pending' && (
            <div className="mx-6 mb-6">
              <div className="rounded-xl overflow-hidden shadow-lg" style={{ border: `1px solid ${colors.muted}20` }}>
                {pendingApprovals.length > 0 ? (
                  <div className="divide-y" style={{ borderColor: colors.muted + '20' }}>
                    {pendingApprovals.map(expense => (
                      <div key={expense._id} className="p-4 bg-white hover:bg-gray-50 transition-colors">
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-2">
                              <span className="px-2 py-1 rounded-lg text-xs font-medium" style={{ backgroundColor: colors.activeBg, color: colors.accent }}>
                                For Approval
                              </span>
                              <span className="text-sm text-gray-500">
                                {new Date(expense.date).toLocaleDateString('en-PH', { month: 'short', day: 'numeric', year: 'numeric' })}
                              </span>
                            </div>
                            <h4 className="font-semibold text-gray-900">{expense.description}</h4>
                            <p className="text-sm text-gray-600 mt-1">
                              Requested by: <span className="font-medium">{expense.requesterName || 'Unknown'}</span>
                              {expense.requesterPosition && (
                                <span className="text-gray-400"> ({expense.requesterPosition})</span>
                              )}
                            </p>
                            <div className="flex items-center gap-4 mt-2 text-sm">
                              <span className="px-2 py-1 rounded-lg" style={{ backgroundColor: colors.muted + '20', color: colors.secondary }}>{expense.category}</span>
                              <span className="font-semibold" style={{ color: colors.accent }}>
                                ₱{expense.amount?.toLocaleString('en-PH', { minimumFractionDigits: 2 })}
                              </span>
                            </div>
                          </div>
                          <div className="flex gap-2 ml-4">
                            <button
                              onClick={() => approveExpense(expense._id)}
                              className="flex items-center gap-1 px-3 py-2 rounded-lg text-white hover:opacity-90 transition-colors"
                              style={{ backgroundColor: colors.accent }}
                            >
                              <FiCheck className="w-4 h-4" />
                              Approve
                            </button>
                            <button
                              onClick={() => { setExpenseToReject(expense); setShowRejectModal(true); }}
                              className="flex items-center gap-1 px-3 py-2 rounded-lg text-white hover:opacity-90 transition-colors"
                              style={{ backgroundColor: colors.secondary }}
                            >
                              <FiXCircle className="w-4 h-4" />
                              Reject
                            </button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="p-12 text-center">
                    <FiCheck className="w-12 h-12 mx-auto mb-4 text-green-500" />
                    <h3 className="text-lg font-medium text-gray-900">All caught up!</h3>
                    <p className="text-gray-500 mt-1">No pending expense requests to review</p>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Main Content - Only show when on 'all' tab or not admin */}
          {(activeTab === 'all' || !isAdmin) && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="md:col-span-2 space-y-6">              {/* Active Filters Summary */}
              {getActiveFiltersCount() > 0 && (
                <div className="p-4 rounded-lg border mx-6" style={{ backgroundColor: colors.activeBg, borderColor: colors.accent + '40' }}>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium" style={{ color: colors.accent }}>
                        Active Filters:
                      </span>
                      <div className="flex flex-wrap gap-2">
                        {searchTerm && (
                          <span className="px-2 py-1 rounded-full text-xs font-medium flex items-center gap-1" style={{ backgroundColor: colors.accent, color: colors.background }}>
                            Search: "{searchTerm}"
                            {!showFilterPanel && (
                              <button
                                onClick={() => setSearchTerm('')}
                                className="ml-1 hover:bg-white hover:bg-opacity-20 rounded-full p-0.5"
                                style={{ color: colors.background }}
                              >
                                ×
                              </button>
                            )}
                          </span>
                        )}
                        {selectedCategory !== 'All' && (
                          <span className="px-2 py-1 rounded-full text-xs font-medium flex items-center gap-1" style={{ backgroundColor: colors.accent, color: colors.background }}>
                            Category: {selectedCategory}
                            {!showFilterPanel && (
                              <button
                                onClick={() => setSelectedCategory('All')}
                                className="ml-1 hover:bg-white hover:bg-opacity-20 rounded-full p-0.5"
                                style={{ color: colors.background }}
                              >
                                ×
                              </button>
                            )}
                          </span>
                        )}
                        {paymentStatus !== 'All' && (
                          <span className="px-2 py-1 rounded-full text-xs font-medium flex items-center gap-1" style={{ backgroundColor: colors.accent, color: colors.background }}>
                            Status: {paymentStatus}
                            {!showFilterPanel && (
                              <button
                                onClick={() => setPaymentStatus('All')}
                                className="ml-1 hover:bg-white hover:bg-opacity-20 rounded-full p-0.5"
                                style={{ color: colors.background }}
                              >
                                ×
                              </button>
                            )}
                          </span>
                        )}
                        {(dateRange.start || dateRange.end) && (
                          <span className="px-2 py-1 rounded-full text-xs font-medium flex items-center gap-1" style={{ backgroundColor: colors.accent, color: colors.background }}>
                            Date: {dateRange.start || 'Start'} - {dateRange.end || 'End'}
                            {!showFilterPanel && (
                              <button
                                onClick={() => setDateRange({ start: '', end: '' })}
                                className="ml-1 hover:bg-white hover:bg-opacity-20 rounded-full p-0.5"
                                style={{ color: colors.background }}
                              >
                                ×
                              </button>
                            )}
                          </span>
                        )}
                      </div>
                    </div>
                    <span className="text-sm" style={{ color: colors.muted }}>
                      {expenses.length} result{expenses.length !== 1 ? 's' : ''}
                    </span>
                  </div>
                </div>
              )}
              
              <div className="rounded-xl overflow-auto shadow-lg mx-6" style={{ border: `1px solid ${colors.muted}20`, maxHeight: '520px' }}>
                <table className="w-full">
                  <thead style={{ backgroundColor: colors.activeBg }}>
                    <tr>
                      {['Date', 'Description', 'Category', 'Method', 'Amount', 'Status'].map(header => (
                        <th key={header} className="p-4 text-left text-sm font-semibold" style={{ color: colors.primary }}>{header}</th>
                      ))}
                    </tr>
                  </thead>                  <tbody>
                    {Array.isArray(expenses) && expenses.length > 0 ? expenses.map(expense => (
                      <tr
                        key={expense._id}
                        className="group hover:bg-opacity-10 transition-colors"
                        style={{ backgroundColor: expense.id % 2 === 0 ? colors.muted + '10' : 'transparent' }}
                      >
                        <td className="p-4 text-sm font-medium" style={{ color: colors.primary }}>
                          {new Date(expense.date).toLocaleDateString('en-PH', { year: 'numeric', month: 'short', day: 'numeric' })}
                        </td>
                        <td className="p-4 text-sm" style={{ color: colors.secondary }}>{expense.description}</td>
                        <td className="p-4">
                          <div className="flex items-center gap-2">
                            <span
                              className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium"
                              style={{ backgroundColor: colors.activeBg, color: colors.accent }}
                            >
                              {expense.category}
                            </span>
                            {expense.sourceType === 'payroll_batch' && (
                              <span
                                className="inline-flex items-center px-2 py-1 rounded-full text-[11px] font-semibold"
                                style={{ backgroundColor: colors.secondary + '20', color: colors.secondary }}
                                title="Auto-created from payroll batch"
                              >
                                Payroll
                              </span>
                            )}
                            {(expense.sourceType === 'inventory_restock' || expense.sourceType === 'inventory_item_create') && (
                              <span
                                className="inline-flex items-center px-2 py-1 rounded-full text-[11px] font-semibold"
                                style={{ backgroundColor: colors.primary + '20', color: colors.primary }}
                                title="Auto-created from inventory"
                              >
                                Inventory
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="p-4 text-sm" style={{ color: colors.secondary }}>{expense.paymentMethod || '—'}</td>
                        <td className="p-4 text-right text-sm font-medium" style={{ color: colors.secondary }}>
                          ₱{(expense.amount || 0).toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </td>
                        <td className="p-4">
                          {/* Status-based display */}
                          {expense.status === 'paid' ? (
                            <button
                              onClick={() => { setSelectedExpense(expense); setShowDetailModal(true); }}
                              className="px-3 py-1 rounded-lg text-sm font-medium cursor-pointer hover:opacity-80 transition-opacity"
                              style={{ 
                                backgroundColor: colors.activeBg,
                                color: colors.accent,
                                border: `1px solid ${colors.accent}40`
                              }}
                            >
                              Paid {expense.disbursementDate ? new Date(expense.disbursementDate).toLocaleDateString('en-PH', {month: 'short', day: 'numeric'}) : ''}
                            </button>
                          ) : expense.status === 'approved' ? (
                            <div className="flex items-center gap-2">
                              <span className="px-2 py-1 rounded-lg text-xs font-medium" style={{ backgroundColor: colors.activeBg, color: colors.accent }}>
                                Approved
                              </span>
                              <button
                                onClick={() => handleMarkPaidClick(expense)}
                                className="px-2 py-1 rounded-lg text-xs"
                                style={{ backgroundColor: colors.accent, color: colors.background }}
                              >
                                Mark Paid
                              </button>
                            </div>
                          ) : expense.status === 'for_approval' ? (
                            <span className="px-3 py-1 rounded-lg text-xs font-medium" style={{ backgroundColor: colors.activeBg, color: colors.accent }}>
                              Pending Approval
                            </span>
                          ) : expense.status === 'rejected' ? (
                            <span className="px-3 py-1 rounded-lg text-xs font-medium" style={{ backgroundColor: colors.secondary + '20', color: colors.secondary }}>
                              Rejected
                            </span>
                          ) : expense.status === 'created' ? (
                            <div className="flex items-center gap-2">
                              <span className="px-2 py-1 rounded-lg text-xs font-medium" style={{ backgroundColor: colors.muted + '20', color: colors.primary }}>
                                Created
                              </span>
                              <button
                                onClick={() => handleMarkPaidClick(expense)}
                                className="px-2 py-1 rounded-lg text-xs"
                                style={{ backgroundColor: colors.accent, color: colors.background }}
                              >
                                Mark Paid
                              </button>
                            </div>
                          ) : (
                            <span className="px-3 py-1 rounded-lg text-xs font-medium" style={{ backgroundColor: colors.muted + '20', color: colors.muted }}>
                              {expense.status || 'Unknown'}
                            </span>
                          )}
                        </td>
                      </tr>
                    )) : (
                      <tr>
                        <td colSpan="6" className="p-12 text-center">
                          <div className="flex flex-col items-center justify-center">
                            <div className="w-16 h-16 rounded-full mb-4 flex items-center justify-center" style={{ backgroundColor: colors.muted + '20' }}>
                              <svg className="w-8 h-8" style={{ color: colors.muted }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                              </svg>
                            </div>
                            <h3 className="text-lg font-medium mb-2" style={{ color: colors.secondary }}>
                              {getActiveFiltersCount() > 0 ? 'No expenses match your filters' : 'No expenses found'}
                            </h3>
                            <p className="text-sm" style={{ color: colors.muted }}>
                              {getActiveFiltersCount() > 0 
                                ? 'Try adjusting your filters or clearing them to see more results.'
                                : 'Add your first expense by clicking the "Add Expense" button below.'
                              }
                            </p>
                            {getActiveFiltersCount() > 0 && (
                              <button
                                onClick={() => {
                                  setSearchTerm('');
                                  setDateRange({ start: '', end: '' });
                                  setSelectedCategory('All');
                                  setPaymentStatus('All');
                                }}
                                className="mt-4 px-4 py-2 rounded-lg text-sm font-medium"
                                style={{ backgroundColor: colors.accent, color: colors.background }}
                              >
                                Clear All Filters
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>

              <div className="flex flex-wrap justify-end gap-2 px-6">
                <button
                  className="flex items-center gap-2 px-4 py-2 rounded-lg transition-all duration-200 hover:shadow-md"
                  style={{ backgroundColor: colors.primary, color: colors.background }}
                  onClick={() => navigate('/revenue-reports?tab=yearly')}
                >
                  <FiTrendingUp className="w-4 h-4" />
                  View Yearly Report
                </button>
                <button
                  className="px-4 py-2 rounded-lg"
                  style={{ backgroundColor: colors.primary, color: colors.background }}
                  onClick={() => setShowAuditLog(true)}
                >
                  Audit Log
                </button>
                <button
                  className="px-4 py-2 rounded-lg"
                  style={{ backgroundColor: colors.primary, color: colors.background }}
                  onClick={() => setShowExportPdfModal(true)}
                >
                  Export PDF
                </button>
                <button
                  className="px-4 py-2 rounded-lg"
                  style={{ backgroundColor: colors.accent, color: colors.background }}
                  onClick={() => setShowModal(true)}
                >
                  Add Expense
                </button>
              </div>
            </div>            <div className="md:col-span-1 space-y-6">
              <div 
                className="p-4 rounded-lg shadow cursor-pointer transition-all duration-200 hover:shadow-lg hover:scale-[1.02]" 
                style={{ backgroundColor: colors.background, border: `2px solid transparent` }}
                onClick={() => setExpandedChart('daily')}
                onMouseEnter={(e) => e.target.style.borderColor = colors.accent + '40'}
                onMouseLeave={(e) => e.target.style.borderColor = 'transparent'}
              >                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h3 className="text-lg font-semibold">Daily Payments</h3>
                    <p className="text-sm text-gray-500">Expenses paid by day • Click to expand</p>
                  </div>
                  <div className="text-xs px-2 py-1 rounded-full" style={{ backgroundColor: colors.activeBg, color: colors.accent }}>
                    Expand
                  </div>
                </div>
                <ResponsiveContainer width="100%" height={250}>
                  <BarChart data={dailyDisbursements}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis
                      dataKey="date"
                      tick={{ fontSize: 12 }}
                      tickFormatter={(date) => new Date(date).toLocaleDateString('en-PH', { day: 'numeric', month: 'short' })}
                    />
                    <YAxis />
                    <Tooltip
                      contentStyle={{ backgroundColor: colors.background, border: `1px solid ${colors.muted}` }}
                      labelStyle={{ color: colors.primary }}
                      formatter={(value) => [
                        `₱${Number(value).toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
                        'Amount'
                      ]}
                    />
                    <Bar dataKey="amount" fill={colors.accent} name="Daily Total" />
                  </BarChart>
                </ResponsiveContainer>
              </div>              <div 
                className="p-4 rounded-lg shadow cursor-pointer transition-all duration-200 hover:shadow-lg hover:scale-[1.02]" 
                style={{ backgroundColor: colors.background, border: `2px solid transparent` }}
                onClick={() => setExpandedChart('monthly')}
                onMouseEnter={(e) => e.target.style.borderColor = colors.accent + '40'}
                onMouseLeave={(e) => e.target.style.borderColor = 'transparent'}
              >                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h3 className="text-lg font-semibold">Monthly Payments</h3>
                    <p className="text-sm text-gray-500">Expenses summarized by month • Click to expand</p>
                  </div>
                  <div className="text-xs px-2 py-1 rounded-full" style={{ backgroundColor: colors.activeBg, color: colors.accent }}>
                    Expand
                  </div>
                </div>
                <ResponsiveContainer width="100%" height={250}>
                  <BarChart data={monthlyDisbursements}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis
                      dataKey="monthYear"
                      tick={{ fontSize: 12 }}
                      tickFormatter={(value) => {
                        const [year, month] = value.split('-');
                        return new Date(year, month - 1).toLocaleDateString('en-PH', { month: 'short', year: 'numeric' });
                      }}
                    />
                    <YAxis />
                    <Tooltip
                      contentStyle={{ backgroundColor: colors.background, border: `1px solid ${colors.muted}` }}
                      labelStyle={{ color: colors.primary }}
                      formatter={(value) => [
                        `₱${Number(value).toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
                        'Amount'
                      ]}
                      labelFormatter={(value) => {
                        const [year, month] = value.split('-');
                        return new Date(year, month - 1).toLocaleDateString('en-PH', { month: 'long', year: 'numeric' });
                      }}
                    />
                    <Bar dataKey="amount" fill={colors.secondary} name="Monthly Total" />                  </BarChart>
                </ResponsiveContainer>
              </div>

              {/* Current Month Report */}
              <div className="p-4 rounded-lg shadow" style={{ backgroundColor: colors.background }}>
                <h3 className="text-lg font-semibold mb-4">This Month's Report</h3>
                <p className="text-sm text-gray-500 mb-3">
                  {new Date().toLocaleDateString('en-PH', { month: 'long', year: 'numeric' })} summary
                </p>
                
                {(() => {
                  const currentMonth = new Date().getMonth();
                  const currentYear = new Date().getFullYear();
                  
                  const currentMonthExpenses = expenses.filter(expense => {
                    const expenseDate = new Date(expense.date);
                    return expenseDate.getMonth() === currentMonth && 
                           expenseDate.getFullYear() === currentYear;
                  });

                  const totalAmount = currentMonthExpenses.reduce((sum, expense) => sum + expense.amount, 0);
                  const paidExpenses = currentMonthExpenses.filter(expense => expense.status === 'Paid');
                  const pendingExpenses = currentMonthExpenses.filter(expense => expense.status === 'Pending');
                  
                  const categoryBreakdown = currentMonthExpenses.reduce((acc, expense) => {
                    acc[expense.category] = (acc[expense.category] || 0) + expense.amount;
                    return acc;
                  }, {});

                  const topCategory = Object.entries(categoryBreakdown)
                    .sort(([,a], [,b]) => b - a)[0];

                  return (
                    <div className="space-y-4">
                      {/* Summary Stats */}
                      <div className="grid grid-cols-2 gap-3">
                        <div className="text-center p-3 rounded-lg" style={{ backgroundColor: colors.activeBg }}>
                          <div className="text-xs font-medium mb-1" style={{ color: colors.muted }}>
                            Total Expenses
                          </div>
                          <div className="text-lg font-bold" style={{ color: colors.accent }}>
                            {currentMonthExpenses.length}
                          </div>
                        </div>
                        <div className="text-center p-3 rounded-lg" style={{ backgroundColor: colors.activeBg }}>
                          <div className="text-xs font-medium mb-1" style={{ color: colors.muted }}>
                            Total Amount
                          </div>
                          <div className="text-lg font-bold" style={{ color: colors.accent }}>
                            ₱{totalAmount.toLocaleString('en-PH')}
                          </div>
                        </div>
                      </div>

                      {/* Status Breakdown */}
                      <div className="space-y-2">
                        <div className="flex justify-between items-center">
                          <span className="text-sm font-medium" style={{ color: colors.secondary }}>
                            Paid Expenses
                          </span>
                          <span className="text-sm font-bold text-green-600">
                            {paidExpenses.length} (₱{paidExpenses.reduce((sum, exp) => sum + exp.amount, 0).toLocaleString('en-PH')})
                          </span>
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="text-sm font-medium" style={{ color: colors.secondary }}>
                            Pending Expenses
                          </span>
                          <span className="text-sm font-bold text-orange-600">
                            {pendingExpenses.length} (₱{pendingExpenses.reduce((sum, exp) => sum + exp.amount, 0).toLocaleString('en-PH')})
                          </span>
                        </div>
                      </div>

                      {/* Top Category */}
                      {topCategory && (
                        <div className="p-3 rounded-lg border" style={{ backgroundColor: colors.background, borderColor: colors.accent + '40' }}>
                          <div className="text-xs font-medium mb-1" style={{ color: colors.muted }}>
                            Top Category
                          </div>
                          <div className="flex justify-between items-center">
                            <span className="text-sm font-bold" style={{ color: colors.secondary }}>
                              {topCategory[0]}
                            </span>
                            <span className="text-sm font-bold" style={{ color: colors.accent }}>
                              ₱{topCategory[1].toLocaleString('en-PH')}
                            </span>
                          </div>
                        </div>
                      )}

                      {currentMonthExpenses.length === 0 && (
                        <div className="text-center p-4" style={{ color: colors.muted }}>
                          <p className="text-sm">No expenses recorded this month</p>
                        </div>
                      )}
                    </div>
                  );
                })()}
              </div>
            </div>
          </div>
          )}
        </div>
      </div>

      {/* Rejection Modal */}
      {showRejectModal && expenseToReject && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50" onClick={() => setShowRejectModal(false)}>
          <div className="bg-white p-6 rounded-lg max-w-md w-full relative" 
               style={{ backgroundColor: colors.background, border: `1px solid ${colors.muted}60` }}
               onClick={(e) => e.stopPropagation()}>
            <button onClick={() => setShowRejectModal(false)} className="absolute top-2 right-2 bg-red-500 text-white rounded-full px-2 py-0 text-sm">
              ×
            </button>
            <h2 className="text-xl font-semibold mb-4" style={{ color: colors.secondary }}>Reject Expense Request</h2>
            <p className="text-sm text-gray-600 mb-4">
              Rejecting: <strong>{expenseToReject.description}</strong> - ₱{expenseToReject.amount?.toLocaleString('en-PH')}
            </p>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-2" style={{ color: colors.primary }}>Rejection Reason</label>
                <textarea
                  className="w-full p-3 rounded-lg border focus:ring-2 focus:outline-none transition-all"
                  style={{ borderColor: colors.muted + '60', backgroundColor: colors.background }}
                  value={rejectionReason}
                  onChange={(e) => setRejectionReason(e.target.value)}
                  rows="3"
                  placeholder="Please provide a reason for rejection..."
                  required
                />
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => setShowRejectModal(false)}
                  className="flex-1 py-2 px-4 rounded-lg border"
                  style={{ borderColor: colors.muted }}
                >
                  Cancel
                </button>
                <button
                  onClick={rejectExpense}
                  className="flex-1 py-2 px-4 rounded-lg bg-red-500 text-white hover:bg-red-600"
                  disabled={!rejectionReason.trim()}
                >
                  Confirm Rejection
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Expense Detail Modal */}
      {showDetailModal && selectedExpense && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4" onClick={() => setShowDetailModal(false)}>
          <div 
            className="bg-white rounded-xl max-w-lg w-full relative shadow-2xl"
            style={{ backgroundColor: colors.background }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="p-6 border-b" style={{ borderColor: colors.muted + '20' }}>
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-bold" style={{ color: colors.primary }}>Expense Details</h2>
                <button
                  onClick={() => setShowDetailModal(false)}
                  className="p-2 rounded-lg hover:bg-gray-100 transition-colors"
                >
                  <FiX className="w-5 h-5" style={{ color: colors.muted }} />
                </button>
              </div>
            </div>
            
            {/* Content */}
            <div className="p-6 space-y-4">
              {/* Status Badge */}
              <div className="flex items-center gap-2">
                <span className="px-3 py-1 rounded-full text-sm font-medium bg-green-100 text-green-800">
                  ✓ Paid
                </span>
                {selectedExpense.disbursementDate && (
                  <span className="text-sm text-gray-500">
                    on {new Date(selectedExpense.disbursementDate).toLocaleDateString('en-PH', { 
                      year: 'numeric', month: 'long', day: 'numeric' 
                    })}
                  </span>
                )}
              </div>

              {/* Amount */}
              <div className="p-4 rounded-lg" style={{ backgroundColor: colors.activeBg }}>
                <div className="text-sm mb-1" style={{ color: colors.muted }}>Amount</div>
                <div className="text-2xl font-bold" style={{ color: colors.accent }}>
                  ₱{(selectedExpense.amount || 0).toLocaleString('en-PH', { minimumFractionDigits: 2 })}
                </div>
              </div>

              {/* Details Grid */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <div className="text-sm mb-1" style={{ color: colors.muted }}>Date</div>
                  <div className="font-medium" style={{ color: colors.primary }}>
                    {new Date(selectedExpense.date).toLocaleDateString('en-PH', { 
                      year: 'numeric', month: 'long', day: 'numeric' 
                    })}
                  </div>
                </div>
                <div>
                  <div className="text-sm mb-1" style={{ color: colors.muted }}>Category</div>
                  <div className="font-medium" style={{ color: colors.primary }}>
                    {selectedExpense.category}
                  </div>
                </div>
                <div>
                  <div className="text-sm mb-1" style={{ color: colors.muted }}>Payment Method</div>
                  <div className="font-medium" style={{ color: colors.primary }}>
                    {selectedExpense.paymentMethod}
                  </div>
                </div>
                <div>
                  <div className="text-sm mb-1" style={{ color: colors.muted }}>Status</div>
                  <div className="font-medium capitalize" style={{ color: colors.primary }}>
                    {selectedExpense.status?.replace('_', ' ')}
                  </div>
                </div>
              </div>

              {/* Description */}
              <div>
                <div className="text-sm mb-1" style={{ color: colors.muted }}>Description</div>
                <div className="p-3 rounded-lg bg-gray-50 font-medium" style={{ color: colors.primary }}>
                  {selectedExpense.description}
                </div>
              </div>

              {/* Payroll Trace (read-only) */}
              {selectedExpense.sourceType === 'payroll_batch' && (
                <div className="p-4 rounded-lg border" style={{ borderColor: colors.muted + '30' }}>
                  <div className="text-sm font-medium mb-2" style={{ color: colors.secondary }}>
                    Payroll
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <div className="text-sm mb-1" style={{ color: colors.muted }}>Batch Number</div>
                      <div className="font-medium" style={{ color: colors.primary }}>
                        {selectedExpense.sourceBatchNumber || '—'}
                      </div>
                    </div>
                    <div>
                      <div className="text-sm mb-1" style={{ color: colors.muted }}>Batch ID</div>
                      <div className="font-mono text-xs break-all" style={{ color: colors.primary }}>
                        {selectedExpense.sourceId || '—'}
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Requester Info (if from staff) */}
              {selectedExpense.requesterName && (
                <div className="p-4 rounded-lg border" style={{ borderColor: colors.muted + '30' }}>
                  <div className="text-sm font-medium mb-2" style={{ color: colors.secondary }}>
                    Requested By
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full flex items-center justify-center text-white font-medium"
                         style={{ backgroundColor: colors.accent }}>
                      {selectedExpense.requesterName?.charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <div className="font-medium" style={{ color: colors.primary }}>
                        {selectedExpense.requesterName}
                      </div>
                      <div className="text-sm capitalize" style={{ color: colors.muted }}>
                        {selectedExpense.requesterPosition}
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Approver Info */}
              {selectedExpense.approverName && (
                <div className="p-4 rounded-lg border" style={{ borderColor: colors.muted + '30' }}>
                  <div className="text-sm font-medium mb-2" style={{ color: colors.secondary }}>
                    Approved By
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full flex items-center justify-center text-white font-medium"
                         style={{ backgroundColor: colors.secondary }}>
                      {selectedExpense.approverName?.charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <div className="font-medium" style={{ color: colors.primary }}>
                        {selectedExpense.approverName}
                      </div>
                      {selectedExpense.approvedAt && (
                        <div className="text-sm" style={{ color: colors.muted }}>
                          {new Date(selectedExpense.approvedAt).toLocaleDateString('en-PH', { 
                            year: 'numeric', month: 'short', day: 'numeric' 
                          })}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {/* Creator Info (if admin-created) */}
              {selectedExpense.creatorName && !selectedExpense.requesterName && (
                <div className="p-4 rounded-lg border" style={{ borderColor: colors.muted + '30' }}>
                  <div className="text-sm font-medium mb-2" style={{ color: colors.secondary }}>
                    Created By
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full flex items-center justify-center text-white font-medium"
                         style={{ backgroundColor: colors.primary }}>
                      {selectedExpense.creatorName?.charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <div className="font-medium" style={{ color: colors.primary }}>
                        {selectedExpense.creatorName}
                      </div>
                      <div className="text-sm capitalize" style={{ color: colors.muted }}>
                        {selectedExpense.creatorRole}
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="p-6 border-t" style={{ borderColor: colors.muted + '20' }}>
              <button
                onClick={() => setShowDetailModal(false)}
                className="w-full py-3 rounded-lg font-medium"
                style={{ backgroundColor: colors.primary, color: colors.background }}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50" onClick={() => setShowModal(false)}>
          <div className="bg-white p-6 rounded-lg max-w-xl w-full relative" 
               style={{ backgroundColor: colors.background, border: `1px solid ${colors.muted}60` }}
               onClick={(e) => e.stopPropagation()}>
            <button onClick={() => setShowModal(false)} className="absolute top-2 right-2 bg-red-500 text-white rounded-full px-2 py-0 text-sm">
              ×
            </button>
            <h2 className="text-xl font-semibold mb-6" style={{ color: colors.secondary }}>Add New Expense</h2>
            <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6">
              {[
                { label: 'Date', type: 'date', name: 'date', required: true },
                { label: 'Amount (₱)', type: 'number', name: 'amount', required: true },
                { label: 'Category', type: 'select', name: 'category', options: categories },
                { label: 'Payment Method', type: 'select', name: 'paymentMethod', options: ['Cash', 'Bank Transfer', 'Digital Wallet'] }
              ].map((field) => (
                <div key={field.name} className="space-y-2">
                  <label className="block text-sm font-medium" style={{ color: colors.primary }}>{field.label}</label>
                  {field.type === 'select' ? (
                    <select
                      className="w-full p-3 rounded-lg border focus:ring-2 focus:outline-none transition-all"
                      style={{ borderColor: colors.muted + '60', backgroundColor: colors.background }}
                      value={formData[field.name]}
                      onChange={(e) => setFormData({ ...formData, [field.name]: e.target.value })}
                      required={field.required}
                    >
                      <option value="">Select {field.label}</option>
                      {field.options.map((option) => (
                        <option key={option} value={option}>{option}</option>
                      ))}
                    </select>
                  ) : (
                    <input
                      type={field.type}
                      className="w-full p-3 rounded-lg border focus:ring-2 focus:outline-none transition-all"
                      style={{ borderColor: colors.muted + '60', backgroundColor: colors.background }}
                      value={formData[field.name]}
                      onChange={(e) => setFormData({ ...formData, [field.name]: e.target.value })}
                      required={field.required}
                      placeholder={`Enter ${field.label.toLowerCase()}`}
                    />
                  )}
                </div>
              ))}
              <div className="md:col-span-2 space-y-2">
                <label className="block text-sm font-medium" style={{ color: colors.primary }}>Description</label>
                <textarea
                  className="w-full p-3 rounded-lg border focus:ring-2 focus:outline-none transition-all"
                  style={{ borderColor: colors.muted + '60', backgroundColor: colors.background }}
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  rows="3"
                  placeholder="Add expense details..."
                />
              </div>
              <div className="md:col-span-2 mt-4">
                <button
                  type="submit"
                  className="w-full py-3 px-6 rounded-lg font-semibold transition-all hover:scale-[1.02]"
                  style={{ backgroundColor: colors.accent, color: colors.background, boxShadow: `0 4px 14px ${colors.accent}30` }}
                >
                  Add Expense
                </button>
              </div>
            </form>          </div>
        </div>
      )}

      {showMarkPaidModal && expenseToMarkPaid && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50" onClick={() => setShowMarkPaidModal(false)}>
          <div
            className="bg-white p-6 rounded-lg max-w-md w-full relative"
            style={{ backgroundColor: colors.background, border: `1px solid ${colors.muted}60` }}
            onClick={(e) => e.stopPropagation()}
          >
            <button
              onClick={() => setShowMarkPaidModal(false)}
              className="absolute top-2 right-2 bg-red-500 text-white rounded-full px-2 py-0 text-sm"
            >
              ×
            </button>
            <h2 className="text-xl font-semibold mb-4" style={{ color: colors.secondary }}>
              Select Payment Method
            </h2>
            <p className="text-sm mb-4" style={{ color: colors.muted }}>
              This expense has no payment method yet. Choose how it was paid.
            </p>

            <div className="space-y-2 mb-6">
              <label className="block text-sm font-medium" style={{ color: colors.primary }}>Payment Method</label>
              <select
                className="w-full p-3 rounded-lg border focus:ring-2 focus:outline-none transition-all"
                style={{ borderColor: colors.muted + '60', backgroundColor: colors.background }}
                value={markPaidPaymentMethod}
                onChange={(e) => setMarkPaidPaymentMethod(e.target.value)}
              >
                {['Cash', 'Bank Transfer', 'Digital Wallet'].map((option) => (
                  <option key={option} value={option}>{option}</option>
                ))}
              </select>
            </div>

            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => setShowMarkPaidModal(false)}
                className="flex-1 py-3 rounded-lg font-medium"
                style={{ backgroundColor: colors.activeBg, color: colors.primary, border: `1px solid ${colors.muted}40` }}
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={async () => {
                  try {
                    await markAsPaidAndPermanent(expenseToMarkPaid._id, markPaidPaymentMethod);
                  } finally {
                    setShowMarkPaidModal(false);
                    setExpenseToMarkPaid(null);
                  }
                }}
                className="flex-1 py-3 rounded-lg font-semibold"
                style={{ backgroundColor: colors.accent, color: colors.background }}
              >
                Confirm
              </button>
            </div>
          </div>
        </div>
      )}

      {showAuditLog && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4" style={{ zIndex: 9999 }}>
          <div className="bg-white p-6 rounded-lg w-full max-w-5xl max-h-[90vh] overflow-hidden flex flex-col" onClick={(e) => e.stopPropagation()}>
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-bold" style={{ color: colors.primary }}>Audit Log</h2>
              <button
                onClick={() => setShowAuditLog(false)}
                className="text-gray-500 hover:text-gray-700 text-2xl font-bold"
              >
                ×
              </button>
            </div>

            <div className="flex-1 overflow-y-auto">
              <table className="w-full text-sm">
                <thead className="sticky top-0" style={{ backgroundColor: colors.primary, color: 'white' }}>
                  <tr>
                    <th className="px-3 py-3 text-left">Timestamp</th>
                    <th className="px-3 py-3 text-left">Action</th>
                    <th className="px-3 py-3 text-left">Description</th>
                    <th className="px-3 py-3 text-left">Expense</th>
                    <th className="px-3 py-3 text-left">User</th>
                  </tr>
                </thead>
                <tbody>
                  {auditLogLoading ? (
                    <tr>
                      <td colSpan="5" className="px-4 py-8 text-center text-gray-500">
                        Loading audit logs...
                      </td>
                    </tr>
                  ) : auditLogError ? (
                    <tr>
                      <td colSpan="5" className="px-4 py-8 text-center text-gray-500">
                        {auditLogError}
                      </td>
                    </tr>
                  ) : auditLog.length > 0 ? (
                    auditLog.slice().reverse().map((log, index) => (
                      <tr
                        key={log._id || index}
                        className="border-t"
                        style={{ backgroundColor: index % 2 === 0 ? 'white' : colors.muted + '10' }}
                      >
                        <td className="px-3 py-3 text-xs">{log.timestamp ? new Date(log.timestamp).toLocaleString() : '-'}</td>
                        <td className="px-3 py-3">
                          <span className={`px-2 py-1 rounded text-xs font-medium ${
                            log.action === 'create' || log.action === 'system_create' ? 'bg-blue-100 text-blue-800' :
                            log.action === 'update' ? 'bg-yellow-100 text-yellow-800' :
                            log.action === 'delete' ? 'bg-red-100 text-red-800' :
                            log.action === 'approve' ? 'bg-green-100 text-green-800' :
                            log.action === 'reject' ? 'bg-orange-100 text-orange-800' :
                            log.action === 'mark_paid' ? 'bg-green-100 text-green-800' :
                            'bg-gray-100 text-gray-800'
                          }`}> 
                            {log.action?.replace('_', ' ').toUpperCase() || 'OTHER'}
                          </span>
                        </td>
                        <td className="px-3 py-3 text-sm max-w-xs truncate" title={log.description}>
                          {log.description || log.action}
                        </td>
                        <td className="px-3 py-3 font-mono text-xs">
                          {log.expenseId ? String(log.expenseId).substring(0, 8) + '...' : '-'}
                        </td>
                        <td className="px-3 py-3 text-sm">{log.user || 'system'}</td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan="5" className="px-4 py-8 text-center text-gray-500">
                        No audit log entries yet. Actions will appear here as you perform expense operations.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            <div className="mt-4 pt-4 border-t flex justify-end">
              <button
                onClick={() => setShowAuditLog(false)}
                className="px-4 py-2 rounded-lg"
                style={{ backgroundColor: colors.secondary, color: colors.background }}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {showExportPdfModal && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4"
          style={{ zIndex: 9999 }}
          onClick={() => !exportPdfLoading && setShowExportPdfModal(false)}
        >
          <div
            className="bg-white p-6 rounded-lg w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex justify-between items-center mb-4">
              <div>
                <h2 className="text-xl font-bold" style={{ color: colors.primary }}>Export PDF</h2>
                <p className="text-sm" style={{ color: colors.muted }}>Choose the period and filters to include.</p>
              </div>
              <button
                onClick={() => !exportPdfLoading && setShowExportPdfModal(false)}
                className="text-gray-500 hover:text-gray-700 text-2xl font-bold"
              >
                ×
              </button>
            </div>

            <div className="flex-1 overflow-y-auto space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1" style={{ color: colors.primary }}>Scope</label>
                <select
                  value={exportScope}
                  onChange={(e) => setExportScope(e.target.value)}
                  className="w-full border rounded-lg px-3 py-2"
                  disabled={exportPdfLoading}
                >
                  <option value="current">Use current filters</option>
                  <option value="month">Specific month</option>
                  <option value="custom">Custom date range</option>
                </select>
              </div>

              {exportScope === 'month' ? (
                <div>
                  <label className="block text-sm font-medium mb-1" style={{ color: colors.primary }}>Month</label>
                  <input
                    type="month"
                    value={exportMonth}
                    onChange={(e) => setExportMonth(e.target.value)}
                    className="w-full border rounded-lg px-3 py-2"
                    disabled={exportPdfLoading}
                  />
                </div>
              ) : exportScope === 'custom' ? (
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-sm font-medium mb-1" style={{ color: colors.primary }}>Start date</label>
                    <input
                      type="date"
                      value={exportCustomRange.start}
                      onChange={(e) => setExportCustomRange(prev => ({ ...prev, start: e.target.value }))}
                      className="w-full border rounded-lg px-3 py-2"
                      disabled={exportPdfLoading}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1" style={{ color: colors.primary }}>End date</label>
                    <input
                      type="date"
                      value={exportCustomRange.end}
                      onChange={(e) => setExportCustomRange(prev => ({ ...prev, end: e.target.value }))}
                      className="w-full border rounded-lg px-3 py-2"
                      disabled={exportPdfLoading}
                    />
                  </div>
                </div>
              ) : null}

              {exportScope !== 'current' && (
                <>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-sm font-medium mb-1" style={{ color: colors.primary }}>Category</label>
                      <select
                        value={exportCategory}
                        onChange={(e) => setExportCategory(e.target.value)}
                        className="w-full border rounded-lg px-3 py-2"
                        disabled={exportPdfLoading}
                      >
                        <option value="All">All</option>
                        {categories.map((c) => (
                          <option key={c} value={c}>{c}</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-1" style={{ color: colors.primary }}>Payment status</label>
                      <select
                        value={exportPaymentStatus}
                        onChange={(e) => setExportPaymentStatus(e.target.value)}
                        className="w-full border rounded-lg px-3 py-2"
                        disabled={exportPdfLoading}
                      >
                        <option value="All">All</option>
                        <option value="Paid">Paid</option>
                        <option value="Pending">Pending</option>
                      </select>
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1" style={{ color: colors.primary }}>Search</label>
                    <input
                      type="text"
                      value={exportSearch}
                      onChange={(e) => setExportSearch(e.target.value)}
                      placeholder="Description, category, requester..."
                      className="w-full border rounded-lg px-3 py-2"
                      disabled={exportPdfLoading}
                    />
                  </div>
                </>
              )}

              {exportScope === 'current' && (
                <div className="text-sm" style={{ color: colors.muted }}>
                  Uses your current Date, Category, Payment Status, and Search filters.
                </div>
              )}
            </div>

            <div className="mt-5 pt-4 border-t flex justify-end gap-2">
              <button
                onClick={() => !exportPdfLoading && setShowExportPdfModal(false)}
                className="px-4 py-2 rounded-lg"
                style={{ backgroundColor: colors.secondary, color: colors.background }}
                disabled={exportPdfLoading}
              >
                Cancel
              </button>
              <button
                onClick={handleExportPdf}
                className="px-4 py-2 rounded-lg"
                style={{ backgroundColor: colors.primary, color: colors.background, opacity: exportPdfLoading ? 0.7 : 1 }}
                disabled={exportPdfLoading}
              >
                {exportPdfLoading ? 'Generating...' : 'Generate PDF'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Expanded Chart Modal */}
      {expandedChart && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4" onClick={() => setExpandedChart(null)}>
          <div 
            className="bg-white rounded-xl max-w-6xl w-full max-h-[90vh] overflow-auto relative shadow-2xl"
            style={{ backgroundColor: colors.background }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div 
              className="p-6 border-b sticky top-0 z-10 flex items-center justify-between"
              style={{ backgroundColor: colors.background, borderColor: colors.muted + '20' }}
            >
              <div>
                <h2 className="text-2xl font-bold" style={{ color: colors.primary }}>
                  {expandedChart === 'daily' ? 'Daily Payments Analysis' : 'Monthly Payments Analysis'}
                </h2>
                <p className="text-sm mt-1" style={{ color: colors.muted }}>
                  {expandedChart === 'daily' 
                    ? 'Comprehensive view of daily expense patterns'
                    : 'Detailed monthly expense trends and insights'
                  }
                </p>
              </div>
              <button
                onClick={() => setExpandedChart(null)}
                className="p-3 rounded-lg hover:bg-gray-100 transition-colors"
                style={{ color: colors.muted }}
              >
                <FiX className="w-6 h-6" />
              </button>
            </div>

            {/* Modal Content */}
            <div className="p-6 space-y-6">
              {/* Chart Section */}
              <div className="bg-white rounded-lg p-6 shadow-sm" style={{ backgroundColor: colors.activeBg }}>
                <ResponsiveContainer width="100%" height={500}>
                  <BarChart 
                    data={expandedChart === 'daily' ? dailyDisbursements : monthlyDisbursements}
                    margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" stroke={colors.muted + '40'} />
                    <XAxis
                      dataKey={expandedChart === 'daily' ? 'date' : 'monthYear'}
                      tick={{ fontSize: 12 }}
                      tickFormatter={(value) => {
                        if (expandedChart === 'daily') {
                          return new Date(value).toLocaleDateString('en-PH', { 
                            day: 'numeric', 
                            month: 'short',
                            year: '2-digit'
                          });
                        } else {
                          const [year, month] = value.split('-');
                          return new Date(year, month - 1).toLocaleDateString('en-PH', { 
                            month: 'short', 
                            year: 'numeric' 
                          });
                        }
                      }}
                      angle={-45}
                      textAnchor="end"
                      height={80}
                    />
                    <YAxis 
                      tick={{ fontSize: 12 }}
                      tickFormatter={(value) => `₱${Number(value).toLocaleString('en-PH')}`}
                    />
                    <Tooltip
                      contentStyle={{ 
                        backgroundColor: colors.background, 
                        border: `1px solid ${colors.accent}`,
                        borderRadius: '8px',
                        boxShadow: '0 4px 12px rgba(0,0,0,0.1)'
                      }}
                      labelStyle={{ color: colors.primary, fontWeight: 'bold' }}
                      formatter={(value) => [
                        `₱${Number(value).toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
                        expandedChart === 'daily' ? 'Daily Total' : 'Monthly Total'
                      ]}
                      labelFormatter={(value) => {
                        if (expandedChart === 'daily') {
                          return new Date(value).toLocaleDateString('en-PH', { 
                            weekday: 'long',
                            year: 'numeric',
                            month: 'long',
                            day: 'numeric'
                          });
                        } else {
                          const [year, month] = value.split('-');
                          return new Date(year, month - 1).toLocaleDateString('en-PH', { 
                            month: 'long', 
                            year: 'numeric' 
                          });
                        }
                      }}
                    />
                    <Bar 
                      dataKey="amount" 
                      fill={expandedChart === 'daily' ? colors.accent : colors.secondary}
                      name={expandedChart === 'daily' ? 'Daily Total' : 'Monthly Total'}
                      radius={[4, 4, 0, 0]}
                    />
                  </BarChart>
                </ResponsiveContainer>
              </div>

              {/* Statistics Section */}
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                {(() => {
                  const data = expandedChart === 'daily' ? dailyDisbursements : monthlyDisbursements;
                  const amounts = data.map(item => item.amount);
                  const total = amounts.reduce((sum, amount) => sum + amount, 0);
                  const average = amounts.length > 0 ? total / amounts.length : 0;
                  const highest = Math.max(...amounts, 0);
                  const lowest = amounts.length > 0 ? Math.min(...amounts) : 0;

                  return [
                    { label: 'Total Amount', value: total, color: colors.accent },
                    { label: 'Average', value: average, color: colors.secondary },
                    { label: 'Highest', value: highest, color: '#059669' },
                    { label: 'Lowest', value: lowest, color: '#DC2626' }
                  ].map((stat, index) => (
                    <div 
                      key={index}
                      className="p-4 rounded-lg text-center"
                      style={{ backgroundColor: stat.color + '10', border: `1px solid ${stat.color}20` }}
                    >
                      <div className="text-sm font-medium mb-1" style={{ color: colors.muted }}>
                        {stat.label}
                      </div>
                      <div className="text-xl font-bold" style={{ color: stat.color }}>
                        ₱{stat.value.toLocaleString('en-PH', { 
                          minimumFractionDigits: 2, 
                          maximumFractionDigits: 2 
                        })}
                      </div>
                    </div>
                  ));
                })()}
              </div>

              {/* Period Info */}
              <div className="text-center p-4 rounded-lg" style={{ backgroundColor: colors.activeBg }}>
                <p className="text-sm" style={{ color: colors.muted }}>
                  Showing {expandedChart === 'daily' ? dailyDisbursements.length : monthlyDisbursements.length} {expandedChart} periods with expense data
                </p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ExpenseTracker;