import { theme } from '../../theme';
import { Card } from './Card';
import { Link } from 'react-router-dom';
import { 
  FiShoppingBag, FiDollarSign, FiUsers, FiTrendingUp, 
  FiChevronRight, FiBarChart2, FiClock, FiTrendingDown
} from 'react-icons/fi';
import { ResponsiveContainer, BarChart, Bar, XAxis, CartesianGrid, Tooltip } from 'recharts';
import StaffAvatar from '../../components/StaffAvatar';

export const DashboardGrid = ({
  stats,
  orders,
  salesSummary,
  operations,
  onRefreshOrders,
  onViewOrder,
  isLoading = false,
  className = '',
  staffData = { team: [], activeCount: 0 },
  monthlyExpenses = []
}) => {
  // Get only top 3 best sellers
  const topBestSellers = stats.bestSellers?.slice(0, 3) || [];
  
  // Format currency helper
  const formatCurrency = (value) => `₱${parseFloat(value || 0).toFixed(2)}`;
  
  const truncateReceiptNumber = (receiptNum) => {
    if (!receiptNum) return '';
    if (receiptNum.length <= 6) return receiptNum;
    return receiptNum.substring(receiptNum.length - 6);
  };
  return (
    <div className={`${className} flex flex-col gap-3`}>      {/* Unified KPI Row - combined sales and operations */}
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-2">
        {/* Sales KPIs */}
        <Card className="!p-3 flex flex-row items-center">
          <div className="w-8 h-8 rounded-full flex items-center justify-center mr-2"
               style={{ backgroundColor: theme.colors.primary + '15' }}>
            <FiDollarSign className="w-4 h-4" style={{ color: theme.colors.primary }} />
          </div>
          <div>
            <div className="text-[10px] text-gray-500">Sales</div>
            <div className="font-bold text-sm" style={{ color: theme.colors.primary }}>
              {formatCurrency(stats.totalSales)}
            </div>
          </div>
        </Card>
        
        <Card className="!p-3 flex flex-row items-center">
          <div className="w-8 h-8 rounded-full flex items-center justify-center mr-2"
               style={{ backgroundColor: theme.colors.accent + '15' }}>
            <FiShoppingBag className="w-4 h-4" style={{ color: theme.colors.accent }} />
          </div>
          <div>
            <div className="text-[10px] text-gray-500">Orders</div>
            <div className="font-bold text-sm" style={{ color: theme.colors.accent }}>
              {stats.ordersToday || 0}
            </div>
          </div>
        </Card>
        
        <Card className="!p-3 flex flex-row items-center">
          <div className="w-8 h-8 rounded-full flex items-center justify-center mr-2"
               style={{ backgroundColor: theme.colors.secondary + '15' }}>
            <FiTrendingUp className="w-4 h-4" style={{ color: theme.colors.secondary }} />
          </div>
          <div>
            <div className="text-[10px] text-gray-500">Avg</div>
            <div className="font-bold text-sm" style={{ color: theme.colors.secondary }}>
              {formatCurrency(stats.averageOrderValue)}
            </div>
          </div>        </Card>
        
        {/* Operations KPIs */}
        {operations && (
          <>
            <Card className="!p-3 flex flex-row items-center">
              <div className="w-8 h-8 rounded-full flex items-center justify-center mr-2"
                  style={{ backgroundColor: theme.colors.primary + '15' }}>
                <FiDollarSign className="w-4 h-4" style={{ color: theme.colors.primary }} />
              </div>
              <div>
                <div className="text-[10px] text-gray-500">Expenses</div>
                <div className="font-bold text-sm" style={{ color: theme.colors.primary }}>
                  {formatCurrency(operations.monthlyDisbursements || 0)}
                </div>
              </div>
            </Card>
              
            <Card className="!p-3 flex flex-row items-center">
              <div className="w-8 h-8 rounded-full flex items-center justify-center mr-2"
                  style={{ backgroundColor: theme.colors.accent + '15' }}>
                <FiShoppingBag className="w-4 h-4" style={{ color: theme.colors.accent }} />
              </div>
              <div>
                <div className="text-[10px] text-gray-500">Low Stock</div>
                <div className="font-bold text-sm" style={{ color: theme.colors.accent }}>
                  {operations.lowStockItems || 0}
                </div>
              </div>
            </Card>
          </>
        )}
        
        <Card className="!p-3 flex flex-row items-center">
          <div className="w-8 h-8 rounded-full flex items-center justify-center mr-2"
               style={{ backgroundColor: theme.colors.muted + '15' }}>
            <FiUsers className="w-4 h-4" style={{ color: theme.colors.muted }} />
          </div>
          <div>
            <div className="text-[10px] text-gray-500">Staff</div>
            <div className="font-bold text-sm" style={{ color: theme.colors.muted }}>
              {stats.activeStaff || 0}
            </div>
          </div>
        </Card>
      </div>

      {/* Two-Panel Layout for Critical Data */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {/* Recent Orders - Left Panel */}
        <Card className="!p-0 overflow-hidden">
          <div className="px-3 py-2 border-b flex justify-between items-center" 
               style={{ borderColor: theme.colors.muted + '15' }}>
            <div className="text-xs font-medium" style={{ color: theme.colors.primary }}>
              Recent Orders
            </div>
            <Link 
              to="/orders" 
              className="flex items-center text-[10px] font-medium"
              style={{ color: theme.colors.accent }}
            >
              View All <FiChevronRight className="ml-0.5 w-2 h-2" />
            </Link>
          </div>
          
          <div className="overflow-y-auto" style={{ maxHeight: '180px' }}>
            {orders.slice(0, 6).map((order) => (
              <div 
                key={order._id}
                className="px-3 py-1.5 border-b last:border-0 flex items-center justify-between cursor-pointer hover:bg-gray-50"
                style={{ borderColor: theme.colors.muted + '10' }}
                onClick={() => onViewOrder(order)}
              >
                <div className="flex items-center gap-1.5">
                  <div 
                    className="w-1.5 h-1.5 rounded-full" 
                    style={{ 
                      backgroundColor: order.status === 'completed' ? '#16a34a' : theme.colors.accent
                    }} 
                  />
                  <span className="text-xs">{truncateReceiptNumber(order.receiptNumber)}</span>
                </div>
                <span className="text-xs">{formatCurrency(order.totals.total)}</span>
              </div>
            ))}
            {orders.length === 0 && (
              <div className="px-3 py-2 text-[10px] text-center" style={{ color: theme.colors.muted }}>
                No recent orders
              </div>
            )}
          </div>
        </Card>

        {/* Top Products & Revenue - Right Panel */}
        <Card className="!p-0 overflow-hidden">
          <div className="px-3 py-2 border-b flex justify-between items-center" 
               style={{ borderColor: theme.colors.muted + '15' }}>
            <div className="text-xs font-medium" style={{ color: theme.colors.primary }}>
              Sales Performance
            </div>            <Link 
              to="/revenue-reports" 
              className="flex items-center text-[10px] font-medium"
              style={{ color: theme.colors.accent }}
            >
              Details <FiChevronRight className="ml-0.5 w-2 h-2" />
            </Link>
          </div>

          <div className="p-3 grid grid-cols-2 gap-3">
            {/* Left side: Top 3 Products */}
            <div>
              <div className="text-[10px] mb-1.5" style={{ color: theme.colors.muted }}>Top Products</div>
              <div className="space-y-1">
                {topBestSellers.map((item, index) => (
                  <div key={item.id} className="flex items-center justify-between">
                    <span className="text-[10px] truncate max-w-[100px]" title={item.name}>
                      {item.name}
                    </span>
                    <span className="text-[10px] font-medium px-1 py-0.5 rounded bg-gray-100">
                      {item.quantity}
                    </span>
                  </div>
                ))}
                {topBestSellers.length === 0 && (
                  <div className="text-[10px]" style={{ color: theme.colors.muted }}>
                    No data available
                  </div>
                )}
              </div>
            </div>
            
            {/* Right side: Revenue Breakdown */}
            <div>
              <div className="text-[10px] mb-1.5" style={{ color: theme.colors.muted }}>Revenue Sources</div>
              <div className="space-y-1.5">
                {Object.entries(salesSummary.orderSources || {})
                  .slice(0, 3)
                  .map(([source, amount]) => (
                    <div key={source} className="flex flex-col">
                      <div className="flex justify-between items-center">
                        <span className="text-[10px] capitalize">{source}</span>
                        <span className="text-[10px] font-medium">{formatCurrency(amount)}</span>
                      </div>
                      <div className="w-full h-1 bg-gray-100 rounded-full overflow-hidden">
                        <div 
                          className="h-full rounded-full" 
                          style={{ 
                            width: `${(amount / salesSummary.totalSales) * 100}%`,
                            backgroundColor: theme.colors.accent
                          }}
                        />
                      </div>
                    </div>
                  ))
                }
                {(!salesSummary.orderSources || Object.keys(salesSummary.orderSources).length === 0) && (
                  <div className="text-[10px]" style={{ color: theme.colors.muted }}>
                    No data available
                  </div>
                )}
              </div>
            </div>
          </div>
        </Card>      </div>

      {/* Additional Panels - Team Overview & Monthly Disbursement */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {/* Team Overview Panel */}
        <Card className="!p-0 overflow-hidden">
          <div className="px-3 py-2 border-b flex justify-between items-center" 
               style={{ borderColor: theme.colors.muted + '15' }}>
            <div className="text-xs font-medium flex items-center gap-1.5" style={{ color: theme.colors.primary }}>
              <FiUsers className="w-3 h-3" /> Team Overview
            </div>
            <Link 
              to="/employees" 
              className="flex items-center text-[10px] font-medium"
              style={{ color: theme.colors.accent }}
            >
              View All <FiChevronRight className="ml-0.5 w-2 h-2" />
            </Link>
          </div>
          
          <div className="overflow-y-auto" style={{ maxHeight: '180px' }}>
            {staffData.team.map((member) => (
              <Link 
                key={member.id}
                to={`/employees/${member.id}`}
                className="px-3 py-1.5 border-b last:border-0 flex items-center justify-between cursor-pointer hover:bg-gray-50"
                style={{ borderColor: theme.colors.muted + '10' }}
              >                <div className="flex items-center gap-2">
                  <StaffAvatar 
                    imagePath={member.profilePicture}
                    alt={`${member.name}'s photo`}
                    size={24}
                    className="rounded-sm border"
                  />
                  <div className="flex flex-col">
                    <span className="text-[11px] font-medium">{member.name}</span>
                    <span className="text-[9px]" style={{ color: theme.colors.muted }}>{member.position}</span>
                  </div>
                </div>
                <span 
                  className="text-[9px] px-1.5 py-0.5 rounded-full capitalize"
                  style={{ 
                    backgroundColor: member.status === 'Active' ? theme.colors.activeBg : '#f0f0f0',
                    color: member.status === 'Active' ? theme.colors.accent : theme.colors.muted
                  }}
                >
                  {member.status}
                </span>
              </Link>
            ))}
            {staffData.team.length === 0 && (
              <div className="px-3 py-2 text-[10px] text-center" style={{ color: theme.colors.muted }}>
                No staff data available
              </div>
            )}
          </div>
        </Card>

        {/* Monthly Disbursement Panel */}
        <Card className="!p-0 overflow-hidden">
          <div className="px-3 py-2 border-b flex justify-between items-center" 
               style={{ borderColor: theme.colors.muted + '15' }}>
            <div className="text-xs font-medium flex items-center gap-1.5" style={{ color: theme.colors.primary }}>
              <FiDollarSign className="w-3 h-3" /> Monthly Disbursements
            </div>
            <Link 
              to="/expense-management" 
              className="flex items-center text-[10px] font-medium"
              style={{ color: theme.colors.accent }}
            >
              Details <FiChevronRight className="ml-0.5 w-2 h-2" />
            </Link>
          </div>
          
          <div className="px-3 py-2">
            {monthlyExpenses.length > 0 ? (
              <div className="w-full h-32">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={monthlyExpenses.slice(-6)} barSize={24}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} opacity={0.2} />
                    <XAxis 
                      dataKey="formattedMonth" 
                      tick={{ fontSize: 9 }} 
                      axisLine={false}
                      tickLine={false}
                    />
                    <Tooltip
                      formatter={(value) => [`₱${parseFloat(value).toLocaleString('en-PH', { minimumFractionDigits: 2 })}`, 'Amount']}
                      contentStyle={{ fontSize: '10px' }}
                      labelStyle={{ fontSize: '10px' }}
                    />
                    <Bar 
                      dataKey="amount" 
                      fill={theme.colors.secondary}
                      radius={[4, 4, 0, 0]} 
                    />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <div className="flex justify-center items-center h-32">
                <span className="text-[10px]" style={{ color: theme.colors.muted }}>
                  No disbursement data available
                </span>
              </div>
            )}
          </div>
        </Card>
      </div>
      
      {/* Quick Actions - Compact Icons */}
      <div className="flex justify-center gap-2 mt-1">
        <Link 
          to="/orders/new" 
          className="p-2 border rounded-full hover:bg-gray-50"
          style={{ borderColor: theme.colors.muted + '20' }}
          title="New Order"
        >
          <FiShoppingBag className="w-4 h-4" style={{ color: theme.colors.accent }} />
        </Link>
        
        <Link 
          to="/inventory" 
          className="p-2 border rounded-full hover:bg-gray-50"
          style={{ borderColor: theme.colors.muted + '20' }}
          title="Inventory"
        >
          <FiBarChart2 className="w-4 h-4" style={{ color: theme.colors.secondary }} />
        </Link>
          <Link 
          to="/revenue-reports" 
          className="p-2 border rounded-full hover:bg-gray-50"
          style={{ borderColor: theme.colors.muted + '20' }}
          title="Revenue Reports"
        >
          <FiDollarSign className="w-4 h-4" style={{ color: theme.colors.primary }} />
        </Link>
        
        <Link 
          to="/staff" 
          className="p-2 border rounded-full hover:bg-gray-50"
          style={{ borderColor: theme.colors.muted + '20' }}
          title="Staff"
        >
          <FiUsers className="w-4 h-4" style={{ color: theme.colors.muted }} />
        </Link>
      </div>
    </div>
  );
};
