import React, { forwardRef } from 'react';
import { BarChart, Bar, XAxis, YAxis, ResponsiveContainer, Cell } from 'recharts';

const colors = {
  primary: '#2e0304',
  background: '#fefdfd',
  accent: '#f1670f',
  secondary: '#853619',
  muted: '#ac9c9b',
  activeBg: '#f1670f20'
};

export const PrintableRevenueReport = forwardRef(({
  revenueData,
  selectedPeriod,
  reportDate = new Date(),
  className = ''
}, ref) => {
    const formatCurrency = (value) => {
    // Use PHP prefix instead of peso symbol for better PDF compatibility
    return `PHP ${new Intl.NumberFormat('en-PH', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(value)}`;
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
  };  const prepareHourlyData = () => {
    if (!revenueData?.hourlyDistribution) return [];
    return Array.from({ length: 24 }, (_, hour) => ({
      hour: hour.toString().padStart(2, '0') + ':00',
      revenue: revenueData.hourlyDistribution[hour] || 0
    }));
  };

  // Return early if no revenue data
  if (!revenueData || !revenueData.summary) {
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
          <p style={{ color: colors.muted }}>No revenue data available</p>
        </div>
      </div>
    );  }

  return (
    <div 
      ref={ref}
      data-testid="revenue-report"
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
          {selectedPeriod.charAt(0).toUpperCase() + selectedPeriod.slice(1)} Revenue Report
        </h2>
        <div className="text-sm" style={{ color: colors.muted }}>
          <div>Report Generated: {formatDate(reportDate)} at {formatTime(reportDate)}</div>
          <div>Period: {selectedPeriod.charAt(0).toUpperCase() + selectedPeriod.slice(1)} Report</div>
        </div>
      </div>

      {/* Summary Metrics */}
      <div className="mb-8">
        <h3 className="text-lg font-semibold mb-4" style={{ color: colors.primary }}>
          Summary Overview
        </h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="border rounded-lg p-4" style={{ borderColor: colors.muted + '40' }}>
            <div className="text-sm" style={{ color: colors.muted }}>Total Revenue</div>
            <div className="text-xl font-bold" style={{ color: colors.primary }}>
              {formatCurrency(revenueData.summary.totalRevenue)}
            </div>
          </div>
          <div className="border rounded-lg p-4" style={{ borderColor: colors.muted + '40' }}>
            <div className="text-sm" style={{ color: colors.muted }}>Total Orders</div>
            <div className="text-xl font-bold" style={{ color: colors.primary }}>
              {revenueData.summary.orderCount}
            </div>
          </div>
          <div className="border rounded-lg p-4" style={{ borderColor: colors.muted + '40' }}>
            <div className="text-sm" style={{ color: colors.muted }}>Items Sold</div>
            <div className="text-xl font-bold" style={{ color: colors.primary }}>
              {revenueData.summary.itemsSold}
            </div>
          </div>
          <div className="border rounded-lg p-4" style={{ borderColor: colors.muted + '40' }}>
            <div className="text-sm" style={{ color: colors.muted }}>Avg Order Value</div>
            <div className="text-xl font-bold" style={{ color: colors.primary }}>
              {formatCurrency(revenueData.summary.averageOrderValue)}
            </div>
          </div>
        </div>
      </div>      {/* Hourly Revenue Chart - Only for daily reports */}
      {selectedPeriod === 'daily' && revenueData.hourlyDistribution && (
        <div className="mb-8">
          <h3 className="text-lg font-semibold mb-4" style={{ color: colors.primary }}>
            Hourly Revenue Distribution
          </h3>
          <div className="h-64 border rounded-lg p-4" style={{ 
            borderColor: colors.muted + '40',
            backgroundColor: 'white'
          }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart 
                data={prepareHourlyData()}
                margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
              >
                <XAxis 
                  dataKey="hour" 
                  tick={{ fontSize: 10, fill: '#000000' }}
                  interval={1}
                  axisLine={{ stroke: '#000000' }}
                  tickLine={{ stroke: '#000000' }}
                />
                <YAxis 
                  tickFormatter={(value) => `PHP ${value}`}
                  tick={{ fontSize: 10, fill: '#000000' }}
                  axisLine={{ stroke: '#000000' }}
                  tickLine={{ stroke: '#000000' }}
                />
                <Bar 
                  dataKey="revenue" 
                  fill={colors.accent} 
                  radius={[2, 2, 0, 0]}
                  stroke="#000000"
                  strokeWidth={0.5}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>      )}

      {/* Top Selling Items - Expanded */}
      <div className="mb-8">
        <h3 className="text-lg font-semibold mb-4" style={{ color: colors.primary }}>
          Top Selling Items
        </h3>
        <table className="w-full border rounded-lg" style={{ borderColor: colors.muted + '40' }}>
          <thead style={{ backgroundColor: colors.activeBg }}>
            <tr>
              <th className="p-3 text-left">Rank</th>
              <th className="p-3 text-left">Item Name</th>
              <th className="p-3 text-right">Quantity Sold</th>
              <th className="p-3 text-right">Unit Revenue</th>
              <th className="p-3 text-right">Total Revenue</th>
              <th className="p-3 text-right">% of Total</th>
            </tr>
          </thead>
          <tbody>
            {revenueData.topItems.slice(0, 15).map((item, index) => {
              const percentage = ((item.revenue / revenueData.summary.totalRevenue) * 100).toFixed(1);
              const unitRevenue = item.quantity > 0 ? item.revenue / item.quantity : 0;
              
              return (
                <tr key={item.name} className="border-t" style={{ borderColor: colors.muted + '20' }}>
                  <td className="p-3">
                    <div 
                      className="w-7 h-7 rounded-full flex items-center justify-center text-white text-sm font-bold"
                      style={{ 
                        backgroundColor: index < 3 ? colors.accent : 
                                       index < 5 ? colors.secondary : colors.muted 
                      }}
                    >
                      {index + 1}
                    </div>
                  </td>
                  <td className="p-3 font-medium">{item.name}</td>
                  <td className="p-3 text-right text-lg font-semibold" style={{ color: colors.accent }}>
                    {item.quantity}
                  </td>
                  <td className="p-3 text-right">
                    {formatCurrency(unitRevenue)}
                  </td>
                  <td className="p-3 text-right font-semibold text-lg" style={{ color: colors.primary }}>
                    {formatCurrency(item.revenue)}
                  </td>
                  <td className="p-3 text-right font-medium">
                    {percentage}%
                  </td>
                </tr>
              );
            })}
          </tbody>
          <tfoot style={{ backgroundColor: colors.activeBg }}>
            <tr>
              <td colSpan="4" className="p-3 font-bold text-right">Total Revenue:</td>
              <td className="p-3 text-right font-bold text-lg" style={{ color: colors.primary }}>
                {formatCurrency(revenueData.summary.totalRevenue)}
              </td>
              <td className="p-3 text-right font-bold">100%</td>
            </tr>
          </tfoot>
        </table>
      </div>

      {/* Footer */}
      <div className="border-t pt-6 mt-8 text-center text-sm" style={{ color: colors.muted }}>
        <div>
          This report was generated automatically by the Ring & Wing POS System
        </div>
        <div className="mt-2">
          Report Date: {formatDate(reportDate)} • {formatTime(reportDate)}
        </div>
      </div>      {/* Print Styles */}
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
        
        /* Styles for HTML to Canvas conversion */
        .pdf-capture {
          background-color: white !important;
          color: black !important;
        }
        
        .pdf-capture .recharts-wrapper {
          font-family: Arial, sans-serif !important;
          background-color: white !important;
        }
        
        .pdf-capture .recharts-surface {
          background-color: white !important;
        }
        
        .pdf-capture svg {
          background-color: white !important;
        }
        
        .pdf-capture .recharts-text,
        .pdf-capture .recharts-cartesian-axis-tick-value {
          fill: black !important;
          font-family: Arial, sans-serif !important;
        }
        
        /* Global chart styles for PDF capture */
        .recharts-wrapper {
          font-family: Arial, sans-serif !important;
        }
        
        .recharts-surface {
          background-color: white !important;
        }
        
        .recharts-text {
          fill: black !important;
        }
        
        .recharts-cartesian-axis-tick-value {
          fill: black !important;
        }
      `}</style>
    </div>
  );
});

PrintableRevenueReport.displayName = 'PrintableRevenueReport';
