// routes/addOns.js
const express = require('express');
const router = express.Router();
const AddOn = require('../models/AddOn');

// Get all add-ons
router.get('/', async (req, res) => {
  try {
    const addOns = await AddOn.find();
    res.json(addOns);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Create new add-on
router.post('/', async (req, res) => {
  const addOn = new AddOn(req.body);
  try {
    const newAddOn = await addOn.save();
    res.status(201).json(newAddOn);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

// Update add-on
router.put('/:id', async (req, res) => {
  try {
    const updatedAddOn = await AddOn.findByIdAndUpdate(req.params.id, req.body, { new: true });
    res.json(updatedAddOn);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

// Delete add-on
router.delete('/:id', async (req, res) => {
  try {
    await AddOn.findByIdAndDelete(req.params.id);
    res.json({ message: 'Add-on deleted' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

module.exports = router;