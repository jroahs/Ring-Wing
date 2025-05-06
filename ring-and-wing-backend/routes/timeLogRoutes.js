const express = require('express');
const router = express.Router();
const { auth, isStaff } = require('../middleware/authMiddleware');
const timeLogController = require('../controllers/timeLogController');
const Staff = require('../models/Staff');
const TimeLog = require('../models/TimeLog');

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
router.post('/clock-in', auth, isStaff, timeLogController.clockIn);
router.post('/clock-out', auth, isStaff, timeLogController.clockOut);

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
    
    // Use the new calculateTotalHours helper from the controller
    const hours = await timeLogController.calculateTotalHours(
      staffId,
      new Date(startDate),
      new Date(endDate)
    );
    
    // Fetch the raw logs to include in the response
    const logQuery = {
      staffId,
      timestamp: { 
        $gte: new Date(startDate), 
        $lte: new Date(endDate)
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
    
    // First, clear any existing time logs in the date range
    await TimeLog.deleteMany({
      staffId,
      timestamp: {
        $gte: new Date(startDate),
        $lte: new Date(endDate)
      }
    });
    
    const start = new Date(startDate);
    const end = new Date(endDate);
    const logs = [];
    
    // Generate logs for a typical work month (e.g. 21 work days)
    for (let day = 0; day < daysToGenerate; day++) {
      const currentDate = new Date(start);
      currentDate.setDate(start.getDate() + day);
      
      // Skip weekends (Saturday = 6, Sunday = 0)
      const dayOfWeek = currentDate.getDay();
      if (dayOfWeek === 0 || dayOfWeek === 6) {
        continue;
      }
      
      // Set clock-in time (e.g., between 8:00 and 8:30 AM)
      const clockInHour = 8;
      const clockInMinuteVariation = Math.floor(Math.random() * 30); // 0-29 minutes past the hour
      const clockInTime = new Date(currentDate);
      clockInTime.setHours(clockInHour, clockInMinuteVariation, 0, 0);
      
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

module.exports = router;