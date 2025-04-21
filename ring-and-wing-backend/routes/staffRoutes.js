const express = require('express');
const router = express.Router();
const { check, validationResult } = require('express-validator');
const Staff = require('../models/Staff');

// Get all staff
router.get('/', async (req, res) => {
  try {
    const staff = await Staff.find().sort({ createdAt: -1 });
    res.json(staff);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server Error');
  }
});

// Add new staff
router.post(
  '/',
  [
    check('name', 'Name is required').not().isEmpty(),
    check('position', 'Position is required').not().isEmpty(),
    check('dailyRate', 'Daily rate must be a number').isNumeric()
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    try {
      const newStaff = new Staff(req.body);
      const staff = await newStaff.save();
      res.json(staff);
    } catch (err) {
      console.error(err.message);
      res.status(500).send('Server Error');
    }
  }
);

// Update staff
router.put('/:id', async (req, res) => {
  try {
    const staff = await Staff.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true }
    );
    
    if (!staff) {
      return res.status(404).json({ msg: 'Staff not found' });
    }
    
    res.json(staff);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server Error');
  }
});

// Delete staff
router.delete('/:id', async (req, res) => {
  try {
    const staff = await Staff.findById(req.params.id);

    if (!staff) {
      return res.status(404).json({ msg: 'Staff not found' });
    }

    await staff.remove();
    res.json({ msg: 'Staff removed' });
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server Error');
  }
});

module.exports = router;