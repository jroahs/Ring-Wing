const express = require('express');
const router = express.Router();
const InventoryAvailabilityService = require('../services/inventoryAvailabilityService');
const InventoryReservationService = require('../services/inventoryReservationService');
const InventoryBusinessLogicService = require('../services/inventoryBusinessLogicService');

console.log('🔧 Inventory routes loaded successfully!');

// Test endpoint to verify routes are loaded
router.get('/test', async (req, res) => {
  console.log('📍 Test endpoint called');
  res.json({
    success: true,
    message: 'Inventory routes are working!',
    timestamp: new Date().toISOString()
  });
});

// Get inventory alerts
router.get('/alerts', async (req, res) => {
  try {
    const alerts = await InventoryBusinessLogicService.generateInventoryAlerts();
    res.json({
      success: true,
      data: alerts
    });
  } catch (error) {
    console.error('Error getting inventory alerts:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get inventory alerts',
      error: error.message
    });
  }
});

// Get active reservations
router.get('/reservations', async (req, res) => {
  try {
    const reservations = await InventoryReservationService.getActiveReservations();
    res.json({
      success: true,
      data: reservations
    });
  } catch (error) {
    console.error('Error getting active reservations:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get active reservations',
      error: error.message
    });
  }
});

// Create inventory reservation
router.post('/reserve', async (req, res) => {
  try {
    const { orderId, items, reservedBy } = req.body;
    
    if (!orderId || !items || !Array.isArray(items) || items.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Invalid request: orderId and items array are required'
      });
    }

    const reservation = await InventoryReservationService.createReservation({
      orderId,
      items,
      reservedBy: reservedBy || 'test-user'
    });

    res.json({
      success: true,
      data: reservation
    });
  } catch (error) {
    console.error('Error creating reservation:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create reservation',
      error: error.message
    });
  }
});

// Generate inventory report
router.get('/reports', async (req, res) => {
  try {
    const { startDate, endDate, type = 'comprehensive' } = req.query;
    
    const report = await InventoryBusinessLogicService.generateInventoryReport({
      startDate: startDate || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000), // Default 30 days ago
      endDate: endDate || new Date(),
      type
    });

    res.json({
      success: true,
      data: report
    });
  } catch (error) {
    console.error('Error generating inventory report:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to generate inventory report',
      error: error.message
    });
  }
});

module.exports = router;