const express = require('express');
const router = express.Router();
const Order = require('../models/Order');
// timezone-aware weekly logic removed to revert to last known working commit

// Helper function to get date range
const getDateRange = (period) => {
  const now = new Date();
  const start = new Date();
  
  switch(period) {
    case 'daily':
      start.setHours(0, 0, 0, 0);
      break;
    case 'weekly':
      start.setDate(now.getDate() - now.getDay());
      start.setHours(0, 0, 0, 0);
      break;
    case 'monthly':
      start.setDate(1);
      start.setHours(0, 0, 0, 0);
      break;
    case 'yearly':
      // Start of the current year
      start.setMonth(0);
      start.setDate(1);
      start.setHours(0, 0, 0, 0);
      break;
    default:
      start.setHours(0, 0, 0, 0);
  }
  
  return { start, end: now };
};

// Get revenue statistics
router.get('/:period', async (req, res) => {
  try {
    const { period } = req.params;
    // read weekStart and timezone query params (optional)
    const weekStartParam = typeof req.query.weekStart !== 'undefined' ? parseInt(req.query.weekStart, 10) : undefined; // 0=Sunday .. 6=Saturday
    const tz = req.query.tz || process.env.BUSINESS_TIMEZONE || 'Asia/Manila';

    // get initial start/end
    let { start, end } = getDateRange(period);

    // weekly logic uses the original simple start/end range
    
    // Include all orders that have a valid payment method (not 'pending')
    // This ensures we count orders from all sources: POS, self-checkout, and chatbot
    const orders = await Order.find({
      createdAt: { $gte: start, $lte: end },
      paymentMethod: { $ne: 'pending' }  // Only exclude pending payment orders
    });

    // Calculate revenue metrics
    const revenue = orders.reduce((acc, order) => acc + order.totals.total, 0);
    const totalOrders = orders.length;
    const itemsSold = orders.reduce((acc, order) => 
      acc + order.items.reduce((sum, item) => sum + item.quantity, 0), 0);
    
    // Calculate revenue by payment method
    const revenueByPayment = orders.reduce((acc, order) => {
      const method = order.paymentMethod;
      acc[method] = (acc[method] || 0) + order.totals.total;
      return acc;
    }, {});

    // Calculate revenue by order source
    const revenueBySource = orders.reduce((acc, order) => {
      const source = order.orderType || 'pos';  // Default to 'pos' if not specified
      acc[source] = (acc[source] || 0) + order.totals.total;
      return acc;
    }, {});

    // Calculate hourly distribution for daily reports
    const hourlyDistribution = period === 'daily' ? orders.reduce((acc, order) => {
      const hour = new Date(order.createdAt).getHours();
      acc[hour] = (acc[hour] || 0) + order.totals.total;
      return acc;
    }, {}) : null;

    // Best selling items
    const itemStats = orders.reduce((acc, order) => {
      order.items.forEach(item => {
        if (!acc[item.name]) {
          acc[item.name] = { quantity: 0, revenue: 0 };
        }
        acc[item.name].quantity += item.quantity;
        acc[item.name].revenue += item.price * item.quantity;
      });
      return acc;
    }, {});

    const topItems = Object.entries(itemStats)
      .map(([name, stats]) => ({ name, ...stats }))
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, 5);

    // For yearly reports include a monthly breakdown for the year
    let monthlyBreakdown = null;
    if (period === 'yearly') {
      const yearStart = new Date(start.getFullYear(), 0, 1);
      const months = Array.from({ length: 12 }).map((_, idx) => {
        const mStart = new Date(yearStart.getFullYear(), idx, 1);
        const mEnd = new Date(yearStart.getFullYear(), idx + 1, 0, 23, 59, 59);
        const monthOrders = orders.filter(o => new Date(o.createdAt) >= mStart && new Date(o.createdAt) <= mEnd);
        const monthRevenue = monthOrders.reduce((a, o) => a + o.totals.total, 0);
        return {
          month: mStart.toLocaleDateString('en-US', { month: 'short', year: 'numeric' }),
          revenue: monthRevenue,
          orders: monthOrders.length,
          start: mStart,
          end: mEnd
        };
      });
      monthlyBreakdown = months;
    }

    // For weekly reports include a daily breakdown for the week
    let weeklyBreakdown = null;
    if (period === 'weekly') {
      // Create an array of days from start to end
      const startDay = new Date(start.getFullYear(), start.getMonth(), start.getDate());
      const endDay = new Date(end.getFullYear(), end.getMonth(), end.getDate());
      const days = [];
      for (let d = new Date(startDay); d <= endDay; d.setDate(d.getDate() + 1)) {
        const dayStart = new Date(d.getFullYear(), d.getMonth(), d.getDate(), 0, 0, 0);
        const dayEnd = new Date(d.getFullYear(), d.getMonth(), d.getDate(), 23, 59, 59);
        const dayOrders = orders.filter(o => new Date(o.createdAt) >= dayStart && new Date(o.createdAt) <= dayEnd);
        const dayRevenue = dayOrders.reduce((a, o) => a + o.totals.total, 0);
        days.push({
          date: dayStart.toISOString().split('T')[0],
          label: dayStart.toLocaleDateString('en-US', { weekday: 'short' }),
          revenue: dayRevenue,
          orders: dayOrders.length,
          start: dayStart,
          end: dayEnd
        });
      }
      weeklyBreakdown = days;
    }

    res.json({
      success: true,
      data: {
        period,
        timeframe: { start, end },
        summary: {
          totalRevenue: revenue,
          orderCount: totalOrders,
          itemsSold,
          averageOrderValue: totalOrders > 0 ? revenue / totalOrders : 0
        },
        revenueByPayment,
        revenueBySource,
        hourlyDistribution,
        weeklyBreakdown,
        monthlyBreakdown,
        topItems
      }    });  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Get historical monthly revenue data (last 12 months)
router.get('/historical/monthly', async (req, res) => {
  try {
    const currentDate = new Date();
    const monthlyData = [];

    // Get data for last 12 months
    for (let i = 11; i >= 0; i--) {
      const monthStart = new Date(currentDate.getFullYear(), currentDate.getMonth() - i, 1);
      const monthEnd = new Date(currentDate.getFullYear(), currentDate.getMonth() - i + 1, 0, 23, 59, 59);
      
      // Get orders for this month
      const orders = await Order.find({
        createdAt: { $gte: monthStart, $lte: monthEnd },
        paymentMethod: { $ne: 'pending' }
      });

      // Calculate metrics for this month
      const revenue = orders.reduce((acc, order) => acc + order.totals.total, 0);
      const orderCount = orders.length;
      
      monthlyData.push({
        month: monthStart.toLocaleDateString('en-US', { month: 'short', year: '2-digit' }),
        revenue: revenue,
        orders: orderCount,
        fullDate: monthStart
      });
    }

    res.json({
      success: true,
      data: monthlyData
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Get historical yearly revenue data (last N years, default 5)
router.get('/historical/yearly', async (req, res) => {
  try {
    const years = parseInt(req.query.years, 10) || 5;
    const currentYear = new Date().getFullYear();
    const yearlyData = [];

    for (let i = years - 1; i >= 0; i--) {
      const year = currentYear - i;
      const start = new Date(year, 0, 1);
      const end = new Date(year, 11, 31, 23, 59, 59);

      const orders = await Order.find({
        createdAt: { $gte: start, $lte: end },
        paymentMethod: { $ne: 'pending' }
      });

      const revenue = orders.reduce((acc, order) => acc + order.totals.total, 0);

      yearlyData.push({
        year,
        revenue,
        orders: orders.length,
        start,
        end
      });
    }

    res.json({
      success: true,
      data: yearlyData
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Get comprehensive yearly revenue report with expenses
router.get('/yearly-report', async (req, res) => {
  try {
    const { year, startMonth, endMonth, startDate, endDate } = req.query;
    const Expense = require('../models/expense');
    
    // Determine date range
    let start, end;
    
    if (startDate && endDate) {
      // Custom date range
      start = new Date(startDate);
      end = new Date(endDate);
      end.setHours(23, 59, 59, 999);
    } else if (year) {
      // Year-based with optional month range
      const targetYear = parseInt(year, 10);
      const sMonth = startMonth ? parseInt(startMonth, 10) - 1 : 0;
      const eMonth = endMonth ? parseInt(endMonth, 10) - 1 : 11;
      
      start = new Date(targetYear, sMonth, 1);
      end = new Date(targetYear, eMonth + 1, 0, 23, 59, 59, 999);
    } else {
      // Default to current year
      const currentYear = new Date().getFullYear();
      start = new Date(currentYear, 0, 1);
      end = new Date(currentYear, 11, 31, 23, 59, 59, 999);
    }
    
    // Fetch orders in date range
    const orders = await Order.find({
      createdAt: { $gte: start, $lte: end },
      paymentMethod: { $ne: 'pending' }
    });
    
    // Fetch expenses in date range
    const expenses = await Expense.find({
      date: { $gte: start, $lte: end }
    });
    
    // Calculate total revenue
    const totalRevenue = orders.reduce((acc, order) => acc + order.totals.total, 0);
    
    // Calculate total expenses
    const totalExpenses = expenses.reduce((acc, exp) => acc + exp.amount, 0);
    
    // Calculate net revenue
    const netRevenue = totalRevenue - totalExpenses;
    
    // Generate monthly breakdown
    const monthlyBreakdown = [];
    const currentDate = new Date(start);
    
    while (currentDate <= end) {
      const monthStart = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1);
      const monthEnd = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0, 23, 59, 59, 999);
      
      const monthOrders = orders.filter(o => {
        const orderDate = new Date(o.createdAt);
        return orderDate >= monthStart && orderDate <= monthEnd;
      });
      
      const monthExpenses = expenses.filter(e => {
        const expenseDate = new Date(e.date);
        return expenseDate >= monthStart && expenseDate <= monthEnd;
      });
      
      const monthRevenue = monthOrders.reduce((a, o) => a + o.totals.total, 0);
      const monthExpenseTotal = monthExpenses.reduce((a, e) => a + e.amount, 0);
      
      monthlyBreakdown.push({
        month: monthStart.toLocaleDateString('en-US', { month: 'short', year: 'numeric' }),
        monthIndex: currentDate.getMonth(),
        year: currentDate.getFullYear(),
        revenue: monthRevenue,
        expenses: monthExpenseTotal,
        netRevenue: monthRevenue - monthExpenseTotal,
        orderCount: monthOrders.length,
        expenseCount: monthExpenses.length
      });
      
      currentDate.setMonth(currentDate.getMonth() + 1);
    }
    
    // Generate quarterly breakdown
    const quarterlyBreakdown = [];
    const quarters = [
      { name: 'Q1', months: [0, 1, 2] },
      { name: 'Q2', months: [3, 4, 5] },
      { name: 'Q3', months: [6, 7, 8] },
      { name: 'Q4', months: [9, 10, 11] }
    ];
    
    quarters.forEach((quarter, index) => {
      const quarterMonths = monthlyBreakdown.filter(m => quarter.months.includes(m.monthIndex));
      
      if (quarterMonths.length > 0) {
        const quarterRevenue = quarterMonths.reduce((a, m) => a + m.revenue, 0);
        const quarterExpenses = quarterMonths.reduce((a, m) => a + m.expenses, 0);
        
        quarterlyBreakdown.push({
          quarter: quarter.name,
          quarterIndex: index + 1,
          revenue: quarterRevenue,
          expenses: quarterExpenses,
          netRevenue: quarterRevenue - quarterExpenses,
          orderCount: quarterMonths.reduce((a, m) => a + m.orderCount, 0),
          expenseCount: quarterMonths.reduce((a, m) => a + m.expenseCount, 0)
        });
      }
    });
    
    // Calculate expense breakdown by category
    const expenseByCategory = expenses.reduce((acc, exp) => {
      acc[exp.category] = (acc[exp.category] || 0) + exp.amount;
      return acc;
    }, {});
    
    // Best selling items in the period
    const itemStats = orders.reduce((acc, order) => {
      order.items.forEach(item => {
        if (!acc[item.name]) {
          acc[item.name] = { quantity: 0, revenue: 0 };
        }
        acc[item.name].quantity += item.quantity;
        acc[item.name].revenue += item.price * item.quantity;
      });
      return acc;
    }, {});
    
    const topItems = Object.entries(itemStats)
      .map(([name, stats]) => ({ name, ...stats }))
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, 10);
    
    res.json({
      success: true,
      data: {
        period: { start, end },
        summary: {
          totalRevenue,
          totalExpenses,
          netRevenue,
          profitMargin: totalRevenue > 0 ? ((netRevenue / totalRevenue) * 100).toFixed(2) : 0,
          totalOrders: orders.length,
          totalExpenseRecords: expenses.length
        },
        monthlyBreakdown,
        quarterlyBreakdown,
        expenseByCategory,
        topItems
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Get all-time top items (never resets)
router.get('/top-items/all-time', async (req, res) => {
  try {
    // Get ALL orders ever (no date filter)
    const orders = await Order.find({
      paymentMethod: { $ne: 'pending' }  // Only exclude pending payment orders
    });

    // Calculate all-time item statistics
    const itemStats = orders.reduce((acc, order) => {
      order.items.forEach(item => {
        if (!acc[item.name]) {
          acc[item.name] = { quantity: 0, revenue: 0 };
        }
        acc[item.name].quantity += item.quantity;
        acc[item.name].revenue += item.price * item.quantity;
      });
      return acc;
    }, {});

    // Get top 10 items by revenue (all-time)
    const topItems = Object.entries(itemStats)
      .map(([name, stats]) => ({ name, ...stats }))
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, 10);

    res.json({
      success: true,
      data: {
        totalOrders: orders.length,
        totalRevenue: orders.reduce((acc, order) => acc + order.totals.total, 0),
        topItems
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

module.exports = router;