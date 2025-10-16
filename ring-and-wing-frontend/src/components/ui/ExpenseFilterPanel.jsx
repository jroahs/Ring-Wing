import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { FiFilter, FiSearch, FiCalendar, FiTag, FiDollarSign, FiX, FiChevronDown, FiChevronUp } from 'react-icons/fi';

const ExpenseFilterPanel = ({
  colors,
  searchTerm,
  setSearchTerm,
  dateRange,
  setDateRange,
  selectedCategory,
  setSelectedCategory,
  paymentStatus,
  setPaymentStatus,
  categories,
  totalExpenses,
  activeFiltersCount,
  isOpen,
  onClose
}) => {
  const [showDatePicker, setShowDatePicker] = useState(false);
  // Add CSS to hide scrollbar
  useEffect(() => {
    const style = document.createElement('style');
    style.textContent = `
      .filter-panel-scroll::-webkit-scrollbar {
        display: none;
        width: 0;
        height: 0;
      }
      .filter-panel-scroll::-webkit-scrollbar-track {
        display: none;
      }
      .filter-panel-scroll::-webkit-scrollbar-thumb {
        display: none;
      }
      .filter-panel-scroll {
        -ms-overflow-style: none;
        scrollbar-width: none;
        overflow: -moz-scrollbars-none;
      }
    `;
    style.id = 'filter-panel-scroll-styles';
    document.head.appendChild(style);
    
    return () => {
      const existingStyle = document.getElementById('filter-panel-scroll-styles');
      if (existingStyle) {
        document.head.removeChild(existingStyle);
      }
    };
  }, []);

  // Clear all filters
  const clearAllFilters = () => {
    setSearchTerm('');
    setDateRange({ start: '', end: '' });
    setSelectedCategory('All');
    setPaymentStatus('All');
    setShowDatePicker(false);
  };

  // Quick date presets
  const setQuickDate = (preset) => {
    const today = new Date();
    let start, end;

    switch (preset) {
      case 'today':
        start = end = today.toISOString().split('T')[0];
        break;
      case 'week':
        start = new Date(today.setDate(today.getDate() - 7)).toISOString().split('T')[0];
        end = new Date().toISOString().split('T')[0];
        break;
      case 'month':
        start = new Date(today.getFullYear(), today.getMonth(), 1).toISOString().split('T')[0];
        end = new Date().toISOString().split('T')[0];
        break;
      case 'quarter':
        const quarter = Math.floor(today.getMonth() / 3);
        start = new Date(today.getFullYear(), quarter * 3, 1).toISOString().split('T')[0];
        end = new Date().toISOString().split('T')[0];
        break;
      default:
        return;
    }
    
    setDateRange({ start, end });
    setShowDatePicker(false);
  };
  return (
    <>
      {/* Slide-out Panel */}
      <AnimatePresence>
        {isOpen && (          <motion.div
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', damping: 20, stiffness: 100 }}
            className="fixed top-0 right-0 h-full w-[475px] z-50 shadow-2xl overflow-y-auto filter-panel-scroll"
            style={{ backgroundColor: colors.background }}
          >
            {/* Panel Header */}
            <div 
              className="p-6 border-b sticky top-0 z-10"
              style={{ 
                backgroundColor: colors.background,
                borderColor: colors.muted + '20'
              }}
            >
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                  <FiFilter 
                    className="w-6 h-6" 
                    style={{ color: colors.accent }} 
                  />
                  <h2 className="text-xl font-bold" style={{ color: colors.primary }}>
                    Filter Expenses
                  </h2>
                </div>
                
                <button
                  onClick={onClose}
                  className="p-2 rounded-lg hover:bg-gray-100 transition-colors"
                  style={{ color: colors.muted }}
                >
                  <FiX className="w-5 h-5" />
                </button>
              </div>

              {/* Active Filters Badge & Results Count */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  {activeFiltersCount > 0 && (
                    <span 
                      className="px-3 py-1 rounded-full text-sm font-medium"
                      style={{ 
                        backgroundColor: colors.accent,
                        color: colors.background 
                      }}
                    >
                      {activeFiltersCount} filter{activeFiltersCount !== 1 ? 's' : ''} active
                    </span>
                  )}
                </div>
                
                <span className="text-sm" style={{ color: colors.muted }}>
                  {totalExpenses} result{totalExpenses !== 1 ? 's' : ''}
                </span>
              </div>
            </div>

            {/* Panel Content */}
            <div className="p-6 space-y-8">
              
              {/* Search Section */}
              <div className="space-y-4">
                <h3 className="flex items-center gap-2 font-semibold text-lg" style={{ color: colors.secondary }}>
                  <FiSearch className="w-5 h-5" />
                  Search & Text Filters
                </h3>
                
                <div className="relative">
                  <FiSearch 
                    className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5" 
                    style={{ color: colors.muted }} 
                  />
                  <input
                    type="text"
                    placeholder="Search by description, vendor, or notes..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full pl-10 pr-4 py-3 rounded-lg border focus:ring-2 focus:outline-none transition-all"
                    style={{ 
                      borderColor: searchTerm ? colors.accent : colors.muted + '40',
                      backgroundColor: colors.background,
                      focusRingColor: colors.accent + '40'
                    }}
                  />
                  {searchTerm && (
                    <button
                      onClick={() => setSearchTerm('')}
                      className="absolute right-3 top-1/2 transform -translate-y-1/2 hover:bg-gray-100 rounded-full p-1"
                    >
                      <FiX className="w-4 h-4" style={{ color: colors.muted }} />
                    </button>
                  )}
                </div>
              </div>

              {/* Category & Status Section */}
              <div className="space-y-4">
                <h3 className="flex items-center gap-2 font-semibold text-lg" style={{ color: colors.secondary }}>
                  <FiTag className="w-5 h-5" />
                  Categories & Status
                </h3>
                
                <div className="space-y-4">
                  {/* Category Filter */}
                  <div>
                    <label className="block text-sm font-medium mb-2" style={{ color: colors.muted }}>
                      Category
                    </label>
                    <select
                      value={selectedCategory}
                      onChange={(e) => setSelectedCategory(e.target.value)}
                      className="w-full p-3 rounded-lg border focus:ring-2 focus:outline-none transition-all"
                      style={{ 
                        borderColor: selectedCategory !== 'All' ? colors.accent : colors.muted + '40',
                        backgroundColor: colors.background
                      }}
                    >
                      <option value="All">All Categories</option>
                      {categories.map((category) => (
                        <option key={category} value={category}>{category}</option>
                      ))}
                    </select>
                  </div>

                  {/* Payment Status Filter */}
                  <div>
                    <label className="block text-sm font-medium mb-2" style={{ color: colors.muted }}>
                      Payment Status
                    </label>
                    <select
                      value={paymentStatus}
                      onChange={(e) => setPaymentStatus(e.target.value)}
                      className="w-full p-3 rounded-lg border focus:ring-2 focus:outline-none transition-all"
                      style={{ 
                        borderColor: paymentStatus !== 'All' ? colors.accent : colors.muted + '40',
                        backgroundColor: colors.background
                      }}
                    >
                      <option value="All">All Status</option>
                      <option value="Pending">Pending Payment</option>
                      <option value="Paid">Paid</option>
                    </select>
                  </div>
                </div>
              </div>              {/* Date Range Section */}
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="flex items-center gap-2 font-semibold text-lg" style={{ color: colors.secondary }}>
                    <FiCalendar className="w-5 h-5" />
                    Date Range
                  </h3>
                  <button
                    onClick={() => setShowDatePicker(true)}
                    className="text-sm font-medium px-3 py-1 rounded-lg transition-colors"
                    style={{ 
                      backgroundColor: colors.activeBg,
                      color: colors.accent
                    }}
                  >
                    Open Date Picker
                  </button>
                </div>

                {/* Quick Date Presets */}
                <div className="grid grid-cols-2 gap-2">
                  {[
                    { label: 'Today', value: 'today' },
                    { label: 'Last 7 Days', value: 'week' },
                    { label: 'This Month', value: 'month' },
                    { label: 'This Quarter', value: 'quarter' }
                  ].map((preset) => (
                    <button
                      key={preset.value}
                      onClick={() => setQuickDate(preset.value)}
                      className="px-3 py-2 rounded-lg text-sm font-medium transition-all hover:scale-105"
                      style={{ 
                        backgroundColor: colors.activeBg,
                        color: colors.accent,
                        border: `1px solid ${colors.accent}40`
                      }}
                    >
                      {preset.label}
                    </button>
                  ))}
                </div>

                {/* Active Date Range Display */}
                {(dateRange.start || dateRange.end) && (
                  <motion.div 
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="p-3 rounded-lg flex items-center justify-between"
                    style={{ backgroundColor: colors.accent + '10' }}
                  >
                    <span className="text-sm font-medium" style={{ color: colors.secondary }}>
                      Date filter: {dateRange.start || 'Start'} to {dateRange.end || 'End'}
                    </span>
                    <button
                      onClick={() => setDateRange({ start: '', end: '' })}
                      className="text-sm hover:bg-white rounded-full p-1"
                      style={{ color: colors.accent }}
                    >
                      <FiX className="w-4 h-4" />
                    </button>
                  </motion.div>
                )}
              </div>{/* Clear All Button */}
              {activeFiltersCount > 0 && (
                <div className="pt-4 border-t" style={{ borderColor: colors.muted + '20' }}>
                  <button
                    onClick={clearAllFilters}
                    className="w-full px-4 py-3 rounded-lg font-medium transition-all hover:scale-105"
                    style={{ 
                      backgroundColor: colors.muted + '20',
                      color: colors.secondary,
                      border: `2px solid ${colors.muted}40`
                    }}
                  >
                    <FiX className="w-4 h-4 mr-2 inline" />
                    Clear All Filters
                  </button>
                </div>
              )}
            </div>          </motion.div>
        )}
      </AnimatePresence>

      {/* Date Picker Modal */}
      <AnimatePresence>
        {showDatePicker && (
          <>
            {/* Modal Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black bg-opacity-60 z-[60]"
              onClick={() => setShowDatePicker(false)}
            />
            
            {/* Modal Content */}
            <motion.div
              initial={{ opacity: 0, scale: 0.95, x: '-50%', y: '-50%' }}
              animate={{ opacity: 1, scale: 1, x: '-50%', y: '-50%' }}
              exit={{ opacity: 0, scale: 0.95, x: '-50%', y: '-50%' }}
              className="fixed top-1/2 left-1/2 z-[70] w-96 rounded-xl shadow-2xl"
              style={{ backgroundColor: colors.background }}
            >
              {/* Modal Header */}
              <div 
                className="p-6 border-b flex items-center justify-between"
                style={{ borderColor: colors.muted + '20' }}
              >
                <h3 className="text-lg font-semibold flex items-center gap-2" style={{ color: colors.primary }}>
                  <FiCalendar className="w-5 h-5" />
                  Select Date Range
                </h3>
                <button
                  onClick={() => setShowDatePicker(false)}
                  className="p-2 rounded-lg hover:bg-gray-100 transition-colors"
                  style={{ color: colors.muted }}
                >
                  <FiX className="w-5 h-5" />
                </button>
              </div>

              {/* Modal Body */}
              <div className="p-6 space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-2" style={{ color: colors.muted }}>
                    Start Date
                  </label>
                  <input
                    type="date"
                    value={dateRange.start}
                    onChange={(e) => setDateRange({ ...dateRange, start: e.target.value })}
                    className="w-full p-3 rounded-lg border focus:ring-2 focus:outline-none"
                    style={{ 
                      borderColor: dateRange.start ? colors.accent : colors.muted + '40',
                      backgroundColor: colors.background
                    }}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2" style={{ color: colors.muted }}>
                    End Date
                  </label>
                  <input
                    type="date"
                    value={dateRange.end}
                    onChange={(e) => setDateRange({ ...dateRange, end: e.target.value })}
                    className="w-full p-3 rounded-lg border focus:ring-2 focus:outline-none"
                    style={{ 
                      borderColor: dateRange.end ? colors.accent : colors.muted + '40',
                      backgroundColor: colors.background
                    }}
                  />
                </div>
              </div>

              {/* Modal Footer */}
              <div 
                className="p-6 border-t flex gap-3 justify-end"
                style={{ borderColor: colors.muted + '20' }}
              >
                <button
                  onClick={() => setShowDatePicker(false)}
                  className="px-4 py-2 rounded-lg font-medium transition-colors"
                  style={{ 
                    backgroundColor: colors.muted + '20',
                    color: colors.secondary
                  }}
                >
                  Cancel
                </button>
                <button
                  onClick={() => setShowDatePicker(false)}
                  className="px-4 py-2 rounded-lg font-medium transition-colors"
                  style={{ 
                    backgroundColor: colors.accent,
                    color: colors.background
                  }}
                >
                  Apply
                </button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  );
};

export default ExpenseFilterPanel;
