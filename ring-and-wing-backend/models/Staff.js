const mongoose = require('mongoose');

const staffSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Name is required'],
    trim: true
  },  position: {
    type: String,
    required: [true, 'Position is required'],
    enum: ['Cashier', 'Inventory Staff', 'Shift Manager', 'General Manager', 'Admin', 'Barista', 'Chef', 'Server', 'Cook']
  },
  employmentType: {
    type: String,
    required: [true, 'Employment type is required'],
    enum: ['Regular', 'Part-time', 'Probationary', 'Contractual', 'Seasonal', 'Intern'],
    default: 'Regular'
  },
  profilePicture: {
    type: String,
    default: ''
  },
  phone: {
    type: String,
    required: [true, 'Phone number is required'],
    match: [/^0\d{10}$/, 'Please use a valid Philippine phone number (e.g., 09123456789)']
  },
  dailyRate: {
    type: Number,
    required: [true, 'Daily rate is required'],
    min: [0, 'Daily rate cannot be negative']
  },  status: {
    type: String,
    enum: ['Active', 'On Leave', 'Inactive', 'Terminated', 'Resigned', 'Suspended'],
    default: 'Active'
  },
  terminationInfo: {
    terminatedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: false
    },
    terminationDate: {
      type: Date,
      required: false
    },
    terminationReason: {
      type: String,
      enum: [
        'Resignation - Personal Reasons',
        'Resignation - Better Opportunity', 
        'Resignation - Relocation',
        'Termination - Performance Issues',
        'Termination - Misconduct',
        'Termination - Attendance Issues',
        'Termination - Policy Violation',
        'Termination - Redundancy',
        'Contract Ended',
        'Mutual Agreement',
        'Other'
      ],
      required: false
    },
    terminationNotes: {
      type: String,
      required: false,
      maxlength: 500
    },
    isEligibleForRehire: {
      type: Boolean,
      default: true
    },
    finalWorkDate: {
      type: Date,
      required: false
    }
  },
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  allowances: {
    type: Number,
    default: 0
  },
  sssNumber: String,
  tinNumber: String,
  philHealthNumber: String,
  pagIbigNumber: String,
  pinCode: {
    type: String,
    default: '0000', // Default PIN for new staff members
    validate: {
      validator: function(v) {
        return /^\d{4,6}$/.test(v);
      },
      message: props => `${props.value} is not a valid PIN. PIN must be 4-6 digits only.`
    }
  },
  nfcCardId: {
    type: String,
    default: '',
    trim: true,
    sparse: true, // Allow multiple null/empty values but unique non-empty values
    validate: {
      validator: function(v) {
        // Allow empty string or valid NFC card ID format (hexadecimal, 4-14 characters)
        return !v || /^[A-Fa-f0-9]{4,14}$/.test(v);
      },
      message: props => `${props.value} is not a valid NFC card ID. Must be 4-14 hexadecimal characters.`
    }
  },
  reactivationInfo: {
    reactivatedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: false
    },
    reactivationDate: {
      type: Date,
      required: false
    },
    reactivationNotes: {
      type: String,
      required: false,
      maxlength: 300
    }
  },
  payrollScheduleId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'PayrollSchedule',
    required: false
  },
  // Default shift template for this staff member
  defaultShiftTemplateId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'ShiftTemplate',
    required: false
  },
  // Rest days configuration (0 = Sunday, 1 = Monday, ..., 6 = Saturday)
  restDays: {
    type: [Number],
    default: [0], // Default: Sunday is rest day
    validate: {
      validator: function(v) {
        return v.every(day => day >= 0 && day <= 6);
      },
      message: 'Rest days must be between 0 (Sunday) and 6 (Saturday)'
    }
  },
  // Preferred working hours (for scheduling suggestions)
  preferredSchedule: {
    preferredShiftStart: {
      type: String,
      match: [/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/, 'Time must be in HH:MM format']
    },
    preferredShiftEnd: {
      type: String,
      match: [/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/, 'Time must be in HH:MM format']
    },
    maxHoursPerDay: {
      type: Number,
      default: 8,
      min: 4,
      max: 12
    },
    maxHoursPerWeek: {
      type: Number,
      default: 48,
      min: 20,
      max: 60
    }
  }
}, { 
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Add index for better query performance
staffSchema.index({ userId: 1 });
staffSchema.index({ status: 1 });

// Virtual for full reference in payroll
staffSchema.virtual('payrollRecords', {
  ref: 'Payroll',
  localField: '_id',
  foreignField: 'staffId'
});

// Virtual for schedule records
staffSchema.virtual('schedules', {
  ref: 'EmployeeSchedule',
  localField: '_id',
  foreignField: 'staffId'
});

// Virtual for default shift template
staffSchema.virtual('defaultShift', {
  ref: 'ShiftTemplate',
  localField: 'defaultShiftTemplateId',
  foreignField: '_id',
  justOne: true
});

// Method to check if a specific day is a rest day for this staff
staffSchema.methods.isRestDay = function(date) {
  const dayOfWeek = new Date(date).getDay();
  return this.restDays.includes(dayOfWeek);
};

module.exports = mongoose.model('Staff', staffSchema);