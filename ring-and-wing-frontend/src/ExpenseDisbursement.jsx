import { useState, useEffect, useMemo } from 'react';
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip } from 'recharts';
import { motion, AnimatePresence } from 'framer-motion';
import ExpenseCard from './components/ui/ExpenseCard.jsx';
import ExpenseFilters from './components/ui/ExpenseFilters.jsx';
import ExpenseSummary from './components/ui/ExpenseSummary.jsx';

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
  const [expenses, setExpenses] = useState([]);
  const [formData, setFormData] = useState({
    date: '',
    amount: '',
    category: '',
    description: '',
    paymentMethod: 'Cash'
  });
  const [showModal, setShowModal] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [dateRange, setDateRange] = useState({ start: '', end: '' });
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [paymentStatus, setPaymentStatus] = useState('All');
  const [windowWidth, setWindowWidth] = useState(window.innerWidth);
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);
  const [lastResetCheck, setLastResetCheck] = useState(localStorage.getItem('lastExpenseResetCheck') || '');
  const [resetMessage, setResetMessage] = useState('');

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
  useEffect(() => {
    const fetchExpenses = async () => {
      try {
        const params = new URLSearchParams({
          search: searchTerm,
          startDate: dateRange.start,
          endDate: dateRange.end,
          category: selectedCategory !== 'All' ? selectedCategory : ''
        });        // Add payment status filters
        if (paymentStatus === 'Paid') {
          params.append('disbursed', 'true');
        } else if (paymentStatus === 'Pending') {
          params.append('disbursed', 'false');
        }

        const response = await fetch(`/api/expenses?${params}`);
        const data = await response.json();
        setExpenses(Array.isArray(data) ? data : []);
      } catch (error) {
        console.error('Error fetching expenses:', error);
        setExpenses([]);
      }
    };
    fetchExpenses();
  }, [searchTerm, dateRange, selectedCategory, paymentStatus]);
  const checkAndGetDailyStats = async () => {
    const now = new Date();
    const lastCheck = new Date(lastResetCheck);
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());

    // If last check was before today, get updated stats
    if (!lastResetCheck || lastCheck < startOfToday) {
      try {
        const response = await fetch('/api/expenses/reset-disbursement', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' }
        });
        
        if (response.ok) {
          // Update last check time
          const nowISOString = now.toISOString();
          setLastResetCheck(nowISOString);
          localStorage.setItem('lastExpenseResetCheck', nowISOString);
          
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
      const payload = {
        ...formData,
        date: new Date(formData.date).toISOString(),
        amount: parseFloat(formData.amount),
        disbursed: false
      };

      if (!payload.date || isNaN(payload.amount) || !payload.category || !payload.description) {
        throw new Error('Please fill all required fields');
      }

      const response = await fetch('/api/expenses', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload)
      });

      const responseData = await response.json();
      
      if (!response.ok) {
        throw new Error(responseData.message || 'Failed to create expense');
      }

      setExpenses(prev => [...prev, responseData]);
      setShowModal(false);
      setFormData({
        date: '',
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
      const response = await fetch(`/api/expenses/${id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json'
        },
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
      const response = await fetch(`/api/expenses/${id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json'
        },
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
  const markAsPaidAndPermanent = async (id) => {
    try {
      const response = await fetch(`/api/expenses/${id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json'
        },
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

  const exportToCSV = () => {
    const csvContent = [
      ['Date', 'Description', 'Category', 'Amount', 'Status'],
      ...expenses.map(exp => [
        new Date(exp.date).toISOString().split('T')[0],
        exp.description,
        exp.category,
        exp.amount,
        exp.disbursed ? 'Paid' : 'Pending'
      ])
    ].map(row => row.join(',')).join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'expenses.csv';
    a.click();
  };

  const disbursedExpenses = useMemo(() => 
    Array.isArray(expenses) ? expenses.filter(exp => exp.disbursed) : [], 
    [expenses]
  );
  const dailyDisbursements = useMemo(() => {
    const daily = disbursedExpenses.reduce((acc, exp) => {
      // Use disbursementDate instead of date for the chart
      const date = exp.disbursementDate ? 
        new Date(exp.disbursementDate).toISOString().split('T')[0] : 
        new Date().toISOString().split('T')[0];
      
      acc[date] = (acc[date] || 0) + exp.amount;
      return acc;
    }, {});
    
    return Object.entries(daily).map(([date, amount]) => ({
      date,
      amount,
      formattedDate: new Date(date).toLocaleDateString('en-PH', {
        day: 'numeric',
        month: 'short'
      })
    })).sort((a, b) => new Date(a.date) - new Date(b.date));
  }, [disbursedExpenses]);

  const monthlyDisbursements = useMemo(() => {
    const monthly = disbursedExpenses.reduce((acc, exp) => {
      const date = new Date(exp.date);
      const monthYear = `${date.getFullYear()}-${(date.getMonth() + 1).toString().padStart(2, '0')}`;
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
        <div className="p-6 md:p-8 pt-24 md:pt-8">          <div className="mb-8">
            <div className="flex items-center justify-between">
              <h1 className="text-3xl font-bold" style={{ color: colors.primary }}>Expense Management</h1>
              <div className="hidden md:block h-1 flex-1 max-w-[200px] ml-4" style={{ backgroundColor: colors.muted + '40' }} />
            </div>
            <p className="mt-2 text-sm" style={{ color: colors.muted }}>
              Track and manage daily business expenses. Mark expenses as paid when they are processed.
            </p>
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
          )}

          <div className="mb-6 flex flex-col md:flex-row gap-4">
            <input
              type="text"
              placeholder="Search descriptions..."
              className="p-2 rounded-lg border"
              style={{ borderColor: colors.muted }}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
            <div className="flex gap-2">
              <input
                type="date"
                className="p-2 rounded-lg border"
                style={{ borderColor: colors.muted }}
                value={dateRange.start}
                onChange={(e) => setDateRange({ ...dateRange, start: e.target.value })}
              />
              <input
                type="date"
                className="p-2 rounded-lg border"
                style={{ borderColor: colors.muted }}
                value={dateRange.end}
                onChange={(e) => setDateRange({ ...dateRange, end: e.target.value })}
              />
            </div>            <select
              className="p-2 rounded-lg border"
              style={{ borderColor: colors.muted }}
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
            >
              <option value="All">All Categories</option>
              {categories.map((category) => (
                <option key={category} value={category}>{category}</option>
              ))}
            </select>              <select
              className="p-2 rounded-lg border"
              style={{ borderColor: colors.muted }}
              value={paymentStatus}
              onChange={(e) => setPaymentStatus(e.target.value)}
            >
              <option value="All">All Payments</option>
              <option value="Pending">Pending</option>
              <option value="Paid">Paid</option>
            </select>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="md:col-span-2 space-y-6">
              <div className="rounded-xl overflow-auto shadow-lg mx-6" style={{ border: `1px solid ${colors.muted}20`, maxHeight: '520px' }}>
                <table className="w-full">
                  <thead style={{ backgroundColor: colors.activeBg }}>
                    <tr>
                      {['Date', 'Description', 'Category', 'Method', 'Amount', 'Status'].map(header => (
                        <th key={header} className="p-4 text-left text-sm font-semibold" style={{ color: colors.primary }}>{header}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {Array.isArray(expenses) && expenses.map(expense => (
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
                          <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium" 
                            style={{ backgroundColor: colors.activeBg, color: colors.accent }}>
                            {expense.category}
                          </span>
                        </td>
                        <td className="p-4 text-sm" style={{ color: colors.secondary }}>{expense.paymentMethod}</td>
                        <td className="p-4 text-right text-sm font-medium" style={{ color: colors.secondary }}>
                          ₱{expense.amount.toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </td>                        <td className="p-4">
                          {expense.disbursed ? (
                            <div className="flex items-center">                              <span className="px-3 py-1 rounded-lg text-sm font-medium" 
                                    style={{ 
                                      backgroundColor: expense.permanent ? colors.secondary + '20' : colors.accent + '20',
                                      color: expense.permanent ? colors.secondary : colors.accent,
                                      border: expense.permanent ? 
                                        `1px solid ${colors.secondary}` : 
                                        `1px solid ${colors.accent}40`
                                    }}>
                                Paid {new Date(expense.disbursementDate).toLocaleDateString('en-PH', {month: 'short', day: 'numeric'})}
                              </span>
                            </div>                          ): (                            <div className="flex gap-2">
                              <button
                                onClick={() => markAsPaidAndPermanent(expense._id)}
                                className="px-3 py-1 rounded-lg"
                                style={{ backgroundColor: colors.accent, color: colors.background }}
                                title="Mark as paid and permanent (won't be reset daily)"
                              >
                                Mark as Paid
                              </button>
                            </div>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="flex flex-wrap justify-end gap-2 px-6">
                <button
                  className="px-4 py-2 rounded-lg"
                  style={{ backgroundColor: colors.secondary, color: colors.background }}
                  onClick={exportToCSV}
                >
                  Export to CSV
                </button>
                <button
                  className="px-4 py-2 rounded-lg"
                  style={{ backgroundColor: colors.accent, color: colors.background }}
                  onClick={() => setShowModal(true)}
                >
                  Add Expense
                </button>
              </div>
            </div>

            <div className="md:col-span-1 space-y-6">
              <div className="p-4 rounded-lg shadow" style={{ backgroundColor: colors.background }}>
                <h3 className="text-lg font-semibold mb-4">Daily Payments</h3>
                <p className="text-sm text-gray-500 mb-3">Expenses paid by day</p>
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
              </div>

              <div className="p-4 rounded-lg shadow" style={{ backgroundColor: colors.background }}>
                <h3 className="text-lg font-semibold mb-4">Monthly Payments</h3>
                <p className="text-sm text-gray-500 mb-3">Expenses summarized by month</p>
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
                    <Bar dataKey="amount" fill={colors.secondary} name="Monthly Total" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>
        </div>
      </div>

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
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default ExpenseTracker;