const mongoose = require('mongoose');

const timeLogCorrectionSchema = new mongoose.Schema({
  staffId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Staff',
    required: [true, 'Staff ID is required'],
    index: true
  },
  // The date this correction applies to
  date: {
    type: Date,
    required: [true, 'Correction date is required'],
    index: true
  },
  correctionType: {
    type: String,
    enum: [
      'add_clock_in',       // Add missing clock in
      'add_clock_out',      // Add missing clock out
      'modify_clock_in',    // Correct clock in time
      'modify_clock_out',   // Correct clock out time
      'add_full_day',       // Add both clock in and out
      'delete_entry'        // Remove erroneous entry
    ],
    required: [true, 'Correction type is required']
  },
  // Original time log reference (for modify/delete operations)
  originalTimeLogId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'TimeLog'
  },
  // Original values (for audit trail)
  originalTimestamp: {
    type: Date
  },
  originalType: {
    type: String,
    enum: ['clockIn', 'clockOut']
  },
  // Corrected/new values
  correctedTimestamp: {
    type: Date,
    required: function() {
      return this.correctionType !== 'delete_entry';
    }
  },
  // For add_full_day type
  clockInTime: {
    type: Date
  },
  clockOutTime: {
    type: Date
  },
  totalHours: {
    type: Number,
    min: 0
  },
  // Reason for correction (required)
  reason: {
    type: String,
    required: [true, 'Reason for correction is required'],
    trim: true,
    minlength: [10, 'Reason must be at least 10 characters'],
    maxlength: [500, 'Reason cannot exceed 500 characters']
  },
  // Supporting evidence (optional)
  supportingDocument: {
    type: String, // URL to uploaded document
    trim: true
  },
  // Approval workflow
  status: {
    type: String,
    enum: ['pending', 'approved', 'rejected'],
    default: 'pending',
    index: true
  },
  // Who submitted the correction
  submittedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  submittedAt: {
    type: Date,
    default: Date.now
  },
  // Approval details
  reviewedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  reviewedAt: {
    type: Date
  },
  reviewerNotes: {
    type: String,
    trim: true,
    maxlength: [300, 'Reviewer notes cannot exceed 300 characters']
  },
  // Reference to the new time log created (after approval)
  newTimeLogId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'TimeLog'
  },
  // Flag if this affects a locked payroll period
  affectsLockedPeriod: {
    type: Boolean,
    default: false
  },
  payrollId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Payroll'
  }
}, {
  timestamps: true
});

// Compound index for efficient queries
timeLogCorrectionSchema.index({ staffId: 1, date: 1 });
timeLogCorrectionSchema.index({ status: 1, createdAt: -1 });
timeLogCorrectionSchema.index({ submittedBy: 1, status: 1 });

// Virtual for formatted correction description
timeLogCorrectionSchema.virtual('correctionDescription').get(function() {
  const formatTime = (date) => {
    if (!date) return 'N/A';
    return new Date(date).toLocaleTimeString('en-PH', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: true
    });
  };

  switch (this.correctionType) {
    case 'add_clock_in':
      return `Add clock in at ${formatTime(this.correctedTimestamp)}`;
    case 'add_clock_out':
      return `Add clock out at ${formatTime(this.correctedTimestamp)}`;
    case 'modify_clock_in':
      return `Change clock in from ${formatTime(this.originalTimestamp)} to ${formatTime(this.correctedTimestamp)}`;
    case 'modify_clock_out':
      return `Change clock out from ${formatTime(this.originalTimestamp)} to ${formatTime(this.correctedTimestamp)}`;
    case 'add_full_day':
      return `Add full day: ${formatTime(this.clockInTime)} - ${formatTime(this.clockOutTime)}`;
    case 'delete_entry':
      return `Delete ${this.originalType} at ${formatTime(this.originalTimestamp)}`;
    default:
      return 'Time correction';
  }
});

// Static method to get pending corrections for managers to review
timeLogCorrectionSchema.statics.getPendingCorrections = async function(options = {}) {
  const { limit = 50, skip = 0 } = options;
  
  return this.find({ status: 'pending' })
    .populate('staffId', 'name position profilePicture')
    .populate('submittedBy', 'username')
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(limit);
};

// Static method to get corrections for a specific staff member
timeLogCorrectionSchema.statics.getStaffCorrections = async function(staffId, options = {}) {
  const { limit = 20, status } = options;
  
  const query = { staffId };
  if (status) {
    query.status = status;
  }
  
  return this.find(query)
    .populate('reviewedBy', 'username')
    .sort({ createdAt: -1 })
    .limit(limit);
};

// Method to approve correction and create/modify time log
timeLogCorrectionSchema.methods.approve = async function(reviewerId, notes = '') {
  const TimeLog = mongoose.model('TimeLog');
  
  this.status = 'approved';
  this.reviewedBy = reviewerId;
  this.reviewedAt = new Date();
  this.reviewerNotes = notes;

  // Create or modify the time log based on correction type
  switch (this.correctionType) {
    case 'add_clock_in':
    case 'add_clock_out': {
      const newLog = await TimeLog.create({
        staffId: this.staffId,
        type: this.correctionType === 'add_clock_in' ? 'clockIn' : 'clockOut',
        timestamp: this.correctedTimestamp,
        totalHours: this.totalHours || 0,
        isOvertime: false,
        photo: null,
        clockMethod: 'CORRECTION'
      });
      this.newTimeLogId = newLog._id;
      break;
    }
    
    case 'modify_clock_in':
    case 'modify_clock_out': {
      if (this.originalTimeLogId) {
        await TimeLog.findByIdAndUpdate(this.originalTimeLogId, {
          timestamp: this.correctedTimestamp
        });
        this.newTimeLogId = this.originalTimeLogId;
      }
      break;
    }
    
    case 'add_full_day': {
      const clockIn = await TimeLog.create({
        staffId: this.staffId,
        type: 'clockIn',
        timestamp: this.clockInTime,
        photo: null,
        clockMethod: 'CORRECTION'
      });
      
      const clockOut = await TimeLog.create({
        staffId: this.staffId,
        type: 'clockOut',
        timestamp: this.clockOutTime,
        totalHours: this.totalHours,
        isOvertime: (this.totalHours || 0) > 8,
        photo: null,
        clockMethod: 'CORRECTION'
      });
      
      this.newTimeLogId = clockOut._id;
      break;
    }
    
    case 'delete_entry': {
      if (this.originalTimeLogId) {
        await TimeLog.findByIdAndDelete(this.originalTimeLogId);
      }
      break;
    }
  }

  await this.save();
  return this;
};

// Method to reject correction
timeLogCorrectionSchema.methods.reject = async function(reviewerId, notes = '') {
  this.status = 'rejected';
  this.reviewedBy = reviewerId;
  this.reviewedAt = new Date();
  this.reviewerNotes = notes;
  
  await this.save();
  return this;
};

// Pre-save validation
timeLogCorrectionSchema.pre('save', async function(next) {
  // Check if the date falls within a locked payroll period
  if (this.isNew) {
    const Payroll = mongoose.model('Payroll');
    const existingPayroll = await Payroll.findOne({
      staffId: this.staffId,
      isFinalized: true,
      payrollPeriod: {
        $gte: new Date(this.date.getFullYear(), this.date.getMonth(), 1),
        $lte: new Date(this.date.getFullYear(), this.date.getMonth() + 1, 0)
      }
    });
    
    if (existingPayroll) {
      this.affectsLockedPeriod = true;
      this.payrollId = existingPayroll._id;
    }
  }
  
  next();
});

module.exports = mongoose.model('TimeLogCorrection', timeLogCorrectionSchema);
