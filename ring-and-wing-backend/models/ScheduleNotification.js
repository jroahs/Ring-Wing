const mongoose = require('mongoose');

const scheduleNotificationSchema = new mongoose.Schema({
  staffId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Staff',
    required: [true, 'Staff ID is required'],
    index: true
  },
  type: {
    type: String,
    enum: [
      'schedule_created',      // New schedule assigned
      'schedule_updated',      // Schedule time/shift changed
      'schedule_deleted',      // Schedule removed
      'shift_swap_request',    // Someone wants to swap (future)
      'shift_swap_approved',   // Swap approved (future)
      'rest_day_changed',      // Rest day assignment changed
      'schedule_reminder',     // Upcoming shift reminder
      'schedule_published'     // Weekly/monthly schedule published
    ],
    required: [true, 'Notification type is required']
  },
  title: {
    type: String,
    required: [true, 'Notification title is required'],
    trim: true,
    maxlength: [100, 'Title cannot exceed 100 characters']
  },
  message: {
    type: String,
    required: [true, 'Notification message is required'],
    trim: true,
    maxlength: [500, 'Message cannot exceed 500 characters']
  },
  // Reference to the schedule that triggered this notification
  scheduleId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'EmployeeSchedule'
  },
  // The date(s) affected by the change
  affectedDates: [{
    type: Date
  }],
  // Previous schedule info (for change tracking)
  previousSchedule: {
    shiftName: String,
    startTime: String,
    endTime: String,
    isRestDay: Boolean
  },
  // New schedule info
  newSchedule: {
    shiftName: String,
    startTime: String,
    endTime: String,
    isRestDay: Boolean
  },
  // Read status
  isRead: {
    type: Boolean,
    default: false,
    index: true
  },
  readAt: {
    type: Date
  },
  // Who triggered the notification (manager who made the change)
  triggeredBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  // Priority level
  priority: {
    type: String,
    enum: ['low', 'normal', 'high', 'urgent'],
    default: 'normal'
  },
  // Expiry (auto-delete old notifications)
  expiresAt: {
    type: Date,
    default: function() {
      // Default: expire after 30 days
      return new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
    },
    index: { expires: 0 } // TTL index
  }
}, {
  timestamps: true
});

// Index for efficient queries
scheduleNotificationSchema.index({ staffId: 1, isRead: 1, createdAt: -1 });
scheduleNotificationSchema.index({ staffId: 1, createdAt: -1 });

// Static method to create schedule change notification
scheduleNotificationSchema.statics.createScheduleNotification = async function(options) {
  const {
    staffId,
    type,
    scheduleId,
    affectedDates,
    previousSchedule,
    newSchedule,
    triggeredBy,
    priority = 'normal'
  } = options;

  // Generate title and message based on type
  let title, message;

  switch (type) {
    case 'schedule_created':
      title = 'New Schedule Assigned';
      message = `You have been scheduled to work on ${formatDates(affectedDates)}. Shift: ${newSchedule?.shiftName || 'Custom'} (${newSchedule?.startTime} - ${newSchedule?.endTime})`;
      break;
    
    case 'schedule_updated':
      title = 'Schedule Changed';
      message = `Your schedule for ${formatDates(affectedDates)} has been updated. New shift: ${newSchedule?.shiftName || 'Custom'} (${newSchedule?.startTime} - ${newSchedule?.endTime})`;
      break;
    
    case 'schedule_deleted':
      title = 'Schedule Removed';
      message = `Your scheduled shift on ${formatDates(affectedDates)} has been removed.`;
      break;
    
    case 'rest_day_changed':
      title = 'Rest Day Updated';
      message = newSchedule?.isRestDay 
        ? `${formatDates(affectedDates)} is now your rest day.`
        : `${formatDates(affectedDates)} is no longer a rest day. You are scheduled to work.`;
      break;
    
    case 'schedule_published':
      title = 'Schedule Published';
      message = `The schedule for ${formatDates(affectedDates)} has been published. Please check your assigned shifts.`;
      break;
    
    default:
      title = 'Schedule Notification';
      message = 'Your schedule has been updated.';
  }

  return this.create({
    staffId,
    type,
    title,
    message,
    scheduleId,
    affectedDates,
    previousSchedule,
    newSchedule,
    triggeredBy,
    priority
  });
};

// Static method to get unread notifications for a staff member
scheduleNotificationSchema.statics.getUnreadForStaff = async function(staffId, limit = 20) {
  return this.find({
    staffId,
    isRead: false
  })
    .populate('triggeredBy', 'username')
    .sort({ createdAt: -1 })
    .limit(limit);
};

// Static method to get all notifications for a staff member
scheduleNotificationSchema.statics.getAllForStaff = async function(staffId, options = {}) {
  const { limit = 50, skip = 0, includeRead = true } = options;
  
  const query = { staffId };
  if (!includeRead) {
    query.isRead = false;
  }
  
  return this.find(query)
    .populate('triggeredBy', 'username')
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(limit);
};

// Static method to mark notifications as read
scheduleNotificationSchema.statics.markAsRead = async function(notificationIds, staffId) {
  return this.updateMany(
    {
      _id: { $in: notificationIds },
      staffId // Ensure staff can only mark their own notifications
    },
    {
      $set: {
        isRead: true,
        readAt: new Date()
      }
    }
  );
};

// Static method to mark all as read for a staff member
scheduleNotificationSchema.statics.markAllAsRead = async function(staffId) {
  return this.updateMany(
    {
      staffId,
      isRead: false
    },
    {
      $set: {
        isRead: true,
        readAt: new Date()
      }
    }
  );
};

// Static method to get unread count
scheduleNotificationSchema.statics.getUnreadCount = async function(staffId) {
  return this.countDocuments({
    staffId,
    isRead: false
  });
};

// Helper function to format dates for display
function formatDates(dates) {
  if (!dates || dates.length === 0) return 'the scheduled date';
  
  const formatOptions = { month: 'short', day: 'numeric', year: 'numeric' };
  
  if (dates.length === 1) {
    return new Date(dates[0]).toLocaleDateString('en-PH', formatOptions);
  }
  
  if (dates.length === 2) {
    return `${new Date(dates[0]).toLocaleDateString('en-PH', formatOptions)} and ${new Date(dates[1]).toLocaleDateString('en-PH', formatOptions)}`;
  }
  
  // More than 2 dates
  const first = new Date(dates[0]).toLocaleDateString('en-PH', formatOptions);
  const last = new Date(dates[dates.length - 1]).toLocaleDateString('en-PH', formatOptions);
  return `${first} to ${last}`;
}

module.exports = mongoose.model('ScheduleNotification', scheduleNotificationSchema);
