import { useState, useEffect } from 'react';
import { FiPlus, FiClock, FiCheck, FiX, FiDollarSign } from 'react-icons/fi';
import { useMultiTabLogout } from './hooks/useMultiTabLogout';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

const colors = {
  primary: '#2e0304',
  background: '#fefdfd',
  accent: '#f1670f',
  secondary: '#853619',
  muted: '#ac9c9b',
  activeBg: '#f1670f20'
};

// Helper to get auth token
const getAuthHeaders = () => {
  const token = localStorage.getItem('authToken');
  return {
    'Content-Type': 'application/json',
    'Authorization': token ? `Bearer ${token}` : ''
  };
};

// Status badge component using theme colors
const StatusBadge = ({ status }) => {
  const statusConfig = {
    for_approval: { label: 'For Approval', style: { bg: colors.activeBg, text: colors.accent }, icon: FiClock },
    approved: { label: 'Approved', style: { bg: colors.activeBg, text: colors.accent }, icon: FiCheck },
    rejected: { label: 'Rejected', style: { bg: colors.secondary + '20', text: colors.secondary }, icon: FiX },
    paid: { label: 'Paid', style: { bg: colors.activeBg, text: colors.accent }, icon: FiDollarSign }
  };

  const config = statusConfig[status] || statusConfig.for_approval;
  const Icon = config.icon;

  return (
    <span 
      className="inline-flex items-center gap-1 px-2 py-1 rounded-lg text-xs font-medium"
      style={{ backgroundColor: config.style.bg, color: config.style.text }}
    >
      <Icon className="w-3 h-3" />
      {config.label}
    </span>
  );
};

const StaffExpenseRequests = () => {
  useMultiTabLogout();
  
  const [myExpenses, setMyExpenses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [statusFilter, setStatusFilter] = useState('all');
  const [formData, setFormData] = useState({
    date: new Date().toISOString().split('T')[0],
    amount: '',
    category: '',
    description: '',
    paymentMethod: 'Cash'
  });

  const categories = [
    'Food Supplies',
    'Utilities',
    'Equipment',
    'Maintenance',
    'Marketing',
    'Other'
  ];

  // Fetch my expense requests
  useEffect(() => {
    const fetchMyExpenses = async () => {
      try {
        const response = await fetch(`${API_URL}/api/expenses/my-requests`, {
          headers: getAuthHeaders()
        });
        if (response.ok) {
          const result = await response.json();
          // Handle both { success, data } and direct array format
          const data = result.data || result;
          setMyExpenses(Array.isArray(data) ? data : []);
        }
      } catch (error) {
        console.error('Error fetching expenses:', error);
      } finally {
        setLoading(false);
      }
    };
    fetchMyExpenses();
  }, []);

  // Submit new expense request
  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      // Validate fields
      if (!formData.date || !formData.amount || !formData.category || !formData.description) {
        alert('Please fill all required fields');
        return;
      }

      const payload = {
        date: new Date(formData.date).toISOString(),
        amount: parseFloat(formData.amount),
        category: formData.category,
        description: formData.description,
        paymentMethod: formData.paymentMethod || 'Cash'
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
        throw new Error(responseData.message || 'Failed to submit request');
      }

      // Handle { success, data } response format
      const newExpense = responseData.data || responseData;
      setMyExpenses(prev => [newExpense, ...prev]);
      setShowModal(false);
      setFormData({
        date: new Date().toISOString().split('T')[0],
        amount: '',
        category: '',
        description: '',
        paymentMethod: 'Cash'
      });
    } catch (error) {
      console.error('Error submitting expense:', error);
      alert(error.message);
    }
  };

  // Filter expenses by status
  const filteredExpenses = statusFilter === 'all' 
    ? myExpenses 
    : myExpenses.filter(exp => exp.status === statusFilter);

  // Calculate totals
  const totals = {
    pending: myExpenses.filter(e => e.status === 'for_approval').length,
    approved: myExpenses.filter(e => e.status === 'approved').length,
    paid: myExpenses.filter(e => e.status === 'paid').length,
    rejected: myExpenses.filter(e => e.status === 'rejected').length
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen" style={{ backgroundColor: colors.background }}>
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2" style={{ borderColor: colors.accent }}></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen p-6 md:p-8 pt-24 md:pt-8" style={{ backgroundColor: colors.background }}>
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold" style={{ color: colors.primary }}>My Expense Requests</h1>
        <p className="mt-2 text-sm" style={{ color: colors.muted }}>
          Submit and track your expense requests. Approved expenses will be processed for payment.
        </p>
      </div>

      {/* Status Summary Cards - Using theme orange color */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <div className="p-4 rounded-lg" style={{ backgroundColor: colors.activeBg, border: `1px solid ${colors.accent}40` }}>
          <div className="flex items-center gap-2 mb-1">
            <FiClock className="w-4 h-4" style={{ color: colors.accent }} />
            <span className="text-sm font-medium" style={{ color: colors.accent }}>Pending</span>
          </div>
          <div className="text-2xl font-bold" style={{ color: colors.accent }}>{totals.pending}</div>
        </div>
        <div className="p-4 rounded-lg" style={{ backgroundColor: colors.activeBg, border: `1px solid ${colors.accent}40` }}>
          <div className="flex items-center gap-2 mb-1">
            <FiCheck className="w-4 h-4" style={{ color: colors.accent }} />
            <span className="text-sm font-medium" style={{ color: colors.accent }}>Approved</span>
          </div>
          <div className="text-2xl font-bold" style={{ color: colors.accent }}>{totals.approved}</div>
        </div>
        <div className="p-4 rounded-lg" style={{ backgroundColor: colors.activeBg, border: `1px solid ${colors.accent}40` }}>
          <div className="flex items-center gap-2 mb-1">
            <FiDollarSign className="w-4 h-4" style={{ color: colors.accent }} />
            <span className="text-sm font-medium" style={{ color: colors.accent }}>Paid</span>
          </div>
          <div className="text-2xl font-bold" style={{ color: colors.accent }}>{totals.paid}</div>
        </div>
        <div className="p-4 rounded-lg" style={{ backgroundColor: colors.secondary + '15', border: `1px solid ${colors.secondary}40` }}>
          <div className="flex items-center gap-2 mb-1">
            <FiX className="w-4 h-4" style={{ color: colors.secondary }} />
            <span className="text-sm font-medium" style={{ color: colors.secondary }}>Rejected</span>
          </div>
          <div className="text-2xl font-bold" style={{ color: colors.secondary }}>{totals.rejected}</div>
        </div>
      </div>

      {/* Filter Tabs and Add Button */}
      <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
        <div className="flex gap-2">
          {['all', 'for_approval', 'approved', 'paid', 'rejected'].map(status => (
            <button
              key={status}
              onClick={() => setStatusFilter(status)}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${
                statusFilter === status 
                  ? 'text-white' 
                  : 'text-gray-600 bg-gray-100 hover:bg-gray-200'
              }`}
              style={statusFilter === status ? { backgroundColor: colors.accent } : {}}
            >
              {status === 'all' ? 'All' : status === 'for_approval' ? 'Pending' : status.charAt(0).toUpperCase() + status.slice(1)}
            </button>
          ))}
        </div>
        <button
          onClick={() => setShowModal(true)}
          className="flex items-center gap-2 px-4 py-2 rounded-lg text-white font-medium hover:opacity-90 transition-opacity"
          style={{ backgroundColor: colors.accent }}
        >
          <FiPlus className="w-4 h-4" />
          New Request
        </button>
      </div>

      {/* Expense List */}
      <div className="rounded-xl overflow-hidden shadow-lg" style={{ border: `1px solid ${colors.muted}20` }}>
        {filteredExpenses.length > 0 ? (
          <div className="divide-y" style={{ borderColor: colors.muted + '20' }}>
            {filteredExpenses.map(expense => (
              <div key={expense._id} className="p-4 bg-white hover:bg-gray-50 transition-colors">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <StatusBadge status={expense.status} />
                      <span className="text-sm text-gray-500">
                        {new Date(expense.date).toLocaleDateString('en-PH', { month: 'short', day: 'numeric', year: 'numeric' })}
                      </span>
                    </div>
                    <h4 className="font-semibold text-gray-900">{expense.description}</h4>
                    <div className="flex items-center gap-4 mt-2 text-sm">
                      <span className="px-2 py-1 rounded-lg" style={{ backgroundColor: colors.muted + '20', color: colors.secondary }}>{expense.category}</span>
                      <span className="text-gray-500">{expense.paymentMethod}</span>
                    </div>
                    {expense.status === 'rejected' && expense.rejectionReason && (
                      <div className="mt-2 p-2 rounded bg-red-50 text-sm text-red-700">
                        <strong>Rejection reason:</strong> {expense.rejectionReason}
                      </div>
                    )}
                    {expense.status === 'approved' && expense.approverName && (
                      <div className="mt-2 text-sm text-gray-500">
                        Approved by {expense.approverName} on {new Date(expense.approvedAt).toLocaleDateString('en-PH')}
                      </div>
                    )}
                  </div>
                  <div className="text-right ml-4">
                    <div className="text-lg font-bold" style={{ color: colors.accent }}>
                      ₱{expense.amount?.toLocaleString('en-PH', { minimumFractionDigits: 2 })}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="p-12 text-center bg-white">
            <FiDollarSign className="w-12 h-12 mx-auto mb-4" style={{ color: colors.muted }} />
            <h3 className="text-lg font-medium" style={{ color: colors.secondary }}>
              {statusFilter === 'all' ? 'No expense requests yet' : `No ${statusFilter.replace('_', ' ')} requests`}
            </h3>
            <p className="text-sm mt-1" style={{ color: colors.muted }}>
              {statusFilter === 'all' ? 'Submit your first expense request using the button above' : 'Try changing the filter to see other requests'}
            </p>
          </div>
        )}
      </div>

      {/* New Request Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4" onClick={() => setShowModal(false)}>
          <div 
            className="bg-white p-6 rounded-lg max-w-lg w-full relative" 
            style={{ backgroundColor: colors.background, border: `1px solid ${colors.muted}60` }}
            onClick={(e) => e.stopPropagation()}
          >
            <button 
              onClick={() => setShowModal(false)} 
              className="absolute top-3 right-3 text-gray-400 hover:text-gray-600"
            >
              <FiX className="w-5 h-5" />
            </button>
            
            <h2 className="text-xl font-semibold mb-6" style={{ color: colors.secondary }}>
              New Expense Request
            </h2>
            
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1" style={{ color: colors.primary }}>Date</label>
                  <input
                    type="date"
                    className="w-full p-3 rounded-lg border focus:ring-2 focus:outline-none"
                    style={{ borderColor: colors.muted + '60' }}
                    value={formData.date}
                    onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1" style={{ color: colors.primary }}>Amount (₱)</label>
                  <input
                    type="number"
                    step="0.01"
                    className="w-full p-3 rounded-lg border focus:ring-2 focus:outline-none"
                    style={{ borderColor: colors.muted + '60' }}
                    value={formData.amount}
                    onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                    placeholder="0.00"
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1" style={{ color: colors.primary }}>Category</label>
                  <select
                    className="w-full p-3 rounded-lg border focus:ring-2 focus:outline-none"
                    style={{ borderColor: colors.muted + '60' }}
                    value={formData.category}
                    onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                    required
                  >
                    <option value="">Select Category</option>
                    {categories.map(cat => (
                      <option key={cat} value={cat}>{cat}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1" style={{ color: colors.primary }}>Payment Method</label>
                  <select
                    className="w-full p-3 rounded-lg border focus:ring-2 focus:outline-none"
                    style={{ borderColor: colors.muted + '60' }}
                    value={formData.paymentMethod}
                    onChange={(e) => setFormData({ ...formData, paymentMethod: e.target.value })}
                  >
                    <option value="Cash">Cash</option>
                    <option value="Bank Transfer">Bank Transfer</option>
                    <option value="Digital Wallet">Digital Wallet</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium mb-1" style={{ color: colors.primary }}>
                  Description / Purpose
                </label>
                <textarea
                  className="w-full p-3 rounded-lg border focus:ring-2 focus:outline-none"
                  style={{ borderColor: colors.muted + '60' }}
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  rows="3"
                  placeholder="Describe what this expense is for..."
                  required
                />
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="flex-1 py-3 px-4 rounded-lg border font-medium"
                  style={{ borderColor: colors.muted }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 py-3 px-4 rounded-lg text-white font-medium hover:opacity-90"
                  style={{ backgroundColor: colors.accent }}
                >
                  Submit Request
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default StaffExpenseRequests;
