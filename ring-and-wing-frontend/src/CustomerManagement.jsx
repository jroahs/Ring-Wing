/**
 * Customer Management Component
 * Admin interface for managing customer accounts
 * 
 * Created: November 25, 2025
 */

import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  FiUsers, FiSearch, FiFilter, FiPlus, FiEdit2, FiTrash2, 
  FiLock, FiUnlock, FiAlertCircle, FiCheck, FiX, FiChevronLeft,
  FiChevronRight, FiRefreshCw, FiEye, FiShield, FiActivity,
  FiUserCheck, FiUserX, FiClock, FiMail, FiPhone
} from 'react-icons/fi';
import { colors, theme } from './theme';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

// Customer status badge component
const StatusBadge = ({ customer }) => {
  if (customer.isBanned) {
    return (
      <span className="px-2 py-1 text-xs font-medium rounded-full" style={{ backgroundColor: '#fde8e8', color: '#c81e1e' }}>
        Banned
      </span>
    );
  }
  if (!customer.isActive) {
    return (
      <span className="px-2 py-1 text-xs font-medium rounded-full" style={{ backgroundColor: theme.colors.accent + '20', color: theme.colors.accent }}>
        Inactive
      </span>
    );
  }
  if (customer.deletedAt) {
    return (
      <span className="px-2 py-1 text-xs font-medium rounded-full" style={{ backgroundColor: theme.colors.muted + '20', color: theme.colors.muted }}>
        Deleted
      </span>
    );
  }
  return (
    <span className="px-2 py-1 text-xs font-medium rounded-full" style={{ backgroundColor: '#d1fae5', color: '#065f46' }}>
      Active
    </span>
  );
};

// Customer detail modal
const CustomerDetailModal = ({ customer, onClose, onUpdate, onBan, onUnban, onResetPassword }) => {
  const [activeTab, setActiveTab] = useState('details');
  const [activityLogs, setActivityLogs] = useState([]);
  const [loadingLogs, setLoadingLogs] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [editForm, setEditForm] = useState({
    firstName: customer?.firstName || '',
    lastName: customer?.lastName || '',
    username: customer?.username || '',
    email: customer?.email || '',
    phone: customer?.phone || ''
  });
  const [newPassword, setNewPassword] = useState('');
  const [showPasswordReset, setShowPasswordReset] = useState(false);
  const [statusReason, setStatusReason] = useState('');
  const [showStatusModal, setShowStatusModal] = useState(null); // 'deactivate', 'ban', 'activate', 'unban'

  useEffect(() => {
    if (activeTab === 'activity' && customer) {
      fetchActivityLogs();
    }
  }, [activeTab, customer]);

  const fetchActivityLogs = async () => {
    setLoadingLogs(true);
    try {
      const token = localStorage.getItem('authToken');
      const response = await fetch(`${API_URL}/api/admin/customers/${customer._id}/activity`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await response.json();
      if (data.success) {
        setActivityLogs(data.data);
      }
    } catch (error) {
      console.error('Error fetching activity logs:', error);
    } finally {
      setLoadingLogs(false);
    }
  };

  const handleSaveEdit = async () => {
    await onUpdate(customer._id, editForm);
    setEditMode(false);
  };

  const handlePasswordReset = async () => {
    if (newPassword.length < 6) {
      alert('Password must be at least 6 characters');
      return;
    }
    await onResetPassword(customer._id, newPassword);
    setNewPassword('');
    setShowPasswordReset(false);
  };

  const handleStatusChange = async (action) => {
    if (action === 'ban') {
      await onBan(customer._id, statusReason);
    } else if (action === 'unban') {
      await onUnban(customer._id);
    } else if (action === 'deactivate') {
      await onUpdate(customer._id, { isActive: false }, statusReason);
    } else if (action === 'activate') {
      await onUpdate(customer._id, { isActive: true });
    }
    setShowStatusModal(null);
    setStatusReason('');
  };

  const formatDate = (date) => {
    if (!date) return 'Never';
    return new Date(date).toLocaleString('en-PH', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getActionLabel = (action) => {
    const labels = {
      'login': 'Logged in',
      'logout': 'Logged out',
      'login_failed': 'Failed login attempt',
      'password_changed': 'Changed password',
      'password_reset_by_admin': 'Password reset by admin',
      'profile_updated': 'Updated profile',
      'profile_updated_by_admin': 'Profile updated by admin',
      'account_created': 'Account created',
      'account_created_by_admin': 'Account created by admin',
      'account_activated': 'Account activated',
      'account_deactivated': 'Account deactivated',
      'account_banned': 'Account banned',
      'account_unbanned': 'Account unbanned',
      'order_placed': 'Placed an order'
    };
    return labels[action] || action;
  };

  if (!customer) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <motion.div 
        className="bg-white rounded-xl shadow-2xl w-full max-w-3xl max-h-[90vh] overflow-hidden"
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
      >
        {/* Header */}
        <div className="px-6 py-4 border-b flex items-center justify-between" style={{ backgroundColor: theme.colors.primary }}>
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-full bg-white/20 flex items-center justify-center text-white text-xl font-bold">
              {customer.firstName?.charAt(0)}{customer.lastName?.charAt(0)}
            </div>
            <div className="text-white">
              <h2 className="text-lg font-bold">{customer.firstName} {customer.lastName}</h2>
              <p className="text-white/70 text-sm">@{customer.username}</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <StatusBadge customer={customer} />
            <button onClick={onClose} className="text-white/70 hover:text-white">
              <FiX size={24} />
            </button>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex border-b">
          <button
            onClick={() => setActiveTab('details')}
            className={`px-6 py-3 font-medium transition-colors ${
              activeTab === 'details' 
                ? 'border-b-2 text-orange-600' 
                : 'text-gray-500 hover:text-gray-700'
            }`}
            style={activeTab === 'details' ? { borderColor: theme.colors.accent } : {}}
          >
            Details
          </button>
          <button
            onClick={() => setActiveTab('activity')}
            className={`px-6 py-3 font-medium transition-colors flex items-center gap-2 ${
              activeTab === 'activity' 
                ? 'border-b-2 text-orange-600' 
                : 'text-gray-500 hover:text-gray-700'
            }`}
            style={activeTab === 'activity' ? { borderColor: theme.colors.accent } : {}}
          >
            <FiActivity size={16} />
            Activity Log
          </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto" style={{ maxHeight: 'calc(90vh - 180px)' }}>
          {activeTab === 'details' && (
            <div className="space-y-6">
              {/* Customer Info */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm text-gray-500">First Name</label>
                  {editMode ? (
                    <input
                      type="text"
                      value={editForm.firstName}
                      onChange={(e) => setEditForm({ ...editForm, firstName: e.target.value })}
                      className="w-full px-3 py-2 border rounded-lg mt-1"
                    />
                  ) : (
                    <p className="font-medium">{customer.firstName}</p>
                  )}
                </div>
                <div>
                  <label className="text-sm text-gray-500">Last Name</label>
                  {editMode ? (
                    <input
                      type="text"
                      value={editForm.lastName}
                      onChange={(e) => setEditForm({ ...editForm, lastName: e.target.value })}
                      className="w-full px-3 py-2 border rounded-lg mt-1"
                    />
                  ) : (
                    <p className="font-medium">{customer.lastName}</p>
                  )}
                </div>
                <div>
                  <label className="text-sm text-gray-500">Username</label>
                  {editMode ? (
                    <input
                      type="text"
                      value={editForm.username}
                      onChange={(e) => setEditForm({ ...editForm, username: e.target.value })}
                      className="w-full px-3 py-2 border rounded-lg mt-1"
                    />
                  ) : (
                    <p className="font-medium">@{customer.username}</p>
                  )}
                </div>
                <div>
                  <label className="text-sm text-gray-500">Phone</label>
                  {editMode ? (
                    <input
                      type="text"
                      value={editForm.phone}
                      onChange={(e) => setEditForm({ ...editForm, phone: e.target.value })}
                      className="w-full px-3 py-2 border rounded-lg mt-1"
                    />
                  ) : (
                    <p className="font-medium flex items-center gap-2">
                      <FiPhone size={14} />
                      {customer.phone}
                    </p>
                  )}
                </div>
                <div className="col-span-2">
                  <label className="text-sm text-gray-500">Email</label>
                  {editMode ? (
                    <input
                      type="email"
                      value={editForm.email}
                      onChange={(e) => setEditForm({ ...editForm, email: e.target.value })}
                      className="w-full px-3 py-2 border rounded-lg mt-1"
                    />
                  ) : (
                    <p className="font-medium flex items-center gap-2">
                      <FiMail size={14} />
                      {customer.email || 'Not provided'}
                    </p>
                  )}
                </div>
              </div>

              {/* Edit/Save buttons */}
              <div className="flex gap-2">
                {editMode ? (
                  <>
                    <button
                      onClick={handleSaveEdit}
                      className="px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 flex items-center gap-2"
                    >
                      <FiCheck size={16} />
                      Save Changes
                    </button>
                    <button
                      onClick={() => setEditMode(false)}
                      className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300"
                    >
                      Cancel
                    </button>
                  </>
                ) : (
                  <button
                    onClick={() => setEditMode(true)}
                    className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 flex items-center gap-2"
                  >
                    <FiEdit2 size={16} />
                    Edit Details
                  </button>
                )}
              </div>

              {/* Account Stats */}
              <div className="grid grid-cols-3 gap-4 p-4 bg-gray-50 rounded-lg">
                <div className="text-center">
                  <p className="text-2xl font-bold" style={{ color: theme.colors.primary }}>
                    {customer.totalOrders || 0}
                  </p>
                  <p className="text-sm text-gray-500">Total Orders</p>
                </div>
                <div className="text-center">
                  <p className="text-2xl font-bold" style={{ color: theme.colors.accent }}>
                    ₱{(customer.totalSpent || 0).toFixed(2)}
                  </p>
                  <p className="text-sm text-gray-500">Total Spent</p>
                </div>
                <div className="text-center">
                  <p className="text-2xl font-bold text-gray-600">
                    {formatDate(customer.lastLogin).split(',')[0]}
                  </p>
                  <p className="text-sm text-gray-500">Last Login</p>
                </div>
              </div>

              {/* Account Dates */}
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div className="flex items-center gap-2 text-gray-600">
                  <FiClock size={14} />
                  <span>Created: {formatDate(customer.createdAt)}</span>
                </div>
                <div className="flex items-center gap-2 text-gray-600">
                  <FiClock size={14} />
                  <span>Last Login: {formatDate(customer.lastLogin)}</span>
                </div>
              </div>

              {/* Password Reset */}
              <div className="border-t pt-4">
                <h3 className="font-medium mb-3 flex items-center gap-2">
                  <FiLock size={16} />
                  Password Management
                </h3>
                {showPasswordReset ? (
                  <div className="flex gap-2">
                    <input
                      type="password"
                      placeholder="New password (min 6 characters)"
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      className="flex-1 px-3 py-2 border rounded-lg"
                    />
                    <button
                      onClick={handlePasswordReset}
                      className="px-4 py-2 bg-orange-500 text-white rounded-lg hover:bg-orange-600"
                    >
                      Reset
                    </button>
                    <button
                      onClick={() => setShowPasswordReset(false)}
                      className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300"
                    >
                      Cancel
                    </button>
                  </div>
                ) : (
                  <button
                    onClick={() => setShowPasswordReset(true)}
                    className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 flex items-center gap-2"
                  >
                    <FiLock size={16} />
                    Reset Password
                  </button>
                )}
              </div>

              {/* Account Actions */}
              <div className="border-t pt-4">
                <h3 className="font-medium mb-3 flex items-center gap-2">
                  <FiShield size={16} />
                  Account Actions
                </h3>
                <div className="flex gap-2 flex-wrap">
                  {customer.isBanned ? (
                    <button
                      onClick={() => setShowStatusModal('unban')}
                      className="px-4 py-2 bg-green-100 text-green-700 rounded-lg hover:bg-green-200 flex items-center gap-2"
                    >
                      <FiUnlock size={16} />
                      Unban Account
                    </button>
                  ) : customer.isActive ? (
                    <>
                      <button
                        onClick={() => setShowStatusModal('deactivate')}
                        className="px-4 py-2 bg-yellow-100 text-yellow-700 rounded-lg hover:bg-yellow-200 flex items-center gap-2"
                      >
                        <FiUserX size={16} />
                        Deactivate
                      </button>
                      <button
                        onClick={() => setShowStatusModal('ban')}
                        className="px-4 py-2 bg-red-100 text-red-700 rounded-lg hover:bg-red-200 flex items-center gap-2"
                      >
                        <FiAlertCircle size={16} />
                        Ban Account
                      </button>
                    </>
                  ) : (
                    <>
                      <button
                        onClick={() => setShowStatusModal('activate')}
                        className="px-4 py-2 bg-green-100 text-green-700 rounded-lg hover:bg-green-200 flex items-center gap-2"
                      >
                        <FiUserCheck size={16} />
                        Activate
                      </button>
                      <button
                        onClick={() => setShowStatusModal('ban')}
                        className="px-4 py-2 bg-red-100 text-red-700 rounded-lg hover:bg-red-200 flex items-center gap-2"
                      >
                        <FiAlertCircle size={16} />
                        Ban Account
                      </button>
                    </>
                  )}
                </div>

                {/* Ban/Deactivate reason */}
                {customer.banReason && (
                  <div className="mt-3 p-3 bg-red-50 rounded-lg text-sm">
                    <p className="font-medium text-red-700">Ban Reason:</p>
                    <p className="text-red-600">{customer.banReason}</p>
                  </div>
                )}
              </div>
            </div>
          )}

          {activeTab === 'activity' && (
            <div>
              {loadingLogs ? (
                <div className="flex justify-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2" style={{ borderColor: theme.colors.accent }}></div>
                </div>
              ) : activityLogs.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  <FiActivity size={48} className="mx-auto mb-3 opacity-50" />
                  <p>No activity logs found</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {activityLogs.map((log, index) => (
                    <div key={index} className="flex items-start gap-3 p-3 bg-gray-50 rounded-lg">
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center text-white text-xs ${
                        log.action.includes('banned') ? 'bg-red-500' :
                        log.action.includes('deactivated') ? 'bg-yellow-500' :
                        log.action.includes('activated') || log.action.includes('unbanned') ? 'bg-green-500' :
                        log.action.includes('login') ? 'bg-blue-500' :
                        'bg-gray-500'
                      }`}>
                        {log.action.includes('login') ? <FiUserCheck size={14} /> :
                         log.action.includes('banned') ? <FiAlertCircle size={14} /> :
                         <FiActivity size={14} />}
                      </div>
                      <div className="flex-1">
                        <p className="font-medium text-sm">{getActionLabel(log.action)}</p>
                        <p className="text-xs text-gray-500">{formatDate(log.timestamp)}</p>
                        {log.details && Object.keys(log.details).length > 0 && (
                          <p className="text-xs text-gray-600 mt-1">
                            {log.details.performedByName && `By: ${log.details.performedByName}`}
                            {log.details.reason && ` - Reason: ${log.details.reason}`}
                          </p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Status Change Modal */}
        <AnimatePresence>
          {showStatusModal && (
            <motion.div
              className="absolute inset-0 bg-black/50 flex items-center justify-center p-4"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
            >
              <motion.div 
                className="bg-white rounded-xl p-6 max-w-md w-full"
                initial={{ scale: 0.9 }}
                animate={{ scale: 1 }}
              >
                <h3 className="text-lg font-bold mb-4">
                  {showStatusModal === 'ban' && 'Ban Customer Account'}
                  {showStatusModal === 'unban' && 'Unban Customer Account'}
                  {showStatusModal === 'deactivate' && 'Deactivate Customer Account'}
                  {showStatusModal === 'activate' && 'Activate Customer Account'}
                </h3>
                
                {(showStatusModal === 'ban' || showStatusModal === 'deactivate') && (
                  <div className="mb-4">
                    <label className="text-sm text-gray-600">Reason (optional)</label>
                    <textarea
                      value={statusReason}
                      onChange={(e) => setStatusReason(e.target.value)}
                      className="w-full px-3 py-2 border rounded-lg mt-1"
                      rows={3}
                      placeholder="Enter reason for this action..."
                    />
                  </div>
                )}

                <div className="flex gap-2 justify-end">
                  <button
                    onClick={() => setShowStatusModal(null)}
                    className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={() => handleStatusChange(showStatusModal)}
                    className={`px-4 py-2 text-white rounded-lg ${
                      showStatusModal === 'ban' ? 'bg-red-500 hover:bg-red-600' :
                      showStatusModal === 'deactivate' ? 'bg-yellow-500 hover:bg-yellow-600' :
                      'bg-green-500 hover:bg-green-600'
                    }`}
                  >
                    Confirm
                  </button>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    </div>
  );
};

// Create Customer Modal
const CreateCustomerModal = ({ onClose, onCreate }) => {
  const [form, setForm] = useState({
    firstName: '',
    lastName: '',
    username: '',
    phone: '',
    email: '',
    password: '',
    isActive: true
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      await onCreate(form);
      onClose();
    } catch (err) {
      setError(err.message || 'Error creating customer');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <motion.div 
        className="bg-white rounded-xl shadow-2xl w-full max-w-md"
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
      >
        <div className="px-6 py-4 border-b flex items-center justify-between">
          <h2 className="text-lg font-bold" style={{ color: theme.colors.primary }}>Create New Customer</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <FiX size={24} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {error && (
            <div className="p-3 bg-red-50 text-red-700 rounded-lg text-sm">
              {error}
            </div>
          )}

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium text-gray-700">First Name *</label>
              <input
                type="text"
                required
                value={form.firstName}
                onChange={(e) => setForm({ ...form, firstName: e.target.value })}
                className="w-full px-3 py-2 border rounded-lg mt-1"
              />
            </div>
            <div>
              <label className="text-sm font-medium text-gray-700">Last Name *</label>
              <input
                type="text"
                required
                value={form.lastName}
                onChange={(e) => setForm({ ...form, lastName: e.target.value })}
                className="w-full px-3 py-2 border rounded-lg mt-1"
              />
            </div>
          </div>

          <div>
            <label className="text-sm font-medium text-gray-700">Username *</label>
            <input
              type="text"
              required
              value={form.username}
              onChange={(e) => setForm({ ...form, username: e.target.value.toLowerCase() })}
              className="w-full px-3 py-2 border rounded-lg mt-1"
              placeholder="lowercase, numbers, underscores only"
            />
          </div>

          <div>
            <label className="text-sm font-medium text-gray-700">Phone *</label>
            <input
              type="text"
              required
              value={form.phone}
              onChange={(e) => setForm({ ...form, phone: e.target.value })}
              className="w-full px-3 py-2 border rounded-lg mt-1"
              placeholder="09XXXXXXXXX"
            />
          </div>

          <div>
            <label className="text-sm font-medium text-gray-700">Email</label>
            <input
              type="email"
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
              className="w-full px-3 py-2 border rounded-lg mt-1"
            />
          </div>

          <div>
            <label className="text-sm font-medium text-gray-700">Password *</label>
            <input
              type="password"
              required
              minLength={6}
              value={form.password}
              onChange={(e) => setForm({ ...form, password: e.target.value })}
              className="w-full px-3 py-2 border rounded-lg mt-1"
              placeholder="Min 6 characters"
            />
          </div>

          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="isActive"
              checked={form.isActive}
              onChange={(e) => setForm({ ...form, isActive: e.target.checked })}
              className="rounded"
            />
            <label htmlFor="isActive" className="text-sm text-gray-700">Account is active</label>
          </div>

          <div className="flex gap-2 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex-1 px-4 py-2 text-white rounded-lg hover:opacity-90 flex items-center justify-center gap-2"
              style={{ backgroundColor: theme.colors.accent }}
            >
              {loading ? (
                <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
              ) : (
                <>
                  <FiPlus size={16} />
                  Create Customer
                </>
              )}
            </button>
          </div>
        </form>
      </motion.div>
    </div>
  );
};

// Main CustomerManagement Component
const CustomerManagement = () => {
  const [customers, setCustomers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [pagination, setPagination] = useState({ page: 1, pages: 1, total: 0 });
  const [selectedCustomer, setSelectedCustomer] = useState(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [stats, setStats] = useState(null);
  const [refreshing, setRefreshing] = useState(false);

  const fetchCustomers = useCallback(async (page = 1) => {
    setLoading(true);
    try {
      const token = localStorage.getItem('authToken');
      const params = new URLSearchParams({
        search,
        status: statusFilter,
        page,
        limit: 20
      });
      
      const response = await fetch(`${API_URL}/api/admin/customers?${params}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await response.json();
      
      if (data.success) {
        setCustomers(data.data);
        setPagination(data.pagination);
      }
    } catch (error) {
      console.error('Error fetching customers:', error);
    } finally {
      setLoading(false);
    }
  }, [search, statusFilter]);

  const fetchStats = async () => {
    try {
      const token = localStorage.getItem('authToken');
      const response = await fetch(`${API_URL}/api/admin/customers/stats`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await response.json();
      if (data.success) {
        setStats(data.data);
      }
    } catch (error) {
      console.error('Error fetching stats:', error);
    }
  };

  useEffect(() => {
    fetchCustomers();
    fetchStats();
  }, [fetchCustomers]);

  const handleRefresh = async () => {
    setRefreshing(true);
    await Promise.all([fetchCustomers(), fetchStats()]);
    setRefreshing(false);
  };

  const handleCreateCustomer = async (customerData) => {
    const token = localStorage.getItem('authToken');
    const response = await fetch(`${API_URL}/api/admin/customers`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`
      },
      body: JSON.stringify(customerData)
    });
    const data = await response.json();
    if (!data.success) {
      throw new Error(data.message);
    }
    await handleRefresh();
  };

  const handleUpdateCustomer = async (customerId, updates, reason = null) => {
    const token = localStorage.getItem('authToken');
    
    // If it's a status change
    if ('isActive' in updates && Object.keys(updates).length === 1) {
      const response = await fetch(`${API_URL}/api/admin/customers/${customerId}/status`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ isActive: updates.isActive, reason })
      });
      const data = await response.json();
      if (!data.success) {
        throw new Error(data.message);
      }
    } else {
      // Regular profile update
      const response = await fetch(`${API_URL}/api/admin/customers/${customerId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify(updates)
      });
      const data = await response.json();
      if (!data.success) {
        throw new Error(data.message);
      }
    }
    
    await handleRefresh();
    // Update selected customer if it's the one being edited
    if (selectedCustomer?._id === customerId) {
      const token = localStorage.getItem('authToken');
      const response = await fetch(`${API_URL}/api/admin/customers/${customerId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await response.json();
      if (data.success) {
        setSelectedCustomer(data.data);
      }
    }
  };

  const handleResetPassword = async (customerId, newPassword) => {
    const token = localStorage.getItem('authToken');
    const response = await fetch(`${API_URL}/api/admin/customers/${customerId}/reset-password`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`
      },
      body: JSON.stringify({ newPassword })
    });
    const data = await response.json();
    if (!data.success) {
      throw new Error(data.message);
    }
    alert('Password reset successfully');
  };

  const handleBanCustomer = async (customerId, reason) => {
    const token = localStorage.getItem('authToken');
    const response = await fetch(`${API_URL}/api/admin/customers/${customerId}/ban`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`
      },
      body: JSON.stringify({ reason })
    });
    const data = await response.json();
    if (!data.success) {
      throw new Error(data.message);
    }
    await handleRefresh();
    if (selectedCustomer?._id === customerId) {
      setSelectedCustomer({ ...selectedCustomer, isBanned: true, isActive: false, banReason: reason });
    }
  };

  const handleUnbanCustomer = async (customerId) => {
    const token = localStorage.getItem('authToken');
    const response = await fetch(`${API_URL}/api/admin/customers/${customerId}/unban`, {
      method: 'PUT',
      headers: {
        Authorization: `Bearer ${token}`
      }
    });
    const data = await response.json();
    if (!data.success) {
      throw new Error(data.message);
    }
    await handleRefresh();
    if (selectedCustomer?._id === customerId) {
      setSelectedCustomer({ ...selectedCustomer, isBanned: false, isActive: true, banReason: null });
    }
  };

  return (
    <div className="min-h-screen p-6 pt-16 md:pt-6" style={{ backgroundColor: colors.background }}>
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold" style={{ color: theme.colors.primary }}>
              Customer Management
            </h1>
            <p className="text-gray-500 text-sm">Manage customer accounts and permissions</p>
          </div>
          <div className="flex gap-2 mt-4 md:mt-0">
            <button
              onClick={handleRefresh}
              disabled={refreshing}
              className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 flex items-center gap-2"
            >
              <FiRefreshCw className={refreshing ? 'animate-spin' : ''} size={16} />
              Refresh
            </button>
            <button
              onClick={() => setShowCreateModal(true)}
              className="px-4 py-2 text-white rounded-lg hover:opacity-90 flex items-center gap-2"
              style={{ backgroundColor: theme.colors.accent }}
            >
              <FiPlus size={16} />
              Add Customer
            </button>
          </div>
        </div>

        {/* Stats Cards */}
        {stats && (
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-6">
            <div className="bg-white rounded-xl p-4 shadow-sm">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full flex items-center justify-center" style={{ backgroundColor: theme.colors.primary + '15' }}>
                  <FiUsers size={20} style={{ color: theme.colors.primary }} />
                </div>
                <div>
                  <p className="text-2xl font-bold" style={{ color: theme.colors.primary }}>{stats.totalCustomers}</p>
                  <p className="text-xs text-gray-500">Total</p>
                </div>
              </div>
            </div>
            <div className="bg-white rounded-xl p-4 shadow-sm">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full flex items-center justify-center bg-green-100">
                  <FiUserCheck size={20} className="text-green-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-green-600">{stats.activeCustomers}</p>
                  <p className="text-xs text-gray-500">Active</p>
                </div>
              </div>
            </div>
            <div className="bg-white rounded-xl p-4 shadow-sm">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full flex items-center justify-center bg-yellow-100">
                  <FiUserX size={20} className="text-yellow-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-yellow-600">{stats.inactiveCustomers}</p>
                  <p className="text-xs text-gray-500">Inactive</p>
                </div>
              </div>
            </div>
            <div className="bg-white rounded-xl p-4 shadow-sm">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full flex items-center justify-center bg-red-100">
                  <FiAlertCircle size={20} className="text-red-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-red-600">{stats.bannedCustomers}</p>
                  <p className="text-xs text-gray-500">Banned</p>
                </div>
              </div>
            </div>
            <div className="bg-white rounded-xl p-4 shadow-sm">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full flex items-center justify-center" style={{ backgroundColor: theme.colors.accent + '15' }}>
                  <FiPlus size={20} style={{ color: theme.colors.accent }} />
                </div>
                <div>
                  <p className="text-2xl font-bold" style={{ color: theme.colors.accent }}>{stats.newThisMonth}</p>
                  <p className="text-xs text-gray-500">This Month</p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Search and Filter */}
        <div className="bg-white rounded-xl shadow-sm mb-6">
          <div className="p-4 flex flex-col md:flex-row gap-4">
            <div className="flex-1 relative">
              <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
              <input
                type="text"
                placeholder="Search by name, username, email, or phone..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border rounded-lg"
              />
            </div>
            <div className="flex gap-2">
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="px-4 py-2 border rounded-lg bg-white"
              >
                <option value="all">All Status</option>
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
                <option value="deleted">Deleted</option>
              </select>
            </div>
          </div>
        </div>

        {/* Customer List */}
        <div className="bg-white rounded-xl shadow-sm overflow-hidden">
          {loading ? (
            <div className="flex justify-center py-12">
              <div className="animate-spin rounded-full h-10 w-10 border-b-2" style={{ borderColor: theme.colors.accent }}></div>
            </div>
          ) : customers.length === 0 ? (
            <div className="text-center py-12 text-gray-500">
              <FiUsers size={48} className="mx-auto mb-3 opacity-50" />
              <p>No customers found</p>
            </div>
          ) : (
            <>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="bg-gray-50 text-left">
                      <th className="px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">Customer</th>
                      <th className="px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">Contact</th>
                      <th className="px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">Orders</th>
                      <th className="px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                      <th className="px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">Joined</th>
                      <th className="px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {customers.map((customer) => (
                      <tr key={customer._id} className="hover:bg-gray-50">
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-full flex items-center justify-center text-white font-medium" style={{ backgroundColor: theme.colors.primary }}>
                              {customer.firstName?.charAt(0)}{customer.lastName?.charAt(0)}
                            </div>
                            <div>
                              <p className="font-medium">{customer.firstName} {customer.lastName}</p>
                              <p className="text-sm text-gray-500">@{customer.username}</p>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <p className="text-sm">{customer.phone}</p>
                          <p className="text-sm text-gray-500">{customer.email || '-'}</p>
                        </td>
                        <td className="px-6 py-4">
                          <p className="font-medium">{customer.totalOrders || 0}</p>
                          <p className="text-sm text-gray-500">₱{(customer.totalSpent || 0).toFixed(2)}</p>
                        </td>
                        <td className="px-6 py-4">
                          <StatusBadge customer={customer} />
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-500">
                          {new Date(customer.createdAt).toLocaleDateString('en-PH', {
                            month: 'short',
                            day: 'numeric',
                            year: 'numeric'
                          })}
                        </td>
                        <td className="px-6 py-4">
                          <button
                            onClick={() => setSelectedCustomer(customer)}
                            className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg"
                          >
                            <FiEye size={18} />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Pagination */}
              <div className="px-6 py-4 border-t flex items-center justify-between">
                <p className="text-sm text-gray-500">
                  Showing {((pagination.page - 1) * 20) + 1} to {Math.min(pagination.page * 20, pagination.total)} of {pagination.total} customers
                </p>
                <div className="flex gap-2">
                  <button
                    onClick={() => fetchCustomers(pagination.page - 1)}
                    disabled={pagination.page <= 1}
                    className="p-2 border rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
                  >
                    <FiChevronLeft size={20} />
                  </button>
                  <span className="px-4 py-2 text-sm">
                    Page {pagination.page} of {pagination.pages}
                  </span>
                  <button
                    onClick={() => fetchCustomers(pagination.page + 1)}
                    disabled={pagination.page >= pagination.pages}
                    className="p-2 border rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
                  >
                    <FiChevronRight size={20} />
                  </button>
                </div>
              </div>
            </>
          )}
        </div>
      </div>

      {/* Modals */}
      <AnimatePresence>
        {selectedCustomer && (
          <CustomerDetailModal
            customer={selectedCustomer}
            onClose={() => setSelectedCustomer(null)}
            onUpdate={handleUpdateCustomer}
            onBan={handleBanCustomer}
            onUnban={handleUnbanCustomer}
            onResetPassword={handleResetPassword}
          />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showCreateModal && (
          <CreateCustomerModal
            onClose={() => setShowCreateModal(false)}
            onCreate={handleCreateCustomer}
          />
        )}
      </AnimatePresence>
    </div>
  );
};

export default CustomerManagement;
