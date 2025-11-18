import React, { useState, useEffect, useMemo } from 'react';
import { 
  DollarSign, 
  TrendingUp, 
  TrendingDown, 
  BarChart3, 
  PieChart, 
  Calculator,
  AlertTriangle,
  CheckCircle,
  RefreshCw,
  Download,
  Filter
} from 'lucide-react';
import { API_URL } from '../App';

/**
 * Cost Analysis Dashboard
 * Integrates ingredient costs with menu pricing for profit analysis
 */
const CostAnalysisPanel = ({ className = "" }) => {
  const [menuItems, setMenuItems] = useState([]);
  const [ingredientCosts, setIngredientCosts] = useState({});
  const [loading, setLoading] = useState(false);
  const [selectedTimeframe, setSelectedTimeframe] = useState('30d');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [sortBy, setSortBy] = useState('margin_desc');

  /**
   * Fetch menu items with ingredient mappings
   */
  const fetchCostData = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      
      // Fetch menu items with ingredient mappings
      const menuResponse = await fetch(`${API_URL}/api/menu/items?includeIngredients=true`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      
      if (menuResponse.ok) {
        const menuData = await menuResponse.json();
        setMenuItems(menuData.data || []);
      }

      // Fetch current ingredient costs
      const ingredientsResponse = await fetch(`${API_URL}/api/items?category=ingredients&active=true`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      
      if (ingredientsResponse.ok) {
        const ingredientsData = await ingredientsResponse.json();
        const costsMap = {};
        (ingredientsData.data || []).forEach(ingredient => {
          costsMap[ingredient._id] = {
            price: ingredient.price || 0,
            unit: ingredient.unit,
            name: ingredient.name
          };
        });
        setIngredientCosts(costsMap);
      }

    } catch (error) {
      console.error('Error fetching cost data:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCostData();
  }, [selectedTimeframe]);

  /**
   * Calculate ingredient cost for a menu item
   */
  const calculateIngredientCost = (menuItem) => {
    if (!menuItem.ingredientMappings || !menuItem.ingredientMappings.length) {
      return 0;
    }

    return menuItem.ingredientMappings.reduce((total, mapping) => {
      const ingredient = ingredientCosts[mapping.ingredientId];
      if (ingredient && ingredient.price) {
        return total + (mapping.quantity * ingredient.price);
      }
      return total;
    }, 0);
  };

  /**
   * Calculate profit margins and analysis
   */
  const menuAnalysis = useMemo(() => {
    return menuItems.map(item => {
      const ingredientCost = calculateIngredientCost(item);
      const basePrice = item.pricing?.base || 
                      (item.pricing ? Math.min(...Object.values(item.pricing)) : 0);
      const maxPrice = item.pricing?.base || 
                      (item.pricing ? Math.max(...Object.values(item.pricing)) : 0);
      
      const marginAmount = basePrice - ingredientCost;
      const marginPercent = basePrice > 0 ? (marginAmount / basePrice) * 100 : 0;
      
      // Determine profitability status
      let profitability = 'unknown';
      if (ingredientCost > 0) {
        if (marginPercent >= 70) profitability = 'excellent';
        else if (marginPercent >= 50) profitability = 'good';
        else if (marginPercent >= 30) profitability = 'fair';
        else if (marginPercent >= 0) profitability = 'poor';
        else profitability = 'loss';
      }

      return {
        ...item,
        ingredientCost,
        basePrice,
        maxPrice,
        marginAmount,
        marginPercent,
        profitability,
        hasIngredients: item.ingredientMappings && item.ingredientMappings.length > 0
      };
    });
  }, [menuItems, ingredientCosts]);

  /**
   * Filter and sort menu analysis
   */
  const filteredAnalysis = useMemo(() => {
    let filtered = menuAnalysis;

    // Filter by category
    if (selectedCategory !== 'all') {
      filtered = filtered.filter(item => item.category === selectedCategory);
    }

    // Sort
    filtered.sort((a, b) => {
      switch (sortBy) {
        case 'margin_desc': return b.marginPercent - a.marginPercent;
        case 'margin_asc': return a.marginPercent - b.marginPercent;
        case 'cost_desc': return b.ingredientCost - a.ingredientCost;
        case 'cost_asc': return a.ingredientCost - b.ingredientCost;
        case 'price_desc': return b.basePrice - a.basePrice;
        case 'price_asc': return a.basePrice - b.basePrice;
        case 'name': return a.name.localeCompare(b.name);
        default: return 0;
      }
    });

    return filtered;
  }, [menuAnalysis, selectedCategory, sortBy]);

  /**
   * Calculate summary statistics
   */
  const summaryStats = useMemo(() => {
    const itemsWithIngredients = filteredAnalysis.filter(item => item.hasIngredients);
    
    if (itemsWithIngredients.length === 0) {
      return {
        totalItems: filteredAnalysis.length,
        itemsWithCostData: 0,
        averageMargin: 0,
        totalRevenuePotential: 0,
        totalCostOfGoods: 0,
        profitabilityBreakdown: { excellent: 0, good: 0, fair: 0, poor: 0, loss: 0 }
      };
    }

    const totalRevenue = itemsWithIngredients.reduce((sum, item) => sum + item.basePrice, 0);
    const totalCost = itemsWithIngredients.reduce((sum, item) => sum + item.ingredientCost, 0);
    const averageMargin = itemsWithIngredients.reduce((sum, item) => sum + item.marginPercent, 0) / itemsWithIngredients.length;

    const profitabilityBreakdown = itemsWithIngredients.reduce((breakdown, item) => {
      breakdown[item.profitability] = (breakdown[item.profitability] || 0) + 1;
      return breakdown;
    }, {});

    return {
      totalItems: filteredAnalysis.length,
      itemsWithCostData: itemsWithIngredients.length,
      averageMargin,
      totalRevenuePotential: totalRevenue,
      totalCostOfGoods: totalCost,
      profitabilityBreakdown
    };
  }, [filteredAnalysis]);

  /**
   * Get profitability color and icon
   */
  const getProfitabilityDisplay = (profitability) => {
    const config = {
      excellent: { color: 'text-green-700 bg-green-100', icon: TrendingUp, label: 'Excellent' },
      good: { color: 'text-green-600 bg-green-50', icon: TrendingUp, label: 'Good' },
      fair: { color: 'text-yellow-700 bg-yellow-100', icon: BarChart3, label: 'Fair' },
      poor: { color: 'text-orange-700 bg-orange-100', icon: TrendingDown, label: 'Poor' },
      loss: { color: 'text-red-700 bg-red-100', icon: AlertTriangle, label: 'Loss' },
      unknown: { color: 'text-gray-700 bg-gray-100', icon: Calculator, label: 'Unknown' }
    };
    return config[profitability] || config.unknown;
  };

  /**
   * Export cost analysis data
   */
  const exportCostAnalysis = () => {
    const csvData = filteredAnalysis.map(item => ({
      'Item Name': item.name,
      'Category': item.category,
      'Base Price': item.basePrice.toFixed(2),
      'Ingredient Cost': item.ingredientCost.toFixed(2),
      'Margin Amount': item.marginAmount.toFixed(2),
      'Margin Percent': item.marginPercent.toFixed(1) + '%',
      'Profitability': getProfitabilityDisplay(item.profitability).label,
      'Has Ingredients': item.hasIngredients ? 'Yes' : 'No'
    }));

    const csv = [
      Object.keys(csvData[0]).join(','),
      ...csvData.map(row => Object.values(row).map(val => `"${val}"`).join(','))
    ].join('\n');

    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `cost-analysis-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
  };

  const categories = [...new Set(menuItems.map(item => item.category))];

  return (
    <div className={`bg-white border border-gray-200 rounded-lg shadow-sm ${className}`}>
      {/* Header */}
      <div className="p-6 border-b border-gray-200">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center space-x-3">
            <Calculator className="w-6 h-6 text-blue-600" />
            <h2 className="text-xl font-semibold text-gray-900">Cost Analysis</h2>
          </div>
          
          <div className="flex items-center space-x-2">
            <button
              onClick={exportCostAnalysis}
              disabled={filteredAnalysis.length === 0}
              className="inline-flex items-center px-3 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50"
            >
              <Download className="w-4 h-4 mr-2" />
              Export
            </button>
            
            <button
              onClick={fetchCostData}
              disabled={loading}
              className="inline-flex items-center px-3 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
            >
              <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
              Refresh
            </button>
          </div>
        </div>

        {/* Filters */}
        <div className="flex flex-wrap gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Category</label>
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="all">All Categories</option>
              {categories.map(category => (
                <option key={category} value={category}>{category}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Sort By</label>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="margin_desc">Margin % (High to Low)</option>
              <option value="margin_asc">Margin % (Low to High)</option>
              <option value="cost_desc">Ingredient Cost (High to Low)</option>
              <option value="cost_asc">Ingredient Cost (Low to High)</option>
              <option value="price_desc">Price (High to Low)</option>
              <option value="price_asc">Price (Low to High)</option>
              <option value="name">Name (A-Z)</option>
            </select>
          </div>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="p-6 bg-gray-50 border-b border-gray-200">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-white rounded-lg p-4 border border-gray-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Average Margin</p>
                <p className="text-2xl font-bold text-gray-900">
                  {summaryStats.averageMargin.toFixed(1)}%
                </p>
              </div>
              <BarChart3 className="w-8 h-8 text-blue-600" />
            </div>
          </div>

          <div className="bg-white rounded-lg p-4 border border-gray-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Items with Cost Data</p>
                <p className="text-2xl font-bold text-gray-900">
                  {summaryStats.itemsWithCostData}/{summaryStats.totalItems}
                </p>
              </div>
              <PieChart className="w-8 h-8 text-green-600" />
            </div>
          </div>

          <div className="bg-white rounded-lg p-4 border border-gray-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Total Cost of Goods</p>
                <p className="text-2xl font-bold text-gray-900">
                  ₱{summaryStats.totalCostOfGoods.toFixed(2)}
                </p>
              </div>
              <DollarSign className="w-8 h-8 text-red-600" />
            </div>
          </div>

          <div className="bg-white rounded-lg p-4 border border-gray-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Revenue Potential</p>
                <p className="text-2xl font-bold text-gray-900">
                  ₱{summaryStats.totalRevenuePotential.toFixed(2)}
                </p>
              </div>
              <TrendingUp className="w-8 h-8 text-green-600" />
            </div>
          </div>
        </div>
      </div>

      {/* Menu Items Analysis Table */}
      <div className="overflow-x-auto">
        {loading ? (
          <div className="p-8 text-center">
            <RefreshCw className="w-8 h-8 animate-spin mx-auto mb-4 text-gray-400" />
            <p className="text-gray-600">Loading cost analysis...</p>
          </div>
        ) : filteredAnalysis.length === 0 ? (
          <div className="p-8 text-center">
            <Calculator className="w-12 h-12 mx-auto mb-4 text-gray-300" />
            <p className="text-xl font-medium text-gray-900 mb-2">No menu items found</p>
            <p className="text-gray-600">Try adjusting your filters or add menu items with ingredient mappings.</p>
          </div>
        ) : (
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Menu Item
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Pricing
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Ingredient Cost
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Margin
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Profitability
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredAnalysis.map((item) => {
                const profitDisplay = getProfitabilityDisplay(item.profitability);
                const ProfitIcon = profitDisplay.icon;

                return (
                  <tr key={item._id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div>
                        <div className="text-sm font-medium text-gray-900">{item.name}</div>
                        <div className="text-sm text-gray-500">{item.category}</div>
                        {!item.hasIngredients && (
                          <div className="text-xs text-orange-600 mt-1">
                            No ingredients mapped
                          </div>
                        )}
                      </div>
                    </td>
                    
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">
                        ₱{item.basePrice.toFixed(2)}
                        {item.maxPrice !== item.basePrice && (
                          <span className="text-gray-500"> - ₱{item.maxPrice.toFixed(2)}</span>
                        )}
                      </div>
                    </td>
                    
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">
                        {item.hasIngredients ? 
                          `₱${item.ingredientCost.toFixed(2)}` : 
                          <span className="text-gray-400">-</span>
                        }
                      </div>
                    </td>
                    
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm">
                        {item.hasIngredients ? (
                          <>
                            <div className="text-gray-900">
                              ₱{item.marginAmount.toFixed(2)}
                            </div>
                            <div className={`text-xs ${
                              item.marginPercent >= 50 ? 'text-green-600' : 
                              item.marginPercent >= 30 ? 'text-yellow-600' : 
                              'text-red-600'
                            }`}>
                              {item.marginPercent.toFixed(1)}%
                            </div>
                          </>
                        ) : (
                          <span className="text-gray-400">-</span>
                        )}
                      </div>
                    </td>
                    
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${profitDisplay.color}`}>
                        <ProfitIcon className="w-3 h-3 mr-1" />
                        {profitDisplay.label}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
};

export default CostAnalysisPanel;