import { theme } from '../../theme';
import { StatsCard } from './StatsCard';
import { RecentOrders } from './RecentOrders';
import { PaymentSummary } from './PaymentSummary';
import { Card } from './Card';
import { FiShoppingBag, FiDollarSign, FiUsers, FiTrendingUp } from 'react-icons/fi';

export const DashboardGrid = ({
  stats,
  orders,
  salesSummary,
  onRefreshOrders,
  onViewOrder,
  isLoading = false,
  className = ''
}) => {
  return (
    <div className={`space-y-6 ${className}`}>
      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatsCard
          title="Total Sales"
          value={`₱${stats.totalSales.toFixed(2)}`}
          icon={<FiDollarSign className="w-6 h-6" />}
          trend={stats.salesTrend}
          trendValue={`${stats.salesGrowth}%`}
          variant="primary"
        />
        
        <StatsCard
          title="Orders Today"
          value={stats.ordersToday}
          icon={<FiShoppingBag className="w-6 h-6" />}
          trend={stats.ordersTrend}
          trendValue={`${stats.ordersGrowth}%`}
        />
        
        <StatsCard
          title="Average Order Value"
          value={`₱${stats.averageOrderValue.toFixed(2)}`}
          icon={<FiTrendingUp className="w-6 h-6" />}
          variant="accent"
        />
        
        <StatsCard
          title="Active Staff"
          value={stats.activeStaff}
          icon={<FiUsers className="w-6 h-6" />}
        />
      </div>

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Orders Section */}
        <div className="lg:col-span-2">
          <RecentOrders
            orders={orders}
            onRefresh={onRefreshOrders}
            onViewOrder={onViewOrder}
            isLoading={isLoading}
            maxItems={5}
          />
        </div>

        {/* Summary Section */}
        <div className="space-y-6">
          <PaymentSummary
            summary={salesSummary}
            period="Today"
          />

          {/* Quick Actions */}
          <Card>
            <div className="p-4">
              <h3 
                className="text-sm font-medium mb-4"
                style={{ color: theme.colors.primary }}
              >
                Performance Insights
              </h3>
              
              <div className="space-y-4">
                {/* Best Selling Items */}
                <div>
                  <h4 
                    className="text-xs font-medium uppercase tracking-wider mb-2"
                    style={{ color: theme.colors.muted }}
                  >
                    Best Selling Items
                  </h4>
                  {stats.bestSellers?.map((item, index) => (
                    <div 
                      key={item.id}
                      className="flex items-center justify-between py-2"
                      style={{ 
                        borderBottom: index !== stats.bestSellers.length - 1 
                          ? `1px solid ${theme.colors.muted}20` 
                          : 'none' 
                      }}
                    >
                      <div>
                        <span 
                          className="text-sm font-medium"
                          style={{ color: theme.colors.primary }}
                        >
                          {item.name}
                        </span>
                        <span 
                          className="text-xs block"
                          style={{ color: theme.colors.secondary }}
                        >
                          {item.quantity} sold
                        </span>
                      </div>
                      <span 
                        className="text-sm font-medium"
                        style={{ color: theme.colors.primary }}
                      >
                        ₱{item.revenue.toFixed(2)}
                      </span>
                    </div>
                  ))}
                </div>

                {/* Peak Hours */}
                <div>
                  <h4 
                    className="text-xs font-medium uppercase tracking-wider mb-2"
                    style={{ color: theme.colors.muted }}
                  >
                    Peak Hours
                  </h4>
                  <div className="flex gap-1">
                    {stats.peakHours?.map((hour) => (
                      <div
                        key={hour.hour}
                        className="flex-1"
                        title={`${hour.hour}:00 - ${hour.orders} orders`}
                      >
                        <div 
                          className="w-full rounded-t"
                          style={{
                            backgroundColor: theme.colors.accent,
                            height: `${(hour.orders / stats.maxHourlyOrders) * 40}px`,
                            minHeight: '4px'
                          }}
                        />
                        <div 
                          className="text-center text-xs mt-1"
                          style={{ color: theme.colors.muted }}
                        >
                          {hour.hour}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
};