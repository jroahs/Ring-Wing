import React, { forwardRef } from 'react';
import { BarChart, Bar, XAxis, YAxis, ResponsiveContainer, CartesianGrid, Tooltip, Legend } from 'recharts';

const colors = {
  primary: '#2e0304',
  background: '#fefdfd',
  accent: '#f1670f',
  secondary: '#853619',
  muted: '#ac9c9b',
  activeBg: '#f1670f20',
  success: '#10b981',
  error: '#ef4444'
};

export const PrintableYearlyReport = forwardRef(({
  reportData,
  periodLabel,
  viewMode = 'monthly',
  reportDate = new Date(),
  className = ''
}, ref) => {
  
  const formatCurrency = (value) => {
    return `PHP ${parseFloat(value || 0).toLocaleString('en-PH', { 
      minimumFractionDigits: 2, 
      maximumFractionDigits: 2 
    })}`;
  };

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

  if (!reportData || !reportData.summary) {
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
          <p style={{ color: colors.muted }}>No report data available</p>
        </div>
      </div>
    );
  }

  const chartData = viewMode === 'monthly' 
    ? reportData.monthlyBreakdown.map(m => ({
        name: m.month,
        revenue: m.revenue,
        expenses: m.expenses,
        netRevenue: m.netRevenue
      }))
    : reportData.quarterlyBreakdown.map(q => ({
        name: q.quarter,
        revenue: q.revenue,
        expenses: q.expenses,
        netRevenue: q.netRevenue
      }));

  return (
    <div 
      ref={ref}
      data-testid="yearly-revenue-report"
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
          Yearly Revenue Report
        </h2>
        <div className="text-lg font-medium mb-2" style={{ color: colors.accent }}>
          {periodLabel}
        </div>
        <div className="text-sm" style={{ color: colors.muted }}>
          <div>Report Generated: {formatDate(reportDate)} at {formatTime(reportDate)}</div>
        </div>
      </div>

      {/* Summary Metrics */}
      <div className="mb-8">
        <h3 className="text-lg font-semibold mb-4" style={{ color: colors.primary }}>
          Financial Summary
        </h3>
        <div className="grid grid-cols-4 gap-4">
          <div className="border rounded-lg p-4 text-center" style={{ borderColor: colors.muted + '40' }}>
            <div className="text-sm mb-1" style={{ color: colors.muted }}>Total Revenue</div>
            <div className="text-xl font-bold" style={{ color: colors.success }}>
              {formatCurrency(reportData.summary.totalRevenue)}
            </div>
          </div>
          <div className="border rounded-lg p-4 text-center" style={{ borderColor: colors.muted + '40' }}>
            <div className="text-sm mb-1" style={{ color: colors.muted }}>Total Expenses</div>
            <div className="text-xl font-bold" style={{ color: colors.error }}>
              {formatCurrency(reportData.summary.totalExpenses)}
            </div>
          </div>
          <div className="border rounded-lg p-4 text-center" style={{ borderColor: colors.muted + '40' }}>
            <div className="text-sm mb-1" style={{ color: colors.muted }}>Net Revenue</div>
            <div 
              className="text-xl font-bold" 
              style={{ color: reportData.summary.netRevenue >= 0 ? colors.success : colors.error }}
            >
              {formatCurrency(reportData.summary.netRevenue)}
            </div>
          </div>
          <div className="border rounded-lg p-4 text-center" style={{ borderColor: colors.muted + '40' }}>
            <div className="text-sm mb-1" style={{ color: colors.muted }}>Profit Margin</div>
            <div className="text-xl font-bold" style={{ color: colors.primary }}>
              {reportData.summary.profitMargin}%
            </div>
          </div>
        </div>
      </div>

      {/* Revenue vs Expenses Chart */}
      <div className="mb-8">
        <h3 className="text-lg font-semibold mb-4" style={{ color: colors.primary }}>
          {viewMode === 'monthly' ? 'Monthly' : 'Quarterly'} Revenue vs Expenses
        </h3>
        <div className="h-64 border rounded-lg p-4" style={{ borderColor: colors.muted + '40', backgroundColor: 'white' }}>
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chartData} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke={colors.muted + '30'} />
              <XAxis 
                dataKey="name" 
                tick={{ fontSize: 10, fill: '#000000' }}
                axisLine={{ stroke: '#000000' }}
                tickLine={{ stroke: '#000000' }}
              />
              <YAxis 
                tickFormatter={(v) => `₱${(v/1000).toFixed(0)}k`}
                tick={{ fontSize: 10, fill: '#000000' }}
                axisLine={{ stroke: '#000000' }}
                tickLine={{ stroke: '#000000' }}
              />
              <Tooltip formatter={(value) => formatCurrency(value)} />
              <Legend />
              <Bar dataKey="revenue" name="Revenue" fill={colors.success} radius={[2, 2, 0, 0]} />
              <Bar dataKey="expenses" name="Expenses" fill={colors.error} radius={[2, 2, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Monthly Breakdown Table */}
      <div className="mb-8">
        <h3 className="text-lg font-semibold mb-4" style={{ color: colors.primary }}>
          Monthly Breakdown
        </h3>
        <table className="w-full border rounded-lg" style={{ borderColor: colors.muted + '40' }}>
          <thead style={{ backgroundColor: colors.activeBg }}>
            <tr>
              <th className="p-3 text-left text-sm font-semibold">Month</th>
              <th className="p-3 text-right text-sm font-semibold">Revenue</th>
              <th className="p-3 text-right text-sm font-semibold">Expenses</th>
              <th className="p-3 text-right text-sm font-semibold">Net Revenue</th>
              <th className="p-3 text-right text-sm font-semibold">Orders</th>
            </tr>
          </thead>
          <tbody>
            {reportData.monthlyBreakdown.map((row, idx) => (
              <tr 
                key={row.month}
                className="border-t"
                style={{ borderColor: colors.muted + '20' }}
              >
                <td className="p-3 text-sm font-medium">{row.month}</td>
                <td className="p-3 text-right text-sm" style={{ color: colors.success }}>
                  {formatCurrency(row.revenue)}
                </td>
                <td className="p-3 text-right text-sm" style={{ color: colors.error }}>
                  {formatCurrency(row.expenses)}
                </td>
                <td 
                  className="p-3 text-right text-sm font-semibold" 
                  style={{ color: row.netRevenue >= 0 ? colors.success : colors.error }}
                >
                  {formatCurrency(row.netRevenue)}
                </td>
                <td className="p-3 text-right text-sm">{row.orderCount}</td>
              </tr>
            ))}
          </tbody>
          <tfoot style={{ backgroundColor: colors.activeBg }}>
            <tr className="border-t-2 font-bold" style={{ borderColor: colors.accent }}>
              <td className="p-3 text-sm">TOTAL</td>
              <td className="p-3 text-right text-sm" style={{ color: colors.success }}>
                {formatCurrency(reportData.summary.totalRevenue)}
              </td>
              <td className="p-3 text-right text-sm" style={{ color: colors.error }}>
                {formatCurrency(reportData.summary.totalExpenses)}
              </td>
              <td 
                className="p-3 text-right text-sm" 
                style={{ color: reportData.summary.netRevenue >= 0 ? colors.success : colors.error }}
              >
                {formatCurrency(reportData.summary.netRevenue)}
              </td>
              <td className="p-3 text-right text-sm">{reportData.summary.totalOrders}</td>
            </tr>
          </tfoot>
        </table>
      </div>

      {/* Quarterly Breakdown Table */}
      <div className="mb-8">
        <h3 className="text-lg font-semibold mb-4" style={{ color: colors.primary }}>
          Quarterly Breakdown
        </h3>
        <table className="w-full border rounded-lg" style={{ borderColor: colors.muted + '40' }}>
          <thead style={{ backgroundColor: colors.activeBg }}>
            <tr>
              <th className="p-3 text-left text-sm font-semibold">Quarter</th>
              <th className="p-3 text-right text-sm font-semibold">Revenue</th>
              <th className="p-3 text-right text-sm font-semibold">Expenses</th>
              <th className="p-3 text-right text-sm font-semibold">Net Revenue</th>
              <th className="p-3 text-right text-sm font-semibold">Orders</th>
            </tr>
          </thead>
          <tbody>
            {reportData.quarterlyBreakdown.map((row) => (
              <tr 
                key={row.quarter}
                className="border-t"
                style={{ borderColor: colors.muted + '20' }}
              >
                <td className="p-3 text-sm font-medium">{row.quarter}</td>
                <td className="p-3 text-right text-sm" style={{ color: colors.success }}>
                  {formatCurrency(row.revenue)}
                </td>
                <td className="p-3 text-right text-sm" style={{ color: colors.error }}>
                  {formatCurrency(row.expenses)}
                </td>
                <td 
                  className="p-3 text-right text-sm font-semibold" 
                  style={{ color: row.netRevenue >= 0 ? colors.success : colors.error }}
                >
                  {formatCurrency(row.netRevenue)}
                </td>
                <td className="p-3 text-right text-sm">{row.orderCount}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Expense by Category */}
      {reportData.expenseByCategory && Object.keys(reportData.expenseByCategory).length > 0 && (
        <div className="mb-8">
          <h3 className="text-lg font-semibold mb-4" style={{ color: colors.primary }}>
            Expense Breakdown by Category
          </h3>
          <table className="w-full border rounded-lg" style={{ borderColor: colors.muted + '40' }}>
            <thead style={{ backgroundColor: colors.activeBg }}>
              <tr>
                <th className="p-3 text-left text-sm font-semibold">Category</th>
                <th className="p-3 text-right text-sm font-semibold">Amount</th>
                <th className="p-3 text-right text-sm font-semibold">% of Total</th>
              </tr>
            </thead>
            <tbody>
              {Object.entries(reportData.expenseByCategory)
                .sort((a, b) => b[1] - a[1])
                .map(([category, amount]) => (
                  <tr 
                    key={category}
                    className="border-t"
                    style={{ borderColor: colors.muted + '20' }}
                  >
                    <td className="p-3 text-sm font-medium">{category}</td>
                    <td className="p-3 text-right text-sm">{formatCurrency(amount)}</td>
                    <td className="p-3 text-right text-sm">
                      {((amount / reportData.summary.totalExpenses) * 100).toFixed(1)}%
                    </td>
                  </tr>
                ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Top Selling Items */}
      {reportData.topItems && reportData.topItems.length > 0 && (
        <div className="mb-8">
          <h3 className="text-lg font-semibold mb-4" style={{ color: colors.primary }}>
            Top Selling Items
          </h3>
          <table className="w-full border rounded-lg" style={{ borderColor: colors.muted + '40' }}>
            <thead style={{ backgroundColor: colors.activeBg }}>
              <tr>
                <th className="p-3 text-left text-sm font-semibold">Rank</th>
                <th className="p-3 text-left text-sm font-semibold">Item Name</th>
                <th className="p-3 text-right text-sm font-semibold">Quantity Sold</th>
                <th className="p-3 text-right text-sm font-semibold">Revenue</th>
              </tr>
            </thead>
            <tbody>
              {reportData.topItems.slice(0, 10).map((item, index) => (
                <tr 
                  key={item.name}
                  className="border-t"
                  style={{ borderColor: colors.muted + '20' }}
                >
                  <td className="p-3 text-sm font-medium">{index + 1}</td>
                  <td className="p-3 text-sm">{item.name}</td>
                  <td className="p-3 text-right text-sm">{item.quantity}</td>
                  <td className="p-3 text-right text-sm font-semibold" style={{ color: colors.accent }}>
                    {formatCurrency(item.revenue)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Footer */}
      <div className="border-t pt-6 mt-8 text-center text-sm" style={{ color: colors.muted }}>
        <div>
          This report was generated automatically by the Ring & Wing POS System
        </div>
        <div className="mt-2">
          Report Date: {formatDate(reportDate)} • {formatTime(reportDate)}
        </div>
      </div>

      {/* Print Styles */}
      <style>{`
        @media print {
          @page {
            margin: 1cm;
            size: A4;
          }
          body {
            print-color-adjust: exact;
            -webkit-print-color-adjust: exact;
          }
          .no-print {
            display: none !important;
          }
        }
      `}</style>
    </div>
  );
});

PrintableYearlyReport.displayName = 'PrintableYearlyReport';

export default PrintableYearlyReport;
