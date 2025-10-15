import React, { useState, useEffect, useCallback } from 'react';
import { 
  Clock, 
  Package, 
  Users, 
  AlertTriangle, 
  CheckCircle, 
  X, 
  RefreshCw,
  Eye,
  Trash2,
  Timer,
  Calendar,
  Filter,
  Search,
  Download
} from 'lucide-react';
import { io } from 'socket.io-client'; // 🔥 NEW: Real-time reservation updates (Sprint 22)
import { API_URL } from '../App'; // 🔥 NEW: Import API_URL for socket connection

/**
 * Reservation Monitoring Panel
 * Dashboard for viewing and managing active inventory reservations
 */
const ReservationMonitoringPanel = ({ className = "" }) => {
  const [reservations, setReservations] = useState([]);
  const [loading, setLoading] = useState(false);
  const [filter, setFilter] = useState('active');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedReservation, setSelectedReservation] = useState(null);
  const [showReleaseModal, setShowReleaseModal] = useState(false);
  const [releaseReason, setReleaseReason] = useState('');
  const [socket, setSocket] = useState(null); // 🔥 NEW: Socket.io for real-time reservations (Sprint 22)

  // Reservation status configuration
  const statusConfig = {
    active: {
      label: 'Active',
      color: 'bg-blue-100 text-blue-800',
      icon: Clock
    },
    expired: {
      label: 'Expired',
      color: 'bg-red-100 text-red-800',
      icon: AlertTriangle
    },
    completed: {
      label: 'Completed',
      color: 'bg-green-100 text-green-800',
      icon: CheckCircle
    },
    released: {
      label: 'Released',
      color: 'bg-gray-100 text-gray-800',
      icon: X
    }
  };

  /**
   * Fetch reservations from API
   */
  const fetchReservations = useCallback(async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      
      const params = new URLSearchParams();
      if (filter !== 'all') params.append('status', filter);
      if (searchTerm) params.append('search', searchTerm);
      
      const response = await fetch(`/api/ingredients/reservations?${params}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (response.ok) {
        const data = await response.json();
        setReservations(data.data || []);
      } else {
        console.error('Failed to fetch reservations');
      }
    } catch (error) {
      console.error('Error fetching reservations:', error);
    } finally {
      setLoading(false);
    }
  }, [filter, searchTerm]);

  // Auto-refresh every 10 minutes (reduced from 2min since we have real-time updates)
  useEffect(() => {
    fetchReservations();
    const interval = setInterval(fetchReservations, 600000); // 10 minutes (reduced from 2min since Socket.io handles real-time updates)
    return () => clearInterval(interval);
  }, [fetchReservations]);

  // 🔥 NEW: Socket.io connection for real-time reservation updates (Sprint 22)
  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) {
      console.warn('[ReservationMonitoringPanel] No auth token found - socket connection skipped');
      return;
    }

    console.log('[ReservationMonitoringPanel] Initializing socket connection...');
    
    const socketConnection = io(API_URL, {
      auth: { token },
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionAttempts: 5,
      reconnectionDelay: 1000
    });

    socketConnection.on('connect', () => {
      console.log('[ReservationMonitoringPanel] Socket connected - Authenticated: Yes');
      console.log('[ReservationMonitoringPanel] Socket ID:', socketConnection.id);
    });

    socketConnection.on('connect_error', (error) => {
      console.error('[ReservationMonitoringPanel] Socket connection error:', error.message);
    });

    socketConnection.on('disconnect', (reason) => {
      console.log('[ReservationMonitoringPanel] Socket disconnected:', reason);
    });

    setSocket(socketConnection);

    return () => {
      console.log('[ReservationMonitoringPanel] Cleaning up socket connection...');
      socketConnection.disconnect();
    };
  }, []);

  // 🔥 NEW: Socket.io event listeners for real-time reservation updates (Sprint 22)
  useEffect(() => {
    if (!socket) return;

    console.log('[ReservationMonitoringPanel] Registering socket event listeners...');

    // Event 1: Reservation created - add to list instantly
    socket.on('reservationCreated', (data) => {
      console.log('[ReservationMonitoringPanel] reservationCreated event received:', data);
      
      const newReservation = data.reservation;
      
      setReservations(prevReservations => {
        // Check for duplicates
        const exists = prevReservations.some(r => r._id === newReservation._id);
        if (exists) {
          console.log('[ReservationMonitoringPanel] Reservation already exists, skipping duplicate');
          return prevReservations;
        }
        
        // Add to top of list if it matches current filter
        if (filter === 'all' || filter === 'active') {
          return [newReservation, ...prevReservations];
        }
        return prevReservations;
      });

      console.log(`[ReservationMonitoringPanel] Added new reservation: Order ${newReservation.orderId}`);
    });

    // Event 2: Reservation completed - update status instantly
    socket.on('reservationCompleted', (data) => {
      console.log('[ReservationMonitoringPanel] reservationCompleted event received:', data);
      
      setReservations(prevReservations => {
        // If filtering by 'active', remove the completed reservation
        if (filter === 'active') {
          return prevReservations.filter(r => r._id !== data.reservationId);
        }
        
        // Otherwise, update status
        return prevReservations.map(r => 
          r._id === data.reservationId 
            ? { ...r, status: 'completed', completedAt: new Date().toISOString() }
            : r
        );
      });

      console.log(`[ReservationMonitoringPanel] Marked reservation ${data.reservationId} as completed`);
    });

    // Event 3: Reservation released/cancelled - remove or update instantly
    socket.on('reservationReleased', (data) => {
      console.log('[ReservationMonitoringPanel] reservationReleased event received:', data);
      
      setReservations(prevReservations => {
        // If filtering by 'active', remove the released reservation
        if (filter === 'active') {
          return prevReservations.filter(r => r._id !== data.reservationId);
        }
        
        // Otherwise, update status
        return prevReservations.map(r => 
          r._id === data.reservationId 
            ? { ...r, status: 'released', releasedAt: new Date().toISOString() }
            : r
        );
      });

      console.log(`[ReservationMonitoringPanel] Removed/updated reservation ${data.reservationId}`);
    });

    // Listen for user logout events (multi-tab logout synchronization)
    socket.on('userLoggedOut', (data) => {
      console.log('[ReservationMonitoringPanel] User logged out event received:', data);
      localStorage.removeItem('token');
      localStorage.removeItem('authToken');
      localStorage.removeItem('userPosition');
      localStorage.removeItem('userRole');
      window.location.href = '/';
    });

    // Cleanup event listeners on unmount
    return () => {
      console.log('[ReservationMonitoringPanel] Cleaning up socket event listeners...');
      socket.off('reservationCreated');
      socket.off('reservationCompleted');
      socket.off('reservationReleased');
      socket.off('userLoggedOut');
    };
  }, [socket, filter]);


  /**
   * Release reservation manually
   */
  const handleReleaseReservation = async (reservationId, reason) => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`/api/ingredients/reservations/${reservationId}/release`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          reason: reason || 'Manual release by manager',
          releasedBy: localStorage.getItem('userId')
        })
      });

      if (response.ok) {
        setShowReleaseModal(false);
        setSelectedReservation(null);
        setReleaseReason('');
        fetchReservations();
        alert('Reservation released successfully');
      } else {
        const errorData = await response.json();
        alert('Failed to release reservation: ' + errorData.message);
      }
    } catch (error) {
      console.error('Error releasing reservation:', error);
      alert('Error releasing reservation');
    }
  };

  /**
   * Calculate time remaining for active reservations
   */
  const getTimeRemaining = (expiresAt) => {
    const now = new Date();
    const expires = new Date(expiresAt);
    const diffMs = expires - now;
    
    if (diffMs <= 0) return { expired: true, display: 'Expired' };
    
    const minutes = Math.floor(diffMs / 60000);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);
    
    if (days > 0) return { expired: false, display: `${days}d ${hours % 24}h` };
    if (hours > 0) return { expired: false, display: `${hours}h ${minutes % 60}m` };
    return { expired: false, display: `${minutes}m`, urgent: minutes < 10 };
  };

  /**
   * Format reservation items for display
   */
  const formatReservationItems = (items) => {
    return items.map(item => 
      `${item.ingredientName} (${item.quantity} ${item.unit})`
    ).join(', ');
  };

  /**
   * Export reservations data
   */
  const exportReservations = () => {
    const csvData = reservations.map(res => ({
      'Order ID': res.orderId,
      'Status': res.status,
      'Created': new Date(res.createdAt).toLocaleString(),
      'Expires': new Date(res.expiresAt).toLocaleString(),
      'Items': formatReservationItems(res.reservedItems),
      'Manager Override': res.managerOverride ? 'Yes' : 'No'
    }));

    const csv = [
      Object.keys(csvData[0]).join(','),
      ...csvData.map(row => Object.values(row).map(val => `"${val}"`).join(','))
    ].join('\n');

    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `reservations-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
  };

  const filteredReservations = reservations.filter(res => {
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      return res.orderId.toLowerCase().includes(term) ||
             res.reservedItems.some(item => 
               item.ingredientName.toLowerCase().includes(term)
             );
    }
    return true;
  });

  return (
    <div className={`bg-white border border-gray-200 rounded-lg shadow-sm ${className}`}>
      {/* Header */}
      <div className="p-6 border-b border-gray-200">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center space-x-3">
            <Package className="w-6 h-6 text-blue-600" />
            <h2 className="text-xl font-semibold text-gray-900">Inventory Reservations</h2>
          </div>
          
          <div className="flex items-center space-x-2">
            <button
              onClick={exportReservations}
              disabled={reservations.length === 0}
              className="inline-flex items-center px-3 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50"
            >
              <Download className="w-4 h-4 mr-2" />
              Export
            </button>
            
            <button
              onClick={fetchReservations}
              disabled={loading}
              className="inline-flex items-center px-3 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
            >
              <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
              Refresh
            </button>
          </div>
        </div>

        {/* Filters and Search */}
        <div className="flex flex-col sm:flex-row space-y-2 sm:space-y-0 sm:space-x-4">
          <div className="flex space-x-2">
            {[
              { key: 'all', label: 'All' },
              { key: 'active', label: 'Active' },
              { key: 'expired', label: 'Expired' },
              { key: 'completed', label: 'Completed' }
            ].map(filterOption => (
              <button
                key={filterOption.key}
                onClick={() => setFilter(filterOption.key)}
                className={`px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                  filter === filterOption.key
                    ? 'bg-blue-100 text-blue-800'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                {filterOption.label}
              </button>
            ))}
          </div>

          <div className="flex-1 max-w-sm">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                placeholder="Search by order ID or ingredient..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Reservations List */}
      <div className="overflow-hidden">
        {loading && reservations.length === 0 ? (
          <div className="p-8 text-center">
            <RefreshCw className="w-8 h-8 animate-spin mx-auto mb-4 text-gray-400" />
            <p className="text-gray-600">Loading reservations...</p>
          </div>
        ) : filteredReservations.length === 0 ? (
          <div className="p-8 text-center">
            <Package className="w-12 h-12 mx-auto mb-4 text-gray-300" />
            <p className="text-xl font-medium text-gray-900 mb-2">No reservations found</p>
            <p className="text-gray-600">
              {searchTerm ? 'Try adjusting your search terms.' : 
               filter === 'active' ? 'No active reservations at this time.' :
               'No reservations match the selected filter.'}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Order Details
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Items Reserved
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Time Remaining
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredReservations.map((reservation) => {
                  const statusInfo = statusConfig[reservation.status] || statusConfig.active;
                  const StatusIcon = statusInfo.icon;
                  const timeRemaining = getTimeRemaining(reservation.expiresAt);

                  return (
                    <tr key={reservation._id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div>
                          <div className="text-sm font-medium text-gray-900">
                            Order #{reservation.orderId}
                          </div>
                          <div className="text-sm text-gray-500">
                            Created: {new Date(reservation.createdAt).toLocaleString()}
                          </div>
                          {reservation.managerOverride && (
                            <div className="text-xs text-orange-600 mt-1">
                              Manager Override Applied
                            </div>
                          )}
                        </div>
                      </td>
                      
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${statusInfo.color}`}>
                          <StatusIcon className="w-3 h-3 mr-1" />
                          {statusInfo.label}
                        </span>
                      </td>
                      
                      <td className="px-6 py-4">
                        <div className="text-sm text-gray-900">
                          {reservation.reservedItems.length} item{reservation.reservedItems.length !== 1 ? 's' : ''}
                        </div>
                        <div className="text-xs text-gray-500 mt-1 max-w-xs truncate">
                          {formatReservationItems(reservation.reservedItems)}
                        </div>
                      </td>
                      
                      <td className="px-6 py-4 whitespace-nowrap">
                        {reservation.status === 'active' ? (
                          <div className={`text-sm ${
                            timeRemaining.expired ? 'text-red-600' :
                            timeRemaining.urgent ? 'text-orange-600' :
                            'text-gray-900'
                          }`}>
                            {timeRemaining.display}
                            {timeRemaining.urgent && !timeRemaining.expired && (
                              <AlertTriangle className="w-4 h-4 inline ml-1" />
                            )}
                          </div>
                        ) : (
                          <span className="text-sm text-gray-500">-</span>
                        )}
                      </td>
                      
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                        <div className="flex items-center space-x-2">
                          <button
                            onClick={() => setSelectedReservation(reservation)}
                            className="text-blue-600 hover:text-blue-800"
                            title="View details"
                          >
                            <Eye className="w-4 h-4" />
                          </button>
                          
                          {reservation.status === 'active' && (
                            <button
                              onClick={() => {
                                setSelectedReservation(reservation);
                                setShowReleaseModal(true);
                              }}
                              className="text-red-600 hover:text-red-800"
                              title="Release reservation"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Reservation Details Modal */}
      {selectedReservation && !showReleaseModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-lg font-semibold text-gray-900">
                  Reservation Details - Order #{selectedReservation.orderId}
                </h3>
                <button
                  onClick={() => setSelectedReservation(null)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <X className="w-6 h-6" />
                </button>
              </div>

              <div className="space-y-6">
                {/* Basic Info */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                      statusConfig[selectedReservation.status]?.color
                    }`}>
                      {statusConfig[selectedReservation.status]?.label}
                    </span>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Created</label>
                    <p className="text-sm text-gray-900">
                      {new Date(selectedReservation.createdAt).toLocaleString()}
                    </p>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Expires</label>
                    <p className="text-sm text-gray-900">
                      {new Date(selectedReservation.expiresAt).toLocaleString()}
                    </p>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Time Remaining</label>
                    <p className="text-sm text-gray-900">
                      {selectedReservation.status === 'active' 
                        ? getTimeRemaining(selectedReservation.expiresAt).display 
                        : '-'}
                    </p>
                  </div>
                </div>

                {/* Reserved Items */}
                <div>
                  <h4 className="text-sm font-medium text-gray-700 mb-3">Reserved Items</h4>
                  <div className="border border-gray-200 rounded-lg overflow-hidden">
                    <table className="w-full">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">
                            Ingredient
                          </th>
                          <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">
                            Quantity
                          </th>
                          <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">
                            Unit
                          </th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-200">
                        {selectedReservation.reservedItems.map((item, index) => (
                          <tr key={index}>
                            <td className="px-4 py-2 text-sm text-gray-900">{item.ingredientName}</td>
                            <td className="px-4 py-2 text-sm text-gray-900">{item.quantity}</td>
                            <td className="px-4 py-2 text-sm text-gray-500">{item.unit}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* Manager Override Info */}
                {selectedReservation.managerOverride && (
                  <div className="bg-orange-50 border border-orange-200 rounded-lg p-4">
                    <h4 className="text-sm font-medium text-orange-800 mb-2">Manager Override</h4>
                    <p className="text-sm text-orange-700">
                      Reason: {selectedReservation.managerOverrideReason || 'No reason provided'}
                    </p>
                    <p className="text-xs text-orange-600 mt-1">
                      Override by: {selectedReservation.overrideBy || 'Unknown'} • 
                      {new Date(selectedReservation.overrideAt || selectedReservation.createdAt).toLocaleString()}
                    </p>
                  </div>
                )}

                {/* Actions */}
                <div className="flex justify-end space-x-3">
                  <button
                    onClick={() => setSelectedReservation(null)}
                    className="px-4 py-2 text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
                  >
                    Close
                  </button>
                  
                  {selectedReservation.status === 'active' && (
                    <button
                      onClick={() => setShowReleaseModal(true)}
                      className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700"
                    >
                      Release Reservation
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Release Confirmation Modal */}
      {showReleaseModal && selectedReservation && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg max-w-md w-full mx-4">
            <div className="p-6">
              <div className="flex items-center mb-4">
                <AlertTriangle className="w-6 h-6 text-red-600 mr-3" />
                <h3 className="text-lg font-semibold text-gray-900">Release Reservation</h3>
              </div>

              <p className="text-gray-600 mb-4">
                Are you sure you want to release this reservation? This will make the reserved ingredients 
                available for other orders and cannot be undone.
              </p>

              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Reason for release (optional):
                </label>
                <textarea
                  value={releaseReason}
                  onChange={(e) => setReleaseReason(e.target.value)}
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Explain why this reservation is being released..."
                />
              </div>

              <div className="flex justify-end space-x-3">
                <button
                  onClick={() => {
                    setShowReleaseModal(false);
                    setReleaseReason('');
                  }}
                  className="px-4 py-2 text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  onClick={() => handleReleaseReservation(selectedReservation._id, releaseReason)}
                  className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700"
                >
                  Release Reservation
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ReservationMonitoringPanel;