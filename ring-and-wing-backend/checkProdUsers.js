/**
 * Check users in production database and create admin if needed
 */

const mongoose = require('mongoose');
const User = require('./models/User');
const bcrypt = require('bcryptjs');

const MONGO_URI = process.argv[2];

if (!MONGO_URI) {
  console.error('❌ MongoDB URI required');
  process.exit(1);
}

async function checkAndCreateAdmin() {
  try {
    await mongoose.connect(MONGO_URI);
    console.log('✅ Connected to Production MongoDB');

    // List all users
    const users = await User.find({}).select('username email role').lean();
    console.log('\n📋 Users in database:', users.length);
    users.forEach(u => {
      console.log(`   - ${u.username} (${u.role}) - ${u.email || 'no email'}`);
    });

    // Check for admin
    const admin = await User.findOne({ position: 'admin' });
    if (admin) {
      console.log('\n✅ Admin exists:', admin.username);
    } else {
      console.log('\n⚠️  No admin found. Creating one...');
      
      const newAdmin = await User.create({
        username: 'admin',
        email: 'admin@ringwing.com',
        password: 'Admin@123',
        role: 'manager',
        position: 'admin',
        isActive: true
      });
      
      console.log('✅ Admin created:', newAdmin.username);
      console.log('   Password: Admin@123');
    }

    mongoose.disconnect();
  } catch (error) {
    console.error('❌ Error:', error.message);
    mongoose.disconnect();
    process.exit(1);
  }
}

checkAndCreateAdmin();
