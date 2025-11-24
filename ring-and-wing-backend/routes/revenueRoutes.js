const express = require('express');
const router = express.Router();
const Order = require('../models/Order');
const { utcToZonedTime, zonedTimeToUtc, format } = require('date-fns-tz');
const { startOfWeek, addDays } = require('date-fns');

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

    // For weekly we want a full 7-day week according to weekStart and timezone
    if (period === 'weekly') {
      // Default to Monday (1) if not provided
      const weekStart = Number.isInteger(weekStartParam) ? weekStartParam : 1;

      // Convert now to timezone-aware date
      const nowZoned = utcToZonedTime(new Date(), tz);

      // Compute start of the week in the target timezone using date-fns startOfWeek and then convert back to UTC boundaries
      const zoneStartOfWeek = startOfWeek(nowZoned, { weekStartsOn: weekStart });

      // Start at 00:00:00 of zoneStartOfWeek and end at end of that 7th day
      const zoneStart = new Date(zoneStartOfWeek.setHours(0, 0, 0, 0));
      const zoneEnd = addDays(zoneStart, 6);
      zoneEnd.setHours(23, 59, 59, 999);

      // Convert zoned start/end back to UTC for DB queries
      const utcStart = zonedTimeToUtc(zoneStart, tz);
      const utcEnd = zonedTimeToUtc(zoneEnd, tz);

      start = utcStart;
      end = utcEnd;
    }
    
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

    // For weekly reports include a daily breakdown for the week (always 7 days, timezone-aware)
    let weeklyBreakdown = null;
    if (period === 'weekly') {
      // Use timezone from above
      const weekStart = typeof req.query.weekStart !== 'undefined' ? parseInt(req.query.weekStart, 10) : 1;

      // Convert start to zoned time
      const startZoned = utcToZonedTime(start, tz);

      // Build 7-day series anchored on startZoned (which is at 00:00 in zone)
      const days = [];
      for (let i = 0; i < 7; i++) {
        const dStartZoned = addDays(startZoned, i);
        dStartZoned.setHours(0, 0, 0, 0);
        const dEndZoned = addDays(dStartZoned, 0);
        dEndZoned.setHours(23, 59, 59, 999);

        // Convert the zoned day bounds back to UTC for DB filtering
        const dStartUtc = zonedTimeToUtc(dStartZoned, tz);
        const dEndUtc = zonedTimeToUtc(dEndZoned, tz);

        const dayOrders = orders.filter(o => new Date(o.createdAt) >= dStartUtc && new Date(o.createdAt) <= dEndUtc);
        const dayRevenue = dayOrders.reduce((a, o) => a + o.totals.total, 0);

        days.push({
          date: format(dStartZoned, 'yyyy-MM-dd', { timeZone: tz }),
          label: format(dStartZoned, 'EEE', { timeZone: tz }),
          revenue: dayRevenue,
          orders: dayOrders.length,
          start: dStartUtc,
          end: dEndUtc
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