const mongoose = require('mongoose');

const timeLogSchema = new mongoose.Schema({
  staffId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Staff',
    required: true,
    index: true
  },
  type: {
    type: String,
    enum: ['clockIn', 'clockOut'],
    required: true
  },
  timestamp: {
    type: Date,
    required: true,
    default: Date.now
  },
  totalHours: {
    type: Number,
    min: 0
  },
  isOvertime: {
    type: Boolean,
    default: false
  },
  photo: {
    type: String,  // Path to the uploaded image
    required: false
  }
}, {
  timestamps: true
});

// Compound index for efficient querying
timeLogSchema.index({ staffId: 1, timestamp: -1 });

// Virtual for formatted time
timeLogSchema.virtual('formattedTime').get(function() {
  return this.timestamp.toLocaleTimeString('en-PH', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
    timeZone: 'Asia/Manila'
  });
});

// Static method to calculate total hours for a staff in a date range
timeLogSchema.statics.calculateStaffHours = async function(staffId, startDate, endDate) {
  if (!staffId || !startDate || !endDate) {
    throw new Error('Staff ID, start date, and end date are required');
  }

  try {
    const logs = await this.find({
      staffId,
      timestamp: {
        $gte: new Date(startDate),
        $lte: new Date(endDate)
      }
    }).sort('timestamp');

    let totalRegularHours = 0;
    let totalOvertimeHours = 0;
    
    logs.forEach(log => {
      if (log.totalHours && log.type === 'clockOut') {
        if (log.isOvertime) {
          // Use scheduled hours per day from staff model (defaults to 8 if not set)
          const regularHours = 8; // This would ideally come from staff.scheduledHoursPerDay
          const overtime = Math.max(0, log.totalHours - regularHours);
          totalRegularHours += (log.totalHours - overtime);
          totalOvertimeHours += overtime;
        } else {
          totalRegularHours += log.totalHours;
        }
      }
    });

    return {
      totalHours: totalRegularHours + totalOvertimeHours,
      regularHours: totalRegularHours,
      overtimeHours: totalOvertimeHours,
      logs: logs
    };
  } catch (error) {
    console.error('Error calculating staff hours:', error);
    throw error;
  }
};

module.exports = mongoose.model('TimeLog', timeLogSchema);