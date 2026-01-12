import { useState, useRef, useCallback, useEffect, useMemo } from 'react';
import { 
  ResponsiveContainer, BarChart, Bar, LineChart, Line, XAxis, YAxis, 
  CartesianGrid, Tooltip, Legend, PieChart, Pie, Cell, AreaChart, Area 
} from 'recharts';
import { 
  FiCalendar, FiDownload, FiPrinter, FiTrendingUp, FiTrendingDown, 
  FiDollarSign, FiFileText, FiRefreshCw, FiChevronDown, FiInfo
} from 'react-icons/fi';
import { useReactToPrint } from 'react-to-print';
import { generateYearlyRevenuePDF } from '../utils/pdfGenerator';
import { PrintableYearlyReport } from './ui/PrintableYearlyReport';
import BrandedLoadingScreen from './ui/BrandedLoadingScreen';
import { theme } from '../theme';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

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

const YearlyRevenueReportTab = () => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [reportData, setReportData] = useState(null);
  
  // Filter state
  const currentYear = new Date().getFullYear();
  const [selectedYear, setSelectedYear] = useState(currentYear);
  const [startMonth, setStartMonth] = useState(1);
  const [endMonth, setEndMonth] = useState(12);
  const [showFilters, setShowFilters] = useState(false);
  const [viewMode, setViewMode] = useState('monthly');
  const [customStartDate, setCustomStartDate] = useState('');
  const [customEndDate, setCustomEndDate] = useState('');
  const [useCustomRange, setUseCustomRange] = useState(false);

  const printableReportRef = useRef(null);

  // Available years (last 10 years)
  const availableYears = useMemo(() => {
    return Array.from({ length: 10 }, (_, i) => currentYear - i);
  }, [currentYear]);

  const months = [
    { value: 1, label: 'January' },
    { value: 2, label: 'February' },
    { value: 3, label: 'March' },
    { value: 4, label: 'April' },
    { value: 5, label: 'May' },
    { value: 6, label: 'June' },
    { value: 7, label: 'July' },
    { value: 8, label: 'August' },
    { value: 9, label: 'September' },
    { value: 10, label: 'October' },
    { value: 11, label: 'November' },
    { value: 12, label: 'December' }
  ];

  // Fetch report data
  const fetchReport = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const params = new URLSearchParams();
      
      if (useCustomRange && customStartDate && customEndDate) {
        params.append('startDate', customStartDate);
        params.append('endDate', customEndDate);
      } else {
        params.append('year', selectedYear.toString());
        params.append('startMonth', startMonth.toString());
        params.append('endMonth', endMonth.toString());
      }

      const response = await fetch(`${API_URL}/api/revenue/yearly-report?${params}`);
      const data = await response.json();

      if (data.success && data.data) {
        setReportData(data.data);
      } else {
        throw new Error(data.error || 'Failed to fetch yearly report');
      }
    } catch (err) {
      setError(err.message);
      setReportData(null);
    } finally {
      setLoading(false);
    }
  }, [selectedYear, startMonth, endMonth, customStartDate, customEndDate, useCustomRange]);

  useEffect(() => {
    fetchReport();
  }, [fetchReport]);

  // Safe data accessors
  const monthlyBreakdown = reportData?.monthlyBreakdown || [];
  const quarterlyBreakdown = reportData?.quarterlyBreakdown || [];
  const topItems = reportData?.topItems || [];
  const expenseByCategory = reportData?.expenseByCategory || {};
  const summary = reportData?.summary || {
    totalRevenue: 0,
    totalExpenses: 0,
    netRevenue: 0,
    profitMargin: 0,
    totalOrders: 0
  };

  // Chart data
  const chartData = useMemo(() => ({
    monthly: monthlyBreakdown.map(m => ({
      name: m?.month || '',
      revenue: m?.revenue || 0,
      expenses: m?.expenses || 0,
      netRevenue: m?.netRevenue || 0,
      orders: m?.orderCount || 0
    })),
    quarterly: quarterlyBreakdown.map(q => ({
      name: q?.quarter || '',
      revenue: q?.revenue || 0,
      expenses: q?.expenses || 0,
      netRevenue: q?.netRevenue || 0,
      orders: q?.orderCount || 0
    }))
  }), [monthlyBreakdown, quarterlyBreakdown]);

  const expenseCategoryData = useMemo(() => {
    return Object.entries(expenseByCategory)
      .filter(([, amount]) => Number(amount || 0) > 0)
      .map(([category, amount]) => ({
        name: category,
        value: amount
      }));
  }, [expenseByCategory]);

  // Period label
  const periodLabel = useMemo(() => {
    if (useCustomRange && customStartDate && customEndDate) {
      const start = new Date(customStartDate);
      const end = new Date(customEndDate);
      return `${start.toLocaleDateString('en-PH', { month: 'short', day: 'numeric', year: 'numeric' })} - ${end.toLocaleDateString('en-PH', { month: 'short', day: 'numeric', year: 'numeric' })}`;
    }
    if (startMonth === 1 && endMonth === 12) {
      return `Full Year ${selectedYear}`;
    }
    const startMonthName = months.find(m => m.value === startMonth)?.label || '';
    const endMonthName = months.find(m => m.value === endMonth)?.label || '';
    return `${startMonthName} - ${endMonthName} ${selectedYear}`;
  }, [selectedYear, startMonth, endMonth, customStartDate, customEndDate, useCustomRange]);

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
      setUseCustomRange(true);
      setShowFilters(false);
    }
  };

  const resetToFullYear = () => {
    setStartMonth(1);
    setEndMonth(12);
    setUseCustomRange(false);
    setCustomStartDate('');
    setCustomEndDate('');
  };

  // Format currency
  const formatCurrency = (value) => {
    return `₱${parseFloat(value || 0).toLocaleString('en-PH', { 
      minimumFractionDigits: 2, 
      maximumFractionDigits: 2 
    })}`;
  };

  const profitMarginNumber = Number(summary.profitMargin || 0);
  const profitMarginTooltip = profitMarginNumber < 0
    ? 'Negative margin indicates expenses exceeded revenue'
    : undefined;
  const profitMarginDisplay = profitMarginNumber < -100
    ? '< -100%'
    : `${profitMarginNumber}%`;

  // Metric Card Component
  const MetricCard = ({ title, value, icon: Icon, color = colors.accent }) => (
    <div className="bg-white rounded-lg border p-4 shadow-sm" style={{ borderColor: colors.muted + '20' }}>
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <div className="w-10 h-10 rounded-lg flex items-center justify-center" style={{ backgroundColor: color + '20' }}>
            <Icon className="w-5 h-5" style={{ color }} />
          </div>
          <span className="text-sm font-medium" style={{ color: colors.muted }}>{title}</span>
        </div>
      </div>
      <div className="text-2xl font-bold" style={{ color: colors.primary }}>{value}</div>
    </div>
  );

  if (loading) {
    return <BrandedLoadingScreen message="Loading yearly report..." />;
  }

  if (error) {
    return (
      <div className="p-6 flex items-center justify-center">
        <div className="text-center">
          <p className="text-red-600 mb-4">{error}</p>
          <button
            onClick={fetchReport}
            className="px-4 py-2 rounded-lg text-white"
            style={{ backgroundColor: colors.accent }}
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header with Filters and Export */}
      <div className="flex flex-wrap justify-between items-center gap-4">
        <div className="flex items-center gap-3">
          <h3 className="text-lg font-semibold" style={{ color: colors.primary }}>
            {periodLabel}
          </h3>
          <div className="text-xs" style={{ color: colors.muted }}>
            Figures are based on accrual accounting (incurred revenue and expenses).
          </div>
          <button
            onClick={() => setShowFilters(!showFilters)}
            className="flex items-center gap-2 px-3 py-1.5 rounded-lg border text-sm transition-all"
            style={{ borderColor: showFilters ? colors.accent : colors.muted + '40' }}
          >
            <FiCalendar className="w-4 h-4" style={{ color: colors.accent }} />
            Filters
            <FiChevronDown className={`w-4 h-4 transition-transform ${showFilters ? 'rotate-180' : ''}`} />
          </button>
        </div>

        <div className="flex gap-2">
          <button
            onClick={handleDownloadPDF}
            disabled={!reportData}
            className="flex items-center gap-2 px-4 py-2 rounded-lg text-white font-medium transition-opacity disabled:opacity-50"
            style={{ backgroundColor: theme.colors.primary }}
          >
            <FiDownload className="w-4 h-4" />
            PDF
          </button>
          <button
            onClick={handlePrint}
            disabled={!reportData}
            className="flex items-center gap-2 px-4 py-2 rounded-lg text-white font-medium transition-opacity disabled:opacity-50"
            style={{ backgroundColor: theme.colors.primary }}
          >
            <FiPrinter className="w-4 h-4" />
            Print
          </button>
          <button
            onClick={fetchReport}
            disabled={loading}
            className="p-2 rounded-lg border hover:bg-gray-50 transition-colors"
            style={{ borderColor: colors.muted + '40' }}
          >
            <FiRefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* Filter Panel */}
      {showFilters && (
        <div className="p-4 rounded-lg border space-y-4" style={{ backgroundColor: colors.activeBg, borderColor: colors.muted + '20' }}>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <label className="block text-sm font-medium mb-2" style={{ color: colors.primary }}>Year</label>
              <select
                value={selectedYear}
                onChange={(e) => { setSelectedYear(parseInt(e.target.value)); setUseCustomRange(false); }}
                className="w-full px-3 py-2 rounded-lg border focus:outline-none"
                style={{ borderColor: colors.muted + '40' }}
              >
                {availableYears.map(year => (
                  <option key={year} value={year}>{year}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium mb-2" style={{ color: colors.primary }}>Start Month</label>
              <select
                value={startMonth}
                onChange={(e) => { setStartMonth(parseInt(e.target.value)); setUseCustomRange(false); }}
                className="w-full px-3 py-2 rounded-lg border focus:outline-none"
                style={{ borderColor: colors.muted + '40' }}
              >
                {months.map(m => (
                  <option key={m.value} value={m.value}>{m.label}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium mb-2" style={{ color: colors.primary }}>End Month</label>
              <select
                value={endMonth}
                onChange={(e) => { setEndMonth(parseInt(e.target.value)); setUseCustomRange(false); }}
                className="w-full px-3 py-2 rounded-lg border focus:outline-none"
                style={{ borderColor: colors.muted + '40' }}
              >
                {months.filter(m => m.value >= startMonth).map(m => (
                  <option key={m.value} value={m.value}>{m.label}</option>
                ))}
              </select>
            </div>
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
          <div className="pt-4 border-t" style={{ borderColor: colors.muted + '20' }}>
            <label className="block text-sm font-medium mb-2" style={{ color: colors.primary }}>Custom Date Range:</label>
            <div className="flex items-center gap-4">
              <input
                type="date"
                value={customStartDate}
                onChange={(e) => setCustomStartDate(e.target.value)}
                className="px-3 py-2 rounded-lg border focus:outline-none"
                style={{ borderColor: colors.muted + '40' }}
              />
              <span style={{ color: colors.muted }}>to</span>
              <input
                type="date"
                value={customEndDate}
                onChange={(e) => setCustomEndDate(e.target.value)}
                className="px-3 py-2 rounded-lg border focus:outline-none"
                style={{ borderColor: colors.muted + '40' }}
              />
              <button
                onClick={applyCustomRange}
                disabled={!customStartDate || !customEndDate}
                className="px-4 py-2 rounded-lg text-white font-medium disabled:opacity-50"
                style={{ backgroundColor: colors.accent }}
              >
                Apply
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Summary Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCard title="Total Revenue" value={formatCurrency(summary.totalRevenue)} icon={FiTrendingUp} color={colors.success} />
        <MetricCard title="Total Expenses" value={formatCurrency(summary.totalExpenses)} icon={FiTrendingDown} color={colors.error} />
        <MetricCard title="Net Revenue" value={formatCurrency(summary.netRevenue)} icon={FiDollarSign} color={summary.netRevenue >= 0 ? colors.success : colors.error} />
        <MetricCard title="Profit Margin" value={profitMarginDisplay} tooltip={profitMarginTooltip} icon={FiFileText} color={colors.accent} />
      </div>

      {/* View Mode Toggle */}
      <div className="flex justify-center">
        <div className="inline-flex rounded-lg border" style={{ borderColor: colors.muted + '40' }}>
          <button
            onClick={() => setViewMode('monthly')}
            className={`px-6 py-2 text-sm font-medium rounded-l-lg transition-colors ${viewMode === 'monthly' ? 'text-white' : 'hover:bg-gray-50'}`}
            style={viewMode === 'monthly' ? { backgroundColor: colors.accent } : {}}
          >
            Monthly View
          </button>
          <button
            onClick={() => setViewMode('quarterly')}
            className={`px-6 py-2 text-sm font-medium rounded-r-lg transition-colors ${viewMode === 'quarterly' ? 'text-white' : 'hover:bg-gray-50'}`}
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
                <YAxis tickFormatter={(v) => `₱${(v/1000).toFixed(0)}k`} tick={{ fontSize: 12 }} stroke={colors.muted} />
                <Tooltip formatter={(value) => formatCurrency(value)} contentStyle={{ backgroundColor: colors.background, border: `1px solid ${colors.muted}40`, borderRadius: '8px' }} />
                <Legend />
                <Bar dataKey="revenue" name="Revenue" fill={colors.success} radius={[4, 4, 0, 0]} />
                <Bar dataKey="expenses" name="Expenses" fill={colors.error} radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Net Revenue Trend */}
        <div className="bg-white rounded-lg border p-6" style={{ borderColor: colors.muted + '20' }}>
          <h3 className="text-lg font-semibold mb-4" style={{ color: colors.primary }}>Net Revenue Trend</h3>
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
                <YAxis tickFormatter={(v) => `₱${(v/1000).toFixed(0)}k`} tick={{ fontSize: 12 }} stroke={colors.muted} />
                <Tooltip formatter={(value) => formatCurrency(value)} contentStyle={{ backgroundColor: colors.background, border: `1px solid ${colors.muted}40`, borderRadius: '8px' }} />
                <Area type="monotone" dataKey="netRevenue" name="Net Revenue" stroke={colors.accent} strokeWidth={2} fill="url(#netRevenueGradient)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Data Table */}
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
                <th className="p-3 text-left text-sm font-semibold" style={{ color: colors.primary }}>{viewMode === 'monthly' ? 'Month' : 'Quarter'}</th>
                <th className="p-3 text-right text-sm font-semibold" style={{ color: colors.primary }}>Revenue</th>
                <th className="p-3 text-right text-sm font-semibold" style={{ color: colors.primary }}>Expenses</th>
                <th className="p-3 text-right text-sm font-semibold" style={{ color: colors.primary }}>Net Revenue</th>
                <th className="p-3 text-right text-sm font-semibold" style={{ color: colors.primary }}>Orders</th>
              </tr>
            </thead>
            <tbody>
              {(viewMode === 'monthly' ? monthlyBreakdown : quarterlyBreakdown).map((row, idx) => {
                const isNoActivity =
                  Number(row?.revenue || 0) === 0 &&
                  Number(row?.expenses || 0) === 0 &&
                  Number(row?.netRevenue || 0) === 0 &&
                  Number(row?.orderCount || 0) === 0;

                const mutedCellStyle = isNoActivity ? { color: colors.muted } : undefined;

                return (
                  <tr
                    key={viewMode === 'monthly' ? row?.month : row?.quarter}
                    className={`border-t hover:bg-gray-50 ${isNoActivity ? 'bg-gray-50' : ''}`}
                    style={{ borderColor: colors.muted + '20' }}
                  >
                    <td className="p-3 text-sm font-medium" style={isNoActivity ? { color: colors.muted } : { color: colors.primary }}>
                      {viewMode === 'monthly' ? row?.month : row?.quarter}
                      {isNoActivity && (
                        <span
                          className="ml-2 text-xs px-2 py-0.5 rounded-full"
                          style={{ backgroundColor: colors.muted + '15', color: colors.muted }}
                        >
                          No activity
                        </span>
                      )}
                    </td>
                    <td className="p-3 text-right text-sm" style={isNoActivity ? mutedCellStyle : { color: colors.success }}>{formatCurrency(row?.revenue)}</td>
                    <td className="p-3 text-right text-sm" style={isNoActivity ? mutedCellStyle : { color: colors.error }}>{formatCurrency(row?.expenses)}</td>
                    <td className="p-3 text-right text-sm font-semibold" style={isNoActivity ? mutedCellStyle : { color: (row?.netRevenue || 0) >= 0 ? colors.success : colors.error }}>{formatCurrency(row?.netRevenue)}</td>
                    <td className="p-3 text-right text-sm" style={isNoActivity ? mutedCellStyle : { color: colors.muted }}>{row?.orderCount || 0}</td>
                  </tr>
                );
              })}
            </tbody>
            <tfoot style={{ backgroundColor: colors.activeBg }}>
              <tr className="border-t-2" style={{ borderColor: colors.accent }}>
                <td className="p-3 text-sm font-bold" style={{ color: colors.primary }}>TOTAL</td>
                <td className="p-3 text-right text-sm font-bold" style={{ color: colors.success }}>{formatCurrency(summary.totalRevenue)}</td>
                <td className="p-3 text-right text-sm font-bold" style={{ color: colors.error }}>{formatCurrency(summary.totalExpenses)}</td>
                <td className="p-3 text-right text-sm font-bold" style={{ color: summary.netRevenue >= 0 ? colors.success : colors.error }}>{formatCurrency(summary.netRevenue)}</td>
                <td className="p-3 text-right text-sm font-bold" style={{ color: colors.primary }}>{summary.totalOrders}</td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>

      {/* Top Items & Expense Breakdown */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Top Selling Items */}
        <div className="bg-white rounded-lg border p-6" style={{ borderColor: colors.muted + '20' }}>
          <h3 className="text-lg font-semibold mb-4" style={{ color: colors.primary }}>Top Selling Items</h3>
          <div className="space-y-3 max-h-72 overflow-y-auto">
            {topItems.length > 0 ? topItems.slice(0, 8).map((item, index) => (
              <div key={item?.name || index} className="flex items-center justify-between p-3 rounded-lg hover:bg-gray-50 transition-colors">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full flex items-center justify-center text-white text-sm font-bold" style={{ backgroundColor: index < 3 ? colors.accent : colors.muted }}>
                    {index + 1}
                  </div>
                  <div>
                    <div className="font-medium text-sm" style={{ color: colors.primary }}>{item?.name || 'Unknown'}</div>
                    <div className="text-xs" style={{ color: colors.muted }}>{item?.quantity || 0} sold</div>
                  </div>
                </div>
                <div className="text-right">
                  <div className="font-bold text-sm" style={{ color: colors.primary }}>{formatCurrency(item?.revenue)}</div>
                </div>
              </div>
            )) : (
              <p className="text-center py-4" style={{ color: colors.muted }}>No items data available</p>
            )}
          </div>
        </div>

        {/* Expense by Category */}
        {expenseCategoryData.length > 0 && (
          <div className="bg-white rounded-lg border p-6" style={{ borderColor: colors.muted + '20' }}>
            <h3 className="text-lg font-semibold mb-4" style={{ color: colors.primary }}>Expense Breakdown</h3>
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
        )}
      </div>

      {/* Hidden Printable Report */}
      <div style={{ position: 'fixed', left: '-9999px', top: 0, width: '800px', backgroundColor: 'white', zIndex: -1 }}>
        <PrintableYearlyReport
          ref={printableReportRef}
          reportData={reportData}
          periodLabel={periodLabel}
          viewMode={viewMode}
        />
      </div>
    </div>
  );
};

export default YearlyRevenueReportTab;
