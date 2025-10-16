import { useState, useEffect, useRef } from 'react';
import { theme } from '../theme';
import { FiFilter, FiChevronDown, FiSearch, FiCheck, FiX, FiClock, FiImage, FiFileText } from 'react-icons/fi';
import { API_URL } from '../App';
import io from 'socket.io-client';

const PaymentVerificationDashboard = () => {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [filter, setFilter] = useState('all'); // all, today, week, month
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [filterMenuOpen, setFilterMenuOpen] = useState(false);
  const [paymentMethodFilter, setPaymentMethodFilter] = useState('all'); // all, gcash, paymaya
  const [statusFilter, setStatusFilter] = useState('pending'); // pending, verified, rejected, all
  const [verificationAction, setVerificationAction] = useState(null); // verify or reject
  const [rejectionReason, setRejectionReason] = useState('');
  const [processing, setProcessing] = useState(false);
  
  const socketRef = useRef(null);

  // Initialize Socket.io connection for real-time updates
  useEffect(() => {
    // Get authentication token for socket connection
    const token = localStorage.getItem('token') || localStorage.getItem('authToken');
    
    const newSocket = io(API_URL, {
      auth: {
        token: token // Add JWT token for authentication
      }
    });
    socketRef.current = newSocket;

    // Server automatically joins authenticated users to 'staff' room
    newSocket.on('connect', () => {
      console.log('Payment Verification Dashboard connected - Authenticated:', newSocket.auth.token ? 'Yes' : 'No');
    });

    // Listen for new payment orders
    newSocket.on('newPaymentOrder', (data) => {
      console.log('New payment order received:', data);
      fetchOrders(); // Refresh list
    });

    // Listen for payment verification events
    newSocket.on('paymentVerified', (data) => {
      console.log('Payment verified:', data);
      fetchOrders(); // Refresh list
    });

    newSocket.on('paymentRejected', (data) => {
      console.log('Payment rejected:', data);
      fetchOrders(); // Refresh list
    });

    // Listen for user logout events (multi-tab logout synchronization)
    newSocket.on('userLoggedOut', (data) => {
      console.log('[PaymentVerificationDashboard] User logged out event received:', data);
      localStorage.removeItem('token');
      localStorage.removeItem('authToken');
      localStorage.removeItem('userPosition');
      localStorage.removeItem('userRole');
      window.location.href = '/';
    });

    return () => {
      newSocket.close();
    };
  }, []);

  useEffect(() => {
    fetchOrders();
  }, [statusFilter]); // Re-fetch when status filter changes

  const fetchOrders = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('authToken');
      
      // Build query parameters
      const params = new URLSearchParams();
      if (statusFilter !== 'all') {
        params.append('verificationStatus', statusFilter);
      }
      
      const url = `${API_URL}/api/orders/pending-verification${params.toString() ? '?' + params.toString() : ''}`;
      const response = await fetch(url, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      if (!response.ok) {
        throw new Error('Failed to fetch orders');
      }
      
      const data = await response.json();
      
      if (data.success) {
        setOrders(data.data.map(order => ({
          ...order,
          createdAt: new Date(order.createdAt),
          'proofOfPayment.uploadedAt': order.proofOfPayment?.uploadedAt 
            ? new Date(order.proofOfPayment.uploadedAt) 
            : null,
          'proofOfPayment.expiresAt': order.proofOfPayment?.expiresAt 
            ? new Date(order.proofOfPayment.expiresAt) 
            : null
        })));
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // Filter orders based on selected filters (client-side filtering for date/search only)
  const filteredOrders = orders.filter(order => {
    // Date filter
    const orderDate = new Date(order.createdAt);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const weekAgo = new Date();
    weekAgo.setDate(weekAgo.getDate() - 7);
    weekAgo.setHours(0, 0, 0, 0);
    
    const monthAgo = new Date();
    monthAgo.setMonth(monthAgo.getMonth() - 1);
    monthAgo.setHours(0, 0, 0, 0);
    
    let passesDateFilter = true;
    if (filter === 'today') {
      passesDateFilter = orderDate >= today;
    } else if (filter === 'week') {
      passesDateFilter = orderDate >= weekAgo;
    } else if (filter === 'month') {
      passesDateFilter = orderDate >= monthAgo;
    }
    
    // Payment method filter
    const passesPaymentFilter = 
      paymentMethodFilter === 'all' || 
      order.paymentDetails?.eWalletProvider === paymentMethodFilter;
    
    // Search term filter
    const passesSearchFilter = 
      searchTerm === '' || 
      order.receiptNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
      order.proofOfPayment?.transactionReference?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      order.proofOfPayment?.accountName?.toLowerCase().includes(searchTerm.toLowerCase());
    
    return passesDateFilter && passesPaymentFilter && passesSearchFilter;
  }).sort((a, b) => {
    // Sort by verification status first (pending first), then by expiration time
    const statusOrder = { 'pending': 0, 'verified': 1, 'rejected': 2 };
    const aStatus = statusOrder[a.proofOfPayment?.verificationStatus] || 3;
    const bStatus = statusOrder[b.proofOfPayment?.verificationStatus] || 3;
    
    if (aStatus !== bStatus) {
      return aStatus - bStatus;
    }
    
    // If same status, sort by expiration/verification time
    if (a.proofOfPayment?.verificationStatus === 'pending') {
      const aExpires = a.proofOfPayment?.expiresAt || new Date();
      const bExpires = b.proofOfPayment?.expiresAt || new Date();
      return aExpires - bExpires; // Most urgent first
    } else {
      // For verified/rejected, show most recent first
      const aTime = a.proofOfPayment?.verifiedAt || a.proofOfPayment?.rejectedAt || new Date(0);
      const bTime = b.proofOfPayment?.verifiedAt || b.proofOfPayment?.rejectedAt || new Date(0);
      return bTime - aTime;
    }
  });

  const formatCurrency = (value) => {
    return new Intl.NumberFormat('en-PH', {
      style: 'currency',
      currency: 'PHP'
    }).format(value);
  };
  
  const formatDate = (date) => {
    if (!date) return 'N/A';
    return date.toLocaleDateString('en-PH', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getTimeRemaining = (expiresAt) => {
    if (!expiresAt) return null;
    
    const now = new Date();
    const expiry = new Date(expiresAt);
    const diff = expiry - now;
    
    if (diff <= 0) return { expired: true, text: 'Expired', color: 'red' };
    
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    const totalMinutes = hours * 60 + minutes;
    
    let color = 'green';
    if (totalMinutes <= 15) color = 'red';
    else if (totalMinutes <= 30) color = 'orange';
    else if (totalMinutes <= 60) color = 'yellow';
    
    return {
      expired: false,
      text: `${hours}h ${minutes}m`,
      color,
      urgent: totalMinutes <= 15
    };
  };

  const handleVerify = async (orderId) => {
    if (!window.confirm('Confirm payment verification?')) return;
    
    try {
      setProcessing(true);
      const token = localStorage.getItem('authToken');
      const response = await fetch(`${API_URL}/api/orders/${orderId}/verify-payment`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      if (!response.ok) {
        throw new Error('Failed to verify payment');
      }
      
      const data = await response.json();
      
      if (data.success) {
        alert('Payment verified successfully!');
        setSelectedOrder(null);
        fetchOrders();
      }
    } catch (err) {
      alert(`Error: ${err.message}`);
    } finally {
      setProcessing(false);
    }
  };

  const handleReject = async (orderId) => {
    if (!rejectionReason.trim()) {
      alert('Please provide a rejection reason');
      return;
    }
    
    if (!window.confirm('Confirm payment rejection?')) return;
    
    try {
      setProcessing(true);
      const token = localStorage.getItem('authToken');
      const response = await fetch(`${API_URL}/api/orders/${orderId}/reject-payment`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ reason: rejectionReason })
      });
      
      if (!response.ok) {
        throw new Error('Failed to reject payment');
      }
      
      const data = await response.json();
      
      if (data.success) {
        alert('Payment rejected successfully');
        setSelectedOrder(null);
        setRejectionReason('');
        setVerificationAction(null);
        fetchOrders();
      }
    } catch (err) {
      alert(`Error: ${err.message}`);
    } finally {
      setProcessing(false);
    }
  };

  const getStatusBadge = (status) => {
    const badges = {
      pending: { bg: '#FFF3CD', color: '#856404', text: 'Pending' },
      verified: { bg: '#D4EDDA', color: '#155724', text: 'Verified' },
      rejected: { bg: '#F8D7DA', color: '#721C24', text: 'Rejected' }
    };
    
    const badge = badges[status] || badges.pending;
    
    return (
      <span 
        className="px-3 py-1 rounded-full text-sm font-medium"
        style={{ backgroundColor: badge.bg, color: badge.color }}
      >
        {badge.text}
      </span>
    );
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-lg" style={{ color: theme.colors.muted }}>Loading orders...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6 text-red-600">
        Error: {error}
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      {/* Filters and Search */}
      <div className="flex flex-col md:flex-row gap-4">
        <div className="relative">
          <button
            onClick={() => setFilterMenuOpen(!filterMenuOpen)}
            className="px-4 py-2 rounded-lg flex items-center gap-2 bg-gray-100 text-gray-700"
          >
            <FiFilter />
            Filter by Date
            <FiChevronDown />
          </button>
          
          {filterMenuOpen && (
            <div className="absolute top-full mt-1 bg-white border rounded-lg shadow-lg z-10 w-48">
              <div className="p-2 space-y-1">
                {['all', 'today', 'week', 'month'].map(option => (
                  <button
                    key={option}
                    onClick={() => {
                      setFilter(option);
                      setFilterMenuOpen(false);
                    }}
                    className={`px-3 py-2 rounded-lg w-full text-left ${
                      filter === option 
                        ? 'bg-orange-500 text-white' 
                        : 'hover:bg-gray-100'
                    }`}
                  >
                    {option === 'all' ? 'All Time' : 
                     option === 'today' ? 'Today' : 
                     option === 'week' ? 'This Week' : 'This Month'}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
        
        <div className="flex gap-2">
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-4 py-2 rounded-lg bg-gray-100 text-gray-700 border-none"
          >
            <option value="all">All Status</option>
            <option value="pending">Pending</option>
            <option value="verified">Verified</option>
            <option value="rejected">Rejected</option>
          </select>
          
          <select
            value={paymentMethodFilter}
            onChange={(e) => setPaymentMethodFilter(e.target.value)}
            className="px-4 py-2 rounded-lg bg-gray-100 text-gray-700 border-none"
          >
            <option value="all">All Payment Methods</option>
            <option value="gcash">GCash</option>
            <option value="paymaya">PayMaya</option>
          </select>
        </div>
        
        <div className="flex-1 relative">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <FiSearch className="text-gray-400" />
          </div>
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search by receipt number, reference, or account name..."
            className="pl-10 px-4 py-2 rounded-lg bg-gray-100 w-full"
          />
        </div>
      </div>
      
      {/* Orders List */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr style={{ backgroundColor: theme.colors.activeBg }}>
                <th className="text-left p-4" style={{ color: theme.colors.primary }}>Receipt #</th>
                <th className="text-left p-4" style={{ color: theme.colors.primary }}>Date</th>
                <th className="text-left p-4" style={{ color: theme.colors.primary }}>Type</th>
                <th className="text-right p-4" style={{ color: theme.colors.primary }}>Total</th>
                <th className="text-left p-4" style={{ color: theme.colors.primary }}>Payment</th>
                <th className="text-center p-4" style={{ color: theme.colors.primary }}>Time Left</th>
                <th className="text-center p-4" style={{ color: theme.colors.primary }}>Status</th>
                <th className="text-center p-4" style={{ color: theme.colors.primary }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredOrders.length === 0 ? (
                <tr>
                  <td colSpan="8" className="text-center p-8" style={{ color: theme.colors.muted }}>
                    No orders found matching your filters.
                  </td>
                </tr>
              ) : (
                filteredOrders.map((order) => {
                  const timeRemaining = getTimeRemaining(order.proofOfPayment?.expiresAt);
                  
                  return (
                    <tr 
                      key={order._id} 
                      className="border-b hover:bg-gray-50 cursor-pointer"
                      style={{ borderColor: theme.colors.muted + '20' }}
                      onClick={() => setSelectedOrder(order)}
                    >
                      <td className="p-4" style={{ color: theme.colors.primary }}>
                        {order.receiptNumber}
                      </td>
                      <td className="p-4" style={{ color: theme.colors.secondary }}>
                        {formatDate(order.createdAt)}
                      </td>
                      <td className="p-4 capitalize" style={{ color: theme.colors.primary }}>
                        {order.fulfillmentType?.replace('_', '-')}
                      </td>
                      <td className="p-4 text-right" style={{ color: theme.colors.primary }}>
                        {formatCurrency(order.totals.total)}
                      </td>
                      <td className="p-4 capitalize" style={{ color: theme.colors.secondary }}>
                        {order.paymentDetails?.eWalletProvider}
                      </td>
                      <td className="p-4 text-center">
                        {timeRemaining && (
                          <span 
                            className={`px-2 py-1 rounded text-sm font-medium ${
                              timeRemaining.expired ? 'bg-red-100 text-red-800' :
                              timeRemaining.urgent ? 'bg-red-100 text-red-800 animate-pulse' :
                              'text-gray-700'
                            }`}
                          >
                            {timeRemaining.expired ? 'Expired' : `${timeRemaining.text}`}
                          </span>
                        )}
                      </td>
                      <td className="p-4 text-center">
                        {getStatusBadge(order.proofOfPayment?.verificationStatus || 'pending')}
                      </td>
                      <td className="p-4">
                        {order.proofOfPayment?.verificationStatus === 'pending' && (
                          <div className="flex justify-center gap-2">
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                setSelectedOrder(order);
                                setVerificationAction('verify');
                              }}
                              className="p-2 rounded-full hover:bg-green-100"
                              title="Verify Payment"
                            >
                              <FiCheck className="text-green-600" size={20} />
                            </button>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                setSelectedOrder(order);
                                setVerificationAction('reject');
                              }}
                              className="p-2 rounded-full hover:bg-red-100"
                              title="Reject Payment"
                            >
                              <FiX className="text-red-600" size={20} />
                            </button>
                          </div>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
      
      {/* Order Detail Modal */}
      {selectedOrder && (
        <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg shadow-lg max-w-3xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-2xl font-bold" style={{ color: theme.colors.primary }}>
                  Order #{selectedOrder.receiptNumber}
                </h2>
                <button
                  onClick={() => {
                    setSelectedOrder(null);
                    setVerificationAction(null);
                    setRejectionReason('');
                  }}
                  className="p-2 rounded-full hover:bg-gray-100"
                >
                  <FiX size={24} style={{ color: theme.colors.primary }} />
                </button>
              </div>
              
              {/* Order Summary */}
              <div className="bg-gray-50 rounded-lg p-4 mb-6">
                <h3 className="font-semibold mb-3" style={{ color: theme.colors.secondary }}>Order Summary</h3>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="font-medium">Amount:</span> {formatCurrency(selectedOrder.totals.total)}
                  </div>
                  <div>
                    <span className="font-medium">Method:</span> {selectedOrder.paymentDetails?.eWalletProvider?.toUpperCase()}
                  </div>
                  <div>
                    <span className="font-medium">Type:</span> {selectedOrder.fulfillmentType?.replace('_', '-')}
                  </div>
                  <div>
                    <span className="font-medium">Time:</span> {formatDate(selectedOrder.createdAt)}
                  </div>
                </div>
              </div>
              
              {/* Items */}
              <div className="mb-6">
                <h3 className="font-semibold mb-3" style={{ color: theme.colors.secondary }}>Items</h3>
                <ul className="space-y-2">
                  {selectedOrder.items.map((item, index) => (
                    <li key={index} className="flex justify-between text-sm">
                      <span>{item.quantity}x {item.name} ({item.selectedSize})</span>
                      <span>{formatCurrency(item.quantity * item.price)}</span>
                    </li>
                  ))}
                </ul>
              </div>
              
              {/* Payment Proof */}
              <div className="mb-6">
                <h3 className="font-semibold mb-3" style={{ color: theme.colors.secondary }}>Payment Proof</h3>
                
                {selectedOrder.proofOfPayment?.imageUrl && (
                  <div className="mb-4">
                    <div className="flex items-center gap-2 mb-2">
                      <FiImage style={{ color: theme.colors.accent }} />
                      <span className="font-medium">Image Proof:</span>
                    </div>
                    <img 
                      src={`${API_URL}${selectedOrder.proofOfPayment.imageUrl}`}
                      alt="Payment Proof"
                      className="w-full max-w-md border rounded-lg cursor-pointer hover:opacity-90"
                      onClick={() => window.open(`${API_URL}${selectedOrder.proofOfPayment.imageUrl}`, '_blank')}
                    />
                  </div>
                )}
                
                {(selectedOrder.proofOfPayment?.transactionReference || selectedOrder.proofOfPayment?.accountName) && (
                  <div className="bg-gray-50 rounded-lg p-4">
                    <div className="flex items-center gap-2 mb-3">
                      <FiFileText style={{ color: theme.colors.accent }} />
                      <span className="font-medium">Text Reference:</span>
                    </div>
                    {selectedOrder.proofOfPayment?.accountName && (
                      <div className="mb-2">
                        <span className="text-sm font-medium">Account Name:</span>
                        <span className="ml-2">{selectedOrder.proofOfPayment.accountName}</span>
                      </div>
                    )}
                    {selectedOrder.proofOfPayment?.transactionReference && (
                      <div>
                        <span className="text-sm font-medium">Reference #:</span>
                        <span className="ml-2">{selectedOrder.proofOfPayment.transactionReference}</span>
                      </div>
                    )}
                  </div>
                )}
              </div>
              
              {/* Verification Actions */}
              {selectedOrder.proofOfPayment?.verificationStatus === 'pending' && (
                <div className="border-t pt-6">
                  <h3 className="font-semibold mb-4" style={{ color: theme.colors.secondary }}>Verification Actions</h3>
                  
                  {verificationAction === 'reject' && (
                    <div className="mb-4">
                      <label className="block text-sm font-medium mb-2">
                        Rejection Reason <span className="text-red-600">*</span>
                      </label>
                      <textarea
                        value={rejectionReason}
                        onChange={(e) => setRejectionReason(e.target.value)}
                        placeholder="Enter reason for rejection..."
                        className="w-full px-4 py-2 border rounded-lg"
                        rows="3"
                      />
                    </div>
                  )}
                  
                  <div className="flex gap-3">
                    <button
                      onClick={() => handleVerify(selectedOrder._id)}
                      disabled={processing || verificationAction === 'reject'}
                      className="flex-1 px-6 py-3 rounded-lg font-medium text-white bg-green-600 hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                    >
                      <FiCheck />
                      {processing && verificationAction === 'verify' ? 'Verifying...' : 'Verify Payment'}
                    </button>
                    
                    <button
                      onClick={() => handleReject(selectedOrder._id)}
                      disabled={processing || !rejectionReason.trim()}
                      className="flex-1 px-6 py-3 rounded-lg font-medium text-white bg-red-600 hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                    >
                      <FiX />
                      {processing && verificationAction === 'reject' ? 'Rejecting...' : 'Reject Payment'}
                    </button>
                  </div>
                </div>
              )}
              
              {selectedOrder.proofOfPayment?.verificationStatus === 'verified' && (
                <div className="bg-green-50 border border-green-200 rounded-lg p-4 text-center">
                  <FiCheck className="inline text-green-600" size={24} />
                  <p className="text-green-800 font-medium mt-2">Payment Verified</p>
                  {selectedOrder.proofOfPayment?.verifiedAt && (
                    <p className="text-sm text-green-600 mt-1">
                      {formatDate(new Date(selectedOrder.proofOfPayment.verifiedAt))}
                    </p>
                  )}
                </div>
              )}
              
              {selectedOrder.proofOfPayment?.verificationStatus === 'rejected' && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-center">
                  <FiX className="inline text-red-600" size={24} />
                  <p className="text-red-800 font-medium mt-2">Payment Rejected</p>
                  {selectedOrder.proofOfPayment?.verificationNotes && (
                    <p className="text-sm text-red-600 mt-2">
                      Reason: {selectedOrder.proofOfPayment.verificationNotes}
                    </p>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default PaymentVerificationDashboard;
