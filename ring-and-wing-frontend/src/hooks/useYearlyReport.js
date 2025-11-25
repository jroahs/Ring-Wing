import { useState, useEffect, useMemo, useCallback } from 'react';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

/**
 * Custom hook for fetching and managing yearly revenue report data
 * Handles filtering, calculations, and data transformations
 */
export const useYearlyReport = (initialYear = new Date().getFullYear()) => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [reportData, setReportData] = useState(null);
  
  // Filter state
  const [selectedYear, setSelectedYear] = useState(initialYear);
  const [startMonth, setStartMonth] = useState(1);
  const [endMonth, setEndMonth] = useState(12);
  const [customDateRange, setCustomDateRange] = useState({ start: null, end: null });
  const [useCustomRange, setUseCustomRange] = useState(false);
  const [viewMode, setViewMode] = useState('monthly'); // 'monthly' or 'quarterly'

  // Generate list of available years (last 10 years)
  const availableYears = useMemo(() => {
    const currentYear = new Date().getFullYear();
    return Array.from({ length: 10 }, (_, i) => currentYear - i);
  }, []);

  // Months for selection
  const months = useMemo(() => [
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
  ], []);

  // Fetch report data
  const fetchReport = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const params = new URLSearchParams();
      
      if (useCustomRange && customDateRange.start && customDateRange.end) {
        params.append('startDate', customDateRange.start);
        params.append('endDate', customDateRange.end);
      } else {
        params.append('year', selectedYear);
        params.append('startMonth', startMonth);
        params.append('endMonth', endMonth);
      }

      const response = await fetch(`${API_URL}/api/revenue/yearly-report?${params}`);
      const data = await response.json();

      if (data.success) {
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
  }, [selectedYear, startMonth, endMonth, customDateRange, useCustomRange]);

  // Fetch data when filters change
  useEffect(() => {
    fetchReport();
  }, [fetchReport]);

  // Computed values
  const chartData = useMemo(() => {
    if (!reportData) return { monthly: [], quarterly: [] };

    return {
      monthly: reportData.monthlyBreakdown.map(m => ({
        name: m.month,
        revenue: m.revenue,
        expenses: m.expenses,
        netRevenue: m.netRevenue,
        orders: m.orderCount
      })),
      quarterly: reportData.quarterlyBreakdown.map(q => ({
        name: q.quarter,
        revenue: q.revenue,
        expenses: q.expenses,
        netRevenue: q.netRevenue,
        orders: q.orderCount
      }))
    };
  }, [reportData]);

  // Expense category breakdown for pie chart
  const expenseCategoryData = useMemo(() => {
    if (!reportData?.expenseByCategory) return [];

    return Object.entries(reportData.expenseByCategory).map(([category, amount]) => ({
      name: category,
      value: amount
    }));
  }, [reportData]);

  // Period label for display
  const periodLabel = useMemo(() => {
    if (useCustomRange && customDateRange.start && customDateRange.end) {
      const start = new Date(customDateRange.start);
      const end = new Date(customDateRange.end);
      return `${start.toLocaleDateString('en-PH', { month: 'short', day: 'numeric', year: 'numeric' })} - ${end.toLocaleDateString('en-PH', { month: 'short', day: 'numeric', year: 'numeric' })}`;
    }
    
    if (startMonth === 1 && endMonth === 12) {
      return `Full Year ${selectedYear}`;
    }
    
    const startMonthName = months.find(m => m.value === startMonth)?.label || '';
    const endMonthName = months.find(m => m.value === endMonth)?.label || '';
    return `${startMonthName} - ${endMonthName} ${selectedYear}`;
  }, [selectedYear, startMonth, endMonth, customDateRange, useCustomRange, months]);

  // Filter handlers
  const setYearFilter = useCallback((year) => {
    setSelectedYear(year);
    setUseCustomRange(false);
  }, []);

  const setMonthRange = useCallback((start, end) => {
    setStartMonth(start);
    setEndMonth(end);
    setUseCustomRange(false);
  }, []);

  const setCustomRange = useCallback((start, end) => {
    setCustomDateRange({ start, end });
    setUseCustomRange(true);
  }, []);

  const resetToFullYear = useCallback(() => {
    setStartMonth(1);
    setEndMonth(12);
    setUseCustomRange(false);
  }, []);

  const refreshData = useCallback(() => {
    fetchReport();
  }, [fetchReport]);

  return {
    // Data
    loading,
    error,
    reportData,
    chartData,
    expenseCategoryData,
    periodLabel,

    // Filter state
    selectedYear,
    startMonth,
    endMonth,
    customDateRange,
    useCustomRange,
    viewMode,
    availableYears,
    months,

    // Filter actions
    setYearFilter,
    setMonthRange,
    setCustomRange,
    setViewMode,
    resetToFullYear,
    refreshData
  };
};

export default useYearlyReport;
