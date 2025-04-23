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
    console.log('Cleaned existing test users');

    // Create Manager with plain text password
    const manager = await User.create({
      username: 'testmanager',
      email: 'manager@test.com',
      password: 'manager123', // Will be hashed by pre-save hook
      role: 'manager'
    });
    console.log(`✅ Manager created: ${manager.username}`);

    // Create Staff with plain text password
    const staff = await User.create({
      username: 'teststaff',
      email: 'staff@test.com',
      password: 'staff123', // Will be hashed by pre-save hook
      role: 'staff',
      reportsTo: manager._id
    });
    console.log(`✅ Staff created: ${staff.username} reporting to ${manager.username}`);

    // Verify hashes
    console.log('\nGenerated Hashes:');
    console.log(`Manager Hash: ${manager.password}`);
    console.log(`Staff Hash: ${staff.password}`);

    process.exit();
  } catch (err) {
    console.error('❌ Error:', err);
    process.exit(1);
  }
}

createTestUsers();