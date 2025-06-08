const express = require('express');
const mongoose = require('mongoose');
require('./config/db');

const Order = require('./models/Order');

async function testRevenue() {
  try {
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    // Check if we have any orders
    const allOrders = await Order.find({});
    console.log('Total orders in database:', allOrders.length);
    
    if (allOrders.length > 0) {
      console.log('Sample order structure:');
      const sample = allOrders[0];
      console.log('- _id:', sample._id);
      console.log('- receiptNumber:', sample.receiptNumber);
      console.log('- createdAt:', sample.createdAt);
      console.log('- totals.total:', sample.totals.total);
      console.log('- paymentMethod:', sample.paymentMethod);
    }
    
    // Test the daily revenue query
    const now = new Date();
    const start = new Date();
    start.setHours(0, 0, 0, 0);
    
    console.log('Date range for today:');
    console.log('- Start:', start.toISOString());
    console.log('- End:', now.toISOString());
    
    const orders = await Order.find({
      createdAt: { $gte: start, $lte: now },
      paymentMethod: { $ne: 'pending' }
    });
    
    console.log('Orders for today:', orders.length);
    
    if (orders.length > 0) {
      const revenue = orders.reduce((acc, order) => acc + order.totals.total, 0);
      console.log('Total revenue for today:', revenue);
      
      orders.forEach((order, index) => {
        console.log(`Order ${index + 1}:`, {
          receiptNumber: order.receiptNumber,
          total: order.totals.total,
          createdAt: order.createdAt,
          paymentMethod: order.paymentMethod
        });
      });
    }
    
    process.exit(0);
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

testRevenue();
