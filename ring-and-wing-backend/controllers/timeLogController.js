const TimeLog = require('../models/TimeLog');
const Staff = require('../models/Staff');
const multer = require('multer');
const path = require('path');
const fs = require('fs');

// Configure multer for storing time clock photos
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    // Save directly to the public/uploads/timelogs directory
    const dir = path.join(__dirname, '../public/uploads/timelogs');
    if (!fs.existsSync(dir)){
      fs.mkdirSync(dir, { recursive: true });
    }
    cb(null, dir);
  },
  filename: function (req, file, cb) {
    // Create a unique filename using timestamp and staff ID
    const staffId = req.body.staffId || 'unknown';
    const timestamp = Date.now();
    cb(null, `${timestamp}-${staffId}-${Date.now()}.jpg`);
  }
});

const upload = multer({ 
  storage: storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB limit
  fileFilter: function (req, file, cb) {
    if (!file.originalname.match(/\.(jpg|jpeg|png|gif)$/)) {
      return cb(new Error('Only image files are allowed!'));
    }
    cb(null, true);
  }
}).single('photo');

// Helper function to calculate time difference in hours with proper precision
const calculateHoursWorked = (startTime, endTime, maxShiftDuration = 24) => {
  // Ensure proper date objects
  const startDate = new Date(startTime);
  const endDate = new Date(endTime);
  
  // Calculate difference in milliseconds
  const timeDiffMs = endDate - startDate;
  
  // Convert to hours with 2 decimal precision
  const hours = Number((timeDiffMs / (1000 * 60 * 60)).toFixed(2));
  
  // Apply reasonable limit to prevent calculation errors
  return Math.min(hours, maxShiftDuration);
};

// Get time logs for a staff member
const getTimeLogs = async (req, res) => {
  try {
    const { staffId } = req.params;
    const { startDate, endDate } = req.query;
    
    let query = { staffId };
    
    if (startDate || endDate) {
      query.timestamp = {};
      if (startDate) query.timestamp.$gte = new Date(startDate);
      if (endDate) query.timestamp.$lte = new Date(endDate);
    }
    
    const logs = await TimeLog.find(query).sort('-timestamp');
    
    // Convert timestamps to ISO strings for consistent frontend parsing
    const formattedLogs = logs.map(log => {
      const logObj = log.toObject();
      logObj.timestamp = log.timestamp.toISOString();
      return logObj;
    });
    
    res.json({
      success: true,
      data: formattedLogs
    });
  } catch (error) {
    console.error('Error fetching time logs:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// Clock in
const clockIn = async (req, res) => {
  upload(req, res, async function(err) {
    if (err) {
      return res.status(400).json({
        success: false,
        message: 'Error uploading photo: ' + err.message
      });
    }
    
    try {
      console.log('[TimeLog Debug] Clock in request details:', {
        user: req.user?._id,
        body: req.body,
        file: req.file
      });

      // Find staff by ID or userId
      let staffMember;
      if (req.body.staffId) {
        staffMember = await Staff.findById(req.body.staffId);
      } else if (req.body.userId) {
        staffMember = await Staff.findOne({ userId: req.body.userId });
      } else if (req.staff) {
        staffMember = req.staff;
      }

      if (!staffMember) {
        return res.status(404).json({
          success: false,
          message: 'No staff record found. Please contact your administrator.'
        });
      }

      console.log('[TimeLog Debug] Staff found:', staffMember._id);

      // Verify PIN if provided
      if (req.body.pinCode) {
        if (req.body.pinCode !== staffMember.pinCode) {
          return res.status(401).json({
            success: false,
            message: 'Invalid PIN code'
          });
        }
        console.log('[TimeLog Debug] PIN verified');
      }

      // Check if already clocked in
      const lastLog = await TimeLog.findOne({ staffId: staffMember._id })
        .sort({ timestamp: -1 });
      
      if (lastLog && lastLog.type === 'clockIn') {
        return res.status(400).json({
          success: false,
          message: 'Already clocked in'
        });
      }

      // Get photo path if uploaded
      let photoPath = null;
      if (req.file) {
        // Use the filename only, not the full path
        const filename = path.basename(req.file.path);
        photoPath = `uploads/timelogs/${filename}`;
        console.log('[TimeLog Debug] Photo saved at:', photoPath);
      }

      // Create clock in record
      const timeLog = new TimeLog({
        staffId: staffMember._id,
        type: 'clockIn',
        timestamp: new Date(),
        photo: photoPath
      });
      await timeLog.save();

      console.log('[TimeLog Debug] Clock in successful:', timeLog);

      // Convert the timestamp to a simple ISO string format before sending
      const responseData = timeLog.toObject();
      responseData.timestamp = timeLog.timestamp.toISOString();
      
      res.status(201).json({
        success: true,
        data: responseData
      });
    } catch (error) {
      console.error('[TimeLog Debug] Clock in error:', error);
      res.status(500).json({
        success: false,
        message: error.message
      });
    }
  });
};

// Clock out
const clockOut = async (req, res) => {
  upload(req, res, async function(err) {
    if (err) {
      return res.status(400).json({
        success: false,
        message: 'Error uploading photo: ' + err.message
      });
    }
    
    try {
      console.log('[TimeLog Debug] Clock out request:', {
        user: req.user?._id,
        body: req.body,
        file: req.file
      });

      // Find staff by ID or userId
      let staffMember;
      if (req.body.staffId) {
        staffMember = await Staff.findById(req.body.staffId);
      } else if (req.body.userId) {
        staffMember = await Staff.findOne({ userId: req.body.userId });
      } else if (req.staff) {
        staffMember = req.staff;
      }
      
      if (!staffMember) {
        return res.status(404).json({
          success: false,
          message: 'No staff record found for this user'
        });
      }
      
      // Verify PIN if provided
      if (req.body.pinCode) {
        if (req.body.pinCode !== staffMember.pinCode) {
          return res.status(401).json({
            success: false,
            message: 'Invalid PIN code'
          });
        }
      }

      // Find last clock in record
      const lastClockIn = await TimeLog.findOne({
        staffId: staffMember._id,
        type: 'clockIn'
      }).sort({ timestamp: -1 });

      if (!lastClockIn) {
        return res.status(400).json({
          success: false,
          message: 'No clock in record found'
        });
      }

      const now = new Date();
      
      // Check if clock in was more than 24 hours ago (likely a mistake)
      const clockInTime = new Date(lastClockIn.timestamp);
      const timeSinceClockIn = (now - clockInTime) / (1000 * 60 * 60);
      
      if (timeSinceClockIn > 24) {
        console.warn(`[TimeLog Warning] Very long shift detected: ${timeSinceClockIn.toFixed(2)} hours for staff ${staffMember._id}`);
      }
      
      // Calculate hours with the new helper function to ensure accuracy
      const hoursWorked = calculateHoursWorked(lastClockIn.timestamp, now);
      
      // Get organization overtime threshold from settings (fallback to default)
      // Could be fetched from global settings or staff member settings
      const OVERTIME_THRESHOLD = 8; // Default threshold, can be made configurable
      const isOvertime = hoursWorked > OVERTIME_THRESHOLD;

      // Process photo if available
      let photoPath = null;
      if (req.file) {
        // Use the filename only, not the full path
        const filename = path.basename(req.file.path);
        photoPath = `uploads/timelogs/${filename}`;
        console.log('[TimeLog Debug] Photo saved at:', photoPath);
      }

      // Create clock out record
      const timeLog = new TimeLog({
        staffId: staffMember._id,
        type: 'clockOut',
        timestamp: now,
        totalHours: hoursWorked,
        isOvertime,
        photo: photoPath
      });
      await timeLog.save();

      console.log('[TimeLog Debug] Clock out successful:', timeLog);

      // Convert the timestamp to a simple ISO string format before sending
      const responseData = timeLog.toObject();
      responseData.timestamp = timeLog.timestamp.toISOString();
      
      res.json({
        success: true,
        data: responseData
      });
    } catch (error) {
      console.error('[TimeLog Debug] Clock out error:', error);
      res.status(500).json({
        success: false,
        message: error.message
      });
    }
  });
};

// Helper functions for period-based calculations
const calculateTotalHours = async (staffId, startDate, endDate) => {
  // Fetch all time logs in the period
  const logs = await TimeLog.find({
    staffId,
    timestamp: { $gte: new Date(startDate), $lte: new Date(endDate) }
  }).sort('timestamp');
  
  let totalHours = 0;
  let regularHours = 0;
  let overtimeHours = 0;
  let lastClockIn = null;
  
  // Process logs in pairs (clock-in followed by clock-out)
  for (let i = 0; i < logs.length; i++) {
    const log = logs[i];
    
    if (log.type === 'clockIn') {
      lastClockIn = log;
    } else if (log.type === 'clockOut' && lastClockIn) {
      // Calculate hours for this shift with proper limits
      const shiftHours = calculateHoursWorked(lastClockIn.timestamp, log.timestamp);
      totalHours += shiftHours;
      
      // Track regular and overtime hours (can be made configurable)
      const OVERTIME_THRESHOLD = 8;
      if (shiftHours > OVERTIME_THRESHOLD) {
        regularHours += OVERTIME_THRESHOLD;
        overtimeHours += (shiftHours - OVERTIME_THRESHOLD);
      } else {
        regularHours += shiftHours;
      }
      
      lastClockIn = null;
    }
  }
  
  return {
    totalHours,
    regularHours,
    overtimeHours
  };
};

module.exports = {
  getTimeLogs,
  clockIn,
  clockOut,
  calculateTotalHours,
  calculateHoursWorked // Export for use in test data generation
};