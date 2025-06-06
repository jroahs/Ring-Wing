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

module.exports = mongoose.model('Staff', staffSchema);