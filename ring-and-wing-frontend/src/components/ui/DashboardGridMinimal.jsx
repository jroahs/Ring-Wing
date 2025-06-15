import { theme } from '../../theme';
import { Card } from './Card';
import { Link } from 'react-router-dom';
import { 
  FiShoppingBag, FiDollarSign, FiUsers, FiTrendingUp, 
  FiChevronRight, FiBarChart2, FiClock, FiTrendingDown
} from 'react-icons/fi';
import { ResponsiveContainer, BarChart, Bar, XAxis, CartesianGrid, Tooltip, LineChart, Line, YAxis } from 'recharts';
import PesoIcon from './PesoIcon';
import { PesoIconSVG } from './PesoIconSVG';
import { PesoIconClean } from './PesoIconClean';
import { PesoIconSimple } from './PesoIconSimple';
import StaffAvatar from '../../components/StaffAvatar';

export const DashboardGridMinimal = ({
  stats,
  orders,
  salesSummary,
  monthlyRevenueSummary,
  operations = {},
  onRefreshOrders,
  onViewOrder,
  isLoading = false,
  className = '',
  staffData = { team: [], activeCount: 0 },
  monthlyExpenses = [],
  revenueData = []
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

  // Calculate profit margin as a percentage
  const calculateProfitMargin = (totalSales, expenses) => {
    const totalExpense = calculateTotalExpenses(expenses);
    if (totalSales === 0) return 0;
    const profit = totalSales - totalExpense;
    return Math.round((profit / totalSales) * 100);
  };
  
  // Calculate cash flow (income - expenses)
  const calculateCashFlow = (totalSales, expenses) => {
    const totalExpense = calculateTotalExpenses(expenses);
    return totalSales - totalExpense;
  };
  
  // Calculate total expenses from monthly expenses data
  const calculateTotalExpenses = (expenses) => {
    if (!expenses || !expenses.length) return 0;
    return expenses.reduce((sum, expense) => sum + (expense.amount || 0), 0);
  };

  return (
    <div className={`${className} flex flex-col gap-3`}>
      {/* Ultra-Compact KPI Row */}
      <div className="grid grid-cols-4 gap-2">        <Card className="!p-3 flex flex-row items-center">
          <div className="w-8 h-8 rounded-full flex items-center justify-center mr-2"
               style={{ backgroundColor: theme.colors.primary + '15' }}>
            <PesoIconClean width={16} height={16} style={{ color: theme.colors.primary }} />
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
          </div>
        </Card>
        
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
      </div>      {/* Four-Panel Layout in Single Row */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
        {/* Recent Orders Panel */}
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
              <FiChevronRight className="w-3 h-3" />
            </Link>
          </div>
          
          <div className="overflow-y-auto" style={{ maxHeight: '150px' }}>
            {orders.slice(0, 4).map((order) => (
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
                No orders
              </div>
            )}
          </div>
        </Card>        {/* Top Items Sold Panel */}
        <Card className="!p-0 overflow-hidden">
          <div className="px-3 py-2 border-b flex justify-between items-center" 
               style={{ borderColor: theme.colors.muted + '15' }}>
            <div className="text-xs font-medium" style={{ color: theme.colors.primary }}>
              Top Items Sold
            </div>
            <Link 
              to="/revenue-reports" 
              className="flex items-center text-[10px] font-medium"
              style={{ color: theme.colors.accent }}
            >
              <FiChevronRight className="w-3 h-3" />
            </Link>
          </div>          <div className="p-3">
            <div className="space-y-1.5">
              {topBestSellers
                .sort((a, b) => b.quantity - a.quantity) // Ensure items are sorted by quantity
                .map((item, index) => (
                <div key={item.id || index} className="flex flex-col">
                  <div className="flex justify-between items-center">
                    <div className="flex items-center gap-1.5">
                      <span 
                        className="w-4 h-4 rounded-full flex items-center justify-center text-[8px] font-medium"
                        style={{ 
                          backgroundColor: index === 0 ? '#FFD700' : index === 1 ? '#C0C0C0' : index === 2 ? '#CD7F32' : theme.colors.muted + '15',
                          color: index <= 2 ? '#fff' : theme.colors.muted
                        }}
                      >
                        {index + 1}
                      </span>
                      <span className="text-[10px] capitalize truncate max-w-[90px]" title={item.name}>{item.name}</span>
                    </div>
                    <span className="text-[10px] font-medium">{item.quantity} sold</span>
                  </div>
                  <div className="w-full h-1 bg-gray-100 rounded-full overflow-hidden">
                    <div 
                      className="h-full rounded-full" 
                      style={{ 
                        width: `${(item.quantity / (topBestSellers[0]?.quantity || 1)) * 100}%`,
                        backgroundColor: index === 0 ? '#FFD700' : index === 1 ? '#C0C0C0' : index === 2 ? '#CD7F32' : theme.colors.accent
                      }}
                    />
                  </div>
                </div>
              ))}
              {topBestSellers.length === 0 && (
                <div className="text-[10px]" style={{ color: theme.colors.muted }}>
                  No data available
                </div>
              )}
            </div>
          </div>
        </Card>
          {/* Team Overview Panel */}
        <Card className="!p-0 overflow-hidden">
          <div className="px-3 py-2 border-b flex justify-between items-center" 
               style={{ borderColor: theme.colors.muted + '15' }}>
            <div className="text-xs font-medium flex items-center gap-1" style={{ color: theme.colors.primary }}>
              <FiUsers className="w-3 h-3" /> Team Overview
            </div>
            <Link 
              to="/employees" 
              className="flex items-center text-[10px] font-medium"
              style={{ color: theme.colors.accent }}
            >
              <FiChevronRight className="w-3 h-3" />
            </Link>
          </div>
          
          <div className="overflow-y-auto" style={{ maxHeight: '150px' }}>
            {staffData.team.slice(0, 3).map((member) => (
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
                  className="text-[9px] px-1 py-0.5 rounded-full capitalize"
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
                No staff data
              </div>
            )}
          </div>
        </Card>        {/* Financial Health Panel */}
        <Card className="!p-0 overflow-hidden">
          <div className="px-3 py-2 border-b flex justify-between items-center" 
               style={{ borderColor: theme.colors.muted + '15' }}>
            <div className="text-xs font-medium flex items-center gap-1" style={{ color: theme.colors.primary }}>
              <PesoIconSimple width={12} height={12} /> Revenue Overview
            </div>
            <Link 
              to="/revenue-reports" 
              className="flex items-center text-[10px] font-medium"
              style={{ color: theme.colors.accent }}
            >
              <FiChevronRight className="w-3 h-3" />
            </Link>
          </div>
          
          <div className="p-3">
            {/* Mini Revenue Chart */}            <div className="mb-3">
              <div className="flex justify-between items-center mb-2">
                <span className="text-[10px]" style={{ color: theme.colors.muted }}>Daily Revenue Trend</span>
                <span className="text-xs font-medium" style={{ color: theme.colors.primary }}>
                  {formatCurrency(monthlyRevenueSummary?.totalSales || 0)}
                </span>
              </div>{revenueData.length > 0 ? (
                <div className="h-16 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={revenueData.slice(-7)} barSize={8}>
                      <XAxis 
                        dataKey="period" 
                        tick={false}
                        axisLine={false}
                        tickLine={false}
                      />
                      <Tooltip
                        formatter={(value) => [`₱${parseFloat(value).toLocaleString('en-PH', { minimumFractionDigits: 2 })}`, 'Revenue']}
                        contentStyle={{ fontSize: '10px', backgroundColor: theme.colors.background }}
                        labelStyle={{ fontSize: '10px' }}
                      />
                      <Bar 
                        dataKey="revenue" 
                        fill={theme.colors.accent}
                        radius={[2, 2, 0, 0]} 
                      />
                    </BarChart>
                  </ResponsiveContainer>
                </div>              ) : (
                <div className="h-16 flex items-center justify-center bg-gray-50 rounded">
                  <span className="text-[10px]" style={{ color: theme.colors.muted }}>No revenue data available</span>
                </div>
              )}
            </div>

            {/* Profit Margin */}
            <div className="mb-3">
              <div className="flex justify-between items-center mb-1">
                <span className="text-[10px]" style={{ color: theme.colors.muted }}>Profit Margin</span>                <span 
                  className="text-xs font-medium"
                  style={{ 
                    color: calculateProfitMargin(monthlyRevenueSummary?.totalSales || 0, monthlyExpenses) >= 25 ? '#16a34a' : 
                           calculateProfitMargin(monthlyRevenueSummary?.totalSales || 0, monthlyExpenses) >= 15 ? theme.colors.accent : 
                           'red'
                  }}
                >
                  {calculateProfitMargin(monthlyRevenueSummary?.totalSales || 0, monthlyExpenses)}%
                </span>
              </div>              <div className="w-full h-1.5 bg-gray-100 rounded-full overflow-hidden">
                <div 
                  className="h-full rounded-full" 
                  style={{ 
                    width: `${Math.min(Math.max(calculateProfitMargin(monthlyRevenueSummary?.totalSales || 0, monthlyExpenses), 0), 100)}%`,
                    backgroundColor: calculateProfitMargin(monthlyRevenueSummary?.totalSales || 0, monthlyExpenses) >= 25 ? '#16a34a' : 
                                     calculateProfitMargin(monthlyRevenueSummary?.totalSales || 0, monthlyExpenses) >= 15 ? theme.colors.accent : 
                                     'red'
                  }}
                />
              </div>
              <div className="flex justify-between mt-0.5">
                <span className="text-[8px]" style={{ color: theme.colors.muted }}>0%</span>
                <span className="text-[8px]" style={{ color: theme.colors.muted }}>Target: 25%</span>
                <span className="text-[8px]" style={{ color: theme.colors.muted }}>50%</span>
              </div>
            </div>
            
            {/* Cash Flow */}
            <div>
              <div className="flex justify-between items-center mb-1">
                <span className="text-[10px]" style={{ color: theme.colors.muted }}>Cash Flow</span>                <span 
                  className="text-xs font-medium"
                  style={{ 
                    color: calculateCashFlow(monthlyRevenueSummary?.totalSales || 0, monthlyExpenses) > 0 ? '#16a34a' : 'red' 
                  }}
                >
                  {formatCurrency(calculateCashFlow(monthlyRevenueSummary?.totalSales || 0, monthlyExpenses))}
                </span>
              </div>              <div className="p-2 bg-gray-50 rounded-md border" style={{ borderColor: theme.colors.muted + '20' }}>
                <div className="flex justify-between items-center text-[9px]">
                  <div className="flex flex-col">
                    <span style={{ color: theme.colors.muted }}>Income</span>
                    <span className="font-medium">{formatCurrency(monthlyRevenueSummary?.totalSales || 0)}</span>
                  </div>
                  <div className="flex items-center text-xs px-2">
                    {calculateCashFlow(monthlyRevenueSummary?.totalSales || 0, monthlyExpenses) > 0 ? 
                      <FiTrendingUp style={{ color: '#16a34a' }} /> : 
                      <FiTrendingDown style={{ color: 'red' }} />
                    }
                  </div>
                  <div className="flex flex-col text-right">
                    <span style={{ color: theme.colors.muted }}>Expenses</span>
                    <span className="font-medium">{formatCurrency(calculateTotalExpenses(monthlyExpenses) || 0)}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </Card>
      </div>

      {/* Additional Revenue Charts Section */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-3">
        {/* Revenue vs Expenses Chart */}
        <Card className="!p-0 overflow-hidden">
          <div className="px-3 py-2 border-b" style={{ borderColor: theme.colors.muted + '15' }}>
            <div className="text-xs font-medium" style={{ color: theme.colors.primary }}>
              Revenue vs Expenses
            </div>
          </div>
          <div className="p-3">
            {monthlyExpenses.length > 0 ? (
              <div className="h-32 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={monthlyExpenses.slice(-6)} barSize={20}>
                    <CartesianGrid strokeDasharray="3 3" opacity={0.2} />
                    <XAxis 
                      dataKey="formattedMonth" 
                      tick={{ fontSize: 10 }}
                      axisLine={false}
                      tickLine={false}
                    />
                    <Tooltip
                      formatter={(value, name) => [
                        `₱${parseFloat(value).toLocaleString('en-PH', { minimumFractionDigits: 2 })}`, 
                        name
                      ]}
                      contentStyle={{ fontSize: '10px', backgroundColor: theme.colors.background }}
                    />
                    <Bar dataKey="amount" fill={theme.colors.secondary} name="Expenses" radius={[2, 2, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <div className="h-32 flex items-center justify-center bg-gray-50 rounded">
                <span className="text-[10px]" style={{ color: theme.colors.muted }}>No expense data</span>
              </div>
            )}
          </div>
        </Card>        {/* Monthly Revenue Trend */}
        <Card className="!p-0 overflow-hidden">
          <div className="px-3 py-2 border-b" style={{ borderColor: theme.colors.muted + '15' }}>
            <div className="text-xs font-medium" style={{ color: theme.colors.primary }}>
              Monthly Revenue Trend
            </div>
          </div>
          <div className="p-3">
            <div className="h-24">
              {revenueData && revenueData.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={revenueData}>
                    <XAxis 
                      dataKey="period" 
                      axisLine={false}
                      tickLine={false}
                      tick={{ fontSize: 9, fill: theme.colors.muted }}
                    />
                    <YAxis hide />
                    <Tooltip 
                      formatter={(value) => [formatCurrency(value), 'Revenue']}
                      labelStyle={{ fontSize: '10px' }}
                      contentStyle={{ 
                        fontSize: '10px', 
                        backgroundColor: 'white',
                        border: `1px solid ${theme.colors.muted}40`,
                        borderRadius: '4px'
                      }}
                    />
                    <Line 
                      type="monotone" 
                      dataKey="revenue" 
                      stroke={theme.colors.accent}
                      strokeWidth={2}
                      dot={{ fill: theme.colors.accent, strokeWidth: 0, r: 3 }}
                      activeDot={{ r: 4, fill: theme.colors.primary }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              ) : (
                <div className="text-[10px] text-center py-4" style={{ color: theme.colors.muted }}>
                  No revenue trend data available
                </div>
              )}
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
};
