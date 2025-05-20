import { useState, useEffect } from 'react';
import { theme } from '../theme';
import { FiFilter, FiChevronDown, FiSearch, FiDownload, FiPrinter } from 'react-icons/fi';
import { useReactToPrint } from 'react-to-print';
import { Receipt } from './Receipt';
import { useRef } from 'react';

const ReceiptHistory = () => {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [filter, setFilter] = useState('all'); // all, today, week, month
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [filterMenuOpen, setFilterMenuOpen] = useState(false);
  const [paymentMethodFilter, setPaymentMethodFilter] = useState('all');
  const [sourceFilter, setSourceFilter] = useState('all');
  
  const receiptRef = useRef(null);
  
  const handlePrint = useReactToPrint({
    content: () => receiptRef.current,
  });

  useEffect(() => {
    const fetchOrders = async () => {
      try {
        setLoading(true);
        // Fetch orders from the server
        const response = await fetch('http://localhost:5000/api/orders');
        
        if (!response.ok) {
          throw new Error('Failed to fetch orders');
        }
        
        const data = await response.json();
        
        if (!data.success) {
          throw new Error(data.message || 'Error fetching orders');
        }
        
        setOrders(data.data.map(order => ({
          ...order,
          createdAt: new Date(order.createdAt),
          completedAt: order.completedAt ? new Date(order.completedAt) : null
        })));
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };
    
    fetchOrders();
  }, []);

  // Filter orders based on selected filters
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
    const passesPaymentFilter = paymentMethodFilter === 'all' || order.paymentMethod === paymentMethodFilter;
    
    // Source filter
    const passesSourceFilter = sourceFilter === 'all' || order.orderType === sourceFilter;
    
    // Search term filter
    const passesSearchFilter = 
      searchTerm === '' || 
      order.receiptNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (order.items.some(item => item.name.toLowerCase().includes(searchTerm.toLowerCase())));
    
    return passesDateFilter && passesPaymentFilter && passesSourceFilter && passesSearchFilter;
  }).sort((a, b) => b.createdAt - a.createdAt); // Most recent first

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
  
  // Export receipt as PDF
  const exportAsPDF = (order) => {
    // Set the selected order to prepare for printing/downloading
    setSelectedOrder(order);
    // Use setTimeout to ensure the receipt component is rendered
    setTimeout(() => {
      handlePrint();
    }, 100);
  };
  
  // Handle downloading receipt data as JSON
  const downloadReceiptData = (order) => {
    // Create a blob with the JSON data
    const blob = new Blob([JSON.stringify(order, null, 2)], {type: 'application/json'});
    const url = URL.createObjectURL(blob);
    
    // Create a link and click it to trigger download
    const a = document.createElement('a');
    a.href = url;
    a.download = `receipt-${order.receiptNumber}.json`;
    document.body.appendChild(a);
    a.click();
    
    // Clean up
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  if (loading) {
    return <div className="flex items-center justify-center h-64">Loading...</div>;
  }

  if (error) {
    return <div className="text-red-600">Error: {error}</div>;
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
            value={paymentMethodFilter}
            onChange={(e) => setPaymentMethodFilter(e.target.value)}
            className="px-4 py-2 rounded-lg bg-gray-100 text-gray-700 border-none"
          >
            <option value="all">All Payment Methods</option>
            <option value="cash">Cash</option>
            <option value="card">Card</option>
            <option value="e-wallet">E-Wallet</option>
          </select>
          
          <select
            value={sourceFilter}
            onChange={(e) => setSourceFilter(e.target.value)}
            className="px-4 py-2 rounded-lg bg-gray-100 text-gray-700 border-none"
          >
            <option value="all">All Sources</option>
            <option value="pos">POS</option>
            <option value="self_checkout">Self Checkout</option>
            <option value="chatbot">Chatbot</option>
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
            placeholder="Search by receipt number or item..."
            className="pl-10 px-4 py-2 rounded-lg bg-gray-100 w-full"
          />
        </div>
      </div>
      
      {/* Receipt List */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr style={{ backgroundColor: theme.colors.activeBg }}>
                <th className="text-left p-4" style={{ color: theme.colors.primary }}>Receipt #</th>
                <th className="text-left p-4" style={{ color: theme.colors.primary }}>Date</th>
                <th className="text-left p-4" style={{ color: theme.colors.primary }}>Items</th>
                <th className="text-right p-4" style={{ color: theme.colors.primary }}>Total</th>
                <th className="text-left p-4" style={{ color: theme.colors.primary }}>Payment</th>
                <th className="text-left p-4" style={{ color: theme.colors.primary }}>Source</th>
                <th className="text-center p-4" style={{ color: theme.colors.primary }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredOrders.length === 0 ? (
                <tr>
                  <td colSpan="7" className="text-center p-8" style={{ color: theme.colors.muted }}>
                    No receipts found matching your filters.
                  </td>
                </tr>
              ) : (
                filteredOrders.map((order) => (
                  <tr 
                    key={order._id} 
                    className="border-b hover:bg-gray-50 cursor-pointer"
                    style={{ borderColor: theme.colors.muted + '20' }}
                    onClick={() => setSelectedOrder(order)}
                  >
                    <td className="p-4" style={{ color: theme.colors.primary }}>{order.receiptNumber}</td>
                    <td className="p-4" style={{ color: theme.colors.secondary }}>{formatDate(order.createdAt)}</td>
                    <td className="p-4" style={{ color: theme.colors.primary }}>
                      {order.items.length} {order.items.length === 1 ? 'item' : 'items'}
                      <span className="block text-xs" style={{ color: theme.colors.muted }}>
                        {order.items.map(item => item.name).slice(0, 2).join(', ')}
                        {order.items.length > 2 ? ', ...' : ''}
                      </span>
                    </td>
                    <td className="p-4 text-right" style={{ color: theme.colors.primary }}>
                      {formatCurrency(order.totals.total)}
                    </td>
                    <td className="p-4 capitalize" style={{ color: theme.colors.secondary }}>
                      {order.paymentMethod}
                    </td>
                    <td className="p-4 capitalize" style={{ color: theme.colors.secondary }}>
                      {order.orderType === 'self_checkout' ? 'Self Checkout' : 
                       order.orderType === 'pos' ? 'POS' : order.orderType}
                    </td>
                    <td className="p-4">
                      <div className="flex justify-center gap-2">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            exportAsPDF(order);
                          }}
                          className="p-2 rounded-full hover:bg-gray-100"
                          title="Print Receipt"
                        >
                          <FiPrinter style={{ color: theme.colors.primary }} />
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            downloadReceiptData(order);
                          }}
                          className="p-2 rounded-full hover:bg-gray-100"
                          title="Download Receipt Data"
                        >
                          <FiDownload style={{ color: theme.colors.accent }} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
      
      {/* Receipt Modal */}
      {selectedOrder && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg shadow-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-4">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl font-bold" style={{ color: theme.colors.primary }}>
                  Receipt #{selectedOrder.receiptNumber}
                </h2>
                <div className="flex gap-2">
                  <button
                    onClick={handlePrint}
                    className="p-2 rounded-full hover:bg-gray-100"
                    title="Print Receipt"
                  >
                    <FiPrinter style={{ color: theme.colors.primary }} />
                  </button>
                  <button
                    onClick={() => downloadReceiptData(selectedOrder)}
                    className="p-2 rounded-full hover:bg-gray-100"
                    title="Download Receipt Data"
                  >
                    <FiDownload style={{ color: theme.colors.accent }} />
                  </button>
                  <button
                    onClick={() => setSelectedOrder(null)}
                    className="p-2 rounded-full hover:bg-gray-100"
                  >
                    ✕
                  </button>
                </div>
              </div>
              
              {/* Receipt Component */}
              <div className="border rounded-lg overflow-hidden">
                <Receipt
                  ref={receiptRef}
                  order={{
                    items: selectedOrder.items,
                    receiptNumber: selectedOrder.receiptNumber,
                  }}
                  totals={selectedOrder.totals}
                  paymentMethod={selectedOrder.paymentMethod}
                />
              </div>
              
              <div className="mt-4 flex justify-end">
                <button
                  onClick={() => setSelectedOrder(null)}
                  className="px-4 py-2 rounded-lg font-medium"
                  style={{ backgroundColor: theme.colors.accent, color: 'white' }}
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
      
      {/* Hidden Receipt for Printing */}
      <div className="hidden">
        {selectedOrder && (
          <Receipt
            ref={receiptRef}
            order={{
              items: selectedOrder.items,
              receiptNumber: selectedOrder.receiptNumber,
            }}
            totals={selectedOrder.totals}
            paymentMethod={selectedOrder.paymentMethod}
          />
        )}
      </div>
    </div>
  );
};

export default ReceiptHistory;
