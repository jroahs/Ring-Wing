require('dotenv').config();
const mongoose = require('mongoose');
const User = require('./models/User');

async function createTestUsers() {
  try {
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGO_URI);
    console.log('Connected to database');

    // Delete existing test users
    await User.deleteMany({ 
      $or: [
        { username: 'testmanager' },
        { username: 'teststaff' }
      ] 
    });
    console.log('Cleaned existing test users');    // Create Manager with plain text password and new position hierarchy
    const manager = await User.create({
      username: 'testmanager',
      email: 'manager@test.com',
      password: 'manager123', // Will be hashed by pre-save hook
      role: 'manager',
      position: 'general_manager' // Use new position hierarchy
    });
    console.log(`✅ Manager created: ${manager.username} (Position: ${manager.position})`);

    // Create Staff with plain text password and new position hierarchy
    const staff = await User.create({
      username: 'teststaff',
      email: 'staff@test.com',
      password: 'staff123', // Will be hashed by pre-save hook
      role: 'staff',
      position: 'cashier', // Use new position hierarchy
      reportsTo: manager._id
    });
    console.log(`✅ Staff created: ${staff.username} (Position: ${staff.position}) reporting to ${manager.username}`);    // Verify creation details
    console.log('\n📋 User Details Summary:');
    console.log(`Manager: ${manager.username} | Role: ${manager.role} | Position: ${manager.position}`);
    console.log(`Staff: ${staff.username} | Role: ${staff.role} | Position: ${staff.position}`);
    console.log('\n🔐 Generated Password Hashes:');
    console.log(`Manager Hash: ${manager.password}`);
    console.log(`Staff Hash: ${staff.password}`);

    process.exit();
  } catch (err) {
    console.error('❌ Error:', err);
    process.exit(1);
  }
}

createTestUsers();