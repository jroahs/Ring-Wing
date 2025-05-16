// This component provides a summary of expense data
import React from 'react';
import { motion } from 'framer-motion';

const ExpenseSummary = ({ colors, expenses }) => {
  // Calculate summary data
  const totalExpenses = expenses.reduce((sum, exp) => sum + exp.amount, 0);
  const pendingExpenses = expenses
    .filter(exp => !exp.disbursed)
    .reduce((sum, exp) => sum + exp.amount, 0);
  const paidExpenses = expenses
    .filter(exp => exp.disbursed)
    .reduce((sum, exp) => sum + exp.amount, 0);
  
  // Calculate percentage disbursed
  const percentageDisbursed = totalExpenses > 0 
    ? Math.round((paidExpenses / totalExpenses) * 100) 
    : 0;
  
  // Format currency
  const formatCurrency = (amount) => {
    return `₱${amount.toLocaleString('en-PH', { 
      minimumFractionDigits: 2, 
      maximumFractionDigits: 2 
    })}`;
  };
  
  const summaryItems = [
    {
      title: 'Total Expenses',
      value: formatCurrency(totalExpenses),
      color: colors.primary,
      bgColor: colors.primary + '10'
    },
    {
      title: 'Pending Payment',
      value: formatCurrency(pendingExpenses),
      color: '#6b7280', // gray-500
      bgColor: '#f3f4f6' // gray-100
    },
    {
      title: 'Paid',
      value: formatCurrency(paidExpenses),
      color: colors.accent,
      bgColor: colors.accent + '10'
    }
  ];
  
  return (
    <motion.div
      className="bg-white rounded-xl p-4 shadow-md mb-6"
      style={{ border: `1px solid ${colors.muted}20` }}
      initial={{ opacity: 0, y: -20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
    >
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-lg font-semibold" style={{ color: colors.primary }}>Expense Summary</h2>
        <span className="text-sm font-medium" style={{ color: colors.muted }}>
          {expenses.length} expense{expenses.length !== 1 ? 's' : ''}
        </span>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
        {summaryItems.map((item, index) => (
          <motion.div
            key={item.title}
            className="p-3 rounded-lg"
            style={{ backgroundColor: item.bgColor }}
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: index * 0.1 }}
          >
            <h3 className="text-sm font-medium mb-1" style={{ color: item.color }}>
              {item.title}
            </h3>
            <p className="text-xl font-bold" style={{ color: item.color }}>
              {item.value}
            </p>
          </motion.div>
        ))}
      </div>
      
      <div className="mt-4">
        <div className="flex justify-between mb-1">
          <span className="text-xs font-medium" style={{ color: colors.muted }}>Payment Progress</span>
          <span className="text-xs font-medium" style={{ color: colors.primary }}>{percentageDisbursed}%</span>
        </div>
        <div className="w-full bg-gray-200 rounded-full h-2.5">
          <motion.div
            className="h-2.5 rounded-full" 
            style={{ backgroundColor: colors.accent }}
            initial={{ width: '0%' }}
            animate={{ width: `${percentageDisbursed}%` }}
            transition={{ duration: 0.8, ease: "easeOut" }}
          />
        </div>
      </div>
    </motion.div>
  );
};

export default ExpenseSummary;
