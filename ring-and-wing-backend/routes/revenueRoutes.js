const express = require('express');
const router = express.Router();
const Order = require('../models/Order');
const Expense = require('../models/expense');
// timezone-aware weekly logic removed to revert to last known working commit
const {
  getBusinessTimeZone,
  getBusinessDayRangeUtc,
  formatBusinessDateKey,
  businessDateTimeUtc,
  isDateOnlyString
} = require('../utils/businessTime');

// Helper function to get date range
const getDateRange = (period, { weekStart = 0 } = {}) => {
  const now = new Date();
  const tz = getBusinessTimeZone();
  const { dateKey, startOfDayUtc } = getBusinessDayRangeUtc(now, tz);

  switch (period) {
    case 'daily':
      return { start: startOfDayUtc, end: now };
    case 'weekly': {
      // Determine weekday in PH using noon (avoids cross-day UTC conversion issues).
      const phNoon = businessDateTimeUtc(dateKey, 12, 0, 0, 0, tz);
      const weekday = phNoon.getUTCDay(); // safe because PH noon stays same calendar day in UTC
      const diff = (7 + weekday - weekStart) % 7;
      const weekStartKey = formatBusinessDateKey(new Date(phNoon.getTime() - diff * 24 * 60 * 60 * 1000), tz);
      return { start: businessDateTimeUtc(weekStartKey, 0, 0, 0, 0, tz), end: now };
    }
    case 'monthly': {
      const monthStartKey = `${dateKey.slice(0, 7)}-01`;
      return { start: businessDateTimeUtc(monthStartKey, 0, 0, 0, 0, tz), end: now };
    }
    case 'yearly': {
      const yearStartKey = `${dateKey.slice(0, 4)}-01-01`;
      return { start: businessDateTimeUtc(yearStartKey, 0, 0, 0, 0, tz), end: now };
    }
    default:
      return { start: startOfDayUtc, end: now };
  }
};

// ============================================
// SPECIFIC ROUTES MUST COME BEFORE /:period
// ============================================

// Get comprehensive yearly revenue report with expenses
router.get('/yearly-report', async (req, res) => {
  try {
    const { year, startMonth, endMonth, startDate, endDate } = req.query;

    const tz = getBusinessTimeZone();
    const asKey = (value) => (isDateOnlyString(value) ? value : formatBusinessDateKey(new Date(value), tz));
    
    // Determine date range
    let start, end;
    let rangeStartKey, rangeEndKey;
    
    if (startDate && endDate) {
      // Custom date range
      rangeStartKey = asKey(startDate);
      rangeEndKey = asKey(endDate);
      start = businessDateTimeUtc(rangeStartKey, 0, 0, 0, 0, tz);
      end = businessDateTimeUtc(rangeEndKey, 23, 59, 59, 999, tz);
    } else if (year) {
      // Year-based with optional month range
      const targetYear = parseInt(year, 10);
      const sMonth = startMonth ? parseInt(startMonth, 10) - 1 : 0;
      const eMonth = endMonth ? parseInt(endMonth, 10) - 1 : 11;

      const startMonthNum = sMonth + 1;
      const endMonthNum = eMonth + 1;
      const endMonthLastDay = new Date(Date.UTC(targetYear, endMonthNum, 0)).getUTCDate();

      rangeStartKey = `${targetYear}-${String(startMonthNum).padStart(2, '0')}-01`;
      rangeEndKey = `${targetYear}-${String(endMonthNum).padStart(2, '0')}-${String(endMonthLastDay).padStart(2, '0')}`;

      start = businessDateTimeUtc(rangeStartKey, 0, 0, 0, 0, tz);
      end = businessDateTimeUtc(rangeEndKey, 23, 59, 59, 999, tz);
    } else {
      // Default to current year
      const now = new Date();
      const yearKey = formatBusinessDateKey(now, tz).slice(0, 4);
      rangeStartKey = `${yearKey}-01-01`;
      rangeEndKey = `${yearKey}-12-31`;
      start = businessDateTimeUtc(rangeStartKey, 0, 0, 0, 0, tz);
      end = businessDateTimeUtc(rangeEndKey, 23, 59, 59, 999, tz);
    }
    
    console.log('[Yearly Report] Fetching data from', start, 'to', end);
    
    // Fetch orders in date range
    const orders = await Order.find({
      createdAt: { $gte: start, $lte: end },
      paymentMethod: { $ne: 'pending' }
    });
    
    console.log('[Yearly Report] Found', orders.length, 'orders');
    
    // Fetch expenses in date range
    const expenses = await Expense.find({
      date: { $gte: start, $lte: end }
    });
    
    console.log('[Yearly Report] Found', expenses.length, 'expenses');
    
    // Calculate total revenue
    const totalRevenue = orders.reduce((acc, order) => acc + (order.totals?.total || 0), 0);
    
    // Calculate total expenses
    const totalExpenses = expenses.reduce((acc, exp) => acc + (exp.amount || 0), 0);
    
    // Calculate net revenue
    const netRevenue = totalRevenue - totalExpenses;
    
    // Generate monthly breakdown
    const monthlyBreakdown = [];

    const [startYearNum, startMonthNum] = rangeStartKey.split('-').map(Number);
    const [endYearNum, endMonthNum] = rangeEndKey.split('-').map(Number);
    let currentYear = startYearNum;
    let currentMonth = startMonthNum;
    while (currentYear < endYearNum || (currentYear === endYearNum && currentMonth <= endMonthNum)) {
      const monthStartKey = `${currentYear}-${String(currentMonth).padStart(2, '0')}-01`;
      const lastDay = new Date(Date.UTC(currentYear, currentMonth, 0)).getUTCDate();
      const monthEndKey = `${currentYear}-${String(currentMonth).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`;

      const monthStart = businessDateTimeUtc(monthStartKey, 0, 0, 0, 0, tz);
      const monthEnd = businessDateTimeUtc(monthEndKey, 23, 59, 59, 999, tz);
      
      const monthOrders = orders.filter(o => {
        const orderDate = new Date(o.createdAt);
        return orderDate >= monthStart && orderDate <= monthEnd;
      });
      
      const monthExpenses = expenses.filter(e => {
        const expenseDate = new Date(e.date);
        return expenseDate >= monthStart && expenseDate <= monthEnd;
      });
      
      const monthRevenue = monthOrders.reduce((a, o) => a + (o.totals?.total || 0), 0);
      const monthExpenseTotal = monthExpenses.reduce((a, e) => a + (e.amount || 0), 0);

      currentMonth += 1;
      if (currentMonth > 12) {
        currentMonth = 1;
        currentYear += 1;
      }
      
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
      const category = exp.category || 'Uncategorized';
      acc[category] = (acc[category] || 0) + (exp.amount || 0);
      return acc;
    }, {});
    
    // Best selling items in the period
    const itemStats = orders.reduce((acc, order) => {
      (order.items || []).forEach(item => {
        if (!acc[item.name]) {
          acc[item.name] = { quantity: 0, revenue: 0 };
        }
        acc[item.name].quantity += item.quantity || 0;
        acc[item.name].revenue += (item.price || 0) * (item.quantity || 0);
      });
      return acc;
    }, {});
    
    const topItems = Object.entries(itemStats)
      .map(([name, stats]) => ({ name, ...stats }))
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, 10);
    
    const profitMargin = totalRevenue > 0 ? ((netRevenue / totalRevenue) * 100).toFixed(2) : '0.00';
    
    console.log('[Yearly Report] Summary:', { totalRevenue, totalExpenses, netRevenue, profitMargin });
    
    res.json({
      success: true,
      data: {
        period: { start, end },
        summary: {
          totalRevenue,
          totalExpenses,
          netRevenue,
          profitMargin,
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
    console.error('[Yearly Report] Error:', error);
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

// ============================================
// DYNAMIC /:period ROUTE MUST COME LAST
// ============================================

// Get revenue statistics
router.get('/:period', async (req, res) => {
  try {
    const { period } = req.params;
    // read weekStart and timezone query params (optional)
    const weekStartParam = typeof req.query.weekStart !== 'undefined' ? parseInt(req.query.weekStart, 10) : undefined; // 0=Sunday .. 6=Saturday
    const tz = req.query.tz || process.env.BUSINESS_TIMEZONE || 'Asia/Manila';

    // get initial start/end
    let { start, end } = getDateRange(period, {
      weekStart: Number.isInteger(weekStartParam) ? weekStartParam : 0
    });

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
      const hourStr = new Intl.DateTimeFormat('en-US', {
        timeZone: tz,
        hour: '2-digit',
        hour12: false
      }).format(new Date(order.createdAt));
      const hour = parseInt(hourStr, 10);
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
      const year = formatBusinessDateKey(start, tz).slice(0, 4);
      const byMonth = orders.reduce((acc, order) => {
        const monthKey = formatBusinessDateKey(new Date(order.createdAt), tz).slice(0, 7);
        acc[monthKey] = acc[monthKey] || { revenue: 0, orders: 0 };
        acc[monthKey].revenue += order.totals.total;
        acc[monthKey].orders += 1;
        return acc;
      }, {});

      monthlyBreakdown = Array.from({ length: 12 }).map((_, idx) => {
        const mm = String(idx + 1).padStart(2, '0');
        const monthKey = `${year}-${mm}`;
        const mStartKey = `${monthKey}-01`;
        const mStart = businessDateTimeUtc(mStartKey, 0, 0, 0, 0, tz);
        const nextMonthStart = idx === 11
          ? businessDateTimeUtc(`${parseInt(year, 10) + 1}-01-01`, 0, 0, 0, 0, tz)
          : businessDateTimeUtc(`${year}-${String(idx + 2).padStart(2, '0')}-01`, 0, 0, 0, 0, tz);
        const mEnd = new Date(nextMonthStart.getTime() - 1);

        return {
          month: mStart.toLocaleDateString('en-US', { month: 'short', year: 'numeric' }),
          revenue: byMonth[monthKey]?.revenue || 0,
          orders: byMonth[monthKey]?.orders || 0,
          start: mStart,
          end: mEnd
        };
      });
    }

    // For weekly reports include a daily breakdown for the week
    let weeklyBreakdown = null;
    if (period === 'weekly') {
      const startKey = formatBusinessDateKey(start, tz);
      const endKey = formatBusinessDateKey(end, tz);
      const startOfStartKeyUtc = businessDateTimeUtc(startKey, 0, 0, 0, 0, tz);
      const days = [];

      for (
        let cursor = startOfStartKeyUtc;
        formatBusinessDateKey(cursor, tz) <= endKey;
        cursor = new Date(cursor.getTime() + 24 * 60 * 60 * 1000)
      ) {
        const dateKey = formatBusinessDateKey(cursor, tz);
        const dayStart = businessDateTimeUtc(dateKey, 0, 0, 0, 0, tz);
        const dayEnd = businessDateTimeUtc(dateKey, 23, 59, 59, 999, tz);
        const dayOrders = orders.filter(o => {
          const created = new Date(o.createdAt);
          return created >= dayStart && created <= dayEnd;
        });

        const dayRevenue = dayOrders.reduce((a, o) => a + o.totals.total, 0);
        days.push({
          date: dateKey,
          label: new Date(`${dateKey}T00:00:00+08:00`).toLocaleDateString('en-US', { weekday: 'short' }),
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

module.exports = router;