const express = require('express');
const Staff = require('../models/Staff');

const router = express.Router();

// Get all staff members
router.get('/', async (req, res) => {
  try {
    const staff = await Staff.find();
    res.json(staff);
  } catch (error) {
    console.error('Error fetching staff:', error);
    res.status(500).json({ message: error.message });
  }
});

// Create new staff member
router.post('/', async (req, res) => {
  try {
    const { email } = req.body;
    
    const existingStaff = await Staff.findOne({ email });
    if (existingStaff) {
      return res.status(400).json({ message: 'Email already exists' });
    }

    const newStaff = new Staff(req.body);
    const savedStaff = await newStaff.save();
    res.status(201).json(savedStaff);
  } catch (error) {
    console.error('Error creating staff:', error);
    res.status(400).json({ message: error.message });
  }
});

// Update staff member
router.put('/:id', async (req, res) => {
  try {
    const staff = await Staff.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true, runValidators: true }
    );

    if (!staff) {
      return res.status(404).json({ message: 'Staff member not found' });
    }

    res.json(staff);
  } catch (error) {
    console.error('Error updating staff:', error);
    res.status(400).json({ message: error.message });
  }
});

// Delete staff member
router.delete('/:id', async (req, res) => {
  try {
    const staff = await Staff.findByIdAndDelete(req.params.id);
    
    if (!staff) {
      return res.status(404).json({ message: 'Staff member not found' });
    }
    
    res.json({ message: 'Staff member deleted successfully' });
  } catch (error) {
    console.error('Error deleting staff:', error);
    res.status(500).json({ message: error.message });
  }
});

module.exports = router;