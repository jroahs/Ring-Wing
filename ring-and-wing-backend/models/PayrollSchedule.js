const mongoose = require('mongoose');

const payrollScheduleSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Schedule name is required'],
    trim: true
  },
  type: {
    type: String,
    required: true,
    enum: ['monthly', 'semi-monthly', 'weekly', 'bi-weekly'],
    default: 'semi-monthly'
  },
  // For semi-monthly, these would be like [15, 30] for 15th and end of month
  // For monthly, this would be like [30] for end of month
  // For weekly, this would be like [5] for Friday (0 = Sunday, 6 = Saturday)
  payoutDays: [{
    type: Number,
    required: true
  }],
  cutoffDays: [{
    type: Number,
    required: true
  }],
  isActive: {
    type: Boolean,
    default: true
  },
  description: {
    type: String,
    trim: true
  },
  // Additional settings
  overtimeMultiplier: {
    type: Number,
    default: 1.25,
    min: 1
  },
  regularHoursPerDay: {
    type: Number,
    default: 8,
    min: 1
  },
  workDaysPerWeek: {
    type: Number,
    default: 6,
    min: 1,
    max: 7
  }
}, {
  timestamps: true
});

// Method to calculate next payout date
payrollScheduleSchema.methods.getNextPayoutDate = function(fromDate = new Date()) {
  const currentDate = new Date(fromDate);
  let nextDate = null;

  switch (this.type) {
    case 'monthly':
      nextDate = this.calculateNextMonthlyDate(currentDate, this.payoutDays[0]);
      break;
    case 'semi-monthly':
      nextDate = this.calculateNextSemiMonthlyDate(currentDate);
      break;
    case 'weekly':
      nextDate = this.calculateNextWeeklyDate(currentDate, this.payoutDays[0]);
      break;
    case 'bi-weekly':
      nextDate = this.calculateNextBiWeeklyDate(currentDate, this.payoutDays[0]);
      break;
  }
  
  return nextDate;
};

// Helper methods for date calculations
payrollScheduleSchema.methods.calculateNextMonthlyDate = function(currentDate, payoutDay) {
  let nextDate = new Date(currentDate.getFullYear(), currentDate.getMonth(), payoutDay);
  if (nextDate <= currentDate) {
    nextDate = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, payoutDay);
  }
  return nextDate;
};

payrollScheduleSchema.methods.calculateNextSemiMonthlyDate = function(currentDate) {
  const day = currentDate.getDate();
  if (day < this.payoutDays[0]) {
    return new Date(currentDate.getFullYear(), currentDate.getMonth(), this.payoutDays[0]);
  } else if (day < this.payoutDays[1]) {
    return new Date(currentDate.getFullYear(), currentDate.getMonth(), this.payoutDays[1]);
  } else {
    return new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, this.payoutDays[0]);
  }
};

payrollScheduleSchema.methods.calculateNextWeeklyDate = function(currentDate, payoutDay) {
  const currentDay = currentDate.getDay();
  const daysUntilPayout = (payoutDay - currentDay + 7) % 7;
  const nextDate = new Date(currentDate);
  nextDate.setDate(currentDate.getDate() + daysUntilPayout);
  return nextDate;
};

payrollScheduleSchema.methods.calculateNextBiWeeklyDate = function(currentDate, payoutDay) {
  // First get next weekly date
  let nextDate = this.calculateNextWeeklyDate(currentDate, payoutDay);
  
  // If it's within 7 days, add another week
  const daysDiff = (nextDate - currentDate) / (1000 * 60 * 60 * 24);
  if (daysDiff <= 7) {
    nextDate.setDate(nextDate.getDate() + 7);
  }
  
  return nextDate;
};

// Method to get cutoff period
payrollScheduleSchema.methods.getCutoffPeriod = function(forDate = new Date()) {
  const currentDate = new Date(forDate);
  let startDate, endDate;

  switch (this.type) {
    case 'monthly':
      startDate = new Date(currentDate.getFullYear(), currentDate.getMonth(), this.cutoffDays[0]);
      endDate = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, this.cutoffDays[0] - 1);
      break;
    case 'semi-monthly':
      if (currentDate.getDate() <= this.cutoffDays[0]) {
        startDate = new Date(currentDate.getFullYear(), currentDate.getMonth(), this.cutoffDays[1] + 1);
        startDate.setMonth(startDate.getMonth() - 1);
        endDate = new Date(currentDate.getFullYear(), currentDate.getMonth(), this.cutoffDays[0]);
      } else {
        startDate = new Date(currentDate.getFullYear(), currentDate.getMonth(), this.cutoffDays[0] + 1);
        endDate = new Date(currentDate.getFullYear(), currentDate.getMonth(), this.cutoffDays[1]);
      }
      break;
    case 'weekly':
    case 'bi-weekly':
      const daysToSubtract = this.type === 'weekly' ? 7 : 14;
      endDate = new Date(currentDate);
      startDate = new Date(currentDate);
      startDate.setDate(startDate.getDate() - daysToSubtract);
      break;
  }

  return { startDate, endDate };
};

module.exports = mongoose.model('PayrollSchedule', payrollScheduleSchema);