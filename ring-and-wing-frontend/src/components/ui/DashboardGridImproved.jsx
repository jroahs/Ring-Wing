import { theme } from '../../theme';
import { Card } from './Card';
import { 
  FiShoppingBag, FiDollarSign, FiUsers, FiTrendingUp, 
  FiChevronRight, FiBarChart2, FiClock, FiAlertCircle, 
  FiBox, FiTrendingDown 
} from 'react-icons/fi';
import { Link } from 'react-router-dom';

export const DashboardGrid = ({
  stats,
  orders,
  salesSummary,
  onRefreshOrders,
  onViewOrder,
  isLoading = false,
  className = ''
}) => {
  // Function to render "See details" link
  const SeeMoreLink = ({ to, label = "See details" }) => (
    <Link 
      to={to} 
      className="flex items-center text-xs mt-2 font-medium"
      style={{ color: theme.colors.accent }}
    >
      {label} <FiChevronRight className="ml-1 w-3 h-3" />
    </Link>
  );
  
  // Get only top 3 best sellers for a more concise display
  const topBestSellers = stats.bestSellers?.slice(0, 3) || [];
  
  // Format currency helper
  const formatCurrency = (value) => `₱${parseFloat(value || 0).toFixed(2)}`;
  
  // Get top payment methods (only top 2)
  const topPaymentMethods = Object.entries(salesSummary.paymentMethods || {})
    .sort((a, b) => b[1] - a[1])
    .slice(0, 2);

  return (
    <div className={`${className}`}>
      {/* Top Key Metrics - Ultra Compact */}
      <div className="grid grid-cols-4 lg:grid-cols-8 gap-2 mb-4">
        <Card className="!p-2.5 flex flex-col items-center justify-center">
          <div className="flex items-center justify-center text-xs font-medium mb-1" style={{ color: theme.colors.muted }}>
            Sales
          </div>
          <div className="font-bold text-sm" style={{ color: theme.colors.primary }}>
            {formatCurrency(stats.totalSales)}
          </div>
        </Card>
        
        <Card className="!p-2.5 flex flex-col items-center justify-center">
          <div className="flex items-center justify-center text-xs font-medium mb-1" style={{ color: theme.colors.muted }}>
            Orders
          </div>
          <div className="font-bold text-sm" style={{ color: theme.colors.primary }}>
            {stats.ordersToday}
          </div>
        </Card>
        
        <Card className="!p-2.5 flex flex-col items-center justify-center">
          <div className="flex items-center justify-center text-xs font-medium mb-1" style={{ color: theme.colors.muted }}>
            Avg Order
          </div>
          <div className="font-bold text-sm" style={{ color: theme.colors.primary }}>
            {formatCurrency(stats.averageOrderValue)}
          </div>
        </Card>
        
        <Card className="!p-2.5 flex flex-col items-center justify-center">
          <div className="flex items-center justify-center text-xs font-medium mb-1" style={{ color: theme.colors.muted }}>
            Staff
          </div>
          <div className="font-bold text-sm" style={{ color: theme.colors.primary }}>
            {stats.activeStaff}
          </div>
        </Card>
        
        {/* Additional summary metrics visible only on larger screens */}
        <Card className="!p-2.5 flex-col items-center justify-center hidden lg:flex">
          <div className="flex items-center justify-center text-xs font-medium mb-1" style={{ color: theme.colors.muted }}>
            Growth
          </div>
          <div className="font-bold text-sm flex items-center" 
               style={{ color: stats.salesGrowth >= 0 ? '#16a34a' : '#dc2626' }}>
            {stats.salesGrowth >= 0 ? 
              <FiTrendingUp className="w-3 h-3 mr-0.5" /> : 
              <FiTrendingDown className="w-3 h-3 mr-0.5" />}
            {Math.abs(stats.salesGrowth)}%
          </div>
        </Card>
        
        <Card className="!p-2.5 flex-col items-center justify-center hidden lg:flex">
          <div className="flex items-center justify-center text-xs font-medium mb-1" style={{ color: theme.colors.muted }}>
            Peak Hour
          </div>
          <div className="font-bold text-sm flex items-center" style={{ color: theme.colors.primary }}>
            <FiClock className="w-3 h-3 mr-0.5" />
            {stats.peakHours && stats.peakHours.length > 0 ? 
              `${stats.peakHours.reduce((max, hour) => hour.orders > max.orders ? hour : max, {orders: 0}).hour}:00` : 
              'N/A'}
          </div>
        </Card>
        
        <Card className="!p-2.5 flex-col items-center justify-center hidden lg:flex">
          <div className="flex items-center justify-center text-xs font-medium mb-1" style={{ color: theme.colors.muted }}>
            Top Item
          </div>
          <div className="font-bold text-sm truncate max-w-[100%]" style={{ color: theme.colors.primary }}>
            {topBestSellers.length > 0 ? topBestSellers[0].name : 'None'}
          </div>
        </Card>

        <Card className="!p-2.5 flex-col items-center justify-center hidden lg:flex">
          <div className="flex items-center justify-center text-xs font-medium mb-1" style={{ color: theme.colors.muted }}>
            Alerts
          </div>
          <div className="font-bold text-sm flex items-center" style={{ color: '#dc2626' }}>
            <FiAlertCircle className="w-3 h-3 mr-0.5" />
            {stats.alertCount || 0}
          </div>
        </Card>
      </div>

      {/* Three-panel Layout */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Orders & Operations Panel - Left */}
        <div className="space-y-4">
          {/* Recent Orders - Simplified */}
          <Card className="overflow-hidden">
            <div className="p-3 border-b" style={{ borderColor: theme.colors.muted + '20' }}>
              <div className="flex items-center justify-between">
                <h3 className="font-medium" style={{ color: theme.colors.primary }}>Recent Orders</h3>
                <span className="text-xs bg-gray-100 px-2 py-1 rounded-full">{orders.length} total</span>
              </div>
            </div>
            
            <div className="max-h-[200px] overflow-y-auto">
              {orders.slice(0, 5).map((order) => (
                <div 
                  key={order._id}
                  className="px-3 py-1.5 border-b last:border-0 cursor-pointer hover:bg-gray-50 flex items-center justify-between"
                  style={{ borderColor: theme.colors.muted + '10' }}
                  onClick={() => onViewOrder(order)}
                >
                  <div className="flex items-center">
                    <span className="text-xs font-medium" style={{ color: theme.colors.primary }}>
                      #{order.receiptNumber.substring(order.receiptNumber.length - 6)}
                    </span>
                    <span className="mx-2 text-[10px] px-1.5 py-0.5 rounded" 
                      style={{ 
                        backgroundColor: order.status === 'completed' ? '#dcfce7' : '#fef3c7',
                        color: order.status === 'completed' ? '#166534' : '#92400e'  
                      }}>
                      {order.status}
                    </span>
                  </div>
                  <span className="text-xs font-medium" style={{ color: theme.colors.primary }}>
                    {formatCurrency(order.totals.total)}
                  </span>
                </div>
              ))}
            </div>
            <div className="px-3 py-2 bg-gray-50 border-t" style={{ borderColor: theme.colors.muted + '20' }}>
              <SeeMoreLink to="/orders" label="View all orders" />
            </div>
          </Card>

          {/* Status Cards */}
          <div className="grid grid-cols-2 gap-2">
            <Card className="!p-3">
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-xs font-medium" style={{ color: theme.colors.muted }}>Pending Orders</span>
                <FiClock style={{ color: theme.colors.accent, width: '14px', height: '14px' }} />
              </div>
              <div className="text-lg font-bold" style={{ color: theme.colors.primary }}>
                {stats.pendingOrders || 0}
              </div>
              <SeeMoreLink to="/orders?status=pending" />
            </Card>
            
            <Card className="!p-3">
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-xs font-medium" style={{ color: theme.colors.muted }}>Low Stock</span>
                <FiBox style={{ color: theme.colors.secondary, width: '14px', height: '14px' }} />
              </div>
              <div className="text-lg font-bold" style={{ color: theme.colors.secondary }}>
                {stats.lowStockCount || 0}
              </div>
              <SeeMoreLink to="/inventory?filter=low-stock" />
            </Card>
          </div>
        </div>
        
        {/* Revenue Overview - Center */}
        <Card className="md:col-span-1">
          <div className="p-3 border-b" style={{ borderColor: theme.colors.muted + '20' }}>
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-medium" style={{ color: theme.colors.primary }}>Revenue Overview</h3>
              <div className="flex space-x-1">
                <button className="px-2 py-1 text-xs rounded" 
                  style={{ 
                    backgroundColor: theme.colors.accent + '20',
                    color: theme.colors.accent
                  }}>
                  Day
                </button>
                <button className="px-2 py-1 text-xs rounded">Week</button>
                <button className="px-2 py-1 text-xs rounded">Month</button>
              </div>
            </div>
          </div>
          
          <div className="p-4">
            {/* Revenue Stats */}
            <div className="grid grid-cols-2 gap-4 mb-4">
              <div>
                <div className="text-xs" style={{ color: theme.colors.muted }}>Total Revenue</div>
                <div className="text-lg font-bold" style={{ color: theme.colors.primary }}>
                  {formatCurrency(stats.totalSales)}
                </div>
                <div className="text-xs flex items-center mt-1" 
                     style={{ color: stats.salesGrowth >= 0 ? '#16a34a' : '#dc2626' }}>
                  {stats.salesGrowth >= 0 ? 
                    <FiTrendingUp className="w-3 h-3 mr-0.5" /> : 
                    <FiTrendingDown className="w-3 h-3 mr-0.5" />}
                  {Math.abs(stats.salesGrowth)}% vs yesterday
                </div>
              </div>
              <div>
                <div className="text-xs" style={{ color: theme.colors.muted }}>Order Count</div>
                <div className="text-lg font-bold" style={{ color: theme.colors.primary }}>
                  {stats.ordersToday}
                </div>
                <div className="text-xs flex items-center mt-1" 
                     style={{ color: stats.ordersGrowth >= 0 ? '#16a34a' : '#dc2626' }}>
                  {stats.ordersGrowth >= 0 ? 
                    <FiTrendingUp className="w-3 h-3 mr-0.5" /> : 
                    <FiTrendingDown className="w-3 h-3 mr-0.5" />}
                  {Math.abs(stats.ordersGrowth)}% vs yesterday
                </div>
              </div>
            </div>
            
            {/* Mini Peak Hours Chart */}
            <div className="mt-2">
              <div className="text-xs mb-2" style={{ color: theme.colors.muted }}>Peak Hours</div>
              <div className="flex gap-0.5 items-end h-16">
                {stats.peakHours?.map((hour) => (
                  <div
                    key={hour.hour}
                    className="flex-1 flex flex-col items-center"
                    title={`${hour.hour}:00 - ${hour.orders} orders`}
                  >
                    <div 
                      className="w-full rounded-t"
                      style={{
                        backgroundColor: theme.colors.accent,
                        opacity: 0.7 + (hour.orders / stats.maxHourlyOrders) * 0.3,
                        height: `${(hour.orders / stats.maxHourlyOrders) * 100}%`,
                        minHeight: '3px'
                      }}
                    />
                    {hour.hour % 3 === 0 && (
                      <div className="text-center text-[9px] mt-1" style={{ color: theme.colors.muted }}>
                        {hour.hour}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
            
            <SeeMoreLink to="/reports/analytics" label="Full analytics" />
          </div>
        </Card>
        
        {/* Performance & Insights - Right */}
        <div className="space-y-4">
          {/* Top Products */}
          <Card className="!px-0 !pt-0 !pb-2 overflow-hidden">
            <div className="px-3 py-2 border-b" style={{ borderColor: theme.colors.muted + '20' }}>
              <h3 className="text-sm font-medium" style={{ color: theme.colors.primary }}>
                Best Selling Items
              </h3>
            </div>
            
            {topBestSellers.length > 0 ? (
              <div className="px-3 pt-2">
                {topBestSellers.slice(0, 3).map((item, index) => (
                  <div 
                    key={item.id}
                    className="flex items-center justify-between py-1"
                  >
                    <div className="flex items-center">
                      <div className="w-[18px] h-[18px] rounded-full flex items-center justify-center mr-2"
                           style={{ 
                             backgroundColor: index === 0 ? '#fef3c7' : index === 1 ? '#f1f5f9' : '#f3f4f6',
                             color: index === 0 ? '#92400e' : index === 1 ? '#475569' : '#6b7280'
                           }}>
                        <span className="text-[9px] font-bold">{index + 1}</span>
                      </div>
                      <span className="text-xs truncate max-w-[100px]" style={{ color: theme.colors.primary }}>
                        {item.name}
                      </span>
                    </div>
                    <span className="text-xs" style={{ color: theme.colors.secondary }}>
                      {item.quantity} sold
                    </span>
                  </div>
                ))}
                <SeeMoreLink to="/reports/products" label="See all products" />
              </div>
            ) : (
              <div className="px-3 py-2 text-xs" style={{ color: theme.colors.muted }}>
                No sales data available
              </div>
            )}
          </Card>
          
          {/* Payment Methods */}
          <Card className="!p-0 overflow-hidden">
            <div className="px-3 py-2 border-b" style={{ borderColor: theme.colors.muted + '20' }}>
              <h3 className="text-sm font-medium" style={{ color: theme.colors.primary }}>
                Payment Methods
              </h3>
            </div>
            
            <div className="px-3 pt-2 pb-1">
              {/* Only show top payment methods */}
              {topPaymentMethods.map(([method, amount]) => (
                <div key={method} className="flex items-center justify-between py-1">
                  <span className="text-xs capitalize" style={{ color: theme.colors.muted }}>
                    {method}
                  </span>
                  <span className="text-xs font-medium" style={{ color: theme.colors.primary }}>
                    {formatCurrency(amount)}
                  </span>
                </div>
              ))}
              
              {/* Only show total if we have payment methods */}
              {topPaymentMethods.length > 0 && (
                <div className="pt-1 mt-1 border-t" style={{ borderColor: theme.colors.muted + '20' }}>
                  <div className="flex items-center justify-between py-1">
                    <span className="text-xs font-medium" style={{ color: theme.colors.primary }}>
                      Total
                    </span>
                    <span className="text-xs font-bold" style={{ color: theme.colors.primary }}>
                      {formatCurrency(salesSummary.totalSales)}
                    </span>
                  </div>
                </div>
              )}
              
              <SeeMoreLink to="/reports/sales" label="Payment details" />
            </div>
          </Card>
        </div>
      </div>
      
      {/* Quick Actions Row */}
      <div className="mt-4 grid grid-cols-2 sm:grid-cols-4 gap-2">
        <Link 
          to="/orders/new" 
          className="p-2 border rounded flex flex-col items-center justify-center hover:bg-gray-50 transition-colors"
          style={{ borderColor: theme.colors.muted + '20' }}
        >
          <FiShoppingBag className="mb-1" style={{ color: theme.colors.accent }} />
          <span className="text-xs">New Order</span>
        </Link>
        
        <Link 
          to="/inventory" 
          className="p-2 border rounded flex flex-col items-center justify-center hover:bg-gray-50 transition-colors"
          style={{ borderColor: theme.colors.muted + '20' }}
        >
          <FiBarChart2 className="mb-1" style={{ color: theme.colors.secondary }} />
          <span className="text-xs">Inventory</span>
        </Link>
        
        <Link 
          to="/reports" 
          className="p-2 border rounded flex flex-col items-center justify-center hover:bg-gray-50 transition-colors"
          style={{ borderColor: theme.colors.muted + '20' }}
        >
          <FiDollarSign className="mb-1" style={{ color: theme.colors.primary }} />
          <span className="text-xs">Reports</span>
        </Link>
        
        <Link 
          to="/staff" 
          className="p-2 border rounded flex flex-col items-center justify-center hover:bg-gray-50 transition-colors"
          style={{ borderColor: theme.colors.muted + '20' }}
        >
          <FiUsers className="mb-1" style={{ color: theme.colors.muted }} />
          <span className="text-xs">Staff</span>
        </Link>
      </div>
    </div>
  );
};
