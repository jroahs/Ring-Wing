import { useState, useEffect, useRef } from 'react';
import { FiClock, FiCoffee, FiCalendar, FiFilter, FiSearch, FiX } from 'react-icons/fi';
import KitchenDisplay from './KitchenDisplay';

// Custom hook for responsive margin calculation
const useResponsiveMargin = () => {
  const [windowWidth, setWindowWidth] = useState(window.innerWidth);

  useEffect(() => {
    const handleResize = () => setWindowWidth(window.innerWidth);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  return {
    marginLeft: windowWidth < 768 ? '0' : windowWidth >= 1920 ? '8rem' : '5rem',
    paddingTop: windowWidth < 768 ? '4rem' : '0'
  };
};

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
  const searchInputRef = useRef(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const { marginLeft, paddingTop } = useResponsiveMargin();

  // Debounced search effect
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      setDebouncedSearchTerm(searchTerm);
    }, 500);
    
    return () => clearTimeout(timeoutId);
  }, [searchTerm]);

  // Main fetch effect
  useEffect(() => {
    const fetchOrders = async () => {
      try {
        setIsLoading(true);
        
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
        
        const url = `http://localhost:5000/api/orders?${params.toString()}`;
        console.log('Fetching orders with URL:', url);
        
        const response = await fetch(url);
        if (!response.ok) throw new Error('Failed to fetch orders');
        const { data, success } = await response.json();
        
        if (!success || !Array.isArray(data)) {
          throw new Error('Invalid server response format');
        }

        setOrders(data.map(order => ({
          ...order,
          id: order._id,
          createdAt: new Date(order.createdAt),
          updatedAt: order.updatedAt ? new Date(order.updatedAt) : null,
          completedAt: order.completedAt ? new Date(order.completedAt) : null
        })));
      } catch (err) {
        setError(err.message);
      } finally {
        setIsLoading(false);
      }
    };

    fetchOrders();
  }, [dateFilter, customStartDate, customEndDate, debouncedSearchTerm]);

  const updateOrderStatus = async (orderId, newStatus) => {
    try {
      const response = await fetch(`http://localhost:5000/api/orders/${orderId}`, {
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
      <div className="flex-1 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#f1670f]"></div>
      </div>
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
      className="h-full flex flex-col bg-[#fefdfd] transition-all duration-300"
      style={{ marginLeft, paddingTop }}
    >
      <main className="flex-1 overflow-auto bg-[#f9f9f9]">
        <div className="max-w-7xl mx-auto p-4 md:p-6 lg:p-8">
          {/* Kitchen Display */}
          <div className="bg-[#2e0304] text-white rounded-xl md:rounded-2xl shadow-lg mb-6 md:mb-8 p-4 md:p-6">
            <div className="flex items-center gap-3 md:gap-4 mb-3 md:mb-4">
              <FiCoffee className="text-[#f1670f] text-2xl md:text-3xl" />
              <h2 className="text-xl md:text-2xl font-bold">Active Kitchen Orders</h2>
            </div>
            <KitchenDisplay 
              orders={orders.filter(o => !['completed', 'ready'].includes(o.status))} 
              className="text-base md:text-lg"
            />
          </div>

          {/* Status Navigation */}
          <nav className="bg-white rounded-lg shadow-sm mb-6 md:mb-8">
            <div className="flex flex-wrap divide-x divide-[#ac9c9b30]">
              {['all', 'received', 'preparing', 'ready', 'completed'].map(tab => (
                <button
                  key={tab}
                  className={`flex-1 py-3 px-4 md:py-4 md:px-6 text-sm md:text-base font-medium transition-colors ${
                    activeTab === tab 
                      ? 'text-[#f1670f] bg-[#f1670f10]' 
                      : 'text-[#2e0304] hover:bg-[#f1670f05]'
                  }`}
                  onClick={() => setActiveTab(tab)}
                >
                  {tab.charAt(0).toUpperCase() + tab.slice(1)}
                </button>
              ))}
            </div>
          </nav>
          
          {/* Search Bar */}
          <div className="bg-white rounded-lg shadow-sm mb-6 md:mb-8 p-4 md:p-6">
            <div className="flex items-center gap-3">
              <FiSearch className="text-[#853619] text-xl" />
              <div className="flex-1">
                <input
                  ref={searchInputRef}
                  type="text"
                  placeholder="Search orders... (try: order number, customer name, menu items)"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full px-4 py-2 md:py-3 border border-[#ac9c9b30] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#f1670f30] focus:border-[#f1670f] transition-colors text-sm md:text-base"
                  autoComplete="off"
                />
              </div>
              {searchTerm && (
                <button
                  onClick={() => {
                    setSearchTerm('');
                    searchInputRef.current?.focus();
                  }}
                  className="p-2 text-[#853619] hover:bg-[#f1670f10] rounded-lg transition-colors"
                  title="Clear search"
                >
                  <FiX className="text-lg" />
                </button>
              )}
            </div>
            
            {searchTerm && (
              <div className="mt-3 text-sm text-[#853619]">
                Searching for: <span className="font-medium">"{searchTerm}"</span>
                {debouncedSearchTerm !== searchTerm && (
                  <span className="ml-2 text-xs text-[#ac9c9b]">• typing...</span>
                )}
              </div>
            )}
          </div>

          {/* Date Filtering */}
          <div className="bg-white rounded-lg shadow-sm mb-6 md:mb-8 p-4 md:p-6">
            <div className="flex flex-col lg:flex-row gap-4 items-start lg:items-center">
              <div className="flex items-center gap-2">
                <FiCalendar className="text-[#853619]" />
                <span className="text-sm md:text-base font-medium text-[#853619]">Filter by Date:</span>
              </div>
              
              {/* Quick Date Filters */}
              <div className="flex flex-wrap gap-2">
                {[
                  { id: 'today', label: 'Today' },
                  { id: 'yesterday', label: 'Yesterday' },
                  { id: 'last7days', label: 'Last 7 Days' },
                  { id: 'thisMonth', label: 'This Month' },
                  { id: 'all', label: 'All Time' },
                  { id: 'custom', label: 'Custom Range' }
                ].map(filter => (
                  <button
                    key={filter.id}
                    className={`py-1 px-3 text-xs md:text-sm rounded-full transition-colors ${
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

              {/* Quick Time Filters */}
              <div className="flex items-center gap-2">
                <span className="text-xs text-[#ac9c9b]">Quick:</span>
                {[
                  { id: 'last2hours', label: 'Last 2h' },
                  { id: 'morning', label: 'Morning' },
                  { id: 'afternoon', label: 'Afternoon' },
                  { id: 'evening', label: 'Evening' }
                ].map(filter => (
                  <button
                    key={filter.id}
                    className={`py-1 px-2 text-xs rounded transition-colors ${
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
            </div>

            {/* Custom Date Range Picker */}
            {showDatePicker && (
              <div className="mt-4 p-4 border border-[#ac9c9b30] rounded-lg bg-[#f9f9f9]">
                <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center">
                  <div className="flex items-center gap-2">
                    <label className="text-sm text-[#853619]">From:</label>
                    <input
                      type="date"
                      value={customStartDate}
                      onChange={(e) => setCustomStartDate(e.target.value)}
                      className="px-3 py-1 border border-[#ac9c9b30] rounded text-sm"
                    />
                  </div>
                  <div className="flex items-center gap-2">
                    <label className="text-sm text-[#853619]">To:</label>
                    <input
                      type="date"
                      value={customEndDate}
                      onChange={(e) => setCustomEndDate(e.target.value)}
                      className="px-3 py-1 border border-[#ac9c9b30] rounded text-sm"
                    />
                  </div>
                  <button
                    onClick={() => setShowDatePicker(false)}
                    className="px-3 py-1 bg-[#f1670f] text-white rounded text-sm hover:bg-[#f1670f90] transition-colors"
                  >
                    Apply
                  </button>
                </div>
              </div>
            )}

            {/* Display current filter info */}
            <div className="mt-2 text-xs text-[#ac9c9b]">
              {dateFilter === 'today' && 'Showing today\'s orders'}
              {dateFilter === 'yesterday' && 'Showing yesterday\'s orders'}
              {dateFilter === 'last7days' && 'Showing orders from the last 7 days'}
              {dateFilter === 'thisMonth' && 'Showing this month\'s orders'}
              {dateFilter === 'all' && 'Showing all orders'}
              {dateFilter === 'last2hours' && 'Showing orders from the last 2 hours'}
              {dateFilter === 'morning' && 'Showing morning orders (6 AM - 12 PM)'}
              {dateFilter === 'afternoon' && 'Showing afternoon orders (12 PM - 6 PM)'}
              {dateFilter === 'evening' && 'Showing evening orders (6 PM - 12 AM)'}
              {dateFilter === 'custom' && customStartDate && customEndDate && 
                `Showing orders from ${customStartDate} to ${customEndDate}`}
              {searchTerm && ` matching "${searchTerm}"`}
              {orders.length > 0 && ` • ${orders.length} order${orders.length !== 1 ? 's' : ''} found`}
            </div>
          </div>
          
          {/* Source filter */}
          <div className="bg-white rounded-lg shadow-sm mb-6 md:mb-8 p-3 md:p-4">
            <p className="text-sm text-[#853619] mb-2">Filter by Order Source:</p>
            <div className="flex flex-wrap gap-2">
              {[
                { id: 'all', label: 'All Sources' },
                { id: 'counter', label: 'POS/Counter' },
                { id: 'self_checkout', label: 'Self Checkout' },
                { id: 'chatbot', label: 'Chatbot' }
              ].map(src => (
                <button
                  key={src.id}
                  className={`py-1 px-3 text-xs md:text-sm rounded-full transition-colors ${
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
          </div>

          {/* Orders Grid */}
          <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 md:gap-6">
            {orders
              .filter(order => 
                (activeTab === 'all' || order.status === activeTab) && 
                (sourceFilter === 'all' || order.orderType === sourceFilter)
              )
              .sort((a, b) => b.createdAt - a.createdAt)
              .map(order => (
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
                      <div className="flex gap-2 md:gap-3 flex-wrap">
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
                            className={`text-sm md:text-base px-4 md:px-6 py-1 md:py-2 rounded-full transition-colors ${
                              order.status === status 
                                ? 'bg-[#f1670f] text-white' 
                                : 'bg-[#85361910] text-[#853619] hover:bg-[#f1670f20]'
                            }`}
                            onClick={() => updateOrderStatus(order.id, status)}
                          >
                            {status.charAt(0).toUpperCase() + status.slice(1)}
                          </button>
                        ))}
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
        </div>
      </main>
    </div>
  );
};

export default OrderSystem;
