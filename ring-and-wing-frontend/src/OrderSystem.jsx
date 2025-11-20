import { useState, useEffect, useRef } from 'react';
import { FiClock, FiCoffee, FiCalendar, FiFilter, FiSearch, FiX, FiChevronLeft, FiChevronRight } from 'react-icons/fi';
import { LoadingSpinner } from './components/ui';
import BrandedLoadingScreen from './components/ui/BrandedLoadingScreen';
import { useMultiTabLogout } from './hooks/useMultiTabLogout';
import io from 'socket.io-client';
import { API_URL } from './App';

const OrderSystem = () => {
  const [orders, setOrders] = useState([]);
  const [activeTab, setActiveTab] = useState('all');
  const [sourceFilter, setSourceFilter] = useState('all');
  const [dateFilter, setDateFilter] = useState('today');
  const [customStartDate, setCustomStartDate] = useState('');
  const [customEndDate, setCustomEndDate] = useState('');
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [debouncedSearchTerm, setDebouncedSearchTerm] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const searchInputRef = useRef(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [actionLoading, setActionLoading] = useState(null); // Track which order action is loading
  
  // Enable multi-tab logout synchronization
  useMultiTabLogout();
  
  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const [ordersPerPage] = useState(12); // 12 orders per page (3x4 grid)
  const [totalOrders, setTotalOrders] = useState(0);

  // Socket state
  const [socket, setSocket] = useState(null);
  const socketRef = useRef(null);

  // Debounced search effect - faster response
  useEffect(() => {
    if (searchTerm !== debouncedSearchTerm) {
      setIsSearching(true);
    }
    
    const timeoutId = setTimeout(() => {
      setDebouncedSearchTerm(searchTerm);
      setIsSearching(false);
    }, 300); // Reduced from 500ms to 300ms
    
    return () => clearTimeout(timeoutId);
  }, [searchTerm, debouncedSearchTerm]);

  // Reset page when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [activeTab, sourceFilter, dateFilter, debouncedSearchTerm, customStartDate, customEndDate]);

  // Socket initialization
  useEffect(() => {
    const initializeSocket = () => {
      const newSocket = io(API_URL, {
        transports: ['websocket', 'polling'],
        auth: {
          token: localStorage.getItem('token') || localStorage.getItem('authToken')
        }
      });

      newSocket.on('connect', () => {
        console.log('[OrderSystem Socket] Connected to server');
      });

      newSocket.on('disconnect', () => {
        console.log('[OrderSystem Socket] Disconnected from server');
      });

      // Listen for new payment orders (PayMongo notifications)
      newSocket.on('newPaymentOrder', (data) => {
        console.log('[OrderSystem Socket] New payment order:', data);
        // Refetch orders to show the new PayMongo order
        setOrders(prev => [...prev, {
          ...data,
          id: data._id,
          createdAt: new Date(data.createdAt),
          updatedAt: data.updatedAt ? new Date(data.updatedAt) : null,
          completedAt: data.completedAt ? new Date(data.completedAt) : null
        }]);
      });

      // Listen for order updates
      newSocket.on('orderUpdated', (data) => {
        console.log('[OrderSystem Socket] Order updated:', data);
        setOrders(prev => prev.map(order => 
          order.id === data._id ? {
            ...order,
            ...data,
            id: data._id,
            createdAt: new Date(data.createdAt),
            updatedAt: data.updatedAt ? new Date(data.updatedAt) : null,
            completedAt: data.completedAt ? new Date(data.completedAt) : null
          } : order
        ));
      });

      // Listen for payment verification
      newSocket.on('paymentVerified', (data) => {
        console.log('[OrderSystem Socket] Payment verified:', data);
        // Update the order status
        setOrders(prev => prev.map(order => 
          order.id === data.orderId ? {
            ...order,
            status: data.status,
            updatedAt: new Date()
          } : order
        ));
      });

      setSocket(newSocket);
      socketRef.current = newSocket;
    };

    initializeSocket();

    // Cleanup
    return () => {
      if (socketRef.current) {
        socketRef.current.disconnect();
      }
    };
  }, []);

  // Main fetch effect
  useEffect(() => {
    const fetchOrders = async () => {
      try {
        // Only show loading for initial load or major filter changes, not for search
        const isSearchOnly = debouncedSearchTerm !== searchTerm || 
                            (debouncedSearchTerm && searchTerm);
        
        if (!isSearchOnly) {
          setIsLoading(true);
        }
        
        // Build query parameters
        const params = new URLSearchParams();
        
        // Add date filtering
        if (dateFilter === 'custom' && customStartDate && customEndDate) {
          params.append('startDate', customStartDate);
          params.append('endDate', customEndDate);
        } else if (dateFilter !== 'all') {
          params.append('dateFilter', dateFilter);
        }
        
        // Add search parameter
        if (debouncedSearchTerm && debouncedSearchTerm.trim()) {
          params.append('search', debouncedSearchTerm.trim());
        }

        const url = `${API_URL}/api/orders?${params.toString()}`;
        console.log('Fetching orders with URL:', url);
        console.log('Date filter:', dateFilter);
        console.log('Search term:', debouncedSearchTerm);
        console.log('Params:', params.toString());
        
        const response = await fetch(url);
        if (!response.ok) throw new Error('Failed to fetch orders');
        const { data, success } = await response.json();
        
        console.log('Response data:', data);
        console.log('Number of orders received:', data?.length || 0);
        
        if (!success || !Array.isArray(data)) {
          throw new Error('Invalid server response format');
        }

        const processedOrders = data.map(order => ({
          ...order,
          id: order._id,
          createdAt: new Date(order.createdAt),
          updatedAt: order.updatedAt ? new Date(order.updatedAt) : null,
          completedAt: order.completedAt ? new Date(order.completedAt) : null
        }));

        setOrders(processedOrders);
        
        // Auto-focus search input after results load if user was searching
        if (searchTerm && searchInputRef.current) {
          setTimeout(() => {
            searchInputRef.current?.focus();
          }, 100);
        }
      } catch (err) {
        setError(err.message);
      } finally {
        setIsLoading(false);
      }
    };

    fetchOrders();
  }, [dateFilter, customStartDate, customEndDate, debouncedSearchTerm]);

  // Pagination calculations
  const getFilteredOrders = () => {
    return orders.filter(order => 
      (activeTab === 'all' || order.status === activeTab) && 
      (sourceFilter === 'all' || order.orderType === sourceFilter)
    ).sort((a, b) => b.createdAt - a.createdAt);
  };

  const filteredOrders = getFilteredOrders();
  const totalPages = Math.ceil(filteredOrders.length / ordersPerPage);
  const startIndex = (currentPage - 1) * ordersPerPage;
  const endIndex = startIndex + ordersPerPage;
  const currentOrders = filteredOrders.slice(startIndex, endIndex);

  const goToPage = (page) => {
    setCurrentPage(page);
    // Scroll to top of orders section
    setTimeout(() => {
      document.querySelector('.orders-grid')?.scrollIntoView({ 
        behavior: 'smooth', 
        block: 'start' 
      });
    }, 100);
  };

  const updateOrderStatus = async (orderId, newStatus) => {
    try {
      setActionLoading(orderId); // Show loading spinner for this order
      const response = await fetch(`${API_URL}/api/orders/${orderId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to update status');
      }

      const { data } = await response.json();
      setOrders(orders.map(order => 
        order.id === data._id ? { 
          ...order, 
          status: data.status,
          updatedAt: new Date(data.updatedAt),
          ...(data.completedAt && { completedAt: new Date(data.completedAt) })
        } : order
      ));
    } catch (error) {
      console.error('Update error:', error);
      alert(`Status update failed: ${error.message}`);
    } finally {
      setActionLoading(null); // Hide loading spinner
    }
  };

  const formatPHP = (value) => 
    new Intl.NumberFormat('en-PH', { 
      style: 'currency', 
      currency: 'PHP', 
      minimumFractionDigits: 2 
    }).format(value);

  if (isLoading) {
    return (
      <BrandedLoadingScreen message="Loading orders..." />
    );
  }

  if (error) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-4 text-red-600">
        <h2 className="text-xl font-bold mb-2">Error Loading Orders</h2>
        <p className="mb-4">{error}</p>
        <button
          onClick={() => window.location.reload()}
          className="mt-4 px-4 py-2 rounded hover:opacity-90 bg-[#f1670f] text-white"
        >
          Retry
        </button>
      </div>
    );
  }

  return (
    <div 
      className="h-full flex flex-col bg-[#fefdfd]"
    >
      <main className="flex-1 overflow-auto bg-[#f9f9f9]">
        <div className="max-w-7xl mx-auto p-4 md:p-6 lg:p-8">
          {/* Compact Filters & Search Bar */}
          <div className="bg-white rounded-lg shadow-sm mb-4 p-3">
            {/* Top Row: Status Navigation & Search */}
            <div className="flex flex-col lg:flex-row gap-3 mb-3">
              {/* Status Tabs */}
              <div className="flex flex-wrap gap-1">
                {['all', 'received', 'preparing', 'ready', 'completed'].map(tab => (
                  <button
                    key={tab}
                    className={`py-1.5 px-3 text-xs font-medium rounded-full transition-colors ${
                      activeTab === tab 
                        ? 'bg-[#f1670f] text-white' 
                        : 'text-[#2e0304] bg-[#f1670f05] hover:bg-[#f1670f10]'
                    }`}
                    onClick={() => setActiveTab(tab)}
                  >
                    {tab.charAt(0).toUpperCase() + tab.slice(1)}
                  </button>
                ))}
              </div>
              
              {/* Search Bar */}
              <div className="flex-1 flex items-center gap-2 min-w-0">
                <div className="relative flex-1">
                  <FiSearch className={`absolute left-2 top-1/2 transform -translate-y-1/2 text-sm ${
                    isSearching ? 'text-[#f1670f] animate-pulse' : 'text-[#853619]'
                  }`} />
                  <input
                    ref={searchInputRef}
                    type="text"
                    placeholder="Search orders..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className={`w-full pl-7 pr-8 py-1.5 border rounded-lg text-xs focus:outline-none focus:ring-1 focus:ring-[#f1670f30] focus:border-[#f1670f] transition-all ${
                      isSearching 
                        ? 'border-[#f1670f30] bg-[#f1670f05]' 
                        : 'border-[#ac9c9b30]'
                    }`}
                    autoComplete="off"
                  />
                  {isSearching && (
                    <div className="absolute right-2 top-1/2 transform -translate-y-1/2">
                      <div className="w-3 h-3 border border-[#f1670f] border-t-transparent rounded-full animate-spin"></div>
                    </div>
                  )}
                  {searchTerm && !isSearching && (
                    <button
                      onClick={() => {
                        setSearchTerm('');
                        searchInputRef.current?.focus();
                      }}
                      className="absolute right-2 top-1/2 transform -translate-y-1/2 text-[#853619] hover:text-[#f1670f] transition-colors"
                    >
                      <FiX className="text-xs" />
                    </button>
                  )}
                </div>
              </div>
            </div>

            {/* Bottom Row: Date & Source Filters */}
            <div className="flex flex-col lg:flex-row gap-3 items-start lg:items-center">
              {/* Date Filters */}
              <div className="flex items-center gap-2">
                <FiCalendar className="text-[#853619] text-sm" />
                <div className="flex flex-wrap gap-1">
                  {[
                    { id: 'today', label: 'Today' },
                    { id: 'yesterday', label: 'Yesterday' },
                    { id: 'last7days', label: '7d' },
                    { id: 'thisMonth', label: 'Month' },
                    { id: 'all', label: 'All' },
                    { id: 'custom', label: 'Custom' }
                  ].map(filter => (
                    <button
                      key={filter.id}
                      className={`py-1 px-2 text-xs rounded transition-colors ${
                        dateFilter === filter.id 
                          ? 'bg-[#f1670f] text-white' 
                          : 'bg-[#85361910] text-[#853619] hover:bg-[#f1670f20]'
                      }`}
                      onClick={() => {
                        setDateFilter(filter.id);
                        if (filter.id === 'custom') {
                          setShowDatePicker(true);
                        } else {
                          setShowDatePicker(false);
                        }
                      }}
                    >
                      {filter.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Quick Time Filters */}
              <div className="flex items-center gap-1">
                <span className="text-xs text-[#ac9c9b]">Time:</span>
                {[
                  { id: 'last2hours', label: '2h' },
                  { id: 'morning', label: 'AM' },
                  { id: 'afternoon', label: 'PM' },
                  { id: 'evening', label: 'Eve' }
                ].map(filter => (
                  <button
                    key={filter.id}
                    className={`py-1 px-1.5 text-xs rounded transition-colors ${
                      dateFilter === filter.id 
                        ? 'bg-[#f1670f] text-white' 
                        : 'bg-[#85361910] text-[#853619] hover:bg-[#f1670f20]'
                    }`}
                    onClick={() => setDateFilter(filter.id)}
                  >
                    {filter.label}
                  </button>
                ))}
              </div>

              {/* Source Filter */}
              <div className="flex items-center gap-1">
                <FiFilter className="text-[#853619] text-sm" />
                {[
                  { id: 'all', label: 'All' },
                  { id: 'counter', label: 'POS' },
                  { id: 'self_checkout', label: 'Self' },
                  { id: 'chatbot', label: 'Bot' }
                ].map(src => (
                  <button
                    key={src.id}
                    className={`py-1 px-2 text-xs rounded transition-colors ${
                      sourceFilter === src.id 
                        ? 'bg-[#f1670f] text-white' 
                        : 'bg-[#85361910] text-[#853619] hover:bg-[#f1670f20]'
                    }`}
                    onClick={() => setSourceFilter(src.id)}
                  >
                    {src.label}
                  </button>
                ))}
              </div>

              {/* Results count */}
              <div className="text-xs text-[#ac9c9b] ml-auto">
                {filteredOrders.length} order{filteredOrders.length !== 1 ? 's' : ''}
                {searchTerm && ` for "${searchTerm}"`}
                {totalPages > 1 && (
                  <span className="ml-2">
                    • Page {currentPage} of {totalPages}
                  </span>
                )}
              </div>
            </div>

            {/* Custom Date Range Picker */}
            {showDatePicker && (
              <div className="mt-3 p-3 border border-[#ac9c9b30] rounded-lg bg-[#f9f9f9]">
                <div className="flex flex-col sm:flex-row gap-2 items-start sm:items-center">
                  <div className="flex items-center gap-1">
                    <label className="text-xs text-[#853619]">From:</label>
                    <input
                      type="date"
                      value={customStartDate}
                      onChange={(e) => setCustomStartDate(e.target.value)}
                      className="px-2 py-1 border border-[#ac9c9b30] rounded text-xs"
                    />
                  </div>
                  <div className="flex items-center gap-1">
                    <label className="text-xs text-[#853619]">To:</label>
                    <input
                      type="date"
                      value={customEndDate}
                      onChange={(e) => setCustomEndDate(e.target.value)}
                      className="px-2 py-1 border border-[#ac9c9b30] rounded text-xs"
                    />
                  </div>
                  <button
                    onClick={() => setShowDatePicker(false)}
                    className="px-2 py-1 bg-[#f1670f] text-white rounded text-xs hover:bg-[#f1670f90] transition-colors"
                  >
                    Apply
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Orders Grid */}
          <section className="orders-grid grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 md:gap-6 mb-6">
            {currentOrders.map(order => (
                <div 
                  key={order.id} 
                  className="bg-white rounded-xl md:rounded-2xl shadow-md hover:shadow-lg transition-all"
                >
                  <div className={`p-4 md:p-6 border-b-4 ${
                    order.status === 'received' ? 'border-[#f1670f30]' :
                    order.status === 'preparing' ? 'border-[#f1670f50]' :
                    order.status === 'ready' ? 'border-[#f1670f]' :
                    'border-transparent'
                  }`}>
                    <div className="flex justify-between items-center mb-3 md:mb-4">
                      <div className="flex flex-col">
                        <h2 className="font-bold text-lg md:text-xl text-[#2e0304]">
                          Order #{order.receiptNumber}
                        </h2>
                        {order.orderType && order.orderType !== 'counter' && (
                          <span className={`text-xs px-2 py-1 rounded-full inline-flex items-center w-fit ${
                            order.orderType === 'self_checkout' 
                              ? 'bg-[#fbbf2420] text-[#b45309]'
                              : order.orderType === 'chatbot'
                                ? 'bg-[#60a5fa20] text-[#1e40af]' 
                                : 'bg-[#f1670f20] text-[#f1670f]'
                          }`}>
                            {order.orderType === 'self_checkout' ? 'Self Checkout' : 
                             order.orderType === 'chatbot' ? 'Chatbot' : order.orderType}
                          </span>
                        )}
                      </div>
                      <span className="text-sm md:text-base px-3 md:px-4 py-1 md:py-2 rounded-full bg-[#85361910] text-[#853619]">
                        {order.createdAt.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>
                    <div className="space-y-2 md:space-y-3">
                      {order.items.map((item, idx) => (
                        <div key={idx} className="flex justify-between items-center text-base md:text-lg">
                          <div>
                            <span className="font-medium text-[#2e0304]">{item.quantity}x </span>
                            <span className="text-[#853619]">{item.name}</span>
                            {item.selectedSize && (
                              <span className="block text-xs md:text-sm text-[#ac9c9b]">
                                ({item.selectedSize})
                              </span>
                            )}
                          </div>
                          <span className="text-[#2e0304]">{formatPHP(item.price)}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="p-4 md:p-6 space-y-4 md:space-y-6">
                    <div className="flex justify-between items-center text-xl md:text-2xl font-bold text-[#2e0304]">
                      <span>Total:</span>
                      <span>{formatPHP(order.totals.total)}</span>
                    </div>

                    {order.status !== 'completed' && (
                      <div className="relative">
                        {/* Loading overlay */}
                        {actionLoading === order.id && (
                          <div className="absolute inset-0 bg-white/80 backdrop-blur-sm rounded-lg flex items-center justify-center z-20">
                            <div className="flex flex-col items-center gap-2">
                              <div className="animate-spin rounded-full h-10 w-10 border-4 border-gray-300 border-t-[#f1670f]"></div>
                              <p className="text-sm text-[#853619] font-medium">Processing...</p>
                            </div>
                          </div>
                        )}
                        
                        {/* Action buttons */}
                        <div className={`flex gap-2 md:gap-3 flex-wrap transition-opacity duration-200 ${actionLoading === order.id ? 'opacity-50 pointer-events-none' : 'opacity-100'}`}>
                          {(() => {
                            switch(order.status) {
                              case 'received': return ['preparing', 'completed'];
                              case 'preparing': return ['ready', 'completed'];
                              case 'ready': return ['completed'];
                              default: return [];
                            }
                          })().map(status => (
                            <button
                              key={status}
                              disabled={actionLoading === order.id}
                              className="text-sm md:text-base px-4 md:px-6 py-1 md:py-2 rounded-full transition-colors bg-[#85361910] text-[#853619] hover:bg-[#f1670f20] disabled:bg-gray-300 disabled:text-gray-600 disabled:cursor-not-allowed"
                              onClick={() => updateOrderStatus(order.id, status)}
                            >
                              {status.charAt(0).toUpperCase() + status.slice(1)}
                            </button>
                          ))}
                        </div>
                      </div>
                    )}

                    {order.status === 'completed' && order.completedAt && (
                      <div className="flex items-center gap-2 text-sm md:text-base text-[#853619]">
                        <FiClock className="flex-shrink-0" />
                        <span>
                          Completed at {order.completedAt.toLocaleTimeString([], { 
                            hour: '2-digit', 
                            minute: '2-digit' 
                          })}
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              ))}
          </section>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4 bg-white rounded-lg p-4 shadow-sm">
              {/* Page Info */}
              <div className="text-sm text-[#853619]">
                Showing {startIndex + 1}-{Math.min(endIndex, filteredOrders.length)} of {filteredOrders.length} orders
              </div>

              {/* Pagination Controls */}
              <div className="flex items-center gap-2">
                {/* Previous Button */}
                <button
                  onClick={() => goToPage(currentPage - 1)}
                  disabled={currentPage === 1}
                  className={`p-2 rounded-lg transition-colors ${
                    currentPage === 1
                      ? 'text-[#ac9c9b] cursor-not-allowed'
                      : 'text-[#853619] hover:bg-[#f1670f10] hover:text-[#f1670f]'
                  }`}
                >
                  <FiChevronLeft />
                </button>

                {/* Page Numbers */}
                <div className="flex gap-1">
                  {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                    let pageNum;
                    if (totalPages <= 5) {
                      pageNum = i + 1;
                    } else if (currentPage <= 3) {
                      pageNum = i + 1;
                    } else if (currentPage >= totalPages - 2) {
                      pageNum = totalPages - 4 + i;
                    } else {
                      pageNum = currentPage - 2 + i;
                    }

                    return (
                      <button
                        key={pageNum}
                        onClick={() => goToPage(pageNum)}
                        className={`w-8 h-8 rounded-lg text-sm transition-colors ${
                          currentPage === pageNum
                            ? 'bg-[#f1670f] text-white'
                            : 'text-[#853619] hover:bg-[#f1670f10] hover:text-[#f1670f]'
                        }`}
                      >
                        {pageNum}
                      </button>
                    );
                  })}
                </div>

                {/* Next Button */}
                <button
                  onClick={() => goToPage(currentPage + 1)}
                  disabled={currentPage === totalPages}
                  className={`p-2 rounded-lg transition-colors ${
                    currentPage === totalPages
                      ? 'text-[#ac9c9b] cursor-not-allowed'
                      : 'text-[#853619] hover:bg-[#f1670f10] hover:text-[#f1670f]'
                  }`}
                >
                  <FiChevronRight />
                </button>
              </div>

              {/* Quick Jump */}
              {totalPages > 5 && (
                <div className="flex items-center gap-2 text-sm">
                  <span className="text-[#853619]">Go to:</span>
                  <input
                    type="number"
                    min="1"
                    max={totalPages}
                    value={currentPage}
                    onChange={(e) => {
                      const page = parseInt(e.target.value);
                      if (page >= 1 && page <= totalPages) {
                        goToPage(page);
                      }
                    }}
                    className="w-16 px-2 py-1 border border-[#ac9c9b30] rounded text-center focus:outline-none focus:ring-1 focus:ring-[#f1670f30] focus:border-[#f1670f]"
                  />
                </div>
              )}
            </div>
          )}

          {/* No Results Message */}
          {filteredOrders.length === 0 && !isLoading && (
            <div className="text-center py-12 bg-white rounded-lg shadow-sm">
              <FiCoffee className="text-4xl text-[#ac9c9b] mx-auto mb-4" />
              <h3 className="text-lg font-medium text-[#853619] mb-2">No orders found</h3>
              <p className="text-[#ac9c9b]">
                {searchTerm ? `No orders match "${searchTerm}"` : 'No orders match your current filters'}
              </p>
              {(searchTerm || activeTab !== 'all' || sourceFilter !== 'all' || dateFilter !== 'all') && (
                <button
                  onClick={() => {
                    setSearchTerm('');
                    setActiveTab('all');
                    setSourceFilter('all');
                    setDateFilter('today');
                    setCurrentPage(1);
                  }}
                  className="mt-4 px-4 py-2 bg-[#f1670f] text-white rounded-lg hover:bg-[#f1670f90] transition-colors"
                >
                  Clear all filters
                </button>
              )}
            </div>
          )}
        </div>
      </main>
    </div>
  );
};

export default OrderSystem;
