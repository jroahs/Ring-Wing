/**
 * Create Test Schedule Notification
 * Creates a test notification for verification purposes
 * 
 * Run: node scripts/createTestNotification.js
 */

require('dotenv').config();
const mongoose = require('mongoose');

async function createTestNotification() {
  try {
    const mongoUri = process.env.MONGO_URI || process.env.MONGODB_URI;
    await mongoose.connect(mongoUri);
    console.log('Connected to MongoDB');

    const ScheduleNotification = require('../models/ScheduleNotification');
    const Staff = require('../models/Staff');

    // Get a staff member with a userId
    const staff = await Staff.findOne({ userId: { $ne: null }, status: 'Active' });
    
    if (!staff) {
      console.log('No active staff with userId found');
      await mongoose.disconnect();
      return;
    }

    console.log(`Creating test notification for: ${staff.name}`);

    // Create a test notification
    const notification = await ScheduleNotification.createScheduleNotification({
      staffId: staff._id,
      type: 'schedule_created',
      scheduleId: null,
      affectedDates: [new Date()],
      previousSchedule: null,
      newSchedule: {
        shiftName: 'Test Morning Shift',
        startTime: '08:00',
        endTime: '17:00',
        isRestDay: false
      },
      triggeredBy: null,
      priority: 'normal'
    });

    console.log('\n✓ Test notification created successfully!');
    console.log('  ID:', notification._id);
    console.log('  Title:', notification.title);
    console.log('  Message:', notification.message);
    console.log('  Staff:', staff.name);
    console.log('\nRefresh the Staff Scheduler page and click the bell icon to see this notification.');

    await mongoose.disconnect();
    console.log('\nDisconnected from MongoDB');
  } catch (error) {
    console.error('Error:', error);
    await mongoose.disconnect();
  }
}

createTestNotification();
