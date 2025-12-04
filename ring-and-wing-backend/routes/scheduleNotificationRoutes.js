const express = require('express');
const router = express.Router();
const ScheduleNotification = require('../models/ScheduleNotification');
const Staff = require('../models/Staff');
const User = require('../models/User');
const { auth, isManager } = require('../middleware/authMiddleware');

// Get notifications for the current user (staff)
router.get('/my-notifications', auth, async (req, res) => {
  try {
    const { limit = 20, skip = 0, unreadOnly = 'false' } = req.query;

    // Find staff record for current user
    const staff = await Staff.findOne({ userId: req.user._id });
    if (!staff) {
      // Return empty array instead of 404 for better UX
      console.log(`[Notifications] No staff record found for user ${req.user._id}`);
      return res.json({
        success: true,
        data: {
          notifications: [],
          unreadCount: 0,
          pagination: {
            total: 0,
            limit: parseInt(limit),
            skip: parseInt(skip),
            hasMore: false
          }
        }
      });
    }

    const query = { staffId: staff._id };
    if (unreadOnly === 'true') {
      query.isRead = false;
    }

    const notifications = await ScheduleNotification.find(query)
      .sort({ createdAt: -1 })
      .skip(parseInt(skip))
      .limit(parseInt(limit))
      .populate('triggeredBy', 'name');

    const total = await ScheduleNotification.countDocuments(query);
    const unreadCount = await ScheduleNotification.getUnreadCount(staff._id);

    res.json({
      success: true,
      data: {
        notifications,
        unreadCount,
        pagination: {
          total,
          limit: parseInt(limit),
          skip: parseInt(skip),
          hasMore: (parseInt(skip) + notifications.length) < total
        }
      }
    });
  } catch (error) {
    console.error('Error fetching notifications:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

// Get unread count for current user
router.get('/unread-count', auth, async (req, res) => {
  try {
    const staff = await Staff.findOne({ userId: req.user._id });
    if (!staff) {
      return res.json({
        success: true,
        data: { count: 0 }
      });
    }

    const count = await ScheduleNotification.getUnreadCount(staff._id);

    res.json({
      success: true,
      data: { count }
    });
  } catch (error) {
    console.error('Error fetching unread count:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

// Mark notification as read
router.put('/:id/read', auth, async (req, res) => {
  try {
    const { id } = req.params;

    const notification = await ScheduleNotification.findById(id);
    if (!notification) {
      return res.status(404).json({
        success: false,
        message: 'Notification not found'
      });
    }

    // Verify ownership
    const staff = await Staff.findOne({ userId: req.user._id });
    if (!staff || !notification.staffId.equals(staff._id)) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to access this notification'
      });
    }

    await notification.markAsRead();

    res.json({
      success: true,
      data: notification,
      message: 'Notification marked as read'
    });
  } catch (error) {
    console.error('Error marking notification as read:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

// Mark all notifications as read for current user
router.put('/mark-all-read', auth, async (req, res) => {
  try {
    const staff = await Staff.findOne({ userId: req.user._id });
    if (!staff) {
      return res.status(404).json({
        success: false,
        message: 'Staff record not found'
      });
    }

    const result = await ScheduleNotification.updateMany(
      { staffId: staff._id, isRead: false },
      { isRead: true, readAt: new Date() }
    );

    res.json({
      success: true,
      data: { modifiedCount: result.modifiedCount },
      message: `${result.modifiedCount} notifications marked as read`
    });
  } catch (error) {
    console.error('Error marking all as read:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

// Delete a notification
router.delete('/:id', auth, async (req, res) => {
  try {
    const { id } = req.params;

    const notification = await ScheduleNotification.findById(id);
    if (!notification) {
      return res.status(404).json({
        success: false,
        message: 'Notification not found'
      });
    }

    // Verify ownership
    const staff = await Staff.findOne({ userId: req.user._id });
    if (!staff || !notification.staffId.equals(staff._id)) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to delete this notification'
      });
    }

    await ScheduleNotification.findByIdAndDelete(id);

    res.json({
      success: true,
      message: 'Notification deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting notification:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

// Delete all notifications for current user
router.delete('/', auth, async (req, res) => {
  try {
    const staff = await Staff.findOne({ userId: req.user._id });
    if (!staff) {
      return res.status(404).json({
        success: false,
        message: 'Staff record not found'
      });
    }

    const result = await ScheduleNotification.deleteMany({ staffId: staff._id });

    res.json({
      success: true,
      data: { deletedCount: result.deletedCount },
      message: `${result.deletedCount} notifications deleted`
    });
  } catch (error) {
    console.error('Error deleting notifications:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

// ==================== Manager Routes ====================

// Get all notifications (manager view)
router.get('/', auth, isManager, async (req, res) => {
  try {
    const { 
      staffId, 
      type, 
      startDate, 
      endDate, 
      limit = 50, 
      skip = 0 
    } = req.query;

    const query = {};

    if (staffId) {
      query.staffId = staffId;
    }

    if (type) {
      query.type = type;
    }

    if (startDate || endDate) {
      query.createdAt = {};
      if (startDate) query.createdAt.$gte = new Date(startDate);
      if (endDate) query.createdAt.$lte = new Date(endDate);
    }

    const notifications = await ScheduleNotification.find(query)
      .sort({ createdAt: -1 })
      .skip(parseInt(skip))
      .limit(parseInt(limit))
      .populate('staffId', 'name position')
      .populate('triggeredBy', 'name');

    const total = await ScheduleNotification.countDocuments(query);

    res.json({
      success: true,
      data: {
        notifications,
        pagination: {
          total,
          limit: parseInt(limit),
          skip: parseInt(skip),
          hasMore: (parseInt(skip) + notifications.length) < total
        }
      }
    });
  } catch (error) {
    console.error('Error fetching notifications:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

// Get notifications for a specific staff member (manager view)
router.get('/staff/:staffId', auth, isManager, async (req, res) => {
  try {
    const { staffId } = req.params;
    const { limit = 20, skip = 0 } = req.query;

    const notifications = await ScheduleNotification.find({ staffId })
      .sort({ createdAt: -1 })
      .skip(parseInt(skip))
      .limit(parseInt(limit))
      .populate('triggeredBy', 'name');

    const unreadCount = await ScheduleNotification.getUnreadCount(staffId);

    res.json({
      success: true,
      data: {
        notifications,
        unreadCount
      }
    });
  } catch (error) {
    console.error('Error fetching staff notifications:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

// Publish schedule (send notifications to affected staff AND admin confirmation)
router.post('/publish', auth, isManager, async (req, res) => {
  try {
    const { staffIds, startDate, endDate, message } = req.body;

    if (!Array.isArray(staffIds) || staffIds.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Staff IDs array is required'
      });
    }

    if (!startDate || !endDate) {
      return res.status(400).json({
        success: false,
        message: 'Start date and end date are required'
      });
    }

    const start = new Date(startDate);
    const end = new Date(endDate);
    const dateRange = `${start.toLocaleDateString()} to ${end.toLocaleDateString()}`;

    // Create notification for each staff
    const notifications = [];
    const notifiedStaffNames = [];
    
    for (const staffId of staffIds) {
      const staff = await Staff.findById(staffId);
      if (!staff) continue;

      notifiedStaffNames.push(staff.firstName + ' ' + staff.lastName);

      const notification = await ScheduleNotification.createScheduleNotification({
        staffId,
        type: 'schedule_published',
        affectedDates: [start, end],
        triggeredBy: req.user._id,
        customMessage: message || `Your schedule for ${dateRange} has been published. Please check your assigned shifts.`
      });

      notifications.push(notification);
    }

    // Create admin confirmation notification for the publisher
    // Find the staff record for the admin who published (if they have one)
    const publisherStaff = await Staff.findOne({ userId: req.user._id });
    if (publisherStaff) {
      await ScheduleNotification.createScheduleNotification({
        staffId: publisherStaff._id,
        type: 'schedule_published',
        affectedDates: [start, end],
        triggeredBy: req.user._id,
        customTitle: 'Schedule Published Successfully',
        customMessage: `You published the schedule for ${dateRange}. ${notifications.length} staff members were notified.`,
        isAdminNotification: true
      });
    }

    // Also notify other admin/manager users about the published schedule
    const otherAdmins = await User.find({ 
      position: { $in: ['Admin', 'Manager'] },
      _id: { $ne: req.user._id } // Exclude the publisher
    });

    for (const admin of otherAdmins) {
      const adminStaff = await Staff.findOne({ userId: admin._id });
      if (adminStaff) {
        await ScheduleNotification.createScheduleNotification({
          staffId: adminStaff._id,
          type: 'schedule_published',
          affectedDates: [start, end],
          triggeredBy: req.user._id,
          customTitle: 'Schedule Published by ' + req.user.username,
          customMessage: `${req.user.username} published the schedule for ${dateRange}. ${notifications.length} staff members were notified.`,
          isAdminNotification: true
        });
      }
    }

    console.log(`[Publish] Schedule published by ${req.user.username}: ${notifications.length} staff notified, ${dateRange}`);

    res.json({
      success: true,
      data: {
        notified: notifications.length,
        notifications,
        staffNotified: notifiedStaffNames
      },
      message: `Schedule published. ${notifications.length} staff notified.`
    });
  } catch (error) {
    console.error('Error publishing schedule:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

module.exports = router;
