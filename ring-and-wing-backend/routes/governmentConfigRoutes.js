const express = require('express');
const GovernmentDeductionConfig = require('../models/GovernmentDeductionConfig');
const { auth, isManager } = require('../middleware/authMiddleware');
const { 
  validateGovernmentConfig, 
  validateConfigMiddleware,
  getDefault2024Config 
} = require('../utils/governmentConfigValidation');
const { previewCalculation } = require('../utils/governmentDeductions');

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

// GET /api/government-config/preview - Preview calculation for a salary
router.get('/preview', auth, async (req, res) => {
  try {
    const { salary } = req.query;
    
    if (!salary || isNaN(salary)) {
      return res.status(400).json({
        success: false,
        message: 'Valid salary amount is required'
      });
    }
    
    const preview = await previewCalculation(Number(salary));
    
    res.json({
      success: true,
      data: preview
    });
  } catch (error) {
    console.error('Error generating preview:', error);
    res.status(500).json({
      success: false,
      message: 'Error generating preview',
      error: error.message
    });
  }
});

// GET /api/government-config/default - Get default 2024 compliant config
router.get('/default', auth, isManager, async (req, res) => {
  try {
    const defaultConfig = getDefault2024Config();
    
    res.json({
      success: true,
      message: '2024 compliant default configuration',
      data: defaultConfig
    });
  } catch (error) {
    console.error('Error getting default config:', error);
    res.status(500).json({
      success: false,
      message: 'Error getting default configuration',
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
      .populate('approval.approvedBy', 'username email')
      .limit(50)
      .lean();

    // Add summary info
    const configsWithSummary = configs.map(config => ({
      ...config,
      summary: {
        sssEmployeeRate: `${(config.sss?.employeeRate || 0.05) * 100}%`,
        sssEmployerRate: `${(config.sss?.employerRate || 0.10) * 100}%`,
        philHealthRate: `${((config.philHealth?.employeeRate || 0.025) + (config.philHealth?.employerRate || 0.025)) * 100}%`,
        pagIbigRate: `${((config.pagIbig?.employeeRate || 0.02) + (config.pagIbig?.employerRate || 0.02)) * 100}%`,
        hasEmployerRates: !!(config.sss?.employerRate && config.philHealth?.employerRate && config.pagIbig?.employerRate),
        hasEC: !!(config.sss?.ec)
      }
    }));

    res.json({
      success: true,
      count: configs.length,
      data: configsWithSummary
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

    // Validate using the validation utility
    const validation = validateGovernmentConfig(req.body);
    
    if (!validation.valid) {
      return res.status(400).json({
        success: false,
        message: 'Configuration validation failed',
        errors: validation.errors,
        warnings: validation.warnings
      });
    }

    // Use validated config
    const validatedConfig = validation.config;

    const newConfig = await GovernmentDeductionConfig.createNewConfig({
      year: validatedConfig.year,
      effectiveDate: validatedConfig.effectiveDate,
      sss: {
        employeeRate: validatedConfig.sss.employeeRate,
        employerRate: validatedConfig.sss.employerRate,
        ec: validatedConfig.sss.ec,
        mscBrackets: validatedConfig.sss.mscBrackets,
        description: validatedConfig.sss.description
      },
      philHealth: {
        employeeRate: validatedConfig.philHealth.employeeRate,
        employerRate: validatedConfig.philHealth.employerRate,
        floor: validatedConfig.philHealth.floor,
        ceiling: validatedConfig.philHealth.ceiling,
        description: validatedConfig.philHealth.description
      },
      pagIbig: {
        employeeRate: validatedConfig.pagIbig.employeeRate,
        employerRate: validatedConfig.pagIbig.employerRate,
        maxContribution: validatedConfig.pagIbig.maxContribution,
        mfsCap: validatedConfig.pagIbig.mfsCap,
        description: validatedConfig.pagIbig.description
      },
      notes: validatedConfig.notes
    }, req.user.id);

    // Log creation with audit info
    console.log(`[Government Config] New config created for ${validatedConfig.year} by user ${req.user.id}`);

    res.status(201).json({
      success: true,
      message: 'Configuration created successfully',
      warnings: validation.warnings,
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

    // Track changes for audit
    const changes = [];

    // Update SSS fields with employer support
    if (sss) {
      const oldSss = { ...config.sss.toObject() };
      config.sss = {
        employeeRate: sss.employeeRate ?? config.sss.employeeRate,
        employerRate: sss.employerRate ?? config.sss.employerRate ?? 0.10,
        ec: {
          threshold: sss.ec?.threshold ?? config.sss.ec?.threshold ?? 15000,
          lowRate: sss.ec?.lowRate ?? config.sss.ec?.lowRate ?? 10,
          highRate: sss.ec?.highRate ?? config.sss.ec?.highRate ?? 30
        },
        mscBrackets: sss.mscBrackets || config.sss.mscBrackets,
        description: sss.description || config.sss.description
      };
      
      if (oldSss.employeeRate !== config.sss.employeeRate) {
        changes.push(`SSS employee rate: ${oldSss.employeeRate * 100}% → ${config.sss.employeeRate * 100}%`);
      }
      if (oldSss.employerRate !== config.sss.employerRate) {
        changes.push(`SSS employer rate: ${(oldSss.employerRate || 0) * 100}% → ${config.sss.employerRate * 100}%`);
      }
    }

    // Update PhilHealth fields with employer support
    if (philHealth) {
      const oldPh = { ...config.philHealth.toObject() };
      config.philHealth = {
        employeeRate: philHealth.employeeRate ?? config.philHealth.employeeRate,
        employerRate: philHealth.employerRate ?? config.philHealth.employerRate ?? 0.025,
        floor: philHealth.floor ?? config.philHealth.floor,
        ceiling: philHealth.ceiling ?? config.philHealth.ceiling,
        description: philHealth.description || config.philHealth.description
      };
      
      if (oldPh.employeeRate !== config.philHealth.employeeRate) {
        changes.push(`PhilHealth employee rate: ${oldPh.employeeRate * 100}% → ${config.philHealth.employeeRate * 100}%`);
      }
      if (oldPh.employerRate !== config.philHealth.employerRate) {
        changes.push(`PhilHealth employer rate: ${(oldPh.employerRate || 0) * 100}% → ${config.philHealth.employerRate * 100}%`);
      }
    }

    // Update Pag-IBIG fields with employer support
    if (pagIbig) {
      const oldPi = { ...config.pagIbig.toObject() };
      config.pagIbig = {
        employeeRate: pagIbig.employeeRate ?? config.pagIbig.employeeRate,
        employerRate: pagIbig.employerRate ?? config.pagIbig.employerRate ?? 0.02,
        maxContribution: pagIbig.maxContribution ?? config.pagIbig.maxContribution,
        mfsCap: pagIbig.mfsCap ?? config.pagIbig.mfsCap ?? 10000,
        description: pagIbig.description || config.pagIbig.description
      };
      
      if (oldPi.employeeRate !== config.pagIbig.employeeRate) {
        changes.push(`Pag-IBIG employee rate: ${oldPi.employeeRate * 100}% → ${config.pagIbig.employeeRate * 100}%`);
      }
      if (oldPi.employerRate !== config.pagIbig.employerRate) {
        changes.push(`Pag-IBIG employer rate: ${(oldPi.employerRate || 0) * 100}% → ${config.pagIbig.employerRate * 100}%`);
      }
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
        changes.push('Configuration activated');
      } else {
        changes.push('Configuration deactivated');
      }
      config.isActive = isActive;
    }

    // Add to change history
    if (changes.length > 0) {
      if (!config.changeHistory) config.changeHistory = [];
      config.changeHistory.push({
        changedAt: new Date(),
        changedBy: req.user.id,
        changes: changes,
        notes: notes || 'Updated via API'
      });
    }

    config.updatedBy = req.user.id;
    config.version = (config.version || 1) + 1;
    await config.save();

    console.log(`[Government Config] Config ${id} updated by user ${req.user.id}: ${changes.join(', ')}`);

    res.json({
      success: true,
      message: 'Configuration updated successfully',
      changes: changes,
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

// =====================================================
// GOVERNMENT COMPLIANCE REPORTS
// =====================================================

const { 
  generateSSSReport, 
  generatePhilHealthReport, 
  generatePagIbigReport,
  generateConsolidatedReport,
  generateEmployeeContributionSummary,
  formatReportAsCSV 
} = require('../utils/governmentComplianceReports');

// GET /api/government-config/reports/sss - SSS Contributions Report
router.get('/reports/sss', auth, isManager, async (req, res) => {
  try {
    const { startDate, endDate, format } = req.query;
    
    if (!startDate || !endDate) {
      return res.status(400).json({
        success: false,
        message: 'startDate and endDate are required'
      });
    }
    
    const report = await generateSSSReport(new Date(startDate), new Date(endDate));
    
    if (format === 'csv') {
      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', `attachment; filename=SSS-Report-${startDate}-to-${endDate}.csv`);
      return res.send(formatReportAsCSV(report, 'SSS'));
    }
    
    res.json({ success: true, data: report });
  } catch (error) {
    console.error('Error generating SSS report:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// GET /api/government-config/reports/philhealth - PhilHealth Report
router.get('/reports/philhealth', auth, isManager, async (req, res) => {
  try {
    const { startDate, endDate, format } = req.query;
    
    if (!startDate || !endDate) {
      return res.status(400).json({
        success: false,
        message: 'startDate and endDate are required'
      });
    }
    
    const report = await generatePhilHealthReport(new Date(startDate), new Date(endDate));
    
    if (format === 'csv') {
      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', `attachment; filename=PhilHealth-Report-${startDate}-to-${endDate}.csv`);
      return res.send(formatReportAsCSV(report, 'PhilHealth'));
    }
    
    res.json({ success: true, data: report });
  } catch (error) {
    console.error('Error generating PhilHealth report:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// GET /api/government-config/reports/pagibig - Pag-IBIG Report
router.get('/reports/pagibig', auth, isManager, async (req, res) => {
  try {
    const { startDate, endDate, format } = req.query;
    
    if (!startDate || !endDate) {
      return res.status(400).json({
        success: false,
        message: 'startDate and endDate are required'
      });
    }
    
    const report = await generatePagIbigReport(new Date(startDate), new Date(endDate));
    
    if (format === 'csv') {
      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', `attachment; filename=PagIbig-Report-${startDate}-to-${endDate}.csv`);
      return res.send(formatReportAsCSV(report, 'Pag-IBIG'));
    }
    
    res.json({ success: true, data: report });
  } catch (error) {
    console.error('Error generating Pag-IBIG report:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// GET /api/government-config/reports/consolidated - Consolidated Report
router.get('/reports/consolidated', auth, isManager, async (req, res) => {
  try {
    const { startDate, endDate } = req.query;
    
    if (!startDate || !endDate) {
      return res.status(400).json({
        success: false,
        message: 'startDate and endDate are required'
      });
    }
    
    const report = await generateConsolidatedReport(new Date(startDate), new Date(endDate));
    
    res.json({ success: true, data: report });
  } catch (error) {
    console.error('Error generating consolidated report:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// GET /api/government-config/reports/employee/:id - Employee Contribution Summary
router.get('/reports/employee/:id', auth, async (req, res) => {
  try {
    const { id } = req.params;
    const { year } = req.query;
    
    const reportYear = year ? parseInt(year) : new Date().getFullYear();
    const report = await generateEmployeeContributionSummary(id, reportYear);
    
    res.json({ success: true, data: report });
  } catch (error) {
    console.error('Error generating employee report:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

module.exports = router;
