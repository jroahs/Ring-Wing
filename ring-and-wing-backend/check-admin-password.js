require('dotenv').config();
const mongoose = require('mongoose');
const User = require('./models/User');
const bcrypt = require('bcryptjs');

async function checkAndFixAdmin() {
  try {
    console.log('Connecting to MongoDB...');
    await mongoose.connect(process.env.MONGO_URI);
    console.log('Connected successfully\n');

    // Find admin user - MUST select password explicitly
    const admin = await User.findOne({ username: 'admin' }).select('+password');
    
    if (!admin) {
      console.log('❌ No admin user found');
      console.log('Creating admin user with password: admin123');
      
      const hashedPassword = await bcrypt.hash('admin123', 10);
      const newAdmin = new User({
        username: 'admin',
        email: 'admin@ringandwing.com',
        password: hashedPassword,
        role: 'manager',
        position: 'Manager'
      });
      
      await newAdmin.save();
      console.log('✅ Admin user created successfully');
      console.log('   Username: admin');
      console.log('   Password: admin123');
    } else {
      console.log('✅ Admin user found');
      console.log('   Username:', admin.username);
      console.log('   Email:', admin.email);
      console.log('   Role:', admin.role);
      console.log('   Has password:', !!admin.password);
      
      if (!admin.password) {
        console.log('\n⚠️  Admin user has NO PASSWORD SET!');
        console.log('Setting password to: admin123');
        
        admin.password = await bcrypt.hash('admin123', 10);
        await admin.save();
        
        console.log('✅ Password set successfully');
      }
    }
    
    // List all manager users
    console.log('\n📋 All manager/admin users:');
    const managers = await User.find({ role: { $in: ['manager', 'admin'] } }).select('+password');
    
    managers.forEach((mgr, idx) => {
      console.log(`${idx + 1}. ${mgr.username} (${mgr.email}) - Has password: ${!!mgr.password}`);
    });
    
    await mongoose.disconnect();
    console.log('\n✅ Done');
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

checkAndFixAdmin();
