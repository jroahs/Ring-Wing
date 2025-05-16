// This component represents a single expense card for better organization
import React from 'react';
import { motion } from 'framer-motion';

const ExpenseCard = ({ expense, colors, onMarkPaid, onMakePermanent }) => {
  const formatCurrency = (amount) => {
    return `₱${amount.toLocaleString('en-PH', { 
      minimumFractionDigits: 2, 
      maximumFractionDigits: 2 
    })}`;
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-PH', { 
      year: 'numeric', 
      month: 'short', 
      day: 'numeric' 
    });
  };
  // Format disbursement date
  const formatDisbursementDate = (date) => {
    if (!date) return '';
    return new Date(date).toLocaleDateString('en-PH', { 
      month: 'short', 
      day: 'numeric'
    });
  };
  
  // Status badge styling based on payment status
  const getBadgeStyle = () => {
    if (expense.disbursed) {
      if (expense.permanent) {
        return {
          bg: `${colors.secondary}20`,
          text: colors.secondary,
          border: `1px solid ${colors.secondary}`,
          label: `Paid ${formatDisbursementDate(expense.disbursementDate)}`
        };
      } else {
        return {
          bg: `${colors.accent}20`,
          text: colors.accent,
          border: `1px solid ${colors.accent}60`,
          label: `Paid ${formatDisbursementDate(expense.disbursementDate)}`
        };
      }
    } else {
      return {
        bg: '#f3f4f6',
        text: '#6b7280', 
        border: '1px solid #e5e7eb',
        label: 'Pending'
      };
    }
  };

  const badgeStyle = getBadgeStyle();

  return (
    <motion.div 
      className="bg-white rounded-lg shadow-md overflow-hidden mb-4 border border-gray-100"
      whileHover={{ y: -2, boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)' }}
      transition={{ duration: 0.2 }}
    >
      <div className="p-4">
        <div className="flex justify-between items-start">
          <div>
            <h3 className="font-medium" style={{ color: colors.primary }}>{expense.description}</h3>
            <p className="text-sm" style={{ color: colors.muted }}>{formatDate(expense.date)}</p>
          </div>
          <div className="flex flex-col items-end">
            <span className="text-lg font-semibold" style={{ color: colors.secondary }}>
              {formatCurrency(expense.amount)}
            </span>
            <span className="px-2 py-1 rounded-full text-xs" 
                  style={{ 
                    backgroundColor: badgeStyle.bg, 
                    color: badgeStyle.text,
                    border: badgeStyle.border
                  }}>
              {badgeStyle.label}
            </span>
          </div>
        </div>
        
        <div className="flex items-center mt-2">
          <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium mr-2" 
                style={{ backgroundColor: colors.activeBg, color: colors.accent }}>
            {expense.category}
          </span>
          <span className="text-xs text-gray-500">{expense.paymentMethod}</span>
        </div>
        
        {!expense.disbursed ? (
          <div className="flex gap-2 mt-3">
            <button
              onClick={() => onMarkPaid(expense._id)}
              className="flex-1 px-3 py-1 rounded-lg text-sm font-medium transition-colors"
              style={{ backgroundColor: colors.accent, color: colors.background }}
            >
              Mark Paid
            </button>
            <button
              onClick={() => onMakePermanent(expense._id)}
              className="flex-1 px-3 py-1 rounded-lg text-sm font-medium transition-colors"
              style={{ backgroundColor: colors.secondary, color: colors.background }}
              title="Mark as paid and permanent (won't be reset daily)"
            >
              Mark Permanent
            </button>
          </div>
        ) : !expense.permanent ? (
          <div className="mt-3">
            <button
              onClick={() => onMakePermanent(expense._id)}
              className="w-full px-3 py-1 rounded-lg text-sm font-medium transition-colors"
              style={{ backgroundColor: colors.secondary + '20', color: colors.secondary, border: `1px solid ${colors.secondary}` }}
              title="Make this payment permanent (won't be reset daily)"
            >
              Make Permanent
            </button>
          </div>
        ) : null}
      </div>
    </motion.div>
  );
};

export default ExpenseCard;
