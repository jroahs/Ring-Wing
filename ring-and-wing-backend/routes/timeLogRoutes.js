const express = require('express');
const router = express.Router();
const { auth, isStaff } = require('../middleware/authMiddleware');
const timeLogController = require('../controllers/timeLogController');
const Staff = require('../models/Staff');
const TimeLog = require('../models/TimeLog');
const {
  getBusinessTimeZone,
  isDateOnlyString,
  formatBusinessDateKey,
  businessDateTimeUtc
} = require('../utils/businessTime');

const tz = getBusinessTimeZone();
const parseDateKeyInput = (value) => (isDateOnlyString(value) ? value : formatBusinessDateKey(new Date(value), tz));

// Debug logging for each route
router.use((req, res, next) => {
  console.log('[TimeLog Route] Handling request:', {
    method: req.method,
    path: req.path,
    body: req.body
  });
  next();
});

router.get('/staff/:staffId', auth, timeLogController.getTimeLogs);
router.post('/clock-in', auth, timeLogController.clockIn);
router.post('/clock-out', auth, timeLogController.clockOut);

// Get calculated hours for a staff member in a date range
router.get('/staff/:staffId/hours', auth, async (req, res) => {
  try {
    const { staffId } = req.params;
    const { startDate, endDate } = req.query;
    
    if (!staffId || !startDate || !endDate) {
      return res.status(400).json({
        success: false,
        message: 'Staff ID, start date, and end date are required'
      });
    }
    
    // Validate that staffId exists
    const staff = await Staff.findById(staffId);
    if (!staff) {
      return res.status(404).json({
        success: false,
        message: 'Staff member not found'
      });
    }

    const startKey = parseDateKeyInput(startDate);
    const endKey = parseDateKeyInput(endDate);
    const startUtc = businessDateTimeUtc(startKey, 0, 0, 0, 0, tz);
    const endUtc = businessDateTimeUtc(endKey, 23, 59, 59, 999, tz);
    
    // Use the new calculateTotalHours helper from the controller
    const hours = await timeLogController.calculateTotalHours(
      staffId,
      startUtc,
      endUtc
    );
    
    // Fetch the raw logs to include in the response
    const logQuery = {
      staffId,
      timestamp: { 
        $gte: startUtc,
        $lte: endUtc
      }
    };
    
    const logs = await TimeLog.find(logQuery).sort('timestamp');
    
    res.json({
      success: true,
      data: {
        ...hours,
        logs: logs.length,
        staffName: staff.name,
        staffPosition: staff.position,
        startDate,
        endDate
      }
    });
  } catch (error) {
    console.error('Error calculating hours:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Error calculating hours'
    });
  }
});

// TESTING ONLY: Generate test time log data
router.post('/generate-test-data', auth, async (req, res) => {
  try {
    const { staffId, startDate, endDate, daysToGenerate = 21, hoursPerDay = 8, includeOvertimeInSomeDays = true } = req.body;
    
    if (!staffId || !startDate || !endDate) {
      return res.status(400).json({
        success: false,
        message: 'Staff ID, start date, and end date are required'
      });
    }
    
    // Validate that staffId exists
    const staff = await Staff.findById(staffId);
    if (!staff) {
      return res.status(404).json({
        success: false,
        message: 'Staff member not found'
      });
    }

    const startKey = parseDateKeyInput(startDate);
    const endKey = parseDateKeyInput(endDate);
    const startUtc = businessDateTimeUtc(startKey, 0, 0, 0, 0, tz);
    const endUtc = businessDateTimeUtc(endKey, 23, 59, 59, 999, tz);
    const startNoonUtc = businessDateTimeUtc(startKey, 12, 0, 0, 0, tz);
    
    // First, clear any existing time logs in the date range
    await TimeLog.deleteMany({
      staffId,
      timestamp: {
        $gte: startUtc,
        $lte: endUtc
      }
    });

    const logs = [];
    
    // Generate logs for a typical work month (e.g. 21 work days)
    for (let day = 0; day < daysToGenerate; day++) {
      const currentKey = formatBusinessDateKey(new Date(startNoonUtc.getTime() + day * 24 * 60 * 60 * 1000), tz);
      const currentNoonUtc = businessDateTimeUtc(currentKey, 12, 0, 0, 0, tz);
      
      // Skip weekends (Saturday = 6, Sunday = 0)
      const dayOfWeek = currentNoonUtc.getUTCDay();
      if (dayOfWeek === 0 || dayOfWeek === 6) {
        continue;
      }
      
      // Set clock-in time (e.g., between 8:00 and 8:30 AM)
      const clockInHour = 8;
      const clockInMinuteVariation = Math.floor(Math.random() * 30); // 0-29 minutes past the hour
      const clockInTime = businessDateTimeUtc(currentKey, clockInHour, clockInMinuteVariation, 0, 0, tz);
      
      // Add some randomness to work hours (some days slightly under, some over)
      let workHours = hoursPerDay;
      
      // Occasionally add overtime on some days (1-2 extra hours on ~30% of days)
      if (includeOvertimeInSomeDays && Math.random() < 0.3) {
        workHours += 1 + Math.random(); // 1-2 extra hours
      }
      
      // Occasionally have slightly shorter days (7-7.9 hours on ~20% of days)
      if (Math.random() < 0.2) {
        workHours = 7 + (Math.random() * 0.9); // 7-7.9 hours
      }
      
      // Calculate clock-out time based on work hours
      const clockOutTime = new Date(clockInTime);
      clockOutTime.setMilliseconds(clockOutTime.getMilliseconds() + (workHours * 60 * 60 * 1000));
      
      // Create clock-in record
      const clockInLog = new TimeLog({
        staffId,
        type: 'clockIn',
        timestamp: clockInTime,
        photo: null // No photo for test data
      });
      await clockInLog.save();
      logs.push(clockInLog);
      
      // Calculate hours with proper precision
      const hoursWorked = timeLogController.calculateHoursWorked(clockInTime, clockOutTime);
      const OVERTIME_THRESHOLD = 8;
      const isOvertime = hoursWorked > OVERTIME_THRESHOLD;
      
      // Create clock-out record
      const clockOutLog = new TimeLog({
        staffId,
        type: 'clockOut',
        timestamp: clockOutTime,
        totalHours: hoursWorked,
        isOvertime,
        photo: null // No photo for test data
      });
      await clockOutLog.save();
      logs.push(clockOutLog);
    }
    
    res.json({
      success: true,
      message: `Generated ${logs.length} test time log entries for ${staff.name}`,
      count: logs.length,
      staffId
    });
  } catch (error) {
    console.error('Error generating test data:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Error generating test data'
    });
  }
});

// Verify staff photo for time clock
router.post('/verify-photo', async (req, res) => {
  try {
    const { userId, staffId, image } = req.body;
    
    if (!userId || !image) {
      return res.status(400).json({ 
        success: false, 
        message: 'Missing required information for verification' 
      });
    }
    
    // In a production system, this is where you would:
    // 1. Save the photo to a database or file system
    // 2. Potentially run facial recognition to verify identity
    // 3. Log the verification attempt
    
    // For now, we'll just accept all photos as valid
    // TODO: Implement actual photo verification logic
    
    res.json({
      success: true,
      message: 'Photo verification successful'
    });
  } catch (error) {
    console.error('Error in photo verification:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Server error during photo verification' 
    });
  }
});

// ========================================
// NFC TIME CLOCK ROUTES
// ========================================

/**
 * Clock in via NFC card tap
 * POST /api/time-logs/nfc/clock-in
 * Body: { nfcCardId: string }
 */
router.post('/nfc/clock-in', auth, async (req, res) => {
  try {
    const { nfcCardId } = req.body;
    
    if (!nfcCardId) {
      return res.status(400).json({
        success: false,
        message: 'NFC card ID is required'
      });
    }
    
    // Find staff by NFC card ID
    const staffMember = await Staff.findOne({ nfcCardId: nfcCardId.toUpperCase() });
    
    if (!staffMember) {
      return res.status(404).json({
        success: false,
        message: 'No staff member found with this NFC card. Please register your card first.'
      });
    }
    
    // Check if staff member is terminated, resigned, or suspended
    if (['Terminated', 'Resigned', 'Suspended'].includes(staffMember.status)) {
      return res.status(403).json({
        success: false,
        message: staffMember.status === 'Terminated' 
          ? 'Access denied: Your employment has been terminated'
          : staffMember.status === 'Resigned'
          ? 'Access denied: You have resigned from your position'
          : 'Access denied: Your account is suspended'
      });
    }
    
    // Check if already clocked in
    const lastLog = await TimeLog.findOne({ staffId: staffMember._id })
      .sort({ timestamp: -1 });
    
    if (lastLog && lastLog.type === 'clockIn') {
      return res.status(400).json({
        success: false,
        message: `${staffMember.name} is already clocked in`
      });
    }
    
    // Create clock in record (no photo required for NFC)
    const timeLog = new TimeLog({
      staffId: staffMember._id,
      type: 'clockIn',
      timestamp: new Date(),
      photo: null, // NFC mode doesn't require photo
      clockMethod: 'NFC'
    });
    await timeLog.save();
    
    console.log('[NFC TimeLog] Clock in successful for:', staffMember.name);
    
    // Convert the timestamp to a simple ISO string format before sending
    const responseData = timeLog.toObject();
    responseData.timestamp = timeLog.timestamp.toISOString();
    responseData.staffName = staffMember.name;
    responseData.staffPosition = staffMember.position;
    
    res.status(201).json({
      success: true,
      message: `${staffMember.name} clocked in successfully`,
      data: responseData
    });
  } catch (error) {
    console.error('[NFC TimeLog] Clock in error:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

/**
 * Clock out via NFC card tap
 * POST /api/time-logs/nfc/clock-out
 * Body: { nfcCardId: string }
 */
router.post('/nfc/clock-out', auth, async (req, res) => {
  try {
    const { nfcCardId } = req.body;
    
    if (!nfcCardId) {
      return res.status(400).json({
        success: false,
        message: 'NFC card ID is required'
      });
    }
    
    // Find staff by NFC card ID
    const staffMember = await Staff.findOne({ nfcCardId: nfcCardId.toUpperCase() });
    
    if (!staffMember) {
      return res.status(404).json({
        success: false,
        message: 'No staff member found with this NFC card. Please register your card first.'
      });
    }
    
    // Check if staff member is terminated, resigned, or suspended
    if (['Terminated', 'Resigned', 'Suspended'].includes(staffMember.status)) {
      return res.status(403).json({
        success: false,
        message: staffMember.status === 'Terminated' 
          ? 'Access denied: Your employment has been terminated'
          : staffMember.status === 'Resigned'
          ? 'Access denied: You have resigned from your position'
          : 'Access denied: Your account is suspended'
      });
    }
    
    // Find the last clock in
    const lastLog = await TimeLog.findOne({ staffId: staffMember._id })
      .sort({ timestamp: -1 });
    
    if (!lastLog || lastLog.type !== 'clockIn') {
      return res.status(400).json({
        success: false,
        message: `${staffMember.name} is not currently clocked in`
      });
    }
    
    // Calculate hours worked
    const clockOutTime = new Date();
    const clockInTime = new Date(lastLog.timestamp);
    const hoursWorked = Number(((clockOutTime - clockInTime) / (1000 * 60 * 60)).toFixed(2));
    const OVERTIME_THRESHOLD = 8;
    const isOvertime = hoursWorked > OVERTIME_THRESHOLD;
    
    // Create clock out record
    const timeLog = new TimeLog({
      staffId: staffMember._id,
      type: 'clockOut',
      timestamp: clockOutTime,
      totalHours: hoursWorked,
      isOvertime,
      photo: null, // NFC mode doesn't require photo
      clockMethod: 'NFC'
    });
    await timeLog.save();
    
    console.log('[NFC TimeLog] Clock out successful for:', staffMember.name, '- Hours:', hoursWorked);
    
    // Convert the timestamp to a simple ISO string format before sending
    const responseData = timeLog.toObject();
    responseData.timestamp = timeLog.timestamp.toISOString();
    responseData.staffName = staffMember.name;
    responseData.staffPosition = staffMember.position;
    
    res.status(201).json({
      success: true,
      message: `${staffMember.name} clocked out successfully (${hoursWorked.toFixed(2)} hours)`,
      data: responseData
    });
  } catch (error) {
    console.error('[NFC TimeLog] Clock out error:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

/**
 * Look up staff by NFC card ID
 * GET /api/time-logs/nfc/lookup/:cardId
 */
router.get('/nfc/lookup/:cardId', auth, async (req, res) => {
  try {
    const { cardId } = req.params;
    
    if (!cardId) {
      return res.status(400).json({
        success: false,
        message: 'NFC card ID is required'
      });
    }
    
    // Find staff by NFC card ID
    const staffMember = await Staff.findOne({ nfcCardId: cardId.toUpperCase() })
      .select('_id name position profilePicture status');
    
    if (!staffMember) {
      return res.status(404).json({
        success: false,
        message: 'No staff member found with this NFC card'
      });
    }
    
    // Get last time log to determine current status
    const lastLog = await TimeLog.findOne({ staffId: staffMember._id })
      .sort({ timestamp: -1 });
    
    res.json({
      success: true,
      data: {
        ...staffMember.toObject(),
        isClockedIn: lastLog && lastLog.type === 'clockIn',
        lastLog: lastLog ? {
          type: lastLog.type,
          timestamp: lastLog.timestamp.toISOString()
        } : null
      }
    });
  } catch (error) {
    console.error('[NFC TimeLog] Lookup error:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

module.exports = router;