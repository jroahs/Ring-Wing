const express = require('express');
const router = express.Router();
const Item = require('../models/Items');

// Helper functions
const calculateStatus = (inventory) => {
  const total = inventory.reduce((sum, batch) => sum + batch.quantity, 0);
  if (total === 0) return 'Out of Stock';
  if (total <= 5) return 'Low Stock';
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
      ...batch,  // Changed from batch.toObject()
      daysLeft 
    };
  }).filter(batch => Math.abs(batch.daysLeft) <= 7);
};

// Get all items
router.get('/', async (req, res) => {
  try {
    const items = await Item.find().lean();
    const formattedItems = items.map(item => ({
      ...item,
      totalQuantity: item.inventory.reduce((sum, b) => sum + b.quantity, 0),
      status: calculateStatus(item.inventory),
      expirationAlerts: getExpirationAlerts(item.inventory)
    }));
    
    res.json(formattedItems);
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
      expirationDate: new Date(batch.expirationDate)
    }));

    const item = new Item({
      ...itemData,
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
      status: calculateStatus(updatedItem.inventory)
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
      expirationDate: expDate
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

module.exports = router;