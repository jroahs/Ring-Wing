import React, { forwardRef } from 'react';
import { BarChart, Bar, PieChart, Pie, XAxis, YAxis, ResponsiveContainer, Cell, Legend, Tooltip } from 'recharts';

const colors = {
  primary: '#2e0304',
  background: '#fefdfd',
  accent: '#f1670f',
  secondary: '#853619',
  muted: '#ac9c9b',
  activeBg: '#f1670f20',
  success: '#10b981',
  warning: '#f59e0b',
  danger: '#ef4444'
};

export const PrintableInventoryReport = forwardRef(({
  items = [],
  alerts = [],
  reportDate = new Date(),
  className = ''
}, ref) => {
  const formatDate = (date) => {
    return new Date(date).toLocaleDateString('en-PH', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  const formatTime = (date) => {
    return new Date(date).toLocaleTimeString('en-PH', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: true
    });
  };

  // Calculate summary statistics
  const summary = {
    totalItems: items.length,
    totalQuantity: items.reduce((sum, item) => sum + (item.totalQuantity || 0), 0),
    lowStock: items.filter(item => item.status === 'Low Stock').length,
    outOfStock: items.filter(item => item.status === 'Out of Stock').length,
    healthy: items.filter(item => item.status === 'Healthy').length,
    totalValue: items.reduce((sum, item) => {
      const batches = item.batches || [];
      return sum + batches.reduce((batchSum, batch) => 
        batchSum + (batch.quantity * batch.unitCost || 0), 0
      );
    }, 0),
    stockAlerts: alerts.filter(a => a.type === 'stock').length,
    expirationAlerts: alerts.filter(a => a.type === 'expiration').length
  };

  // Prepare data for charts
  const categoryData = items.reduce((acc, item) => {
    const category = item.category || 'Uncategorized';
    const existing = acc.find(c => c.name === category);
    if (existing) {
      existing.value += item.totalQuantity || 0;
      existing.count += 1;
    } else {
      acc.push({
        name: category,
        value: item.totalQuantity || 0,
        count: 1
      });
    }
    return acc;
  }, []);

  const stockLevelData = items.slice(0, 10).map(item => ({
    name: item.name.length > 15 ? item.name.substring(0, 15) + '...' : item.name,
    quantity: item.totalQuantity || 0,
    status: item.status
  }));

  const statusDistribution = [
    { name: 'Healthy', value: summary.healthy, color: colors.success },
    { name: 'Low Stock', value: summary.lowStock, color: colors.warning },
    { name: 'Out of Stock', value: summary.outOfStock, color: colors.danger }
  ].filter(item => item.value > 0);

  // Return early if no items
  if (!items || items.length === 0) {
    return (
      <div 
        ref={ref}
        className={`bg-white p-8 print:p-4 ${className}`}
        style={{ 
          minHeight: '100vh', 
          color: colors.primary,
          width: '800px',
          position: 'relative',
          boxSizing: 'border-box'
        }}
      >
        <div className="text-center py-12">
          <p style={{ color: colors.muted }}>No inventory data available</p>
        </div>
      </div>
    );
  }

  return (
    <div 
      ref={ref}
      data-testid="inventory-report"
      className={`bg-white p-8 print:p-4 ${className}`}
      style={{ 
        minHeight: '100vh', 
        color: colors.primary,
        width: '800px',
        position: 'relative',
        boxSizing: 'border-box'
      }}
    >
      {/* Header */}
      <div className="text-center mb-8 border-b pb-6">
        <h1 className="text-3xl font-bold mb-2" style={{ color: colors.primary }}>
          Ring & Wing
        </h1>
        <h2 className="text-xl font-semibold mb-2" style={{ color: colors.secondary }}>
          Inventory Analytics Report
        </h2>
        <div className="text-sm" style={{ color: colors.muted }}>
          <div>Report Generated: {formatDate(reportDate)} at {formatTime(reportDate)}</div>
          <div>Total Items Tracked: {summary.totalItems}</div>
        </div>
      </div>

      {/* Summary Metrics */}
      <div className="mb-8">
        <h3 className="text-lg font-semibold mb-4" style={{ color: colors.primary }}>
          Inventory Summary
        </h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="border rounded-lg p-4" style={{ borderColor: colors.muted + '40' }}>
            <div className="text-sm" style={{ color: colors.muted }}>Total Items</div>
            <div className="text-xl font-bold" style={{ color: colors.primary }}>
              {summary.totalItems}
            </div>
          </div>
          <div className="border rounded-lg p-4" style={{ borderColor: colors.muted + '40' }}>
            <div className="text-sm" style={{ color: colors.muted }}>Total Quantity</div>
            <div className="text-xl font-bold" style={{ color: colors.primary }}>
              {summary.totalQuantity.toFixed(2)}
            </div>
          </div>
          <div className="border rounded-lg p-4" style={{ borderColor: colors.muted + '40' }}>
            <div className="text-sm" style={{ color: colors.muted }}>Stock Alerts</div>
            <div className="text-xl font-bold" style={{ color: colors.warning }}>
              {summary.stockAlerts}
            </div>
          </div>
          <div className="border rounded-lg p-4" style={{ borderColor: colors.muted + '40' }}>
            <div className="text-sm" style={{ color: colors.muted }}>Expiration Alerts</div>
            <div className="text-xl font-bold" style={{ color: colors.danger }}>
              {summary.expirationAlerts}
            </div>
          </div>
        </div>
        
        {/* Status breakdown */}
        <div className="grid grid-cols-3 gap-4 mt-4">
          <div className="border rounded-lg p-4" style={{ borderColor: colors.success + '40', backgroundColor: colors.success + '10' }}>
            <div className="text-sm" style={{ color: colors.success }}>Healthy Stock</div>
            <div className="text-xl font-bold" style={{ color: colors.success }}>
              {summary.healthy}
            </div>
          </div>
          <div className="border rounded-lg p-4" style={{ borderColor: colors.warning + '40', backgroundColor: colors.warning + '10' }}>
            <div className="text-sm" style={{ color: colors.warning }}>Low Stock</div>
            <div className="text-xl font-bold" style={{ color: colors.warning }}>
              {summary.lowStock}
            </div>
          </div>
          <div className="border rounded-lg p-4" style={{ borderColor: colors.danger + '40', backgroundColor: colors.danger + '10' }}>
            <div className="text-sm" style={{ color: colors.danger }}>Out of Stock</div>
            <div className="text-xl font-bold" style={{ color: colors.danger }}>
              {summary.outOfStock}
            </div>
          </div>
        </div>
      </div>

      {/* Charts Section */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
        {/* Stock Status Distribution */}
        {statusDistribution.length > 0 && (
          <div>
            <h3 className="text-lg font-semibold mb-4" style={{ color: colors.primary }}>
              Stock Status Distribution
            </h3>
            <div className="border rounded-lg p-4" style={{ borderColor: colors.muted + '40' }}>
              <ResponsiveContainer width="100%" height={200}>
                <PieChart>
                  <Pie
                    data={statusDistribution}
                    dataKey="value"
                    nameKey="name"
                    cx="50%"
                    cy="50%"
                    outerRadius={70}
                    label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                  >
                    {statusDistribution.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>
        )}

        {/* Stock by Category */}
        {categoryData.length > 0 && (
          <div>
            <h3 className="text-lg font-semibold mb-4" style={{ color: colors.primary }}>
              Stock by Category
            </h3>
            <div className="border rounded-lg p-4" style={{ borderColor: colors.muted + '40' }}>
              <ResponsiveContainer width="100%" height={200}>
                <PieChart>
                  <Pie
                    data={categoryData}
                    dataKey="value"
                    nameKey="name"
                    cx="50%"
                    cy="50%"
                    outerRadius={70}
                    label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                  >
                    {categoryData.map((entry, index) => (
                      <Cell 
                        key={`cell-${index}`} 
                        fill={[colors.accent, colors.secondary, '#36A2EB', '#FFCE56', '#4BC0C0'][index % 5]} 
                      />
                    ))}
                  </Pie>
                  <Tooltip />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>
        )}
      </div>

      {/* Current Stock Levels Bar Chart */}
      {stockLevelData.length > 0 && (
        <div className="mb-8">
          <h3 className="text-lg font-semibold mb-4" style={{ color: colors.primary }}>
            Top 10 Items - Current Stock Levels
          </h3>
          <div className="border rounded-lg p-4" style={{ borderColor: colors.muted + '40' }}>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart 
                data={stockLevelData}
                margin={{ top: 5, right: 30, left: 20, bottom: 60 }}
              >
                <XAxis 
                  dataKey="name" 
                  angle={-45}
                  textAnchor="end"
                  tick={{ fontSize: 10, fill: '#000000' }}
                  axisLine={{ stroke: '#000000' }}
                  tickLine={{ stroke: '#000000' }}
                />
                <YAxis 
                  tick={{ fontSize: 10, fill: '#000000' }}
                  axisLine={{ stroke: '#000000' }}
                  tickLine={{ stroke: '#000000' }}
                />
                <Tooltip />
                <Bar dataKey="quantity">
                  {stockLevelData.map((entry, index) => (
                    <Cell 
                      key={`cell-${index}`}
                      fill={
                        entry.status === 'Out of Stock' ? colors.danger :
                        entry.status === 'Low Stock' ? colors.warning :
                        colors.accent
                      }
                    />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {/* Active Alerts Section */}
      {alerts.length > 0 && (
        <div className="mb-8">
          <h3 className="text-lg font-semibold mb-4" style={{ color: colors.primary }}>
            Active Alerts ({alerts.length})
          </h3>
          <div className="space-y-2">
            {alerts.slice(0, 15).map((alert, index) => {
              const isStockAlert = alert.type === 'stock';
              const isExpiredAlert = alert.type === 'expiration' && alert.message.includes('expired');
              const borderColor = isStockAlert && alert.message.includes('out of stock') ? colors.danger :
                                 isStockAlert ? colors.warning :
                                 isExpiredAlert ? colors.danger :
                                 colors.accent;
              
              return (
                <div 
                  key={alert.id || index}
                  className="border rounded p-3 text-sm"
                  style={{ borderColor: borderColor, borderLeftWidth: '4px' }}
                >
                  <div className="font-medium">{alert.message}</div>
                  <div className="text-xs mt-1" style={{ color: colors.muted }}>
                    {new Date(alert.date).toLocaleDateString('en-PH')} - {alert.type}
                  </div>
                </div>
              );
            })}
            {alerts.length > 15 && (
              <div className="text-sm text-center py-2" style={{ color: colors.muted }}>
                ... and {alerts.length - 15} more alerts
              </div>
            )}
          </div>
        </div>
      )}

      {/* Detailed Inventory Table */}
      <div className="mb-8">
        <h3 className="text-lg font-semibold mb-4" style={{ color: colors.primary }}>
          Detailed Inventory List
        </h3>
        <div className="overflow-x-auto">
          <table className="w-full text-sm" style={{ borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ backgroundColor: colors.primary, color: 'white' }}>
                <th className="border p-2 text-left">Item Name</th>
                <th className="border p-2 text-left">Category</th>
                <th className="border p-2 text-center">Quantity</th>
                <th className="border p-2 text-center">Unit</th>
                <th className="border p-2 text-center">Status</th>
              </tr>
            </thead>
            <tbody>
              {items.slice(0, 20).map((item, index) => (
                <tr 
                  key={item._id || index}
                  style={{ 
                    backgroundColor: index % 2 === 0 ? 'white' : colors.muted + '10'
                  }}
                >
                  <td className="border p-2">{item.name}</td>
                  <td className="border p-2">{item.category || 'N/A'}</td>
                  <td className="border p-2 text-center">{(item.totalQuantity || 0).toFixed(2)}</td>
                  <td className="border p-2 text-center">{item.unit || 'N/A'}</td>
                  <td className="border p-2 text-center">
                    <span 
                      className="px-2 py-1 rounded text-xs"
                      style={{
                        backgroundColor: 
                          item.status === 'Out of Stock' ? colors.danger + '20' :
                          item.status === 'Low Stock' ? colors.warning + '20' :
                          colors.success + '20',
                        color:
                          item.status === 'Out of Stock' ? colors.danger :
                          item.status === 'Low Stock' ? colors.warning :
                          colors.success
                      }}
                    >
                      {item.status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {items.length > 20 && (
            <div className="text-sm text-center py-3" style={{ color: colors.muted }}>
              Showing first 20 of {items.length} items
            </div>
          )}
        </div>
      </div>

      {/* Footer */}
      <div className="text-center text-xs mt-8 pt-4 border-t" style={{ color: colors.muted }}>
        <p>Ring & Wing - Inventory Management System</p>
        <p>This report is computer-generated and valid without signature</p>
        <p>Generated on {formatDate(reportDate)} at {formatTime(reportDate)}</p>
      </div>
    </div>
  );
});

PrintableInventoryReport.displayName = 'PrintableInventoryReport';
