// This component shows expense filter controls
import React from 'react';
import { motion } from 'framer-motion';

const ExpenseFilters = ({ 
  colors, 
  searchTerm, 
  setSearchTerm, 
  dateRange, 
  setDateRange,
  selectedCategory,
  setSelectedCategory, 
  categories,
  paymentStatus,
  setPaymentStatus
}) => {
  
  // Animation variants
  const containerVariants = {
    hidden: { opacity: 0, y: -20 },
    visible: { 
      opacity: 1, 
      y: 0,
      transition: { staggerChildren: 0.1 } 
    }
  };
  
  const itemVariants = {
    hidden: { opacity: 0, y: -10 },
    visible: { opacity: 1, y: 0 }
  };

  return (
    <motion.div 
      className="bg-white rounded-xl p-4 shadow-md mb-6"
      style={{ border: `1px solid ${colors.muted}20` }}
      initial="hidden"
      animate="visible"
      variants={containerVariants}
    >
      <h2 className="text-lg font-semibold mb-4" style={{ color: colors.primary }}>Expense Filters</h2>
      
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <motion.div variants={itemVariants}>
          <label className="block text-sm font-medium mb-1" style={{ color: colors.muted }}>Search</label>
          <input
            type="text"
            className="w-full p-2 rounded-lg border"
            style={{ borderColor: colors.muted + '40' }}
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search expenses..."
          />
        </motion.div>
        
        <motion.div variants={itemVariants}>
          <label className="block text-sm font-medium mb-1" style={{ color: colors.muted }}>Category</label>
          <select
            className="w-full p-2 rounded-lg border"
            style={{ borderColor: colors.muted + '40' }}
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
          >
            <option value="All">All Categories</option>
            {categories.map((category) => (
              <option key={category} value={category}>{category}</option>
            ))}
          </select>
        </motion.div>
        
        <motion.div variants={itemVariants}>
          <label className="block text-sm font-medium mb-1" style={{ color: colors.muted }}>Payment Status</label>
          <select
            className="w-full p-2 rounded-lg border"
            style={{ borderColor: colors.muted + '40' }}
            value={paymentStatus}
            onChange={(e) => setPaymentStatus(e.target.value)}
          >            <option value="All">All Statuses</option>
            <option value="Pending">Pending</option>
            <option value="Paid">Paid</option>
          </select>
        </motion.div>
        
        <motion.div variants={itemVariants}>
          <label className="block text-sm font-medium mb-1" style={{ color: colors.muted }}>Date Range</label>
          <div className="flex gap-2">
            <input
              type="date"
              className="w-1/2 p-2 rounded-lg border"
              style={{ borderColor: colors.muted + '40' }}
              value={dateRange.start}
              onChange={(e) => setDateRange({ ...dateRange, start: e.target.value })}
            />
            <input
              type="date"
              className="w-1/2 p-2 rounded-lg border"
              style={{ borderColor: colors.muted + '40' }}
              value={dateRange.end}
              onChange={(e) => setDateRange({ ...dateRange, end: e.target.value })}
            />
          </div>
        </motion.div>
      </div>
        <motion.div 
        className="mt-3 text-xs text-gray-500"
        variants={itemVariants}
      >
        <p>Tip: Use the "Permanent" button to mark expenses that shouldn't be reset daily.</p>
      </motion.div>
    </motion.div>
  );
};

export default ExpenseFilters;
