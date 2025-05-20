const express = require('express');
const router = express.Router();
const Item = require('../models/Items');

// Helper functions
const calculateStatus = (inventory, minimumThreshold = 5, unit = 'pieces') => {
  const total = inventory.reduce((sum, batch) => sum + batch.quantity, 0);
  
  // Dynamic threshold based on unit type
  const threshold = minimumThreshold || 
    (unit === 'pieces' ? 5 :
     unit === 'grams' ? 500 :
     unit === 'kilograms' ? 0.5 :
     unit === 'milliliters' ? 500 :
     unit === 'liters' ? 0.5 : 5);
     
  if (total === 0) return 'Out of Stock';
  if (total <= threshold) return 'Low Stock';
  return 'In Stock';
};

const getExpirationAlerts = (inventory) => {
  const now = new Date();
  return inventory.map(batch => {
    const expirationDate = new Date(batch.expirationDate);
    
    // PH time calculation
    const phExpirationMidnight = new Date(
      Date.UTC(
        expirationDate.getUTCFullYear(),
        expirationDate.getUTCMonth(),
        expirationDate.getUTCDate(),
        16, 0, 0, 0 // 16:00 UTC = 00:00 PH time (UTC+8)
      )
    );

    const phNowMidnight = new Date(
      Date.UTC(
        now.getUTCFullYear(),
        now.getUTCMonth(),
        now.getUTCDate(),
        16, 0, 0, 0
      )
    );

    const timeDiff = phExpirationMidnight - phNowMidnight;
    const daysLeft = Math.floor(timeDiff / (1000 * 3600 * 24));

    return { 
      ...batch,
      daysLeft 
    };
  }).filter(batch => Math.abs(batch.daysLeft) <= 7);
};

// Unit conversion helpers
const conversionFactors = {
  // Weight conversions
  'grams_to_kilograms': 0.001,
  'kilograms_to_grams': 1000,
  // Volume conversions
  'milliliters_to_liters': 0.001,
  'liters_to_milliliters': 1000
};

const convertUnit = (value, fromUnit, toUnit) => {
  if (fromUnit === toUnit) return value;
  
  const conversionKey = `${fromUnit}_to_${toUnit}`;
  if (!conversionFactors[conversionKey]) {
    throw new Error(`Unsupported conversion: ${fromUnit} to ${toUnit}`);
  }
  
  return value * conversionFactors[conversionKey];
};

// Get all items
router.get('/', async (req, res) => {
  try {
    const items = await Item.find().lean();
    const formattedItems = items.map(item => ({
      ...item,
      totalQuantity: item.inventory.reduce((sum, b) => sum + b.quantity, 0),
      status: calculateStatus(item.inventory, item.minimumThreshold, item.unit),
      expirationAlerts: getExpirationAlerts(item.inventory)
    }));
    
    res.json(formattedItems);
  } catch (err) {
    res.status(500).json({ message: 'Server Error: ' + err.message });
  }
});

// Get item by ID
router.get('/:id', async (req, res) => {
  try {
    const item = await Item.findById(req.params.id).lean();
    if (!item) {
      return res.status(404).json({ message: 'Item not found' });
    }
    
    res.json({
      ...item,
      totalQuantity: item.inventory.reduce((sum, b) => sum + b.quantity, 0),
      status: calculateStatus(item.inventory, item.minimumThreshold, item.unit)
    });
  } catch (err) {
    res.status(500).json({ message: 'Server Error: ' + err.message });
  }
});

// Create new item
router.post('/', async (req, res) => {
  try {
    const { inventory = [], ...itemData } = req.body;
    
    if (!Array.isArray(inventory)) {
      return res.status(400).json({ message: 'Inventory must be an array' });
    }

    const validatedInventory = inventory.map(batch => ({
      quantity: Number(batch.quantity),
      expirationDate: new Date(batch.expirationDate),
      dailyStartQuantity: Number(batch.quantity),
      lastTallied: new Date()
    }));

    const item = new Item({
      ...itemData,
      isCountBased: itemData.unit === 'pieces',
      inventory: validatedInventory
    });

    const newItem = await item.save();
    res.status(201).json(newItem);
  } catch (err) {
    res.status(400).json({ message: 'Validation Error: ' + err.message });
  }
});

// Update item
router.put('/:id', async (req, res) => {
  try {
    const updatedItem = await Item.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true, runValidators: true }
    ).lean();
    
    if (!updatedItem) {
      return res.status(404).json({ message: 'Item not found' });
    }

    res.json({
      ...updatedItem,
      totalQuantity: updatedItem.inventory.reduce((sum, b) => sum + b.quantity, 0),
      status: calculateStatus(updatedItem.inventory, updatedItem.minimumThreshold, updatedItem.unit)
    });
  } catch (err) {
    res.status(400).json({ message: 'Update Error: ' + err.message });
  }
});

// Delete item
router.delete('/:id', async (req, res) => {
  try {
    const item = await Item.findByIdAndDelete(req.params.id);
    if (!item) {
      return res.status(404).json({ message: 'Item not found' });
    }
    res.json({ message: 'Item deleted successfully' });
  } catch (err) {
    res.status(500).json({ message: 'Deletion Error: ' + err.message });
  }
});

// Restock item
router.patch('/:id/restock', async (req, res) => {
  try {
    const { quantity, expirationDate } = req.body;
    
    if (!quantity || !expirationDate) {
      return res.status(400).json({ message: 'Quantity and expiration date are required' });
    }

    const expDate = new Date(expirationDate);
    if (isNaN(expDate)) {
      return res.status(400).json({ message: 'Invalid expiration date format' });
    }

    const item = await Item.findById(req.params.id);
    if (!item) {
      return res.status(404).json({ message: 'Item not found' });
    }

    item.inventory.push({
      quantity: Number(quantity),
      expirationDate: expDate,
      dailyStartQuantity: Number(quantity),
      lastTallied: new Date()
    });

    const updatedItem = await item.save();
    res.json({
      ...updatedItem.toObject(),
      totalQuantity: updatedItem.totalQuantity,
      status: updatedItem.status
    });
  } catch (err) {
    res.status(400).json({ message: 'Restock Error: ' + err.message });
  }
});

// Daily inventory operations

// Start day - record starting quantities for all inventory items
router.post('/start-day', async (req, res) => {
  try {
    const items = await Item.find();
    
    for (const item of items) {
      item.inventory.forEach(batch => {
        batch.dailyStartQuantity = batch.quantity;
        batch.lastTallied = new Date();
      });
      await item.save();
    }
    
    res.json({ message: 'Starting inventory recorded for all items' });
  } catch (err) {
    res.status(500).json({ message: 'Error starting day: ' + err.message });
  }
});

// End day - record ending quantities for specific item
router.patch('/:id/end-day', async (req, res) => {
  try {
    const { endQuantities } = req.body;
    
    if (!endQuantities || !Array.isArray(endQuantities)) {
      return res.status(400).json({ message: 'End quantities must be provided as an array' });
    }
    
    const item = await Item.findById(req.params.id);
    if (!item) {
      return res.status(404).json({ message: 'Item not found' });
    }
    
    // Track if any batch was updated
    let batchUpdated = false;
    
    // Map the provided end quantities to batch IDs
    endQuantities.forEach(endQty => {
      const batch = item.inventory.id(endQty.batchId);
      if (batch) {
        batch.dailyEndQuantity = Number(endQty.quantity);
        batch.quantity = Number(endQty.quantity); // Update actual quantity to match end quantity
        batch.lastTallied = new Date();
        batchUpdated = true;
      }
    });
    
    if (!batchUpdated) {
      return res.status(400).json({ message: 'No matching batches found' });
    }
    
    const updatedItem = await item.save();
    res.json({
      ...updatedItem.toObject(),
      dailyUsage: updatedItem.dailyUsage,
      status: updatedItem.status
    });
  } catch (err) {
    res.status(400).json({ message: 'Error recording end day quantities: ' + err.message });
  }
});

// New route for bulk end-of-day inventory updates
router.post('/bulk-end-day', async (req, res) => {
  try {
    const { itemQuantities } = req.body;
    
    if (!itemQuantities || !Array.isArray(itemQuantities) || itemQuantities.length === 0) {
      return res.status(400).json({ message: 'Item quantities must be provided as a non-empty array' });
    }
    
    const results = [];
    const errors = [];
    
    // Process each item in the batch
    for (const itemData of itemQuantities) {
      try {
        const { itemId, endQuantities } = itemData;
        
        if (!itemId || !endQuantities || !Array.isArray(endQuantities)) {
          errors.push({ itemId, error: 'Invalid data format' });
          continue;
        }
        
        const item = await Item.findById(itemId);
        if (!item) {
          errors.push({ itemId, error: 'Item not found' });
          continue;
        }
        
        // Track if any batch was updated
        let batchUpdated = false;
        
        // Map the provided end quantities to batch IDs
        endQuantities.forEach(endQty => {
          const batch = item.inventory.id(endQty.batchId);
          if (batch) {
            batch.dailyEndQuantity = Number(endQty.quantity);
            batch.quantity = Number(endQty.quantity); // Update actual quantity to match end quantity
            batch.lastTallied = new Date();
            batchUpdated = true;
          }
        });
        
        if (!batchUpdated) {
          errors.push({ itemId, error: 'No matching batches found' });
          continue;
        }
        
        const updatedItem = await item.save();
        results.push({
          itemId,
          name: updatedItem.name,
          status: calculateStatus(updatedItem.inventory, updatedItem.minimumThreshold, updatedItem.unit)
        });
      } catch (err) {
        errors.push({ itemId: itemData.itemId, error: err.message });
      }
    }
    
    res.json({
      success: results.length > 0,
      updated: results,
      errors: errors.length > 0 ? errors : null,
      message: `Successfully updated ${results.length} items${errors.length > 0 ? ` with ${errors.length} errors` : ''}`
    });
  } catch (err) {
    res.status(500).json({ message: 'Error processing bulk end-day update: ' + err.message });
  }
});

// Convert units
router.post('/convert', (req, res) => {
  try {
    const { value, fromUnit, toUnit } = req.body;
    
    if (value === undefined || !fromUnit || !toUnit) {
      return res.status(400).json({ message: 'Value, fromUnit, and toUnit are required' });
    }
    
    const convertedValue = convertUnit(Number(value), fromUnit, toUnit);
    res.json({
      originalValue: Number(value),
      originalUnit: fromUnit,
      convertedValue,
      convertedUnit: toUnit
    });
  } catch (err) {
    res.status(400).json({ message: 'Conversion error: ' + err.message });
  }
});

// Usage report for a time period
router.get('/usage-report', async (req, res) => {
  try {
    const { startDate, endDate } = req.query;
    
    // Default to last 30 days if no dates provided
    const end = endDate ? new Date(endDate) : new Date();
    const start = startDate ? new Date(startDate) : new Date(end - 30 * 24 * 60 * 60 * 1000);
    
    const items = await Item.find({
      'inventory.lastTallied': { $gte: start, $lte: end }
    }).lean();
    
    const usageReport = items.map(item => {
      // Calculate usage for batches that were tallied in the date range
      const usage = item.inventory.reduce((total, batch) => {
        if (batch.lastTallied >= start && batch.lastTallied <= end && 
            batch.dailyStartQuantity !== undefined && batch.dailyEndQuantity !== undefined) {
          return total + (batch.dailyStartQuantity - batch.dailyEndQuantity);
        }
        return total;
      }, 0);
      
      return {
        itemId: item._id,
        name: item.name,
        category: item.category,
        unit: item.unit,
        usage: usage > 0 ? usage : 0,
        currentStock: item.inventory.reduce((sum, b) => sum + b.quantity, 0)
      };
    });
    
    res.json(usageReport);
  } catch (err) {
    res.status(500).json({ message: 'Error generating usage report: ' + err.message });
  }
});

// Sell item (FIFO)
router.patch('/:id/sell', async (req, res) => {
  try {
    const { quantity } = req.body;
    const quantityToSell = Number(quantity);

    if (isNaN(quantityToSell) || quantityToSell <= 0) {
      return res.status(400).json({ message: 'Invalid quantity' });
    }

    const item = await Item.findById(req.params.id);
    if (!item) {
      return res.status(404).json({ message: 'Item not found' });
    }

    // Sort by expiration date (FIFO)
    item.inventory.sort((a, b) => a.expirationDate - b.expirationDate);

    let remaining = quantityToSell;
    for (const batch of item.inventory) {
      if (remaining <= 0) break;
      
      if (batch.quantity > remaining) {
        batch.quantity -= remaining;
        remaining = 0;
      } else {
        remaining -= batch.quantity;
        batch.quantity = 0;
      }
    }

    // Remove empty batches
    item.inventory = item.inventory.filter(b => b.quantity > 0);

    if (remaining > 0) {
      return res.status(400).json({
        message: `Insufficient stock. Only ${quantityToSell - remaining} available`
      });
    }

    const updatedItem = await item.save();
    res.json({
      ...updatedItem.toObject(),
      totalQuantity: updatedItem.totalQuantity,
      status: updatedItem.status
    });
  } catch (err) {
    res.status(400).json({ message: 'Sale Error: ' + err.message });
  }
});

// Dispose expired batches
router.patch('/:id/dispose-expired', async (req, res) => {
  try {
    const { batchIds } = req.body;
    
    if (!batchIds || !Array.isArray(batchIds)) {
      return res.status(400).json({ message: 'Batch IDs must be provided as an array' });
    }

    const item = await Item.findById(req.params.id);
    if (!item) {
      return res.status(404).json({ message: 'Item not found' });
    }

    // Track how many batches were disposed
    let disposedCount = 0;

    // Remove the specified expired batches
    item.inventory = item.inventory.filter(batch => {
      const shouldDispose = batchIds.includes(batch._id.toString());
      if (shouldDispose) disposedCount++;
      return !shouldDispose;
    });

    const updatedItem = await item.save();

    res.json({
      message: `Successfully disposed of ${disposedCount} expired batches`,
      ...updatedItem.toObject(),
      totalQuantity: updatedItem.totalQuantity,
      status: updatedItem.status
    });
  } catch (err) {
    res.status(400).json({ message: 'Disposal Error: ' + err.message });
  }
});

module.exports = router;