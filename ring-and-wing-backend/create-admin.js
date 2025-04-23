require('dotenv').config();
const mongoose = require('mongoose');
const User = require('./models/User');

async function createAdmin() {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    
    // Delete existing admins
    await User.deleteMany({ username: 'admin' });
    
    // Create admin with PLAIN TEXT password
    const admin = new User({
      username: 'admin',
      email: 'admin@ringwing.com',
      password: 'manager123', // Let pre-save hook hash it
      role: 'manager'
    });

    await admin.save();
    console.log('✅ Admin created with hash:', admin.password);
    
    process.exit();
  } catch (err) {
    console.error('❌ Error:', err);
    process.exit(1);
  }
}

createAdmin();