const mongoose = require('mongoose');

const shiftTemplateSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Shift name is required'],
    trim: true,
    maxlength: [50, 'Shift name cannot exceed 50 characters']
  },
  startTime: {
    type: String,
    required: [true, 'Start time is required'],
    match: [/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/, 'Start time must be in HH:MM format']
  },
  endTime: {
    type: String,
    required: [true, 'End time is required'],
    match: [/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/, 'End time must be in HH:MM format']
  },
  breakMinutes: {
    type: Number,
    default: 60,
    min: [0, 'Break minutes cannot be negative'],
    max: [180, 'Break cannot exceed 3 hours']
  },
  color: {
    type: String,
    default: '#4CAF50',
    match: [/^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/, 'Color must be a valid hex color']
  },
  // Support for split shifts (multiple work periods in a day)
  allowSplitShift: {
    type: Boolean,
    default: false
  },
  splitShiftConfig: {
    secondStartTime: {
      type: String,
      match: [/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/, 'Second start time must be in HH:MM format']
    },
    secondEndTime: {
      type: String,
      match: [/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/, 'Second end time must be in HH:MM format']
    },
    secondBreakMinutes: {
      type: Number,
      default: 0,
      min: [0, 'Break minutes cannot be negative']
    }
  },
  // Calculated work hours (excluding breaks)
  workHours: {
    type: Number,
    min: [0, 'Work hours cannot be negative'],
    max: [24, 'Work hours cannot exceed 24']
  },
  description: {
    type: String,
    trim: true,
    maxlength: [200, 'Description cannot exceed 200 characters']
  },
  isActive: {
    type: Boolean,
    default: true
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Pre-save middleware to calculate work hours
shiftTemplateSchema.pre('save', function(next) {
  this.workHours = this.calculateWorkHours();
  next();
});

// Method to calculate work hours from times
shiftTemplateSchema.methods.calculateWorkHours = function() {
  const parseTime = (timeStr) => {
    const [hours, minutes] = timeStr.split(':').map(Number);
    return hours * 60 + minutes; // Convert to minutes
  };

  let totalMinutes = 0;

  // First shift
  const start1 = parseTime(this.startTime);
  let end1 = parseTime(this.endTime);
  
  // Handle overnight shifts
  if (end1 <= start1) {
    end1 += 24 * 60; // Add 24 hours
  }
  
  totalMinutes += (end1 - start1) - this.breakMinutes;

  // Second shift (if split shift enabled)
  if (this.allowSplitShift && this.splitShiftConfig?.secondStartTime && this.splitShiftConfig?.secondEndTime) {
    const start2 = parseTime(this.splitShiftConfig.secondStartTime);
    let end2 = parseTime(this.splitShiftConfig.secondEndTime);
    
    if (end2 <= start2) {
      end2 += 24 * 60;
    }
    
    totalMinutes += (end2 - start2) - (this.splitShiftConfig.secondBreakMinutes || 0);
  }

  // Convert back to hours with 2 decimal precision
  return Number((totalMinutes / 60).toFixed(2));
};

// Static method to get all active shift templates
shiftTemplateSchema.statics.getActiveTemplates = async function() {
  return this.find({ isActive: true }).sort({ name: 1 });
};

// Indexes for better query performance
shiftTemplateSchema.index({ isActive: 1 });
shiftTemplateSchema.index({ name: 1 });

module.exports = mongoose.model('ShiftTemplate', shiftTemplateSchema);
