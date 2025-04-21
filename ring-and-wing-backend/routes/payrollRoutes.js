const express = require('express');
const router = express.Router();
const Payroll = require('../models/Payroll');
const Staff = require('../models/Staff');

// Create payroll record
router.post('/', async (req, res) => {
  try {
    const { staffId, ...payload } = req.body;
    
    // Verify staff exists
    const staff = await Staff.findById(staffId);
    if (!staff) {
      return res.status(404).json({ error: 'Staff member not found' });
    }

    const payroll = new Payroll({
      staffId,
      ...payload
    });

    await payroll.save();
    res.status(201).json(payroll);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// Get payroll records for a staff member
router.get('/staff/:staffId', async (req, res) => {
  try {
    const payrolls = await Payroll.find({ staffId: req.params.staffId })
      .populate('staffId', 'name position basicSalary allowances')
      .sort('-payrollPeriod');

    res.json(payrolls);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Update payroll record
router.put('/:id', async (req, res) => {
  try {
    const payroll = await Payroll.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true }
    ).populate('staffId', 'name position');

    if (!payroll) {
      return res.status(404).json({ error: 'Payroll record not found' });
    }

    res.json(payroll);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// Delete payroll record
router.delete('/:id', async (req, res) => {
  try {
    const payroll = await Payroll.findByIdAndDelete(req.params.id);
    if (!payroll) {
      return res.status(404).json({ error: 'Payroll record not found' });
    }
    res.json({ message: 'Payroll record deleted' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;