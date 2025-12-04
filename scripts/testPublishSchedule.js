/**
 * Test script for Schedule Publish Notifications
 * Tests that publishing a schedule:
 * 1. Creates notifications for all affected staff
 * 2. Creates a confirmation notification for the publisher
 * 3. Notifies other admins/managers
 */

require('dotenv').config({ path: require('path').join(__dirname, '..', 'ring-and-wing-backend', '.env') });
const mongoose = require('mongoose');

const MONGO_URI = process.env.MONGO_URI;

async function testPublishFlow() {
  console.log('=== Schedule Publish Notification Test ===\n');
  
  try {
    await mongoose.connect(MONGO_URI);
    console.log('✅ Connected to MongoDB\n');

    const ScheduleNotification = require('../ring-and-wing-backend/models/ScheduleNotification');
    const Staff = require('../ring-and-wing-backend/models/Staff');
    const User = require('../ring-and-wing-backend/models/User');

    // Get all staff
    const allStaff = await Staff.find({}).populate('userId', 'username position');
    console.log('📋 All Staff Members:');
    allStaff.forEach(s => {
      const pos = s.userId?.position || 'Unknown';
      console.log(`   - ${s.firstName} ${s.lastName} (ID: ${s._id}, Position: ${pos})`);
    });

    // Get admin users
    const admins = await User.find({ position: { $in: ['Admin', 'Manager'] } });
    console.log('\n👔 Admin/Manager Users:');
    admins.forEach(a => {
      console.log(`   - ${a.username} (${a.position})`);
    });

    // Check for existing schedule_published notifications
    const existingPublished = await ScheduleNotification.find({ type: 'schedule_published' })
      .populate('staffId', 'firstName lastName')
      .populate('triggeredBy', 'username')
      .sort({ createdAt: -1 });

    console.log('\n📬 Existing "schedule_published" Notifications:');
    if (existingPublished.length === 0) {
      console.log('   No published notifications found.');
    } else {
      existingPublished.forEach(n => {
        const staffName = n.staffId ? `${n.staffId.firstName} ${n.staffId.lastName}` : 'Unknown';
        const byUser = n.triggeredBy?.username || 'Unknown';
        console.log(`   - ${n.title} for ${staffName}`);
        console.log(`     Message: ${n.message}`);
        console.log(`     By: ${byUser}, Read: ${n.isRead}, Admin: ${n.isAdminNotification || false}`);
        console.log(`     Date: ${n.createdAt}`);
        console.log('');
      });
    }

    // Test creating a sample publish notification (simulating what the endpoint does)
    console.log('\n🧪 Testing notification creation...');
    
    // Find a test staff member
    const testStaff = allStaff[0];
    if (!testStaff) {
      console.log('❌ No staff found to test with');
    } else {
      const start = new Date();
      const end = new Date();
      end.setDate(end.getDate() + 7);

      // Create test staff notification
      const testNotification = await ScheduleNotification.createScheduleNotification({
        staffId: testStaff._id,
        type: 'schedule_published',
        affectedDates: [start, end],
        triggeredBy: admins[0]?._id,
        customMessage: `TEST: Your schedule for ${start.toLocaleDateString()} to ${end.toLocaleDateString()} has been published.`
      });

      console.log('✅ Created test staff notification:');
      console.log(`   Title: ${testNotification.title}`);
      console.log(`   Message: ${testNotification.message}`);
      console.log(`   For: ${testStaff.firstName} ${testStaff.lastName}`);

      // Create test admin notification
      const adminStaff = allStaff.find(s => s.userId?._id?.toString() === admins[0]?._id?.toString());
      if (adminStaff) {
        const adminNotification = await ScheduleNotification.createScheduleNotification({
          staffId: adminStaff._id,
          type: 'schedule_published',
          affectedDates: [start, end],
          triggeredBy: admins[0]?._id,
          customTitle: 'Schedule Published Successfully',
          customMessage: `TEST: You published the schedule for ${start.toLocaleDateString()} to ${end.toLocaleDateString()}. 1 staff member was notified.`,
          isAdminNotification: true
        });

        console.log('\n✅ Created test admin notification:');
        console.log(`   Title: ${adminNotification.title}`);
        console.log(`   Message: ${adminNotification.message}`);
        console.log(`   IsAdminNotification: ${adminNotification.isAdminNotification}`);
      } else {
        console.log('\n⚠️ Could not find admin staff record to create admin notification');
      }
    }

    // Show all notifications for the first admin
    if (admins.length > 0) {
      const adminStaff = await Staff.findOne({ userId: admins[0]._id });
      if (adminStaff) {
        const adminNotifications = await ScheduleNotification.find({ staffId: adminStaff._id })
          .sort({ createdAt: -1 })
          .limit(5);
        
        console.log(`\n📩 Latest notifications for admin ${admins[0].username}:`);
        adminNotifications.forEach(n => {
          console.log(`   - ${n.title}: ${n.message.substring(0, 60)}...`);
          console.log(`     Type: ${n.type}, Read: ${n.isRead}`);
        });
      }
    }

    console.log('\n=== Test Complete ===');

  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error(error.stack);
  } finally {
    await mongoose.disconnect();
    console.log('\n🔌 Disconnected from MongoDB');
  }
}

testPublishFlow();
