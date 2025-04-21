const mongoose = require('mongoose');

const payrollSchema = new mongoose.Schema({
  staffId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Staff',
    required: true
  },
  payrollPeriod: {
    type: Date,
    required: true
  },
  totalHoursWorked: Number,
  overtimeHours: Number,
  deductions: {
    lateMinutes: Number,
    absences: Number
  },
  netPay: Number,
  createdAt: {
    type: Date,
    default: Date.now
  }
});

module.exports = mongoose.model('Payroll', payrollSchema);