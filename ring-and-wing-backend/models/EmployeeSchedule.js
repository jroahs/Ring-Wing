const mongoose = require('mongoose');

const employeeScheduleSchema = new mongoose.Schema({
  staffId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Staff',
    required: [true, 'Staff ID is required'],
    index: true
  },
  date: {
    type: Date,
    required: [true, 'Schedule date is required'],
    index: true
  },
  shiftTemplateId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'ShiftTemplate',
    required: function() {
      return !this.isRestDay && !this.isLeave;
    }
  },
  // Custom overrides for this specific day (optional)
  customStartTime: {
    type: String,
    match: [/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/, 'Custom start time must be in HH:MM format']
  },
  customEndTime: {
    type: String,
    match: [/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/, 'Custom end time must be in HH:MM format']
  },
  customBreakMinutes: {
    type: Number,
    min: [0, 'Break minutes cannot be negative']
  },
  // Rest day flag
  isRestDay: {
    type: Boolean,
    default: false
  },
  // Holiday information (auto-populated from philippineHolidays)
  isHoliday: {
    type: Boolean,
    default: false
  },
  holidayType: {
    type: String,
    enum: ['regular', 'special', 'local', null],
    default: null
  },
  holidayName: {
    type: String,
    trim: true
  },
  // Leave tracking (basic - for future expansion)
  isLeave: {
    type: Boolean,
    default: false
  },
  leaveType: {
    type: String,
    enum: ['vacation', 'sick', 'emergency', 'maternity', 'paternity', 'unpaid', null],
    default: null
  },
  // Schedule status
  status: {
    type: String,
    enum: ['scheduled', 'worked', 'partial', 'absent', 'leave', 'rest'],
    default: 'scheduled'
  },
  // Actual attendance data (populated after day ends)
  actualClockIn: {
    type: Date
  },
  actualClockOut: {
    type: Date
  },
  actualHoursWorked: {
    type: Number,
    min: 0
  },
  // Variance calculations (populated by comparison logic)
  variance: {
    lateMinutes: {
      type: Number,
      default: 0
    },
    earlyOutMinutes: {
      type: Number,
      default: 0
    },
    overtimeMinutes: {
      type: Number,
      default: 0
    },
    undertimeMinutes: {
      type: Number,
      default: 0
    }
  },
  // Lock flag - prevents editing once payroll is generated
  isLocked: {
    type: Boolean,
    default: false,
    index: true
  },
  lockedAt: {
    type: Date
  },
  lockedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  lockedByPayrollId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Payroll'
  },
  // Notes
  notes: {
    type: String,
    trim: true,
    maxlength: [500, 'Notes cannot exceed 500 characters']
  },
  // Audit trail
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  lastModifiedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Compound unique index: one schedule per staff per day
employeeScheduleSchema.index({ staffId: 1, date: 1 }, { unique: true });

// Index for efficient month queries
employeeScheduleSchema.index({ date: 1, staffId: 1 });

// Index for status filtering
employeeScheduleSchema.index({ status: 1 });

// Virtual for effective start time (custom or from template)
employeeScheduleSchema.virtual('effectiveStartTime').get(function() {
  if (this.customStartTime) return this.customStartTime;
  if (this.shiftTemplateId?.startTime) return this.shiftTemplateId.startTime;
  return null;
});

// Virtual for effective end time
employeeScheduleSchema.virtual('effectiveEndTime').get(function() {
  if (this.customEndTime) return this.customEndTime;
  if (this.shiftTemplateId?.endTime) return this.shiftTemplateId.endTime;
  return null;
});

// Virtual for expected hours
employeeScheduleSchema.virtual('expectedHours').get(function() {
  if (this.isRestDay || this.isLeave) return 0;
  
  // Use custom times if provided
  if (this.customStartTime && this.customEndTime) {
    const parseTime = (timeStr) => {
      const [hours, minutes] = timeStr.split(':').map(Number);
      return hours * 60 + minutes;
    };
    
    let start = parseTime(this.customStartTime);
    let end = parseTime(this.customEndTime);
    if (end <= start) end += 24 * 60;
    
    const breakMins = this.customBreakMinutes || this.shiftTemplateId?.breakMinutes || 60;
    return Number(((end - start - breakMins) / 60).toFixed(2));
  }
  
  // Otherwise use template hours
  return this.shiftTemplateId?.workHours || 0;
});

// Static method to get month schedule for all staff
employeeScheduleSchema.statics.getMonthSchedule = async function(year, month, staffIds = null) {
  const startDate = new Date(year, month - 1, 1);
  const endDate = new Date(year, month, 0, 23, 59, 59, 999);
  
  const query = {
    date: { $gte: startDate, $lte: endDate }
  };
  
  if (staffIds && staffIds.length > 0) {
    query.staffId = { $in: staffIds };
  }
  
  return this.find(query)
    .populate('staffId', 'name position profilePicture')
    .populate('shiftTemplateId', 'name startTime endTime color workHours allowSplitShift')
    .populate('createdBy', 'username')
    .sort({ date: 1, staffId: 1 });
};

// Static method to get staff's own schedule
employeeScheduleSchema.statics.getStaffSchedule = async function(staffId, startDate, endDate) {
  return this.find({
    staffId,
    date: { $gte: startDate, $lte: endDate }
  })
    .populate('shiftTemplateId', 'name startTime endTime color workHours allowSplitShift splitShiftConfig')
    .sort({ date: 1 });
};

// Static method to check if schedule is editable (payroll not finalized)
employeeScheduleSchema.statics.isEditable = async function(scheduleId) {
  const schedule = await this.findById(scheduleId);
  if (!schedule) return false;
  return !schedule.isLocked;
};

// Static method to lock schedules for a payroll period
employeeScheduleSchema.statics.lockForPayroll = async function(staffId, startDate, endDate, payrollId, lockedByUserId) {
  return this.updateMany(
    {
      staffId,
      date: { $gte: startDate, $lte: endDate },
      isLocked: false
    },
    {
      $set: {
        isLocked: true,
        lockedAt: new Date(),
        lockedBy: lockedByUserId,
        lockedByPayrollId: payrollId
      }
    }
  );
};

// Pre-save validation
employeeScheduleSchema.pre('save', function(next) {
  // If locked, prevent any changes except by system
  if (this.isLocked && this.isModified() && !this._allowLockedUpdate) {
    return next(new Error('Cannot modify locked schedule. Payroll has been generated for this period.'));
  }
  
  // Update status based on flags
  if (this.isRestDay) {
    this.status = 'rest';
  } else if (this.isLeave) {
    this.status = 'leave';
  }
  
  next();
});

module.exports = mongoose.model('EmployeeSchedule', employeeScheduleSchema);
