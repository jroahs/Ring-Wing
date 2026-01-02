const express = require('express');
const router = express.Router();
const TimeLogCorrection = require('../models/TimeLogCorrection');
const TimeLog = require('../models/TimeLog');
const Staff = require('../models/Staff');
const Payroll = require('../models/Payroll');
const { auth, isManager } = require('../middleware/authMiddleware');
const { businessDateTimeUtc, formatBusinessDateKey, isDateOnlyString } = require('../utils/businessTime');

// Get pending corrections (manager view)
router.get('/pending', auth, isManager, async (req, res) => {
  try {
    const { staffId, limit = 50, skip = 0 } = req.query;

    const query = { status: 'pending' };
    if (staffId) {
      query.staffId = staffId;
    }

    const corrections = await TimeLogCorrection.find(query)
      .sort({ createdAt: -1 })
      .skip(parseInt(skip))
      .limit(parseInt(limit))
      .populate('staffId', 'name position profilePicture')
      .populate('requestedBy', 'name');

    const total = await TimeLogCorrection.countDocuments(query);

    res.json({
      success: true,
      data: {
        corrections,
        pagination: {
          total,
          limit: parseInt(limit),
          skip: parseInt(skip),
          hasMore: (parseInt(skip) + corrections.length) < total
        }
      }
    });
  } catch (error) {
    console.error('Error fetching pending corrections:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

// Get all corrections with filters
router.get('/', auth, isManager, async (req, res) => {
  try {
    const { 
      staffId, 
      status, 
      correctionType,
      startDate, 
      endDate, 
      limit = 50, 
      skip = 0 
    } = req.query;

    const query = {};

    if (staffId) query.staffId = staffId;
    if (status) query.status = status;
    if (correctionType) query.correctionType = correctionType;

    if (startDate || endDate) {
      query.date = {};
      if (startDate) query.date.$gte = new Date(startDate);
      if (endDate) query.date.$lte = new Date(endDate);
    }

    const corrections = await TimeLogCorrection.find(query)
      .sort({ createdAt: -1 })
      .skip(parseInt(skip))
      .limit(parseInt(limit))
      .populate('staffId', 'name position')
      .populate('requestedBy', 'name')
      .populate('approvedBy', 'name');

    const total = await TimeLogCorrection.countDocuments(query);

    res.json({
      success: true,
      data: {
        corrections,
        pagination: {
          total,
          limit: parseInt(limit),
          skip: parseInt(skip)
        }
      }
    });
  } catch (error) {
    console.error('Error fetching corrections:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

// Get corrections for a specific staff member
router.get('/staff/:staffId', auth, async (req, res) => {
  try {
    const { staffId } = req.params;
    const { status, limit = 20, skip = 0 } = req.query;

    // Staff can only view their own corrections
    if (req.user.role === 'staff') {
      const staff = await Staff.findOne({ userId: req.user._id });
      if (!staff || !staff._id.equals(staffId)) {
        return res.status(403).json({
          success: false,
          message: 'Not authorized to view these corrections'
        });
      }
    }

    const query = { staffId };
    if (status) query.status = status;

    const corrections = await TimeLogCorrection.find(query)
      .sort({ createdAt: -1 })
      .skip(parseInt(skip))
      .limit(parseInt(limit))
      .populate('requestedBy', 'name')
      .populate('approvedBy', 'name');

    res.json({
      success: true,
      data: corrections
    });
  } catch (error) {
    console.error('Error fetching staff corrections:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

// Get my correction requests (for staff)
router.get('/my-requests', auth, async (req, res) => {
  try {
    const staff = await Staff.findOne({ userId: req.user._id });
    if (!staff) {
      return res.status(404).json({
        success: false,
        message: 'Staff record not found'
      });
    }

    const { status, limit = 20, skip = 0 } = req.query;
    const query = { staffId: staff._id };
    if (status) query.status = status;

    const corrections = await TimeLogCorrection.find(query)
      .sort({ createdAt: -1 })
      .skip(parseInt(skip))
      .limit(parseInt(limit))
      .populate('approvedBy', 'name');

    const pendingCount = await TimeLogCorrection.countDocuments({
      staffId: staff._id,
      status: 'pending'
    });

    res.json({
      success: true,
      data: {
        corrections,
        pendingCount
      }
    });
  } catch (error) {
    console.error('Error fetching my corrections:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

// Create a correction request
router.post('/', auth, async (req, res) => {
  try {
    const {
      staffId,
      date,
      correctionType,
      originalTimeLogId,
      originalTimestamp,
      correctedTimestamp,
      reason,
      supportingDocument
    } = req.body;

    // Determine target staff
    let targetStaffId = staffId;
    
    // If staff is making request for themselves
    if (req.user.role === 'staff') {
      const staff = await Staff.findOne({ userId: req.user._id });
      if (!staff) {
        return res.status(404).json({
          success: false,
          message: 'Staff record not found'
        });
      }
      targetStaffId = staff._id;
    }

    // Check if payroll is finalized
    const isFinalized = await Payroll.isPeriodFinalized(targetStaffId, new Date(date));
    if (isFinalized) {
      return res.status(400).json({
        success: false,
        message: 'Cannot create correction. Payroll for this period has been finalized.'
      });
    }

    // Validate original time log exists if modifying/deleting
    if (['modify_clock_in', 'modify_clock_out', 'delete_entry'].includes(correctionType)) {
      if (!originalTimeLogId) {
        return res.status(400).json({
          success: false,
          message: 'Original time log ID is required for modification/deletion'
        });
      }

      const originalLog = await TimeLog.findById(originalTimeLogId);
      if (!originalLog) {
        return res.status(404).json({
          success: false,
          message: 'Original time log not found'
        });
      }
    }

    // Validate correction timestamp for add/modify types
    if (['add_clock_in', 'add_clock_out', 'modify_clock_in', 'modify_clock_out', 'add_full_day'].includes(correctionType)) {
      if (!correctedTimestamp) {
        return res.status(400).json({
          success: false,
          message: 'Corrected timestamp is required'
        });
      }
    }

    const correction = new TimeLogCorrection({
      staffId: targetStaffId,
      date: new Date(date),
      correctionType,
      originalTimeLogId,
      originalTimestamp: originalTimestamp ? new Date(originalTimestamp) : null,
      correctedTimestamp: correctedTimestamp ? new Date(correctedTimestamp) : null,
      reason,
      supportingDocument,
      requestedBy: req.user._id,
      status: 'pending'
    });

    await correction.save();
    await correction.populate('staffId', 'name position');

    res.status(201).json({
      success: true,
      data: correction,
      message: 'Correction request submitted successfully'
    });
  } catch (error) {
    console.error('Error creating correction:', error);
    res.status(400).json({
      success: false,
      message: error.message
    });
  }
});

// Approve a correction
router.put('/:id/approve', auth, isManager, async (req, res) => {
  try {
    const { id } = req.params;
    const { approverNotes } = req.body;

    const correction = await TimeLogCorrection.findById(id)
      .populate('staffId', 'name');

    if (!correction) {
      return res.status(404).json({
        success: false,
        message: 'Correction not found'
      });
    }

    if (correction.status !== 'pending') {
      return res.status(400).json({
        success: false,
        message: `Correction has already been ${correction.status}`
      });
    }

    // Check if payroll is now finalized
    const isFinalized = await Payroll.isPeriodFinalized(correction.staffId, correction.date);
    if (isFinalized) {
      return res.status(400).json({
        success: false,
        message: 'Cannot approve correction. Payroll for this period has been finalized.'
      });
    }

    // Apply the correction to time logs
    await applyCorrection(correction);

    // Update correction status
    await correction.approve(req.user._id, approverNotes);

    res.json({
      success: true,
      data: correction,
      message: 'Correction approved and applied successfully'
    });
  } catch (error) {
    console.error('Error approving correction:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

// Reject a correction
router.put('/:id/reject', auth, isManager, async (req, res) => {
  try {
    const { id } = req.params;
    const { rejectionReason } = req.body;

    if (!rejectionReason) {
      return res.status(400).json({
        success: false,
        message: 'Rejection reason is required'
      });
    }

    const correction = await TimeLogCorrection.findById(id);

    if (!correction) {
      return res.status(404).json({
        success: false,
        message: 'Correction not found'
      });
    }

    if (correction.status !== 'pending') {
      return res.status(400).json({
        success: false,
        message: `Correction has already been ${correction.status}`
      });
    }

    await correction.reject(req.user._id, rejectionReason);

    res.json({
      success: true,
      data: correction,
      message: 'Correction rejected'
    });
  } catch (error) {
    console.error('Error rejecting correction:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

// Cancel a pending correction (by requester)
router.delete('/:id', auth, async (req, res) => {
  try {
    const { id } = req.params;

    const correction = await TimeLogCorrection.findById(id);

    if (!correction) {
      return res.status(404).json({
        success: false,
        message: 'Correction not found'
      });
    }

    // Check ownership or manager
    if (req.user.role === 'staff') {
      if (!correction.requestedBy.equals(req.user._id)) {
        return res.status(403).json({
          success: false,
          message: 'Not authorized to cancel this correction'
        });
      }
    }

    if (correction.status !== 'pending') {
      return res.status(400).json({
        success: false,
        message: 'Only pending corrections can be cancelled'
      });
    }

    await TimeLogCorrection.findByIdAndDelete(id);

    res.json({
      success: true,
      message: 'Correction cancelled successfully'
    });
  } catch (error) {
    console.error('Error cancelling correction:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

// Get single correction details
router.get('/:id', auth, async (req, res) => {
  try {
    const { id } = req.params;

    const correction = await TimeLogCorrection.findById(id)
      .populate('staffId', 'name position profilePicture')
      .populate('requestedBy', 'name')
      .populate('approvedBy', 'name');

    if (!correction) {
      return res.status(404).json({
        success: false,
        message: 'Correction not found'
      });
    }

    // Check access
    if (req.user.role === 'staff') {
      const staff = await Staff.findOne({ userId: req.user._id });
      if (!staff || !correction.staffId._id.equals(staff._id)) {
        return res.status(403).json({
          success: false,
          message: 'Not authorized to view this correction'
        });
      }
    }

    res.json({
      success: true,
      data: correction
    });
  } catch (error) {
    console.error('Error fetching correction:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

// Helper function to apply correction to time logs
async function applyCorrection(correction) {
  const { correctionType, staffId, date, originalTimeLogId, correctedTimestamp } = correction;

  const dateKey = isDateOnlyString(date) ? date : formatBusinessDateKey(new Date(date));
  const dayStartUtc = businessDateTimeUtc(dateKey, 0, 0, 0, 0);
  const dayEndUtc = businessDateTimeUtc(dateKey, 23, 59, 59, 999);

  switch (correctionType) {
    case 'add_clock_in':
      await TimeLog.create({
        staffId,
        type: 'clockIn',
        timestamp: correctedTimestamp,
        clockMethod: 'manual_correction',
        notes: `Added via correction #${correction._id}`
      });
      break;

    case 'add_clock_out':
      // Find the corresponding clock in
      const clockIn = await TimeLog.findOne({
        staffId,
        type: 'clockIn',
        timestamp: {
          $gte: dayStartUtc,
          $lt: dayEndUtc
        }
      }).sort({ timestamp: -1 });

      const totalHours = clockIn 
        ? (correctedTimestamp - clockIn.timestamp) / (1000 * 60 * 60)
        : 0;

      await TimeLog.create({
        staffId,
        type: 'clockOut',
        timestamp: correctedTimestamp,
        clockMethod: 'manual_correction',
        totalHours: Math.round(totalHours * 100) / 100,
        notes: `Added via correction #${correction._id}`
      });
      break;

    case 'modify_clock_in':
    case 'modify_clock_out':
      await TimeLog.findByIdAndUpdate(originalTimeLogId, {
        timestamp: correctedTimestamp,
        clockMethod: 'manual_correction',
        notes: `Modified via correction #${correction._id}`
      });

      // Recalculate total hours if clock out was modified
      if (correctionType === 'modify_clock_out') {
        const timeLog = await TimeLog.findById(originalTimeLogId);
        if (timeLog) {
          const correspondingClockIn = await TimeLog.findOne({
            staffId,
            type: 'clockIn',
            timestamp: { $lt: correctedTimestamp }
          }).sort({ timestamp: -1 });

          if (correspondingClockIn) {
            timeLog.totalHours = (correctedTimestamp - correspondingClockIn.timestamp) / (1000 * 60 * 60);
            await timeLog.save();
          }
        }
      }
      break;

    case 'add_full_day':
      // Add both clock in and clock out
      const dayStart = businessDateTimeUtc(dateKey, 9, 0, 0, 0); // Default 9 AM (PH)
      const dayEnd = businessDateTimeUtc(dateKey, 18, 0, 0, 0); // Default 6 PM (PH)

      await TimeLog.create({
        staffId,
        type: 'clockIn',
        timestamp: dayStart,
        clockMethod: 'manual_correction',
        notes: `Full day added via correction #${correction._id}`
      });

      await TimeLog.create({
        staffId,
        type: 'clockOut',
        timestamp: dayEnd,
        clockMethod: 'manual_correction',
        totalHours: 9, // 9 AM to 6 PM = 9 hours
        notes: `Full day added via correction #${correction._id}`
      });
      break;

    case 'delete_entry':
      await TimeLog.findByIdAndDelete(originalTimeLogId);
      break;

    default:
      throw new Error(`Unknown correction type: ${correctionType}`);
  }
}

module.exports = router;
