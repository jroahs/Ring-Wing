import { useState, useRef } from 'react';
import { 
  ResponsiveContainer, BarChart, Bar, LineChart, Line, XAxis, YAxis, 
  CartesianGrid, Tooltip, Legend, PieChart, Pie, Cell, AreaChart, Area 
} from 'recharts';
import { 
  FiCalendar, FiDownload, FiPrinter, FiTrendingUp, FiTrendingDown, 
  FiDollarSign, FiFileText, FiRefreshCw, FiChevronDown, FiX
} from 'react-icons/fi';
import { useReactToPrint } from 'react-to-print';
import { motion, AnimatePresence } from 'framer-motion';
import { useYearlyReport } from '../hooks/useYearlyReport';
import { generateYearlyRevenuePDF } from '../utils/pdfGenerator';
import { PrintableYearlyReport } from './ui/PrintableYearlyReport';
import BrandedLoadingScreen from './ui/BrandedLoadingScreen';

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

const CHART_COLORS = ['#f1670f', '#853619', '#2e0304', '#60a5fa', '#34d399', '#fbbf24', '#a78bfa', '#f87171'];

const YearlyRevenueReport = ({ isOpen, onClose }) => {
  const {
    loading,
    error,
    reportData,
    chartData,
    expenseCategoryData,
    periodLabel,
    selectedYear,
    startMonth,
    endMonth,
    customDateRange,
    useCustomRange,
    viewMode,
    availableYears,
    months,
    setYearFilter,
    setMonthRange,
    setCustomRange,
    setViewMode,
    resetToFullYear,
    refreshData
  } = useYearlyReport();

  const [showFilters, setShowFilters] = useState(false);
  const [customStartDate, setCustomStartDate] = useState('');
  const [customEndDate, setCustomEndDate] = useState('');
  
  const printableReportRef = useRef(null);

  // Print handler
  const handlePrint = useReactToPrint({
    content: () => printableReportRef.current,
    documentTitle: `Yearly_Revenue_Report_${periodLabel.replace(/\s+/g, '_')}`,
  });

  // PDF download handler
  const handleDownloadPDF = () => {
    if (!reportData) return;
    try {
      generateYearlyRevenuePDF(reportData, periodLabel);
    } catch (err) {
      console.error('Error generating PDF:', err);
      alert('Failed to generate PDF. Please try again.');
    }
  };

  // Apply custom date range
  const applyCustomRange = () => {
    if (customStartDate && customEndDate) {
      setCustomRange(customStartDate, customEndDate);
      setShowFilters(false);
    }
  };

  // Format currency
  const formatCurrency = (value) => {
    return `₱${parseFloat(value || 0).toLocaleString('en-PH', { 
      minimumFractionDigits: 2, 
      maximumFractionDigits: 2 
    })}`;
  };

  // Metric Card Component
  const MetricCard = ({ title, value, icon: Icon, trend, trendValue, color = colors.accent }) => (
    <div className="bg-white rounded-lg border p-4 shadow-sm" style={{ borderColor: colors.muted + '20' }}>
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <div className="w-10 h-10 rounded-lg flex items-center justify-center" 
               style={{ backgroundColor: color + '20' }}>
            <Icon className="w-5 h-5" style={{ color }} />
          </div>
          <span className="text-sm font-medium" style={{ color: colors.muted }}>{title}</span>
        </div>
        {trend && (
          <div className={`flex items-center gap-1 text-xs font-medium ${trend === 'up' ? 'text-green-600' : 'text-red-600'}`}>
            {trend === 'up' ? <FiTrendingUp /> : <FiTrendingDown />}
            {trendValue}%
          </div>
        )}
      </div>
      <div className="text-2xl font-bold" style={{ color: colors.primary }}>{value}</div>
    </div>
  );

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 p-4"
        onClick={onClose}
      >
        <motion.div
          initial={{ scale: 0.95, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.95, opacity: 0 }}
          className="bg-white rounded-xl shadow-2xl w-full max-w-7xl max-h-[90vh] overflow-hidden flex flex-col"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="p-6 border-b flex items-center justify-between" style={{ borderColor: colors.muted + '20' }}>
            <div>
              <h2 className="text-2xl font-bold" style={{ color: colors.primary }}>Yearly Revenue Report</h2>
              <p className="text-sm mt-1" style={{ color: colors.muted }}>
                Comprehensive financial overview for {periodLabel}
              </p>
            </div>
            <div className="flex items-center gap-3">
              {/* Filter Toggle */}
              <button
                onClick={() => setShowFilters(!showFilters)}
                className="flex items-center gap-2 px-4 py-2 rounded-lg border transition-all"
                style={{ borderColor: showFilters ? colors.accent : colors.muted + '40' }}
              >
                <FiCalendar className="w-4 h-4" style={{ color: colors.accent }} />
                <span className="text-sm font-medium">Filters</span>
                <FiChevronDown className={`w-4 h-4 transition-transform ${showFilters ? 'rotate-180' : ''}`} />
              </button>

              {/* Export Buttons */}
              <button
                onClick={handleDownloadPDF}
                disabled={loading || !reportData}
                className="flex items-center gap-2 px-4 py-2 rounded-lg text-white font-medium transition-opacity disabled:opacity-50"
                style={{ backgroundColor: colors.accent }}
              >
                <FiDownload className="w-4 h-4" />
                PDF
              </button>
              <button
                onClick={handlePrint}
                disabled={loading || !reportData}
                className="flex items-center gap-2 px-4 py-2 rounded-lg text-white font-medium transition-opacity disabled:opacity-50"
                style={{ backgroundColor: colors.secondary }}
              >
                <FiPrinter className="w-4 h-4" />
                Print
              </button>
              <button
                onClick={refreshData}
                disabled={loading}
                className="p-2 rounded-lg border hover:bg-gray-50 transition-colors"
                style={{ borderColor: colors.muted + '40' }}
              >
                <FiRefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
              </button>
              <button
                onClick={onClose}
                className="p-2 rounded-lg hover:bg-gray-100 transition-colors"
              >
                <FiX className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* Filter Panel */}
          <AnimatePresence>
            {showFilters && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                className="overflow-hidden border-b"
                style={{ borderColor: colors.muted + '20', backgroundColor: colors.activeBg }}
              >
                <div className="p-6 space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    {/* Year Selector */}
                    <div>
                      <label className="block text-sm font-medium mb-2" style={{ color: colors.primary }}>Year</label>
                      <select
                        value={selectedYear}
                        onChange={(e) => setYearFilter(parseInt(e.target.value))}
                        className="w-full px-3 py-2 rounded-lg border focus:outline-none focus:ring-2"
                        style={{ borderColor: colors.muted + '40', focusRingColor: colors.accent }}
                      >
                        {availableYears.map(year => (
                          <option key={year} value={year}>{year}</option>
                        ))}
                      </select>
                    </div>

                    {/* Start Month */}
                    <div>
                      <label className="block text-sm font-medium mb-2" style={{ color: colors.primary }}>Start Month</label>
                      <select
                        value={startMonth}
                        onChange={(e) => setMonthRange(parseInt(e.target.value), endMonth)}
                        className="w-full px-3 py-2 rounded-lg border focus:outline-none focus:ring-2"
                        style={{ borderColor: colors.muted + '40' }}
                      >
                        {months.map(m => (
                          <option key={m.value} value={m.value}>{m.label}</option>
                        ))}
                      </select>
                    </div>

                    {/* End Month */}
                    <div>
                      <label className="block text-sm font-medium mb-2" style={{ color: colors.primary }}>End Month</label>
                      <select
                        value={endMonth}
                        onChange={(e) => setMonthRange(startMonth, parseInt(e.target.value))}
                        className="w-full px-3 py-2 rounded-lg border focus:outline-none focus:ring-2"
                        style={{ borderColor: colors.muted + '40' }}
                      >
                        {months.filter(m => m.value >= startMonth).map(m => (
                          <option key={m.value} value={m.value}>{m.label}</option>
                        ))}
                      </select>
                    </div>

                    {/* Reset Button */}
                    <div className="flex items-end">
                      <button
                        onClick={resetToFullYear}
                        className="w-full px-4 py-2 rounded-lg border hover:bg-white transition-colors"
                        style={{ borderColor: colors.muted + '40' }}
                      >
                        Reset to Full Year
                      </button>
                    </div>
                  </div>

                  {/* Custom Date Range */}
                  <div className="pt-4 border-t" style={{ borderColor: colors.muted + '20' }}>
                    <label className="block text-sm font-medium mb-2" style={{ color: colors.primary }}>
                      Or select custom date range:
                    </label>
                    <div className="flex items-center gap-4">
                      <input
                        type="date"
                        value={customStartDate}
                        onChange={(e) => setCustomStartDate(e.target.value)}
                        className="px-3 py-2 rounded-lg border focus:outline-none focus:ring-2"
                        style={{ borderColor: colors.muted + '40' }}
                      />
                      <span style={{ color: colors.muted }}>to</span>
                      <input
                        type="date"
                        value={customEndDate}
                        onChange={(e) => setCustomEndDate(e.target.value)}
                        className="px-3 py-2 rounded-lg border focus:outline-none focus:ring-2"
                        style={{ borderColor: colors.muted + '40' }}
                      />
                      <button
                        onClick={applyCustomRange}
                        disabled={!customStartDate || !customEndDate}
                        className="px-4 py-2 rounded-lg text-white font-medium disabled:opacity-50"
                        style={{ backgroundColor: colors.accent }}
                      >
                        Apply Range
                      </button>
                    </div>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Content */}
          <div className="flex-1 overflow-y-auto p-6 space-y-6">
            {loading ? (
              <div className="flex items-center justify-center h-64">
                <BrandedLoadingScreen message="Loading yearly report..." />
              </div>
            ) : error ? (
              <div className="flex items-center justify-center h-64">
                <div className="text-center">
                  <p className="text-red-600 mb-4">{error}</p>
                  <button
                    onClick={refreshData}
                    className="px-4 py-2 rounded-lg text-white"
                    style={{ backgroundColor: colors.accent }}
                  >
                    Retry
                  </button>
                </div>
              </div>
            ) : reportData && (
              <>
                {/* Summary Metrics */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                  <MetricCard
                    title="Total Revenue"
                    value={formatCurrency(reportData.summary.totalRevenue)}
                    icon={FiTrendingUp}
                    color={colors.success}
                  />
                  <MetricCard
                    title="Total Expenses"
                    value={formatCurrency(reportData.summary.totalExpenses)}
                    icon={FiTrendingDown}
                    color={colors.error}
                  />
                  <MetricCard
                    title="Net Revenue"
                    value={formatCurrency(reportData.summary.netRevenue)}
                    icon={FiDollarSign}
                    color={reportData.summary.netRevenue >= 0 ? colors.success : colors.error}
                  />
                  <MetricCard
                    title="Profit Margin"
                    value={`${reportData.summary.profitMargin}%`}
                    icon={FiFileText}
                    color={colors.accent}
                  />
                </div>

                {/* View Mode Toggle */}
                <div className="flex justify-center">
                  <div className="inline-flex rounded-lg border" style={{ borderColor: colors.muted + '40' }}>
                    <button
                      onClick={() => setViewMode('monthly')}
                      className={`px-6 py-2 text-sm font-medium rounded-l-lg transition-colors ${
                        viewMode === 'monthly' ? 'text-white' : 'hover:bg-gray-50'
                      }`}
                      style={viewMode === 'monthly' ? { backgroundColor: colors.accent } : {}}
                    >
                      Monthly View
                    </button>
                    <button
                      onClick={() => setViewMode('quarterly')}
                      className={`px-6 py-2 text-sm font-medium rounded-r-lg transition-colors ${
                        viewMode === 'quarterly' ? 'text-white' : 'hover:bg-gray-50'
                      }`}
                      style={viewMode === 'quarterly' ? { backgroundColor: colors.accent } : {}}
                    >
                      Quarterly View
                    </button>
                  </div>
                </div>

                {/* Charts Row */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  {/* Revenue vs Expenses Chart */}
                  <div className="bg-white rounded-lg border p-6" style={{ borderColor: colors.muted + '20' }}>
                    <h3 className="text-lg font-semibold mb-4" style={{ color: colors.primary }}>
                      Revenue vs Expenses ({viewMode === 'monthly' ? 'Monthly' : 'Quarterly'})
                    </h3>
                    <div className="h-72">
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={viewMode === 'monthly' ? chartData.monthly : chartData.quarterly}>
                          <CartesianGrid strokeDasharray="3 3" stroke={colors.muted + '30'} />
                          <XAxis dataKey="name" tick={{ fontSize: 12 }} stroke={colors.muted} />
                          <YAxis 
                            tickFormatter={(v) => `₱${(v/1000).toFixed(0)}k`} 
                            tick={{ fontSize: 12 }} 
                            stroke={colors.muted} 
                          />
                          <Tooltip 
                            formatter={(value) => formatCurrency(value)}
                            contentStyle={{ 
                              backgroundColor: colors.background,
                              border: `1px solid ${colors.muted}40`,
                              borderRadius: '8px'
                            }}
                          />
                          <Legend />
                          <Bar dataKey="revenue" name="Revenue" fill={colors.success} radius={[4, 4, 0, 0]} />
                          <Bar dataKey="expenses" name="Expenses" fill={colors.error} radius={[4, 4, 0, 0]} />
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  </div>

                  {/* Net Revenue Trend */}
                  <div className="bg-white rounded-lg border p-6" style={{ borderColor: colors.muted + '20' }}>
                    <h3 className="text-lg font-semibold mb-4" style={{ color: colors.primary }}>
                      Net Revenue Trend
                    </h3>
                    <div className="h-72">
                      <ResponsiveContainer width="100%" height="100%">
                        <AreaChart data={viewMode === 'monthly' ? chartData.monthly : chartData.quarterly}>
                          <defs>
                            <linearGradient id="netRevenueGradient" x1="0" y1="0" x2="0" y2="1">
                              <stop offset="5%" stopColor={colors.accent} stopOpacity={0.3}/>
                              <stop offset="95%" stopColor={colors.accent} stopOpacity={0}/>
                            </linearGradient>
                          </defs>
                          <CartesianGrid strokeDasharray="3 3" stroke={colors.muted + '30'} />
                          <XAxis dataKey="name" tick={{ fontSize: 12 }} stroke={colors.muted} />
                          <YAxis 
                            tickFormatter={(v) => `₱${(v/1000).toFixed(0)}k`} 
                            tick={{ fontSize: 12 }} 
                            stroke={colors.muted} 
                          />
                          <Tooltip 
                            formatter={(value) => formatCurrency(value)}
                            contentStyle={{ 
                              backgroundColor: colors.background,
                              border: `1px solid ${colors.muted}40`,
                              borderRadius: '8px'
                            }}
                          />
                          <Area 
                            type="monotone" 
                            dataKey="netRevenue" 
                            name="Net Revenue"
                            stroke={colors.accent}
                            strokeWidth={2}
                            fill="url(#netRevenueGradient)"
                          />
                        </AreaChart>
                      </ResponsiveContainer>
                    </div>
                  </div>
                </div>

                {/* Expense Breakdown & Top Items */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  {/* Expense by Category */}
                  <div className="bg-white rounded-lg border p-6" style={{ borderColor: colors.muted + '20' }}>
                    <h3 className="text-lg font-semibold mb-4" style={{ color: colors.primary }}>
                      Expense Breakdown by Category
                    </h3>
                    <div className="h-72">
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Pie
                            data={expenseCategoryData}
                            cx="50%"
                            cy="50%"
                            labelLine={false}
                            label={({ name, percent }) => `${name} (${(percent * 100).toFixed(0)}%)`}
                            outerRadius={100}
                            fill="#8884d8"
                            dataKey="value"
                          >
                            {expenseCategoryData.map((entry, index) => (
                              <Cell key={`cell-${index}`} fill={CHART_COLORS[index % CHART_COLORS.length]} />
                            ))}
                          </Pie>
                          <Tooltip formatter={(value) => formatCurrency(value)} />
                        </PieChart>
                      </ResponsiveContainer>
                    </div>
                  </div>

                  {/* Top Selling Items */}
                  <div className="bg-white rounded-lg border p-6" style={{ borderColor: colors.muted + '20' }}>
                    <h3 className="text-lg font-semibold mb-4" style={{ color: colors.primary }}>
                      Top Selling Items
                    </h3>
                    <div className="space-y-3 max-h-72 overflow-y-auto">
                      {(reportData.topItems || []).slice(0, 8).map((item, index) => (
                        <div 
                          key={item.name} 
                          className="flex items-center justify-between p-3 rounded-lg hover:bg-gray-50 transition-colors"
                        >
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

                {/* Data Tables */}
                <div className="grid grid-cols-1 gap-6">
                  {/* Monthly/Quarterly Breakdown Table */}
                  <div className="bg-white rounded-lg border overflow-hidden" style={{ borderColor: colors.muted + '20' }}>
                    <div className="p-4 border-b" style={{ borderColor: colors.muted + '20', backgroundColor: colors.activeBg }}>
                      <h3 className="text-lg font-semibold" style={{ color: colors.primary }}>
                        {viewMode === 'monthly' ? 'Monthly' : 'Quarterly'} Breakdown
                      </h3>
                    </div>
                    <div className="overflow-x-auto">
                      <table className="w-full">
                        <thead style={{ backgroundColor: colors.muted + '10' }}>
                          <tr>
                            <th className="p-3 text-left text-sm font-semibold" style={{ color: colors.primary }}>
                              {viewMode === 'monthly' ? 'Month' : 'Quarter'}
                            </th>
                            <th className="p-3 text-right text-sm font-semibold" style={{ color: colors.primary }}>Revenue</th>
                            <th className="p-3 text-right text-sm font-semibold" style={{ color: colors.primary }}>Expenses</th>
                            <th className="p-3 text-right text-sm font-semibold" style={{ color: colors.primary }}>Net Revenue</th>
                            <th className="p-3 text-right text-sm font-semibold" style={{ color: colors.primary }}>Orders</th>
                          </tr>
                        </thead>
                        <tbody>
                          {(viewMode === 'monthly' ? (reportData.monthlyBreakdown || []) : (reportData.quarterlyBreakdown || [])).map((row, idx) => (
                            <tr 
                              key={viewMode === 'monthly' ? row.month : row.quarter}
                              className="border-t hover:bg-gray-50"
                              style={{ borderColor: colors.muted + '20' }}
                            >
                              <td className="p-3 text-sm font-medium" style={{ color: colors.primary }}>
                                {viewMode === 'monthly' ? row.month : row.quarter}
                              </td>
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
                              <td className="p-3 text-right text-sm" style={{ color: colors.muted }}>
                                {row.orderCount}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                        <tfoot style={{ backgroundColor: colors.activeBg }}>
                          <tr className="border-t-2" style={{ borderColor: colors.accent }}>
                            <td className="p-3 text-sm font-bold" style={{ color: colors.primary }}>TOTAL</td>
                            <td className="p-3 text-right text-sm font-bold" style={{ color: colors.success }}>
                              {formatCurrency(reportData.summary.totalRevenue)}
                            </td>
                            <td className="p-3 text-right text-sm font-bold" style={{ color: colors.error }}>
                              {formatCurrency(reportData.summary.totalExpenses)}
                            </td>
                            <td 
                              className="p-3 text-right text-sm font-bold" 
                              style={{ color: reportData.summary.netRevenue >= 0 ? colors.success : colors.error }}
                            >
                              {formatCurrency(reportData.summary.netRevenue)}
                            </td>
                            <td className="p-3 text-right text-sm font-bold" style={{ color: colors.primary }}>
                              {reportData.summary.totalOrders}
                            </td>
                          </tr>
                        </tfoot>
                      </table>
                    </div>
                  </div>
                </div>
              </>
            )}
          </div>

          {/* Hidden Printable Report */}
          <div style={{ 
            position: 'fixed', 
            left: '-9999px', 
            top: 0, 
            width: '800px', 
            backgroundColor: 'white',
            zIndex: -1
          }}>
            {reportData && (
              <PrintableYearlyReport
                ref={printableReportRef}
                reportData={reportData}
                periodLabel={periodLabel}
                viewMode={viewMode}
              />
            )}
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
};

export default YearlyRevenueReport;
