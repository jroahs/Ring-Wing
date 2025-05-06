import { useState, useEffect } from 'react';
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid } from 'recharts';

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
  };

  return (
    <div className="p-6 space-y-6">
      {/* Period Selection */}
      <div className="flex gap-4">
        {['daily', 'weekly', 'monthly'].map(period => (
          <button
            key={period}
            onClick={() => setSelectedPeriod(period)}
            className={`px-4 py-2 rounded-lg capitalize ${
              selectedPeriod === period 
                ? 'bg-orange-500 text-white' 
                : 'bg-gray-100 text-gray-700'
            }`}
          >
            {period}
          </button>
        ))}
      </div>

      {revenueData && (
        <>
          {/* Summary Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {[
              {
                title: 'Total Revenue',
                value: formatCurrency(revenueData.summary.totalRevenue)
              },
              {
                title: 'Order Count',
                value: revenueData.summary.orderCount
              },
              {
                title: 'Items Sold',
                value: revenueData.summary.itemsSold
              },
              {
                title: 'Average Order Value',
                value: formatCurrency(revenueData.summary.averageOrderValue)
              }
            ].map((metric, index) => (
              <div
                key={index}
                className="p-4 rounded-lg shadow-sm"
                style={{ backgroundColor: colors.background, border: `1px solid ${colors.muted}30` }}
              >
                <h3 className="text-sm font-medium" style={{ color: colors.muted }}>
                  {metric.title}
                </h3>
                <p className="mt-2 text-2xl font-semibold" style={{ color: colors.primary }}>
                  {metric.value}
                </p>
              </div>
            ))}
          </div>

          {/* Revenue Distribution Chart */}
          {selectedPeriod === 'daily' && (
            <div className="mt-8">
              <h3 className="text-lg font-semibold mb-4" style={{ color: colors.primary }}>
                Hourly Revenue Distribution
              </h3>
              <div className="h-80 w-full">
                <ResponsiveContainer>
                  <BarChart data={prepareHourlyData()}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="hour" />
                    <YAxis 
                      tickFormatter={(value) => formatCurrency(value)}
                    />
                    <Tooltip 
                      formatter={(value) => [formatCurrency(value), 'Revenue']}
                    />
                    <Bar dataKey="revenue" fill={colors.accent} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          )}

          {/* Payment Methods */}
          <div className="mt-8">
            <h3 className="text-lg font-semibold mb-4" style={{ color: colors.primary }}>
              Revenue by Payment Method
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {Object.entries(revenueData.revenueByPayment).map(([method, amount]) => (
                <div
                  key={method}
                  className="p-4 rounded-lg"
                  style={{ backgroundColor: colors.activeBg }}
                >
                  <h4 className="text-sm font-medium capitalize" style={{ color: colors.secondary }}>
                    {method}
                  </h4>
                  <p className="mt-2 text-xl font-semibold" style={{ color: colors.primary }}>
                    {formatCurrency(amount)}
                  </p>
                </div>
              ))}
            </div>
          </div>

          {/* Revenue by Order Source */}
          {revenueData.revenueBySource && (
            <div className="mt-8">
              <h3 className="text-lg font-semibold mb-4" style={{ color: colors.primary }}>
                Revenue by Order Source
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {Object.entries(revenueData.revenueBySource).map(([source, amount]) => {
                  const sourceLabel = source === 'self_checkout' ? 'Self Checkout' : 
                                     source === 'chatbot' ? 'Chatbot' : 
                                     source === 'pos' ? 'POS' : 
                                     source === 'counter' ? 'Counter' : source;
                  
                  const sourceColor = source === 'self_checkout' ? '#fbbf24' : 
                                     source === 'chatbot' ? '#60a5fa' : 
                                     source === 'pos' ? colors.accent : 
                                     colors.secondary;
                  
                  return (
                    <div
                      key={source}
                      className="p-4 rounded-lg"
                      style={{ backgroundColor: `${sourceColor}20` }}
                    >
                      <h4 className="text-sm font-medium capitalize" style={{ color: sourceColor }}>
                        {sourceLabel}
                      </h4>
                      <p className="mt-2 text-xl font-semibold" style={{ color: colors.primary }}>
                        {formatCurrency(amount)}
                      </p>
                      <p className="mt-1 text-xs" style={{ color: colors.muted }}>
                        {((amount / revenueData.summary.totalRevenue) * 100).toFixed(1)}% of total
                      </p>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Top Selling Items */}
          <div className="mt-8">
            <h3 className="text-lg font-semibold mb-4" style={{ color: colors.primary }}>
              Top Selling Items
            </h3>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr style={{ backgroundColor: colors.activeBg }}>
                    <th className="text-left p-4">Item Name</th>
                    <th className="text-right p-4">Quantity Sold</th>
                    <th className="text-right p-4">Revenue</th>
                  </tr>
                </thead>
                <tbody>
                  {revenueData.topItems.map((item, index) => (
                    <tr key={index} className="border-b" style={{ borderColor: colors.muted + '20' }}>
                      <td className="p-4" style={{ color: colors.primary }}>{item.name}</td>
                      <td className="p-4 text-right" style={{ color: colors.secondary }}>{item.quantity}</td>
                      <td className="p-4 text-right" style={{ color: colors.primary }}>{formatCurrency(item.revenue)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default RevenueReports;