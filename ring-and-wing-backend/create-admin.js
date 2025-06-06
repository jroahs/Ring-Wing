require('dotenv').config();
const mongoose = require('mongoose');
const User = require('./models/User');

async function createAdmin() {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    
    // Delete existing admins
    await User.deleteMany({ username: 'admin' });
    
    // Create admin with new position-based hierarchy
    const admin = new User({
      username: 'admin',
      email: 'admin@ringwing.com',
      password: 'manager123', // Let pre-save hook hash it
      role: 'manager',
      position: 'admin' // Use the new admin position
    });

    await admin.save();
    console.log('✅ Admin created successfully!');
    console.log('📋 Admin Details:');
    console.log('   Username: admin');
    console.log('   Email: admin@ringwing.com');
    console.log('   Role: manager');
    console.log('   Position: admin');
    console.log('   Password: manager123');
    
    process.exit();
  } catch (err) {
    console.error('❌ Error creating admin:', err);
    process.exit(1);
  }
}

createAdmin();