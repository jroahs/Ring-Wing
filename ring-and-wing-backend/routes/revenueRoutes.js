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
    
    const orders = await Order.find({
      createdAt: { $gte: start, $lte: end },
      status: 'completed'
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
        hourlyDistribution,
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