const express = require('express');
const router = express.Router();
const ShiftTemplate = require('../models/ShiftTemplate');
const { auth, isManager } = require('../middleware/authMiddleware');

// Get all shift templates
router.get('/', auth, async (req, res) => {
  try {
    const { activeOnly } = req.query;
    
    let query = {};
    if (activeOnly === 'true') {
      query.isActive = true;
    }
    
    const templates = await ShiftTemplate.find(query)
      .populate('createdBy', 'username')
      .sort({ name: 1 });

    res.json({
      success: true,
      data: templates
    });
  } catch (error) {
    console.error('Error fetching shift templates:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

// Get a single shift template by ID
router.get('/:id', auth, async (req, res) => {
  try {
    const template = await ShiftTemplate.findById(req.params.id)
      .populate('createdBy', 'username');

    if (!template) {
      return res.status(404).json({
        success: false,
        message: 'Shift template not found'
      });
    }

    res.json({
      success: true,
      data: template
    });
  } catch (error) {
    console.error('Error fetching shift template:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

// Create a new shift template
router.post('/', auth, isManager, async (req, res) => {
  try {
    const {
      name,
      startTime,
      endTime,
      breakMinutes,
      color,
      allowSplitShift,
      splitShiftConfig,
      description
    } = req.body;

    // Check for duplicate name
    const existingTemplate = await ShiftTemplate.findOne({ 
      name: { $regex: new RegExp(`^${name}$`, 'i') } 
    });
    
    if (existingTemplate) {
      return res.status(400).json({
        success: false,
        message: 'A shift template with this name already exists'
      });
    }

    const template = new ShiftTemplate({
      name,
      startTime,
      endTime,
      breakMinutes: breakMinutes || 60,
      color: color || '#4CAF50',
      allowSplitShift: allowSplitShift || false,
      splitShiftConfig: allowSplitShift ? splitShiftConfig : undefined,
      description,
      createdBy: req.user._id
    });

    await template.save();

    res.status(201).json({
      success: true,
      data: template,
      message: 'Shift template created successfully'
    });
  } catch (error) {
    console.error('Error creating shift template:', error);
    res.status(400).json({
      success: false,
      message: error.message
    });
  }
});

// Update a shift template
router.put('/:id', auth, isManager, async (req, res) => {
  try {
    const { id } = req.params;
    const updateData = req.body;

    // Check for duplicate name (excluding current template)
    if (updateData.name) {
      const existingTemplate = await ShiftTemplate.findOne({ 
        name: { $regex: new RegExp(`^${updateData.name}$`, 'i') },
        _id: { $ne: id }
      });
      
      if (existingTemplate) {
        return res.status(400).json({
          success: false,
          message: 'A shift template with this name already exists'
        });
      }
    }

    // If split shift is disabled, clear the config
    if (updateData.allowSplitShift === false) {
      updateData.splitShiftConfig = undefined;
    }

    const template = await ShiftTemplate.findByIdAndUpdate(
      id,
      updateData,
      { new: true, runValidators: true }
    ).populate('createdBy', 'username');

    if (!template) {
      return res.status(404).json({
        success: false,
        message: 'Shift template not found'
      });
    }

    res.json({
      success: true,
      data: template,
      message: 'Shift template updated successfully'
    });
  } catch (error) {
    console.error('Error updating shift template:', error);
    res.status(400).json({
      success: false,
      message: error.message
    });
  }
});

// Delete a shift template (soft delete - set inactive)
router.delete('/:id', auth, isManager, async (req, res) => {
  try {
    const { id } = req.params;
    const { hardDelete } = req.query;

    // Check if template is in use
    const EmployeeSchedule = require('../models/EmployeeSchedule');
    const schedulesUsingTemplate = await EmployeeSchedule.countDocuments({
      shiftTemplateId: id
    });

    if (schedulesUsingTemplate > 0 && hardDelete !== 'true') {
      // Soft delete - just mark as inactive
      const template = await ShiftTemplate.findByIdAndUpdate(
        id,
        { isActive: false },
        { new: true }
      );

      return res.json({
        success: true,
        data: template,
        message: `Shift template deactivated (used in ${schedulesUsingTemplate} schedules)`
      });
    }

    // Hard delete if not in use or explicitly requested
    const template = await ShiftTemplate.findByIdAndDelete(id);

    if (!template) {
      return res.status(404).json({
        success: false,
        message: 'Shift template not found'
      });
    }

    res.json({
      success: true,
      message: 'Shift template deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting shift template:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

// Reactivate a deactivated shift template
router.put('/:id/reactivate', auth, isManager, async (req, res) => {
  try {
    const template = await ShiftTemplate.findByIdAndUpdate(
      req.params.id,
      { isActive: true },
      { new: true }
    );

    if (!template) {
      return res.status(404).json({
        success: false,
        message: 'Shift template not found'
      });
    }

    res.json({
      success: true,
      data: template,
      message: 'Shift template reactivated successfully'
    });
  } catch (error) {
    console.error('Error reactivating shift template:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

module.exports = router;
