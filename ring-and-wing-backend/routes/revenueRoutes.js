const express = require('express');
const router = express.Router();
const Order = require('../models/Order');

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
    default:
      start.setHours(0, 0, 0, 0);
  }
  
  return { start, end: now };
};

// Get revenue statistics
router.get('/:period', async (req, res) => {
  try {
    const { period } = req.params;
    const { start, end } = getDateRange(period);
    
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