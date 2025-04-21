const mongoose = require('mongoose');

const staffSchema = new mongoose.Schema({
  name: { 
    type: String, 
    required: [true, 'Staff member name is required'],
    trim: true,
    maxlength: [100, 'Name cannot exceed 100 characters']
  },
  position: { 
    type: String, 
    required: [true, 'Position is required'],
    trim: true,
    enum: ['Barista', 'Cashier', 'Chef', 'Manager', 'Server', 'Cook']
  },
  profilePicture: {
    type: String,
    default: ''
  },
  email: { 
    type: String, 
    required: [true, 'Email is required'],
    unique: true,
    trim: true,
    lowercase: true,
    match: [/^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/, 'Please fill a valid email address']
  },
  phone: {
    type: String,
    required: [true, 'Phone number is required'],
    match: [/^(09|\+639)\d{9}$/, 'Please use a valid Philippine phone number']
  },
  basicSalary: {
    type: Number,
    required: [true, 'Basic salary is required'],
    min: [0, 'Salary cannot be negative']
  },
  allowances: {
    type: Number,
    default: 0,
    min: [0, 'Allowances cannot be negative']
  },
  scheduledHoursPerDay: {
    type: Number,
    default: 8,
    min: [0, 'Hours cannot be negative'],
    max: [24, 'Maximum 24 hours per day']
  },
  status: { 
    type: String, 
    enum: ['Active', 'On Leave', 'Inactive'], 
    default: 'Active' 
  },
  sssNumber: {
    type: String,
    match: [/^\d{2}-\d{7}-\d{1}$/, 'Invalid SSS format (XX-XXXXXXX-X)']
  },
  tinNumber: {
    type: String,
    match: [/^\d{3}-\d{3}-\d{3}-\d{3}$/, 'Invalid TIN format (XXX-XXX-XXX-XXX)']
  },
  philHealthNumber: {
    type: String,
    match: [/^\d{2}-\d{9}-\d{1}$/, 'Invalid PhilHealth format (XX-XXXXXXXXX-X)']
  },
  employmentStartDate: {
    type: Date,
    default: Date.now
  }
}, { 
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Virtual for hourly rate calculation
staffSchema.virtual('hourlyRate').get(function() {
  const monthlyHours = this.scheduledHoursPerDay * 22; // 22 working days/month
  return (this.basicSalary / monthlyHours).toFixed(2);
});

// Indexes for frequently queried fields
staffSchema.index({ email: 1 });
staffSchema.index({ status: 1 });
staffSchema.index({ position: 1 });

module.exports = mongoose.model('Staff', staffSchema);