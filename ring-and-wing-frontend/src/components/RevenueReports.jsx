import { useState, useEffect } from 'react';
import { 
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid,
  LineChart, Line, PieChart, Pie, Cell, AreaChart, Area 
} from 'recharts';
import { FiTrendingUp, FiTrendingDown, FiDollarSign, FiShoppingBag, FiClock, FiUsers } from 'react-icons/fi';
import { theme } from '../theme';

const colors = {
  primary: '#2e0304',
  background: '#fefdfd',
  accent: '#f1670f',
  secondary: '#853619',
  muted: '#ac9c9b',
  activeBg: '#f1670f20'
};

const RevenueReports = () => {
  const [selectedPeriod, setSelectedPeriod] = useState('daily');
  const [revenueData, setRevenueData] = useState(null);
  const [monthlyHistoricalData, setMonthlyHistoricalData] = useState([]);
  const [allTimeTopItems, setAllTimeTopItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchRevenueData = async () => {
      try {
        setLoading(true);
        const response = await fetch(`http://localhost:5000/api/revenue/${selectedPeriod}`);
        const data = await response.json();
        if (data.success) {
          setRevenueData(data.data);
        } else {
          throw new Error(data.error || 'Failed to fetch revenue data');
        }
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchRevenueData();
  }, [selectedPeriod]);
  // Fetch historical monthly data separately (only once when component mounts)
  useEffect(() => {
    const fetchMonthlyHistoricalData = async () => {
      try {
        const response = await fetch('http://localhost:5000/api/revenue/historical/monthly');
        const data = await response.json();
        if (data.success) {
          setMonthlyHistoricalData(data.data);
        }
      } catch (err) {
        console.error('Failed to fetch monthly historical data:', err);
        // Fallback to empty array if historical data fails
        setMonthlyHistoricalData([]);
      }
    };

    const fetchAllTimeTopItems = async () => {
      try {
        const response = await fetch('http://localhost:5000/api/revenue/top-items/all-time');
        const data = await response.json();
        if (data.success) {
          setAllTimeTopItems(data.data.topItems);
        }
      } catch (err) {
        console.error('Error fetching all-time top items:', err);
      }
    };

    fetchMonthlyHistoricalData();
    fetchAllTimeTopItems();
  }, []);

  if (loading) {
    return <div className="flex items-center justify-center h-64">Loading...</div>;
  }

  if (error) {
    return <div className="text-red-600">Error: {error}</div>;
  }

  const formatCurrency = (value) => {
    return new Intl.NumberFormat('en-PH', {
      style: 'currency',
      currency: 'PHP'
    }).format(value);
  };
  const prepareHourlyData = () => {
    if (!revenueData?.hourlyDistribution) return [];
    return Array.from({ length: 24 }, (_, hour) => ({
      hour: hour.toString().padStart(2, '0') + ':00',
      revenue: revenueData.hourlyDistribution[hour] || 0
    }));
  };  const prepareMonthlyRevenueData = () => {
    // Return real historical data from backend
    return monthlyHistoricalData;
  };

  const prepareOrderSourceData = () => {
    if (!revenueData?.revenueBySource) return [];
    return Object.entries(revenueData.revenueBySource).map(([source, amount]) => ({
      name: source === 'self_checkout' ? 'Self Checkout' : 
            source === 'chatbot' ? 'Chatbot' : 
            source === 'pos' ? 'POS' : source,
      value: amount,
      percentage: ((amount / revenueData.summary.totalRevenue) * 100).toFixed(1)
    }));
  };

  // Custom chart colors for pie charts
  const CHART_COLORS = [colors.accent, colors.secondary, colors.primary, '#60a5fa', '#34d399', '#fbbf24'];

  // Metric card component
  const MetricCard = ({ title, value, icon: Icon, trend, trendValue, className = '' }) => (
    <div className={`bg-white rounded-lg border p-4 ${className}`} 
         style={{ borderColor: colors.muted + '20' }}>
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg flex items-center justify-center"
               style={{ backgroundColor: colors.activeBg }}>
            <Icon className="w-4 h-4" style={{ color: colors.accent }} />
          </div>
          <span className="text-sm font-medium" style={{ color: colors.muted }}>
            {title}
          </span>
        </div>
        {trend && (
          <div className="flex items-center gap-1">
            {trend === 'up' ? (
              <FiTrendingUp className="w-3 h-3" style={{ color: colors.success }} />
            ) : (
              <FiTrendingDown className="w-3 h-3" style={{ color: colors.error }} />
            )}
            <span className="text-xs font-medium"
                  style={{ color: trend === 'up' ? colors.success : colors.error }}>
              {trendValue}%
            </span>
          </div>
        )}
      </div>
      <div className="text-2xl font-bold" style={{ color: colors.primary }}>
        {value}
      </div>
    </div>
  );
  return (
    <div className="p-6 space-y-6">
      {/* Period Selection - Minimalist */}
      <div className="flex gap-2">
        {['daily', 'weekly', 'monthly'].map(period => (
          <button
            key={period}
            onClick={() => setSelectedPeriod(period)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
              selectedPeriod === period 
                ? 'text-white shadow-md' 
                : 'bg-gray-50 text-gray-600 hover:bg-gray-100'
            }`}
            style={selectedPeriod === period ? { backgroundColor: colors.accent } : {}}
          >
            {period.charAt(0).toUpperCase() + period.slice(1)}
          </button>
        ))}
      </div>

      {revenueData && (
        <>
          {/* Summary Metrics - Compact Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">            <MetricCard
              title="Total Revenue"
              value={formatCurrency(revenueData.summary.totalRevenue)}
              icon={FiDollarSign}
              trend="up"
              trendValue="12.5"
            />
            <MetricCard
              title="Orders"
              value={revenueData.summary.orderCount}
              icon={FiShoppingBag}
              trend="up"
              trendValue="8.2"
            />
            <MetricCard
              title="Items Sold"
              value={revenueData.summary.itemsSold}
              icon={FiUsers}
              trend="down"
              trendValue="2.1"
            />
            <MetricCard
              title="Avg Order"
              value={formatCurrency(revenueData.summary.averageOrderValue)}
              icon={FiClock}
              trend="up"
              trendValue="5.7"
            />
          </div>

          {/* Charts Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            
            {/* Hourly Revenue Chart - Only for daily */}
            {selectedPeriod === 'daily' && (
              <div className="bg-white rounded-lg border p-6" style={{ borderColor: colors.muted + '20' }}>
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-semibold" style={{ color: colors.primary }}>
                    Hourly Revenue
                  </h3>
                  <div className="text-sm" style={{ color: colors.muted }}>
                    Today's Performance
                  </div>
                </div>
                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={prepareHourlyData()}>
                      <defs>
                        <linearGradient id="revenueGradient" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor={colors.accent} stopOpacity={0.3}/>
                          <stop offset="95%" stopColor={colors.accent} stopOpacity={0}/>
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke={colors.muted + '30'} />
                      <XAxis 
                        dataKey="hour" 
                        tick={{ fontSize: 12 }}
                        stroke={colors.muted}
                      />
                      <YAxis 
                        tickFormatter={(value) => formatCurrency(value).replace('PHP', '₱')}
                        tick={{ fontSize: 12 }}
                        stroke={colors.muted}
                      />
                      <Tooltip 
                        formatter={(value) => [formatCurrency(value), 'Revenue']}
                        contentStyle={{ 
                          backgroundColor: colors.background,
                          border: `1px solid ${colors.muted}40`,
                          borderRadius: '8px'
                        }}
                      />
                      <Area 
                        type="monotone" 
                        dataKey="revenue" 
                        stroke={colors.accent}
                        strokeWidth={2}
                        fill="url(#revenueGradient)"
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </div>
            )}            {/* Monthly Revenue Trend */}
            <div className="bg-white rounded-lg border p-6" style={{ borderColor: colors.muted + '20' }}>
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold" style={{ color: colors.primary }}>
                  Monthly Revenue Trend
                </h3>
                <div className="text-sm" style={{ color: colors.muted }}>
                  Last 12 Months
                </div>
              </div>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={prepareMonthlyRevenueData()}>
                    <CartesianGrid strokeDasharray="3 3" stroke={colors.muted + '30'} />
                    <XAxis 
                      dataKey="month" 
                      tick={{ fontSize: 12 }}
                      stroke={colors.muted}
                    />
                    <YAxis 
                      tickFormatter={(value) => formatCurrency(value).replace('PHP', '₱')}
                      tick={{ fontSize: 12 }}
                      stroke={colors.muted}
                    />
                    <Tooltip 
                      formatter={(value, name) => [
                        name === 'revenue' ? formatCurrency(value) : value,
                        name === 'revenue' ? 'Revenue' : 'Orders'
                      ]}
                      labelFormatter={(label) => `Month: ${label}`}
                      contentStyle={{ 
                        backgroundColor: colors.background,
                        border: `1px solid ${colors.muted}40`,
                        borderRadius: '8px'
                      }}
                    />
                    <Line 
                      type="monotone" 
                      dataKey="revenue" 
                      stroke={colors.accent}
                      strokeWidth={3}
                      dot={{ fill: colors.accent, strokeWidth: 2, r: 4 }}
                      activeDot={{ r: 6, stroke: colors.accent, strokeWidth: 2, fill: colors.background }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>              {/* Monthly trend summary */}
              <div className="mt-4 grid grid-cols-2 gap-4">
                <div className="text-center">
                  <div className="text-sm" style={{ color: colors.muted }}>Avg Monthly</div>
                  <div className="text-lg font-semibold" style={{ color: colors.primary }}>
                    {monthlyHistoricalData.length > 0 
                      ? formatCurrency(monthlyHistoricalData.reduce((sum, month) => sum + month.revenue, 0) / monthlyHistoricalData.length)
                      : formatCurrency(0)
                    }
                  </div>
                </div>
                <div className="text-center">
                  <div className="text-sm" style={{ color: colors.muted }}>Growth Trend</div>
                  <div className="text-lg font-semibold flex items-center justify-center gap-1" style={{ color: colors.accent }}>
                    <FiTrendingUp className="w-4 h-4" />
                    {monthlyHistoricalData.length >= 2 ? (
                      `${(((monthlyHistoricalData[monthlyHistoricalData.length - 1]?.revenue || 0) - 
                           (monthlyHistoricalData[monthlyHistoricalData.length - 2]?.revenue || 0)) / 
                           (monthlyHistoricalData[monthlyHistoricalData.length - 2]?.revenue || 1) * 100).toFixed(1)}%`
                    ) : '+0.0%'}
                  </div>
                </div>
              </div>
            </div>

            {/* Order Sources */}
            <div className="bg-white rounded-lg border p-6" style={{ borderColor: colors.muted + '20' }}>
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold" style={{ color: colors.primary }}>
                  Order Sources
                </h3>
                <div className="text-sm" style={{ color: colors.muted }}>
                  Channel Performance
                </div>
              </div>
              <div className="space-y-3">
                {prepareOrderSourceData().map((source, index) => (
                  <div key={source.name} className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div 
                        className="w-4 h-4 rounded"
                        style={{ backgroundColor: CHART_COLORS[index % CHART_COLORS.length] }}
                      />
                      <span className="text-sm font-medium" style={{ color: colors.primary }}>
                        {source.name}
                      </span>
                    </div>
                    <div className="text-right">
                      <div className="text-sm font-bold" style={{ color: colors.primary }}>
                        {formatCurrency(source.value)}
                      </div>
                      <div className="text-xs" style={{ color: colors.muted }}>
                        {source.percentage}%
                      </div>
                    </div>
                  </div>
                ))}
              </div>
              {/* Progress bars */}
              <div className="space-y-2 mt-4">
                {prepareOrderSourceData().map((source, index) => (
                  <div key={source.name} className="w-full">
                    <div className="w-full bg-gray-100 rounded-full h-2">
                      <div 
                        className="h-2 rounded-full transition-all duration-1000"
                        style={{ 
                          width: `${source.percentage}%`,
                          backgroundColor: CHART_COLORS[index % CHART_COLORS.length]
                        }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Top Items - Minimalist List */}
            <div className="bg-white rounded-lg border p-6" style={{ borderColor: colors.muted + '20' }}>
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold" style={{ color: colors.primary }}>
                  Top Items
                </h3>
                <div className="text-sm" style={{ color: colors.muted }}>
                  Best Sellers
                </div>
              </div>
              <div className="space-y-3">
                {revenueData.topItems.slice(0, 5).map((item, index) => (
                  <div key={item.name} className="flex items-center justify-between p-3 rounded-lg hover:bg-gray-50 transition-colors">
                    <div className="flex items-center gap-3">
                      <div 
                        className="w-8 h-8 rounded-full flex items-center justify-center text-white text-sm font-bold"
                        style={{ backgroundColor: index < 3 ? colors.accent : colors.muted }}
                      >
                        {index + 1}
                      </div>
                      <div>
                        <div className="font-medium text-sm" style={{ color: colors.primary }}>
                          {item.name}
                        </div>
                        <div className="text-xs" style={{ color: colors.muted }}>
                          {item.quantity} sold
                        </div>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="font-bold text-sm" style={{ color: colors.primary }}>
                        {formatCurrency(item.revenue)}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default RevenueReports;