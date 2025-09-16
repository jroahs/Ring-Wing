import React, { useState, useEffect, useMemo } from 'react';
import { 
  BarChart3, 
  TrendingUp, 
  TrendingDown, 
  Package, 
  AlertTriangle,
  RefreshCw,
  Download,
  Calendar,
  Filter,
  Eye,
  ShoppingCart,
  Trash2,
  Clock
} from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar, PieChart, Pie, Cell } from 'recharts';

/**
 * Inventory Reports Integration
 * Comprehensive reporting for ingredient usage, waste tracking, and reorder suggestions
 */
const InventoryReportsPanel = ({ className = "" }) => {
  const [reportData, setReportData] = useState({});
  const [loading, setLoading] = useState(false);
  const [selectedReport, setSelectedReport] = useState('usage');
  const [dateRange, setDateRange] = useState('7d');
  const [selectedCategory, setSelectedCategory] = useState('all');

  const reportTypes = [
    { key: 'usage', label: 'Ingredient Usage', icon: Package },
    { key: 'waste', label: 'Waste Tracking', icon: Trash2 },
    { key: 'cost', label: 'Cost Analysis', icon: TrendingUp },
    { key: 'reorder', label: 'Reorder Suggestions', icon: ShoppingCart }
  ];

  const dateRanges = [
    { key: '7d', label: 'Last 7 Days' },
    { key: '30d', label: 'Last 30 Days' },
    { key: '90d', label: 'Last 3 Months' },
    { key: 'custom', label: 'Custom Range' }
  ];

  /**
   * Fetch comprehensive report data
   */
  const fetchReportData = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      
      const params = new URLSearchParams({
        dateRange,
        category: selectedCategory,
        includeMenuItems: 'true',
        includeWaste: 'true',
        includeCosts: 'true'
      });

      // Fetch multiple report endpoints in parallel
      const [usageRes, wasteRes, ordersRes, inventoryRes] = await Promise.all([
        fetch(`/api/ingredients/reports/usage?${params}`, {
          headers: { 'Authorization': `Bearer ${token}` }
        }),
        fetch(`/api/ingredients/reports/waste?${params}`, {
          headers: { 'Authorization': `Bearer ${token}` }
        }),
        fetch(`/api/orders/reports/ingredients?${params}`, {
          headers: { 'Authorization': `Bearer ${token}` }
        }),
        fetch(`/api/items/reports/inventory?${params}`, {
          headers: { 'Authorization': `Bearer ${token}` }
        })
      ]);

      const [usageData, wasteData, ordersData, inventoryData] = await Promise.all([
        usageRes.ok ? usageRes.json() : { data: {} },
        wasteRes.ok ? wasteRes.json() : { data: {} },
        ordersRes.ok ? ordersRes.json() : { data: {} },
        inventoryRes.ok ? inventoryRes.json() : { data: {} }
      ]);

      setReportData({
        usage: usageData.data || {},
        waste: wasteData.data || {},
        orders: ordersData.data || {},
        inventory: inventoryData.data || {}
      });

    } catch (error) {
      console.error('Error fetching report data:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReportData();
  }, [dateRange, selectedCategory]);

  /**
   * Generate usage report visualization data
   */
  const usageChartData = useMemo(() => {
    if (!reportData.usage?.daily) return [];
    
    return Object.entries(reportData.usage.daily).map(([date, usage]) => ({
      date: new Date(date).toLocaleDateString(),
      totalUsage: usage.totalQuantity || 0,
      totalCost: usage.totalCost || 0,
      itemsUsed: usage.ingredients?.length || 0
    }));
  }, [reportData.usage]);

  /**
   * Generate waste tracking data
   */
  const wasteData = useMemo(() => {
    if (!reportData.waste?.items) return [];
    
    return reportData.waste.items.map(item => ({
      name: item.ingredientName,
      wastedQuantity: item.wastedQuantity,
      wastedValue: item.wastedValue,
      wasteReason: item.reason,
      date: item.date
    }));
  }, [reportData.waste]);

  /**
   * Generate reorder suggestions
   */
  const reorderSuggestions = useMemo(() => {
    if (!reportData.inventory?.items) return [];
    
    return reportData.inventory.items
      .filter(item => {
        const daysOfStock = item.currentStock / (item.averageUsagePerDay || 1);
        return daysOfStock < 7 || item.currentStock <= (item.minStock || 0);
      })
      .map(item => {
        const daysOfStock = item.currentStock / (item.averageUsagePerDay || 1);
        const suggestedOrder = Math.max(
          item.maxStock - item.currentStock,
          item.averageUsagePerDay * 14 // 2 weeks supply
        );
        
        return {
          ...item,
          daysOfStock,
          suggestedOrderQuantity: Math.ceil(suggestedOrder),
          priority: daysOfStock < 3 ? 'high' : daysOfStock < 7 ? 'medium' : 'low',
          estimatedCost: suggestedOrder * (item.price || 0)
        };
      })
      .sort((a, b) => a.daysOfStock - b.daysOfStock);
  }, [reportData.inventory]);

  /**
   * Calculate top performing menu items by ingredient usage
   */
  const topMenuItems = useMemo(() => {
    if (!reportData.orders?.menuItemUsage) return [];
    
    return Object.entries(reportData.orders.menuItemUsage)
      .map(([itemId, data]) => ({
        id: itemId,
        name: data.name,
        orderCount: data.orderCount,
        totalRevenue: data.totalRevenue,
        ingredientCost: data.ingredientCost,
        profit: data.totalRevenue - data.ingredientCost,
        profitMargin: data.totalRevenue > 0 ? 
          ((data.totalRevenue - data.ingredientCost) / data.totalRevenue) * 100 : 0
      }))
      .sort((a, b) => b.orderCount - a.orderCount)
      .slice(0, 10);
  }, [reportData.orders]);

  /**
   * Export report data
   */
  const exportReport = (type) => {
    let csvData = [];
    let filename = '';

    switch (type) {
      case 'usage':
        csvData = usageChartData.map(item => ({
          'Date': item.date,
          'Total Usage (units)': item.totalUsage,
          'Total Cost': item.totalCost.toFixed(2),
          'Items Used': item.itemsUsed
        }));
        filename = 'ingredient-usage-report';
        break;
        
      case 'waste':
        csvData = wasteData.map(item => ({
          'Ingredient': item.name,
          'Wasted Quantity': item.wastedQuantity,
          'Wasted Value': item.wastedValue.toFixed(2),
          'Reason': item.wasteReason,
          'Date': new Date(item.date).toLocaleDateString()
        }));
        filename = 'waste-tracking-report';
        break;
        
      case 'reorder':
        csvData = reorderSuggestions.map(item => ({
          'Ingredient': item.name,
          'Current Stock': item.currentStock,
          'Days of Stock': item.daysOfStock.toFixed(1),
          'Suggested Order': item.suggestedOrderQuantity,
          'Estimated Cost': item.estimatedCost.toFixed(2),
          'Priority': item.priority
        }));
        filename = 'reorder-suggestions';
        break;
        
      default:
        return;
    }

    const csv = [
      Object.keys(csvData[0]).join(','),
      ...csvData.map(row => Object.values(row).map(val => `"${val}"`).join(','))
    ].join('\n');

    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${filename}-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
  };

  /**
   * Render report content based on selected type
   */
  const renderReportContent = () => {
    switch (selectedReport) {
      case 'usage':
        return (
          <div className="space-y-6">
            {/* Usage Chart */}
            <div className="bg-white border border-gray-200 rounded-lg p-4">
              <h3 className="text-lg font-medium text-gray-900 mb-4">Daily Ingredient Usage</h3>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={usageChartData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="date" />
                    <YAxis yAxisId="left" orientation="left" />
                    <YAxis yAxisId="right" orientation="right" />
                    <Tooltip />
                    <Line yAxisId="left" type="monotone" dataKey="totalUsage" stroke="#3B82F6" name="Usage (units)" />
                    <Line yAxisId="right" type="monotone" dataKey="totalCost" stroke="#10B981" name="Cost (₱)" />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Top Menu Items */}
            <div className="bg-white border border-gray-200 rounded-lg p-4">
              <h3 className="text-lg font-medium text-gray-900 mb-4">Top Menu Items by Orders</h3>
              <div className="space-y-2">
                {topMenuItems.slice(0, 5).map((item, index) => (
                  <div key={item.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <div className="flex items-center space-x-3">
                      <span className="flex-shrink-0 w-6 h-6 bg-blue-100 text-blue-800 rounded-full flex items-center justify-center text-sm font-medium">
                        {index + 1}
                      </span>
                      <div>
                        <div className="font-medium text-gray-900">{item.name}</div>
                        <div className="text-sm text-gray-500">{item.orderCount} orders</div>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="font-medium text-gray-900">₱{item.totalRevenue.toFixed(2)}</div>
                      <div className="text-sm text-gray-500">{item.profitMargin.toFixed(1)}% margin</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        );

      case 'waste':
        return (
          <div className="space-y-6">
            {/* Waste Summary */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="bg-white border border-gray-200 rounded-lg p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600">Total Waste Value</p>
                    <p className="text-2xl font-bold text-red-600">
                      ₱{wasteData.reduce((sum, item) => sum + item.wastedValue, 0).toFixed(2)}
                    </p>
                  </div>
                  <Trash2 className="w-8 h-8 text-red-600" />
                </div>
              </div>
              
              <div className="bg-white border border-gray-200 rounded-lg p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600">Items Wasted</p>
                    <p className="text-2xl font-bold text-gray-900">{wasteData.length}</p>
                  </div>
                  <Package className="w-8 h-8 text-orange-600" />
                </div>
              </div>
              
              <div className="bg-white border border-gray-200 rounded-lg p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600">Waste %</p>
                    <p className="text-2xl font-bold text-gray-900">
                      {reportData.waste?.wastePercentage?.toFixed(1) || '0.0'}%
                    </p>
                  </div>
                  <TrendingDown className="w-8 h-8 text-yellow-600" />
                </div>
              </div>
            </div>

            {/* Waste Items Table */}
            <div className="bg-white border border-gray-200 rounded-lg">
              <div className="px-4 py-3 border-b border-gray-200">
                <h3 className="text-lg font-medium text-gray-900">Waste Records</h3>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Ingredient</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Quantity</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Value</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Reason</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Date</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {wasteData.slice(0, 10).map((item, index) => (
                      <tr key={index} className="hover:bg-gray-50">
                        <td className="px-4 py-3 text-sm font-medium text-gray-900">{item.name}</td>
                        <td className="px-4 py-3 text-sm text-gray-900">{item.wastedQuantity}</td>
                        <td className="px-4 py-3 text-sm text-gray-900">₱{item.wastedValue.toFixed(2)}</td>
                        <td className="px-4 py-3 text-sm text-gray-500">{item.wasteReason}</td>
                        <td className="px-4 py-3 text-sm text-gray-500">
                          {new Date(item.date).toLocaleDateString()}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        );

      case 'reorder':
        return (
          <div className="space-y-6">
            {/* Reorder Summary */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="bg-white border border-gray-200 rounded-lg p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600">Items Need Reorder</p>
                    <p className="text-2xl font-bold text-orange-600">
                      {reorderSuggestions.length}
                    </p>
                  </div>
                  <ShoppingCart className="w-8 h-8 text-orange-600" />
                </div>
              </div>
              
              <div className="bg-white border border-gray-200 rounded-lg p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600">High Priority</p>
                    <p className="text-2xl font-bold text-red-600">
                      {reorderSuggestions.filter(item => item.priority === 'high').length}
                    </p>
                  </div>
                  <AlertTriangle className="w-8 h-8 text-red-600" />
                </div>
              </div>
              
              <div className="bg-white border border-gray-200 rounded-lg p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600">Estimated Cost</p>
                    <p className="text-2xl font-bold text-gray-900">
                      ₱{reorderSuggestions.reduce((sum, item) => sum + item.estimatedCost, 0).toFixed(2)}
                    </p>
                  </div>
                  <TrendingUp className="w-8 h-8 text-green-600" />
                </div>
              </div>
            </div>

            {/* Reorder Suggestions Table */}
            <div className="bg-white border border-gray-200 rounded-lg">
              <div className="px-4 py-3 border-b border-gray-200">
                <h3 className="text-lg font-medium text-gray-900">Reorder Suggestions</h3>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Ingredient</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Current Stock</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Days Left</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Suggested Order</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Est. Cost</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Priority</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {reorderSuggestions.map((item, index) => (
                      <tr key={index} className="hover:bg-gray-50">
                        <td className="px-4 py-3 text-sm font-medium text-gray-900">{item.name}</td>
                        <td className="px-4 py-3 text-sm text-gray-900">
                          {item.currentStock} {item.unit}
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-900">
                          {item.daysOfStock.toFixed(1)} days
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-900">
                          {item.suggestedOrderQuantity} {item.unit}
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-900">
                          ₱{item.estimatedCost.toFixed(2)}
                        </td>
                        <td className="px-4 py-3">
                          <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${
                            item.priority === 'high' ? 'bg-red-100 text-red-800' :
                            item.priority === 'medium' ? 'bg-yellow-100 text-yellow-800' :
                            'bg-green-100 text-green-800'
                          }`}>
                            {item.priority.toUpperCase()}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        );

      default:
        return <div>Select a report type</div>;
    }
  };

  return (
    <div className={`bg-white border border-gray-200 rounded-lg shadow-sm ${className}`}>
      {/* Header */}
      <div className="p-6 border-b border-gray-200">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-semibold text-gray-900">Inventory Reports</h2>
          
          <div className="flex items-center space-x-2">
            <button
              onClick={() => exportReport(selectedReport)}
              disabled={loading}
              className="inline-flex items-center px-3 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50"
            >
              <Download className="w-4 h-4 mr-2" />
              Export
            </button>
            
            <button
              onClick={fetchReportData}
              disabled={loading}
              className="inline-flex items-center px-3 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
            >
              <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
              Refresh
            </button>
          </div>
        </div>

        {/* Report Type Tabs */}
        <div className="flex space-x-1 bg-gray-100 p-1 rounded-lg mb-4">
          {reportTypes.map((type) => {
            const Icon = type.icon;
            return (
              <button
                key={type.key}
                onClick={() => setSelectedReport(type.key)}
                className={`flex items-center px-4 py-2 rounded-lg font-medium text-sm transition-colors ${
                  selectedReport === type.key
                    ? 'bg-white text-blue-600 shadow-sm'
                    : 'text-gray-600 hover:text-gray-800'
                }`}
              >
                <Icon className="w-4 h-4 mr-2" />
                {type.label}
              </button>
            );
          })}
        </div>

        {/* Filters */}
        <div className="flex flex-wrap gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Date Range</label>
            <select
              value={dateRange}
              onChange={(e) => setDateRange(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              {dateRanges.map(range => (
                <option key={range.key} value={range.key}>{range.label}</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Report Content */}
      <div className="p-6">
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <RefreshCw className="w-8 h-8 animate-spin text-gray-400 mr-3" />
            <span className="text-gray-600">Generating report...</span>
          </div>
        ) : (
          renderReportContent()
        )}
      </div>
    </div>
  );
};

export default InventoryReportsPanel;