/**
 * Schedule Notification System Test Script
 * Tests if notifications are being created and retrieved correctly
 * 
 * Run: node scripts/testScheduleNotifications.js
 */

require('dotenv').config();
const mongoose = require('mongoose');

// Colors for console output
const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  cyan: '\x1b[36m',
  bold: '\x1b[1m'
};

const log = {
  success: (msg) => console.log(`${colors.green}✓${colors.reset} ${msg}`),
  error: (msg) => console.log(`${colors.red}✗${colors.reset} ${msg}`),
  warn: (msg) => console.log(`${colors.yellow}⚠${colors.reset} ${msg}`),
  info: (msg) => console.log(`${colors.cyan}ℹ${colors.reset} ${msg}`),
  header: (msg) => console.log(`\n${colors.bold}${colors.cyan}═══ ${msg} ═══${colors.reset}\n`)
};

async function runTests() {
  console.log('\n' + '='.repeat(60));
  console.log(colors.bold + '  SCHEDULE NOTIFICATION SYSTEM TEST' + colors.reset);
  console.log('='.repeat(60));

  try {
    // Connect to MongoDB
    log.header('DATABASE CONNECTION');
    const mongoUri = process.env.MONGO_URI || process.env.MONGODB_URI || 'mongodb://localhost:27017/ring-and-wing';
    await mongoose.connect(mongoUri);
    log.success(`Connected to MongoDB`);

    // Load models
    const ScheduleNotification = require('../models/ScheduleNotification');
    const Staff = require('../models/Staff');
    const EmployeeSchedule = require('../models/EmployeeSchedule');
    const User = require('../models/User');

    // ========================================
    // TEST 1: Check if ScheduleNotification model exists
    // ========================================
    log.header('TEST 1: Model Verification');
    
    log.success('ScheduleNotification model loaded');
    log.info(`Collection name: ${ScheduleNotification.collection.name}`);

    // ========================================
    // TEST 2: Check existing notifications
    // ========================================
    log.header('TEST 2: Existing Notifications');
    
    const totalNotifications = await ScheduleNotification.countDocuments();
    log.info(`Total notifications in database: ${totalNotifications}`);
    
    const unreadNotifications = await ScheduleNotification.countDocuments({ isRead: false });
    log.info(`Unread notifications: ${unreadNotifications}`);
    
    if (totalNotifications > 0) {
      const recentNotifications = await ScheduleNotification.find()
        .sort({ createdAt: -1 })
        .limit(5)
        .populate('staffId', 'name');
      
      console.log('\n  Recent Notifications:');
      console.log('  ─────────────────────────────────────');
      recentNotifications.forEach((n, i) => {
        console.log(`  ${i + 1}. [${n.type}] ${n.title}`);
        console.log(`     Staff: ${n.staffId?.name || 'Unknown'}`);
        console.log(`     Created: ${n.createdAt}`);
        console.log(`     Read: ${n.isRead ? 'Yes' : 'No'}`);
        console.log('');
      });
    }

    // ========================================
    // TEST 3: Check Staff-User linking
    // ========================================
    log.header('TEST 3: Staff-User Linking');
    
    const staffWithUsers = await Staff.find({ userId: { $ne: null } })
      .populate('userId', 'name email')
      .limit(5);
    
    log.info(`Staff with linked user accounts: ${staffWithUsers.length}`);
    
    if (staffWithUsers.length > 0) {
      console.log('\n  Linked Staff:');
      console.log('  ─────────────────────────────────────');
      staffWithUsers.forEach((s, i) => {
        console.log(`  ${i + 1}. ${s.name} → User: ${s.userId?.name || s.userId?.email || 'N/A'}`);
      });
    } else {
      log.warn('No staff members have linked user accounts!');
      log.warn('This means notifications cannot be retrieved for any staff member.');
    }

    // ========================================
    // TEST 4: Check for notifications per staff
    // ========================================
    log.header('TEST 4: Notifications Per Staff');
    
    const allStaff = await Staff.find({ status: 'Active' }).limit(10);
    
    for (const staff of allStaff) {
      const staffNotifications = await ScheduleNotification.countDocuments({ staffId: staff._id });
      const unread = await ScheduleNotification.countDocuments({ staffId: staff._id, isRead: false });
      
      if (staffNotifications > 0) {
        log.info(`${staff.name}: ${staffNotifications} notifications (${unread} unread)`);
      } else {
        log.warn(`${staff.name}: No notifications`);
      }
    }

    // ========================================
    // TEST 5: Test createScheduleNotification
    // ========================================
    log.header('TEST 5: Create Test Notification');
    
    // Get a test staff member
    const testStaff = await Staff.findOne({ status: 'Active' });
    
    if (testStaff) {
      log.info(`Creating test notification for: ${testStaff.name}`);
      
      try {
        const testNotification = await ScheduleNotification.createScheduleNotification({
          staffId: testStaff._id,
          type: 'schedule_created',
          scheduleId: null,
          affectedDates: [new Date()],
          previousSchedule: null,
          newSchedule: {
            shiftName: 'Morning Shift',
            startTime: '08:00',
            endTime: '17:00',
            isRestDay: false
          },
          triggeredBy: null,
          priority: 'normal'
        });
        
        log.success(`Test notification created: ${testNotification._id}`);
        log.info(`Title: ${testNotification.title}`);
        log.info(`Message: ${testNotification.message}`);
        
        // Check if it can be retrieved
        const retrieved = await ScheduleNotification.findById(testNotification._id);
        if (retrieved) {
          log.success('Notification retrieved successfully');
        }
        
        // Clean up test notification
        await ScheduleNotification.findByIdAndDelete(testNotification._id);
        log.info('Test notification cleaned up');
        
      } catch (err) {
        log.error(`Failed to create test notification: ${err.message}`);
      }
    } else {
      log.warn('No active staff found to test with');
    }

    // ========================================
    // TEST 6: Check Recent Schedule Changes
    // ========================================
    log.header('TEST 6: Recent Schedule Activity');
    
    const recentSchedules = await EmployeeSchedule.find()
      .sort({ updatedAt: -1 })
      .limit(5)
      .populate('staffId', 'name');
    
    if (recentSchedules.length > 0) {
      console.log('\n  Recently Updated Schedules:');
      console.log('  ─────────────────────────────────────');
      recentSchedules.forEach((s, i) => {
        console.log(`  ${i + 1}. ${s.staffId?.name || 'Unknown'} - ${new Date(s.date).toLocaleDateString()}`);
        console.log(`     Updated: ${s.updatedAt}`);
        console.log('');
      });
    } else {
      log.warn('No schedules found in database');
    }

    // ========================================
    // DIAGNOSIS SUMMARY
    // ========================================
    log.header('DIAGNOSIS SUMMARY');
    
    const issues = [];
    
    if (totalNotifications === 0) {
      issues.push('No notifications exist in the database - schedules may not be triggering notifications');
    }
    
    const staffWithoutUsers = await Staff.countDocuments({ 
      $or: [{ userId: null }, { userId: { $exists: false } }]
    });
    if (staffWithoutUsers > 0) {
      issues.push(`${staffWithoutUsers} staff members don't have linked user accounts - they cannot receive notifications`);
    }
    
    if (issues.length === 0) {
      log.success('No obvious issues detected with the notification system');
      log.info('If notifications still don\'t appear, check:');
      console.log('  1. Frontend API calls are reaching the correct endpoints');
      console.log('  2. Authentication token includes correct user info');
      console.log('  3. Staff.findOne({ userId: req.user._id }) returns the correct staff');
    } else {
      console.log('\n  Issues Found:');
      console.log('  ─────────────────────────────────────');
      issues.forEach((issue, i) => {
        console.log(`  ${colors.yellow}${i + 1}. ${issue}${colors.reset}`);
      });
    }

    console.log('\n' + '='.repeat(60) + '\n');

  } catch (error) {
    log.error(`Test suite error: ${error.message}`);
    console.error(error);
  } finally {
    await mongoose.disconnect();
    log.info('Disconnected from MongoDB');
    process.exit(0);
  }
}

// Run tests
runTests();
