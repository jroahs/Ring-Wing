import React, { useState, useEffect } from 'react';
import { 
  FiCalendar, 
  FiUsers, 
  FiFileText, 
  FiDownload, 
  FiCheck,
  FiClock,
  FiLock,
  FiX,
  FiEye,
  FiEdit,
  FiAlertCircle,
  FiFilter,
  FiArrowLeft,
  FiCheckCircle
} from 'react-icons/fi';
import { PesoIconSimple } from './components/ui/PesoIconSimple';
import api from './services/apiService';
import { toast } from 'react-toastify';
import BrandedLoadingScreen from './components/ui/BrandedLoadingScreen';

const PayrollHistory = ({ onBack, colors }) => {
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
  const [batches, setBatches] = useState([]);
  const [selectedBatch, setSelectedBatch] = useState(null);
  const [viewMode, setViewMode] = useState('list'); // 'list' or 'detail'
  
  // Filters
  const [filters, setFilters] = useState({
    status: '',
    startDate: '',
    endDate: ''
  });
  
  // Pagination
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 20,
    total: 0,
    pages: 0
  });

  // Status styling
  const getStatusStyle = (status) => {
    const styles = {
      draft: { bg: '#FEF3C7', text: '#92400E', icon: FiEdit },
      pending: { bg: '#DBEAFE', text: '#1E40AF', icon: FiClock },
      approved: { bg: '#D1FAE5', text: '#065F46', icon: FiCheckCircle },
      locked: { bg: '#E5E7EB', text: '#1F2937', icon: FiLock },
      cancelled: { bg: '#FEE2E2', text: '#991B1B', icon: FiX }
    };
    return styles[status] || styles.draft;
  };

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

  const formatDateTime = (dateString) => {
    return new Date(dateString).toLocaleString('en-PH', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  // Fetch batches
  const fetchBatches = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('authToken');
      const params = new URLSearchParams({
        page: pagination.page,
        limit: pagination.limit,
        ...(filters.status && { status: filters.status }),
        ...(filters.startDate && { startDate: filters.startDate }),
        ...(filters.endDate && { endDate: filters.endDate })
      });

      const response = await api.get(`/api/payroll/batch/history?${params}`, {
        headers: { Authorization: `Bearer ${token}` }
      });

      if (response.data.success) {
        setBatches(response.data.data);
        setPagination(response.data.pagination);
      }
    } catch (error) {
      console.error('Error fetching payroll history:', error);
      toast.error('Failed to load payroll history');
    } finally {
      setLoading(false);
    }
  };

  // Fetch batch details
  const fetchBatchDetails = async (batchId) => {
    setLoading(true);
    try {
      const token = localStorage.getItem('authToken');
      const response = await api.get(`/api/payroll/batch/${batchId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });

      if (response.data.success) {
        setSelectedBatch(response.data.data);
        setViewMode('detail');
      }
    } catch (error) {
      console.error('Error fetching batch details:', error);
      toast.error('Failed to load batch details');
    } finally {
      setLoading(false);
    }
  };

  // Workflow actions
  const handleSubmitForApproval = async (batchId) => {
    try {
      const token = localStorage.getItem('authToken');
      const response = await api.put(`/api/payroll/batch/${batchId}/submit`, {}, {
        headers: { Authorization: `Bearer ${token}` }
      });

      if (response.data.success) {
        toast.success('Payroll batch submitted for approval');
        fetchBatches();
        if (selectedBatch?._id === batchId) {
          fetchBatchDetails(batchId);
        }
      }
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to submit batch');
    }
  };

  const handleApprove = async (batchId) => {
    const notes = prompt('Approval notes (optional):');
    try {
      const token = localStorage.getItem('authToken');
      const response = await api.put(`/api/payroll/batch/${batchId}/approve`, 
        { approvalNotes: notes || '' },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      if (response.data.success) {
        toast.success('Payroll batch approved');
        fetchBatches();
        if (selectedBatch?._id === batchId) {
          fetchBatchDetails(batchId);
        }
      }
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to approve batch');
    }
  };

  const handleLock = async (batchId) => {
    if (!window.confirm('Lock this payroll batch? This will finalize the batch and prevent further edits.')) {
      return;
    }

    try {
      const token = localStorage.getItem('authToken');
      const response = await api.put(`/api/payroll/batch/${batchId}/lock`, {}, {
        headers: { Authorization: `Bearer ${token}` }
      });

      if (response.data.success) {
        toast.success('Payroll batch locked successfully');
        fetchBatches();
        if (selectedBatch?._id === batchId) {
          fetchBatchDetails(batchId);
        }
      }
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to lock batch');
    }
  };

  const handleCancel = async (batchId) => {
    const reason = prompt('Cancellation reason:');
    if (!reason) return;

    try {
      const token = localStorage.getItem('authToken');
      const response = await api.put(`/api/payroll/batch/${batchId}/cancel`, 
        { reason },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      if (response.data.success) {
        toast.success('Payroll batch cancelled');
        fetchBatches();
        if (selectedBatch?._id === batchId) {
          fetchBatchDetails(batchId);
        }
      }
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to cancel batch');
    }
  };

  const trackExport = async (batchId, format) => {
    try {
      const token = localStorage.getItem('authToken');
      await api.post(`/api/payroll/batch/${batchId}/export`, 
        { format },
        { headers: { Authorization: `Bearer ${token}` } }
      );
    } catch (error) {
      console.error('Error tracking export:', error);
    }
  };

  useEffect(() => {
    fetchBatches();
  }, [pagination.page, filters]);

  if (loading && viewMode === 'list') {
    return <BrandedLoadingScreen />;
  }

  // Render batch list view
  const renderBatchList = () => (
    <div className="min-h-screen p-6" style={{ backgroundColor: c.background }}>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-4">
          <button
            onClick={onBack}
            className="p-2 rounded-lg hover:opacity-80 transition-opacity"
            style={{ backgroundColor: c.primary, color: 'white' }}
          >
            <FiArrowLeft size={20} />
          </button>
          <div>
            <h1 className="text-3xl font-bold" style={{ color: c.primary }}>
              <FiFileText className="inline mr-2 mb-1" />
              Payroll History
            </h1>
            <p className="text-sm" style={{ color: c.muted }}>
              View and manage all payroll batches
            </p>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-lg shadow-md p-4 mb-6">
        <div className="flex items-center gap-4 flex-wrap">
          <div className="flex items-center gap-2">
            <FiFilter style={{ color: c.muted }} />
            <span className="text-sm font-medium" style={{ color: c.text }}>Filters:</span>
          </div>
          
          <select
            value={filters.status}
            onChange={(e) => setFilters({ ...filters, status: e.target.value })}
            className="px-3 py-2 border rounded-lg text-sm"
            style={{ borderColor: c.muted + '50' }}
          >
            <option value="">All Status</option>
            <option value="draft">Draft</option>
            <option value="pending">Pending</option>
            <option value="approved">Approved</option>
            <option value="locked">Locked</option>
            <option value="cancelled">Cancelled</option>
          </select>

          <input
            type="date"
            value={filters.startDate}
            onChange={(e) => setFilters({ ...filters, startDate: e.target.value })}
            className="px-3 py-2 border rounded-lg text-sm"
            style={{ borderColor: c.muted + '50' }}
            placeholder="Start Date"
          />

          <input
            type="date"
            value={filters.endDate}
            onChange={(e) => setFilters({ ...filters, endDate: e.target.value })}
            className="px-3 py-2 border rounded-lg text-sm"
            style={{ borderColor: c.muted + '50' }}
            placeholder="End Date"
          />

          {(filters.status || filters.startDate || filters.endDate) && (
            <button
              onClick={() => setFilters({ status: '', startDate: '', endDate: '' })}
              className="text-sm px-3 py-2 rounded-lg hover:opacity-80"
              style={{ backgroundColor: c.muted + '20', color: c.muted }}
            >
              Clear Filters
            </button>
          )}
        </div>
      </div>

      {/* Batch List */}
      <div className="space-y-4">
        {batches.length === 0 ? (
          <div className="bg-white rounded-lg shadow-md p-12 text-center">
            <FiAlertCircle size={48} className="mx-auto mb-4" style={{ color: c.muted }} />
            <p className="text-lg" style={{ color: c.muted }}>No payroll batches found</p>
          </div>
        ) : (
          batches.map(batch => {
            const statusStyle = getStatusStyle(batch.status);
            const StatusIcon = statusStyle.icon;

            return (
              <div
                key={batch._id}
                className="bg-white rounded-lg shadow-md p-6 hover:shadow-lg transition-shadow cursor-pointer"
                onClick={() => fetchBatchDetails(batch._id)}
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <h3 className="text-xl font-bold" style={{ color: c.primary }}>
                        {batch.batchNumber}
                      </h3>
                      <span
                        className="px-3 py-1 rounded-full text-sm font-medium flex items-center gap-1"
                        style={{ backgroundColor: statusStyle.bg, color: statusStyle.text }}
                      >
                        <StatusIcon size={14} />
                        {batch.status.toUpperCase()}
                      </span>
                    </div>

                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-3">
                      <div>
                        <p className="text-xs" style={{ color: c.muted }}>Period</p>
                        <p className="text-sm font-medium" style={{ color: c.text }}>
                          {formatDate(batch.payrollPeriod.startDate)} - {formatDate(batch.payrollPeriod.endDate)}
                        </p>
                      </div>
                      <div>
                        <p className="text-xs" style={{ color: c.muted }}>Employees</p>
                        <p className="text-sm font-medium" style={{ color: c.text }}>
                          {batch.summary?.totalEmployees || 0}
                        </p>
                      </div>
                      <div>
                        <p className="text-xs" style={{ color: c.muted }}>Total Net Pay</p>
                        <p className="text-sm font-medium" style={{ color: c.secondary }}>
                          {formatCurrency(batch.summary?.totalNetPay || 0)}
                        </p>
                      </div>
                      <div>
                        <p className="text-xs" style={{ color: c.muted }}>Generated</p>
                        <p className="text-sm font-medium" style={{ color: c.text }}>
                          {formatDate(batch.createdAt)}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-4 text-xs" style={{ color: c.muted }}>
                      <span>Prepared by: {batch.preparedBy?.name || 'N/A'}</span>
                      {batch.approvedBy && <span>• Approved by: {batch.approvedBy.name}</span>}
                    </div>
                  </div>

                  <div className="flex gap-2 ml-4">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        fetchBatchDetails(batch._id);
                      }}
                      className="p-2 rounded-lg hover:opacity-80"
                      style={{ backgroundColor: c.primary + '20', color: c.primary }}
                      title="View Details"
                    >
                      <FiEye size={18} />
                    </button>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Pagination */}
      {pagination.pages > 1 && (
        <div className="flex items-center justify-center gap-2 mt-6">
          <button
            onClick={() => setPagination({ ...pagination, page: pagination.page - 1 })}
            disabled={pagination.page === 1}
            className="px-4 py-2 rounded-lg disabled:opacity-50"
            style={{ backgroundColor: c.primary, color: 'white' }}
          >
            Previous
          </button>
          <span className="px-4 py-2" style={{ color: c.text }}>
            Page {pagination.page} of {pagination.pages}
          </span>
          <button
            onClick={() => setPagination({ ...pagination, page: pagination.page + 1 })}
            disabled={pagination.page === pagination.pages}
            className="px-4 py-2 rounded-lg disabled:opacity-50"
            style={{ backgroundColor: c.primary, color: 'white' }}
          >
            Next
          </button>
        </div>
      )}
    </div>
  );

  // Render batch detail view
  const renderBatchDetail = () => {
    if (!selectedBatch) return null;

    const statusStyle = getStatusStyle(selectedBatch.status);
    const StatusIcon = statusStyle.icon;

    return (
      <div className="min-h-screen p-6" style={{ backgroundColor: c.background }}>
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-4">
            <button
              onClick={() => {
                setViewMode('list');
                setSelectedBatch(null);
              }}
              className="p-2 rounded-lg hover:opacity-80 transition-opacity"
              style={{ backgroundColor: c.primary, color: 'white' }}
            >
              <FiArrowLeft size={20} />
            </button>
            <div>
              <h1 className="text-3xl font-bold flex items-center gap-3" style={{ color: c.primary }}>
                {selectedBatch.batchNumber}
                <span
                  className="px-3 py-1 rounded-full text-sm font-medium flex items-center gap-1"
                  style={{ backgroundColor: statusStyle.bg, color: statusStyle.text }}
                >
                  <StatusIcon size={14} />
                  {selectedBatch.status.toUpperCase()}
                </span>
              </h1>
              <p className="text-sm" style={{ color: c.muted }}>
                {formatDate(selectedBatch.payrollPeriod.startDate)} - {formatDate(selectedBatch.payrollPeriod.endDate)}
              </p>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex gap-2">
            {selectedBatch.status === 'draft' && (
              <button
                onClick={() => handleSubmitForApproval(selectedBatch._id)}
                className="px-4 py-2 rounded-lg font-medium hover:opacity-80 flex items-center gap-2"
                style={{ backgroundColor: c.secondary, color: 'white' }}
              >
                <FiCheck size={18} />
                Submit for Approval
              </button>
            )}
            {selectedBatch.status === 'pending' && (
              <button
                onClick={() => handleApprove(selectedBatch._id)}
                className="px-4 py-2 rounded-lg font-medium hover:opacity-80 flex items-center gap-2"
                style={{ backgroundColor: '#10B981', color: 'white' }}
              >
                <FiCheckCircle size={18} />
                Approve
              </button>
            )}
            {selectedBatch.status === 'approved' && (
              <button
                onClick={() => handleLock(selectedBatch._id)}
                className="px-4 py-2 rounded-lg font-medium hover:opacity-80 flex items-center gap-2"
                style={{ backgroundColor: '#6B7280', color: 'white' }}
              >
                <FiLock size={18} />
                Lock Batch
              </button>
            )}
            {selectedBatch.status !== 'locked' && selectedBatch.status !== 'cancelled' && (
              <button
                onClick={() => handleCancel(selectedBatch._id)}
                className="px-4 py-2 rounded-lg font-medium hover:opacity-80 flex items-center gap-2"
                style={{ backgroundColor: '#EF4444', color: 'white' }}
              >
                <FiX size={18} />
                Cancel
              </button>
            )}
          </div>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <div className="bg-white rounded-lg shadow-md p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm" style={{ color: c.muted }}>Total Employees</p>
                <p className="text-2xl font-bold" style={{ color: c.primary }}>
                  {selectedBatch.summary?.totalEmployees || 0}
                </p>
              </div>
              <FiUsers size={32} style={{ color: c.primary + '40' }} />
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-md p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm" style={{ color: c.muted }}>Gross Pay</p>
                <p className="text-2xl font-bold" style={{ color: c.secondary }}>
                  {formatCurrency(selectedBatch.summary?.totalGrossPay || 0)}
                </p>
              </div>
              <PesoIconSimple className="text-3xl" style={{ color: c.secondary + '40' }} />
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-md p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm" style={{ color: c.muted }}>Total Deductions</p>
                <p className="text-2xl font-bold" style={{ color: c.accent }}>
                  {formatCurrency(selectedBatch.summary?.totalDeductions || 0)}
                </p>
              </div>
              <PesoIconSimple className="text-3xl" style={{ color: c.accent + '40' }} />
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-md p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm" style={{ color: c.muted }}>Net Pay</p>
                <p className="text-2xl font-bold" style={{ color: '#10B981' }}>
                  {formatCurrency(selectedBatch.summary?.totalNetPay || 0)}
                </p>
              </div>
              <PesoIconSimple className="text-3xl" style={{ color: '#10B98140' }} />
            </div>
          </div>
        </div>

        {/* Workflow Timeline */}
        <div className="bg-white rounded-lg shadow-md p-6 mb-6">
          <h3 className="text-lg font-bold mb-4" style={{ color: c.primary }}>Workflow Timeline</h3>
          <div className="space-y-3">
            {selectedBatch.preparedBy && (
              <div className="flex items-start gap-3">
                <div className="p-2 rounded-full" style={{ backgroundColor: '#10B981' + '20' }}>
                  <FiCheck style={{ color: '#10B981' }} />
                </div>
                <div>
                  <p className="font-medium" style={{ color: c.text }}>Prepared</p>
                  <p className="text-sm" style={{ color: c.muted }}>
                    By {selectedBatch.preparedBy.name} on {formatDateTime(selectedBatch.preparedBy.timestamp)}
                  </p>
                </div>
              </div>
            )}
            {selectedBatch.submittedBy && (
              <div className="flex items-start gap-3">
                <div className="p-2 rounded-full" style={{ backgroundColor: '#3B82F6' + '20' }}>
                  <FiClock style={{ color: '#3B82F6' }} />
                </div>
                <div>
                  <p className="font-medium" style={{ color: c.text }}>Submitted</p>
                  <p className="text-sm" style={{ color: c.muted }}>
                    By {selectedBatch.submittedBy.name} on {formatDateTime(selectedBatch.submittedBy.timestamp)}
                  </p>
                </div>
              </div>
            )}
            {selectedBatch.approvedBy && (
              <div className="flex items-start gap-3">
                <div className="p-2 rounded-full" style={{ backgroundColor: '#10B981' + '20' }}>
                  <FiCheckCircle style={{ color: '#10B981' }} />
                </div>
                <div>
                  <p className="font-medium" style={{ color: c.text }}>Approved</p>
                  <p className="text-sm" style={{ color: c.muted }}>
                    By {selectedBatch.approvedBy.name} on {formatDateTime(selectedBatch.approvedBy.timestamp)}
                  </p>
                  {selectedBatch.approvalNotes && (
                    <p className="text-sm italic mt-1" style={{ color: c.muted }}>
                      Notes: {selectedBatch.approvalNotes}
                    </p>
                  )}
                </div>
              </div>
            )}
            {selectedBatch.lockedBy && (
              <div className="flex items-start gap-3">
                <div className="p-2 rounded-full" style={{ backgroundColor: '#6B7280' + '20' }}>
                  <FiLock style={{ color: '#6B7280' }} />
                </div>
                <div>
                  <p className="font-medium" style={{ color: c.text }}>Locked</p>
                  <p className="text-sm" style={{ color: c.muted }}>
                    By {selectedBatch.lockedBy.name} on {formatDateTime(selectedBatch.lockedBy.timestamp)}
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Employee Records */}
        <div className="bg-white rounded-lg shadow-md p-6">
          <h3 className="text-lg font-bold mb-4" style={{ color: c.primary }}>Employee Records</h3>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr style={{ borderBottom: `2px solid ${c.primary}` }}>
                  <th className="text-left py-3 px-4 text-sm font-semibold" style={{ color: c.text }}>Employee</th>
                  <th className="text-right py-3 px-4 text-sm font-semibold" style={{ color: c.text }}>Hours</th>
                  <th className="text-right py-3 px-4 text-sm font-semibold" style={{ color: c.text }}>Gross Pay</th>
                  <th className="text-right py-3 px-4 text-sm font-semibold" style={{ color: c.text }}>Deductions</th>
                  <th className="text-right py-3 px-4 text-sm font-semibold" style={{ color: c.text }}>Net Pay</th>
                </tr>
              </thead>
              <tbody>
                {selectedBatch.payrollRecords?.map((record, index) => (
                  <tr
                    key={record._id}
                    style={{
                      borderBottom: `1px solid ${c.muted}30`,
                      backgroundColor: index % 2 === 0 ? c.background : 'white'
                    }}
                  >
                    <td className="py-3 px-4">
                      <p className="font-medium" style={{ color: c.text }}>{record.staffId?.name || 'N/A'}</p>
                      <p className="text-xs" style={{ color: c.muted }}>{record.staffId?.position || ''}</p>
                    </td>
                    <td className="text-right py-3 px-4 text-sm" style={{ color: c.text }}>
                      {record.totalHoursWorked?.toFixed(2) || '0.00'}
                    </td>
                    <td className="text-right py-3 px-4 text-sm font-medium" style={{ color: c.secondary }}>
                      {formatCurrency(record.grossPay)}
                    </td>
                    <td className="text-right py-3 px-4 text-sm" style={{ color: c.accent }}>
                      {formatCurrency(
                        (record.deductions?.late || 0) +
                        (record.deductions?.absence || 0) +
                        (record.deductions?.sss || 0) +
                        (record.deductions?.philHealth || 0) +
                        (record.deductions?.pagIbig || 0)
                      )}
                    </td>
                    <td className="text-right py-3 px-4 text-sm font-bold" style={{ color: '#10B981' }}>
                      {formatCurrency(record.netPay)}
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

  return viewMode === 'list' ? renderBatchList() : renderBatchDetail();
};

export default PayrollHistory;
