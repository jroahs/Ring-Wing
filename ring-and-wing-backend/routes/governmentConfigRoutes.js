const express = require('express');
const GovernmentDeductionConfig = require('../models/GovernmentDeductionConfig');
const { auth, isManager } = require('../middleware/authMiddleware');

const router = express.Router();

// GET /api/government-config - Get active configuration (all authenticated users)
router.get('/', auth, async (req, res) => {
  try {
    const config = await GovernmentDeductionConfig.getActiveConfig();
    
    if (!config) {
      return res.status(404).json({
        success: false,
        message: 'No active configuration found'
      });
    }

    res.json({
      success: true,
      data: config
    });
  } catch (error) {
    console.error('Error fetching government config:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching configuration',
      error: error.message
    });
  }
});

// GET /api/government-config/history - Get configuration history (managers only)
router.get('/history', auth, isManager, async (req, res) => {
  try {
    const configs = await GovernmentDeductionConfig.find()
      .sort({ year: -1, createdAt: -1 })
      .populate('createdBy', 'username email')
      .populate('updatedBy', 'username email')
      .limit(50)
      .lean();

    res.json({
      success: true,
      count: configs.length,
      data: configs
    });
  } catch (error) {
    console.error('Error fetching config history:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching configuration history',
      error: error.message
    });
  }
});

// POST /api/government-config - Create new configuration (managers only)
router.post('/', auth, isManager, async (req, res) => {
  try {
    const { year, sss, philHealth, pagIbig, effectiveDate, notes } = req.body;

    // Validation
    if (!year || !sss || !philHealth || !pagIbig) {
      return res.status(400).json({
        success: false,
        message: 'Missing required fields'
      });
    }

    // Validate SSS MSC brackets
    if (!sss.mscBrackets || !Array.isArray(sss.mscBrackets) || sss.mscBrackets.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'SSS MSC brackets are required'
      });
    }

    const newConfig = await GovernmentDeductionConfig.createNewConfig({
      year,
      effectiveDate: effectiveDate || new Date(),
      sss: {
        employeeRate: sss.employeeRate || 0.05,
        mscBrackets: sss.mscBrackets,
        description: sss.description || 'Social Security System - Employee contribution'
      },
      philHealth: {
        employeeRate: philHealth.employeeRate || 0.025,
        floor: philHealth.floor || 10000,
        ceiling: philHealth.ceiling || 100000,
        description: philHealth.description || 'Philippine Health Insurance'
      },
      pagIbig: {
        employeeRate: pagIbig.employeeRate || 0.02,
        maxContribution: pagIbig.maxContribution || 200,
        description: pagIbig.description || 'Home Development Mutual Fund'
      },
      notes: notes || ''
    }, req.user.id);

    res.status(201).json({
      success: true,
      message: 'Configuration created successfully',
      data: newConfig
    });
  } catch (error) {
    console.error('Error creating government config:', error);
    res.status(500).json({
      success: false,
      message: 'Error creating configuration',
      error: error.message
    });
  }
});

// PUT /api/government-config/:id - Update existing configuration (managers only)
router.put('/:id', auth, isManager, async (req, res) => {
  try {
    const { id } = req.params;
    const { sss, philHealth, pagIbig, effectiveDate, notes, isActive } = req.body;

    const config = await GovernmentDeductionConfig.findById(id);
    
    if (!config) {
      return res.status(404).json({
        success: false,
        message: 'Configuration not found'
      });
    }

    // Update fields
    if (sss) {
      config.sss = {
        employeeRate: sss.employeeRate ?? config.sss.employeeRate,
        mscBrackets: sss.mscBrackets || config.sss.mscBrackets,
        description: sss.description || config.sss.description
      };
    }

    if (philHealth) {
      config.philHealth = {
        employeeRate: philHealth.employeeRate ?? config.philHealth.employeeRate,
        floor: philHealth.floor ?? config.philHealth.floor,
        ceiling: philHealth.ceiling ?? config.philHealth.ceiling,
        description: philHealth.description || config.philHealth.description
      };
    }

    if (pagIbig) {
      config.pagIbig = {
        employeeRate: pagIbig.employeeRate ?? config.pagIbig.employeeRate,
        maxContribution: pagIbig.maxContribution ?? config.pagIbig.maxContribution,
        description: pagIbig.description || config.pagIbig.description
      };
    }

    if (effectiveDate) config.effectiveDate = effectiveDate;
    if (notes !== undefined) config.notes = notes;
    if (isActive !== undefined) {
      if (isActive) {
        // Deactivate all other configs
        await GovernmentDeductionConfig.updateMany(
          { _id: { $ne: id } },
          { isActive: false }
        );
      }
      config.isActive = isActive;
    }

    config.updatedBy = req.user.id;
    await config.save();

    res.json({
      success: true,
      message: 'Configuration updated successfully',
      data: config
    });
  } catch (error) {
    console.error('Error updating government config:', error);
    res.status(500).json({
      success: false,
      message: 'Error updating configuration',
      error: error.message
    });
  }
});

// DELETE /api/government-config/:id - Delete configuration (admin only)
router.delete('/:id', auth, isManager, async (req, res) => {
  try {
    const { id } = req.params;

    const config = await GovernmentDeductionConfig.findById(id);
    
    if (!config) {
      return res.status(404).json({
        success: false,
        message: 'Configuration not found'
      });
    }

    // Prevent deletion of active config
    if (config.isActive) {
      return res.status(400).json({
        success: false,
        message: 'Cannot delete active configuration. Deactivate it first.'
      });
    }

    await config.deleteOne();

    res.json({
      success: true,
      message: 'Configuration deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting government config:', error);
    res.status(500).json({
      success: false,
      message: 'Error deleting configuration',
      error: error.message
    });
  }
});

module.exports = router;
